/**
 * BAS Chat Engine — Unified
 * Shared module for user & admin chat across all projects
 */
const ChatEngine = (() => {
    let _config = {};
    let _pollXHR = null;
    let _lastMsgId = 0;
    let _polling = false;
    let _typingTimer = null;
    let _container = null;
    let _onNewMessages = null;
    let _replyTo = null;
    let _onTypingChange = null;

    const ICONS = {
        send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
        image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
        file: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>',
        location: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        attach: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21.44 11.05l-9.19 9.19a5.64 5.64 0 01-7.98-7.98l9.19-9.19a3.76 3.76 0 015.32 5.32L9.6 17.57a1.88 1.88 0 01-2.66-2.66l8.38-8.38"/></svg>',
        mic: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
        check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
        doubleCheck: '<svg width="16" height="14" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 6 8 17 4 13"/><polyline points="24 6 14 17 11 14"/></svg>',
        download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
        reply: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>',
        pin: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L12 22"/><path d="M5 12l7-7 7 7"/></svg>',
        play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        pause: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
        forward: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/></svg>',
        bookmark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
        note: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        broadcast: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
        export: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    };

    /* ── Init ── */
    function init(config) {
        _config = {
            candidateId: config.candidateId || 0,
            role: config.role || 'user',
            container: config.container,
            apiBase: config.apiBase || '/daily-worker/api/chat.php',
            project: config.project || 'dw',
            onNewMessages: config.onNewMessages || null,
            onUnreadUpdate: config.onUnreadUpdate || null,
            onTypingChange: config.onTypingChange || null,
        };
        _container = typeof config.container === 'string'
            ? document.getElementById(config.container) : config.container;
        _onNewMessages = config.onNewMessages;
        _onTypingChange = config.onTypingChange;
    }

    /* ── Helpers ── */
    function escHtml(s) {
        if (!s) return '';
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function autoLink(text) {
        if (!text) return '';
        var escaped = escHtml(text);
        return escaped.replace(/(https?:\/\/[^\s<]+)/g, function(url) {
            var display = url.replace(/^https?:\/\//, '').substring(0, 40);
            if (display.length < url.replace(/^https?:\/\//, '').length) display += '...';
            return '<a href="' + url + '" target="_blank" rel="noopener">' + display + '</a>';
        });
    }

    function formatTime(ts) {
        if (!ts) return '';
        var d = new Date(ts.replace(' ', 'T'));
        var now = new Date();
        var diff = now - d;
        if (diff < 60000) return 'baru saja';
        if (diff < 3600000) return Math.floor(diff/60000) + ' mnt lalu';
        var isToday = d.toDateString() === now.toDateString();
        var h = String(d.getHours()).padStart(2,'0');
        var m = String(d.getMinutes()).padStart(2,'0');
        if (isToday) return h + ':' + m;
        var yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1);
        if (d.toDateString() === yesterday.toDateString()) return 'Kemarin ' + h + ':' + m;
        return d.getDate() + '/' + (d.getMonth()+1) + ' ' + h + ':' + m;
    }

    function formatSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/1048576).toFixed(1) + ' MB';
    }

    /* ── Render Bubble ── */
    function renderBubble(msg) {
        var isMine = (_config.role === 'user' && msg.sender_type === 'user')
                  || (_config.role === 'admin' && msg.sender_type === 'admin');
        var side = isMine ? 'mine' : 'theirs';
        var time = formatTime(msg.created_at);
        var readIcon = isMine
            ? (msg.is_read == 1 ? '<span class="chat-read read">' + ICONS.doubleCheck + '</span>' : '<span class="chat-read">' + ICONS.check + '</span>')
            : '';

        var replyBlock = '';
        if (msg.reply_preview || msg.reply_to_id) {
            try {
                var rp = typeof msg.reply_preview === 'string' ? JSON.parse(msg.reply_preview) : msg.reply_preview;
                if (rp) {
                    var rpType = rp.message_type === 'image' ? 'Foto' : (rp.message_type === 'file' ? 'File' : escHtml(rp.message || ''));
                    replyBlock = '<div class="chat-reply-quote" onclick="ChatEngine.scrollToMsg(' + rp.id + ')">' +
                        '<div class="chat-reply-name">' + escHtml(rp.sender_name || '') + '</div>' +
                        '<div class="chat-reply-text">' + rpType + '</div></div>';
                }
            } catch(e) {}
        }

        var content = '';
        var reactionHtml = msg.reaction ? '<span class="chat-reaction">' + msg.reaction + '</span>' : '';

        switch (msg.message_type) {
            case 'image':
                content = '<div class="chat-image-wrap" onclick="ChatEngine.openImage(this)">' +
                    '<img src="' + escHtml(msg.file_path || '') + '" alt="' + escHtml(msg.file_name || '') + '" loading="lazy"></div>' +
                    (msg.message ? '<div class="chat-text">' + autoLink(msg.message) + '</div>' : '');
                break;
            case 'file':
                content = '<a href="' + escHtml(msg.file_path || '') + '" target="_blank" class="chat-file-card" download>' +
                    '<div class="chat-file-icon">' + ICONS.file + '</div>' +
                    '<div class="chat-file-info"><div class="chat-file-name">' + escHtml(msg.file_name || '') + '</div>' +
                    '<div class="chat-file-size">' + formatSize(msg.file_size) + '</div></div>' +
                    '<div class="chat-file-dl">' + ICONS.download + '</div></a>' +
                    (msg.message ? '<div class="chat-text">' + autoLink(msg.message) + '</div>' : '');
                break;
            case 'location':
                var lat = msg.latitude, lng = msg.longitude;
                var mapUrl = 'https://www.google.com/maps?q=' + lat + ',' + lng;
                content = '<a href="' + mapUrl + '" target="_blank" class="chat-location-card">' +
                    '<div class="chat-location-preview">' +
                    '<div class="chat-location-pin">' + ICONS.location + '</div>' +
                    '<div class="chat-location-coords">' + Number(lat).toFixed(5) + ', ' + Number(lng).toFixed(5) + '</div></div>' +
                    '<div class="chat-location-action">Buka di Google Maps</div></a>' +
                    (msg.message ? '<div class="chat-text">' + autoLink(msg.message) + '</div>' : '');
                break;
            case 'voice':
                var bars = '';
                for (var i = 0; i < 20; i++) {
                    var h = Math.floor(Math.random() * 16) + 4;
                    bars += '<div class="bar" style="height:' + h + 'px"></div>';
                }
                content = '<div class="chat-voice">' +
                    '<button class="chat-voice-play">' + ICONS.play + '</button>' +
                    '<div class="chat-voice-wave">' + bars + '</div>' +
                    '<span class="chat-voice-dur">' + (msg.duration || '0:05') + '</span></div>';
                break;
            default:
                content = '<div class="chat-text">' + autoLink(msg.message) + '</div>';
        }

        var senderLabel = !isMine && _config.role === 'admin' && msg.sender_name
            ? '<div class="chat-sender">' + escHtml(msg.sender_name) + '</div>' : '';

        var safeSndr = escHtml(msg.sender_name || '').replace(/'/g, '&#39;');
        var safeMsg = escHtml((msg.message||'').substring(0,80)).replace(/'/g, '&#39;');

        return '<div class="chat-bubble chat-bubble--' + side + '" data-id="' + msg.id + '">' +
            '<div class="swipe-reply-icon">' + ICONS.reply + '</div>' +
            senderLabel + replyBlock + content +
            '<div class="chat-meta"><span class="chat-time">' + time + '</span>' + readIcon + '</div>' +
            reactionHtml +
            '<button class="chat-reply-btn" onclick="ChatEngine.setReply(' + msg.id + ',\'' + safeSndr + '\',\'' + safeMsg + '\',\'' + msg.message_type + '\')" title="Balas">' + ICONS.reply + '</button>' +
        '</div>';
    }

    function renderMessages(msgs, append) {
        if (!_container) return;
        var chatArea = _container.querySelector('.chat-messages');
        if (!chatArea) return;
        var html = msgs.map(function(m) { return renderBubble(m); }).join('');
        if (append) {
            chatArea.insertAdjacentHTML('beforeend', html);
        } else {
            chatArea.innerHTML = html;
        }
        requestAnimationFrame(function() { chatArea.scrollTop = chatArea.scrollHeight; });
    }

    /* ── Reply ── */
    function setReply(id, senderName, message, msgType) {
        _replyTo = { id: id, sender_name: senderName, message: message, message_type: msgType };
        var bar = _container ? _container.querySelector('.chat-reply-bar') : null;
        if (bar) {
            var typeLabel = msgType === 'image' ? 'Foto' : (msgType === 'file' ? 'File' : message);
            bar.innerHTML = '<div class="chat-reply-bar-content">' +
                '<div class="chat-reply-bar-name">' + escHtml(senderName) + '</div>' +
                '<div class="chat-reply-bar-text">' + escHtml(typeLabel) + '</div></div>' +
                '<button class="chat-reply-bar-close" onclick="ChatEngine.clearReply()">x</button>';
            bar.style.display = 'flex';
        }
        var input = _container ? _container.querySelector('.chat-input-text') : null;
        if (input) input.focus();
    }

    function clearReply() {
        _replyTo = null;
        var bar = _container ? _container.querySelector('.chat-reply-bar') : null;
        if (bar) bar.style.display = 'none';
    }

    function getReplyTo() { return _replyTo; }

    /* ── Scroll to Message ── */
    function scrollToMsg(msgId) {
        var el = _container ? _container.querySelector('[data-id="' + msgId + '"]') : null;
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('chat-bubble--highlight');
            setTimeout(function() { el.classList.remove('chat-bubble--highlight'); }, 1500);
        }
    }

    /* ── Image Lightbox ── */
    function openImage(wrap) {
        var img = wrap.querySelector('img');
        if (!img) return;
        var overlay = document.createElement('div');
        overlay.className = 'chat-lightbox';
        overlay.innerHTML = '<img src="' + img.src + '"><button class="chat-lightbox-close">' + ICONS.close + '</button>';
        overlay.onclick = function() { overlay.remove(); };
        document.body.appendChild(overlay);
    }

    /* ── Swipe to Reply ── */
    function initSwipeReply(container) {
        var startX = 0, currentX = 0, swiping = false, bubble = null;
        var threshold = 60;

        container.addEventListener('touchstart', function(e) {
            var b = e.target.closest('.chat-bubble');
            if (!b) return;
            startX = e.touches[0].clientX;
            bubble = b;
            swiping = false;
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
            if (!bubble) return;
            currentX = e.touches[0].clientX;
            var dx = currentX - startX;
            if (dx > 10) {
                swiping = true;
                var translate = Math.min(dx, 80);
                bubble.style.transform = 'translateX(' + translate + 'px)';
                bubble.classList.toggle('swiping', translate > 20);
            }
        }, { passive: true });

        container.addEventListener('touchend', function() {
            if (!bubble) return;
            var dx = currentX - startX;
            bubble.style.transform = '';
            bubble.classList.remove('swiping');
            if (swiping && dx >= threshold) {
                var id = bubble.getAttribute('data-id');
                var nameEl = bubble.querySelector('.chat-sender');
                var textEl = bubble.querySelector('.chat-text');
                var name = nameEl ? nameEl.textContent : '';
                var text = textEl ? textEl.textContent.substring(0, 80) : '';
                var type = bubble.querySelector('.chat-image-wrap') ? 'image' :
                           bubble.querySelector('.chat-file-card') ? 'file' :
                           bubble.querySelector('.chat-location-card') ? 'location' : 'text';
                setReply(parseInt(id), name, text, type);
                if (navigator.vibrate) navigator.vibrate(30);
            }
            bubble = null;
            swiping = false;
            startX = 0;
            currentX = 0;
        });
    }

    /* ── Setters ── */
    function setLastMsgId(id) { _lastMsgId = id; }
    function getLastMsgId() { return _lastMsgId; }
    function setCandidateId(id) { _config.candidateId = id; }

    return {
        ICONS: ICONS, init: init,
        renderBubble: renderBubble, renderMessages: renderMessages,
        setReply: setReply, clearReply: clearReply, getReplyTo: getReplyTo,
        scrollToMsg: scrollToMsg, openImage: openImage,
        initSwipeReply: initSwipeReply,
        escHtml: escHtml, autoLink: autoLink, formatTime: formatTime, formatSize: formatSize,
        setLastMsgId: setLastMsgId, getLastMsgId: getLastMsgId, setCandidateId: setCandidateId,
        getConfig: function() { return _config; },
        getContainer: function() { return _container; },
    };
})();
