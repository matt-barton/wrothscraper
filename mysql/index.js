// Libraries
var mysql = require('mysql');
var fs = require('fs');
var config = require(__dirname + '/../db.config.json');

// sql file path
var docPath = __dirname + '/schema/';

if(process.argv.length < 3) return console.error('Usage: node mysql scriptname');

var scriptPath = docPath + process.argv[2];

fs.readFile(scriptPath, {encoding: 'utf8'}, function (e, sql) {
  if (e) throw e;

  var db = mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.pwd,
    database: config.mysql.db,
    multipleStatements: true
  });

  db.connect(function(e) {
    if (e) return console.error('error connecting: ' + e.stack);
    db.query(sql, function(e){
      if (e) throw e;
      console.log('ok');
      return db.end();
    });
  });
});
