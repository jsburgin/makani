function gradientGenerator(data) {
    var colorValues = [
        {
            r: 255,
            g: 81,
            b: 47
        },
        {
            r: 221,
            g: 36,
            b: 118
        }
    ];
    
    if (colorValues.length == 1) {
        var trackColors = {};
        for (key in data.tracks) {
            trackColors[key] = colorValues[0];
        }
        return trackColors;
    }
    
    var colorStops = [];
    var percentageStops = [];
    
    var lastValue = colorValues[0];
    
    for (var i = 1; i < colorValues.length; i++) {
        colorStops.push([lastValue, colorValues[i]]);
        percentageStops.push(i / (colorValues.length - 1));
        lastValue = colorValues[i];
    }
    
    var tracks = [];
    for (key in data.tracks) {
        tracks.push(key);
    }
    
    var groups = [];
    for (var i = 0; i < percentageStops.length; i++) {
        groups.push([]);
    }
    
    for (var i = 0; i <= tracks.length; i++) {
        indexPercentage = (i + 1) / tracks.length;
        
        for (var j = 0; j < percentageStops.length; j++) {
            if (indexPercentage <= percentageStops[j]) {
                groups[j].push(tracks[i]);
                break;
            }
        }
    }
    
    trackColors = {};
    
    trackColors[groups[0][0]] = colorStops[0][0];
    for (var i = 0; i < groups.length; i++) {
        var start = colorStops[i][0],
            end = colorStops[i][1];
        
        var diff = {
            r: end.r - start.r,
            g: end.g - start.g,
            b: end.b - start.b
        }
        
        
        for (var j = 0; j < groups[i].length; j++) {
            if (i == 0 && j == 0) {
                continue;
            }
            
            var keyPercent = (j + 1) / groups[i].length;
            trackColors[groups[i][j]] = {
                r: Math.round(keyPercent * diff.r + start.r),
                g: Math.round(keyPercent * diff.g + start.g),
                b: Math.round(keyPercent * diff.b + start.b)
            }

        }
    }
    
    return trackColors;
}