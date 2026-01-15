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
        showDeltaWater: true
    },

    getStyles: function () {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations: function () {
        const availableTranslations = {
            nl: "translations/nl.json",
            en: "translations/en.json",
            de: "translations/de.json",
            fr: "translations/fr.json"
        };

        // Fallback naar EN als taal niet beschikbaar is
        if (!(config && config.language && availableTranslations[config.language])) {
            return { en: availableTranslations.en };
        }

        return availableTranslations;
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.requiresVersion = "2.9.0";

        this.urlP1 = this.config.P1_IP
            ? "http://" + this.config.P1_IP + "/api/v1/data/"
            : "https://dummyjson.com/c/f8b2-91c3-400b-8709";

        this.urlWM = this.config.WM_IP
            ? "http://" + this.config.WM_IP + "/api/v1/data/"
            : "https://dummyjson.com/c/704a-9a96-4845-bc72";

        this.MHW_P1 = {};
        this.MHW_WM = {};
        this.loadedP1 = false;
        this.loadedWM = false;
        this.errorP1 = false;
        this.errorWM = false;

        this.lastUpdateDate = null;
        this.deltaP1 = null;
        this.deltaWM = null;

        this.scheduleUpdate();

        if (this.config.showLastUpdate) this.readLastUpdate();
    },

    scheduleUpdate: function () {
        this.updateIntervalId = setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);

        setTimeout(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.initialLoadDelay);
    },

    stop: function () {
        if (this.updateIntervalId) clearInterval(this.updateIntervalId);
    },

    formatNumber: function(number) {
        let language = (config && config.language) ? config.language : 'en';
        try {
            return new Intl.NumberFormat(language).format(number);
        } catch (e) {
            return new Intl.NumberFormat('en').format(number);
        }
    },

    getDom: function () {
        var wrapper = document.createElement("div");
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

        if ((!this.loadedP1 && this.config.P1_IP) || (!this.loadedWM && this.config.WM_IP)) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small";

        if (this.config.P1_IP) this.addPowerRows(table, this.MHW_P1);
        if (this.config.WM_IP) this.addWaterRows(table, this.MHW_WM);

        if (this.config.showFooter && this.MHW_P1?.meter_model) {
            var row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.setAttribute("colspan", "2");
            cell.className = "footer";
            cell.innerHTML = '<i class="fa-solid fa-charging-station"></i>&nbsp;' + this.MHW_P1.meter_model;
            row.appendChild(cell);
            table.appendChild(row);
        }

        wrapper.appendChild(table);

        if (this.config.showLastUpdate && this.lastUpdateDate) {
            var updateRow = document.createElement("div");
            updateRow.className = "last-update small light";
            updateRow.style.marginTop = "5px";
            updateRow.innerHTML = this.translate("Last_Update") + ": " + this.lastUpdateDate;
            wrapper.appendChild(updateRow);
        }

        return wrapper;
    },

    createCell: function(content, className) {
        var cell = document.createElement("td");
        cell.className = "normal " + className;
        cell.innerHTML = content;
        return cell;
    },

    addPowerRows: function(table, data) {
        if (this.config.currentPower) {
            var row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-bolt-lightning"></i>&nbsp;' + this.translate("Current_Pwr"), "currentpowertextcell"));
            row.appendChild(this.createCell(this.formatNumber(Math.round(data.active_power_w)) + " Watt", "currentpowerdatacell"));
            table.appendChild(row);
        }

        var row = document.createElement("tr");
        row.className = "total-power-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;' + this.translate("Total_Pwr"), "totalpowertextcell"));
        row.appendChild(this.createCell(this.formatNumber(Math.round(data.total_power_import_kwh)) + " kWh", "totalpowerdatacell"));
        table.appendChild(row);

        if (this.config.showFeedback) {
            var row = document.createElement("tr");
            row.className = "total-feedback-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;' + this.translate("Total_Feedback"), "totalfeedbacktextcell"));
            row.appendChild(this.createCell(this.formatNumber(Math.round(data.total_power_export_kwh)) + " kWh", "totalfeedbackdatacell"));
            table.appendChild(row);
        }

        if (this.config.showGas) {
            var row = document.createElement("tr");
            row.className = "total-gas-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-fire"></i>&nbsp;' + this.translate("Total_Gas"), "totalgastextcell"));
            row.appendChild(this.createCell(this.formatNumber(Math.round(data.total_gas_m3)) + " m³", "totalgasdatacell"));
            table.appendChild(row);
        }

        if (this.deltaP1) {
            if (this.config.showDeltaPower) {
                var row = document.createElement("tr");
                row.className = "total-power-row";
                row.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Pwr"), "totalpowertextcell"));
                row.appendChild(this.createCell(
                    this.formatNumber(Math.round(this.deltaP1.total_power_import_kwh || 0)) + " kWh / " +
                    this.formatNumber(Math.round(this.deltaP1.total_power_export_kwh || 0)) + " kWh",
                    "totalpowerdatacell"
                ));
                table.appendChild(row);
            }

            if (this.config.showDeltaGas) {
                var gasRow = document.createElement("tr");
                gasRow.className = "total-gas-row";
                gasRow.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Gas"), "totalgastextcell"));
                gasRow.appendChild(this.createCell(
                    this.formatNumber(Math.round(this.deltaP1.total_gas_m3 || 0)) + " m³",
                    "totalgasdatacell"
                ));
                table.appendChild(gasRow);
            }
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "P1");
    },

    addWaterRows: function(table, data) {
        if (this.config.currentWater) {
            var row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-water"></i>&nbsp;' + this.translate("Current_Wtr"), "currentwatertextcell"));
            row.appendChild(this.createCell(this.formatNumber(Math.round(data.active_liter_lpm)) + " Lpm", "currentwaterdatacell"));
            table.appendChild(row);
        }

        var totalLiters = data.total_liter_m3 * 1000;
        var row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-droplet"></i>&nbsp;' + this.translate("Total_Wtr"), "totalwatertextcell"));
        row.appendChild(this.createCell(this.formatNumber(Math.round(data.total_liter_m3)) + " m³ (" + this.formatNumber(Math.round(totalLiters)) + " L)", "totalwaterdatacell"));
        table.appendChild(row);

        if (this.deltaWM && this.config.showDeltaWater) {
            var row = document.createElement("tr");
            row.className = "total-water-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-arrow-up"></i>&nbsp;' + this.translate("Delta_Wtr"), "totalwatertextcell"));
            row.appendChild(this.createCell(
                this.formatNumber(Math.round(this.deltaWM.total_liter_m3 || 0)) + " m³ (" + this.formatNumber(Math.round(this.deltaWM.total_liters || 0)) + " L)",
                "totalwaterdatacell"
            ));
            table.appendChild(row);
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "WM");
    },

    addExtraInfo: function(table, data, type) {
        var spacer = document.createElement("tr");
        spacer.innerHTML = "<td colspan='2'>&nbsp;</td>";
        table.appendChild(spacer);

        var row = document.createElement("tr");
        row.className = "wifi-row-" + type.toLowerCase();
        row.appendChild(this.createCell('<i class="fa-solid fa-wifi"></i>&nbsp;' + this.translate("Wifi_" + type), "wifitextcell" + type));
        row.appendChild(this.createCell(data.wifi_strength + " %", "wifidatacell" + type));
        table.appendChild(row);

        if (type === "P1") {
            var row = document.createElement("tr");
            row.className = "failure-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-exclamation"></i>&nbsp;' + this.translate("Fail_Pwr"), "failuretextcell"));
            row.appendChild(this.createCell(data.any_power_fail_count, "failuredatacell"));
            table.appendChild(row);
        }
    },

    getMHW_P1: function(retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWP1', { url: this.urlP1, retry });
    },

    getMHW_WM: function(retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWWM', { url: this.urlWM, retry });
    },

    processMHW_P1: function(data) {
        this.MHW_P1 = data;
        this.loadedP1 = true;
        this.errorP1 = false;
        if ((this.config.P1_IP ? this.loadedP1 : true) &&
            (this.config.WM_IP ? this.loadedWM : true)) {
            if (this.config.showLastUpdate) this.readLastUpdate();
            else this.updateDom(this.config.initialLoadDelay);
        }
    },

    processMHW_WM: function(data) {
        this.MHW_WM = data;
        this.loadedWM = true;
        this.errorWM = false;
        if ((this.config.P1_IP ? this.loadedP1 : true) &&
            (this.config.WM_IP ? this.loadedWM : true)) {
            if (this.config.showLastUpdate) this.readLastUpdate();
            else this.updateDom(this.config.initialLoadDelay);
        }
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
            console.error("MMM-MyHomeWizard P1 Error:", payload.error);
            if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
            else { this.errorP1 = true; this.updateDom(this.config.initialLoadDelay); }
        }
        else if (notification === "MHWWM_ERROR") {
            console.error("MMM-MyHomeWizard WM Error:", payload.error);
            if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
            else { this.errorWM = true; this.updateDom(this.config.initialLoadDelay); }
        }
    }

});
