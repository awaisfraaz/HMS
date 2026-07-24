const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyjwt = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = req.cookies?.accesstoken || authHeader?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (typeof decodedToken === "string" || !decodedToken.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    const user = await User.findById(decodedToken.id).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;

    // Allow pending/incomplete users to access complete-profile route
    const isCompleteProfileRoute = req.path === '/complete-profile' || req.originalUrl?.includes('/complete-profile');
    if (!isCompleteProfileRoute && !user.checkisvaliduser()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (error) {
    // console.error(error);
    res.status(401).json({ message: "Invalid access token" });
  }
};

module.exports = verifyjwt;