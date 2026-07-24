const express = require("express");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1"]);
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const dbconnect = require("./db/db");
const cookieParser = require("cookie-parser");
const app = express();

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, origin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("Public"));
app.use(cookieParser());

// Middleware to ensure DB connection before executing API routes on Serverless
app.use(async (req, res, next) => {
    try {
        await dbconnect();
        next();
    } catch (err) {
        console.error("Database Connection Error:", err);
        res.status(500).json({ message: "Database connection failed" });
    }
});

app.get("/", (req, res) => {
    res.json({ status: "online", message: "HMS Backend API is running successfully!" });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception thrown:', error);
});

const PORT = parseInt(process.env.PORT || "3000", 10);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT} (host: 0.0.0.0)`);
});

// routes
const userrouter = require("./routes/user");
const hospitalrouter = require("./routes/hospital");
const doctorrouter = require("./routes/doctor");
const tokenrouter = require("./routes/token");
const billrouter = require("./routes/bill");
const plansrouter = require("./routes/plans");

app.use("/api/v1/user", userrouter);
app.use("/api/v1/hospital", hospitalrouter);
app.use("/api/v1/doctor", doctorrouter);
app.use("/api/v1/token", tokenrouter);
app.use("/api/v1/bill", billrouter);
app.use("/api/v1/plans", plansrouter);

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    const statusCode = err.statuscode || err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

module.exports = app;
