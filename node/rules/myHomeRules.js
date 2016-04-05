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