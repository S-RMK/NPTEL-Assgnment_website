import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/*
 * Persistent "you're offline" bar.
 *
 * Once the app shell is cached, an offline PWA looks identical to an online one until
 * something silently fails to load. This makes the state explicit so stale content
 * isn't mistaken for current content.
 */
const OfflineIndicator = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const goOffline = () => setIsOffline(true);
        const goOnline = () => setIsOffline(false);

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10001,
                padding: '0.55rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: '#b45309',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600
            }}
        >
            <WifiOff size={15} />
            <span>Offline — showing saved content</span>
        </div>
    );
};

export default OfflineIndicator;
