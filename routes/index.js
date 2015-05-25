var express = require('express');
var router = express.Router();
var restrict = require('../auth/restrict');

/* GET home page. */
router.get('/', restrict, function(req, res, next) {
  res.render('index', { title: 'Twitter Project', email: req.user.email, id: req.user.id, name: req.user.name });
});

module.exports = router;
