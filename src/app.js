import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import dayjs from "dayjs"
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
    to:Joi.string().valid("Todos", "").required(),
    text:Joi.string().required(),
    type:Joi.string().valid("message", "private_message").required()
}) 

checkUsers()

app.post("/participants", async (req, res) => {
    try{
        const user = await userSchema.validateAsync(req.body)

        const resp = await db.collection("participants").findOne(user)
        if (resp) return res.status(409).send("Nome já está em uso")

        await db.collection("participants").insertOne({ ...user, lastStatus: Date.now() })
        await db.collection('messages').insertOne({ from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: dayjs(Date.now()).format('HH:MM:ss') })
        res.sendStatus(201)
    } catch (err) {
        if (err.isJoi) return res.sendStatus(422)

        res.status(500).send(err.message)
    }
})

app.get("/participants", async (req, res) => {
    try {
        const userList = await db.collection("participants").find({}).toArray()
        return res.send(userList)
    } catch (err) {
        res.status(500).send(err.message)
    }
})

app.post("/messages", async (req, res) => {
    const message = await messageSchema.validateAsync(req.body)
    const user = req.headers.user
    const onlineUser = await db.collection("participants").findOne({name: req.headers.user})
    if (!onlineUser) return res.sendStatus(422)

    try {
        await db.collection("messages").insertOne({
            from: user,
            ...message,
            time: dayjs(Date.now()).format("HH:mm:ss")
        })
        return res.sendStatus(201)
    } catch (err) {
        if (err.isJoi) return res.sendStatus(422)

        res.status(500).send(err.message)
    }
})

app.get("/messages", async (req, res) => {
    const { query } = req
    const { user } = req.body

    try {
        const messages = await db.collection("messages").find({ $or: [{from: user}, {to: user}, {to: "Todos"}]}).toArray()

        if (query.limit) {
            const messagesLimit = Number(query.limit)

            if (messagesLimit < 1 || isNaN(messagesLimit)) return sendStatus(422)

            return res.send([...messages].slice(-messagesLimit).reverse())
        }

        return res.send([...messages].reverse())
    } catch (err) {
        return res.sendStatus(500)
    } 
})

app.post("/status", async (req, res) => {
    try {
        const { user } = req.headers
        const existUser = await db.collection("participants").findOne({ name: user })

        if (!existUser) return sendStatus(404)

        await db.collection("participants").updateOne({ name: user }, { $set: {lastStatus: Date.now()}})
        return res.sendStatus(200)
    } catch (err) {
        return res.sendStatus(404)
    }
})

function checkUsers(){
    const timer = 10000
    setInterval(async () => {
        try {
            const now = dayjs();
            const maxTimeOff = now.valueOf() - timer;
            const inactiveList = await db.collection("participants").find({ lastStatus: { $lte: maxTimeOff } }).toArray();
            inactiveList.map(async (inactiveUser)=>{
                await db.collection("participants").deleteOne({ _id: inactiveUser._id });
                await db.collection("messages").insertOne({from:inactiveUser.name,to:"Todos",text:"sai da sala...",type:"status",time:now.format('HH:mm:ss')})
            })

        } catch (error) {
            return res.sendStatus(500)
        }
    }, timer);
}

const PORT = 5000
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)
}) 