/**
 * SuperShabam-websocket
 * Copyright(c) 2011 SuperShabam <dev@supershabam.com>
 * MIT Licensed
 * 
 * websocket.js
 * Send and receive data through a websocket
 * @author Ian Hansen
 */

var crypto = require('crypto');
var events = require('events');
var util = require('util');
var frame = require('./frame');

exports.accept = function(request, socket, head) {
	return new WebSocket({request: request, socket: socket});
};
exports.open = function(url) {
	return new WebSocket({url: url});	
};
exports.WebSocket = WebSocket;

function WebSocket(options) {
	var self = this;
	this.options = options || {};
	this.WS_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
	this.mask = false;
	this.states = {
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3
	};
	this.readyState = this.states['CONNECTING'];
	this.outputBuffer = [];

	if(this.options['request'] && this.options['socket']) {
		this.socket = this.options['socket'];
		if(!this.handshake()) return false;
	} else if (this.options['url']) {
		if(!this.open()) return false;
		this.mask = true;
	} else return false;
	
	this.socket.on('data', function(d) { self.read(d); });
	
}

util.inherits(WebSocket, events.EventEmitter);

WebSocket.prototype.handshake = function() {
	var key = this.options['request'].headers['sec-websocket-key'] || '';
	if(!key) return false;
	
	var shasum = crypto.createHash('sha1');
	shasum.update(key);
	shasum.update(this.WS_MAGIC_STRING);
	key = shasum.digest('base64');

	if(!this.socket) return false;
	
	this.socket.write(
		'HTTP/1.1 101 Switching Protocols\r\n' +
		'Upgrade: websocket\r\n' + 
		'Connection: Upgrade\r\n' +
		'Sec-WebSocket-Accept: ' + key + '\r\n\r\n'
	);
	
	this.readyState = this.states['OPEN'];
	
	return true;
};

WebSocket.prototype.open = function() {
	throw "NOT IMPLEMENTED";
};

WebSocket.prototype.read = function(d) {
	var f = frame.createFrame(d);
	// Only support un-fragmented text frames
	if(f.opcode == 0x1 && f.fin == 1) {
		var str = f.payloadData.toString('utf8');
		this.emit('message', str);
	}
};

WebSocket.prototype.send = function(str) {
	var buffer = new Buffer(str);
	var f = frame.createFrame()
			.setFin(true)
			.setOpcode(0x1)
			.setMask(false)
			.setPayloadLength(buffer.length)
			.setPayloadData(buffer);
	this.socket.write(f.build());		
};

WebSocket.prototype.generateMask = function() {
	return 0x12345678;
};