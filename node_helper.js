const NodeHelper = require('node_helper');
const fetch = require('node-fetch'); // ensure node-fetch is installed

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);
    },

    // Fetch P1 Meter data
    getMHW_P1: async function (urlP1) {
        try {
            const result_P1 = await this.fetchWithTimeout(urlP1);
            this.sendSocketNotification('MHWP1_RESULT', result_P1);
        } catch (error) {
            console.error('MMM-MyHomeWizard P1 Error:', error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message });
        }
    },

    // Fetch Water Meter data
    getMHW_WM: async function (urlWM) {
        try {
            const result_WM = await this.fetchWithTimeout(urlWM);
            this.sendSocketNotification('MHWWM_RESULT', result_WM);
        } catch (error) {
            console.error('MMM-MyHomeWizard WM Error:', error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message });
        }
    },

    // Generic fetch with timeout
    fetchWithTimeout: async function (url, timeout = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, { signal: controller.signal });

        clearTimeout(timer);

        if (!response.ok) {
            throw new Error(`Network response was not ok (${response.status})`);
        }

        return response.json();
    },

    // Handle socket notifications
    socketNotificationReceived: function (notification, payload) {
        if (notification === 'GET_MHWP1') {
            this.getMHW_P1(payload);
        } else if (notification === 'GET_MHWWM') {
            this.getMHW_WM(payload);
        }
    },

});
