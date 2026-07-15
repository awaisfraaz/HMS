const mongoose = require("mongoose");
const appointmentschema = new mongoose.Schema({
    appointment_id: {
        type: String,
        required: true,
        unique: true,
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor"
    },
    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },
    appointment_date: {
        type: Date,
        required: true,
    },
    patientname: {
        type: String,
        required: true,
    },
    patientage: {
        type: Number,
        required: true,
    },
    patientgender: {
        type: String,
        required: true,
    },
    patientcontact_no: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    payment_status: {
        type: String,
        enum: ["Paid", "Pending"],
        default: "Pending",
        required: true,
    },


}, { timestamps: true })
const Appointment = mongoose.model("Appointment", appointmentschema);
module.exports = Appointment;
