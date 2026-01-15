Module.register("MMM-MyHomeWizard", {

    defaults: {
        P1_IP: null,
        WM_IP: null,

        updateInterval: 10000,
        initialLoadDelay: 1000,

        showGas: true,
        showFeedback: true,

        showDeltaCharts: true,
        showDeltaPowerChart: true,
        showDeltaGasChart: true,
        showDeltaWaterChart: true,

        historyDays: 30
    },

    getScripts() {
        return ["https://cdn.jsdelivr.net/npm/chart.js"];
    },

    getTranslations() {
        return {
            en: "translations/en.json",
            nl: "translations/nl.json",
            de: "translations/de.json",
            fr: "translations/fr.json"
        };
    },

    start() {
        this.loadedP1 = false;
        this.loadedWM = false;
        this.history = null;
        this.charts = {};

        this.urlP1 = this.config.P1_IP
            ? `http://${this.config.P1_IP}/api/v1/data/`
            : null;

        this.urlWM = this.config.WM_IP
            ? `http://${this.config.WM_IP}/api/v1/data/`
            : null;

        setTimeout(() => {
            if (this.urlP1) this.sendSocketNotification("GET_P1", { url: this.urlP1 });
            if (this.urlWM) this.sendSocketNotification("GET_WM", { url: this.urlWM });
            this.sendSocketNotification("GET_HISTORY");
        }, this.config.initialLoadDelay);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "P1_RESULT") {
            this.P1 = payload;
            this.loadedP1 = true;
            this.updateDom();
        }

        if (notification === "WM_RESULT") {
            this.WM = payload;
            this.loadedWM = true;
            this.updateDom();
        }

        if (notification === "HISTORY_RESULT") {
            this.history = payload;
            this.updateDom();
        }
    },

    formatNumber(value) {
        const lang = this.config.language || "en";
        return new Intl.NumberFormat(lang).format(value);
    },

    getDom() {
        const wrapper = document.createElement("div");

        if (!this.loadedP1 && !this.loadedWM) {
            wrapper.innerHTML = "Loading…";
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.P1) {
            table.innerHTML += `
                <tr><td>Total power</td><td>${this.formatNumber(this.P1.total_power_import_kwh)} kWh</td></tr>
                <tr><td>Total gas</td><td>${this.formatNumber(this.P1.total_gas_m3)} m³</td></tr>
            `;
        }

        if (this.WM) {
            table.innerHTML += `
                <tr><td>Total water</td><td>${this.formatNumber(this.WM.total_liter_m3)} m³</td></tr>
            `;
        }

        wrapper.appendChild(table);

        if (this.config.showDeltaCharts && this.history) {
            wrapper.appendChild(this.createChart(
                this.translate("Delta_Pwr"),
                this.history.labels,
                [
                    { label: "Import", data: this.history.powerImport },
                    { label: "Export", data: this.history.powerExport }
                ]
            ));

            if (this.config.showDeltaGasChart) {
                wrapper.appendChild(this.createChart(
                    this.translate("Delta_Gas"),
                    this.history.labels,
                    [{ label: "Gas", data: this.history.gas }]
                ));
            }

            if (this.config.showDeltaWaterChart) {
                wrapper.appendChild(this.createChart(
                    this.translate("Delta_Wtr"),
                    this.history.labels,
                    [{ label: "Water", data: this.history.water }]
                ));
            }
        }

        return wrapper;
    },

    createChart(title, labels, datasets) {
        const canvas = document.createElement("canvas");
        canvas.height = 180;

        setTimeout(() => {
            if (this.charts[title]) this.charts[title].destroy();

            this.charts[title] = new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: title }
                    },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }, 0);

        return canvas;
    }
});
