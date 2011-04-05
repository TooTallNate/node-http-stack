var assert = require('assert');
var coreHttp = require('http');
var httpServer = require('../server');
var suite = require('./suite');

var gotRequest = false;
var gotResponse = false;
var gotEnd = false;

var BODY = 'Hello World\n';

var server = httpServer.createServer(function(request, response) {
  gotRequest = true;

  console.error("Got HTTP Request!");
  console.error(request.method, request.path, request.httpVersion);
  console.error(request.headers);
  
  assert.equal(request.method, 'GET');
  assert.equal(request.path, '/hello');
  assert.equal(request.httpVersion, 'HTTP/1.1');

  assert.equal(request.headers['something'], 1234);

  response.writeHead(200, {
    'Content-Type': 'text/plain',
    'Content-Length': BODY.length,
    'Connection': 'close'
  });
  response.end(BODY);
});
server.listen(suite.COMMON_PORT, function() {
  
  // Use the core HTTP client for this test.
  var client = coreHttp.createClient(suite.COMMON_PORT);
  var req = client.request('GET', '/hello', { 'Something': 1234 });
  req.end();
  req.on('response', function(res) {

    console.error("Got HTTP Response!");
    console.error(res.headers);

    gotResponse = true;
    assert.equal(res.statusCode, 200);
    assert.equal(res.httpVersion, '1.1');
    assert.equal(res.headers['content-type'], 'text/plain');
    assert.equal(res.headers['content-length'], BODY.length);
    assert.equal(res.headers['connection'], 'close');

    var body = '';
    res.setEncoding('ascii');
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      gotEnd = true;
      console.error(body);
      assert.equal(body, BODY);
      server.close();      
    });
  });
  
});

process.on('exit', function() {
  assert.ok(gotRequest);
  assert.ok(gotResponse);
  assert.ok(gotEnd);
});
