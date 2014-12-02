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
var storage = require('./lib/storage')(dbConfig.mysql, couch);
var parse = require('./lib/parse');
require('./date.js');

// main
if(process.argv.length < 3) return console.error('Usage: node app.js activity\n\nActivities:\n\tscrapeIndex\n\tscrapeMessageAjax\n\tscrapeMessageBody\n\tdenanny\n\tprocessMessage');

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

	case 'scrapeMessageAjax':
		if(process.argv.length < 5) return console.error('scrapeMessageAjax usage: node app.js scrapeMessageAjax numberOfScrapes pauseSeconds');
		var numberOfScrapes = process.argv[3];
		var pauseSeconds = process.argv[4];
		var x=0;
		function doScrapeStub() {
			setTimeout(function() {
				if (x++ < numberOfScrapes) {
					console.log('scrape: ' + x);
					couch.getMaxMessageId(function(maxMessageId){
						console.log('max msg id : ' + maxMessageId);
						scrape.scrapeMessageStub(maxMessageId + 1, doScrapeStub);
					});
				}
			}, (pauseSeconds * 1000));
		}
		doScrapeStub();
	break;

	case 'scrapeMessageBody':
		if(process.argv.length < 5) return console.error('scrapeMessageBody usage: node app.js scrapeMessageBody numberOfScrapes pauseSeconds');
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

	case 'processMessage':
		if(process.argv.length < 4) return console.error('processMessage usage: node app.js processMessage numberOfMessagesToProcess');
		var numberOfMessagesToProcess = process.argv[3];
		var x=0;
		function doProcessMessage() {
			setTimeout(function() {
				if (x++ < numberOfMessagesToProcess) {
					console.log('message count : ' + x);
					couch.getEarliestUnprocessedMessageId(function(messageId){
						storage.processMessage(messageId, doProcessMessage);
					});
				}
			}, 0);
		}
		doProcessMessage();
	break;


	case 'denanny':
		couch.getCensoredMessages(function(messages){
			var total = messages.length;
			var soFar = 0;
			for (var x=0; x<messages.length; x++) {
				var message = messages[x].value;
				if (message.title) {
					message.title = message.title
						.replace(/c\*\*t/g, 'cunt')
						.replace(/s\*\*t/g, 'shit')
						.replace(/f\*\*k/g, 'fuck');
				}
				if (message.body) {
					message.body = message.body
						.replace(/c\*\*t/g, 'cunt')
						.replace(/s\*\*t/g, 'shit')
						.replace(/f\*\*k/g, 'fuck');
				}
				db.save(message, function(e, r){
					if (e) throw e;
					soFar++;
					console.log(soFar + '/' + total);
				});
			}
		});
	break;

	case 'test':

		return console.log('no test setup');

	break;

	default:
		return console.error('Usage: node app.js activity\n\nActivities:\n\tscrapeIndex\n\tprocessIndex\n\tscrapeMessageAjax\n\tscrapeMessageBody\n\tdenanny\n\tprocessMessage');
		break;
}

