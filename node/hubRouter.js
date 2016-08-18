var express = require('express');
var hubRouter = express.Router();
var config = require("./config");

hubRouter.get("/", function (req, res) {
    res.send(config.hubs);  
});

hubRouter.get("/:hubId/signInForm", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;
    
    res.render(config.hubs[hubId].render, { userId: user });
});

hubRouter.post("/:hubId/signInForm", function (req, res) {
    console.log(req.body);
    var hubId = req.params.hubId;

    var postData = JSON.stringify({
        'client_id': config.hubs[hubId].settings.client_id,
        'client_secret': config.hubs[hubId].settings.client_secret,
        'username': req.body.user.email,
        'password': req.body.user.password,
        'grant_type': 'password'
    });

    res.send(postData);
});

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
            console.log(element.inputNeeded.length);
            userHubDevice.onboardingAnswers[index] = {  };
            for (var j = 0; j < element.inputNeeded.length; j++) {
                var innerElement = element.inputNeeded[j];

                userHubDevice.onboardingAnswers[index][innerElement.name] = config.hubs[hubId].settings[innerElement.name];
            }

            res.redirect("/hubs/" + hubId + "/onboarding");
        }
        else if (element.action == 'get-user-input') {
            res.render('onboarding', { userId: user, inputNeeded: element.inputNeeded });
        }
        else if (element.action == 'ask-permission') {
            var route = config.hubs[hubId].auth_uri + user;
            console.log("redirect to: " + route);
            res.redirect(route);
            //res.send("todo2: " + element.action);

        }
        else {
            res.send("todo: " + element.action);
        }
    }
});

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

    initHub(user, hubId, res);

    res.status(200).send("200!");
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

    if (userHubDevice.devices == undefined || userHubDevice.devices.length == 0) {
        var hub = userHubDevice.translator;
        hub.getDevicesAsync().then(function (data) {
            data.forEach(function (device) {
                config.addUserDeviceToDevice(user, device, hubId);
            });

            res.send(userHubDevice.devices);
        });
    }
    else {
        res.send(userHubDevice.devices);
    }

});

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
    console.log("device");
    console.log(device);
    res.send(device);

});

hubRouter.get("/nest/auth_redirect", function (req, res) {
    console.log(req.query);
    var user = req.query.state;
    var nestCode = req.query.code;

    res.status(200).send("thanks!");
}); 

function doOnboarding(onboarding, answers, user, hubId, res) {
    var userHubDevice = config.getUserHubDevice(user, hubId);

    // do onboarding
    onboarding.onboard(answers).then(function (data) {
        console.log("Onboarding success!");
        console.log(data);
        userHubDevice.onboardingOutput = data;
        console.log(config);
        
        initHub(user, hubId, res);

        res.status(200).send("Onboarding success!");
    }, function (data) {
        console.log("Onboarding failed!");
        console.log(data);
        res.status(401).send("Onboarding failed! " + data);
    });
}

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

    var hubToLoad = config.hubs[hubId].hub;
    var hubTranslator = new (require(hubToLoad))();

    hubTranslator.initDevice(userHubDevice.onboardingOutput);

    userHubDevice.translator = hubTranslator;

}

module.exports = hubRouter;