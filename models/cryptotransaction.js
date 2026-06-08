const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_100');
});

const cryptoTransactionsSchema = new Schema({
    transactiondate: {
        type: Date,
        required: true,
        default: Date.now
    },
    transactionmethod: String,
    transactionType: {
        type: String,
        required: true,
        enum: ['Deposit', 'Upgrade Fee', 'Signal Fee', 'Withdraw', 'Referral Earnings']
    },
    cryptoWalletId: String,
    cryptoWalletTrackerId: String,
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        required: true,
        default: 'Pending',
        enum: ['Pending', 'Unsuccessful', 'Successful']
    },
    paymentstatus: {
        type: String,
        required: true,
        default: 'Not Completed',
        enum: ['Not Completed', 'Completed']
    },
    transactionproof: [ImageSchema],
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'},
    targetaccount: { type: Schema.Types.ObjectId, ref: 'Account' },
    withdrawaddress: String,
    narration: String,
    companywallet: String,
    accountnumber: String,
    bankname: String,
    routingcode: {
        type: String,
        enum: ['IBAN', 'SWIFT/BIC Code', '']
    },
    routingnumber: String,
    chargeCode: String,
    onlinePaymentStatus: String
})



module.exports = mongoose.model('CryptoTransaction', cryptoTransactionsSchema);