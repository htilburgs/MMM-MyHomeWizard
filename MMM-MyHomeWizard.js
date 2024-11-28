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
		P1_IP: null,					// IP Address P1 Meter
		showIcons: true,				// Display Icons or Text
		maxWidth: "500px",				// Max width wrapper
		initialLoadDelay: 1000,
		retryDelay: 2500,
		updateInterval: 5000			// Every 5 seconds
	},
		
	// Define stylesheet
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
	
	start: function () {
		Log.info("Starting module: " + this.name);
		requiresVersion: "2.1.0",	
			
		// Set locales
		this.url = "http://" + this.config.P1_IP + "/api/v1/data/";
    		this.MHWP1 = [];	        // <-- Create empty MHW-P1 array
		this.scheduleUpdate();       	// <-- When the module updates (see below)
	},
/*
	getDom: function () {
		
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
*/	
		//var MHWP1 = this.MHWP1;
    		console.log(this.MHWP1);


		// creating the tablerows
		var TotalPowerRow = document.createElement("tr");
		TotalPowerRow.className = "total-power-row";
		
		var TotalPowerTextCell = document.createElement("td");
		TotalPowerTextCell.className = "normal totalpowertextcell";
		TotalPowerTextCell.innerHTML = this.MHWP1.total_power_import_kwh; 
		TotalPowerRow.appendChild(TotalPowerTextCell);	
		table.appendChild(TotalPowerRow);

		var TotalGasCell = document.createElement("td");
		TotalGasCell.className = "normal totalgascell";
		TotalGasCell.innerHTML = this.MHWP1.total_gas_m3;
		TotalPowerRow.appendChild(TotalGasCell);
		table.appendChild(TotalPowerRow);
