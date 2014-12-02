/*
 * couch.js
 */

module.exports = function(db) {

	function onError(e) {
		console.error('An error happened');
		console.error(e);
	}

	function getMaxMessageId(onSuccess) {
		db.view('wroth/maxMessageId', {reduce: true}, function(e, result){
			if (e) return onError(e);
			onSuccess(result[0].value);
		});
	}

	function getEarliestMessageStubId(onSuccess) {
		db.view('wroth/minMessageStubId', {reduce: true}, function(e, result){
			if (e) return onError(e);
			onSuccess(result[0].value);
		});
	}

	function getCensoredMessages(onSuccess) {
		db.view('wroth/censoredMessages', {}, function(e, result){
			if (e) return onError(e);
			onSuccess(result);
		});
	}

	function getEarliestUnprocessedMessageId(onSuccess) {
		db.view('wroth/minUnprocessedMessageId', {reduce: true}, function(e, result){
			if (e) return onError(e);
			onSuccess(result[0].value);
		});
	}

	function getMessageById(messageId, onSuccess, onNotPresent, onError, cleanUp) {
		db.view('wroth/messages', {key: messageId.toString()}, function(e, doc){
			if (e) return onError(e);
			if (doc.length == 0) {
				onNotPresent();
			}
			else
			{
				if (doc.length > 1)
				{
					if (cleanUp) {
						for (var x=1; x < doc.length; x++){
							db.remove(doc[x].value._id, doc[x].value._rev, function(e, result){
								if (e) return onError(e);
							});
						}
					}
					else {
						return onError('Multiple documents found for messageId ' + messageId);
					}
				}
				onSuccess(doc[0].value);
			}
		});
	}

	return {
		getMaxMessageId: getMaxMessageId,
		getEarliestMessageStubId: getEarliestMessageStubId,
		getEarliestUnprocessedMessageId: getEarliestUnprocessedMessageId,
		getCensoredMessages: getCensoredMessages,
		getMessageById: getMessageById
	};
}
