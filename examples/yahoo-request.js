var HttpRequestStack = require('../lib/http-stack').HttpRequestStack;

// Create the 'low-level' net.Stream we're going to be 'stacking' on
var conn = require('net').createConnection(80, 'www.yahoo.com');

conn.on('connect', function() {
  
  console.log('connected!');
  // Create our first "stack", the HttpRequestStack instance. This class is
  // responsible for writing an HTTP request to the provided 'conn', and then
  // parsing the response into a 'response' event and clean 'data' events.
  var req = new HttpRequestStack(conn);
  
  req.get("/", [
    "Host: www.yahoo.com"
    //"Connection: close",
    //"Accept-Encoding: gzip"
  ]);
  //req.end();
  
  // 'response' is fired after the final HTTP header has been parsed. 'res'
  // is a ReadStream, that also contains 'rawHeaders', 'headers' properties.
  req.on('response', function(res) {

    res.pipe(process.stdout);
  
    res.on('data', function(chunk) {
      //console.error(chunk.toString());
    });
  
    res.on('end', function() {
      console.error('received FIN packet from "conn"');
    });
    
  });
  
});
