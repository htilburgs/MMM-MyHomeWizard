Module.register('MMM-MyHomeWizard', {

    defaults: {
        P1_IP: null,
        WM_IP: null,
        maxWidth: "500px",
        extraInfo: false,
        showGas: true,
        showFeedback: true,
        currentPower: false,
        currentWater: false,
        initialLoadDelay: 1000,
        updateInterval: 10000,
        fetchTimeout: 5000,
        retryCount: 2
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

        this.urlP1 = this.config.P1_IP ? "http://" + this.config.P1_IP + "/api/v1/data/" : null;
        this.urlWM = this.config.WM_IP ? "http://" + this.config.WM_IP + "/api/v1/data/" : null;

        this.MHW_P1 = {};
        this.MHW_WM = {};

        this.loadedP1 = false;
        this.loadedWM = false;
        this.errorP1 = false;
        this.errorWM = false;

        this.scheduleUpdate();
    },

    scheduleUpdate: function () {
        setTimeout(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.initialLoadDelay);

        this.updateIntervalId = setInterval(() => {
            this.getMHW_P1();
            this.getMHW_WM();
        }, this.config.updateInterval);
    },

    getDom: function () {
        const wrapper = document.createElement("div");
        wrapper.className = "wrapper";
        wrapper.style.maxWidth = this.config.maxWidth;

        if ((!this.loadedP1 && this.urlP1) || (!this.loadedWM && this.urlWM)) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (this.loadedP1) this.addPowerRows(table, this.MHW_P1);
        if (this.loadedWM) this.addWaterRows(table, this.MHW_WM);

        wrapper.appendChild(table);
        return wrapper;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") {
            this.MHW_P1 = payload;
            this.loadedP1 = true;
            this.errorP1 = false;
            this.updateDom(0);
        }
        else if (notification === "MHWWM_RESULT") {
            this.MHW_WM = payload;
            this.loadedWM = true;
            this.errorWM = false;
            this.updateDom(0);
        }
        else if (notification === "MHWP1_ERROR") {
            if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
            else { this.errorP1 = true; this.updateDom(0); }
        }
        else if (notification === "MHWWM_ERROR") {
            if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
            else { this.errorWM = true; this.updateDom(0); }
        }
    },

    getMHW_P1: function(retry = this.config.retryCount) {
        if (!this.urlP1) return;
        this.sendSocketNotification('GET_MHWP1', { url: this.urlP1, retry });
    },

    getMHW_WM: function(retry = this.config.retryCount) {
        if (!this.urlWM) return;
        this.sendSocketNotification('GET_MHWWM', { url: this.urlWM, retry });
    }

});
