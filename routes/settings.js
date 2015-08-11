var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');
var userService = require('../services/user-service');

router.get('/', restrict, function (req, res, next) {
    var vm = {
        title: 'Settings',
        user: req.user,
        id: req.user.id,
        name: req.user.name
    };
    res.render('settings/index', vm);
});

router.post('/', restrict, function (req, res, next) {
    if (req.body.name || req.body.email || req.body.password) {
        userService.updateUser(req.user.id, req.body.name, req.body.email, req.body.password, function (err) {
            if (err) {
                var vm = {
                    title: 'Settings',
                    user: req.user,
                    id: req.user.id,
                    name: req.user.name,
                    error: err
                };
                return res.render('settings/index', vm);
            }
            
            res.redirect('/settings');
        });
    } else {
        res.redirect('/settings');
    }

});

module.exports = router;