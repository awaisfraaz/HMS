import moongose from 'mongoose'

const patientschema = new moongose.Schema({


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
        type: moongose.Schema.Types.ObjectId,
        ref: "Hospital"

    },

})
const Patient = moongose.model("Patient", patientschema);
export default Patient;