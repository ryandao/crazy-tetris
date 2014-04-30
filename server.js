// Static server to serve the client demo
var port = 8000;
var connect = require('connect');
connect().use(connect.static('client')).listen(port);

