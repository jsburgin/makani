var Twit = require('twit');
require('dotenv').load();

module.exports = function (io) {

    var client = new Twit({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });


    var tracksToWatch = ['road', 'rain', 'wind', 'storm', 'cloud', 'destroy', 'clouds','damage', 'raining', 'flood', 'cloudy', 'windy', 'flooding', 'alwx', 'snow', 'thunder', 'earthquake', 'tornado', 'disaster', 'crash', 'crashed', 'tree fallen over', 'thunderstorm', 'lightning'];

    var originalTrackList = [];
    var trackCountPairs = {
        total: 0,
        tracks: {}
    }

    for (var i = 0; i < tracksToWatch.length; i++) {
        trackCountPairs.tracks[tracksToWatch[i]] = 0;
        originalTrackList.push(tracksToWatch[i]);
    }

    // dynamically added filters (includes states too)
    var filterCounts = {}

    var stateList = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'deleware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa','kansas', 'kentucky','louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi','missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virgina', 'washington', 'west virginia', 'wisconsin','wyoming'];

    var stream = client.stream('statuses/filter', { track: tracksToWatch });

    for (var i = 0; i < stateList.length; i++) {
        trackCountPairs.tracks[stateList[i]] = 0;
        tracksToWatch.push(stateList[i]);
        filterCounts[stateList[i]] = 1;
    }

    stream.on('tweet', function (tweet) {
        if (tweet.text !== undefined) {
            var text = tweet.text.toLowerCase();
            for (var i = 0; i < tracksToWatch.length; i++) {
                var v = tracksToWatch[i];
                if (text.indexOf(v.toLowerCase()) !== -1) {
                    trackCountPairs.tracks[v]++;
                    trackCountPairs.total++;
                    var tweetPackage = {
                        key: v,
                        newCount: trackCountPairs.tracks[v],
                        incomeSelector: v,
                        tweetData: tweet.text,
                        tweetAuthor: tweet.user.name,
                        tweetURL: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str
                    };
                    io.emit('tweet', tweetPackage);
                }
            }
        }
    });

    io.on('connection', function (socket) {
        // generate original list of tracks to send to client
        var baseTracksToSend = {
            total: trackCountPairs.total,
            tracks: {}
        };
        for (var i = 0; i < originalTrackList.length; i++) {
            baseTracksToSend.tracks[originalTrackList[i]] = trackCountPairs.tracks[originalTrackList[i]];
        }
        socket.emit('initialData', baseTracksToSend);

        var filters = [];
        socket.on('updatestream', function (newFilter) {
            filters.push(newFilter);
            if (newFilter in filterCounts) {
                filterCounts[newFilter]++;
            } else {
                filterCounts[newFilter] = 1;
                tracksToWatch.push(newFilter);
                trackCountPairs.tracks[newFilter] = 0;
            }
        });

        // removes any filters added by client
        socket.on('disconnect', function () {
            for (var i = 0; i < filters.length; i++) {
                if (filterCounts[filters[i]] == 1) {
                    var index = tracksToWatch.indexOf(filters[i]);
                    tracksToWatch.splice(index, 1);
                    delete trackCountPairs.tracks[filters[i]];
                    delete filterCounts[filters[i]];
                } else {
                    filterCounts[filters[i]]--;
                }
            }
        });
    });
}