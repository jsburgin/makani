var tweetService = require('../services/tweet-service');

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

    // send initial data
    socket.emit('simInit', trackCounts);

    // once initial tweets are grabbed call getData to emit current data and query for next minute
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
                    text: data[tweetCount].text,
                    author: data[tweetCount].userName,
                    created: data[tweetCount].created,
                    url: 'http://twitter.com/' + data[tweetCount].userId + '/status/' + data[tweetCount].tweetId
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
        
        function getData(currentMinute, tweetsToEmit) {
            function finishedSendingToClient(obj) {
                if (currentMinute < endTime) {
                    if (obj.data.length == 0 && !runWithNoData) {
                        setTimeout(finishedSendingToClient, 0, obj);
                    } else {
                        runWithNoData = false;
                        setTimeout(getData, 0, new Date(currentMinute.getTime() + 60000), obj.data);
                    }
                }
            }

            var nextTweetSet = {
                data: []
            };

            tweetService.getTweets(currentMinute, new Date(currentMinute.getTime() + 60000), function (tweets) {
                if (tweets.length == 0) {
                    runWithNoData = true;
                }
                nextTweetSet.data = tweets;
            });

            setTimeout(sendData, 0, tweetsToEmit, finishedSendingToClient, nextTweetSet);
        }

        getData(new Date(startTime.getTime() + 60000), initialData);
    });
}