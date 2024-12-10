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
		
	// Define stylesheet
	getStyles: function () {
		return ["MMM-MyHomeWizard.css"];
	},  

/*	// Define required scripts.
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
    		this.MHWP = [];	        	// <-- Create empty MHW-P1 array
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
		var MHWP = this.MHWP;
		console.log(JSON.stringify(MHWP));
		
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
		
		wrapper.appendChild(table)
		return table;		

	}, // <-- closes the getDom function from above
		
	// this processes your data P1 Meter
	processMHWP: function(data) { 
		this.MHWP = data; 
		console.log(JSON.stringify(data)); // uncomment to see if you're getting data (in dev console)
		this.loaded = true;
	},

	// this tells module when to update
	scheduleUpdate: function() { 
		setInterval(() => {
		    	this.getMHWP();
		}, this.config.updateInterval);
		this.getMHWP();
		var self = this;
	},
	  
	// this asks node_helper for data
	getMHWP: function() { 
		this.sendSocketNotification('GET_MHWP', this.url);
	},

});
