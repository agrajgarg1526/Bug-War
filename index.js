var helper = require("./date");
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const multer = require("multer");
const app = express();

const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
var findOrCreate = require("mongoose-findorcreate");

mongoose.connect(process.env.DB_MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const expressSession = require("express-session");
const MongoStore = require("connect-mongo")(expressSession);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static(__dirname + "/public"));

app.use(
  expressSession({
    secret: process.env.DB_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
    }),
  })
);

app.set("view engine", "ejs");

app.listen(process.env.PORT || 3000, function () {
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
    res.locals.pic = req.user.image;
    res.locals.tiny_api = process.env.DB_TINY_API_KEY;

    // console.log(res.locals.tiny_api);
  }

  next();
});

/////////////////////////////////////////////////

////////////MONGOOSE SETUP//////////////////////

// const ansSchema= new mongoose.Schema({
//   answer:String,
//   answeredBy:String
// });
const quesSchema = new mongoose.Schema({
  // id: String,
  title: String,
  body: String,
  upvote: Number,
  answers: [
    {
      answer: String,
      answeredBy: String,
      upvote: Number,
      upvotedBy: [String],
      downvotedBy: [String],
      time: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  askedBy: String,
  time: {
    type: Date,
    default: Date.now,
  },
});

// quesSchema.plugin(timeZone, { paths: ['date', 'subDocument.subDate'] });

const UserDetail = new mongoose.Schema({
  username: String,
  email: String,
  uniqueID: String,
  password: String,
  questions: [String],
  upvotedQuestions: [String],
  downvotedQuestions: [String],
  answeredQuestions: [String],
  answers: [String],
  time: {
    type: Date,
    default: Date.now,
  },
  image: String,
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
      callbackURL: "https://bug-war.herokuapp.com/auth/google/bugwar",
    },
    function (accessToken, refreshToken, profile, cb) {
      let extractedUser = profile.emails[0].value.substring(
        0,
        profile.emails[0].value.indexOf("@")
      );
      User.findOrCreate(
        {
          username: extractedUser,
          email: profile.emails[0].value,
          image: "noprofile.jpg",
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);

app.get(
  "/auth/google/bugwar",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
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
      callbackURL: "https://bug-war.herokuapp.com/auth/facebook/bugwar",
      profileFields: ["id", "emails", "name"],
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
      let extractedUser = profile.emails[0].value.substring(
        0,
        profile.emails[0].value.indexOf("@")
      );
      User.findOrCreate(
        {
          username: extractedUser,
          email: profile.emails[0].value,
          image: "noprofile.jpg",
        },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
  })
);

app.get(
  "/auth/facebook/bugwar",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
  }),
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
  res.render("login", {
    text: "",
  });
});

app.post("/login", function (req, res) {
  passport.authenticate("local", function (err, user, info) {
    if (err) console.log(err);
    if (!user)
      res.render("login", {
        text: "Incorrect Password",
      });

    req.logIn(user, function (err) {
      if (err) console.log(err);

      res.redirect("/");
    });
  })(req, res);
});

app.get("/signup", function (req, res) {
  res.render("signup", {
    text: "",
  });
});

app.post("/signup", function (req, res) {
  User.findOne(
    {
      email: req.body.email,
    },
    function (err, foundUser) {
      if (err || foundUser) {
        // alert('Email Already Exists');
        res.render("signup", {
          text: "Email already exists",
        });
      } else {
        User.register(
          {
            username: req.body.username,
            email: req.body.email,
            image: "noprofile.jpg",
          },
          req.body.password,
          function (err, user) {
            if (err) {
              res.render("signup", {
                text: "Username Already Exists",
              });
            }

            // const username = req.body.username;
            passport.authenticate("local")(req, res, function () {
              res.redirect("/");
            });
          }
        );
      }
    }
  );
});

app.get("/users/:username", function (req, res) {
  User.findOne(
    {
      username: req.params.username,
    },
    function (err, foundUser) {
      if (err) console.log(err);
      else {
        let cls, arr, title;
        if (
          req.query.questions === "profile" ||
          Object.keys(req.query).length === 0
        ) {
          cls = "profile";
          arr = foundUser.answeredQuestions;
        } else if (req.query.questions === "asked") {
          cls = "asked";
          arr = foundUser.questions;
        } else if (req.query.questions === "upvoted") {
          cls = "upvoted";
          arr = foundUser.upvotedQuestions;
        } else if (req.query.questions === "answered") {
          cls = "answered";
          arr = foundUser.answeredQuestions;
        }

        let answers = foundUser.answeredQuestions;

        Question.find()
          .where("_id")
          .in(arr)
          .exec((err, records) => {
            let rating = 0,
              rating1 = 0,
              rating2 = 0,
              goodAnswers = 0,
              totalAnswers = 0,
              goodQuestions = 0,
              totalQuestions = 0,
              upvoteQuestions = 0,
              upvoteAnswers = 0;

            if (cls === "profile") {
              for (let i = 0; i < records.length; i++) {
                for (let j = 0; j < records[i].answers.length; j++) {
                  if (
                    records[i].answers[j].answeredBy === req.params.username
                  ) {
                    totalAnswers++;
                    if (records[i].answers[j].upvote >= 1) goodAnswers++;
                    upvoteAnswers += records[i].answers[j].upvote;
                  }
                }
              }
              rating1 =
                totalAnswers === 0 ? 0 : (goodAnswers * 100) / totalAnswers;

              let questions = foundUser.questions;

              Question.find()
                .where("_id")
                .in(questions)
                .exec((err, records) => {
                  totalQuestions = records.length;
                  for (let i = 0; i < records.length; i++) {
                    if (records[i].upvote >= 1) goodQuestions++;
                    upvoteQuestions += records[i].upvote;
                  }

                  rating2 =
                    totalQuestions === 0
                      ? 0
                      : (goodQuestions * 100) / totalQuestions;

                  rating = (rating1 + rating2) / 2;

                  if (rating == 0) rating = 0;
                  else if (rating < 20) rating = 1;
                  else if (rating < 40) rating = 2;
                  else if (rating < 60) rating = 3;
                  else if (rating < 80) rating = 4;
                  else rating = 5;

                  // console.log(rating1);
                  // console.log(rating2);
                  // console.log(rating);
                  // console.log(totalAnswers);
                  // console.log(goodAnswers);
                  // console.log(totalQuestions);
                  // console.log(goodQuestions);
                  res.render("user", {
                    user: foundUser,
                    date: helper,
                    cls: cls,
                    arr: records,
                    rating: rating,
                    upvoteQuestions: upvoteQuestions,
                    upvoteAnswers: upvoteAnswers,
                  });
                });
            } else {
              res.render("user", {
                user: foundUser,
                date: helper,
                cls: cls,
                arr: records,
              });
            }
          });
      }
    }
  );

  // } else {
  // not logged in
  // res.render("login");
  // }
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
    res.redirect("login");
  }
});

