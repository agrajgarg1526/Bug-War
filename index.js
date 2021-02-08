const express = require("express");
const bodyParser = require("body-parser");


const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", function (req, res) {
   res.send("Hello");
  });

  
app.listen(3000, function () {
    console.log("Server Running at 3000 port");
  });
  