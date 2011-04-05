var inherits    = require('util').inherits;
var StreamStack = require('stream-stack').StreamStack;
var utils = require('./utils');

var CRLF = '\r\n';
var END_OF_HEADER = new Buffer(CRLF + CRLF);
var STATUS_CODES = require('http').STATUS_CODES;

/**
 * The base class for HTTP requests and responses. It implements logic common
 * to both types of actions, like header sending/parsing and (someday) chunked
 * encoding parsing.
 */
function HttpBaseStack(stream) {
  StreamStack.call(this, stream, {
    data: this._onData
  });
}
inherits(HttpBaseStack, StreamStack);
exports.HttpBaseStack = HttpBaseStack;

// The HTTP version string to use for this request or response.
HttpBaseStack.prototype.httpVersion = 'HTTP/1.1';

// Flag indicating if this StreamStack is currently parsing the HTTP header,
// or the content body.
HttpBaseStack.prototype.parsingHeader = true;

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
  // Allow a regular Object to be passed, and coerce it into an Array before processing
  if (!Array.isArray(headers)) {
    var h = [];
    for (var i in headers) {
      h.push(i + ': ' + headers[i]);
    }
    headers = h;
  }
  var req = firstLine + CRLF;
  var cur;
  for (var i=0, l=headers.length; i<l; i++) {
    cur = headers[i];
    if (cur.name && cur.value) {
      // If the item is an Object with a 'name' and 'value', then use that
      req += cur.name + ': ' + cur.value + CRLF;
    } else {
      // Otherwise it should be a full header line String
      req += cur + CRLF;
    }
  }
  //console.error('HTTP Request Header:\n' + req);
  return this.stream.write(req + CRLF);
}

// For both a request and response, when data is recieved, the first thing
// sent is the HTTP header. This should be removed from the data and parsed
// into either a 'request' or 'response' event, depending on the contents of
// the header. Once the header has been recieved, the content body will be
// reemitted on the child stream.
HttpBaseStack.prototype._onData = function(data) {
  if (this.parsingHeader) {
    if (!this.rawHeaders) {
      this.rawHeaders = data;
    } else {
      this.rawHeaders = utils.bufferConcat(this.rawHeaders, data);
    }
    var index = utils.bufferIndexOf(this.rawHeaders, END_OF_HEADER);
    //console.error(index, this.rawHeaders.length);
    if (index > 0) {
      var leftover;
      var end = index+END_OF_HEADER.length;
      if (end < this.rawHeaders.length) {
        leftover = this.rawHeaders.slice(end);
        this.rawHeaders = this.rawHeaders.slice(0, end);
      }
      
      this._onHeadersComplete();
      //console.error(this.rawHeaders);
      //console.error(leftover);
      
      this.parsingHeader = false;
      if (leftover) this._onData(leftover);
    }
  } else {
    this.emit('data', data);
  }
}

/**
 * This gets called only once; after the final (empty) header line has been
 * parsed. This function parses the raw header response into a 'headers'
 * object, and gets attached to a new StreamStack that gets returned with
 * the 'request' or 'response' event (depending of the type of instance this
 * is).
 */
HttpBaseStack.prototype._onHeadersComplete = function() {
  var stream = new StreamStack(this);
  var lines = this.rawHeaders.toString().split(CRLF);
  this._onFirstLine(lines[0], stream);
  stream.headers = lines.slice(1, lines.length-2);
  stream.headers.forEach(function(line, i) {
    var firstColon = line.indexOf(':');
    var name = line.substring(0, firstColon);
    var value = line.substring(firstColon+(line[firstColon+1] == ' ' ? 2 : 1));
    // Individual header lines can be retreived directly as a full String on the
    // array, or by accessing the 'name' and 'value' properties on each header line.
    stream.headers[i] = new String(line);
    stream.headers[i].name = name;
    stream.headers[i].value = value;
    // To match node's API; lowercase the header name as a prop on the array.
    // This is more convenient, but won't work well with multiple headers of the
    // same name (i.e. Set-Cookie).
    stream.headers[name.toLowerCase()] = value;
  });
  stream.headers.inspect = utils.headerInspect;
  this.emit(this._headerCompleteEvent, stream);
}




/**
 * StreamStack for writing HTTP requests and parsing the response.
 */
function HttpRequestStack(stream) {
  HttpBaseStack.call(this, stream);
}
inherits(HttpRequestStack, HttpBaseStack);
exports.HttpRequestStack = HttpRequestStack;

// Bool to keep track of whether or not this 'HttpRequestStack' instance has
// had a request sent on it already.
HttpRequestStack.prototype.requestSent = false;

HttpRequestStack.prototype.request = function(method, path, headers) {
  if (this.requestSent) throw new Error('A request has already been sent on '+
    'this `HttpRequestStack` instance. Wait for the "end" event, then create '+
    'a new HttpRequestStack on the original `Stream`.');
  this.requestSent = true;
  return this._writeHeader(method + ' ' + path + ' ' + this.httpVersion, headers);
}

HttpRequestStack.prototype.get = function(path, headers) {
  return this.request("GET", path, headers);
}

HttpRequestStack.prototype.post = function(path, headers) {
  return this.request("POST", path, headers);
}

// The name of the event that gets called after the HTTP headers have been
// received and parsed.
HttpRequestStack.prototype._headerCompleteEvent = "response";

// Parses the first HTTP header line into 'httpVersion', 'statusCode', and
// 'statusMessage' properties.
HttpRequestStack.prototype._onFirstLine = function(line, res) {
  var i = line.indexOf(' ');
  res.httpVersion = line.substring(0, i);
  var j = line.indexOf(' ', i+1);
  res.statusCode = line.substring(i+1, j);
  res.statusMessage = line.substring(j+1);
}




/**
 * StreamStack for parsing an HTTP request, and writing the HTTP response.
 */
function HttpResponseStack(stream) {
  HttpBaseStack.call(this, stream);
}
inherits(HttpResponseStack, HttpBaseStack);
exports.HttpResponseStack = HttpResponseStack;

// Bool to keep track of whether or not this 'HttpResponseStack' instance has
// had a it's response header written yet or not.
HttpResponseStack.prototype.headerSent = false;

// Writes the HTTP Response first line and headers to the writable stream.
HttpResponseStack.prototype.writeHead = function(statusCode, headers) {
  headers = headers || [];
  this.headerSent = true;
  return this._writeHeader(this.httpVersion + ' ' + statusCode + ' ' + STATUS_CODES[statusCode], headers);
}

// The name of the event that gets called after the HTTP headers have been
// received and parsed.
HttpResponseStack.prototype._headerCompleteEvent = "request";

// Parses the first HTTP header line into 'method', 'path', and 'httpVersion' props.
HttpResponseStack.prototype._onFirstLine = function(line, req) {
  var i = line.indexOf(' ');
  req.method = line.substring(0, i);
  var j = line.indexOf(' ', i+1);
  req.path = line.substring(i+1, j);
  req.httpVersion = line.substring(j+1);
}

