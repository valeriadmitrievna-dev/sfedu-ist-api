const Router = require("express");
const router = Router();
const User = require("../models/User");
const Picture = require("../models/Picture");
const fs = require("fs");
const withAuth = require("../middlewares/auth");

router.post("/", withAuth, async (req, res) => {
  try {
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { title, description } = req.body;
    if (!title?.length) {
      return res.status(404).json({ error: "Picture title is required" });
    }
    const uploadPicture = async () => {
      if (!!req.files?.picture) {
        const fileContent = Buffer.from(req.files.picture.data, "binary");
        const params = {
          Bucket: process.env.S3_BUCKET,
          Key: req.files.picture.name,
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
    const source = await uploadPicture();
    const picture = new Picture({
      title,
      description,
      source,
      owner: user,
      created: new Date(),
    });

    const callback = err => {
      if (err) {
        return res.status(500).json({ error: "Error on updating" });
      }
    };

    picture.save(callback);
    return res.status(200).json(picture);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/length", async (req, res) => {
  try {
    const pictures = await Picture.find();
    return res.status(200).json(pictures.length);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/:count/:page", async (req, res) => {
  try {
    const { count, page } = req.params;
    const pictures = await Picture.find()
      .populate("owner")
      .sort({ created: -1 })
      .limit(parseInt(count))
      .skip(parseInt(count) * parseInt(page));
    return res
      .status(200)
      .json(pictures.sort((a, b) => new Date(b.created) - new Date(a.created)));
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.delete("/:picID", withAuth, async (req, res) => {
  try {
    const { picID } = req.params;
    const { id } = req.decoded;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const callback = err => {
      if (err) {
        console.log(err.message);
        return res.status(500).json({ error: "Error on deleting picture" });
      }
    };
    await Picture.deleteOne({ _id: picID }).exec(callback);
    user.pictures = user.pictures?.filter(p => p !== picID);
    user.save(callback);
    return res.status(200).json();
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

module.exports = router;
