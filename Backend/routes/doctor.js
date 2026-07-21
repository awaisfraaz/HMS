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
        const tokens = await Token.find({ doctorId: doctor._id });
        res.status(200).json({ tokens });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});
router.get('/gettokes',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const tokens = await Token.find({ hospitalId:hospital_id });
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
            token.doctorId = doctorId;
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
// total tokens genrata total patients completed and patient waiting 
router.get('/doctordashboard',verifyjwt,async (req,res)=>{
    try {
        const doctor = await Doctor.findOne({ user_id: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: "Doctor profile not found" });
        }

        const totalTokens = await Token.countDocuments({ doctorId: doctor._id });
        const completedPatients = await Token.countDocuments({ doctorId: doctor._id, status: "Completed" });
        const waitingPatients = await Token.countDocuments({ 
            doctorId: doctor._id, 
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