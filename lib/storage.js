/*
 * storage.js
 */

module.exports = function(config, couch, dictionary) {

	var mysql = require('mysql');

	function getDb() {
		return mysql.createConnection({
			host: config.host,
			user: config.user,
			password: config.pwd,
			database: config.db,
			multipleStatements: true
		});
	}

	function onError(e) {
		console.error('An error happened');
		console.error(e);
	}

	function incrementLookupCount(db, lookupsPerformed, cb) {
		var now = new Date().toISOString().substring(0, 10);
		db.query('INSERT INTO DictionaryLookup (Date) VALUES (?)', [now], function(e, result) {
			db.query('UPDATE DictionaryLookup SET Count = Count + ? WHERE DATE = ?', [lookupsPerformed, now], function(e, result) {
				if (typeof cb == 'function') cb();
			});
		});
	}

	function getTodaysLookupCount(db, cb) {
		var autoEndDb = false;
		if (db==null) { 
			db = getDb();
			autoEndDb = true;
		}
		var now = new Date().toISOString().substring(0, 10);
		db.query('SELECT Count FROM DictionaryLookup WHERE Date = ?', [now], function(e, result) {
			if (autoEndDb) db.end();
			if (typeof result == 'undefined') return cb(0);
			cb(result.length == 0 ? 0 : result[0].Count, db);
		});
	}

	function getUserIdByUsername(db, username, onSuccess) {
		db.query('SELECT UserId FROM User WHERE Username = ?', [username], function(e, result) {
			if (e) return onError(e);
			if (result.length == 0) {
				db.query('INSERT INTO User (Username) VALUES (?)', [username], function(e, result) {
					if (e) return onError(e);
					onSuccess(result.insertId);
				});
			}
			else {
				onSuccess(result[0].UserId);
			}
		});
	}

	function getWordId(db, word, onSuccess) {
		db.query('SELECT WordId FROM Word WHERE Word = ?', [word], function(e, result) {
			if (e) return onError(e);
			if (result.length == 0) return onSuccess(null);
			onSuccess(result[0].WordId);
		});
	}

	function storeWord(db, word, inDictionary, onSuccess) {
		db.query('SELECT WordId FROM Word WHERE Word = ?', [word], function(e, result) {
			if (e) return onError(e);
			if (result.length == 0) {
				db.query('INSERT INTO Word (Word, DictionaryWord) VALUES (?, ?)', [word, inDictionary], function(e, result) {
					if (e) return onError(e);
					onSuccess(result.insertId);
				});
			}
			else {
				onSuccess(result[0].WordId);
			}
		});
	}

	function createPost(db, userId, postData, onSuccess) {
		db.query('INSERT INTO Post (PostId, UserId, Timestamp) VALUES (?, ?, ?)', 
			[
				postData.messageId, 
				userId,
				new Date(postData.date)
			],
			function(e, result) {
				if (e) return onError(e);
				onSuccess(postData.messageId);
			});
	}

	function storeWordInPost(db, wordId, postId, position, onSuccess) {
		db.query('INSERT INTO WordInPost (PostId, WordId, Position) VALUES (?, ?, ?)', 
			[
				postId, 
				wordId,
				position
			],
			function(e, result) {
				if (e) return onError(e);
				onSuccess();
			});
	}


	function storePostStats(db, postId, numberOfWords, numberOfUniqueWords, onSuccess) {
		db.query('UPDATE Post SET WordCount = ?, UniqueWordCount = ? WHERE PostId = ?', 
			[
				numberOfWords, 
				numberOfUniqueWords,
				postId
			],
			function(e, result) {
				if (e) return onError(e);
				onSuccess();
			});
	}

	function cleanWord(word) {
		var clean = word
			.replace(/^[^a-zA-Z]+/, '')
			.replace(/[^a-zA-Z]+$/, '')
			.toLowerCase();
		return clean;
	}

	function processMessage(messageId, cb) {
		console.log('Process message ' + messageId);
		couch.getMessageById(messageId, function(message) {
			var db = getDb();
			db.connect(function(e) {
		    	if (e) return console.error('error connecting: ' + e.stack);
				getUserIdByUsername(db, message.user, function(userId) {
					createPost(db, userId, message, function(){

						var processWords = function(words) {
							var wordIdx = 0;
							var position = 0;
							var uniqueWords = [];

							function lookupAndStoreWord() {

								var processNextWord = function() {
									if (wordIdx++ == (words.length - 1)) {
										storePostStats(db, message.messageId, position, uniqueWords.length, function() {
											db.end(function() {
												console.log('connection closed');
												if (typeof cb == 'function') cb();
											});
										});
									}
									else {
										lookupAndStoreWord();
									}
								};

								setTimeout(function(){
									if (wordIdx < words.length) {
										var word = cleanWord(words[wordIdx]);
										if (word.length == 0) {
											processNextWord();
										}
										else {
											if (uniqueWords.indexOf(word) == -1) {
												uniqueWords.push(word);
											}
											getWordId(db, word, function(wordId){
												if (wordId === null) {
													dictionary.lookup(word, function(inDictionary, lookupsPerformed) {
														incrementLookupCount(db, lookupsPerformed, function(){
															storeWord(db, word, inDictionary, function(newWordId){
																storeWordInPost(db, newWordId, message.messageId, ++position, processNextWord);
															});
														});
													}, true);	
												}
												else {
													storeWordInPost(db, wordId, message.messageId, ++position, processNextWord);
												}
											});
										}
									}
								}, 0);
							}

							lookupAndStoreWord();
						};

						var messageTitle = message.title
							.replace(/-/g, ' ')
							.replace(/nm$/, ' ')
							.replace(/n\/m$/g, ' ');
						var titleWords = messageTitle.split(' ');
						if (message.body != null) {
							var messageBody = message.body
								.replace(/\r/g, ' ')
								.replace(/\n/g, ' ')
								.replace(/User posted Link/g, ' ')
								.replace(/\.\.\./g, ' ')
								.replace(/-/g, ' ');
							var bodyWords = messageBody.split(' ');
							var lastTitleWord = titleWords[titleWords.length - 1];
							var lastTitleWordLastChar = lastTitleWord
								.slice(-1)
								.replace(/^[^a-zA-Z]+/, '');
							var bodyFirstChar = messageBody
								.charAt(0)
								.replace(/^[^a-zA-Z]+/, '');

							if (lastTitleWordLastChar.length > 0 && bodyFirstChar.length > 0) {
								var candidate = cleanWord(lastTitleWord + bodyWords[0]);
								dictionary.lookup(candidate, function(candidateInDictionary, lookupsPerformed){
									incrementLookupCount(db, lookupsPerformed, function(){
										if (candidateInDictionary) {
											bodyWords[0] = candidate;
											titleWords.pop();
										}
										var allWords = titleWords.concat(bodyWords);
										processWords(allWords);
									});
								}, true);
							}
							else {
								var allWords = titleWords.concat(bodyWords);
								processWords(allWords);
							}
						}
						else
						{
							processWords(titleWords);
						}
					});
				});
			});
		}, onError, onError, true);
	}

	return {
		processMessage: processMessage,
		getTodaysLookupCount:getTodaysLookupCount
	};
}
