
var _path = require('path');
var _fs = require('fs');
var _crypto = require('crypto');
var _repl = require('repl');

var log4js = require('log4js');
log4js.configure({
	appenders: [
		{ type: 'console' },
		{ type: 'file', filename: 'logs/CommonIO.log', backups: 3 },
	]
})

var mime = require('mime');

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');

var Database = require('./lib/database.js');

var Util = require('./lib/util');

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
var OnlineUsers = {};

function Session(socket, data) {

	var logger = log4js.getLogger('session');

	//logger.debug(Sessions);
	//logger.debug(data.sessionId);

	var session = null;

	if(!data.sessionId || !(data.sessionId in Sessions) || !Sessions[data.sessionId]) {

		// New session.
		session = {

			sid: require('crypto').randomBytes(32).toString('hex'),
			username: null,
			lastUpdated: Date.now(),

		};

		Sessions[session.sid] = session;

		if(socket) socket.emit('session', {
			err: null,
			sessionId: session.sid,
		});

	}
	else {

		session = Sessions[data.sessionId];

	}

	//logger.debug(session);

	session.lastUpdated = Date.now();
	if(socket) session.socket = socket;

	if(session.username && !OnlineUsers[session.username]) {

		OnlineUsers[session.username] = session;

		console.log('User ' + session.username + ' online.');

	}

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

function AuthorizeGroupAdd(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
		return false;

	}

	return true;

}

function AuthorizeGroupJoin(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
		return false;

	}

	return true;

}

function AuthorizeChat(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
		return false;

	}

	return true;

}

function AuthorizeUpload(session, callback) {

	if(!session.username) {

		callback('ERROR_SESSION_NOT_LOGIN');
		return false;

	}

	return true;

}

var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/profile', function(req, res) {

	var data = req.query;

	var session = Session(null, data);

	if(!Validate(data, {
		sessionId: 'string',
	}, function(err) {

		socket.emit('profile.get', {
			err: err
		});

	})) return;

	Util.Flow(function*(cb) {

		var username = data.username ? data.username : session.username;
		if(!username) return res.json({
			err: 'ERROR_USERNAME_INVALID'
		});

		//console.log(username);

		var [err, user] = yield Database.FindUser(username, cb);
		if(err) return res.json({
			err: err
		});

		if(!user) return res.json({
			err: 'ERROR_USER_NOT_FOUND'
		});

		return res.json({
			err: null,
			username: user.username,
			nickname: user.nickname,
			description: user.description,
		});

	});

});

app.post('/profile/edit', function(req, res) {

	var data = req.body;

	var session = Session(null, data);

	if(!Validate(data, {
		sessionId: 'string',
		nickname: 'string',
		description: 'string',
	}, function(err) {

		return res.json({
			err: err
		});

	})) return;

	Util.Flow(function*(cb) {

		if(!AuthorizeProfileEdit(session, function(err) {

			return res.json({
				err: err
			});

		})) return;

		var [err, user] = yield Database.FindUser(session.username, cb);
		if(err) return res.json({
			err: err
		});

		if(!user) return res.json({
			err: 'ERROR_USER_NOT_FOUND'
		});

		user.nickname = data.nickname;
		user.description = data.description;

		yield user.save(cb);

		return res.json({
			err: null,
			nickname: user.nickname,
			description: user.description,
		});

	});

});

app.get('/avatar/:username', function(req, res) {

	Util.Flow(function*(cb) {

		var username = req.params.username;

		var [err, user] = yield Database.FindUser(username, cb);

		if(!err && user && user.username) {

			var [err] = yield res.sendFile(user.username, {
				root: __dirname + '/uploads/avatars/',
				dotfiles: 'deny',
				/*
				headers: {
					'Content-Type': ''
				},
				*/
			}, cb);

			if(!err) return;

		}

		return res.sendFile('default.png', {
			root: __dirname + '/uploads/avatars/',
			dotfiles: 'deny',
		});

	});

});

app.post('/upload', multer().single('file'), function(req, res) {

	var data = req.body;

	var session = Session(null, data);

	if(!Validate(data, {
		sessionId: 'string',
	}, function(err) {

		return res.json({
			err: err
		});

	})) return;

	Util.Flow(function*(cb) {

		if(!AuthorizeUpload(session, function(err) {

			return res.json({
				err: err
			});

		})) return;

		console.log(req.file);

		var hasher = _crypto.createHash('md5');
		hasher.setEncoding('hex');
		hasher.end(req.file.buffer);
		var hash = hasher.read();

		var [err, upload] = yield Database.AddUpload({
			hash: hash,
			mimeType: mime.lookup(req.file.originalname),
			filename: hash + _path.extname(req.file.originalname),
			owner: session.username,
		}, cb);

		yield _fs.writeFile(_path.join('./', 'uploads', upload.filename), req.file.buffer, cb);

		return res.json({
			err: null,
			hash: hash
		});

	});

});

