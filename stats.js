
(function () { 'use strict';

	var ArrayStatistics = function() {
		this.version = '0.0.1';
	}

	ArrayStatistics.prototype.average = function(array) {
		var sum = this.sum(array);
		return sum/array.length;
	}

	ArrayStatistics.prototype.stddev = function(array) {
		var avg = this.average(array);
		var squareDiffs = array.map(function(value){
			var diff = value - avg;
			var sqrDiff = diff * diff;
			return sqrDiff;
		});
		var avgSquareDiff = this.average(squareDiffs);
		return Math.sqrt(avgSquareDiff);
	}

	ArrayStatistics.prototype.min = function(array) {
		return array.reduce(function(a,b){
			return Math.min(a,b);
		});
	}

	ArrayStatistics.prototype.max = function(array) {
		return array.reduce(function(a,b){
			return Math.max(a,b);
		});
	}

	ArrayStatistics.prototype.sum = function(array) {
		return array.reduce(function(sum, value){
			return sum+value; 
		}, 0);
	}

	var stats = new ArrayStatistics();


	// export as AMD module / Node module / browser or worker variable
	if (typeof define === 'function' && define.amd) define(function() { return stats; });
	else if (typeof module !== 'undefined') module.exports = stats;
	else if (typeof self !== 'undefined') self.stats = stats;
	else window.stats = stats;

})();