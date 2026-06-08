const express = require('express');
const router = express.Router();
const passport = require('passport');
const multer  = require('multer');
const { storage, cloudinary } = require('../cloudinary');
const upload = multer({ storage });
const bcrypt = require('bcryptjs');
const IP = require('ip');
const crypto = require("crypto");
const axios = require("axios");
const Recaptcha = require('express-recaptcha').RecaptchaV2;

const Users = require('../models/users');
const Account = require('../models/account');
const Notification = require('../models/notification');
const Card = require('../models/card');
const Loan = require('../models/loan');
const Investment = require('../models/investment');
const Plans = require('../models/plans');
const Tradetracker = require('../models/tradetracker');
const Depositmethods = require('../models/depositmethod');
const CryptoTransaction = require('../models/cryptotransaction');
const Transaction = require('../models/transaction');
const { getDateFromRange } = require('../utils/dateHelpers');
const {welcomeMail, depositMail, openInvestmentMail, transferMail, otpMail, emailActMail, passwordResetMail, verifyMail, acctVerifiedMail, endInvestmentMail} = require("../utils/sendEmail");
const { isValidPin, getPendingLockedAmount } = require('../utils/validators');
const { countriesList, currencyMapJSON } = require('../utils/countries');

const PDFDocument = require('pdfkit');

const isUserLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl; // Save the intended URL
        return res.redirect('/login')
    }
    next();
}

const isUser = async(req, res, next) => {
    const { email, password } = req.body;
    const user = await Users.findOne({email});
    if (!user) {
        req.flash('error', 'Incorrect Account Number or Password!')
        return res.redirect('/login');
    } else if (user.role !== 'user') {
        req.flash('error', 'You do not have permission to access this route!')
        return res.redirect('/login')
    }
    next();
}

const onlyUser = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    if (user.role !== 'user') {
        req.flash('error', 'You do not have permission to access this route!')
        return res.redirect('/')
    } 
    next();
}

const isUserVerified = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();

    if (user.verificationstatus !== 'Verified') {
        req.flash("error", "Your account is not yet verified, please confirm your identity to proceed.")
        return res.redirect('/user/kyc')
    } else if (user.accountStatus !== 'Active') {
        req.flash('error', 'Your account is currently not active. Contact support.')
        return res.redirect('/user/accountstatus')
    } 
    next();
}

const transferPinCheck = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    if (user.transferCode === undefined) {
        req.flash("error", "Set your transaction code to proceed.")
        return res.redirect('/user/security')
    } 
    next();
}

const validateInvestment = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    if (user.allowInvestments === 'No') {
        req.flash("error", "Your account is currently not eligible for this feature. Please contact your account manager.")
        return res.redirect('/user/investments')
    } 
    next();
}

const validateTransactions = async(req, res, next) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    if (user.allowTransactions === 'No') {
        req.flash("error", "Your account is currently not eligible for transactions. Please contact your account manager.")
        return res.redirect('/user/transactions')
    } 
    next();
}


// Helper function to get the start and end of the current month
// const getCurrentMonthRange = () => {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
//     return { startOfMonth, endOfMonth };
// };

const recaptcha = new Recaptcha('6LfYZCorAAAAACEDFju2KGwYQVWjGep-M0VSDzP0', '6LfYZCorAAAAABCn_9E3S828ABsN-cDnNElghmjl');


router.get('/register', async (req, res) => {
    res.render('user/register', {
        countries:       countriesList,   // array for <% countries.forEach(...) %>
        currencyMapJSON: currencyMapJSON  // JSON string embedded in <script>
    });
});


router.post('/register', recaptcha.middleware.verify, async (req, res, next) => {
    if (!req.recaptcha.error) {
        try {
            const random8Numbers = Math.floor(20000000 + Math.random() * 54890765);
            const random10Numbers = Math.floor(2000000000 + Math.random() * 54890765);
            const random9Numbers = Math.floor(100000000 + Math.random() * 900000000);

            const { accountType, email, firstname, lastname, middlename, country, basecurrency, basecurrencysymbol, employmentstatus, state, city, address, zipcode, gender, dob, phonenumber, password, confirmpassword } = req.body;
            
            // Check if the email already exists
            const existingUser = await Users.findOne({ email: email });
            if (existingUser) {
                req.flash('error', 'Email already in use. Please enter another email or sign in.');
                return res.redirect(`/register`);
            }

            // Ensure passwords match
            if (confirmpassword !== password) {
                req.flash('error', 'Password and Confirm Password do not match');
                return res.redirect('/register');
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            const user = new Users({
                email, firstname, lastname, middlename, phonenumber, country, basecurrency, 
                basecurrencysymbol, state, city, address, zipcode, gender, dob, employmentstatus, 
                password: hashedPassword, confirmpassword, 
                uid: random8Numbers, routingNumber: random9Numbers, accountNumber: random10Numbers,
            });

            // Save user
            await user.save();

            // Create default account
            const account = new Account({
                accountType, displayName: 'Primary Account', isDefault: true, accountNumber: random10Numbers, accountOwner: user
            });
            await account.save();

            // Link the account to the user
            user.accounts.push(account);
            await user.save();

            // Send Welcome email
            const subject = 'SIGNUP SUCCESS!';
            await welcomeMail(user.email, subject, user.firstname);

            // Log the user in
            req.login(user, err => {
                if (err) return next(err); // Pass error to the next middleware if exists
                
                req.flash('success', 'Welcome!!');
                return res.redirect('/dashboard'); // Ensure redirect to dashboard instead of register
            });

        } catch (e) {
            req.flash('error', e.message);
            return res.redirect('/register'); // Redirect back to registration if there's an error
        }
    } else {
        req.flash('error', 'CAPTCHA verification failed. Please try again.');
        return res.redirect('/register');
    }
});

router.get('/success/:id', async(req, res) => {
    const user = await Users.findById(req.params.id)
    res.render("user/signup-success", {user})
})

router.get('/login', async(req, res) => {
    res.render("user/login")
})

router.post('/login', isUser, passport.authenticate('userauth', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    const redirectTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo; // Clear session variable after redirection
    req.flash('success', 'Successfully Logged In!');
    res.redirect(redirectTo);
});



router.get('/dashboard', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const mainaccount = await Account.findOne({accountOwner: user, isDefault: true});
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
     // Calculate total balance
     const totalBalance = allaccounts.reduce((sum, account) => {
        return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
    }, 0);

    // Optional: format it
    const formattedBalance = totalBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const transactions = await Transaction.findOne({validateUser: user}).sort({date: -1});
    const recentransactions = await Transaction.find({validateUser: user}).sort({date: -1}).limit(5);

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()

    const range = req.query.range || '1m';
  const startDate = getDateFromRange(range);

//   const txs = await Transaction.find({
//     validateUser: user,
//     date: { $gte: startDate }
//   }).sort({ date: 1 }).limit(100);
  const txs = await Transaction.find({
        validateUser: user._id,   // ✅ use ID only
        date: { $gte: startDate }
    })
    .sort({ date: 1 })
    .limit(100)
    .lean();


  // Map DB types to display labels
  const TYPE_MAP = {
    Credit: 'Credit',
    Deposit: 'Deposit',
    Debit: 'Debit',
    Transfer: 'Transfer'   // <-- important fix
  };

  // group by YYYY-MM-DD and sum per display label
  const grouped = {};
  for (const tx of txs) {
    const day = tx.date.toISOString().split('T')[0];
    const label = TYPE_MAP[tx.transactionType] || tx.transactionType;

    if (!grouped[day]) {
      grouped[day] = { Credit: 0, Deposit: 0, Debit: 0, Transfer: 0 };
    }
    const amt = Number(tx.amount) || 0; // safe conversion
    grouped[day][label] += amt;
  }

  // stable, ascending labels
  const labels = Object.keys(grouped).sort();

  // consistent color palette
  const seriesOrder = ['Credit', 'Deposit', 'Debit', 'Transfer'];
  const colors = {
    Credit: 'rgba(27, 164, 255, 1)',
    Deposit: 'rgba(75, 192, 192, 1)',
    Debit: 'rgba(255, 159, 64, 1)',
    Transfer: 'rgba(255, 99, 132, 1)'
  };

  const datasets = seriesOrder.map(key => ({
    label: key,
    data: labels.map(d => grouped[d]?.[key] ?? 0),
    borderColor: colors[key],
    backgroundColor: colors[key],
    fill: false,
    tension: 0.3,
    pointRadius: 3
  }));

  const cashflowData = { labels, datasets };


    res.render("user/dashboard", {user, mainaccount, allaccounts, unreadmsg, ipAddress, totalBalance: formattedBalance, currentDate : today, transactions, recentransactions, cashflowData: JSON.stringify(cashflowData), selectedRange: range})
})

