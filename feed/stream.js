var Twit = require('twit'),
    tweetService = require('../services/tweet-service'),
    countService = require('../services/count-service'),
    userService = require('../services/user-service'),
    devUtility = require('../feed/console'),
    simulator = require('../feed/simulate'),
    util = require('util');
require('dotenv').load();

module.exports = function (io) {

    process.stdin.setEncoding('utf8');
    
    var client = new Twit({
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_SECRET,
        access_token: process.env.ACCESS_TOKEN,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET
    });
    
    var tracksToWatch = [],
        originalTrackList = [],
        tweetCaches = {},
        filterCounts = {},
        trackCountPairs = {
            tracks: {}
        };
    
    
    var firstDate = null;
    
    // find start date for simulations
    tweetService.getFirstTweet(function (err, date) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        
        if (date == null) {
            console.log('No records in database for simulation.');
        } else {
            firstDate = new Date(date);
            console.log('Simulation ready.');
            console.log('Starting record: ' + firstDate);
        }
    });
    
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
                    originalTrackList.push(counts[i].track);
                } else {
                    filterCounts[counts[i].track] = counts[i].users;
                    tracksToWatch.push(counts[i].track);
                }
            }
        }
        
        var stream = client.stream('statuses/filter', { track: originalTrackList });
        console.log('Feeder ready.');

        stream.on('tweet', function(tweet) {
            
            if (tweet.text != undefined) {

                var text = tweet.text.toLowerCase(),
                    foundFilters = false,
                    tweetPackage = {
                        text: tweet.text,
                        author: tweet.user.name,
                        tweetId: tweet.id_str,
                        userId: tweet.user.id_str,
                        retweeted: tweet.retweeted,
                        keys: {},
                        keyCount: 0,
                        url: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str
                    }

                function emitTweet(tweetPackage) {
                    io.emit('tweet', tweetPackage);

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
                    var t = originalTrackList[trackIndex].toLowerCase();
                    if (text.indexOf(t) != -1) {
                        tweetPackage.keys[t] = ++trackCountPairs.tracks[t];
                        tweetPackage.keyCount++;
                    }

                    if (trackIndex == originalTrackList.length - 1) {
                        if (tweetPackage.keyCount != 0) {
                            delete tweetPackage['keyCount'];
                            findNextMatchingFilter(0);

                            function findNextMatchingFilter(filterIndex) {
                                var f = tracksToWatch[filterIndex].toLowerCase();
                                if (text.indexOf(f) != -1) {
                                    tweetPackage.keys[f] = ++trackCountPairs.tracks[f];
                                }

                                if (filterIndex != tracksToWatch.length - 1) {
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
            var userEmail = null;
            var baseTracksToSend = {
                tracks: {}
            };
            for (var i = 0; i < originalTrackList.length; i++) {
                baseTracksToSend.tracks[originalTrackList[i]] = trackCountPairs.tracks[originalTrackList[i]];
            }
            socket.emit('initialData', baseTracksToSend);
            socket.emit('startsim', firstDate);
            
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
                if (originalTrackList.indexOf(filterData.track) == -1 && filters.indexOf(filterData.track) == -1) {
                    var newFilter = filterData.track;
                    filters.push(newFilter);
                    if (newFilter in filterCounts) {
                        filterCounts[newFilter]++;
                    } else {
                        filterCounts[newFilter] = 1;
                        tracksToWatch.push(newFilter);
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
                if (filterCounts[filter] == 1) {
                    var index = tracksToWatch.indexOf(filter);
                    tracksToWatch.splice(index, 1);
                    delete trackCountPairs.tracks[filter];
                    delete filterCounts[filter];
                } else {
                    filterCounts[filter]--;
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
                simulator(socket, dates, originalTrackList);
            });

        });
    });
}