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

const messageSchema = joi.object({
    from:joi.string().required(),
    to:joi.string().required(),
    text:joi.string().required(),
    type:joi.string().required(),
    time:joi.string().required()
})

app.post("/participants", async (req, res) => {
    const { name } = req.body

    const validation = userSchema.validate({ name })
    if (validation.error) {
        return res.status(422).send(validation.error.details)
    }

    try{
        const resp = await db.collection("participants").findOne({ name })
        if (resp === "") return res.status(422).send("Nome não pode ficar em branco")
        if (resp) return res.status(409).send("Nome já está em uso")

        await db.collection("participants").insertOne({ ...name, lastStatus: Date.now() })
        await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: Date.now() })
        res.sendStatus(201)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.get("/participants", async (req, res) => {
    try {
        const userList = await db.collection("participants").find({}).toArray();
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