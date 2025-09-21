// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Allow frontend requests from any origin
app.use(bodyParser.json()); // Parse JSON requests

// Connect to SQLite database (hot connection)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite database');
});

// Create contacts table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL
  )
`);

// ----------------------- ROUTES ----------------------- //

// GET /contacts - fetch all contacts (with optional pagination)
app.get('/contacts', (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(`SELECT * FROM contacts LIMIT ? OFFSET ?`, [limit, offset], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// POST /contacts - add a new contact
app.post('/contacts', (req, res) => {
    const { name, email, phone } = req.body;

    // Validation
    if (!name || !email || !phone) return res.status(400).json({ error: 'All fields are required' });
    const emailRegex = /\S+@\S+\.\S+/;
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Phone must be 10 digits' });

    // Insert into DB
    db.run(`INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)`, [name, email, phone], function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ id: this.lastID, name, email, phone });
    });
});

// DELETE /contacts/:id - delete a contact
app.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM contacts WHERE id = ?`, [id], function (err) {
        if (err) res.status(500).json({ error: err.message });
        else if (this.changes === 0) res.status(404).json({ error: 'Contact not found' });
        else res.json({ message: 'Contact deleted', changes: this.changes });
    });
});

// ----------------------- START SERVER ----------------------- //
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
