const express = require("express");
const router = express();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../views/middleware.js");

router.get("/signup", (req, res) => {
  res.render("../views/users/signup.ejs");
});

router.post(
    "/signup",
    wrapAsync(async (req, res, next) => {
        try {
            let { username, email, password } = req.body;

            username = username.trim();
            email = email.trim().toLowerCase();

            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(email)) {
                req.flash("error", "Please enter a valid email address.");
                return res.redirect("/signup");
            }

            // Check duplicate email
            const existingUser = await User.findOne({ email });

            if (existingUser) {
                req.flash("error", "An account with this email already exists.");
                return res.redirect("/signup");
            }

            const newUser = new User({
                username,
                email
            });

            const registeredUser = await User.register(newUser, password);

            req.login(registeredUser, (err) => {
                if (err) {
                    return next(err);
                }

                req.flash("success", "Welcome to Hearthly!");
                res.redirect("/listings");
            });

        } catch (e) {
            req.flash("error", e.message);
            res.redirect("/signup");
        }
    })
);

router.get("/login", (req, res) => {
  res.render("../views/users/login.ejs");
});

router.post(
  "/login",
  saveRedirectUrl,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (req, res) => {
    req.flash("success", "Welcome back to Hearthly!");
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
  },
);

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You are logged out !");
    res.redirect("/listings");
  });
});

module.exports = router;
