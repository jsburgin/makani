var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var locationSchema = new Schema({
    name: String,
    tracks: [{ track: String, count: Number}]
});

var Location = mongoose.model('Location', locationSchema);

module.exports = {
    Location: Location
}