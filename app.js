require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");

const app = express();
const http = require("http").createServer(app);
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.app,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(fileupload());

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", process.env.app);
  res.setHeader("Origin", process.env.app);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

const { dirname } = require("path");
const appDir = dirname(require.main.filename);
app.set("rootFolder", appDir);

const AWS = require("aws-sdk");
const credentials = new AWS.Credentials({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
AWS.config.credentials = credentials;
const s3 = new AWS.S3();
app.set("s3", s3);

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE,
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
  secure: false,
  ignoreTLS: true,
  requireTLS: false,
  tls: { rejectUnauthorized: true },
});
transporter.verify(function (error) {
  if (error) {
    console.log("Server can't send emails");
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
app.set("transporter", transporter);

app.use("/user", require("./routes/user"));
app.use("/picture", require("./routes/picture"));

async function start() {
  try {
    await mongoose.connect(process.env.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    http.listen(port, () => {
      console.log("We are live on " + port);
    });
  } catch (e) {
    console.log("Server error:", e.message);
  }
}

start();
