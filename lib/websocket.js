/**
 * SuperShabam-websocket
 * Copyright(c) 2011 SuperShabam <dev@supershabam.com>
 * MIT Licensed
 * 
 * websocket.js
 * Send and receive data through a websocket
 * @author Ian Hansen
 */

/** dependencies */
var crypto = require('crypto');
var events = require('events');
var util = require('util');
var frame = require('./frame');

/** exports */
exports.accept = function(request, socket, head) {
	return new WebSocket({request: request, socket: socket});
};
exports.open = function(url) {
	return new WebSocket({url: url});	
};
exports.WebSocket = WebSocket;

/**
 * constructor
 */
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
	this.readyState = this.states.CONNECTING;
	this.outputBuffer = [];

	if(this.options.request && this.options.socket) {
		this.socket = this.options.socket;
		if(!this.acceptHandshake()) return false;    
	    this.readyState = this.states.OPEN;
	} else if (this.options.url) {
		if(!this.open()) return false;
		this.mask = true;
	} else return false;
	
    this.socket.setKeepAlive(true);
    this.socket.setTimeout(0);
	this.socket.on('data', function(buffer) { self.read(buffer); });
}

/**
 * WebSocket extends EventEmitter
 */
util.inherits(WebSocket, events.EventEmitter);

/**
 * acceptHandshake - read, validate, and respond to a client's handshake request
 */
WebSocket.prototype.acceptHandshake = function() {
	var key = this.options.request.headers['sec-websocket-key'] || '';
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
	
	return true;
};

/**
 * This class will also function as a WebSocket client
 */
WebSocket.prototype.open = function() {
	throw "NOT IMPLEMENTED";
};

/**
 * read - parse raw incoming bytes from the underlying socket and create a WebSocket dataframe
 * from the bytes. http://tools.ietf.org/html/draft-ietf-hybi-thewebsocketprotocol-12
 */
WebSocket.prototype.read = function(buffer) {
	var f = frame.createFrame(buffer);
	// Only support un-fragmented text frames
	if(f.opcode == 0x1 && f.fin == 1) {
		var str = f.payloadData.toString('utf8');
		this.emit('message', str);
	}
};

/**
 * send - Sends text to the recipient. Should eventually support sending
 * blobs or buffer as in the html5 websockets interface http://dev.w3.org/html5/websockets/
 * 
 * @param str - text to send
 * @returns bool - true if entire data was flushed successfully, false if all or part of the data was queued in user memory
 */
WebSocket.prototype.send = function(str) {
	var buffer = new Buffer(str);
	var f = frame.createFrame()
			.setFin(true)
			.setOpcode(0x1)
			.setMask(this.mask)
            .setMaskingKey(this.generateMask())
			.setPayloadLength(buffer.length)
			.setPayloadData(buffer);
	return this.socket.write(f.build());		
};

/**
 * generateMask - returns 4-bytes of random bits used for masking the payload
 */
WebSocket.prototype.generateMask = function() {
	return 0x12345678; // guaranteed to be random
};