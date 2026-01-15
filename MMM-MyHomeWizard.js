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
        showHistoryCharts: {
            electricity: true,
            gas: true,
            water: true
        }
    },

    chartColors: {
        electricityImport: 'rgb(54, 162, 235)',
        electricityExport: 'rgb(75, 192, 192)',
        gas: 'rgb(255, 159, 64)',
        water: 'rgb(153, 102, 255)'
    },

    getScripts: function () {
        return [
            "MMM-MyHomeWizard.css",
            "https://cdn.jsdelivr.net/npm/chart.js"
        ];
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

        // Error handling
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

        // Table
        var table = document.createElement("table");
        table.className = "small";
        if (this.config.P1_IP) this.addPowerRows(table, this.MHW_P1);
        if (this.config.WM_IP) this.addWaterRows(table, this.MHW_WM);
        wrapper.appendChild(table);

        // Chart
        if (this.config.showHistoryCharts.electricity || this.config.showHistoryCharts.gas || this.config.showHistoryCharts.water) {
            var canvasWrapper = document.createElement("div");
            canvasWrapper.style.marginTop = "15px";
            var canvas = document.createElement("canvas");
            canvas.id = "MHWHistoryChart";
            canvasWrapper.appendChild(canvas);
            wrapper.appendChild(canvasWrapper);

            this.drawHistoryChart();
        }

        // Manual Save Button
        var buttonWrapper = document.createElement("div");
        buttonWrapper.style.marginTop = "10px";
        var saveButton = document.createElement("button");
        saveButton.innerHTML = "💾 Save Snapshot";
        saveButton.style.cursor = "pointer";
        saveButton.onclick = () => {
            this.sendSocketNotification('MANUAL_SAVE');
            saveButton.innerHTML = "✅ Saved!";
            setTimeout(() => { saveButton.innerHTML = "💾 Save Snapshot"; }, 2000);
        };
        buttonWrapper.appendChild(saveButton);
        wrapper.appendChild(buttonWrapper);

        return wrapper;
    },

    createCell: function(content, className, color) {
        var cell = document.createElement("td");
        cell.className = "normal " + className;
        if (color) {
            cell.innerHTML = `<span style="
                display:inline-block;
                width:12px;
                height:12px;
                background-color:${color};
                border-radius:50%;
                margin-right:5px;
                vertical-align:middle;
            "></span>` + content;
        } else {
            cell.innerHTML = content;
        }
        return cell;
    },

    addPowerRows: function(table, data) {
        if (this.config.currentPower) {
            var row = document.createElement("tr");
            row.className = "current-power-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-bolt-lightning"></i>&nbsp;' + this.translate("Current_Pwr"), "currentpowertextcell"));
            row.appendChild(this.createCell(Math.round(data.active_power_w) + " Watt", "currentpowerdatacell", this.chartColors.electricityImport));
            table.appendChild(row);
        }

        var row = document.createElement("tr");
        row.className = "total-power-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-bolt"></i>&nbsp;' + this.translate("Total_Pwr"), "totalpowertextcell"));
        row.appendChild(this.createCell(Math.round(data.total_power_import_kwh) + " kWh", "totalpowerdatacell", this.chartColors.electricityImport));
        table.appendChild(row);

        if (this.config.showFeedback) {
            var row = document.createElement("tr");
            row.className = "total-feedback-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-plug-circle-plus"></i>&nbsp;' + this.translate("Total_Feedback"), "totalfeedbacktextcell"));
            row.appendChild(this.createCell(Math.round(data.total_power_export_kwh) + " kWh", "totalfeedbackdatacell", this.chartColors.electricityExport));
            table.appendChild(row);
        }

        if (this.config.showGas) {
            var row = document.createElement("tr");
            row.className = "total-gas-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-fire"></i>&nbsp;' + this.translate("Total_Gas"), "totalgastextcell"));
            row.appendChild(this.createCell(Math.round(data.total_gas_m3) + " m³", "totalgasdatacell", this.chartColors.gas));
            table.appendChild(row);
        }

        if (this.config.extraInfo) this.addExtraInfo(table, data, "P1");
    },

    addWaterRows: function(table, data) {
        if (this.config.currentWater) {
            var row = document.createElement("tr");
            row.className = "current-water-row";
            row.appendChild(this.createCell('<i class="fa-solid fa-water"></i>&nbsp;' + this.translate("Current_Wtr"), "currentwatertextcell"));
            row.appendChild(this.createCell(Math.round(data.active_liter_lpm) + " Lpm", "currentwaterdatacell", this.chartColors.water));
            table.appendChild(row);
        }

        var row = document.createElement("tr");
        row.className = "total-water-row";
        row.appendChild(this.createCell('<i class="fa-solid fa-droplet"></i>&nbsp;' + this.translate("Total_Wtr"), "totalwatertextcell"));
        row.appendChild(this.createCell(
            Math.round(data.total_liter_m3) + " m³ (" + Math.round(data.total_liter_m3 * 1000) + " L)",
            "totalwaterdatacell",
            this.chartColors.water
        ));
        table.appendChild(row);

        if (this.config.extraInfo) this.addExtraInfo(table, data, "WM");
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

    drawHistoryChart: function () {
        const fs = require('fs');
        const path = require('path');
        const historyFile = path.join(__dirname, 'history_data.json');

        if (!fs.existsSync(historyFile)) return;

        let history = [];
        try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); }
        catch (err) { console.error("Failed to read history_data.json for chart:", err.message); return; }

        if (history.length === 0) return;

        const labels = history.map(d => d.date);
        const datasets = [];

        if (this.config.showHistoryCharts.electricity) {
            datasets.push({
                label: 'Electricity Import (kWh)',
                data: history.map(d => d.P1.total_power_import_kwh),
                borderColor: this.chartColors.electricityImport,
                fill: false, tension: 0.1
            });
            datasets.push({
                label: 'Electricity Export (kWh)',
                data: history.map(d => d.P1.total_power_export_kwh),
                borderColor: this.chartColors.electricityExport,
                fill: false, tension: 0.1
            });
        }

        if (this.config.showHistoryCharts.gas) {
            datasets.push({
                label: 'Gas (m³)',
                data: history.map(d => d.P1.total_gas_m3),
                borderColor: this.chartColors.gas,
                fill: false, tension: 0.1
            });
        }

        if (this.config.showHistoryCharts.water) {
            datasets.push({
                label: 'Water (m³)',
                data: history.map(d => d.WM.total_m3),
                borderColor: this.chartColors.water,
                fill: false, tension: 0.1
            });
        }

        const ctx = document.getElementById("MHWHistoryChart").getContext("2d");
        if (this.historyChart) this.historyChart.destroy();

        this.historyChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
                interaction: { mode: 'nearest', intersect: false },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    getMHW_P1: function(retry = this.config.retryCount) { this.sendSocketNotification('GET_MHWP1', { url: this.urlP1, retry }); },
    getMHW_WM: function(retry = this.config.retryCount) { this.sendSocketNotification('GET_MHWWM', { url: this.urlWM, retry }); },

    processMHW_P1: function(data) { this.MHW_P1 = data; this.loadedP1 = true; this.errorP1 = false; if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay); },
    processMHW_WM: function(data) { this.MHW_WM = data; this.loadedWM = true; this.errorWM = false; if (this.loadedP1 && this.loadedWM) this.updateDom(this.config.initialLoadDelay); },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "MHWP1_RESULT") this.processMHW_P1(payload);
        else if (notification === "MHWWM_RESULT") this.processMHW_WM(payload);
        else if (notification === "MHWP1_ERROR") {
            console.error("MMM-MyHomeWizard P1 Error:", payload.error);
            if (payload.retry > 0) this.getMHW_P1(payload.retry - 1);
            else { this.errorP1 = true; this.updateDom(this.config.initialLoadDelay); }
        } else if (notification === "MHWWM_ERROR") {
            console.error("MMM-MyHomeWizard WM Error:", payload.error);
            if (payload.retry > 0) this.getMHW_WM(payload.retry - 1);
            else { this.errorWM = true; this.updateDom(this.config.initialLoadDelay); }
        } else if (notification === "MANUAL_SAVE") {
            this.sendSocketNotification('MANUAL_SAVE'); // forward to Node Helper
        }
    }

});
