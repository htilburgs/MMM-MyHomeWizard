const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({

    start() {
        this.historyFile = path.join(__dirname, "history_data.json");
    },

    socketNotificationReceived(notification, payload) {

        if (notification === "GET_LAST_SNAPSHOT") {
            let snapshot = null;

            if (fs.existsSync(this.historyFile)) {
                try {
                    const history = JSON.parse(fs.readFileSync(this.historyFile, "utf8"));
                    if (history.length > 0) snapshot = history[history.length - 1];
                } catch (e) {
                    console.error("History read error:", e.message);
                }
            }

            this.sendSocketNotification("LAST_SNAPSHOT_RESULT", snapshot);
        }

        if (notification === "GET_MHWP1") {
            this.fetch(payload.url, "MHWP1_RESULT");
        }

        if (notification === "GET_MHWWM") {
            this.fetch(payload.url, "MHWWM_RESULT");
        }
    },

    async fetch(url, responseType) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            this.sendSocketNotification(responseType, data);
        } catch (e) {
            console.error("Fetch error:", e.message);
        }
    }

});
