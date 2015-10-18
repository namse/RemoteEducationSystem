// global variables

var isTeacher;
var roomID;
var webRTC;
var webRTCSignalServerURL;
var chattingServerURL;
var chattingSocket;
var userName;


// chatting system
// from https://github.com/socketio/socket.io/blob/master/examples/chat/public/main.js

var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];
var $window = $(window);
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage'); // Input message input box




// ajax로 방 정보 및 자신의 정보 얻어오기

// Request
// POST : init
// JSON
// - roomID
// - isTeacher (boolean. not 1 or 0)
// - webRTCSignalServerURL

$.post("init", function(data) {
    console.log(data);
    isTeacher = data.isTeacher;
    roomID = data.roomID;
    webRTCSignalServerURL = data.webRTCSignalServerURL;
    chattingServerURL = data.chattingServerURL;
    userName = data.userName;

    loadWebRTC();
    loadChatting();
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

function loadChatting() {
    chattingSocket = io.connect(chattingServerURL);

    $('form').submit(function() {
        chattingSocket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });

    chattingSocket.on('chat', function(msg) {
        addChatMessage(msg);
    });
}


$window.keydown(function(event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $inputMessage.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        if (userName) {
            sendMessage();
            typing = false;
        }
    }
    console.log($inputMessage.val());
});

// Sends a chat message
function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message) {
        $inputMessage.val('');
        addChatMessage({
            userName: userName,
            message: message
        });
        // tell server to execute 'new message' and send along one parameter
        chattingSocket.emit('chat', {
            userName: userName,
            message: message
        });
    }
}


// Adds the visual chat message to the message list
function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="userName"/>')
        .text(data.userName)
        .css('color', getUsernameColor(data.userName));
    var $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
        .data('userName', data.userName)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
}

// Gets the color of a userName through our hash function
function getUsernameColor(userName) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < userName.length; i++) {
        hash = userName.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
}

// Gets the 'X is typing' messages of a user
function getTypingMessages(data) {
    return $('.typing.message').filter(function(i) {
        return $(this).data('userName') === data.userName;
    });
}

// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
        options = {};
    }
    if (typeof options.prepend === 'undefined') {
        options.prepend = false;
    }

    if (options.prepend) {
        $messages.prepend($el);
    } else {
        $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
}

// Prevents input from having injected markup
function cleanInput(input) {
    return $('<div/>').text(input).text();
}



// Service code
// Look ma, no jQuery!
$(window).on("load", function() {
	LC.init(
		document.getElementsByClassName('literally')[0], {
			imageURLPrefix: '/static/img'
		}
	);
});
/* or if you just love jQuery,
	$('.literally').literallycanvas({imageURLPrefix: '/static/img'})
*/
