var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var geo = require('./routes/geo');

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

// intial tracks + any additional filters added by client
var tracksToWatch = ['road', 'rain', 'wind', 'storm', 'cloud', 'destroy', 'clouds', 
                     'damage', 'raining', 'flood', 'cloudy', 'windy', 'flooding', 
                     'alwx', 'snow', 'thunder', 'earthquake', 'tornado', 'disaster', 
                     'crash', 'crashed', 'tree fallen over', 'thunderstorm', 'lightning'];

// filled with original tracks on startup and used to send initial data to client
var originalTrackList = [];

var trackCountPairs = {
    total: 0,
    tracks: {}
}

// keeps track of filters (doesn't remove in-use filters on client disconnect)
var timesTrackAdded = {}

_.each(tracksToWatch, function (v) {
    trackCountPairs.tracks[v] = 0;
    originalTrackList.push(v);
});

var stateList = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'deleware', 'florida',
                'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland',
                'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey',
                'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
                'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virgina', 'washington', 'west virginia',
                'wisconsin', 'wyoming'];

var stream = client.stream('statuses/filter', { track: tracksToWatch });

_.each(stateList, function (v) {
    trackCountPairs.tracks[v] = 0;
    tracksToWatch.push(v);
    timesTrackAdded[v] = 100;
});

stream.on('tweet', function (tweet) {
    if (tweet.text !== undefined) {
        var text = tweet.text.toLowerCase();
        _.each(tracksToWatch, function (v) {
            if (text.indexOf(v.toLowerCase()) !== -1) {
                trackCountPairs.tracks[v]++;
                trackCountPairs.total++;
                var updatedData = {
                    key: v,
                    newCount: trackCountPairs.tracks[v],
                    incomeSelector: v,
                    tweetData: tweet.text,
                    tweetAuthor: tweet.user.name,
                    tweetURL: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str
                };
                io.emit('data', updatedData);
            }
        });
    }
});

io.on('connection', function (socket) {
    var newTracks = [];
    // generate list of orginal tracks to send to client
    var baseTracksToSend = {
        total: trackCountPairs.total,
        tracks: {}
    };
    _.each(originalTrackList, function (v) {
        baseTracksToSend.tracks[v] = trackCountPairs.tracks[v];
    });
    
    socket.emit('initialData', baseTracksToSend);
    
    // adds additional filters in addition to items being tracked
    socket.on('updatestream', function (newTrack) {
        newTracks.push(newTrack);
        if (newTrack in timesTrackAdded) {
            timesTrackAdded[newTrack]++;
        } else {
            timesTrackAdded[newTrack] = 1;
            tracksToWatch.push(newTrack);
            trackCountPairs.tracks[newTrack] = 0;
            console.log(trackCountPairs.tracks);
        }
    });
    
    // removes any filters added by client
    socket.on('disconnect', function () {
        console.log(newTracks);
        for (var i = 0; i < newTracks.length; i++) {
            if (timesTrackAdded[newTracks[i]] == 1) {
                var index = tracksToWatch.indexOf(newTracks[i]);
                tracksToWatch.splice(index, 1);
                delete trackCountPairs.tracks[newTracks[i]];
                delete timesTrackAdded[newTracks[i]];
            } else {
                timesTrackAdded[newTracks[i]]--;
            }
            
        }
    });
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/geo', geo);

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