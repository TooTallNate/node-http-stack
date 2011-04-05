var HttpBaseStack = require('./base');
var inherits = require('util').inherits;

/**
 * StreamStack for writing HTTP requests and parsing the response.
 */
function HttpRequestStack(stream) {
  HttpBaseStack.call(this, stream);
}
inherits(HttpRequestStack, HttpBaseStack);
module.exports = HttpRequestStack;

// Bool to keep track of whether or not this 'HttpRequestStack'
// instance has had a request sent on it already.
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
HttpRequestStack.prototype._parseFirstLine = function(line, res) {
  var i = line.indexOf(' ');
  res.httpVersion = line.substring(0, i);
  var j = line.indexOf(' ', i+1);
  res.statusCode = line.substring(i+1, j);
  res.statusMessage = line.substring(j+1);
}
