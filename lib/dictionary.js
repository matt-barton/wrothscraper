/*
 * dictionary.js
 */

module.exports = function(config) {

	var soap = require('soap');

	function lookup(term, cb, checkForPlurals) {
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
						var defined;
						try {
							var defined = !(typeof result.DefineResult.Definitions.Definition == 'undefined');
						}
						catch(e) {
							cb(false, 1);
						}
						if (!defined && checkForPlurals && term.slice(-1) == 's') {
							var singularForm = term.substring(0, term.length - 1);
							console.log('lookup ' + singularForm);
							client.Define({
									word: singularForm
								}, function(e, result) {
									if (e) {
										return cb(false, 2);
									}
									try {
										var defined = !(typeof result.DefineResult.Definitions.Definition == 'undefined');
									}
									catch(e) {
										return cb(false, 2);
									}
									if (!defined && checkForPlurals && term.slice(-3) == 'ses') {
										var singularForm = term.substring(0, term.length - 2);
										console.log('lookup ' + singularForm);
										client.Define({
												word: singularForm
											}, function(e, result) {
												if (e) {
													return cb(false, 3);
												}
												try {
													var defined = !(typeof result.DefineResult.Definitions.Definition == 'undefined');
												}
												catch(e) {
													return cb(false, 3);
												}
												return cb(defined, 3);
											});
									}
									else {
										cb(defined, 2);
									}
								});
						}
						else {
							cb(defined, 1);
						}
					}
				});
		});
	}

	return {
		lookup: lookup
	};
}
