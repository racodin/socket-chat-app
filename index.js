const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

// Routing
app.use( express.static( path.join(__dirname, 'public') ) );

// Chatting
let users = 0;
io.on('connection', ( socket ) => {
    let activeUser = false;

    // 클라이언트에서 새로운 메세지가 오면 실행한다.
    socket.on('new message', ( msg ) => {
        // 새로운 메세지를 클라이언트에게 알려준다.
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: msg
        });
    });

    // 클라이언트에서 사용자가 추가되면 실행한다.
    socket.on('add user', ( username ) => {
        if( activeUser ) return;

        // 해당 클라이언트의 소켓 세션에 사용자 이름을 저장한다.
        socket.username = username;
        ++users;
        activeUser = true;
        socket.emit('login', {
            users: users
        });

        // 사용자가 추가되면 전체 클라이언트들에게 알려준다.
        socket.broadcast.emit('join user', {
            username: socket.username,
            users: users
        });
    });

    // 사용자가 타이핑을 시작하면 실행한다.
    socket.on('start typing', () => {
        socket.broadcast.emit('start typing', {
            username: socket.username
        });
    });

    // 사용자가 타이핑이 멈추면 실행한다.
    socket.on('stop typing', () => {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // 사용자가 연결을 끊으면 실행한다.
    socket.on('disconnect', () => {
        if( activeUser ){
            --users;

            // 사용자가 나가면 전체 클라이언트에게 알려준다.
            socket.broadcast.emit('left user', {
                username: socket.username,
                users: users
            });
        }
    });
});
