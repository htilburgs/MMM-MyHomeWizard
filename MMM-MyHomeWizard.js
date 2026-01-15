Module.register("MMM-MyHomeWizard", {

    start: function() {
        console.log("Module started: MMM-MyHomeWizard");
        this.loaded = false;
        this.testData = {};
    },

    socketNotificationReceived: function(notification, payload) {
        console.log("Frontend received notification:", notification, payload);

        if(notification === "TEST_NOTIFICATION") {
            this.testData = payload;
            this.loaded = true;
            this.updateDom(0);
        }
    },

    getDom: function() {
        const wrapper = document.createElement("div");

        if(!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.classList.add("bright", "light", "small");
            return wrapper;
        }

        wrapper.innerHTML = `Test data received: foo = ${this.testData.foo}`;
        return wrapper;
    }

});
