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
        currentVoltage: false, // compacte 3-fase met auto detectie
        initialLoadDelay: 1000,
        updateInterval: 10000,
        fetchTimeout: 5000,
        retryCount: 2,
        showLastUpdate: true,
        showDeltaPower: true,
        showDeltaGas: true,
        showDeltaWater: true
    },

    getStyles: () => ["MMM-MyHomeWizard.css"],

    getTranslations: function () {
        const translations = {
            nl: "translations/nl.json",
            en: "translations/en.json",
            de: "translations/de.json",
            fr: "translations/fr.json"
        };
        return (config?.language && translations[config.language])
            ? translations
            : { en: translations.en };
    },

    start: function () {
        Log.info(`Starting module: ${this.name}`);
        this.requiresVersion = "2.9.0";

        this.urlP1 = this.config.P1_IP
            ? `http://${this.config.P1_IP}/api/v1/data/`
            : "https://dummyjson.com/c/f8b2-91c3-400b-8709";

        this.urlWM = this.config.WM_IP
            ? `http://${this.config.WM_IP}/api/v1/data/`
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

    formatNumber: function (number) {
        const lang = this.config.language || 'en';
        try {
            return new Intl.NumberFormat(lang).format(number);
        } catch {
            return new Intl.NumberFormat('en-GB').format(number);
        }
    },

    getDom: function () {
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

        if ((!this.loadedP1 && this.config.P1_IP) || (!this.loadedWM && this.config.WM_IP)) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
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

    createCell: function (content, className) {
        const cell = document.createElement("td");
        cell.className = `normal ${className}`;
        cell.innerHTML = content;
        return cell;
    },

    addPowerRows: function (table, data) {

        // ⚡ Current power
        if (this.config.currentPower) {
            const row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell(
                `<i class="fa-solid fa-bolt-lightning"></i>&nbsp;${this.translate("Current_Pwr")}`,
                "currentpowertextcell"
            ));
            row.appendChild(this.createCell(
                `${this.formatNumber(Math.round(data.active_power_w))} Watt`,
                "currentpowerdatacell"
            ));
            table.appendChild(row);
        }

        // Total power
        const totalRow = document.createElement("tr");
        totalRow.className = "total-power-row";
        totalRow.appendChild(this.createCell(
            `<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;${this.translate("Total_Pwr")}`,
            "totalpowertextcell"
        ));
        totalRow.appendChild(this.createCell(
            `${this.formatNumber(Math.round(data.total_power_import_kwh))} kWh`,
            "totalpowerdatacell"
        ));
        table.appendChild(totalRow);

        // Total Feedback
        if (this.config.showFeedback) {
            const feedbackRow = document.createElement("tr");
            feedbackRow.className = "total-feedback-row";
            feedbackRow.appendChild(this.createCell(`<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;${this.translate("Total_Feedback")}`, "totalfeedbacktextcell"));
            feedbackRow.appendChild(this.createCell(`${this.formatNumber(Math.round(data.total_power_export_kwh))} kWh`, "totalfeedbackdatacell"));
            table.appendChild(feedbackRow);
        }

        // Delta Power
        if (this.deltaP1 && this.config.showDeltaPower) {
            const row = document.createElement("tr");
            row.className = "total-power-row";
            row.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Pwr")}`, "totalpowertextcell"));
            row.appendChild(this.createCell(
                `${this.formatNumber(Math.round(this.deltaP1.total_power_import_kwh || 0))} kWh / ${this.formatNumber(Math.round(this.deltaP1.total_power_export_kwh || 0))} kWh`,
                "totalpowerdatacell"
            ));
            table.appendChild(row);
        }

        // ⚡ Voltage regel nu onder Delta Power, met fa-bolt
        if (this.config.currentVoltage) {
            const v1 = Math.round(data.active_voltage_l1_v || 0);
            const v2 = Math.round(data.active_voltage_l2_v || 0);
            const v3 = Math.round(data.active_voltage_l3_v || 0);

            const voltages = [];
            if (v1 > 0) voltages.push(this.formatNumber(v1));
            if (v2 > 0) voltages.push(this.formatNumber(v2));
            if (v3 > 0) voltages.push(this.formatNumber(v3));

            if (voltages.length > 0) {
                const row = document.createElement("tr");
                row.className = "voltage-compact-row";

                row.appendChild(this.createCell(
                    `<i class="fa-solid fa-bolt"></i>&nbsp;${this.translate("Voltage")}`,
                    "voltagetextcell"
                ));

                row.appendChild(this.createCell(
                    `${voltages.join(" / ")} V`,
                    "voltagedatacell"
                ));

                table.appendChild(row);
            }
        }

        // Total Gas
        if (this.config.showGas) {
            const gasRow = document.createElement("tr");
            gasRow.className = "total-gas-row";
            gasRow.appendChild(this.createCell(`<i class="fa-solid fa-fire"></i>&nbsp;${this.translate("Total_Gas")}`, "totalgastextcell"));
            gasRow.appendChild(this.createCell(`${this.formatNumber(Math.round(data.total_gas_m3))} m³`, "totalgasdatacell"));
            table.appendChild(gasRow);
        }

        // Delta Gas
        if (this.deltaP1 && this.config.showDeltaGas) {
            const row = document.createElement("tr");
            row.className = "total-gas-row";
            row.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Gas")}`, "totalgastextcell"));
            row.appendChild(this.createCell(
                `${this.formatNumber(Math.round(this.deltaP1.total_gas_m3 || 0))} m³`,
                "totalgasdatacell"
            ));
            table.appendChild(row);
        }

        // Extra info (wifi, failures)
        if (this.config.extraInfo) this.addExtraInfo(table, data, "P1");
    },

    addWaterRows: function (table, data) {
        if (this.config.currentWater) {
            const row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell(`<i class="fa-solid fa-water"></i>&nbsp;${this.translate("Current_Wtr")}`, "currentwatertextcell"));
            row.appendChild(this.createCell(`${this.formatNumber(Math.round(data.active_liter_lpm))} Lpm`, "currentwaterdatacell"));
            table.appendChild(row);
        }

        const totalLiters = data.total_liter_m3 * 1000;
        const row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell(`<i class="fa-solid fa-droplet"></i>&nbsp;${this.translate("Total_Wtr")}`, "totalwatertextcell"));
        row.appendChild(this.createCell(`${this.formatNumber(Math.round(data.total_liter_m3))} m³ (${this.formatNumber(Math.round(totalLiters))} L)`, "totalwaterdatacell"));
        table.appendChild(row);

        if (this.deltaWM && this.config.showDeltaWater) {
            const deltaRow = document.createElement("tr");
            deltaRow.className = "total-water-row";
            deltaRow.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Wtr")}`, "totalwatertextcell"));
            deltaRow.appendChild(this.createCell(`${this.formatNumber(Math.round(this.deltaWM.total_liter_m3 || 0))} m³ (${this.formatNumber(Math.round(this.deltaWM.total_liters || 0))} L)`, "totalwaterdatacell"));
            table.appendChild(deltaRow);
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "WM");
    },

    addExtraInfo: function (table, data, type) {
        const spacer = document.createElement("tr");
        spacer.innerHTML = "<td colspan='2'>&nbsp;</td>";
        table.appendChild(spacer);

        const row = document.createElement("tr");
        row.className = `wifi-row-${type.toLowerCase()}`;
        row.appendChild(this.createCell(`<i class="fa-solid fa-wifi"></i>&nbsp;${this.translate(`Wifi_${type}`)}`, `wifitextcell${type}`));
        row.appendChild(this.createCell(`${data.wifi_strength || 0} %`, `wifidatacell${type}`));
        table.appendChild(row);

        if (type === "P1") {
            const failRow = document.createElement("tr");
            failRow.className = "failure-row";
            failRow.appendChild(this.createCell(`<i class="fa-solid fa-plug-circle-exclamation"></i>&nbsp;${this.translate("Fail_Pwr")}`, "failuretextcell"));
            failRow.appendChild(this.createCell(data.any_power_fail_count || 0, "failuredatacell"));
            table.appendChild(failRow);
        }
    },

    getMHW_P1: function (retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWP1', { url: this.urlP1, retry });
    },

    getMHW_WM: function (retry = this.config.retryCount) {
        this.sendSocketNotification('GET_MHWWM', { url: this.urlWM, retry });
    },

    processMHW_P1: function (data) {
        this.MHW_P1 = data;
        this.loadedP1 = true;
        this.errorP1 = false;
        this.updateDomAfterLoad();
    },

    processMHW_WM: function (data) {
        this.MHW_WM = data;
        this.loadedWM = true;
        this.errorWM = false;
        this.updateDomAfterLoad();
    },

    updateDomAfterLoad: function () {
        if ((this.config.P1_IP ? this.loadedP1 : true) &&
            (this.config.WM_IP ? this.loadedWM : true)) {
            if (this.config.showLastUpdate) this.readLastUpdate();
            else this.updateDom(this.config.initialLoadDelay);
        }
    },

    readLastUpdate: function () {
        this.sendSocketNotification("GET_LAST_UPDATE");
    },

    socketNotificationReceived: function (notification, payload) {
        switch (notification) {
            case "MHWP1_RESULT":
                this.processMHW_P1(payload);
                break;
            case "MHWWM_RESULT":
                this.processMHW_WM(payload);
                break;
            case "LAST_UPDATE_RESULT":
                this.lastUpdateDate = payload.lastDate;
                this.deltaP1 = payload.deltaP1;
                this.deltaWM = payload.deltaWM;
                this.updateDom();
                break;
            case "MHWP1_ERROR":
                console.error("MMM-MyHomeWizard P1 Error:", payload.error);
                payload.retry > 0 ? this.getMHW_P1(payload.retry - 1) : (() => { this.errorP1 = true; this.updateDom(this.config.initialLoadDelay); })();
                break;
            case "MHWWM_ERROR":
                console.error("MMM-MyHomeWizard WM Error:", payload.error);
                payload.retry > 0 ? this.getMHW_WM(payload.retry - 1) : (() => { this.errorWM = true; this.updateDom(this.config.initialLoadDelay); })();
                break;
        }
    }

});
