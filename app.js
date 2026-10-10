require("dotenv").config();

const express = require("express");
const ExpressError = require("./utils/ExpressError.js");
const mongoose = require("mongoose");

const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const flash = require("connect-flash");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const userRouter = require("./routes/user.js");
const listRouter = require("./routes/listUser.js");

const app = express();

// ====================
// BASIC APP CONFIG
// ====================

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "public")));

// ====================
// MONGODB CONNECTION
// ====================

const clientPromise = mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB Atlas");
        return mongoose.connection.getClient();
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });

// ====================
// SESSION STORE
// ====================

const store = MongoStore.create({
    clientPromise,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("Error in Mongo session store:", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

// ====================
// PASSPORT AUTHENTICATION
// ====================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ====================
// GLOBAL LOCALS
// ====================

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user || null;
    next();
});

// ====================
// ROUTES
// ====================

// Homepage
app.get("/", (req, res) => {
    res.redirect("/listings");
});

// User routes
app.use("/", userRouter);

// Listing routes
app.use("/listings", listRouter);

// ====================
// 404 HANDLER
// ====================

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// ====================
// ERROR HANDLER
// ====================

app.use((err, req, res, next) => {
    console.error(err);

    let {
        statusCode = 500,
        message = "Something went wrong",
    } = err;

    // Handle invalid MongoDB ObjectIds
    if (err.name === "CastError") {
        statusCode = 404;
        message = "Listing not found";
    }

    res.status(statusCode).render("error.ejs", {
        err: { message },
    });
});

// ====================
// START SERVER
// ====================

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});