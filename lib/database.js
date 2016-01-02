
var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

var Extend = require('extend');

var Util = require('./util');

mongoose.connect('mongodb://127.0.0.1:27017/chat');

var db = mongoose.connection;
db.on('open', function() {

	console.log('Database connected.');

});

db.on('close', function() {

	console.log('Database disconnected.');

});

autoIncrement.initialize(db);

var UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	nickname: String,
	description: { type: String, default: '' },
	avatarUrl: { type: String, default: '' },
	contactUsernames: [String],
	groupIds: [Number],
});

var GroupSchema = new mongoose.Schema({
	groupname: { type: String, default: 'group' },
	creatorId: Number,
	administratorIds: [Number],
	memberIds: [Number],
});

GroupSchema.plugin(autoIncrement.plugin, { model: 'group', field: 'gid' });

var User = mongoose.model('user', UserSchema);
var Group = mongoose.model('group', GroupSchema);

function AddUser(values, callback) {

	if(!values.username) return cb('ERROR_USERNAME');
	if(!values.password) return cb('ERROR_PASSWORD');
	if(!values.nickname) return cb('ERROR_NICKNAME');

	Util.Flow(function*(cb) {

		var [err, user] = yield User.findOne({
			username: values.username,
		}, cb);

		if(err) return callback(err);
		if(user) return callback('ERROR_USER_EXISTS');

		var user = new User(values);

		var [err, user] = yield user.save(cb);

		if(err) return callback(err);

		return callback(null, user);

	});

}

function FindUser(username, callback) {

	return User.findOne({
		username: username,
	}, callback);

}

function AuthorizeUser(username, password, callback) {

	Util.Flow(function*(cb) {

		var [err, user] = yield User.findOne({
			username: username,
			password: password,
		}, cb);

		if(err) return callback(err);

		return callback(null, !!user);

	});

}

function SearchUser(pattern, callback) {

	return User.find({
		$or: [{
			username: new RegExp(pattern),
		}, {
			nickname: new RegExp(pattern),
		}]
	}, callback);

}

function SearchGroup(pattern, callback) {

	return Group.find({
		$or: [{
			gid: isNaN(parseInt(pattern)) ? undefined : new RegExp(pattern),
		}, {
			groupname: new RegExp(pattern),
		}]
	}, callback);

}

function AddContact(usernameA, usernameB, callback) {

	Util.Flow(function*(cb) {

		var [err, userA] = yield User.findOne({
			username: usernameA,
		}, cb);
		if(err) return callback(err);

		var [err, userB] = yield User.findOne({
			username: usernameB,
		}, cb);
		if(err) return callback(err);

		if(userA.contactUsernames.indexOf(usernameB) != -1) return callback('ERROR_CONTACT_EXISTS');
		if(userB.contactUsernames.indexOf(usernameA) != -1) return callback('ERROR_CONTACT_EXISTS');

		userA.contactUsernames.push(usernameB);
		userB.contactUsernames.push(usernameA);

		var [err, userA] = yield userA.save(cb);
		if(err) return callback(err);

		var [err, userB] = yield userB.save(cb);
		if(err) return callback(err);

		return callback(null);

	});

}

module.exports = {
	AddUser: AddUser,
	FindUser: FindUser,
	AuthorizeUser: AuthorizeUser,
	SearchUser: SearchUser,
	SearchGroup: SearchGroup,
	AddContact: AddContact,
}
