import express from "express";
import dotenv from "dotenv";
import { pool, initializeSchema } from './db/psql_schema.js'
import { mongoExecutor } from './db/mongo_schema.js';
dotenv.config();

const app = express();
initializeSchema();

//Middleware
app.use(express.json()); // JSON bodies
app.use(express.urlencoded({ extended: true })); // URL-encoded bodies
app.use(express.text({ type: 'text/*' })); // Text bodies

//Routes
// app.all('/:id', (req, res) => {
//   const data = {
//     method: req.method,
//     path: req.path,
//     headers: req.headers,
//     body: req.body
//   }
// })

app.get('/api/web', (req, res) => {
  res.status(200)
})

app.get('/api/web/baskets', async (req, res) => {
  const { masterToken } = req.body;

  if (!masterToken) return res.status(204) // early exit if no token exists

  // retrieving all rows in baskets table matching the mastertoken id
  try {
    const result = await pool.query(
      `SELECT b.*
      FROM baskets b
      JOIN master_tokens mt
      ON b.master_token_id = mt.id
      WHERE mt.tokens = $1`
    );
    res.status(200)
    res.send(result.rows) // array being returned
  } catch (err) {
    res.status(500).send('Error retrieving baskets.')
}})

//Error Handler

//Start Server

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`)
})
