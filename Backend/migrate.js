const mongoose = require("mongoose");
const User = require("./models/user");
const Hospital = require("./models/hospital");
const dotenv = require("dotenv");
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const hospital = await Hospital.findOne();
        if (!hospital) {
            console.log("No hospitals found in your MongoDB. Please register a hospital first.");
            process.exit(0);
        }
        console.log(`Migrating old users to live hospital: "${hospital.name}" (${hospital._id})`);
        
        // Use raw MongoDB driver connection to bypass Mongoose ObjectId schema casting validation
        const result = await mongoose.connection.db.collection('users').updateMany(
            { 
                $or: [
                    { hospital_id: null },
                    { hospital_id: { $exists: false } },
                    { hospital_id: "hosp-1" },
                    { hospital_id: "hosp-2" },
                    { hospital_id: "hosp-3" }
                ]
            },
            { $set: { hospital_id: hospital._id } }
        );
        
        console.log(`Successfully updated ${result.modifiedCount} old user documents in MongoDB.`);
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}
run();
