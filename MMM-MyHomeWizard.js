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
        const locale = this.supportedLanguages.includes(this.config.language)
            ? this.config.language
            : "en";
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            useGrouping: true
        }).format(Math.round(number));
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

    // … hier komen addPowerRows, addWaterRows, addExtraInfo
    // zorg dat alle getallen door this.formatNumber() gaan

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
        this.updateDom();
    },

    processMHW_WM: function(data) {
        this.MHW_WM = data;
        this.loadedWM = true;
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
