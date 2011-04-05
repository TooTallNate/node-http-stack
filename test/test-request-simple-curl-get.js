var fs = require('fs');
var assert = require('assert');
var HttpResponseStack = require('../').HttpResponseStack;

var rs = fs.createReadStream(__dirname + '/dumps/requests/simple-curl-get.dump', {bufferSize:1});
var res = new HttpResponseStack(rs);

var gotRequest = false;
res.on('request', function(req) {
  gotRequest = true;

  console.error("Got HTTP Request!");
  console.error(req.method, req.path, req.httpVersion);
  console.error(req.headers);

  assert.equal(req.method, 'GET');
  assert.equal(req.path, '/');
  assert.equal(req.httpVersion, 'HTTP/1.1');
  assert.equal(req.headers[0], 'User-Agent: curl/7.21.0 (i686-pc-linux-gnu) libcurl/7.21.0 OpenSSL/0.9.8o zlib/1.2.3.4 libidn/1.18');
  assert.equal(req.headers[0].key, 'User-Agent');
  assert.equal(req.headers[0].value, 'curl/7.21.0 (i686-pc-linux-gnu) libcurl/7.21.0 OpenSSL/0.9.8o zlib/1.2.3.4 libidn/1.18');
  assert.equal(req.headers[0].value, req.headers['user-agent']);
  assert.equal(req.headers['user-agent'], 'curl/7.21.0 (i686-pc-linux-gnu) libcurl/7.21.0 OpenSSL/0.9.8o zlib/1.2.3.4 libidn/1.18');
  assert.equal(req.headers[1], 'Host: localhost:8080');
  assert.equal(req.headers[1].key, 'Host');
  assert.equal(req.headers[1].value, 'localhost:8080');
  assert.equal(req.headers[1].value, req.headers['host']);
  assert.equal(req.headers['host'], 'localhost:8080');
  assert.equal(req.headers[2], 'Accept: */*');
  assert.equal(req.headers[2].key, 'Accept');
  assert.equal(req.headers[2].value, '*/*');
  assert.equal(req.headers[2].value, req.headers['accept']);
  assert.equal(req.headers['accept'], '*/*');
});

process.on('exit', function() {
  assert.ok(gotRequest);
});
