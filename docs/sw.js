const CACHE_NAME = 'bewerbungs-app-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Assets die beim Install gecached werden sollen
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    '/js/video-creator.js',
    '/js/video-manager.js',
    '/js/utils.js',
    '/js/ui.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css'
];

// Install Event
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Service Worker] Precaching App Shell');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Successfully installed');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Precaching failed:', error);
            })
    );
});

// Activate Event
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        Promise.all([
            // Cache-Verwaltung
            caches.keys()
                .then(keyList => {
                    return Promise.all(keyList.map(key => {
                        if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(key)) {
                            console.log('[Service Worker] Removing old cache:', key);
                            return caches.delete(key);
                        }
                    }));
                }),
            // Client-Verwaltung
            self.clients.claim()
        ])
    );
});

// Fetch Event
self.addEventListener('fetch', event => {
    const request = event.request;

    // Ignoriere nicht-GET Requests
    if (request.method !== 'GET') return;

    // Ignoriere Chrome Extension Requests
    if (request.url.includes('chrome-extension')) return;

    // Strategie für API Calls
    if (request.url.includes('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Strategie für statische Assets
    if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Standard-Strategie für alle anderen Requests
    event.respondWith(handleDynamicRequest(request));
});

// Handler für API Requests
async function handleApiRequest(request) {
    try {
        // Versuche zuerst einen Live-Request
        const response = await fetch(request);
        
        // Cache erfolgreiche Responses
        if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => {
                cache.put(request, clone);
            });
        }
        
        return response;
    } catch (error) {
        // Bei Offline-Zustand: Versuche aus dem Cache
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Handler für statische Assets
async function handleStaticRequest(request) {
    // Cache-First Strategie
    const cached = await caches.match(request);
    if (cached) {
        // Aktualisiere Cache im Hintergrund
        fetch(request).then(response => {
            if (response.ok) {
                caches.open(STATIC_CACHE).then(cache => {
                    cache.put(request, response);
                });
            }
        });
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, clone);
            });
        }
        return response;
    } catch (error) {
        // Fallback für kritische Assets
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
        }
        throw error;
    }
}

// Handler für dynamische Requests
async function handleDynamicRequest(request) {
    // Network-First Strategie
    try {
        const response = await fetch(request);
        if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
                // Limitiere Cache-Größe
                limitCacheSize(DYNAMIC_CACHE, 50); // Max 50 Items
                cache.put(request, clone);
            });
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Cache-Größe limitieren
async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // FIFO: Lösche älteste Einträge
        await cache.delete(keys[0]);
        limitCacheSize(cacheName, maxItems);
    }
}

// Background Sync für Offline-Aktionen
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background Syncing...', event);
    if (event.tag === 'sync-new-video') {
        event.waitUntil(
            syncNewVideos()
        );
    }
});

// Push Notifications
self.addEventListener('push', event => {
    console.log('[Service Worker] Push Notification received', event);

    let data = { title: 'Neue Nachricht', content: 'Standard-Nachricht' };
    if (event.data) {
        data = JSON.parse(event.data.text());
    }

    const options = {
        body: data.content,
        icon: '/images/icons/icon-96x96.png',
        badge: '/images/icons/icon-96x96.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'explore', title: 'Anzeigen' },
            { action: 'close', title: 'Schließen' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
}); 