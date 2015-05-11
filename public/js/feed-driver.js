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
        console.log(event.currentTarget.id);
        $('.income-tweet-text').html(event.target.id);
        $('.income-tweet-container div').remove();
        for (var i = tweetCaches[event.currentTarget.id].length - 1; i >= 0; i--) {
            $('.income-tweet-container').append(tweetCaches[event.currentTarget.id][i]);
        }
    });

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
        
        var graphData = [];
        var filterElement = 0;
        $('.track-heatmap .heat-container div').each(function (index, element) {
            var data = $(element).html();
            var trackString = data.substring(0, data.indexOf(':'));
            data = data.substring(data.indexOf(':') + 2, data.length);
            data = Number(data);
            if (!isNaN(data) && data > filterElement) {
                graphData.push({track: trackString, value: data});
            }
            if (filterElement == 0) {
                filterElement = data * .08;
            }
        });
        
        if (graphData.length > 1) {
            $('.filter-chart').html('');
            var width = $('.track-heatmap').width(),
                barHeight = 22;

            var x = d3.scale.linear().domain([0, d3.max(graphData, function(d) {return d.value}) ]).range([0, width]);
            var chart = d3.select('.filter-chart').attr('width', width).attr('height', barHeight * graphData.length);
            var bar = chart.selectAll('g').data(graphData).enter().append('g').attr('transform', function (d, i) {
                return "translate(0," + i * barHeight + ")";
            });

            bar.append('rect').attr("width", function (d) { return x(d.value) }).attr('height', barHeight - 1);
            bar.append("text").attr("x", function (d) { return x(d.value) - 3; }).attr("y", barHeight / 2).attr("dy", ".35em").text(function (d) { return d.track + " " + d.value; });
        } 
    });

    $('.update-track-button').click(function () {
        var newTrack = $('.new-track').val();
        socket.emit('updatestream', newTrack);
        $('.new-track').val('');
        $('.filter-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + newTrack + '">' + newTrack + ': ' + '0</div>');
        tweetCaches[newTrack] = [];
    });
});