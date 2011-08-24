/**
 * SuperShabam-websocket
 * Copyright(c) 2011 SuperShabam <dev@supershabam.com>
 * MIT Licensed
 * 
 * frame.js
 * Parse and build data frames for WebSocket transmissions
 * @author Ian Hansen
 */

exports.createFrame = function(buffer) {
	return new Frame(buffer);
};

function Frame(buffer) {
	this.fin = 0;
	this.opcode = 0;
	this.mask = 0;
	this.payloadLength = 0;
	this.maskingKey = 0;
	this.payloadData = "";
	
	if(!buffer) return this;
	
	this.setFin((buffer[0] & 0x80) >> 7);
	this.setOpcode(buffer[0] & 0x0F);
	this.setMask((buffer[1] & 0x80) >> 7);
	
	// Calculate payloadLength
	var payloadLength = buffer[1] & 0x7F;	
	var extraPayloadBytes = (payloadLength < 126) ? 0 : (payloadLength > 126) ? 8 : 2;
	var extraPayloadOffset = 2;
	for(var i = 0; i < extraPayloadBytes; i++) {
		if(i == 0) payloadLength = 0;
		payloadLength <<= 8;
		payloadLength += buffer[extraPayloadOffset + i];
	}
	this.setPayloadLength(payloadLength);
		
	var maskOffset = 2 + extraPayloadBytes,
		maskBytes = (this.mask)?4:0,
	    payloadOffset = maskOffset + maskBytes;
	
	var content = new Buffer(payloadLength);
	for(var i = 0; i < payloadLength; i++) {
		content[i] = buffer[i + payloadOffset];
		if(this.mask) content[i] ^= buffer[i%4 + maskOffset];
	}
	this.setPayloadData(content);

	return this;
};

Frame.prototype.setFin = function(bFin) {
	this.fin = bFin == true;

	return this;
};

Frame.prototype.setOpcode = function(nibbleOpcode) {
	// opcode is 4 bits long
	this.opcode = 0xF & nibbleOpcode;
	
	return this;
};

Frame.prototype.setMask = function(bMask) {
	this.mask = true == bMask;
	
	return this;
};

Frame.prototype.setPayloadLength = function(length) {
	this.payloadLength = length;
	
	return this;	
};

Frame.prototype.setMaskingKey = function(maskingKey) {
	this.maskingKey = 0xFFFFFFFF & maskingKey;
	
	return this;
};

Frame.prototype.setPayloadData = function(data) {
	this.payloadData = data;
	
	return this;
};

Frame.prototype.build = function() {
	var bufferSize = this.payloadData.length + 2;
	if (this.payloadLength == 126) bufferSize += 2;
	if (this.payloadLength == 127) bufferSize += 8;
	if (this.mask) bufferSize += 4;
	var buffer = new Buffer(bufferSize);
	var bufferIndex = 0;
	
	buffer[bufferIndex++] = (this.fin << 7) | this.opcode;
	if(this.payloadLength < 126) 
		buffer[bufferIndex++] = (this.mask << 7) | this.payloadLength;
	else if (this.payloadLength < 0x10000) {
		buffer[bufferIndex++] = (this.mask << 7) | 126;
		buffer[bufferIndex++] = (this.payloadLength >> 8) & 0xff;
		buffer[bufferIndex++] = this.payloadLength & 0xff;	
	} else {
		buffer[bufferIndex++] = (this.mask << 7) | 127;
		for(var i = 7; i >= 0; i--) {
			buffer[bufferIndex++] = (this.payloadLength >> (i * 8)) & 0xff;
		}
	}
	
	if(this.mask) {
		for (var i = 3; i >= 0; i--) {
			buffer[bufferIndex++] = (this.maskingKey >> (i * 8)) & 0xff;
		}
	}
	
	for (var i = 0; i < this.payloadData.length; i++) {
		buffer[bufferIndex++] = this.payloadData[i];
	}
	
	return buffer;
};

Frame.prototype.getPayloadData = function() {
	return this.payloadData;
};


