const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    createdAt: {
        type: Date,
        default: Date.now
    },
    accountWallet: {
        type: Number,
        default: 0
    },
    accountNumber: {
        type: Number,
    },
    accountType: {
        type: String,
        required: true,
        default: 'Savings',
        // enum: ['Savings', 'Current', 'Checking', 'Fixed Deposit']
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    displayName: String,
    status: {
        type: String,
        required: true,
        default: 'Active',
        enum: ['Locked', 'Active', 'Inactive']
    },
    accountOwner: {type: Schema.Types.ObjectId, ref: 'Users'}
})



module.exports = mongoose.model('Account', accountSchema);