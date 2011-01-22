var httpStack = require('http-stack');

var streams = require('stream-stack/util').fakeDuplexStream();

var res = new httpStack.HttpResponseStack(streams[0]);

streams[1].pipe(process.stdout);

res.writeHead(200);
res.end("test");
