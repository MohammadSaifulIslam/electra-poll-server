const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7p3fj4a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const votersCollection = client.db("electraPollDB").collection("voters");

    // ======================voter related apis===========================
    // get all voter by manager's email api
    app.get("/voters/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await votersCollection.find(query).toArray();
      res.send(result);
    });
    // add voter api
    app.post("/add-voters", async (req, res) => {
      const voterInfo = req.body;
      console.log(voterInfo)
        const result = await votersCollection.insertOne(voterInfo);
        res.send(result);
    });

    // delete voter api
    app.delete('/voters/:id', async (req,res)=> {
      const {id} = req.params;
      const query = {_id: new ObjectId(id)}
      const result = await votersCollection.deleteOne(query);
      res.send(result)
    })

    app.get("/elections/:email", async(req,res)=>{
      const { email } = req.params;
      const query = { email: email };
      const result = await electionCollection.find(query).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});