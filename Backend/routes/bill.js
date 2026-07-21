const express = require("express");
const router = express.Router();
const verifyjwt = require("../middleware/auth");
const Patient = require("../models/patient");
const Doctor = require("../models/doctor");
const Token = require("../models/token");
const Bill = require("../models/bill");

router.get('/',(req,res)=>{
    res.json({message:"Bill route"})
})

router.get('/allpatients',verifyjwt,async (req,res)=>{
    try {
        const hospital_id = req.user.hospital_id;
        const patients = await Patient.find({ hospital_id });
        res.status(200).json({ patients });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
})

router.get('/all', verifyjwt, async (req, res) => {
    try {
        const hospital_id = req.user.hospital_id;
        const bills = await Bill.find({ hospitalId: hospital_id }).sort({ createdAt: -1 });
        res.status(200).json({ bills });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/create', verifyjwt, async (req, res) => {
    try {
        const { patientId, patientName, description, date, time, total, paymentMode } = req.body;
        
        if (!patientId || !patientName || !description || !total || !paymentMode) {
            return res.status(400).json({ message: "All required billing fields must be provided." });
        }

        const hospitalId = req.user.hospital_id;
        const resolvedDate = date || new Date();
        const resolvedTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const bill = await Bill.create({
            hospitalId,
            patientId,
            patientName,
            description,
            date: resolvedDate,
            time: resolvedTime,
            total: Number(total),
            paymentMode
        });

        res.status(200).json({ bill });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put('/:id/pay', verifyjwt, async (req, res) => {
    try {
        const bill = await Bill.findByIdAndUpdate(req.params.id, { paymentMode: 'Card' }, { new: true });
        if (!bill) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        res.status(200).json({ bill });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
