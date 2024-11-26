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
  config: {
	        updateInterval: 5000      //Update every 5 seconds
          }
},
```
