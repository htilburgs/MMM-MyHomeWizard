# MMM-MyHomeWizard
This a module for [Magic Mirror²](https://github.com/MichMich/MagicMirror) smart mirror project.</br>
This modules is for use with the HomeWizard P1 meter and WaterMeter. 

Currently this module uses the V1 API from HomeWizard.

## Enable the Local API
For MMM-MyHomeWizard to get access to the data from an Energy device, you have to enable the API for each device. </br>
You can do this in the HomeWizard Energy app. </br>

Go to ```Settings > Meters > ''Your meter''```, and enable Local API for the P1 Meter and/or the Water Meter at the botom of the page.

## Installation
Clone this repository in your modules folder, and install dependencies:

```
cd ~/MagicMirror/modules 
git clone https://github.com/htilburgs/MMM-MyHomeWizard.git
cd MMM-MyHomeWizard
npm install 
```
## Update
When you need to update this module:

```
cd ~/MagicMirror/modules/MMM-MyHomeWizard
git pull
npm install
```

## Configuration
Go to the MagicMirror/config directory and edit the config.js file.
Add the module to your modules array in your config.js.

```
{
  module: 'MMM-MyHomeWizard',
  position: 'top_left',
  header: 'HomeWizard',
  disabled: false,
  config: {
		// Replace these with your actual meter IPs
		P1_IP: "0.0.0.0",	    	// IP Address HomeWizard P1 meter
		WM_IP: "0.0.0.0",	    	// IP Address HomeWizrd Water meter - Remove line when not used

		// Timing & update
		updateInterval: 5000,   	// Update every 5 seconds
 		maxWidth: "500px",			// Max width of the module

		// Display settings
		extraInfo: true,          	// show wifi & power fail info
        showFooter: true,        	// show meter model in footer
		showGas: true,            	// display gas usage
		showFeedback: true,       	// display feed back to grid
		showLastUpdate: true,     	// display the last update for the history data in the footer
		currentPower: true,       	// show current power usage
		currentWater: false,       	// show current water usage
		currentVoltage: true,     	// compact 3-fase, auto detection

		// Deltaws
        showDeltaPower: true,		// Show Delta between History and Current data (Power)
        showDeltaGas: true,			// Show Delta between History and Current data (Gas)
        showDeltaWater: false		// Show Delta between History and Current data (Water)
  		}
},
```
<img width="35" height="27" alt="image" src="https://github.com/user-attachments/assets/46b185aa-ac08-4acb-9182-1ca981540471" /></br>
*The Delta values needs 2 days in history_data.json, so this option will first show after 2 days. </br>
So this is not a bug, but as designed!*

## Images
<img width="427" height="156" alt="SCR-20260228-ogwt" src="https://github.com/user-attachments/assets/d300dcd1-28b6-450a-ad80-61145fdf5dd5" /><br />
<img width="427" height="455" alt="SCR-20260228-plnq" src="https://github.com/user-attachments/assets/d5da3ad2-89c6-45df-8c12-410e481f6f46" />


## Explanation
**Total Power** is the sum of Power usage from T1 and T2 (peak and off-peak rate) <br />
**Current Power** is the current Power usage (Watt) <br />
**Total Feedback** is the Total Feedback to the grid today (kWH) <br />
**Voltage** is the current 3-phase Voltage usage (V) with autodetection if it is only 1-phase </br>
**Total Gas** is the total of Gas usage (m³) <br />
**Current Water** is the current Water usage (Liters per minute) <br />
**Total Water** is the total Water usage (m³) <br />
**Power Failures** are the number of power failures detected by the P1 meter <br />
**WiFi P1 / Water meter** is the current WiFi Strenght

## Module configuration
Here is the documentation of options for the modules configuration

| Option                | Description
|:----------------------|:-------------
| `P1_IP`            	| **REQUIRED if use P1 meter** <br /> The IP Address of your HomeWizard P1 meter <br /><br />**Number** <br />Default: `0.0.0.0`
| `WM_IP`           	| **REQUIRED if use Water meter** <br />The IP Address of your HomeWizard Water meter <br /><br />**Number** <br />Default: `0.0.0.0`</br></br>If you don't have a Water Meter, remove this line! or you get an error "Water Meter offline"
| `updateInterval`		| **REQUIRED** - The interval the information is updated (in milliseconds)<br /><br />**Number** <br/>Default: `5000`
| `extraInfo`			| Show extra information from P1 meter<br /><br />**True/False**<br />Default: `true`
| `currentPower`		| Show the current power consumption<br /><br />**True/False**<br />Default: `true`
| `currentWater`		| Show the current water consumption<br /><br />**True/False**<br />Default: `false`
| `currentVoltage`		| Show the current 3-phase consumption<br /><br />**True/False**<br />Default: `true`
| `showGas`				| Show the Gas Option of youre PowerMeter <br /><br />**True/False**<br />Default: `true`
| `showFooter`			| Show the Footer with the name of youre PowerMeter <br /><br />**True/False**<br />Default: `true`
| ` showLastUpdate` 	| Show last update of the "history_data.json" file as footer<br /><br />**True/False**<br />Default: `true`
| ` showDeltaPower` 	| Show Delta between History and Current data (Power)<br /><br />**True/False**<br />Default: `true`
| ` showDeltaGas`   	| Show Delta between History and Current data (Gas)<br /><br />**True/False**<br />Default: `true`
| ` showDeltaWater` 	| Show Delta between History and Current data (Water)<br /><br />**True/False**<br />Default: `false`

## Version
v1.0.0 - 26-11-2024	: Initial version </br>
v1.0.1 - 29-12-2024	: Add option showGas </br>
v2.0.0 - 22-01-2026 : Update with daily saving data to history_data and option for show Deltas </br>
v2.0.1 - 28-02-2026 : Add option currentVoltage for 3-phase usage

## License
### The MIT License (MIT)

Copyright © 2024 Harm Tilburgs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

The software is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
