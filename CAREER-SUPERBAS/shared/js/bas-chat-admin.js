/**
 * BAS Admin Chat Panel
 * Shared admin chat UI with conversation list + chat window
 */
const AdminChat = (() => {
    let _cfg = {};
    let _activeId = null;
    let _pinnedIds = [];
    let _labels = {};
    let _notes = {};
    let _cannedResponses = [
        {cmd:'/jadwal', text:'Jadwal interview akan diinformasikan melalui pesan ini. Mohon standby.'},
        {cmd:'/lokasi', text:'Lokasi DC dapat dilihat di menu Lokasi DC pada dashboard Anda.'},
        {cmd:'/tolak', text:'Mohon maaf, setelah melalui proses seleksi, kami belum dapat menerima Anda saat ini.'},
        {cmd:'/lulus', text:'Selamat! Anda telah lolos seleksi. Silakan lengkapi pemberkasan Anda.'},
        {cmd:'/berkas', text:'Silakan lengkapi dokumen pemberkasan melalui menu Pemberkasan di dashboard.'},
    ];
    let _searchInChatTerm = '';
    let _autoReply = {enabled:false, message:'Pesan Anda sudah diterima. Admin akan merespon segera.'};

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
        renderLayout();
        renderConversationList();
        initSwipeOnMessages();
    }

    function renderLayout() {
        var c = document.getElementById(_cfg.container);
        if (!c) return;
        c.innerHTML =
            '<div class="chat-layout" id="chatLayout">' +
                '<div class="chat-sidebar">' +
                    '<div class="chat-sidebar-header">' +
                        '<input class="chat-search" placeholder="Cari kandidat..." oninput="AdminChat.filterList(this.value)">' +
                        '<div class="chat-filter-row">' +
                            '<select onchange="AdminChat.filterProject(this.value)" id="chatFilterProject">' +
                                '<option value="">Semua Project</option>' +
                                '<option value="dw">Daily Worker</option>' +
                                '<option value="driver">Driver</option>' +
                                '<option value="kurir">Kurir</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="chat-conv-list" id="chatConvList"></div>' +
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
                        '<div class="chat-input-bar" id="chatInputBar">' +
                            '<div class="chat-input-actions">' +
                                '<button onclick="AdminChat.triggerFileUpload()" title="Lampiran">' + ChatEngine.ICONS.attach + '</button>' +
                                '<button onclick="AdminChat.sendLoc()" title="Lokasi">' + ChatEngine.ICONS.location + '</button>' +
                                '<button onclick="AdminChat.toggleVoice()" title="Voice Note">' + ChatEngine.ICONS.mic + '</button>' +
                            '</div>' +
                            '<textarea class="chat-input-text" id="chatInput" rows="1" placeholder="Ketik pesan..." oninput="AdminChat.onInputChange(this)"></textarea>' +
                            '<button class="chat-input-send" onclick="AdminChat.send()">' + ChatEngine.ICONS.send + '</button>' +
                            '<input type="file" id="chatFileInput" style="display:none" onchange="AdminChat.onFileSelected(this)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /* ── Conversation List ── */
    function renderConversationList(filter, projectFilter) {
        var list = document.getElementById('chatConvList');
        if (!list) return;
        var convs = _cfg.dummyData.chatConversations || [];

        // Role filter
        if (_cfg.role === 'korlap' && _cfg.allowedProvinces) {
            convs = convs.filter(function(c) { return _cfg.allowedProvinces.indexOf(c.provinsi) !== -1; });
        }
        if (_cfg.role !== 'superowner') {
            convs = convs.filter(function(c) { return c.project === _cfg.project; });
        }
        // Search filter
        if (filter) {
            var f = filter.toLowerCase();
            convs = convs.filter(function(c) { return c.name.toLowerCase().indexOf(f) !== -1 || (c.givenId||'').toLowerCase().indexOf(f) !== -1; });
        }
        if (projectFilter) {
            convs = convs.filter(function(c) { return c.project === projectFilter; });
        }

        // Sort: pinned first, then by time
        convs.sort(function(a,b) {
            var pa = _pinnedIds.indexOf(a.candidateId) !== -1 ? 0 : 1;
            var pb = _pinnedIds.indexOf(b.candidateId) !== -1 ? 0 : 1;
            if (pa !== pb) return pa - pb;
            return new Date(b.lastTime) - new Date(a.lastTime);
        });

        var html = '';
        var hadPinned = false;
        convs.forEach(function(c) {
            var isPinned = _pinnedIds.indexOf(c.candidateId) !== -1;
            if (isPinned && !hadPinned) { html += '<div class="chat-conv-separator">Pinned</div>'; hadPinned = true; }
            if (!isPinned && hadPinned) { html += '<div class="chat-conv-separator">Semua Chat</div>'; hadPinned = false; }

            var initials = c.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();
            var onlineClass = c.online === 'online' ? 'online' : (c.online === 'away' ? 'away' : 'offline');
            var statusStyle = STATUS_COLORS[c.status] || 'background:var(--bg3);color:var(--t3)';
            var labelDot = _labels[c.candidateId] ? '<span class="chat-conv-label" style="background:' + _labels[c.candidateId] + '"></span>' : '';

            html += '<div class="chat-conv-item' + (_activeId===c.candidateId?' active':'') + (isPinned?' pinned':'') + '" onclick="AdminChat.openChat(' + c.candidateId + ')" oncontextmenu="AdminChat.showConvMenu(event,' + c.candidateId + ')">' +
                (isPinned ? '<span class="chat-conv-pin">PIN</span>' : '') +
                '<div class="chat-conv-avatar">' + initials + '<span class="online-dot ' + onlineClass + '"></span></div>' +
                '<div class="chat-conv-body">' +
                    '<div class="chat-conv-top">' +
                        '<span class="chat-conv-name">' + ChatEngine.escHtml(c.name) + '</span>' +
                        '<span class="chat-conv-project ' + PROJECT_CLASS[c.project] + '">' + PROJECT_LABELS[c.project] + '</span>' +
                    '</div>' +
                    '<div class="chat-conv-location">' + ChatEngine.escHtml(c.kabupaten + ', ' + c.provinsi) + '</div>' +
                    '<span class="chat-conv-status" style="' + statusStyle + '">' + c.status + '</span>' +
                    '<div class="chat-conv-preview">' + ChatEngine.escHtml(c.lastMessage) + '</div>' +
                '</div>' +
                '<div class="chat-conv-meta">' +
                    '<span class="chat-conv-time">' + ChatEngine.formatTime(c.lastTime) + '</span>' +
                    (c.unread > 0 ? '<span class="chat-conv-unread">' + c.unread + '</span>' : '') +
                    labelDot +
                '</div>' +
            '</div>';
        });

        if (!html) html = '<div style="padding:40px;text-align:center;color:var(--t3);font-size:.75rem">Tidak ada percakapan</div>';
        list.innerHTML = html;
        updateNavBadge();
    }

    function filterList(val) { renderConversationList(val, document.getElementById('chatFilterProject').value); }
    function filterProject(val) { renderConversationList(document.querySelector('.chat-search')?.value, val); }

    /* ── Open Chat ── */
    function openChat(candidateId) {
        _activeId = candidateId;
        var conv = (_cfg.dummyData.chatConversations||[]).find(function(c){return c.candidateId===candidateId;});
        if (!conv) return;

        // Mark read
        conv.unread = 0;

        document.getElementById('chatEmpty').style.display = 'none';
        var active = document.getElementById('chatActive');
        active.style.display = 'flex';

        // Header
        var statusOpts = ['Belum Pemberkasan','Sudah Pemberkasan','Lulus','Tidak Lulus','Blacklist'].map(function(s) {
            return '<option value="'+s+'"'+(s===conv.status?' selected':'')+'>'+s+'</option>';
        }).join('');
        var onlineTxt = conv.online==='online'?'Online':(conv.online==='away'?'Baru aktif':'Offline');

        document.getElementById('chatHeader').innerHTML =
            '<div class="chat-conv-avatar" style="width:36px;height:36px;min-width:36px;font-size:.7rem">' + conv.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase() +
                '<span class="online-dot '+(conv.online||'offline')+'"></span></div>' +
            '<div class="chat-header-info">' +
                '<div class="chat-header-name">' + ChatEngine.escHtml(conv.name) + ' &middot; ' + ChatEngine.escHtml(conv.givenId) + '</div>' +
                '<div class="chat-header-detail">' +
                    '<span class="chat-conv-project '+PROJECT_CLASS[conv.project]+'">' + PROJECT_LABELS[conv.project] + '</span> ' +
                    ChatEngine.escHtml(conv.kabupaten+', '+conv.provinsi) + ' &middot; ' + onlineTxt +
                '</div>' +
                '<div class="chat-header-status"><select onchange="AdminChat.updateStatus('+candidateId+',this.value)">' + statusOpts + '</select></div>' +
            '</div>' +
            '<div class="chat-header-actions">' +
                '<button onclick="AdminChat.toggleSearchBar()" title="Cari">' + ChatEngine.ICONS.search + '</button>' +
                '<button onclick="AdminChat.toggleNotes()" title="Catatan">' + ChatEngine.ICONS.note + '</button>' +
                '<button onclick="AdminChat.togglePin('+candidateId+')" title="Pin">' + ChatEngine.ICONS.pin + '</button>' +
                '<button onclick="AdminChat.exportChat('+candidateId+')" title="Export">' + ChatEngine.ICONS.export + '</button>' +
            '</div>';

        // Messages
        var msgs = (_cfg.dummyData.chatMessages||{})[candidateId] || [];
        ChatEngine.init({candidateId:candidateId, role:'admin', container:active});
        ChatEngine.renderMessages(msgs, false);

        // Init swipe
        var msgsEl = document.getElementById('chatMsgs');
        if (msgsEl) ChatEngine.initSwipeReply(msgsEl);

        // Notes
        var noteArea = document.getElementById('chatNotes');
        var ta = noteArea ? noteArea.querySelector('textarea') : null;
        if (ta) ta.value = _notes[candidateId] || '';

        // Refresh sidebar
        renderConversationList();

        // Mobile: show chat
        var layout = document.getElementById('chatLayout');
        if (layout) layout.classList.add('conv-open');
    }

    /* ── Send Message ── */
    function send() {
        var input = document.getElementById('chatInput');
        if (!input || !_activeId) return;
        var text = input.value.trim();
        if (!text) return;

        var msgs = _cfg.dummyData.chatMessages[_activeId];
        if (!msgs) { _cfg.dummyData.chatMessages[_activeId] = []; msgs = _cfg.dummyData.chatMessages[_activeId]; }
        var maxId = msgs.reduce(function(m,x){return Math.max(m,x.id);},0);

        var newMsg = {
            id: maxId+1, sender_type:'admin', sender_name:'Admin BAS',
            message_type:'text', message:text, is_read:0,
            created_at: new Date().toISOString().replace('T',' ').substring(0,19),
            reply_to_id: ChatEngine.getReplyTo()?.id || null,
            reply_preview: ChatEngine.getReplyTo() || null,
        };
        msgs.push(newMsg);
        ChatEngine.renderMessages([newMsg], true);
        ChatEngine.clearReply();
        input.value = '';
        input.style.height = 'auto';
        hideCanned();

        // Update conversation
        var conv = (_cfg.dummyData.chatConversations||[]).find(function(c){return c.candidateId===_activeId;});
        if (conv) { conv.lastMessage = text; conv.lastTime = newMsg.created_at; }
        renderConversationList();
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

    /* ── Labels ── */
    function showConvMenu(e, id) {
        e.preventDefault();
        var colors = {'#EF4444':'Urgent','#EAB308':'Follow-up','#22C55E':'Done','':'Hapus Label'};
        var html = Object.keys(colors).map(function(c) {
            return '<div class="chat-canned-item" onclick="AdminChat.setLabel('+id+',\''+c+'\')">' +
                (c ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+c+';margin-right:6px"></span>' : '') +
                colors[c] + '</div>';
        }).join('');
        var popup = document.getElementById('chatCanned');
        popup.innerHTML = html;
        popup.classList.add('show');
        setTimeout(function(){document.addEventListener('click',function h(){popup.classList.remove('show');document.removeEventListener('click',h);});},10);
    }
    function setLabel(id, color) { _labels[id] = color || undefined; hideCanned(); renderConversationList(); }

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

    /* ── Quick Status Update ── */
    function updateStatus(id, status) {
        var conv = (_cfg.dummyData.chatConversations||[]).find(function(c){return c.candidateId===id;});
        if (conv) { conv.status = status; renderConversationList(); showToast('Status diperbarui'); }
    }

    /* ── Share Location ── */
    function sendLoc() {
        if (!_activeId) return;
        if (!navigator.geolocation) { showToast('GPS tidak didukung browser', 'error'); return; }
        navigator.geolocation.getCurrentPosition(function(pos) {
            var msgs = _cfg.dummyData.chatMessages[_activeId] || [];
            var maxId = msgs.reduce(function(m,x){return Math.max(m,x.id);},0);
            msgs.push({
                id:maxId+1, sender_type:'admin', sender_name:'Admin BAS',
                message_type:'location', message:'Lokasi saya',
                latitude:pos.coords.latitude, longitude:pos.coords.longitude,
                is_read:0, created_at:new Date().toISOString().replace('T',' ').substring(0,19)
            });
            ChatEngine.renderMessages([msgs[msgs.length-1]], true);
            showToast('Lokasi terkirim');
        }, function(err) { showToast('Gagal mendapatkan lokasi: '+err.message, 'error'); }, {enableHighAccuracy:true,timeout:10000});
    }

    /* ── File Upload ── */
    function triggerFileUpload() { document.getElementById('chatFileInput').click(); }
    function onFileSelected(input) {
        if (!input.files[0] || !_activeId) return;
        var file = input.files[0];
        var msgs = _cfg.dummyData.chatMessages[_activeId] || [];
        var maxId = msgs.reduce(function(m,x){return Math.max(m,x.id);},0);
        var isImg = file.type.startsWith('image/');
        msgs.push({
            id:maxId+1, sender_type:'admin', sender_name:'Admin BAS',
            message_type:isImg?'image':'file', message:'', file_name:file.name, file_size:file.size,
            file_path: isImg ? URL.createObjectURL(file) : '#',
            is_read:0, created_at:new Date().toISOString().replace('T',' ').substring(0,19)
        });
        ChatEngine.renderMessages([msgs[msgs.length-1]], true);
        input.value = '';
        showToast('File terkirim');
    }

    /* ── Voice Note (Dummy) ── */
    function toggleVoice() {
        if (!_activeId) return;
        var msgs = _cfg.dummyData.chatMessages[_activeId] || [];
        var maxId = msgs.reduce(function(m,x){return Math.max(m,x.id);},0);
        msgs.push({
            id:maxId+1, sender_type:'admin', sender_name:'Admin BAS',
            message_type:'voice', message:'', duration:'0:05',
            is_read:0, created_at:new Date().toISOString().replace('T',' ').substring(0,19)
        });
        ChatEngine.renderMessages([msgs[msgs.length-1]], true);
        showToast('Voice note terkirim');
    }

    /* ── Export Chat ── */
    function exportChat(id) {
        var msgs = (_cfg.dummyData.chatMessages||{})[id] || [];
        var conv = (_cfg.dummyData.chatConversations||[]).find(function(c){return c.candidateId===id;});
        var txt = 'Chat Export: ' + (conv?conv.name:'') + '\n' + '='.repeat(40) + '\n\n';
        msgs.forEach(function(m) {
            txt += '[' + m.created_at + '] ' + m.sender_name + ': ';
            if (m.message_type==='image') txt += '[Foto] ';
            else if (m.message_type==='file') txt += '[File: '+m.file_name+'] ';
            else if (m.message_type==='location') txt += '[Lokasi] ';
            else if (m.message_type==='voice') txt += '[Voice Note] ';
            txt += (m.message||'') + '\n';
        });
        var blob = new Blob([txt], {type:'text/plain'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chat_' + (conv?conv.givenId:'export') + '.txt';
        a.click();
        showToast('Chat di-export');
    }

    /* ── Nav Badge ── */
    function updateNavBadge() {
        var total = (_cfg.dummyData.chatConversations||[]).reduce(function(s,c){return s+(c.unread||0);},0);
        var badge = document.getElementById('chatNavBadge');
        if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'inline' : 'none'; }
        var mini = document.getElementById('chatNavBadgeMini');
        if (mini) { mini.textContent = total; mini.style.display = total > 0 ? 'flex' : 'none'; }
    }

    /* ── Back (Mobile) ── */
    function goBack() {
        var layout = document.getElementById('chatLayout');
        if (layout) layout.classList.remove('conv-open');
    }

    function initSwipeOnMessages() {}

    function showToast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
    }

    return {
        init, openChat, send, filterList, filterProject,
        onInputChange, useCanned, togglePin, showConvMenu, setLabel,
        toggleNotes, saveNote, toggleSearchBar, searchInChat,
        updateStatus, sendLoc, triggerFileUpload, onFileSelected,
        toggleVoice, exportChat, goBack, renderConversationList,
        updateNavBadge,
    };
})();
