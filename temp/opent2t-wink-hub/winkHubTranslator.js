/* jshint esversion: 6 */
/* jshint node: true */
/* jshint sub:true */
// This code uses ES2015 syntax that requires at least Node.js v4.
// For Node.js ES2015 support details, reference http://node.green/

"use strict";
var https = require('https');
var q = require('q');
var deviceInfo = require('../opent2t-wink-onboarding/opent2tonboarding').deviceInfo;

/**
* This translator class implements the "Hub" interface.
*/
class winkHubTranslator {
    initDevice(accessToken) {
        this._accessToken = accessToken;

        this._baseUrl = "api.wink.com";
        this._devicesPath = '/users/me/wink_devices';

        this._name = "Wink Hub"; // TODO: Can be pulled from OpenT2T global constants. This information is not available, at least, on wink hub.
        this._type = "WinkHub"; // TODO: Can be pulled from OpenT2T global constants 
    }

    /**
     * Get the list of devices discovered through the hub.
     */
    getDevicesAsync(idKeyFilter) {
        return this._makeRequest(this._baseUrl, this._devicesPath, this._accessToken.accessToken, idKeyFilter, false, 'GET');
    }

    /**
     * Get the name of the hub.
     */
    getName() {
        return this._name;
    }

    /**
     * Get the type of the hub.
     */
    getType(value) {
        return this._type;
    }

    // TODO: If possible, this must implement caching mechanism and get data from the serveer only if new data available.
    _makeRequest(url, path, accessToken, idKeyFilter, method, content) {
        var deferred = q.defer();

        var requestOptions = {
            protocol: 'https:',
            host: url,
            path: path,
            method: method,
            headers: {}
        };

        if (accessToken) {
            requestOptions.headers['Authorization'] = 'Bearer ' + accessToken;
            requestOptions.headers['Accept'] = 'application/json';
        }
        else if (content) {
            requestOptions.headers['Content-Type'] = 'application/json';
            requestOptions.headers['Content-Length'] = content.length;
        }

        console.log("requestOptions");
        console.log(requestOptions);

        var request = https.request(requestOptions);
        
        request.on('response', function(response) {
            var body = '';
            response.setEncoding('utf8');
            
            response.on('data', function(data) {
                body += data;
            });

            response.on('end', function() {
                console.log("end");
                console.log(response.statusCode);
                console.log(response.statusMessage);
                if (response.statusCode != 200) {
                    deferred.reject(new Error("HTTP Error : " + response.statusCode + " - " + response.statusMessage));

                } else {
                    var devices = JSON.parse(body).data;
                    // Apply the id key filter
                    var filteredDevices = [];
                    devices.forEach(function(device) {
                        if((device.model_name !== 'HUB')  &&  // Skip hub itself. (WINK specific check, of course!)
                            ((idKeyFilter === undefined) || 
                            !!device[idKeyFilter]))
                        {
                            var deviceId = device.light_bulb_id ||
                                device.air_conditioner_id ||
                                device.binary_switch_id ||
                                device.shade_id ||
                                device.camera_id ||
                                device.doorbell_id ||
                                device.eggtray_id ||
                                device.garage_door_id ||
                                device.cloud_clock_id ||
                                device.lock_id ||
                                device.dial_id ||
                                device.alarm_id ||
                                device.power_strip_id ||
                                device.outlet_id ||
                                device.piggy_bank_id ||
                                device.deposit_id ||
                                device.refrigerator_id ||
                                device.propane_tank_id ||
                                device.remote_id ||
                                device.sensor_pod_id ||
                                device.siren_id ||
                                device.smoke_detector_id ||
                                device.sprinkler_id ||
                                device.thermostat_id ||
                                device.water_heater_id ||
                                device.scene_id ||
                                device.condition_id ||
                                device.robot_id;

                            // PubNub Subscription data
                            var isPubNubPropertyPresent = (!!device.subscription && !!device.subscription.pubnub);
                            var subscriptionKey = isPubNubPropertyPresent ? device.subscription.pubnub['subscribe_key'] : undefined; 
                            var subscriptionChannel = isPubNubPropertyPresent ? device.subscription.pubnub['channel'] : undefined;

                            filteredDevices.push(new deviceInfo(
                                device.name,
                                deviceId,
                                device.uuid,
                                device.hub_id,
                                device.model_name,
                                !!device.last_reading ? device.last_reading.firmware_version : undefined,
                                device.device_manufacturer,
                                device.location,
                                device.lat_lng,
                                device.radio_type,
                                subscriptionKey,
                                subscriptionChannel
                                ));
                        }
                    });
                    deferred.resolve(filteredDevices);
                    
                }
            });

            response.on('error', function(e) {
                deferred.reject(e);
            });
        });

        request.on('error', (e) => {
            deferred.reject(e);
        });

        if (content) {
            request.write(content);
        }

        request.end();

        return deferred.promise;
    }

    logError(error) {
        console.log("Error!");
        if (error.statusMessage) {
            console.log("HTTP Error: " + error.statusCode + " - " + error.statusMessage);
            console.log("HTTP Headers: ");
            console.log(error.headers);
        }
        else {
            console.log(error);
        }
    }
}

module.exports = winkHubTranslator;
// var winkonboarding = require("./winkonboarding");
// module.exports.onboardingFlow = winkonboarding.onboardingFlow;
// module.exports.onboard = winkonboarding.onboard;