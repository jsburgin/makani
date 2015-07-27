$(function () {
    var socket = io();
    var incomingSelector = 'all';
    $('.income-tweet-text').html(incomingSelector);
    var runTweetFeeder = true;
    var removeFilter = false;
    var userIdent = $('.user-info').html();
    var colors = null;
    $('.user-info').remove();
    
    
    function getTrackStatistics() {
        socket.emit('getTpm', incomingSelector);

        if (incomingSelector != 'all') {
            socket.emit('getPercentageValues', incomingSelector);
        } else {
            updateTweetPercentages(1, 1);
        }

        setTimeout(getTrackStatistics, 10000);
    }
    
    getTrackStatistics();
    
    function updateTweetsPerMinute(tpmValue, track) {
        var total = 0;
        
        for (var i = 0; i < tpmValue.length - 1; i++) {
            total += tpmValue[i].number;
        }
        
        if (tpmValue.length > 0) {
            var tpm = Math.round(total / (tpmValue.length - 1));
            
            if (incomingSelector == track) {
                $('#tpm').html(tpm);

                if (incomingSelector == 'all') {
                    $('#tpm-text').html('tweets per minute');
                } else {
                    $('#tpm-text').html(track + ' tweets per minute');
                }
                
            }

        }

    }
    
    function updateTweetPercentages(trackValue, totalValue) {
        var percentage = trackValue / totalValue * 100;
        $('#percentage').html(percentage.toFixed(2) + '%');
    }
    
    socket.on('tpm', updateTweetsPerMinute);
    socket.on('updatePercentages', updateTweetPercentages);

    socket.emit('connected', userIdent);

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
            $('.makani-track-tickers').append('<div class="small-12 medium-8 large-4 columns track-ticker-listing" id="' + key + '" track-count="' + data.tracks[key] + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.tracks[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</div>');
        }
        colors = gradientGenerator(data);
    });
    
    $('body').on('click', '.remove-filter', function () {
        var toRemove = $(this).parent(),
            filter = toRemove.attr('id');
        $(toRemove).remove();
        var filterPackage = {
            track: filterPackage,
            userID: userIdent 
        }
        socket.emit('removesinglefilter', filter);
        removeFilter = true;
    });

    $('body').on('click', '.track-ticker-listing', function (event) {
        // check to see if element has been removed
        if (!removeFilter) {
            $('#' + incomingSelector).css('text-decoration', 'none');
            if (incomingSelector == event.currentTarget.id) {
                incomingSelector = 'all';
                $('.income-tweet-text').html(incomingSelector);
                $('.income-tweet-container div').remove();
                updateTweetPercentages(1, 1);
            } else {
                incomingSelector = event.currentTarget.id;
                $('#' + event.currentTarget.id).css('text-decoration', 'underline');
                $('.income-tweet-text').html(event.target.id);
                $('.income-tweet-container div').remove();
                socket.emit('getcache', event.currentTarget.id);
                socket.emit('getPercentageValues', incomingSelector);
            }
            socket.emit('getTpm', incomingSelector);
             
        }
        removeFilter = false;
    });
    
    $('.reset-tracks').click(function() {
        if (incomingSelector != 'all') {
            incomingSelector = 'all';
            $('.income-tweet-text').html(incomingSelector);
            $('.income-tweet-container div').remove();   
        } 
    });

    socket.on('receivecache', function (cache) {
        for (var i = 0; i < cache.length; i++) {
            var data = cache[i];
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
        }
    });

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

    socket.on('tweet', function (data) {
        for (key in data.keys) {
            var trackContainer = document.getElementById(key);
            if (trackContainer != null) {
                trackContainer.innerHTML = '<span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.keys[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                trackContainer.setAttribute('track-count', data.keys[key]);
                trackContainer.style.background = 'rgb(' + colors[key].r + ',' + colors[key].g + ',' + colors[key].b + ')';
                window.setTimeout(function (trackContainer) {
                    trackContainer.style.background = 'rgb(50, 53, 64)';
                }, 250, trackContainer);
  
                if ($('.track-heatmap .heat-container').find(trackContainer).length) {
                    sortTracks(Number(trackContainer.getAttribute('track-count')), '.track-heatmap .heat-container', trackContainer);
                } else {
                    sortTracks(Number(trackContainer.getAttribute('track-count')), '.filter-heatmap .heat-container', trackContainer);
                }
            }
        }
        
        if ((incomingSelector == 'all' || incomingSelector in data.keys) && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div class="printed-tweet"><a target="_blank" href="' + data.url + '"><span class="tweet-author">@' + data.author + '</span>: ' + data.text + '</a></div>');
        }
        
    });

    $('.add-filter').submit(function () {
        var newTrack = $('.new-track').val();
        //console.log(userIdent);
        $('.new-track').val('');
        var filterData = {
            track: newTrack,
            userID: userIdent
        };
        console.log(filterData.userID);
        socket.emit('addfilter', filterData);
        return false;
    });

    socket.on('filtercount', function (filterPackage) {
        var filterList = $('.filter-heatmap .heat-container').find('div'),
            inserted = false,
            filterElement = '<div class="col-md-2 heatmap-entry" id="' + filterPackage.filter + '" track-count="' + filterPackage.count + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + filterPackage.filter + ': ' + filterPackage.count + '</div>';
        for (var i = 0; i < filterList.length; i++) {
            if (filterPackage.count > Number($(filterList[i]).attr('track-count'))) {
                $(filterList[i]).before(filterElement);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            $('.filter-heatmap .heat-container').append(filterElement);
        }
    });
});