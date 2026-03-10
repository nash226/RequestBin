import express from "express";
import dotenv from "dotenv";
import { pool, initializeSchema, generateMasterToken } from './db/psql_schema.js'
import { mongoExecutor } from './db/mongo_schema.js';
import mongoose from "mongoose";
import cors from "cors";

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
app.use(cors()); // enable CORS;
app.use(express.urlencoded({ extended: true })); // URL-encoded bodies
app.use(express.text({ type: 'text/*' })); // Text bodies

app.get('/api/web/baskets', async (req, res) => {
  const masterToken = req.headers['master-token'];

  if (!masterToken) return res.status(204).send(); // early exit if no token exists

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

app.get('/api/web', async (req, res) => {
  let newEndPoint = generateEndpoint();
  let attempts = 0;
  const MAX_ATTEMPTS = 5;

  // check for duplicated endpoint
  try {
    while (attempts < MAX_ATTEMPTS) {
      let result = await pool.query(
        `SELECT * FROM BASKETS WHERE endpoint = $1`, [newEndPoint]
      );
      // evaluate if psql returned a row and breaks out if so
      if (!result.rows.length) { break }
      // creates another endpoint and loops if exists in psql
      newEndPoint = generateEndpoint();
      attempts++;
    }

    //continues here if no clash of endpoints was found
    if (attempts === MAX_ATTEMPTS) { throw new Error }
    res.status(200).json({ newEndPoint })
  } catch (err) {
    return res.status(500).send('Failed to generate unique endpoint');
  }
})

app.post("/api/web/:endpoint", async (req, res) => {
  let masterToken = req.headers['master-token'];
  const newEndPoint = req.params.endpoint;
  let masterTokenId;


  // if new user, then generate a master token and set that string to masterToken + set id too
  if (!masterToken) {
    await generateMasterToken().then(newMasterTokenRow => {
      masterToken = newMasterTokenRow.token;
      masterTokenId = newMasterTokenRow.id;
    })
  } else { 
    try {
      let result = await pool.query(
        `SELECT id FROM master_tokens WHERE token = $1`, [masterToken]
      );
      masterTokenId = result.rows[0].id;
    } catch (err) {
      return res.status(500).send(`Error retrieving master token ID`)
    }
  }

  try {
    // inserts new endpoint into the database
    await pool.query(
      `INSERT INTO baskets (endpoint, config_response, master_token_id)
      VALUES ($1, $2, $3);`, [newEndPoint, {}, masterTokenId]
    );
    res.status(200).json({ masterToken, newEndPoint });
  } catch (err) {
    res.status(500).send(`Error creating new basket`);
  }
})

app.get("/api/web/:endpoint", async (req, res) => {
  const endpoint = req.params.endpoint;

  try {
    const result = await pool.query (
      `SELECT r.*
      FROM requests r
      JOIN baskets b ON r.basket_id = b.id
      WHERE b.endpoint = $1
      ORDER BY r.id DESC`,
      [endpoint]
    );

    //result is an object, with a rows property (array) containing objects (individual rows)
    // Fetch MongoDB data for each row
    await Promise.all(result.rows.map(async (rowObj) => {
      // potential mismatch with column name here // solved, please check. Will need to rebuild tables.
      if (rowObj.mongodb_id) { // make sure mongodb_id exists
        const objectId = new ObjectId(rowObj.mongodb_id);
        // .lean() returns plain js obj instead of mongoose doc containing extra methods
        const mongoResult = await mongoExecutor.findOne({ _id: objectId }).lean();
        // not writing to psql, in memory enrichment (attaching a temp property)
        rowObj.mongoRequestBody = mongoResult;
      }
      return rowObj;
    }));

    // Return combined result including temp property
    res.status(200).json(result.rows);

  } catch (err) {
    console.error("Failed to interface with DB:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/web/requests/:id", async (req, res) => {
  const requestId = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM requests WHERE id = $1 RETURNING *`,
      [requestId]
    );
    const mongoId = result.rows[0].mongodb_id;
    await mongoExecutor.findByIdAndDelete(mongoId);
    return res.status(204).send();
  } catch (err) {
    console.log(`either postgres or mongo delete function failed`, err);
    return res.status(500).send(`problem deleting request`);
  }

})

app.all('/:endpoint', async (req, res) => {
  const endpoint = req.params.endpoint;

  //find the corresponding basket
  let basketId;
  try {
    const basketResult = await pool.query(
      `SELECT id FROM baskets WHERE endpoint = $1`, [endpoint]
    );
    // evac if not found
    if (!basketResult.rows.length) throw new Error
    basketId = basketResult.rows[0].id;
  } catch (err) {
    return res.status(500).send('Error finding basket');
  } // this is redundant; we could use endpoint as FK but for now we leave.

  //save the body to mongodb
  let mongoId;
  try {
    const mongoDoc = await mongoExecutor.create({ requestPayload: req.body });
    mongoId = mongoDoc._id.toString();
  } catch (err) {
    return res.status(500).send('Error saving to Mongo database');
  }

  //save metadata to postgres
  // PG will alegedly cast the date and times to the correct columns with the duplicate NOW() calls. Not tested yet. 
  try {
    await pool.query(
      `INSERT INTO requests (basket_id, method, headers, request_date, request_time, mongodb_id)
       VALUES ($1, $2, $3, NOW(), NOW(), $4)`,
       [basketId, req.method, req.headers, mongoId]
    );
    res.status(200).send(`Request captured.`)
  } catch (err) {
    return res.status(500).send('Error sending metadata to PGdb')
  }
});

//Error Handler

//Start Server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
})
