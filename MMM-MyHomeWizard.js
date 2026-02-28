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
        currentVoltage: false,
        initialLoadDelay: 1000,
        updateInterval: 10000,
        fetchTimeout: 5000,
        retryCount: 2,
        showLastUpdate: true,
        showDeltaPower: true,
        showDeltaGas: true,
        showDeltaWater: true
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

        this.cells = {}; // verwijzingen naar tabelcellen
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
        if (this.table) return this.tableWrapper; // bij volgende updates

        this.tableWrapper = document.createElement("div");
        this.tableWrapper.className = "wrapper";
        this.tableWrapper.style.maxWidth = this.config.maxWidth;

        if (this.config.P1_IP && this.errorP1) {
            this.tableWrapper.innerHTML = '<span class="error">P1 Meter offline</span>';
            return this.tableWrapper;
        }

        if (this.config.WM_IP && this.errorWM) {
            this.tableWrapper.innerHTML = '<span class="error">Water Meter offline</span>';
            return this.tableWrapper;
        }

        if ((!this.loadedP1 && this.config.P1_IP) || (!this.loadedWM && this.config.WM_IP)) {
            this.tableWrapper.innerHTML = "Loading....";
            this.tableWrapper.classList.add("bright", "light", "small");
            return this.tableWrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        this.cells = {}; // reset cel-referenties

        if (this.config.P1_IP) this.buildPowerRows(table, this.MHW_P1);
        if (this.config.WM_IP) this.buildWaterRows(table, this.MHW_WM);

        if (this.config.showFooter && this.MHW_P1?.meter_model) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.setAttribute("colspan", "2");
            cell.className = "footer";
            cell.innerHTML = `<i class="fa-solid fa-charging-station"></i>&nbsp;${this.MHW_P1.meter_model}`;
            row.appendChild(cell);
            table.appendChild(row);
        }

        this.tableWrapper.appendChild(table);
        this.table = table; // bewaren voor cel-updates

        if (this.config.showLastUpdate) {
            this.lastUpdateDiv = document.createElement("div");
            this.lastUpdateDiv.className = "last-update small light";
            this.lastUpdateDiv.style.marginTop = "5px";
            this.lastUpdateDiv.innerHTML = `${this.translate("Last_Update")}: ${this.lastUpdateDate || "-"}`;
            this.tableWrapper.appendChild(this.lastUpdateDiv);
        }

        return this.tableWrapper;
    },

    createCell: function (content, className) {
        const cell = document.createElement("td");
        cell.className = `normal ${className}`;
        cell.innerHTML = content;
        return cell;
    },

    buildPowerRows: function (table, data) {
        // Current Power
        if (this.config.currentPower) {
            const row = document.createElement("tr");
            row.className = "current-power-row";
            const label = this.createCell(`<i class="fa-solid fa-bolt-lightning"></i>&nbsp;${this.translate("Current_Pwr")}`, "currentpowertextcell");
            const value = this.createCell(`${this.formatNumber(Math.round(data.active_power_w))} Watt`, "currentpowerdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.currentPower = value;
        }

        // Total Power
        let row = document.createElement("tr");
        row.className = "total-power-row";
        let label = this.createCell(`<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;${this.translate("Total_Pwr")}`, "totalpowertextcell");
        let value = this.createCell(`${this.formatNumber(Math.round(data.total_power_import_kwh))} kWh`, "totalpowerdatacell");
        row.appendChild(label);
        row.appendChild(value);
        table.appendChild(row);
        this.cells.totalPower = value;

        // Total Feedback
        if (this.config.showFeedback) {
            row = document.createElement("tr");
            row.className = "total-feedback-row";
            label = this.createCell(`<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;${this.translate("Total_Feedback")}`, "totalfeedbacktextcell");
            value = this.createCell(`${this.formatNumber(Math.round(data.total_power_export_kwh))} kWh`, "totalfeedbackdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.totalFeedback = value;
        }

        // Delta Power
        if (this.deltaP1 && this.config.showDeltaPower) {
            row = document.createElement("tr");
            row.className = "total-power-row";
            label = this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Pwr")}`, "totalpowertextcell");
            value = this.createCell(
                `${this.formatNumber(Math.round(this.deltaP1.total_power_import_kwh || 0))} kWh / ${this.formatNumber(Math.round(this.deltaP1.total_power_export_kwh || 0))} kWh`,
                "totalpowerdatacell"
            );
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.deltaPower = value;
        }

        // Voltage onder Delta Power
        if (this.config.currentVoltage) {
            const v1 = Math.round(data.active_voltage_l1_v || 0);
            const v2 = Math.round(data.active_voltage_l2_v || 0);
            const v3 = Math.round(data.active_voltage_l3_v || 0);

            const voltages = [];
            if (v1 > 0) voltages.push(this.formatNumber(v1));
            if (v2 > 0) voltages.push(this.formatNumber(v2));
            if (v3 > 0) voltages.push(this.formatNumber(v3));

            if (voltages.length > 0) {
                row = document.createElement("tr");
                row.className = "voltage-compact-row";
                label = this.createCell(`<i class="fa-solid fa-bolt"></i>&nbsp;${this.translate("Voltage")}`, "voltagetextcell");
                value = this.createCell(`${voltages.join(" / ")} V`, "voltagedatacell");
                row.appendChild(label);
                row.appendChild(value);
                table.appendChild(row);
                this.cells.voltage = value;
            }
        }

        // Total Gas
        if (this.config.showGas) {
            row = document.createElement("tr");
            row.className = "total-gas-row";
            label = this.createCell(`<i class="fa-solid fa-fire"></i>&nbsp;${this.translate("Total_Gas")}`, "totalgastextcell");
            value = this.createCell(`${this.formatNumber(Math.round(data.total_gas_m3))} m³`, "totalgasdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.totalGas = value;
        }

        // Delta Gas
        if (this.deltaP1 && this.config.showDeltaGas) {
            row = document.createElement("tr");
            row.className = "total-gas-row";
            label = this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Gas")}`, "totalgastextcell");
            value = this.createCell(`${this.formatNumber(Math.round(this.deltaP1.total_gas_m3 || 0))} m³`, "totalgasdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.deltaGas = value;
        }
    },

    buildWaterRows: function (table, data) {
        if (this.config.currentWater) {
            let row = document.createElement("tr");
            row.className = "current-water-row";
            let label = this.createCell(`<i class="fa-solid fa-water"></i>&nbsp;${this.translate("Current_Wtr")}`, "currentwatertextcell");
            let value = this.createCell(`${this.formatNumber(Math.round(data.active_liter_lpm))} Lpm`, "currentwaterdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.currentWater = value;
        }

        const totalLiters = data.total_liter_m3 * 1000;
        let row = document.createElement("tr");
        row.className = "total-water-row";
        let label = this.createCell(`<i class="fa-solid fa-droplet"></i>&nbsp;${this.translate("Total_Wtr")}`, "totalwatertextcell");
        let value = this.createCell(`${this.formatNumber(Math.round(data.total_liter_m3))} m³ (${this.formatNumber(Math.round(totalLiters))} L)`, "totalwaterdatacell");
        row.appendChild(label);
        row.appendChild(value);
        table.appendChild(row);
        this.cells.totalWater = value;

        if (this.deltaWM && this.config.showDeltaWater) {
            row = document.createElement("tr");
            row.className = "total-water-row";
            label = this.createCell(`<i class="fa-solid fa-arrow-up"></i>&nbsp;${this.translate("Delta_Wtr")}`, "totalwatertextcell");
            value = this.createCell(`${this.formatNumber(Math.round(this.deltaWM.total_liter_m3 || 0))} m³ (${this.formatNumber(Math.round(this.deltaWM.total_liters || 0))} L)`, "totalwaterdatacell");
            row.appendChild(label);
            row.appendChild(value);
            table.appendChild(row);
            this.cells.deltaWater = value;
        }
    },

    updateCells: function () {
        if (!this.cells) return;
        if (this.MHW_P1) {
            if (this.cells.currentPower) this.cells.currentPower.innerHTML = `${this.formatNumber(Math.round(this.MHW_P1.active_power_w))} Watt`;
            if (this.cells.totalPower) this.cells.totalPower.innerHTML = `${this.formatNumber(Math.round(this.MHW_P1.total_power_import_kwh))} kWh`;
            if (this.cells.totalFeedback) this.cells.totalFeedback.innerHTML = `${this.formatNumber(Math.round(this.MHW_P1.total_power_export_kwh))} kWh`;
            if (this.cells.voltage && this.config.currentVoltage) {
                const v1 = Math.round(this.MHW_P1.active_voltage_l1_v || 0);
                const v2 = Math.round(this.MHW_P1.active_voltage_l2_v || 0);
                const v3 = Math.round(this.MHW_P1.active_voltage_l3_v || 0);
                const voltages = [];
                if (v1 > 0) voltages.push(this.formatNumber(v1));
                if (v2 > 0) voltages.push(this.formatNumber(v2));
                if (v3 > 0) voltages.push(this.formatNumber(v3));
                this.cells.voltage.innerHTML = `${voltages.join(" / ")} V`;
            }
            if (this.cells.deltaPower && this.deltaP1) {
                this.cells.deltaPower.innerHTML = `${this.formatNumber(Math.round(this.deltaP1.total_power_import_kwh || 0))} kWh / ${this.formatNumber(Math.round(this.deltaP1.total_power_export_kwh || 0))} kWh`;
            }
            if (this.cells.totalGas) this.cells.totalGas.innerHTML = `${this.formatNumber(Math.round(this.MHW_P1.total_gas_m3))} m³`;
            if (this.cells.deltaGas && this.deltaP1) this.cells.deltaGas.innerHTML = `${this.formatNumber(Math.round(this.deltaP1.total_gas_m3 || 0))} m³`;
        }
        if (this.MHW_WM) {
            if (this.cells.currentWater) this.cells.currentWater.innerHTML = `${this.formatNumber(Math.round(this.MHW_WM.active_liter_lpm))} Lpm`;
            if (this.cells.totalWater) {
                const totalLiters = this.MHW_WM.total_liter_m3 * 1000;
                this.cells.totalWater.innerHTML = `${this.formatNumber(Math.round(this.MHW_WM.total_liter_m3))} m³ (${this.formatNumber(Math.round(totalLiters))} L)`;
            }
            if (this.cells.deltaWater && this.deltaWM) {
                this.cells.deltaWater.innerHTML = `${this.formatNumber(Math.round(this.deltaWM.total_liter_m3 || 0))} m³ (${this.formatNumber(Math.round(this.deltaWM.total_liters || 0))} L)`;
            }
        }
        if (this.lastUpdateDiv && this.lastUpdateDate) this.lastUpdateDiv.innerHTML = `${this.translate("Last_Update")}: ${this.lastUpdateDate}`;
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
        this.updateCells();
    },

    processMHW_WM: function (data) {
        this.MHW_WM = data;
        this.loadedWM = true;
        this.errorWM = false;
        this.updateCells();
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
                this.updateCells();
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
