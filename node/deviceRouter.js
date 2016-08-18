var express = require('express');
var deviceRouter = express.Router();
var config = require("./config");

deviceRouter.get("/", function (req, res) {
    var user = req.userInfo;
    
    var devices = config.getUserDeviceMap(user).devices;
    res.send(devices);  
});

// return devices for this specific hub
deviceRouter.get("/:deviceId", function (req, res) {
    var user = req.userInfo;
    var deviceId = req.params.deviceId;

    var device = config.getUserDevice(user, deviceId);

    console.log("device");
    console.log(device);

    res.send(device);
});


module.exports = deviceRouter;