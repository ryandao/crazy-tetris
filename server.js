// Static server to serve the client demo
var connect = require('connect');
connect().use(connect.static('client')).listen(8000);

