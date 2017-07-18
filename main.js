

var fs = require('fs');
var utils = require('./utils.js');
var stats = require('./stats.js');
// var simplifyPath = require('./lee_simplify_ratio.js');
var simplifyPath = require('./dad_simplify_ratio.js');


function createGeoJson(data, formatter) {
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
		geojson.features[0].geometry.coordinates.push( formatter(data[i]) );
	}

	return geojson; 
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
		var process_start = process.hrtime();

		var keys = Object.keys(devices);
		for (var i in keys) {
			var key = keys[i]; 

			var geojson = createGeoJson(devices[key], function(item) {
				return [item.longitude, item.latitude];
			});
			utils.saveFile('results/'+key+'_before.geojson', JSON.stringify(geojson));

			var start = process.hrtime();
			// lee
			// var simplified = simplifyPath(devices[key], 0.005, 1.5);
			// dad
			var simplified = simplifyPath(devices[key], 0.9999, 1.5);
			var end = process.hrtime();
			var runtime = (end[0]*1000000 + end[1]/1000) - (start[0]*1000000 + start[1]/1000);

			// profiling
			runtimes.push(runtime);
			points_removed.push(devices[key].length - simplified.length);
			points_before.push(devices[key].length);
			points_after.push(simplified.length);

			var geojson = createGeoJson(simplified, function(item) {
				return [item.longitude, item.latitude];
			});
			utils.saveFile('results/'+key+'_after.geojson', JSON.stringify(geojson));
		}


		var process_end = process.hrtime();
		var process_runtime = (process_end[0]*1000000 + process_end[1]/1000) - (process_start[0]*1000000 + process_start[1]/1000);
		console.log('Total Runtime:', process_runtime);
		console.log();

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