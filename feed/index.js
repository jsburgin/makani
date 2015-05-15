var Twit = require('twit');
require('dotenv').load();

module.exports = function (io) {

    var client = new Twit({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });


    var tracksToWatch = ['road', 'rain', 'wind', 'storm', 'cloud', 'destroy', 'clouds', 'damage', 'raining', 'flood', 'cloudy', 'windy', 'flooding', 'alwx', 'snow', 'thunder', 'earthquake', 'tornado', 'disaster', 'crash', 'crashed', 'drought', 'thunderstorm', 'lightning'];

    var originalTrackList = [];
    var trackCountPairs = {
        total: 0,
        tracks: {}
    }
    var tweetCaches = {}

    for (var i = 0; i < tracksToWatch.length; i++) {
        trackCountPairs.tracks[tracksToWatch[i]] = 0;
        originalTrackList.push(tracksToWatch[i]);
        tweetCaches[tracksToWatch[i]] = [];
    }

    // dynamically added filters (includes states too)
    var filterCounts = {}

    var stateList = ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'deleware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa','kansas', 'kentucky','louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi','missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virgina', 'washington', 'west virginia', 'wisconsin','wyoming'];

    var stream = client.stream('statuses/filter', { track: tracksToWatch });

    for (var i = 0; i < stateList.length; i++) {
        trackCountPairs.tracks[stateList[i]] = 0;
        tweetCaches[stateList[i]] = [];
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
                    if (tweetCaches[v].length >= 10) {
                        tweetCaches[v].splice(0, 1);
                    }
                    tweetCaches[v].push(tweetPackage);
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
            newFilter = newFilter.toLowerCase();
            if (originalTrackList.indexOf(newFilter) == -1 && filters.indexOf(newFilter) == -1) {
                filters.push(newFilter);
                var filterPackage = {
                    filter: newFilter
                };
                if (newFilter in filterCounts) {
                    filterCounts[newFilter]++;
                    filterPackage['count'] = trackCountPairs.tracks[newFilter];
                    socket.emit('filtercount', filterPackage);
                } else {
                    filterCounts[newFilter] = 1;
                    tracksToWatch.push(newFilter);
                    trackCountPairs.tracks[newFilter] = 0;
                    tweetCaches[newFilter] = [];
                    filterPackage['count'] = 0;
                    socket.emit('filtercount', filterPackage);
                }
            } 
        });

        socket.on('getcache', function (trackValue) {
            socket.emit('receivecache', tweetCaches[trackValue]);
        });

        function removeFilter(filter) {
            var localIndex = filters.indexOf(filter);
            filters.splice(localIndex, 1);
            if (filterCounts[filter] == 1) {
                var index = tracksToWatch.indexOf(filter);
                tracksToWatch.splice(index, 1);
                delete trackCountPairs.tracks[filter];
                delete filterCounts[filter];
            } else {
                filterCounts[filter]--;
            }
        }

        // removes any filters added by client
        socket.on('disconnect', function () {
            for (var i = 0; i < filters.length; i++) {
                removeFilter(filters[i]);
            }
        });

        socket.on('removesinglefilter', function (filter) {
            removeFilter(filter);
        });

    });
}