var Count = require('../models/count').Count;

exports.updateCount = function (trackValue, next) {
    Count.findOne({ track: trackValue }, function (err, count) {
        var newValue = ++count.value;
        count.value = newValue;
        count.save(function (err) {
            if (err) {
                return next(err);
            }
            next(null);
        });
    });
};

exports.reset = function (next) {
    Count.find({}, function (err, counts) {
        if (err) {
            return next(err);
        }
        for (var i = 0; i < counts.length; i++) {
            counts[i].value = 0;
            counts[i].save();
        }
        next(null);
    });
};

exports.getCountsOfType = function (typeList, next) {
    var types = [];
    for (var i = 0; i < typeList.length; i++) {
        types.push({ type: typeList[i] });
    }
    Count.find({ $or: types }).sort({ value: 'desc' }).exec(function (err, counts) {
        if (err) {
            return next(err, null);
        }
        next(null, counts);
    });
};

exports.getCount = function (trackValue, next) {
    Count.findOne({ track: trackValue }, function (err, count) {
        if (err) {
            return next(err, null, null);
        }
        next(null, trackValue, count.value);
    });
};

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
                    return next(err);
                }
                next(null);
            });
        } else {
            count.users++;
            count.save(function (err) {
                if (err) {
                    return next(err);
                }
                next(null);
            })
        }
    });  
};

exports.removeCount = function (trackValue, next) {
    Count.findOne({ track: trackValue }, function (err, count) {
        if (err) {
            return next(err, null);
        }
        var faultFix = false;
        count.users--;
        if (count.users == 0) {
            if (count.type == 2) {
                count.remove();
            } else {
                count.users = 1;
                faultFix = true;
            }
        }
        count.save(function (err) {
            if (err) {
                return next(err, faultFix);
            }
            next(null, faultFix);
        });
    });
};