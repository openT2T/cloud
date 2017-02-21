/* jshint esversion: 6 */
/* jshint node: true */
'use strict';

var q = require('q');
var hubsConfig = require("./hubsConfig");
var OpenT2TError = require('opent2t').OpenT2TError;
var OpenT2TConstants = require('opent2t').OpenT2TConstants;

class HubController {

    constructor() {
        this.supportedHubsCache = undefined;
        this.OpenT2T = require('opent2t').OpenT2T;
    }

    /** 
     * returns the list of supported hubs 
     * format is as follows:
     * [
     *   {
     *     id: "hubId",
     *     name: hubName",
     *     translator: "name of hub translator",
     *     onboarding: "name of hub onboarding",
     *     // this is the onboardingFlow object as defined by the hub's manifest.xml'
     *     onboardingFlow: {}
     *   }
     * ]
     */
    supportedHubs(hubs, i) {
        // use cache if we have it
        if (this.supportedHubsCache !== undefined) {
            return q(this.supportedHubsCache);
        }

        // this is a recursive function, setup the initial call with initial values
        if (hubs === undefined) {
            hubs = hubsConfig.hubs;
        }

        if (i == undefined) {
            console.log("----------------- supportedHubs");
            i = 0;
        }

        // load info for the current hub
        var hubInfo = hubs[i];
        console.log("------------------------------");
        console.log("i: " + i);
        
        var LocalPackageSourceClass = require('opent2t/package/LocalPackageSource').LocalPackageSource;
        var localPackageSource = new LocalPackageSourceClass("./node_modules/" + hubInfo.translator);

        return localPackageSource.getAllPackageInfoAsync().then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                console.log("----------------------------- Package Info");
                console.log(tinfo);
                console.log("-----------------------------");

                hubInfo.onboarding = tinfo.onboarding;
                hubInfo.onboardingFlow = tinfo.onboardingFlow;
            }

