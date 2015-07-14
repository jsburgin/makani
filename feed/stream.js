var Twit = require('twit'),
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
    
    var data = ['one', 'two', 'three'];
    
    gradient.generateGradientArray(data, [{ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0}], function (err, colorObject) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        
        console.log(colorObject);
    });

    process.stdin.setEncoding('utf8');
    
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
    
    
    /*countService.getCountsOfType([0, 1], function (err, counts) {

        if (err) {
            console.log(err);
        }
        
        var locations = [];
        var tracks = [];
        
        for (var i = 0; i < counts.length; i++) {
            if (counts[i].type == 0) {
                tracks.push(counts[i]);
            } else {
                locations.push(counts[i].track);
            }
        }

        var trackObj = {};
        for (var i = 0; i < tracks.length; i++) {
            trackObj[tracks[i].track] = 0;
        }

        for (var i = 0; i < locations.length; i++) {
            locationService.addLocation(locations[i], trackObj, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }

    });*/
    
    // generate original tracks
    countService.getCountsOfType([0, 1, 2], function (err, counts) {

        if (err) {
            console.log(err);
            process.exit(1);
        } else {

            for (var i = 0; i < counts.length; i++) {
                tweetCaches[counts[i].track] = [];
                trackCountPairs.tracks[counts[i].track] = counts[i].value;
                if (counts[i].type == 0) {
                    primaryTracks.push(counts[i].track);
                } else {
                    filterUsers[counts[i].track] = counts[i].users;
                    filters.push(counts[i].track);
                }
            }

        }
        
        
        var stream = client.stream('statuses/filter', { track: primaryTracks });

        stream.on('tweet', function(tweet) {
            
            if (tweet.text != undefined) {
                var text = tweet.text.toLowerCase(),
                    location = tweet.user.location.toLowerCase(),
                    foundFilters = false,
                    tweetPackage = {
                        text: tweet.text,
                        author: tweet.user.name,
                        tweetId: tweet.id_str,
                        userId: tweet.user.id_str,
                        retweeted: tweet.retweeted,
                        keys: {},
                        keyCount: 0,
                        url: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str,
                        geo: tweet.coordinates
                    }

                function emitTweet(tweetPackage) {
                    io.emit('tweet', tweetPackage);
                    
                    if (tweetPackage.geo) {
                        map(io, tweetPackage);
                    }

                    tweetService.addTweet(tweetPackage, function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });

                    for (key in tweetPackage.keys) {
                        if (tweetCaches[key].length > 9) {
                            tweetCaches[key].splice(0,1);
                        }
                        tweetCaches[key].push(tweetPackage);
                        countService.updateCount(key, function(err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }    

                function findNextMatchingTrack(trackIndex) {

                    var t = primaryTracks[trackIndex].toLowerCase();
                    if (text.indexOf(t) != -1) {
                        tweetPackage.keys[t] = ++trackCountPairs.tracks[t];
                        tweetPackage.keyCount++;
                    }

                    if (trackIndex == primaryTracks.length - 1) {

                        if (tweetPackage.keyCount != 0) {
                            delete tweetPackage['keyCount'];
                            findNextMatchingFilter(0);

                            function findNextMatchingFilter(filterIndex) {
                                var f = filters[filterIndex].toLowerCase();
                                if (location.indexOf(f) != -1 || text.indexOf(f) != -1) {
                                    tweetPackage.keys[f] = ++trackCountPairs.tracks[f];
                                }

                                if (filterIndex != filters.length - 1) {
                                    setTimeout(findNextMatchingFilter, 0, filterIndex + 1);
                                } else {
                                    setTimeout(emitTweet, 0, tweetPackage);
                                }
                            }
                        }

                    } else {
                        setTimeout(findNextMatchingTrack, 0, trackIndex + 1);
                    }
                }

                findNextMatchingTrack(0);
            }
        });

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
    });
}