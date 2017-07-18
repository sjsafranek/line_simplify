
var fs = require('fs');

var header = [];

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




function sqr(x) {
	return x*x;
}

function dist2(v, w) {
	return sqr(v.x-w.x) + sqr(v.y-w.y);
} 

function distToSegmentSquared(point, lineStart, lineEnd) {
	// check if lineStart and lineEnd are the same point
	var l2 = dist2(lineStart, lineEnd);
	if (0 == l2) { return dist2(point, lineStart); }

	// 
	var t = ( (point.x-lineStart.x) * (lineEnd.x-lineStart.x) + (point.y-lineStart.y) * (lineEnd.y-lineStart.y) ) / l2;

	if (t < 0) { return dist2(point, lineStart); }
	if (t > 1) { return dist2(point, lineEnd); } 

	return dist2(point, {
		x: (lineStart.x + t*(lineEnd.x - lineStart.x)),
		y: (lineStart.y + t*(lineEnd.y - lineStart.y))
	});

}

function distToSegment(point, lineStart, lineEnd) {
	return Math.sqrt(distToSegmentSquared(point, lineStart, lineEnd));
}

function _findDistance(path, n) {

	var point = {
		x: path[n].longitude, 
		y: path[n].latitude
	};
	
	var lineStart = {
		x: path[n-1].longitude, 
		y: path[n-1].latitude
	};
	
	var lineEnd = {
		x: path[n+1].longitude, 
		y: path[n+1].latitude
	};

	var distance = distToSegment(point, lineStart, lineEnd);
	return distance;
}

function average(array) {
	var sum = 0;
	var num = array.length;
	for (var i in array) {
		sum += array[i];
	}
	return sum/num;
}

// Simplify geometry
function simplifyPath(path, tolerance, n) {
	if (!tolerance) { throw new Error('Please specify a tolerance for clipping points'); }

	if (!n) {
		n = 1;
	}

	var distance = _findDistance(path, n);

	if (distance < tolerance) {
		path.splice(n, 1);
	} else {
		n++;
	}

	if (n != path.length-1) {
		return simplifyPath(path, tolerance, n);
	} else {
		return path;
	}
}


// Calculate average line fuzziness
function pathAverangeGitter(path, distances, n) {
	if (!n) {
		n = 1;
		distances = [];
	}

	var distance = _findDistance(path, n);

	distances.push(distance);

	n++;
	if (n != path.length-1) {
		return pathAverangeGitter(path, distances, n);
	} else {
		return average(distances);
	}
}

function createGeoJson(data) {
	var geojson = {
		"type": "FeatureCollection",
		"features": [
			{
				"type": "Feature",
				"properties": {
					"vehicle_number": data[0].vehicle_number
				},
				"geometry": {
					"type": "LineString",
					"coordinates": []
				}
			}
		]
	}

	for (var i in data) {
		geojson.features[0].geometry.coordinates.push([data[i].longitude, data[i].latitude]);
	}

	return geojson; 
}

function saveFile(fname, text) {
	fs.writeFile(fname, text, function (err) {
		if (err) return console.log(err);
		console.log('file saved');
	});
}


fs.readFile('export_2017-06-08T02-05-12.293Z.csv', 'utf8', function(err,data) {
	if (err) {
		return console.log(err);
	}

	data = data.replace(/"/g, '');
	var lines = data.split('\n');
	header = lines[0].split(',');

	var devices = {};

	// read through each line
	for (var i=1; i<lines.length; i++) {
		
		// read each row
		var record = {};
		var row = lines[i].split(',');
		for (var j in row) {
			record[header[j]] = row[j];
		}
		
		var vehicle_number = record.vehicle_number;

		if ('' != record.longitude && '' != record.latitude) {
			record.latitude	= parseFloat(record.latitude);
			record.longitude = parseFloat(record.longitude);
			if (!devices[vehicle_number]) {
				devices[vehicle_number] = [record];
			} else {
				if (0 != devices[vehicle_number].length) {
					var last = devices[vehicle_number].length -1;
					var lat1 = devices[vehicle_number][last].latitude;
					var lon1 = devices[vehicle_number][last].longitude;
					var lat2 = record.latitude;
					var lon2 = record.longitude;
					// check distance from last point
					var meters = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2)*1000;
					if (1 < meters) {
						devices[vehicle_number].push(record);
					} else {
						devices[vehicle_number][last] = record;
					}
				}
			}
		}

	}

	console.log('original path', devices[2272].length);
	
	var geojson = createGeoJson(devices[2272]);
	saveFile('before.geojson', JSON.stringify(geojson));
	
	var average_gitter = pathAverangeGitter(devices[2272]);
	var tolerance = average_gitter*2;

	var simplified = simplifyPath(devices[2272], tolerance);
	console.log('[1]: simplified path', simplified.length);
	
	var geojson = createGeoJson(simplified);
	saveFile('after_1.geojson', JSON.stringify(geojson));


	// var average_flitter = pathAverangeFlitter(simplified);
	// var tolerance = average_flitter;
	// var simplified = simplifyPath(simplified, tolerance);
	// console.log('[2]: simplified path', simplified.length);

	// var geojson = createGeoJson(simplified);
	// saveFile('after_2.geojson', JSON.stringify(geojson));
});
