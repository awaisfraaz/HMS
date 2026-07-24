const express = require("express");
const router = express.Router();
const Plans = require("../models/plans");
const verifyjwt = require("../middleware/auth");

// Get all plans (public)
router.get('/all', async (req, res) => {
    try {
        const plans = await Plans.find();
        res.status(200).json({ plans });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get single plan by ID
router.get('/:id', async (req, res) => {
    try {
        const plan = await Plans.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        res.status(200).json({ plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Create a new plan (Super Admin only)
router.post('/create', verifyjwt, async (req, res) => {
    try {
        if (req.user.role !== "Super Admin") {
            return res.status(403).json({ message: "Forbidden. Only Super Admin can create plans" });
        }
        const { name, price, description, active_tenants } = req.body;
        if (!name || price === undefined || !description) {
            return res.status(400).json({ message: "Name, price, and description are required" });
        }
        const plan = await Plans.create({
            name,
            price: Number(price),
            description,
            active_tenants: Number(active_tenants) || 0
        });
        res.status(201).json({ plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update a plan (Super Admin only)
router.put('/:id', verifyjwt, async (req, res) => {
    try {
        if (req.user.role !== "Super Admin") {
            return res.status(403).json({ message: "Forbidden. Only Super Admin can update plans" });
        }
        const { name, price, description, active_tenants } = req.body;
        const plan = await Plans.findByIdAndUpdate(
            req.params.id,
            { name, price: Number(price), description, active_tenants: Number(active_tenants) || 0 },
            { new: true }
        );
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        res.status(200).json({ plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Delete a plan (Super Admin only)
router.delete('/:id', verifyjwt, async (req, res) => {
    try {
        if (req.user.role !== "Super Admin") {
            return res.status(403).json({ message: "Forbidden. Only Super Admin can delete plans" });
        }
        const plan = await Plans.findByIdAndDelete(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        res.status(200).json({ message: "Plan deleted successfully", plan });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
