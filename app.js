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
var dictionary = require('./lib/dictionary')(appConfig);
var storage = require('./lib/storage')(dbConfig.mysql, couch, dictionary);
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
			storage.getTodaysLookupCount(null, function(lookupCount, conx) {
				if (lookupCount > appConfig.maxLookupsPerDay) { 
					console.log('Max dictionary lookups reached for today (' + 
						lookupCount + 
						' > ' + 
						appConfig.maxLookupsPerDay + 
						')');
				}
				else {
					console.log('start doProcessMessage');
					setTimeout(function() {
						if (x++ < numberOfMessagesToProcess) {
							console.log('message count : ' + x);
							couch.getEarliestUnprocessedMessageId(function(messageId){
								storage.processMessage(messageId, function(){
									couch.markMessageAsProcessed(messageId, doProcessMessage);
								});
							});
						}
					}, 0);
				}
			});
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

	case 'admin':
		if (process.argv.length < 4) 
			return console.log ('Usage: node app.js admin <method>\n\n' + 
				'Methods:\n' +
				'\tgetMessage <messageId>\n' +
				'\tmarkMessageProcessed <messageId>\n' +
				'\tmarkAllAsUnprocessed\n' +
				'\tdisplayProcessedMessages');
		var task = process.argv[3];

		switch(task) {
			case 'getMessage':
				var messageId = process.argv[4];
				couch.getMessageById(
					messageId, 
					function(result){
						console.log(result);
					}, 
					function(){
						console.error("not found")
					}, 
					function(e){
						console.error(e);
					}, false, true);
			break;

			case 'markMessageProcessed':
				var messageId = process.argv[4];
				couch.markMessageAsProcessed(messageId, function(){
					console.log('ok');
				});
			break;

			case 'markAllAsUnprocessed':
				couch.getProcessedMessages(function(messages){
					for (var idx in messages) {
						var messageId = messages[idx].value.messageId;
						console.log('mark ' + messageId + ' as unprocessed');
						couch.markMessageAsUnprocessed(messageId);
					}
				});
			break;

			case 'displayProcessedMessages':
				couch.getProcessedMessages(function(messages){
					if (messages.length == 0) return console.log('\nNo processed messages');
					for (var idx in messages) {
						console.log (messages[idx]);
					}
				});
			break;
		}
		
	break;

	case 'test':
		
		console.error('No test setup');

	break;

	default:
		return console.error('Usage: node app.js activity\n\nActivities:\n\tscrapeIndex\n\tprocessIndex\n\tscrapeMessageAjax\n\tscrapeMessageBody\n\tdenanny\n\tprocessMessage');
		break;
}

