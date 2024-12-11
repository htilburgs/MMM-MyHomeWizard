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
		extraInfo: false,
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
		this.urlP1 = "http://" + this.config.P1_IP + "/api/v1/data/";
		this.urlWM = "http://" + this.config.WM_IP + "/api/v1/data/";
    		this.MHW_P1 = [];	        // <-- Create empty MHW_P1 array
		this.MHW_WM = [];		// <-- Create empty MHW_WM array
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
		var MHW_P1 = this.MHW_P1;
		var MHW_WM = this.MHW_WM;
		console.log(JSON.stringify(MHW_P1));
		console.log(JSON.stringify(MHW_WM));
		
		// creating the tablerows
		var CurrentPowerRow = document.createElement("tr");
		CurrentPowerRow.className = "current-power-row";

		var CurrentPowerTextCell = document.createElement("td");
		CurrentPowerTextCell.className = "normal currentpowertextcell";
		CurrentPowerTextCell.innerHTML = '<i class="fa-solid fa-bolt-lightning"></i>' + "&nbsp;" + this.translate("Current_Pwr"); 
		CurrentPowerRow.appendChild(CurrentPowerTextCell);	
		table.appendChild(CurrentPowerRow);

		var CurrentPowerDataCell = document.createElement("td");
		CurrentPowerDataCell.className = "normal currentpowerdatacell";
		CurrentPowerDataCell.innerHTML = Math.round(MHW_P1.active_power_w) + " Watt";
		CurrentPowerRow.appendChild(CurrentPowerDataCell);
		table.appendChild(CurrentPowerRow);

		var TotalPowerRow = document.createElement("tr");
		TotalPowerRow.className = "total-power-row";
		
		var TotalPowerTextCell = document.createElement("td");
		TotalPowerTextCell.className = "normal totalpowertextcell";
		TotalPowerTextCell.innerHTML = '<i class="fa-solid fa-plug-circle-bolt"></i>' + "&nbsp;" + this.translate("Total_Pwr"); 
		TotalPowerRow.appendChild(TotalPowerTextCell);	
		table.appendChild(TotalPowerRow);

		var TotalPowerDataCell = document.createElement("td");
		TotalPowerDataCell.className = "normal totalpowerdatacell";
		TotalPowerDataCell.innerHTML = Math.round(MHW_P1.total_power_import_kwh) + " kWh";
		TotalPowerRow.appendChild(TotalPowerDataCell);
		table.appendChild(TotalPowerRow);

		var TotalGasRow = document.createElement("tr");
		TotalGasRow.className = "total-gas-row";
		
		var TotalGasTextCell = document.createElement("td");
		TotalGasTextCell.className = "normal totalgastextcell";
		TotalGasTextCell.innerHTML = '<i class="fa-solid fa-fire"></i>' + "&nbsp;" + this.translate("Total_Gas"); 
		TotalGasRow.appendChild(TotalGasTextCell);	
		table.appendChild(TotalGasRow);

		var TotalGasDataCell = document.createElement("td");
		TotalGasDataCell.className = "normal totalgasdatacell";
		TotalGasDataCell.innerHTML = Math.round(MHW_P1.total_gas_m3) + " m³";
		TotalGasRow.appendChild(TotalGasDataCell);
		table.appendChild(TotalGasRow);

		var TotalWaterRow = document.createElement("tr");
		TotalWaterRow.className = "total-water-row";
		
		var TotalWaterTextCell = document.createElement("td");
		TotalWaterTextCell.className = "normal totalwatertextcell";
		TotalWaterTextCell.innerHTML = '<i class="fa-solid fa-droplet"></i>' + "&nbsp;" + this.translate("Total_Wtr"); 
		TotalWaterRow.appendChild(TotalWaterTextCell);	
		table.appendChild(TotalWaterRow);

		var TotalWaterDataCell = document.createElement("td");
		TotalWaterDataCell.className = "normal totalwaterdatacell";
		TotalWaterDataCell.innerHTML = Math.round(MHW_WM.total_liter_m3) + " m³";
		TotalWaterRow.appendChild(TotalWaterDataCell);
		table.appendChild(TotalWaterRow);

		if (this.config.extraInfo != false) {
			var spacer = document.createElement("span");
			spacer.innerHTML = "&nbsp;";
			table.appendChild(spacer);

			var MeterRow = document.createElement("tr");
			MeterRow.className = "meterrow";
		
			var MeterTextCell = document.createElement("td");
			MeterTextCell.className = "normal metertextcell";
			MeterTextCell.innerHTML = '<i class="fa-solid fa-charging-station"></i>' +  "&nbsp;" + "Meter:"; 
			MeterRow.appendChild(MeterTextCell);	
			table.appendChild(MeterRow);

			var MeterDataCell = document.createElement("td");
			MeterDataCell.className = "normal meterdatacell";
			MeterDataCell.innerHTML = MHW_P1.meter_model;
			MeterRow.appendChild(MeterDataCell);
			table.appendChild(MeterRow);

		}
		
		wrapper.appendChild(table);
		return table;		

	}, // <-- closes the getDom function from above

	
// <-- Updating and information gathering

	// this tells module when to update
	scheduleUpdate: function() { 
		setInterval(() => {
		    	this.getMHW_P1();
			this.getMHW_WM();
		}, this.config.updateInterval);
		this.getMHW_P1();
		this.getMHW_WM();
		var self = this;
	},
	  
	// this gets data from node_helper
	socketNotificationReceived: function(notification, payload) { 
		if (notification === "MHWP1_RESULT") {
		// this notification doesn't come back on error..
		this.processMHW_P1(payload);
		this.updateDom(this.config.initialLoadDelay); 
		}
		else if (notification === "MHWWM_RESULT") {
		// this notification doesn't come back on error..
		this.processMHW_WM(payload);
		this.updateDom(this.config.initialLoadDelay);
		}
	},

	// This processes your data P1 Meter
	processMHW_P1: function(data_P1) { 
		this.MHW_P1 = data_P1; 
		console.log(JSON.stringify(this.MHW_P1)); // uncomment to see if you're getting data (in dev console)
		this.loaded = true;
	},
	
	// This processes your data Water Meter
	processMHW_WM: function(data_WM) { 
		this.MHW_WM = data_WM; 
		console.log(JSON.stringify(this.MHW_WM)); // uncomment to see if you're getting data (in dev console)
		this.loaded = true;
	},

	// this asks node_helper for data - P1
	getMHW_P1: function() { 
		this.sendSocketNotification('GET_MHWP1', this.urlP1);
	},
	
	// this asks node_helper for data - WM
	getMHW_WM: function() { 
		this.sendSocketNotification('GET_MHWWM', this.urlWM);
	},
	
});
