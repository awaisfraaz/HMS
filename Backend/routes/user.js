const express = require("express");
const router = express.Router();
const User = require("../models/user");
const verifyjwt = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Hospital = require("../models/hospital");
const Doctor = require("../models/doctor");

const generateaccessandrefreshtoken = async (userid) => {
  try {
    const user = await User.findById(userid);
    const accesstoken = user.generateaccessToken();
    const refreshtoken = user.generateRefreshToken();
    
    // Hash the refresh token before saving it to the database
    user.refreshToken = crypto
      .createHash("sha256")
      .update(refreshtoken)
      .digest("hex");

    await user.save({ validateBeforeSave: false });
    return { accesstoken, refreshtoken };
  } catch (error) {
    console.error(error);
    return null;
  }
};

router.get("/", (req, res) => {
  res.send("Hello World!");
});
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordValid = await user.isPasswordValid(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    if (!user.checkisvaliduser()) {
      return res.status(403).json({ message: "User is not verified" });
    }

    const { accesstoken, refreshtoken } = await generateaccessandrefreshtoken(
      user._id,
    );

    const loggeduser = await User.findById(user._id).select("name email role hospital_id");

    /** @type {import('express').CookieOptions} */
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    };
    res
      .status(200)
      .cookie("accesstoken", accesstoken, options)
      .cookie("refreshtoken", refreshtoken, options)
      .json({
        message: "Login successful",
        user: loggeduser,
        accesstoken,
        refreshtoken,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role, hospital_id } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Pass plain password; models/user.js pre-save hook hashes it automatically
    const newUser = new User({
      email,
      password,
      name,
      role,
      hospital_id,
    });
    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/logout', verifyjwt, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: "" });

    /** @type {import('express').CookieOptions} */
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    };
    res.clearCookie("accesstoken", options);
    res.clearCookie("refreshtoken", options);
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post('/refreshtoken', async (req, res) => {
  try {
    const incomingrefreshtoken = req.cookies?.refreshtoken || req.body?.refreshtoken || req.body?.incomingrefreshtoken;
    if (!incomingrefreshtoken) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = jwt.verify(incomingrefreshtoken, process.env.REFRESH_TOKEN_SECRET);
    if (typeof decodedToken === "string" || !decodedToken.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    
    // Hash the incoming refresh token to compare it with the stored hash
    const hashedIncomingToken = crypto
      .createHash("sha256")
      .update(incomingrefreshtoken)
      .digest("hex");

    if (user.refreshToken !== hashedIncomingToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    req.user = user;
    const { accesstoken, refreshtoken } = await generateaccessandrefreshtoken(
      user._id,
    );
    const loggeduser = await User.findById(user._id).select("name email role hospital_id");
    /** @type {import('express').CookieOptions} */
    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    };
    res
      .status(200)
      .cookie("accesstoken", accesstoken, options)
      .cookie("refreshtoken", refreshtoken, options)
      .json({
        message: "Token refreshed successfully",
        user: loggeduser,
        accesstoken,
        refreshtoken,
      }); 
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});
// for super admin filter fo getting user 
router.get("/allusers",verifyjwt, async (req, res) => {
    try {
      if(req.user.role !== "Super Admin"){
        return res.status(403).json({ message: "Forbidden. Only Super Admin can get all users" });
      }
        const users = await User.find().select('-password -refreshToken');
        res.status(200).json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})

router.post("/updateuserstatus",verifyjwt, async (req, res) => {
    try {
        const {id,status} = req.body;
        if (req.user.role !== "Super Admin") {
            return res.status(403).json({ message: "Forbidden. Only Super Admin can update user status" });
        }
        const user = await User.findByIdAndUpdate(id, { status }, { new: true }).select('-password -refreshToken');
        res.status(200).json({ user });
      
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})
router.delete("/deleteuser",verifyjwt, async (req, res) => {
    try {
        const {id} = req.body;
        if (req.user.role !== "Super Admin") {
            return res.status(403).json({ message: "Forbidden. Only Super Admin can delete user" });
        }
        const user = await User.findByIdAndDelete(id).select("-password -refreshToken");
        res.status(200).json({ message: "User deleted successfully",user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})
router.get("/dashboardstats",verifyjwt, async (req, res) => {
    try {
        if(req.user.role !== "Super Admin"){
            return res.status(403).json({ message: "Forbidden. Only Super Admin can get dashboard stats" });
        }
        const users = await User.find().select('-password -refreshToken');
        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === "Approved").length,
            pendingUsers: users.filter(u => u.status === "Pending").length
        }
        const hospitals = await Hospital.find();
        const hospitalstats = {
            totalHospitals: hospitals.length,
            activeHospitals: hospitals.filter(h => h.status === "Approved").length,

        }
        res.status(200).json({ stats,hospitalstats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})
router.post("/registerdoctor",verifyjwt, async (req, res) => {
    try {
        const {name,email,password,speciality,status,schedule,room,consultationfee} = req.body;
        if (req.user.role !== "Hospital Admin") {
            return res.status(403).json({ message: "Forbidden. Only Hospital Admin can register doctors" });
        }
        const hospital_id = req.user.hospital_id;
        const user = await User.findOne({ email });
        if (user) {
            return res.status(409).json({ message: "Doctor already exists" });
        }
        

        const newUser= new User({
             name,
             email,
             password,
             role:"Doctor",
             status:"Approved",
             hospital_id,
        })
        const saveUser= await newUser.save();
        const doctor = new Doctor({
            name,
            speciality,
            status,
            schedule,
            room,
            consultationfee,
            hospital_id,
            user_id: saveUser._id,
        })
        await doctor.save();
        res.status(201).json({ message: "Doctor registered and Credentials are created successfully",
           doctor: {name,email,speciality,status,schedule,room,consultationfee,hospital_id} 
         });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})
// GET /api/v1/user/google
// Initiates the Google OAuth login process.
router.get("/google", (req, res) => {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "select_account"
    }).toString()}`;

    res.redirect(googleAuthUrl);
});

// GET /api/v1/user/google/callback
router.get('/google/callback', async (req, res) => {
    const FRONTEND_URL = "https://awaisfraaz.github.io/HMS/";
    try {
        const { code, error: authError } = req.query;
        if (authError) {
            return res.redirect(`${FRONTEND_URL}login-onboarding.html?error=${encodeURIComponent(String(authError))}`);
        }
        if (!code || typeof code !== "string") {
            return res.redirect(`${FRONTEND_URL}login-onboarding.html?error=No authorization code provided`);
        }

        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(code),
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
                grant_type: "authorization_code",
            }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            return res.redirect(`${FRONTEND_URL}login-onboarding.html?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
        }

        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const userInfo = await userInfoResponse.json();
        let user = await User.findOne({ email: userInfo.email });

        if (!user) {
            user = new User({
                name: userInfo.name || "Google User",
                email: userInfo.email,
                googleId: userInfo.sub,
                authProvider: "google",
                status: "Pending"
            });
            await user.save();
        }

        // Generate Access & Refresh tokens
        const tokens = await generateaccessandrefreshtoken(user._id);
        if (!tokens) {
            return res.redirect(`${FRONTEND_URL}login-onboarding.html?error=Failed to generate session tokens`);
        }
        const { accesstoken, refreshtoken } = tokens;

        /** @type {import('express').CookieOptions} */
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        };

        // If user is brand new or missing role/hospital, redirect to complete-profile onboarding with tokens
        if (!user.role || !user.hospital_id) {
            return res.cookie("accesstoken", accesstoken, options)
                      .cookie("refreshtoken", refreshtoken, options)
                      .redirect(`${FRONTEND_URL}complete-profile.html?email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}&accesstoken=${accesstoken}&refreshtoken=${refreshtoken}`);
        }

        // Determine destination dashboard based on role
        let targetDashboard = "login-onboarding.html";
        if (user.role === "Super Admin") targetDashboard = "super-admin-dashboard.html";
        else if (user.role === "Hospital Admin") targetDashboard = "hospital-admin-dashboard.html";
        else if (user.role === "Doctor") targetDashboard = "doctor-queue.html";
        else if (user.role === "Receptionist") targetDashboard = "token-generation.html";

        res.cookie("accesstoken", accesstoken, options)
           .cookie("refreshtoken", refreshtoken, options)
           .redirect(`${FRONTEND_URL}${targetDashboard}?accesstoken=${accesstoken}&refreshtoken=${refreshtoken}`);

    } catch (error) {
        console.error("Google OAuth Callback Error:", error);
        res.redirect(`https://awaisfraaz.github.io/HMS/login-onboarding.html?error=Internal server error`);
    }
});

// POST /api/v1/user/complete-profile
router.post('/complete-profile', verifyjwt, async (req, res) => {
    try {
        const { email, name, role, hospital_id } = req.body;
        if (!name || !role || !hospital_id) {
            return res.status(400).json({ message: "Please fill all the required fields" });
        }
        if (role === "Doctor") {
            return res.status(400).json({ message: "Doctor accounts can only be registered directly by a Hospital Admin." });
        }

        let user = await User.findById(req.user._id);
        if (!user) {
            user = await User.findOne({ email });
        }
        if (!user) {
            return res.status(404).json({ message: "User account not found" });
        }

        user.name = name;
        user.role = role;
        user.hospital_id = hospital_id;
        if (!user.status || user.status === "Pending") {
            user.status = "Approved";
        }

        await user.save();

        const tokens = await generateaccessandrefreshtoken(user._id);
        const accesstoken = tokens ? tokens.accesstoken : null;
        const refreshtoken = tokens ? tokens.refreshtoken : null;

        /** @type {import('express').CookieOptions} */
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        };

        const loggeduser = await User.findById(user._id).select("name email role hospital_id status");

        res.status(200)
           .cookie("accesstoken", accesstoken, options)
           .cookie("refreshtoken", refreshtoken, options)
           .json({
               message: "Profile completed successfully",
               user: loggeduser,
               accesstoken,
               refreshtoken
           });
    } catch (error) {
        console.error("Complete Profile Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
module.exports = router;
