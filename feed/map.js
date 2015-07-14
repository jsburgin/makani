module.exports = function (io, tweet) {
    var locationPackage = {
        keys: [],
        geo: tweet.geo
    };
    
    for (key in tweet.keys) {
        locationPackage.keys.push(key);
    }

    console.log(locationPackage);
};