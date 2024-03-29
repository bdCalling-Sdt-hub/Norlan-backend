const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    primary_color:{
        type: String,
        required: true
    },
    secondary_color:{
        type: String,
        required: true
    },
    image:{

        type: String,
        required: true
    },
    sub_category:[
        {
            name:{
                type: String,
                required: false,
            },
            color:{
                type: String,
                required: false
            },
            image: {
                type: String,
                required: false
            }
        }
    ]
},{ timestamps: true });

const CategorySchema = mongoose.model("category", categorySchema);
module.exports = CategorySchema;
