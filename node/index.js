var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');

var config = require("./config");

var hubRouter = require('./hubRouter');

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

app.get('/', function (req, res) {
    res.send('Welcome to the opent2t example service!');
});

app.listen(828, function () {
    console.log('Example opent2t service listening on port 828!');
});