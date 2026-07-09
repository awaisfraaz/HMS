const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();



async function dbconnect() {
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to database");
        console.log(connectionInstance.connection.host);

    } catch (error) {
        console.log(error);
        throw error;
        // process.exit(1);
    }
}

module.exports = dbconnect;