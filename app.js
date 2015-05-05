var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var server = app.listen(8080);
var io = require('socket.io').listen(server);

var Twit = require('twit');
var _ = require('underscore');

var client = new Twit({
    consumer_key: 'FgELKMIIN0JIaBvXed9tf5VXL',
    consumer_secret: 'ZTeiKBrcemKUvEQlQiogu0SGJGSdql1uRqQJgePTowS9ciKgcQ',
    access_token: '3198420411-4hfcCJYZRGL3w5GC3SCGyfH60Y8IaAF68QpXhvo',
    access_token_secret: 't4CYTgXvynLowSIEHDCrNYRFOrvrgwH9KhHwCOps1qovq'
});

var tracksToWatch = ['road', 'rain', 'wind', 'storm', 'cloud', 'destroy', 'clouds', 'damage', 'raining', 'flood', 'cloudy', 'windy', 'flooding', 'alwx', 'snow', 'thunder'];
var trackCountPairs = {
    total: 0,
    tracks: {}
}

_.each(tracksToWatch, function (v) {
    trackCountPairs.tracks[v] = 0;
});

var stream = client.stream('statuses/filter', { track: tracksToWatch });

stream.on('tweet', function (tweet) {
    var verifyInTweet = false;
    if (tweet.text !== undefined) {
        var text = tweet.text.toLowerCase();
        _.each(tracksToWatch, function (v) {
            if (text.indexOf(v.toLowerCase()) !== -1) {
                trackCountPairs.tracks[v]++;
                trackCountPairs.total++;
                var updatedData = {
                    key: v,
                    newCount: trackCountPairs.tracks[v]
                }
                io.emit('data', updatedData);
                // clear the command propmt and update total
                process.stdout.write("\u001b[2J\u001b[0;0H");
                console.log("Total: " + trackCountPairs.total);
                _.each(tracksToWatch, function (c) {
                    var percentage = Math.floor(trackCountPairs.tracks[c] / trackCountPairs.total * 100);
                    console.log(c + ": " + percentage + "%");
                });
            }
        });
    }
});

io.on('connection', function (socket) {
    socket.emit('initialData', trackCountPairs);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

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
