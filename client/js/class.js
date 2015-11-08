// global variables

var isTeacher;
var roomID;
var webRTC;
var webRTCSignalServerURL;
var userName;

var chattingServerURL;
var chattingSocket;

var isMuted = false;
var isCameraPause = false;

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
        console.log(isTeacher);
        roomID = data.roomID;
        webRTCSignalServerURL = data.webRTCSignalServerURL;
        chattingServerURL = data.chattingServerURL;
        userName = data.userName;

        loadWebRTC();
        loadChatting();
    }).done(function() {
		
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
        var webRTCSocket = io.connect(webRTCSignalServerURL);
        //webRTCSocket.on('connect', function() {

        webRTCSocket.getSessionid = function() {
            return webRTCSocket.id;
        };

        webRTC = new SimpleWebRTC({
            // the id/element dom element that will hold "our" video
            localVideoEl: 'localVideo',
            // the id/element dom element that will hold remote videos
            remoteVideosEl: 'remoteVideos',
            // immediately ask for camera access
            autoRequestMedia: true,
            url: webRTCSignalServerURL,
            connection: webRTCSocket,
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
        //});
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

    if (isTeacher == false) {
        chattingSocket.on('tab', function(packet) {

            // packet
            // - type

            if (packet.type === 'add') {
                TAB.addTab(packet.tabTemplate);
            } else if (packet.type === 'select') {
                TAB.selectTab(packet.tabNumber);
            } else if (packet.type === 'delete') {
                TAB.selectTab(packet.tabNumber);
            }
        });
    }
}


$inputMessage.keydown(function(event) {
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
$("#chatSend").click(function() {
    sendMessage();
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
        if (isMuted) {
            webRTC.mute();
            $("#muteBtn").css("background-image", "url('../image/sound_off.png')");
        } else {
            webRTC.unmute();
            $("#muteBtn").css("background-image", "url('../image/sound_on.png')");
        }
    });

    $("#cameraPauseBtn").click(function() {
        isCameraPause = !isCameraPause;
        if (isCameraPause) {
            webRTC.pauseVideo();
            $("#cameraPauseBtn").css("background-image", "url('../image/video_off.png')");
        } else {
            webRTC.resumeVideo();
            $("#cameraPauseBtn").css("background-image", "url('../image/video_on.png')");
        }
    });
}

var MENU = {
    isMuted: false,
    isCameraPause: false,
    init: function() {
        $("#changeLayer").on("click", this.layerControl.bind(this));
    },
    soundControl: function() {

    },
    cameraControl: function() {

    },
    layerControl: function() {
        var canvas = $("#" + TAB.currentTab).find(".literally");
        if (canvas.css("pointer-events") != "none") {
            canvas.css("pointer-events", "none");
        } else {
            canvas.css("pointer-events", "auto");
        }
    }
}

function getClouser(element) {
    function func() {
        CAPTURE.onTick(element);
    }
    return func;
}

var CAPTURE = {

    screenCapturePeriod: 5000, //ms
    capturer: {}, // key : element(dom), value : timer

    run: function(element) {
        if (element) {
            var timer = this.capturer[element];
            if (!timer) {
                var warp = function() {
                    var element_ = element;
                    return function() {
                        CAPTURE.onTick(element_);
                    }
                };
                var func = getClouser(element);
                timer = setInterval(func, this.screenCapturePeriod);
                this.capturer[element] = timer;
            }
        }
    },

    onTick: function(element) {
        console.log(element);
        if (element) {
            if (element.tagName === 'IFRAME') {

                iframe2image(element, function(error, image) {
                    if (error) {
                        console.log("iframe2image error : " + error);
                    } else {
                        var packet = {
                            type: 'background',
                            image: image.src
                        };
                        chattingSocket.emit('draw', packet);
                    }
                });
            } else if (element.tagName === 'VIDEO') {
                var frame = captureVideoFrame(element);
                var packet = {
                    type: 'background',
                    image: frame.dataUri
                };
                chattingSocket.emit('draw', packet);
            }
        } else {
            console.log("error(onTick): no element!");
        }
    },

    pause: function(element) {
        if (element) {
            var timer = this.capturer[element];
            if (timer) {
                this.capturer[element] = null;
            }
        }
    }
}


var LCANVAS = {
    lcanvases: {},
    init: function(canvasDiv) {
        var tools = this.getCustomCanvasTools(LC);
        var lc_;
        canvasDiv.literallycanvas({
            imageURLPrefix: '/static/img',
            tools: tools,
            zoomMax: 32,
            zoomMin: -32,
            onInit: function(lc) {
                // if teacher -> send drawing information
                if (isTeacher) {
                    lc.on('shapeSave', function(data) {
                        var packet = {
                            type: 'shapeSave',
                            shapeJSON: LC.shapeToJSON(data.shape),
                            previousShapeId: data.previousShapeId
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('clear', function() {
                        var packet = {
                            type: 'clear'
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('undo', function() {
                        var packet = {
                            type: 'undo'
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('redo', function() {
                        var packet = {
                            type: 'redo'
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('pan', function(panData) {
                        var packet = {
                            type: 'pan',
                            x: panData.x,
                            y: panData.y
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('zoom', function(zoomData) {
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

                    // TODO : 탭 확인해서 셋팅되도록 해야함.
                    chattingSocket.on('draw', function(data) {

                        // packet : 'draw'
                        // - type
                        // - content that defended on type.

                        if (data.type == 'shapeSave') {
                            lc.saveShape(LC.JSONToShape(data.shapeJSON), false, data.previousShapeId);
                        } else if (data.type == 'pan') {
                            lc.setPan(data.x, data.y);
                        } else if (data.type == 'zoom') {
                            lc.setZoom(data.amount);
                        } else if (data.type == 'clear') {
                            lc.clear();
                        } else if (data.type == 'undo') {
                            lc.undo();
                        } else if (data.type == 'redo') {
                            lc.redo();
                        } else if (data.type == 'background') {
                            var image = new Image()
                            image.src = data.image;

                            lc.backgroundShapes = [LC.createShape(
                                'Image', {
                                    image: image
                                })];
                            lc.repaintLayer('background', false);
                        } else {
                            console.log(data);
                        }
                    });
                }
                lc_ = lc;
            }
        });
        this.lcanvases[TAB.currentTab] = lc_;
        lc_.on('drawingChange', function() {
            console.log("The drawing was changed.");
        });


    },
    getCustomCanvasTools: function(LC) {
        var defaultTools = LC.defaultTools.slice(0); // copy
        console.log(defaultTools);

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

                var packet = {
                    type: 'background',
                    image: e.target.result
                };
                chattingSocket.emit('draw', packet);

                var currentLC = LCANVAS.lcanvases[TAB.currentTab];
                currentLC.backgroundShapes = [LC.createShape(
                    'Image', {
                        image: backgroundImage
                    })];
                currentLC.repaintLayer('background', false);
                if (prevCanvasTool)
                    currentLC.setTool(prevCanvasTool);
            }
            reader.readAsDataURL(this.files[0]);
        }
    }
}


var TAB = {
    tabCount: 0,
    tabNum: 0,
    tabType: ["whiteBoard", "textbook", "shareScreen"],
    currentTab: null,
    init: function() {
        $("#tabNav").on("click", ".tabBtn", function(event) {
            var tabButton = $(event.target);
            var currentTab = tabButton.val();
            if (currentTab === "+") {
                this.tabNum++;
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
            if (addButton.val() == "") return;

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

        $("#tabNav").on("click", ".delTab", function(event) {
			var tabBnt = $(event.target).parent();
        	var tabNum = tabBnt.find(".tabBtn").val();
			this.deleteTab(tabNum);
		}.bind(this));
    },
    selectTab: function(tabNumber) {
        var captureElement;
        if ($("#" + TAB.currentTab).hasClass("screenShare")) {
            captureElement = $("#" + TAB.currentTab).find("video").get(0);
        } else if ($("#" + TAB.currentTab).hasClass("textbook")) {
            captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
        } else {
            captureElement = null;
        }
        CAPTURE.pause(captureElement);

        //tab
        $(".tab").css("display", "none");
        $("#tab" + tabNumber).css("display", "block");

        //tab button
        $(".tabBtn").css({
            "background-color": "#ddd",
            "border-bottom": "1px solid #b8b8b8"
        });

        var deleteCount = this.tabNum - this.tabCount + 1;
        $("#tabBtn" + tabNumber).css({
            "background-color": "#fff",
            "border-bottom": "none"
        });
        this.currentTab = "tab" + tabNumber;

        if ($("#" + TAB.currentTab).hasClass("screenShare")) {
            captureElement = $("#" + TAB.currentTab).find("video").get(0);
        } else if ($("#" + TAB.currentTab).hasClass("textbook")) {
            captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
        } else {
            captureElement = null;
        }
        CAPTURE.run(captureElement);

        if (isTeacher) {
            var packet = {
                type: 'add',
                tabNumber: tabNumber
            };
            chattingSocket.emit('tab', packet);
        }

    },
    addTab: function(tabTemplate) {
        // add tab
        var template = $("#" + tabTemplate + "Template").html();
        Mustache.parse(template);
        var newTab = Mustache.render(template, {
            tabNum: this.tabNum,
            textbook: isTeacher ? "<iframe></iframe>" : "<canvas>"
        });
        $("#tabs").append(newTab);

        // add tab button
        this.addTabBnt();

        this.selectTab(this.tabNum);

        var captureElement = null;
        if (tabTemplate === "shareScreen") {
            getScreenId(function(error, sourceId, screen_constraints) {
                navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
                navigator.getUserMedia(screen_constraints, function(stream) {
                    console.log($("#screen" + TAB.currentTab));
                    $("#" + TAB.currentTab).find("video").attr("src", URL.createObjectURL(stream));
                }, function(error) {
                    console.error(error);
                });
            });

            captureElement = $("#" + TAB.currentTab).find("video").get(0);
        } else if (tabTemplate === "textbook") {
            captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
        }
        CAPTURE.run(captureElement);


        LCANVAS.init($("#lcanvas" + this.tabNum));

        if (isTeacher) {
            var packet = {
                type: 'add',
                tabTemplate: tabTemplate
            };
            chattingSocket.emit('tab', packet);
        }
    },
    addTabBnt: function() {
        var tabBtn = $("#tabBtnTemplate").html();
        Mustache.parse(tabBtn);
        var newTabBtn = Mustache.render(tabBtn, {
            tabNum: this.tabNum
        });
        $("#plusTab").before(newTabBtn);
    },
    deleteTab: function(tabNumber) {
        $("#tabBtn" + tabNumber).remove();
		$("#tab" + tabNumber).remove();

        this.tabCount--;

        if ($("#tabNav").children().length == 1) {
            return;
        } else if ($("#tabNav").children().length == 10) {
			$("#plusTab").css("display", "block");
		}

        if (this.currentTab === "tab" + tabNumber) {
            this.selectTab($(".tabBtn").eq(0).val());
        }

        if (isTeacher) {
            var packet = {
                type: 'add',
                //            tabNum : tabNum
            };
            chattingSocket.emit('tab', packet);
        }
    }
}

var TEXTBOOK = {
    init: function() {
        $("#tabs").on("click", ".layerControl", this.textbookHandler.bind(this));
    },
    textbookHandler: function(event) {

        var button = $(event.target).attr("class");
        var layerControl = $(event.currentTarget);
        if (button === "getTextbook") {
            var url = layerControl.find("input").val();
            if (url) {
                var iframe = layerControl.parent().find("iframe");
                this.getTextBook(iframe, url);
            } else {
                alert("url을 입력해주세요.");
            }
        }
    },
    getTextBook: function(iframe, url) {
        iframe.attr("src", url);
    }
}

// Service code
$(window).on("load", function() {
    sendInitPacket();

    backgroundFileUploadElement = document.createElement("INPUT");
    backgroundFileUploadElement.setAttribute("type", "file");
    backgroundFileUploadElement.addEventListener("change", LCANVAS.handleBackgroundFiles, false);
});

$(document).on("ready", function() {
    TAB.init();
    TEXTBOOK.init();
    MENU.init();
});