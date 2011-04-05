var HttpRequestStack = require("../").HttpRequestStack;

var request = new HttpRequestStack(process.stdout);

// Write an HTTP post request to stdout
var body = 'hello!\n';
request.post('/', {
  'Content-Length': body.length,
  'Content-Type': 'text/plain',
  'Host': 'example.com'
});
request.write(body);
