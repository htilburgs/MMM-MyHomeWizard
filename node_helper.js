const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    start: function() {
        console.log("NodeHelper started for MMM-MyHomeWizard");

        setTimeout(() => {
            console.log("NodeHelper sending test data");
            this.sendSocketNotification("TEST_NOTIFICATION", {foo: "bar"});
        }, 1000);
    }
});
