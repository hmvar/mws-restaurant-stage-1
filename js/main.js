let restaurants;
let neighborhoods;
let cuisines;
var map;
var markers = [];
/**
 *  *  * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
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