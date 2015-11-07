// global variables

var isTeacher;
var roomID;
var webRTC;
var webRTCSignalServerURL;
var userName;

var chattingServerURL;
var chattingSocket;
var stream; // for file transfer


var isMuted = false;
var isCameraPause = false;

var literallyCanvas; // instance canvas of current tab
var prevCanvasTool; // need this per canvas of tab.

var backgroundFileUploadElement;


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

function sendInitPacket() {
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
}


function loadWebRTC() {
    DetectRTC.load(function() {
        // DetectRTC.hasWebcam (has webcam device!)
        // DetectRTC.hasMicrophone (has microphone device!)
        // DetectRTC.hasSpeakers (has speakers!)
        // DetectRTC.isScreenCapturingSupported
        // DetectRTC.isSctpDataChannelsSupported
        // DetectRTC.isRtpDataChannelsSupported
        // DetectRTC.isAudioContextSupported
        // DetectRTC.isWebRTCSupported
        // DetectRTC.isDesktopCapturingSupported
        // DetectRTC.isMobileDevice
        // DetectRTC.isWebSocketsSupported

        // DetectRTC.osName

        // DetectRTC.browser.name === 'Edge' || 'Chrome' || 'Firefox'
        // DetectRTC.browser.version
        // DetectRTC.browser.isChrome
        // DetectRTC.browser.isFirefox
        // DetectRTC.browser.isOpera
        // DetectRTC.browser.isIE
        // DetectRTC.browser.isSafari
        // DetectRTC.browser.isEdge

        // DetectRTC.isCanvasSupportsStreamCapturing
        // DetectRTC.isVideoSupportsStreamCapturing

        // DetectRTC.DetectLocalIPAddress(callback)

        webRTC = new SimpleWebRTC({
            // the id/element dom element that will hold "our" video
            localVideoEl: 'localVideo',
            // the id/element dom element that will hold remote videos
            remoteVideosEl: 'remoteVideos',
            // immediately ask for camera access
            autoRequestMedia: true,
            url: webRTCSignalServerURL,
            media: {
                audio: DetectRTC.hasMicrophone,
                video: DetectRTC.hasWebcam
            }
        });

        // we have to wait until it's ready
        webRTC.on('readyToCall', function() {
            // you can name it anything
            webRTC.joinRoom(roomID);

            initButtons();
        });
    });


}

