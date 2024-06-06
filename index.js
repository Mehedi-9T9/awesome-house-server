const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express()
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_KEY);

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Awesome House Server is running")
})
//mongodb code start

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const annaousementCollection = client.db("apertmentsColletion").collection("annaousement")
        const paymentCollection = client.db("apertmentsColletion").collection("paymentInfo")
        const couponsCollection = client.db("apertmentsColletion").collection("coupons")

        //user role related
        app.get("/userRole", async (req, res) => {
            const email = req.query.email
            const filter = { userEmail: email }
            const options = {
                projection: { _id: 0, role: 1 },
            };
            const result = await usersCollection.findOne(filter, options)
            res.send(result)


        })
        //coupons related
        app.get("/coupons", async (req, res) => {
            const result = await couponsCollection.findOne()
            res.send(result)

        })
        // update coupons
        app.patch("/updateCoupon", async (req, res) => {
            const couponInfo = req.body
            const couponId = req.query.couponId
            const filter = { _id: new ObjectId(couponId) }
            const updateDoc = {
                $set: {
                    offer: couponInfo.inputOffer,
                    coupon: couponInfo.inputCoupon,
                }
            }
            const result = await couponsCollection.updateMany(filter, updateDoc)
            res.send(result)
        })


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
            const email = req.query.email
            const filter = { userEmail: email }
            const search = await userRoomCollection.findOne(filter)

            if (!search) {
                const result = await userRoomCollection.insertOne(userRoom)
                res.send(result)


            } else {
                res.send('You already Book')
            }


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
            const filter = { userEmail: email, status: "booked" }
            const result = await userRoomCollection.find(filter).toArray()
            res.send(result)
        })

        // admin related
        app.get("/users", async (req, res) => {
            const filter = { role: "member" }
            const result = await usersCollection.find(filter).toArray()
            res.send(result)
        })
        //demotion user
        app.patch("/demotionUser", async (req, res) => {
            const email = req.query.email
            const filter = { userEmail: email }
            const updateDoc = {
                $set: {
                    role: "user"
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            const updateStatus = {
                $set: {
                    status: "pending"
                }
            }
            const statusResult = await userRoomCollection.updateMany(filter, updateStatus)
            res.send([result, statusResult])

        })

        //ruquest data related api
        app.get("/pendingdata", async (req, res) => {
            const filter = { status: 'pending' }
            const result = await userRoomCollection.find(filter).toArray()
            res.send(result)
        })

        //annaousment related
        app.post("/annaousement", async (req, res) => {
            const annaousement = req.body
            const result = await annaousementCollection.insertOne(annaousement)
            res.send(result)
        })
        //Annaousment data load
        app.get("/annaousmentData", async (req, res) => {
            const result = await annaousementCollection.find().toArray()
            res.send(result)
        })

        //update status and user to member
        app.patch("/booking", async (req, res) => {
            const userId = req.query.userId
            const email = req.query.email
            const currentDate = new Date().toLocaleDateString();
            const filterId = { _id: new ObjectId(userId) }
            const updateDoc = {
                $set: {
                    status: "booked",
                    acceptDate: currentDate,
                },
            };
            const statusResult = await userRoomCollection.updateOne(filterId, updateDoc)
            //user update
            const filterEmail = { userEmail: email }

            const userDoc = {
                $set: {
                    role: "member",

                }
            }
            const userResult = await usersCollection.updateOne(filterEmail, userDoc)
            res.send([statusResult, userResult])

        })
        //delete apertment
        app.delete("/deleteApertment", async (req, res) => {
            const id = req.query.id
            const filter = { _id: new ObjectId(id) }
            const result = await userRoomCollection.deleteOne(filter)
            res.send(result)
        })


        //Payment related api
        app.post("/create-payment-intent", async (req, res) => {
            const { rent } = req.body
            const amount = parseInt(rent * 100)
            const paymentIntent = await stripe.paymentIntents.create({
                // amount: calculateOrderAmount(items),
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']

                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                // automatic_payment_methods: {
                //   enabled: true,
                // },
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        //payment data save in database
        app.post("/paymentInfo", async (req, res) => {
            const paymentInfo = req.body
            const result = await paymentCollection.insertOne(paymentInfo)
            res.send(result)
        })
        //send payment data
        app.get("/paymentData", async (req, res) => {
            const email = req.query.email

            const filter = { userEmail: email }
            const result = await paymentCollection.find(filter).toArray()
            res.send(result)
        })

        app.get("/paymentmonth", async (req, res) => {
            const email = req.query.email
            const month = req.query.month

            const query = { userEmail: email, month: month }
            console.log(query);
            const result = await paymentCollection.find(query).toArray()
            console.log(result);
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