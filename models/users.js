const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Account = require('./account'); // make sure the path is correct
const Transaction = require('./transaction');
const Notification = require('./notification');
const Card = require('./card');
const Loan = require('./loan');
const Investment = require('./investment');
const CryptoTransaction = require('./cryptotransaction');


const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_100');
});


const userSchema = new mongoose.Schema({
    accountcreatedat: {
        type: Date,
        default: Date.now
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: false,
        unique: false,
    },
    password: String,
    firstname: String,
    lastname: String,
    middlename: String,
    confirmpassword: String,
    phonenumber: {
        type: Number,
    },
    gender: String,
    age: {
        type: Number,
    },
    dob: String,
    countryCode: {
        type: Number,
    },
    country: String,
    state: String,
    city: String,
    address: String,
    employmentstatus: String,
    zipcode: {
        type: Number,
    },
    basecurrency: {
        type: String,
        required: false,
        default: 'USD',
        // unique: false,
    },
    basecurrencysymbol: {
        type: String,
        required: false,
        default: '$',
        // unique: false,
    },
    creditscore: {
        type: Number,
        default: 850
    },
    accountStatus: {
        type: String,
        required: true,
        default: 'Not Active',
        enum: ['Not Active', 'Active', 'Disabled', 'Suspended']
    },
    verificationstatus: {
        type: String,
        required: true,
        default: 'Not Verified',
        enum: ['Not Verified', 'Pending', 'Verified']
    },
    documenttype: String,
    verificationdocument: [ImageSchema],
    profilepicture: [ImageSchema],
    // accountType: {
    //     type: String,
    //     required: true,
    //     default: 'Savings',
    //     // enum: ['Savings', 'Current', 'Checkings', 'Fixed Deposit']
    // },
    // accountWallet: {
    //     type: Number,
    //     default: 0
    // },
    accountNumber: {
        type: Number,
    },
    routingNumber: {
        type: Number,
    },
    transferCode: String,
    uid: {
        type: Number,
        default: 12345678
    },
    role: {
        type: String,
        required: true,
        default: 'user',
        enum: ['user', 'admin']
    },
    allowTransactions: {
        type: String,
        required: true,
        default: 'Yes',
        enum: ['No', 'Yes']
    },
    allowInvestments: {
        type: String,
        required: true,
        default: 'Yes',
        enum: ['No', 'Yes']
    },
    accounts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Account'
        }
    ],
    transactions: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Transaction'
        }
    ],
    notifications: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Notification'
        }
    ],
    card: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Card'
        }
    ],
    loans: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Loan'
        }
    ],
    investment: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Investment'
        }
    ],
    cryptotransactions: [ 
        {
            type: Schema.Types.ObjectId,
            ref: 'CryptoTransaction'
        }
    ],
})

userSchema.plugin(passportLocalMongoose);

userSchema.post('findOneAndDelete', async function(doc) {
    if(doc){
        await Transaction.deleteMany({
            _id: {
                $in: doc.transactions
            }
        })
        await Notification.deleteMany({
            _id: {
                $in: doc.notifications
            }
        })
        await Card.deleteMany({
            _id: {
                $in: doc.card
            }
        })
    }
})

userSchema.post('findOneAndDelete', async function(doc) {
    if (!doc) return;

    try {
        // 1. Delete all transactions
        if (doc.transactions.length > 0) {
            await Transaction.deleteMany({ _id: { $in: doc.transactions } });
        }

        // 2. Delete all notifications
        if (doc.notifications.length > 0) {
            await Notification.deleteMany({ _id: { $in: doc.notifications } });
        }

        // 3. Delete all cards
        if (doc.card.length > 0) {
            await Card.deleteMany({ _id: { $in: doc.card } });
        }

        // 4. Delete all accounts associated with user
        if (doc.accounts.length > 0) {
            // First delete transactions linked to accounts
            const accounts = await Account.find({ _id: { $in: doc.accounts } });

            for (const account of accounts) {
                await Transaction.deleteMany({ targetaccount: account._id });
            }

            // Then delete accounts
            await Account.deleteMany({ _id: { $in: doc.accounts } });
        }

        // Optional: Delete loans, investments, crypto transactions
        if (doc.loans.length > 0) await Loan.deleteMany({ _id: { $in: doc.loans } });
        if (doc.investment.length > 0) await Investment.deleteMany({ _id: { $in: doc.investment } });
        if (doc.cryptotransactions.length > 0) await CryptoTransaction.deleteMany({ _id: { $in: doc.cryptotransactions } });

        console.log(`User ${doc._id} and all associated data deleted.`);
    } catch (err) {
        console.error('Error cleaning up user data:', err);
    }
});

module.exports = mongoose.model('Users', userSchema);