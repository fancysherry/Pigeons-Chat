
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
	creator: String,
	administrators: [String],
	members: [String],
});

var UploadSchema = new mongoose.Schema({
	hash: String,
	mimeType: String,
	filename: String,
	owner: String,
});

GroupSchema.plugin(autoIncrement.plugin, { model: 'group', field: 'gid' });

var User = mongoose.model('user', UserSchema);
var Group = mongoose.model('group', GroupSchema);
var Upload = mongoose.model('upload', UploadSchema);

function AddUser(values, callback) {

	Util.Flow(function*(cb) {

		yield setTimeout(cb, 0);

		if(!values.username) return callback('ERROR_USERNAME');
		if(!values.password) return callback('ERROR_PASSWORD');
		if(!values.nickname) return callback('ERROR_NICKNAME');

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

function AddGroup(groupname, username, members, callback) {

	Util.Flow(function*(cb) {

		var group = new Group({
			groupname: groupname,
			creator: username,
			administrators: [username],
			members: [],
		});

		var [err, group] = yield group.save(cb);
		if(err) return callback(err);

		var [err, user] = yield User.findOne({
			username: username,
		}, cb);
		if(err) return callback(err);

		user.groupIds.push(group.gid);
		var [err, user] = yield user.save(cb);
		if(err) return callback(err);

		for(var i = 0; i < members.length; i++) {

			var [err, t] = yield User.findOne({
				username: members[i],
			}, cb);
			if(err) return callback(err);
			if(!t) continue;

			group.members.push(t.username);
			t.groupIds.push(group.gid);

			yield t.save(cb);

		}

		var [err, group] = yield group.save(cb);
		if(err) return callback(err);

		return callback(null, group);

	});

}

function FindGroup(gid, callback) {

	return Group.findOne({
		gid: gid,
	}, callback);

}

function JoinGroup(username, gid, callback) {

	Util.Flow(function*(cb) {

		var [err, user] = yield User.findOne({
			username: username,
		}, cb);
		if(err) return callback(err);

		var [err, group] = yield Group.findOne({
			gid: gid,
		}, cb);
		if(err) return callback(err);

		if(user.groupIds.indexOf(gid) != -1) return callback('ERROR_GROUPID_EXISTS');
		if(group.members.indexOf(username) != -1) return callback('ERROR_MEMBER_EXISTS');

		user.groupIds.push(gid);
		group.members.push(username);

		var [err, user] = yield user.save(cb);
		if(err) return callback(err);

		var [err, group] = yield group.save(cb);
		if(err) return callback(err);

		return callback(null);

	});

}

function AddUpload(values, callback) {

	Util.Flow(function*(cb) {

		yield setTimeout(cb, 0);

		if(!values.hash) return callback('ERROR_HASH');
		if(!values.mimeType) return callback('ERROR_MIMETYPE');
		if(!values.filename) return callback('ERROR_FILENAME');
		if(!values.owner) return callback('ERROR_OWNER');

		var [err, upload] = yield Upload.findOne({
			hash: values.hash,
		}, cb);

		if(err) return callback(err);
		if(upload) return callback('ERROR_UPLOAD_HASH_EXISTS', upload);

		var upload = new Upload(values);

		var [err, upload] = yield upload.save(cb);

		if(err) return callback(err);

		return callback(null, upload);

	});

}

function FindUpload(hash, callback) {

	return Upload.findOne({
		hash: hash,
	}, callback);

}

module.exports = {
	AddUser: AddUser,
	FindUser: FindUser,
	AuthorizeUser: AuthorizeUser,
	SearchUser: SearchUser,
	SearchGroup: SearchGroup,
	AddContact: AddContact,
	AddGroup: AddGroup,
	FindGroup: FindGroup,
	JoinGroup: JoinGroup,
	AddUpload: AddUpload,
	FindUpload: FindUpload,
};
