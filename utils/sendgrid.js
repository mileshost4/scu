const nodemailer = require("nodemailer");
const fs = require("fs");
const ejs = require("ejs");
const websiteName = 'Secure Heritage Credit Union'
const websiteLink = 'secureheritagecu.com'
const websiteSupportMail = 'info@secureheritagecu.com';
const sgTransport = require("nodemailer-sendgrid");


// module.exports = sendEmail;

module.exports.welcomeMail = async (email, subject, text) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/welcomemail.ejs", {username: text, subject: subject, websiteName, websiteLink, websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.otpMail = async (email, subject, text, otpcode) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/otpmail.ejs", {username: text, subject: subject, otpcode, websiteName, websiteLink, websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.emailActMail = async (email, subject, text, username, websiteName, websiteLink, websiteSupportMail) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/emailactmail.ejs", {link: text, subject: subject, username: username},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.passwordResetMail = async (email, subject, text, username) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/passwordresetmail.ejs", {link: text, subject: subject, username: username, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.verifyMail = async (email, subject, username, websiteName, websiteLink, websiteSupportMail) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/verifymail.ejs", {subject: subject, username: username},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.acctVerifiedMail = async (email, subject, username) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/acctverifiedmail.ejs", {subject: subject, username: username, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.acctUpgradeMail = async (email, subject, username, accounttype) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/acctupgrademail.ejs", {subject: subject, username: username, accounttype: accounttype, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.customMail = async (email, subject, message, files) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        // Process the uploaded files
        const attachments = [];

        files.forEach(file => {
            console.log("Processing file: ", file);  // Log the individual file object for debugging

            // Check if file is an image
            if (file.mimetype.startsWith('image')) {
                // Inline image handling
                attachments.push({
                    filename: file.originalname,
                    path: file.path,
                    cid: file.filename // Content-ID for inline image
                });
            } 
            // Check for PDF and DOCX files
            else if (file.mimetype === 'application/pdf' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // Document (PDF or DOCX) attachment handling
                attachments.push({
                    filename: file.originalname,
                    path: file.path
                });
            }
        });

        // Log the final attachments array
        console.log("Attachments: ", attachments);

        // Render the email body using EJS
        ejs.renderFile("views/mail/custommail.ejs", {subject, message, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail}, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data,
                    attachments: attachments // Attach images or documents
                };

                // Send email with attachments
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
        });
    } catch (error) {
        console.log(error, "email not sent");
    }
};


module.exports.depositMail = async (email, subject, username, fundedAmount) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/depositmail.ejs", {amount: fundedAmount, subject: subject, username: username, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.declinedepositMail = async (email, subject, username, fundedAmount) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/declineddepositmail.ejs", {amount: fundedAmount, subject: subject, username: username, websiteName: websiteName, websiteLink: websiteLink, websiteSupportMail: websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.openInvestmentMail = async (email, subject, username, packagetype, investedamount) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/openinvestment.ejs", {packagetype: packagetype, investedamount: investedamount, subject: subject, username: username, websiteName, websiteLink, websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.endInvestmentMail = async (email, subject, username, packagetype, investedamount, profit) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/closeinvestment.ejs", {packagetype: packagetype, profit: profit, investedamount: investedamount, subject: subject, username: username, websiteName, websiteLink, websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports.withdrawMail = async (email, subject, username, amount) => {
    try {
        const transporter = nodemailer.createTransport(
            sgTransport({
                apiKey: process.env.SENDGRID_API_KEY, // your SendGrid API key
            })
        );

        ejs.renderFile("views/mail/withdrawmail.ejs", {amount: amount, subject: subject, username: username, websiteName, websiteLink, websiteSupportMail},function (err, data) {
            if (err) {
                console.log(err);
            } else {
                var mainOptions = {
                    from: `${websiteName} <${process.env.CUSTOMMAIL}>`,
                    to: email,
                    subject: subject,
                    html: data
                };
                console.log("html data ======================>", mainOptions.html);
                transporter.sendMail(mainOptions, function (err, info) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('Message sent: ' + info.response);
                    }
                });
            }
            });
    } catch (error) {
        console.log(error, "email not sent");
    }
};