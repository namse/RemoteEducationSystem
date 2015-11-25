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
var documentFileUploadElement;
var documentFile;
var dialog
var currentMousePointer = {
    x: 0,
    y: 0
};

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


        loadChatting();
    }).done(function() {
        if (isTeacher) {
            TAB.init();
            TEXTBOOK.init();
            MENU.init();
            CAPTURE.init();

            chromeExtensionInstallDetect(chromeExtensionHandler, "ajhifddimkapgcifgcodmmfdlknahffk"); // screen.js
            chromeExtensionInstallDetect(chromeExtensionHandler, "ofmiomhdbekpmpbbeamioeohonddlbkm"); // scrren capture for iframe
        }
        loadWebRTC();

    }).fail(function() {
        alert("error");
    });
}

function chromeExtensionInstallDetect(callback, extensionid) {

    if (!!navigator.mozGetUserMedia) return callback({
        type: 'not-chrome',
        extensionid: extensionid
    });

    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function() {
        setTimeout(function() {
            if (!DetectRTC.screen.notInstalled) {
                callback({
                    type: 'installed-enabled',
                    extensionid: extensionid
                });
            }
        }, 2000);
    };
    image.onerror = function() {
        DetectRTC.screen.notInstalled = true;
        callback({
            type: 'not-installed',
            extensionid: extensionid
        });
    };
}


function chromeExtensionHandler(param) {
    if (param.type === 'not-chrome') {
        alert("Oups!\nSorry, We Only Support the Chrome Browser.");
    } else if (param.type === 'not-installed') {
        if (window.confirm("Chrome Extension Dosen't Installed.Please Install.")) {
            window.location.href = "https://chrome.google.com/webstore/detail/currenttabcaptureextensio/" + param.extensionid;

        }
    } else if (param.type === 'installed-enabled') {
        // cool.

    }
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

        // TODO: video 두개로 만들기 테스트 해주세요.
        // isTeacher는 맞게 들어오는 것 같습니다.
        var localVideo = "studentVideo";
        var remoteVideo = "teacherVideo";
        if (isTeacher) {
            localVideo = "teacherVideo";
            remoteVideo = "studentVideo";
        }
        webRTC = new SimpleWebRTC({
            // the id/element dom element that will hold "our" video
            localVideoEl: localVideo,
            // the id/element dom element that will hold remote videos
            remoteVideosEl: remoteVideo,
            // immediately ask for camera access
            autoRequestMedia: true,
            url: webRTCSignalServerURL,
            connection: webRTCSocket,
            media: {
                audio: true,
                video: true
                //audio: DetectRTC.hasMicrophone,
                //video: DetectRTC.hasWebcam
            },
            peerConnectionConfig: {
                iceServers: [{
                    "url": "stun:61.38.158.151:3478"
                }]
            }
        });


        // we have to wait until it's ready
        webRTC.on('readyToCall', function() {
            // you can name it anything
            webRTC.joinRoom(roomID);


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
                TAB.deleteTab(packet.tabNumber);
            }
        });

        chattingSocket.on('draw', function(data) {

            // packet : 'draw'
            // - type
            // - tab
            // - content that defended on type.
            var lc = LCANVAS.lcanvases[data.tab];
            if (lc) {
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
                    // **** we need DataURI. **** 
                    if ($("#" + data.tab).hasClass("shareScreen")) {
                        $("#" + TAB.currentTab).get(0).style.backgroundImage = "url(" + data.image + ")";
                        $("#" + TAB.currentTab).get(0).style.backgroundPosition = "center center";
                        $("#" + TAB.currentTab).get(0).style.backgroundRepeat = "no-repeat";
                        $("#" + TAB.currentTab).get(0).style.backgroundSize = "contain";
                    } else {
                        var image = new Image();
                        image.src = data.image;
                        lc.backgroundShapes = [LC.createShape(
                            'Image', {
                                image: image
                            })];
                        lc.repaintLayer('background', false);
                    }

                } else {
                    console.log(data);
                }
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
        .text(data.userName);
    var $messageBodyDiv = $('<div class="messageBody">')
        .text(data.message)
        .css('background-color', getUsernameColor(data.userName));

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
        .data('userName', data.userName)
        .addClass(typingClass)
        .append($usernameDiv, $('<br>'), $messageBodyDiv);

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

    $(".head").click(function() {
        if ($(this).hasClass("chatHead") && $(this).hasClass("headDeselected")) {
            $(this).removeClass("headDeselected");
            $(this).addClass("headSelected");
            $(".documentHead").removeClass("headSelected");
            $(".documentHead").addClass("headDeselected");

            $(".chatArea").show();
            $(".documentArea").hide();
        } else if ($(this).hasClass("documentHead") && $(this).hasClass("headDeselected")) {
            $(this).removeClass("headDeselected");
            $(this).addClass("headSelected");
            $(".chatHead").removeClass("headSelected");
            $(".chatHead").addClass("headDeselected");

            $(".chatArea").hide();
            $(".documentArea").show();
        }
    });

    $("#uploadBtn").click(function() {
        documentFileUploadElement.click();
    });
    document.querySelector('#personalStorageUploadBtn').onclick = function() {
        console.log(documentFile);
        documentFileUpload(documentFile, "personal");
        dialog.close();
    };

    document.querySelector('#classStorageUploadBtn').onclick = function() {
        console.log(documentFile);
        documentFileUpload(documentFile, "class");
        dialog.close();
    };

    document.querySelector('#storageUploadCancelBtn').onclick = function() {
        dialog.close();
    };

}

function onDocumentFileUploadReady() {
    documentFile = this.files[0];
    document.querySelector('#uploadFileName').innerHTML = documentFile.name;
    dialog.showModal();
}

function documentFileUpload(file, destination) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var packet = {
            type: 'upload',
            destination: destination,
            file: e.target.result
        };
        chattingSocket.emit('file', packet);
    }
    reader.readAsDataURL(file);
}

