let app = {};
let registerServiceWorker = function () {
	if (!navigator.serviceWorker) {
		return;
	}
	navigator.serviceWorker.register('/sw.js').then(function (reg) {
		if (!navigator.serviceWorker.controller) {
			return;
		}
		if (reg.waiting) {
			app.updateReady(reg.waiting);
			return;
		}
	}).catch(function (error) {
		return error;
	});
};
let lazyLoadImgs = function () {
	const conf = {
		rootMargin: '0px',
		threshold: 0.01
	};
	let imgs = document.querySelectorAll('img[data-src]');
	let onIntersection = function (entries) {
		entries.forEach(entry => {
			if (entry.intersectionRatio > 0) {
				let img = entry.target;
				observer.unobserve(img);
				img.setAttribute('src', img.getAttribute('data-src'));
				img.setAttribute('srcset', img.getAttribute('data-srcset'));
			}
		});
	};
	let observer = new IntersectionObserver(onIntersection, conf);
	imgs.forEach(image => {
		observer.observe(image);
	});
	imgs.forEach(function (img) {
		img.onload = function () {
			img.removeAttribute('data-src');
			img.removeAttribute('data-srcset');
		};
	});
};
// app.createUpdateDialog = function (worker) {
// 	let container = document.createElement('div');
// 	let message = document.createElement('p');
// 	let buttons = {};
// 	let p;
// 	buttons.update = document.createElement('button');
// 	buttons.update.value = 'Update';
// 	buttons.update.onclick = function () {
// 		worker.postMessage({action: 'skipWaiting'});
// 		container.style.display = 'none';
// 	};
// 	buttons.dismiss = document.createElement('button');
// 	buttons.dismiss.value = 'Dismiss';
// 	buttons.dismiss.onclick = function () {
// 		container.style.display = 'none';
// 	};
// 	p.innerHtml = 'New update available';
// 	container.className = 'dialog-box';
// 	container.appendChild(message);
// 	container.appendChild(buttons.update);
// 	container.appendChild(buttons.dismiss);
// 	document.appendChild(container);
// };
// app.updateReady = function (worker) {
// 	app.createUpdateDialog(worker);
// };
