require("dotenv").config()
const express = require("express")
const pool = require("./db")
const Joi = require("joi")
const bcrypt = require("bcryptjs")
const app = express()

app.use(express.json())

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: true
    })

    if (error) {
        return res.status(400).json({ error: error.message })
    }

    req.body = value
    next()
}

const authSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.base": "Email must be a string",
        "string.empty": "Email cannot be empty",
        "string.email": "Must be a valid email",
        "any.required": "Email is required"
    }),
    password: Joi.string().min(8).required().messages({
        "string.base": "Password must be a string",
        "string.empty": "Password cannot be empty",
        "string.min": "Password cannot be less than 8 characters",
        "any.required": "Password is required"
    })
})

const findUser = async (email) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        )

        return rows[0] || null
    } catch (error) {
        throw error
    }
}

const createUser = async ({ email, password }) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO users (email, password)
            VALUES ($1, $2)
            RETURNING *`,
            [email, password]
        )

        return rows[0] || null
    } catch (error) {
        throw error
    }
}

app.post("/sign-up", validate(authSchema), async (req, res) => {
    const { email, password } = req.body

    const normalisedEmail = email.toLowerCase()

    try {
        const existingUser = await findUser(normalisedEmail)

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" })
        }
    
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
    
        const newUser = await createUser({
            email: normalisedEmail,
            password: hashedPassword
        })
    
        return res.status(201).json({ message: "User created successfully" })
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/login", validate(authSchema), async (req, res) => {
    const { email, password } = req.body

    const normalisedEmail = email.toLowerCase()

    try {
        const user = await findUser(normalisedEmail)

        if (!user) {
            return res.status(404).json({ error: "User could not be found" })
        }
    
        const isValidPassword = await bcrypt.compare(password, user.password)
    
        if (!isValidPassword) {
            return res.status(401).json({ error: "Invalid password" })
        }
    
        return res.status(200).json({ message: "Logged in successfully" })
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" })
    }
})  

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server is running on: http://localhost:${port}`))