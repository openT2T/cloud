var randomstring = require('randomstring');

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
        },
    "hub2":
        {   id: "hub2", 
            name: "Nest",
            icon: "http://somevalidurl.com/images/nest.png",
            settings: {
                client_id: "test",
                client_secret: "test",
            },
            onboarding: 'opent2t-nest-onboarding',
            //auth_uri: "https://home.nest.com/login/oauth2?client_id=dc528425-3551-400c-9718-c0b06a336e90&state=" + randomstring.generate(),
            auth_uri: "https://home.nest.com/login/oauth2?client_id=dc528425-3551-400c-9718-c0b06a336e90&state=",
            redirect_uri: "http://localhost:828/hubs/nest/auth_redirect"
        }
};

// users to devices mappings
var userDeviceMapping = {};

// no-auth urls
var noAuthUrls = [ '/', '/hubs' ];

function getUserFromRequest(req) {
    var authToken = req.headers['userinfo'];
    console.log(authToken);
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

function getUserDeviceMap(user) {
    var userDeviceMap = userDeviceMapping[user];
    if (!userDeviceMap) {
        userDeviceMap = {
            devices: []
        };
        userDeviceMapping[user] = userDeviceMap;
    }

    console.log("----------------------- getUserDeviceMap");
    console.log(userDeviceMapping[user]);
    console.log("-----------------------");

    return userDeviceMapping[user];
}

function getUserHubDevice(user, hubId) {
    var userDeviceMap = getUserDeviceMap(user);
    if (!userDeviceMap[hubId]) {
        userDeviceMap[hubId] = { 
            id: undefined,
            onboardingAnswers: [],
            onboardingOutput: undefined,
            translator: undefined,
            devices: []
        };
    }

    console.log("----------------------- getUserHubDevice");
    console.log(userDeviceMap[hubId]);
    console.log("-----------------------");

    return userDeviceMap[hubId];
}

function getUserDevice(user, deviceId) {
    var userDeviceMap = getUserDeviceMap(user);
    
    console.log("----------------------- getUserDevice");
    console.log(userDeviceMap);
    console.log("-----------------------");

    for (var i = 0; i < userDeviceMap.devices.length; i++) {
        var d = userDeviceMap.devices[i];
        if (d.id == deviceId) {
            return d;
        }
    }

    return undefined;
}

function addUserDevice(user, device) { 
    var userDeviceMap = getUserDeviceMap(user);

    var internalDevice = {};
    internalDevice.id = userDeviceMap.devices.length;
    internalDevice.name = device.name;
    internalDevice.actualDevice = device;

    userDeviceMap.devices.push(internalDevice);    
}

function addUserDeviceToDevice(user, device, parentDeviceId) {
    console.log("------------------------ addUserDeviceToDevice")
    console.log("user          : " + user);
    console.log("parentDeviceId: " + parentDeviceId);

    var userDeviceMap = getUserDeviceMap(user);

    var internalDevice = {};
    internalDevice.id = userDeviceMap.devices.length;
    internalDevice.name = device.name;
    internalDevice.parent = parentDeviceId;
    internalDevice.actualDevice = device;

    console.log(internalDevice);

    userDeviceMap.devices.push(internalDevice);

    var parent = getUserHubDevice(user, parentDeviceId);
    parent.devices.push(internalDevice);

    console.log("----------------------- userDeviceMap");
    console.log(userDeviceMap);
    console.log("-----------------------");


}

function getUserChildDevice(user, childDeviceId, parentDeviceId) {
    var parentDevices = getUserHubDevice(user, parentDeviceId).devices;

    if (parentDevices == undefined || parentDevices.length == 0) {
        console.log("returning undefined2");
        return undefined;
    }

    console.log("parentDevices");
    console.log(parentDevices);

    for (var i = 0; i < parentDevices.length; i++) {
        var d = parentDevices[i];
        if (d.id == childDeviceId) {
            console.log("returning d");
            return d;
        }
    }
    
    console.log("returning undefined");
    return undefined;
}


module.exports = { 
    users: users,
    hubs: hubs,
    userDeviceMapping: userDeviceMapping,
    noAuthUrls: noAuthUrls,
    getUserFromToken: getUserFromToken,
    getUserFromRequest: getUserFromRequest,
    
    getUserDeviceMap: getUserDeviceMap,
    getUserHubDevice: getUserHubDevice,
    getUserDevice: getUserDevice,
    addUserDevice: addUserDevice,
    addUserDeviceToDevice: addUserDeviceToDevice,
    getUserChildDevice: getUserChildDevice
};


