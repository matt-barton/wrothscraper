/*
 * scrape.js
 */

module.exports = function(config, db) {

	var rq = require('request');
	var fs = require('fs');
	var utf8 = require('utf8');
	var parseXml = require('xml2js').parseString;

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
		db.view('wroth/messages', {key: messageId}, function(e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				onNotPresent();
			}
			else
			{
				onSuccess(doc[0]);
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

	function scrapeMessageAjax(messageId, cb) {
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
										console.log('Saved message stub for ' + messageId);
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
	
	function scrapeMessage(messageId, cb) {

	}

	return {
		scrapeIndexForDate: scrapeIndexForDate,
		scrapeMessage: scrapeMessage,
		scrapeMessageAjax: scrapeMessageAjax
	};
}
