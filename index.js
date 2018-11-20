var os = require('os');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const num_recent_messages = 30;

var recent_messages = [];

app.use(express.static('public'))
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/private-chat', function(req, res){
    res.sendFile(__dirname + '/private-chat.html');
});

io.on('connection', function(socket){
    socket.emit('recent messages', recent_messages);

    socket.on('chat message', function(msg){
        msg_obj = {
            username: msg.username, content: msg.content
        };

        io.emit('chat message', msg_obj);
        recent_messages.push(msg_obj);
        
        if (recent_messages.length > num_recent_messages) {
            recent_messages.shift();
        }


    });
    // convenience function to log server messages on the client
    function log() {
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('message', function(message) {
        log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);
    });

    socket.on('create or join', function(room) {
        log('Received request to create or join room ' + room);

        var clientsInRoom = io.sockets.adapter.rooms[room];
        var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log('Room ' + room + ' now has ' + numClients + ' client(s)');

        if (numClients === 0) {
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room);
            socket.emit('created', room, socket.id);
        } else if (numClients === 1) {
            log('Client ID ' + socket.id + ' joined room ' + room);
            // io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready', room);
            socket.broadcast.emit('ready', room);
        } else { // max two clients
            socket.emit('full', room);
        }
    });

    socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              socket.emit('ipaddr', details.address);
            }
          });
        }
    });

    socket.on('disconnect', function(reason) {
        console.log(`Peer or server disconnected. Reason: ${reason}.`);
        socket.broadcast.emit('bye');
    });

    socket.on('bye', function(room) {
        console.log(`Peer said bye on room ${room}.`);
    });
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
