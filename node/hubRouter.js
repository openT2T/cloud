var q = require('q');
var express = require('express');
var hubRouter = express.Router();
var config = require("./config");
var OpenT2T = require("opent2t").OpenT2T;

// **** THIS IS FOR TESTING PURPOSES ONLY, SHOULD BE HANDLED BY OPENT2T LIBRARY
var translatorPath = require('path').join(__dirname, '..', 'temp', 'translators', 'org.opent2t.sample.thermostat.superpopular', 'com.wink.thermostat', 'js');

hubRouter.get("/", function (req, res) {
    res.send(config.hubs);  
});

// this renders the sign in form for the given hub id
// this is currently just for apiary sync, onboarding is a superset of this
hubRouter.get("/:hubId/signInForm", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;
    
    //res.render(config.hubs[hubId].render, { userId: user });
    res.status(200).send("use /onboarding");
});

// this does nothing at the moment
hubRouter.post("/:hubId/signInForm", function (req, res) {
    console.log(req.body);
    var hubId = req.params.hubId;

    res.send("not implemented");
});

// this is the main entry point for onboarding
// 
hubRouter.get("/:hubId/onboarding", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var onboardingToLoad = config.hubs[hubId].onboarding;
    var onboarding = require(onboardingToLoad);

    var userHubDevice = config.getUserHubDevice(user, hubId);

    if (userHubDevice.onboardingOutput != undefined) {
        console.log("Already onboarded!");
        res.status(200).send("Already onboarded!");
        return;
    }

    console.log("answers length: " + userHubDevice.onboardingAnswers.length);

    // if we have the answers to everything, we're done and we can start onboarding
    if (userHubDevice.onboardingAnswers.length == onboarding.onboardingFlow.length) {
        console.log("all input for onboarding ready!");

        doOnboarding(onboarding, userHubDevice.onboardingAnswers, user, hubId, res);
    }
    else {
        var index = userHubDevice.onboardingAnswers.length;
        var element = onboarding.onboardingFlow[index];

        if (element.action == 'get-developer-input') {
            console.log("------------------ get-developer-input");
            console.log(element.inputNeeded);
            userHubDevice.onboardingAnswers[index] = {  };
            for (var j = 0; j < element.inputNeeded.length; j++) {
                var innerElement = element.inputNeeded[j];

                userHubDevice.onboardingAnswers[index][innerElement.name] = config.hubs[hubId].settings[innerElement.name];
            }

            res.redirect("/hubs/" + hubId + "/onboarding");
        }
        else if (element.action == 'get-user-input') {
            // render the form for the user based on what this specific hub needs
            res.render('onboarding', { userId: user, inputNeeded: element.inputNeeded });
        }
        else if (element.action == 'ask-permission') {
            // route to the appropriate redirect for user to accept permission
            var route = config.hubs[hubId].auth_uri + user;
            console.log("redirect to: " + route);
            res.redirect(route);
        }
        else {
            res.send("todo: " + element.action);
        }
    }
});

// this handles getting data from the user on the sign in form
hubRouter.post("/:hubId/onboarding", function (req, res) {
    console.log(req.body);
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var onboardingToLoad = config.hubs[hubId].onboarding;
    var onboarding = require(onboardingToLoad);

    var userHubDevice = config.getUserHubDevice(user, hubId);
    console.log("answers length: " + userHubDevice.onboardingAnswers.length);

    // store the answer to in the correct index
    var index = userHubDevice.onboardingAnswers.length;
    userHubDevice.onboardingAnswers[index] = req.body; 

    console.log(userHubDevice.onboardingAnswers);

    // let the main onboarding flow figure out next stpes
    res.redirect("/hubs/" + hubId + "/onboarding");
});

// called after onboarding has been done, this instatiates the hub
// currently does not need to be called, automatically called 
// at the end of onboarding
hubRouter.post("/:hubId/connect", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    res.status(200).send("use /onboarding");
});

// return devices for this specific hub
hubRouter.get("/:hubId/devices", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var userHubDevice = config.getUserHubDevice(user, hubId);
    if (userHubDevice.translator == undefined) {
        res.status(500).send("Hub has not been initialized!");
        return;
    }

    console.log(userHubDevice);

    var converted = config.convertInternalDeviceArrayToClientArray(userHubDevice.devices);
    res.send(converted);

});

// given a device from hub.getDevices, this creates translators for it
// todo this is the old translator constructor input, device types may get different ones
// todo the devices passed back from getDevices needs to be normalized, especially for id/name
function createOpent2tDevice(user, device, hubId) {
    console.log("------------------------------ createOpent2tDevice"); 
    var userHubDevice = config.getUserHubDevice(user, hubId);
    var d = {
            "name" : device.name,
            "props": {
                "id": device.id,
                "access_token": userHubDevice.translator._accessToken.accessToken
            }
    }; 

    return OpenT2T.createTranslatorAsync(translatorPath, 'thingTranslator', d).then(translator => {
        // save the internal device to cache
        var internalDevice = config.addUserDeviceToDevice(user, device, hubId);
        // save the translator in our internal device
        internalDevice.translator = translator;
        // console.log("****************************************************");
        // console.log(internalDevice);
        // console.log("****************************************************");
        return "";
    }).catch(e => {
        console.log(e)
        return e;
    });

}

