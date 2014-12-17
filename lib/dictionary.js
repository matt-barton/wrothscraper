/*
 * dictionary.js
 */

module.exports = function(config) {

	var soap = require('soap');

	function lookup(term, cb) {
		console.log('lookup ' + term);
		var url = config.urls.dictionary.service;
		soap.createClient(url, function(e, client) {
			if (e) {
				if (typeof cb == 'function') return cb(false, 0);
			}
			client.Define({
					word: term
				}, function(e, result) {
					if (e) {
						if (typeof cb == 'function') return cb(false, 1);
					}
					if (typeof cb == 'function') {
						try {
							var defined = !(typeof result.DefineResult.Definitions.Definition == 'undefined');
							cb(defined, 1);
						}
						catch(e) {
							cb(false, 1);
						}
					}
				});
		});
	}

	return {
		lookup: lookup
	};
}
