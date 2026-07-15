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
        required: true,
    },
    role: {
        type: String,
        required: true,
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
    // Refresh Token  in db long live 
    refreshToken: {
        type: String,
        required: false,
    },

}, { timestamps: true })
// Milddleware h next zrror use hoga 
Userschema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    // it is solving we do not want data is has every time thats why checking 
    this.password = await bcrypt.hash(this.password, 10);
    next();
})
Userschema.methods.isPasswordValid = async function (password) {
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

