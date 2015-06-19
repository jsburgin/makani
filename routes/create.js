var express = require('express');
var router = express.Router();
var userService = require('../services/user-service');
var restrict = require('../auth/restrict');

router.get('/', function(req, res, next) {
	res.render('login/create', { title: 'Create Account'});
});

router.post('/', function(req, res, next) {
	userService.addUser(req.body, function(err) {
		if (err) {
			console.log(err);
			var vm = {
				title: 'Sign Up',
				input: req.body,
				error: err
			}
			delete vm.input.password;
			return res.render('login/create', vm);
		}

		req.login(req.body, function(err) {
			res.redirect('/');
		});
	});
});

module.exports = router;