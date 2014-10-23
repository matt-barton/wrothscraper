/*
 * WROTHSCRAPER
 */

/*
 * config
 */
var appConfig = require('./app.config.json');

/*
* Database
*/
var dbConfig = require('./db.config.json');
var cradle = require('cradle');
var db = new(cradle.Connection)(dbConfig.couch.host, dbConfig.couch.port, dbConfig.couch.options)
    .database(dbConfig.couch.db);

/*
 * libraries
 */
var couch = require('./lib/couch')(db);
var scrape = require('./lib/scrape')(appConfig, db);
var parse = require('./lib/parse');
require('./date.js');

// main
if(process.argv.length < 3) return console.error('Usage: node app.js [scrapeIndex|processIndex|scrapeMessageAjax|scrapeMessageBody]');

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

	case 'scrapeMessageAjax':
		if(process.argv.length < 5) return console.error('scrapeIndex usage: node app.js scrapeMessageAjax numberOfScrapes pauseSeconds');
		var numberOfScrapes = process.argv[3];
		var pauseSeconds = process.argv[4];
		var x=0;
		function doScrapeStub() {
			setTimeout(function() {
				if (x++ < numberOfScrapes) {
					console.log('scrape: ' + x);
					couch.getMaxMessageId(function(maxMessageId){
						console.log('max msg id : ' + maxMessageId);
						scrape.scrapeMessageStub(maxMessageId, doScrapeStub);
					});
				}
			}, (pauseSeconds * 1000));
		}
		doScrapeStub();
	break;

	case 'scrapeMessageBody':
		if(process.argv.length < 5) return console.error('scrapeIndex usage: node app.js scrapeMessageBody numberOfScrapes pauseSeconds');
		var numberOfScrapes = process.argv[3];
		var pauseSeconds = process.argv[4];
		var x=0;
		function doScrapeBody() {
			setTimeout(function() {
				if (x++ < numberOfScrapes) {
					console.log('scrape: ' + x);
					couch.getEarliestMessageStubId(function(messageId){
						scrape.scrapeMessageBody(messageId, doScrapeBody);
					});
				}
			}, (pauseSeconds * 1000));
		}
		doScrapeBody();
	break;

	case 'test':
		couch.getMaxMessageId(function(messageId){
			console.log('Max: ' + messageId);
		});
	break;

	default:
		return console.error('Usage: node app.js [scrapeIndex|processIndex|scrapeMessageAjax|scrapeMessageBody]');
		break;
}

