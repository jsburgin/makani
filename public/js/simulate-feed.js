$(function () {
    var socket = io();
    var incomingSelector = 'all';
    $('.income-tweet-text').html(incomingSelector);
    var runTweetFeeder = true;

    $('.sim').hide();

    $('.speed button').click(function() {
        socket.emit('changespeed', $(this).attr('speed-value'));
    });
    
    $('.simulate-form').submit(function () {
        $('.sim-form').hide();
        $('.sim').show();
        var startDate = new Date($('.start-date').val());
        var startTime = $('.start-time').val();
        startDate.setHours(startTime.substring(0, 2), startTime.substring(3, 5));
        
        var stopDate = new Date($('.stop-date').val());
        var stopTime = $('.stop-time').val();
        stopDate.setHours(stopTime.substring(0, 2), stopTime.substring(3, 5));
        
        var dates = {
            start: startDate,
            stop: stopDate
        }
        socket.emit('runSimulation', dates);
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
            $('.makani-track-tickers').append('<div class="small-12 medium-8 large-4 columns track-ticker-listing" id="' + key + '" track-count="' + data.tracks[key] + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.tracks[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</div>');
        }
        uStates.draw("#statesvg");
    });

    $('body').on('click', '.heatmap-entry', function (event) {
        incomingSelector = event.currentTarget.id;
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        //socket.emit('getcache', event.currentTarget.id);
    });

    $('body').on('click', '.state', function (event) {
        event.preventDefault();
        var state = event.target.getAttribute('state-name');
        incomingSelector = state;
        $('.income-tweet-text').html(state);
        $('.income-tweet-container div').remove();
        //socket.emit('getcache', state);
    });

    socket.on('simTweet', function (data) {
        for (key in data.keys) {
            var trackContainer = document.getElementById(key);
            if (trackContainer != null) {
                trackContainer.innerHTML = '<span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.keys[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                trackContainer.setAttribute('track-count', data.keys[key]);
                trackContainer.classList.remove('highlight');
                trackContainer.focus();
                trackContainer.classList.add('highlight');
            

                function sortTracks(selectedTrackCount, container, trackContainer) {
                    var trackList = $(container).find('div');
                    for (var i = 0; i < trackList.length; i++) {
                        if (trackList[i] == trackContainer) {
                            break;
                        }
                        if (selectedTrackCount > Number($(trackList[i]).attr('track-count'))) {
                            var temp = $(trackContainer);
                            $(trackContainer).remove();
                            $(trackList[i]).before(temp);
                        }
                    }
                }

                sortTracks(Number(trackContainer.getAttribute('track-count')), '.track-heatmap .heat-container', trackContainer);
            }

            var stateContainer = document.getElementsByClassName(key)[0];
            if (stateContainer != undefined) {
                stateContainer.classList.remove('highlight-map');
                stateContainer.focus();
                stateContainer.classList.add('highlight-map');
            } 
        }

        var date = new Date(data.created);
        $('.time-box p').html(date);


        if ((incomingSelector == 'all' || incomingSelector in data.keys) && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
        }

    });
});