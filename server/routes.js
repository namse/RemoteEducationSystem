// routes.js
module.exports = function(app) {
	app.get('/', function(req, res) {
		res.render('../client/index.html');
	});

	app.post('/init', function(req, res) {
		res.json({
			isTeacher: false,
			roomID: '1',
			webRTCSignalServerURL: 'https://signaling.simplewebrtc.com:443/'
		});
	});
};