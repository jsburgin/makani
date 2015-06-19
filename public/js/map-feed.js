$(function () {
    var socket = io();
    var incomingSelector = 'all';
    $('.income-tweet-text').html(incomingSelector);
    var runTweetFeeder = true;

    $('.toggle-incoming-button').click(function () {
        if (runTweetFeeder) {
            runTweetFeeder = false;
            $('.toggle-incoming-button').removeClass('glyphicon-pause');
            $('.toggle-incoming-button').addClass('glyphicon-play');
        } else {
            runTweetFeeder = true;
            $('.toggle-incoming-button').removeClass('glyphicon-play');
            $('.income-tweet-container div').remove();
            socket.emit('getcache', incomingSelector);
            $('.toggle-incoming-button').addClass('glyphicon-pause');
        }
    });

    socket.on('initialData', function (data) {
        $('.track-heatmap .heat-container').html('');
        for (var key in data.tracks) {
            $('.track-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + key + '">' + key + ': ' + data.tracks[key] + '</div>');
        }
    });

    $('body').on('click', '.heatmap-entry', function (event) {
        incomingSelector = event.currentTarget.id;
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        socket.emit('getcache', event.currentTarget.id);
    });
    
    $('body').on('click', '.state', function (event) {
        event.preventDefault();
        var state = event.target.getAttribute('state-name');
        incomingSelector = state;
        $('.income-tweet-text').html(state);
        $('.income-tweet-container div').remove();
        socket.emit('getcache', state);
    });
    
    socket.on('receivecache', function (cache) {
        for (var i = 0; i < cache.length; i++) {
            var data = cache[i];
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        }
    });

    socket.on('tweet', function (data) {
        var trackContainer = document.getElementById(data.key);
        if (trackContainer != null) {
            $('div#' + data.key).html(data.key + ': ' + data.newCount);
            trackContainer.classList.remove('highlight');
            trackContainer.focus();
            trackContainer.classList.add('highlight');
        }

        var stateContainer = document.getElementsByClassName(data.key);
        console.log(data.key);
        if (stateContainer.length > 0) {
            stateContainer[0].classList.remove('highlight-map');
            stateContainer[0].focus();
            stateContainer[0].classList.add('highlight-map');
        }

        if (incomingSelector == 'all' && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        } else if (incomingSelector == data.key && runTweetFeeder) {
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