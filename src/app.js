const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()


app.use(express.json()) //middleware to parse json data from request body
app.use(cookieParser()) //middleware to parse cookies from request headers



// route required
const authRouter  = require("./routes/auth.routes.js")
const accountRouter = require("./routes/account.routes.js")





// use routers

app.use("/api/auth", authRouter)
app.use("/api/account", accountRouter)



module.exports= app