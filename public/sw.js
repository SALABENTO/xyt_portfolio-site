// Service Worker: proxy video requests to bypass CORS
// Intercepts /sw-video?url=... and fetches from any origin (no CORS in SW)
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === '/sw-video' && url.searchParams.has('url')) {
    const targetUrl = url.searchParams.get('url')
    // Forward the request with headers (Range, etc.) for video seeking
    event.respondWith(fetch(targetUrl, {
      headers: event.request.headers,
    }))
  }
})
