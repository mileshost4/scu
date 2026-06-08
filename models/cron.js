const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cronSchema = new Schema({
    name: String,
    number: Number,
    status: {
        type: String,
        required: true,
        // default: 'Pending',
        enum: ['Pending', 'Active', 'Completed']
    },
    lastUpdateTime: Date,
    nextUpdateTime: Date
})



module.exports = mongoose.model('Cron', cronSchema);