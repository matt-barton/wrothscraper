/*
 * scrape.js
 */
var rq = require('request');
var fs = require('fs');

function getFilename(date) {
	var arr = date.split('/');
	return arr[2] + '-' + arr[1] + '-' + arr[0] + '-index.html'
}

function getPath(date) {
	return './indexFiles/' + date;
}

function scrapeIndexForDate(config, date, cb) {
    console.log('Scraping for ' + date);
 	fs.mkdir('./indexFiles', 0744, function(e) {
        if (e) {
            if (e.code != 'EEXIST') return console.error(e); // something else went wrong
        }
		var filename = getFilename(date);
		var path = getPath(filename);
		fs.open(path, 'r', function(e, fd){
			if (e) {
				if (e.code != 'ENOENT') return console.error(e); // something else went wrong
		        console.log('Performing scrape');
				var url = config.urls.dateIndexPage.replace('{date}', date);
				rq(url, function(e, response, html){
					if (e) return console.error(e);
					fs.writeFile(path, html, function (e) {
						if (e) return console.error(e);
						console.log('Saved ' + filename);
						if (typeof cb == 'function') cb();
					});
				});
			}
			else {
				console.log('already exists - no need to scrape');
				if (typeof cb == 'function') cb();
			}
		});
    });
}

module.exports = function(config) {
	return {
		scrapeIndexForDate: function(date, cb) {
			scrapeIndexForDate(config, date, cb);
		}
	};
}
