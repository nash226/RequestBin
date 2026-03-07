import express from "express";
import dotenv from "dotenv";
import { pool, initializeSchema } from './db/schema.js';
import mongoose from "mongoose";
dotenv.config();
const app = express();
initializeSchema();
//Middleware
app.use(express.json()); // JSON bodies
app.use(express.urlencoded({ extended: true })); // URL-encoded bodies
app.use(express.text({ type: 'text/*' })); // Text bodies
//Routes
app.all('/:id', (req, res) => {
    const data = {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    };
});
//Error Handler
//Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map