var fs = require("fs");
var git = require("./git");
var ruleEngine = require("./ruleEngine");

/**
 * A simple wrapper that takes care of initializing the ruleEngine
 * 
 */
var settings = {};
var deviceCollection = null;


module.exports = {
    /**
     * Initialize the ruleEngine
     * input parameters:
     *  configfile: location of the config file
     *  dCollection: the name of the file that contains the device groups that are going to be used
     *  in the rules
     *  initCompleteCallback: callback function that is going to be called when the Translators repo
     *  is succeffully cloned on a local directory.
     */
    init: function(configFile, dCollection, initCompletedCallback) {

        deviceCollection = dCollection;
        //check if config file exists
        if (fs.existsSync(configFile)) {
            settings = require(configFile);
            // clone the translators repo
            // TODO: this can be removed, translators is going to be a public repo
            git.setGithubToken(process.env.GITHUBTOKEN);

            git.clone(settings.repoDir, settings.deviceRegistryUrl, function() {
                initCompletedCallback();
            });
        } else {
            var err = "cannot find config file" + settingsFile;
            console.error(err);
            initCompleteCallback(err);
        }
    },
    startPolling: function() {
        ruleEngine.init(deviceCollection, settings.repoDir)
        ruleEngine.startPolling(settings.pullInterval);
    },


}
