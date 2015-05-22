var Count = require('../models/count').Count;

exports.updateCount = function (trackValue, next) {
    Count.findOne({ track: trackValue }, function (err, count) {
        var newValue = ++count.value;
        count.value = newValue;
        count.save(function (err) {
            if (err) {
                next(err);
            }
            next(null);
        });
    });
};

exports.getCountsOfType = function (typeValue, next) {
    var types = [];
    for (var i = 0; i < typeValue.length; i++) {
        types.push({ type: typeValue[i] });
    }
    Count.find({ $or: types }).sort({ value: 'desc' }).exec(function (err, counts) {
        if (err) {
            next(err, null);
        }
        next(null, counts);
    });
}

exports.addCount = function (trackValue, next) {
    var newCount = new Count({
        track: trackValue.track,
        value: 0,
        type: trackValue.type
    });
    
    newCount.save(function (err) {
        if (err) {
            next(err);
        }
        next(null);
    });
};