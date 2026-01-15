const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);

        this.lastP1 = {};
        this.lastWM = {};

        // Dagelijkse opslag om 12:05
        this.scheduleDailySaveAtNoon();
    },

    getMHW_P1: async function(urlP1) {
        try {
            const result_P1 = await this.fetchWithTimeout(urlP1);
            this.lastP1 = result_P1;
            this.sendSocketNotification('MHWP1_RESULT', result_P1);
        } catch (error) {
            console.error('MMM-MyHomeWizard P1 Error:', error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message });
        }
    },

    getMHW_WM: async function(urlWM) {
        try {
            const result_WM = await this.fetchWithTimeout(urlWM);
            this.lastWM = result_WM;
            this.sendSocketNotification('MHWWM_RESULT', result_WM);
        } catch (error) {
            console.error('MMM-MyHomeWizard WM Error:', error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message });
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
    },

    scheduleDailySaveAtNoon: function() {
        const now = new Date();
        const next = new Date();
        next.setHours(12, 5, 0, 0);
        if (now > next) next.setDate(next.getDate() + 1);

        const msUntilNext = next - now;

        setTimeout(() => {
            this.saveDataAndCalculate();
            setInterval(() => {
                this.saveDataAndCalculate();
            }, 24 * 60 * 60 * 1000);
        }, msUntilNext);
    },

    saveDataAndCalculate: function() {
        this.saveDataToFile({ MHW_P1: this.lastP1, MHW_WM: this.lastWM });
        const dailyUsage = this.calculateDailyConsumption();
        if (dailyUsage) {
            this.sendSocketNotification('DAILY_USAGE', dailyUsage);
        }
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
    },

    calculateDailyConsumption: function() {
        try {
            const folderPath = path.resolve(__dirname, 'data');
            const filePath = path.join(folderPath, 'meter_history.json');
            if (!fs.existsSync(filePath)) return null;

            const history = JSON.parse(fs.readFileSync(filePath));
            if (!history.length) return null;

            const today = new Date().toISOString().split('T')[0];
            const todaysEntries = history.filter(entry => entry.timestamp.startsWith(today));
            if (todaysEntries.length < 2) return null;

            const first = todaysEntries[0];
            const last = todaysEntries[todaysEntries.length - 1];

            const result = {};
            if (first.P1 && last.P1) {
                result.electricity_kwh = (last.P1.total_power_import_kwh || 0) - (first.P1.total_power_import_kwh || 0);
                result.feed_kwh = (last.P1.total_power_export_kwh || 0) - (first.P1.total_power_export_kwh || 0);
                result.gas_m3 = (last.P1.total_gas_m3 || 0) - (first.P1.total_gas_m3 || 0);
            }
            if (first.WM && last.WM) {
                result.water_m3 = (last.WM.total_liter_m3 || 0) - (first.WM.total_liter_m3 || 0);
            }
            return result;
        } catch (err) {
            console.error("Error calculating daily consumption:", err);
            return null;
        }
    }

});
