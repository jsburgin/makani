$(function () {
    var socket = io();
    var incomeSelector = 'all';
    $('.income-tweet-text').html(incomeSelector);
    var runTweetFeeder = true;
    var tweetCaches = {};

    // stops incoming tweets from being displayed
    $('.toggle-incoming-button').click(function () {
        if (runTweetFeeder) {
            runTweetFeeder = false;
            $('.toggle-incoming-button').removeClass('glyphicon-pause');
            $('.toggle-incoming-button').addClass('glyphicon-play');
        } else {
            runTweetFeeder = true;
            $('.toggle-incoming-button').removeClass('glyphicon-play');
            $('.toggle-incoming-button').addClass('glyphicon-pause');
        };
    });

    // intializes track list in heatmap
    socket.on('initialData', function (data) {
        $('.track-heatmap .row').html('');
        for (var key in data.tracks) {
            $('.track-heatmap .row').append('<div class="col-md-2 heatmap-entry" id="' + key + '">' + key + ': ' + data.tracks[key] + '</div>');
            tweetCaches[key] = [];
        };
    });

    // chanages what tweets to display in incoming tweets section
    $('body').on('click', '.heatmap-entry', function (event) {
        incomeSelector = event.currentTarget.id;
        console.log(event.currentTarget.id);
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        for (var i = tweetCaches[event.currentTarget.id].length; i > 0; i--) {
            $('.income-tweet-container').append(tweetCaches[event.currentTarget.id][i]);
        }
    });

    // updates heatmap and displays new tweets in incoming tweets section
    socket.on('data', function (data) {
        var trackContainer = document.getElementById(data.key);
        $('div#' + data.key).html(data.key + ': ' + data.newCount);
        trackContainer.classList.remove('highlight');
        trackContainer.focus();
        trackContainer.classList.add('highlight');
        if (incomeSelector == 'all' && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div>' + data.tweetData + '</div>');
        } else if (incomeSelector == data.key && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div>@' + data.tweetAuthor + ': ' + data.tweetData + '</div>');
        }
        if (tweetCaches[data.key].length >= 10) {
            tweetCaches[data.key].splice(0, 1);
        }
        tweetCaches[data.key].push('<div>@' + data.tweetAuthor + ': ' + data.tweetData + '</div>');
        for (var i = 0; i < 4; i++) {
            var text = $('.progress-bar').eq(i).attr('percentvalue');
            $('.progress-bar').eq(i).html(text + ' ' + data.highKeys[text.toLowerCase()] + '%');
            $('.progress-bar').eq(i).css('width', data.highKeys[text.toLowerCase()] + '%');
        }
    });

    // adds additional filters to track
    $('.update-track-button').click(function () {
        var newTrack = $('.new-track').val();
        socket.emit('updatestream', newTrack);
        $('.new-track').val('');
        $('.filter-heatmap .row').append('<div class="col-md-2 heatmap-entry" id="' + newTrack + '">' + newTrack + ': ' + '--</div>');
        tweetCaches[newTrack] = [];
    });
});