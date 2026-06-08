const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer  = require('multer');
const { storage, cloudinary } = require('../cloudinary');
const { aggregate } = require('../models/transaction');
const upload = multer({ storage });
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const { ObjectId } = require('mongodb');
const Users = require('../models/users');
const Account = require('../models/account');
const Tradetracker = require('../models/tradetracker');
const Depositmethods = require('../models/depositmethod');
const CryptoTransaction = require('../models/cryptotransaction');
const Transaction = require('../models/transaction');
const Notification = require('../models/notification');
const Investment = require('../models/investment');
const CronModel = require('../models/cron');
const Plans = require('../models/plans');
const Card = require('../models/card');
const PDFDocument = require('pdfkit');
const {welcomeMail, emailActMail, passwordResetMail, verifyMail, acctVerifiedMail, acctUpgradeMail, customMail, depositMail, declinedepositMail, openInvestmentMail, endInvestmentMail} = require("../utils/sendEmail");
const { faker } = require('@faker-js/faker');
const realBanks = [ 'Chase Bank', 'Wells Fargo', 'Bank of America', 'Woodforest National Bank', 'US Bank', 'Citibank', 'PNC Bank', 'TD Bank', 'Capital One', 'Ally Bank', 'BB&T (Truist)', 'SunTrust Bank (Truist)', 'Fifth Third Bank', 'Regions Bank', 'M&T Bank', 'KeyBank', 'Santander Bank', 'Huntington National Bank', 'Citizens Bank', 'BNY Mellon', 'Barclays Bank', 'HSBC Bank', 'Deutsche Bank', 'Goldman Sachs', 'Morgan Stanley', 'Credit Suisse', 'UBS Bank', 'Royal Bank of Canada', 'Toronto-Dominion Bank', 'Bank of Montreal', 'Scotiabank', 'Canadian Imperial Bank of Commerce', 'Standard Chartered Bank', 'NatWest Bank', 'Lloyds Bank', 'HSBC UK', 'ING Bank', 'Rabobank', 'Société Générale', 'BNP Paribas', 'Nordea Bank', 'SEB Bank', 'Swedbank', 'Danske Bank', 'UniCredit', 'Intesa Sanpaolo', 'BBVA', 'CaixaBank', 'Banco Santander', 'Bank of China', 'Industrial and Commercial Bank of China', 'China Construction Bank', 'Agricultural Bank of China', 'Mizuho Bank', 'Sumitomo Mitsui Banking Corporation', 'Bank of Tokyo-Mitsubishi UFJ'];
const { countriesList, currencyMapJSON } = require('../utils/countries');
const currentBankName = "Sterling Crest Union";


const isAdminLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/secureadmin.login')
    }
    next();
}

const isAdmin = async(req, res, next) => {
    const { username, password } = req.body;
    const user = await Users.findOne({username});
    if (!user) {
        req.flash('error', 'Incorrect Username or Password!')
        return res.redirect('/secureadmin.login');
    } else if (user.role !== 'admin') {
        req.flash('error', 'You do not have permission to access this route!')
        return res.redirect('/secureadmin.login')
    } 
    next();
}

const onlyAdmin = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id);
    if (user.role !== 'admin') {
        req.flash('error', 'You do not have permission to access this route!')
        return res.redirect('/')
    } 
    next();
}

router.get('/secureadmin.register', async(req, res) => {
    res.render("admin/register")
})

router.post('/secureadmin.register', async(req, res) => {
try {
    const { email, firstname, lastname, password, confirmpassword } = req.body;
    const admin = new Users({email, firstname, lastname, confirmpassword, role: 'admin'});
    if (confirmpassword == password) {
        const hashedpassword = await bcrypt.hash(password, 12);
        admin.password = hashedpassword;
        // const admin = await Users.register(user, password);
        await admin.save();


        req.login(admin, err => {
            if (err) return next(err);
            
            req.flash('success', 'Welcome!!');
            res.redirect('/admin/admin.dashboard');
        })
    } else {
        req.flash('error', 'Password and Confirm Password does not match');
        res.redirect('/secureadmin.register');
    }    
} catch (e) {
    req.flash('error', e.message);
    res.redirect('/secureadmin.register');
}

});

router.get('/secureadmin.login', async(req, res) => {
    // const alladmin = await Users.find({role: 'admin'})
    // console.log(alladmin)
    res.render("admin/login")
})

router.post('/secureadmin.login', isAdmin, passport.authenticate('adminauth', {failureFlash: true, failureRedirect: '/secureadmin.login'}), (req, res) => {
    req.flash('success', 'Successfully Logged In!');
    // const admin = req.user;
    // console.log(admin.id)

res.redirect('/admin/admin.dashboard');
})

// router.post('/secureadmin.login', isAdmin, async(req, res) => {
//     const { email, password } = req.body;
//     const findAdmin =  Users.findOne({email: req.body.email })

//     if (findAdmin) {
//         const match = bcrypt.compare(password, findAdmin.password);

//         if (match) {
//                 req.flash('success', 'Successfully Logged In!');
//                 res.redirect('/admin/admin.dashboard');
//         } else {
//             req.flash('error', 'Invalid Email/Password');
//             res.redirect('/secureadmin.login');
//         }
        
//     } else {
        
//         req.flash('error', 'User not found!');
//         res.redirect('/secureadmin.login');
//     }
    
// })



router.get('/admin/admin.dashboard', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.user.id
    const admin = await Users.findById(id)
    const alladmins = await Users.find({role: 'admin'})
    // const users = await Users.find({role: 'user'})
    const users = await Users.find({role: 'user'}).populate({path: 'transactions', options: { sort: { 'date': -1 } } });

    const activeAcct = await Users.find({accountStatus: 'Active', role: 'user'})
    const inactiveAcct = await Users.find({accountStatus: { $ne: 'Active'}, role: 'user'})
    const creditSum = await Transaction.find({})
    const tSum = await Transaction.aggregate([{$group: {_id: null, sum_val:{$sum: "$amount"}}}])

    const verificationrequest = await Users.find({role: 'user', verificationstatus: 'Pending'});
    const verifiedusers = await Users.find({role: 'user', verificationstatus: 'Verified'});
    const unverifiedusers = await Users.find({role: 'user', verificationstatus: 'Not Verified'});
    const suspendedusers = await Users.find({role: 'user', accountStatus: 'Suspended'});
    const activeinvestments = await Investment.find({status: 'Active'}).sort({startDate: -1});
    const inactiveinvestments = await Investment.find({status: 'Completed'}).sort({startDate: -1});
    const totalinvestments = await Investment.find();
    const totaltransactions = await Transaction.find({})
    const pendingtransactions = await Transaction.find({status: 'Pending'}).sort({'date': -1});

    const pendingcryptodeposits = await CryptoTransaction.find({status: 'Pending', paymentstatus: 'Completed'});
    const totalcryptodeposits = await  CryptoTransaction.find();

    const credittransactionsTracker = await Transaction.find({
        $and: [
            { transactionType: { $in: ["Credit", "Deposit"] } }
        ]
    }).sort({ date: -1 }).limit(20);
    
    const debittransactionsTracker = await Transaction.find({
        $and: [
            { transactionType: { $in: ["Debit", "Transfer"] } }
        ]
    }).sort({ date: -1 }).limit(20);
    
    // Group by date and sum amounts
    function groupTransactionsByDate(transactions) {
        return transactions.reduce((acc, transaction) => {
            const date = transaction.date.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + (transaction.amount || 0);
            return acc;
        }, {});
    }
    
    const groupedCreditTransactions = groupTransactionsByDate(credittransactionsTracker);
    const groupedDebitTransactions = groupTransactionsByDate(debittransactionsTracker);
    
    // Sort dates
    const creditDates = Object.keys(groupedCreditTransactions).sort();
    const creditData = creditDates.map(date => groupedCreditTransactions[date]);
    
    const debitDates = Object.keys(groupedDebitTransactions).sort();
    const debitData = debitDates.map(date => groupedDebitTransactions[date]);
    
    // Total sums for pie chart
    const totalCredit = creditData.reduce((sum, val) => sum + val, 0);
    const totalDebit = debitData.reduce((sum, val) => sum + val, 0);
    
    // Chart data structures
    const creditChartData = {
        labels: creditDates,
        datasets: [{
            label: 'Cash In',
            data: creditData,
            backgroundColor: '#09be84ff',
            borderColor: '#1fcd96ff',
            borderWidth: 1,
            barThickness: 30
        }]
    };
    
    const debitChartData = {
        labels: debitDates,
        datasets: [{
            label: 'Cash Out',
            data: debitData,
            backgroundColor: '#b51f17ff',
            borderColor: '#ec3b32ff',
            borderWidth: 1,
            barThickness: 30
        }]
    };
    
    const pieChartData = {
        labels: ['Cash In', 'Cash Out'],
        datasets: [{
            label: 'Cash Flow Overview',
            data: [totalCredit, totalDebit],
            backgroundColor: ['#09be84ff', '#b51f17ff'],
            borderColor: ['#28c795ff', '#ff5e57'],
            borderWidth: 1
        }]
    };

    // console.log(tSum)
    res.render("admin/dashboard", {admin, alladmins, users, verificationrequest, verifiedusers, unverifiedusers, suspendedusers, activeinvestments, inactiveinvestments, totalinvestments, pendingcryptodeposits, totalcryptodeposits, activeAcct, totaltransactions, inactiveAcct, pendingtransactions, creditChartData: JSON.stringify(creditChartData), debitChartData: JSON.stringify(debitChartData), pieChartData: JSON.stringify(pieChartData)})
})

router.get('/admin/admin.profile', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.user.id
    const admin = await Users.findById(id)
    // console.log(admin)
    res.render("admin/profile", {admin})
})

router.put('/admin/admin.upload-profile-picture', isAdminLoggedIn, onlyAdmin, upload.array('profilepicture'), async (req, res) => {
    const id = req.user.id;
    const {profilepicture } = req.body;
    const admin = await Users.findByIdAndUpdate(id, {profilepicture}, { runValidators: true, new: true })
    admin.profilepicture = req.files.map(f => ({url: f.path, filename: f.filename}))
    await admin.save();
    req.flash('success', 'Successfully Uploaded Profile Picture!')
    res.redirect('/admin/admin.profile')
});

