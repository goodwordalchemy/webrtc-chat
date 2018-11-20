var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

const num_recent_messages = 30;

var recent_messages = [];

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.emit('recent messages', recent_messages);

    socket.on('chat message', function(msg){
        msg_obj = {content: msg};
        io.emit('chat message', msg_obj);
        recent_messages.push(msg_obj);
        
        if (recent_messages.length > num_recent_messages) {
            recent_messages.shift();
        }


    });
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
