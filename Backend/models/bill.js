const mongoose = require("mongoose");
const BillSchema = new mongoose.Schema({

  
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient"
    },
    patientName: {
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    total: {
        type: Number,
        required: true,
    },
    paymentMode: {
        type: String,
        required: true,
    }

}, { timestamps: true })
const Bill = mongoose.model("Bill", BillSchema);

    
module.exports = Bill;