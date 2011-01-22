var fs = require('fs');
var assert = require('assert');
var HttpRequestStack = require('../lib/http-stack').HttpRequestStack;

var rs = fs.createReadStream(__dirname + '/dumps/responses/http:__www.yahoo.com_');
var req = new HttpRequestStack(rs);

req.on('response', function(res) {
  console.error("Got HTTP Response!");
  console.error(res.statusCode, res.httpVersion);
  console.error(res.headers);
});
