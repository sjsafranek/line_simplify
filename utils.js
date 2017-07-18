
var fs = require('fs');

function saveFile(fname, text) {
	fs.writeFile(fname, text, function (err) {
		if (err) return console.log(err);
	});
}

var Utils = function() {}
Utils.prototype.saveFile = saveFile;

var utils = new Utils();

module.exports = utils;
