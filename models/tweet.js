﻿var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var tweetService = require('../services/tweet-service.js');

var tweetSchema = new Schema({
    userName: { type: String },
    text: { type: String },
    tweetId: { type: Number },
    retweeted: { type: Boolean },
    track: { type: String },
    created: { type: Date, default: Date.now, index: true },
    userId: { type: Number }
});

var Tweet = mongoose.model('Tweet', tweetSchema);

module.exports = {
    Tweet: Tweet
};