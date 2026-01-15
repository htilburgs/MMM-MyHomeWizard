Module.register('MMM-MyHomeWizard', {

    // Default values
    defaults: {
        P1_IP: null,              // IP Address P1 Meter
        WM_IP: null,              // IP Address Water Meter
        maxWidth: "500px",        // Max width wrapper
        extraInfo: false,         // Show extra information
        showFooter: false,        // Show footer (name Power Meter)
        showGas: true,            // Show Gas option
        showFeedback: true,       // Show Feed back to the grid
        currentPower: false,      // Show current power usage
        currentWater: false,      // Show current water usage
        initialLoadDelay: 1000,
        updateInterval: 10000     // Every 10 seconds
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

        // Initialize URLs
        this.urlP1 = this.config.P1_IP
            ? "http://" + this.config.P1_IP + "/api/v1/data/"
            : "https://dummyjson.com/c/f8b2-91c3-400b-8709";

        this.urlWM = this.config.WM_IP
            ? "http://" + this.config.WM_IP + "/api/v1/data/"
            : "https://dummyjson.com/c/704a-9a96-4845-bc72";

        // Initialize data and loaded flags
        this.MHW_P1 = [];
        this.MHW_WM = [];
        this.loadedP1 = false;
        this.loadedWM = false;

        // Start fetching data
        this.scheduleUpdate();
    },

    // Schedule updates
    scheduleUpdate: function () {
        // Save interval ID for possible future cleanup
        this.updateIntervalId = setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);

        // Initial fetch after initialLoadDelay
        setTimeout(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.initialLoadDelay);
    },

    // DOM generation
    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        if (!this.loadedP1 && this.config.P1_IP) return this.createLoading(wrapper);
        if (!this.loadedWM && this.config.WM_IP) return this.createLoading(wrapper);

        var table = document.createElement("table");
        table.className = "small";

        var MHW_P1 = this.MHW_P1;
        var MHW_WM = this.MHW_WM;

        // --- P1 Meter Rows ---
        if (this.config.P1_IP) {
            this.addPowerRows(table, MHW_P1);
        }

        // --- Water Meter Rows ---
        if (this.config.WM_IP) {
            this.addWaterRows(table, MHW_WM);
        }

        // --- Footer ---
        if (this.config.showFooter && MHW_P1?.meter_model) {
            var row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.setAttribute("colspan", "2");
            cell.className = "footer";
            cell.innerHTML = '<i class="fa-solid fa-charging-station"></i>&nbsp;' + MHW_P1.meter_model;
            row.appendChild(cell);
            table.appendChild(row);
        }

        wrapper.appendChild(table);
        return wrapper;
    },

    createLoading: function(wrapper) {
        wrapper.innerHTML = "Loading....";
        wrapper.classList.add("bright", "light", "small");
        return wrapper;
    },

    addPowerRows: function(table, MHW_P1) {
        // Current Power
        if (this.config.currentPower) {
            var row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-bolt-lightning"></i>&nbsp;' + this.translate("Current_Pwr"), "currentpowertextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.active_power_w) + " Watt", "currentpowerdatacell"));
            table.appendChild(row);
        }

        // Total Power
        var row = document.createElement("tr");
        row.className = "total-power-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;' + this.translate("Total_Pwr"), "totalpowertextcell"));
        row.appendChild(this.createCell(Math.round(MHW_P1.total_power_import_kwh) + " kWh", "totalpowerdatacell"));
        table.appendChild(row);

        // Feedback
        if (this.config.showFeedback) {
            var row = document.createElement("tr");
            row.className = "total-feedback-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;' + this.translate("Total_Feedback"), "totalfeedbacktextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.total_power_export_kwh) + " kWh", "totalfeedbackdatacell"));
            table.appendChild(row);
        }

        // Gas
        if (this.config.showGas) {
            var row = document.createElement("tr");
            row.className = "total-gas-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-fire"></i>&nbsp;' + this.translate("Total_Gas"), "totalgastextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.total_gas_m3) + " m³", "totalgasdatacell"));
            table.appendChild(row);
        }

        // Extra Info
        if (this.config.extraInfo) {
            this.addExtraInfo(table, MHW_P1, "P1");
        }
    },

    addWaterRows: function(table, MHW_WM) {
        // Current Water
        if (this.config.currentWater) {
            var row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-water"></i>&nbsp;' + this.translate("Current_Wtr"), "currentwatertextcell"));
            row.appendChild(this.createCell(Math.round(MHW_WM.active_liter_lpm) + " Lpm", "currentwaterdatacell"));
            table.appendChild(row);
        }

        // Total Water
        var row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-droplet"></i>&nbsp;' + this.translate("Total_Wtr"), "totalwatertextcell"));
        row.appendChild(this.createCell(Math.round(MHW_WM.total_liter_m3) + " m³", "totalwaterdatacell"));
        table.appendChild(row);

        if (this.config.extraInfo) {
            this.addExtraInfo(table, MHW_WM, "WM");
        }
    },

    createCell: function(content, className) {
        var cell = document.createElement("td");
        cell.className = "normal " + className;
        cell.innerHTML = content;
        return cell;
    },

    addExtraInfo: function(table, data, type) {
        // Spacer
        var spacer = document.createElement("tr");
        spacer.innerHTML = "<td colspan='2'>&nbsp;</td>";
        table.appendChild(spacer);

        // Wifi
        var row = document.createElement("tr");
        row.className = "wifi-row-" + type.toLowerCase();
        row.appendChild(this.createCell('<i class="fa-solid fa-wifi"></i>&nbsp;' + this.translate("Wifi_" + type), "wifitextcell" + type));
        row.appendChild(this.createCell(data.wifi_strength + " %", "wifidatacell" + type));
        table.appendChild(row);

        // Failures only for P1
        if (type === "P1") {
            var row = document.createElement("tr");
            row.className = "failure-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-exclamation"></i>&nbsp;' + this.translate("Fail_Pwr"), "failuretextcell"));
            row.appendChild(this.createCell(data.any_power_fail_count, "failuredatacell"));
            table.appendChild(row);
        }
    },

    // Request data from node_helper
    getMHW_P1: function () {
        this.sendSocketNotification('GET_MHWP1', this.urlP1);
    },

    getMHW_WM: function () {
        this.sendSocketNotification('GET_MHWWM', this.urlWM);
    },

    // Process returned data
    processMHW_P1: function (data_P1) {
        this.MHW_P1 = data_P1;
        this.loadedP1 = true;
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    processMHW_WM: function (data_WM) {
        this.MHW_WM = data_WM;
        this.loadedWM = true;
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    // Socket notifications from node_helper
    socketNotificationReceived: function (notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.processMHW_P1(payload);
        } else if (notification === "MHWWM_RESULT") {
            this.processMHW_WM(payload);
        }
    }

});
