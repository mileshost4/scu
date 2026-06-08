const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    notificationdate: {
        type: Date,
        required: true,
        default: Date.now
    },
    title: String,
    message: String,
    status: {
        type: String,
        required: true,
        default: 'Unread',
        enum: ['Unread', 'Read']
    },
    validateUser: {type: Schema.Types.ObjectId, ref: 'Users'}
})



module.exports = mongoose.model('Notification', notificationSchema);