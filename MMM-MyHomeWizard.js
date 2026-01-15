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
        this.dailyUsage = null;
        this.loadedP1 = false;
        this.loadedWM = false;

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
            this.MHW_P1 = payload;
            this.loadedP1 = true;
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWWM_RESULT") {
            this.MHW_WM = payload;
            this.loadedWM = true;
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "DAILY_USAGE") {
            this.dailyUsage = payload;
            this.updateDom(this.config.initialLoadDelay);
        }
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

        // --- Actuele data rijen toevoegen hier (zoals eerder) ---

        // --- DAGELIJKS VERBRUIK ---
        if (this.dailyUsage) {
            const items = [
                {label: "Daily_Electricity", value: this.dailyUsage.electricity_kwh, unit: "kWh"},
                {label: "Daily_Water", value: this.dailyUsage.water_m3, unit: "m³"},
                {label: "Daily_Gas", value: this.dailyUsage.gas_m3, unit: "m³"},
                {label: "Daily_Feedback", value: this.dailyUsage.feed_kwh, unit: "kWh"}
            ];

            items.forEach(item => {
                if (item.value !== undefined) {
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
