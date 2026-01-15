Module.register('MMM-MyHomeWizard', {

    defaults: {
        P1_IP: null,
        WM_IP: null,
        maxWidth: "500px",
        extraInfo: false,
        showFooter: true,
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
        this.lastSnapshotDate = null;
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

        const hasP1Data = this.loadedP1 || Object.keys(this.MHW_P1).length > 0;
        const hasWMData = this.loadedWM || Object.keys(this.MHW_WM).length > 0;

        if (!hasP1Data && !hasWMData) {
            wrapper.innerHTML = "Loading....";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "small";

        if (hasP1Data) this.addPowerRows(table, this.MHW_P1);
        if (hasWMData) this.addWaterRows(table, this.MHW_WM);

        if (this.config.showFooter) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.setAttribute("colspan", "2");
            cell.className = "footer";

            let footerText = '';
            if (this.MHW_P1?.meter_model) {
                footerText += '<i class="fa-solid fa-charging-station"></i>&nbsp;' + this.MHW_P1.meter_model;
            }

            if (this.lastSnapshotDate) {
                footerText += '<br><i class="fa-solid fa-calendar-check"></i>&nbsp;Last snapshot: ' + this.lastSnapshotDate;
            } else {
                footerText += '<br><i class="fa-solid fa-calendar-exclamation"></i>&nbsp;Last snapshot: unknown';
            }

            cell.innerHTML = footerText;
            row.appendChild(cell);
            table.appendChild(row);
        }

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
        else if (notification === "LAST_SNAPSHOT_DATE") {
            this.lastSnapshotDate = payload;
            this.updateDom(0);
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
