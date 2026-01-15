Module.register("MMM-MyHomeWizard", {

    defaults: {
        P1_IP: null,
        WM_IP: null,
        maxWidth: "500px",
        showGas: true,
        showFeedback: true,
        currentPower: false,
        currentWater: false,
        updateInterval: 10000,
        initialLoadDelay: 1000,
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
        this.dataP1 = null;
        this.dataWM = null;
        this.snapshot = null;
        this.delta = {};

        this.loadedP1 = false;
        this.loadedWM = false;

        this.lastUpdateDate = null;

        if (this.config.showLastUpdate || this.config.showDelta) {
            this.sendSocketNotification("GET_LAST_SNAPSHOT");
        }

        setTimeout(() => this.fetchData(), this.config.initialLoadDelay);
        setInterval(() => this.fetchData(), this.config.updateInterval);
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
                this.dataP1.total_power_import_kwh -
                this.snapshot.P1.total_power_import_kwh;

            this.delta.feedback =
                this.dataP1.total_power_export_kwh -
                this.snapshot.P1.total_power_export_kwh;

            this.delta.gas =
                this.dataP1.total_gas_m3 -
                this.snapshot.P1.total_gas_m3;
        }

        if (this.dataWM && this.snapshot.WM) {
            this.delta.water =
                this.dataWM.total_liter_m3 -
                this.snapshot.WM.total_m3;
        }
    },

    getDom() {
        const wrapper = document.createElement("div");
        wrapper.style.maxWidth = this.config.maxWidth;

        if (
            (this.config.P1_IP && !this.loadedP1) ||
            (this.config.WM_IP && !this.loadedWM)
        ) {
            wrapper.innerHTML = "Loading...";
            wrapper.className = "small bright";
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.dataP1) {
            table.appendChild(this.row("Total_Pwr", `${this.dataP1.total_power_import_kwh.toFixed(2)} kWh`));

            if (this.config.showDelta && this.delta.power !== undefined) {
                table.appendChild(this.row("Delta", `+${this.delta.power.toFixed(2)} kWh`));
            }

            if (this.config.showFeedback) {
                table.appendChild(this.row("Total_Feedback", `${this.dataP1.total_power_export_kwh.toFixed(2)} kWh`));

                if (this.config.showDelta && this.delta.feedback !== undefined) {
                    table.appendChild(this.row("Delta", `+${this.delta.feedback.toFixed(2)} kWh`));
                }
            }

            if (this.config.showGas) {
                table.appendChild(this.row("Total_Gas", `${this.dataP1.total_gas_m3.toFixed(2)} m³`));

                if (this.config.showDelta && this.delta.gas !== undefined) {
                    table.appendChild(this.row("Delta", `+${this.delta.gas.toFixed(2)} m³`));
                }
            }
        }

        if (this.dataWM) {
            table.appendChild(this.row("Total_Wtr", `${this.dataWM.total_liter_m3.toFixed(2)} m³`));

            if (this.config.showDelta && this.delta.water !== undefined) {
                table.appendChild(this.row("Delta", `+${this.delta.water.toFixed(2)} m³`));
            }
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

    row(labelKey, value) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${this.translate(labelKey)}</td><td>${value}</td>`;
        return tr;
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
