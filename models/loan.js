const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loanSchema = new mongoose.Schema({
    dateAdded: String,
    amount: Number,
    reason: String,
    status: {
        type: String,
        required: true,
        enum: ['Declined', 'Pending', 'Successful', 'Unconfirmed']
    },
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'},
    userId: String
})



module.exports = mongoose.model('Loan', loanSchema);