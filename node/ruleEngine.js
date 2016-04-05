
var deviceCollections = require('require-dir-all')(__dirname + '/DeviceCollection');
var rules = require('require-dir-all')(__dirname + '/rules');

/**
 * This is super-simple rule engine to show how openT2T can provide a way to abstract
 * device-specific APIs into a common set of methods that can be used to interact 
 * with devices from different manufacturer.
 */
var deviceTranslatorFilename = "thingTranslator";
var devCollection = null;
var devProfiles = null;
var deviceHandlers = null;

function findDeviceProfile(deviceId) {
    return devProfiles.filter(function(obj) {
        return obj.deviceId == deviceId;
    })[0]
}

module.exports = {
    /**
     * the init method is used to build the object hierarchy that is then used in the rules
     * to indentify device and invoke the methods exposed by the thingTranslator schema
     * In the DeviceCollection directory, the method loads the hierarchy of devices defined by 
     * the (for instance) myHome.js file. The name of the device hierarchy is passed into the app via a
     * program paramenter.
     * Along with the device hierarchy, the device profiles file is loaded (it uses the same name postfixed with 'profiles')
     * The device profiles file containers the properties that are used at runtime to establish a connection with the device
     * For instance for a WINK device is is the accessToken and refreshToken. Those properties are passed into the thinkProtocol
     * handler to set the context for the calls (so functions can connect to the WINK cloud service using the correct Auth token)
     * 
     */
    init: function(devColl, devProfileDir) {
        devCollection = deviceCollections[devColl];
        var devProfileFilename = devColl.split(".")[0] + "Profiles";
        devProfiles = deviceCollections[devProfileFilename];
        deviceHandlers = require('require-dir-all')(__dirname + '/' + devProfileDir);
        // attach DeviceProfile and DeviceInit data to devCollection
        // this loop goes through the devices specified in the device hierarchy file
        // and attach the corresponding thingTranslator methods (exposed in the module)
        // to the device object. In this way the user can create rules using the following
        // format: ex. LivingRoom.Light1.device.turnOff()
        for (var coll in devCollection) {
            for (var device in devCollection[coll]) {
                var deviceId = devCollection[coll][device].deviceId;
                var devProfile = findDeviceProfile(deviceId);
                if (devProfile == null) {
                    var err = "Dev Profile is null! -" + deviceId;
                    console.error(err);
                    return err;
                } else {
                    devCollection[coll][device].deviceProfile = Object.assign({},devProfile); //clone the devProfile object
                    var deviceHandler = require('require-dir-all')(__dirname + '/' + devProfileDir + "/" + devProfile.deviceType+ "/js", {
                        includeFiles: /(?!test.js)(^.*\.(js))$/
                    });
                    devCollection[coll][device].device = Object.assign({}, deviceHandler[deviceTranslatorFilename]);
                    //call init to set device object
                    devCollection[coll][device].device.initDevice(devProfile.initDevice);
                }
            }

        }
    },


    startPolling: function(pollInterval) {

        setInterval(this.run,
            pollInterval * 1000
        );

    },

/**
 * processEvent is a method that can be used to execute rules by passing an argument that is received via, for instance 
 * Azure IoTHub, AWS Kinesis or a REST endpoint.
 */
    processEvent: function(event) {
        console.log("entering processEvent");

        // init Context(s)
        for (var obj in rules) {
                rules[obj]["init"](deviceCollections)
            }

            // execute all functions (rules) in the rules file
            for (var obj in rules) {
                for (var m in rules[obj]) {
                    //skip init
                    if(m != "init") {
                        rules[obj][m](event)
                        console.log("Executed Rule:" + obj + ":" + m)
                    }
                }
            }
                
    },

    run: function() {
        console.log("entering run");

        // init Context(s)
        for (var obj in rules) {
                rules[obj]["init"](deviceCollections)
            }

            // execute all functions (rules) in the rules file
            for (var obj in rules) {
                for (var m in rules[obj]) {
                    //skip init
                    if(m != "init") {
                        rules[obj][m]()
                        console.log("Executed Rule:" + obj + ":" + m)
                    }
                }
            }
        }
}