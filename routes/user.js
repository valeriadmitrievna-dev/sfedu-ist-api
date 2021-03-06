const Router = require("express");
const router = Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Picture = require("../models/Picture");
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
    const link = `${process.env.app}/user/confirm/${token}`;

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
    return res.status(200).json(new_token);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logout", async (req, res) => {
  try {
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
    const pictures = await Picture.find({ owner: user._id }).populate("owner");
    res.status(200).json({
      ...user._doc,
      pictures: pictures.sort((a, b) => new Date(b.created) - new Date(a.created)),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { name, username, website, about } = req.body;
    const uploadAvatar = async () => {
      if (!!req.files?.avatar) {
        const fileContent = Buffer.from(req.files.avatar.data, "binary");
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: req.files.avatar.name,
          Body: fileContent,
        };
        const stored = await req.app
          .get("s3")
          .upload(params, (err, data) => {
            if (err) {
              console.log(err);
              throw new Error("Problems with uploading avatar");
            }
            return data;
          })
          .promise();
        const url = await stored.Location;
        return url;
      }
    };
    const avatar = await uploadAvatar();
    user.name = name?.length ? name : user.name;
    user.username = username?.length ? username : user.username;
    user.website = website?.length ? website : user.website;
    user.about = about?.length ? about : user.about;
    user.avatar = avatar ? avatar : user.avatar;
    user.save(err => {
      if (err) {
        return res.status(500).json({ error: "Error on updating" });
      }
    });
    return res.status(200).json({ user });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/:username", withAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const pictures = await Picture.find({ owner: user._id }).populate("owner");
    res.status(200).json({
      ...user._doc,
      pictures: pictures.sort((a, b) => new Date(b.created) - new Date(a.created)),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
