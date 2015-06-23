function makani(args) {
	var socket = io,
		incomingSelector = 'all',
		runTweetFeeder = true,
		removeFilter = false;

		if (args.normalFeed || args.mapFeed) {
			$('.income-tweet-text').html(incomingSelector);
			$('.user-info').remove();
		}
}