const NodeHelper = require('node_helper');
const fs = require('fs');
const path = require('path');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);

        this.lastP1 = {};
        this.lastWM = {};

        // Verzenden van mock data met voldoende vertraging
        this.sendMockDataWithDelay();

        // Dagelijkse opslag om 12:05
        this.scheduleDailySaveAtNoon();
    },

    sendMockDataWithDelay: function() {
        const mockP1 = {
            total_power_import_kwh: 1234.56,
            total_power_export_kwh: 12.34,
            active_power_w: 345,
            total_gas_m3: 45.6,
            wifi_strength: 90,
            any_power_fail_count: 0,
            meter_model: "P1 Mock Model"
        };

        const mockWM = {
            total_liter_m3: 78.9,
            active_liter_lpm: 10,
            wifi_strength: 85
        };

        // Gebruik arrow function zodat 'this' correct blijft
        setTimeout(() => {
            console.log("Sending mock data to frontend");
            this.lastP1 = mockP1;
            this.lastWM = mockWM;

            this.sendSocketNotification('MHWP1_RESULT', mockP1);
            this.sendSocketNotification('MHWWM_RESULT', mockWM);

            this.sendSocketNotification('DAILY_USAGE', this.calculateDailyConsumptionMock());
        }, 2000); // 2 seconden vertraging zodat frontend klaar is
    },

    calculateDailyConsumptionMock: function() {
        return {
            electricity_kwh: 5.67,
            feed_kwh: 0.12,
            gas_m3: 0.45,
            water_m3: 1.23
        };
    },

    scheduleDailySaveAtNoon: function() {
        const now = new Date();
        const next = new Date();
        next.setHours(12, 5, 0, 0);
        if (now > next) next.setDate(next.getDate() + 1);

        const msUntilNext = next - now;

        setTimeout(() => {
            this.saveDataAndCalculate();
            setInterval(() => {
                this.saveDataAndCalculate();
            }, 24 * 60 * 60 * 1000);
        }, msUntilNext);
    },

    saveDataAndCalculate: function() {
        this.saveDataToFile({ MHW_P1: this.lastP1, MHW_WM: this.lastWM });
        this.sendSocketNotification('DAILY_USAGE', this.calculateDailyConsumptionMock());
    },

    saveDataToFile: function(data) {
        try {
            const folderPath = path.resolve(__dirname, 'data');
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);

            const filePath = path.join(folderPath, 'meter_history.json');

            let history = [];
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath);
                history = JSON.parse(fileContent);
            }

            const entry = {
                timestamp: new Date().toISOString(),
                P1: data.MHW_P1 || {},
                WM: data.MHW_WM || {}
            };

            history.push(entry);
            fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
            console.log("MMM-MyHomeWizard: Data saved to meter_history.json");
        } catch (err) {
            console.error("MMM-MyHomeWizard: Error saving data", err);
        }
    }

});
