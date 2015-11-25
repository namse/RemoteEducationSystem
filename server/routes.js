// routes.js
var config = require('getconfig');
var path = require('path');
var fs = require('fs');
var config = require('getconfig');
module.exports = function(app) {
    app.get('/', function(req, res) {
        res.render('../client/index.html');
    });

    app.get('/class', function(req, res) {
        req.session.isTeacher = ((req.query.isTeacher) === '1');
        req.session.roomID = req.query.roomID;
        req.session.userName = req.query.userName;
        console.log("route.js user name : " + req.query.userName);
        console.log("FULL : " + req.protocol + '://' + req.get('host') + req.originalUrl);
        res.render('../client/class.html');
    });

    app.post('/init', function(req, res) {
        res.json({
            isTeacher: req.session.isTeacher,
            roomID: req.session.roomID,
            webRTCSignalServerURL: 'https://' + config.ip + ':8787', ////'https://signaling.simplewebrtc.com:443/'
            chattingServerURL: 'https://' + config.ip + ':' + app.get('port'),
            userName: req.session.userName
        });
    });

    app.get('/file', function(req, res) {
        console.log("FULL : " + req.protocol + '://' + req.get('host') + req.originalUrl);
        var filePath;
        if (req.query.destination === 'class') {
            filePath = path.join(config.uploadDirectory, req.query.destination, req.session.roomID, req.query.fileName);
        } else if (req.query.destination === 'personal') {
            filePath = path.join(config.uploadDirectory, req.query.destination, req.session.userName, req.query.fileName);
        } else {
            res.send(404);
            return;
        }
        res.download(filePath); // Set disposition and send it.
    });
};