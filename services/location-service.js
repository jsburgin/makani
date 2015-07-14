var Location = require('../models/location').Location;

exports.addLocation = function (name, tracks, next) {
    var newLocation = new Location({
        name: name,
        tracks: []
    });
    
    for (track in tracks) {
        newLocation.tracks.push({ track: track, count: tracks[track] });
    }
    
    newLocation.save(function (err) {
        if (err) {
            return next(err);
        }
        return next(null);
    });
};

exports.updateLocation = function (name, newTracks, next) {
    Location.findOne({ name: name }, function (err, location) {
        if (err) {
            return next(err);
        }
        
        location.tracks = newTracks;
        
        location.save(function (err) {
            if (err) {
                return next(err);
            }
            return next(null);
        });
    });
};

exports.getAllLocations = function (next) {
    Location.find({}, function (err, locations) {
        if (err) {
            return next(err, null);
        }
        
        return next(null, locations);
    });
};