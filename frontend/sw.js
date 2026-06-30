// frontend/sw.js
const CACHE_NAME = 'yaounde-civic-v13'; 

// The core files that make up your application shell
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './citizen.html',
    './staff.html',
    './js/api.js',
    './js/auth.js',
    './js/config.js',
    './js/citizen.js',
    './js/staff.js',
    './js/citizen-forum.js',
    './js/staff-forum.js',
    './js/utils/toast.js',
    './js/utils/ui.js',
    './js/utils/maps.js',
    './js/utils/analytics.js',
    './js/utils/offline.js',
    './js/utils/i18n.js',
    './locales/en.json',
    './locales/fr.json'
];

self.addEventListener('install', (event) => {
    // Force the new Service Worker to take over immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching App Shell V2');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Take control of all clients immediately
    event.waitUntil(clients.claim());
    
    // Destroy the old v1 cache
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/')) {
        return; 
    }
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || fetch(event.request);
        })
    );
});