// utils/validators.js
// const isValidPin = (pin) => /^\d{4,6}$/.test(String(pin));
const isValidPin = (pin) => /^\d{4}$/.test(String(pin));

/**
 * Returns the total amount locked in pending (non-cancelled) transfers
 * for a given account, optionally excluding one transaction ID.
 */
const getPendingLockedAmount = async (Transaction, accountId, excludeId = null) => {
    const query = {
        targetaccount: accountId,
        transactionType: 'Transfer',
        status: 'Pending',
        isCancelled: { $ne: true }
    };
    if (excludeId) query._id = { $ne: excludeId };

    const pending = await Transaction.find(query);
    return pending.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
};

module.exports = { isValidPin, getPendingLockedAmount };