var Tweet = require('../models/tweet').Tweet;

exports.addTweet = function (tweet, next) {
    var newTweet = new Tweet({
        userName: tweet.tweetAuthor,
        text: tweet.tweetData,
        id: tweet.id,
        track: tweet.incomeSelector,
        retweeted: tweet.retweeted,
        created: { type: Date, default: Date.now }
    });
    
    newTweet.save(function (err) {
        if (err) {
            return next(err);
        }
        
        next(null);
    });
};