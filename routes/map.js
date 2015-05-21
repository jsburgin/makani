var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');

/* GET home page. */
router.get('/', restrict, function (req, res, next) {
    res.render('map/index', { title: 'Twitter Project' });
});

module.exports = router;
