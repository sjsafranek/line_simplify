
var simplify = require('./simplify_ratio.js');
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

function average(array) {
	var sum = 0;
	var num = array.length;
	for (var i in array) {
		sum += array[i];
	}
	return sum/num;
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

		var start = process.hrtime();
		var simplified = simplify(devices[key], 0.005);
		var end = process.hrtime();
		var runtime = (end[0]*1000000 + end[1]/1000) - (start[0]*1000000 + start[1]/1000);

		console.log('['+key+']: simplified', simplified.length, runtime);

		runtimes.push(runtime);

		var geojson = createGeoJson(simplified);
		saveFile('results/'+key+'_after.geojson', JSON.stringify(geojson));
	} 


	console.log(average(runtimes));

});
