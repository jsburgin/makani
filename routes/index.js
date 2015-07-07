var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');
var userService = require('../services/user-service');

/* GET home page. */
router.get('/', restrict, function (req, res, next) {
    var vm = {
        title: 'Primary Feed',
        email: req.user.email,
        id: req.user.id,
        name: req.user.name
    }
    res.render('index', vm);
});

module.exports = router;
