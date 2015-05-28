var tweets = [
    {
        text: 'This is the first tweet',
        date: new Date(2015, 4, 12, 2, 22, 0)
    },
    {
        text: 'This is the second tweet',
        date: new Date(2015, 4, 12, 2, 22, 15)
    },
    {
        text: 'This is the third tweet',
        date: new Date(2015, 4, 12, 2, 22, 30)
    }
]

var subTime = tweets[0].date;
var timeInterval = 0;

for (var i = 0; i < tweets.length; i++) {
    timeInterval = tweets[i].date - subTime + timeInterval;
    !function (tweet, time) {
        window.setTimeout(function () {
            console.log(tweet.text);
        }, time);
    }(tweets[i], Math.abs(timeInterval));
    subTime = tweets[i].date;
}