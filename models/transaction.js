const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new mongoose.Schema({
    amount: Number,
    wasGenerated: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        required: true,
        enum: ['Unsuccessful', 'Pending', 'Successful', 'Unconfirmed']
    },
    transactionType: {
        type: String,
        required: true,
        enum: ['Credit', 'Debit', 'Transfer', 'Deposit']
    },
    transferType: {
        type: String,
        enum: ['Intra-Bank', 'Inter-Bank', 'Wire']
    },
    description: String,
    receiverAccountNumber: Number,
    receiverAccountName: String,
    receiverCountry: String,
    senderAccountNumber: Number,
    senderAccountName: String,
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    newBalance: Number,
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'},
    targetaccount: {type: Schema.Types.ObjectId, ref: 'Account'},
    userId: String,
    bankTo: String,
    bankFrom: String,
    swiftcode: String,
    refCode: String,
    isCancelled: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('Transaction', transactionSchema);