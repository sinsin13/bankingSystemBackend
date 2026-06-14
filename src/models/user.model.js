const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")

// Define the schema for the User collection
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
            select: false  // exclude password from query results by default
        }
    },{
        timestamps : true  // automatically adds createdAt and updatedAt fields
    });


// Pre-save hook: runs before every .save() call
// Hashes the password only if it has been modified (avoids re-hashing on other updates)
userSchema.pre("save", async function () {

    if(!this.isModified("password")){
        return
    }

    const hash = await bcrypt.hash(this.password, 10)  // 10 = salt rounds
    this.password = hash
    return

})


// Instance method: compares a plain-text password against the stored hash
userSchema.methods.comparePassword = async function (password){

    return await bcrypt.compare(password, this.password)
}

// Create the model from the schema and export it
const userModel = mongoose.model("User", userSchema)

module.exports = userModel
