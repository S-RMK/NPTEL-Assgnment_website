/*
 * NPTEL Answers service worker.
 *
 * `self.__SW_VERSION__` and `self.__PRECACHE__` are injected into dist/sw.js by
 * scripts/build-sw.cjs after `vite build`. The fallbacks below keep this file valid
 * during `vite dev`, where no build step has run.
 */
const VERSION = self.__SW_VERSION__ || 'dev';
const CACHE = `nptel-answers-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const SHELL_URL = '/index.html';

// Built asset URLs (hashed) plus the static shell. Injected at build time.
const PRECACHE = self.__PRECACHE__ || [SHELL_URL, OFFLINE_URL, '/manifest.json'];

const NAVIGATION_TIMEOUT_MS = 4000;

/* ---------------- lifecycle ---------------- */

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        // Individually, so one 404 cannot fail the whole install like cache.addAll does.
        await Promise.all(PRECACHE.map(async (url) => {
            try {
                await cache.add(new Request(url, { cache: 'reload' }));
            } catch (err) {
                console.warn('[SW] precache skipped:', url, err.message);
            }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.filter((n) => n.startsWith('nptel-answers-') && n !== CACHE)
                 .map((n) => caches.delete(n))
        );
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
        await self.clients.claim();
    })());
});

// Lets the in-app "update available" prompt activate the new worker immediately.
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
        self.skipWaiting();
    }
});

/* ---------------- fetch strategies ---------------- */

const timeout = (ms) => new Promise((_, reject) =>
    setTimeout(() => reject(new Error('network timeout')), ms));

// Network-first, falling back to the cached app shell, then the offline page.
// Cache-first here would pin every installed user to a stale build after a deploy,
// because index.html names the hashed asset bundles.
async function handleNavigation(event) {
    const cache = await caches.open(CACHE);

    const fromNetwork = (async () => {
        const preloaded = await event.preloadResponse;
        return preloaded || fetch(event.request);
    })();
    // Claimed below in every path, but attach a no-op handler so a rejection while the
    // cached shell is being served doesn't surface as an unhandled rejection.
    fromNetwork.catch(() => {});

    // Store under the shell URL: every SPA route resolves to the same document.
    const keep = (response) => {
        if (response && response.ok) cache.put(SHELL_URL, response.clone());
        return response;
    };

    try {
        return keep(await Promise.race([fromNetwork, timeout(NAVIGATION_TIMEOUT_MS)]));
    } catch (err) {
        const cached = await cache.match(SHELL_URL);
        if (cached) return cached;

        // Nothing cached yet. The timeout only means "slow", so wait for the real
        // response rather than showing the offline page to a first-time visitor.
        try {
            return keep(await fromNetwork);
        } catch (networkErr) {
            return (await cache.match(OFFLINE_URL))
                || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
    }
}

// Hashed build output never changes under a given name, so cache-first is safe here.
async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;

    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
}

// Fresh data when online; last-known-good when not.
async function networkFirst(request) {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const hit = await cache.match(request);
        if (hit) return hit;
        return new Response(
            JSON.stringify({ error: 'You are offline. This data is not cached yet.', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Instant from cache, refreshed in the background.
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    const network = fetch(request)
        .then((response) => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);
    return hit || (await network) || new Response('Unavailable offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only GET is cacheable, and only our own origin is ours to manage. Firestore and
    // the Google APIs the app talks to directly must pass straight through — their
    // streaming/long-poll requests break when a worker mediates them.
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(event));
        return;
    }
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(cacheFirst(request));
        return;
    }
    event.respondWith(staleWhileRevalidate(request));
});

/* ---------------- push notifications ---------------- */

self.addEventListener('push', (event) => {
    let payload = {
        title: 'NPTEL Answers Update',
        body: 'New answers or deadline updates are available.',
        data: { url: '/' }
    };

    if (event.data) {
        try {
            payload = { ...payload, ...event.data.json() };
        } catch (err) {
            payload.body = event.data.text();
        }
    }

    event.waitUntil(self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        image: payload.image,
        vibrate: [100, 50, 100],
        data: payload.data || { url: '/' },
        // Collapses repeat alerts for the same deadline instead of stacking them.
        tag: payload.tag || 'nptel-update',
        renotify: true,
        actions: [
            { action: 'open', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const target = (event.notification.data && event.notification.data.url) || '/';

    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
            if ('focus' in client) {
                // Reuse the open tab and route it, rather than opening a duplicate.
                await client.focus();
                if ('navigate' in client) {
                    try { await client.navigate(target); } catch (err) { /* cross-origin guard */ }
                }
                return;
            }
        }
        if (self.clients.openWindow) await self.clients.openWindow(target);
    })());
});
