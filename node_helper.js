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

// P1 Meter section
//
getMHW_P1: function(urlP1) {
        // Make a GET request using the Fetch API for the P1 Meter
        fetch(urlP1)
          .then(response => {
            if (!response.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response.json();
          })

          .then(result_P1 => {
            // Process the retrieved user data
            console.log(result_P1); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWP1_RESULT', result_P1);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notification, payload_P1) {
            if (notification === 'GET_MHWP1') {
            this.getMHW_P1(payload_P1);
            }
  },
  
  // Water Meter Section
  //
  getMHW_WM: function(urlWM) {
        // Make a GET request using the Fetch API for the Water Meter
        fetch(urlWM)
          .then(response => {
            if (!response.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response.json();
          })

          .then(result_WM => {
            // Process the retrieved user data
            console.log(result_WM); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWWM_RESULT', result_WM);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notification, payload_WM) {
            if (notification === 'GET_MHWWM') {
            this.getMHW_WM(payload_WM);
            }
  },
  
});
