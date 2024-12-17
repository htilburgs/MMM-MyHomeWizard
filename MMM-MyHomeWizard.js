/*
//-------------------------------------------
MMM-MyHomeWizard
Copyright (C) 2024 - H. Tilburgs
MIT License
v1.0.0 - 26-11-2024 - Initial version
v1.0.1 - 17-12-2024 - Code optimalisation
//-------------------------------------------
*/

Module.register('MMM-MyHomeWizard', {

    // Default values
    defaults: {
        P1_IP: null,                // IP Address P1 Meter
        WM_IP: null,                // IP Address Water Meter
        maxWidth: "500px",          // Max width wrapper
        extraInfo: false,           // Show extra information
        showFooter: false,          // Show footer (name Power Meter)
        currentPower: false,        // Show current power usage
        currentWater: false,        // Show current water usage
        initialLoadDelay: 1000,
        updateInterval: 10000       // Every 10 seconds
    },

    // Define stylesheet
    getStyles() {
        return ["MMM-MyHomeWizard.css"];
    },

    // Define required translations
    getTranslations() {
        return {
            nl: "translations/nl.json",
            en: "translations/en.json"
        };
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        this.requiresVersion = "2.29.0";

        // URLs
        this.urlP1 = this.config.P1_IP ? `http://${this.config.P1_IP}/api/v1/data/` : "https://dummyjson.com/c/f8b2-91c3-400b-8709";
        this.urlWM = this.config.WM_IP ? `http://${this.config.WM_IP}/api/v1/data/` : "https://dummyjson.com/c/704a-9a96-4845-bc72";

        // Data holders
        this.MHW_P1 = {};
        this.MHW_WM = {};
        this.loaded = false;

        this.scheduleUpdate();
    },

    // Reusable function to create a row
    createRow(icon, label, value, extraClass = "") {
        const row = document.createElement("tr");
        row.className = extraClass;

        const textCell = document.createElement("td");
        textCell.className = "normal textcell";
        textCell.innerHTML = `<i class="fa-solid ${icon}"></i>&nbsp;${label}`;
        row.appendChild(textCell);

        const dataCell = document.createElement("td");
        dataCell.className = "normal datacell";
        dataCell.innerHTML = value;
        row.appendChild(dataCell);

        return row;
    },

    getDom() {
        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        if (!this.loaded) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        // P1 Power Meter Rows
        if (this.config.P1_IP) {
            const { active_power_w, total_power_import_kwh, total_gas_m3, wifi_strength, any_power_fail_count, meter_model } = this.MHW_P1;

            if (this.config.currentPower) {
                table.appendChild(this.createRow("fa-bolt-lightning", this.translate("Current_Pwr"), `${Math.round(active_power_w)} Watt`));
            }
            table.appendChild(this.createRow("fa-plug-circle-bolt", this.translate("Total_Pwr"), `${Math.round(total_power_import_kwh)} kWh`));
            table.appendChild(this.createRow("fa-fire", this.translate("Total_Gas"), `${Math.round(total_gas_m3)} m³`));

            if (this.config.extraInfo) {

		const spacer = document.createElement("span");
		spacer.innerHTML = "&nbsp;";
		table.appendChild(spacer);
		    
                table.appendChild(this.createRow("fa-wifi", this.translate("Wifi_P1"), `${wifi_strength} %`));
                table.appendChild(this.createRow("fa-plug-circle-exclamation", this.translate("Fail_Pwr"), any_power_fail_count));
            }

            if (this.config.showFooter) {
                const footer = document.createElement("td");
                footer.setAttribute('colspan', 2);
                footer.className = "footer";
                footer.innerHTML = `<i class="fa-solid fa-charging-station"></i>&nbsp;${meter_model}`;
                table.appendChild(footer);
            }
        }

        // Water Meter Rows
        if (this.config.WM_IP) {
            const { active_liter_lpm, total_liter_m3, wifi_strength } = this.MHW_WM;

            if (this.config.currentWater) {
                table.appendChild(this.createRow("fa-water", this.translate("Current_Wtr"), `${Math.round(active_liter_lpm)} Lpm`));
            }
            table.appendChild(this.createRow("fa-droplet", this.translate("Total_Wtr"), `${Math.round(total_liter_m3)} m³`));

            if (this.config.extraInfo) {
		
		const spacer = document.createElement("span");
		spacer.innerHTML = "&nbsp;";
		table.appendChild(spacer);
		   
                table.appendChild(this.createRow("fa-wifi", this.translate("Wifi_WM"), `${wifi_strength} %`));
            }
        }

        wrapper.appendChild(table);
        return wrapper;
    },

    // Schedule updates
    scheduleUpdate() {
        setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);
        this.getMHW_P1();
        this.getMHW_WM();
    },

    socketNotificationReceived(notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.MHW_P1 = payload;
            this.updateDom(this.config.initialLoadDelay);
        } else if (notification === "MHWWM_RESULT") {
            this.MHW_WM = payload;
            this.updateDom(this.config.initialLoadDelay);
        }
    },

    // API Requests
    getMHW_P1() {
        this.sendSocketNotification('GET_MHWP1', this.urlP1);
    },

    getMHW_WM() {
        this.sendSocketNotification('GET_MHWWM', this.urlWM);
    },
});
