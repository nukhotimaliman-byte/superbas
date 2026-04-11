/**
 * BAS Recruitment — Push Notification Manager (Frontend)
 * Handles Service Worker registration, permission request, and subscription.
 */
const PushManager_ = (() => {
    const API = '/driver/api/push.php';
    let _vapidKey = null;
    let _swReg = null;

    /* ── Helpers ──────────────────────────────────────── */
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        return arr;
    }

    /* ── Check support ───────────────────────────────── */
    function isSupported() {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }

    /* ── Get VAPID public key from server ────────────── */
    async function getVapidKey() {
        if (_vapidKey) return _vapidKey;
        try {
            const r = await fetch(API + '?action=vapid_key');
            const d = await r.json();
            _vapidKey = d.publicKey;
            return _vapidKey;
        } catch(e) {
            console.error('Push: Failed to get VAPID key', e);
            return null;
        }
    }

    /* ── Register Service Worker ─────────────────────── */
    async function registerSW() {
        if (_swReg) return _swReg;
        try {
            _swReg = await navigator.serviceWorker.register('/driver/sw.js', { scope: '/driver/' });
            console.log('Push: SW registered');
            return _swReg;
        } catch(e) {
            console.error('Push: SW registration failed', e);
            return null;
        }
    }

    /* ── Request permission ──────────────────────────── */
    async function requestPermission() {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        const result = await Notification.requestPermission();
        return result === 'granted';
    }

    /* ── Subscribe to push ───────────────────────────── */
    async function subscribe() {
        if (!isSupported()) return false;

        const reg = await registerSW();
        if (!reg) return false;

        const granted = await requestPermission();
        if (!granted) return false;

        const vapidKey = await getVapidKey();
        if (!vapidKey) return false;

        try {
            // Check existing subscription
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                });
            }

            // Send subscription to server
            const subJson = sub.toJSON();
            await fetch(API + '?action=subscribe', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: {
                        p256dh: subJson.keys?.p256dh || '',
                        auth:   subJson.keys?.auth || ''
                    }
                })
            });

            console.log('Push: Subscribed successfully');
            return true;
        } catch(e) {
            console.error('Push: Subscribe failed', e);
            return false;
        }
    }

    /* ── Force permission (for registration flow) ───── */
    async function forcePermission() {
        if (!isSupported()) return 'unsupported';
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';

        const result = await Notification.requestPermission();
        return result; // 'granted', 'denied', or 'default'
    }

    /* ── Initialize (call on page load) ──────────────── */
    async function init() {
        if (!isSupported()) return;
        await registerSW();
        if (Notification.permission === 'granted') {
            await subscribe();
        }
    }

    /* ── Get permission status ───────────────────────── */
    function getPermissionStatus() {
        if (!isSupported()) return 'unsupported';
        return Notification.permission; // 'granted', 'denied', 'default'
    }

    return { isSupported, requestPermission, subscribe, forcePermission, init, getPermissionStatus };
})();
