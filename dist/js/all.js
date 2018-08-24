'use strict';(function(){function toArray(arr){return Array.prototype.slice.call(arr);}
function promisifyRequest(request){return new Promise(function(resolve,reject){request.onsuccess=function(){resolve(request.result);};request.onerror=function(){reject(request.error);};});}
function promisifyRequestCall(obj,method,args){var request;var p=new Promise(function(resolve,reject){request=obj[method].apply(obj,args);promisifyRequest(request).then(resolve,reject);});p.request=request;return p;}
function promisifyCursorRequestCall(obj,method,args){var p=promisifyRequestCall(obj,method,args);return p.then(function(value){if(!value)return;return new Cursor(value,p.request);});}
function proxyProperties(ProxyClass,targetProp,properties){properties.forEach(function(prop){Object.defineProperty(ProxyClass.prototype,prop,{get:function(){return this[targetProp][prop];},set:function(val){this[targetProp][prop]=val;}});});}
function proxyRequestMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return promisifyRequestCall(this[targetProp],prop,arguments);};});}
function proxyMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return this[targetProp][prop].apply(this[targetProp],arguments);};});}
function proxyCursorRequestMethods(ProxyClass,targetProp,Constructor,properties){properties.forEach(function(prop){if(!(prop in Constructor.prototype))return;ProxyClass.prototype[prop]=function(){return promisifyCursorRequestCall(this[targetProp],prop,arguments);};});}
function Index(index){this._index=index;}
proxyProperties(Index,'_index',['name','keyPath','multiEntry','unique']);proxyRequestMethods(Index,'_index',IDBIndex,['get','getKey','getAll','getAllKeys','count']);proxyCursorRequestMethods(Index,'_index',IDBIndex,['openCursor','openKeyCursor']);function Cursor(cursor,request){this._cursor=cursor;this._request=request;}
proxyProperties(Cursor,'_cursor',['direction','key','primaryKey','value']);proxyRequestMethods(Cursor,'_cursor',IDBCursor,['update','delete']);['advance','continue','continuePrimaryKey'].forEach(function(methodName){if(!(methodName in IDBCursor.prototype))return;Cursor.prototype[methodName]=function(){var cursor=this;var args=arguments;return Promise.resolve().then(function(){cursor._cursor[methodName].apply(cursor._cursor,args);return promisifyRequest(cursor._request).then(function(value){if(!value)return;return new Cursor(value,cursor._request);});});};});function ObjectStore(store){this._store=store;}
ObjectStore.prototype.createIndex=function(){return new Index(this._store.createIndex.apply(this._store,arguments));};ObjectStore.prototype.index=function(){return new Index(this._store.index.apply(this._store,arguments));};proxyProperties(ObjectStore,'_store',['name','keyPath','indexNames','autoIncrement']);proxyRequestMethods(ObjectStore,'_store',IDBObjectStore,['put','add','delete','clear','get','getAll','getKey','getAllKeys','count']);proxyCursorRequestMethods(ObjectStore,'_store',IDBObjectStore,['openCursor','openKeyCursor']);proxyMethods(ObjectStore,'_store',IDBObjectStore,['deleteIndex']);function Transaction(idbTransaction){this._tx=idbTransaction;this.complete=new Promise(function(resolve,reject){idbTransaction.oncomplete=function(){resolve();};idbTransaction.onerror=function(){reject(idbTransaction.error);};idbTransaction.onabort=function(){reject(idbTransaction.error);};});}
Transaction.prototype.objectStore=function(){return new ObjectStore(this._tx.objectStore.apply(this._tx,arguments));};proxyProperties(Transaction,'_tx',['objectStoreNames','mode']);proxyMethods(Transaction,'_tx',IDBTransaction,['abort']);function UpgradeDB(db,oldVersion,transaction){this._db=db;this.oldVersion=oldVersion;this.transaction=new Transaction(transaction);}
UpgradeDB.prototype.createObjectStore=function(){return new ObjectStore(this._db.createObjectStore.apply(this._db,arguments));};proxyProperties(UpgradeDB,'_db',['name','version','objectStoreNames']);proxyMethods(UpgradeDB,'_db',IDBDatabase,['deleteObjectStore','close']);function DB(db){this._db=db;}
DB.prototype.transaction=function(){return new Transaction(this._db.transaction.apply(this._db,arguments));};proxyProperties(DB,'_db',['name','version','objectStoreNames']);proxyMethods(DB,'_db',IDBDatabase,['close']);['openCursor','openKeyCursor'].forEach(function(funcName){[ObjectStore,Index].forEach(function(Constructor){if(!(funcName in Constructor.prototype))return;Constructor.prototype[funcName.replace('open','iterate')]=function(){var args=toArray(arguments);var callback=args[args.length-1];var nativeObject=this._store||this._index;var request=nativeObject[funcName].apply(nativeObject,args.slice(0,-1));request.onsuccess=function(){callback(request.result);};};});});[Index,ObjectStore].forEach(function(Constructor){if(Constructor.prototype.getAll)return;Constructor.prototype.getAll=function(query,count){var instance=this;var items=[];return new Promise(function(resolve){instance.iterateCursor(query,function(cursor){if(!cursor){resolve(items);return;}
items.push(cursor.value);if(count!==undefined&&items.length==count){resolve(items);return;}
cursor.continue();});});};});var exp={open:function(name,version,upgradeCallback){var p=promisifyRequestCall(indexedDB,'open',[name,version]);var request=p.request;if(request){request.onupgradeneeded=function(event){if(upgradeCallback){upgradeCallback(new UpgradeDB(request.result,event.oldVersion,request.transaction));}};}
return p.then(function(db){return new DB(db);});},delete:function(name){return promisifyRequestCall(indexedDB,'deleteDatabase',[name]);}};if(typeof module!=='undefined'){module.exports=exp;module.exports.default=module.exports;}
else{self.idb=exp;}}());
/**
 * Common database helper functions.
 */
