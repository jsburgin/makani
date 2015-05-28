var Twit = require('twit'),
    tweetService = require('../services/tweet-service'),
    countService = require('../services/count-service'),
    userService = require('../services/user-service');
require('dotenv').load();

module.exports = function (io) {
    
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
    
    // find start date for simulations
    tweetService.getFirstTweet(function (err, date) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        
        firstDate = new Date(date);
        console.log('Simulation ready.');
        console.log('Starting record: ' + firstDate);
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
        console.log('Feeder ready.')

        stream.on('tweet', function (tweet) {
            if (tweet.text !== undefined) {
                var text = tweet.text.toLowerCase();
                for (var i = 0; i < tracksToWatch.length; i++) {
                    var v = tracksToWatch[i];
                    if (text.indexOf(v.toLowerCase()) !== -1) {
                        trackCountPairs.tracks[v]++;
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
                        tweetService.addTweet(tweetPackage, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                        countService.updateCount(v, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }
            }
        });
        
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
                if (tweetCaches[trackValue].length < 9) {
                    tweetService.getTweetsForCache(trackValue, function (err, tweets) {
                        if (err) {
                            console.log(err);
                            process.exit(1);
                        }
                        tweetCaches[trackValue] = [];
                        for (var i = tweets.length - 1; i > -1; i--) {
                            var tweetPackage = {
                                key: tweets[i].track,
                                newCount: trackCountPairs.tracks[tweets[i].track],
                                incomeSelector: tweets[i].track,
                                tweetData: tweets[i].text,
                                tweetAuthor: tweets[i].userName,
                                tweetURL: 'http://twitter.com/' + tweets[i].userId + '/status/' + tweets[i].tweetId,
                                id: tweets[i].tweetId,
                                retweeted: tweets[i].retweeted
                            }
                            tweetCaches[trackValue].push(tweetPackage);
                        }
                        socket.emit('receivecache', tweetCaches[trackValue]);
                    });
                } else {
                    socket.emit('receivecache', tweetCaches[trackValue]);
                }
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
                var trackCounts = {
                    tracks: {}
                }
                for (var i = 0; i < originalTrackList.length; i++) {
                    trackCounts.tracks[originalTrackList[i]] = 0;
                }
                socket.emit('simInit', trackCounts);

                tweetService.getTweets(dates, function (err, tweetsToEmit) {
                    if (err) {
                        console.log(err);
                        process.exit(1);
                    }
                    
                    console.log(tweetsToEmit.length);
                    console.log(tweetsToEmit[0].created);
                    console.log(tweetsToEmit[tweetsToEmit.length - 1].created);  

                    var subTime = tweetsToEmit[0].created;
                    var timeDelay = 0;

                    for (var i = 0; i < 10000; i++) {
                        timeDelay = tweetsToEmit[i].created - subTime + timeDelay;
                        trackCounts.tracks[tweetsToEmit[i].track]++;
                        !function (tweet, time, count) {
                            setTimeout(function () {
                                var tweetPackage = {
                                    key: tweet.track,
                                    newCount: count,
                                    incomeSelector: tweet.track,
                                    tweetData: tweet.text,
                                    tweetAuthor: tweet.userName,
                                    id: tweet.id,
                                    tweetURL: 'http://twitter.com/' + tweet.userName + '/status/' + tweet.id,
                                    created: tweet.created
                                }
                                
                                socket.emit('simTweet', tweetPackage);
                            }, time);
                        }(tweetsToEmit[i], Math.abs(timeDelay), trackCounts.tracks[tweetsToEmit[i].track]);
                        subTime = tweetsToEmit[i].created;
                    }
                });

            });
        });
    });
}