var websocket = require('./lib/websocket');
var http = require('http');

var server = http.createServer();

server.on('upgrade', function(req, socket) {
	var ws = websocket.accept(req, socket);
	if(!ws) return;
	
	ws.on('message', function(m) {
		ws.send(m);
	});
});

server.listen(3000);