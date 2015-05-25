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
            $('.track-heatmap .heat-container').append('<div class="col-xs-6 col-sm-4 col-md-2 heatmap-entry" id="' + key + '" track-count="' + data.tracks[key] + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + key + ': ' + data.tracks[key] + '</div>');
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
            incomingSelector = event.currentTarget.id;
            $('.income-tweet-text').html(event.target.id);
            $('.income-tweet-container div').remove();
            socket.emit('getcache', event.currentTarget.id);
        }
        removeFilter = false;
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
            trackContainer.innerHTML = '<span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + data.key + ': ' + data.newCount;
            trackContainer.setAttribute('track-count', data.newCount);
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
            
            if ($('.track-heatmap .heat-container').find(trackContainer).length) {
                sortTracks(Number(trackContainer.getAttribute('track-count')), '.track-heatmap .heat-container', trackContainer);
            } else {
                sortTracks(Number(trackContainer.getAttribute('track-count')), '.filter-heatmap .heat-container', trackContainer);
            }
            
        }
        
        if ((incomingSelector == 'all' || incomingSelector == data.key) && runTweetFeeder) {
            var totalTweets = $('.income-tweet-container div').length;
            if (totalTweets >= 10) {
                $('.income-tweet-container div:last-child').remove();
            };
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.tweetURL + '">@' + data.tweetAuthor + ': ' + data.tweetData + '</a></div>');
        }
        
        function graphData(containerString, chartString) {
            var allGraphData = [];
            $(containerString).each(function (index, element) {
                var data = $(element).html();
                var trackString = data.substring(70, data.indexOf(':'));
                data = data.substring(data.indexOf(':') + 2, data.length);
                data = Number(data);
                if (!isNaN(data)) {
                    allGraphData.push({ track: trackString, value: data });
                }
            });

            var filterElement = d3.max(allGraphData, function (d) { return d.value }) * .14;
            var graphData = [];
            if (!isNaN(filterElement)) {
                for (var i = 0; i < allGraphData.length; i++) {
                    if (allGraphData[i].value > filterElement) {
                        graphData.push(allGraphData[i]);
                    }
                }
            }
            $(chartString).html('');
            if (graphData.length > 1) {
                $(chartString).css('display', 'block');
                var width = $('.track-heatmap').width(),
                    barHeight = 22;
                
                var x = d3.scale.linear().domain([0, d3.max(graphData, function (d) { return d.value })]).range([0, width]);
                var chart = d3.select(chartString).attr('width', width).attr('height', barHeight * graphData.length);
                var bar = chart.selectAll('g').data(graphData).enter().append('g').attr('transform', function (d, i) {
                    return "translate(0," + i * barHeight + ")";
                });
                
                bar.append('rect').attr("width", function (d) { return x(d.value) }).attr('height', barHeight - 1);
                bar.append("text").attr("x", function (d) { return x(d.value) - 3; }).attr("y", barHeight / 2).attr("dy", ".35em").text(function (d) { return d.track + " " + d.value; });
            } else {
                $(chartString).css('display', 'none');
            }
        }
        
        graphData('.track-heatmap .heat-container div', '.track-chart');
        graphData('.filter-heatmap .heat-container div', '.filter-chart');
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
        $('.filter-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + filterPackage.filter + '" track-count="' + filterPackage.count + '"><span class="remove-filter glyphicon glyphicon-remove-circle"></span> ' + filterPackage.filter + ': ' + filterPackage.count + '</div>');
    });
});