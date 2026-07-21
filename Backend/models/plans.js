const mongoose = require('mongoose');

const plansSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    price:{
        type:Number,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    active_tenants:{
        type:Number,
        required:true,
    },
    
   
});

module.exports = mongoose.model('plans', plansSchema);
