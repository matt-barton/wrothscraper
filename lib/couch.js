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

	return {
		getMaxMessageId: getMaxMessageId,
		getEarliestMessageStubId: getEarliestMessageStubId,
		getCensoredMessages: getCensoredMessages
	};
}
