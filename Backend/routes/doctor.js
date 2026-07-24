const express = require("express");
const router = express.Router();
const verifyjwt = require("../middleware/auth");
const Doctor  = require("../models/doctor");
const Token = require("../models/token");


router.get('/all',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const doctors = await Doctor.find({ hospital_id });
        const doctorcount = await Doctor.countDocuments({ hospital_id });
        res.status(200).json({doctors,doctorcount});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.get('/mytokens', verifyjwt, async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ user_id: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found." });
        }
        const tokens = await Token.find({ doctor_id: doctor._id });
        res.status(200).json({ tokens });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get('/gettokens',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const tokens = await Token.find({ hospital_id });
        res.status(200).json({tokens});
    } 
    
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})
router.post('/updatetoken',verifyjwt,async (req,res)=>{
    try {
        const {doctorId,tokenId,status} = req.body;
        const token = await Token.findById(tokenId);
        if(!token){
            return res.status(404).json({ message: "Token not found" });
        }
        
        token.status = status || "Completed";
        if (doctorId) {
            token.doctor_id = doctorId;
            const doctor = await Doctor.findById(doctorId);
            if (doctor) {
                token.doctorName = doctor.name;
            }
        }
        
        await token.save();
        res.status(200).json({token});
    } 
    
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})

// Update doctor status (Available / On Break / Unavailable)
router.put('/:id/status', verifyjwt, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !["Available", "Unavailable", "On Break"].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Must be Available, Unavailable, or On Break" });
        }

        // Only Hospital Admin or the doctor themselves can update status
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        if (req.user.role !== "Hospital Admin" && doctor.user_id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden. Only Hospital Admin or the doctor can update status" });
        }

        doctor.status = status;
        await doctor.save();
        res.status(200).json({ doctor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// total tokens generated, total patients completed and patients waiting 
router.get('/doctordashboard',verifyjwt,async (req,res)=>{
    try {
        const doctor = await Doctor.findOne({ user_id: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        const totalTokens = await Token.countDocuments({ doctor_id: doctor._id });
        const completedPatients = await Token.countDocuments({ doctor_id: doctor._id, status: "Completed" });
        const waitingPatients = await Token.countDocuments({ 
            doctor_id: doctor._id, 
            status: { $in: ["Waiting", "In Progress"] } 
        });

        res.status(200).json({
            doctor,
            stats: {
                totalTokens,
                completedPatients,
                waitingPatients
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})


module.exports = router;