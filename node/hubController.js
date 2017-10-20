/* jshint esversion: 6 */
/* jshint node: true */
'use strict';

var q = require('q');
var HubsConfig = require("./hubsConfig");
var OpenT2TError = require('opent2t').OpenT2TError;
var OpenT2TConstants = require('opent2t').OpenT2TConstants;
var OpenT2T = require('opent2t').OpenT2T;

class HubController {

    constructor() {
        this.supportedHubsCache = undefined;
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
    supportedHubs(logger, hubs, i) {
        // use cache if we have it
        if (this.supportedHubsCache !== undefined) {
            return q(this.supportedHubsCache);
        }

        // this is a recursive function, setup the initial call with initial values
        if (hubs === undefined) {
            hubs = HubsConfig.hubs;
        }

        if (i === undefined) {
            logger.verbose("supportedHubs()");
            i = 0;
        }

        // load info for the current hub
        var hubInfo = hubs[i];
        logger.verbose("i: " + i);
        var LocalPackageSourceClass = require('opent2t/package/LocalPackageSource').LocalPackageSource;
        var localPackageSource = new LocalPackageSourceClass("./node_modules/" + hubInfo.translator);

        return localPackageSource.getAllPackageInfoAsync().then((packages) => {

            // default use the first package
            var p = packages[0];
            if (p.translators.length > 0) {

                var tinfo = p.translators[0];
                logger.verbose("Package info: ", tinfo);
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
                return this.supportedHubs(logger, hubs, i + 1);
            }
        }).catch((err) => {
            return this._handleError(err, "supportedHubs", logger);
        });
    }

    /**
     * given a specific hub info, does the onboarding given the onboardingInfo and returns the auth info
     */
    onboard(hubId, onboardingInfo, logger, flightInfo) {
        logger.verbose("onboard()");

        if (onboardingInfo) {
            onboardingInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            // do the onboarding and return token
            var Onboarding = require(hubInfo.onboarding);
            var onboarding = new Onboarding(logger);
            return onboarding.onboard(onboardingInfo);
        }).catch((err) => {
            return this._handleError(err, "onboard", logger);
        });
    }

    /**
     * Given a specific hub info, onboardingInfo, and existing authInfo blob,
     *  does the OAuthToken refresh, and returns the refreshed
     * auth info object back.
     */
    refreshAuthToken(hubId, onboardingInfo, existingAuthInfo, logger, flightInfo) {
        logger.verbose("refreshAuthToken()");
        let opent2t = new OpenT2T(logger);

        if (onboardingInfo) {
            onboardingInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {

            // create hub translator for given hubId
            return this._createTranslator(opent2t, hubInfo.translator, existingAuthInfo).then((hubInstance) => {

                // hub refreshAuthToken
                return this._invokeMethod(opent2t, hubInstance, "", "refreshAuthToken", [onboardingInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "refreshAuthToken", logger);
        });
    }

    /**
     * Given a specific hub info, onboardingInfo, and existing authInfo blob,
     * deauthorize the OAuthToken.
     */
    deauthorizeToken(hubId, onboardingInfo, existingAuthInfo, logger, flightInfo){
        logger.verbose("deauthorizeToken()");

        if (onboardingInfo) {
            onboardingInfo.flights = _getFlights(flightInfo);
        }

        let opent2t = new OpenT2T(logger);
        return this._getHubInfo(hubId, logger).then((hubInfo) => {

            // create hub translator for given hubId
            return this._createTranslator(opent2t, hubInfo.translator, existingAuthInfo).then((hubInstance) => {
                
                // hub deauthorizeToken
                return this._invokeMethod(opent2t, hubInstance, "", "deauthorizeToken", [onboardingInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "deauthorizeToken", logger);
        });
    }

    /**
     * given the specific hub id, returns all the platforms which are connected to it
     */
    platforms(hubId, authInfo, logger, flightInfo) {
        logger.verbose("platforms()");

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        // will return hub getPlatform contents
        let opent2t = new OpenT2T(logger);
        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {
                // hub get
                return this._invokeMethod(opent2t, hubInstance, authInfo, "getPlatforms", [true]);
            });
        }).catch((err) => {
            return this._handleError(err, "platforms", logger);
        });
    }

    /**
     * given the specific hub id and opent2tblob, returns the specific platform
     */
    getPlatform(hubId, authInfo, opent2tBlob, logger, flightInfo) {
        logger.verbose("getPlatform()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {
                // platform get
                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;
                return this._invokeMethod(opent2t, opent2tBlob.translator, deviceInfo, "get", [true]);
            });
        }).catch((err) => {
            return this._handleError(err, "getPlatform", logger);
        });
    }

