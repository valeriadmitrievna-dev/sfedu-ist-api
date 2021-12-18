const { Schema, model, Types } = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const schema = new Schema({
  email: { type: String, required: true, unic: true, trim: true },
  password: { type: String, required: true, trim: true },
  username: { type: String, required: true, unic: true, trim: true },
  name: { type: String, required: true, trim: true },
  avatar: {
    type: String,
    default:
      "https://icon-library.com/images/default-profile-icon/default-profile-icon-5.jpg",
  },
  token: { type: String },
  confirmed: { type: Boolean, default: false },
  created: { type: Date, required: true },
  website: { type: String },
  about: { type: String },
});

schema.pre("save", function (next) {
  if (this.isNew || this.isModified("password")) {
    const document = this;
    bcrypt.hash(document.password, saltRounds, function (err, hashedPassword) {
      if (err) {
        next(err);
      } else {
        document.password = hashedPassword;
        next();
      }
    });
  } else {
    next();
  }
});

module.exports = model("User", schema);
