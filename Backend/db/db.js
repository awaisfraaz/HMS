const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

let isConnected = false;

async function dbconnect() {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    try {
        const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true;
        console.log("Connected to database:", connectionInstance.connection.host);
    } catch (error) {
        console.error("Database connection error:", error);
        throw error;
    }
}

module.exports = dbconnect;