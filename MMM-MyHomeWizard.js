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
        currentVoltage: false, // compact 3-phase with auto detection
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

        this.tableWrapper = null;
        this.table = null;
        this.lastUpdateDiv = null;
        this.cells = {};

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
        // Create wrapper and table once
        if (!this.tableWrapper) {
            this.tableWrapper = document.createElement("div");
            this.tableWrapper.className = "wrapper";
            this.tableWrapper.style.maxWidth = this.config.maxWidth;

            this.table = document.createElement("table");
            this.table.className = "small";
            this.tableWrapper.appendChild(this.table);

            if (this.config.showLastUpdate) {
                this.lastUpdateDiv = document.createElement("div");
                this.lastUpdateDiv.className = "last-update small light";
                this.lastUpdateDiv.style.marginTop = "5px";
                this.tableWrapper.appendChild(this.lastUpdateDiv);
            }
        }

        // Show loading if data is not yet available
        if ((this.config.P1_IP && !this.loadedP1) || (this.config.WM_IP && !this.loadedWM)) {
            this.table.innerHTML = "<tr><td colspan='2'>Loading....</td></tr>";
            return this.tableWrapper;
        }

        // Build table once if not built
        if (!this.tableBuilt) {
            this.table.innerHTML = "";
            if (this.config.P1_IP) this.buildPowerRows(this.table, this.MHW_P1);
            if (this.config.WM_IP) this.buildWaterRows(this.table, this.MHW_WM);
            this.tableBuilt = true;
        }

        // Update cell values on every render
        this.updateCells();

        // Update last update text
        if (this.config.showLastUpdate && this.lastUpdateDate && this.lastUpdateDiv) {
            this.lastUpdateDiv.innerHTML = `${this.translate("Last_Update")}: ${this.lastUpdateDate}`;
        }

        return this.tableWrapper;
    },

    createCell: function (content, className) {
        const cell = document.createElement("td");
        cell.className = `normal ${className}`;
        cell.innerHTML = content;
        return cell;
    },

    // Build table rows for the first time
    buildPowerRows: function (table, data) {
        this.cells = {}; // reset cell references

        // Current power row
        if (this.config.currentPower) {
            const row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell(`<i class="fa-solid fa-bolt-lightning"></i>&nbsp;${this.translate("Current_Pwr")}`, "currentpowertextcell"));
            const cell = this.createCell("-", "currentpowerdatacell");
            row.appendChild(cell);
            this.cells.currentPower = cell;
            table.appendChild(row);
        }

        // Total power row
        const totalRow = document.createElement("tr");
        totalRow.className = "total-power-row";
        totalRow.appendChild(this.createCell(`<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;${this.translate("Total_Pwr")}`, "totalpowertextcell"));
        const totalCell = this.createCell("-", "totalpowerdatacell");
        totalRow.appendChild(totalCell);
        this.cells.totalPower = totalCell;
        table.appendChild(totalRow);

        // Total feedback row
        if (this.config.showFeedback) {
            const feedbackRow = document.createElement("tr");
            feedbackRow.className = "total-feedback-row";
            feedbackRow.appendChild(this.createCell(`<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;${this.translate("Total_Feedback")}`, "totalfeedbacktextcell"));
            const feedbackCell = this.createCell("-", "totalfeedbackdatacell");
            feedbackRow.appendChild(feedbackCell);
            this.cells.totalFeedback = feedbackCell;
            table.appendChild(feedbackRow);
        }

        // Delta Power row
        if (this.config.showDeltaPower) {
            const deltaRow = document.createElement("tr");
            deltaRow.className = "total-power-row";
            deltaRow.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Pwr")}`, "totalpowertextcell"));
            const deltaCell = this.createCell("-", "totalpowerdatacell");
            deltaRow.appendChild(deltaCell);
            this.cells.deltaPower = deltaCell;
            table.appendChild(deltaRow);
        }

        // Voltage row (compact 3-phase)
        if (this.config.currentVoltage) {
            const voltageRow = document.createElement("tr");
            voltageRow.className = "voltage-compact-row";
            voltageRow.appendChild(this.createCell(`<i class="fa-solid fa-bolt"></i>&nbsp;${this.translate("Voltage")}`, "voltagetextcell"));
            const voltageCell = this.createCell("-", "voltagedatacell");
            voltageRow.appendChild(voltageCell);
            this.cells.voltage = voltageCell;
            table.appendChild(voltageRow);
        }

        // Total Gas row
        if (this.config.showGas) {
            const gasRow = document.createElement("tr");
            gasRow.className = "total-gas-row";
            gasRow.appendChild(this.createCell(`<i class="fa-solid fa-fire"></i>&nbsp;${this.translate("Total_Gas")}`, "totalgastextcell"));
            const gasCell = this.createCell("-", "totalgasdatacell");
            gasRow.appendChild(gasCell);
            this.cells.totalGas = gasCell;
            table.appendChild(gasRow);
        }

        // Delta Gas row
        if (this.config.showDeltaGas) {
            const deltaGasRow = document.createElement("tr");
            deltaGasRow.className = "total-gas-row";
            deltaGasRow.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Gas")}`, "totalgastextcell"));
            const deltaGasCell = this.createCell("-", "totalgasdatacell");
            deltaGasRow.appendChild(deltaGasCell);
            this.cells.deltaGas = deltaGasCell;
            table.appendChild(deltaGasRow);
        }

        // Extra info rows (wifi, failures)
        if (this.config.extraInfo) this.addExtraInfo(table, data, "P1");
    },

    buildWaterRows: function (table, data) {
        // Current water row
        if (this.config.currentWater) {
            const row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell(`<i class="fa-solid fa-water"></i>&nbsp;${this.translate("Current_Wtr")}`, "currentwatertextcell"));
            const cell = this.createCell("-", "currentwaterdatacell");
            row.appendChild(cell);
            this.cells.currentWater = cell;
            table.appendChild(row);
        }

        // Total water row
        const totalLiters = data.total_liter_m3 * 1000;
        const row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell(`<i class="fa-solid fa-droplet"></i>&nbsp;${this.translate("Total_Wtr")}`, "totalwatertextcell"));
        const cell = this.createCell("-", "totalwaterdatacell");
        row.appendChild(cell);
        this.cells.totalWater = cell;
        table.appendChild(row);

        // Delta Water row
        if (this.config.showDeltaWater) {
            const deltaRow = document.createElement("tr");
            deltaRow.className = "total-water-row";
            deltaRow.appendChild(this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Wtr")}`, "totalwatertextcell"));
            const deltaCell = this.createCell("-", "totalwaterdatacell");
            deltaRow.appendChild(deltaCell);
            this.cells.deltaWater = deltaCell;
            table.appendChild(deltaRow);
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "WM");
    },

    // Update cell values when new data arrives
    updateCells: function () {
        const data = this.MHW_P1;
        const delta = this.deltaP1;

        if (this.cells.currentPower) this.cells.currentPower.innerHTML = `${this.formatNumber(Math.round(data.active_power_w || 0))} Watt`;
        if (this.cells.totalPower) this.cells.totalPower.innerHTML = `${this.formatNumber(Math.round(data.total_power_import_kwh || 0))} kWh`;
        if (this.cells.totalFeedback) this.cells.totalFeedback.innerHTML = `${this.formatNumber(Math.round(data.total_power_export_kwh || 0))} kWh`;
        if (this.cells.deltaPower && delta) this.cells.deltaPower.innerHTML = `${this.formatNumber(Math.round(delta.total_power_import_kwh || 0))} kWh / ${this.formatNumber(Math.round(delta.total_power_export_kwh || 0))} kWh`;

        // Voltage
        if (this.cells.voltage) {
            const v1 = Math.round(data.active_voltage_l1_v || 0);
            const v2 = Math.round(data.active_voltage_l2_v || 0);
            const v3 = Math.round(data.active_voltage_l3_v || 0);
            const voltages = [];
            if (v1 > 0) voltages.push(this.formatNumber(v1));
            if (v2 > 0) voltages.push(this.formatNumber(v2));
            if (v3 > 0) voltages.push(this.formatNumber(v3));
            this.cells.voltage.innerHTML = voltages.length ? `${voltages.join(" / ")} V` : "-";
        }

        // Gas
        if (this.cells.totalGas) this.cells.totalGas.innerHTML = `${this.formatNumber(Math.round(data.total_gas_m3 || 0))} m³`;
        if (this.cells.deltaGas && delta) this.cells.deltaGas.innerHTML = `${this.formatNumber(Math.round(delta.total_gas_m3 || 0))} m³`;

        // Water
        const dataWM = this.MHW_WM;
        const deltaWM = this.deltaWM;
        const totalLiters = dataWM.total_liter_m3 * 1000;
        if (this.cells.currentWater) this.cells.currentWater.innerHTML = `${this.formatNumber(Math.round(dataWM.active_liter_lpm || 0))} Lpm`;
        if (this.cells.totalWater) this.cells.totalWater.innerHTML = `${this.formatNumber(Math.round(dataWM.total_liter_m3 || 0))} m³ (${this.formatNumber(Math.round(totalLiters))} L)`;
        if (this.cells.deltaWater && deltaWM) this.cells.deltaWater.innerHTML = `${this.formatNumber(Math.round(deltaWM.total_liter_m3 || 0))} m³ (${this.formatNumber(Math.round(deltaWM.total_liters || 0))} L)`;
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
        this.updateDom();
    },

    processMHW_WM: function (data) {
        this.MHW_WM = data;
        this.loadedWM = true;
        this.errorWM = false;
        this.updateDom();
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
                payload.retry > 0 ? this.getMHW_P1(payload.retry - 1) : (() => { this.errorP1 = true; this.updateDom(); })();
                break;
            case "MHWWM_ERROR":
                console.error("MMM-MyHomeWizard WM Error:", payload.error);
                payload.retry > 0 ? this.getMHW_WM(payload.retry - 1) : (() => { this.errorWM = true; this.updateDom(); })();
                break;
        }
    }

});
