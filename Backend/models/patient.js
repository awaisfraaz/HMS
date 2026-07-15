const mongoose = require('mongoose')

const patientschema = new mongoose.Schema({


    patientid: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    contact_no: {
        type: String,
        required: true,
    },
    bloodgroup: {
        type: String,
        required: true,
    },

    hospital_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
    },

})
const Patient = mongoose.model("Patient", patientschema);
module.exports = Patient;