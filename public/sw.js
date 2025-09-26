const CACHE_NAME = "vayalcare-v2";
const urlsToCache = ["/", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", function (event) {
  console.log("Service worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .catch(function (error) {
        console.log("Cache addAll failed:", error);
      })
  );
  // Force activation of the new service worker
  self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Skip cache for development server requests
  if (
    url.hostname === "localhost" &&
    (url.pathname.includes("@vite") ||
      url.pathname.includes("node_modules") ||
      url.pathname.includes(".tsx") ||
      url.pathname.includes(".ts") ||
      url.searchParams.has("t") || // Vite HMR timestamp
      url.pathname.includes("hot"))
  ) {
    return;
  }

  // For production assets (JS, CSS files), use network-first strategy
  if (
    url.pathname.includes("/assets/") ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function (error) {
          console.log("Network fetch failed for asset:", request.url, error);
          // Try to serve from cache as fallback
          return caches.match(request);
        })
    );
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(request).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(request).catch(function (error) {
        console.log("Fetch failed:", error);
        // Return a fallback response for navigation requests
        if (request.mode === "navigate") {
          return caches.match("/");
        }
        return new Response("Network error occurred", {
          status: 408,
          headers: { "Content-Type": "text/plain" },
        });
      });
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("Service worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            // Delete old caches
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});
