const mongoose = require("mongoose");
const Schema   = mongoose.Schema;

const tokenSchema = new Schema({
    userId: {
        type:     Schema.Types.ObjectId,
        required: true,
        ref:      "Users",
    },
    token: {
        type:     String,
        required: true,
    },
    createdAt: {
        type:    Date,
        default: Date.now,
        expires: 3600,          // ← 3 600 seconds = 1 hour  (was 300)
    },
});

module.exports = mongoose.model("Token", tokenSchema);
