const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
    package_name:{
        type: String,
        required: true
    },
    package_duration:{
        type: Number,
        required: true
    },
    package_price:{
        type: Number,
        required: true
    },
    gig_count:{
        type: Number,
        required: true
    },
    package_features:{
        type:Array
    }
},{ timestamps: true });

const SubscriptionSchema = mongoose.model("subscription", subscriptionSchema);
module.exports = SubscriptionSchema;
