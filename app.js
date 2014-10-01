
var rq = require('request');
var $ = require('cheerio');
var fs = require('fs');

function getFilename(date) {
	return date.replace(/\//g, '_') + '_index.html'
}

function getPath(date) {
	return './indexFiles/' + date;
}

function scrapeIndexForDate(date) {
 	fs.mkdir('./indexFiles', 0744, function(e) {
        if (e) {
            if (e.code != 'EEXIST') return console.error(e); // something else went wrong
        }
		var filename = getFilename(date);
		var path = getPath(filename);
		fs.open(path, 'r', function(e, fd){
			if (e) {
				if (e.code != 'ENOENT') return console.error(e); // something else went wrong
		        console.log('Scraping for ' + date);
				var url = 'http://www.wrathofthebarclay.co.uk/interactive/board/board.php?date=' + date;
				rq(url, function(e, response, html){
					if (e) return console.error(e);
					fs.writeFile(path, html, function (e) {
						if (e) return console.error(e);
						console.log('Saved ' + filename);
					});
				});
			}
			else {
				console.log('already exists - no need to scrape');
			}
		});
    });
}

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

Date.prototype.subtractDays = function(days)
{
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() - days);
    return dat;
}

// main
if(process.argv.length < 3) return console.error('Usage: node app.js [scrapeIndex|processIndex]');

var action = process.argv[2];

switch (action) {
	case 'scrapeIndex':
		if(process.argv.length < 4) return console.error('scrapeIndex usage: node app.js scrapeIndex scrapeDate [pauseSeconds] [numberOfScrapes]');
		scrapeDate = process.argv[3];
		pauseSeconds = process.argv[4];

		if (pauseSeconds == null) {
			scrapeIndexForDate(scrapeDate);
		}
		else {
			var numberOfScrapes = process.argv[5];
			var inputDate = new Date(scrapeDate);
			for (var x=0; x<numberOfScrapes; x++) {
				var targetdate = inputDate.subtractDays(x);
				var day = targetdate.getDate().toString();
    			var month = (targetdate.getMonth() + 1).toString(); //Months are zero based
    			var year = targetdate.getFullYear().toString();
    			month = month.length == 1 ? '0' + month : month;
    			day = day.length == 1 ? '0' + day : day;
    			var theDate = day + '/' + month + '/' + year;
				scrapeIndexForDate(theDate);
    		}
		}
		break;

	case 'processIndex':
		return console.log('processIndex not implemented');
		break;

	default:
		return console.error('Usage: node app.js [scrapeIndex|processIndex]');
		break;
}

