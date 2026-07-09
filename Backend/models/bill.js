import mongoose from "mongoose";
const BillSchema = new mongoose.Schema({

    bill_id: {
        type: String,
        required: true,
        unique: true,
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },

    patientName: {
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
    },
    status: {
        type: String,
        required: true,
    },

}, { timestamps: true })
const Bill = mongoose.model("Bill", BillSchema);

const billitemschema = new mongoose.Schema({
    billitemid: {
        type: String,
        required: true,
        unique: true,
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bill"
    },
    desc: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
});

const BillItem = mongoose.model("BillItem", billitemschema);

export { Bill, BillItem };