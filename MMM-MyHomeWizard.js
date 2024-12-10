/*
//-------------------------------------------
MMM-MyHomeWizard
Copyright (C) 2024 - H. Tilburgs
MIT License

v1.0.0 - 26-11-2024 - Initial version
//-------------------------------------------
*/

Module.register('MMM-MyHomeWizard', {

	// Default values
	defaults: {
		P1_IP: null,				// IP Address P1 Meter
		maxWidth: "500px",			// Max width wrapper
		initialLoadDelay: 1000,
		retryDelay: 2500,
		updateInterval: 5000			// Every 5 seconds
	},
		
/*	// Define stylesheet
	getStyles: function () {
		return ["MMM-MyHomeWizard.css"];
	},  

	// Define required scripts.
	getScripts: function () {
		return ["moment.js"];
	},

	// Define required translations.
  	getTranslations: function () {
    		return {
      		nl: "translations/nl.json"
    		}
  	},
*/
	
	start: function () {
		Log.info("Starting module: " + this.name);
		requiresVersion: "2.1.0",	
			
		// Set locales
		this.url = "http://" + this.config.P1_IP + "/api/v1/data/";
    		this.MHW = [];	        	// <-- Create empty MHW-P1 array
		this.scheduleUpdate();       	// <-- When the module updates (see below)
	},

	getDom: function () {
		
		// creating the table
		var table = document.createElement("table");
		table.className = "small";
		
		// creating the wrapper
		var wrapper = document.createElement("div");
		wrapper.className = "wrapper";
		wrapper.style.maxWidth = this.config.maxWidth;
	
		// The loading sequence
   		if (!this.loaded) {
            	wrapper.innerHTML = "Loading....";
           	wrapper.classList.add("bright", "light", "small");
		return wrapper;
		}	

		this.loaded = true;
		var MHW = this.MHW;
		console.log(JSON.stringify(MHW));
		
		// creating the tablerows
		var TotalPowerRow = document.createElement("tr");
		TotalPowerRow.className = "total-power-row";
		
		var TotalPowerTextCell = document.createElement("td");
		TotalPowerTextCell.className = "normal totalpowertextcell";
		TotalPowerTextCell.innerHTML = "Total Power: "; 
		TotalPowerRow.appendChild(TotalPowerTextCell);	
		table.appendChild(TotalPowerRow);

		var TotalPowerDataCell = document.createElement("td");
		TotalPowerDataCell.className = "normal totalpowerdatacell";
		TotalPowerDataCell.innerHTML = Math.round(MHWP.total_power_import_kwh);
		TotalPowerRow.appendChild(TotalPowerDataCell);
		table.appendChild(TotalPowerRow);

		var TotalGasRow = document.createElement("tr");
		TotalGasRow.className = "total-gas-row";
		
		var TotalGasTextCell = document.createElement("td");
		TotalGasTextCell.className = "normal totalgastextcell";
		TotalGasTextCell.innerHTML = "Total Gas: "; 
		TotalGasRow.appendChild(TotalGasTextCell);	
		table.appendChild(TotalGasRow);

		var TotalGasDataCell = document.createElement("td");
		TotalGasDataCell.className = "normal totalpowerdatacell";
		TotalGasDataCell.innerHTML = Math.round(MHWP.total_gas_m3);
		TotalGasRow.appendChild(TotalGasDataCell);
		table.appendChild(TotalGasRow);
		
		wrapper.appendChild(table);
		return table;		

	}, // <-- closes the getDom function from above
		
	// this processes your data P1 Meter
	processMHW: function(data) { 
		this.MHW = data; 
		console.log(JSON.stringify(this.MHW)); // uncomment to see if you're getting data (in dev console)
		this.loaded = true;
	},

	// this tells module when to update
	scheduleUpdate: function() { 
		setInterval(() => {
		    	this.getMHW();
		}, this.config.updateInterval);
		this.getMHW();
		var self = this;
	},
	  
	// this asks node_helper for data
	getMHW: function() { 
		this.sendSocketNotification('GET_MHW', this.url);
	},

	// this gets data from node_helper
	socketNotificationReceived: function(notification, payload) { 
		if (notification === "MHW_RESULT") {
		// this notification doesn't come back on error..
		this.processMHW(payload);
		this.updateDom(this.config.initialLoadDelay);  // or put in processMHW
		}
		// do you want to do updateDom on EVER notification? or only yours
		//this.updateDom(this.config.initialLoadDelay);
	},
});
