const sleep = require('es6-sleep').promise;
var test = require('ava');
var config = require('./hubController-testConfig');

// Separate out authorization info to avoid accidentally commiting passwords and keys
// File must contain onboarding info for the hub:
// {
//     "onboardingInfo" : [
//         { 
//             "username": "...",
//             "password": "..."
//         },
//         {
//             "client_id": "...",
//             "client_secret": "..."
//         }
//     ]
// }
var onboardingConfig = require('./hubController-testConfig-auth.json');

var HubController = require("../hubController");
var hubController = new HubController();
var authInfo = undefined;

// setup the translator before all the tests run
test.before(async () => {
    authInfo = await hubController.onboard(config.hubId, onboardingConfig.onboardingInfo);
});

test.serial("Valid Hub Controller", t => {
    t.is(typeof hubController, 'object') && t.truthy(hubController);
});

///
/// Run a series of tests to validate the translator
///

test.serial("RefreshAuthToken returns a valid non-error response", async t => {
    var refreshedAuthInfo = await hubController.refreshAuthToken(config.hubId, onboardingConfig.onboardingInfo, authInfo);
    console.log("********New Auth Info***********");
    console.log(JSON.stringify(refreshedAuthInfo));
    console.log("*******************");
    t.truthy(refreshedAuthInfo);
    t.not(refreshedAuthInfo.accessToken, authInfo.accessToken, "refreshAuthToken failed to update auth token"); 
});

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
    console.log(JSON.stringify(platforms, null, 2));
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

test.serial('subscribePlatform', async t => {
    // Subscribe the the platform specified in the test config
    var subscription = await hubController.subscribePlatform(config.hubId, authInfo, config.getPlatform.opent2tBlob, config.callbackUrl);
    console.log(JSON.stringify(subscription, null, 2));
    t.truthy(subscription);
    t.truthy(subscription.expiration);
});

test.serial('subscribePlatformVerify', async t => {
    // Verify PubSubHubbub (Wink) style subscription verification.
    var verificationRequest = {};
    verificationRequest.url = "http://contoso.com:8000?hub.topic=" + config.subscription.topic +
        "&hub.challenge=" + config.subscription.challenge + 
        "&hub.lease_seconds=" + config.subscription.expiration +
        "&hub.mode=subscribe";
    
    var subscription = await hubController.subscribePlatformVerify(config.hubId, authInfo, config.getPlatform.opent2tBlob, verificationRequest);
    console.log(JSON.stringify(subscription, null, 2));
    t.truthy(subscription);
    t.is(subscription.response, config.subscription.challenge);
    t.is(subscription.expiration, config.subscription.expiration);
});

test.serial('translatePlatforms', async t => {
    var translatedFeed = await hubController.translatePlatforms(config.hubId, authInfo, config.subscription.sampleFeed);
    console.log(JSON.stringify(translatedFeed, null, 2));
    t.truthy(translatedFeed);
    t.truthy(translatedFeed.platforms);    
    t.truthy(translatedFeed.platforms[0]);
    t.truthy(translatedFeed.platforms[0].entities);
    t.truthy(translatedFeed.platforms[0].entities[0]);
    t.is(translatedFeed.platforms[0].entities[0].resources.length > 0, true);
});
