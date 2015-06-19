var Twit = require('twit'),
    tweetService = require('../services/tweet-service'),
    countService = require('../services/count-service'),
    userService = require('../services/user-service'),
    devUtility = require('../feed/dev-utility'),
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
    
    var tracksToWatch = [];
    var originalTrackList = [];
    var trackCountPairs = {
        tracks: {}
    };
    var tweetCaches = {};
    var filterCounts = {};
    
    var firstDate = null;

    var simReady = false;
    var feedReady = false;

    function checkService() {
        if (simReady && feedReady) {
            console.log('');
        }
    }
    
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

        simReady = true;
        checkService();
    });
    
    // generate original tracks
    countService.getCountsOfType([0, 1, 2], function (err, counts) {
        if (err) {
            console.log(err);
            process.exit(1);
        } else {
            for (var i = 0; i < counts.length; i++) {
                tracksToWatch.push(counts[i].track);
                tweetCaches[counts[i].track] = [];
                trackCountPairs.tracks[counts[i].track] = counts[i].value;
                if (counts[i].type == 0) {
                    originalTrackList.push(counts[i].track);
                } else {
                    filterCounts[counts[i].track] = counts[i].users;
                }
            }
        }
        
        var stream = client.stream('statuses/filter', { track: originalTrackList });
        console.log('Feeder ready.');
        feedReady = true;
        checkService();

        stream.on('tweet', function (tweet) {
            if (tweet.text !== undefined) {
                var text = tweet.text.toLowerCase();
                var alreadySaved = false;
                for (var i = 0; i < tracksToWatch.length; i++) {
                    var v = tracksToWatch[i];
                    if (text.indexOf(v.toLowerCase()) !== -1) {
                        trackCountPairs.tracks[v]++;
                        // add new parameter to determine whether to print for all!
                        var tweetPackage = {
                            key: v,
                            newCount: trackCountPairs.tracks[v],
                            incomeSelector: v,
                            tweetData: tweet.text,
                            tweetAuthor: tweet.user.name,
                            tweetURL: 'http://twitter.com/' + tweet.user.id_str + '/status/' + tweet.id_str,
                            id: tweet.id_str,
                            retweeted: tweet.retweeted,
                            date: tweet.created_at,
                            userId: tweet.user.id_str
                        };
                        // store in local cache
                        
                        io.emit('tweet', tweetPackage);
                        
                        if (tweetCaches[v].length >= 10) {
                            tweetCaches[v].splice(0, 1);
                        }
                        tweetCaches[v].push(tweetPackage);
                        // save to database
                        if (!alreadySaved) {
                            tweetService.addTweet(tweetPackage, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                            alreadySaved = true;
                        }
                        countService.updateCount(v, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }
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
            
            
            // run simulation

            socket.on('runningSim', function (dates) {
                var startTime = new Date(dates.start),
                    endTime = new Date(dates.stop);
                
                var trackCounts = {
                    tracks: {}
                }
                for (var i = 0; i < originalTrackList.length; i++) {
                    trackCounts.tracks[originalTrackList[i]] = 0;
                }
                
                socket.emit('simInit', trackCounts);
                
                tweetService.getTweets(startTime, new Date(startTime.getTime() + 60000), function (initialData) {
                    
                    var runWithNoData = false;

                    function sendData(data, next, cbObj) {
                        var tweetCount = 0,
                            lastTweetTime = 0;
                        function emitTweet(tweetCount) {
                            trackCounts.tracks[data[tweetCount].track]++;
                            var tweetPackage = {
                                key: data[tweetCount].track,
                                newCount: trackCounts.tracks[data[tweetCount].track],
                                incomeSelector: data[tweetCount].track,
                                tweetData: data[tweetCount].text,
                                tweetAuthor: data[tweetCount].userName,
                                created: data[tweetCount].created
                            }
                            socket.emit('simTweet', tweetPackage);
                            lastTweetTime = data[tweetCount].created;
                            tweetCount++;
                            if (tweetCount < data.length) {
                                setTimeout(emitTweet, Math.abs(data[tweetCount].created - lastTweetTime), tweetCount);
                            } else {
                                next(cbObj);
                            }
                        }
                        if (data.length > 0) {
                            emitTweet(tweetCount);
                        } else {
                            next(cbObj);
                        }
                    }
                    
                    function callLoop(currentMinute, twitterData) {
                        
                        function finishedSendingToClient(obj) {
                            if (currentMinute < endTime) {
                                if (obj.data.length == 0 && !runWithNoData) {
                                    setTimeout(finishedSendingToClient, 0, obj);
                                } else {
                                    runWithNoData = false;
                                    setTimeout(callLoop, 0, new Date(currentMinute.getTime() + 60000), obj.data);
                                }
                            }
                        }
                        var callBackObject = {
                            data: []
                        };
                        tweetService.getTweets(currentMinute, new Date(currentMinute.getTime() + 60000), function (tweets) {
                            if (tweets.length == 0) {
                                runWithNoData = true;
                            }
                            callBackObject.data = tweets;
                        });
                        setTimeout(sendData, 0, twitterData, finishedSendingToClient, callBackObject);
                    }
                    callLoop(new Date(startTime.getTime() + 60000), initialData);
                }); // tweetService.getTweets
            }); // running sim

        });
    }); // generated tracks
}