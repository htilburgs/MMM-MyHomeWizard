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
        showLastUpdate: true     // <-- NEW: show last update from history
    },

    getStyles: function () {
        return ["MMM-MyHomeWizard.css"];
    },

    getTranslations: function () {
        return {
            nl: "translations/nl.json",
            en: "translations/en.json"
        };
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
        this.lastSnapshotDate = null; // <-- NEW: last update from history

        this.scheduleUpdate();
    },

    scheduleUpdate: function () {
        setTimeout(() => this.updateMeters(), this.config.initialLoadDelay);
        this.updateIntervalId = setInterval(() => this.updateMeters(), this.config.updateInterval);
    },

    updateMeters: function() {
        this.getMHW_P1();
        this.getMHW_WM();
    },

    stop: function () {
        if (this.updateIntervalId) clearInterval(this.updateIntervalId);
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
            const footerRow = this.createRow(`<i class="fa-solid fa-charging-station"></i>&nbsp;${this.MHW_P1.meter_model}`, "", "footer", 2);
            table.appendChild(footerRow);
        }

        wrapper.appendChild(table);

        // Show last update from history_data.json
        if (this.config.showLastUpdate && this.lastSnapshotDate) {
            const lastUpdateDiv = document.createElement("div");
            lastUpdateDiv.className = "last-update small light";
            lastUpdateDiv.style.marginTop = "5px";
            const formattedDate = new Date(this.lastSnapshotDate).toLocaleDateString();
            lastUpdateDiv.innerHTML = this.translate("Last_Update") + ": " + formattedDate;
            wrapper.appendChild(lastUpdateDiv);
        }

        return wrapper;
    },

    createCell: function(content, className) {
        const cell = document.createElement("td");
        cell.className = "normal " + className;
        cell.innerHTML = content;
        return cell;
    },

    createRow: function(label, value, rowClass = "", colspan = 1) {
        const row = document.createElement("tr");
        if (rowClass) row.className = rowClass;

        const cell = document.createElement("td");
        cell.className = "normal";
        cell.setAttribute("colspan", colspan);
        cell.innerHTML = label;
        row.appendChild(cell);

        if (colspan === 1 && value !== undefined) {
            row.appendChild(this.createCell(value, ""));
        }

        return row;
    },

    addPowerRows: function(table, data) {
        if (this.config.currentPower) {
            table.appendChild(this.createRow(`<i class="fa-solid fa-bolt-lightning"></i>&nbsp;${this.translate("Current_Pwr")}`, Math.round(data.active_power_w) + " Watt", "current-power-row"));
        }

        table.appendChild(this.createRow(`<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;${this.translate("Total_Pwr")}`, Math.round(data.total_power_import_kwh) + " kWh", "total-power-row"));

        if (this.config.showFeedback) {
            table.appendChild(this.createRow(`<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;${this.translate("Total_Feedback")}`, Math.round(data.total_power_export_kwh) + " kWh", "total-feedback-row"));
        }

        if (this.config.showGas) {
            table.appendChild(this.createRow(`<i class="fa-solid fa-fire"></i>&nbsp;${this.translate("Total_Gas")}`, Math.round(data.total_gas_m3) + " m³", "total-gas-row"));
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "P1");
    },

    addWaterRows: function(table, data) {
        if (this.config.currentWater) {
            table.appendChild(this.createRow(`<i class="fa-solid fa-water"></i>&nbsp;${this.translate("Current_Wtr")}`, Math.round(data.active_liter_lpm) + " Lpm", "current-water-row"));
        }

        const totalLiters = data.total_liter_m3 * 1000;
        table.appendChild(this.createRow(`<i class="fa-solid fa-droplet"></i>&nbsp;${this.translate("Total_Wtr")}`, `${Math.round(data.total_liter_m3)} m³ (${Math.round(totalLiters)} L)`, "total-water-row"));

        if (this.config.extraInfo) this.addExtraInfo(table, data, "WM");
    },

    addExtraInfo: function(table, data, type) {
        table.appendChild(this.createRow("&nbsp;", "", "spacer-row", 2));

        const wifiRow = this.createRow(`<i class="fa-solid fa-wifi"></i>&nbsp;${this.translate("Wifi_" + type)}`, data.wifi_strength + " %", "wifi-row-" + type.toLowerCase());
        table.appendChild(wifiRow);

        if (type === "P1") {
            const failRow = this.createRow(`<i class="fa-solid fa-plug-circle-exclamation"></i>&nbsp;${this.translate("Fail_Pwr")}`, data.any_power_fail_count, "failure-row");
            table.appendChild(failRow);
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
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    processMHW_WM: function(data) {
        this.MHW_WM = data;
        this.loadedWM = true;
        this.errorWM = false;
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    socketNotificationReceived: function(notification, payload) {
        switch (notification) {
            case "MHWP1_RESULT":
                this.processMHW_P1(payload);
                break;
            case "MHWWM_RESULT":
                this.processMHW_WM(payload);
                break;
            case "MHWP1_ERROR":
                if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
                else { this.errorP1 = true; this.updateDom(this.config.initialLoadDelay); }
                break;
            case "MHWWM_ERROR":
                if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
                else { this.errorWM = true; this.updateDom(this.config.initialLoadDelay); }
                break;
            case "MHWWM_LAST_UPDATE": // <-- NEW: last snapshot date from Node Helper
                this.lastSnapshotDate = payload.lastUpdate;
                this.updateDom(0);
                break;
        }
    }

});
