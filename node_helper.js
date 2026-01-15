const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);
        this.MHW_P1 = null;
        this.MHW_WM = null;
        this.firstSnapshotSaved = false;

        const historyFile = path.join(__dirname, 'history_data.json');

        // Send last snapshot date if available
        if (fs.existsSync(historyFile)) {
            try {
                const content = fs.readFileSync(historyFile, 'utf8');
                const history = JSON.parse(content);
                if (history.length > 0) {
                    const lastDate = history[history.length - 1].date;
                    setTimeout(() => {
                        this.sendSocketNotification("LAST_SNAPSHOT_DATE", lastDate);
                    }, 1000);
                }
            } catch (err) {
                console.error("Failed to read history_data.json:", err.message);
            }
        }

        // If no real meter, send dummy results immediately
        if (!process.env.P1_IP) {
            this.MHW_P1 = {
                total_power_import_kwh: 123,
                total_power_export_kwh: 10,
                total_gas_m3: 5,
                active_power_w: 100,
                meter_model: "Dummy P1",
                wifi_strength: 80,
                any_power_fail_count: 0
            };
            this.sendSocketNotification('MHWP1_RESULT', this.MHW_P1);
        }

        if (!process.env.WM_IP) {
            this.MHW_WM = {
                total_liter_m3: 2,
                active_liter_lpm: 5,
                wifi_strength: 75
            };
            this.sendSocketNotification('MHWWM_RESULT', this.MHW_WM);
        }

        this.scheduleNightlySave();
    },

    scheduleNightlySave: function() {
        const now = new Date();
        const millisTillMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 0, 0
        ) - now;

        setTimeout(() => {
            this.saveDailyData();
            setInterval(() => this.saveDailyData(), 24 * 60 * 60 * 1000);
        }, millisTillMidnight);
    },

    saveDailyData: function() {
        if (!this.MHW_P1 && !this.MHW_WM) {
            console.log("No meter data yet, skipping daily snapshot.");
            return;
        }

        const historyFile = path.join(__dirname, 'history_data.json');
        let history = [];

        if (fs.existsSync(historyFile)) {
            try {
                const content = fs.readFileSync(historyFile, 'utf8');
                history = JSON.parse(content);
            } catch (err) {
                console.error("Failed to read history_data.json:", err.message);
            }
        }

        const today = new Date().toISOString().split('T')[0];
        if (history.some(h => h.date === today)) {
            console.log("Snapshot for today already exists.");
            return;
        }

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
        if (history.length > 30) history = history.slice(history.length - 30);

        try {
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            console.log("Daily snapshot saved");
            this.firstSnapshotSaved = true;
            this.sendSocketNotification("LAST_SNAPSHOT_DATE", snapshot.date);
        } catch (err) {
            console.error("Failed to write history_data.json:", err.message);
        }
    },

    getMHW_P1: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_P1 = result;
            this.sendSocketNotification('MHWP1_RESULT', result);
            if (!this.firstSnapshotSaved) this.saveDailyData();
        } catch (error) {
            console.error("P1 Error:", error.message);
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
            console.error("WM Error:", error.message);
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
