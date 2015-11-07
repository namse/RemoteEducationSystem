var express = require('express');
var app = express();
var PORT = 1234;
var https = require('https');
var url = require('url');
var socketio = require('socket.io');
var fs = require('fs');
var signal = require('./signal/server');
var ss = require('socket.io-stream');
var credentials = {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.crt'),
    ca: fs.readFileSync('./ssl/ca.crt'),
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
    if (socketA == null) {
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
        socket.broadcast.emit('draw', data);
    });
    socket.on('disconnect', function() {

    });
    ss(socket).on('background', function(stream, data) {
        console.log(data);
        var targetSocket = null;
        if (socket == socketA) {
            targetSocket = socketB;
        } else if (socket == socketB) {
            targetSocket = socketA;
        }
        if (targetSocket != null) {
            ss(targetSocket).emit('background', stream);
        }
    });

    socket.on('disconnect', function() {
        if (socketA == socket) {
            socketA = null;
        } else if (socketB == socket) {
            socketB = null;
        }
    });
});

signal(credentials);