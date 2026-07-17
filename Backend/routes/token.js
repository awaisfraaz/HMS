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
        const {
            hospitalid, doctorid, tokenid, patientname, patientphone, tokennumber, status, waittime, doctorName, department,
            hospitalId, doctorId, patientName, patientPhone, tokenNumber, waitTime, issuedTime,bloodgroup,age,gender
        } = req.body;

        const resolvedHospitalId = hospitalId || hospitalid || req.user.hospital_id;
        const resolvedDoctorId = doctorId || doctorid;
        const resolvedPatientName = patientName || patientname;
        const resolvedPatientPhone = patientPhone || patientphone || "";

        if (!resolvedDoctorId || !resolvedPatientName) {
            return res.status(400).json({ message: "Doctor ID and Patient Name are required" });
        }
        //  create doctor 
      
            

        // Find doctor details if name/department not provided
        let resolvedDoctorName = doctorName;
        let resolvedDepartment = department;
        if (!resolvedDoctorName || !resolvedDepartment) {
            const doctor = await Doctor.findById(resolvedDoctorId);
            if (doctor) {
                resolvedDoctorName = doctor.name;
                resolvedDepartment = doctor.speciality || doctor.specialty || "General Medicine";
            } else {
                return res.status(404).json({ message: "Doctor not found" });
            }
        }
        
        // Generate sequential token number for this doctor if not provided
        let resolvedTokenNumber = tokenNumber || tokennumber;
        if (!resolvedTokenNumber) {
            const count = await Token.countDocuments({ doctorId: resolvedDoctorId });
            resolvedTokenNumber = count + 1;
        }

        // Calculate wait time if not provided
        let resolvedWaitTime = waitTime || waittime;
        if (!resolvedWaitTime) {
            const waitingCount = await Token.countDocuments({ doctorId: resolvedDoctorId, status: "Waiting" });
            const waitTimeVal = waitingCount * 10;
            resolvedWaitTime = waitTimeVal > 0 ? `${waitTimeVal} mins` : "Immediate";
        }

        // Issued time
        const resolvedIssuedTime = issuedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Unique tokenid
        const resolvedTokenid = tokenid || `TK-${resolvedHospitalId.toString().substring(18)}-${resolvedDoctorId.toString().substring(18)}-${Date.now()}`;

        const token = await Token.create({
            tokenid: resolvedTokenid,
            hospitalId: resolvedHospitalId,
            doctorId: resolvedDoctorId,
            doctorName: resolvedDoctorName,
            department: resolvedDepartment,
            patientName: resolvedPatientName,
            patientPhone: resolvedPatientPhone,
            tokenNumber: resolvedTokenNumber,
            status: status || "Waiting",
            issuedTime: resolvedIssuedTime,
            waitTime: resolvedWaitTime
        });
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
module.exports=router;