router.get('/user/my-accounts', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();

    const allaccounts = await Account.find({ accountOwner: user }).sort({ isDefault: -1, createdAt: -1 });

    const totalBalance = allaccounts.reduce((sum, a) => sum + parseFloat(a.accountWallet || 0), 0);
    const formattedBalance = totalBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const unreadmsg = await Notification.find({ validateUser: user, status: 'Unread' }).limit(10).lean();

    res.render('user/myaccounts', { user, allaccounts, totalBalance: formattedBalance, unreadmsg });
});

router.post('/user/create-account', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id; 
    const random10Numbers = Math.floor(2000000000 + Math.random() * 54890765);

    const {displayName, accountType} = req.body;
    const user = await Users.findById(id);

    const account = new Account({
        accountType, displayName, isDefault: false, accountNumber: random10Numbers, accountOwner: user
    });
    await account.save();
    user.accounts.push(account._id);
    await user.save();
    req.flash('success', 'Account created!')
    res.redirect('/user/my-accounts')
});

router.put('/user/edit-account/:id', isUserLoggedIn, onlyUser, async (req, res) => {
    const id = req.params.id; 
    const {displayName } = req.body;
    const account = await Account.findByIdAndUpdate(id, {displayName}, { runValidators: true, new: true })
    req.flash('success', 'Changes saved!')
    res.redirect('/user/my-accounts')
});

router.post('/user/fund-account', isUserLoggedIn, onlyUser, async (req, res) => {
    const { amount, accountTo, accountFrom } = req.body;
    const wallet = parseFloat(amount);

    if (!accountTo || !accountFrom || accountTo === accountFrom) {
        req.flash('error', 'Please select two different accounts.');
        return res.redirect('/user/my-accounts')
    }
    if (isNaN(wallet) || wallet <= 0) {
        req.flash('error', 'Invalid amount.');
        return res.redirect('/user/my-accounts')
    }

    const userId = req.user.id;

    const acctFrom = await Account.findOne({
        _id: accountFrom,
        accountOwner: userId
    });

    const acctTo = await Account.findOne({
        _id: accountTo,
        accountOwner: userId
    });

    if (!acctFrom || !acctTo) {
        req.flash('error', 'Account not found.');
        return res.redirect('/user/my-accounts')
    }
    if (wallet > acctFrom.accountWallet) {
        req.flash('error', 'Insufficient funds in source account!');
        return res.redirect('/user/my-accounts')
    }

    await acctFrom.updateOne({ accountWallet: acctFrom.accountWallet - wallet });
    await acctTo.updateOne({ accountWallet: acctTo.accountWallet + wallet });

    req.flash('success', 'Funds moved successfully!');
    return res.redirect('/user/my-accounts')
});

router.delete('/user/account/:id/delete', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const userId = req.user.id;
    const accountId = req.params.id;

    const account = await Account.findById(accountId);

    if (!account) {
        req.flash('error', 'Account not found.');
        return res.redirect('/user/my-accounts');
    }

    // Only the owner can delete
    if (String(account.accountOwner) !== String(userId)) {
        req.flash('error', 'Unauthorized.');
        return res.redirect('/user/my-accounts');
    }

    // Cannot delete the default (primary) account
    if (account.isDefault) {
        req.flash('error', 'You cannot delete your primary account.');
        return res.redirect('/user/my-accounts');
    }

    // Cannot delete an account with a balance
    if (parseFloat(account.accountWallet) !== 0) {
        req.flash('error', 'Please empty the account balance before deleting it.');
        return res.redirect('/user/my-accounts');
    }

    // Remove account reference from the user document
    await Users.findByIdAndUpdate(userId, { $pull: { accounts: account._id } });

    // Delete all transactions tied to this account
    // await Transaction.deleteMany({ targetaccount: account._id });

    // Delete the account itself
    await Account.findByIdAndDelete(accountId);

    req.flash('success', 'Account deleted successfully.');
    res.redirect('/user/my-accounts');
});

