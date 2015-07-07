$(function () {
    var socket = io();
    var incomingSelector = 'all';
    var inCounty = false;
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
            $('.track-heatmap .heat-container').append('<div class="col-md-2 heatmap-entry" id="' + key + '">' + key + ': ' + data.tracks[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</div>');
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

        $('#statesvg').remove();
        drawStateMap(state);
        inCounty = true;
        $('.us-map').prepend('<p class="county-name"></p>');
        $('.us-map').prepend('<a class="revert-map" href="">< Return to Full Map</a>');  
    });
    
    $('body').on({
        mouseenter: function () {
            if (inCounty) {
                var name = $(this).attr('id');
                $('.county-name').html(name);
            }
        },
        mouseleave: function () {
            if (inCounty) {
                $('.county-name').html('');
            }
        }
    }, 'path');
    
    var stateData = {
        'alabama': {
            scale: 5900,
            translate: [-340, -375],
            rotate: "rotate(5.35)"
        },
        'arkansas': {
            scale: 7500,
            translate: [40, -270],
            rotate: "rotate(2.0)"
        },
        'california': {
            scale: 3000,
            translate: [1340, 430],
            rotate: "rotate(-15.6)"
        },
        'florida': {
            scale: 4300,
            translate: [-350, -560],
            rotate: "rotate(6)"
        },
        'georgia': {
            scale: 6100,
            translate: [-650, -365],
            rotate: "rotate(6.4)"
        },
        'hawaii': {
            scale: 7000,
            translate: [6860, 560],
            rotate: "rotate(-45)"
        },
        'mississippi': {
            scale: 5800,
            translate: [-80, -380],
            rotate: "rotate(4.4)"
        },
        'louisiana': {
            scale: 6700,
            translate: [10, -650],
            rotate: "rotate(2)"
        },
        'south-carolina': {
            scale: 9000,
            translate: [-1520, -390],
            rotate: "rotate(0)"
        },
        'tennessee': {
            scale: 7300,
            translate: [-580, -100],
            rotate: "rotate(4.9)"
        },
        'texas': {
            scale: 2600,
            translate: [570, -60],
            rotate: "rotate(-3.0)"
        }
    }
    
    function drawStateMap(state) {
        state = state.replace(/\s+/g, '-').toLowerCase();
        var temp = d3.select('.us-map').style('width');
        var width = parseInt(temp.substring(0, temp.length - 2));
        var height = width * .55;
        
        var data = {
            name: state,
            fileName: state + '-simple.json',
            scale: stateData[state].scale,
            translate: stateData[state].translate,
            rotate: stateData[state].rotate
        }

        var projection = d3.geo.albers()
			.scale(data.scale)
			.translate(data.translate);
        
        var path = d3.geo.path()
			.projection(projection);
        var svg = d3.select(".us-map").append("svg")
			.attr("width", width)
			.attr("height", height)
			.classed("county-heatmap", true);
        
        var g = svg.append("g");
        
        var zoom = d3.behavior.zoom()
			.on("zoom", function () {
            g.attr("transform", "translate(" + d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");
            console.log()
        });
        
        svg.call(zoom);
        
        d3.json("/js/" + data.fileName, function (error, topology) {
            if (error) {
                throw error;
            }
            
            g.selectAll("path")
				.data(topojson.feature(topology, topology.objects[data.name]).features)
				.enter().append("path")
                .attr("d", path)
                .attr("id", function (d) {
                return d.properties.NAME;
            })
				.attr("transform", function (d) {
                return data.rotate;
            });
        });
    }
    
    socket.on('receivecache', function (cache) {
        for (var i = 0; i < cache.length; i++) {
            var data = cache[i];
            $('.income-tweet-container').prepend('<div><a target="_blank" href="' + data.url + '">@' + data.author + ': ' + data.text + '</a></div>');
        }
    });

    socket.on('tweet', function (data) {
        for (key in data.keys) {
            var trackContainer = document.getElementById(key);
            if (trackContainer != null) {
                $('div#' + key).html(key + ': ' + data.keys[key].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                trackContainer.classList.remove('highlight');
                trackContainer.focus();
                trackContainer.classList.add('highlight');
            }
            var stateContainer = document.getElementsByClassName(key)[0];
            if (stateContainer != undefined) {
                stateContainer.classList.remove('highlight-map');
                stateContainer.focus();
                stateContainer.classList.add('highlight-map');
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