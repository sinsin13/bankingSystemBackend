require("dotenv").config()
const app = require("./src/app.js")
const connectToDB = require("./src/config/db.js")


connectToDB()
app.listen(4000, ()=>{
    console.log("server is running on port 4000");
    
})