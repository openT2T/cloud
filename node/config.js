// users
var users = { 'user1': { userId: 'user1', name: 'John Smith', email: 'johnsmith@superpopularcompanya.com' },
              'user2': { userId: 'user2', name: 'Tim Tanner', email: 'timtanner@superpopularcompanyb.com' },
              'user3': { userId: 'user3', name: 'Adam Brown', email: 'adambrown@superpopularcompanyc.com' } 
            };

// hubs available
// should this come from opent2t library?
var hubs = { 
    "hub1":
        {   id: "hub1", 
            name: "Wink",
            icon: "http://somevalidurl.com/images/wink.png",
            settings: {
                client_id: "test",
                client_secret: "test",
            },
            render: 'winkOnBoarding',
            onboarding: 'opent2t-wink-onboarding',
            hub: 'opent2t-wink-hub'
        }
};

// users to devices mappings
var userDeviceMapping = {};

// no-auth urls
var noAuthUrls = [ '/', '/hubs' ];

function getUserFromRequest(req) {
    var authToken = req.headers['authorization'];
    return getUserFromToken(authToken);
}

// getUserFromToken
function getUserFromToken(authToken) {
    if (!authToken) {
        return false;
    }

    var startIndex = authToken.lastIndexOf('_');
    if (startIndex == -1) {
        return false;
    }
    else {
        var user = authToken.substring(startIndex + 1);
        return user;
    }
};

module.exports = { 
    users: users,
    hubs: hubs,
    userDeviceMapping: userDeviceMapping,
    noAuthUrls: noAuthUrls,
    getUserFromToken: getUserFromToken,
    getUserFromRequest: getUserFromRequest
};