io.on('connection', function(socket) {

	var logger = log4js.getLogger('io');

	logger.info('User connected.');

	var session = Session(socket, {});

	socket.on('disconnect', function() {

		logger.info('User disconnected.');

		if(session.username && OnlineUsers[session.username]) {

			console.log('User ' + session.username + ' offline.');

			OnlineUsers[session.username] = null;
			delete OnlineUsers[session.username];
			session.username = null;

		}

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

		Util.Flow(function*(cb) {

			if((yield Database.FindUser(data.username, cb))[1]) return socket.emit('register', {
				err: 'ERROR_USERNAME_EXISTS',
			});

			var [err, user] = yield Database.AddUser({
				username: data.username,
				password: data.password,
				nickname: data.nickname,
			}, cb);

			if(err)	return socket.emit('register', {
				err: err,
			});

			logger.info(user);

			return socket.emit('register', {
				err: null,
			});

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

		Util.Flow(function*(cb) {

			if(!(yield Database.AuthorizeUser(data.username, data.password, cb))[1]) return socket.emit('login', {
				err: 'ERROR_LOGIN_FAILED',
			});

			session.username = data.username;

			//logger.info(session);

			Session(socket, data);

			return socket.emit('login', {
				err: null,
				username: session.username,
			});

		});

	});

	socket.on('contacts', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
					sessionId: 'string',
				}, function(err) {

					return socket.emit('contacts', {
						err: err
					});

				})) return;

		Util.Flow(function*(cb) {

			var [err, user] = yield Database.FindUser(session.username, cb);
			if(err) return socket.emit('contacts', {
				err: err,
			});

			if(!user) return socket.emit('contacts', {
				err: 'ERROR_USER_NOT_FOUND',
			});

			var r = {};
			r.err = null;
			r.contacts = [];

			for(var username of user.contactUsernames) {

				var [err, t] = yield Database.FindUser(username, cb);

				r.contacts.push({
					username: t.username,
					nickname: t.nickname,
				});

			}

			return socket.emit('contacts', r);

		});

	});

	socket.on('groups', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
		}, function(err) {

			return socket.emit('groups', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			var [err, user] = yield Database.FindUser(session.username, cb);
			if(err) return socket.emit('groups', {
				err: err,
			});

			if(!user) return socket.emit('groups', {
				err: 'ERROR_USER_NOT_FOUND',
			});

			var r = {};
			r.err = null;
			r.groups = [];

			for(var gid of user.groupIds) {

				var [err, t] = yield Database.FindGroup(gid, cb);

				r.groups.push({
					gid: t.gid,
					groupname: t.groupname,
				});

			}

			return socket.emit('groups', r);

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

		Util.Flow(function*(cb) {

			var [err, users] = yield Database.SearchUser(data.pattern, cb);

			if(err) return socket.emit('user.search', {
				err: err
			});

			console.log(users);

			var r = {};
			r.err = null;
			r.users = [];

			for(var user of users) {

				r.users.push({
					username: user.username,
					nickname: user.nickname,
					description: user.description,
				});

			}

			return socket.emit('user.search', r);

		});

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

		Util.Flow(function*(cb) {

			if(!AuthorizeContactAdd(session, function(err) {

				return socket.emit('contact.add', {
					err: err
				});

			})) return;

			var [err, user] = yield Database.FindUser(data.username, cb);
			if(err) return socket.emit('contact.add', {
				err: err,
			});

			if(!user) return socket.emit('contact.add', {
				err: 'ERROR_USER_NOT_FOUND',
			});

			// FIXME: Can't use `var err = ` or `err = { 0: null }`.
			// This seems to be an issue with `Util.Flow`, or destructuring.
			var [err] = yield Database.AddContact(session.username, data.username, cb);
			if(err) return socket.emit('contact.add', {
				err: err,
			});

			return socket.emit('contact.add', { err: null });

		});

	});

	socket.on('group.search', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			pattern: 'string',
		}, function(err) {

			return socket.emit('group.search', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			var [err, groups] = yield Database.SearchGroup(data.pattern, cb);

			if(err) return socket.emit('group.search', {
				err: err
			});

			console.log(groups);

			var r = {};
			r.err = null;
			r.groups = [];

			for(var group of groups) {

				r.groups.push({
					gid: group.gid,
					groupname: group.groupname,
				});

			}

			return socket.emit('group.search', r);

		});

	});

	socket.on('group.add', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			groupname: 'string',
		}, function(err) {

			socket.emit('group.add', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			if(!AuthorizeGroupAdd(session, function(err) {

				return socket.emit('group.add', {
					err: err
				});

			})) return;

			var [err, group] = yield Database.AddGroup(data.groupname, session.username, cb);

			return socket.emit('group.add', {
				err: null,
				gid: group.gid,
				groupname: group.groupname,
				creator: group.creator,
				administrators: group.administrators,
				members: group.members,
			});

		});

	});

	socket.on('group.join', function(data) {

		var session = Session(socket, data);
		data.gid = parseInt(data.gid);

		if(!Validate(data, {
			sessionId: 'string',
			gid: 'number',
		}, function(err) {

			return socket.emit('group.join', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			if(!AuthorizeGroupJoin(session, function(err) {

				return socket.emit('group.join', {
					err: err
				});

			})) return;

			var [err, group] = yield Database.FindGroup(data.gid, cb);
			if(err) return socket.emit('group.join', {
				err: err,
			});

			if(!group) return socket.emit('group.join', {
				err: 'ERROR_GROUP_NOT_FOUND',
			});

			// FIXME: Can't use `var err = ` or `err = { 0: null }`.
			// This seems to be an issue with `Util.Flow`, or destructuring.
			var [err] = yield Database.JoinGroup(session.username, data.gid, cb);
			if(err) return socket.emit('group.join', {
				err: err,
			});

			return socket.emit('group.join', { err: null });

		});

	});

	// Deprecated.
	socket.on('profile.get', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
		}, function(err) {

			socket.emit('profile.get', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			var username = data.username ? data.username : session.username;
			if(!username) return socket.emit('profile.get', {
				err: 'ERROR_USERNAME_INVALID'
			});

			//console.log(username);

			var [err, myself] = yield Database.FindUser(session.username, cb);
			if(err) return socket.emit('profile.get', {
				err: err
			});

			if(!myself) return socket.emit('profile.get', {
				err: 'ERROR_USER_NOT_FOUND'
			});

			var [err, user] = yield Database.FindUser(username, cb);
			if(err) return socket.emit('profile.get', {
				err: err
			});

			if(!user) return socket.emit('profile.get', {
				err: 'ERROR_USER_NOT_FOUND'
			});

			return socket.emit('profile.get', {
				err: null,
				username: user.username,
				nickname: user.nickname,
				description: user.description,
				isContact: user.username in myself.contactUsernames,
			});

		});

	});

	// Deprecated.
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

		Util.Flow(function*(cb) {

			if(!AuthorizeProfileEdit(session, function(err) {

				return socket.emit('profile.edit', {
					err: err
				});

			})) return;

			var [err, user] = yield Database.FindUser(session.username, cb);
			if(err) return socket.emit('profile.edit', {
				err: err
			});

			if(!user) return socket.emit('profile.edit', {
				err: 'ERROR_USER_NOT_FOUND'
			});

			user.nickname = data.nickname;
			user.description = data.description;

			yield user.save(cb);

			return socket.emit('profile.edit', {
				err: null,
				nickname: user.nickname,
				description: user.description,
			});

		});

	});

	socket.on('chat', function(data) {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			to: 'string',
			message: 'string',
		}, function(err) {

			return socket.emit('chat', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			if(!AuthorizeChat(session, function(err) {

				return socket.emit('chat', {
					err: err
				});

			})) return;

			if(!OnlineUsers[data.to]) return socket.emit('chat', {
				err: 'ERROR_USER_OFFLINE'
			});

			OnlineUsers[data.to].socket.emit('message', {
				err: null,
				from: session.username,
				message: data.message,
			});

			return socket.emit('chat', {
				err: null
			});

		});

	});

	socket.on('group.chat', function() {

		var session = Session(socket, data);

		if(!Validate(data, {
			sessionId: 'string',
			gid: 'string',
			message: 'string',
		}, function(err) {

			return socket.emit('group.chat', {
				err: err
			});

		})) return;

		Util.Flow(function*(cb) {

			if(!AuthorizeChat(session, function(err) {

				return socket.emit('group.chat', {
					err: err
				});

			})) return;

			return socket.emit('group.chat', {
				err: null
			});

		});

	});

});

http.listen(8100, function() {

	var logger = log4js.getLogger('http');

	logger.info('HTTP server is listening at :8100.');

});

var repl = _repl.start('> ');
repl.on('exit', function() {
	process.exit(0);
});
repl.context.Sessions = Sessions;
repl.context.OnlineUsers = OnlineUsers;

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
