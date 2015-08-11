var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    expressSession = require('express-session'),
    setup = require('./setup'),
    connectMongo = require('connect-mongo');

var routes = require('./routes/index'),
    map = require('./routes/map'),
    login = require('./routes/login'),
    sim = require('./routes/sim'),
    logout = require('./routes/logout'),
    create = require('./routes/create'),
    settings = require('./routes/settings'),
    config = require('./config');
    

var MongoStore = connectMongo(expressSession);

var passportConfig = require('./auth/passport-config'),
    restrict = require('./auth/restrict');

passportConfig();

mongoose.connect(config.mongoUri);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(expressSession({
    secret: 'dj89gja24kd9akl11jf876',
    saveUninitialized: false,
    resave: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    })
}));

app.use(passport.initialize());
app.use(passport.session());

if (process.argv.indexOf('setup') != -1) {
  console.log('running initial setup, please wait...');
  setup();
}

app.use('/', routes);
app.use('/login', login);
app.use('/logout', logout);
app.use('/create', create);
app.use('/map', map);
app.use('/settings', settings);
app.use('/sim', sim);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;