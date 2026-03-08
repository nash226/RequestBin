import express from "express";
import dotenv from "dotenv";
import { pool, initializeSchema, generateMasterToken } from './db/psql_schema.js'
import { mongoExecutor } from './db/mongo_schema.js';
import mongoose from "mongoose";

// constructor function to create a new mongo id
const { ObjectId } = mongoose.Types;
//load in environment variables form .env in the root, proces as kv pairs and adding to process.env.[insert variable here]
dotenv.config();

const app = express();
initializeSchema();

const generateEndpoint = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const len = chars.length;
  let output = "";
  for (let i = 0; i < 7; i++) {
    let char = chars[Math.floor(Math.random() * len)];
    output += char
  }
  return output;
}

//Middleware
app.use(express.json()); // JSON bodies
app.use(express.urlencoded({ extended: true })); // URL-encoded bodies
app.use(express.text({ type: 'text/*' })); // Text bodies

// health check endpoint
app.get('/api/web', (req, res) => {
  res.status(200).json({}) // need to chain otherwise request will hang
})

app.get('/api/web/baskets', async (req, res) => {
  const { masterToken } = req.body;

  if (!masterToken) return res.status(204).json({}) // early exit if no token exists

  // retrieving all rows in baskets table matching the mastertoken id
  try {
    const result = await pool.query(
      `SELECT b.*
      FROM baskets b
      JOIN master_tokens mt
      ON b.master_token_id = mt.id
      WHERE mt.token = $1`,
      [masterToken]
    );
    res.status(200).json(result.rows) // array being returned in the json body
  } catch (err) {
    res.status(500).send('Error retrieving baskets.')
}})

app.post("/api/web/:id", async (req, res) => {
  let { masterToken } = req.body;

  // if new user, then generate a master token and set that string to masterToken 
  if (!masterToken) {
    await generateMasterToken().then(newMasterTokenRow => masterToken = newMasterTokenRow.token)
  }

  let masterTokenId;

  try {
    let result = await pool.query(
      `SELECT id FROM master_tokens WHERE token = $1`, [masterToken]
    )
    masterTokenId = result.rows[0].id;
  } catch (err) {
    return res.status(500).send(`Error retrieving master token ID`)
  }

  let newEndPoint = generateEndpoint();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  // check for duplicated endpoint
  try {
    while (attempts < MAX_ATTEMPTS) {
      let result = await pool.query(
        `SELECT * FROM BASKETS WHERE endpoint = $1`, [newEndPoint]
      )
      // evaluate if psql returned a row and breaks out if so
      if (!result.rows.length) { break }
      // creates another endpoint and loops if exists in psql
      newEndPoint = generateEndpoint();
      attempts++;
    }

    //continues here if no clash of endpoints was found
    if (attempts === MAX_ATTEMPTS) return res.status(500).send('Failed to generate unique endpoint');
    
    // inserts new endpoint into the database
    await pool.query(
      `INSERT INTO baskets (endpoint, config_response, master_token_id)
      VALUES ($1, $2, $3);`, [newEndPoint, {}, masterTokenId]
    )
    res.status(200).send(newEndPoint);
  } catch (err) {
    res.status(500).send(`Error creating new basket`);
  }
})

app.get("/api/web/:id", async (req, res) => {
  const basketId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM requests WHERE basket_id = $1`, 
      [basketId]
    );

    //result is an object, with a rows property (array) containing objects (individual rows)
    // Fetch MongoDB data for each row
    await Promise.all(result.rows.map(async (rowObj) => {
      // potential mismatch with column name here
      if (rowObj.mongoId) { // make sure mongoId exists
        const objectId = new ObjectId(rowObj.mongoId);
        // .lean() returns plain js obj instead of mongoose doc containing extra methods
        const mongoResult = await mongoExecutor.findOne({ _id: objectId }).lean();
        // not writing to psql, in memory enrichment (attaching a temp property)
        rowObj.mongoRequestBody = mongoResult;
      } 
    }));

    // Return combined result including temp property
    res.status(200).json(result.rows);

  } catch (err) {
    console.error("Failed to interface with DB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.all('/:id', (req, res) => {
  const data = {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  }
  //const newBody = new mongoExecutor({requestPayload: data})
  //newBody.save()
})

//Error Handler

//Start Server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
})
