const sleep = require('es6-sleep').promise;
var test = require('ava');
var config = require('./hubController-testConfig');

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

test.serial('SupportedHubs', async t => {
    var supportedHubs = await hubController.supportedHubs();
    console.log("*******************");
    console.log(JSON.stringify(supportedHubs, null, 2));
    console.log("*******************");
    t.truthy(supportedHubs);
    t.is(supportedHubs instanceof Array, true);
    t.is(supportedHubs.length > 0, true);
});

test.serial('GetPlatforms', async t => {
    var platforms = await hubController.platforms(config.hubId, authInfo);
    t.truthy(platforms);
    t.is(platforms.platforms.length > 0, true);
});

test.serial('getPlatform', async t => {
    var platform = await hubController.getPlatform(config.hubId, authInfo, config.getPlatform.opent2tBlob);
    t.truthy(platform);
    t.truthy(platform.entities);
    t.truthy(platform.entities[0]);
    t.is(platform.entities[0].resources.length > 0, true);
});
