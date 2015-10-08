// global variables
var isTeacher;
var roomID;
var webRTC;
var webRTCSignalServerURL;


// ajax로 방 정보 및 자신의 정보 얻어오기

// Request
// POST : init
// JSON
// - roomID
// - isTeacher (boolean. not 1 or 0)
// - webRTCSignalServerURL

$.post("init", function(data) {
	isTeacher = data.isTeacher;
	roomID = data.roomID;
	webRTCSignalServerURL = data.webRTCSignalServerURL;

	loadWebRTC();
}).fail(function() {
	alert("error");
});


function loadWebRTC() {
	webRTC = new SimpleWebRTC({
		// the id/element dom element that will hold "our" video
		localVideoEl: 'localVideo',
		// the id/element dom element that will hold remote videos
		remoteVideosEl: 'remoteVideos',
		// immediately ask for camera access
		autoRequestMedia: true,
		url: webRTCSignalServerURL
	});

	// we have to wait until it's ready
	webRTC.on('readyToCall', function() {
		// you can name it anything
		webRTC.joinRoom(roomID);
	});
}