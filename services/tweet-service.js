var Tweet = require('../models/tweet').Tweet;

exports.addTweet = function (tweet, next) {
    var newTweet = new Tweet({
        userName: tweet.author,
        text: tweet.text,
        tweetId: tweet.tweetId,
        userId: tweet.userId,
        keys: [],
        retweeted: tweet.retweeted,
        created: Date.now()
    });

    for (key in tweet.keys) {
        newTweet.keys.push({track: key});
    }
    
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
    Tweet.find({ 'created': { "$gte": start, "$lt": stop } }, function (err, tweets) {
        if (err) {
            return next(err, null);
        }
        next(null, tweets);
    });
};

exports.removeAllTweets = function (next) {
    Tweet.find({}).remove().exec(function (err) {
        if (err) {
            return next(err);
        }
        next(null);
    });
};