router.put('/admin/admin.delete-profile-picture', isAdminLoggedIn, onlyAdmin, upload.array('profilepicture'), async (req, res) => {
    const id = req.user.id;
    const admin = await Users.findById(id)
    for (let filename of admin.profilepicture) {
        await cloudinary.uploader.destroy(filename);
    }
    await admin.updateOne({ $pull: { profilepicture: { } } })
    await admin.save();
    req.flash('success', 'Successfully Deleted Profile Picture!')
    res.redirect('/dashboard/profile')
});

router.put('/admin/admin.changepassword', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.user.id;
    const admin = await Users.findById(id)
    const {currentpassword, password, confirmpassword} = req.body;

    const validPassword = await bcrypt.compare(currentpassword, admin.password);
    if(validPassword) {
        if(password === confirmpassword) {
            const hashedpassword = await bcrypt.hash(password, 12);
            await admin.updateOne({password: hashedpassword, confirmpassword: confirmpassword}, { runValidators: true, new: true })

            req.login(admin, function(err) {
                if (err) return next(err);
                req.flash('success', 'Password Changed!');
                res.redirect('/admin/admin.dashboard');
            })
        } else {
            req.flash('error', 'Passwords do not match.')
            res.redirect(`/admin/admin.profile`)
        }
    } else {
        req.flash('error', 'Incorrect Password.')
        res.redirect(`/admin/admin.profile`)
    }
});

// Replace existing /admin/admin.edit-profile
router.put('/admin/admin.edit-profile', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.user.id;
    const {
        email, firstname, lastname, middlename, username,
        phonenumber, country, countryCode, city, zipcode,
        state, address, gender
    } = req.body;

    const safeUpdate = {
        email, firstname, lastname, middlename, username,
        phonenumber, country, countryCode, city, zipcode,
        state, address, gender
    };

    await Users.findByIdAndUpdate(id, safeUpdate, { runValidators: true, new: true });
    req.flash('success', 'Profile updated!');
    res.redirect('/admin/admin.profile');
});

// router.put('/admin/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
//     const id = req.user.id
//     const updateAdmin = await Users.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
//     req.flash('success', 'Successfully updated profile!')
//     res.redirect('/admin/admin.dashboard');
// });

// router.put('/admin/:id/changepassword', isAdminLoggedIn, onlyAdmin, async(req, res) => {
//     const id = req.user.id;
//     const admin = await Users.findById(id)
//     const {currentpassword, password, confirmpassword} = req.body;

//     const validPassword = await bcrypt.compare(currentpassword, user.password);
//     if(validPassword) {
//         if(password === confirmpassword) {
//             const hashedpassword = await bcrypt.hash(password, 12);
//             await admin.updateOne({password: hashedpassword, confirmpassword: confirmpassword}, { runValidators: true, new: true })

//             req.login(admin, function(err) {
//                 if (err) return next(err);
//                 req.flash('success', 'Password Changed!');
//                 res.redirect('/admin/admin.dashboard');
//             })
//         } else {
//             req.flash('error', 'Passwords do not match.')
//             res.redirect(`/admin/admin.profile/${id}`)
//         }
//     } else {
//         req.flash('error', 'Incorrect Password.')
//         res.redirect(`/admin/admin.profile/${id}`)
//     }
// });


router.get('/admin/admin.users', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.user.id
    const users = await Users.find({role: 'user' }).sort({_id: -1});
    const admin = await Users.findById(id)
    res.render('admin/users', {users, admin});
});

router.get('/admin/admin.user/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const user = await Users.findById(req.params.id);
    const transactions = await Transaction.find({validateUser: user}).sort({date: -1})
    const cards = await Card.find({validateUser: user}).sort({dateAdded: 1});
    const totalinvestments = await Investment.find({validateUser: user}).sort({startDate: 1});
    const clientNotification = await Users.findById(req.params.id).populate({path: 'notifications', options: { sort: { 'date': -1 } } });
    const mainaccount = await Account.findOne({accountOwner: user, isDefault: true});
    const allaccounts = await Account.find({accountOwner: user}).sort({createdAt: 1});

    res.render('admin/show-user', {user, mainaccount, countries: countriesList, currencyMapJSON: currencyMapJSON, allaccounts, transactions, cards, admin, totalinvestments, clientNotification});
});

router.put('/admin/admin.user/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.params.id;
    const { email, firstname, lastname, middlename, username,
            phonenumber, country, state, city, address, zipcode, gender, dob, basecurrency, basecurrencysymbol } = req.body;

    await Users.findByIdAndUpdate(id, {
        email, firstname, lastname, middlename, username,
        phonenumber, country, state, city, address, zipcode, gender, dob, basecurrency, basecurrencysymbol
    }, { runValidators: true, new: true });

    req.flash('success', 'User profile updated!');
    res.redirect(`/admin/admin.user/${id}`);
});

