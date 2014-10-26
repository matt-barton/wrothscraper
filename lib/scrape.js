/*
 * scrape.js
 */

module.exports = function(config, db) {

	var rq = require('request');
	var fs = require('fs');
	var parseXml = require('xml2js').parseString;
	var cheerio = require('cheerio');

	function onError(e) {
		console.error('An error happened');
		console.error(e);
	}

	function getFilename(date) {
		var arr = date.split('/');
		return arr[2] + '-' + arr[1] + '-' + arr[0] + '-index.html'
	}

	function getPath(date) {
		return './indexFiles/' + date;
	}

	function dbGetIndexForDate(date, onSuccess, onNoRows, onError) {
		db.view('wroth/dateIndices', {key: date}, function(e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				onNoRows();
			}
			else
			{
				onSuccess(doc[0]);
			}
		});
	}

	function dbGetMessage(messageId, onSuccess, onNotPresent, onError) {
		db.view('wroth/messages', {key: messageId.toString()}, function(e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				onNotPresent();
			}
			else
			{
				if (doc.length > 1)
				{
					for (var x=1; x < doc.length; x++){
						db.remove(doc[x].value._id, doc[x].value._rev, function(e, result){
							if (e) return onError(e);
						});
					}
				}
				onSuccess(doc[0].value);
			}
		});
	}

	function dbSaveDateIndexHtml(date, html, cb) {
		var indexDoc = {
			type: 'dateIndex',
			indexDate: date,
			html: html
		};

		db.save(indexDoc, function(e, result){
			if (e) return onError(e);
			if (typeof cb == 'function') cb();
		});
	}

	function dbSaveMessage(message, cb) {
		db.save(message, function(e, result) {
			if (e) return onError(e);
			if (typeof cb == 'function') cb();			
		});
	};

	function scrapeIndexForDate(date, cb) {
		console.log('---')
		console.log('Processing ' + date);
	    dbGetIndexForDate(date, 
	    	function(index) {
	    		console.log('index for ' + date + ' already exists - no need to scrape');
				if (typeof cb == 'function') cb();
	    	}, 
	    	function(){
	    		fs.readFile(getPath(getFilename(date)), 'utf8', function(e, file) {
	    			if (e) {
	    				if (e.code == 'ENOENT') {
						    console.log('Scraping for ' + date);
							var url = config.urls.dateIndexPage.replace('{date}', date);
							rq(url, function(e, response, html){
								if (e) return onError(e);
								dbSaveDateIndexHtml(date, html, function() {
									console.log('Saved html index for ' + date);
									if (typeof cb == 'function') cb();
								});
							});
	    				}
	    				else {
	    					return onError(e);
	    				}
	    			}
	    			else {
						dbSaveDateIndexHtml(date, file, function() {
							console.log('Saved html index for ' + date);
							if (typeof cb == 'function') cb();
						});
	    			}
	    		});
	    	}, 
	    	onError);
	}

	function scrapeMessageStub(messageId, cb) {
		console.log('---')
		console.log('Processing ' + messageId);
		var dt = new Date();
		var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
		console.log('Time: ' + time);
		dbGetMessage(messageId, 
			function(){
	    		console.log('message ' + messageId + ' already exists - no need to scrape');
				if (typeof cb == 'function') cb();
			},
			function(){
				var url = config.urls.postAjax.replace('{latestPostId}', messageId);
				rq(url, function(e, response, xml){
					if (e) return onError(e);
				    xml = xml.replace(/&amp;/g, '&')
				    	.replace(/&/g, '&amp;')
				    	.replace(/< /g, '&lt; ');
					parseXml(xml, function (err, result) {
						var posts = result.response.posts[0].post;
						if (typeof posts == 'undefined') return onError('no posts found');
						posts.forEach(function(post){
   							var messageId = post.post_id[0];
   							dbGetMessage(messageId, 
   								function(){}, 
   								function() {
		   							var doc = {
		   								type: 'message',
		   								messageId: messageId,
		   								parentId: post.post_parent_id[0],
		   								title: post.post_title[0],
		   								user: post.post_member[0],
		   								date: post.post_date[0],
		   								category: post.post_category[0],
		   								hasBody: post.post_nm[0] == '1' ? false : true,
		   								body: null
		   							};
		   							dbSaveMessage(doc, function() {
										console.log('Saved message stub for ' + messageId + ': ' + doc.date);
									});
								},
								onError);
						});
					});
				});
				if (typeof cb == 'function') cb();
			},
			onError);
	}

	function scrapeMessageBody(messageId, cb) {
		console.log('Scrape message body for ' + messageId);
		var url = config.urls.messagePage.replace('{postId}', messageId);
		rq(url, function(e, response, html){
			if (e && e.code == 'ECONNRESET') if (typeof cb == 'function') cb();
			if (e) return onError(e);
			dbGetMessage(messageId,
				function(doc){
					var $ = cheerio.load(html);
					var body = $('p', 'div#messageBoardIndent')
						.first()
						.text()
						.replace(/c\*\*t/g, 'cunt')
						.replace(/s\*\*t/g, 'shit')
						.replace(/f\*\*k/g, 'fuck');
					var title = $('h3.messageBoard', 'div#messageBoardIndent')
						.text()
						.replace(/c\*\*t/g, 'cunt')
						.replace(/s\*\*t/g, 'shit')
						.replace(/f\*\*k/g, 'fuck');
					if (title.length == 0 && body == config.text.messageRemoved) {
						console.log('Message removed')
						doc.messageRemoved = true;
					}
					else {
						var dateString = $('p', 'div#messageBoardIndent').eq(1).text();
						//console.log(dateString);
						var regex = /^Posted By: ([\w_ ]+) on ([\w]+) ([0-9]{1,2})([\w]{2}) ([0-9]{4}) at ([0-9:]{8})$/;
						var match = regex.exec(dateString);
						var date = new Date(match[3] + ' ' + match[2] + ' ' + match[5] + ' ' + match[6]);
						doc.title = title;
						doc.body = body.length == 0 ? null : body;
						doc.date = date.toString();
					}
					doc.complete = true;
					dbSaveMessage(doc, function() {
						console.log('Saved message body for ' + messageId);
						if (typeof cb == 'function') cb();
					});
				},
				function(){
					console.log('stub not found');
					if (typeof cb == 'function') cb();
				},
				onError);
		});
	}

	return {
		scrapeIndexForDate: scrapeIndexForDate,
		scrapeMessageStub: scrapeMessageStub,
		scrapeMessageBody: scrapeMessageBody
	};
}
