// populate_db.ts
import dotenv from "dotenv";
dotenv.config();

import { pool, generateMasterToken } from "./db/psql_schema.js";
import { mongoExecutor } from "./db/mongo_schema.js";
import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

const NUM_MASTER_TOKENS = 3;
const BASKETS_PER_TOKEN = 2;
const REQUESTS_PER_BASKET = 3;

async function main() {
  console.log("Starting DB population script...");

  // Connect to MongoDB if not already connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI!;
    await mongoose.connect(mongoUri);
  }

  const masterTokens: string[] = [];

  // Step 1: Create master tokens
  for (let i = 0; i < NUM_MASTER_TOKENS; i++) {
    const tokenRow = await generateMasterToken();
    console.log(`Generated master token: ${tokenRow.token}`);
    masterTokens.push(tokenRow.token);
  }

  // Step 2: For each master token, create baskets
  for (const masterToken of masterTokens) {
    const masterRes = await pool.query(`SELECT id FROM master_tokens WHERE token = $1`, [masterToken]);
    const masterTokenId = masterRes.rows[0].id;

    for (let b = 0; b < BASKETS_PER_TOKEN; b++) {
      const endpoint = generateRandomEndpoint();
      await pool.query(
        `INSERT INTO baskets (endpoint, config_response, master_token_id) VALUES ($1, $2, $3)`,
        [endpoint, { createdAt: new Date().toISOString() }, masterTokenId]
      );
      console.log(`Created basket ${endpoint} for master token ${masterToken}`);

      // Step 3: Create requests for the basket
      const basketRes = await pool.query(`SELECT id FROM baskets WHERE endpoint = $1`, [endpoint]);
      const basketId = basketRes.rows[0].id;

      for (let r = 0; r < REQUESTS_PER_BASKET; r++) {
        const requestData = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          request_date: new Date(),
          request_time: new Date(),
        };

        // Step 4: Create MongoDB document
        const mongoDoc = await mongoExecutor.create({ requestPayload: { sample: `Request ${r + 1}` } });
        
        // Insert into PostgreSQL requests table
        await pool.query(
          `INSERT INTO requests (basket_id, method, headers, request_date, request_time, mongodb_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [basketId, requestData.method, requestData.headers, requestData.request_date, requestData.request_time, mongoDoc._id.toString()]
        );
        console.log(`Created request ${r + 1} for basket ${endpoint}`);
      }
    }
  }

  console.log("Database population complete!");
  process.exit(0);
}

// Helper to generate random 7-char endpoint
function generateRandomEndpoint() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";
  for (let i = 0; i < 7; i++) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

// Run
main().catch(err => {
  console.error("Error populating DB:", err);
  process.exit(1);
});