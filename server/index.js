var express = require('express');
var app = express();
var PORT = 1234;
var https = require('https');
var url = require('url');
var socketio = require('socket.io');
var fs = require('fs');
var signal = require('./signal/server');
var path = require('path');
var credentials = {
    key: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.private.pem'),
    cert: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.public.pem'),
    ca: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.pfx'),
    requestCert: true,
    rejectUnauthorized: false
};
var session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var mkdirp = require('mkdirp');
var config = require('getconfig');

//app.use("/test", require('express').static(__dirname.replace('server', 'testClient')));
app.use(express.static(__dirname + '/../client/'));
app.set('views', __dirname + '/../client/');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// Use express-session middleware for express
app.use(session);

// const value
var STUDENTS = 'students';
var TEACHER = 'teacher';



// display part
///////////////////////////////

app.set('port', PORT);
// routes ======================================================================
require('./routes.js')(app); // load our routes and pass in our app and fully configured passport
// launch ======================================================================
var server = https.createServer(credentials, app);
var io = socketio.listen(server); // io for chatting

// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedsession(session, {
    autoSave: true
}));

server.listen(app.get('port'));


// sockets
// [roomID]
// ['teacher' or 'students']  
// 주의 : 선생은 오직 1명.

var sockets = {};
io.on('connection', function(socket) {
    console.log(socket.handshake.session);
    var roomID = socket.handshake.session.roomID;
    var isTeacher = socket.handshake.session.isTeacher;
    var userName = socket.handshake.session.userName;

    console.log("socket " + socket.id + " connected");
    if (!!!sockets[roomID]) {
        sockets[roomID] = {
            'teacher': null,
            'students': []
        };
    }
    if (isTeacher) {
        if (sockets[roomID][TEACHER] && sockets[roomID][TEACHER] != socket) {
            console.log("ERROR : teacher duplication, socket : " + socket);
        }
        sockets[roomID][TEACHER] = socket;
    } else {
        if (sockets[roomID][STUDENTS].indexOf(socket) >= 0) {
            console.log("ERROR : student duplication, socket : " + socket);
        }
        sockets[roomID][STUDENTS].push(socket);
    }

    socket.join(roomID); // for chatting broadcasting.

    console.log(socket.handshake.session.userData);
    console.log(socket.id + " is teacher? : " + isTeacher);

    var sendFileList = function() {
        fs.readdir(path.join(config.uploadDirectory, "class", roomID), function(err, classFiles) {
            fs.readdir(path.join(config.uploadDirectory, "personal", userName), function(err, personalFiles) {
                var packet = {
                    type: "fileList",
                    data: {
                        personal: personalFiles,
                        class: classFiles
                    }
                };
                socket.emit('file', packet);
            });
        });
    }

    socket.on('chat', function(msg) {
        console.log(msg);
        socket.broadcast.to(roomID).emit('chat', msg);
    });

    socket.on('draw', function(data) {

        // packet : 'draw'
        // -- type
        // -- content depended by type

        if (isTeacher) {
            sockets[roomID][STUDENTS].map(function(studentSocket) {
                studentSocket.emit('draw', data);
            });
        } else {
            console.log("[" + socket.id + "]ERROR DRAW : you are not teacher!");
        }

    });

    socket.on('disconnect', function() {
        if (isTeacher) {
            if (sockets[roomID][TEACHER] == socket) {
                sockets[roomID][TEACHER] = null;
            } else {
                console.log("[" + socket.id + "]ERROR DISCONNECT : room " + roomID + "\'s teacher is not me! \n\nI : " + socket + "\n\n\n and that teacher socket : " +
                    sockets[roomID][TEACHER]);
            }
        } else {
            var index = sockets[roomID][STUDENTS].indexOf(socket);
            if (index < 0) {
                console.log("[" + socket.id + "]ERROR DISCONNECT : find index fail");
            } else {
                sockets[roomID][STUDENTS].splice(index, 1);
                console.log("socket " + socket.id + " Disconnect Success~ bye! ");
            }
        }
    });

    socket.on('tab', function(data) {

        // packet : 'tab'
        // -- type
        // -- content depended by type

        if (isTeacher) {
            sockets[roomID][STUDENTS].map(function(studentSocket) {
                studentSocket.emit('tab', data);
            });
        } else {
            console.log("[" + socket.id + "]ERROR DRAW : you are not teacher!");
        }
    });

    socket.on('file', function(data) {
        if (data.type === "upload") {
            if (data.destination === 'class' || data.destination === 'personal') {
                var filePath;
                if (data.destination === 'class') {
                    filePath = path.join(UPLOADFILE, data.destination, roomID);
                } else if (data.destination === 'personal') {
                    filePath = path.join(UPLOADFILE, data.destination, userName);
                }
                mkdirp(filePath, function(err) {
                    if (err) {
                        console.error(err)
                    } else {
                        fs.writeFile(path.join(filePath, data.fileName), data.file, function(error) {
                            if (error) {
                                console.log("ERROR FILE : file write error! - " + error);
                            } else {
                                sendFileList();
                            }
                        });
                    }
                });
            } else {
                console.log("ERROR FILE : wrong destination - " + data);
            }
        } else if (data.type === 'fileList') {
            sendFileList();
        }
    });
});

signal(credentials);