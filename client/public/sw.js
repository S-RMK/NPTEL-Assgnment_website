const CACHE_NAME = 'nptel-answers-v2';
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install Event - Precache core app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching App Shell');
            return cache.addAll(PRECACHE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network-first for API, Cache-first for static assets with offline fallback
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-First strategy for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => response)
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    return cached || new Response(JSON.stringify({ error: 'Offline - Network Unavailable' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }

    // Cache-First strategy for static assets & HTML navigation
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    if (event.request.mode === 'navigate') {
                        const cachedIndex = await caches.match('/index.html');
                        return cachedIndex || new Response('<!DOCTYPE html><html><body>Offline</body></html>', {
                            status: 200,
                            headers: { 'Content-Type': 'text/html' }
                        });
                    }
                    return new Response('Asset unavailable offline', { status: 404 });
                });
        })
    );
});

// Push Event - Display incoming Web Push Notification
self.addEventListener('push', (event) => {
    let data = { title: 'NPTEL Answers Update', body: 'New answers or deadline updates available.', data: { url: '/' } };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        image: data.image,
        badge: '/icons/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: data.data || { url: '/' },
        actions: [
            { action: 'open', title: 'View Details' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Event - Deep linking to target URL
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
