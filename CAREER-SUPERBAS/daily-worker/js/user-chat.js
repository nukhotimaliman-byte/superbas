/**
 * BAS User Chat — Chat page for candidates
 * Uses shared ChatEngine from bas-chat.js
 */
const UserChat = (() => {
    let _inited = false;
    let _userId = null;

    // Dummy messages for user-side
    const DUMMY_MSGS = [
        {id:1, sender_type:'admin', sender_name:'Admin BAS', message_type:'text', message:'Selamat datang di Super-BAS! Ada yang bisa kami bantu?', created_at:'2026-05-10 09:00:00', is_read:1},
        {id:2, sender_type:'user', sender_name:'Anda', message_type:'text', message:'Halo admin, saya mau tanya soal jadwal interview', created_at:'2026-05-10 09:05:00', is_read:1},
        {id:3, sender_type:'admin', sender_name:'Admin BAS', message_type:'text', message:'Jadwal interview akan kami informasikan melalui pesan ini. Mohon standby dan pastikan data pemberkasan sudah lengkap.', created_at:'2026-05-10 09:06:00', is_read:1},
        {id:4, sender_type:'admin', sender_name:'Admin BAS', message_type:'text', message:'Untuk info lengkap, cek link ini https://super-bas.com/daily-worker/berkas', created_at:'2026-05-10 09:07:00', is_read:1},
    ];

    let _messages = [...DUMMY_MSGS];

    function init() {
        if (_inited) return;
        _inited = true;

        var container = document.getElementById('userChatContainer');
        if (!container) return;

        // Get user data
        var ud = null;
        try { ud = JSON.parse(localStorage.getItem('dw_user') || 'null'); } catch(e){}
        _userId = ud ? ud.id : 999;
        var userName = ud ? ud.name : 'Kandidat';

        container.innerHTML =
            '<div class="chat-user-wrap">' +
                '<div class="chat-messages" id="userChatMsgs" style="height:calc(100% - 56px);"></div>' +
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
        ChatEngine.renderMessages(_messages, false);

        // Init swipe
        var msgsEl = document.getElementById('userChatMsgs');
        if (msgsEl) ChatEngine.initSwipeReply(msgsEl);
    }

    function send() {
        var input = document.getElementById('userChatInput');
        if (!input) return;
        var text = input.value.trim();
        if (!text) return;

        var maxId = _messages.reduce(function(m,x){return Math.max(m,x.id);},0);
        var newMsg = {
            id: maxId+1, sender_type:'user', sender_name:'Anda',
            message_type:'text', message:text, is_read:0,
            created_at: new Date().toISOString().replace('T',' ').substring(0,19),
            reply_to_id: ChatEngine.getReplyTo()?.id || null,
            reply_preview: ChatEngine.getReplyTo() || null,
        };
        _messages.push(newMsg);
        ChatEngine.renderMessages([newMsg], true);
        ChatEngine.clearReply();
        input.value = '';
        input.style.height = 'auto';

        // Simulate auto-reply after 1.5s
        setTimeout(function() {
            var autoId = _messages.reduce(function(m,x){return Math.max(m,x.id);},0)+1;
            var autoMsg = {
                id: autoId, sender_type:'admin', sender_name:'Admin BAS',
                message_type:'text', message:'Pesan Anda sudah diterima. Admin akan segera merespon.',
                is_read:0, created_at: new Date().toISOString().replace('T',' ').substring(0,19),
            };
            _messages.push(autoMsg);
            ChatEngine.renderMessages([autoMsg], true);
        }, 1500);
    }

    function autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }

    function triggerFile() { document.getElementById('userFileInput').click(); }

    function onFile(input) {
        if (!input.files[0]) return;
        var file = input.files[0];
        var maxId = _messages.reduce(function(m,x){return Math.max(m,x.id);},0);
        var isImg = file.type.startsWith('image/');
        var msg = {
            id: maxId+1, sender_type:'user', sender_name:'Anda',
            message_type: isImg ? 'image' : 'file', message:'',
            file_name: file.name, file_size: file.size,
            file_path: isImg ? URL.createObjectURL(file) : '#',
            is_read:0, created_at: new Date().toISOString().replace('T',' ').substring(0,19),
        };
        _messages.push(msg);
        ChatEngine.renderMessages([msg], true);
        input.value = '';
    }

    function sendLoc() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function(pos) {
            var maxId = _messages.reduce(function(m,x){return Math.max(m,x.id);},0);
            var msg = {
                id: maxId+1, sender_type:'user', sender_name:'Anda',
                message_type:'location', message:'Lokasi saya',
                latitude: pos.coords.latitude, longitude: pos.coords.longitude,
                is_read:0, created_at: new Date().toISOString().replace('T',' ').substring(0,19),
            };
            _messages.push(msg);
            ChatEngine.renderMessages([msg], true);
        });
    }

    return { init, send, autoResize, triggerFile, onFile, sendLoc };
})();
