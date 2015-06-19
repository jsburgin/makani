var Tweet = require('../models/tweet').Tweet;

exports.addTweet = function (tweet, next) {
    var newTweet = new Tweet({
        userName: tweet.tweetAuthor,
        text: tweet.tweetData,
        tweetId: tweet.id,
        track: tweet.incomeSelector,
        retweeted: tweet.retweeted,
        created: Date.now(),
        userId: tweet.userId
    });
    
    newTweet.save(function (err) {
        if (err) {
            return next(err);
        }
        next(null);
    });
};

exports.getFirstTweet = function (next) {
    Tweet.findOne({}).sort({ 'created': 1 }).exec(function (err, tweet) {
        if (err) {
            return next(err, null);
        }
        if (tweet != null) {
            next(null, tweet.created);
        } else {
            next(null, null);
        }
    });
};

exports.getTweetsForCache = function (trackValue, next) {
    Tweet.find({ track: trackValue }).sort({ 'created': -1 }).limit(10).exec(function (err, tweets) {
        if (err) {
            next(err, null);
        }
        next(null, tweets);
    });
};

exports.getTweets = function (start, stop, next) {
    console.log();
    console.log('Start:' + start);
    console.log('Stop:' + stop);
    console.log();
    Tweet.find({ 'created': { "$gte": start, "$lt": stop } }, function (err, tweets) {
        if (err) {
            console.log(err);
        }
        next(tweets);
    });
};

exports.removeAllTweets = function (next) {
    Tweet.find({}).remove().exec(function (err) {
        if (err) {
            return next(err);
        }
        next(null);
    });
}