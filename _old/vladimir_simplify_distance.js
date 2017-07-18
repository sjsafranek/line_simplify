
var stats = require('./stats.js');
var simplify = require('./simplify.js');
var fs = require('fs');


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

// Calculate average line fuzziness
function pathAverangeGitter(path, distances, n) {
	if (!n) {
		n = 1;
		distances = [];
	}

	if (1 == path.length) {
		return average(distances);
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
	});
}










function main() {
	var header = [];

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
				record.y	= parseFloat(record.latitude);
				record.x = parseFloat(record.longitude);
				if (!devices[vehicle_number]) {
					devices[vehicle_number] = [record];
				} else {
					if (0 != devices[vehicle_number].length) {
						devices[vehicle_number].push(record);
					}
				}
			}

		}

		var points_before = [];
		var points_after = [];
		var points_removed = [];
		var runtimes = [];

		var keys = Object.keys(devices);
		for (var i in keys) {
			var key = keys[i]; 

			var geojson = createGeoJson(devices[key]);
			saveFile('results/'+key+'_before.geojson', JSON.stringify(geojson));

			var start = process.hrtime();

			var average_gitter = pathAverangeGitter(devices[key]);
			var tolerance = average_gitter*3;
			var simplified = simplify(devices[key], tolerance, false);

			// var simplified = simplifyPath(devices[key], 0.005, 1.5);
			var end = process.hrtime();
			var runtime = (end[0]*1000000 + end[1]/1000) - (start[0]*1000000 + start[1]/1000);

			// profiling
			runtimes.push(runtime);
			points_removed.push(devices[key].length - simplified.length);
			points_before.push(devices[key].length);
			points_after.push(simplified.length);

			var geojson = createGeoJson(simplified);
			saveFile('results/'+key+'_after.geojson', JSON.stringify(geojson));
		}


		console.log('Paths:', keys.length);
		console.log();

		console.log('Points:');
		console.log('\tstart:\t',	Math.round( stats.sum(points_before) )  );
		console.log('\tend:\t', 	Math.round( stats.sum(points_after) )  );
		console.log('\tdel:\t', 	Math.round( stats.sum(points_removed) )  );
		console.log('\tavg:\t', 	Math.round( stats.average(points_removed) )  );
		console.log('\tstddev:\t',  Math.round( stats.stddev(points_removed) )  );
		console.log('\tmin:\t',     Math.round( stats.min(points_removed) )  );
		console.log('\tmax:\t',     Math.round( stats.max(points_removed) )  );
		console.log();

		console.log('Runtime:');
		console.log('\tavg:\t', 	stats.average(runtimes).toFixed(4));
		console.log('\tstddev:\t',	stats.stddev(runtimes).toFixed(4));
		console.log('\tmin:\t',   	stats.min(runtimes).toFixed(4));
		console.log('\tmax:\t',   	stats.max(runtimes).toFixed(4));
		console.log();

	});
}

main();






/*

function main() {
 
	var header = [];

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
				record.y = parseFloat(record.latitude);
				record.x = parseFloat(record.longitude);
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


		var runtimes = [];

		var keys = Object.keys(devices);
		for (var i in keys) {
			var key = keys[i]; 

			console.log('['+key+']: original  ', devices[key].length);

			var geojson = createGeoJson(devices[key]);
			saveFile('results/'+key+'_before.geojson', JSON.stringify(geojson));


			var average_gitter = pathAverangeGitter(devices[2272]);
			var tolerance = average_gitter*3;

			var start = process.hrtime();

			// var average_gitter = pathAverangeGitter(devices[2272]);
			// var tolerance = average_gitter*3;

			var simplified = simplify(devices[key], tolerance, false);
			var end = process.hrtime();
			var runtime = (end[0]*1000000 + end[1]/1000) - (start[0]*1000000 + start[1]/1000);

			console.log('['+key+']: simplified', simplified.length, runtime);

			runtimes.push(runtime);

			var geojson = createGeoJson(simplified);
			saveFile('results/'+key+'_after.geojson', JSON.stringify(geojson));
		} 


		console.log(average(runtimes));

	});

}

main();


*/