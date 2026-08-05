import { useState, useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

/*
 * Push opt-in.
 *
 * The previous version hid this banner as soon as Notification.permission was
 * 'granted' — but permission granted is not the same as subscribed. If anything after
 * the permission prompt failed (no service worker, a rejected key, a failed save) the
 * banner vanished anyway, leaving no way to retry and no subscription on the server.
 * That is why enabling notifications appeared to work while the subscriber count
 * stayed at zero.
 *
 * Now visibility is driven by whether a PushSubscription actually exists, and an
 * existing browser subscription is re-synced to the server on mount so the two cannot
 * drift apart.
 */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const NotificationBanner = () => {
    const [subscribed, setSubscribed] = useState(null); // null = still checking
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const supported = typeof window !== 'undefined'
        && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    useEffect(() => {
        if (!supported) { setSubscribed(false); return; }
        let cancelled = false;

        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                const existing = await reg.pushManager.getSubscription();
                if (cancelled) return;

                if (existing) {
                    // The browser already holds a subscription. Re-send it so a server
                    // that lost the record (or pruned it as dead) picks it up again.
                    try {
                        await api.savePushSubscription(existing, user?.selectedCourses || ['all']);
                    } catch { /* offline or signed out; retried on next visit */ }
                    setSubscribed(true);
                } else {
                    setSubscribed(false);
                }
            } catch {
                if (!cancelled) setSubscribed(false);
            }
        })();

        return () => { cancelled = true; };
    }, [supported, user]);

    const subscribe = async () => {
        setLoading(true);
        setError('');
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error(permission === 'denied'
                    ? 'Notifications are blocked for this site. Enable them in your browser\'s site settings, then try again.'
                    : 'Notification permission was dismissed.');
            }

            const reg = await navigator.serviceWorker.ready;
            const publicKey = await api.getVapidPublicKey();
            if (!publicKey) throw new Error('The server did not return a notification key.');

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Only now is it real — this throws if the server rejects it.
            await api.savePushSubscription(subscription, user?.selectedCourses || ['all']);
            setSubscribed(true);
        } catch (err) {
            console.error('Push subscription failed:', err);
            setError(err.message || 'Could not enable notifications.');
        } finally {
            setLoading(false);
        }
    };

    // Still checking, already subscribed, or the browser can't do push at all.
    if (subscribed !== false) return null;

    return (
        <div className="glass-panel banner-row" style={{
            padding: '0.9rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '12px',
            borderLeft: `4px solid ${error ? '#f87171' : '#6366f1'}`
        }}>
            <div className="banner-copy">
                {error
                    ? <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0 }} />
                    : <Bell size={20} color="#818cf8" style={{ flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                    <strong>{error ? 'Couldn\'t enable alerts' : 'Enable Deadline Alerts'}</strong>
                    <span>
                        {error || (supported
                            ? 'Get notified when answers are released or deadlines approach.'
                            : 'This browser doesn\'t support push notifications.')}
                    </span>
                </div>
            </div>
            {supported && (
                <div className="banner-actions">
                    <button
                        onClick={subscribe}
                        disabled={loading}
                        className="btn-primary"
                        style={{ padding: '0.42rem 0.95rem', fontSize: '0.84rem' }}
                    >
                        {loading ? 'Enabling…' : error ? 'Try again' : 'Enable'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationBanner;
