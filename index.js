
const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose");


// Middleware
app.use(cors())
app.use(express.json())

const port = process.env.PORT || 8000
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wxgtlrb.mongodb.net/?appName=Cluster0`;

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// const logger = (req, res, next) => {
//   console.log(`${req.method} | ${req.url}`);
//   next();
// };

const verifyToken = async (req, res, next) => {
  const { authorization } = req.headers;
  //   console.log(req.headers, 'from verify token');
  const token = authorization?.split(' ')[1];
  //   console.log(token);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorize' });
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;

    next();
  } catch (error) {
    console.error('Token validation failed:', error);
    return res.status(401).json({ message: 'Unauthorize' });
  }
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = client.db('ideaNestDb')
    const ideaCollection = db.collection('ideases')
    const commentCollection = db.collection('comments')


    /** API Routes  ***************/

    app.get('/ideas', async (req, res) => {

      const { search } = req.query;

      let cursor;


      if (search) {
        cursor = await ideaCollection.find({

          ideaTitle: {
            $regex: search,
            $options: 'i',
          },

          // $or: [
          //   {
          //     ideaTitle: {
          //       $regex: search,
          //       $options: 'i',
          //     },
          //   },
          //   // {
          //   //   instructor: {
          //   //     $regex: search,
          //   //     $options: 'i',
          //   //   },
          //   // },
          // ],
        });
        console.log(searchTerm, cursor, 'from searchTerm');
      } else {
        cursor = ideaCollection.find();
      }
      const result = await cursor.toArray();
      res.json(result);
    });

    // app.get("/ideas", async (req, res) => {
    //   try {
    //     const { search } = req.query;

    //     let query = {};

    //     if (search) {
    //       query = {
    //         title: {
    //           $regex: search,
    //           $options: "i",
    //         },
    //       };
    //     }

    //     const result = await ideaCollection.find(query).toArray();

    //     res.send(result);
    //   } catch (error) {
    //     res.status(500).send({
    //       success: false,
    //       message: error.message,
    //     });
    //   }
    // });


    app.get('/ideas', async (req, res) => {
      const result = await ideaCollection.find().toArray()
      res.send(result)
    })
    app.get('/ideas/featured', async (req, res) => {
      const result = await ideaCollection.find().limit(4).toArray();
      res.send(result);
    })

    app.get('/ideas/:ideasId', verifyToken, async (req, res) => {
      const { ideasId } = req.params
      const query = { _id: new ObjectId(ideasId) }
      const result = await ideaCollection.findOne(query)
      res.send(result)
    })

    /** comment API Routes */

    app.get('/comment/:ideasId', async (req, res) => {
      console.log(req.params.ideasId);
      const result = await commentCollection.find({ ideasId: req.params.ideasId }).toArray()
      console.log(result);
      res.send(result)

    })
    app.get('/comments-by-userId/:userId', async (req, res) => {
      // console.log(req.params.userId);
      const { userId } = req.params
      const result = await commentCollection.find({ userId: userId }).toArray()
      // const result = await commentCollection.find({ userId: req.params.userId }).toArray()
      res.send(result)

    })

    app.post("/comment", async (req, res) => {
      const newComments = req.body;
      const result = await commentCollection.insertOne(newComments);
      res.send(result);
    });
    
    app.delete('/comment/:commentId', async (req, res) => {
      const { commentId } = req.params;
      const result = await commentCollection.deleteOne({ _id: new ObjectId(commentId) })
      res.send(result)
    })











    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.get('/', (req, res) => {
  res.send('Hello World! IdeaNest-server is running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
