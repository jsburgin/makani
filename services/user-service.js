var User = require('../models/user').User;
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');

exports.addUser = function (user, next) {
    bcrypt.hash(user.password, 10, function (err, hash) {
        if (err) {
            return next(err);
        }
        
        var newUser = new User({
            name: user.name,
            email: user.email.toLowerCase(),
            password: hash
        });
        
        newUser.save(function (err) {
            if (err) {
                return next(err);
            }
            next(null);
        });
    });
  
};

exports.addFilter = function (filterData, next) {
    User.findOne({ email: filterData.userID }, function (err, user) {
        if (err) {
            console.log(err);
        }
        user.filters.push({ track: filterData.track });
        user.save(function (err) {
            if (err) {
                return next(err);
            }
            next(null);
        });
    });
};

exports.removeFilter = function (filterData, next) {
    User.findOne({ email: filterData.userID }, function (err, user) {
        if (err) {
            console.log(err);
        }
        user.filters = user.filters.filter(function (v) {
            return v.track != filterData.track;
        });
        user.save(function (err) {
            if (err) {
                return next(err);
            }
            next(null);
        });
    });
}

exports.getUserFilters = function (userID, next) {
    User.findOne({ email: userID }, function (err, user) {
        if (err) {
            next(err, null);
        }
        next(null, user.filters);
    });
}

exports.findUser = function (email, next) {
    User.findOne({ email: email.toLowerCase() }, function (err, user) {
        next(err, user);
    });
};