const express = require('express');
const router = express.Router();

router.get('/about',  async(req, res) => {
    res.render('web/about');
});

router.get('/services',  async(req, res) => {
    res.render('web/services');
});

router.get('/contact',  async(req, res) => {
    res.render('web/contact');
});

// router.get('/support',  async(req, res) => {
//     res.render('web/support');
// });

router.get('/privacy-policy',  async(req, res) => {
    res.render('web/policy');
});

router.get('/terms',  async(req, res) => {
    res.render('web/terms');
});

router.get('/wealth',  async(req, res) => {
    res.render('web/wealth');
});

router.get('/personal-banking',  async(req, res) => {
    res.render('web/personal-banking');
});

router.get('/business-accounts',  async(req, res) => {
    res.render('web/business-accounts');
});

router.get('/investments',  async(req, res) => {
    res.render('web/investments');
});

router.get('/loans-and-credits',  async(req, res) => {
    res.render('web/loans-and-credits');
});


module.exports = router;