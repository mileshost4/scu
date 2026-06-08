// const { duration } = require('moment-timezone');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const investmentSchema = new Schema({
    startDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: false
    },
    packagetype: String,
    investmentprofit: {
        type: Number,
        default: 0
    },
    investedamount: {
        type: Number,
        default: 0
    },
    duration: String,
    roi: String,
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Active', 'Completed']
    },
    targetaccount: {type: Schema.Types.ObjectId, ref: 'Account'},
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'},
})



module.exports = mongoose.model('Investment', investmentSchema);