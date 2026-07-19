// Service Worker: proxy video requests to bypass CORS
// Intercepts /sw-video?url=... and fetches from any origin
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === '/sw-video' && url.searchParams.has('url')) {
    const targetUrl = url.searchParams.get('url')
    // Respond with the actual video, bypassing CORS
    event.respondWith(fetch(targetUrl))
  }
})
