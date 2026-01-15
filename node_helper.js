const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for: " + this.name);
    },

    getMHW_P1: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.sendSocketNotification('MHWP1_RESULT', result);
        } catch (error) {
            console.error("MMM-MyHomeWizard P1 Error:", error.message);
            this.sendSocketNotification('MHWP1_ERROR', { error: error.message, retry });
        }
    },

    getMHW_WM: async function({url, retry}) {
        try {
            const result = await this.fetchWithTimeout(url);
            this.sendSocketNotification('MHWWM_RESULT', result);
        } catch (error) {
            console.error("MMM-MyHomeWizard WM Error:", error.message);
            this.sendSocketNotification('MHWWM_ERROR', { error: error.message, retry });
        }
    },

    fetchWithTimeout: async function(url, timeout = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);
            return response.json();
        } finally {
            clearTimeout(timer);
        }
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'GET_MHWP1') this.getMHW_P1(payload);
        else if (notification === 'GET_MHWWM') this.getMHW_WM(payload);
    }

});
