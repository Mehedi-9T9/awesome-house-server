const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express()
require('dotenv').config()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Awesome House Server is running")
})
//mongodb code start

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cd4uzfy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const apertmentsCollection = client.db("apertmentsColletion").collection("apertments")
        const userRoomCollection = client.db("apertmentsColletion").collection("userRoom")
        const usersCollection = client.db("apertmentsColletion").collection("users")

        //apertments related api
        app.get("/apertments", async (req, res) => {


            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const result = await apertmentsCollection.find().skip(page * size).limit(size).toArray()
            res.send(result)
        })
        app.get("/totalApertment", async (req, res) => {
            const totalApertment = await apertmentsCollection.estimatedDocumentCount()
            res.send({ totalApertment })
        })

        // user related api, user selectes items
        app.post("/userroom", async (req, res) => {
            const userRoom = req.body
            const result = await userRoomCollection.insertOne(userRoom)
            res.send(result)

        })
        //user of save data in database
        app.post('/user', async (req, res) => {
            const userinfo = req.body
            const result = await usersCollection.insertOne(userinfo)
            res.send(result)
        })

        //member data load
        app.get("/myRoom", async (req, res) => {
            const email = req.query.email
            const filter = { userEmail: email }
            const result = await userRoomCollection.find(filter).toArray()
            res.send(result)
        })

        // admin related
        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        //ruquest data related api
        app.get("/pendingdata", async (req, res) => {
            const filter = { status: 'pending' }
            const result = await userRoomCollection.find(filter).toArray()
            res.send(result)
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.log);

//mongodb code end

app.listen(port, () => {
    console.log(`awesome house server running : ${port}`);
})