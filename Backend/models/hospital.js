const mongoose = require('mongoose')
const HospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    hospitalcode: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        default: "Pending",
        enum: ["Pending", "Approved", "Rejected"]
    },
    subscriptiontier: {
        type: String,
        enum: ["Basic", "Pro", "Enterprise"],
        default: "Basic",
        required: true,
    },


}, { timestamps: true })
const Hospital = mongoose.model("Hospital", HospitalSchema);
module.exports = Hospital;  

