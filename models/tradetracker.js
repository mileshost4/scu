const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tradetrackerSchema = new Schema({
    // startDate: {
    //     type: Date,
    //     required: true,
    //     default: Date.now
    // },
    // endDate: {
    //     type: Date,
    //     required: true,
    //     default: Date.now
    // },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    tradeCurrency: {
        type: String,
        required: true,
        enum: ['Bitcoin', 'Ethereum', 'Litecoin', 'USDT', 'SOL', 'Matic', 'Ton', 'Doge',
            'Ripple', 'Polkadot', 'Cardano', 
            'EUR/USD','EUR/JPY','GBP/USD','USD/JPY','USD/CAD','EUR/GBP','EUR/CHF',
            'AUD/USD','USD/CHF','NZD/USD','GBP/CHF','NZD/JPY','NZD/CHF','EUR/CAD',
            'AUD/CAD','GBP/JPY','AUD/NZD','AUD/JPY','EUR/AUD',
            'GOOG', 'AAPL', 'PEP', 'TSLA', 'AMZN', 'MSFT', 'FDX', 'UPS', 'DIS',
            'SPX', 'DJI', 'IXIC', 'FTSE', 'DAX', 'CAC', 'N225', 'HSI', 'ASX', 'SSE',
            'US10Y', 'US30Y', 'JP10Y', 'UK10Y', 'FR10Y', 'AU10Y', 'CA10Y'
    ]
    },
    action: {
        type: String,
        required: true,
        enum: ['Withdraw', 'Deposit', 'Profit', 'Loss', 'Trade Opened', 'Trade Closed']
    },
    amount: {
        type: Number,
        default: 0
    },
    // profitpercentage: String,
    // charges: String,
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Unsuccessful', 'Successful']
    },
    tradeId: String,
    validateTrade: {type: Schema.Types.ObjectId, ref: 'Trade'},
    investmentId: String,
    transactionId: String,
})



module.exports = mongoose.model('Tradetracker', tradetrackerSchema);