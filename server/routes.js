// routes.js
var config = require('getconfig');
module.exports = function(app) {
    app.get('/', function(req, res) {
        res.render('../client/index.html');
    });

    app.get('/class', function(req, res) {
        req.session.isTeacher = ((req.query.isTeacher) === '1');
        req.session.roomID = req.query.roomID;
        req.session.userName = req.query.userName;
        console.log(req.session.isTeacher);
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
};