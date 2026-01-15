Module.register('MMM-MyHomeWizard', {

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

        // Initialize data and flags
        this.MHW_P1 = [];
        this.MHW_WM = [];
        this.loadedP1 = false;
        this.loadedWM = false;
        this.errorP1 = false;
        this.errorWM = false;

        // Start fetching data
        this.scheduleUpdate();
    },

    scheduleUpdate: function () {
        // Save interval ID for potential cleanup
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

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        // Display errors if any
        if (this.config.P1_IP && this.errorP1) {
            wrapper.innerHTML = '<span class="error">P1 Meter offline</span>';
            return wrapper;
        }

        if (this.config.WM_IP && this.errorWM) {
            wrapper.innerHTML = '<span class="error">Water Meter offline</span>';
            return wrapper;
        }

        // Loading check
        if ((!this.loadedP1 && this.config.P1_IP) || (!this.loadedWM && this.config.WM_IP)) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small";

        // Add rows for P1 Meter
        if (this.config.P1_IP) {
            this.addPowerRows(table, this.MHW_P1);
        }

        // Add rows for Water Meter
        if (this.config.WM_IP) {
            this.addWaterRows(table, this.MHW_WM);
        }

        // Footer
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
        return wrapper;
    },

    createCell: function(content, className) {
        var cell = document.createElement("td");
        cell.className = "normal " + className;
        cell.innerHTML = content;
        return cell;
    },

    addPowerRows: function(table, MHW_P1) {
        if (this.config.currentPower) {
            var row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-bolt-lightning"></i>&nbsp;' + this.translate("Current_Pwr"), "currentpowertextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.active_power_w) + " Watt", "currentpowerdatacell"));
            table.appendChild(row);
        }

        var row = document.createElement("tr");
        row.className = "total-power-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;' + this.translate("Total_Pwr"), "totalpowertextcell"));
        row.appendChild(this.createCell(Math.round(MHW_P1.total_power_import_kwh) + " kWh", "totalpowerdatacell"));
        table.appendChild(row);

        if (this.config.showFeedback) {
            var row = document.createElement("tr");
            row.className = "total-feedback-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;' + this.translate("Total_Feedback"), "totalfeedbacktextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.total_power_export_kwh) + " kWh", "totalfeedbackdatacell"));
            table.appendChild(row);
        }

        if (this.config.showGas) {
            var row = document.createElement("tr");
            row.className = "total-gas-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-fire"></i>&nbsp;' + this.translate("Total_Gas"), "totalgastextcell"));
            row.appendChild(this.createCell(Math.round(MHW_P1.total_gas_m3) + " m³", "totalgasdatacell"));
            table.appendChild(row);
        }

        if (this.config.extraInfo) {
            this.addExtraInfo(table, MHW_P1, "P1");
        }
    },

    addWaterRows: function(table, MHW_WM) {
        if (this.config.currentWater) {
            var row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-water"></i>&nbsp;' + this.translate("Current_Wtr"), "currentwatertextcell"));
            row.appendChild(this.createCell(Math.round(MHW_WM.active_liter_lpm) + " Lpm", "currentwaterdatacell"));
            table.appendChild(row);
        }

        var row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-droplet"></i>&nbsp;' + this.translate("Total_Wtr"), "totalwatertextcell"));
        row.appendChild(this.createCell(Math.round(MHW_WM.total_liter_m3) + " m³", "totalwaterdatacell"));
        table.appendChild(row);

        if (this.config.extraInfo) {
            this.addExtraInfo(table, MHW_WM, "WM");
        }
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

    getMHW_P1: function() {
        this.sendSocketNotification('GET_MHWP1', this.urlP1);
    },

    getMHW_WM: function() {
        this.sendSocketNotification('GET_MHWWM', this.urlWM);
    },

    processMHW_P1: function(data_P1) {
        this.MHW_P1 = data_P1;
        this.loadedP1 = true;
        this.errorP1 = false;
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    processMHW_WM: function(data_WM) {
        this.MHW_WM = data_WM;
        this.loadedWM = true;
        this.errorWM = false;
        if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.processMHW_P1(payload);
        } else if (notification === "MHWWM_RESULT") {
            this.processMHW_WM(payload);
        } else if (notification === "MHWP1_ERROR") {
            console.error("MMM-MyHomeWizard P1 Error:", payload.error);
            this.errorP1 = true;
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWWM_ERROR") {
            console.error("MMM-MyHomeWizard WM Error:", payload.error);
            this.errorWM = true;
            this.updateDom(this.config.initialLoadDelay);
        }
    }

});
