var tweetService = require('../services/tweet-service'),
    async = require('async');

module.exports = function(socket, dates, originalTrackList) {
    var startTime = new Date(dates.start),
    endTime = new Date(dates.stop);

    // per-client object that keeps track counts for sim
    var trackCounts = {
        tracks: {}
    }

    for (var i = 0; i < originalTrackList.length; i++) {
        trackCounts.tracks[originalTrackList[i]] = 0;
    }

    var rate = 1

    socket.on('changespeed', function(newSpeed) {
        rate = 1 / newSpeed;
    });

    // send initial data
    socket.emit('simInit', trackCounts);
    
    function addMinute(time) {
        return new Date(time.getTime() + 60000);
    }

    tweetService.getTweets(startTime, addMinute(startTime), function (err, tweets) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        simulate(tweets, addMinute(startTime));
    });

    function simulate(tweets, startTime) {
        async.parallel([
            function (cb) {
                tweetService.getTweets(startTime , addMinute(startTime), cb);
            },
            function (cb) {
                emitTweets(tweets, cb);
            }
        ], function (err, simulateData) {
            console.log(simulateData[0].length);

            if (addMinute(startTime) < endTime) {
                setTimeout(simulate, 0, simulateData[0], addMinute(startTime));
            } else {
                emitTweets(simulateData[0], function (err) {
                    if (err) {
                        console.log(err);
                    }
                    console.log("done");
                });
            }
        });
    }

    function emitTweets(tweets, cb) {
        var previousTweetTime = 0;

        function emitTweet(tweetIndex) {
            var tweet = tweets[tweetIndex];
            
            var tweetPackage = {
                author: tweet.userName,
                created: tweet.created,
                keys: {},
                text: tweet.text,
                url: 'http://twitter.com/' + tweet.userId + '/status/' + tweet.tweetId
            }

            for (var i = 0; i < tweet.keys.length; i++) {
                var key = tweet.keys[i].track;
                tweetPackage.keys[key] = ++trackCounts.tracks[key];
            }

            socket.emit('simTweet', tweetPackage);
            lastTweetTime = tweet.created;
            tweetIndex++;

            if (tweetIndex < tweets.length) {
                setTimeout(emitTweet, rate * Math.abs(tweets[tweetIndex].created - lastTweetTime), tweetIndex);
            } else {
                cb(null);
            }  
        }

        
        if (tweets.length > 0) {
            emitTweet(0);
        } else {
            cb(null);
        }

    }

}