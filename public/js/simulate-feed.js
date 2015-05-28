$(function () {
    var socket = io();
    var incomingSelector = 'all';
    $('.income-tweet-text').html(incomingSelector);
    var runTweetFeeder = true;

    //socket.emit('runningSim', null);

    $('.sim').hide();
    
    $('.simulate-form').submit(function () {
        $('.sim-form').hide();
        $('.sim').show();
        var startDate = new Date($('.start-date').val());
        var startTime = $('.start-time').val();
        startDate.setHours(startTime.substring(0, 2), startTime.substring(3, 5));
        
        var stopDate = new Date($('.stop-date').val());
        var stopTime = $('.stop-time').val();
        stopDate.setHours(stopTime.substring(0, 2), stopTime.substring(3, 5));
        
        var startPackage = {
            start: startDate,
            stop: stopDate
        }
        socket.emit('runningSim', startPackage);
        return false;
    });

    socket.on('startsim', function (startTime) {
        var date = new Date(startTime);
        var hours = date.getHours();
        if (hours < 10) {
            hours = '0' + hours;
        }
        var minutes = date.getMinutes();
        if (minutes < 10) {
            mintues = '0' + minutes;
        }
        $('.start-date').val(date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear());
        $('.start-time').val(hours + ':' + minutes);
    });

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

    socket.on('simInit', function (data) {
        $('.track-heatmap .heat-container').html('');
        for (var key in data.tracks) {
            $('.track-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + key + '">' + key + ': ' + 0 + '</div>');
        }
    });

    $('body').on('click', '.heatmap-entry', function (event) {
        incomingSelector = event.currentTarget.id;
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        //socket.emit('getcache', event.currentTarget.id);
    });

    socket.on('simTweet', function (data) {
        var trackContainer = document.getElementById(data.key);
        if (trackContainer != null) {
            $('div#' + data.key).html(data.key + ': ' + data.newCount);
            trackContainer.classList.remove('highlight');
            trackContainer.focus();
            trackContainer.classList.add('highlight');
        }

        var date = new Date(data.created);
        $('.time-box p').html(date);


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
});