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
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
        }
    });

    socket.on('tweet', function (data) {
        console.log(data.keys);
        for (key in data.keys) {
            var trackContainer = document.getElementById(key);
            if (trackContainer != null) {
                $('div#' + key).html(key + ': ' + data.keys[key]);
                trackContainer.classList.remove('highlight');
                trackContainer.focus();
                trackContainer.classList.add('highlight');
            }
            //console.log(key);
            var stateContainer = document.getElementsByClassName(key);
            if (stateContainer.length > 0) {
                stateContainer[0].classList.remove('highlight-map');
                stateContainer[0].focus();
                stateContainer[0].classList.add('highlight-map');
            }   
        }
        

        if ((incomingSelector == 'all' || incomingSelector in data.keys) && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
        }

    });

    uStates.draw("#statesvg");
    $(document).on('click', '.state', function () {
        alert('clicked');
    });

    
});