//import idb from 'idb';
class DBHelper {

	/**
	 * Database URL.
	 * Change this to restaurants.json file location on your server.
	 */
	static get DATABASE_URL() {
		const port = 1337; // Change this to your server port
		return `http://localhost:${port}/`;
	}

	static OpenDbPromise () {
		if (!navigator.serviceWorker) {
			return Promise.resolve();
		}
		return idb.open('mws-restaurant', 2, function(upgradeDb) {
			switch (upgradeDb.oldVersion) {
				case 0:
					upgradeDb.createObjectStore('restaurants', {
						keyPath: 'id'
					});
				case 1:
					upgradeDb.createObjectStore('reviews', {
						keyPath: 'id'
					}).createIndex('restaurant', 'restaurant_id');
					upgradeDb.createObjectStore('offline-reviews', {
						autoIncrement: true
					}).createIndex('restaurant', 'restaurant_id');
			}
		});
	}
	/**
	 * Fetch all restaurants.
	 */
	static fetchRestaurants(callback) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			if (!db) {
				DBHelper.fetchRestaurantsFromServer(callback);
			}
			const index = db.transaction('restaurants').objectStore('restaurants');
			return index.getAll().then(restaurants => {
				if ((!restaurants) || (!restaurants.length)) {
					DBHelper.fetchRestaurantsFromServer(callback)
				}
				callback(null, restaurants);
			});
		});
	}
	static fetchRestaurantsFromServer(callback) {
		fetch(DBHelper.DATABASE_URL + 'restaurants')
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				DBHelper.saveRestaurantsIdb(data);
				callback(null, data);
			});
	}
	static saveRestaurantsIdb(restaurants) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			let store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
			restaurants.forEach(function(restaurant) {
				store.put(restaurant);
			});
		});
	}

	/**
	 * Fetch a restaurant by its ID.
	 */
	static fetchRestaurantById(id, callback) {
		// fetch all restaurants with proper error handling.
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			if (!db) {
				DBHelper.fetchRestaurantByIdFromServer(id, callback);
			}
			const index = db.transaction('restaurants').objectStore('restaurants');
			return index.get(id).then(restaurant => {
				if (restaurant) {
					DBHelper.fetchReviewsByRestaurantId(restaurant, callback);
				}
				DBHelper.fetchRestaurantByIdFromServer(id, callback);
			});
		});		
	}
	static fetchRestaurantByIdFromServer(id, callback) {
		fetch(DBHelper.DATABASE_URL + `restaurants/${id}`)
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				DBHelper.fetchReviewsFromServer(data, callback);
			});
	}
	/**
	 * Fetch restaurants by a cuisine type with proper error handling.
	 */
	static fetchRestaurantByCuisine(cuisine, callback) {
		// Fetch all restaurants  with proper error handling
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Filter restaurants to have only given cuisine type
				const results = restaurants.filter(r => r.cuisine_type == cuisine);
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch restaurants by a neighborhood with proper error handling.
	 */
	static fetchRestaurantByNeighborhood(neighborhood, callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Filter restaurants to have only given neighborhood
				const results = restaurants.filter(r => r.neighborhood == neighborhood);
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
	 */
	static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				let results = restaurants;
				if (cuisine != 'all') { // filter by cuisine
					results = results.filter(r => r.cuisine_type == cuisine);
				}
				if (neighborhood != 'all') { // filter by neighborhood
					results = results.filter(r => r.neighborhood == neighborhood);
				}
				callback(null, results);
			}
		});
	}

	/**
	 * Fetch all neighborhoods with proper error handling.
	 */
	static fetchNeighborhoods(callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Get all neighborhoods from all restaurants
				const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
				// Remove duplicates from neighborhoods
				const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
				callback(null, uniqueNeighborhoods);
			}
		});
	}

	/**
	 * Fetch all cuisines with proper error handling.
	 */
	static fetchCuisines(callback) {
		// Fetch all restaurants
		DBHelper.fetchRestaurants((error, restaurants) => {
			if (error) {
				callback(error, null);
			} else {
				// Get all cuisines from all restaurants
				const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
				// Remove duplicates from cuisines
				const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
				callback(null, uniqueCuisines);
			}
		});
	}

	static fetchReviewsByRestaurantId (restaurant, callback) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			if (!db) {
				DBHelper.fetchReviewsFromServer(restaurant, callback);
			}
			const index = db.transaction('reviews').objectStore('reviews');
			index.getAll(restaurant.id).then(reviews => {
				if ((!reviews) || (!reviews.length)) {
					DBHelper.fetchReviewsFromServer(restaurant, callback);
				}
				restaurant.reviews = reviews;
				DBHelper.fetchOfflineReviews(restaurant, callback);
				//callback(null, restaurant);
			});
		});
	} 
	static fetchOfflineReviews (restaurant, callback) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			
			if (!db) {
				DBHelper.fetchReviewsFromServer(restaurant, callback);
			}
			const index = db.transaction('offline-reviews').objectStore('offline-reviews');
			index.getAll(restaurant.id).then(reviews => {
				if ((reviews) && (reviews.length)) {
					reviews.forEach(review => {
						restaurant.reviews.push(review);
					});
				}
				callback(null, restaurant);
				//DBHelper.fetchReviewsFromServer(restaurant, callback);
			});
		});
	};
	static fetchReviewsFromServer (restaurant, callback) {
		fetch(this.DATABASE_URL + `reviews/?restaurant_id=${restaurant.id}`)
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				DBHelper.saveReviewsIdb(data);
				restaurant.reviews = data;

				DBHelper.fetchOfflineReviews(restaurant, callback);
			});
	}
	static saveReview (review) {
		return fetch(this.DATABASE_URL + 'reviews', {
			method: 'POST',
			body: JSON.stringify(review),
			headers: new Headers({
				'Content-Type': 'application/json'
			})
		});
	}
	static saveReviewOffline (review) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			let store = db.transaction('offline-reviews', 'readwrite').objectStore('offline-reviews');
			store.put(review);
		});
	}
	static uploadOfflineReviews () {
		const dbPromise = DBHelper.OpenDbPromise();
		dbPromise.then(function(db) {
			const index = db.transaction('offline-reviews', 'readwrite').objectStore('offline-reviews');
			index.getAll().then(reviews => {
				if (reviews) {
					reviews.forEach(function (review) {
						review.offline = false;

						DBHelper.saveReview(review).then(function (response) {
							return response.json();
						}).then(function (data) {
							DBHelper.saveReviewsIdb(data);
						});
					});
					index.clear();
					let offlineReviews = document.querySelectorAll('.review-offline');
					offlineReviews.forEach(offRev => {
						offRev.className = '';
					});
				}
			});
		});
	}
	static saveReviewsIdb (reviews) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			let store = db.transaction('reviews', 'readwrite').objectStore('reviews');
			if (Array.isArray(reviews)) {
				reviews.forEach(function(review) {
					store.put(review);
				});
			}
			else {
				store.put(reviews);
			}
		});
	}
	/**
	 * Restaurant page URL.
	 */
	static urlForRestaurant(restaurant) {
		return (`./restaurant.html?id=${restaurant.id}`);
	}

	/**
	 * Restaurant image URL.
	 */
	static imageUrlForRestaurant(restaurant) {
		return (`/img/296/${restaurant.photograph}_296.jpg`);
	}
	static imageSrcSetForRestaurantMain(restaurant) {
		return (`/img/400/${restaurant.photograph}_400.jpg 444w, /img/625/${restaurant.photograph}_625.jpg 549w, /img/296/${restaurant.photograph}_296.jpg 550w`);
	}
	static imageSrcSetForRestaurantDetail(restaurant) {
		return (`/img/296/${restaurant.photograph}_296.jpg 336w, /img/400/${restaurant.photograph}_400.jpg 439w, /img/625/${restaurant.photograph}_625.jpg 440w`);    
	}
	/**
	 * Map marker for a restaurant.
	 */
	static mapMarkerForRestaurant(restaurant, map) {
		const marker = new google.maps.Marker({
			position: restaurant.latlng,
			title: restaurant.name,
			url: DBHelper.urlForRestaurant(restaurant),
			map: map,
			animation: google.maps.Animation.DROP}
		);
		return marker;
	}

	static updateFavourite (restaurantId, isFavourite) { 
		fetch(this.DATABASE_URL + `restaurants/${restaurantId}/?is_favorite=${isFavourite}`, {
			method: 'PUT'
		}).then(
			DBHelper.updateFavouriteIdb(restaurantId, isFavourite)
		);
	}

	static updateFavouriteIdb (restaurantId, isFavourite) {
		const dbPromise = this.OpenDbPromise();
		dbPromise.then(function(db) {
			let store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
			store.get(restaurantId).then(restaurant => {
				restaurant.is_favorite = isFavourite;
				store.put(restaurant);
			});
		});
	}
}
let app = {};
let registerServiceWorker = function () {
	console.log('called');
	if (!navigator.serviceWorker) {
		console.log('no serviceworker');
		return;
	}
	navigator.serviceWorker.register('/sw.js').then(function (reg) {
		if (!navigator.serviceWorker.controller) {
			return;
		}
		if (reg.waiting) {
			console.log('reg.waiting');
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

let restaurants;
let neighborhoods;
let cuisines;
var map;
var markers = [];
/**
 *  *  * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
	console.log('dom loaded');
	registerServiceWorker();
	fetchNeighborhoods();
	fetchCuisines();
	DBHelper.OpenDbPromise();	
});
/**
 * Fetch all neighborhoods and set their HTML.
 */
let fetchNeighborhoods = () => {
	DBHelper.fetchNeighborhoods((error, neighborhoods) => {
		if (error) { // Got an error
			return error;
		} else {
			self.neighborhoods = neighborhoods;
			fillNeighborhoodsHTML();
		}
	});
};
/**
 * Set neighborhoods HTML.
 */
let fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
	const select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(neighborhood => {
		const option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
};

/**
 * Fetch all cuisines and set their HTML.
 */
let fetchCuisines = () => {
	DBHelper.fetchCuisines((error, cuisines) => {
		if (error) { // Got an error!
			return error;
		} else {
			self.cuisines = cuisines;
			fillCuisinesHTML();
		}
	});
};

/**
 * Set cuisines HTML.
 */
let fillCuisinesHTML = (cuisines = self.cuisines) => {
	const select = document.getElementById('cuisines-select');

	cuisines.forEach(cuisine => {
		const option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
	let loc = {
		lat: 40.722216,
		lng: -73.987501
	};
	self.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 12,
		center: loc,
		scrollwheel: false
	});
	google.maps.event.addDomListener(window, 'resize', function() {
		var center = self.map.getCenter();
		google.maps.event.trigger(self.map, 'resize');
		self.map.setCenter(center); 
	});
	google.maps.event.addListenerOnce(map, 'idle', () => {
		document.getElementsByTagName('iframe')[0].title = 'Google Maps';
	});
	updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
let updateRestaurants = () => {
	const cSelect = document.getElementById('cuisines-select');
	const nSelect = document.getElementById('neighborhoods-select');

	const cIndex = cSelect.selectedIndex;
	const nIndex = nSelect.selectedIndex;

	const cuisine = cSelect[cIndex].value;
	const neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
		if (error) { // Got an error!
			return error;
		} else {
			resetRestaurants(restaurants);
			fillRestaurantsHTML();
			lazyLoadImgs();
		}
	});
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
let resetRestaurants = (restaurants) => {
	// Remove all restaurants
	self.restaurants = [];
	const ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	self.markers.forEach(m => m.setMap(null));
	self.markers = [];
	self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
let fillRestaurantsHTML = (restaurants = self.restaurants) => {
	const ul = document.getElementById('restaurants-list');
	restaurants.forEach(restaurant => {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
let createRestaurantHTML = (restaurant) => {
	const li = document.createElement('li');

	const favStar = document.createElement('button');
	favStar.className = 'fav-star';
	if (restaurant.is_favorite) {
		favStar.innerHTML = '★';
		favStar.setAttribute('aria-label', 'Remove restaurant from favourites.');
	}
	else {
		favStar.innerHTML = '☆';
		favStar.setAttribute('aria-label', 'Add restaurant to favourites.');
	}
	favStar.setAttribute('role', 'button');
	favStar.onclick = function () {
		if (this.innerHTML == '★') {
			DBHelper.updateFavourite(restaurant.id, false);
			this.innerHTML = '☆';
		} 
		else {
			DBHelper.updateFavourite(restaurant.id, true);
			this.innerHTML = '★';
		}
	};
	li.append(favStar);


	const image = document.createElement('img');
	image.className = 'restaurant-img';
	image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.dataset.srcset = DBHelper.imageSrcSetForRestaurantMain(restaurant);
	image.alt = 'Image of ' + restaurant.name;
	li.append(image);

	const detailHolder = document.createElement('div');

	const name = document.createElement('h2');
	name.innerHTML = restaurant.name;
	detailHolder.append(name);

	const neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	detailHolder.append(neighborhood);

	const address = document.createElement('p');
	address.innerHTML = restaurant.address;
	detailHolder.append(address);

	const more = document.createElement('a');
	more.innerHTML = 'View Details';
	more.href = DBHelper.urlForRestaurant(restaurant);
	detailHolder.append(more);

	li.append(detailHolder);

	return li;
};

/**
 * Add markers for current restaurants to the map.
 */
let addMarkersToMap = (restaurants = self.restaurants) => {
	restaurants.forEach(restaurant => {
		// Add marker to the map
		const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		google.maps.event.addListener(marker, 'click', () => {
			window.location.href = marker.url;
		});
		self.markers.push(marker);
	});
};
//let restaurant;
if (window.location.pathname === '/restaurant.html') {
	
	var map;
	
	/**
	 * Initialize Google map, called from HTML.
	 */
	window.initMap = () => {
		fetchRestaurantFromURL((error, restaurant) => {
			if (error) { // Got an error!
			} else {
				self.map = new google.maps.Map(document.getElementById('map'), {
					zoom: 16,
					center: restaurant.latlng,
					scrollwheel: false
				});
				google.maps.event.addListenerOnce(map, 'idle', () => {
					document.getElementsByTagName('iframe')[0].title = 'Google Maps';
				});
				fillBreadcrumb();
				DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
			}
		});
	};
	/**
	 * Scroll for map on restaurant page
	 */
	window.onscroll = function () {
		if ((window.innerWidth > 640) && (window.innerWidth < 1330)) {
			let map = document.getElementById('map-container');
			let reviews = document.getElementById('reviews-container');
			if (window.innerHeight > reviews.getBoundingClientRect().top) {
				map.className = 'map-absolute';
			}
			else {
				map.className = 'map-fixed';
			}
		}
	};
	window.onresize = function () {
		let map = document.getElementById('map-container');
		if ((window.innerWidth > 640) && (window.innerWidth < 1330)) {
			google.maps.event.trigger(map, "resize");
			window.onscroll();
		} 
		else {
			google.maps.event.trigger(map, "resize");
			document.getElementById('map-container').className = '';
		}
	};
	window.onload = function () {
		window.onscroll();
		if (navigator.onLine) {
			DBHelper.uploadOfflineReviews();
		}
	};
}
/**
 * Get current restaurant from page URL.
 */
let fetchRestaurantFromURL = (callback) => {
	if (self.restaurant) { // restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	const id = getParameterByName('id');
	if (!id) { // no id found in URL
		var error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, (error, restaurant) => {
			self.restaurant = restaurant;
			if (!restaurant) {
				return;
			}
			fillRestaurantHTML();
			lazyLoadImgs();
			callback(null, restaurant);
		});
	}
};

/**
 * Create restaurant HTML and add it to the webpage
 */
let fillRestaurantHTML = (restaurant = self.restaurant) => {
	const name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	const address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	const image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
	image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.dataset.srcset = DBHelper.imageSrcSetForRestaurantDetail(restaurant);
	image.alt = 'Image of ' + restaurant.name;

	const cuisine = document.getElementById('restaurant-cuisine');
	cuisine.innerHTML = restaurant.cuisine_type;

	// fill operating hours
	if (restaurant.operating_hours) {
		fillRestaurantHoursHTML();
	}
	// fill reviews
	fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
	const hours = document.getElementById('restaurant-hours');
	for (let key in operatingHours) {
		const row = document.createElement('tr');

		const day = document.createElement('td');
		day.innerHTML = key;
		row.appendChild(day);

		const time = document.createElement('td');
		time.innerHTML = operatingHours[key];
		row.appendChild(time);

		hours.appendChild(row);
	}
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
let fillReviewsHTML = (reviews = self.restaurant.reviews) => {
	const container = document.getElementById('reviews-container');
	const title = document.createElement('h3');
	title.innerHTML = 'Reviews';
	container.appendChild(title);

	if (!reviews) {
		const noReviews = document.createElement('p');
		noReviews.innerHTML = 'No reviews yet!';
		container.appendChild(noReviews);
		return;
	}
	const ul = document.getElementById('reviews-list');
	reviews.forEach(review => {
		ul.appendChild(createReviewHTML(review));
	});
	container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
let createReviewHTML = (review) => {
	const li = document.createElement('li');
	const name = document.createElement('p');
	name.innerHTML = review.name;
	li.appendChild(name);

	const date = document.createElement('p');
	date.innerHTML = review.date;
	li.appendChild(date);

	const rating = document.createElement('p');
	rating.innerHTML = `Rating: ${review.rating}`;
	li.appendChild(rating);

	const comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	if (review.offline) {
		li.className = 'review-offline';
	}

	return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
let fillBreadcrumb = (restaurant=self.restaurant) => {
	const breadcrumb = document.getElementById('breadcrumb');
	const li = document.createElement('li');
	li.innerHTML = restaurant.name;
	li.setAttribute('aria-current', 'page');
	breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
let getParameterByName = (name, url) => {
	if (!url)
		url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
		results = regex.exec(url);
	if (!results)
		return null;
	if (!results[2])
		return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

let submitReview = function () {
	event.preventDefault();
	let restaurantId = getParameterByName('id');
	let name = document.getElementById('review-name').value;
	let rating = document.getElementById('review-rating');
	rating = rating.options[rating.selectedIndex].value;
	let comment = document.getElementById('review-comment').value;
	const review = {
		'restaurant_id': restaurantId,
		'name': name,
		'rating': rating,
		'comments': comment
	};
	if (!navigator.onLine) {
		review.offline = true;
		DBHelper.saveReviewOffline(review);
		window.addEventListener('online', DBHelper.uploadOfflineReviews);
	} else {
		DBHelper.saveReview(review);
	}
	document.getElementById('reviews-list').appendChild(createReviewHTML(review));
	document.getElementById('add-review-form').reset();
};