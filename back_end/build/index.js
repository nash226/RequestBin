import express from 'express';
import mongoose from 'mongoose';
// import pg from 'pg';
const app = express();
const PORT = process.env.PORT || 3000;
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
    console.log(data);
});
//Error Handler
//Start Server
app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map