var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');

/* GET home page. */
router.get('/', function (req, res, next) {
    var vm = {
        title: 'Simulate Feed',
    }
    res.render('sim/index', vm);
});

module.exports = router;
