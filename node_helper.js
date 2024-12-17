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

getMHW_P1: function(urlP1) {
        // Make a GET request using the Fetch API for the P1 Meter
        fetch(urlP1)
          .then(response_P1 => {
            if (!response_P1.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response_P1.json();
          })

          .then(result_P1 => {
            // Process the retrieved user data
            // console.log(result_P1);           // --> Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWP1_RESULT', result_P1);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  getMHW_WM: function(urlWM) {
        // Make a GET request using the Fetch API for the Water Meter
        fetch(urlWM)
          .then(response_WM => {
            if (!response_WM.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response_WM.json();
          })

          .then(result_WM => {
            // Process the retrieved user data
            // console.log(result_WM);         // --> Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWWM_RESULT', result_WM);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },
  
  socketNotificationReceived: function(notification, payload) {
            if (notification === 'GET_MHWP1') {
            this.getMHW_P1(payload);
            }
            else if (notification === 'GET_MHWWM') {
            this.getMHW_WM(payload);
            }
  },
  
});
