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
        enum: ["Available", "Unavailable"],
        default: "Available",
        required: true,
    },
    schedule: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Schedule",
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
    },
    consultationfee: {
        type: Number,
        required: true,
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital",
    },

})
const Doctor = mongoose.model("Doctor", Doctorschema);
module.exports = Doctor;