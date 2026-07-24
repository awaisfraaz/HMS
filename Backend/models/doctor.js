const mongoose = require('mongoose')

const Doctorschema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    speciality: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["Available", "Unavailable", "On Break"],
        default: "Available",
        required: true,
    },
    schedule: {
        type: String,
    },
    room: {
        type: String,
    },
    consultationfee: {
        type: Number,
        required: true,
        default: 0,
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
        required: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true })
const Doctor = mongoose.model("Doctor", Doctorschema);
module.exports = Doctor;