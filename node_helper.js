const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);

        // Laatste data bewaren voor dagelijkse opslag
        this.lastP1 = {};
        this.lastWM = {};

        // Start dagelijkse opslag
        this.scheduleDailySave();
    },

    // Fetch P1 Meter data
    getMHW_P1: async function(urlP1) {
        try {
            const result_P1 = await this.fetchWithTimeout(urlP1);
            this.lastP1 = result_P1; // bewaar laatste data
            this.sendSocketNotification('MHWP1_RESULT', result_P1);
        } catch (error) {
            console.error('MMM-MyHomeWizard P1 Error:', error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message });
        }
    },

    // Fetch Water Meter data
    getMHW_WM: async function(urlWM) {
        try {
            const result_WM = await this.fetchWithTimeout(urlWM);
            this.lastWM = result_WM; // bewaar laatste data
            this.sendSocketNotification('MHWWM_RESULT', result_WM);
        } catch (error) {
            console.error('MMM-MyHomeWizard WM Error:', error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message });
        }
    },

    // Generic fetch with timeout
    fetchWithTimeout: async function(url, timeout = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`Network response was not ok (${response.status})`);
            }

            return response.json();
        } finally {
            clearTimeout(timer);
        }
    },

    // Listen for socket notifications
    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_MHWP1') {
            this.getMHW_P1(payload);
        } else if (notification === 'GET_MHWWM') {
            this.getMHW_WM(payload);
        }
    },

    // --- DAGELIJKSE OPSLAG --- //

    scheduleDailySave: function() {
        const now = new Date();
        const next = new Date();
        next.setHours(23, 59, 0, 0); // 23:59 van vandaag

        if (now > next) {
            next.setDate(next.getDate() + 1); // plan morgen als tijd voorbij is
        }

        const msUntilNext = next - now;

        setTimeout(() => {
            this.saveDataToFile({ MHW_P1: this.lastP1, MHW_WM: this.lastWM });

            // Daarna elke 24 uur herhalen
            setInterval(() => {
                this.saveDataToFile({ MHW_P1: this.lastP1, MHW_WM: this.lastWM });
            }, 24 * 60 * 60 * 1000);

        }, msUntilNext);
    },

    saveDataToFile: function(data) {
        try {
            const folderPath = path.resolve(__dirname, 'data');
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

            const filePath = path.join(folderPath, 'meter_history.json');

            let history = [];
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                history = JSON.parse(fileContent);
            }

            const entry = {
                timestamp: new Date().toISOString(),
                P1: data.MHW_P1 || {},
                WM: data.MHW_WM || {}
            };

            history.push(entry);

            fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
            console.log("MMM-MyHomeWizard: Data saved to meter_history.json");
        } catch (err) {
            console.error("MMM-MyHomeWizard: Error saving data", err);
        }
    }

});
