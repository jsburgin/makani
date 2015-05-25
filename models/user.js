var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var userService = require('../services/user-service.js');

var userSchema = new Schema({
    name: { type: String, required: 'Please enter your first name' },
    email: { type: String, required: 'Please enter your email' },
    password: { type: String, required: 'Please enter a password' },
    filters: [{ track: String }],
    created: { type: Date, default: Date.now }
});

var User = mongoose.model('User', userSchema);

module.exports = {
    User: User
};