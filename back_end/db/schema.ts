// why did we do this?
// import pkg from 'pg';
// const { Pool } = pkg;
// and now
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
      tokens UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS baskets (
      id SERIAL PRIMARY KEY,
      endpoint CHAR(7) NOT NULL,
      config_response JSONB NOT NULL,
      master_token UUID NOT NULL REFERENCES master_tokens(tokens) ON DELETE CASCADE,
      CONSTRAINT endpoint_alphanumeric CHECK (endpoint ~ '^[A-Za-z0-9]{7}$')
  );`,
  `CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    basket_id INT NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
    method VARCHAR(10) NOT NULL,
    headers JSONB NOT NULL,
    request_date DATE NOT NULL,
    request_time TIME NOT NULL,
    mondodb_id VARCHAR(255) UNIQUE NOT NULL
  );`
]

// create master tokens table 


// baskets table


// requests table


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
