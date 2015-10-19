// routes.js
module.exports = function(app) {
    var isTeacherToggle = false;
    app.get('/', function(req, res) {
        res.render('../client/index.html');
    });

    app.post('/init', function(req, res) {
        isTeacherToggle = !isTeacherToggle;
        res.json({
            isTeacher: isTeacherToggle,
            roomID: '1',
            webRTCSignalServerURL: 'https://127.0.0.1:8787', ////'https://signaling.simplewebrtc.com:443/'
            chattingServerURL: 'https://127.0.0.1:' + app.get('port'),
            userName: 'user' + Math.ceil(Math.random() * 100)
        });
    });
};