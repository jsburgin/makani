var countService = require('./services/count-service');

module.exports = function() {

	var tracksDone = false,
		filtersDone = false;

	function done() {
		if (tracksDone && filtersDone) {
			console.log('Finished setup. Please restart for changes to take effect');
		}
	}

	var originalTracks = ['road','rain','cloud','wind','storm','crash','thunder','snow','destroy','damage','flood','clouds','lightning','tornado','thunderstorm','cloudy','raning','disaster','drought','crashed','earthquake','flooding','windy','alwx'];

	for (var i = 0; i < originalTracks.length; i++) {
		!function addTrack(trackValue) {
			var trackPackage = {
				track: trackValue,
				type: 0
			}
			console.log(trackPackage);
			countService.addCount(trackPackage, function(err) {
				if (err) {
					console.log(err);
				}
			});
		}(originalTracks[i]);
	}

	var originalFilters = ['alabama','alaska','arizona','arkansas','california','colorado','connecticut','delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky','louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri','montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina','north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina','south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia','wisconsin','wyoming'];

	for (var i = 0; i < originalFilters.length; i++) {
		!function addTrack(trackValue) {
			var trackPackage = {
				track: trackValue,
				type: 1
			}
			console.log(trackPackage);
			countService.addCount(trackPackage, function(err) {
				if (err) {
					console.log(err);
				}
			});
		}(originalFilters[i]);
	}
}