

(function () { 'use strict';

	// Haversine
	// https://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
	function haversine(lat1,lon1,lat2,lon2) {
		function deg2rad(deg) {
			return deg * (Math.PI/180);
		}
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

	// function distOfLine(p1, p2){
	// 	if(!p2.x) p2.x=0; 
	// 	if(!p2.y) p2.y=0; 
	// 	return Math.sqrt(
	// 		(p2.x-p1.x)*(p2.x-p1.x) + (p2.y-p1.y)*(p2.y-p1.y)
	// 	);
	// }

	function sqr(x) {
		return x*x;
	}

	// square distance between 2 points
	function getSqDist(p1, p2) {
	    var dx = p1.x - p2.x,
	        dy = p1.y - p2.y;

	    // return dx * dx + dy * dy;
	    return sqr(dx) + sqr(dy);
	}

	/*
	// square distance from a point to a segment
	function getSqSegDist(p, p1, p2) {

	    var x = p1.x,
	        y = p1.y,
	        dx = p2.x - x,
	        dy = p2.y - y;

	    if (dx !== 0 || dy !== 0) {

	        var t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

	        if (t > 1) {
	            x = p2.x;
	            y = p2.y;

	        } else if (t > 0) {
	            x += dx * t;
	            y += dy * t;
	        }
	    }

	    dx = p.x - x;
	    dy = p.y - y;

	    return dx * dx + dy * dy;
	}
	// rest of the code doesn't care about point format
	*/

	function getSqSegDist(p, p1, p2) {
		var l2 = getSqDist(p1, p2);
		if (0 == l2) { 
			return getSqDist(p, p1); 
		}

		var t = ( (p.x-p1.x) * (p2.x-p1.x) + (p.y-p1.y) * (p2.y-p1.y) ) / l2;

		if (t < 0) { 
			return getSqDist(p, p1); 
		}
		if (t > 1) { 
			return getSqDist(p, p2); 
		} 

		return getSqDist(p, {
			x: (p1.x + t*(p2.x - p1.x)),
			y: (p1.y + t*(p2.y - p1.y))
		});
	}

	function getSegDist(p, p1, p2) {
		return Math.sqrt(getSqSegDist(p, p1, p2));
	}

	function getSegLength(p1, p2) {
		return Math.sqrt(getSqDist(p1, p2));
	}

	function formatPoint(point) {
		return {
			x: point.longitude, 
			y: point.latitude
		}
	}

	// Simplify geometry
	function simplifyPathWithRatio(path, ratio_threshold, n) {
		if (!n) {
			n = 1;
		}

		var current = formatPoint(path[n]);
		var before = formatPoint(path[n-1]);
		var after  = formatPoint(path[n+1]);		

		var distance_from_line = getSegDist(current, before, after);
		var distance_of_line = getSegLength(before, after);
		var distance_ratio = distance_from_line / distance_of_line;

		if (distance_ratio < ratio_threshold) {
			path.splice(n, 1);
		} else {
			n++;
		}

		if (n != path.length-1) {
			return simplifyPathWithRatio(path, ratio_threshold, n);
		} else {
			return path;
		}
	}

	function simplifyPathWithRadialDistance(old_path, radius_threshold) {
		if (!radius_threshold) {
			radius_threshold = 1;
		}

		var new_path = [old_path[0]];

		var i;
		var len = old_path.length;
		for (i = 1; i < len; i++) {

			var lat1 = old_path[i-1].latitude;
			var lon1 = old_path[i-1].longitude;
			var lat2 = old_path[i].latitude;
			var lon2 = old_path[i].longitude;

			var meters = haversine(lat1, lon1, lat2, lon2)*1000;
			if (radius_threshold < meters) {
				new_path.push(old_path[i]);
			} else {
				// new_path[i-1] = old_path[i];
				new_path[-1] = old_path[i];
			}
		}

		return new_path;
	}

	function simplifyPath(path, ratio, radius) {
		var simplified = path;
		if (!ratio) {
			return simplified;
		}
		if (radius) {
			simplified = simplifyPathWithRadialDistance(path, radius);
		}
		if (3 > simplified.length) {
			return simplified;
		}
		simplified = simplifyPathWithRatio(simplified, ratio);
		return simplified;
	}

	// module.exports = simplifyPath;

	// export as AMD module / Node module / browser or worker variable
	if (typeof define === 'function' && define.amd) define(function() { return simplifyPath; });
	else if (typeof module !== 'undefined') module.exports = simplifyPath;
	else if (typeof self !== 'undefined') self.simplifyPath = simplifyPath;
	else window.haversine = simplifyPath;


})();