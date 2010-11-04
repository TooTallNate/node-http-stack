var inherits    = require('util').inherits;
var StreamStack = require('stream-stack').StreamStack;

var CR = '\r';
var LF = '\n';
var CRLF = CR + LF;

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
    
  } else {
    this.stream.emit('data', data);
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
