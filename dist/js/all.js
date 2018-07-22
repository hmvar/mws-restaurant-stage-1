'use strict';
(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }
  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };request.onerror = function () {
        reject(request.error);
      };
    });
  }
  function promisifyRequestCall(obj, method, args) {
    var request;var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);promisifyRequest(request).then(resolve, reject);
    });p.request = request;return p;
  }
  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);return p.then(function (value) {
      if (!value) return;return new Cursor(value, p.request);
    });
  }
  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, { get: function get() {
          return this[targetProp][prop];
        }, set: function set(val) {
          this[targetProp][prop] = val;
        } });
    });
  }
  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }
  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }
  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }
  function Index(index) {
    this._index = index;
  }
  proxyProperties(Index, '_index', ['name', 'keyPath', 'multiEntry', 'unique']);proxyRequestMethods(Index, '_index', IDBIndex, ['get', 'getKey', 'getAll', 'getAllKeys', 'count']);proxyCursorRequestMethods(Index, '_index', IDBIndex, ['openCursor', 'openKeyCursor']);function Cursor(cursor, request) {
    this._cursor = cursor;this._request = request;
  }
  proxyProperties(Cursor, '_cursor', ['direction', 'key', 'primaryKey', 'value']);proxyRequestMethods(Cursor, '_cursor', IDBCursor, ['update', 'delete']);['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;Cursor.prototype[methodName] = function () {
      var cursor = this;var args = arguments;return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;return new Cursor(value, cursor._request);
        });
      });
    };
  });function ObjectStore(store) {
    this._store = store;
  }
  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };proxyProperties(ObjectStore, '_store', ['name', 'keyPath', 'indexNames', 'autoIncrement']);proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, ['put', 'add', 'delete', 'clear', 'get', 'getAll', 'getKey', 'getAllKeys', 'count']);proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, ['openCursor', 'openKeyCursor']);proxyMethods(ObjectStore, '_store', IDBObjectStore, ['deleteIndex']);function Transaction(idbTransaction) {
    this._tx = idbTransaction;this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }
  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };proxyProperties(Transaction, '_tx', ['objectStoreNames', 'mode']);proxyMethods(Transaction, '_tx', IDBTransaction, ['abort']);function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;this.oldVersion = oldVersion;this.transaction = new Transaction(transaction);
  }
  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };proxyProperties(UpgradeDB, '_db', ['name', 'version', 'objectStoreNames']);proxyMethods(UpgradeDB, '_db', IDBDatabase, ['deleteObjectStore', 'close']);function DB(db) {
    this._db = db;
  }
  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };proxyProperties(DB, '_db', ['name', 'version', 'objectStoreNames']);proxyMethods(DB, '_db', IDBDatabase, ['close']);['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      if (!(funcName in Constructor.prototype)) return;Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);var callback = args[args.length - 1];var nativeObject = this._store || this._index;var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  });[Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;Constructor.prototype.getAll = function (query, count) {
      var instance = this;var items = [];return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);return;
          }
          items.push(cursor.value);if (count !== undefined && items.length == count) {
            resolve(items);return;
          }
          cursor.continue();
        });
      });
    };
  });var exp = { open: function open(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);var request = p.request;if (request) {
        request.onupgradeneeded = function (event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }
      return p.then(function (db) {
        return new DB(db);
      });
    }, delete: function _delete(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    } };if (typeof module !== 'undefined') {
    module.exports = exp;module.exports.default = module.exports;
  } else {
    self.idb = exp;
  }
})();
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
		key: 'OpenDbPromise',
		value: function OpenDbPromise() {
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
			var dbPromise = this.OpenDbPromise();
			dbPromise.then(function (db) {
				if (!db) {
					DBHelper.fetchRestaurantsFromServer(callback);
				}
				var index = db.transaction('restaurants').objectStore('restaurants');
				return index.getAll().then(function (restaurants) {
					if (!restaurants || !restaurants.length) {
						DBHelper.fetchRestaurantsFromServer(callback);
					}
					callback(null, restaurants);
				});
			});
		}
	}, {
		key: 'fetchRestaurantsFromServer',
		value: function fetchRestaurantsFromServer(callback) {
			fetch(DBHelper.DATABASE_URL).then(function (response) {
				return response.json();
			}).then(function (data) {
				DBHelper.saveRestaurantsIdb(data);
				callback(null, data);
			});
		}
	}, {
		key: 'saveRestaurantsIdb',
		value: function saveRestaurantsIdb(restaurants) {
			var dbPromise = this.OpenDbPromise();
			dbPromise.then(function (db) {
				var store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
				restaurants.forEach(function (restaurant) {
					store.put(restaurant);
				});
			});
		}

		/**
   * Fetch a restaurant by its ID.
   */

	}, {
		key: 'fetchRestaurantById',
		value: function fetchRestaurantById(id, callback) {
			// fetch all restaurants with proper error handling.
			var dbPromise = this.OpenDbPromise();
			dbPromise.then(function (db) {
				if (!db) {
					DBHelper.fetchRestaurantByIdFromServer(id, callback);
				}
				var index = db.transaction('restaurants').objectStore('restaurants');
				return index.get(id).then(function (restaurant) {
					if (!restaurant) {
						callback(null, restaurant);
					}
					DBHelper.fetchRestaurantByIdFromServer(id, callback);
				});
			});
		}
	}, {
		key: 'fetchRestaurantByIdFromServer',
		value: function fetchRestaurantByIdFromServer(id, callback) {
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
var lazyLoadImgs = function lazyLoadImgs() {
	var imgs = document.querySelectorAll('img[data-src]');
	imgs.forEach(function (img) {
		img.setAttribute('src', img.getAttribute('data-src'));
		img.setAttribute('srcset', img.getAttribute('data-srcset'));
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
	registerServiceWorker();
	fetchNeighborhoods();
	fetchCuisines();
	DBHelper.OpenDbPromise();
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
			lazyLoadImgs();
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
	image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.dataset.srcset = DBHelper.imageSrcSetForRestaurantMain(restaurant);
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
'use strict';

//let restaurant;
if (window.location.pathname === '/restaurant.html') {

	var map;

	/**
  * Initialize Google map, called from HTML.
  */
	window.initMap = function () {
		fetchRestaurantFromURL(function (error, restaurant) {
			if (error) {// Got an error!
			} else {
				self.map = new google.maps.Map(document.getElementById('map'), {
					zoom: 16,
					center: restaurant.latlng,
					scrollwheel: false
				});
				google.maps.event.addListenerOnce(map, 'idle', function () {
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
		if (window.innerWidth > 640 && window.innerWidth < 1330) {
			var _map = document.getElementById('map-container');
			var reviews = document.getElementById('reviews-container');
			if (window.innerHeight > reviews.getBoundingClientRect().top) {
				_map.className = 'map-absolute';
			} else {
				_map.className = 'map-fixed';
			}
		}
	};
	window.onresize = function () {
		if (window.innerWidth > 640 && window.innerWidth < 1330) {
			window.onscroll();
		} else {
			document.getElementById('map-container').className = '';
		}
	};
	window.onload = function () {
		window.onscroll();
	};
}
/**
 * Get current restaurant from page URL.
 */
var fetchRestaurantFromURL = function fetchRestaurantFromURL(callback) {
	if (self.restaurant) {
		// restaurant already fetched!
		callback(null, self.restaurant);
		return;
	}
	var id = getParameterByName('id');
	if (!id) {
		// no id found in URL
		var error = 'No restaurant id in URL';
		callback(error, null);
	} else {
		DBHelper.fetchRestaurantById(id, function (error, restaurant) {
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
var fillRestaurantHTML = function fillRestaurantHTML() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	var name = document.getElementById('restaurant-name');
	name.innerHTML = restaurant.name;

	var address = document.getElementById('restaurant-address');
	address.innerHTML = restaurant.address;

	var image = document.getElementById('restaurant-img');
	image.className = 'restaurant-img';
	image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
	image.dataset.srcset = DBHelper.imageSrcSetForRestaurantDetail(restaurant);
	image.alt = 'Image of ' + restaurant.name;

	var cuisine = document.getElementById('restaurant-cuisine');
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
var fillRestaurantHoursHTML = function fillRestaurantHoursHTML() {
	var operatingHours = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant.operating_hours;

	var hours = document.getElementById('restaurant-hours');
	for (var key in operatingHours) {
		var row = document.createElement('tr');

		var day = document.createElement('td');
		day.innerHTML = key;
		row.appendChild(day);

		var time = document.createElement('td');
		time.innerHTML = operatingHours[key];
		row.appendChild(time);

		hours.appendChild(row);
	}
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
var fillReviewsHTML = function fillReviewsHTML() {
	var reviews = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant.reviews;

	var container = document.getElementById('reviews-container');
	var title = document.createElement('h3');
	title.innerHTML = 'Reviews';
	container.appendChild(title);

	if (!reviews) {
		var noReviews = document.createElement('p');
		noReviews.innerHTML = 'No reviews yet!';
		container.appendChild(noReviews);
		return;
	}
	var ul = document.getElementById('reviews-list');
	reviews.forEach(function (review) {
		ul.appendChild(createReviewHTML(review));
	});
	container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
var createReviewHTML = function createReviewHTML(review) {
	var li = document.createElement('li');
	var name = document.createElement('p');
	name.innerHTML = review.name;
	li.appendChild(name);

	var date = document.createElement('p');
	date.innerHTML = review.date;
	li.appendChild(date);

	var rating = document.createElement('p');
	rating.innerHTML = 'Rating: ' + review.rating;
	li.appendChild(rating);

	var comments = document.createElement('p');
	comments.innerHTML = review.comments;
	li.appendChild(comments);

	return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
var fillBreadcrumb = function fillBreadcrumb() {
	var restaurant = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : self.restaurant;

	var breadcrumb = document.getElementById('breadcrumb');
	var li = document.createElement('li');
	li.innerHTML = restaurant.name;
	li.setAttribute('aria-current', 'page');
	breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
var getParameterByName = function getParameterByName(name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, '\\$&');
	var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
	    results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, ' '));
};