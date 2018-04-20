const staticCacheName = 'mws-review-v1';
let allCaches = [
	staticCacheName
]
self.addEventListener('install', function (event) {
	event.waitUntil(
		caches.open(staticCacheName).then(function (cache) {
			return cache.addAll([
				'/skeleton',
				'js/main.js',
				'js/restaurant_info.js',
				'css/styles.css'
			]);
		})
	);
});
self.addEventListener('activate', function(event) {
	event.waitUntil(
	  caches.keys().then(function(cacheNames) {
		 return Promise.all(
			cacheNames.filter(function(cacheName) {
			  return cacheName.startsWith('mws-review') &&
						!allCaches.includes(cacheName);
			}).map(function(cacheName) {
			  return caches.delete(cacheName);
			})
		 );
	  })
	);
 });
self.addEventListener('fetch', function(event) {
	let requestUrl = new URL(event.request.url);
	if (requestUrl.origin === location.origin) {
		if (requestUrl.pathname === '/') {
			event.respondWith(caches.match('/skeleton'));
			return;
		 }
		//  if (requestUrl.pathname.startsWith('/photos/')) {
		// 	event.respondWith(servePhoto(event.request));
		// 	return;
		//  }
		//  if (requestUrl.pathname.startsWith('/avatars/')) {
		// 	event.respondWith(serveAvatar(event.request));
		// 	return;
		//  }
	}
	event.respondWith(
		caches.match(event.request).then(function(response) {
		return response || fetch(event.request);
		})
	);
 });
