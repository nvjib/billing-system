require("dotenv").config()
const express = require("express")
const pool = require("./db")
const app = express()

app.use(express.json())

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server is running on: http://localhost:${port}`))