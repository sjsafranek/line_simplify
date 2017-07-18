
(function () { 'use strict';

	// Haversine
	// https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
	function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
		var R = 6371; // Radius of the earth in km
		var dLat = deg2rad(lat2-lat1);	// deg2rad below
		var dLon = deg2rad(lon2-lon1); 
		var a = 
			Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
			Math.sin(dLon/2) * Math.sin(dLon/2)
			; 
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
		var d = R * c; // Distance in km
		return d;
	}

	function deg2rad(deg) {
		return deg * (Math.PI/180)
	}

	// export as AMD module / Node module / browser or worker variable
	if (typeof define === 'function' && define.amd) define(function() { return getDistanceFromLatLonInKm; });
	else if (typeof module !== 'undefined') module.exports = getDistanceFromLatLonInKm;
	else if (typeof self !== 'undefined') self.haversine = getDistanceFromLatLonInKm;
	else window.haversine = getDistanceFromLatLonInKm;

})();