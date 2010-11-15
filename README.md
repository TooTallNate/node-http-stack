node-http-stack
===============
### A [StreamStack][] implementation of the HTTP protocol for [Node][].


This module exposes two concrete `StreamStack` implementations:
`HttpRequestStack` and `HttpResponseStack`. Together they can be used to write
and/or respond to HTTP requests.

This is an alternative to the built-in core `http` module. It is designed
to be more lenient, as well as being written with the `StreamStack` ideology.


HTTP Request
------------

In this typical example, we'll establish a `net.Stream` connection to
_www.google.com_ on port 80 and send an HTTP request for `/`:

    var conn = require('net').createConnection(80, 'www.google.com');
    conn.on("connect", function() {
    
      var req = new HttpRequestStack(conn);
      
      // 'response' gets emitted when the HTTP headers have been recieved
      req.on("response", function(res) {
        console.error(res.headers);
      });
      
      // The body of the response will be piped to 'stdout'
      req.pipe(process.stdout);

      // Initiate a GET request for '/' with no request body
      req.get("/", [
        "Host: www.google.com"
      ]);
      req.end();
      
    });

Instead, in this example, we'll `write()` a request to __stdout__. Don't
expect there to be any response, but it's useful to see what's being written:

    var request = new HttpRequestStack(process.stdout);
    
    // Write an HTTP post request to stdout
    var body = "hello!\n";
    request.post("/", [
      "Content-Length: " + body.length,
      "Content-Type: text/plain",
      "Host: example.com"
    ]);
    request.end(body);
    
    --> POST / HTTP/1.1
    --> Content-Length: 7
    --> Content-Type: text/plain
    --> Host: example.com
    -->
    --> hello!


HTTP Response
-------------

You can use `HttpResponseStack`s to respond to HTTP requests from a `net.Server`:

    require('net').createServer(function(stream) {

      var res = new HttpResponseStack(stream);

      // 'request' is emitted when HTTP headers from a request have been parsed
      res.on("request", function(request) {
        res.writeHead(200, [
          'Content-Type: text/plain'
        ]);
        res.end('Hello World\n');        
      });
      
    }).listen(8124, 'localhost');


TODO
----

- Chunked encoding/decoding
- Keep-Alive (needs chunked encoding)
- Testing...

[StreamStack]: http://github.com/TooTallNate/node-stream-stack
[Node]: http://nodejs.org