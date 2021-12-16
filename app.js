require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fileupload = require("express-fileupload");

const app = express();
const http = require("http").createServer(app);
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin:
      process.env.node === "development"
        ? process.env.app_dev
        : process.env.app_origin,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(fileupload());

const { dirname } = require("path");
const appDir = dirname(require.main.filename);
app.set("rootFolder", appDir);

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
