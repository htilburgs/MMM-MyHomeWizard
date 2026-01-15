Module.register('MMM-MyHomeWizard', {

    defaults: {
        P1_IP: null,
        WM_IP: null,
        maxWidth: "500px",
        extraInfo: false,
        showFooter: false,
        showGas: true,
        showFeedback: true,
        currentPower: false,
        currentWater: false,
        initialLoadDelay: 1000,
        updateInterval: 10000
    },

    getStyles: function() {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations: function() {
        return {
            nl: "translations/nl.json",
            en: "translations/en.json"
        };
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.requiresVersion = "2.9.0";

        this.urlP1 = this.config.P1_IP ? "http://" + this.config.P1_IP + "/api/v1/data/" : "https://dummyjson.com/c/f8b2-91c3-400b-8709";
        this.urlWM = this.config.WM_IP ? "http://" + this.config.WM_IP + "/api/v1/data/" : "https://dummyjson.com/c/704a-9a96-4845-bc72";

        this.MHW_P1 = [];
        this.MHW_WM = [];
        this.loadedP1 = false;
        this.loadedWM = false;
        this.errorP1 = false;
        this.errorWM = false;

        this.lastP1 = {};
        this.lastWM = {};

        this.scheduleUpdate();
    },

    scheduleUpdate: function() {
        setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);

        this.getMHW_P1();
        this.getMHW_WM();
    },

    getMHW_P1: function() {
        this.sendSocketNotification('GET_MHWP1', this.urlP1);
    },

    getMHW_WM: function() {
        this.sendSocketNotification('GET_MHWWM', this.urlWM);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.processMHW_P1(payload);
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWWM_RESULT") {
            this.processMHW_WM(payload);
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWP1_ERROR") {
            console.error(payload.error);
            this.errorP1 = true;
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWWM_ERROR") {
            console.error(payload.error);
            this.errorWM = true;
            this.updateDom(this.config.initialLoadDelay);
        }
    },

    processMHW_P1: function(data) {
        this.MHW_P1 = data;
        this.lastP1 = data;
        this.loadedP1 = true;
        this.errorP1 = false;
    },

    processMHW_WM: function(data) {
        this.MHW_WM = data;
        this.lastWM = data;
        this.loadedWM = true;
        this.errorWM = false;
    },

    calculateDailyConsumption: function() {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(__dirname, 'node_helper/data/meter_history.json');
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
    },

    createCell: function(innerHTML, className) {
        const td = document.createElement("td");
        td.className = className;
        td.innerHTML = innerHTML;
        return td;
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        if ((!this.loadedP1 && this.config.P1_IP) || (!this.loadedWM && this.config.WM_IP)) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        const MHW_P1 = this.MHW_P1;
        const MHW_WM = this.MHW_WM;

        // Voeg actuele waarden hier (zoals eerder)

        // --- DAGELIJKS VERBRUIK ---
        const dailyUsage = this.calculateDailyConsumption();
        if (dailyUsage) {
            const items = [
                {label: "Daily_Electricity", value: dailyUsage.electricity_kwh, unit: "kWh", show: true},
                {label: "Daily_Water", value: dailyUsage.water_m3, unit: "m³", show: true},
                {label: "Daily_Gas", value: dailyUsage.gas_m3, unit: "m³", show: this.config.showGas},
                {label: "Daily_Feedback", value: dailyUsage.feed_kwh, unit: "kWh", show: this.config.showFeedback}
            ];

            items.forEach(item => {
                if (item.show && item.value !== undefined) {
                    const row = document.createElement("tr");
                    row.appendChild(this.createCell('<i class="fa-solid fa-clock"></i>&nbsp;' + this.translate(item.label), "dailytextcell"));
                    row.appendChild(this.createCell(Math.round(item.value * 100) / 100 + " " + item.unit, "dailydatacell"));
                    table.appendChild(row);
                }
            });
        }

        wrapper.appendChild(table);
        return wrapper;
    }

});
