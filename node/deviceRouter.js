var express = require('express');
var deviceRouter = express.Router();
var config = require("./config");

deviceRouter.get("/", function (req, res) {
    var user = req.userInfo;
    
    var devices = config.getUserDeviceMap(user).devices;
    var converted = config.convertInternalDeviceArrayToClientArray(devices);
    console.log(devices);
    console.log(converted);
    res.send(converted);
});

// return devices for this specific hub
deviceRouter.get("/:deviceId", function (req, res) {
    var user = req.userInfo;
    var deviceId = req.params.deviceId;

    var device = config.getUserDevice(user, deviceId);
    var converted = config.convertInternalDeviceToClientDevice(device);
    res.send(converted);
});


module.exports = deviceRouter;