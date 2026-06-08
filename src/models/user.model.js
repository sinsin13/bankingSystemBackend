const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")


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
        
        if(!this.isModified("password")){
            return next()
        }

        const hash = await bcrypt.hash(this.password, 10)
        this.password = hash
        next()

    })


    userSchema.methods.comparePassword = async function (password){
        return await bcrypt.compare(password, this.password)
    }

const userModel = mongoose.model("User", userSchema)

module.exports = userModel
