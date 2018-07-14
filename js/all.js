'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Common database helper functions.
 */
//import idb from 'idb';
var DBHelper = function () {
	function DBHelper() {
		_classCallCheck(this, DBHelper);
	}

	_createClass(DBHelper, null, [{
		key: 'dbPromise',
		value: function dbPromise() {
			if (!navigator.serviceWorker) {
				return Promise.resolve();
			}
			return idb.open('mws-restaurant', 1, function (upgradeDb) {
				var store = upgradeDb.createObjectStore('restaurants', {
					keyPath: 'id'
				});
			});
		}

		/**
   * Fetch all restaurants.
   */

	}, {
		key: 'fetchRestaurants',
		value: function fetchRestaurants(callback) {
			fetch(DBHelper.DATABASE_URL).then(function (response) {
				return response.json();
			}).then(function (data) {
				callback(null, data);
			});
		}

		/**
   * Fetch a restaurant by its ID.
   */

	}, {
		key: 'fetchRestaurantById',
		value: function fetchRestaurantById(id, callback) {
			// fetch all restaurants with proper error handling.
			fetch(DBHelper.DATABASE_URL + ('/' + id)).then(function (response) {
				return response.json();
			}).then(function (data) {
				callback(null, data);
			});
		}

		/**
   * Fetch restaurants by a cuisine type with proper error handling.
   */

	}, {
		key: 'fetchRestaurantByCuisine',
		value: function fetchRestaurantByCuisine(cuisine, callback) {
			// Fetch all restaurants  with proper error handling
			DBHelper.fetchRestaurants(function (error, restaurants) {
				if (error) {
					callback(error, null);
				} else {
					// Filter restaurants to have only given cuisine type
					var results = restaurants.filter(function (r) {
						return r.cuisine_type == cuisine;
					});
					callback(null, results);
				}
			});
		}

		/**
   * Fetch restaurants by a neighborhood with proper error handling.
   */

	}, {
		key: 'fetchRestaurantByNeighborhood',
		value: function fetchRestaurantByNeighborhood(neighborhood, callback) {
			// Fetch all restaurants
			DBHelper.fetchRestaurants(function (error, restaurants) {
				if (error) {
					callback(error, null);
				} else {
					// Filter restaurants to have only given neighborhood
					var results = restaurants.filter(function (r) {
						return r.neighborhood == neighborhood;
					});
					callback(null, results);
				}
			});
		}

		/**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */

	}, {
		key: 'fetchRestaurantByCuisineAndNeighborhood',
		value: function fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
			// Fetch all restaurants
			DBHelper.fetchRestaurants(function (error, restaurants) {
				if (error) {
					callback(error, null);
				} else {
					var results = restaurants;
					if (cuisine != 'all') {
						// filter by cuisine
						results = results.filter(function (r) {
							return r.cuisine_type == cuisine;
						});
					}
					if (neighborhood != 'all') {
						// filter by neighborhood
						results = results.filter(function (r) {
							return r.neighborhood == neighborhood;
						});
					}
					callback(null, results);
				}
			});
		}

		/**
   * Fetch all neighborhoods with proper error handling.
   */

	}, {
		key: 'fetchNeighborhoods',
		value: function fetchNeighborhoods(callback) {
			// Fetch all restaurants
			DBHelper.fetchRestaurants(function (error, restaurants) {
				if (error) {
					callback(error, null);
				} else {
					// Get all neighborhoods from all restaurants
					var neighborhoods = restaurants.map(function (v, i) {
						return restaurants[i].neighborhood;
					});
					// Remove duplicates from neighborhoods
					var uniqueNeighborhoods = neighborhoods.filter(function (v, i) {
						return neighborhoods.indexOf(v) == i;
					});
					callback(null, uniqueNeighborhoods);
				}
			});
		}

		/**
   * Fetch all cuisines with proper error handling.
   */

	}, {
		key: 'fetchCuisines',
		value: function fetchCuisines(callback) {
			// Fetch all restaurants
			DBHelper.fetchRestaurants(function (error, restaurants) {
				if (error) {
					callback(error, null);
				} else {
					// Get all cuisines from all restaurants
					var cuisines = restaurants.map(function (v, i) {
						return restaurants[i].cuisine_type;
					});
					// Remove duplicates from cuisines
					var uniqueCuisines = cuisines.filter(function (v, i) {
						return cuisines.indexOf(v) == i;
					});
					callback(null, uniqueCuisines);
				}
			});
		}

		/**
   * Restaurant page URL.
   */

	}, {
		key: 'urlForRestaurant',
		value: function urlForRestaurant(restaurant) {
			return './restaurant.html?id=' + restaurant.id;
		}

		/**
   * Restaurant image URL.
   */

	}, {
		key: 'imageUrlForRestaurant',
		value: function imageUrlForRestaurant(restaurant) {
			return '/img/296/' + restaurant.photograph + '_296.jpg';
		}
	}, {
		key: 'imageSrcSetForRestaurantMain',
		value: function imageSrcSetForRestaurantMain(restaurant) {
			return '/img/400/' + restaurant.photograph + '_400.jpg 444w, /img/625/' + restaurant.photograph + '_625.jpg 549w, /img/296/' + restaurant.photograph + '_296.jpg 550w';
		}
	}, {
		key: 'imageSrcSetForRestaurantDetail',
		value: function imageSrcSetForRestaurantDetail(restaurant) {
			return '/img/296/' + restaurant.photograph + '_296.jpg 336w, /img/400/' + restaurant.photograph + '_400.jpg 439w, /img/625/' + restaurant.photograph + '_625.jpg 440w';
		}
		/**
   * Map marker for a restaurant.
   */

	}, {
		key: 'mapMarkerForRestaurant',
		value: function mapMarkerForRestaurant(restaurant, map) {
			var marker = new google.maps.Marker({
				position: restaurant.latlng,
				title: restaurant.name,
				url: DBHelper.urlForRestaurant(restaurant),
				map: map,
				animation: google.maps.Animation.DROP });
			return marker;
		}
	}, {
		key: 'DATABASE_URL',


		/**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
		get: function get() {
			var port = 1337; // Change this to your server port
			return 'http://localhost:' + port + '/restaurants';
		}
	}]);

	return DBHelper;
}();
'use strict';

var app = {};
var registerServiceWorker = function registerServiceWorker() {
	if (!navigator.serviceWorker) return;
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
'use strict';

var restaurants = void 0;
var neighborhoods = void 0;
var cuisines = void 0;
var map;
var markers = [];
/**
 *  *  * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', function () {
	//registerServiceWorker();
	fetchNeighborhoods();
	fetchCuisines();
	DBHelper.dbPromise();
});
/**
 * Fetch all neighborhoods and set their HTML.
 */
var fetchNeighborhoods = function fetchNeighborhoods() {
	DBHelper.fetchNeighborhoods(function (error, neighborhoods) {
		if (error) {
			// Got an error
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
var fillNeighborhoodsHTML = function fillNeighborhoodsHTML() {
	var neighborhoods = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.neighborhoods;

	var select = document.getElementById('neighborhoods-select');
	neighborhoods.forEach(function (neighborhood) {
		var option = document.createElement('option');
		option.innerHTML = neighborhood;
		option.value = neighborhood;
		select.append(option);
	});
};

/**
 * Fetch all cuisines and set their HTML.
 */
var fetchCuisines = function fetchCuisines() {
	DBHelper.fetchCuisines(function (error, cuisines) {
		if (error) {
			// Got an error!
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
var fillCuisinesHTML = function fillCuisinesHTML() {
	var cuisines = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.cuisines;

	var select = document.getElementById('cuisines-select');

	cuisines.forEach(function (cuisine) {
		var option = document.createElement('option');
		option.innerHTML = cuisine;
		option.value = cuisine;
		select.append(option);
	});
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = function () {
	var loc = {
		lat: 40.722216,
		lng: -73.987501
	};
	self.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 12,
		center: loc,
		scrollwheel: false
	});
	google.maps.event.addDomListener(window, 'resize', function () {
		var center = self.map.getCenter();
		google.maps.event.trigger(self.map, 'resize');
		self.map.setCenter(center);
	});
	google.maps.event.addListenerOnce(map, 'idle', function () {
		document.getElementsByTagName('iframe')[0].title = 'Google Maps';
	});
	updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
var updateRestaurants = function updateRestaurants() {
	var cSelect = document.getElementById('cuisines-select');
	var nSelect = document.getElementById('neighborhoods-select');

	var cIndex = cSelect.selectedIndex;
	var nIndex = nSelect.selectedIndex;

	var cuisine = cSelect[cIndex].value;
	var neighborhood = nSelect[nIndex].value;

	DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, function (error, restaurants) {
		if (error) {
			// Got an error!
			return error;
		} else {
			resetRestaurants(restaurants);
			fillRestaurantsHTML();
		}
	});
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
var resetRestaurants = function resetRestaurants(restaurants) {
	// Remove all restaurants
	self.restaurants = [];
	var ul = document.getElementById('restaurants-list');
	ul.innerHTML = '';

	// Remove all map markers
	self.markers.forEach(function (m) {
		return m.setMap(null);
	});
	self.markers = [];
	self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
var fillRestaurantsHTML = function fillRestaurantsHTML() {
	var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

	var ul = document.getElementById('restaurants-list');
	restaurants.forEach(function (restaurant) {
		ul.append(createRestaurantHTML(restaurant));
	});
	addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
var createRestaurantHTML = function createRestaurantHTML(restaurant) {
	var li = document.createElement('li');

	var image = document.createElement('img');
	image.className = 'restaurant-img';
	image.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.srcset = DBHelper.imageSrcSetForRestaurantMain(restaurant);
	image.alt = 'Image of ' + restaurant.name;
	li.append(image);

	var detailHolder = document.createElement('div');

	var name = document.createElement('h2');
	name.innerHTML = restaurant.name;
	detailHolder.append(name);

	var neighborhood = document.createElement('p');
	neighborhood.innerHTML = restaurant.neighborhood;
	detailHolder.append(neighborhood);

	var address = document.createElement('p');
	address.innerHTML = restaurant.address;
	detailHolder.append(address);

	var more = document.createElement('a');
	more.innerHTML = 'View Details';
	more.href = DBHelper.urlForRestaurant(restaurant);
	detailHolder.append(more);

	li.append(detailHolder);

	return li;
};

/**
 * Add markers for current restaurants to the map.
 */
var addMarkersToMap = function addMarkersToMap() {
	var restaurants = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurants;

	restaurants.forEach(function (restaurant) {
		// Add marker to the map
		var marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
		google.maps.event.addListener(marker, 'click', function () {
			window.location.href = marker.url;
		});
		self.markers.push(marker);
	});
};