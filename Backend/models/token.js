const mongoose = require('mongoose')
const tokenschema = new mongoose.Schema({


    tokenid: {
        type: String,
        required: true,
        unique: true,
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor"
    },
    doctorName: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        required: true,
    },
    patientName: {
        type: String,
        required: true,
    },
    patientPhone: {
        type: String,
        required: true,
    },
    tokenNumber: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    issuedTime: {
        type: String,
        required: true,
    },
    waitTime: {
        type: String,
        required: true,
    }

}, { timestamps: true })
const Token = mongoose.model("Token", tokenschema);
module.exports = Token;
