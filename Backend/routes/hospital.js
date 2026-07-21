const express = require("express");
const router = express.Router()
const codegenerator = require("../utils/codegenerator")
const Hospital = require("../models/hospital")
const verifyjwt = require("../middleware/auth")



router.get('/', async (req, res) => {
    try {
        const hospitals = await Hospital.find();
        return res.status(200).json(hospitals);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})
// getting hospital name and hospital code
router.get('/all', async (req, res) => {
    try {
        const hospitals = await Hospital.find({}, 'name hospitalcode');
        return res.status(200).json(hospitals);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
})


router.post('/register', async (req, res) => {
    try {
        const { name, address, city, subscriptiontier } = req.body;
        if (!name || !address || !city || !subscriptiontier) {
            return res.status(400).json({ message: "All fields are required" })
        }
        const isuser = await Hospital.findOne({ name })
        if (isuser) {
            return res.status(400).json({ message: "Hospital already exists" })
        }
        const hospitalcode = codegenerator(city)
        const hospital = new Hospital({
            name,
            address,
            city,
            subscriptiontier,
            hospitalcode,
        })
        await hospital.save()
        // console.log(hospital)
        return res.status(200).json({ message: "Hospital registered successfully" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
})
router.post('/updatehospitalstatus',verifyjwt, async (req, res) => {
    try {
        const {id,status} = req.body;
        if(req.user.role !== "Super Admin"){
            return res.status(401).json({ message: "Unauthorized Only Super Admin can update hospital status" })
        }
        const hospital = await Hospital.findByIdAndUpdate(id, { status },{new:true});
        if(!hospital){
            return res.status(404).json({ message: "Hospital not found" })
        }
        res.status(200).json({ message: "Hospital status updated successfully",hospital });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    } 
})

router.delete('/deletehospital', verifyjwt, async (req, res) => {
    try {
        const { id } = req.body;
        if (req.user.role !== "Super Admin") {
            return res.status(401).json({ message: "Unauthorized. Only Super Admin can delete hospital" });
        }
        const hospital = await Hospital.findByIdAndDelete(id);
        if (!hospital) {
            return res.status(404).json({ message: "Hospital not found" });
        }
        res.status(200).json({ message: "Hospital deleted successfully", hospital });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;