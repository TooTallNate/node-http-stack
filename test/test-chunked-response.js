var net = require('net');
var http = require('http');
var suite = require('./suite');
var assert = require('assert');
var HttpRequestStack = require('http-stack').HttpRequestStack;

var gotRequest = false;
var gotResponse = false;
var gotEnd = false;
var BODY = 'Hello World\n';
var server = http.createServer(function(request, response) {
  gotRequest = true;
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end(BODY);
});
server.listen(suite.COMMON_PORT, function() {
  var conn = net.createConnection(suite.COMMON_PORT);
  var req = new HttpRequestStack(conn);
  req.get("/");
  req.end();
  req.on('response', function(res) {
    gotResponse = true;
    console.error(res.headers);
    var body = "";
    res.on('data', function(chunk) {
      body += chunk.toString();
    });
    res.on('end', function() {
      gotEnd = true;
      console.error(body);
      assert.equal(body, BODY);
      //assert.ok(conn.readable);
      conn.destroy();
      server.close();
    });
  });
});

process.on('exit', function() {
  assert.ok(gotRequest);
  assert.ok(gotResponse);
  assert.ok(gotEnd);
});
