const { Schema, model, Types } = require("mongoose");

const schema = new Schema({
  owner: { type: Types.ObjectId, ref: "User" },
  source: { type: String, required: true },
  description: { type: String },
  title: { type: String, requred: true },
  // tags: [{ type: String }],
  created: { type: Date },
});

module.exports = model("Picture", schema);
