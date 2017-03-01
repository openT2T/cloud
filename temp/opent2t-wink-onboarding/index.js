/* jshint esversion: 6 */
/* jshint node: true */

'use strict';
var https = require('https');
var q = require('q');
var accessTokenInfo = require('./opent2tonboarding').accessTokenInfo;

// module exports, implementing the schema
module.exports = {

    //
    // question: Do we need to remove validate function?
    // This is tied with 'inquirer' syntax, which helps validate at commandline as well.
    //
    onboardingFlow : [
        {
            action: 'get-user-input',
            inputNeeded: [
                            {
                                type: 'input',
                                name: 'username',
                                message: 'Wink Service User Name (Setup account in the Wink app): ',
                                validate: function(value) {
                                    var pass = !!value;
                                    if (pass) {
                                        return true;
                                    } else {
                                        return 'Please enter a valid User Name.';
                                    }
                                }
                            },
                            {
                                type: 'password',
                                name: 'password',
                                message: 'Wink Service Password (Setup account in the Wink app): ',
                                validate: function(value) {
                                    var pass = !!value;
                                    if (pass) {
                                        return true;
                                    } else {
                                        return 'Please enter a valid Password.';
                                    }
                                }
                            }]
        },
        {
            action: 'get-developer-input',
            inputNeeded: [
                            {
                                type: 'input',
                                name: 'client_id',
                                message: 'Wink client Id (Obtained from Wink for development): ',
                                validate: function(value) {
                                    var pass = !!value;
                                    if (pass) {
                                        return true;
                                    } else {
                                        return 'Please enter a valid Client ID.';
                                    }
                                }
                            },
                            {
                                type: 'input',
                                name: 'client_secret',
                                message: 'Wink client secret (Obtained from Wink for development): ',
                                validate: function(value) {
                                    var pass = !!value;
                                    if (pass) {
                                        return true;
                                    } else {
                                        return 'Please enter a valid Client Secret.';
                                    }
                                }
                            }]
        }

    ],

    onboard: function(authInfo) {
        console.log("Onboarding Wink Hub");
        console.log(authInfo);
        var deferred = q.defer();
        
        var postData = JSON.stringify({
            'client_id': authInfo[1].client_id,
            'client_secret': authInfo[1].client_secret,
            'username': authInfo[0].username,
            'password': authInfo[0].password,
            'grant_type': 'password'
        });

        var postOptions = {
            protocol: 'https:',
            host: 'api.wink.com',
            path: '/oauth2/token',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            },
            method: 'POST'
        };

        // set up sign in request
        var req = https.request(postOptions, (res) => {
            var body = '';
            res.setEncoding('utf8');
            res.on('data', function(data) {
                body += data;
            });

            res.on('end', function() {
                if (res.statusCode != 200) {
                    deferred.reject(new Error("Error Code:" + res.statusCode)); // TODO: Encore the failure int he return value. Define a strong contract between onboarding modules and the caller
                }
                else {
                    // signed in, now enumerate devices and let the user pick one
                    var tokenInfo = JSON.parse(body); // This includes refresh token, scope etc..
                    console.log(tokenInfo);
                    deferred.resolve(new accessTokenInfo(
                        tokenInfo.access_token,
                        tokenInfo.refresh_token,
                        tokenInfo.token_type,
                        tokenInfo.scopes
                    ));
                }
            });

            res.on('error', function(e) {
                deferred.reject(e);
            });
        });

        req.on('error', (e) => {
            deferred.reject(e);
        });

        // initiate sign in request
        req.write(postData);
        req.end();
        return deferred.promise;
    }
};