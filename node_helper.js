/*
//-------------------------------------------
MMM-MyHomeWizard
Copyright (C) 2024 - H. Tilburgs
MIT License

v1.0.0 : Initial version
v1.0.1 : Code optimalisation
//-------------------------------------------
*/

const NodeHelper = require('node_helper');

module.exports = NodeHelper.create({

  start: function() {
    console.log(`Starting node_helper for: ${this.name}`);
  },

  // Helper function to fetch data from a given URL
  fetchData: function(url, socketNotificationType) {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} - ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        this.sendSocketNotification(socketNotificationType, data);
      })
      .catch(error => {
        console.error(`Error fetching data for ${socketNotificationType}:`, error);
      });
  },

  // Notification handler
  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case 'GET_MHWP1':
        this.fetchData(payload, 'MHWP1_RESULT');
        break;
      case 'GET_MHWWM':
        this.fetchData(payload, 'MHWWM_RESULT');
        break;
      default:
        console.warn(`Unknown notification: ${notification}`);
    }
  },
});
