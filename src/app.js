import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import Joi from "joi"
import dotenv from "dotenv"
dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db

try {
    await mongoClient.connect()
    console.log('MongoDB Connected!')
    db = mongoClient.db()
} catch (err) {
    console.log(err.message)
}

const app = express()

app.use(express.json())
app.use(cors())

const userSchema = Joi.object({
    name: Joi.string().alphanum().required()
})

const messageSchema = Joi.object({
    from:Joi.string().required(),
    to:Joi.string().required(),
    text:Joi.string().required(),
    type:Joi.string().required(),
    time:Joi.string().required()
})

app.post("/participants", async (req, res) => {
    const user = await userSchema.validateAsync(req.body)

    try{
        const resp = await db.collection("participants").findOne(user)
        if (resp === "") return res.status(422).send("Nome não pode ficar em branco")
        if (resp) return res.status(409).send("Nome já está em uso")

        await db.collection("participants").insertOne({ ...user, lastStatus: Date.now() })
        await db.collection('messages').insertOne({ from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: Date.now() })
        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get("/participants", async (req, res) => {
    try {
        const userList = await db.collection("participants").find({}).toArray()
        return res.send(userList);
    } catch (error) {
        console.error("Erro na rota get/participants", error);
        return res.sendStatus(500);
    }
})

app.post('/messages', (req, res) => {})

app.get('messages', (req, res) => {})

app.post('/status', (req, res) => {})

const PORT = 5000
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
})