/*
 * storage.js
 */

module.exports = function(config, couch) {

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

	function processMessage(messageId, cb) {
		console.log('Process message ' + messageId);
		couch.getMessageById(messageId, function(message) {
			var db = getDb();
			db.connect(function(e) {
		    	if (e) return console.error('error connecting: ' + e.stack);
				getUserIdByUsername(db, message.user, function(userId) {
					console.log('UserId ' + userId);
					db.end(function() {
						if (typeof cb == 'function') cb();
					});
				});
			});
		}, onError, onError, false);
	}

	return {
		processMessage: processMessage
	};
}
