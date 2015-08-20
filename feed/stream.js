var Twit = require('twit'),
    async = require('async'),
    tweetService = require('../services/tweet-service'),
    countService = require('../services/count-service'),
    userService = require('../services/user-service'),
    locationService = require('../services/location-service'),
    devUtility = require('../feed/console'),
    simulator = require('../feed/simulate'),
    map = require('../feed/map'),
    gradient = require('../services/gradient'),
    util = require('util');

require('dotenv').load();


function hours(amount) {
    return amount * 3600000;
}

module.exports = function (io) {
    
    var client = new Twit({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });
    
    var primaryTracks = [],
        filters = [],
        locations = [],
        tweetCaches = {},
        filterUsers = {},
        trackCountPairs = {
            tracks: {},
            tpm: {},
            total: 0
        },
        locationCounts = {},
        startingDate = null,
        resetInterval = hours(.01);
    
    setTimeout(resetTracks, resetInterval);
    
    // find start date for simulations
    tweetService.getFirstTweet(function (err, date) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        startingDate = date;
    });
    
    locationService.getAllLocations(function (err, allLocations) {
        
        if (err) {
            console.log(err);
            process.exit(1);
        }
        
        for (var i = 0; i < allLocations.length; i++) {
            locations.push(allLocations[i].name);
            locationCounts[allLocations[i].name] = allLocations[i].tracks;
        }

    });
    
    var stream;
    
    countService.addCount({ track: 'all', type: -1 }, function (err) {
        if (err) {
            console.log(err);
        }
    });
    
    function saveTotalCount() {
        countService.changeCountValue('all', trackCountPairs.total, function (err) {
            if (err) {
                console.log(err);
            }
        });

        setTimeout(saveTotalCount, 20000);
    }
    
    async.waterfall([
        function (cb) {
            countService.getCountsOfType([-1, 0, 1, 2], cb);
        },
        function (counts, cb) {
            for (var i = 0; i < counts.length; i++) {
                var count = counts[i];
                
                var currentTime = new Date();
                currentTime.setSeconds(0);
                
                trackCountPairs.tpm[count.track] = [{ number: 0, time: currentTime }];

                tweetCaches[count.track] = [];
                trackCountPairs.tracks[count.track] = count.value;
                
                if (count.type == 0) {
                    primaryTracks.push(count.track);
                } else if (count.type == -1) {
                    trackCountPairs.total = count.value;
                } else {
                    filterUsers[count.track] = count.users;
                    filters.push(count.track);
                }
            }
            
            trackCountPairs.tpm['all'] = [{ number: 0, time: currentTime }];
            

            cb(null);
        },
        function (cb) {
            stream = client.stream('statuses/filter', { track: primaryTracks });
            stream.on('tweet', function (tweet) {
                processTweet(tweet);
            });
            setTimeout(refreshTweetPerMinutes, 60000);
            saveTotalCount();
        }
    ], function (err) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
    });
    
    function refreshTweetPerMinutes() {
        for (key in trackCountPairs.tpm) {
            var tpmValue = trackCountPairs.tpm[key];
            
            if (tpmValue.length > 120) {
                tpmValue.splice(0, 1);
            }
            
            var currentTime = new Date();
            currentTime.setSeconds(0);

            tpmValue.push({ number: 0, time: currentTime});
        }

        setTimeout(refreshTweetPerMinutes, 60000);
    }
    
    function updateTweetsPerMinute(track) {
        var tpmValue = trackCountPairs.tpm[track];
        tpmValue[tpmValue.length - 1].number++;
    }
    
    function processTweet(tweet) {
        async.waterfall([
            function (cb) {
                var tweetPackage = {
                    author: tweet.user.name,
                    geo: tweet.coordinates,
                    keys: {},
                    location: tweet.user.location,
                    text: tweet.text,
                    url: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str,
                    userId: tweet.user.id_str
                }
                
                var text = tweetPackage.text.toLowerCase();
                
                trackCountPairs.total++;
                updateTweetsPerMinute('all');
                
                // search through primary tracks
                for (var i = 0; i < primaryTracks.length; i++) {
                    var track = primaryTracks[i];
                    
                    if (text.indexOf(track) != -1) {
                        tweetPackage.keys[track] = ++trackCountPairs.tracks[track];
                        updateTweetsPerMinute(track);
                    }
                }
                
                // search through filters & locations
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    
                    if (text.indexOf(filter) != -1) {
                        tweetPackage.keys[filter] = ++trackCountPairs.tracks[filter];
                    }
                }
                
                cb(null, tweetPackage);
            },
            function (tweetPackage, cb) {
                emitTweet(tweetPackage, cb);
            }
        ], function (err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }
        });
    }
    
    function emitTweet(tweetPackage) {
        io.emit('tweet', tweetPackage);
        
        if (tweetPackage.geo) {
            map(io, tweetPackage);
        }
        
        tweetService.addTweet(tweetPackage, function (err) {
            if (err) {
                console.log(err);
            }
        });
        
        for (key in tweetPackage.keys) {
            if (tweetCaches[key].length > 9) {
                tweetCaches[key].splice(0, 1);
            }
            tweetCaches[key].push(tweetPackage);
            countService.updateCount(key, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
    
    // resets all tracks to 0 after a certain period of time
    function resetTracks() {

        for (key in trackCountPairs.tracks) {
            trackCountPairs.tracks[key] = 0;
        }
        
        trackCountPairs.total = 0;
        
        resetInterval = hours(.05);
        setTimeout(resetTracks, resetInterval);
    }
    
    io.on('connection', function (socket) {
        
        // generate original list of tracks to send to client
        var userEmail = null,
            baseTracksToSend = {
                tracks: {}
            };
        
        for (var i = 0; i < primaryTracks.length; i++) {
            baseTracksToSend.tracks[primaryTracks[i]] = trackCountPairs.tracks[primaryTracks[i]];
        }
        
        socket.emit('initialData', baseTracksToSend);
        
        socket.emit('startsim', startingDate);
        
        socket.emit('tpm', trackCountPairs.tpm['all'], 'all');
        
        var filters = [];
        
        socket.on('connected', function (userID) {
            userEmail = userID;
            userService.getUserFilters(userID, function (err, userFilters) {
                for (var i = 0; i < userFilters.length; i++) {
                    filters.push(userFilters[i].track);
                    var filterPackage = {
                        filter: userFilters[i].track,
                        count: trackCountPairs.tracks[userFilters[i].track]
                    }
                    socket.emit('filtercount', filterPackage);
                }
            });
        });
        
        socket.on('getTpm', function (track) {
            socket.emit('tpm', trackCountPairs.tpm[track], track);
        });
        
        socket.on('getPercentageValues', function (track) {
            socket.emit('updatePercentages', trackCountPairs.tracks[track], trackCountPairs.total);
        });
        
        
        socket.on('getcache', function (trackValue) {
            socket.emit('receivecache', tweetCaches[trackValue]);
        });
        
        socket.on('runSimulation', function (dates) {
            simulator(socket, dates, primaryTracks);
        });

    });
  
};