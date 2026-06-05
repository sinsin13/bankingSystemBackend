const express = require("express")
const authRouter = require("./routes/auth.routes.js")


const app = express()


app.use(express.json()) //middleware to parse json data from request body
app.use("/api/auth", authRouter)



module.exports= app