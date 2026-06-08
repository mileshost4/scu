const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_100');
});

const depositmethodSchema = new Schema({
    depositmethodname: String,
    depositaddress: String,
    depositqrcode: [ImageSchema]
})



module.exports = mongoose.model('DepositMethod', depositmethodSchema);