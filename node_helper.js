const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);
        this.MHW_P1 = null;
        this.MHW_WM = null;
        this.firstSnapshotSaved = false;
        this.locale = "en";
        this.scheduleNightlySave();
    },

    scheduleNightlySave: function() {
        const now = new Date();
        const millisTillMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0, 0) - now;
        setTimeout(() => {
            this.saveDailyData();
            setInterval(() => this.saveDailyData(), 24 * 60 * 60 * 1000);
        }, millisTillMidnight);
    },

    saveDailyData: function() {
        if (!this.MHW_P1 && !this.MHW_WM) return;

        const historyFile = path.join(__dirname, 'history_data.json');
        let history = [];
        if (fs.existsSync(historyFile)) {
            try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch {}
        }

        const today = new Date().toISOString().split('T')[0];
        if (history.some(h => h.date === today)) return;

        const snapshot = {
            date: today,
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
        if (history.length > 30) history = history.slice(-30);

        try { fs.writeFileSync(historyFile, JSON.stringify(history, null, 2)); this.firstSnapshotSaved = true; } catch {}
    },

    fetchWithTimeout: async function(url, timeout = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            return response.json();
        } finally { clearTimeout(timer); }
    },

    getMHW_P1: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_P1 = result;
            this.sendSocketNotification('MHWP1_RESULT', result);
            if (!this.firstSnapshotSaved) this.saveDailyData();
        } catch (error) {
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message, retry });
        }
    },

    getMHW_WM: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_WM = result;
            this.sendSocketNotification('MHWWM_RESULT', result);
            if (!this.firstSnapshotSaved) this.saveDailyData();
        } catch (error) {
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message, retry });
        }
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SET_LOCALE') {
            const supported = ["nl","en","fr","de"];
            this.locale = supported.includes(payload.locale) ? payload.locale : "en";
            return;
        }

        if (notification === 'GET_MHWP1') this.getMHW_P1(payload);
        else if (notification === 'GET_MHWWM') this.getMHW_WM(payload);
        else if (notification === "GET_LAST_UPDATE") {
            const historyFile = path.join(__dirname, 'history_data.json');
            let lastSnapshot = null;
            let previousSnapshot = null;

            if (fs.existsSync(historyFile)) {
                try {
                    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                    if (history.length > 0) lastSnapshot = history[history.length - 1];
                    if (history.length > 1) previousSnapshot = history[history.length - 2];
                } catch {}
            }

            const lastDate = lastSnapshot ? lastSnapshot.date : new Date().toISOString().split('T')[0];
            const deltaP1 = previousSnapshot && lastSnapshot ? {
                total_power_import_kwh: lastSnapshot.P1.total_power_import_kwh - previousSnapshot.P1.total_power_import_kwh,
                total_power_export_kwh: lastSnapshot.P1.total_power_export_kwh - previousSnapshot.P1.total_power_export_kwh,
                total_gas_m3: lastSnapshot.P1.total_gas_m3 - previousSnapshot.P1.total_gas_m3
            } : { total_power_import_kwh: 0, total_power_export_kwh: 0, total_gas_m3: 0 };

            const deltaWM = previousSnapshot && lastSnapshot ? {
                total_liter_m3: lastSnapshot.WM.total_m3 - previousSnapshot.WM.total_m3,
                total_liters: lastSnapshot.WM.total_liters - previousSnapshot.WM.total_liters
            } : { total_liter_m3: 0, total_liters: 0 };

            this.sendSocketNotification("LAST_UPDATE_RESULT", { lastDate, deltaP1, deltaWM });
        }
    }

});
