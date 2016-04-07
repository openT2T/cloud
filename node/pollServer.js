var opent2t = require("./opent2t");
/**
 * Sample of a server that use polling to execute a set of predefined rules
 * Once the ruleEngine is initialized, it start running a polling loop
 * and execute the rules defined in the rules/ directory. 
 * Rules use APIs available in the thingTranslator file that can be used
 * to retrieve the state of a device. For instance, a Temperature Sensor exposes
 * a method getCurrentTemperature that can be used to retrieve the last 
 * temperature registered by the sensor.
 * 
 */
opent2t.init(process.argv[2], process.argv[3], function(err) {
    if(err)
        console.error(err);
     else {
        console.log("launching ruleEngine ...."); 
        // starts the polling cycle and execute the rules in the rules/ directory
        // polling interval is determined by the 'pollingInterval' value in the config file 
        opent2t.startPolling();
     }
     
});

