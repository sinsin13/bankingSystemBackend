const express = require("express")
const authRouter = require("./routes/auth.routes.js")
const cookieParser = require("cookie-parser")

const app = express()


app.use(express.json()) //middleware to parse json data from request body

app.use(cookieParser()) //middleware to parse cookies from request headers
app.use("/api/auth", authRouter)



module.exports= app