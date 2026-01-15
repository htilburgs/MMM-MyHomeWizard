Module.register("MMM-MyHomeWizard", {

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
        updateInterval: 10000,
        fetchTimeout: 5000,
        retryCount: 2,
        showLastUpdate: true
    },

    requiresVersion: "2.9.0",

    getStyles() {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations() {
        return {
            en: "translations/en.json",
            nl: "translations/nl.json"
        };
    },

    start() {
        Log.info(`Starting module: ${this.name}`);

        this.urlP1 = this.config.P1_IP
            ? `http://${this.config.P1_IP}/api/v1/data/`
            : null;

        this.urlWM = this.config.WM_IP
            ? `http://${this.config.WM_IP}/api/v1/data/`
            : null;

        this.dataP1 = {};
        this.dataWM = {};

        this.loadedP1 = false;
        this.loadedWM = false;
        this.errorP1 = false;
        this.errorWM = false;

        this.lastUpdateDate = null;

        this.scheduleUpdate();

        if (this.config.showLastUpdate) {
            this.sendSocketNotification("GET_LAST_UPDATE");
        }
    },

    scheduleUpdate() {
        setTimeout(() => {
            this.fetchAll();
        }, this.config.initialLoadDelay);

        setInterval(() => {
            this.fetchAll();
        }, this.config.updateInterval);
    },

    fetchAll() {
        if (this.urlP1) this.sendSocketNotification("GET_MHWP1", { url: this.urlP1, retry: this.config.retryCount });
        if (this.urlWM) this.sendSocketNotification("GET_MHWWM", { url: this.urlWM, retry: this.config.retryCount });
    },

    getDom() {
        const wrapper = document.createElement("div");
        wrapper.style.maxWidth = this.config.maxWidth;

        if (
            (this.config.P1_IP && !this.loadedP1) ||
            (this.config.WM_IP && !this.loadedWM)
        ) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "bright small";
            return wrapper;
        }

        if (this.errorP1 || this.errorWM) {
            wrapper.innerHTML = "Meter offline";
            wrapper.className = "error";
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.config.P1_IP) this.buildPowerRows(table);
        if (this.config.WM_IP) this.buildWaterRows(table);

        if (this.config.showFooter && this.dataP1.meter_model) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 2;
            cell.className = "footer";
            cell.innerHTML = this.dataP1.meter_model;
            row.appendChild(cell);
            table.appendChild(row);
        }

        wrapper.appendChild(table);

        if (this.config.showLastUpdate && this.lastUpdateDate) {
            const update = document.createElement("div");
            update.className = "last-update";
            update.innerHTML = `${this.translate("Last_Update")}: ${this.lastUpdateDate}`;
            wrapper.appendChild(update);
        }

        return wrapper;
    },

    buildPowerRows(table) {
        if (this.config.currentPower) {
            table.appendChild(this.createRow(
                "Current_Pwr",
                `${Math.round(this.dataP1.active_power_w)} W`
            ));
        }

        table.appendChild(this.createRow(
            "Total_Pwr",
            `${Math.round(this.dataP1.total_power_import_kwh)} kWh`
        ));

        if (this.config.showFeedback) {
            table.appendChild(this.createRow(
                "Total_Feedback",
                `${Math.round(this.dataP1.total_power_export_kwh)} kWh`
            ));
        }

        if (this.config.showGas) {
            table.appendChild(this.createRow(
                "Total_Gas",
                `${Math.round(this.dataP1.total_gas_m3)} m³`
            ));
        }
    },

    buildWaterRows(table) {
        if (this.config.currentWater) {
            table.appendChild(this.createRow(
                "Current_Wtr",
                `${Math.round(this.dataWM.active_liter_lpm)} L/m`
            ));
        }

        table.appendChild(this.createRow(
            "Total_Wtr",
            `${Math.round(this.dataWM.total_liter_m3)} m³`
        ));
    },

    createRow(labelKey, value) {
        const row = document.createElement("tr");

        const label = document.createElement("td");
        label.innerHTML = this.translate(labelKey);

        const data = document.createElement("td");
        data.innerHTML = value;

        row.appendChild(label);
        row.appendChild(data);
        return row;
    },

    socketNotificationReceived(notification, payload) {

        if (notification === "MHWP1_RESULT") {
            this.dataP1 = payload;
            this.loadedP1 = true;
            this.errorP1 = false;
        }

        if (notification === "MHWWM_RESULT") {
            this.dataWM = payload;
            this.loadedWM = true;
            this.errorWM = false;
        }

        if (notification === "LAST_UPDATE_RESULT") {
            this.lastUpdateDate = payload;
        }

        if (notification === "MHWP1_ERROR") {
            this.errorP1 = true;
        }

        if (notification === "MHWWM_ERROR") {
            this.errorWM = true;
        }

        this.updateDom();
    }

});
