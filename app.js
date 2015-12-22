
'use strict';

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

			failback('ERROR_TYPE_NOT_MATCH: ' + key);
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

	if(!data.sessionId || !(data.sessionId in Sessions)) {

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

function AuthorizeProfileEdit(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
		return false;

	}

	return true;

}

function AuthorizeContactAdd(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
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

	Session(socket, {});

	socket.on('disconnect', function() {

		logger.info('User disconnected.');

	});

	socket.on('register', function(data) {

		var session = Session(socket, data);

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

		//logger.info(Database.FindUser(data.username));

		if(Database.FindUser(data.username)) {

			return socket.emit('register', {
				err: 'ERROR_USERNAME_EXISTS',
			});

		}

		try {

			var user = Database.AddUser({
				username: data.username,
				password: data.password,
				nickname: data.nickname,
			});

		}
		catch(err) {

			return socket.emit('register', {
				err: err,
			});

		}

		logger.info(user);

		return socket.emit('register', {
			err: null,
		});

	});

	socket.on('login', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
			password: 'string',
		}, function(err) {

			return socket.emit('login', {
				err: err
			});

		})) return;

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

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			pattern: 'string',
		}, function(err) {

			return socket.emit('user.search', {
				err: err
			});

		})) return;

		var users = Database.SearchUser(data.pattern);

		console.log(users);

		var r = {};
		r.err = null;
		r.users = [];

		for(let user of users) {

			r.users.push({
				username: user.username,
				nickname: user.nickname,
				description: user.description,
			});

		}

		return socket.emit('user.search', r);

	});

	socket.on('contact.add', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			username: 'string',
		}, function(err) {

			return socket.emit('contact.add', {
				err: err
			});

		})) return;

		if(!AuthorizeContactAdd(session, function(err) {

			return socket.emit('contact.add', {
				err: err
			});

		})) return;

		if(!Database.FindUser(data.username)) {

			return socket.emit('contact.add', {
				err: 'ERROR_USER_NOT_FOUND',
			});

		}

		Database.AddContact(session.username, data.username);

		return socket.emit('contact.add', { err: null });

	});

	/*
	// Unused.
	socket.on('group.search', function(data) {

	});
	*/

	socket.on('profile.get', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
		}, function(err) {

			socket.emit('profile.get', {
				err: err
			});

		})) return;

		var username = data.username ? data.username : session.username;

		console.log(username);

		var user = Database.FindUser(username);

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

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			nickname: 'string',
			description: 'string',
		}, function(err) {

			return socket.emit('profile.edit', {
				err: err
			});

		})) return;

		if(!AuthorizeProfileEdit(session, function(err) {

			return socket.emit('profile.edit', {
				err: err
			});

		})) return;

		var user = Database.FindUser(session.username);

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
			nickname: user.nickname,
			description: user.description,
		});

	});

	socket.on('chat', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			to: 'string',
		}, function(err) {

			return socket.emit('chat', {
				err: err
			});

		})) return;

		if(!AuthorizeProfileEdit(session, function(err) {

			return socket.emit('profile.edit', {
				err: err
			});

		})) return;

	});

});

http.listen(8100, function() {

	var logger = log4js.getLogger('http');

	logger.info('HTTP server is listening at :8100.');

});

/*

process.stdin.resume();

process.on('exit', function() {

	//Database.Save();

});

process.on('SIGINT', function() {

	process.exit(1);

});

process.on('uncaughtException', function(err) {

	var logger = log4js.getLogger();

	logger.error(err.stack);
	process.exit(1);

});

*/
