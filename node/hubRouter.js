var express = require('express');
var hubRouter = express.Router();
var config = require("./config");

// given a user and a hub id, returns the mapped object
// should this go into config?
function getUserHubInfo(user, hubId) {
    var userHubInfo = config.userDeviceMapping[user];
    if (!userHubInfo) {
        userHubInfo = { 
            onboardingAnswers: [],
            onboardingOutput: undefined,
            instance: undefined
        };
        config.userDeviceMapping[user] = userHubInfo;
    } 

    return config.userDeviceMapping[user];
}

hubRouter.get("/", function (req, res) {
    res.send('list of hubs');  
});

hubRouter.get("/:hubId/signInForm", function (req, res) {
    console.log(req.params);
    var user = req.userInfo;
    var hubId = req.params.hubId;
    
    var userHubInfo = getUserHubInfo(user, hubId);

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

    console.log(postData);

    res.send(postData);
});

hubRouter.get("/:hubId/onboarding", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var onboardingToLoad = config.hubs[hubId].onboarding;
    var onboarding = require(onboardingToLoad);

    var userHubInfo = getUserHubInfo(user, hubId);

    if (userHubInfo.onboardingOutput != undefined) {
        console.log("Already onboarded!");
        res.status(200).send("Already onboarded!");
        return;
    }

    console.log("answers length: " + userHubInfo.onboardingAnswers.length);

    if (userHubInfo.onboardingAnswers.length == onboarding.onboardingFlow.length) {
        console.log("all input for onboarding ready!");

        doOnboarding(onboarding, userHubInfo.onboardingAnswers, user, hubId, res);
    }
    else {
        var index = userHubInfo.onboardingAnswers.length;
        var element = onboarding.onboardingFlow[index];

        if (element.action == 'get-developer-input')
        {
            console.log("------------------ get-developer-input");
            console.log(element.inputNeeded);
            console.log(element.inputNeeded.length);
            userHubInfo.onboardingAnswers[index] = {  };
            for (var j = 0; j < element.inputNeeded.length; j++) {
                var innerElement = element.inputNeeded[j];

                userHubInfo.onboardingAnswers[index][innerElement.name] = config.hubs[hubId].settings[innerElement.name];
            }

            res.redirect("/hubs/" + hubId + "/onboarding");
        }
        else if (element.action == 'get-user-input')
        {
            res.render('onboarding', { userId: user, inputNeeded: element.inputNeeded });
        }
        else
        {
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

    var userHubInfo = getUserHubInfo(user, hubId);
    console.log("answers length: " + userHubInfo.onboardingAnswers.length);

    var index = userHubInfo.onboardingAnswers.length;
    userHubInfo.onboardingAnswers[index] = req.body; 

    console.log(userHubInfo.onboardingAnswers);

    res.redirect("/hubs/" + hubId + "/onboarding");
});

// called after onboarding has been done, this instatiates the hub
hubRouter.post("/:hubId/connect", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var userHubInfo = getUserHubInfo(user, hubId);
    if (userHubInfo.onboardingOutput == undefined) {
        res.status(500).send("Hub has not been onboarded!");
        return;
    }

    var hubToLoad = config.hubs[hubId].hub;
    var hub = new (require(hubToLoad))();

    hub.initDevice(userHubInfo.onboardingOutput);

    userHubInfo.instance = hub;

    res.status(200).send("200!");
});

// return devices for this specific hub
// todo format return so that its in the correct structure
hubRouter.get("/:hubId/devices", function (req, res) {
    var user = req.userInfo;
    var hubId = req.params.hubId;

    var userHubInfo = getUserHubInfo(user, hubId);
    if (userHubInfo.instance == undefined) {
        res.status(500).send("Hub has not been initialized!");
        return;
    }

    var hub = userHubInfo.instance;
    hub.getDevicesAsync().then(function (data) {
        res.send(data);
    });
});

function doOnboarding(onboarding, answers, user, hubId, res) {
    var userHubInfo = getUserHubInfo(user, hubId);

    // do onboarding
    onboarding.onboard(answers).then(function (data) {
        console.log("Onboarding success!");
        console.log(data);
        userHubInfo.onboardingOutput = data;
        console.log(config);
        
        res.status(200).send("Onboarding success!");
    }, function (data) {
        console.log("Onboarding failed!");
        console.log(data);
        res.status(401).send("Onboarding failed! " + data);
    });
}

module.exports = hubRouter;