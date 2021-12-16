const { Schema, model, Types } = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const schema = new Schema({
  email: { type: String, required: true, unic: true, trim: true },
  password: { type: String, required: true, trim: true },
  username: { type: String, required: true, unic: true, trim: true },
  name: { type: String, required: true, trim: true },
  avatar: { type: String, default: "" },
  pictures: [{ type: Types.ObjectId, ref: "Picture" }],
  token: { type: String },
  confirmed: { type: Boolean, default: false },
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
