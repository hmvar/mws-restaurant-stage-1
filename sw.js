const staticCacheName = 'mws-review-v2';
let allCaches = [
	staticCacheName
];
self.addEventListener('install', function (event) {
	console.log('installing');
	event.waitUntil(
		caches.open(staticCacheName).then(function (cache) {
			return cache.addAll([
				'/',
				'js/all.js',
				'css/styles.css'
			]);
		})
	);
});
self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			console.log('activate');
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
		// if (requestUrl.pathname === '/') {
		// 	event.respondWith(caches.match('/skeleton'));
		//  	return;
		// }
		// if (requestUrl.pathname.startsWith('/img/')) {
		// 	event.respondWith(servePhoto(event.request));
		//  	return;
		// }
	}
	event.respondWith(
		caches.match(event.request).then(function(response) {
			return response || fetch(event.request);
		})
	);
});
