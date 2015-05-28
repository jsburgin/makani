var express = require('express');
var router = express.Router();
var userService = require('../services/user-service');
var passport = require('passport');


/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('login/index', { title: 'Login', originalPage: req.path });
});

router.get('/create', function (req, res, next) {
    res.render('login/create', {title: 'Sign Up'})
});

router.post('/create', function (req, res, next) {
    userService.addUser(req.body, function (err) {
        if (err) {
            var vm = {
                title: 'Sign Up',
                input: req.body,
                error: err
            }
            delete vm.input.password;
            return res.render('/login/create', vm);
        }
        req.login(req.body, function (err) {
            res.redirect('/');
        });
    });
});

router.post('/', passport.authenticate('local', { failureRedirect: '/login' }), function (req, res, next) {
    var redirectURL = req.session.redirect_to;
    delete req.session.redirect_to;
    res.redirect(redirectURL);
});

module.exports = router;