var tweetService = require('../services/tweet-service'),
	userService = require('../services/user-service'),
	countService = require('../services/count-service');
module.exports = function(stream) {
	process.stdin.on('data', function (text) {
        if (text.indexOf('clear track counts') != -1 || text.indexOf('delete all tweets') != -1) {
            console.log('\nReseting all track counts...');
            stream.stop();
            countService.reset(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('All track counts reset.\n');
                }
            });
            console.log('Removing all tweet data...\n');
            tweetService.removeAllTweets(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('All tweets removed.\n');
                }
            });
        } else if (text.indexOf('start stream') != -1) {
            stream.start();
            console.log('\n');
        } else if (text.indexOf('stop stream') != -1) {
            stream.stop();
            console.log('\n');
        } else if (text.indexOf('remove user ') != -1) {
            var email = text.substring(12, text.length - 2);
            console.log('\nWorking to delete user with email: ' + email);
            userService.removeUser(email, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('User removed successfully.\n');
                }
            });
        } else if (text.indexOf('exit') != -1) {
            process.exit();
        }
    });
}