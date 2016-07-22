	var JQUERY = require('jquery');
	var utils = require('../utils/utils')



	// start and end are Corner objects
	var Surface = function(start, end) {

	  this.id = getUuid();

	  var scope = this;

	  this.start = start;
	}

	module.exports = Surface;