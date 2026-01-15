Module.register("MMM-MyHomeWizard", {

    defaults: {
        P1_IP: null,
        WM_IP: null,
        maxWidth: "500px",
        showGas: true,
        showFeedback: true,
        currentPower: false,
        currentWater: false,
        extraInfo: false,
        showFooter: false,
        initialLoadDelay: 1000,
        updateInterval: 10000,
        retryCount: 2,
        showLastUpdate: true,
        showDelta: true
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

        this.dataP1 = {};
        this.dataWM = {};
        this.snapshot = null;
        this.delta = {};

        this.loadedP1 = false;
        this.loadedWM = false;

        this.lastUpdateDate = null;

        // Initial fetch and snapshot request
        setTimeout(() => this.fetchData(), this.config.initialLoadDelay);
        setInterval(() => this.fetchData(), this.config.updateInterval);

        if (this.config.showLastUpdate || this.config.showDelta) {
            this.sendSocketNotification("GET_LAST_SNAPSHOT");
        }
    },

    fetchData() {
        if (this.config.P1_IP) {
            this.sendSocketNotification("GET_MHWP1", {
                url: `http://${this.config.P1_IP}/api/v1/data/`,
                retry: this.config.retryCount
            });
        }

        if (this.config.WM_IP) {
            this.sendSocketNotification("GET_MHWWM", {
                url: `http://${this.config.WM_IP}/api/v1/data/`,
                retry: this.config.retryCount
            });
        }
    },

    calculateDelta() {
        if (!this.snapshot) return;

        if (this.dataP1 && this.snapshot.P1) {
            this.delta.power =
                this.dataP1.total_power_import_kwh - this.snapshot.P1.total_power_import_kwh;
            this.delta.feedback =
                this.dataP1.total_power_export_kwh - this.snapshot.P1.total_power_export_kwh;
            this.delta.gas =
                this.dataP1.total_gas_m3 - this.snapshot.P1.total_gas_m3;
        }

        if (this.dataWM && this.snapshot.WM) {
            this.delta.water =
                this.dataWM.total_liter_m3 - this.snapshot.WM.total_m3;
        }
    },

    getDom() {
        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        // Loading state
        if (
            (this.config.P1_IP && !this.loadedP1) ||
            (this.config.WM_IP && !this.loadedWM)
        ) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("small", "bright");
            return wrapper;
        }

        // Error state
        if ((this.config.P1_IP && !this.dataP1) || (this.config.WM_IP && !this.dataWM)) {
            wrapper.innerHTML = '<span class="error">Meter offline</span>';
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.config.P1_IP) this.buildPowerRows(table);
        if (this.config.WM_IP) this.buildWaterRows(table);

        if (this.config.showFooter && this.dataP1?.meter_model) {
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
            table.appendChild(this.createRow("Current_Pwr", `${Math.round(this.dataP1.active_power_w)} W`));
        }

        table.appendChild(this.createRow("Total_Pwr", `${Math.round(this.dataP1.total_power_import_kwh)} kWh`));

        if (this.config.showDelta && this.delta.power !== undefined) {
            table.appendChild(this.createRow("Delta", `+${this.delta.power.toFixed(2)} kWh`));
        }

        if (this.config.showFeedback) {
            table.appendChild(this.createRow("Total_Feedback", `${Math.round(this.dataP1.total_power_export_kwh)} kWh`));
            if (this.config.showDelta && this.delta.feedback !== undefined) {
                table.appendChild(this.createRow("Delta", `+${this.delta.feedback.toFixed(2)} kWh`));
            }
        }

        if (this.config.showGas) {
            table.appendChild(this.createRow("Total_Gas", `${Math.round(this.dataP1.total_gas_m3)} m³`));
            if (this.config.showDelta && this.delta.gas !== undefined) {
                table.appendChild(this.createRow("Delta", `+${this.delta.gas.toFixed(2)} m³`));
            }
        }
    },

    buildWaterRows(table) {
        table.appendChild(this.createRow("Total_Wtr", `${Math.round(this.dataWM.total_liter_m3)} m³`));
        if (this.config.showDelta && this.delta.water !== undefined) {
            table.appendChild(this.createRow("Delta", `+${this.delta.water.toFixed(2)} m³`));
        }
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
            this.calculateDelta();
        }

        if (notification === "MHWWM_RESULT") {
            this.dataWM = payload;
            this.loadedWM = true;
            this.calculateDelta();
        }

        if (notification === "LAST_SNAPSHOT_RESULT") {
            this.snapshot = payload;
            this.lastUpdateDate = payload?.date || null;
            this.calculateDelta();
        }

        this.updateDom();
    }

});
