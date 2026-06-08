if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');

// Routes
const webRoutes = require('./routes/webRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const passwordReset = require('./routes/passwordReset');

// Models
const Users = require('./models/users');
// const CronModel = require('./models/cron');

// Database setup
const dbUrl = process.env.DB_URL;
// const dbUrl = 'mongodb://localhost:27017/sterlingcu';

mongoose.connect(dbUrl)
  .then(() => console.log("Database connected"))
  .catch(err => console.error("DB connection error:", err));

// View engine setup
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session and Flash
const secret = process.env.SECRET ||  'thisshouldbeabettersecret';

const store = MongoStore.create({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24  * 60 * 60
});

store.on("error", function(e){
    console.log("SESSION STORE ERROR", e)
})

// passport configuration start
const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());

// Locals middleware
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.session = req.session;
  // Read each flash key ONCE, then reuse the variable
  const successMsgs = req.flash('success');
  const errorMsgs   = req.flash('error');
  const warningMsgs = req.flash('warning');
  const infoMsgs    = req.flash('info');

  res.locals.messages = {
    success: successMsgs,
    error:   errorMsgs,
    warning: warningMsgs,
    info:    infoMsgs,
  };

  // Keep these if any old views still use res.locals.success / res.locals.error directly
  res.locals.success = successMsgs;
  res.locals.error   = errorMsgs;

  res.locals.websiteName = "Sterling Crest Union";
  res.locals.websiteMail = "info@sterlingcrestunion.org";
  res.locals.websiteUrl = "sterlingcrestunion.org";
  res.locals.websiteNumber = "1234567890"
  next();
});

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Admin login with email
passport.use('adminauth', new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
      const user = await Users.findOne({ email });
      if (!user) return done(null, false, { message: 'Invalid email/password.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Invalid email/password.' });
  } catch (err) {
      return done(err);
  }
}));

passport.use('userauth', new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
      const user = await Users.findOne({ email });
      if (!user) return done(null, false, { message: 'Invalid email/password.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Invalid email/password.' });
  } catch (err) {
      return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
      const user = await Users.findById(id);
      done(null, user);
  } catch (err) {
      done(err, null);
  }
});

// Optional: Cron job (commented out)
// cron.schedule('* * * * *', async () => {
//     try {
//         const now = new Date();
//         const activeCronJobs = await CronModel.find({
//             status: 'Active',
//             nextUpdateTime: { $lte: now }
//         });

//         for (const job of activeCronJobs) {
//             job.number += 10;
//             job.lastUpdateTime = new Date();
//             job.nextUpdateTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes later
//             await job.save();
//             console.log('Cron job updated:', job);
//         }
//     } catch (err) {
//         console.error('Cron job error:', err);
//     }
// });

// Routes
app.get('/', (req, res) => {
  res.render("web/home");
});

app.use('/', webRoutes);
app.use('/', adminRoutes);
app.use('/', userRoutes);
app.use('/', passwordReset);

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Serving on port ${port}`);
});

setInterval(() => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[MEMORY] ${used.toFixed(2)} MB`);
}, 600000); // 10 minutes