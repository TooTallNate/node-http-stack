var HttpResponseStack = require('http-stack').HttpResponseStack;

var server = require('net').createServer(setup);

server.on('request', function (request, response) {
  console.error("Got HTTP Request!");
  console.error(request.method, request.path, request.httpVersion);
  request.headers.forEach(function(h) {
    console.error(String(h));
  });

  response.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': 12,
    'Connection': "Keep-Alive"
  });
  response.end('Hello World\n');
});

function setup(stream) {
  if (stream.readable && stream.writable) {
    var response = new HttpResponseStack(stream);
    response.on('request', function(request) {
      request.on('end', function() {
        setup(stream);
      });
      server.emit('request', request, response);
    });
  } else {
    console.error("Stream is not read/writable");
  }
}

server.listen(8124, console.error);