function loadChatting() {
    chattingSocket = io.connect(chattingServerURL);

    $('form').submit(function() {
        chattingSocket.emit('chat', $('#m').val());
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


function initButtons() {
    $("#muteBtn").click(function() {
        isMuted = !isMuted;
        if (isMuted)
            webRTC.mute();
        else
            webRTC.unmute();
    });

    $("#cameraPauseBtn").click(function() {
        isCameraPause = !isCameraPause;
        if (isCameraPause)
            webRTC.pauseVideo();
        else
            webRTC.resumeVideo();
    });
}


var LCANVAS = {
    init: function(canvasDiv) {


        var tools = this.getCustomCanvasTools(LC);
        canvasDiv.literallycanvas({
            imageURLPrefix: '/static/img',
            tools: tools,
            zoomMax: 32,
            zoomMin: -32
        });

        // if teacher -> send drawing information
        if (isTeacher) {
            canvasDiv.on('shapeSave', function(data) {
                var packet = {
                    type: 'shapeSave',
                    shapeJSON: LC.shapeToJSON(data.shape),
                    previousShapeId: data.previousShapeId
                };
                chattingSocket.emit('draw', packet);
            });
            canvasDiv.on('clear', function() {
                var packet = {
                    type: 'clear'
                };
                chattingSocket.emit('draw', packet);
            });
            canvasDiv.on('undo', function() {
                var packet = {
                    type: 'undo'
                };
                chattingSocket.emit('draw', packet);
            });
            canvasDiv.on('redo', function() {
                var packet = {
                    type: 'redo'
                };
                chattingSocket.emit('draw', packet);
            });
            canvasDiv.on('pan', function(panData) {
                var packet = {
                    type: 'pan',
                    x: panData.x,
                    y: panData.y
                };
                chattingSocket.emit('draw', packet);
            });
            canvasDiv.on('zoom', function(zoomData) {
                var packet = {
                    type: 'zoom',
                    amount: zoomData.newScale
                };
                chattingSocket.emit('draw', packet);
            });
        } else { // else -> student -> receive drawing information
            // student can't use canvas!
            // disable literally canvas.
            canvasDiv.css("pointer-events", "none");
            chattingSocket.on('draw', function(data) {

                // packet : 'draw'
                // - type
                // - content that defended on type.

                if (data.type == 'shapeSave') {
                    canvasDiv.saveShape(LC.JSONToShape(data.shapeJSON), false, data.previousShapeId);
                } else if (data.type == 'pan') {
                    canvasDiv.setPan(data.x, data.y);
                } else if (data.type == 'zoom') {
                    canvasDiv.setZoom(data.amount);
                } else if (data.type == 'clear') {
                    canvasDiv.clear();
                } else if (data.type == 'undo') {
                    canvasDiv.undo();
                } else if (data.type == 'redo') {
                    canvasDiv.redo();
                } else {
                    console.log(data);
                }
            });
        }
    },


    getCustomCanvasTools: function(LC) {
        var defaultTools = LC.defaultTools;

        for (var i = 0; i < defaultTools.length; i++) {
            var defaultTool = defaultTools[i];
            defaultTool.prototype.willBecomeInactive = function(lc) {
                prevCanvasTool = this;
                console.log(prevCanvasTool);
            }
        }

        var backgroundImageAddingTool = function(lc) {
            var self = this;
            return {
                usesSimpleAPI: false, // DO NOT FORGET THIS!!!
                name: 'Background',
                iconName: 'line',
                optionsStyle: null,

                didBecomeActive: function(lc) {
                    backgroundFileUploadElement.click();
                },
                willBecomeInactive: function(lc) {

                }
            }
        }

        defaultTools.push(backgroundImageAddingTool);
        return defaultTools;
    },

    handleBackgroundFiles: function() {
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var backgroundImage = new Image()
                backgroundImage.src = e.target.result;
                literallyCanvas.backgroundShapes = [LC.createShape(
                    'Image', {
                        x: 20,
                        y: 20,
                        image: backgroundImage,
                        scale: 2
                    })];
                literallyCanvas.repaintLayer('background', false);
                if (prevCanvasTool)
                    literallyCanvas.setTool(prevCanvasTool);
            }
            reader.readAsDataURL(this.files[0]);

            // upload a file to the server. 
            ss(chattingSocket).emit('background', stream, {
                size: this.files[0].size
            });
            ss.createBlobReadStream(this.files[0]).pipe(stream);
        }
    }
}


var TAB = {
	tabCount : 0,
	init : function() {
		this.tabControl();
	},
	tabControl : function() {
		// tabNav eventListener
		$("#tabNav").on("click", ".tabBtn", function(event) {
			var tabButton = $(event.target);
			var currentTab = tabButton.val(); 
			if (currentTab === "+") {
				this.tabCount++;
				if ($("#addTab").hasClass("on")) {
					$("#addTab").css("display", "none");
				} else {
					$("#addTab").css("display", "block");
				}
				$("#addTab").toggleClass("on");
				return;
			}
			
			this.selectTab(currentTab);
		}.bind(this));
		
		// addTab eventListener
		$("#addTab").on("click", function(event) {
			var addButton = $(event.target);
			this.addTab(addButton.val());
			$("#addTab").css("display", "none");
			$("#addTab").toggleClass("on");
			
			// tab count check
			if ($("#tabNav").children().length >= 11) {
				$("#plusTab").css("display", "none");
			} else {
				$("#plusTab").css("display", "block");
			}
		}.bind(this));
	},
	selectTab : function(tabNumber) {
		//tab 
		$(".tab").css("display", "none");
		$("#tab"+tabNumber).css("display", "block");
		
		//tab button
		$(".tabBtn").css("background-color", "#ddd");
		$(".tabBtn").eq(parseInt(tabNumber) - 1).css("background-color", "#bbb");
	},
	addTab : function(tabTemplate) {
		// add tab
		var template = $("#" + tabTemplate + "Template").html();
		Mustache.parse(template);
		var newTab = Mustache.render(template, {
			tabCount: this.tabCount
		});
		$("#tabs").append(newTab);
		
		// add canvas
		if (tabTemplate === "whiteBoard") {
			LCANVAS.init($("#lcanvas" + this.tabCount));
		} else if (tabTemplate === "textbook") {
			LCANVAS.init($("#lcanvas" + this.tabCount));
			console.log(newTab);
		}
		
		// add tab button
		var tabBtn = $("#tabBtnTemplate").html();
		Mustache.parse(tabBtn);
		var newTabBtn = Mustache.render(tabBtn, {
			tabCount: this.tabCount
		});
		$("#plusTab").before(newTabBtn);
		
		// select new tab
		this.selectTab(this.tabCount);
	}
}

// Service code
$(window).on("load", function() {
    sendInitPacket();

    backgroundFileUploadElement = document.createElement("INPUT");
    backgroundFileUploadElement.setAttribute("type", "file");
    backgroundFileUploadElement.addEventListener("change", LCANVAS.handleBackgroundFiles, false);

    ss.forceBase64 = true;
    stream = ss.createStream();
});

$(document).on("ready", function() {
    TAB.init();
});