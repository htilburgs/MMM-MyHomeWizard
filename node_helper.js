const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({

    start() {
        console.log("Starting node_helper for MMM-MyHomeWizard");
        this.MHW_P1 = null;
        this.MHW_WM = null;
        this.snapshotAlreadyLogged = false;
        this.scheduleNightlySave();
    },

    scheduleNightlySave() {
        const now = new Date();
        const midnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 0, 0
        );
        const delay = midnight - now;

        setTimeout(() => {
            this.saveDailyData();
            setInterval(() => this.saveDailyData(), 24 * 60 * 60 * 1000);
        }, delay);
    },

    saveDailyData() {
        if (!this.MHW_P1 && !this.MHW_WM) return;

        const file = path.join(__dirname, "history_data.json");
        let history = [];

        if (fs.existsSync(file)) {
            try {
                history = JSON.parse(fs.readFileSync(file, "utf8"));
            } catch (e) {
                console.error("History read failed:", e.message);
            }
        }

        const today = new Date().toISOString().split("T")[0];

        if (history.some(h => h.date === today)) {
            if (!this.snapshotAlreadyLogged) {
                console.log("Snapshot for today already exists.");
                this.snapshotAlreadyLogged = true;
            }
            return;
        }

        history.push({
            date: today,
            P1: {
                import: this.MHW_P1?.total_power_import_kwh || 0,
                export: this.MHW_P1?.total_power_export_kwh || 0,
                gas: this.MHW_P1?.total_gas_m3 || 0
            },
            WM: {
                water: this.MHW_WM?.total_liter_m3 || 0
            }
        });

        history = history.slice(-30);

        fs.writeFileSync(file, JSON.stringify(history, null, 2));
        console.log("Daily snapshot saved");
    },

    async fetchData(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "GET_P1") {
            this.fetchData(payload.url)
                .then(data => {
                    this.MHW_P1 = data;
                    this.sendSocketNotification("P1_RESULT", data);
                    this.saveDailyData();
                })
                .catch(err => this.sendSocketNotification("P1_ERROR", err.message));
        }

        if (notification === "GET_WM") {
            this.fetchData(payload.url)
                .then(data => {
                    this.MHW_WM = data;
                    this.sendSocketNotification("WM_RESULT", data);
                    this.saveDailyData();
                })
                .catch(err => this.sendSocketNotification("WM_ERROR", err.message));
        }

        if (notification === "GET_HISTORY") {
            const file = path.join(__dirname, "history_data.json");
            let history = [];

            if (fs.existsSync(file)) {
                history = JSON.parse(fs.readFileSync(file, "utf8"));
            }

            const labels = [];
            const pImport = [];
            const pExport = [];
            const gas = [];
            const water = [];

            for (let i = 1; i < history.length; i++) {
                const prev = history[i - 1];
                const cur = history[i];

                labels.push(cur.date.slice(5));
                pImport.push(cur.P1.import - prev.P1.import);
                pExport.push(cur.P1.export - prev.P1.export);
                gas.push(cur.P1.gas - prev.P1.gas);
                water.push(cur.WM.water - prev.WM.water);
            }

            this.sendSocketNotification("HISTORY_RESULT", {
                labels,
                powerImport: pImport,
                powerExport: pExport,
                gas,
                water
            });
        }
    }
});
