const jwt = require("jsonwebtoken");
const User = require("../models/user");
const verifyjwt = async (req, res, next) => {
  try {
    const token = req.cookies.accesstoken || req.header("Authorization").replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (typeof decodedToken === "string" || !decodedToken._id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    const user = await User.findById(decodedToken._id).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = verifyjwt;