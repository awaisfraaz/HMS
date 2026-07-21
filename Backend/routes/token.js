const express= require("express");
const router = express.Router();
const Token = require("../models/token");
const Doctor = require("../models/doctor");
const verifyjwt = require("../middleware/auth");
const Patient = require("../models/patient");
router.get('/all',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const tokens = await Token.find({ hospitalId: hospital_id });
        const tokencount = await Token.countDocuments({ hospitalId: hospital_id });
        res.status(200).json({tokens,tokencount});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})

// generate token 
router.post('/generate',verifyjwt,async (req,res)=>{
    try {
        const { doctorId, patientName, patientPhone, age, gender, bloodgroup } = req.body;

        const resolvedHospitalId = req.user.hospital_id;
        const resolvedDoctorId = doctorId;
        const resolvedPatientName = patientName;
        const resolvedPatientPhone = patientPhone || "";

        if (!resolvedDoctorId || !resolvedPatientName || !age || !gender || !bloodgroup) {
            return res.status(400).json({ message: "Doctor ID, Patient Name, Age, Gender, and Blood Group are required" });
        }

        // Find doctor details directly from database
        const doctor = await Doctor.findById(resolvedDoctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }
        const resolvedDoctorName = doctor.name;
        const resolvedDepartment = doctor.speciality || doctor.specialty || "General Medicine";
        
        // Generate sequential token number for this doctor
        const count = await Token.countDocuments({ doctorId: resolvedDoctorId });
        const resolvedTokenNumber = count + 1;

        // Calculate estimated wait time
        const waitingCount = await Token.countDocuments({ doctorId: resolvedDoctorId, status: "Waiting" });
        const waitTimeVal = waitingCount * 10;
        const resolvedWaitTime = waitTimeVal > 0 ? `${waitTimeVal} mins` : "Immediate";

        // Current time format
        const resolvedIssuedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Generate unique tokenid
        const resolvedTokenid = `TK-${resolvedHospitalId.toString().substring(18)}-${resolvedDoctorId.toString().substring(18)}-${Date.now()}`;

        // Save token to database
        const token = await Token.create({
            tokenid: resolvedTokenid,
            hospitalId: resolvedHospitalId,
            doctorId: resolvedDoctorId,
            doctorName: resolvedDoctorName,
            department: resolvedDepartment,
            patientName: resolvedPatientName,
            patientPhone: resolvedPatientPhone,
            tokenNumber: resolvedTokenNumber,
            status: "Waiting",
            issuedTime: resolvedIssuedTime,
            waitTime: resolvedWaitTime
        });

        // Save patient registration details to database
        const patient = await Patient.create({
            name: resolvedPatientName,
            age: Number(age),
            gender: gender,
            contact_no: resolvedPatientPhone,
            bloodgroup: bloodgroup,
            hospital_id: resolvedHospitalId
        });     
        
        res.status(200).json({ token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.get('/lasttoken',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const lasttoken = await Token.findOne({ hospitalId: hospital_id }).sort({ createdAt: -1 });
        res.status(200).json({ lasttoken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.get('/totaltokengeneratedinday',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const totaltokengeneratedinday = await Token.countDocuments({
            hospitalId: hospital_id,
            createdAt: { $gte: startOfToday }
        });
        res.status(200).json({ totaltokengeneratedinday });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})

router.get('/public-queue/:hospitalId', async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const tokens = await Token.find({ hospitalId });
        const doctors = await Doctor.find({ hospital_id: hospitalId });
        res.status(200).json({ tokens, doctors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports=router;