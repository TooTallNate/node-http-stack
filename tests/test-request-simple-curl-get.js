var fs = require('fs');
var HttpResponseStack = require('../lib/http-stack').HttpResponseStack;


var rs = fs.createReadStream(__dirname + '/dumps/requests/simple-curl-get.dump');

var res = new HttpResponseStack(rs);

res.on('request', function(req) {
  console.error(req.headers);
});
