require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
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
    const { username, email, score } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: "Username and email required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM players WHERE email = ?",
      [email]
    );

    if (rows.length > 0) {
      const existingUser = rows[0];

      if (existingUser.username !== username) {
        return res.status(409).json({
          error: "Email already exists with a different username"
        });
      }

      if (existingUser.score >= score) {
        return res.status(412).json({
          error: "Current score is not more than highest score. Score not updated."
        })
      }

      await pool.query(
        "UPDATE players SET score = GREATEST(score, ?) WHERE email = ?",
        [score, email]
      );

      return res.json({ message: "Score updated" });
    }

    await pool.query(
      "INSERT INTO players (username, email, score) VALUES (?, ?, ?)",
      [username, email, score]
    );

    res.status(201).json({ message: "Player created" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/galaga/leaderboard", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT username, score FROM players ORDER BY score DESC LIMIT 10"
    );

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});



app.listen(process.env.PORT, "127.0.0.1", () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
