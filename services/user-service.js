var User = require('../models/user').User;
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
var countService = require('../services/count-service');

exports.addUser = function (user, next) {
    User.findOne({ email: user.email.toLowerCase() }, function (err, dbUser) {
        if (err) {
            next(err);
        } else if (dbUser != null) {
            var err = "A user with that email address already exists.";
            return next(err);
        }

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
                    next(err);
                }

                return next(null);
            });
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
            return next(err, null);
        }
        next(null, user.filters);
    });
}

exports.findUser = function (email, next) {
    User.findOne({ email: email.toLowerCase() }, function (err, user) {
        next(err, user);
    });
};

exports.removeUser = function(email, next) {
    User.findOne({ email: email.toLowerCase() }, function (err, user) {
        if (user == null) {
            var err = 'No user with that email address exists.\n';
            return next(err);
        }

        // decrement any user filters before proceeding
        function decrementFilter (filter) {
            countService.removeCount(filter, function(err) {
                console.log(filter);
                if (err) {
                    return next(err);
                }
            });
        }

        for (var i = 0; i < user.filters.length; i++) {
            decrementFilter(user.filters[i]);
        }

        user.remove(function(err) {
            if (err) {
                return next(err);
            }
            next(null);
        });
    });
}