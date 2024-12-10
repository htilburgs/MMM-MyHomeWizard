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
getMHWP1: function(urlP1) {
        // Make a GET request using the Fetch API for the P1 Meter
        fetch(urlP1)
          .then(responseP1 => {
            if (!responseP1.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return responseP1.json();
          })

          .then(resultP1 => {
            // Process the retrieved user data
            console.log(resultP1); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWP1_RESULT', resultP1);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notificationP1, payloadP1) {
            if (notificationP1 === 'GET_MHWP1') {
            this.getMHWP1(payloadP1);
            }
  },

  // Water Meter Section
  //
  getMHWWM: function(urlWM) {
        // Make a GET request using the Fetch API for the Water Meter
        fetch(urlWM)
          .then(responseWM => {
            if (!responseWM.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return responseWM.json();
          })

          .then(resultWM => {
            // Process the retrieved user data
            console.log(resultWM); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWWM_RESULT', resultWM);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notificationWM, payloadWM) {
            if (notificationWM === 'GET_MHWWM') {
            this.getMHWWM(payloadWM);
            }
  },
});
