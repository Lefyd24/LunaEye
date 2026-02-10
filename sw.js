const CACHE_NAME = 'lunaeye-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './assets/css/main.css',
    './assets/js/app.js',
    './assets/js/states.js',
    './assets/js/voice.js',
    './assets/js/ui.js',
    './assets/js/fluid-simulation.js'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('SW: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Caching local assets');
                // Cache local assets first
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Try to cache external resources but don't fail if they're unavailable
                return caches.open(CACHE_NAME).then(cache => {
                    return Promise.allSettled(
                        EXTERNAL_RESOURCES.map(url => 
                            fetch(url)
                                .then(response => cache.put(url, response))
                                .catch(err => console.log('Could not cache:', url))
                        )
                    );
                });
            })
            .then(() => {
                console.log('SW: Assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('SW: Failed to cache assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('SW: Activate event');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName.startsWith('lunaeye-')) {
                            console.log('SW: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('SW: Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response for caching
                const responseToCache = response.clone();
                
                // Cache successful responses
                if (response.ok) {
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }
                
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Return empty response for other requests
                        return new Response('', { status: 503, statusText: 'Service Unavailable' });
                    });
            })
    );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
