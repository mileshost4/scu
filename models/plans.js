const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_100');
});

const planSchema = new Schema({
    planType: {
        type: String,
        required: true,
        enum: ['Account Upgrade', 'Investment']
    },
    image: [ImageSchema],
    name: String,
    amount: Number,
    minamount: Number,
    maxamount: Number,
    duration: String,
    description: String,
    roi: String
})



module.exports = mongoose.model('Plan', planSchema);