            // we are done, save as the cache and return
            if (i == hubs.length - 1) {
                this.supportedHubsCache = hubs;
                return this.supportedHubsCache;
            }
            // we are not done, recurse to the next hub
            else {
                return this.supportedHubs(hubs, i + 1);
            }
        }).catch((err) => {
            return this._handleError(err, "supportedHubs");
        });
    }

    /**
     * given a specific hub info, does the onboarding given the onboardingInfo and returns the auth info
     */
    onboard(hubId, onboardingInfo) {
        console.log("----------------- onboard");
        return this._getHubInfo(hubId).then((hubInfo) => {
            // do the onboarding and return token
            var Onboarding = require(hubInfo.onboarding);
            var onboarding = new Onboarding();
            return onboarding.onboard(onboardingInfo);
        }).catch((err) => {
            return this._handleError(err, "onboard");
        });
    }

    /**
     * Given a specific hub info, onboardingInfo, and existing authInfo blob,
     *  does the OAuthToken refresh, and returns the refreshed
     * auth info object back.
     */
    refreshAuthToken(hubId, onboardingInfo, existingAuthInfo){
        console.log("----------------- refreshAuthToken");

        return this._getHubInfo(hubId).then((hubInfo) => {

            // create hub translator for given hubId
            return this._createTranslator(hubInfo.translator, existingAuthInfo).then((hubInstance) => {
                
                // hub refreshAuthToken
                return this._invokeMethod(hubInstance, "", "refreshAuthToken", [onboardingInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "refreshAuthToken");
        });
    }

    /**
     * given the specific hub id, returns all the platforms which are connected to it
     */
    platforms(hubId, authInfo) {
        console.log("----------------- platforms");
        // will return hub getPlatform contents
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {
                // hub get
                return this._invokeMethod(hubInstance, authInfo, "getPlatforms", [true]);
            });
        }).catch((err) => {
            return this._handleError(err, "platforms");
        });
    }

    /**
     * given the specific hub id and opent2tblob, returns the specific platform
     */
    getPlatform(hubId, authInfo, opent2tBlob) {
        console.log("----------------- getPlatform");
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {
                // platform get
                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;
                return this._invokeMethod(opent2tBlob.translator, deviceInfo, "get", [true]);
            });
        }).catch((err) => {
           return this._handleError(err, "getPlatform");
        });
    }

    /**
     * given the specific hub id, opent2tblob, and resourceId, sets it with the given resourceBlob
     */
    setResource(hubId, authInfo, opent2tBlob, deviceId, resoureceId, resourceBlob) {
        console.log("----------------- setResource");
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {
                // resource set
                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;

                var propertyName = "postDevices" + this._capitalizeFirstLetter(resoureceId);

                return this._setProperty(opent2tBlob.translator, deviceInfo, propertyName, deviceId, resourceBlob);
            });
        }).catch((err) => {
            return this._handleError(err, "setResource");
        });
    }

    /**
     * Subscribe for notifications on all resources composing a platform.  Notifications will be posted to to
     * the subscriptionInfo.callbackURL.
     */
    subscribePlatform(hubId, authInfo, opent2tBlob, subscriptionInfo) {
        console.log("----------------- subscribePlatform");
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {

                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob; 

                return this._createTranslator(opent2tBlob.translator, deviceInfo).then(translator => {
                    return this.OpenT2T.invokeMethodAsync(translator, "", "postSubscribe", [subscriptionInfo]);
                });
            });
        }).catch((err) => {
            return this._handleError(err, "subscribePlatform");
        });
    }

    /** 
     * Unsubscribe notification on all resources from a platform.
     */
    unsubscribePlatform(hubId, authInfo, opent2tBlob, subscriptionInfo) {
        console.log("----------------- unsubscribePlatform");
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {

                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob; 

                return this._createTranslator(opent2tBlob.translator, deviceInfo).then(translator => {
                    return this.OpenT2T.invokeMethodAsync(translator, "", "deleteSubscribe", [subscriptionInfo]);
                });
            });
        }).catch((err) => {
            return this._handleError(err, "unsubscribePlatform");
        });
    }
    
    /**
     * Verification step for cloud notifications for providers that require it.
     */
    subscribeVerify(hubId, authInfo, verificationBlob) {
        console.log("----------------- subscribeVerify");
        return this._getHubInfo(hubId).then((hubInfo) => {
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {

                var subscriptionInfo = {};
                subscriptionInfo.verificationRequest = verificationBlob;

                return this.OpenT2T.invokeMethodAsync(hubInstance, "", "postSubscribe", [subscriptionInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "subscribePlatformVerify");
        });
    }

    /**
     * Translate a JSON blob from a provider into an opent2t/OCF schema.  This should be called with the contents of
     * the notification post backs.  Verification is an optional object providing a secret and a hash for verification of the payload.
     * Returns an array of translated platforms, even for a single item (size 1 obviously)
     * 
     * @param {Object} verificationInfo
     * @param {string} verificationInfo.key - Secret key used to compute HMAC
     * @param {Object} verificationInfo.header - Headers from the notification which will contain a provider specific HMAC.
     */
    translatePlatforms(hubId, authInfo, providerBlob, verificationInfo) {
        console.log("----------------- translatePlatforms");
        
        // Create a hub, of the requested type.
        return this._getHubInfo(hubId).then((hubInfo) => {
            // Pass the provider blob off to the hub for translation.
            return this._createTranslator(hubInfo.translator, authInfo).then((hubInstance) => {
                // The getPlatforms method on the hub can take either single providerSchema, or a list depending
                // on the service that provided the notification.  It's up the the hub to know what to do with the data.
                return this.OpenT2T.invokeMethodAsync(hubInstance, "", "getPlatforms", [true, providerBlob, verificationInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "translatePlatforms");
        });
    }

    /**
     * helper methods
     */
    _getHubInfo(hubId) {
        console.log("----------------- _getHubInfo");
        return this.supportedHubs().then((hubs) => {
            // find the hub referenced by hubId
            var hubInfo = undefined;
            for (var i = 0; hubInfo === undefined && i < hubs.length; i++) {
                var hub = hubs[i];

                // intentional ==
                if (hub.id == hubId) {
                    hubInfo = hub;
                }
            }

            if (!hubInfo) {
                console.log("invalid hub id");
                throw new OpenT2TError(404, OpenT2TConstants.InvalidHubId);
            }

            return hubInfo;
        });
    }

    _invokeMethod(translator, deviceInfo, methodName, params) {
        console.log("----------------- _invokeMethod " + methodName + " with params "+ JSON.stringify(params));

        if (typeof translator === "object") {
            return this.OpenT2T.invokeMethodAsync(translator, "", methodName, params);
        } 
        else {
            return this._createTranslator(translator, deviceInfo).then(translatorInstance => {
                return this.OpenT2T.invokeMethodAsync(translatorInstance, "", methodName, params);
            });
        }
    }
    
    _setProperty(translatorName, deviceInfo, property, deviceId, value) {
        console.log("----------------- _setProperty " + translatorName + " for " + property + " to:");
        console.log(JSON.stringify(value, null, 2));

        return this._createTranslator(translatorName, deviceInfo).then(translator => {
            return this.OpenT2T.invokeMethodAsync(translator, "", property, [deviceId, value]);
        });
    }
    
    _capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    _createTranslator(translatorName, deviceInfo) {
        console.log("----------------- _createTranslator " + translatorName);
        return this.OpenT2T.createTranslatorAsync(translatorName, deviceInfo).then( translator => {
            return translator;
        }); 
    }

    _handleError(err, message) {
        let customMessage = "OpenT2T call failed in: " + message + "; Original message: "; 
        
        // This was a result of a failed HTTP Request promise
        // Can also check err.Name
        if ('response' in err && 'statusMessage' in err.response) {
            customMessage = customMessage + err.response.statusMessage;
        }   
        else {
            // Likely an simple Error-derived class 
            customMessage = customMessage + err.message;
        }

        let customError = new OpenT2TError(err.statusCode, customMessage, err);
        console.log(" custom error message:           " + customError.message);
        console.log(" custom error name:           " + customError.name);
        console.log(" custom error statusCode:           " + customError.statusCode);
        console.log(" custom error innerError message:           " +  customError.innerError.message);
        console.log(" custom error innerError stack:           " +  customError.innerError.stack);

        return q.reject(customError);
    }
}

module.exports = HubController;