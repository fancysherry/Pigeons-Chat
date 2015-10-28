
var log4js = require('log4js');
log4js.configure({
	appenders: [
		{ type: 'console' },
		{ type: 'file', filename: 'logs/CommonIO.log', backups: 3 },
	]
})

var express = require('express');

var Database = require('./lib/database.js');

function Validate(data, types, failback) {

	for(var key in types) {

		if(typeof(data[key]) != types[key]) {

			failback('ERROR_TYPE_NOT_MATCH');
			return false;

		}

	}

	return true;

}

var Sessions = {};

function Session(socket, data) {

	var logger = log4js.getLogger('session');

	//logger.debug(Sessions);
	//logger.debug(data.sessionId);

	var session = null;

	if(data.sessionId == '' || !(data.sessionId in Sessions)) {

		// New session.
		session = {

			sid: require('crypto').randomBytes(32).toString('hex'),
			username: null,
			lastUpdated: Date.now(),

		};

		Sessions[session.sid] = session;

		socket.emit('session', {
			err: null,
			sessionId: session.sid,
		});

	}
	else {

		session = Sessions[data.sessionId];

	}

	//logger.debug(session);

	session.lastUpdated = Date.now();

	return session;

}

function AuthorizeProfileEdit(session, username, failback) {

	if(!session) {

		failback('ERROR_SESSION_NOT_FOUND');
		return false;

	}

	console.log(session);
	console.log(username);

	if(session.username != username) {

		failback('ERROR_PERMISSION_DENIED');
		return false;

	}

	return true;

}

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', function(socket) {

	var logger = log4js.getLogger('io');

	logger.info('User connected.');

	socket.on('disconnect', function() {

		logger.info('User disconnected.');

	});

	socket.on('register', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
			password: 'string',
			nickname: 'string',
		}, function(err) {

			return socket.emit('register', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		//logger.info(Database.FindUser(data.username));

		if(Database.FindUser(data.username)) {

			return socket.emit('register', {
				err: 'ERROR_USERNAME_EXISTS',
			});

		}

		var user = Database.AddUser({
			username: data.username,
			password: data.password,
			nickname: data.nickname,
		});

		logger.info(user);

		return socket.emit('register', {
			err: null,
		});

	});

	socket.on('login', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
			password: 'string',
		}, function(err) {

			return socket.emit('login', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		//logger.info(Database.MatchUser(data.username, data.password));

		if(!Database.MatchUser(data.username, data.password)) {

			return socket.emit('login', {
				err: 'ERROR_LOGIN_FAILED',
			});

		}

		session.username = data.username;

		return socket.emit('login', {
			err: null,
		});

	});

	socket.on('user.search', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			pattern: 'string',
		}, function(err) {

			return socket.emit('user.search', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		var users = Database.SearchUser(data.pattern);

		console.log(users);

		var r = {};
		r.err = null;
		r.users = [];

		for(user in users) {

			r.users.push({
				nickname: user.nickname,
				description: user.description,
			});

		}

		return socket.emit('user.search', r);

	});

	socket.on('contact.add', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
		}, function(err) {

			return socket.emit('contact.add', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		if(!Database.FindUser(data.username)) {

			return socket.emit('contact.add', {
				err: 'ERROR_USER_NOT_FOUND',
			});

		}

	});

	/*
	// Unused.
	socket.on('group.search', function(data) {

	});
	*/

	socket.on('profile.get', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
		}, function(err) {

			socket.emit('profile.get', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		var user = Database.FindUser(data.username);

		if(!user) {

			return socket.emit('profile.get', {
				err: 'ERROR_USER_NOT_FOUND',
			});

		}

		return socket.emit('profile.get', {
			err: null,
			username: user.username,
			nickname: user.nickname,
			description: user.description,
			avatarUrl: user.avatarUrl,
		});

	});

	socket.on('profile.edit', function(data) {

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
			nickname: 'string',
			description: 'string',
		}, function(err) {

			return socket.emit('profile.edit', {
				err: err
			});

		})) return;

		var session = Session(socket, data);

		if(!AuthorizeProfileEdit(session, data.username, function(err) {

			return socket.emit('profile.edit', {
				err: err
			});

		})) return;

		var user = Database.FindUser(data.username);

		if(!user) {

			return socket.emit('profile.edit', {
				err: 'ERROR_USER_NOT_FOUND',
			});

		}

		user.nickname = data.nickname;
		user.description = data.description;

		Database.Save();

		return socket.emit('profile.edit', {
			err: null,
			username: user.username,
			nickname: user.nickname,
			description: user.description,
		});

	});

});

http.listen(8100, function() {

	var logger = log4js.getLogger('http');

	logger.info('HTTP server is listening at :8100.');

});
