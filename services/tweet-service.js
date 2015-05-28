var Tweet = require('../models/tweet').Tweet;

exports.addTweet = function (tweet, next) {
    var newTweet = new Tweet({
        userName: tweet.tweetAuthor,
        text: tweet.tweetData,
        tweetId: tweet.id,
        track: tweet.incomeSelector,
        retweeted: tweet.retweeted,
        created: new Date(tweet.date),
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
            next(err, null);
        }
        next(null, tweet.created);
    })
};

exports.getTweetsForCache = function (trackValue, next) {
    Tweet.find({ track: trackValue }).sort({ 'created': -1 }).limit(10).exec(function (err, tweets) {
        if (err) {
            next(err, null);
        }
        next(null, tweets);
    });
}

exports.getTweets = function (dates, next) {
    var start = new Date(dates.start);
    var stop = new Date(dates.stop);
    Tweet.find({ 'created': { "$gte": start, "$lt": stop } }, function (err, tweets) {
        if (err) {
            next(err, null);
        }
        next(null, tweets);
    });
}