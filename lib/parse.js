/*
 * parse.js
 */

function parseIndexForDate(html) {

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


module.exports = function() {
	return {
		parseIndexForDate: parseIndexForDate
	};
}
