const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('an user connected');
    socket.on('chat message', function (msg) {
        // console.log('message: ' + msg);
        io.emit('chat message', msg);
    });
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.broadcast.emit('hi');
});

io.emit('some event', { for: 'everyone' });

http.listen(3000, function () {
    console.log('listening on *:3000');
});