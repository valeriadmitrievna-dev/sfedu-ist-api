const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  likes: [{ type: Types.ObjectId, ref: "User" }],
  source: { type: String, required: true },
  description: { type: String },
  name: { type: String },
  tags: [{ type: String }],
  created: { type: Date },
});

module.exports = model("Picture", schema);
