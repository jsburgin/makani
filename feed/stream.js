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
            tracks: {}
        },
        locationCounts = {},
        startingDate = null;
    
    // find start date for simulations
    tweetService.getFirstTweet(function (err, date) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
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

    var stream = null;

    async.waterfall([
        function (cb) {
            countService.getCountsOfType([0, 1, 2], cb);
        },
        function (counts, cb) {
            
            for (var i = 0; i < counts.length; i++) {
                var count = counts[i];
                
            
                tweetCaches[count.track] = [];
                trackCountPairs.tracks[count.track] = count.value;
                
                if (count.type == 0) {
                    primaryTracks.push(count.track);
                } else {
                    filterUsers[count.track] = count.users;
                    filters.push(count.track);
                }
            }
            
            cb(null);
        },
        function (cb) {
            stream = client.stream('statuses/filter', { track: primaryTracks });
            stream.on('tweet', function (tweet) {
                processTweet(tweet);
            });
        },
        function (err) {
            console.log(err);
            process.exit(1);
        }
    ]);
    
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

                for (var i = 0; i < primaryTracks.length; i++) {
                    var track = primaryTracks[i];

                    if (text.indexOf(track) != -1) {
                        tweetPackage.keys[track] = ++trackCountPairs.tracks[track];
                    }
                }

                cb(null, tweetPackage);
            },
            function (tweetPackage, cb) {
                emitTweet(tweetPackage, cb);
            },
            function (err) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                }
            }
        ]);
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

    devUtility(stream);
        
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
            
        socket.on('addfilter', function (filterData) {

            filterData.track = filterData.track.toLowerCase();
            if (primaryTracks.indexOf(filterData.track) == -1 && filters.indexOf(filterData.track) == -1) {
                var newFilter = filterData.track;
                filters.push(newFilter);
                if (newFilter in filterUsers) {
                    filterUsers[newFilter]++;
                } else {
                    filterUsers[newFilter] = 1;
                    filters.push(newFilter);
                    trackCountPairs.tracks[newFilter] = 0;
                    tweetCaches[newFilter] = [];
                }
                    
                countService.addCount({ track: newFilter, type: 2 }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
                    
                userService.addFilter(filterData, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    var filterPackage = {
                        filter: newFilter,
                        count: trackCountPairs.tracks[newFilter]
                    }
                    socket.emit('filtercount', filterPackage);
                });

            }
        });
            
        socket.on('getcache', function (trackValue) {
            socket.emit('receivecache', tweetCaches[trackValue]);
        });
            
        function removeFilter(filter) {
            var localIndex = filters.indexOf(filter);
            filters.splice(localIndex, 1);
            if (filterUsers[filter] == 1) {
                var index = filters.indexOf(filter);
                filters.splice(index, 1);
                delete trackCountPairs.tracks[filter];
                delete filterUsers[filter];
            } else {
                filterUsers[filter]--;
            }
        }
            
        socket.on('removesinglefilter', function (filter) {
            // local
            removeFilter(filter);
            // database
            var filterData = {
                track: filter,
                userID: userEmail 
            }
            userService.removeFilter(filterData, function (err) {
                if (err) {
                    console.log(err);
                }
            });
            countService.removeCount(filter, function (err, filterFault) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                }
                    
                if (filterFault) {
                    console.log('Below zero for non-user created track!');
                }
            });
        });

        socket.on('runSimulation', function (dates) {
            simulator(socket, dates, primaryTracks);
        });

    });
    
}