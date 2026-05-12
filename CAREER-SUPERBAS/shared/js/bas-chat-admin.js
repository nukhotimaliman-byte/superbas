/**
 * BAS Admin Chat Panel — Connected to Real API
 * Uses chat.php for all data operations
 */
const AdminChat = (() => {
    let _cfg = {};
    let _activeId = null;
    let _conversations = [];
    let _messages = {};
    let _pinnedIds = [];
    let _labels = {};
    let _notes = {};
    let _pollTimer = null;
    let _cannedResponses = [
        {cmd:'/jadwal', text:'Jadwal interview akan diinformasikan melalui pesan ini. Mohon standby.'},
        {cmd:'/lokasi', text:'Lokasi DC dapat dilihat di menu Lokasi DC pada dashboard Anda.'},
        {cmd:'/tolak', text:'Mohon maaf, setelah melalui proses seleksi, kami belum dapat menerima Anda saat ini.'},
        {cmd:'/lulus', text:'Selamat! Anda telah lolos seleksi. Silakan lengkapi pemberkasan Anda.'},
        {cmd:'/berkas', text:'Silakan lengkapi dokumen pemberkasan melalui menu Pemberkasan di dashboard.'},
    ];

    const PROJECT_LABELS = {dw:'DW',driver:'DR',kurir:'KR'};
    const PROJECT_CLASS = {dw:'dw',driver:'driver',kurir:'kurir'};
    const STATUS_COLORS = {
        'Lulus':'background:rgba(34,197,94,.15);color:#22C55E',
        'Tidak Lulus':'background:rgba(239,68,68,.15);color:#EF4444',
        'Sudah Pemberkasan':'background:rgba(56,189,248,.15);color:#38BDF8',
        'Belum Pemberkasan':'background:rgba(249,115,22,.15);color:#F97316',
        'Blacklist':'background:rgba(239,68,68,.2);color:#EF4444',
    };

    function init(config) {
        _cfg = config;
        _cfg.apiBase = _cfg.apiBase || './api/chat.php';
        renderLayout();
        loadConversations();
    }

    function renderLayout() {
        var c = document.getElementById(_cfg.container);
        if (!c) return;
        c.innerHTML =
            '<div class="chat-layout" id="chatLayout">' +
                '<div class="chat-sidebar">' +
                    '<div class="chat-sidebar-header">' +
                        '<input class="chat-search" placeholder="Cari kandidat..." oninput="AdminChat.filterList(this.value)">' +
                    '</div>' +
                    '<div class="chat-conv-list" id="chatConvList"><div style="padding:40px;text-align:center;color:var(--t3);font-size:.75rem">Memuat...</div></div>' +
                '</div>' +
                '<div class="chat-main">' +
                    '<div class="chat-main-empty" id="chatEmpty">' +
                        ChatEngine.ICONS.send +
                        '<span>Pilih percakapan untuk mulai chat</span>' +
                    '</div>' +
                    '<div id="chatActive" style="display:none;flex-direction:column;height:100%">' +
                        '<div class="chat-header" id="chatHeader"></div>' +
                        '<div class="chat-search-bar" id="chatSearchBar">' +
                            '<input placeholder="Cari pesan..." oninput="AdminChat.searchInChat(this.value)">' +
                            '<span class="chat-search-nav" id="chatSearchNav"></span>' +
                            '<button onclick="AdminChat.toggleSearchBar()" style="background:none;border:none;color:var(--t3);cursor:pointer">' + ChatEngine.ICONS.close + '</button>' +
                        '</div>' +
                        '<div class="chat-notes" id="chatNotes" style="display:none">' +
                            '<div class="chat-notes-label">Catatan Internal (tidak terlihat kandidat)</div>' +
                            '<textarea placeholder="Tulis catatan..." oninput="AdminChat.saveNote(this.value)"></textarea>' +
                        '</div>' +
                        '<div class="chat-messages" id="chatMsgs"></div>' +
                        '<div class="chat-reply-bar" id="chatReplyBar"></div>' +
                        '<div style="position:relative">' +
                            '<div class="chat-canned" id="chatCanned"></div>' +
                        '</div>' +
                        '<div class="chat-input-bar" id="chatInputBar" style="position:relative;left:auto;transform:none;max-width:none">' +
                            '<div class="chat-input-actions">' +
                                '<button onclick="AdminChat.triggerFileUpload()" title="Lampiran">' + ChatEngine.ICONS.attach + '</button>' +
                            '</div>' +
                            '<textarea class="chat-input-text" id="chatInput" rows="1" placeholder="Ketik pesan..." oninput="AdminChat.onInputChange(this)"></textarea>' +
                            '<button class="chat-input-send" onclick="AdminChat.send()">' + ChatEngine.ICONS.send + '</button>' +
                            '<input type="file" id="chatFileInput" style="display:none" onchange="AdminChat.onFileSelected(this)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /* ── Load Conversations from API ── */
    async function loadConversations(filter) {
        try {
            var url = _cfg.apiBase + '?action=conversations';
            if (filter) url += '&search=' + encodeURIComponent(filter);
            var r = await fetch(url, {credentials:'same-origin'});
            var d = await r.json();
            if (d && d.conversations) {
                _conversations = d.conversations;
                renderConversationList(filter);
            }
        } catch(e) {
            console.error('[AdminChat] loadConversations error:', e);
        }
    }

    function renderConversationList(filter) {
        var list = document.getElementById('chatConvList');
        if (!list) return;
        var convs = _conversations;

        // Sort: pinned first, then by last_msg_id desc
        convs.sort(function(a,b) {
            var pa = _pinnedIds.indexOf(parseInt(a.candidate_id)) !== -1 ? 0 : 1;
            var pb = _pinnedIds.indexOf(parseInt(b.candidate_id)) !== -1 ? 0 : 1;
            if (pa !== pb) return pa - pb;
            return (b.last_msg_id || 0) - (a.last_msg_id || 0);
        });

        var html = '';
        convs.forEach(function(c) {
            var cid = parseInt(c.candidate_id);
            var isPinned = _pinnedIds.indexOf(cid) !== -1;
            var name = c.candidate_name || 'Kandidat #' + cid;
            var initials = name.split(' ').map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();
            var statusStyle = STATUS_COLORS[c.status] || 'background:var(--bg3);color:var(--t3)';
            var lastMsg = c.last_message || '';
            if (c.last_msg_type === 'image') lastMsg = '📷 Foto';
            if (c.last_msg_type === 'file') lastMsg = '📎 File';
            if (c.last_msg_type === 'location') lastMsg = '📍 Lokasi';
            var unread = parseInt(c.unread_count) || 0;
            var time = c.last_msg_time ? ChatEngine.formatTime(c.last_msg_time) : '';
            var location = [c.kecamatan, c.kabupaten].filter(Boolean).join(', ');

            html += '<div class="chat-conv-item' + (_activeId===cid?' active':'') + (isPinned?' pinned':'') + '" onclick="AdminChat.openChat(' + cid + ')">' +
                (isPinned ? '<span class="chat-conv-pin">PIN</span>' : '') +
                '<div class="chat-conv-avatar">' + initials + '</div>' +
                '<div class="chat-conv-body">' +
                    '<div class="chat-conv-top">' +
                        '<span class="chat-conv-name">' + ChatEngine.escHtml(name) + '</span>' +
                    '</div>' +
                    (location ? '<div class="chat-conv-location">' + ChatEngine.escHtml(location) + '</div>' : '') +
                    (c.status ? '<span class="chat-conv-status" style="' + statusStyle + '">' + c.status + '</span>' : '') +
                    '<div class="chat-conv-preview">' + ChatEngine.escHtml(lastMsg.substring(0,60)) + '</div>' +
                '</div>' +
                '<div class="chat-conv-meta">' +
                    '<span class="chat-conv-time">' + time + '</span>' +
                    (unread > 0 ? '<span class="chat-conv-unread">' + unread + '</span>' : '') +
                '</div>' +
            '</div>';
        });

        if (!html) html = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:.75rem">Tidak ada percakapan</div>';
        list.innerHTML = html;
        updateNavBadge();
    }

    function filterList(val) { loadConversations(val); }

    /* ── Open Chat — Load from API ── */
    async function openChat(candidateId) {
        _activeId = candidateId;
        var conv = _conversations.find(function(c){return parseInt(c.candidate_id)===candidateId;});

        document.getElementById('chatEmpty').style.display = 'none';
        var active = document.getElementById('chatActive');
        active.style.display = 'flex';

        // Header
        var name = conv ? (conv.candidate_name || 'Kandidat') : 'Kandidat #' + candidateId;
        var initials = name.split(' ').map(function(w){return w[0]||'';}).join('').substring(0,2).toUpperCase();
        var location = conv ? [conv.kecamatan, conv.kabupaten].filter(Boolean).join(', ') : '';
        var statusOpts = ['Belum Pemberkasan','Sudah Pemberkasan','Lulus','Tidak Lulus','Blacklist'].map(function(s) {
            return '<option value="'+s+'"'+(conv && s===conv.status?' selected':'')+'>'+s+'</option>';
        }).join('');

        document.getElementById('chatHeader').innerHTML =
            '<div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="AdminChat.goBack()">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
                '<div class="chat-conv-avatar" style="width:36px;height:36px;min-width:36px;font-size:.7rem">' + initials + '</div>' +
            '</div>' +
            '<div class="chat-header-info">' +
                '<div class="chat-header-name">' + ChatEngine.escHtml(name) + '</div>' +
                '<div class="chat-header-detail">' + ChatEngine.escHtml(location) + '</div>' +
            '</div>' +
            '<div class="chat-header-actions">' +
                '<button onclick="AdminChat.toggleSearchBar()" title="Cari">' + ChatEngine.ICONS.search + '</button>' +
                '<button onclick="AdminChat.toggleNotes()" title="Catatan">' + ChatEngine.ICONS.note + '</button>' +
                '<button onclick="AdminChat.togglePin('+candidateId+')" title="Pin">' + ChatEngine.ICONS.pin + '</button>' +
            '</div>';

        // Load messages from API
        var chatMsgs = document.getElementById('chatMsgs');
        if (chatMsgs) chatMsgs.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:.75rem">Memuat pesan...</div>';

        ChatEngine.init({candidateId:candidateId, role:'admin', container:active});

        try {
            var r = await fetch(_cfg.apiBase + '?action=history&candidate_id=' + candidateId, {credentials:'same-origin'});
            var d = await r.json();
            if (d && d.messages) {
                _messages[candidateId] = d.messages;
                ChatEngine.renderMessages(d.messages, false);
                // Mark as read
                fetch(_cfg.apiBase + '?action=mark_read', {
                    method:'POST', credentials:'same-origin',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({candidate_id: candidateId})
                });
                // Update unread in sidebar
                if (conv) conv.unread_count = 0;
                renderConversationList();
            }
        } catch(e) {
            console.error('[AdminChat] openChat error:', e);
            if (chatMsgs) chatMsgs.innerHTML = '<div style="padding:40px;text-align:center;color:var(--t3)">Gagal memuat pesan</div>';
        }

        // Notes
        var noteArea = document.getElementById('chatNotes');
        var ta = noteArea ? noteArea.querySelector('textarea') : null;
        if (ta) ta.value = _notes[candidateId] || '';

        // Mobile: show chat
        var layout = document.getElementById('chatLayout');
        if (layout) layout.classList.add('conv-open');

        // Start polling
        _startPoll(candidateId);
    }

    /* ── Poll for new messages ── */
    function _startPoll(candidateId) {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(async function() {
            if (_activeId !== candidateId) { clearInterval(_pollTimer); return; }
            var msgs = _messages[candidateId] || [];
            var lastId = msgs.length > 0 ? msgs[msgs.length-1].id : 0;
            try {
                var r = await fetch(_cfg.apiBase + '?action=poll&candidate_id=' + candidateId + '&after_id=' + lastId, {credentials:'same-origin'});
                var d = await r.json();
                if (d && d.messages && d.messages.length > 0) {
                    d.messages.forEach(function(m) { msgs.push(m); });
                    _messages[candidateId] = msgs;
                    ChatEngine.renderMessages(d.messages, true);
                    // Mark as read
                    fetch(_cfg.apiBase + '?action=mark_read', {
                        method:'POST', credentials:'same-origin',
                        headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({candidate_id: candidateId})
                    });
                }
            } catch(e) {}
        }, 12000);
    }

    /* ── Send Message via API ── */
    async function send() {
        var input = document.getElementById('chatInput');
        if (!input || !_activeId) return;
        var text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.style.height = 'auto';
        hideCanned();

        try {
            var replyTo = null;
            try { replyTo = ChatEngine.getReplyTo(); } catch(e){}

            var r = await fetch(_cfg.apiBase + '?action=send', {
                method: 'POST', credentials: 'same-origin',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    candidate_id: _activeId,
                    message: text,
                    reply_to_id: replyTo ? replyTo.id : null
                })
            });
            var d = await r.json();
            if (d && d.ok) {
                var newMsg = {
                    id: d.id, sender_type:'admin', sender_name:'Admin BAS',
                    message_type:'text', message:text, is_read:0,
                    created_at: d.created_at || new Date().toISOString().replace('T',' ').substring(0,19)
                };
                if (!_messages[_activeId]) _messages[_activeId] = [];
                _messages[_activeId].push(newMsg);
                ChatEngine.renderMessages([newMsg], true);
                try { ChatEngine.clearReply(); } catch(e){}
                // Update sidebar
                var conv = _conversations.find(function(c){return parseInt(c.candidate_id)===_activeId;});
                if (conv) { conv.last_message = text; conv.last_msg_time = newMsg.created_at; }
                renderConversationList();
            } else {
                showToast('Gagal kirim: ' + (d.error||''), 'error');
            }
        } catch(e) {
            console.error('[AdminChat] send error:', e);
            showToast('Koneksi gagal', 'error');
        }
    }

    /* ── File Upload via API ── */
    function triggerFileUpload() { document.getElementById('chatFileInput').click(); }
    async function onFileSelected(input) {
        if (!input.files[0] || !_activeId) return;
        var file = input.files[0];
        var fd = new FormData();
        fd.append('candidate_id', _activeId);
        fd.append('file', file);

        try {
            var r = await fetch(_cfg.apiBase + '?action=upload', {
                method:'POST', credentials:'same-origin', body: fd
            });
            var d = await r.json();
            if (d && d.ok) {
                var isImg = file.type.startsWith('image/');
                var msg = {
                    id: d.id, sender_type:'admin', sender_name:'Admin BAS',
                    message_type: isImg?'image':'file', message:'',
                    file_name: file.name, file_size: d.file_size||file.size,
                    file_path: d.file_path||'',
                    is_read:0, created_at: new Date().toISOString().replace('T',' ').substring(0,19)
                };
                if (!_messages[_activeId]) _messages[_activeId] = [];
                _messages[_activeId].push(msg);
                ChatEngine.renderMessages([msg], true);
                showToast('File terkirim');
            }
        } catch(e) { showToast('Upload gagal', 'error'); }
        input.value = '';
    }

    /* ── Canned Responses ── */
    function onInputChange(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 100) + 'px';
        var val = el.value;
        if (val.startsWith('/')) {
            var matches = _cannedResponses.filter(function(r){return r.cmd.indexOf(val)===0;});
            if (matches.length > 0) {
                var popup = document.getElementById('chatCanned');
                popup.innerHTML = matches.map(function(r) {
                    return '<div class="chat-canned-item" onclick="AdminChat.useCanned(\''+r.cmd+'\')">' +
                        '<span class="chat-canned-cmd">'+r.cmd+'</span>'+ChatEngine.escHtml(r.text.substring(0,60))+'...</div>';
                }).join('');
                popup.classList.add('show');
                return;
            }
        }
        hideCanned();
    }
    function useCanned(cmd) {
        var r = _cannedResponses.find(function(x){return x.cmd===cmd;});
        if (r) { document.getElementById('chatInput').value = r.text; }
        hideCanned();
    }
    function hideCanned() { var p = document.getElementById('chatCanned'); if(p) p.classList.remove('show'); }

    /* ── Pin ── */
    function togglePin(id) {
        var idx = _pinnedIds.indexOf(id);
        if (idx !== -1) { _pinnedIds.splice(idx, 1); showToast('Chat di-unpin'); }
        else if (_pinnedIds.length < 3) { _pinnedIds.push(id); showToast('Chat di-pin'); }
        else { showToast('Maksimal 3 pin', 'error'); return; }
        renderConversationList();
    }

    /* ── Notes ── */
    function toggleNotes() {
        var n = document.getElementById('chatNotes');
        if (n) n.style.display = n.style.display==='none'?'block':'none';
    }
    function saveNote(val) { if (_activeId) _notes[_activeId] = val; }

    /* ── Search in Chat ── */
    function toggleSearchBar() {
        var bar = document.getElementById('chatSearchBar');
        if (bar) { bar.classList.toggle('show'); if (bar.classList.contains('show')) bar.querySelector('input').focus(); }
    }
    function searchInChat(term) {
        var msgs = document.getElementById('chatMsgs');
        if (!msgs) return;
        msgs.querySelectorAll('.chat-bubble--highlight').forEach(function(b){b.classList.remove('chat-bubble--highlight');});
        if (!term) { document.getElementById('chatSearchNav').textContent=''; return; }
        var found = 0;
        msgs.querySelectorAll('.chat-text').forEach(function(el) {
            if (el.textContent.toLowerCase().indexOf(term.toLowerCase()) !== -1) { el.closest('.chat-bubble').classList.add('chat-bubble--highlight'); found++; }
        });
        document.getElementById('chatSearchNav').textContent = found + ' ditemukan';
    }

    /* ── Nav Badge ── */
    function updateNavBadge() {
        var total = _conversations.reduce(function(s,c){return s+(parseInt(c.unread_count)||0);},0);
        var badge = document.getElementById('chatNavBadge');
        if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'inline' : 'none'; }
        var mini = document.getElementById('chatNavBadgeMini');
        if (mini) { mini.textContent = total; mini.style.display = total > 0 ? 'flex' : 'none'; }
    }

    /* ── Back (Mobile) ── */
    function goBack() {
        var layout = document.getElementById('chatLayout');
        if (layout) layout.classList.remove('conv-open');
        if (_pollTimer) clearInterval(_pollTimer);
    }

    function showToast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
    }

    return {
        init, openChat, send, filterList,
        onInputChange, useCanned, togglePin,
        toggleNotes, saveNote, toggleSearchBar, searchInChat,
        triggerFileUpload, onFileSelected,
        goBack, renderConversationList, updateNavBadge,
    };
})();
