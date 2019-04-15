$(function () {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];

    var $window = $(window);
    var $usernameInput = $('.usernameInput');
    var $messages = $('.messages');
    var $inputMessage = $('.inputMessage');

    var $loginPage = $('.login.page');
    var $chatPage = $('.chat.page');

    var username;
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();

    var socket = io();

    // 현재 참가중인 사용자에 대한 로그
    const addParticipantsMessage = (data) => {
        var message = '';
        if (data.users === 1) {
            message += "there's 1 participant";
        } else {
            message += "there are " + data.users + " participants";
        }
        log(message);
    }

    // 클라이언트의 사용자 이름을 설정
    const setUsername = () => {
        username = cleanInput($usernameInput.val().trim());

        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();

            // 서버에 사용자 이름을 알려준다.
            socket.emit('add user', username);
        }
    }

    // 서버에 채팅 메세지를 보낸다.
    const sendMessage = () => {
        var message = $inputMessage.val();
        message = cleanInput(message);

        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // 서버에 새로운 메세지를 실행하도록 한다.
            socket.emit('new message', message);
        }
    }

    // 채팅방의 기록들을 보여준다.
    const log = (message, options) => {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }

    // 메세지 목록에 새로운 메세지를 추가한다.
    const addChatMessage = (data, options) => {
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }

        var $usernameDiv = $('<span class="username"/>')
            .text(data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
            .text(data.message);

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
            .data('username', data.username)
            .addClass(typingClass)
            .append($usernameDiv, $messageBodyDiv);

        addMessageElement($messageDiv, options);
    }

    // 메세지 입력이 시작되면 실행
    const addChatTyping = (data) => {
        data.typing = true;
        data.message = 'is typing';
        addChatMessage(data);
    }

    // 메세지 입력이 끝나면 실행
    const removeChatTyping = (data) => {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }

    // 메세지에 마크업 문법을 추가하여 목록에 추가
    const addMessageElement = (el, options) => {
        var $el = $(el);

        // 기본 옵션 설정
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }

        // 옵션 적용
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }

    // 입력내용에 마크업 문법을 제거
    const cleanInput = (input) => {
        return $('<div/>').text(input).html();
    }

    // 타이핑 이벤트 감지
    const updateTyping = () => {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('start typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(() => {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // 메세지 입력중이라는 메세지를 받는다.
    const getTypingMessages = (data) => {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }

    // 해시 함수를 통해 사용자 이름의 색상을 가져온다.
    const getUsernameColor = (username) => {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    // 키보드 이벤트
    $window.keydown(event => {
        // 키 입력시 자동으로 입력박스에 포커스
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // 엔터키를 누르면 실행
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });

    $inputMessage.on('input', () => {
        updateTyping();
    });

    // 클릭 이벤트
    // 로그인 페이지의 아무 곳이나 클릭하면 포커스
    $loginPage.click(() => {
        $currentInput.focus();
    });

    // 메세지 입력의 테두리를 클릭하면 포커스
    $inputMessage.click(() => {
        $inputMessage.focus();
    });


    // 소켓 이벤트
    // 서버에 로그인을 알려줄때 로그에 알려준다.
    socket.on('login', (data) => {
        connected = true;
        // Display the welcome message
        var message = "Welcome to Socket.IO Chat – ";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });

    // 서버가 새로운 메세지를 보낼때마다 알려준다.
    socket.on('new message', (data) => {
        addChatMessage(data);
    });

    // 서버가 새로운 사용자가 들어올때마다 알려준다.
    socket.on('join user', (data) => {
        log(data.username + ' joined');
        addParticipantsMessage(data);
    });

    // 서버가 사용자가 나갈때마다 알려준다.
    socket.on('left user', (data) => {
        log(data.username + ' left');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });

    // 서버가 사용자 타이핑중인지 알려준다.
    socket.on('start typing', (data) => {
        addChatTyping(data);
    });

    // 서버가 사용자 타이핑을 끝냈는지 알려준다.
    socket.on('stop typing', (data) => {
        removeChatTyping(data);
    });

    // 사용자가 채팅에서 떠나면 실행
    socket.on('disconnect', () => {
        log('you have been disconnected');
    });

    // 사용자가 다시 채팅에 참여하면 실행
    socket.on('reconnect', () => {
        log('you have been reconnected');
        if (username) {
            socket.emit('add user', username);
        }
    });

    // 사용자가 다시 채팅에 참여했지만 실패할경우
    socket.on('reconnect_error', () => {
        log('attempt to reconnect has failed');
    });

});