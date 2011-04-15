var inherits     = require('util').inherits;
var StreamStack  = require('stream-stack').StreamStack;
var Headers      = require('header-stack').Headers;
var HeaderParser = require('header-stack').Parser;

/**
 * The base class for HTTP requests and responses. It implements logic common
 * to both types of actions, like header sending/parsing and (someday) chunked
 * encoding parsing.
 */
function HttpBaseStack(stream) {
  StreamStack.call(this, stream, {
    data: this._onData
  });
  this._headerParser = new HeaderParser({
    emitFirstLine: true
  });
  this._headerParser.on('firstLine', this._onFirstLine.bind(this));
}
inherits(HttpBaseStack, StreamStack);
module.exports = HttpBaseStack;

// The HTTP version string to use for this request or response.
HttpBaseStack.prototype.httpVersion = 'HTTP/1.1';

// Calling 'write()' transparently adds the HTTP "Transfer-Encoding".
HttpBaseStack.prototype.write = function(chunk, enc) {
  if (this.chunkedOutgoing) {
    return this._writeChunk(chunk, enc);
  } else {
    return this.stream.write(chunk, enc);
  }
}

// Calling 'end()' on a high-level HTTP stream doesn't necessarily close the
// underlying connection (send a FIN), it just finishes sending the request/response.
HttpBaseStack.prototype.end = function(chunk, enc) {
  if (chunk) this.write(chunk, enc);
  if (!this.shouldKeepAlive) this.stream.end();
}

HttpBaseStack.prototype._writeChunk = function(chunk, enc) {
  var len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, enc);
  var lenHex = len.toString(16);
  var buf = new Buffer(len + CRLF.length + lenHex.length + CRLF.length);
  var pos = buf.write(lenHex, 0);
  pos += buf.write(CRLF, pos);
  if (Buffer.isBuffer(chunk)) {
    pos += chunk.copy(buf, pos, 0);
  } else {
    pos += buf.write(chunk, enc, pos);
  }
  pos += buf.write(CRLF, pos);
  return this.stream.write(buf);
}

HttpBaseStack.prototype._writeHeader = function(firstLine, headers) {
  return this.stream.write(Headers(headers).toString({
    firstLine: firstLine
  }));
}

// For both a request and response, when data is recieved, the first thing
// sent is the HTTP header. This should be removed from the data and parsed
// into either a 'request' or 'response' event, depending on the contents of
// the header. Once the header has been recieved, the content body will be
// reemitted on the child stream.
HttpBaseStack.prototype._onData = function(data) {
  if (this._headerParser) {
    this._headerParser.parse(data);
  } else {
    this.emit('data', data);
  }
}

// Fired from the 'headerParser' after the first line has been parsed.
HttpBaseStack.prototype._onFirstLine = function(line) {
  var stream = new StreamStack(this);
  this._headerParser.on('headers', function(headers, leftover) {
    this._onHeaders(headers, leftover, stream);
  }.bind(this));
  this._parseFirstLine(line, stream);
}

// Fired from the 'headerParser' after the empty line (indicating the end of
// the HTTP headers) has been fired. It attaches the given 'headers' object
// to the 'stream' instance passed, and the 'request' or 'response' event
// (depending of the type of instance this is) is fired.
HttpBaseStack.prototype._onHeaders = function(headers, leftover, stream) {
  this._headerParser = null;
  stream.headers = headers;
  this.emit(this._headerCompleteEvent, stream);
  if (leftover) {
    this.emit('data', leftover);
  }
}