// return devices for this specific hub
hubRouter.get("/:hubId/devices/:deviceId", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;
    var deviceId = req.params.deviceId;

    var userHubDevice = config.getUserHubDevice(user, hubId);
    if (userHubDevice.translator == undefined) {
        res.status(500).send("Hub has not been initialized!");
        return;
    }

    var device = config.getUserChildDevice(user, deviceId, hubId);
    var converted = config.convertInternalDeviceToClientDevice(device);

    // todo convert this to opent2t official library methods
    var schema = getSchemaFromDevice(device.actualDevice);
    var getUri = getGetUriFromSchema(schema);

    // invoke the translator to get information
    OpenT2T.invokeMethodAsync(device.translator, schema, getUri, []).then((response) => {
        converted.state = response;
        console.log(converted);
        res.send(converted);
    });
});

// this sets the passed in info to the given translator
hubRouter.post("/:hubId/devices/:deviceId", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;
    var deviceId = req.params.deviceId;

    var userHubDevice = config.getUserHubDevice(user, hubId);
    if (userHubDevice.translator == undefined) {
        res.status(500).send("Hub has not been initialized!");
        return;
    }

    if (!req.body) {
        res.status(400).send("Value is not valid");
    }

    var value = req.body;

    var device = config.getUserChildDevice(user, deviceId, hubId);
    var converted = config.convertInternalDeviceToClientDevice(device);

    // todo convert this to opent2t official library methods
    var schema = getSchemaFromDevice(device.actualDevice);
    var postUri = getPostUriFromSchema(schema);

    // invoke the translator to set information
    OpenT2T.invokeMethodAsync(device.translator, schema, postUri, [value]).then((response) => {
            // after successful call, return the latest state to the user
            converted.state = response;
            console.log(converted);
            res.send(converted);
        }); 

});

// handles the nest auth redirect
// this has not been validated end to end
hubRouter.get("/nest/auth_redirect", function (req, res) {
    console.log(req.query);
    var user = req.query.state;
    var nestCode = req.query.code;

    // todo fix nest hubId hardcoding to hub2
    var hubId = "hub2";

    var userHubDevice = config.getUserHubDevice(user, hubId);
    console.log("answers length: " + userHubDevice.onboardingAnswers.length);

    // store the answer to in the correct index
    var index = userHubDevice.onboardingAnswers.length;
    userHubDevice.onboardingAnswers[index] = nestCode; 

    console.log(userHubDevice.onboardingAnswers);

    // let the main onboarding flow figure out next stpes
    res.redirect("/hubs/" + hubId + "/onboarding");
}); 

// does the actual onboarding
// async method
function doOnboarding(onboarding, answers, user, hubId, res) {
    var userHubDevice = config.getUserHubDevice(user, hubId);

    // do onboarding with the answers user and app provided
    onboarding.onboard(answers).then(function (data) {
        console.log("Onboarding success!");
        console.log(data);
        userHubDevice.onboardingOutput = data;
        console.log(config);
        
        // initialize the hub
        initHub(user, hubId, res);

        initDevices(userHubDevice, user, hubId).then(function () {
            res.status(200).send("Onboarding success!");
        });

    }, function (data) {
        console.log("Onboarding failed!");
        console.log(data);
        res.status(401).send("Onboarding failed! " + data);
    });
}

// this instantiates the hub devices with the output from onboarding
function initHub(user, hubId, res) {
    var userHubDevice = config.getUserHubDevice(user, hubId);
    if (userHubDevice.onboardingOutput == undefined) {
        res.status(500).send("Hub has not been onboarded!");
        return;
    }

    if (userHubDevice.translator != undefined) {
        console.log("already instatiated hub");
        return;
    }

    // todo load this from the official opent2t library
    var hubToLoad = config.hubs[hubId].hub;
    var hubTranslator = new (require(hubToLoad))();

    hubTranslator.initDevice(userHubDevice.onboardingOutput);

    // store the translator in the internal device
    userHubDevice.translator = hubTranslator;
}

// this instantiates the devices for a given hub
function initDevices(userHubDevice, user, hubId) {
    if (userHubDevice.devices == undefined || userHubDevice.devices.length == 0) {
        var hub = userHubDevice.translator;
        return hub.getDevicesAsync().then(function (data) {

            var promises = [];

            // this for loop with the nested then doesn't work            
            for (var i = 0; i < data.length; i++) {
                var device = data[i];

                if (!!device.thermostat_id) {
                    // create the opent2t devices based on the output of getDevices
                    var p = createOpent2tDevice(user, device, hubId);
                    promises.push(p);
                }
            }

            // wait for all devices to initialize
            return q.all(promises).done(function () {
                return;
            });
        });
    }
}

// todo switch to using opent2t ThingSchema
function getSchemaFromDevice(device) {

    if (device.thermostat_id != undefined) {
        return 'org.opent2t.sample.thermostat.superpopular';
    }
    
    return undefined;
}

// todo switch to using opent2t ThingSchema
function getGetUriFromSchema(schema) {
    if (schema == 'org.opent2t.sample.thermostat.superpopular') {
        return 'getThermostatResURI';
    }

    return undefined;
}

// todo switch to using opent2t ThingSchema
function getPostUriFromSchema(schema) {
    if (schema == 'org.opent2t.sample.thermostat.superpopular') {
        return 'postThermostatResURI';
    }

    return undefined;
}


module.exports = hubRouter;