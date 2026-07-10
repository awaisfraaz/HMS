const express = require("express");
const router = express.Router()
const codegenerator = require("../utils/codegenerator")
const Hospital = require("../models/hospital")



router.get('/', (req, res) => {
    res.send('Hello World!')
})
router.post('/login', (req, res) => {
    res.send('Login')
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

module.exports = router;