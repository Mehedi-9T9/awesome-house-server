const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express()
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const jwt = require('jsonwebtoken');

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

        //user verification with jwt
        app.post("/jwt", async (req, res) => {
            const userInfo = req.body
            const token = jwt.sign(userInfo, process.env.JWT_TOKEN, { expiresIn: "1h" })
            res.send({ token })
        })
        //midleware
        const verifyToken = (req, res, next) => {
            const getToken = req.headers.authorization
            if (!getToken) {
                return res.status(401).send({ message: "forbidden access" })
            }
            jwt.verify(getToken, process.env.JWT_TOKEN, (err, decoded) => {
                // err
                if (err) {
                    return res.status(401).send({ message: "forbidden access" })
                }
                req.decoded = decoded
                // decoded undefined
            });
            next()

        }
        const verifyAdmin = async (req, res, next) => {
            // console.log(req.decoded);
            const email = req.decoded.email
            const filter = { userEmail: email }
            const isAdmin = await usersCollection.findOne(filter)
            // console.log(isAdmin);
            if (!isAdmin) {
                return res.status(401).send({ message: "forbidden access" })
            }
            next()
        }

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
        //login google and save data in
        app.post("/socialUser", async (req, res) => {
            const socialUser = req.body
            const email = req.query.email
            const filter = { userEmail: email }
            const emailInfo = await usersCollection.findOne(filter)
            if (!emailInfo) {
                const result = await usersCollection.insertOne(socialUser)
                res.send(result)
            } else {
                res.send("already have database")
            }
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
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const filter = { role: "member" }
            const result = await usersCollection.find(filter).toArray()
            res.send(result)
        })
        //demotion user
        app.patch("/demotionUser", verifyToken, verifyAdmin, async (req, res) => {
            const email = req.query.email
            const filter = { userEmail: email }
            const updateDoc = {
                $set: {
                    role: "user"
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)

            const statusResult = await userRoomCollection.deleteOne(filter)
            res.send([result, statusResult])

        })

        //ruquest data related api
        app.get("/pendingdata", verifyToken, async (req, res) => {
            const filter = { status: 'pending' }
            // const getToken = req.headers
            // console.log(getToken);
            const result = await userRoomCollection.find(filter).toArray()
            res.send(result)
        })

        //annaousment related
        app.post("/annaousement", verifyToken, verifyAdmin, async (req, res) => {
            const annaousement = req.body
            const result = await annaousementCollection.insertOne(annaousement)
            res.send(result)
        })
        //Annaousment data load
        app.get("/annaousmentData", verifyToken, async (req, res) => {
            const result = await annaousementCollection.find().toArray()
            res.send(result)
        })

        //update status and user to member
        app.patch("/booking", verifyToken, async (req, res) => {
            const userId = req.query.userId
            const email = req.query.email
            const oldId = req.query.oldId
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
            const mainFilter = { _id: new ObjectId(oldId) }
            const mainDoc = {
                $set: {
                    status: `booked on ${currentDate}`,

                },
            };
            const mainResult = await apertmentsCollection.updateOne(mainFilter, mainDoc)
            res.send([statusResult, userResult, mainResult])

        })
        //delete apertment
        app.delete("/deleteApertment", verifyToken, verifyAdmin, async (req, res) => {
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
        app.get("/paymentData", verifyToken, async (req, res) => {
            const email = req.query.email

            const filter = { userEmail: email }
            const result = await paymentCollection.find(filter).toArray()
            res.send(result)
        })

        app.get("/paymentmonth", verifyToken, async (req, res) => {
            const email = req.query.email
            const month = req.query.month

            const query = { userEmail: email, month: month }
            console.log(query);
            const result = await paymentCollection.find(query).toArray()
            console.log(result);
            res.send(result)
        })

        // admin dasboard
        app.get("/adminInfo", verifyToken, verifyAdmin, async (req, res) => {
            const totalRoom = await apertmentsCollection.estimatedDocumentCount()
            const totalAvailableRoom = await userRoomCollection.estimatedDocumentCount()
            const availableRoom = ((totalRoom - totalAvailableRoom) / totalRoom) * 100
            const bookedRoom = (totalAvailableRoom / totalRoom) * 100
            // users
            const userFilter = { role: "user" }
            const findUsers = await usersCollection.find(userFilter).toArray()
            const totalUsers = findUsers.length
            //member
            const memberFilter = { role: "member" }
            const findMember = await usersCollection.find(memberFilter).toArray()
            const totalMember = findMember.length
            const adminInfo = { totalRoom, availableRoom, bookedRoom, totalUsers, totalMember }
            res.send(adminInfo)
            // console.log(totalRoom);
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