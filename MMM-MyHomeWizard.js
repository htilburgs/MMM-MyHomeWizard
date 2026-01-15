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
        updateInterval: 10000,
        fetchTimeout: 5000,
        retryCount: 2,
        showLastUpdate: true,
        showDeltaPower: true,
        showDeltaGas: true,
        showDeltaWater: true,
        language: "nl"
    },

    supportedLanguages: ["nl", "en", "fr", "de"],

    getStyles: function() {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations: function() {
        return {
            nl: "translations/nl.json",
            en: "translations/en.json",
            fr: "translations/fr.json",
            de: "translations/de.json"
        };
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.requiresVersion = "2.9.0";

        if (!this.supportedLanguages.includes(this.config.language)) {
            Log.warn(`Unsupported language '${this.config.language}', fallback to 'en'.`);
            this.config.language = "en";
        }

        this.urlP1 = this.config.P1_IP ? `http://${this.config.P1_IP}/api/v1/data/` : "https://dummyjson.com/c/f8b2-91c3-400b-8709";
        this.urlWM = this.config.WM_IP ? `http://${this.config.WM_IP}/api/v1/data/` : "https://dummyjson.com/c/704a-9a96-4845-bc72";

        this.MHW_P1 = {};
        this.MHW_WM = {};
        this.errorP1 = false;
        this.errorWM = false;

        this.lastUpdateDate = null;
        this.deltaP1 = { total_power_import_kwh: 0, total_power_export_kwh: 0, total_gas_m3: 0 };
        this.deltaWM = { total_liter_m3: 0, total_liters: 0 };

        this.sendSocketNotification('SET_LOCALE', { locale: this.config.language });

        this.scheduleUpdate();
        if (this.config.showLastUpdate) this.readLastUpdate();
    },

    scheduleUpdate: function() {
        this.updateIntervalId = setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);

        setTimeout(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.initialLoadDelay);
    },

    stop: function() {
        if (this.updateIntervalId) clearInterval(this.updateIntervalId);
    },

    formatNumber: function(number) {
        const locale = this.supportedLanguages.includes(this.config.language) ? this.config.language : "en";
        return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true }).format(Math.round(number || 0));
    },

    createCell: function(content, className) {
        const cell = document.createElement("td");
        cell.className = "normal " + className;
        cell.innerHTML = content;
        return cell;
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        if (this.config.P1_IP && this.errorP1) {
            wrapper.innerHTML = '<span class="error">P1 Meter offline</span>';
            return wrapper;
        }
        if (this.config.WM_IP && this.errorWM) {
            wrapper.innerHTML = '<span class="error">Water Meter offline</span>';
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.config.P1_IP) this.addPowerRows(table, this.MHW_P1);
        if (this.config.WM_IP) this.addWaterRows(table, this.MHW_WM);

        if (this.config.showFooter && this.MHW_P1?.meter_model) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.setAttribute("colspan", "2");
            cell.className = "footer";
            cell.innerHTML = `<i class="fa-solid fa-charging-station"></i>&nbsp;${this.MHW_P1.meter_model}`;
            row.appendChild(cell);
            table.appendChild(row);
        }

        wrapper.appendChild(table);

        if (this.config.showLastUpdate && this.lastUpdateDate) {
            const updateRow = document.createElement("div");
            updateRow.className = "last-update small light";
            updateRow.style.marginTop = "5px";
            updateRow.innerHTML = `${this.translate("Last_Update")}: ${this.lastUpdateDate}`;
            wrapper.appendChild(updateRow);
        }

        return wrapper;
    },

    addPowerRows: function(table, data) {
        const d = data || {};
        const totalPower = d.total_power_import_kwh ?? 0;
        const totalFeedback = d.total_power_export_kwh ?? 0;
        const totalGas = d.total_gas_m3 ?? 0;
        const currentPower = d.active_power_w ?? 0;

        if (this.config.currentPower) {
            const row = document.createElement("tr");
            row.appendChild(this.createCell('<i class="fa-solid fa-bolt-lightning"></i>&nbsp;' + this.translate("Current_Pwr"), "currentpowertextcell"));
            row.appendChild(this.createCell(this.formatNumber(currentPower) + " Watt", "currentpowerdatacell"));
            table.appendChild(row);
        }

        const rowTotal = document.createElement("tr");
        rowTotal.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;' + this.translate("Total_Pwr"), "totalpowertextcell"));
        rowTotal.appendChild(this.createCell(this.formatNumber(totalPower) + " kWh", "totalpowerdatacell"));
        table.appendChild(rowTotal);

        if (this.config.showFeedback) {
            const rowFeedback = document.createElement("tr");
            rowFeedback.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;' + this.translate("Total_Feedback"), "totalfeedbacktextcell"));
            rowFeedback.appendChild(this.createCell(this.formatNumber(totalFeedback) + " kWh", "totalfeedbackdatacell"));
            table.appendChild(rowFeedback);
        }

        if (this.config.showGas) {
            const rowGas = document.createElement("tr");
            rowGas.appendChild(this.createCell('<i class="fa-solid fa-fire"></i>&nbsp;' + this.translate("Total_Gas"), "totalgastextcell"));
            rowGas.appendChild(this.createCell(this.formatNumber(totalGas) + " m³", "totalgasdatacell"));
            table.appendChild(rowGas);
        }

        if (this.deltaP1) {
            if (this.config.showDeltaPower) {
                const rowDelta = document.createElement("tr");
                rowDelta.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Pwr"), "totalpowertextcell"));
                rowDelta.appendChild(this.createCell(
                    this.formatNumber(this.deltaP1.total_power_import_kwh) + " kWh / " +
                    this.formatNumber(this.deltaP1.total_power_export_kwh) + " kWh",
                    "totalpowerdatacell"
                ));
                table.appendChild(rowDelta);
            }
            if (this.config.showDeltaGas) {
                const rowDeltaGas = document.createElement("tr");
                rowDeltaGas.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Gas"), "totalgastextcell"));
                rowDeltaGas.appendChild(this.createCell(this.formatNumber(this.deltaP1.total_gas_m3) + " m³", "totalgasdatacell"));
                table.appendChild(rowDeltaGas);
            }
        }

        if (this.config.extraInfo) this.addExtraInfo(table, d, "P1");
    },

    addWaterRows: function(table, data) {
        const d = data || {};
        const totalM3 = d.total_liter_m3 ?? 0;
        const totalLiters = totalM3 * 1000;
        const currentWater = d.active_liter_lpm ?? 0;

        if (this.config.currentWater) {
            const row = document.createElement("tr");
            row.appendChild(this.createCell('<i class="fa-solid fa-water"></i>&nbsp;' + this.translate("Current_Wtr"), "currentwatertextcell"));
            row.appendChild(this.createCell(this.formatNumber(currentWater) + " Lpm", "currentwaterdatacell"));
            table.appendChild(row);
        }

        const rowTotal = document.createElement("tr");
        rowTotal.appendChild(this.createCell('<i class="fa-solid fa-droplet"></i>&nbsp;' + this.translate("Total_Wtr"), "totalwatertextcell"));
        rowTotal.appendChild(this.createCell(this.formatNumber(totalM3) + " m³ (" + this.formatNumber(totalLiters) + " L)", "totalwaterdatacell"));
        table.appendChild(rowTotal);

        if (this.deltaWM && this.config.showDeltaWater) {
            const rowDelta = document.createElement("tr");
            rowDelta.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Wtr"), "totalwatertextcell"));
            rowDelta.appendChild(this.createCell(
                this.formatNumber(this.deltaWM.total_liter_m3) + " m³ (" + this.formatNumber(this.deltaWM.total_liters) + " L)",
                "totalwaterdatacell"
            ));
            table.appendChild(rowDelta);
        }

        if (this.config.extraInfo) this.addExtraInfo(table, d, "WM");
    },

    addExtraInfo: function(table, data, type) {
        const d = data || {};
        const spacer = document.createElement("tr");
        spacer.innerHTML = "<td colspan='2'>&nbsp;</td>";
        table.appendChild(spacer);

        const rowWifi = document.createElement("tr");
        rowWifi.appendChild(this.createCell('<i class="fa-solid fa-wifi"></i>&nbsp;' + this.translate("Wifi_" + type), "wifitextcell" + type));
        rowWifi.appendChild(this.createCell(this.formatNumber(d.wifi_strength ?? 0) + " %", "wifidatacell" + type));
        table.appendChild(rowWifi);

        if (type === "P1") {
            const rowFail = document.createElement("tr");
            rowFail.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-exclamation"></i>&nbsp;' + this.translate("Fail_Pwr"), "failuretextcell"));
            rowFail.appendChild(this.createCell(this.formatNumber(d.any_power_fail_count ?? 0), "failuredatacell"));
            table.appendChild(rowFail);
        }
    },

    getMHW_P1: function(retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWP1', { url: this.urlP1, retry });
    },

    getMHW_WM: function(retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWWM', { url: this.urlWM, retry });
    },

    processMHW_P1: function(data) {
        this.MHW_P1 = data || {};
        this.errorP1 = false;
        this.updateDom();
    },

    processMHW_WM: function(data) {
        this.MHW_WM = data || {};
        this.errorWM = false;
        this.updateDom();
    },

    readLastUpdate: function() {
        this.sendSocketNotification("GET_LAST_UPDATE");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") this.processMHW_P1(payload);
        else if (notification === "MHWWM_RESULT") this.processMHW_WM(payload);
        else if (notification === "LAST_UPDATE_RESULT") {
            this.lastUpdateDate = payload.lastDate;
            this.deltaP1 = payload.deltaP1;
            this.deltaWM = payload.deltaWM;
            this.updateDom();
        }
        else if (notification === "MHWP1_ERROR") {
            if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
            else { this.errorP1 = true; this.updateDom(); }
        }
        else if (notification === "MHWWM_ERROR") {
            if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
            else { this.errorWM = true; this.updateDom(); }
        }
    }

});
