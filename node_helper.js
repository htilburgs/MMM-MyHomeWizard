const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);

        this.MHW_P1 = null;
        this.MHW_WM = null;

        this.firstSnapshotSaved = false;
        this.snapshotAlreadyLogged = false;

        // 🔑 Restart flag
        this.justRestarted = true;

        this.scheduleNightlySave();
    },

    scheduleNightlySave: function () {
        const now = new Date();
        const millisTillMidnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 0, 0
        ) - now;

        setTimeout(() => {
            this.saveDailyData(true); // force nightly save
            setInterval(() => this.saveDailyData(true), 24 * 60 * 60 * 1000); // every 24h
        }, millisTillMidnight);
    },

    saveDailyData: function (force = false) {
        // 🔒 Alleen opslaan als beide meters aanwezig
        if (!this.MHW_P1 || !this.MHW_WM) {
            console.log("Waiting for both P1 and WM before saving daily snapshot.");
            return;
        }

        const historyFile = path.join(__dirname, 'history_data.json');
        let history = [];

        if (fs.existsSync(historyFile)) {
            try {
                history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            } catch (err) {
                console.error("Failed to read history_data.json:", err.message);
            }
        }

        const today = new Date().toISOString().split('T')[0];
        const hasToday = history.some(h => h.date === today);

        // 🔑 Restart baseline
        if (this.justRestarted && !force) {
            console.log("Restart detected — snapshot stored as baseline (no delta).");
            history = history.filter(h => h.date !== today);
            this.justRestarted = false;
        }
        // 🟢 Normale save zonder force maar snapshot bestaat al
        else if (hasToday && !force) {
            if (!this.snapshotAlreadyLogged) {
                console.log("Snapshot for today already exists, skipping normal save.");
                this.snapshotAlreadyLogged = true;
            }
            return;
        }

        // Create snapshot
        const snapshot = {
            date: today,
            P1: {
                total_power_import_kwh: this.MHW_P1.total_power_import_kwh,
                total_power_export_kwh: this.MHW_P1.total_power_export_kwh,
                total_gas_m3: this.MHW_P1.total_gas_m3
            },
            WM: {
                total_m3: this.MHW_WM.total_liter_m3,
                total_liters: this.MHW_WM.total_liter_m3 * 1000
            }
        };

        // 🛡️ Sanity check WM
        if (history.length > 0) {
            const last = history[history.length - 1];
            const deltaWM = snapshot.WM.total_m3 - last.WM.total_m3;
            if (deltaWM < 0 || deltaWM > 5) {
                console.warn("WM snapshot ignored due to unrealistic delta:", deltaWM);
                return;
            }
        }

        // Force overwrite bij nachtelijke save
        if (force) {
            history = history.filter(h => h.date !== today);
        }

        history.push(snapshot);

        // Keep last 30 days
        if (history.length > 30) {
            history = history.slice(-30);
        }

        try {
            fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
            console.log("Daily MyHomeWizard snapshot saved to history_data.json");
            this.firstSnapshotSaved = true;
        } catch (err) {
            console.error("Failed to write history_data.json:", err.message);
        }
    },

    async getMHW_P1({ url, retry }) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_P1 = result;
            this.sendSocketNotification('MHWP1_RESULT', result);

            // Alleen snapshot opslaan als beide meters binnen zijn
            if (!this.firstSnapshotSaved && this.MHW_WM) {
                this.saveDailyData();
            }
        } catch (error) {
            console.error("MMM-MyHomeWizard P1 Error:", error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message, retry });
        }
    },

    async getMHW_WM({ url, retry }) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.MHW_WM = result;
            this.sendSocketNotification('MHWWM_RESULT', result);

            if (!this.firstSnapshotSaved && this.MHW_P1) {
                this.saveDailyData();
            }
        } catch (error) {
            console.error("MMM-MyHomeWizard WM Error:", error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message, retry });
        }
    },

    async fetchWithTimeout(url, timeout = 5000) {
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

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'GET_MHWP1') this.getMHW_P1(payload);
        else if (notification === 'GET_MHWWM') this.getMHW_WM(payload);
        else if (notification === 'GET_LAST_UPDATE') {

            const historyFile = path.join(__dirname, 'history_data.json');
            let lastSnapshot = null;
            let previousSnapshot = null;

            if (fs.existsSync(historyFile)) {
                try {
                    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                    if (history.length > 0) lastSnapshot = history[history.length - 1];
                    if (history.length > 1) previousSnapshot = history[history.length - 2];
                } catch (e) {
                    console.error("Failed to read history_data.json:", e.message);
                }
            }

            // 🔑 Fix delta-safeguard: geen delta bij restart / identieke dag
            if (
                lastSnapshot &&
                previousSnapshot &&
                lastSnapshot.date === previousSnapshot.date
            ) {
                console.warn("Delta ignored due to identical snapshot dates (restart safeguard).");
                previousSnapshot = null;
            }

            this.sendSocketNotification("LAST_UPDATE_RESULT", {
                lastDate: lastSnapshot ? lastSnapshot.date : null,
                deltaP1: previousSnapshot && lastSnapshot ? {
                    total_power_import_kwh:
                        lastSnapshot.P1.total_power_import_kwh -
                        previousSnapshot.P1.total_power_import_kwh,
                    total_power_export_kwh:
                        lastSnapshot.P1.total_power_export_kwh -
                        previousSnapshot.P1.total_power_export_kwh,
                    total_gas_m3:
                        lastSnapshot.P1.total_gas_m3 -
                        previousSnapshot.P1.total_gas_m3
                } : null,
                deltaWM: previousSnapshot && lastSnapshot ? {
                    total_liter_m3:
                        lastSnapshot.WM.total_m3 -
                        previousSnapshot.WM.total_m3,
                    total_liters:
                        lastSnapshot.WM.total_liters -
                        previousSnapshot.WM.total_liters
                } : null
            });
        }
    }

});
