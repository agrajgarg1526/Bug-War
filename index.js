const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

const expressSession = require("express-session")({
  secret: process.env.DB_SECRET,
  resave: false,
  saveUninitialized: false,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(expressSession);
app.set("view engine", "ejs");

app.listen(3000, function () {
  console.log("Server Running at 3000 port");
});

////////////PASSPRT SETUP///////////////////////

const passport = require("passport");

app.use(passport.initialize());
app.use(passport.session());

/////////////////////////////////////////////////

////////////MONGOOSE SETUP//////////////////////

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
var findOrCreate = require("mongoose-findorcreate");

mongoose.connect("mongodb+srv://"+process.env.DB_MONGO_USERNAME+":"+process.env.DB_MONGO_PASSWORD+"@cluster0.ezz0g.mongodb.net/bugwarDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const UserDetail = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
});

UserDetail.plugin(findOrCreate);
UserDetail.plugin(passportLocalMongoose);

const User = mongoose.model("User", UserDetail);

///////////////////////////////////////////////////

///////////////PASSPORT LOCAL AUTHENTICATION ///////////

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

/////////////////////////////////////////////////////

////////////////PASSPORT GOOGLE STRATEGY//////////////

var GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.DB_GOOGLE_CLIENT_ID,
      clientSecret: process.env.DB_GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/bugwar",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate(
        { googleId: profile.id, email: profile.emails[0].value },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

app.get(
  "/auth/google/bugwar",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    // console.log(req.user.googleId);
    res.redirect("/users/" + req.user.googleId);
  }
);

///////////PASSPORT FACEBOOK STRATEGY/////////////////////////////////

var FacebookStrategy = require("passport-facebook").Strategy;

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.DB_FB_APP_ID,
      clientSecret: process.env.DB_FB_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/bugwar",
      profileFields: ["id", "emails", "name"],
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate(
        { facebookId: profile.id, email: profile.emails[0].value },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

app.get(
  "/auth/facebook/bugwar",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    // console.log(req.user);
    res.redirect("/users/" + req.user.facebookId);
  }
);

/////////////////////////////////////////////////////////

app.get("/", function (req, res) {
  console.log(req.user);
  res.render("index", { loggedIn: req.user });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", function (req, res) {
  passport.authenticate("local", function (err, user, info) {
    if (err) console.log(err);

    if (!user) res.redirect("/login");

    req.logIn(user, function (err) {
      if (err) console.log(err);

      res.redirect("/users/" + user.username);
    });
  })(req, res);
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.post("/signup", function (req, res) {
  User.register(
    { username: req.body.username, email: req.body.email },
    req.body.password,
    function (err, user) {
      if (err) {
        res.redirect("signup");
      }

      const username = req.body.username;
      passport.authenticate("local")(req, res, function () {
        res.redirect("/users/" + username);
      });
    }
  );
});

app.get("/users/:username", function (req, res) {
  console.log(req.params);
  if (req.user) {
    // logged in
    res.render("user", { username: req.params.username });
  } else {
    // not logged in
    res.render("login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});
