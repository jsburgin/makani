$(function () {
    var socket = io();
    var incomeSelector = 'all';
    $('.income-tweet-text').html(incomeSelector);
    var runTweetFeeder = true;
    var tweetCaches = {};

    $('.toggle-incoming-button').click(function () {
        if (runTweetFeeder) {
            runTweetFeeder = false;
            $('.toggle-incoming-button').removeClass('glyphicon-pause');
            $('.toggle-incoming-button').addClass('glyphicon-play');
        } else {
            runTweetFeeder = true;
            $('.toggle-incoming-button').removeClass('glyphicon-play');
            $('.income-tweet-container div').remove();
            for (var i = tweetCaches[incomeSelector].length - 1; i >= 0; i--) {
                $('.income-tweet-container').append(tweetCaches[incomeSelector][i]);
            }
            $('.toggle-incoming-button').addClass('glyphicon-pause');
        }
    });

    socket.on('initialData', function (data) {
        $('.track-heatmap .heat-container').html('');
        for (var key in data.tracks) {
            $('.track-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + key + '">' + key + ': ' + data.tracks[key] + '</div>');
            tweetCaches[key] = [];
        }
    });

    $('body').on('click', '.heatmap-entry', function (event) {
        incomeSelector = event.currentTarget.id;
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        for (var i = tweetCaches[event.currentTarget.id].length - 1; i >= 0; i--) {
            $('.income-tweet-container').append(tweetCaches[event.currentTarget.id][i]);
        }
    });

    socket.on('tweet', function (data) {
        var trackContainer = document.getElementById(data.key);
        if (trackContainer != null) {
            $('div#' + data.key).html(data.key + ': ' + data.newCount);
            trackContainer.classList.remove('highlight');
            trackContainer.focus();
            trackContainer.classList.add('highlight');
            if (tweetCaches[data.key].length >= 10) {
                tweetCaches[data.key].splice(0, 1);
            }
            tweetCaches[data.key].push('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        }

        var stateContainer = document.getElementsByClassName(data.key);
        if (stateContainer.length > 0) {
            stateContainer[0].classList.remove('highlight-map');
            stateContainer[0].focus();
            stateContainer[0].classList.add('highlight-map');
        }

        if (incomeSelector == 'all' && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        } else if (incomeSelector == data.key && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        }

    });

    uStates.draw("#statesvg");
    $(document).on('click', '.state', function () {
        alert('clicked');
    });
});