const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cardSchema = new Schema({
    dateAdded: String,
    cardBrand: String,
    cardType: String,
    cardNumber: String,
    cardExpiryMonth: String,
    cardExpiryYear: String,
    cvv: Number,
    cardPin: Number,
    bankName: String,
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'},
    userId: String,
    userName: String,
    userEmail: String
})



module.exports = mongoose.model('Card', cardSchema);