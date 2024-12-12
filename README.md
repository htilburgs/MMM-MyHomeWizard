# MMM-MyHomeWizard
This a module for [Magic Mirror²](https://github.com/MichMich/MagicMirror) smart mirror project.</br>
This modules is for use with the HomeWizard P1 meter and WaterMeter. 

Currently this module uses the V1 API from HomeWizard.

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
		P1_IP: "0.0.0.0",	// IP Address HomeWizard P1 meter
		WM_IP: "0.0.0.0",	// IP Address HomeWizrd Water meter - Remove when not used
		extraInfo: false, 	// Show extra information from P1 meter
		currentPower: true,	// Show the current Power Consumption
		showFooter: true,	// Show footer (name Power Meter)
		updateInterval: 5000,   // Update every 5 seconds
		maxWidth: "500px"	// Max Module width
          }
},
```
## Images
![image](https://github.com/user-attachments/assets/2404bb70-d6c3-4e97-87d4-85965181edd0)

![image](https://github.com/user-attachments/assets/aa93496c-dab3-46f2-b8a0-09ee3562a377)

## Module configuration
Here is the documentation of options for the modules configuration

| Option                | Description
|:----------------------|:-------------
| `P1_IP`            	| **REQUIRED if use P1 meter** <br /> The IP Address of your HomeWizard P1 meter <br /><br />**Number** <br />Default: `0.0.0.0`
| `WM_IP`           	| **REQUIRED if use Water meter** <br />The IP Address of your HomeWizard Water meter <br /><br />**Number** <br />Default: `0.0.0.0`
| `updateInterval`	| **REQUIRED** - The interval the information is updated (in milliseconds)<br /><br />**Number** <br/>Default: `5000`
| `extraInfo`		| Show extra information from P1 meter<br /><br />**True/False**<br />Default: `false`
| `currentPower`	| Show the current power consumption<br /><br />**True/False**<br />Default: `false`
| `currentWater`	| Show the current water consumption<br /><br />**True/False**<br />Default: `false`
| `showFooter`		| Show the Footer with the name of youre PowerMeter <br /><br />**True/False**<br />Default: `false`
| `maxWidth`		| The maximum width of the module <br /><br />Default: `500px`

## Version
v1.0.0 - 26-11-2024	: Initial version </br>

## License
### The MIT License (MIT)

Copyright © 2024 Harm Tilburgs

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

The software is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.
