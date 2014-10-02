
Date.prototype.subtractDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() - days);
    return dat;
}

Date.prototype.toWrothFormat = function() {
	var dat = new Date(this.valueOf());
	var day = dat.getDate().toString();
	var month = (dat.getMonth() + 1).toString(); //Months are zero based
	var year = dat.getFullYear().toString();
	month = month.length == 1 ? '0' + month : month;
	day = day.length == 1 ? '0' + day : day;
	return day + '/' + month + '/' + year;
}