var MENU = {
    isMuted: false,
    isCameraPause: false,
    isCanvas: true,
    init: function() {
        $("#changeLayer").on("click", this.layerControl.bind(this));
    },
    soundControl: function() {

    },
    cameraControl: function() {

    },
    layerControl: function(event) {
        var canvas = $("#" + TAB.currentTab).find(".literally");
        if (canvas.css("pointer-events") != "none") {
            canvas.css("pointer-events", "none");
            $(event.target).css("background-image", "url('../image/layer_off.png')");
        } else {
            canvas.css("pointer-events", "auto");
            $(event.target).css("background-image", "url('../image/layer_on.png')");
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

    screenCapturePeriod: 100, //ms
    capturer: {}, // key : element(dom), value : timer
    iframeCaptureRectObject: null, // init by initIframeRectObject()
    tempCanvas: document.createElement('canvas'),
    init: function() {
        // for iframe
        document.addEventListener("captureResponseEvent", function(e) {
            console.log(e.detail.data);

            // dataurl -> img
            var img = new Image();
            img.src = e.detail.data;
            if (!!!CAPTURE.iframeCaptureRectObject) {
                console.log("CAPTURE.iframeCaptureRectObject is null!");
            }

            //img to ctx
            var ctx = CAPTURE.tempCanvas.getContext('2d');
            ctx.drawImage(img, -(CAPTURE.iframeCaptureRectObject.left), -(CAPTURE.iframeCaptureRectObject.top)); //, -(CAPTURE.iframeCaptureRectObject.left), -(CAPTURE.iframeCaptureRectObject.top));
            // mouse pointer draw
            ctx.beginPath();
            ctx.arc(currentMousePointer.x - CAPTURE.iframeCaptureRectObject.left,
                currentMousePointer.y - CAPTURE.iframeCaptureRectObject.top,
                3, 0, 2 * Math.PI);
            ctx.stroke();

            document.getElementById("imimg").src = CAPTURE.tempCanvas.toDataURL();
            var packet = {
                type: 'background',
                tab: TAB.currentTab,
                image: CAPTURE.tempCanvas.toDataURL()
            };
            chattingSocket.emit('draw', packet);
        });
    },
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

                var captureRequestEvent = new CustomEvent("captureRequestEvent", {
                    detail: {
                        from: "class.js"
                    }
                });
                document.dispatchEvent(captureRequestEvent);

            } else if (element.tagName === 'VIDEO') {
                var frame = captureVideoFrame(element);
                var packet = {
                    type: 'background',
                    tab: TAB.currentTab,
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
                clearInterval(timer);
                this.capturer[element] = null;
            }
        }
    },
    initIframeCaptureRectObject: function(iframe) {
        var iframeLayerControlRectObject = iframe.parentNode.parentNode.getElementsByClassName("layerControl")[0].getBoundingClientRect();
        var iframeContainerRectObject = iframe.parentNode.getBoundingClientRect();
        CAPTURE.iframeCaptureRectObject = {
            top: iframeContainerRectObject.top,
            bottom: iframeLayerControlRectObject.top,
            height: iframeLayerControlRectObject.top - iframeContainerRectObject.top,
            left: iframeContainerRectObject.left,
            right: iframeContainerRectObject.right,
            width: iframeContainerRectObject.width
        };

        console.log(CAPTURE.iframeCaptureRectObject);
        CAPTURE.tempCanvas.width = CAPTURE.iframeCaptureRectObject.width;
        CAPTURE.tempCanvas.height = CAPTURE.iframeCaptureRectObject.height;

    }
}



