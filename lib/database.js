
var extend = require('extend');

var lokijs = require('lokijs');
var Database = new lokijs('database.json');
var Counters = Database.addCollection('counters');
var Users = Database.addCollection('users');
var Groups = Database.addCollection('groups');
var Sessions = Database.addCollection('sessions');

Users.insert({
	username: 'evshiron',
	password: '',
	nickname: 'Evshiron',
});

Users.removeWhere({
	username: 'evshiron',
});

Database.saveDatabase();

function _throw(err) { throw err; }

function Save() {

	Database.saveDatabase();

}

// FIXME: Return document.
function AddUser(userData) {

	var finalUserData = {};

	finalUserData.uid = require('crypto').randomBytes(16).toString('hex');
	finalUserData.username = userData.username ? userData.username : _throw(new TypeError('ERROR_USER_DATA_USERNAME'));
	finalUserData.password = userData.password ? userData.password : _throw(new TypeError('ERROR_USER_DATA_PASSWORD'));
	finalUserData.nickname = userData.nickname ? userData.nickname : _throw(new TypeError('ERROR_USER_DATA_NICKNAME'));
	finalUserData.description = userData.description ? userData.description : '';
	finalUserData.avatarUrl = userData.avatarUrl ? userData.avatarUrl : '';
	finalUserData.contacts = [];
	finalUserData.groups = [];

	if(FindUser(finalUserData.username)) {

		return new Error('ERROR_USER_EXISTS');

	}

	var user = Users.insert(finalUserData);
	Database.saveDatabase();
	return user;

}

// FIXME: Return document or null?
function FindUser(username) {

	var matches = Users.find({
		username: username,
	});

	if(matches.length == 1) {
		return matches[0];
	}
	else if(matches.length == 0) {
		return null;
	}
	else {
		throw new Error('ERROR_USER_DUPLICATED');
	}

}

// FIXME: Return true or false.
function MatchUser(username, password) {

	return !!Users.find({
		username: username,
		password: password,
	});

}

function SearchUser(pattern) {

	var matches = Users.find({
		'$or': [{
			username: {
				'$regex': new RegExp(pattern),
			},
		}, {
			nickname: {
				'$regex': new RegExp(pattern),
			},
		}]
	});

	return matches;

}

// FIXME: Return document.
function AddGroup(groupData) {

	var finalGroupData = {};

	finalGroupData.gid = require('crypto').randomBytes(16).toString('hex');
	finalGroupData.name = groupData.name ? groupData.name : _throw(new TypeError('ERROR_GROUP_DATA_NAME'));
	finalGroupData.creator = groupData.creator ? groupData.creator : _throw(new TypeError('ERROR_GROUP_DATA_CREATOR'));
	finalGroupData.administrators = [];
	finalGroupData.members = [];

	var group = Groups.insert(finalGroupData);
	Database.saveDatabase();
	return group;

}

module.exports = {
	Save: Save,
	AddUser: AddUser,
	FindUser: FindUser,
	MatchUser: MatchUser,
	SearchUser: SearchUser,
	AddGroup: AddGroup,
}
