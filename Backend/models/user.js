import moongose from 'mongoose'

const Userschema = new moongose.Schema({


    userid: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    hospital_id: {
        type: moongose.Schema.Types.ObjectId,
        ref: "Hospital"

    },

})
const User = moongose.model("User", Userschema);
export default User;