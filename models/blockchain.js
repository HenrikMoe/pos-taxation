let mongoose = require('mongoose');

let blockchainSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    price: {
        type: Number,
    },
    marketCap: {
        type: Number
    }
});

module.exports = mongoose.model('Blockchain', blockchainSchema);