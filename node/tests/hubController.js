const sleep = require('es6-sleep').promise;
var test = require('ava');
var config = require('./testConfig');

// console.log("Config:");
// console.log(JSON.stringify(config, null, 2));

var hubControllerPath = require('path').join(__dirname, '..');
var HubController = require("../hubController");
var hubController = new HubController();
var authInfo = undefined;

// setup the translator before all the tests run
test.before(async () => {
    authInfo = await hubController.onboard(config.hubId, config.onboardingInfo);
});

test.serial("Valid Hub Controller", t => {
    t.is(typeof hubController, 'object') && t.truthy(hubController);
});

///
/// Run a series of tests to validate the translator
///

// Set/Get power Value via setters for individual properties
test.serial('SupportedHubs', async t => {

    var supportedHubs = await hubController.supportedHubs()
    t.is(supportedHubs instanceof Array, true);
    t.is(supportedHubs.length > 0, true);
});

test.serial('GetPlatforms', async t => {
    
    var platforms = await hubController.platforms(config.hubId, authInfo);
    t.is(platforms.platforms.length > 0, true);
});

test.serial('getPlatform', async t => {

    var platform = await hubController.getPlatform(config.hubId, authInfo, config.getPlatform.opent2tBlob);
    t.is(platform != undefined, true);
    t.is(platform.entitites.resources.length > 0, true);
});

