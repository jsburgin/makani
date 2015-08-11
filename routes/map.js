var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');

router.get('/', restrict, function (req, res, next) {
    var vm = {
        title: 'Map Feed',
        email: req.user.email,
        id: req.user.id,
        name: req.user.name
    }
    res.render('map/index', vm);
});

router.get('/*', restrict, function (req, res, next) {
    res.redirect('/map');
});

module.exports = router;
