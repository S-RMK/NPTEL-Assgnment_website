import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('[A2HS] User accepted install prompt');
        }
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="glass-panel banner-row" style={{
            position: 'fixed',
            // Clears the offline indicator and the iOS home indicator.
            bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(92%, 480px)',
            padding: '0.85rem 1rem',
            zIndex: 9999,
            border: '1px solid var(--clr-primary)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            borderRadius: '16px'
        }}>
            <div className="banner-copy">
                <div style={{ padding: '0.45rem', background: 'var(--grad-main)', borderRadius: '10px', flexShrink: 0, display: 'flex' }}>
                    <Download size={18} color="white" />
                </div>
                <div style={{ minWidth: 0 }}>
                    <strong>Install NPTEL App</strong>
                    <span>Fast offline access &amp; push notifications</span>
                </div>
            </div>
            <div className="banner-actions">
                <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '0.42rem 0.95rem', fontSize: '0.84rem' }}>
                    Install
                </button>
                <button onClick={() => setIsVisible(false)} aria-label="Dismiss install prompt" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}>
                    <X size={17} />
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
