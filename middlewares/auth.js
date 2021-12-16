const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  try {
    if (req.method === "OPTIONS") return next();

    const token =
      (req.cookies && req.cookies["access token"]) ||
      req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("No token provided");
    const data = jwt.verify(token, process.env.secret);
    req.decoded = data;
    return next();
  } catch (error) {
    console.log(error.message);
    return res.status(401).send({
      error: "Not Authenticated",
    });
  }
};
