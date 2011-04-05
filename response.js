var HttpBaseStack = require('./base');
var inherits = require('util').inherits;

var STATUS_CODES = require('http').STATUS_CODES;


/**
 * StreamStack for parsing an HTTP request, and writing the HTTP response.
 */
function HttpResponseStack(stream) {
  HttpBaseStack.call(this, stream);
}
inherits(HttpResponseStack, HttpBaseStack);
module.exports = HttpResponseStack;

// Writes the HTTP Response first line and headers to the writable stream.
HttpResponseStack.prototype.writeHead = function(statusCode, headers) {
  headers = headers || [];
  this.headerSent = true;
  return this._writeHeader(this.httpVersion + ' ' + statusCode + ' ' + STATUS_CODES[statusCode], headers);
}

// Bool to keep track of whether or not this 'HttpResponseStack' instance has
// had a it's response header written yet or not.
HttpResponseStack.prototype.headerSent = false;

// The name of the event that gets called after the HTTP headers have been
// received and parsed.
HttpResponseStack.prototype._headerCompleteEvent = "request";

// Parses the first HTTP header line into 'method', 'path', and 'httpVersion' props.
HttpResponseStack.prototype._parseFirstLine = function(line, req) {
  var i = line.indexOf(' ');
  req.method = line.substring(0, i);
  var j = line.indexOf(' ', i+1);
  req.path = line.substring(i+1, j);
  req.httpVersion = line.substring(j+1);
}

