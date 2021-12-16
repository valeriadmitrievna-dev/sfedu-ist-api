const Router = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const fs = require("fs");
const withAuth = require("../middlewares/auth");

router.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await User.findOne({ username, confirmed: true });
    if (!user) {
      return res
        .status(404)
        .json({ error: "User with that username doesn't exist" });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: "Wrong password" });
    }
    const token = jwt.sign({ id: user._id }, process.env.secret, {
      expiresIn: "24h",
    });
    res.cookie("access token", token, {
      secure: process.env.node === "production",
      httpOnly: true,
      sameSite: process.env.node === "production" ? "none" : "lax",
    });
    return res.status(200).json({ token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    if (!username || !password || !email || !name) {
      return res
        .status(400)
        .json({ error: "Username, email and password required" });
    }
    const candidateEmail = await User.findOne({ email });
    const candidateUsername = await User.findOne({ username });
    if (candidateEmail) {
      return res
        .status(400)
        .json({ error: "User with this email already exist" });
    }
    if (candidateUsername) {
      return res
        .status(400)
        .json({ error: "User with this username already exist" });
    }
    const user = new User({
      username,
      email,
      password,
      name,
      created: new Date(),
    });

    const token = jwt.sign({ id: user._id }, process.env.secret);
    user.token = token;

    const confirm_email = fs.readFileSync(
      `${req.app.get("rootFolder")}/emails/confirm-email.html`,
      "utf8"
    );
    const link = `${process.env.app}/user/${token}`;

    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `Confirm your email on ${process.env.project_name}`,
      html: confirm_email.replace("confirm_link", link),
    };
    req.app.get("transporter").sendMail(mailOptions, error => {
      if (error) {
        console.log("Email not sended");
        throw new Error(error);
      } else {
        console.log("Email sended");
      }
    });
    user.save(err => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error on signin up, please try again later" });
      }
      return res.status(200).json({ success: true });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ token, confirmed: false });
    if (!user) {
      return res
        .status(400)
        .json({ error: "User doesn't exist or already confirmed" });
    }
    user.token = undefined;
    user.confirmed = true;
    user.save(err => {
      if (err) {
        return res.status(500).json({ error: "Error on confirming user" });
      }
    });
    const new_token = jwt.sign({ id: user._id }, process.env.secret, {
      expiresIn: "24h",
    });
    res.cookie("access token", new_token, {
      secure: process.env.node === "production",
      httpOnly: true,
      sameSite: process.env.node === "production" ? "none" : "lax",
    });
    return res.status(200).json(new_token);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logout", async (req, res) => {
  try {
    res.cookie("access token", "", {
      secure: process.env.node === "production",
      httpOnly: true,
      sameSite: process.env.node === "production" ? "none" : "lax",
    });
    return res.status(200).json();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