router.get('/user/account/:id/statement/download', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const userId    = req.user.id;
    const accountId = req.params.id;

    const user    = await Users.findById(userId).lean();
    const account = await Account.findById(accountId).lean();

    if (!account || String(account.accountOwner) !== String(userId)) {
        req.flash('error', 'Account not found.');
        return res.redirect('/user/my-accounts');
    }

    const fromDate = req.query.from ? new Date(req.query.from) : new Date('2000-01-01');
    const toDate   = req.query.to   ? new Date(req.query.to)   : new Date();
    toDate.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
        validateUser: user._id,
        targetaccount: account._id,
        date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: -1 }).lean();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
        `attachment; filename="statement-${account.accountNumber}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────
    doc.fontSize(20).font('Helvetica-Bold').text('Account Statement', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
    doc.moveDown(1);

    // ── Account info ─────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Account Details');
    doc.font('Helvetica').fontSize(10)
        .text(`Account Name: ${account.displayName || account.accountType}`)
        .text(`Account Type: ${account.accountType}`)
        .text(`Account Number: ${account.accountNumber}`)
        .text(`Account Holder: ${user.firstname} ${user.lastname}`)
        .text(`Email: ${user.email}`)
        .text(`Balance: ${user.basecurrencysymbol || '$'}${parseFloat(account.accountWallet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .text(`Period: ${fromDate.toDateString()} – ${toDate.toDateString()}`);
    doc.moveDown(1);

    // ── Divider ───────────────────────────────────────────────────
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#aaaaaa').stroke();
    doc.moveDown(0.5);

    // ── Table header ─────────────────────────────────────────────
    const col = { date: 50, type: 145, desc: 235, ref: 360, amount: 455, status: 505 };
    doc.fontSize(9).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Date',        col.date,   headerY, { width: 90 });
    doc.text('Type',        col.type,   headerY, { width: 85 });
    doc.text('Description', col.desc,   headerY, { width: 120 });
    doc.text('Ref',         col.ref,    headerY, { width: 90 });
    doc.text('Amount',      col.amount, headerY, { width: 45, align: 'right' });
    doc.text('Status',      col.status, headerY, { width: 50 });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);

    // ── Rows ──────────────────────────────────────────────────────
    doc.font('Helvetica').fontSize(8.5);
    if (transactions.length === 0) {
        doc.text('No transactions found for this period.', { align: 'center' });
    }

    for (const tx of transactions) {
        if (doc.y > 740) doc.addPage();
        const y = doc.y;
        const isCredit = ['Credit', 'Deposit'].includes(tx.transactionType);
        const amtColor = isCredit ? '#1aa36a' : '#cc3333';
        const amtStr   = `${isCredit ? '+' : '-'}${user.basecurrencysymbol || '$'}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        const typeStr  = tx.transferType ? `${tx.transactionType}/${tx.transferType}` : tx.transactionType;
        const desc     = (tx.description || tx.receiverAccountName || '—').substring(0, 28);

        doc.fillColor('#222222')
            .text(new Date(tx.date).toLocaleDateString(), col.date,   y, { width: 90 })
            .text(typeStr,                                col.type,   y, { width: 85 })
            .text(desc,                                   col.desc,   y, { width: 120 })
            .text(tx.refCode || '—',                     col.ref,    y, { width: 90 });
        doc.fillColor(amtColor).text(amtStr, col.amount, y, { width: 45, align: 'right' });
        doc.fillColor('#555555').text(tx.status, col.status, y, { width: 50 });
        doc.fillColor('#222222').moveDown(0.6);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').stroke();
        doc.moveDown(0.2);
    }

    // ── Footer ────────────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#aaaaaa')
        .text('This statement is auto-generated and does not require a signature. Contact support for queries.', { align: 'center' });

    doc.end();
});


router.get('/user/settings', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()
    const transactions = await Transaction.find({validateUser: user}).sort({date: 1})
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/settings", {user, transactions, unreadmsg})
})

router.get('/user/account', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()
    const transactions = await Transaction.find({validateUser: user}).sort({date: 1})
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/account", {user, transactions, unreadmsg})
})

router.get('/user/security', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()
    const transactions = await Transaction.find({validateUser: user}).sort({date: 1})
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/security", {user, transactions, unreadmsg})
})

router.get('/user/kyc', isUserLoggedIn, onlyUser, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/kyc", {user, unreadmsg})
})

router.get('/user/accountstatus', isUserLoggedIn, onlyUser, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()

    // if (user.accountStatus !== 'Suspended') {
    //     res.redirect('/dashboard')
    // } else {
    //     const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    //     res.render("user/accountstatus", {user, unreadmsg})
    // }
    
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/accountstatus", {user, unreadmsg})
})

router.put('/user/kyc', isUserLoggedIn, onlyUser, upload.array('verificationdocument'), async (req, res) => {
    const id = req.user.id; 
    const {documenttype } = req.body;
    const user = await Users.findByIdAndUpdate(id, {documenttype, verificationstatus: 'Pending'}, { runValidators: true, new: true })
    user.verificationdocument =  req.files.map(f => ({url: f.path, filename: f.filename}))
    await user.save();
    // const subject = 'USER VERIFICATION';
    // await verifyMail(user.email, subject, user.firstname);
    req.flash('success', 'Successfully Submitted Document!')
    res.redirect('/user/kyc')
});


router.get('/user/profile', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean()
    const transactions = await Transaction.find({validateUser: user}).sort({date: 1})
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/profile", {user, transactions, countries: countriesList, currencyMapJSON: currencyMapJSON, unreadmsg})
})

router.put('/user/upload-profile-picture', isUserLoggedIn, onlyUser, isUserVerified, upload.array('profilepicture'), async (req, res) => {
    const id = req.user.id;
    const {profilepicture } = req.body;
    const user = await Users.findByIdAndUpdate(id, {profilepicture}, { runValidators: true, new: true })
    user.profilepicture = req.files.map(f => ({url: f.path, filename: f.filename}))
    await user.save();
    req.flash('success', 'Successfully Uploaded Profile Picture!')
    res.redirect('/user/profile')
});

router.put('/user/delete-profile-picture', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id);
    for (let img of user.profilepicture) {
        await cloudinary.uploader.destroy(img.filename);
    }
    await user.updateOne({ $set: { profilepicture: [] } });
    req.flash('success', 'Profile picture removed.');
    res.redirect('/user/profile');
});

router.get('/user/changepassword', isUserLoggedIn,  onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    res.render('user/changepassword', {user});
});

router.put('/user/changepassword', isUserLoggedIn,  onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean()
    const {currentpassword, password, confirmpassword} = req.body;

    const validPassword = await bcrypt.compare(currentpassword, user.password);
    if(validPassword) {
        if(password === confirmpassword) {
            const hashedpassword = await bcrypt.hash(password, 12);
            await user.updateOne({password: hashedpassword, confirmpassword: confirmpassword}, { runValidators: true, new: true })

            req.login(user, function(err) {
                if (err) return next(err);
                req.flash('success', 'Password Changed!');
                res.redirect('/dashboard');
            })
        } else {
            req.flash('error', 'Passwords do not match.')
            res.redirect(`/user/changepassword`)
        }
    } else {
        req.flash('error', 'Incorrect Password.')
        res.redirect(`/user/changepassword`)
    }
});

router.put('/user/edit-profile', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const {
        firstname, lastname, middlename, phonenumber,
        country, basecurrency, basecurrencysymbol, countryCode,
        city, state, address, gender
    } = req.body;

    const safeUpdate = {
        firstname, lastname, middlename, phonenumber,
        country, basecurrency, basecurrencysymbol, countryCode,
        city, state, address, gender
    };

    await Users.findByIdAndUpdate(id, safeUpdate, { runValidators: true, new: true });
    req.flash('success', 'Profile updated successfully!');
    res.redirect('/user/profile');
});

router.put('/verify/:id', isUserLoggedIn, onlyUser, isUserVerified,  upload.array('verificationdocument'), async (req, res) => {
    const id = req.user.id; 
    const {documenttype } = req.body;
    const user = await Users.findByIdAndUpdate(id, {documenttype, verificationstatus: 'Pending'}, { runValidators: true, new: true })
    user.verificationdocument =  req.files.map(f => ({url: f.path, filename: f.filename}))
    await user.save();
    // const subject = 'USER VERIFICATION';
    // await verifyMail(user.email, subject, user.username);
    req.flash('success', 'Successfully Submitted Document!')
    res.redirect('/user/profile')
});

router.put('/upload-profile-picture', isUserLoggedIn, onlyUser, isUserVerified,  upload.array('profilepicture'), async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById({id})
    user.profilepicture = req.files.map(f => ({url: f.path, filename: f.filename}))
    await user.save();
    req.flash('success', 'Successfully Uploaded Profile Picture!')
    res.redirect('/user/profile')
});

router.get('/user/transaction-history', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id   = req.user.id;
    const user = await Users.findById(id).lean();

    // ── Pagination ──────────────────────────────────────────────
    const perPage = 60;
    const page    = parseInt(req.query.page) || 1;

    // ── Filters from query ──────────────────────────────────────
    const filterType   = req.query.type   || '';   // Credit | Debit | Transfer | Deposit
    const filterStatus = req.query.status || '';   // Successful | Pending | Unsuccessful | Unconfirmed
    const sortOrder    = req.query.sort   || 'desc'; // asc | desc
    const searchQ      = req.query.q      || '';

    // Build Mongoose query
    const query = { validateUser: user._id };
    if (filterType)   query.transactionType = filterType;
    if (filterStatus) query.status          = filterStatus;
    if (searchQ) {
        const re = new RegExp(searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
            { description:         re },
            { receiverAccountName: re },
            { senderAccountName:   re },
            { refCode:             re }
        ];
    }

    const totalTransactions = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
        .sort({ date: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean();

    // ── Account balances ────────────────────────────────────────
    const allaccounts = await Account.find({ accountOwner: user }).sort({ isDefault: -1, createdAt: -1 });
    const totalBalance = allaccounts.reduce((sum, a) => sum + parseFloat(a.accountWallet || 0), 0);
    const formattedBalance = totalBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const unreadmsg = await Notification.find({ validateUser: user, status: 'Unread' }).limit(10).lean();

    res.render('user/transactionhistory', {
        user,
        transactions,
        currentPage:  page,
        totalPages:   Math.ceil(totalTransactions / perPage),
        totalBalance: formattedBalance,
        unreadmsg,
        // Pass active filters back so EJS can pre-select them
        activeFilters: { type: filterType, status: filterStatus, sort: sortOrder, q: searchQ }
    });
});

router.get('/user/account/:id/transaction-history', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const accountId = req.params.id;

    const user = await Users.findById(id).lean();
    const account = await Account.findById(accountId)

    const transactions = await Transaction.find({validateUser: user, targetaccount: account}).sort({date: -1})
    
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/transactionhistory", {user, ipAddress, currentDate : today, transactions, totalBalance: formattedBalance, unreadmsg})
})

router.put('/user/transfer-code', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const { transferCode, confirmTransferCode } = req.body;

    if (!isValidPin(transferCode)) {
        req.flash('error', 'PIN must be exactly 4 digits (numbers only).');
        return res.redirect('/user/security');
    }
    if (transferCode !== confirmTransferCode) {
        req.flash('error', 'PINs do not match!');
        return res.redirect('/user/security');
    }

    await Users.findByIdAndUpdate(id, { transferCode: String(transferCode) }, { runValidators: true, new: true });
    req.flash('success', 'Transaction PIN set successfully!');
    res.redirect('/user/security');
});

router.put('/user/change-code', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const { oldTransferCode, transferCode, confirmTransferCode } = req.body;

    if (String(oldTransferCode) !== String(user.transferCode)) {
        req.flash('error', 'Current PIN is incorrect.');
        return res.redirect('/user/security');
    }
    if (!isValidPin(transferCode)) {
        req.flash('error', 'New PIN must be 4–6 digits (numbers only).');
        return res.redirect('/user/security');
    }
    if (transferCode !== confirmTransferCode) {
        req.flash('error', 'New PINs do not match!');
        return res.redirect('/user/security');
    }

    await Users.findByIdAndUpdate(id, { transferCode: String(transferCode) }, { runValidators: true, new: true });
    req.flash('success', 'PIN updated successfully!');
    res.redirect('/user/security');
});

router.get('/user/cards', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const cards = await Card.find({validateUser: user}).sort({dateAdded: -1})
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/cards", {user, cards, ipAddress, currentDate : today, unreadmsg})
})

router.post('/user/card', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id)
        const today = new Date();
        const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
        const time = hours + ":" + today.getMinutes() + ":" + today.getSeconds();
        const ampm = today.getHours() >= 12 ? 'PM' : 'AM';
        const dateTime = date+' '+time+ ' ' + ampm;
    
    const {cardBrand, cardType, cardNumber, bankName, cvv, cardPin, cardExpiryMonth, cardExpiryYear, userName} = req.body;
    const newCard = new Card({cardBrand, cardType, cardNumber, bankName, cvv, cardPin, cardExpiryMonth, cardExpiryYear, validateUser: user, dateAdded: dateTime, userId: user.id, userName, userEmail: user.email});
    user.card.push(newCard._id);
    await newCard.save();
    await user.save();
 
    req.flash('success', 'Success!')
    res.redirect('/user/cards')
});

router.put('/user/edit-card/:id', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const cardId = req.params.id;
    const { cardBrand, cardType, bankName, cardExpiryMonth, cardExpiryYear, userName } = req.body;

    const card = await Card.findById(cardId);
    if (!card || String(card.validateUser) !== String(req.user.id)) {
        req.flash('error', 'Card not found or unauthorized.');
        return res.redirect('/user/cards');
    }

    await Card.findByIdAndUpdate(cardId, {
        cardBrand, cardType, bankName, cardExpiryMonth, cardExpiryYear, userName
    }, { runValidators: true, new: true });

    req.flash('success', 'Card updated successfully!');
    res.redirect('/user/cards');
});

router.delete('/user/delete-card/:id', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const  id  = req.params.id;
    await Card.findByIdAndDelete(id);
    req.flash('success', 'Card Deleted!')
    res.redirect('/user/cards')
});

router.get('/user/transactions', isUserLoggedIn, onlyUser, isUserVerified, transferPinCheck, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const transactions = await Transaction.find({validateUser: user}).sort({dateAdded: -1})
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/transfer", {user, transactions, ipAddress, currentDate : today, allaccounts, totalBalance: formattedBalance, unreadmsg})
})

router.get('/user/intrabank-transfer', isUserLoggedIn, onlyUser, isUserVerified, transferPinCheck, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const transactions = await Transaction.find({validateUser: user}).sort({dateAdded: -1})
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/intra", {user, transactions, ipAddress, currentDate : today, allaccounts, totalBalance: formattedBalance, unreadmsg})
})

router.get('/user/interbank-transfer', isUserLoggedIn, onlyUser, isUserVerified, transferPinCheck, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const transactions = await Transaction.find({validateUser: user}).sort({dateAdded: -1})
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/inter", {user, transactions, ipAddress, currentDate : today, allaccounts, totalBalance: formattedBalance, unreadmsg})
})

router.get('/user/international-transfer', isUserLoggedIn, onlyUser, isUserVerified, transferPinCheck, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const transactions = await Transaction.find({validateUser: user}).sort({dateAdded: -1})
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render("user/international", {user, transactions, ipAddress, currentDate : today, allaccounts, totalBalance: formattedBalance, unreadmsg})
})

router.post('/user/intrabank-transfer', isUserLoggedIn, onlyUser, isUserVerified, validateTransactions, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const today = new Date();

    const { amount, description, receiverAccountNumber, receiverAccountName, transferPin, account } = req.body;
    const targetaccount = await Account.findById(account);
    const transferedamount = parseFloat(amount);

    if (String(transferPin) !== String(user.transferCode)) {
        req.flash('error', 'Incorrect PIN.');
        return res.redirect('/user/transactions');
    }

    // Pending lock check
    const lockedAmount = await getPendingLockedAmount(Transaction, targetaccount._id);
    const availableBalance = targetaccount.accountWallet - lockedAmount;

    if (transferedamount > availableBalance) {
        req.flash('error', `Insufficient available funds. You have ${user.basecurrencysymbol || '$'}${availableBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} available (some funds may be locked in pending transfers).`);
        return res.redirect('/user/transactions');
    }

    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]/gi, "");
    const newTransaction = new Transaction({
        amount: transferedamount,
        description,
        receiverAccountNumber,
        receiverAccountName,
        userId: user._id,
        date: today,
        transactionType: 'Transfer',
        transferType: 'Intra-Bank',
        status: 'Pending',
        refCode: ref,
        validateUser: user._id,
        targetaccount: targetaccount._id,
        newBalance: targetaccount.accountWallet - transferedamount,
        senderAccountNumber: targetaccount.accountNumber,
        senderAccountName: `${user.firstname} ${user.lastname}`,
        bankTo: 'Intra-Bank',
        bankFrom: 'Intra-Bank'
    });

    await newTransaction.save();
    await Users.findByIdAndUpdate(id, { $push: { transactions: newTransaction._id } });

    // Email user
    try {
        await transferMail(
            user.email,
            'Transfer Submitted – Pending Approval',
            user.firstname,
            `${user.basecurrencysymbol || '$'}${transferedamount.toLocaleString()}`,
            ref,
            'Intra-Bank',
            receiverAccountName,
            'Pending'
        );
    } catch (e) { console.error('Transfer email failed:', e.message); }

    req.flash('success', 'Transfer submitted and is pending approval.');
    res.redirect(`/user/transaction/${newTransaction._id}/receipt`);
});

router.post('/user/interbank-transfer', isUserLoggedIn, onlyUser, isUserVerified, validateTransactions, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const today = new Date();

    const { amount, description, receiverAccountNumber, receiverAccountName, bankTo, otherBank, transferPin, account } = req.body;
    const targetaccount = await Account.findById(account);
    const transferedamount = parseFloat(amount);
    const destinationBank = bankTo === 'others' ? otherBank : bankTo;

    if (String(transferPin) !== String(user.transferCode)) {
        req.flash('error', 'Incorrect PIN.');
        return res.redirect('/user/transactions');
    }

    const lockedAmount = await getPendingLockedAmount(Transaction, targetaccount._id);
    const availableBalance = targetaccount.accountWallet - lockedAmount;

    if (transferedamount > availableBalance) {
        req.flash('error', `Insufficient available funds. ${user.basecurrencysymbol || '$'}${availableBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} available.`);
        return res.redirect('/user/transactions');
    }

    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]/gi, "");
    const newTransaction = new Transaction({
        amount: transferedamount,
        description,
        receiverAccountNumber,
        receiverAccountName,
        bankTo: destinationBank,
        refCode: ref,
        userId: user._id,
        date: today,
        transactionType: 'Transfer',
        transferType: 'Inter-Bank',
        status: 'Pending',
        validateUser: user._id,
        targetaccount: targetaccount._id,
        newBalance: targetaccount.accountWallet - transferedamount,
        senderAccountNumber: targetaccount.accountNumber,
        senderAccountName: `${user.firstname} ${user.lastname}`,
        bankFrom: 'Intra-Bank'
    });

    await newTransaction.save();
    await Users.findByIdAndUpdate(id, { $push: { transactions: newTransaction._id } });

    try {
        await transferMail(
            user.email,
            'Transfer Submitted – Pending Approval',
            user.firstname,
            `${user.basecurrencysymbol || '$'}${transferedamount.toLocaleString()}`,
            ref,
            'Inter-Bank',
            receiverAccountName,
            'Pending'
        );
    } catch (e) { console.error('Transfer email failed:', e.message); }

    req.flash('success', 'Transfer submitted and is pending approval.');
    res.redirect(`/user/transaction/${newTransaction._id}/receipt`);
});

router.post('/user/wire-transfer', isUserLoggedIn, onlyUser, isUserVerified, validateTransactions, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const today = new Date();

    const { amount, description, receiverAccountNumber, receiverAccountName, bankTo, receiverCountry, swiftcode, transferPin, account } = req.body;
    const targetaccount = await Account.findById(account);
    const transferedamount = parseFloat(amount);

    if (String(transferPin) !== String(user.transferCode)) {
        req.flash('error', 'Incorrect PIN.');
        return res.redirect('/user/transactions');
    }

    const lockedAmount = await getPendingLockedAmount(Transaction, targetaccount._id);
    const availableBalance = targetaccount.accountWallet - lockedAmount;

    if (transferedamount > availableBalance) {
        req.flash('error', `Insufficient available funds. ${user.basecurrencysymbol || '$'}${availableBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} available.`);
        return res.redirect('/user/transactions');
    }

    const ref = crypto.randomBytes(4).toString("base64").replace(/[^a-z0-9]/gi, "");
    const newTransaction = new Transaction({
        amount: transferedamount,
        description,
        receiverAccountNumber,
        receiverAccountName,
        bankTo,
        receiverCountry,
        swiftcode,
        userId: user._id,
        date: today,
        transactionType: 'Transfer',
        transferType: 'Wire',
        status: 'Pending',
        refCode: ref,
        validateUser: user._id,
        targetaccount: targetaccount._id,
        newBalance: targetaccount.accountWallet - transferedamount,
        senderAccountNumber: targetaccount.accountNumber,
        senderAccountName: `${user.firstname} ${user.lastname}`,
        bankFrom: 'Intra-Bank'
    });

    await newTransaction.save();
    await Users.findByIdAndUpdate(id, { $push: { transactions: newTransaction._id } });

    try {
        await transferMail(
            user.email,
            'International Wire Transfer Submitted',
            user.firstname,
            `${user.basecurrencysymbol || '$'}${transferedamount.toLocaleString()}`,
            ref,
            'Wire Transfer',
            receiverAccountName,
            'Pending'
        );
    } catch (e) { console.error('Transfer email failed:', e.message); }

    req.flash('success', 'Wire transfer submitted and is pending approval.');
    res.redirect(`/user/transaction/${newTransaction._id}/receipt`);
});

router.get('/user/transaction/:id/receipt', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const transactionId = req.params.id;
    const user = await Users.findById(id).lean()
    const transaction = await Transaction.findById(transactionId);
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
res.render("user/receipt", {user, transaction, unreadmsg})
})

router.get('/user/loan', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
res.render("user/loan", {user, ipAddress, currentDate : today, unreadmsg})
})

router.post('/user/loan', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
        const today = new Date();
        const getdate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
        const time = hours + ":" + today.getMinutes() + ":" + today.getSeconds();
        const ampm = today.getHours() >= 12 ? 'PM' : 'AM';
        const dateTime = getdate+' '+time+ ' ' + ampm;


    req.flash('success', 'Your loan request has been submitted. We will get back to you shortly by email.')
    res.redirect(`/user/loan`)
});

router.get('/user/pay-bills', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    // Calculate total balance
    const totalBalance = allaccounts.reduce((sum, account) => {
       return sum + parseFloat(account.accountWallet.toString());  // Use parseFloat if Decimal128
   }, 0);

   // Optional: format it
   const formattedBalance = totalBalance.toLocaleString(undefined, {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2
   });

    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
res.render("user/bills", {user, ipAddress, currentDate : today, allaccounts, totalBalance: formattedBalance, unreadmsg})
})

router.post('/user/pay-bills', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    req.flash('error', 'Currently unable to pay bills. Check back later.')
    res.redirect(`/user/pay-bills`)
});

router.get('/user/support', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const ipAddress = IP.address();
    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
res.render("user/support", {user, ipAddress, currentDate : today, unreadmsg})
})

// FIX: investments list — filter by user only + email on open
router.get('/user/investments', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const unreadmsg = await Notification.find({ validateUser: user, status: 'Unread' }).limit(10).lean();
    const investmentplans = await Plans.find({ planType: 'Investment' });
    
    // FIX: filter by user, not find all
    const investments = await Investment.find({ validateUser: user._id }).sort({ startDate: -1 });
    
    const allaccounts = await Account.find({ accountOwner: user }).sort({ isDefault: -1, createdAt: -1 });
    const totalBalance = allaccounts.reduce((sum, a) => sum + parseFloat(a.accountWallet || 0), 0);
    const formattedBalance = totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    res.render('user/investment', { user, investmentplans, investments, allaccounts, totalBalance: formattedBalance, unreadmsg });
});

// UPDATED: Open investment — add email
router.post('/user/investments/:id', isUserLoggedIn, onlyUser, isUserVerified, validateInvestment, async (req, res) => {
    const user = await Users.findById(req.user.id);
    const investmentplan = await Plans.findById(req.params.id);
    const { investedamount, account } = req.body;
    const targetaccount = await Account.findById(account);
    const amount = parseFloat(investedamount);

    if (amount < investmentplan.minamount || amount > investmentplan.maxamount) {
        req.flash('error', `Amount must be between ${user.basecurrencysymbol}${investmentplan.minamount.toLocaleString()} and ${user.basecurrencysymbol}${investmentplan.maxamount.toLocaleString()}`);
        return res.redirect('/user/investments');
    }

    if (amount > targetaccount.accountWallet) {
        req.flash('error', 'Insufficient funds in selected account.');
        return res.redirect('/user/investments');
    }

    const newinvestment = new Investment({
        investedamount: amount,
        startDate: new Date(),
        packagetype: investmentplan.name,
        duration: investmentplan.duration,
        status: 'Active',
        investmentprofit: 0.00,
        roi: investmentplan.roi,
        validateUser: user._id,
        targetaccount: targetaccount._id
    });

    await newinvestment.save();
    await Users.findByIdAndUpdate(user._id, { $push: { investment: newinvestment._id } });
    await targetaccount.updateOne({ accountWallet: targetaccount.accountWallet - amount });

    // Email user
    // try {
    //     await openInvestmentMail(
    //         user.email,
    //         'Investment Opened Successfully',
    //         user.firstname,
    //         investmentplan.name,
    //         amount,
    //         investmentplan.roi,
    //         investmentplan.duration
    //     );
    // } catch (e) { console.error('Investment email failed:', e.message); }

    req.flash('success', 'Investment started successfully!');
    res.redirect(`/user/investments/${newinvestment._id}`);
});

router.get('/user/investments/:id', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id
    const user = await Users.findById(id).lean();
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    const investment = await Investment.findById(req.params.id)
res.render("user/viewinvestment", {user, investment, unreadmsg})
})

router.get('/user/upgrade-account', isUserLoggedIn,  onlyUser, isUserVerified, async(req, res) => {
    const user = await Users.findById(req.user.id);
    const deposits = await CryptoTransaction.find({validateUser: user, transactionType: 'Upgrade Fee'}).sort({transactiondate: -1});
    const upgradeplans  = await Plans.find({planType: 'Account Upgrade'});
    const depositmethods  = await Depositmethods.find({});
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render('user/accountupgrade', {user, unreadmsg, depositmethods, deposits, upgradeplans});
});

router.get('/api/upgrade-plans/:packagename', async (req, res) => {
    try {
      const plan = await Plans.findOne({ name: req.params.packagename });
      res.json(plan);
    } catch (error) {
      console.error('Error fetching plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

router.post('/dashboard/upgrade-account', isUserLoggedIn, onlyUser, isUserVerified,  upload.array('transactionproof'), async (req, res) => {
    // const id = req.params.id; 
    const user = await Users.findById(req.user.id);

    // const {transactionproof, address, narration} = req.body;

    const today = new Date();
    const date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    const hours = today.getHours() > 12 ? today.getHours() - 12 : today.getHours();
    const time = hours + ":" + today.getMinutes() + ":" + today.getSeconds();
    const ampm = today.getHours() >= 12 ? 'PM' : 'AM';
    const dateTime = date+' '+time+ ' ' + ampm;

    const {depositmethodname, depositaddress, amount, accounttype, transactionproof} = req.body;

    const upgradeplan = await Plans.findOne({name: accounttype });


    const deposit = new CryptoTransaction({transactionmethod: depositmethodname, amount: upgradeplan.amount, narration: upgradeplan.name, transactiondate: dateTime, transactionType: 'Upgrade Fee', companywallet: depositaddress, paymentstatus: 'Completed', validateUser: user, transactionproof});
    deposit.transactionproof =  req.files.map(f => ({url: f.path, filename: f.filename}))
    user.cryptotransactions.push(deposit);
    await deposit.save();
    await user.save()

    req.flash('success', 'Account upgrade request submitted. Your account will be upgraded as soon as we confirm your payment.')
    res.redirect('/user/upgrade-account')
});

router.get('/user/deposit', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const user = await Users.findById(req.user.id);
    const deposits = await CryptoTransaction.find({validateUser: user, transactionType: 'Deposit'}).sort({transactiondate: -1});
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    const depositmethods  = await Depositmethods.find({});
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render('user/cheque', {user, unreadmsg, depositmethods, deposits, allaccounts });
});


router.get('/user/deposit-crypto', isUserLoggedIn, onlyUser, isUserVerified, async(req, res) => {
    const user = await Users.findById(req.user.id);
    const deposits = await CryptoTransaction.find({validateUser: user, transactionType: 'Deposit'}).sort({transactiondate: -1});
    const depositmethods  = await Depositmethods.find({});
    const allaccounts = await Account.find({accountOwner: user}).sort({ isDefault: -1, createdAt: -1 });
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render('user/deposit', {user, unreadmsg, depositmethods, deposits, allaccounts });
});

router.get('/api/depositmethods/:packagename', async (req, res) => {
    try {
      const depositmethod = await Depositmethods.findOne({depositmethodname: req.params.packagename});
      res.json(depositmethod);
    } catch (error) {
      console.error('Error fetching deposit method:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

// UPDATED: Crypto deposit — add targetaccount to the saved record
router.post('/dashboard/deposit', isUserLoggedIn, onlyUser, isUserVerified, upload.array('transactionproof'), async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const today = new Date();
    const { depositmethodname, depositaddress, amount, account } = req.body;

    const deposit = new CryptoTransaction({
        transactionmethod: depositmethodname,
        amount,
        transactiondate: today,
        transactionType: 'Deposit',
        companywallet: depositaddress,
        paymentstatus: 'Completed',
        status: 'Pending',
        validateUser: user._id,
        targetaccount: account   // <-- now saved so admin knows where to credit
    });
    deposit.transactionproof = req.files.map(f => ({ url: f.path, filename: f.filename }));

    await deposit.save();
    await Users.findByIdAndUpdate(id, { $push: { cryptotransactions: deposit._id } });

    // Email user
    // try {
    //     await depositMail(
    //         user.email,
    //         'Deposit Receipt Received',
    //         user.firstname,
    //         amount
    //     );
    // } catch (e) { console.error('Deposit email failed:', e.message); }

    req.flash('success', 'Deposit receipt submitted. We will confirm your deposit shortly.');
    res.redirect('/user/deposit-crypto');
});

// NEW: Cheque / bank deposit POST route
router.post('/dashboard/cheque-deposit', isUserLoggedIn, onlyUser, isUserVerified, upload.array('transactionproof'), async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const today = new Date();
    const { depositmethodname, amount, accountnumber, bankname, routingcode, routingnumber, account } = req.body;

    const deposit = new CryptoTransaction({
        transactionmethod: depositmethodname || 'Bank Transfer',
        amount,
        transactiondate: today,
        transactionType: 'Deposit',
        paymentstatus: 'Completed',
        status: 'Pending',
        validateUser: user._id,
        accountnumber,
        bankname,
        routingcode,
        routingnumber,
        targetaccount: account
    });
    deposit.transactionproof = req.files.map(f => ({ url: f.path, filename: f.filename }));

    await deposit.save();
    await Users.findByIdAndUpdate(id, { $push: { cryptotransactions: deposit._id } });

    // try {
    //     await depositMail(
    //         user.email,
    //         'Deposit Receipt Received',
    //         user.firstname,
    //         amount
    //     );
    // } catch (e) { console.error('Deposit email failed:', e.message); }

    req.flash('success', 'Bank deposit submitted. We will confirm once payment is verified.');
    res.redirect('/user/deposit');
});


router.get('/user/notification', isUserLoggedIn,  onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean()
    const msg = await Notification.find({validateUser: user}).sort({notificationdate: -1});
    const openedmsg = await Notification.find({validateUser: user, status: 'Read'})
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render('user/notification', {user, unreadmsg, msg, openedmsg, unreadmsg});
});

router.get('/user/notification/:id', isUserLoggedIn,  onlyUser, isUserVerified, async(req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const notification = await Notification.findById(req.params.id);
    if (notification.status === 'Unread') {
        await notification.updateOne({status: 'Read'}, { runValidators: true, new: true });
    }
    const unreadmsg = await Notification.find({validateUser: user, status: 'Unread'}).limit(10).lean()
    res.render('user/notificationshow', {user, unreadmsg, notification});
});

// NEW: Mark all notifications as read
router.put('/user/notifications/mark-all-read', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const user = await Users.findById(req.user.id).lean();
    await Notification.updateMany({ validateUser: user._id, status: 'Unread' }, { $set: { status: 'Read' } });
    req.flash('success', 'All notifications marked as read.');
    res.redirect('/user/notification');
});

// NEW: Delete a single notification
router.delete('/user/notification/:id/delete', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
        req.flash('error', 'Notification not found.');
        return res.redirect('/user/notification');
    }
    if (String(notification.validateUser) !== String(req.user.id)) {
        req.flash('error', 'Unauthorized.');
        return res.redirect('/user/notification');
    }
    await Notification.findByIdAndDelete(req.params.id);
    await Users.findByIdAndUpdate(req.user.id, { $pull: { notifications: notification._id } });
    req.flash('success', 'Notification deleted.');
    res.redirect('/user/notification');
});

// NEW: Download transaction statement as PDF
router.get('/user/statement/download', isUserLoggedIn, onlyUser, isUserVerified, async (req, res) => {
    const id = req.user.id;
    const user = await Users.findById(id).lean();
    const allaccounts = await Account.find({ accountOwner: user }).sort({ isDefault: -1 }).lean();

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
    res.setHeader('Content-Disposition', `attachment; filename="statement-${user.accountNumber}-${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Account Statement', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toDateString()}`, { align: 'center' });
    doc.moveDown(1);

    // Account info
    doc.fontSize(11).font('Helvetica-Bold').text('Account Holder');
    doc.font('Helvetica').fontSize(10)
        .text(`Name: ${user.firstname} ${user.lastname}`)
        .text(`Email: ${user.email}`)
        .text(`Account Number: ${user.accountNumber}`)
        .text(`Routing Number: ${user.routingNumber}`)
        .text(`Total Balance: ${user.basecurrencysymbol || '$'}${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        .text(`Period: ${fromDate.toDateString()} – ${toDate.toDateString()}`);
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#aaaaaa').stroke();
    doc.moveDown(0.5);

    // Table header
    const col = { date: 50, type: 145, desc: 235, ref: 360, amount: 455, status: 505 };
    doc.fontSize(9).font('Helvetica-Bold');
    const headerY = doc.y;
    doc.text('Date',        col.date,   headerY, { width: 90 });
    doc.text('Type',        col.type,   headerY, { width: 85 });
    doc.text('Description', col.desc,   headerY, { width: 120 });
    doc.text('Ref',         col.ref,    headerY, { width: 90 });
    doc.text('Amount',      col.amount, headerY, { width: 45, align: 'right' });
    doc.text('Status',      col.status, headerY, { width: 50 });
    doc.moveDown(0.4);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.3);

    // Rows
    doc.font('Helvetica').fontSize(8.5);
    if (transactions.length === 0) {
        doc.text('No transactions found for this period.', { align: 'center' });
    }

    for (const tx of transactions) {
        if (doc.y > 740) doc.addPage();
        const y = doc.y;
        const isCredit = ['Credit', 'Deposit'].includes(tx.transactionType);
        const amtColor = isCredit ? '#1aa36a' : '#cc3333';
        const amtStr = `${isCredit ? '+' : '-'}${user.basecurrencysymbol || '$'}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        const typeStr = tx.transferType ? `${tx.transactionType}/${tx.transferType}` : tx.transactionType;
        const desc = (tx.description || tx.receiverAccountName || '—').substring(0, 28);

        doc.fillColor('#222222')
            .text(new Date(tx.date).toLocaleDateString(), col.date, y, { width: 90 })
            .text(typeStr, col.type, y, { width: 85 })
            .text(desc, col.desc, y, { width: 120 })
            .text(tx.refCode || '—', col.ref, y, { width: 90 });
        doc.fillColor(amtColor).text(amtStr, col.amount, y, { width: 45, align: 'right' });
        doc.fillColor('#555555').text(tx.status, col.status, y, { width: 50 });
        doc.fillColor('#222222').moveDown(0.6);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').stroke();
        doc.moveDown(0.2);
    }

    // Footer
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#aaaaaa')
        .text('This statement is auto-generated and does not require a signature. Contact support for queries.', { align: 'center' });

    doc.end();
});

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login')
})


module.exports = router;