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