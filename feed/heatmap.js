var countyData = {}
var counties = ['shelby', 'clay', 'chalkville'];

exports.processTweet = function (io, tweet) {

    for (var i = 0; i < counties.length; i++) {
        if (tweet.indexOf(counties[i]) != -1) {

            for (var j = 0; j < tweet.keys; j++) {
                if (tweet.keys[j] != counties[i]) {
                    countyData[counties[i]][tweet.keys[j]]++;
                    io.emit('county', counties[i],countyData[counties[i]][tweet.keys[j]]);
                } 
            }

        }
    }

}