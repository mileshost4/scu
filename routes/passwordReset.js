const User   = require("../models/users");
const Token  = require("../models/token");
const crypto = require("crypto");
const Joi    = require("joi");
const bcrypt = require("bcrypt");
const express = require("express");
const router  = express.Router();

const { passwordResetMail } = require("../utils/sendEmail");


// ── GET /forgotpassword ─────────────────────────────────────
router.get("/forgotpassword", (req, res) => {
    res.render("user/forgotpassword");
});


// ── POST /forgot ────────────────────────────────────────────
router.post("/forgot", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            req.flash("error", "No account found with that email address.");
            return res.redirect("/forgotpassword");
        }

        // Reuse existing token OR create a fresh one
        let token = await Token.findOne({ userId: user._id });

        if (!token) {
            token = await new Token({
                userId: user._id,
                token:  crypto.randomBytes(32).toString("hex"),
            }).save();
        }

        const link = `${process.env.BASE_URL}/password-reset/${user._id}/${token.token}`;
        await passwordResetMail(user.email, "PASSWORD RESET", link, user.firstname);

        req.flash("success", "Password reset link sent! Check your inbox — the link expires in 1 hour.");
        return res.redirect("/forgotpassword");

    } catch (err) {
        console.error("Forgot password error:", err);
        req.flash("error", "Something went wrong. Please try again.");
        return res.redirect("/forgotpassword");
    }
});


// ── GET /password-reset/:id/:tokenid ───────────────────────
router.get("/password-reset/:id/:tokenid", async (req, res) => {
    const { id, tokenid } = req.params;

    try {
        const tok = await Token.findOne({ token: tokenid });

        if (!tok) {
            req.flash("error", "This reset link has expired or is invalid. Please request a new one.");
            return res.redirect("/forgotpassword");
        }

        const user = await User.findById(id);

        if (!user) {
            req.flash("error", "Account not found.");
            return res.redirect("/forgotpassword");
        }

        return res.render("user/passwordreset", { tok, user });

    } catch (err) {
        console.error("Password reset GET error:", err);
        req.flash("error", "Something went wrong. Please request a new link.");
        return res.redirect("/forgotpassword");
    }
});


// ── POST /password-reset/:id/:tokenid ──────────────────────
router.post("/password-reset/:id/:tokenid", async (req, res, next) => {
    const { id, tokenid } = req.params;

    try {
        // Validate body
        const schema = Joi.object({
            password:        Joi.string().min(8).required(),
            confirmpassword: Joi.string().required(),
        });

        const { error } = schema.validate(req.body);
        if (error) {
            req.flash("error", error.details[0].message);
            return res.redirect(`/password-reset/${id}/${tokenid}`);
        }

        // Passwords must match
        if (req.body.password !== req.body.confirmpassword) {
            req.flash("error", "Passwords do not match.");
            return res.redirect(`/password-reset/${id}/${tokenid}`);
        }

        // Verify token still exists (not expired)
        const tok = await Token.findOne({ userId: id, token: tokenid });
        if (!tok) {
            req.flash("error", "This link has expired. Please request a new password reset.");
            return res.redirect("/forgotpassword");
        }

        // Verify user exists
        const user = await User.findById(id);
        if (!user) {
            req.flash("error", "Account not found.");
            return res.redirect("/forgotpassword");
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(req.body.password, 12);
        await User.findByIdAndUpdate(
            id,
            { password: hashedPassword, confirmpassword: req.body.confirmpassword },
            { runValidators: true, new: true }
        );

        // Delete the used token
        await Token.findByIdAndDelete(tok._id);

        // Log the user in and redirect to dashboard
        req.login(user, function (err) {
            if (err) return next(err);
            req.flash("success", "Password reset successfully. Welcome back!");
            return res.redirect("/dashboard");
        });

    } catch (err) {
        console.error("Password reset POST error:", err);
        req.flash("error", "Something went wrong. Please try again.");
        return res.redirect(`/password-reset/${id}/${tokenid}`);
    }
});


module.exports = router;
