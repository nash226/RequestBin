import { Pool } from 'pg';

import dotenv from 'dotenv';
dotenv.config();

// Create a connection pool; this should automatically read from .env
export const pool = new Pool();

// Define your schema
// make sure pgcrypto exists for uuid

const statements = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto;`,
  `CREATE TABLE IF NOT EXISTS master_tokens (
      id SERIAL PRIMARY KEY,
      token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS baskets (
      id SERIAL PRIMARY KEY,
      endpoint CHAR(7) UNIQUE NOT NULL,
      config_response JSONB NOT NULL,
      master_token_id INTEGER NOT NULL REFERENCES master_tokens(id) ON DELETE CASCADE,
      CONSTRAINT endpoint_alphanumeric CHECK (endpoint ~ '^[A-Za-z0-9]{7}$')
  );`,
  `CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    basket_id INTEGER NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    headers JSONB NOT NULL,
    request_date DATE NOT NULL,
    request_time TIME NOT NULL,
    mongodb_id VARCHAR(255) UNIQUE
  );`
];

// Function to initialize tables
export async function initializeSchema() {
  console.log(`Creating tables...`);
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.error(`Error creating one or more tables`, err);
    }
  }
  console.log('Database schema initialized.');
}

interface master_token_object {
  id: number;
  token: string;
}

// To auto generate our master tokens
export async function generateMasterToken(): Promise<master_token_object> {
  const res = await pool.query<master_token_object>(
    `INSERT INTO master_tokens DEFAULT VALUES RETURNING *;`
  );

  const row = res.rows[0];

  if (!row) { throw new Error("generateMasterToken() failed; no row returned")}

  return row;
}