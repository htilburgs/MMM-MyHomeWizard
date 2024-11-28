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

getMHWP1: function(url) {
        // Make a GET request using the Fetch API
        fetch(url)
          .then(response => {
            if (!response.ok) {
              console.error('MMM-MyHomeWizard: Network response was not ok');
            }
            return response.json();
          })

          .then(result => {
            // Process the retrieved user data
            console.log(result); // Remove trailing slashes to display data in Console for testing
            this.sendSocketNotification('MHWP1_RESULT', result);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  getMHWWT: function(urlWT) {
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
            this.sendSocketNotification('MHWWT_RESULT', result);
          })

          .catch(error => {
            console.error('Error:', error);
          });
  },

  socketNotificationReceived: function(notification, payload) {
            if (notification === 'GET_MHWP1') {
            this.getMHWP1(payload);
            }
  },
  
    socketNotificationReceived: function(notification, payload) {
            if (notification === 'GET_MHWWTR') {
            this.getMHWWTR(payload);
            }
  },

});
