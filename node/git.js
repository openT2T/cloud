

var Git = require("nodegit");
var fs = require("fs");
var rmdir = require("rmdir");

/**
 * Simple helper module to handle clone from a github repo
 * It is used to clone openT2T's Translators repo that contains
 * the deviceTranslators files that are used to handle device-specific
 * APIs
 */
var githubToken = null;
var cloneOptions = {};
cloneOptions.fetchOpts = {
    callbacks: {
        certificateCheck: function() { return 1; },
        credentials: function() {
            return Git.Cred.userpassPlaintextNew(githubToken, "x-oauth-basic");
        }
    }
};

module.exports = {
    setGithubToken: function(token) {
        githubToken = token;
    },
    clone:function(repoDir, githubRepoUrl, doneCallback) {
      rmdir(repoDir, function(err, dirs, files) {
          if(!err) {
            Git.Clone(githubRepoUrl, repoDir, cloneOptions)
                .done(function(blob) {
                    console.log("cloned OpenT2T repo on " + repoDir);
                doneCallback();
                });
          } else
           console.error("Cannot remove repo directory" + repoDir);
      });
        
    },
    fetch: function(repoDir, githubRepoUrl, doneCallback) {

        fs.access(repoDir, fs.R_OK | fs.W_OK, (err) => {
            if (err) {
                // clone the device registry locally
                Git.Clone(githubRepoUrl, repoDir, cloneOptions)
                    .done(function(blob) {
                        console.log("cloned OpenT2T repo on " + repoDir);
                    });

            } else {
                // Open a repository that needs to be fetched and fast-forwarded
                Git.Repository.open(repoDir)
                    .then(function(repo) {
                        repository = repo;

                        return repository.fetchAll(cloneOptions.fetchOpts);
                    })
                    // Now that we're finished fetching, go ahead and merge our local branch
                    // with the new one
                    .then(function() {
                        return repository.mergeBranches("master", "origin/master");
                    })
                    .done(doneCallback);

            }
        });


    }
}



