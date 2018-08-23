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
			const index = db.transaction('reviews').objectStore('restaurants');
			return index.getAll(restaurant.id).then(reviews => {
				if (!reviews) {
					return(reviews);
				}
				DBHelper.fetchReviewsFromServer(restaurant, callback);
			});
		});
	} 

	static fetchReviewsFromServer (restaurant, callback) {
		fetch(this.DATABASE_URL + `reviews/?restaurant_id=${restaurant.id}`)
			.then(function (response) {
				return response.json();
			})
			.then(function (data) {
				DBHelper.saveReviewsIdb(data);
				restaurant.reviews = data;
				callback(null, restaurant);
			});
	}

	static saveReviewsIdb(reviews) {
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
		fetch(this.DATABASE_URL + `restaurants/${restaurantId}/?is_favourite=${isFavourite}`, {
			method: 'PUT'
		}).then(this.updateFavouriteIdb(restaurantId, isFavourite));
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

	static saveReview (review) {
		fetch(this.DATABASE_URL + 'reviews', {
			method: 'POST',
			body: JSON.stringify(review),
			headers: new Headers({
				'Content-Type': 'application/json'
			})
		}).then(function (response) {
			return response;
		});
	}

}