// JavaScript source code

exports.generateGradientArray = function (data, colors, next) {

    var dataColorPairs = {};
    if (colors.length == 1) {
        for (var i = 0; i < data.length; i++) {
            dataColorPairs[data[i]] = colors[0];
        }
        return next(null, dataColorPairs);
    } else if (colors.length < 1 || colors.length > data.length) {
        return next("Not enough or too many colors passed for data.");
    } else if (colors.length == data.length) {
        for (var i = 0; i < colors.length; i++) {
            dataColorPairs[data[i]] = colors[i];
        }
        return next(null, dataColorPairs);
    }

    var colorNodes = [],
        percentageNodes = [];

    var lastValue = colors[0];

    for (var i = 1; i < colors.length; i++) {
        colorNodes.push([lastValue, colors[i]]);
        percentageNodes.push(i / (colors.length - 1));
        lastValue = colors[i];
    }

    console.log(colorNodes);
    console.log(percentageNodes);

    var dataGroups = [];
    for (var i = 0; i < percentageNodes.length; i++) {
        dataGroups.push([]);
    }

    for (var i = 0; i <= data.length; i++) {
        indexPercentage = (i + 1) / data.length;

        for (var j = 0; j < percentageNodes.length; j++) {
            if (indexPercentage <= percentageNodes[j]) {
                dataGroups[j].push(data[i]);
                break;
            }
        }
    }

    console.log(dataGroups);

    dataColorPairs[dataGroups[0][0]] = colorNodes[0][0];
    for (var i = 0; i < dataGroups.length; i++) {
        var start = colorNodes[i][0],
            end = colorNodes[i][1];

        var colorDiff = { r: end.r - start.r, g: end.g - start.g, b: end.b - start.b };

        for (var j = 0; j < dataGroups[i].length; j++) {
            if (i == 0 && j == 0) {
                continue;
            }

            var keyPercent = (j + 1) / dataGroups[i].length;
            dataColorPairs[dataGroups[i][j]] = {
                r: Math.round(keyPercent * colorDiff.r + start.r),
                g: Math.round(keyPercent * colorDiff.g + start.g),
                b: Math.round(keyPercent * colorDiff.b + start.b)
            }
        }
    }

    return next(null, dataColorPairs);
}