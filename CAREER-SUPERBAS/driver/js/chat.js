/**
 * BAS Recruitment — Chat Engine
 * Shared module for user & admin chat UI
 */
const ChatEngine = (() => {
    const API = '/driver/api/chat.php';
    let _config = {};
    let _pollXHR = null;
    let _lastMsgId = 0;
    let _polling = false;
    let _typingTimer = null;
    let _container = null;
    let _onNewMessages = null;
    let _replyTo = null; // { id, sender_name, message, message_type }
    let _onTypingChange = null;

    /* ── SVG Icons (clean stroke) ──────────────── */
    const ICONS = {
        send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
        file: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
        location: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        attach: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5.64 5.64 0 01-7.98-7.98l9.19-9.19a3.76 3.76 0 015.32 5.32L9.6 17.57a1.88 1.88 0 01-2.66-2.66l8.38-8.38"/></svg>',
        check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        doubleCheck: '<svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 6 8 17 4 13"/><polyline points="24 6 14 17 11 14"/></svg>',
        download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        template: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
        chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
        close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    };

    /* ── Init ──────────────────────────────────── */
    function init(config) {
        _config = {
            candidateId: config.candidateId || 0,
            role: config.role || 'user', // 'user' | 'admin'
            container: config.container,
            onNewMessages: config.onNewMessages || null,
            onUnreadUpdate: config.onUnreadUpdate || null,
        };
        _container = typeof config.container === 'string'
            ? document.getElementById(config.container)
            : config.container;
        _onNewMessages = config.onNewMessages;
        _onTypingChange = config.onTypingChange || null;
    }

    /* ── Long Polling ──────────────────────────── */
    function startPoll() {
        if (_polling || !_config.candidateId) return;
        _polling = true;
        doPoll();
    }

    function stopPoll() {
        _polling = false;
        if (_pollXHR) { _pollXHR.abort(); _pollXHR = null; }
    }

    function doPoll() {
        if (!_polling) return;

        _pollXHR = new XMLHttpRequest();
        _pollXHR.open('GET', `${API}?action=poll&candidate_id=${_config.candidateId}&after_id=${_lastMsgId}`);
        _pollXHR.withCredentials = true;
        _pollXHR.timeout = 30000;

        _pollXHR.onload = function() {
            if (this.status === 200) {
                try {
                    const data = JSON.parse(this.responseText);
                    if (data.messages && data.messages.length > 0) {
                        _lastMsgId = data.messages[data.messages.length - 1].id;
                        // Filter out messages already rendered (optimistic)
                        const chatArea = _container?.querySelector('.chat-messages');
                        const newMsgs = chatArea ? data.messages.filter(m => 
                            !chatArea.querySelector(`[data-id="${m.id}"]`)
                        ) : data.messages;
                        if (_onNewMessages) _onNewMessages(data.messages);
                        if (newMsgs.length > 0) renderMessages(newMsgs, true);
                    }
                    // Handle typing indicator from poll
                    if (_onTypingChange) _onTypingChange(!!data.typing);
                } catch(e) {}
            }
            if (_polling) setTimeout(doPoll, 300);
        };

        _pollXHR.onerror = _pollXHR.ontimeout = function() {
            if (_polling) setTimeout(doPoll, 2000);
        };

        _pollXHR.send();
    }

    /* ── Send Text ─────────────────────────────── */
    async function sendText(candidateId, text) {
        // Capture and clear reply state
        const replyData = _replyTo;
        _replyTo = null;

        // Optimistic render — show bubble immediately
        const tempId = 'tmp_' + Date.now();
        const optimisticMsg = {
            id: tempId,
            candidate_id: candidateId,
            sender_type: _config.role === 'admin' ? 'admin' : 'user',
            sender_name: '',
            message_type: 'text',
            message: text,
            is_read: 0,
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            reply_to_id: replyData?.id || null,
            reply_preview: replyData ? JSON.stringify(replyData) : null
        };
        renderMessages([optimisticMsg], true);
        // Hide reply bar
        const replyBar = _container?.querySelector('.chat-reply-bar');
        if (replyBar) replyBar.style.display = 'none';

        const body = { candidate_id: candidateId, message: text };
        if (replyData?.id) body.reply_to_id = replyData.id;

        const res = await fetch(`${API}?action=send`, {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        const data = await res.json();

        // Replace temp bubble with real ID so poll won't duplicate
        if (data.ok && data.id) {
            const tempBubble = _container?.querySelector(`[data-id="${tempId}"]`);
            if (tempBubble) {
                tempBubble.setAttribute('data-id', data.id);
            }
            if (data.id > _lastMsgId) _lastMsgId = data.id;
        }
        return data;
    }

    /* ── Send File ─────────────────────────────── */
    async function sendFile(candidateId, file, caption) {
        const fd = new FormData();
        fd.append('candidate_id', candidateId);
        fd.append('file', file);
        if (caption) fd.append('message', caption);

        const res = await fetch(`${API}?action=upload`, {
            method: 'POST', credentials: 'include', body: fd
        });
        return res.json();
    }

    /* ── Send Location ─────────────────────────── */
    async function sendLocation(candidateId) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject('GPS not supported');
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const res = await fetch(`${API}?action=send`, {
                        method: 'POST', credentials: 'include',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            candidate_id: candidateId,
                            message: 'Lokasi saya',
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude
                        })
                    });
                    resolve(await res.json());
                },
                (err) => reject(err.message),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    /* ── Load History ──────────────────────────── */
    async function loadHistory(candidateId, beforeId) {
        let url = `${API}?action=history&candidate_id=${candidateId}`;
        if (beforeId) url += `&before_id=${beforeId}`;

        const res = await fetch(url, { credentials: 'include' });
        return res.json();
    }

    /* ── Mark Read ─────────────────────────────── */
    async function markRead(candidateId) {
        await fetch(`${API}?action=mark_read`, {
            method: 'POST', credentials: 'include',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ candidate_id: candidateId })
        });
    }

    /* ── Get Unread Count ──────────────────────── */
    async function getUnreadCount(candidateId) {
        let url = `${API}?action=unread`;
        if (candidateId) url += `&candidate_id=${candidateId}`;
        const res = await fetch(url, { credentials: 'include' });
        const d = await res.json();
        return d.count || 0;
    }

    /* ── Render Messages ───────────────────────── */
    function renderMessages(msgs, append = false) {
        if (!_container) return;
        const chatArea = _container.querySelector('.chat-messages');
        if (!chatArea) return;

        const html = msgs.map(m => renderBubble(m)).join('');

        if (append) {
            chatArea.insertAdjacentHTML('beforeend', html);
            requestAnimationFrame(() => chatArea.scrollTop = chatArea.scrollHeight);
        } else {
            chatArea.innerHTML = html;
            requestAnimationFrame(() => chatArea.scrollTop = chatArea.scrollHeight);
        }
    }

    /* ── Render Single Bubble ──────────────────── */
    function renderBubble(msg) {
        const isMine = (_config.role === 'user' && msg.sender_type === 'user')
                    || (_config.role === 'admin' && msg.sender_type === 'admin');
        const side = isMine ? 'mine' : 'theirs';
        const time = formatTime(msg.created_at);
        const readIcon = isMine
            ? (msg.is_read == 1 ? `<span class="chat-read read">${ICONS.doubleCheck}</span>` : `<span class="chat-read">${ICONS.check}</span>`)
            : '';

        // Reply quote block
        let replyBlock = '';
        if (msg.reply_preview || msg.reply_to_id) {
            try {
                const rp = typeof msg.reply_preview === 'string' ? JSON.parse(msg.reply_preview) : msg.reply_preview;
                if (rp) {
                    const rpType = rp.message_type === 'image' ? '📷 Foto' : (rp.message_type === 'file' ? '📎 File' : escHtml(rp.message || ''));
                    replyBlock = `<div class="chat-reply-quote" onclick="ChatEngine.scrollToMsg(${rp.id})">
                        <div class="chat-reply-name">${escHtml(rp.sender_name || '')}</div>
                        <div class="chat-reply-text">${rpType}</div>
                    </div>`;
                }
            } catch(e) {}
        }

        let content = '';

        switch (msg.message_type) {
            case 'image':
                content = `
                    <div class="chat-image-wrap" onclick="ChatEngine.openImage(this)">
                        <img src="/driver/${msg.file_path}" alt="${escHtml(msg.file_name)}" loading="lazy">
                    </div>
                    ${msg.message ? `<div class="chat-text">${escHtml(msg.message)}</div>` : ''}`;
                break;

            case 'file':
                content = `
                    <a href="/driver/${msg.file_path}" target="_blank" class="chat-file-card" download="${escHtml(msg.file_name)}">
                        <div class="chat-file-icon">${ICONS.file}</div>
                        <div class="chat-file-info">
                            <div class="chat-file-name">${escHtml(msg.file_name)}</div>
                            <div class="chat-file-size">${formatSize(msg.file_size)}</div>
                        </div>
                        <div class="chat-file-dl">${ICONS.download}</div>
                    </a>
                    ${msg.message ? `<div class="chat-text">${escHtml(msg.message)}</div>` : ''}`;
                break;

            case 'location':
                const lat = msg.latitude, lng = msg.longitude;
                const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                content = `
                    <a href="${mapUrl}" target="_blank" class="chat-location-card">
                        <div class="chat-location-preview">
                            <div class="chat-location-pin">${ICONS.location}</div>
                            <div class="chat-location-coords">${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}</div>
                        </div>
                        <div class="chat-location-action">Buka di Google Maps</div>
                    </a>
                    ${msg.message ? `<div class="chat-text">${escHtml(msg.message)}</div>` : ''}`;
                break;

            default:
                content = `<div class="chat-text">${escHtml(msg.message).replace(/\n/g, '<br>')}</div>`;
        }

        const senderLabel = !isMine && _config.role === 'admin'
            ? '' : (!isMine ? `<div class="chat-sender">${escHtml(msg.sender_name)}</div>` : '');

        // Reply action button
        const replyBtn = `<button class="chat-reply-btn" onclick="ChatEngine.setReply(${msg.id}, '${escHtml(msg.sender_name).replace(/'/g, '\\&#39;')}', '${escHtml((msg.message||'').substring(0,80)).replace(/'/g, '\\&#39;')}', '${msg.message_type}')" title="Balas">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
        </button>`;

        return `
            <div class="chat-bubble chat-bubble--${side}" data-id="${msg.id}">
                ${senderLabel}
                ${replyBlock}
                ${content}
                <div class="chat-meta">
                    <span class="chat-time">${time}</span>
                    ${readIcon}
                </div>
                ${replyBtn}
            </div>`;
    }

    /* ── Open Image Lightbox ───────────────────── */
    function openImage(wrap) {
        const img = wrap.querySelector('img');
        if (!img) return;
        const overlay = document.createElement('div');
        overlay.className = 'chat-lightbox';
        overlay.innerHTML = `<img src="${img.src}"><button class="chat-lightbox-close">${ICONS.close}</button>`;
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
    }

    /* ── Helpers ────────────────────────────────── */
    function escHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts.replace(' ', 'T'));
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return 'baru saja';
        if (diff < 3600000) return Math.floor(diff/60000) + ' mnt lalu';

        const isToday = d.toDateString() === now.toDateString();
        const h = String(d.getHours()).padStart(2,'0');
        const m = String(d.getMinutes()).padStart(2,'0');

        if (isToday) return `${h}:${m}`;

        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1);
        if (d.toDateString() === yesterday.toDateString()) return `Kemarin ${h}:${m}`;

        return `${d.getDate()}/${d.getMonth()+1} ${h}:${m}`;
    }

    function formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/1048576).toFixed(1) + ' MB';
    }

    function setLastMsgId(id) { _lastMsgId = id; }
    function getLastMsgId() { return _lastMsgId; }

    /* ── Reply State ───────────────────────────── */
    function setReply(id, senderName, message, msgType) {
        _replyTo = { id, sender_name: senderName, message, message_type: msgType };
        // Show reply bar in UI
        const bar = _container?.querySelector('.chat-reply-bar');
        if (bar) {
            const typeLabel = msgType === 'image' ? '📷 Foto' : (msgType === 'file' ? '📎 File' : message);
            bar.innerHTML = `<div class="chat-reply-bar-content">
                <div class="chat-reply-bar-name">${escHtml(senderName)}</div>
                <div class="chat-reply-bar-text">${escHtml(typeLabel)}</div>
            </div>
            <button class="chat-reply-bar-close" onclick="ChatEngine.clearReply()">✕</button>`;
            bar.style.display = 'flex';
        }
        // Focus input
        const input = _container?.querySelector('textarea, input[type="text"]');
        if (input) input.focus();
    }

    function clearReply() {
        _replyTo = null;
        const bar = _container?.querySelector('.chat-reply-bar');
        if (bar) bar.style.display = 'none';
    }

    function getReplyTo() { return _replyTo; }

    /* ── Scroll to Message ─────────────────────── */
    function scrollToMsg(msgId) {
        const el = _container?.querySelector(`[data-id="${msgId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('chat-bubble--highlight');
            setTimeout(() => el.classList.remove('chat-bubble--highlight'), 1500);
        }
    }

    /* ── Typing Indicator ──────────────────────── */
    function sendTyping(candidateId) {
        clearTimeout(_typingTimer);
        _typingTimer = setTimeout(() => {
            fetch(`${API}?action=typing`, {
                method: 'POST', credentials: 'include',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ candidate_id: candidateId })
            }).catch(() => {});
        }, 300); // Debounce 300ms
    }

    /* ── Public API ────────────────────────────── */
    return {
        ICONS, init, startPoll, stopPoll,
        sendText, sendFile, sendLocation,
        loadHistory, markRead, getUnreadCount,
        renderMessages, renderBubble, openImage,
        escHtml, formatTime, formatSize,
        setLastMsgId, getLastMsgId,
        setReply, clearReply, getReplyTo, scrollToMsg,
        sendTyping,
        setCandidateId(id) { _config.candidateId = id; },
    };
})();
