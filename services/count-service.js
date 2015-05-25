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

exports.getCountsOfType = function (typeList, next) {
    var types = [];
    for (var i = 0; i < typeList.length; i++) {
        types.push({ type: typeList[i] });
    }
    Count.find({ $or: types }).sort({ value: 'desc' }).exec(function (err, counts) {
        if (err) {
            next(err, null);
        }
        next(null, counts);
    });
};

exports.getCount = function (trackValue, next) {
    Count.findOne({ track: trackValue }, function (err, count) {
        if (err) {
            next(err, null, null);
        }
        next(null, trackValue, count.value);
    });
}

exports.addCount = function (trackValue, next) { 
    Count.findOne({ track: trackValue.track }, function (err, count) {
        if (count == null) {
            var newCount = new Count({
                track: trackValue.track,
                value: 0,
                type: trackValue.type,
                users: 1
            });
            
            newCount.save(function (err) {
                if (err) {
                    next(err);
                }
                next(null);
            });
        } else {
            count.users++;
            count.save(function (err) {
                if (err) {
                    next(err);
                }
                next(null);
            })
        }
    });  
};

exports.removeCount = function (trackValue, next) {
    // null and beautiful
};