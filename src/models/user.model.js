const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
    {
        email : {
            type : String,
            required : [true, "Email is required"],
            trim: true,
            lowercase: true,
            match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please enter a valid email address"],
            unique :[true, "email already exists"]
        },
        name:{
            type : String,
            required : [true, "Name is required"]
        },
        password:{
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "password should contain more than 6 charaters"],
            select: false
        }
    },{
        timestamps : true
    });


    userSchema.pre("save", async function (next) {
        
        
        
    })
