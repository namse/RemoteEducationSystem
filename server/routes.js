// routes.js
var config = require('getconfig');
var path = require('path');
var fs = require('fs');
var config = require('getconfig');
module.exports = function(app) {
    app.get('/', function(req, res) {
        res.render('../client/index.html');
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

    app.post('/login', function(req, res) {

        if (req.body.id === "teacher1" && req.body.password === "abc1234") {
            req.session.isTeacher = true;
            req.session.roomID = "a1";
            req.session.userName = "John";
        } else if (req.body.id === "teacher2" && req.body.password === "abc1234") {
            req.session.isTeacher = true;
            req.session.roomID = "b2";
            req.session.userName = "Peter";
        } else if (req.body.id === "student1" && req.body.password === "abc1234") {
            req.session.isTeacher = false;
            req.session.roomID = "a1";
            req.session.userName = "Kim Minsung";
        } else if (req.body.id === "student2" && req.body.password === "abc1234") {
            req.session.isTeacher = false;
            req.session.roomID = "b2";
            req.session.userName = "Lee Sin";
        } else {
            res.json({
                success: false
            });
            return;
        }

        res.json({
            success: true
        });
    });
};