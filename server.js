require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { verify } = require("node:crypto");

const app = express();

app.use(cors({
  origin: [
    "https://budgetgalaga.netlify.app",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_NORMAL_USER,
  password: process.env.DB_USER_PASSWORD,
  database: process.env.DB_NAME,
});

// GET all players
app.get("/galaga/players", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM players");
  res.json(rows);
});

// enter score
app.post("/galaga/players", async (req, res) => {
  try {
    const { username, password, score } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM players WHERE username = ?",
      [username]
    );

    if (rows.length > 0) {
      const existingUser = rows[0];

      const valid = await verifyPassword(password, existingUser.password);

      if (!valid) {
        return res.status(401).json({
          error: "Incorrect password for pre-existing user. Please re-enter your password."
        })
      }

      if (existingUser.score >= score) {
        return res.status(412).json({
          error: "Current score is not more than highest score. Score not updated."
        })
      }

      await pool.query(
        "UPDATE players SET score = GREATEST(score, ?) WHERE username = ?",
        [score, username]
      );

      return res.json({ message: "Score updated" });
    }

    const password_hash = await hashPassword(password);

    await pool.query(
      "INSERT INTO players (username, password, score) VALUES (?, ?, ?)",
      [username, password_hash, score]
    );

    res.status(201).json({ message: "Player created" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// get top five players by score
app.get("/galaga/leaderboard", async (req, res) => {
  try {
    res.set("Cache-Control", "no-store"); 
    const [rows] = await pool.query(
      "SELECT username, score FROM players ORDER BY score DESC LIMIT 10"
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


async function hashPassword(password) {
  return await bcrypt.hash(password, Number(process.env.SALT_ROUNDS));
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}


app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
