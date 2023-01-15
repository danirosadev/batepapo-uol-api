import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import joi from "joi"
import dotenv from "dotenv"
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)

try {
    await mongoClient.connect()
    console.log('MongoDB Connected!')
} catch (err) {
    console.log(err.message)
}

const db = mongoClient.db('batepapo-uol')


const app = express()

app.use(express.json())
app.use(cors())

const userSchema = joi.object({
    name:joi.string().required()
})

app.post('/participants', async (req, res) => {
    const user = req.body

    const validation = userSchema.validate(user)
    if (validation.error) {
        return res.status(422).send(validation.error.details)
    }

    try{
        const resp = await db.collection().findOne(user)
        if (resp === "") return res.status(422).send("Nome não pode ficar em branco")
        if (resp) return res.status(409).send("Nome já está em uso")

        await db.collection('participants').insertOne({
            ...user,
            lastStatus: Date.now()
        })
        return res.sendStatus(201)
    } catch (err) {
        return res.status(500).send(err.message)
    }
})

app.get('/participants', (req, res) => {

})

app.post('/messages', (req, res) => {})

app.get('messages', (req, res) => {})

app.post('/status', (req, res) => {})

const PORT = 5000
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})