Module.register('MMM-MyHomeWizard', {

    defaults: {
        maxWidth: "500px",
        extraInfo: false,
        showFooter: true,
        showGas: true,
        showFeedback: true,
        currentPower: true,
        currentWater: true,
        initialLoadDelay: 1000
    },

    getStyles: function() {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations: function() {
        return { nl: "translations/nl.json", en: "translations/en.json" };
    },

    start: function() {
        Log.info("Starting module: " + this.name);

        this.MHW_P1 = {};
        this.MHW_WM = {};
        this.dailyUsage = {};
        this.loadedP1 = false;
        this.loadedWM = false;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.MHW_P1 = payload;
            this.loadedP1 = true;
            this.updateDom(this.config.initialLoadDelay);
        }
        else if (notification === "MHWWM_RESULT") {
            this.MHW_WM = payload;
            this.loadedWM = true;
            this.updateDom(this.config.initialLoadDelay);
        }
        else if (notification === "DAILY_USAGE") {
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

        if (!this.loadedP1 || !this.loadedWM) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        // --- Actuele P1 data ---
        const rowP1 = document.createElement("tr");
        rowP1.appendChild(this.createCell("Total Power", "textcell"));
        rowP1.appendChild(this.createCell(this.MHW_P1.total_power_import_kwh + " kWh", "datacell"));
        table.appendChild(rowP1);

        // --- Actuele Water data ---
        const rowWM = document.createElement("tr");
        rowWM.appendChild(this.createCell("Total Water", "textcell"));
        rowWM.appendChild(this.createCell(this.MHW_WM.total_liter_m3 + " m³", "datacell"));
        table.appendChild(rowWM);

        // --- Dagelijks verbruik ---
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
                    row.appendChild(this.createCell(item.label, "dailytextcell"));
                    row.appendChild(this.createCell(Math.round(item.value*100)/100 + " " + item.unit, "dailydatacell"));
                    table.appendChild(row);
                }
            });
        }

        wrapper.appendChild(table);
        return wrapper;
    }

});
