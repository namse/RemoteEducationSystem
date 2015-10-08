var express = require('express');
var app = express();
var PORT = 1234;
var https = require('https');
var url = require('url');
var socketio = require('socket.io');
var fs = require('fs');

var credentials = {
	key: fs.readFileSync('./ssl/server.key'),
	cert: fs.readFileSync('./ssl/server.crt'),
	ca: fs.readFileSync('./ssl/ca.crt'),
	requestCert: true,
	rejectUnauthorized: false
};

//app.use("/test", require('express').static(__dirname.replace('server', 'testClient')));
app.use(express.static(__dirname + '/../client'));
app.set('views', __dirname + '/../client');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// display part
///////////////////////////////

app.set('port', PORT);
// routes ======================================================================
require('./routes.js')(app); // load our routes and pass in our app and fully configured passport
// launch ======================================================================
var server = https.createServer(credentials, app);
var io = socketio(server); // io for chatting
server.listen(app.get('port'));

io.on('connection', function(socket) {
	var blah = 'blah';
	socket.on('data', function(data) {

	});
	socket.on('disconnect', function() {

	});
});