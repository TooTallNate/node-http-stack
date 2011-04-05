var NetServer = require('net').Server;
var HttpResponseStack = require('http-stack').HttpResponseStack;

/**
 * This is a `net.Server` subclass that uses the 'HttpResponseStack' class to
 * act as a proper, compliant, TCP-based HTTP server. It has API parity with
 * Node's core `http.Server` class.
 */
function Server(listener) {
  NetServer.call(this, { allowHalfOpen: true }, this.setup);
  if (typeof listener == 'function') {
    this.on('request', listener);
  }
}
require('util').inherits(Server, NetServer);
exports.Server = Server;

Server.prototype.setup = function(stream) {
  var self = this;
  if (stream.readable && stream.writable) {
    var response = new HttpResponseStack(stream);
    response.on('request', function(request) {
      request.on('end', function() {
        // Call setup() on the stream again, for Keep-Alive connections.
        self.setup(stream);
      });
      self.emit('request', request, response);
    });
  } else {
    console.error("Stream is not readable/writable");
    stream.end();
  }
}

// Convenience function to create an HTTP server instance.
function createServer(listener) {
  return new Server(listener);
}
exports.createServer = createServer;
