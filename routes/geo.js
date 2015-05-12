var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('geo/index', { title: 'Twitter Project' });
});

module.exports = router;
