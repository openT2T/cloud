/* jshint esversion: 6 */
/* jshint node: true */
'use strict';

var q = require('q');
var hubsConfig = require("./hubsConfig");

class HubController {

    constructor() {
        this.supportedHubsCache = undefined;
        this.OpenT2T = require('opent2t').OpenT2T;
    }

    /** 
     * returns the list of supported hubs 
     */
    supportedHubs(hubs, i) {
        // use cache if we have it
        if (this.supportedHubsCache != undefined) {
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
                return supportedHubs(hubs, i + 1);
            }
        }).catch((err) => {
            this._logError(err, "supportedHubs");
            return [];
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
            this._logError(err, "onboard");
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
                // hug get
                return this._getProperty(hubInstance, authInfo, "getPlatforms", true);
            });
        }).catch((err) => {
            this._logError(err, "platforms");
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
                return this._getProperty(opent2tBlob.translator, deviceInfo, "get", true);
            });
        }).catch((err) => {
            this._logError(err, "getPlatform");
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
            this._logError(err, "setResource");
        });
    }


    /// *********************************
    /// helper methods
    /// *********************************
    _getHubInfo(hubId) {
        console.log("----------------- _getHubInfo");
        return this.supportedHubs().then((hubs) => {
            // find the hub referenced by hubId
            var hubInfo = undefined;
            for (var i = 0; hubInfo == undefined && i < hubs.length; i++) {
                var hub = hubs[i];

                // intentional ==
                if (hub.id == hubId) {
                    hubInfo = hub;
                }
            }

            if (hubInfo == undefined) {
                console.log("invalid hub id");
                throw new Error("Invalid hub id");
            }

            return hubInfo;
        });
    }

    _getProperty(translator, deviceInfo, property, value) {
        console.log("----------------- _getProperty " + property);

        if (typeof translator === "object") {
            return this.OpenT2T.invokeMethodAsync(translator, "", property, [value]);
        } 
        else {
            return this._createTranslator(translator, deviceInfo).then(translatorInstance => {
                return this.OpenT2T.invokeMethodAsync(translatorInstance, "", property, [value]);
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

    _logError(err, message) {
        console.log("------------ ERROR-" + message);
        console.log(err)
        console.log(err.stack);
    }
}

module.exports = HubController;