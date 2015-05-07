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

var tracksToWatch = ['road', 'rain', 'wind', 'storm', 'cloud', 'destroy', 'clouds', 'damage', 'raining', 'flood', 'cloudy', 'windy', 'flooding', 'alwx', 'snow', 'thunder','earthquake', 'tornado','disaster','crash','crashed','tree fallen over', 'thunderstorm', 'lightning'];
var trackCountPairs = {
    total: 0,
    tracks: {}
}
var newTracksToWatch = [];

_.each(tracksToWatch, function (v) {
    trackCountPairs.tracks[v] = 0;
});

var stream = client.stream('statuses/filter', { track: tracksToWatch });

stream.on('tweet', function (tweet) {
    if (tweet.text !== undefined) {
        var text = tweet.text.toLowerCase();
        _.each(tracksToWatch, function (v) {
            if (text.indexOf(v.toLowerCase()) !== -1) {
                trackCountPairs.tracks[v]++;
                trackCountPairs.total++;
                var highPercents = {};
                for (var i = 0; i < 4; i++) {
                    var percentValue = (trackCountPairs.tracks[tracksToWatch[i]] / trackCountPairs.total * 100).toFixed(2);
                    highPercents[tracksToWatch[i]] = percentValue;
                }
                var updatedData = {
                    key: v,
                    newCount: trackCountPairs.tracks[v],
                    incomeSelector: v,
                    tweetData: tweet.text,
                    tweetAuthor: tweet.user.name,
                    highKeys: highPercents
                }
                io.emit('data', updatedData);
            }
        });
    }
});

io.on('connection', function (socket) {
    var newTracks = [];
    socket.emit('initialData', trackCountPairs);
    socket.on('updatestream', function (newTrack) {
        tracksToWatch.push(newTrack);
        newTracks.push(newTrack);
        trackCountPairs.tracks[newTrack] = 0;
    });
    socket.on('disconnect', function () {
        console.log(newTracks);
        for (var i = 0; i < newTracks.length; i++) {
            var index = tracksToWatch.indexOf(newTracks[i]);
            tracksToWatch.splice(index, 1);
            delete trackCountPairs.tracks[newTracks[i]];
        }
    });
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