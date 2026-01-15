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

        this.lastSnapshotDate = null;

        this.scheduleUpdate();
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

    getDom: function () {
        var wrapper = document.createElement("div");
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

        var table = document.createElement("table");
        table.className = "small";

        if (this.config.P1_IP) this.addPowerRows(table, this.MHW_P1);
        if (this.config.WM_IP) this.addWaterRows(table, this.MHW_WM);

        if (this.config.showFooter) {
            var row = document.createElement("tr");
            var cell = document.createElement("td");
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
            if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
        }
        else if (notification === "MHWWM_RESULT") {
            this.MHW_WM = payload;
            this.loadedWM = true;
            this.errorWM = false;
            if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay);
        }
        else if (notification === "MHWP1_ERROR") {
            if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
            else { this.errorP1 = true; this.updateDom(this.config.initialLoadDelay); }
        }
        else if (notification === "MHWWM_ERROR") {
            if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
            else { this.errorWM = true; this.updateDom(this.config.initialLoadDelay); }
        }
        else if (notification === "LAST_SNAPSHOT_DATE") {
            this.lastSnapshotDate = payload;
            this.updateDom(0);
        }
    }

});
