const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);
        this.MHW_P1 = null;
        this.MHW_WM = null;

        // Schedule nightly save and ensure today's snapshot exists
        this.scheduleNightlySave();
    },

    scheduleNightlySave: function() {
        const now = new Date();

        // Immediately save a snapshot if none exists for today
        this.saveDailyDataIfMissing();

        // Calculate milliseconds until 23:59 tonight
        const millisTillMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 0, 0
        ) - now;

        setTimeout(() => {
            this.saveDailyData(); // Save at 23:59
            // Repeat every 24h
            setInterval(() => this.saveDailyData(), 24 * 60 * 60 * 1000);
        }, millisTillMidnight);
    },

    saveDailyDataIfMissing: function() {
        const historyFile = path.join(__dirname, 'history_data.json');
        let history = [];

        // Load existing data
        if (fs.existsSync(historyFile)) {
            try {
                const fileContent = fs.readFileSync(historyFile, 'utf8');
                history = JSON.parse(fileContent);
            } catch (err) {
                console.error("Failed to read history_data.json:", err.message);
            }
        }

        // Check if today's snapshot already exists
        const today = new Date().toISOString().split('T')[0];
        if (!history.some(h => h.date === today)) {
            // No snapshot for today yet
            this.saveDailyData();
        }
    },

    saveDailyData: function() {
        const historyFile = path.join(__dirname, 'history_data.json');
        let history = [];

        // Load existing data
        if (fs.existsSync(historyFile)) {
            try {
                const fileContent = fs.readFileSync(historyFile, 'utf8');
                history = JSON.parse(fileContent);
            } catch (err) {
                console.error("Failed to read history_data.json:", err.message);
            }
        }

        // Build daily snapshot
        const snapshot = {
            date: new Date().toISOString().split('T')[0],
            P1: {
                total_power_import_kwh: this.MHW_P1?.total_power_import_kwh || 0,
                total_power_export_kwh: this.MHW_P1?.total_power_export_kwh || 0,
                total_gas_m3: this.MHW_P1?.total_gas_m3 || 0
            },
            WM: {
                total_m3: this.MHW_WM?.total_liter_m3 || 0,
                total_liters: this.MHW_WM ? this.MHW_WM.total_liter_m3 * 1000 : 0
            }
        };

        history.push(snapshot);

        // Keep only last 30 days
        if (history.length > 30) {
            history = history.slice(history.length - 30);
        }

        // Save back to file
        try {
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            console.log("Daily MyHomeWizard snapshot saved to history_data.json");
        } catch (err) {
            console.error("Failed to write history_data.json:", err.message);
        }
    },

    getMHW_P1: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_P1 = result; // Save in memory
            this.sendSocketNotification('MHWP1_RESULT', result);
        } catch (error) {
            console.error("MMM-MyHomeWizard P1 Error:", error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message, retry });
        }
    },

    getMHW_WM: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_WM = result; // Save in memory
            this.sendSocketNotification('MHWWM_RESULT', result);
        } catch (error) {
            console.error("MMM-MyHomeWizard WM Error:", error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message, retry });
        }
    },

    fetchWithTimeout: async function(url, timeout = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            return response.json();
        } finally {
            clearTimeout(timer);
        }
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_MHWP1') this.getMHW_P1(payload);
        else if (notification === 'GET_MHWWM') this.getMHW_WM(payload);
    }

});