    /**
     * given the specific hub id, opent2tblob, and resourceId, sets it with the given resourceBlob
     */
    setResource(hubId, authInfo, opent2tBlob, deviceId, resoureceId, resourceBlob, logger, flightInfo) {
        logger.verbose("setResource()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {
                // resource set
                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;

                var propertyName = "postDevices" + this._capitalizeFirstLetter(resoureceId);

                return this._setProperty(opent2t, opent2tBlob.translator, deviceInfo, propertyName, deviceId, resourceBlob);
            });
        }).catch((err) => {
            return this._handleError(err, "setResource", logger);
        });
    }

    /**
     * Subscribe to notifications for device graph updates (add/remove devices from a provider)
     */
    subscribeDeviceGraph(hubId, authInfo, subscriptionInfo, logger, flightInfo) {
        logger.verbose("subscribeDeviceGraph()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {
                return hubInstance.postSubscribe(subscriptionInfo);
            });
        });
    }

    /**
     * Subscribe for notifications on all resources composing a platform.  Notifications will be posted to to
     * the subscriptionInfo.callbackURL.
     */
    subscribePlatform(hubId, authInfo, opent2tBlob, subscriptionInfo, logger, flightInfo) {
        logger.verbose("subscribePlatform()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {

                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;

                return this._createTranslator(opent2t, opent2tBlob.translator, deviceInfo).then(translator => {
                    return opent2t.invokeMethodAsync(translator, "", "postSubscribe", [subscriptionInfo]);
                });
            });
        }).catch((err) => {
            return this._handleError(err, "subscribePlatform", logger);
        });
    }

    /** 
     * Unsubscribe notification on all resources from a platform.
     */
    unsubscribePlatform(hubId, authInfo, opent2tBlob, subscriptionInfo, logger, flightInfo) {
        logger.verbose("unsubscribePlatform()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {

                var deviceInfo = {};
                deviceInfo.hub = hubInstance;
                deviceInfo.deviceInfo = {};
                deviceInfo.deviceInfo.opent2t = opent2tBlob;

                return this._createTranslator(opent2t, opent2tBlob.translator, deviceInfo).then(translator => {
                    return opent2t.invokeMethodAsync(translator, "", "deleteSubscribe", [subscriptionInfo]);
                });
            });
        }).catch((err) => {
            return this._handleError(err, "unsubscribePlatform", logger);
        });
    }

    /**
     * Verification step for cloud notifications for providers that require it.
     */
    subscribeVerify(hubId, authInfo, verificationBlob, logger, flightInfo) {
        logger.verbose("subscribeVerify()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {

                var subscriptionInfo = {};
                subscriptionInfo.verificationRequest = verificationBlob;

                return opent2t.invokeMethodAsync(hubInstance, "", "postSubscribe", [subscriptionInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "subscribePlatformVerify", logger);
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
    translatePlatforms(hubId, authInfo, providerBlob, verificationInfo, logger, flightInfo) {
        logger.verbose("translatePlatforms()");
        let opent2t = new OpenT2T(logger);

        if (authInfo) {
            authInfo.flights = _getFlights(flightInfo);
        }

        // Create a hub, of the requested type.
        return this._getHubInfo(hubId, logger).then((hubInfo) => {
            // Pass the provider blob off to the hub for translation.
            return this._createTranslator(opent2t, hubInfo.translator, authInfo).then((hubInstance) => {
                // The getPlatforms method on the hub can take either single providerSchema, or a list depending
                // on the service that provided the notification.  It's up the the hub to know what to do with the data.
                return opent2t.invokeMethodAsync(hubInstance, "", "getPlatforms", [true, providerBlob, verificationInfo]);
            });
        }).catch((err) => {
            return this._handleError(err, "translatePlatforms", logger);
        });
    }

    /**
     * helper methods
     */

    /**
     * Returns an array of flights or null
     * expected input is string: "flight1,flight2"
     */
    _getFlights(flightInfo) {
        return (flightInfo === undefined || flightInfo === null) ? null :
            flightInfo.toString().split(",").filter(n => n.length > 0);
    }

    _getHubInfo(hubId, logger) {
        return this.supportedHubs(logger).then((hubs) => {
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
                throw new OpenT2TError(404, OpenT2TConstants.InvalidHubId);
            }

            return hubInfo;
        });
    }

    _invokeMethod(opent2t, translator, deviceInfo, methodName, params) {
        if (typeof translator === "object") {
            return opent2t.invokeMethodAsync(translator, "", methodName, params);
        }
        else {
            return this._createTranslator(opent2t, translator, deviceInfo).then(translatorInstance => {
                return opent2t.invokeMethodAsync(translatorInstance, "", methodName, params);
            });
        }
    }

    _setProperty(opent2t, translatorName, deviceInfo, property, deviceId, value) {
        return this._createTranslator(opent2t, translatorName, deviceInfo).then(translator => {
            return opent2t.invokeMethodAsync(translator, "", property, [deviceId, value]);
        });
    }

    _capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    _createTranslator(opent2t, translatorName, deviceInfo) {
        return opent2t.createTranslatorAsync(translatorName, deviceInfo).then(translator => {
            return translator;
        });
    }

    _handleError(err, message, logger) {
        let customMessage = `OpenT2T call failed in: ${message}; Original message: `;
        let customErrCode = 500;
        let innerError = undefined;

        try {
            if (err instanceof Error) {
                innerError = err;
                customErrCode = err.statusCode;

                // This was a result of a failed HTTP Request promise (Eg request-promise's HttpRequestError)
                // Can also check err.Name
                if ('response' in err && 'statusMessage' in err.response) {
                    customMessage = customMessage + err.response.statusMessage;
                }
                else {
                    // Likely a simple Error-derived class like OpenT2TError
                    customMessage = customMessage + err.message;
                }
            } else {
                // Likely a promise rejected (eg NEST translators) with message string only instead of Error
                // object
                customMessage = customMessage + err;
            }

            let customError = new OpenT2TError(customErrCode, customMessage, innerError);
            logger.error(`Returning error from hubController- 
            Message: ${customError.message}; StatusCode: ${customError.statusCode}`);

            return q.reject(customError);
        }
        catch (unexpectedErr) {
            let unexpectedError = new OpenT2TError(customErrCode, customMessage, unexpectedErr);
            logger.error(`ErrorHandler in hubController ran into unexpected error- 
            Message: ${unexpectedError.message}`);

            return q.reject(unexpectedError);
        }
    }
}

module.exports = HubController;
