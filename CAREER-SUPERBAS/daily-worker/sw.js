/**
 * BAS Recruitment — Service Worker for Push Notifications
 * Fixed: Show notification directly without fetching API (SW has no session)
 */
const CACHE_NAME = 'bas-push-v2';

/* ── Push event ─────────────────────────────────────── */
self.addEventListener('push', function(event) {
    // Default notification
    let data = {
        title: 'BAS Recruitment',
        body: 'Ada notifikasi baru untuk Anda',
        url: '/daily-worker/daftar.html'
    };

    // Try to read payload (if sent with data)
    if (event.data) {
        try {
            const payload = event.data.json();
            if (payload.title) data.title = payload.title;
            if (payload.body || payload.message) data.body = payload.body || payload.message;
            if (payload.url) data.url = payload.url;
        } catch(e) {
            try {
                data.body = event.data.text() || data.body;
            } catch(e2) {}
        }
    }

    // Show notification immediately — no server fetch needed
    const showPromise = self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/daily-worker/LogoBas.png',
        badge: '/daily-worker/favicon-bas.png',
        tag: 'bas-notif-' + Date.now(),
        data: { url: data.url },
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'Buka' },
            { action: 'dismiss', title: 'Tutup' }
        ]
    });

    event.waitUntil(showPromise);
});

/* ── Click notification ────────────────────────────── */
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/daily-worker/daftar.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // If a window is already open, focus it
                for (const client of windowClients) {
                    if (client.url.includes('/daily-worker/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open new window
                return clients.openWindow(url);
            })
    );
});

/* ── Install + Activate ────────────────────────────── */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
