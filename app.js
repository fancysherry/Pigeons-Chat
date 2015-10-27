
var express = require('express');

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', function(socket) {

	console.log('User connected.');

	socket.on('disconnect', function() {

		console.log('User disconnected.');

	});

});

http.listen(8100, function() {

	console.log('HTTP server is listening at :8100.');

});
