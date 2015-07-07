$(function () {
    var socket = io();
    var incomingSelector = 'all';
    $('.income-tweet-text').html(incomingSelector);
    var runTweetFeeder = true;
    var removeFilter = false;
    var userIdent = $('.user-info').html();
    $('.user-info').remove();
    
    
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
            $('.track-heatmap .heat-container').append('<div class="col-xs-6 col-sm-4 col-md-2 heatmap-entry" id="' + key + '" track-count="' + data.tracks[key] + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.tracks[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</div>');
        }
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

    $('body').on('click', '.heatmap-entry', function (event) {
        // check to see if element has been removed
        if(!removeFilter) {
            $('#' + incomingSelector).css('text-decoration', 'none');
            if (incomingSelector == event.currentTarget.id) {
                incomingSelector = 'all';
                $('.income-tweet-text').html(incomingSelector);
                $('.income-tweet-container div').remove();
            } else {
                incomingSelector = event.currentTarget.id;
                $('#' + event.currentTarget.id).css('text-decoration', 'underline');
                $('.income-tweet-text').html(event.target.id);
                $('.income-tweet-container div').remove();
                socket.emit('getcache', event.currentTarget.id);
            } 
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
                trackContainer.classList.remove('highlight');
                trackContainer.focus();
                trackContainer.classList.add('highlight');
  
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
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
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