# openT2T cloud-based RuleEngine app
This is an app that shows how openT2T thingTranslators can be used to interact with multiple devices using a common schema.
The app is a simple polling-based server that uses a ruleEngine to execute some rules. Rules are based on a predefined device hierachy that the user can create in order to define how devices are organized in logical groups, ex. LivingRoom, Kitchen, ...
This app also show how the same thingTranslator handler can be used on a cloud-based application (clearly with the assumption that the cloud-based application can connect to the device somehow).

## Device Collection & Device Profiles
In order to define groups of devices that can then be used to write simple rules using the thingTranslator's schemas the app needs two files:
* device collection file: this is the file that is used to define the hierarchy of devices so they can be easily identified in the rules, for instance, LivingRoom.Light1, LivingRoom.Thermostat, Kitchen.HumiditySensor, ...
 ```json
{
    "LivingRoom": {
        "Light": {
            "deviceId": "light1"
        },
        "ConsoleLight": {
            "deviceId": "consoleLight1"
        },
        "SensorTag": {
            "deviceId": "sensorTag1"
        }
    }
}
```
The only required property is `deviceId` that is used to identity the device properties in the device profiles file.
    
* device profiles file: the file contains the properties that can be used to connect to the device (maybe via a 3rd party service such as WINK).
```json
[
    {
        "deviceId": "light1",
        "deviceType": "org.OpenT2T.Sample.SuperPopular.Lamp/Test Light",
        "initDevice": {
            "name": "Wink Light",
            "url": "<url of the service>",
            "access_token": "<Access Token>",
            "expires_in": "<Access Token Expiry>"
        }
    },
    {
        "deviceId": "consoleLight1",
        "deviceType": "org.OpenT2T.Sample.SuperPopular.Lamp/Test Light",
        "initDevice": {
            "name": "WINK",
            "url": "<url of the service>",
            "access_token": "<Access Token>",
            "expires_in": "<Access Token Expiry>"
        }
    },
    {
        "deviceId": "sensorTag1",
        "deviceType": "org.OpenT2T.Sample.SuperPopular.TemperatureSensor/Test Temperature Sensor",
        "initDevice": {
            "name": "Test Temperature Sensor",
            "url": "<url of the service>",
            "access_token": "<Access Token>",
            "expires_in": "<Access Token Expiry>"
        }
    }
]
```     
The device profiles file is an array of objects with the following properties:
* `deviceId`: it is the property that is used in the Device Collection file to uniquely indentify the device
* ` deviceType`: defines the type of device according to the openT2T translators schema
* `initDevice`: defines the set of properties that are required to connect to the device either directly or via a 3rd party service
    
 ## config file structure

* pullInterval: the interval in seconds that the ruleEngine uses to execute the rules defined in the rules/ directory
* deviceRegistryUrl: url of the openT2T's Translators repo (it should be set to https://github.com/openT2T/translators.git    
* repoDir: local directory where the Translators repo is going to be cloned
  
 ## TODO
 * improve error handling
 * add a web frontend to see logs 