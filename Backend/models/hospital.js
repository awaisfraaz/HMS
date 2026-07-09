import mongoose from "mongoose";
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
    subscriptiontier: {
        type: String,
        enum: ["Basic", "Pro", "Enterprise"],
        default: "Basic",
        required: true,
    },


}, { timestamps: true })
const Hospital = mongoose.model("Hospital", HospitalSchema);
export default Hospital;  
