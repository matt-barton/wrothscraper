/*
 * WROTHSCRAPER
 */

/*
 * config
 */
var appConfig = require('./app.config.json');

/*
 * libraries
 */
var $ = require('cheerio');
var scrape = require('./lib/scrape')(appConfig);
require('./date.js');

/*
* Database
*/
var dbConfig = require('./db.config.json');
var cradle = require('cradle');
var db = new(cradle.Connection)(dbConfig.couch.host, dbConfig.couch.port, dbConfig.couch.options)
    .database(dbConfig.couch.db);

function processIndexForDate(html) {

	var board = $.load(html);

	board('ul#ul0 li').each(function(idx, post){
		var subjectAnchor = $('a.boardMessage', post);
		var subject = subjectAnchor.text();
		var postId = subjectAnchor
			.attr('href')
			.replace('message.php?pid=', '');
		var user = $('a.boardUsername', post).text();

		if (idx<10) {
			console.log('\n' + $(post).length);
			console.log ('\n' + subject + ' (' + postId + ') - ' + user);
		}
	});
}


// main
if(process.argv.length < 3) return console.error('Usage: node app.js [scrapeIndex|processIndex]');

var action = process.argv[2];

switch (action) {
	case 'scrapeIndex':
		if(process.argv.length < 4) return console.error('scrapeIndex usage: node app.js scrapeIndex yyyy-mm-dd [pauseSeconds] [numberOfScrapes]');
		scrapeDate = new Date(process.argv[3]);
		pauseSeconds = process.argv[4];

		if (pauseSeconds == null) {
			scrape.scrapeIndexForDate(scrapeDate.toWrothFormat());
		}
		else {
			var numberOfScrapes = process.argv[5];
			function doScrape(x) {
				setTimeout(function(){
					scrape.scrapeIndexForDate(
						scrapeDate
							.subtractDays(x)
							.toWrothFormat(),
						function() {
							if (x < (numberOfScrapes - 1)) doScrape(++x);
						});					
				}, (pauseSeconds * 1000));
			}
			doScrape(0);
		}
		break;

	case 'processIndex':
		return console.log('processIndex not implemented');
		break;

	default:
		return console.error('Usage: node app.js [scrapeIndex|processIndex]');
		break;
}

