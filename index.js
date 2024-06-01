const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
    res.send("Awesome House Server is running")
})


app.listen(port, () => {
    console.log(`awesome house server running : ${port}`);
})