/*
		var MinMaxTempRow = document.createElement("tr");
		MinMaxTempRow.className = "minmaxtemp-row";		

		var MaxTempDataCell = document.createElement("td");
		MaxTempDataCell.className = "small maxtempdatacell";
		MaxTempDataCell.innerHTML = this.config.showIcons == false ? "(Max) " + WW[0].max_temp  + " ℃" : '<i class="wi wi-thermometer"></i>' + "&nbsp;" + WW[0].max_temp + " ℃";
		MinMaxTempRow.appendChild(MaxTempDataCell);
		table.appendChild(MinMaxTempRow);		
		
		var MinTempDataCell = document.createElement("td");
		MinTempDataCell.className = "small mintempdatacell";
		MinTempDataCell.innerHTML = this.config.showIcons == false ? "(Min) " + WW[0].min_temp  + " ℃" : '<i class="wi wi-thermometer-exterior"></i>' + "&nbsp;" + WW[0].min_temp + " ℃";		
		MinMaxTempRow.appendChild(MinTempDataCell);
		table.appendChild(MinMaxTempRow);	
		
		var HuidigRow = document.createElement("tr");
		HuidigRow.className = "huidig-row";		
		
		var HuidigCell = document.createElement("td");
		HuidigCell.className = "small huidigcell";
		HuidigCell.innerHTML = WL[0].samenv;
		HuidigRow.appendChild(HuidigCell);
		table.appendChild(HuidigRow);		
		
		if (this.config.showExtra != false) {
			var spacer = document.createElement("span");
			spacer.innerHTML = "&nbsp;";
			table.appendChild(spacer);

			var NeerslagRow = document.createElement("tr");
			NeerslagRow.className = "neerslag-row";
		
			var NeerslagTextCell = document.createElement("td");
			NeerslagTextCell.className = "small neerslagtextcell";
			NeerslagTextCell.innerHTML = this.config.showIcons == false ? this.translate("RAINFALL-CHANCE") : '<i class="wi wi-umbrella"></i>';	
			NeerslagRow.appendChild(NeerslagTextCell);
			table.appendChild(NeerslagRow);

			var NeerslagDataCell = document.createElement("td");
			NeerslagDataCell.className = "small neerslagdatacell";
			NeerslagDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.d0neerslag + " %" : MWB.d0neerslag + " %";
			NeerslagRow.appendChild(NeerslagDataCell);
			table.appendChild(NeerslagRow);			

			var ZonRow = document.createElement("tr");
			ZonRow.className = "zon-row";

			var ZonTextCell = document.createElement("td");
			ZonTextCell.className = "small zontextcell";
			ZonTextCell.innerHTML = this.config.showIcons == false ? this.translate("SUN-CHANCE") : '<i class="wi wi-day-sunny"></i>';
			ZonRow.appendChild(ZonTextCell);
			table.appendChild(ZonRow);

			var ZonDataCell = document.createElement("td");
			ZonDataCell.className = "small zondatacell";
			ZonDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.d0zon + " %" : MWB.d0zon + " %";
			ZonRow.appendChild(ZonDataCell);
			table.appendChild(ZonRow);					

			var WindrichtingRow = document.createElement("tr");
			WindrichtingRow.className = "windrichting-row";

			var WindrTextCell = document.createElement("td");
			WindrTextCell.className = "small windrtextcell";
			WindrTextCell.innerHTML = this.config.showIcons == false ? this.translate ("WIND-DIR") : '<i class="wi wi-wind-direction"></i>';
			WindrichtingRow.appendChild(WindrTextCell);
			table.appendChild(WindrichtingRow);

			var WindrDataCell = document.createElement("td");
			WindrDataCell.className = "small windrdatacell";
			WindrDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.windr : MWB.windr;
			WindrichtingRow.appendChild(WindrDataCell);
			table.appendChild(WindrichtingRow);		

			var WindkrachtRow = document.createElement("tr");
			WindkrachtRow.className = "windkracht-row";

			var WindsTextCell = document.createElement("td");
			WindsTextCell.className = "small windstextcell";
			WindsTextCell.innerHTML = this.config.showIcons == false ? this.translate ("WIND-FORCE") : '<i class="wi wi-strong-wind"></i>';
			WindkrachtRow.appendChild(WindsTextCell);
			table.appendChild(WindkrachtRow);

			var WindsDataCell = document.createElement("td");
			WindsDataCell.className = "small windsdatacell";
			WindsDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.winds + " Bft" : MWB.winds + " Bft";
			WindkrachtRow.appendChild(WindsDataCell);
			table.appendChild(WindkrachtRow);		

			var LuchtdrukRow = document.createElement("tr");
			LuchtdrukRow.className = "luchtdruk-row";

			var LuchtdTextCell = document.createElement("td");
			LuchtdTextCell.className = "small luchtdtextcell";
			LuchtdTextCell.innerHTML = this.config.showIcons == false ? this.translate ("AIR-PRESS") : '<i class="wi wi-barometer"></i>';
			LuchtdrukRow.appendChild(LuchtdTextCell);
			table.appendChild(LuchtdrukRow);

			var LuchtdDataCell = document.createElement("td");
			LuchtdDataCell.className = "small luchtddatacell";
			LuchtdDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.luchtd : MWB.luchtd;
			LuchtdrukRow.appendChild(LuchtdDataCell);
			table.appendChild(LuchtdrukRow);	

			var ZichtRow = document.createElement("tr");
			ZichtRow.className = "zicht-row";

			var ZichtTextCell = document.createElement("td");
			ZichtTextCell.className = "small zichttextcell";
			ZichtTextCell.innerHTML = this.config.showIcons == false ? this.translate ("VISIBILITY") : '<i class="far fa-eye"></i>';
			ZichtRow.appendChild(ZichtTextCell);
			table.appendChild(ZichtRow);

			var ZichtDataCell = document.createElement("td");
			ZichtDataCell.className = "small zichtdatacell";
			ZichtDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.zicht + " KM" : MWB.zicht + " KM";
			ZichtRow.appendChild(ZichtDataCell);
			table.appendChild(ZichtRow);

			var LuchtvochtigheidRow = document.createElement("tr");
			LuchtvochtigheidRow.classname = "luchtvochtigheid-row";

			var LuchtvTextCell = document.createElement("td");
			LuchtvTextCell.className = "small luchtvtextcell";
			LuchtvTextCell.innerHTML = this.config.showIcons == false ? this.translate ("AIR-MOIST") : '<i class="wi wi-humidity"></i>';
			LuchtvochtigheidRow.appendChild(LuchtvTextCell);
			table.appendChild(LuchtvochtigheidRow);

			var LuchtvDataCell = document.createElement("td");
			LuchtvDataCell.className = "small luchtvdatacell";
			LuchtvDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.lv + " %" : MWB.lv + " %";
			LuchtvochtigheidRow.appendChild(LuchtvDataCell);
			table.appendChild(LuchtvochtigheidRow);

			var ZonopRow = document.createElement("tr");
			ZonopRow.className = "zonop-row";

			var ZonopTextCell = document.createElement("td");
			ZonopTextCell.className = "small zonoptextcell";
			ZonopTextCell.innerHTML = this.config.showIcons == false ? this.translate ("SUNUP") : '<i class="wi wi-sunrise"></i>';
			ZonopRow.appendChild(ZonopTextCell);
			table.appendChild(ZonopRow);

			var ZonopDataCell = document.createElement("td");
			ZonopDataCell.className = "small zonopdatacell";
			ZonopDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.sup : MWB.sup;
			ZonopRow.appendChild(ZonopDataCell);
			table.appendChild(ZonopRow);	

			var ZonOnderRow = document.createElement("tr");
			ZonOnderRow.className = "zononder-row";

			var ZonOnderTextCell = document.createElement("td");
			ZonOnderTextCell.className = "small zondertextcell";
			ZonOnderTextCell.innerHTML = this.config.showIcons == false ? this.translate ("SUNDOWN") : '<i class="wi wi-sunset"></i>';
			ZonOnderRow.appendChild(ZonOnderTextCell);
			table.appendChild(ZonOnderRow);

			var ZonOnderDataCell = document.createElement("td");
			ZonOnderDataCell.className = "small zonderdatacell";
			ZonOnderDataCell.innerHTML = this.config.showIcons == false ? ": " + MWB.sunder : MWB.sunder;
			ZonOnderRow.appendChild(ZonOnderDataCell);
			table.appendChild(ZonOnderRow);			
			
		}

		var FooterRow = document.createElement("tr");
		FooterRow.className = "footer";
		FooterRow.innerHTML = "Harm";
		table.appendChild(FooterRow);
*/			
		return table;		

	}, // <-- closes the getDom function from above
		
	// this processes your data P1 Meter
	processMHWP1: function(data) { 
		this.MHWP1 = data; 
		console.log(this.MHWP1); // uncomment to see if you're getting data (in dev console)
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

});
