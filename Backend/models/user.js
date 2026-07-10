import moongose from 'mongoose'
import bcrypt from 'bcrypt'

const Userschema = new moongose.Schema({


    userid: {
        type: String,
        required: true,
        unique: true,
    },
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
    },
    hospital_id: {
        type: moongose.Schema.Types.ObjectId,
        ref: "Hospital"

    },

}, { timestamps: true })
// Milddleware h next zrror use hoga 
Userschema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    // it is solving we do not want data is has every time thats why checking 
    this.password = await bcrypt.hash(this.password, 10);
    next();
})
Userschema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}
Userschema.methods.generateaccessToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role,
            hospital_id: this.hospital_id,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
}
Userschema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            id: this._id,
            email: this.email,
            role: this.role,
            hospital_id: this.hospital_id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
}
const User = moongose.model("User", Userschema);
export default User;