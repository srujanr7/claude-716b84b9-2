// server.js
const express = require("express");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

function buildPoolConfig(rawUrl) {
  const url = new URL(rawUrl);
  const sslmode = (url.searchParams.get("sslmode") || "").toLowerCase();
  const sslParam = (url.searchParams.get("ssl") || "").toLowerCase();
  const needsSsl =
    ["require", "verify-ca", "verify-full", "prefer"].includes(sslmode) ||
    ["true", "1"].includes(sslParam);

  if (!needsSsl) return { connectionString: rawUrl };

  // Strip SSL params so they don't override the ssl object below
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  };
}

const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);

});

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/todos", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, created_at FROM todos ORDER BY created_at DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post("/api/todos", async (req, res, next) => {
  const { title } = req.body || {};
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "'title' is required and must be a non-empty string." });
  }

  try {

    const { rows } = await pool.query(
      "INSERT INTO todos (title) VALUES ($1) RETURNING id, title, created_at",
      [title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Todos server listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);