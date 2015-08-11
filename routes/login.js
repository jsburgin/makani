var express = require('express');
var router = express.Router();
var userService = require('../services/user-service');
var passport = require('passport');

router.get('/', function (req, res, next) {
    res.render('login/index', { title: 'Login', originalPage: req.path, layout: 'login' });
});

router.post('/', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res, next) {
    var redirectURL = req.session.redirect_to;
    delete req.session.redirect_to;
    if (redirectURL == undefined) {
        res.redirect('/');
    } else {
        res.redirect(redirectURL);
    }


    
});

module.exports = router;