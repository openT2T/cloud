## Sample rules
this is an example of some simple rules that leverage the device hierarchy that is built using the Device Collection and Device Profile files

Rules are defined in a module, more than one file can be used in the rules/ directory. In order to invoke a specific method in the thinkTranslator-defined schema, user can use the device hierarchy defined in the Device Collection file.
The structure uses the following schema: `system.<DeviceCollection Name>.<device Structure>.device.<thingTranslator method to call>`.

The following is an example of few rules that uses the sample structure included with this app
```javascript
var system = null;
module.exports = {
    init:function(devCollection) {
      system = devCollection;  
    },
    
    checkTemperatureInLivingRoom:function(){
      
      if(system.myHome.LivingRoom.SensorTag.device.getCurrentTemperature() > 80) {
        console.log("==> Temperature is over 100 turning off light");
        system.myHome.LivingRoom.Light.device.turnOff();
      }
    },
   turnOffLights() {
       system.myHome.LivingRoom.Light.device.turnOff();
       system.myHome.LivingRoom.ConsoleLight.device.turnOff();
   } ,
   temperatureTrend() {
       if(system.myHome.LivingRoom.SensorTag.device.getTemperatureTrend() > 68) 
        console.log("Temperature Trend is > 68");
       else
        console.log("Temperature Trend is < 68");
   }
}   
```
the `init` method is called by the ruleEngine to initialize the device hierarchy.

