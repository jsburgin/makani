module.exports = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.redirect_to = req._parsedOriginalUrl.path;
    res.redirect('/login');
};