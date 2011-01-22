var assert = require('assert');
var httpStack = require('http-stack');
var fakeDuplexStream = require('stream-stack/util').fakeDuplexStream;

exports['test hello world'] = function() {
  var streams = fakeDuplexStream();
  var gotClientResponse = false;
  var gotClientResponseEnd = false;
  var gotServerRequest = false;

  var clientRequest = new httpStack.HttpRequestStack(streams[0]);
  clientRequest.on('response', function(clientResponse) {
    gotClientResponse = true;
    var body = "";
    clientResponse.on('data', function(chunk) {
      body += chunk.toString();
    });
    clientResponse.on('end', function() {
      gotClientResponseEnd = true;
      assert.equal(body, "hello world!");
    });
  });
  
  var serverResponse = new httpStack.HttpResponseStack(streams[1]);
  serverResponse.on('request', function(serverRequest) {
    gotServerRequest = true;
    assert.equal(serverRequest.headers.connection, 'keep-alive');
    serverResponse.writeHead(200, {
      'Content-Type': 'text/plain'
    });
    serverResponse.end('hello world!');
  });
  
  assert.ok(!gotServerRequest);
  assert.ok(!gotClientResponse);
  clientRequest.get('/', {
    "Connection": "keep-alive"
  });
  //assert.ok(!gotServerRequest);
  //assert.ok(!gotClientResponse);
  clientRequest.end();
  assert.ok(gotServerRequest);
  assert.ok(gotClientResponse);
  assert.ok(gotClientResponseEnd);
}
