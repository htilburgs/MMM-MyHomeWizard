/*
//-------------------------------------------
MMM-MyHomeWizard
Copyright (C) 2024 - H. Tilburgs
MIT License

v1.0.0 : Initial version

//-------------------------------------------
*/

const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

  start: function() {
          console.log("Starting node_helper for: " + this.name);
  },

getMHW-P1: function(urlP1) {
        // Make a GET request using the Fetch API
        fetch(urlP1)
          .then(response => {
            if (!response.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response.json();
          })

          .then(result => {
            // Process the retrieved user data
            console.log(result); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHW-P1_RESULT', result);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  getMHW-WT: function(urlP1) {
        // Make a GET request using the Fetch API
        fetch(urlWT)
          .then(response => {
            if (!response.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response.json();
          })

          .then(result => {
            // Process the retrieved user data
            console.log(result); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHW-W1_RESULT', result);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notification, payload) {
            if (notification === 'GET_MHW-P1') {
            this.getMHW-P1(payload);
            }
  },
  
    socketNotificationReceived: function(notification, payload) {
            if (notification === 'GET_MHW-W1') {
            this.getMHW-W1(payload);
            }
  },

});