router.put('/admin/admin.users/:id/enable-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({allowTransactions: 'Yes'}, { runValidators: true, new: true });
    req.flash('success', 'Transactions Enabled.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/disable-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({allowTransactions: 'No'}, { runValidators: true, new: true });
    req.flash('success', 'Transactions Disabled.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/enable-investments', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({allowInvestments: 'Yes'}, { runValidators: true, new: true });
    req.flash('success', 'Investments Enabled.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/disable-investment', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({allowInvestments: 'No'}, { runValidators: true, new: true });
    req.flash('success', 'Investments Disabled.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/change-currency', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {basecurrency, basecurrencysymbol} = req.body;
    await user.updateOne({basecurrency, basecurrencysymbol}, { runValidators: true, new: true });
    req.flash('success', 'Currency Changed.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/suspend-acct', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({accountStatus: 'Suspended'}, { runValidators: true, new: true });
    req.flash('success', 'Account Suspended.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/account-type', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.params.id;
    const { accountType } = req.body;   // only allow accountType to change
    await Users.findByIdAndUpdate(id, { accountType }, { runValidators: true, new: true });
    req.flash('success', 'Account type updated.');
    res.redirect(`/admin/admin.user/${id}`);
});

router.put('/admin/admin.users/:id/creditscore', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {creditscore} = req.body;

    const update = { ...req.body };

    await user.updateOne(update, { runValidators: true, new: true });
    req.flash('success', 'Credit Score Updated.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/activate-acct', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({accountStatus: 'Active'}, { runValidators: true, new: true });
    req.flash('success', 'Account Activated.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/verify-acct', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({verificationstatus: 'Verified', accountStatus: 'Active'}, { runValidators: true, new: true });
    req.flash('success', 'Account Verified.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.users/:id/unverify-acct', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    await user.updateOne({verificationstatus: 'Not Verified', accountStatus: 'Not Active'}, { runValidators: true, new: true });
    req.flash('success', 'Account Unverified.')
    res.redirect(`/admin/admin.user/${id}`)
});

router.put('/admin/admin.createdAt/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {date} = req.body;
    await user.updateOne({accountcreatedat: date}, { runValidators: true, new: true });
    req.flash('success', `Date Updated!`)
    res.redirect(`/admin/admin.user/${id}`)
});

router.delete('/admin/admin.removeaccount/:id/from/:userid', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { id, userid } = req.params;

    try {
        const account = await Account.findById(id);
        const user = await Users.findById(userid);

        if (!account || !user) {
            req.flash('error', 'User or account not found.');
            return res.redirect('/admin/admin.users');
        }

        // Remove account from user's accounts
        user.accounts.pull(account._id);

        // Find all transactions linked to the account
        const transactions = await Transaction.find({ targetaccount: account._id });

        // Pull each transaction from user.transactions
        const transactionIds = transactions.map(tx => tx._id);
        user.transactions.pull(...transactionIds);

        await user.save();

        // Delete the transactions from DB
        await Transaction.deleteMany({ _id: { $in: transactionIds } });

        // Delete the account
        await account.deleteOne();

        req.flash('success', 'Successfully deleted account!');
        res.redirect(`/admin/admin.user/${user._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to delete account.');
        res.redirect('/admin/admin.users');
    }
});


router.put('/admin/admin.change-user-password/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {currentpassword, password, confirmpassword} = req.body;

    const validPassword = await bcrypt.compare(currentpassword, user.password);
    if(validPassword) {
        if(password === confirmpassword) {
            const hashedpassword = await bcrypt.hash(password, 12);
            await user.updateOne({password: hashedpassword, confirmpassword: confirmpassword}, { runValidators: true, new: true })
            req.flash('success', 'Password Changed.')
            res.redirect(`/admin/admin.user/${id}`) 
        } else {
            req.flash('error', 'Passwords do not match.')
            res.redirect(`/admin/admin.user/${id}`)
        }
    } else {
        req.flash('error', 'Incorrect Password.')
        res.redirect(`/admin/admin.user/${id}`)
    }
    
});

const isValidPin = (pin) => /^\d{4}$/.test(String(pin));

// Admin: Set transfer PIN for a user (when none exists)
router.put('/admin/admin.user/:id/set-transfer-pin', isAdminLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { transferCode, confirmTransferCode } = req.body;

    if (!isValidPin(transferCode)) {
      req.flash('error', 'PIN must be exactly 4 digits (numbers only).');
      return res.redirect(`/admin/admin.user/${id}`);
    }
    if (String(transferCode) !== String(confirmTransferCode)) {
      req.flash('error', 'PINs do not match.');
      return res.redirect(`/admin/admin.user/${id}`);
    }

    await Users.findByIdAndUpdate(id, { transferCode: String(transferCode) });
    req.flash('success', 'Transfer PIN set successfully.');
    res.redirect(`/admin/admin.user/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect(`/admin/admin.user/${id}`);
  }
});

// Admin: Change transfer PIN for a user (requires knowing current PIN)
router.put('/admin/admin.user/:id/change-transfer-pin', isAdminLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { oldTransferCode, transferCode, confirmTransferCode } = req.body;
    const user = await Users.findById(id).lean();

    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/admin/admin.users');
    }
    if (String(oldTransferCode) !== String(user.transferCode)) {
      req.flash('error', 'Current PIN is incorrect.');
      return res.redirect(`/admin/admin.user/${id}`);
    }
    if (!isValidPin(transferCode)) {
      req.flash('error', 'New PIN must be exactly 4 digits.');
      return res.redirect(`/admin/admin.user/${id}`);
    }
    if (String(transferCode) !== String(confirmTransferCode)) {
      req.flash('error', 'New PINs do not match.');
      return res.redirect(`/admin/admin.user/${id}`);
    }

    await Users.findByIdAndUpdate(id, { transferCode: String(transferCode) });
    req.flash('success', 'Transfer PIN updated successfully.');
    res.redirect(`/admin/admin.user/${id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong.');
    res.redirect(`/admin/admin.user/${id}`);
  }
});

router.delete('/admin/admin.delete-user/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const { password } = req.body;

        // Find the user
        const user = await Users.findById(id);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/admin.users');
        }

        // Check admin password before deleting user
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            req.flash('error', 'Incorrect password.');
            return res.redirect(`/admin/admin.user/${user._id}`);
        }

        // Delete the user using findByIdAndDelete so post middleware fires
        await Users.findByIdAndDelete(id);

        req.flash('success', 'User and all associated data deleted successfully!');
        res.redirect('/admin/admin.users');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Failed to delete user.');
        res.redirect('/admin/admin.users');
    }
});

router.delete('/admin/admin.delete-allinactiveusers', isAdminLoggedIn, onlyAdmin, async (req, res) => { 
    try {

        // Delete all users with role "user" and accountStatus "Not active"
        const result = await Users.deleteMany({ 
            role: 'user', 
            accountStatus: 'Not Active',
            country: 'Cape Verde' 
        });

        // const users = await Users.find({ 
        //     role: 'user', 
        //     acctstatus: 'Not Active',
        //     country: 'Zimbabwe' 
        // });
        // console.log (users.length)

        req.flash('success', `${result.deletedCount} inactive users deleted.`);
        res.redirect('/admin/admin.users');
    } catch (error) {
        console.error('Error deleting inactive users:', error);
        req.flash('error', 'An error occurred while deleting inactive users.');
        res.redirect('/admin/admin.users');
    }
});


router.post('/admin/admin.create-account', isAdminLoggedIn, onlyAdmin, async (req, res, next) => {
        try {
            const random8Numbers = Math.floor(20000000 + Math.random() * 54890765);
            const random10Numbers = Math.floor(2000000000 + Math.random() * 54890765);
            const random9Numbers = Math.floor(100000000 + Math.random() * 900000000);

            const { accountcreatedat, accountType, email, firstname, lastname, middlename, country, basecurrency, basecurrencysymbol, state, city, address, zipcode, gender, dob, phonenumber, password, confirmpassword } = req.body;
            
            // Check if the email already exists
            const existingUser = await Users.findOne({ email: email });
            if (existingUser) {
                req.flash('error', 'Email already in use. Please enter another email or sign in.');
                return res.redirect('/admin/admin.users');
            }

            // Ensure passwords match
            if (confirmpassword !== password) {
                req.flash('error', 'Password and Confirm Password do not match');
                return res.redirect('/admin/admin.users');
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const user = new Users({
                accountcreatedat, email, firstname, lastname, middlename, country, basecurrency, 
                basecurrencysymbol, state, city, address, zipcode, gender, dob, 
                phonenumber, password: hashedPassword, confirmpassword, 
                uid: random8Numbers, routingNumber: random9Numbers, accountNumber: random10Numbers,
            });

            // Save user
            await user.save();

            // Create default account
            const account = new Account({
                accountType, displayName: 'Main Account', isDefault: true, accountNumber: random10Numbers, accountOwner: user
            });
            await account.save();

            // Link the account to the user
            user.accounts.push(account);
            await user.save();

            req.flash('success', 'Account Created!')
            res.redirect(`/admin/admin.user/${user.id}`)

        } catch (e) {
            req.flash('error', e.message);
            return res.redirect('/admin/admin.users');
        }
 
});


router.post('/admin/admin.notifications/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id  = req.params.id;
    const user = await Users.findById(id);
        const today = new Date();
        const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
        const time = hours + ":" + today.getMinutes() + ":" + today.getSeconds();
        const ampm = today.getHours() >= 12 ? 'PM' : 'AM';
        const dateTime = date+' '+time+ ' ' + ampm;
    const {title, message} = req.body;
    const notification = new Notification({title, message, notificationdate: dateTime, validateUser: user});
    user.notifications.push(notification);
    await notification.save();
    await user.save()
    req.flash('success', 'Notification Sent!')
    res.redirect(`/admin/admin.user/${user.id}`);
});

router.delete('/admin/client/:id/notifications/:nid/', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { id, nid } = req.params;
    const client = await Users.findById(id);
    await Notification.findByIdAndDelete(nid);
    req.flash('success', 'Successfully deleted notification!')
    res.redirect(`/admin/admin.users/${client.id}`);
});

router.post('/admin/admin.notifications/broadcast', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { title, message } = req.body;
    const today = new Date();

    const allUsers = await Users.find({ role: 'user' });

    const notifications = allUsers.map(user => ({
        title,
        message,
        notificationdate: today,
        validateUser: user._id,
        status: 'Unread'
    }));

    const created = await Notification.insertMany(notifications);

    // Push each notification ID into each user's notifications array
    for (let i = 0; i < allUsers.length; i++) {
        allUsers[i].notifications.push(created[i]._id);
        await allUsers[i].save();
    }

    req.flash('success', `Broadcast sent to ${allUsers.length} users.`);
    res.redirect('/admin/admin.dashboard');
});

router.get('/admin/admin.users/findUser', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const {findUser} = req.body;

    Users
        .find({ $or: [ {firstname: { $regex: req.query.findUser, $options: 'i' }}, {lastname: { $regex: req.query.findUser, $options: 'i'} } ] })
        .sort({dateCreated: -1})
        .exec(function(err, users) {
            Users.count().exec(function(err, count) {
                if (err) return next(err)
                res.render('admin/searchresult', {
                    users: users,
                    admin,
                    searchKeyword: req.query.findUser
                })
            })
        })
})

router.post('/admin/admin.user/:id/credit', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {amount, date, description, senderAccountNumber, senderAccountName, bankFrom, account} = req.body;
    const targetaccount = await Account.findById(account)
    const wallet = parseFloat(amount);
    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
    
    const newTransaction = new Transaction({userId: user.id, refCode: ref, amount, date, description, senderAccountNumber, senderAccountName, bankFrom, transactionType: 'Credit', status: 'Successful', targetaccount: targetaccount, validateUser: user, newBalance: targetaccount.accountWallet + wallet});
    // user.transactions.push(newTransaction);
    // console.log(newTransaction);
    await newTransaction.save();
    // await user.updateOne({accountWallet: user.accountWallet + newTransaction.amount}, { runValidators: true, new: true });
    await targetaccount.updateOne({accountWallet: targetaccount.accountWallet + newTransaction.amount}, { runValidators: true, new: true });
    user.transactions.push(newTransaction);
    await user.save()
    req.flash('success', 'Success!')
    res.redirect(`/admin/admin.user/${id}`)
});

router.post('/admin/admin.user/:id/deposit', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {amount, date, account} = req.body;
    const targetaccount = await Account.findById(account)
    const wallet = parseFloat(amount);
    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
    const newTransaction = new Transaction({userId: user.id, refCode: ref, amount, date, transactionType: 'Deposit', status: 'Successful', validateUser: user, newBalance: targetaccount.accountWallet + wallet, targetaccount: targetaccount});
    // user.transactions.push(newTransaction);
    await newTransaction.save();
    await targetaccount.updateOne({accountWallet: targetaccount.accountWallet + newTransaction.amount}, { runValidators: true, new: true });
    user.transactions.push(newTransaction);
    await user.save()
    req.flash('success', 'Success!')
    res.redirect(`/admin/admin.user/${id}`)
});

router.post('/admin/admin.user/:id/withdraw', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
    const {amount, date, account} = req.body;
    const targetaccount = await Account.findById(account)

    const wallet = parseFloat(amount);
    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
    if (wallet > targetaccount.accountWallet) {
        req.flash('error', 'Insufficient Funds!')
        res.redirect(`/admin/admin.user/${id}`)
    } else {
        const newTransaction = new Transaction({userId: user.id, refCode: ref, amount, date, transactionType: 'Debit', status: 'Successful', validateUser: user, newBalance: targetaccount.accountWallet - wallet, targetaccount: targetaccount});
        // user.transactions.push(newTransaction);
        await newTransaction.save();
        await targetaccount.updateOne({accountWallet: targetaccount.accountWallet - newTransaction.amount}, { runValidators: true, new: true });
        user.transactions.push(newTransaction);
        await user.save()
        req.flash('success', 'Success!')
        res.redirect(`/admin/admin.user/${id}`)
    }
});

router.post('/admin/admin.user/:id/intrabank-transfer', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id
    const user = await Users.findById(id);
    const {amount, description, receiverAccountNumber, receiverAccountName, transferPin, date, account} = req.body;
    const targetaccount = await Account.findById(account)
    const transferedamount = parseFloat(amount);

        const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
        
        if (transferedamount > targetaccount.accountWallet) {
            req.flash('error', 'Insufficient Funds!')
            res.redirect(`/admin/admin.user/${id}`)
        } else {
            const newTransaction = new Transaction({amount, description, receiverAccountNumber, receiverAccountName, userId: user.id, date: date, transactionType: 'Transfer', transferType: 'Intra-Bank', status: 'Successful', refCode: ref, validateUser: user, targetaccount: targetaccount, newBalance: targetaccount.accountWallet - transferedamount, senderAccountNumber: targetaccount.accountNumber, senderAccountName: user.firstname + user.lastname, bankTo: "Intra-Bank", bankFrom: "Intra-Bank"});
            await newTransaction.save();
            await targetaccount.updateOne({accountWallet: targetaccount.accountWallet - newTransaction.amount}, { runValidators: true, new: true });
            user.transactions.push(newTransaction);
            await user.save()
            req.flash('success', 'Transaction Successful!')
            res.redirect(`/admin/admin.user/${id}`)
            
        }
    
   
});

router.post('/admin/admin.user/:id/interbank-transfer', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id
    const user = await Users.findById(id);
    const {amount, description, receiverAccountNumber, receiverAccountName, bankTo, otherBank, transferPin, date, account} = req.body;
    const targetaccount = await Account.findById(account)
    const transferedamount = parseFloat(amount);

   
        const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
        
        if (transferedamount > targetaccount.accountWallet) {
            req.flash('error', 'Insufficient Funds!')
            res.redirect(`/admin/admin.user/${id}`)
        } else {
            if (bankTo === 'others') {
                const newTransaction = new Transaction({amount, description, receiverAccountNumber, receiverAccountName, bankTo: otherBank, userId: user.id, date: date, transactionType: 'Transfer', transferType: 'Inter-Bank', status: 'Successful', validateUser: user, refCode: ref, targetaccount: targetaccount, newBalance: targetaccount.accountWallet - transferedamount, senderAccountNumber: targetaccount.accountNumber, senderAccountName: user.firstname + user.lastname});
                await newTransaction.save();
                await targetaccount.updateOne({accountWallet: targetaccount.accountWallet - newTransaction.amount}, { runValidators: true, new: true });
                user.transactions.push(newTransaction);
                await user.save()
                req.flash('success', 'Transaction Successful!')
                res.redirect(`/admin/admin.user/${id}`)
            } else {
                const newTransaction = new Transaction({amount, description, receiverAccountNumber, receiverAccountName, bankTo, userId: user.id, date: date, transactionType: 'Transfer', transferType: 'Inter-Bank', status: 'Successful', validateUser: user, refCode: ref, targetaccount: targetaccount, newBalance: targetaccount.accountWallet - transferedamount, senderAccountNumber: targetaccount.accountNumber, senderAccountName: user.firstname + user.lastname});
                await newTransaction.save();
                await targetaccount.updateOne({accountWallet: targetaccount.accountWallet - newTransaction.amount}, { runValidators: true, new: true });
                user.transactions.push(newTransaction);
                await user.save()
                req.flash('success', 'Transaction Successful!')
                res.redirect(`/admin/admin.user/${id}`)
            }
            
        }


});

router.post('/admin/admin.user/:id/wire-transfer', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id
    const user = await Users.findById(id);
    const {amount, description, receiverAccountNumber, receiverAccountName, bankTo, receiverCountry, swiftcode, transferPin, date, account} = req.body;
    const targetaccount = await Account.findById(account)
    const transferedamount = parseFloat(amount);

    
        const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]|\s+\|r?n|\r/gmi,"");
        
        if (transferedamount > targetaccount.accountWallet) {
            req.flash('error', 'Insufficient Funds!')
            res.redirect(`/admin/admin.user/${id}`)
        } else {
            const newTransaction = new Transaction({amount, description, receiverAccountNumber, receiverAccountName, bankTo, receiverCountry, swiftcode, userId: user.id, date: date, transactionType: 'Transfer', transferType: 'Wire', status: 'Successful', refCode: ref, validateUser: user, targetaccount: targetaccount, newBalance: targetaccount.accountWallet - transferedamount, senderAccountNumber: targetaccount.accountNumber, senderAccountName: user.firstname + user.lastname});
            await newTransaction.save();
            await targetaccount.updateOne({accountWallet: targetaccount.accountWallet - newTransaction.amount}, { runValidators: true, new: true });
            user.transactions.push(newTransaction);
            await user.save()
            req.flash('success', 'Transaction Successful!')
            res.redirect(`/admin/admin.user/${id}`)
            
        }
 
});


router.post('/admin/admin.user/:id/generate-history', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { startBalance, endBalance, startDate, endDate, transactionCount, account, biasType } = req.body;
    
    const user = await Users.findById(req.params.id);
    const targetAccount = await Account.findById(account);
  
    let balance = parseFloat(startBalance);
    const endBal = parseFloat(endBalance);
    const count = parseFloat(transactionCount);
  
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    // Biased transaction types (more Credit/Deposit if selected)
    let transactionTypes = ['Credit', 'Deposit', 'Withdraw', 'Intra-Bank', 'Inter-Bank', 'Wire'];
  
    if (biasType === 'credit') {
      transactionTypes = [
        'Credit', 'Credit', 'Credit', 'Deposit',
        'Deposit', 'Withdraw', 'Intra-Bank', 'Inter-Bank', 'Wire'
      ];
    } else if (biasType === 'debit') {
      transactionTypes = [
        'Credit', 'Deposit', 'Withdraw', 'Withdraw',
        'Intra-Bank', 'Inter-Bank', 'Wire', 'Intra-Bank', 'Inter-Bank', 'Wire'
      ];
    } else if (biasType === 'only credit') {
        transactionTypes = [
          'Credit', 'Deposit', 'Credit'
        ];
    } else if (biasType === 'only debit') {
        transactionTypes = [
          'Withdraw', 'Intra-Bank', 'Inter-Bank', 'Wire'
        ];
    }
  
    // --- Descriptions ---
    const creditDescriptions = [
    // --- General / Safe credits (any amount) ---
    "Account credited",
    "Funds received",
    "Incoming transfer",
    "Credit alert",
    "Balance top-up",
    "Account funding",
    "Payment received",
    "Transfer received",
    "Credit entry",
    "Cash inflow",
    "Cash deposit",
    "ATM cash deposit",
    "Mobile banking deposit",
    "Transfer from personal account",
    "Support received",
    "Reimbursement received",
    "Refund processed",
    "Charge reversal",
    "Wallet funding",
    "Cashback received",
    "Business proceeds received",
    "Customer payment",
    "Sales proceeds",
    "Invoice settlement",
    "Service payment received",
    "Vendor payment received",
    "Contract payment received",
    "Business income",
    "Merchant settlement",
    "Commercial proceeds",
    "Trade proceeds",
    "Sales revenue credited",
    "Payment for services rendered",
    "Advance payment received",
    "Balance settlement",
    "Project payment received",
    "Engineering service payment",
    "Project execution payment",
    "Contract milestone payment",
    "Site work payment received",
    "Consultancy service payment",
    "Technical service fee received",
    "Engineering contract proceeds",
    "Infrastructure project payment",
    "Maintenance service payment",
    "Field work payment received",
    "Design service payment",
    "Installation service proceeds",
    "Project support payment",
    "Professional service fee",
    "Salary payment",
    "Wage payment received",
    "Staff allowance credited",
    "Payroll credit",
    "Honorarium received",
    "Stipend credited",
    "Grant proceeds",
    "Funding received",
    "Institutional payment",
    "Investment return",
    "Interest credited",
    "Dividend payment",
    "Portfolio proceeds",
    "Capital return",
    "Trading proceeds",
    "Investment payout",
    "Asset sale proceeds",
    "Platform payout",
    "Online payment received",
    "Marketplace settlement",
    "Digital wallet credit",
    "E-commerce proceeds",
    "App payout received",
    "Balance adjustment",
    "Account reconciliation credit",
    "Correction entry",
    "System credit",
    "Bank adjustment",
    "Excess charge reversal",
    "Shared expense settlement",
    "Cost refund received",
    "Support funds received",
    "Contribution received",
    "Private transfer",
    "Internal transfer credit",
    ];

    const debitDescriptions = [
    "Payment sent",
    "Account debited",
    "Debit alert",
    "Outgoing transfer",
    "Funds withdrawn",
    "Balance deduction",
    "Transaction processed",
    "Payment processed",
    "Debit entry",

    // --- Personal / Everyday ---
    "Utility payment",
    "Electricity bill paid",
    "Water bill payment",
    "Mobile airtime top-up",
    "Internet service payment",
    "Grocery purchase",
    "Restaurant payment",
    "Cafe/coffee purchase",
    "Fuel purchase",
    "Transport fare",
    "Taxi/ride-hailing payment",
    "ATM withdrawal",
    "Cash withdrawal",
    "Medical expense",
    "Pharmacy purchase",
    "Subscription payment",
    "Streaming service payment",
    "Insurance premium payment",
    "Loan repayment",
    "Credit card repayment",
    "Rent payment",
    "House maintenance payment",
    "Childcare / daycare payment",
    "Pet care service",
    "Clothing / apparel purchase",
    "Bookstore / stationery purchase",
    "Courier / delivery payment",
    "Donation / charity payment",
    "Support for friend/family",
    "Supplier payment",
    "Vendor payment",
    "Project expense",
    "Contract payment",
    "Service fee paid",
    "Business transaction fee",
    "Invoice payment sent",
    "Commercial purchase",
    "Office supplies payment",
    "Professional service payment",
    "Consultancy fee payment",
    "Contract milestone expense",
    "Engineering service payment",
    "Project materials purchase",
    "Equipment payment",
    "Operational expense",
    "Team reimbursement",
    "Payroll deduction",
    "Staff allowance payment",
    "Business travel expense",
    "Event / conference payment",
    "Tax payment",
    "Regulatory fee",
    "Insurance premium",
    "Bank charges",
    "Service charges",
    "Maintenance fee",
    "Subscription renewal",
    "Institutional payment",
    "Digital platform payment",
    "Online marketplace purchase",
    "App service fee",
    "E-commerce payment",
    "Software / SaaS subscription",
    "Cloud storage payment",
    "Online course fee",
    "Balance correction",
    "Fee adjustment",
    "Account reconciliation debit",
    "System debit",
    "Bank adjustment",
    "Charge reversal",
    ];

    const transferDescriptions = [
    "Funds transferred",
    "Account transfer completed",
    "Outgoing transfer processed",
    "Transfer alert",
    "Transaction processed",
    "Internal account transfer",
    "Inter-account transfer",
    "Transfer executed",
    "Transfer successful",
    "Transfer to family",
    "Transfer to friend",
    "Wallet top-up",
    "Digital wallet transfer",
    "Cash sent",
    "Peer-to-peer transfer",
    "Shared expense payment",
    "Payment for services",
    "Transfer for utilities",
    "Transfer for groceries",
    "Payment to vendor",
    "Mobile money transfer",
    "Supplier payment sent",
    "Vendor payment processed",
    "Contractor payment transferred",
    "Project payment sent",
    "Invoice settlement",
    "Business expense transfer",
    "Consultancy fee transfer",
    "Contract milestone payment",
    "Engineering service payment",
    "Operational funds transfer",
    "Team reimbursement transfer",
    "Client payment sent",
    "Business wallet transfer",
    "Project funding transfer",
    "Commercial transaction processed",
    "Payroll transfer",
    "Staff allowance transfer",
    "Loan repayment transfer",
    "Investment account transfer",
    "Grant funds transferred",
    "Corporate expense transfer",
    "Institutional payment processed",
    "Regulatory fee payment",
    "Tax payment transfer",
    "Bank fee transfer",
    "Balance adjustment transfer",
    "Correction entry",
    "Account reconciliation transfer",
    "System transfer",
    "Bank adjustment",
    "Duplicate transaction reversal",
    ];

  
  
    function getDescriptionForType(type) {
      if (type === 'Credit' || type === 'Deposit') return creditDescriptions[Math.floor(Math.random() * creditDescriptions.length)];
      if (type === 'Debit' || type === 'Withdraw') return debitDescriptions[Math.floor(Math.random() * debitDescriptions.length)];
      return transferDescriptions[Math.floor(Math.random() * transferDescriptions.length)];
    }
  
    for (let i = 0; i < count; i++) {
      const transType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const randomDate = new Date(start.getTime() + Math.random() * (end - start));
  
      // Weighted amount generation
      let amount;
      const weight = Math.random();
      if (weight < 0.3) amount = Math.floor(Math.random() * (200 - 20 + 1)) + 20;
      else if (weight < 0.8) amount = Math.floor(Math.random() * (15000 - 1000 + 1)) + 1000;
      else amount = Math.floor(Math.random() * (150000 - 25000 + 1)) + 25000;
  
      const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]/gi, "");
      const description = getDescriptionForType(
        transType === 'Withdraw' ? 'Debit' 
        : transType === 'Deposit' ? 'Deposit' 
        : transType === 'Credit' ? 'Credit' 
        : 'Transfer'
      );
  
      const bank = realBanks[Math.floor(Math.random() * realBanks.length)];
      const receiverName = faker.person.fullName();
      const receiverAccount = faker.finance.accountNumber(10);
      const swift = faker.finance.bic();
  
      let newBalance = balance;
  
      // Adjust balance based on transaction type
      if (['Credit', 'Deposit'].includes(transType)) newBalance += amount;
      else {
        if (balance < amount) continue; // skip if insufficient balance
        newBalance -= amount;
      }
  
      // --- Fix: Correctly assign sender/receiver ---
      const isInflow = ['Credit', 'Deposit'].includes(transType);
      let senderAccountNumber, senderAccountName, receiverAccountNumber, receiverAccountName, bankFrom, bankTo;
  
      if (isInflow) {
        // Money coming IN
        senderAccountNumber = receiverAccount;
        senderAccountName = receiverName;
        receiverAccountNumber = targetAccount.accountNumber;
        receiverAccountName = `${user.firstname} ${user.lastname}`;
        bankFrom = bank;
        bankTo = currentBankName;
      } else {
        // Money going OUT
        senderAccountNumber = targetAccount.accountNumber;
        senderAccountName = `${user.firstname} ${user.lastname}`;
        receiverAccountNumber = receiverAccount;
        receiverAccountName = receiverName;
        bankFrom = currentBankName;
        bankTo = bank;
      }
  
      const transaction = new Transaction({
        userId: user._id,
        refCode: ref,
        amount,
        date: randomDate,
        transactionType: transType === 'Withdraw' ? 'Debit' 
                        : transType === 'Deposit' ? 'Deposit' 
                        : transType === 'Credit' ? 'Credit' 
                        : 'Transfer',
        transferType: ['Intra-Bank', 'Inter-Bank', 'Wire'].includes(transType) ? transType : undefined,
        status: 'Successful',
        description,
        senderAccountNumber,
        senderAccountName,
        receiverAccountNumber,
        receiverAccountName,
        bankFrom,
        bankTo,
        receiverCountry: transType === 'Wire' ? faker.location.country() : undefined,
        swiftcode: transType === 'Wire' ? swift : undefined,
        targetaccount: targetAccount,
        validateUser: user,
        wasGenerated: true,
        newBalance
      });
  
      await transaction.save();
      user.transactions.push(transaction);
      balance = newBalance;
    }
  
    // Update final account balance
    await targetAccount.updateOne({ accountWallet: endBal }, { runValidators: true, new: true });
    await user.save();
  
    req.flash('success', 'Bulk transaction history generated!');
    res.redirect(`/admin/admin.user/${req.params.id}`);
});

const corporateReceivers = [
  { name: "RigSupply Co.", bank: "JPMorgan Chase Bank", accountNumber: "4839201745", country: "United States" },
  { name: "Powervolt LLC", bank: "Bank of America", accountNumber: "7726104591", country: "United States" },
  { name: "Boltsafe Industries", bank: "Wells Fargo Bank", accountNumber: "6193840276", country: "United States" },
  { name: "MarineTech Systems", bank: "Citibank N.A.", accountNumber: "5048173920", country: "United States" },
  { name: "Offshore Safety Inc", bank: "PNC Bank", accountNumber: "3384927105", country: "United States" },
  { name: "Drillmaster Corp", bank: "U.S. Bank", accountNumber: "9021746384", country: "United States" },
  { name: "LiftRig Solutions", bank: "Truist Bank", accountNumber: "6612093847", country: "United States" },
  { name: "Atlas Engineering", bank: "Goldman Sachs Bank USA", accountNumber: "7804519263", country: "United States" },
  { name: "IronCore Rentals", bank: "Morgan Stanley Bank", accountNumber: "4598021736", country: "United States" },
  { name: "DeepSea Mechanics", bank: "Capital One", accountNumber: "2849176053", country: "United States" },
  { name: "BlueWave Marine", bank: "HSBC Bank USA", accountNumber: "9173604285", country: "United States" },
  { name: "Precision Torque Ltd", bank: "TD Bank USA", accountNumber: "6305187492", country: "United States" },
  { name: "Summit Industrial", bank: "Fifth Third Bank", accountNumber: "7512096834", country: "United States" },
  { name: "Apex Field Services", bank: "KeyBank", accountNumber: "4689301752", country: "United States" },
  { name: "RedRock Energy Tools", bank: "BMO Harris Bank", accountNumber: "3951078426", country: "United States" },
  { name: "Titan Mechanical", bank: "Regions Bank", accountNumber: "8204639175", country: "United States" },
  { name: "Northshore Engineering", bank: "Citizens Bank", accountNumber: "5409172863", country: "United States" },
  { name: "HydroWorks USA", bank: "Silicon Valley Bank", accountNumber: "6914827503", country: "United States" },
  { name: "Vector Offshore", bank: "First Republic Bank", accountNumber: "4379051628", country: "United States" },
  { name: "Prime Lifting Group", bank: "Comerica Bank", accountNumber: "8623094175", country: "United States" },
  { name: "Steelpoint Services", bank: "M&T Bank", accountNumber: "5197402863", country: "United States" },
  { name: "Nautilus Safety", bank: "Huntington National Bank", accountNumber: "7048162953", country: "United States" },
  { name: "Coredrill Americas", bank: "SunTrust (Truist)", accountNumber: "6681204937", country: "United States" },

  // 🇨🇦 Canada
  { name: "MapleCore Industrial", bank: "Royal Bank of Canada", accountNumber: "00481927561", country: "Canada" },
  { name: "Northern Rigging Ltd", bank: "Toronto-Dominion Bank", accountNumber: "78150946238", country: "Canada" },
  { name: "Polar Engineering Group", bank: "Bank of Montreal", accountNumber: "63902741895", country: "Canada" },

  // 🇩🇪 Germany
  { name: "RheinMach Technik", bank: "Deutsche Bank", accountNumber: "340918276540", country: "Germany" },
  { name: "Bavaria Offshore GmbH", bank: "Commerzbank", accountNumber: "518902743661", country: "Germany" },
];


const receiverPattern = [
  0, 1, 2, 3, 4,
  5, 5,
  6, 6, 6,
  7,
  8, 8,
  9,
  10,
  11, 11,
  12,
  13, 13,
  14,
  15, 15, 15,
];


const engineeringTransactions = [
  { date: "2025-11-05", vendor: "RigSupply Co.", item: "Hydraulic Torque Wrench", amount: 24000, note: "Parallel flange bolting operations" },
  { date: "2025-11-05", vendor: "PetroTools", item: "Heavy-Duty Impact Wrench", amount: 12000, note: "Distributed to maintenance teams" },
  { date: "2025-11-09", vendor: "BoltSafe", item: "Anti-Seize Compound (5L)", amount: 1425, note: "Corrosion prevention during shutdown" },
  { date: "2025-11-09", vendor: "MarineTech", item: "Digital Vernier Caliper", amount: 1440, note: "Precision shaft measurement" },
  { date: "2025-11-15", vendor: "Offshore Safety Inc", item: "Multi-Gas Detector", amount: 6500, note: "Platform-wide gas detection" },
  { date: "2025-11-15", vendor: "DrillMaster", item: "Carbide Drill Bit Set", amount: 3150, note: "High-wear drilling tasks" },
  { date: "2025-11-21", vendor: "LiftRig Solutions", item: "Chain Hoist (5-Ton)", amount: 19500, note: "Simultaneous lifting jobs" },
  { date: "2025-12-02", vendor: "PowerVolt", item: "Insulated Electrical Tool Kit", amount: 14800, note: "Electrical safety compliance" },
  { date: "2025-12-02", vendor: "WeldPro", item: "Portable Arc Welding Machine", amount: 19500, note: "Offshore welding redundancy" },
  { date: "2025-12-03", vendor: "SeaFasteners", item: "High-Tensile Bolts (M20)", amount: 17400, note: "Large flange replacement" },
  { date: "2025-12-03", vendor: "TorqueCheck", item: "Digital Torque Tester", amount: 10500, note: "Tool verification" },
  { date: "2025-12-06", vendor: "HydroFlow", item: "Pressure Test Pump", amount: 13750, note: "Pipeline pressure testing" },
  { date: "2025-12-06", vendor: "CleanRig", item: "Industrial Degreaser (20L)", amount: 1200, note: "Equipment cleaning" },
  { date: "2025-12-06", vendor: "VibraTech", item: "Vibration Analyzer", amount: 31000, note: "Predictive maintenance" },
  { date: "2025-12-08", vendor: "InspectPro", item: "Industrial Borescope Camera", amount: 26400, note: "Internal pipe inspections" },
  { date: "2025-12-08", vendor: "FlameSafe", item: "Fire-Resistant Tool Bags", amount: 2400, note: "Fire-zone tool protection" },
  { date: "2025-12-09", vendor: "HydroSeal", item: "Mechanical Seal Kit", amount: 9800, note: "Pump overhaul stock" },
  { date: "2025-12-09", vendor: "CutMaster", item: "Hydraulic Pipe Cutter", amount: 12250, note: "Pipe modification work" },
  { date: "2025-12-11", vendor: "SpareCore", item: "Bearing Replacement Kit", amount: 11100, note: "Rotating equipment repairs" },
  { date: "2025-12-11", vendor: "MarineTech", item: "Dial Indicator Set", amount: 2600, note: "Alignment accuracy" },
  { date: "2025-12-12", vendor: "PowerAir", item: "Pneumatic Ratchet", amount: 8900, note: "Confined-space fastening" },
  { date: "2025-12-12", vendor: "HoseSafe", item: "High-Pressure Hose Assembly", amount: 6450, note: "Hydraulic renewal" },
  { date: "2025-12-14", vendor: "SealTech", item: "O-Ring Assortment Kit", amount: 1125, note: "Valve sealing" },
  { date: "2025-12-14", vendor: "ToolArmor", item: "Anti-Spark Hand Tools Set", amount: 13000, note: "Explosive-zone safety" },
  { date: "2025-12-15", vendor: "SteelPro", item: "Heavy-Duty Socket Set", amount: 5400, note: "Large fasteners" },
  { date: "2025-12-15", vendor: "CoolFlow", item: "Industrial Cooling Fan", amount: 6240, note: "Heat control" },
  { date: "2025-12-17", vendor: "AlignPro", item: "Laser Shaft Alignment Tool", amount: 27000, note: "Precision alignment" },
  { date: "2025-12-17", vendor: "SafeStep", item: "Non-Slip Deck Tools", amount: 3100, note: "Wet deck safety" },
  { date: "2025-12-19", vendor: "PipeMaster", item: "Pipe Threading Machine", amount: 16000, note: "On-site fabrication" },
  { date: "2025-12-19", vendor: "VoltGuard", item: "Insulation Resistance Tester", amount: 17200, note: "Motor diagnostics" },
  { date: "2026-01-03", vendor: "WeldPro", item: "Low-Hydrogen Welding Rods", amount: 4250, note: "Structural welding" },
  { date: "2026-01-03", vendor: "TorqueMax", item: "Manual Torque Wrench", amount: 7200, note: "General bolting" },
  { date: "2026-01-04", vendor: "InspectPro", item: "Ultrasonic Thickness Gauge", amount: 24500, note: "Corrosion monitoring" },
  { date: "2026-01-04", vendor: "OilSafe", item: "High-Pressure Grease Gun", amount: 2100, note: "Bearing lubrication" },
  { date: "2026-01-06", vendor: "CleanRig", item: "Absorbent Spill Pads", amount: 2850, note: "Spill response" },
  { date: "2026-01-06", vendor: "FastenAll", item: "Stud Tensioning System", amount: 39000, note: "Critical joints" },
  { date: "2026-01-07", vendor: "HeatShield", item: "Thermal Gloves", amount: 3250, note: "High-temp handling" },
  { date: "2026-01-07", vendor: "LiftRig Solutions", item: "Beam Clamp", amount: 5400, note: "Temporary lifting" },
  { date: "2026-01-08", vendor: "PowerVolt", item: "Portable Generator", amount: 21500, note: "Backup power" },
  { date: "2026-01-08", vendor: "ValveTech", item: "Valve Lapping Tool", amount: 14500, note: "Valve restoration" },
  { date: "2026-01-10", vendor: "DrillMaster", item: "Magnetic Drill Press", amount: 19250, note: "Structural drilling" },
  { date: "2026-01-10", vendor: "SafeLock", item: "Lockout/Tagout Kit", amount: 6300, note: "Energy isolation" },
  { date: "2026-01-11", vendor: "AlignPro", item: "Feeler Gauge Set", amount: 1100, note: "Clearance checks" },
  { date: "2026-01-11", vendor: "RustGuard", item: "Corrosion Protection Coating", amount: 2700, note: "Asset protection" },
  { date: "2026-01-12", vendor: "MarineTech", item: "Heavy-Duty Work Lights", amount: 3100, note: "Night maintenance" },
  { date: "2026-01-12", vendor: "TorqueCheck", item: "Calibration Weights Set", amount: 12000, note: "Tool accuracy" },
  { date: "2026-01-13", vendor: "HydroFlow", item: "Pressure Relief Valve Kit", amount: 11500, note: "Safety systems" },
  { date: "2026-01-13", vendor: "InspectPro", item: "Endoscope Camera", amount: 22000, note: "Vessel inspection" },
  { date: "2026-01-14", vendor: "SteelPro", item: "Industrial Pry Bar Set", amount: 2850, note: "Heavy positioning" },
  { date: "2026-01-14", vendor: "SafeWear", item: "Flame-Resistant Coveralls", amount: 6300, note: "PPE refresh" },
];

router.post("/admin/admin.user/:id/generate-engineering-debits", isAdminLoggedIn, onlyAdmin, async (req, res) => {
  const user = await Users.findById(req.params.id);
  const { account } = req.body;
  const targetAccount = await Account.findById(account);

  let patternIndex = 0;

  for (const entry of engineeringTransactions) {
    const receiver = corporateReceivers[patternIndex % corporateReceivers.length];

    // Determine transfer type: mostly Inter-Bank, few Wire
    let transferType = "Inter-Bank";
    let receiverCountry, swiftcode;

    if (receiver.country !== "United States" && Math.random() < 0.1) {
      transferType = "Wire";
      receiverCountry = receiver.country;
      swiftcode = faker.finance.bic();
    }

    // --- Generate unique time between 10:25 AM and 4:37 PM ---
    const entryDate = new Date(entry.date);
    const startTime = new Date(entryDate);
    startTime.setHours(10, 25, 0, 0); // 10:25 AM
    const endTime = new Date(entryDate);
    endTime.setHours(16, 37, 0, 0);   // 4:37 PM

    // Random time in milliseconds within range
    const randomMs = Math.floor(Math.random() * (endTime - startTime));
    const transactionTime = new Date(startTime.getTime() + randomMs);

    // --- Ensure no duplicate times ---
    // Keep a set of used timestamps per day
    if (!user._usedTransactionTimes) user._usedTransactionTimes = new Set();
    let uniqueTime = transactionTime.getTime();
    while (user._usedTransactionTimes.has(uniqueTime)) {
      // add 1 second until unique
      uniqueTime += 1000;
    }
    user._usedTransactionTimes.add(uniqueTime);
    const finalTransactionDate = new Date(uniqueTime);

    const transaction = new Transaction({
      userId: user._id,
      refCode: crypto.randomBytes(4).toString("hex"),
      amount: entry.amount,
      date: finalTransactionDate,

      transactionType: "Transfer",
      transferType,
      status: "Successful",

      description: `${entry.vendor} – ${entry.item}. ${entry.note}`,

      senderAccountNumber: targetAccount.accountNumber,
      senderAccountName: `${user.firstname} ${user.lastname}`,

      receiverAccountNumber: faker.finance.accountNumber(10),
      receiverAccountName: receiver.name,

      bankFrom: currentBankName,
      bankTo: receiver.bank,

      receiverCountry,
      swiftcode,

      targetaccount: targetAccount,
      validateUser: user,
      wasGenerated: true
    });

    await transaction.save();
    user.transactions.push(transaction);
    patternIndex++;
  }

  delete user._usedTransactionTimes; // cleanup helper
  await user.save();
  req.flash("success", "Engineering debit transactions generated with unique times!");
  res.redirect(`/admin/admin.user/${req.params.id}`);
});


router.get('/admin/admin.user/:id/transaction-history', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const user = await Users.findById(req.params.id);
    const admin = await Users.findById(req.user.id)
    const transactions = await Transaction.find({validateUser: user}).sort({date: -1})
res.render("admin/transactionhistory", {user, transactions, admin})
});

router.get('/admin/admin.user/:id/transaction/:transactionId', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const {id, transactionId} = req.params
    const user = await Users.findById(id)
    const transaction = await Transaction.findById(transactionId);
res.render("admin/receipt", {user, transaction, admin})
})

router.get('/admin/admin.user/:id/delete-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const user = await Users.findById(req.params.id).populate({path: 'transactions', options: { sort: {date: -1 } } });
    const transactions = await Transaction.find({validateUser: user}).sort({date: -1})
    res.render('admin/deleteusertransactions', {admin, transactions, user});
});

router.post('/admin/admin.user/:id/delete-transactions', async (req, res) => {
    const user = await Users.findById(req.params.id).populate({path: 'transactions', options: { sort: {_id: -1 } } });
    let selectedData = req.body.selectedData;  // Change 'const' to 'let' here

    try {
        if (!Array.isArray(selectedData)) {
            selectedData = [selectedData]; // Ensure selectedData is always an array
        }

        if (selectedData.length > 0) {
            // Filter out invalid ObjectIds before attempting deletion
            const dataIdsToDelete = selectedData
                .filter(id => ObjectId.isValid(id)) // Only include valid ObjectId strings
                .map(id => new ObjectId(id));

            if (dataIdsToDelete.length > 0) {
                // Log the dataIdsToDelete to debug
                console.log('Attempting to delete data with IDs:', dataIdsToDelete);

                // Delete selected users from MongoDB
                const result = await Transaction.deleteMany({ _id: { $in: dataIdsToDelete } });

                if (result.deletedCount > 0) {
                    req.flash('success', 'Data deleted!');
                    return res.redirect(`/admin/admin.user/${user.id}/delete-transactions`); // Redirect to user list page after deletion
                } else {
                    req.flash('error', 'No users were deleted. Please check the selected users.');
                    return res.redirect(`/admin/admin.user/${user.id}/delete-transactions`);
                }
            } else {
                req.flash('error', 'No valid data IDs selected!');
                return res.redirect(`/admin/admin.user/${user.id}/delete-transactions`); // Handle invalid IDs
            }
        } else {
            req.flash('error', 'No data selected!');
            return res.redirect(`/admin/admin.user/${user.id}/delete-transactions`); // Handle case when no users are selected
        }
    } catch (error) {
        console.error('Error details:', error);  // Log the full error object
        req.flash('error', 'An error occurred while deleting data!');
        return res.redirect(`/admin/admin.user/${user.id}/delete-transactions`);
    }
});

router.get('/admin/admin.user/:id/cards', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const user = await Users.findById(req.params.id).populate({path: 'card', options: { sort: { 'dateAdded': -1 } } });
    const admin = await Users.findById(req.user.id)
    const cards = await Card.find({validateUser: user}).sort({dateAdded: 1})
res.render("admin/usercards", {user, cards, admin})
});

router.post('/admin/admin.user/:id/card', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const user = await Users.findById(id)
        const today = new Date();
        const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
        const time = hours + ":" + today.getMinutes() + ":" + today.getSeconds();
        const ampm = today.getHours() >= 12 ? 'PM' : 'AM';
        const dateTime = date+' '+time+ ' ' + ampm;
    const {cardBrand, cardType, cardNumber, bankName, cvv, cardPin, cardExpiryMonth, cardExpiryYear, userName} = req.body;
    const newCard = new Card({cardBrand, cardType, cardNumber, bankName, cvv, cardPin, cardExpiryMonth, cardExpiryYear, validateUser: user, dateAdded: dateTime, userId: user.id, userName, userEmail: user.email});
    user.card.push(newCard);
    await newCard.save();
    await user.save()
    req.flash('success', 'Success!')
    res.redirect(`/admin/admin.user/${user.id}/cards`)
});

router.delete('/admin/admin.user/:userId/delete-card/:cardId', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const  {userId, cardId}  = req.params;
    await Card.findByIdAndDelete(cardId);
    req.flash('success', 'Card Deleted!')
    res.redirect(`/admin/admin.user/${userId}/cards`)
});

router.get('/admin/admin.user/:id/investments', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const user = await Users.findById(req.params.id);
    const admin = await Users.findById(req.user.id)
    const investments = await Investment.find({validateUser: user}).sort({date: -1})
res.render("admin/user-investments", {user, investments, admin})
});

router.get('/admin/admin.user/:id/notifications', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const user = await Users.findById(req.params.id);
    const admin = await Users.findById(req.user.id)
    const notifications = await Notification.find({validateUser: user}).sort({date: -1})
res.render("admin/user-notifications", {user, notifications, admin})
});

router.get('/admin/admin.cards', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const cards = await Card.find({}).sort({dateAdded: 1})
res.render("admin/cards", {cards, admin})
});

router.delete('/admin/admin.card/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.params.id;
    await Card.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted card!')
    res.redirect(`/admin/admin.cards`);
});

router.get('/admin/admin.verification-requests', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const users = await Users.find({role: 'user', verificationstatus: 'Pending'});
    res.render('admin/verificationrequest', {users, admin});
});

router.get('/admin/admin.verification-requests/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const user = await Users.findById(req.params.id);
    res.render('admin/showverificationrequest', {user, admin});
});

router.put('/admin/admin.verification-requests/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id; 
    const user = await Users.findByIdAndUpdate(id, {verificationstatus: 'Verified', accountStatus: 'Active'}, { runValidators: true, new: true });
    console.log(user);
    const subject = 'ACCOUNT VERIFIED';
    await acctVerifiedMail(user.email, subject, user.firstname);
    req.flash('success', 'Successfully Verified User!')
    res.redirect(`/admin/admin.verification-requests/${req.params.id}`)
});

router.put('/admin/admin.verification-requests/:id/decline', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id; 
    const user = await Users.findByIdAndUpdate(id, {verificationStatus: 'Not Verified', accountStatus: 'Not Active'}, { runValidators: true, new: true });
    req.flash('success', 'Verification declined!')
    res.redirect(`/admin/admin.verification-requests/${req.params.id}`)
});

router.get('/admin/admin.pending-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const users = await Users.find({role: 'user'}).populate({path: 'transactions', options: { sort: { 'date': -1 } } });
    const pendingTrans = await Transaction.find({status: 'Pending'}).sort({'date': -1});
    res.render('admin/pendingtransactions', {users, admin, pendingTrans});
});

router.get('/admin/admin.approved-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const users = await Users.find({role: 'user'}).populate({path: 'transactions', options: { sort: { 'date': -1 } } });
    const approvedTrans = await Transaction.find({status: 'Successful'}).sort({'date': -1});
    res.render('admin/approvedtransactions', {admin, approvedTrans, users});
});

router.get('/admin/admin.declined-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const users = await Users.find({role: 'user'}).populate({path: 'transactions', options: { sort: { 'date': -1 } } });
    const declinedTrans = await Transaction.find({status: 'Unsuccessful'}).sort({'date': -1});
    res.render('admin/declinedtransactions', {admin, declinedTrans, users});
});

router.get('/admin/admin.delete-transactions', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id)
    const users = await Users.find({role: 'user'}).populate({path: 'transactions', options: { sort: {_id: -1 } } });
    // const transactions = await Transaction.find({}).sort({'date': -1});
    const transactions = await Transaction.find({}).sort({_id: -1});
    res.render('admin/deletetransactions', {admin, transactions, users});
});

router.post('/admin/admin.delete-transactions', async (req, res) => {
    let selectedData = req.body.selectedData;  // Change 'const' to 'let' here

    try {
        if (!Array.isArray(selectedData)) {
            selectedData = [selectedData]; // Ensure selectedData is always an array
        }

        if (selectedData.length > 0) {
            // Filter out invalid ObjectIds before attempting deletion
            const dataIdsToDelete = selectedData
                .filter(id => ObjectId.isValid(id)) // Only include valid ObjectId strings
                .map(id => new ObjectId(id));

            if (dataIdsToDelete.length > 0) {
                // Log the dataIdsToDelete to debug
                console.log('Attempting to delete data with IDs:', dataIdsToDelete);

                // Delete selected users from MongoDB
                const result = await Transaction.deleteMany({ _id: { $in: dataIdsToDelete } });

                if (result.deletedCount > 0) {
                    req.flash('success', 'Data deleted!');
                    return res.redirect('/admin/admin.delete-transactions'); // Redirect to user list page after deletion
                } else {
                    req.flash('error', 'No users were deleted. Please check the selected users.');
                    return res.redirect('/admin/admin.delete-transactions');
                }
            } else {
                req.flash('error', 'No valid data IDs selected!');
                return res.redirect('/admin/admin.delete-transactions'); // Handle invalid IDs
            }
        } else {
            req.flash('error', 'No data selected!');
            return res.redirect('/admin/admin.delete-transactions'); // Handle case when no users are selected
        }
    } catch (error) {
        console.error('Error details:', error);  // Log the full error object
        req.flash('error', 'An error occurred while deleting data!');
        return res.redirect('/admin/admin.delete-transactions');
    }
});



router.get('/admin/:id/admin.receipt', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.user.id
    const transactionId = req.params.id;
    const admin = await Users.findById(id)
    const transaction = await Transaction.findById(transactionId);
    const user = await Users.findById(transaction.userId)
    
res.render("admin/receipt", {admin, transaction, user})
})

router.put('/admin/admin.transaction/:id/approve', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.params.id;
    const transaction = await Transaction.findByIdAndUpdate(id, { status: 'Successful' }, { runValidators: true, new: true });

    if (transaction.transactionType === 'Transfer') {
        const account = await Account.findById(transaction.targetaccount);
        if (account) {
            await account.updateOne({ accountWallet: account.accountWallet - transaction.amount });
        }
    }

    req.flash('success', 'Transaction approved!');
    res.redirect(`/admin/${id}/admin.receipt`);
});

router.put('/admin/admin.transaction/:id/decline', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const id = req.params.id;
    const transaction = await Transaction.findByIdAndUpdate(id, { status: 'Unsuccessful' }, { runValidators: true, new: true });
    req.flash('success', 'Transaction declined.');
    res.redirect(`/admin/${id}/admin.receipt`);
});


// ACCOUNT PLANS CONTROL//
router.get('/admin/admin.upgrade-plans', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const plans = await Plans.find({planType: 'Account Upgrade'}).sort({duration: 1});
    res.render('admin/upgradeplans', {admin, plans});
});

router.post('/admin/admin.upgrade-plans',isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id  = req.user.id;
    const admin = await Users.findById(id);
    const {name, amount, description} = req.body;
    const plans = new Plans({planType: 'Account Upgrade', name, amount, description});
    await plans.save()
    req.flash('success', 'Successfully added a new account upgrade plan.')
    res.redirect('/admin/admin.upgrade-plans');
});

router.put('/admin/admin.upgrade-plans/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;    
    const plan = await Plans.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    req.flash('success', 'Successfully edited plan.')
    res.redirect('/admin/admin.upgrade-plans')
});

router.delete('/admin/admin.upgrade-plans/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const  id  = req.params.id;
    await Plans.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted plan..')
    res.redirect('/admin/admin.upgrade-plans')
});

router.get('/admin/admin.investment-plans', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const plans = await Plans.find({planType: 'Investment'}).sort({duration: 1});
    res.render('admin/investmentplan', {admin, plans});
});

router.post('/admin/admin.investment-plans',isAdminLoggedIn, onlyAdmin, upload.array('image'), async(req, res) => {
    const id  = req.user.id;
    const admin = await Users.findById(id);
    const {name, minamount, maxamount, duration, roi, image} = req.body;
    const plans = new Plans({planType: 'Investment', name, minamount, maxamount, duration, roi, image});
    plans.image = req.files.map(f => ({url: f.path, filename: f.filename}))
    await plans.save()
    req.flash('success', 'Successfully added a new investment plan.')
    res.redirect('/admin/admin.investment-plans');
});

router.put('/admin/admin.investment-plans/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;    
    const plan = await Plans.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    req.flash('success', 'Successfully edited plan.')
    res.redirect('/admin/admin.investment-plans')
});

router.delete('/admin/admin.investment-plans/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const  id  = req.params.id;
    await Plans.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted plan..')
    res.redirect('/admin/admin.investment-plans')
});


router.get('/admin/admin.depositmethods', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const clients = await Users.find({role: 'user' });
    const deposits = await Depositmethods.find({});
    res.render('admin/depositmethod', {admin, clients, deposits});
});

router.post('/admin/admin.depositmethods',isAdminLoggedIn, onlyAdmin, upload.array('depositqrcode'), async(req, res) => {
    const id  = req.user.id;
    const admin = await Users.findById(id);
    const depositmethod = new Depositmethods(req.body);
    depositmethod.depositqrcode = req.files.map(f => ({url: f.path, filename: f.filename}));
    await depositmethod.save()
    req.flash('success', 'Successfully added a deposit method.')
    res.redirect('/admin/admin.depositmethods');
});

router.put('/admin/admin.depositmethods/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const id = req.params.id;
    const {depositmethodname, depositaddress} = req.body;
    const depositmethod = await Depositmethods.findByIdAndUpdate(id, {depositmethodname, depositaddress}, { runValidators: true, new: true });
    // depositmethod.depositqrcode = req.files.map(f => ({url: f.path, filename: f.filename}));
    await depositmethod.save()
    req.flash('success', 'Successfully updated deposit method.')
    res.redirect('/admin/admin.depositmethods')
});

router.delete('/admin/admin.depositmethods/:id', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const  id  = req.params.id;
    await Depositmethods.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted deposit method!')
    res.redirect('/admin/admin.depositmethods')
});


router.get('/admin/admin.deposit-history', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const clients = await Users.find({role: 'user' });
     const deposits = await CryptoTransaction.find({transactionType: 'Deposit', paymentstatus: 'Completed'});
    const upgradefee = await CryptoTransaction.find({transactionType: 'Upgrade Fee', paymentstatus: 'Completed'});
    res.render('admin/deposithistory', {admin, clients, deposits, upgradefee});
});


router.get('/admin/admin.deposit-requests', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const clients = await Users.find({role: 'user' }).populate({path: 'cryptotransactions', options: { sort: { 'transactiondate': -1 } } });
    const deposits = await CryptoTransaction.find({status: 'Pending', transactionType: 'Deposit', paymentstatus: 'Completed'});
    const upgradefee = await CryptoTransaction.find({status: 'Pending', transactionType: 'Upgrade Fee', paymentstatus: 'Completed'});
    res.render('admin/deposit', {admin, clients, deposits, upgradefee});
});

router.get('/admin/admin.view-deposit/:id', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    // const clients = await Users.find({role: 'user' }).populate({path: 'transaction', options: { sort: { 'transactiondate': -1 } } });
    const deposit = await CryptoTransaction.findById(req.params.id);
    const depositor = await Users.findById(deposit.validateUser);
    res.render('admin/depositview', {admin, deposit, depositor});
});

// UPDATED: Verify deposit — credits the account stored on the CryptoTransaction
router.put('/admin/admin.deposit-req/:id/verify/:depositid', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { id, depositid } = req.params;
    const today = new Date();

    const deposit = await CryptoTransaction.findByIdAndUpdate(
        depositid, { status: 'Successful' }, { runValidators: true, new: true }
    );
    const client = await Users.findById(id);

    // Use the account saved on the deposit record; fall back to default account
    let targetAccount;
    if (deposit.targetaccount) {
        targetAccount = await Account.findById(deposit.targetaccount);
    }
    if (!targetAccount) {
        targetAccount = await Account.findOne({ accountOwner: client._id, isDefault: true });
    }

    if (!targetAccount) {
        req.flash('error', 'Could not find an account to credit. Please check the user has an account.');
        return res.redirect('/admin/admin.deposit-requests');
    }

    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]/gi, "");
    const newTransaction = new Transaction({
        userId: client._id,
        refCode: ref,
        amount: deposit.amount,
        date: today,
        transactionType: 'Deposit',
        status: 'Successful',
        validateUser: client._id,
        targetaccount: targetAccount._id,
        newBalance: targetAccount.accountWallet + parseFloat(deposit.amount)
    });

    await newTransaction.save();
    await targetAccount.updateOne({ accountWallet: targetAccount.accountWallet + parseFloat(deposit.amount) });
    await Users.findByIdAndUpdate(client._id, { $push: { transactions: newTransaction._id } });

    req.flash('success', 'Deposit confirmed and account credited!');
    res.redirect('/admin/admin.deposit-requests');
});

router.put('/admin/admin.deposit-req/:id/decline/:depositid', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const { id, depositid } = req.params; 
    const client = await Users.findById(id);
    const deposit = await CryptoTransaction.findByIdAndUpdate(depositid, {status: 'Unsuccessful'}, { runValidators: true, new: true });

    req.flash('success', 'Deposit Declined!')
    res.redirect('/admin/admin.deposit-requests')
});

router.put('/admin/upgrade-account/:id/verify/:depositid', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const { id, depositid } = req.params; 
    const deposit = await CryptoTransaction.findByIdAndUpdate(depositid, {status: 'Successful'}, { runValidators: true, new: true });
    const client = await Users.findByIdAndUpdate(id, {accountType: deposit.narration}, { runValidators: true, new: true });
    const subject = 'ACCOUNT UPGRADE';
    await acctUpgradeMail(client.email, subject, client.firstname, client.accountType);
    req.flash('success', 'Payment confirmed and account has been upgraded!')
    res.redirect('/admin/admin.deposit-requests')
});


router.get('/admin/admin.active-investments', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const clients = await Users.find({role: 'user' }).populate({path: 'investment', options: { sort: { 'startDate': -1 } } });
    const activeinvestments = await Investment.find({status: 'Active'}).sort({startDate: -1});
    const inactiveinvestments = await Investment.find({status: 'Completed'}).sort({startDate: -1});
    res.render('admin/investment', {admin, clients, activeinvestments, inactiveinvestments });
});

router.get('/admin/admin.inactive-investments', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    const clients = await Users.find({role: 'user' }).populate({path: 'investment', options: { sort: { 'startDate': -1 } } });
    const activeinvestments = await Investment.find({status: 'Active'}).sort({'startDate': -1});
    const inactiveinvestments = await Investment.find({status: 'Completed'}).sort({'startDate': -1});
    res.render('admin/closedinvestment', {admin, clients, activeinvestments, inactiveinvestments });
});

router.get('/admin/admin.investment/:id/:investmentid', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const { id, investmentid } = req.params; 
    const admin = await Users.findById(req.user.id);
    const client = await Users.findById(id).populate('investment');
    const investment = await Investment.findById(investmentid);  
    res.render('admin/investment-show', {admin, client, investment});
});

router.put('/admin/admin.investment/:id/:investmentid/increase', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const { id, investmentid } = req.params;   
    const {addprofits} = req.body;
    const client = await Users.findById(id).populate('investment');
    const investment = await Investment.findById(investmentid);
    const profits = parseFloat(addprofits)
    await investment.updateOne({investmentprofit: investment.investmentprofit + profits }, { runValidators: true, new: true });
    req.flash('success', `Successfully added ${profits} USD.`)
    res.redirect(`/admin/admin.investment/${client.id}/${investment.id}`)
});


router.get('/admin/admin.user/:id/statement', isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const user = await Users.findById(req.params.id).lean();
    const allaccounts = await Account.find({ accountOwner: user }).lean();

    const fromDate = req.query.from ? new Date(req.query.from) : new Date('2000-01-01');
    const toDate = req.query.to ? new Date(req.query.to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
        validateUser: user._id,
        date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: -1 }).lean();

    const totalBalance = allaccounts.reduce((sum, a) => sum + parseFloat(a.accountWallet || 0), 0);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statement-${user.accountNumber}.pdf"`);
    doc.pipe(res);

    // Reuse the exact same PDF rendering logic as the user route above
    doc.fontSize(20).font('Helvetica-Bold').text('Account Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(11).font('Helvetica-Bold').text('Account Holder');
    doc.font('Helvetica').fontSize(10)
        .text(`Name: ${user.firstname} ${user.lastname}`)
        .text(`Email: ${user.email}`)
        .text(`Account Number: ${user.accountNumber}`)
        .text(`Routing Number: ${user.routingNumber}`)
        .text(`Total Balance: ${user.basecurrencysymbol || '$'}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .text(`Period: ${fromDate.toDateString()} – ${toDate.toDateString()}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#aaaaaa').stroke();
    doc.moveDown(0.5);

    const col = { date: 50, type: 145, description: 230, ref: 360, amount: 455, status: 500 };
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', col.date, doc.y, { width: 90 });
    doc.text('Type', col.type, doc.y - doc.currentLineHeight(), { width: 80 });
    doc.text('Description', col.description, doc.y - doc.currentLineHeight(), { width: 125 });
    doc.text('Ref', col.ref, doc.y - doc.currentLineHeight(), { width: 90 });
    doc.text('Amount', col.amount, doc.y - doc.currentLineHeight(), { width: 60, align: 'right' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(8.5);
    if (transactions.length === 0) {
        doc.text('No transactions found for this period.', { align: 'center' });
    }

    for (const tx of transactions) {
        if (doc.y > 740) doc.addPage();
        const y = doc.y;
        const isCredit = ['Credit', 'Deposit'].includes(tx.transactionType);
        const amtColor = isCredit ? '#1aa36a' : '#cc3333';
        const amtPrefix = isCredit ? '+' : '-';
        const amt = `${amtPrefix}${user.basecurrencysymbol || '$'}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        const dateStr = tx.date ? new Date(tx.date).toLocaleDateString() : '—';
        const desc = (tx.description || tx.receiverAccountName || '—').substring(0, 30);

        doc.fillColor('#222222').text(dateStr, col.date, y, { width: 90 });
        doc.text(`${tx.transactionType}${tx.transferType ? '/' + tx.transferType : ''}`, col.type, y, { width: 80 });
        doc.text(desc, col.description, y, { width: 125 });
        doc.text(tx.refCode || '—', col.ref, y, { width: 90 });
        doc.fillColor(amtColor).text(amt, col.amount, y, { width: 60, align: 'right' });
        doc.fillColor('#888888').text(tx.status, col.status - 45, y, { width: 55, align: 'right' });
        doc.fillColor('#222222').moveDown(0.6);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').stroke();
        doc.moveDown(0.2);
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#aaaaaa').text('Auto-generated statement. Contact support for queries.', { align: 'center' });
    doc.end();
});


router.put('/admin/admin.investment/:id/:investmentid/endinvestment',  isAdminLoggedIn, onlyAdmin, async (req, res) => {
    const { id, investmentid } = req.params;  
    const client = await Users.findById(id);
    const investment = await Investment.findById(investmentid);
    const account = await Account.findById(investment.targetaccount);

    const totalprofit = parseFloat(investment.investmentprofit);

    await account.updateOne({accountWallet: account.accountWallet + totalprofit}, { runValidators: true, new: true });
    await investment.updateOne({status: 'Completed'}, { runValidators: true, new: true });
    // console.log(client + client.accountWallet)
    req.flash('success', `Successfully ended current investment.`)
    res.redirect(`/admin/admin.investment/${client.id}/${investment.id}`)
});

router.get('/admin/admin.send-mail', isAdminLoggedIn, onlyAdmin, async(req, res) => {
    const admin = await Users.findById(req.user.id);
    res.render('admin/mail', {admin});
});

  router.post('/admin/admin.send-mail', isAdminLoggedIn, onlyAdmin, upload.array('files'), async (req, res) => {
    const { email, subject, message } = req.body;
    const files = req.files; // Get the uploaded files (from Cloudinary)

    console.log("Received files: ", req.files);
    
    try {
            // Split by commas, trim whitespace, filter out empty entries
        const emailList = email.split(',')
            .map(e => e.trim())
            .filter(e => e);

        // Optional: validate each email format
        const invalidEmails = emailList.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        if (invalidEmails.length > 0) {
            req.flash('error', `Invalid email(s): ${invalidEmails.join(', ')}`);
            return res.redirect('/admin/admin.send-mail');
        }

        await customMail(emailList, subject, message, files); // Pass the files to customMail
        req.flash('success', `Email sent.`);
        res.redirect(`/admin/admin.send-mail`);

    } catch (error) {
        req.flash('error', `Error sending mail: ${error.message}`);
        res.redirect(`/admin/admin.send-mail`);
    }
});


router.get('/admin.logout', (req, res) => {
    req.logout();
    res.redirect('/secureadmin.login')
})

module.exports = router;