app.post("/ask", function (req, res) {
  // console.log(req.body);
  // console.log(req.user);

  const question = new Question({
    title: req.body.askTitle,
    body: req.body.askBody,
    upvote: 0,
    askedBy: req.user.username,
    // date = new Date()
  });
  question.save();

  User.findOne(
    {
      username: req.user.username,
    },
    function (err, foundUser) {
      if (err) console.log(err);
      else {
        //  console.log(foundUser);
        Question.findOne(
          {
            title: req.body.askTitle,
          },
          function (err, foundQuestion) {
            foundUser.questions.push(foundQuestion.id);
            foundUser.save();
          }
        );
      }
    }
  );

  const link = "/questions/" + question.id;
  res.redirect(link);
});

app.get("/questions/:questionID", function (req, res) {
  // console.log(req.params.questionID);

  Question.findById(req.params.questionID, function (err, foundQuestion) {
    if (err) console.log(err);
    else {
      res.render("question", {
        question: foundQuestion,
        date: helper,
        user: foundQuestion.askedBy,
        query: req.query.sort,
      });
    }
  });
});

app.post("/vote", function (req, res) {
  User.findOne(
    {
      username: req.user.username,
    },
    function (err, foundUser) {
      if (err) console.log(err);
      else {
        if (req.body.value == "up") {
          var ifInDown = foundUser.downvotedQuestions.findIndex(function (
            item
          ) {
            return item === req.body.id;
          });
          if (ifInDown === -1) {
            var index = foundUser.upvotedQuestions.findIndex(function (item) {
              return item === req.body.id;
            });
            if (index === -1) {
              Question.findOneAndUpdate(
                {
                  _id: req.body.id,
                },
                {
                  $inc: {
                    upvote: 1,
                  },
                },
                (err, response) => {
                  // console.log(response);
                }
              );
              foundUser.upvotedQuestions.push(req.body.id);
              foundUser.save();
            }
          }
        } else if (req.body.value == "down") {
          var ifInUp = foundUser.upvotedQuestions.findIndex(function (item) {
            return item === req.body.id;
          });
          if (ifInUp === -1) {
            var index = foundUser.downvotedQuestions.findIndex(function (item) {
              return item === req.body.id;
            });
            if (index === -1) {
              Question.findOneAndUpdate(
                {
                  _id: req.body.id,
                },
                {
                  $inc: {
                    upvote: -1,
                  },
                },
                (err, response) => {
                  // console.log(response);
                }
              );
              foundUser.downvotedQuestions.push(req.body.id);
              foundUser.save();
            }
          }
        }
      }
    }
  );
  const link = "/questions/" + req.body.id;
  res.redirect(link);
});

