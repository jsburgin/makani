var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var countService = require('../services/count-service.js');

var countSchema = new Schema({
    track: { type: String },
    value: { type: Number },
    // type: 0 = Original || 1 = State || 2 = User Created
    type: { type: Number },
    users: { type: Number }
});

var Count = mongoose.model('count', countSchema);

module.exports = {
    Count: Count
};