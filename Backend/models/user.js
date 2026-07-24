const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()

const Userschema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: false, // Optional for Google OAuth users
    },
    googleId: {
        type: String,
        required: false,
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },
    role: {
        type: String,
        required: false, // Set during onboarding if new user
        enum: ["Super Admin", "Hospital Admin", "Doctor", "Receptionist"]
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending", "Approved", "Rejected"]
    },
    // Refresh Token in db long live 
    refreshToken: {
        type: String,
        required: false,
    },
}, { timestamps: true })

// Hash password pre-save middleware (only if password exists and modified)
Userschema.pre("save", async function (next) {
    if (!this.password || !this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

Userschema.methods.isPasswordValid = async function (password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
}

Userschema.methods.generateaccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: /** @type {any} */ (process.env.ACCESS_TOKEN_EXPIRY) }
    );
}

Userschema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: /** @type {any} */ (process.env.REFRESH_TOKEN_EXPIRY) }
    );
}

Userschema.methods.checkisvaliduser = function () {
    return this.role === "Super Admin" || this.status === "Approved";
}   

const User = mongoose.model("User", Userschema);
module.exports = User;