var LCANVAS = {
    lcanvases: {},
    init: function(canvasDiv) {
        var tools;
        if ($("#" + TAB.currentTab).hasClass("whiteBoard")) {
            tools = this.getCustomCanvasTools(LC);
        } else {
            tools = LC.defaultTools;
        }
        var lc_;
        var currentTab = TAB.currentTab;
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
                            tab: currentTab,
                            shapeJSON: LC.shapeToJSON(data.shape),
                            previousShapeId: data.previousShapeId
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('clear', function() {
                        var packet = {
                            type: 'clear',
                            tab: currentTab
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('undo', function() {
                        var packet = {
                            type: 'undo',
                            tab: currentTab
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('redo', function() {
                        var packet = {
                            type: 'redo',
                            tab: currentTab
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('pan', function(panData) {
                        var packet = {
                            type: 'pan',
                            tab: currentTab,
                            x: panData.x,
                            y: panData.y
                        };
                        chattingSocket.emit('draw', packet);
                    });
                    lc.on('zoom', function(zoomData) {
                        var packet = {
                            type: 'zoom',
                            tab: currentTab,
                            amount: zoomData.newScale
                        };
                        chattingSocket.emit('draw', packet);
                    });
                } else { // else -> student -> receive drawing information
                    // student can't use canvas!
                    // disable literally canvas.
                    canvasDiv.css("pointer-events", "none");
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

                var backgroundImage = new Image();
                backgroundImage.src = e.target.result;

                var packet = {
                    type: 'background',
                    tab: TAB.currentTab,
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
    streams: {}, // key : tab, value : stream
    init: function() {
        $("#tabNav").on("click", ".tabBtn", function(event) {
            var tabButton = $(event.target);
            var currentTab = tabButton.val();
            if (currentTab === "+") {
                if ($("#addTab").hasClass("on")) {
                    $("#addTab").css("display", "none");
                } else {
                    $("#addTab").css("display", "block");
                }
                $("#addTab").toggleClass("on");
            } else {
                this.selectTab(currentTab);
            }

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
        if (isTeacher) {
            var captureElement;
            if ($("#" + TAB.currentTab).hasClass("shareScreen")) {
                captureElement = $("#" + TAB.currentTab).find("video").get(0);
            } else if ($("#" + TAB.currentTab).hasClass("textbook")) {
                captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
            } else {
                captureElement = null;
            }
            CAPTURE.pause(captureElement);
        }

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

        if (isTeacher) {
            if ($("#" + TAB.currentTab).hasClass("shareScreen")) {
                captureElement = $("#" + TAB.currentTab).find("video").get(0);
            } else if ($("#" + TAB.currentTab).hasClass("textbook")) {
                captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
            } else {
                captureElement = null;
            }
            CAPTURE.run(captureElement);

            var packet = {
                type: 'select',
                tabNumber: tabNumber
            };
            chattingSocket.emit('tab', packet);
        }

    },
    addTab: function(tabTemplate) {
        this.tabNum++;
        this.tabCount++;
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
        if (isTeacher) {
            var captureElement = null;
            if (tabTemplate === "shareScreen") {
                getScreenId(function(error, sourceId, screen_constraints) {
                    navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
                    navigator.getUserMedia(screen_constraints, function(stream) {
                        console.log($("#screen" + TAB.currentTab));
                        $("#" + TAB.currentTab).find("video").attr("src", URL.createObjectURL(stream));
                        TAB.streams[TAB.currentTab] = stream;
                    }, function(error) {
                        console.error(error);
                    });
                });

                captureElement = $("#" + TAB.currentTab).find("video").get(0);
            } else if (tabTemplate === "textbook") {
                captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
                if (!!!CAPTURE.iframeCaptureRectObject) {
                    CAPTURE.initIframeCaptureRectObject(captureElement);
                }
            }
            CAPTURE.run(captureElement);
        }


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
        if (isTeacher) {
            var captureElement;
            if ($("#" + TAB.currentTab).hasClass("shareScreen")) {
                captureElement = $("#" + TAB.currentTab).find("video").get(0);
                TAB.streams[TAB.currentTab].stop();
            } else if ($("#" + TAB.currentTab).hasClass("textbook")) {
                captureElement = $("#" + TAB.currentTab).find("iframe").get(0);
            } else {
                captureElement = null;
            }
            CAPTURE.pause(captureElement);
        }

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
                type: 'delete',
                tabNumber: tabNumber
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

    documentFileUploadElement = document.createElement("INPUT");
    documentFileUploadElement.setAttribute("type", "file");
    documentFileUploadElement.addEventListener("change", onDocumentFileUploadReady, false);

    dialog = document.querySelector('dialog');
});

$(document).on("ready", function() {
    initButtons();
    document.addEventListener('mousemove', function(e) {
        currentMousePointer = {
            x: e.clientX,
            y: e.clientY
        }
    });
});