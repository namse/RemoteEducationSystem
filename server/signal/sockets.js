var socketIO = require('socket.io'),
    uuid = require('node-uuid'),
    crypto = require('crypto');

module.exports = function(server, config) {
    var io = socketIO.listen(server);

    if (config.logLevel) {
        // https://github.com/Automattic/socket.io/wiki/Configuring-Socket.IO
        io.set('log level', config.logLevel);
    }

    io.sockets.on('connection', function(client) {
        console.log("client : " +
            client.id);
        client.resources = {
            screen: false,
            video: true,
            audio: false
        };

        // pass a message to another id
        client.on('message', function(details) {
            console.log("m : " + JSON.stringify(details) + "\n");
            if (!details) return;

            var otherClient = io.sockets.adapter.nsp.connected[details.to];
            console.log("other client : " + otherClient);
            if (!otherClient) return;

            details.from = client.id;
            otherClient.emit('message', details);
        });

        client.on('join', join);

        function removeFeed(type) {
            if (client.room) {
                io.sockets.in(client.room).emit('remove', {
                    id: client.id,
                    type: type
                });
                if (!type) {
                    client.leave(client.room);
                    client.room = undefined;
                }
            }
        }

        function join(name, cb) {
            // sanity check
            if (typeof name !== 'string') return;
            // check if maximum number of clients reached
            if (config.rooms && config.rooms.maxClients > 0 &&
                clientsInRoom(name) >= config.rooms.maxClients) {
                safeCb(cb)('full');
                return;
            }
            // leave any existing rooms
            removeFeed();
            safeCb(cb)(null, describeRoom(name));
            client.join(name, function(err) {
                console.log("is join successful?");
                console.log(err);
                console.log(client.rooms);
            });
            client.room = name;
        }

        // we don't want to pass "leave" directly because the
        // event type string of "socket end" gets passed too.
        client.on('disconnect', function() {
            console.log("all Rooms : " + client.rooms + '\n');
            removeFeed();
        });
        client.on('leave', function() {
            removeFeed();
        });

        client.on('create', function(name, cb) {
            if (arguments.length == 2) {
                cb = (typeof cb == 'function') ? cb : function() {};
                name = name || uuid();
            } else {
                cb = name;
                name = uuid();
            }
            // check if exists
            if (io.sockets.adapter.rooms[name]) {
                safeCb(cb)('taken');
            } else {
                join(name);
                safeCb(cb)(null, name);
            }
        });

        // support for logging full webrtc traces to stdout
        // useful for large-scale error monitoring
        client.on('trace', function(data) {});


        // tell client about stun and turn servers and generate nonces
        client.emit('stunservers', config.stunservers || []);

        // create shared secret nonces for TURN authentication
        // the process is described in draft-uberti-behave-turn-rest
        var credentials = [];
        config.turnservers.forEach(function(server) {
            var hmac = crypto.createHmac('sha1', server.secret);
            // default to 86400 seconds timeout unless specified
            var username = Math.floor(new Date().getTime() / 1000) + (server.expiry || 86400) + "";
            hmac.update(username);
            credentials.push({
                username: username,
                credential: hmac.digest('base64'),
                url: server.url
            });
        });
        //client.emit('turnservers', credentials);
    });


    function describeRoom(name) {
        var room = io.sockets.adapter.rooms[name];
        var result = {
            clients: {}
        };
        if (room) {
            for (var id in room) {
                var client = io.sockets.adapter.nsp.connected[id];
                result.clients[id] = client.resources;
            }
        }
        return result;
    }

    function clientsInRoom(name) {
        var room = io.sockets.adapter.rooms[name];
        if (room) {
            var length = Object.keys(room).length;
            return length;
        } else {
            return 0;
        }

    }
};

function safeCb(cb) {
    if (typeof cb === 'function') {
        return cb;
    } else {
        return function() {};
    }
}