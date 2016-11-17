var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var https = require('https');

var config = require("./config");

var hubRouter = require('./hubRouter');
var deviceRouter = require('./deviceRouter');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// setup body-parser to parse content from forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// load static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

console.log(config);

// middleware that does simple logging
app.use(function (req, res, next) {
    console.log("------------------------------- *******************************");
    var d = new Date(Date.now());
    var h = d.getHours();
    var m = d.getMinutes();
    var s = d.getSeconds();
    console.log('------------------------------- Request URL:', req.url);
    console.log('------------------------------- Time: ' + h + ":" + m + ":" + s);
    next();
});

// middleware that does authorization
app.use(function (req, res, next) {
    //console.log(config);
    var done = false;
    for (var i = 0; !done && i < config.noAuthUrls.length; i++) {
        var element = config.noAuthUrls[i];
        if (req.url == element) {
            done = true;
        }
    }

    if (done) {
        console.log("no-auth needed");

        if (req.url == "/favicon.ico") {
            res.end();
        }
        else {
            next();
        }
    }
    else {
        console.log("auth needed");
        //console.log(req.headers);

        doAuthorization(req, res, next);
    }
});

function doAuthorization(req, res, next) {
    var user = config.getUserFromRequest(req);

    if (user === false || config.users[user] == undefined) {
        console.log('unauthorized user');
        res.status(401).send('unauthorized user');
    }
    else {
        console.log('authorized user');
        req.userInfo = user;
        next();
    }
}

app.use('/hubs', hubRouter);
app.use('/devices', deviceRouter);

app.get('/', function (req, res) {
    res.send('Welcome to the opent2t example service!');
});

app.get('/test', function (req, res) {
    var hubController = new (require("./hubController.js"));
    console.log(hubController);
    hubController.supportedHubs().then((hubs) => {
        console.log("got hubs");

        var onboardingInfo = [
            { 
                username: "arjunl@microsoft.com",
                password: "Sharingisfun5!"
            },
            {
                client_id: "f9112028925430b8cfea2cbb322882bb",
                client_secret: "fa453b28f7520b1bfa776789e38e0e9e"
            }
        ];

        hubController.onboard("winkHub", onboardingInfo).then((authInfo) => {
            console.log("onboarding done");
            console.log(authInfo);

            var opent2tBlob = {
                "schema":"opent2t.p.light",
                "translator":"opent2t-translator-com-wink-lightbulb",
                "controlId":"1985159"
            };
            // hubController.getPlatform("winkHub", authInfo, opent2tBlob).then((platform) => {
            //     console.log("platform done");
            //     console.log(platform);
            //     res.send(platform);
            // });

            hubController.setResource("winkHub", authInfo, opent2tBlob, "F8CFB903-58BB-4753-97E0-72BD7DBC7933", "power", {'value':false}).then((platform) => {
                console.log("platform done");
                console.log(platform);
                res.send(platform);
            });

            // hubController.platforms("winkHub", authInfo).then((platforms) => {
            //     console.log("platforms done");
            //     console.log(platforms);
            //     res.send(platforms);
            // });

        }).catch( (err) => {
            console.log("onboarding3 error");
            console.log(err);
            res.send(err);
        });

        //res.send(hubs);
    }).catch( (err) => {
        console.log("onboarding2 error");
        console.log(err);
        res.send(err);
    });


});

app.listen(828, function () {
    console.log('Example opent2t service listening on port 828!');
});
