var express = require('express');
var app = express();
var PORT = 1234;
var https = require('https');
var url = require('url');
var socketio = require('socket.io');
var fs = require('fs');
var signal = require('./signal/server');
var credentials = {
    key: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.private.pem'),
    cert: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.public.pem'),
    ca: fs.readFileSync('./ssl/6de8b18d-643f-4bf9-97b9-c1686765013c.pfx'),
    requestCert: true,
    rejectUnauthorized: false
};

//app.use("/test", require('express').static(__dirname.replace('server', 'testClient')));
app.use(express.static(__dirname + '/../client/'));
app.set('views', __dirname + '/../client/');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// display part
///////////////////////////////

app.set('port', PORT);
// routes ======================================================================
require('./routes.js')(app); // load our routes and pass in our app and fully configured passport
// launch ======================================================================
var server = https.createServer(credentials, app);
var io = socketio.listen(server); // io for chatting

server.listen(app.get('port'));

//temp
var socketA, socketB;
socketA = socketB = null;

io.on('connection', function(socket) {
    console.log(socket.id);
    if (socketA === null) {
        socketA = socket;
    } else {
        socketB = socket;
    }
    socket.on('chat', function(msg) {
        console.log(msg);
        socket.broadcast.emit('chat', msg);
        // TODO : send msg to same room
    });

    socket.on('draw', function(data) {

        // packet : 'draw'
        // -- type
        // -- content depended by type

        console.log(data);
        var targetSocket = null;
        if (socket === socketA) {
            targetSocket = socketB;
        } else if (socket === socketB) {
            targetSocket = socketA;
        }
        if (targetSocket !== null) {
            targetSocket.emit('draw', data);
        }

    });

    socket.on('disconnect', function() {
        if (socketA === socket) {
            socketA = null;
        } else if (socketB === socket) {
            socketB = null;
        }
    });

    socket.on('tab', function(data) {

        // packet : 'tab'
        // -- type
        // -- content depended by type

        console.log(data);
        var targetSocket = null;
        if (socket === socketA) {
            targetSocket = socketB;
        } else if (socket === socketB) {
            targetSocket = socketA;
        }
        if (targetSocket !== null) {
            targetSocket.emit('tab', data);
        }
    });
});

signal(credentials);