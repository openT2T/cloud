var randomstring = require('randomstring');

// module exports, implementing the schema
module.exports = {

    // question: do we need to remove validate function?
    onboardingFlow : [
        {
            action: 'get-developer-input',
            inputNeeded: [{
                                type: 'input',
                                name: 'client_id',
                                message: 'Nest API Client ID: ',
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
                                message: 'Nest API Client Secret: ',
                                validate: function(value) {
                                    var pass = !!value;
                                    if (pass) {
                                        return true;
                                    } else {
                                        return 'Please enter a valid Client Secret.';
                                    }
                                }
                            }
            ]
        },
        {
            action: 'ask-permission',
            url: function (developerInput) {
                var state = randomstring.generate();
                console.log("here1");

                var code_uri = 'https://home.nest.com';
                var authorization_url = code_uri + '/login/oauth2?client_id=' + developerInput.client_id + '&state=' + state;
                console.log("here2");

                return authorization_url;
            }
        }
    ],

    onboard: function(onboardInput) {

        return "access token";
    }
};