app.post("/answer/:questionID", function (req, res) {
  // console.log(req.body);
  // git log
  let id = req.params.questionID;
  Question.findById(req.params.questionID, function (err, foundQuestion) {
    if (err) console.log(err);
    else {
      const ans = {
        answer: req.body.askAnswer,
        answeredBy: req.user.username,
        upvote: 0,
      };
      foundQuestion.answers.push(ans);
      let answerID = foundQuestion.answers[foundQuestion.answers.length - 1].id;
      foundQuestion.save();

      User.findOne(
        {
          username: req.user.username,
        },
        function (err, foundUser) {
          if (err) console.log(err);
          else {
            if (!foundUser.answeredQuestions.includes(id))
              foundUser.answeredQuestions.push(id);

            foundUser.answers.push(answerID);
            foundUser.save();
          }
        }
      );

      const link = "/questions/" + req.params.questionID;
      res.redirect(link);

      // console.log(foundQuestion);
    }
  });
});

app.get("/list", function (req, res) {
  // console.log(req);
  // console.log(req.query);
  if (req.user) {
    // logged in

    if (req.query.sort == "asc") {
      Question.find(function (err, foundQuestions) {
        if (err) console.log(err);
        else {
          //  console.log(foundQuestions[0].answers.length);
          res.render("list", {
            foundQuestions: foundQuestions,
            date: helper,
            query: req.query.sort,
          });
        }
      }).sort({
        upvote: "asc",
      });
    } else if (req.query.sort == "dec") {
      Question.find(function (err, foundQuestions) {
        if (err) console.log(err);
        else {
          //  console.log(foundQuestions[0].answers.length);
          res.render("list", {
            foundQuestions: foundQuestions,
            date: helper,
            query: req.query.sort,
          });
        }
      }).sort({
        upvote: "desc",
      });
    } else if (req.query.sort == "time" || !req.query.sort) {
      Question.find(function (err, foundQuestions) {
        if (err) console.log(err);
        else {
          //  console.log(foundQuestions[0].answers.length);
          res.render("list", {
            foundQuestions: foundQuestions,
            date: helper,
            query: req.query.sort,
          });
        }
      }).sort({
        time: -1,
      });
    }
  } else {
    // not logged in
    res.redirect("login");
  }
});

app.post("/voteAnswer", function (req, res) {
  // console.log(req.body);
  Question.findById(req.body.id, function (err, foundQuestion) {
    if (err) console.log(err);
    else {
      // console.log(foundQuestion);
      for (var i = 0; i < foundQuestion.answers.length; i++) {
        if (foundQuestion.answers[i].id === req.body.answerid) {
          if (req.body.value == "up") {
            var ifInDown = foundQuestion.answers[i].downvotedBy.findIndex(
              function (item) {
                return item === req.user.username;
              }
            );

            if (ifInDown === -1) {
              var index = foundQuestion.answers[i].upvotedBy.findIndex(
                function (item) {
                  return item === req.user.username;
                }
              );

              if (index === -1) {
                foundQuestion.answers[i].upvote++;
                foundQuestion.answers[i].upvotedBy.push(req.user.username);
                foundQuestion.save();
              }
            }
          } else if (req.body.value == "down") {
            var ifInUp = foundQuestion.answers[i].upvotedBy.findIndex(function (
              item
            ) {
              return item === req.user.username;
            });

            if (ifInUp === -1) {
              var index = foundQuestion.answers[i].downvotedBy.findIndex(
                function (item) {
                  return item === req.user.username;
                  r;
                }
              );

              if (index === -1) {
                foundQuestion.answers[i].upvote--;
                foundQuestion.answers[i].downvotedBy.push(req.user.username);
                foundQuestion.save();
              }
            }
          }
        }
      }
    }
  });
  const link = "/questions/" + req.body.id;
  res.redirect(link);
});

app.post("/deleteQues/:questionID", function (req, res) {
  let id = req.params.questionID;
  // console.log(id);

  // console.log(req.user.username);

  Question.findByIdAndDelete(id, function (err, docs) {
    if (err) {
      console.log(err);
    } else {
      User.find({}, function (err, foundUser) {
        if (err) console.log(err);
        else {
          //  console.log(foundUser.length);
          for (let i = 0; i < foundUser.length; i++) {
            const isLargeNumber = (element) => element === id;

            let ques = foundUser[i].questions.findIndex(isLargeNumber);
            let upQues = foundUser[i].upvotedQuestions.findIndex(isLargeNumber);
            let downQues = foundUser[i].downvotedQuestions.findIndex(
              isLargeNumber
            );
            // console.log(ques);
            // console.log(upQues);
            // console.log(downQues);
            if (ques != -1) foundUser[i].questions.splice(ques, 1);
            if (upQues != -1) foundUser[i].upvotedQuestions.splice(upQues, 1);
            if (downQues != -1)
              foundUser[i].downvotedQuestions.splice(downQues, 1);

            foundUser[i].save();
          }
        }
      });

      res.redirect("/list");
    }
  });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 1024 * 1024 * 3,
  },
});

app.post(
  "/users/:username/imageUpload",
  upload.single("image"),
  function (req, res) {
    let username = req.params.username;

    if (req.file) {
      User.findOne(
        {
          username: req.params.username,
        },
        function (err, foundUser) {
          if (err) console.log(err);
          else {
            foundUser.image = req.file.filename;
            foundUser.save();
          }
        }
      );
    }
    res.redirect("/users/" + req.params.username);
  }
);
