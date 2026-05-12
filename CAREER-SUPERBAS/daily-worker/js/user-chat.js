/**
 * BAS User Chat — Chat page for candidates
 * Uses shared ChatEngine from bas-chat.js
 * Connects to real chat API (api/chat.php)
 */
const UserChat = (() => {
    let _inited = false;
    let _userId = null;
    let _candidateId = null;
    let _messages = [];
    let _pollTimer = null;

    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    function init() {
        if (_inited) return;
        _inited = true;

        var container = document.getElementById('userChatContainer');
        if (!container) return;

        // Get user data
        var ud = null;
        try { ud = JSON.parse(localStorage.getItem('dw_user') || 'null'); } catch(e){}
        _userId = ud ? ud.id : null;

        container.innerHTML =
            '<div class="chat-user-wrap">' +
                '<div class="chat-messages chat-wallpaper" id="userChatMsgs"></div>' +
                '<div class="chat-reply-bar" id="userReplyBar"></div>' +
                '<div class="chat-input-bar" id="userInputBar">' +
                    '<div class="chat-input-actions">' +
                        '<button onclick="UserChat.triggerFile()" title="Lampiran">' + ChatEngine.ICONS.attach + '</button>' +
                        '<button onclick="UserChat.sendLoc()" title="Lokasi">' + ChatEngine.ICONS.location + '</button>' +
                    '</div>' +
                    '<textarea class="chat-input-text" id="userChatInput" rows="1" placeholder="Ketik pesan..." oninput="UserChat.autoResize(this)"></textarea>' +
                    '<button class="chat-input-send" onclick="UserChat.send()">' + ChatEngine.ICONS.send + '</button>' +
                    '<input type="file" id="userFileInput" style="display:none" onchange="UserChat.onFile(this)" accept="image/*,.pdf,.doc,.docx">' +
                '</div>' +
            '</div>';

        ChatEngine.init({candidateId: _userId, role: 'user', container: container});

        // Load real messages from API
        _loadHistory();
    }

    async function _loadHistory() {
        if (!_userId) { _showEmpty(); return; }

        try {
            // First get candidate_id from user
            var authR = await fetch('./api/user-auth.php?action=check', {credentials:'same-origin'});
            var authD = await authR.json();
            if (!authD || !authD.user) { _showEmpty(); return; }

            var candR = await fetch('./api/candidates.php?user_id=' + authD.user.id);
            var candD = await candR.json();
            if (!candD || !candD.candidate) { _showEmpty(); return; }

            _candidateId = candD.candidate.id;

            // Fetch chat history
            var r = await fetch('./api/chat.php?action=history&candidate_id=' + _candidateId, {credentials:'same-origin'});
            var d = await r.json();

            if (d && d.messages && d.messages.length > 0) {
                _messages = d.messages;
                _renderWithDates(_messages);
                // Mark messages as read
                fetch('./api/chat.php?action=mark_read', {
                    method: 'POST', credentials: 'same-origin',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({candidate_id: _candidateId})
                });
            } else {
                _showEmpty();
            }

            // Start polling for new messages
            _startPoll();

        } catch(e) {
            console.warn('Chat: API error', e);
            _showEmpty();
        }
    }

    function _showEmpty() {
        var area = document.getElementById('userChatMsgs');
        if (area) area.innerHTML = '<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--t3);opacity:.6">' +
            '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            '<span style="font-size:13px;font-weight:500">Belum ada pesan</span>' +
            '<span style="font-size:11px">Kirim pesan ke Admin</span></div>';
    }

    function _renderWithDates(msgs) {
        var chatArea = document.getElementById('userChatMsgs');
        if (!chatArea) return;
        var html = '';
        var lastDate = '';
        msgs.forEach(function(m) {
            var d = m.created_at ? m.created_at.substring(0,10) : '';
            if (d && d !== lastDate) {
                var parts = d.split('-');
                var label = parseInt(parts[2]) + ' ' + MONTHS[parseInt(parts[1])-1] + ' ' + parts[0];
                html += '<div class="chat-date-sep"><span>' + label + '</span></div>';
                lastDate = d;
            }
            html += ChatEngine.renderBubble(m);
        });
        chatArea.innerHTML = html;
        requestAnimationFrame(function() { chatArea.scrollTop = chatArea.scrollHeight; });
    }

    function _startPoll() {
        if (!_candidateId || _pollTimer) return;
        _pollTimer = setInterval(async function() {
            var lastId = _messages.length > 0 ? _messages[_messages.length-1].id : 0;
            try {
                var r = await fetch('./api/chat.php?action=poll&candidate_id=' + _candidateId + '&after_id=' + lastId, {credentials:'same-origin'});
                var d = await r.json();
                if (d && d.messages && d.messages.length > 0) {
                    d.messages.forEach(function(m) { _messages.push(m); });
                    ChatEngine.renderMessages(d.messages, true);
                    // Mark as read
                    fetch('./api/chat.php?action=mark_read', {
                        method: 'POST', credentials: 'same-origin',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({candidate_id: _candidateId})
                    });
                }
            } catch(e) {}
        }, 15000); // Poll every 15s
    }

    async function send() {
        var input = document.getElementById('userChatInput');
        if (!input) return;
        var text = input.value.trim();
        if (!text || !_candidateId) return;

        input.value = '';
        input.style.height = 'auto';

        try {
            var r = await fetch('./api/chat.php?action=send', {
                method: 'POST', credentials: 'same-origin',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    candidate_id: _candidateId,
                    message: text,
                    reply_to_id: ChatEngine.getReplyTo()?.id || null
                })
            });
            var d = await r.json();
            if (d && d.ok) {
                var newMsg = {
                    id: d.id, sender_type:'user', sender_name:'Anda',
                    message_type:'text', message:text, is_read:0,
                    created_at: d.created_at || new Date().toISOString().replace('T',' ').substring(0,19),
                    reply_to_id: ChatEngine.getReplyTo()?.id || null,
                    reply_preview: ChatEngine.getReplyTo() ? JSON.stringify(ChatEngine.getReplyTo()) : null
                };
                _messages.push(newMsg);
                ChatEngine.renderMessages([newMsg], true);
                ChatEngine.clearReply();
            }
        } catch(e) {
            console.warn('Chat send error', e);
        }
    }

    function autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }

    function triggerFile() { document.getElementById('userFileInput').click(); }

    async function onFile(input) {
        if (!input.files[0] || !_candidateId) return;
        var file = input.files[0];

        var fd = new FormData();
        fd.append('candidate_id', _candidateId);
        fd.append('file', file);

        try {
            var r = await fetch('./api/chat.php?action=upload', {
                method: 'POST', credentials: 'same-origin', body: fd
            });
            var d = await r.json();
            if (d && d.ok) {
                var isImg = file.type.startsWith('image/');
                var msg = {
                    id: d.id, sender_type:'user', sender_name:'Anda',
                    message_type: isImg ? 'image' : 'file', message:'',
                    file_name: file.name, file_size: d.file_size || file.size,
                    file_path: d.file_path || '',
                    is_read:0, created_at: new Date().toISOString().replace('T',' ').substring(0,19)
                };
                _messages.push(msg);
                ChatEngine.renderMessages([msg], true);
            }
        } catch(e) { console.warn('Upload error', e); }
        input.value = '';
    }

    function sendLoc() {
        if (!navigator.geolocation || !_candidateId) return;
        navigator.geolocation.getCurrentPosition(async function(pos) {
            try {
                var r = await fetch('./api/chat.php?action=send', {
                    method: 'POST', credentials: 'same-origin',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        candidate_id: _candidateId,
                        message: 'Lokasi saya',
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    })
                });
                var d = await r.json();
                if (d && d.ok) {
                    var msg = {
                        id: d.id, sender_type:'user', sender_name:'Anda',
                        message_type:'location', message:'Lokasi saya',
                        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
                        is_read:0, created_at: d.created_at || new Date().toISOString().replace('T',' ').substring(0,19)
                    };
                    _messages.push(msg);
                    ChatEngine.renderMessages([msg], true);
                }
            } catch(e) {}
        });
    }

    return { init, send, autoResize, triggerFile, onFile, sendLoc };
})();
