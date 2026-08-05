import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const NotificationBanner = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('default');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const subscribeToPush = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Push notifications are not supported in this browser.');
            return;
        }

        setLoading(true);
        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === 'granted') {
                const reg = await navigator.serviceWorker.ready;
                const publicKey = await api.getVapidPublicKey();

                const subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                });

                const userCourses = user ? user.selectedCourses : ['all'];
                await api.savePushSubscription(subscription, userCourses);
                setIsSubscribed(true);
                alert('Successfully subscribed to deadline & answer push alerts!');
            }
        } catch (err) {
            console.error('Subscription error:', err);
            alert('Push subscription error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    if (permissionStatus === 'granted' || isSubscribed) return null;

    return (
        <div className="glass-panel banner-row" style={{
            padding: '0.9rem 1rem',
            marginBottom: '1.25rem',
            borderRadius: '12px',
            borderLeft: '4px solid #6366f1'
        }}>
            <div className="banner-copy">
                <Bell size={20} color="#818cf8" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                    <strong>Enable Deadline Alerts</strong>
                    <span>Get notified when answers are released or deadlines approach.</span>
                </div>
            </div>
            <div className="banner-actions">
                <button
                    onClick={subscribeToPush}
                    disabled={loading}
                    className="btn-primary"
                    style={{ padding: '0.42rem 0.95rem', fontSize: '0.84rem' }}
                >
                    {loading ? 'Subscribing…' : 'Enable'}
                </button>
            </div>
        </div>
    );
};

export default NotificationBanner;
