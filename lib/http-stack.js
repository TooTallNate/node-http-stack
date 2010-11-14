var inherits    = require('util').inherits;
var StreamStack = require('stream-stack').StreamStack;
var utils = require('./utils');

var CR = '\r';
var LF = '\n';
var CRLF = CR + LF;
var END_OF_HEADER = new Buffer(CRLF + CRLF);

/**
 * The base class for HTTP requests and responses. It implements logic common
 * to both types of actions, like header sending/parsing and (someday) chunked
 * encoding parsing.
 */
function HttpBaseStack(stream) {
  StreamStack.call(this, stream);
  
  this._bindedOnData = this._onData.bind(this);
  this.stream.on('data', this._bindedOnData);
}
inherits(HttpBaseStack, StreamStack);
exports.HttpBaseStack = HttpBaseStack;

// The HTTP version string to use for this request or response.
HttpBaseStack.prototype.httpVersion = 'HTTP/1.1';

// Flag indicating if this StreamStack is currently parsing the HTTP header,
// or the content body.
HttpBaseStack.prototype.parsingHeader = true;

HttpBaseStack.prototype._writeHeader = function(firstLine, headers) {
  var req = firstLine + CRLF;
  if (headers) {
    for (var i=0, l=headers.length; i<l; i++) {
      req += headers[i] + CRLF;
    }
  }
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
      if (leftover) this.stream.emit('data', leftover);
    }
  } else {
    this.emit('data', data);
  }
}




/**
 * StreamStack for writing HTTP requests and parsing the response.
 */
function HttpRequestStack(stream) {
  HttpBaseStack.call(this, stream);
}
inherits(HttpRequestStack, HttpBaseStack);
exports.HttpRequestStack = HttpRequestStack;

// Calling 'end()' on a high-level HTTP stream doesn't necessarily close the
// underlying connection (send a FIN), it just finishes sending the request.
HttpRequestStack.prototype.end = function(chunk, enc) {
  if (chunk) this.write(chunk, enc);
}

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

HttpRequestStack.prototype._onHeadersComplete = function() {
  var res = new StreamStack(this);
  // TODO: Parse response headers and status code into properties on 'res'
  this.emit('response', res);
}


/**
 * StreamStack for parsing an HTTP request, and writing the HTTP response.
 */
function HttpResponseStack(stream) {
  HttpBaseStack.call(this, stream);
}

HttpResponseStack.prototype._onHeadersComplete = function() {
  var req = new StreamStack(this);
  this.emit('request', req);
}

inherits(HttpResponseStack, HttpBaseStack);
exports.HttpResponseStack = HttpResponseStack;
