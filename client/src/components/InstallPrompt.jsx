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
        <div className="glass-panel" style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '480px',
            padding: '1rem 1.25rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            border: '1px solid var(--clr-primary)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            borderRadius: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'var(--grad-main)', borderRadius: '10px' }}>
                    <Download size={20} color="white" />
                </div>
                <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block' }}>Install NPTEL App</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Fast offline access & push notifications</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={handleInstallClick} className="btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
                    Install
                </button>
                <button onClick={() => setIsVisible(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default InstallPrompt;
