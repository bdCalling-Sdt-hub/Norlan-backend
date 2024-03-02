const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({

   fullName: {
        type: String,
        required: true,
        trim:true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        unique:true
    },
    password: {
        type: String,
        required: true,
        trim:true
    },
    image: {
        type: String,
        trim:true
    },
    mobileNumber: {
        type: String,
        required: false,
        trim:true
    },
    location: {
        type: String,
        required: false,
        trim:true
    },
    instagramLink:{type:String,trim:true,required:false},
    accountStatus:{type:Boolean,default:false,required:false},
    aboutUs:{type:String,trim:true,required:false},
    termAndCondition:{type:Boolean,default:false,required:false},
    role: { type: String,required:false, enum: ['UNKNOWN','USER', 'ARTIST',"ADMIN"], default: 'USER' },
    emailVerified: { type: Boolean, default: false,required:false },
    emailVerifyCode: { type: String, required: false,required:false },
   

},{ timestamps: true })

const UserModel = mongoose.model("user", userSchema);
module.exports=UserModel