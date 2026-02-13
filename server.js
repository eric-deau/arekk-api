require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// GET all players
app.get("/api/galaga/players", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM players");
  res.json(rows);
});

// CREATE player
app.post("/api/galaga/players", async (req, res) => {
  const { username, score, email } = req.body;

  const [result] = await pool.query(
    "INSERT INTO players (username, score, email) VALUES (?, ?, ?)",
    [username, score, email]
  );

  res.json({ id: result.insertId, username, score });
});

// UPDATE score
app.put("/api/galaga/players/:id", async (req, res) => {
  const { score } = req.body;

  await pool.query(
    "UPDATE players SET score = ? WHERE id = ?",
    [score, req.params.id]
  );

  res.json({ message: "Score updated" });
});

app.listen(process.env.PORT, "127.0.0.1", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
