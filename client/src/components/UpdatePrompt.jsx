import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

/*
 * Surfaces a newly-deployed build to users who already have the app installed.
 *
 * A service worker that finds an update parks it in the `waiting` state and does not
 * take over until every tab is closed — which, for an installed PWA, can be never.
 * This offers the reload explicitly instead of leaving students on a stale version.
 */
const UpdatePrompt = () => {
    const [waitingWorker, setWaitingWorker] = useState(null);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        let reloading = false;
        const onControllerChange = () => {
            // Fires once the new worker takes control; guard against reload loops.
            if (reloading) return;
            reloading = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        navigator.serviceWorker.ready.then((registration) => {
            // An update may already be parked from a previous visit.
            if (registration.waiting && navigator.serviceWorker.controller) {
                setWaitingWorker(registration.waiting);
            }

            registration.addEventListener('updatefound', () => {
                const installing = registration.installing;
                if (!installing) return;
                installing.addEventListener('statechange', () => {
                    // `controller` is null on a first-ever install — that is not an update.
                    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                        setWaitingWorker(installing);
                    }
                });
            });

            registration.update().catch(() => { /* offline: try again next visit */ });
        }).catch(() => { /* no worker registered */ });

        return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    }, []);

    if (!waitingWorker) return null;

    const applyUpdate = () => {
        waitingWorker.postMessage('SKIP_WAITING');
        setWaitingWorker(null);
    };

    return (
        <div className="glass-panel" style={{
            position: 'fixed',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '440px',
            padding: '0.85rem 1.1rem',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            border: '1px solid #34d399',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            borderRadius: '14px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                <RefreshCw size={18} color="#34d399" />
                <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>Update available</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                        A newer version of NPTEL Answers is ready.
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button onClick={applyUpdate} className="btn-primary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem' }}>
                    Reload
                </button>
                <button
                    onClick={() => setWaitingWorker(null)}
                    aria-label="Dismiss update notice"
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default UpdatePrompt;
