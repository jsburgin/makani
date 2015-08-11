var express = require('express');
var router = express.Router();
var userService = require('../services/user-service');
var restrict = require('../auth/restrict');

router.get('/', function(req, res, next) {
	res.render('login/create', { title: 'Create Account', layout: 'login'});
});

router.post('/', function (req, res, next) {
    if (req.body.password == req.body.passwordConfirm) {
        userService.addUser(req.body, function (err) {
            if (err) {
                console.log(err);
                var vm = {
                    title: 'Sign Up',
                    input: req.body,
                    error: err,
                    layout: 'login'
                }
                delete vm.input.password;
                return res.render('login/create', vm);
            }
            
            req.login(req.body, function (err) {
                res.redirect('/');
            });
        });
    } else {
        res.render('login/create', {
            title: 'Sign Up',
            input: req.body,
            error: 'Passwords do not match.',
            layout: 'login'
        });
    }
	
});

module.exports = router;