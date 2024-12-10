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
		WM_IP: null,				// IP Address Water Meter
		maxWidth: "500px",			// Max width wrapper
		initialLoadDelay: 1000,
		retryDelay: 2500,
		updateInterval: 5000			// Every 5 seconds
	},
		
	// Define stylesheet
	getStyles: function () {
		return ["MMM-MyHomeWizard.css"];
	},  

	// Define required translations.
  	getTranslations: function () {
    		return {
      		nl: "translations/nl.json",
		en: "translations/en.json"
    		}
  	},
	
	start: function () {
		Log.info("Starting module: " + this.name);
		requiresVersion: "2.9.0",	
			
		// Set locales
		this.url = "http://" + this.config.P1_IP + "/api/v1/data/";
    		this.MHWP1 = [];	        // <-- Create empty MHW-P1 array
		this.MWHWM = [];		// <-- Create empty MHW-WM array
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
		var MHWP1 = this.MHWP1;
		var MHWWM = this.MWHWM;
		console.log(JSON.stringify(MHWP1));
		console.log(JSON.stringify(MHWWM));
		
		// creating the tablerows
		var CurrentPowerRow = document.createElement("tr");
		CurrentPowerRow.className = "current-power-row";

		var CurrentPowerTextCell = document.createElement("td");
		CurrentPowerTextCell.className = "normal currentpowertextcell";
		CurrentPowerTextCell.innerHTML = this.translate("Current_Pwr"); 
		CurrentPowerRow.appendChild(CurrentPowerTextCell);	
		table.appendChild(CurrentPowerRow);

		var CurrentPowerDataCell = document.createElement("td");
		CurrentPowerDataCell.className = "normal currentpowerdatacell";
		CurrentPowerDataCell.innerHTML = Math.round(MHWP1.active_power_w) + " kWh";
		CurrentPowerRow.appendChild(CurrentPowerDataCell);
		table.appendChild(CurrentPowerRow);

		var TotalPowerRow = document.createElement("tr");
		TotalPowerRow.className = "total-power-row";
		
		var TotalPowerTextCell = document.createElement("td");
		TotalPowerTextCell.className = "normal totalpowertextcell";
		TotalPowerTextCell.innerHTML = this.translate("Total_Pwr"); 
		TotalPowerRow.appendChild(TotalPowerTextCell);	
		table.appendChild(TotalPowerRow);

		var TotalPowerDataCell = document.createElement("td");
		TotalPowerDataCell.className = "normal totalpowerdatacell";
		TotalPowerDataCell.innerHTML = Math.round(MHWP1.total_power_import_kwh) + " kWh";
		TotalPowerRow.appendChild(TotalPowerDataCell);
		table.appendChild(TotalPowerRow);

		var TotalGasRow = document.createElement("tr");
		TotalGasRow.className = "total-gas-row";
		
		var TotalGasTextCell = document.createElement("td");
		TotalGasTextCell.className = "normal totalgastextcell";
		TotalGasTextCell.innerHTML = this.translate("Total_Gas"); 
		TotalGasRow.appendChild(TotalGasTextCell);	
		table.appendChild(TotalGasRow);

		var TotalGasDataCell = document.createElement("td");
		TotalGasDataCell.className = "normal totalgasdatacell";
		TotalGasDataCell.innerHTML = Math.round(MHWP1.total_gas_m3) + " m³";
		TotalGasRow.appendChild(TotalGasDataCell);
		table.appendChild(TotalGasRow);
		
		wrapper.appendChild(table);
		return table;		

	}, // <-- closes the getDom function from above
		
	// this processes your data P1 Meter
	processMHWP1: function(data) { 
		this.MHWP1 = data; 
		// console.log(JSON.stringify(this.MHWP1)); // uncomment to see if you're getting data (in dev console)
		this.loaded = true;
	},

	// this tells module when to update
	scheduleUpdate: function() { 
		setInterval(() => {
		    	this.getMHWP1();
		}, this.config.updateInterval);
		this.getMHWP1();
		var self = this;
	},
	  
	// this asks node_helper for data
	getMHWP1: function() { 
		this.sendSocketNotification('GET_MHWP1', this.url);
	},

	// this gets data from node_helper
	socketNotificationReceived: function(notification, payload) { 
		if (notification === "MHWP1_RESULT") {
		// this notification doesn't come back on error..
		this.processMHWP1(payload);
		this.updateDom(this.config.initialLoadDelay);  // or put in processMHWP1
		}
	},
});
