import express from "express";
import dotenv from "dotenv";
import { pool, initializeSchema, generateMasterToken } from './db/psql_schema.js'
import { mongoExecutor } from './db/mongo_schema.js';
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


app.get('/api/web', (req, res) => {
  res.status(200).json({}) // need to chain otherwise request will hang
})

app.get('/api/web/baskets', async (req, res) => {
  const { masterToken } = req.body;

  if (!masterToken) return res.status(204).send() // early exit if no token exists

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
    res.status(200).json(result.rows) // array being returned
  } catch (err) {
    res.status(500).send('Error retrieving baskets.')
}})

app.post("/api/web/:id", async (req, res) => {
  let { masterToken } = req.body;

  if (!masterToken) {
     generateMasterToken()
    .then(newMasterTokenRow => masterToken = newMasterTokenRow.token)
  }

  let masterTokenId;

  try {
    let result = await pool.query(
      `SELECT id FROM master_tokens WHERE token = $1`, [masterToken]
    )
    masterTokenId = result.rows[0].id;
  } catch (err) {
    res.status(500).send(`Error retrieving master token ID`)
  }

  let newEndPoint = generateEndpoint();

  try {
    while (true) {
      let result = await pool.query(
        `SELECT * FROM BASKETS WHERE endpoint = $1`, [newEndPoint]
      )
      if (!result.rows.length) { break }
      newEndPoint = generateEndpoint();
    }
    await pool.query(
      `INSERT INTO baskets (endpoint, config_response, master_token_id)
      VALUES ($1, $2, $3);`, [newEndPoint, {}, masterTokenId]
    )
    res.status(200).send(newEndPoint);
  } catch (err) {
    res.status(500).send(`Error creating new basket`);
  }
})


//Routes
// app.all('/:id', (req, res) => {
//   const data = {
//     method: req.method,
//     path: req.path,
//     headers: req.headers,
//     body: req.body
//   }
// })

//Error Handler

//Start Server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
})
