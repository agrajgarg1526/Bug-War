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

app.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();

  if (req.user) {
    res.locals.username = req.user.username;
    res.locals.link = "/users/" + req.user.username;
    res.locals.tiny_api="https://cdn.tiny.cloud/1/"+process.env.DB_TINY_API_KEY+"/tinymce/5/tinymce.min.js" ;
    // console.log(res.locals.tiny_api);
  }

  next();
});

/////////////////////////////////////////////////

////////////MONGOOSE SETUP//////////////////////

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
var findOrCreate = require("mongoose-findorcreate");

mongoose.connect("mongodb://localhost:27017/Bugwar", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

const quesSchema = new mongoose.Schema({
  // id: String,
  title: String,
  body: String,
  upvote:Number
});

const UserDetail = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  questions: [quesSchema],
});

UserDetail.plugin(findOrCreate);
UserDetail.plugin(passportLocalMongoose);

const Question = mongoose.model("Question", quesSchema);
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
        { username: profile.id, email: profile.emails[0].value },
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
    res.redirect("/");
  }
);

///////////PASSPORT FACEBOOK STRATEGY/////////////////////////////////

var FacebookStrategy = require("passport-facebook").Strategy;
const { authenticate } = require("passport");

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
        { username: profile.id, email: profile.emails[0].value },
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
    res.redirect("/");
  }
);

/////////////////////////////////////////////////////////

app.get("/", function (req, res) {
  // console.log(res.locals);
  res.render("index");
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

      res.redirect("/");
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
        res.redirect("/");
      });
    }
  );
});

app.get("/users/:username", function (req, res) {
  // console.log(req.params);
  if (req.user) {
    // logged in
    res.render("user",{});
  } else {
    // not logged in
    res.render("login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  req.session.destroy(function (err) {
    if (err) {
      return next(err);
    }
    // The response should indicate that the user is no longer authenticated.
    else res.redirect("/");
  });
});

app.get("/ask", function (req, res) {
  if (req.user) {
    // logged in
    res.render("ask");
  } else {
    // not logged in
    res.render("login");
  }
});


app.post("/ask", function (req, res) {
  // console.log(req.body);
  // console.log(req.user.username);

  const question = new Question({
    title: req.body.askTitle,
    body: req.body.askBody,
    upvote:0,
  });
  question.save();

  User.findOne({username:req.user.username},function(err,foundUser){
     if(err) console.log(err);
     else{
      //  console.log(foundUser);
       foundUser.questions.push(question);
       foundUser.save();
      
       const link="/users/"+req.user.username+"/questions/"+question.id;
       res.redirect(link)
     }
  });
});

app.get("/users/:username/questions/:questionID", function (req, res) {
  // console.log(req.params);
    
  Question.findById(req.params.questionID,function(err,foundQuestion){
    if(err) console.log(err);
    else{
      res.render("question", {question:foundQuestion});
    }
  })
   

});
