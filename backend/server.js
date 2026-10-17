// backend/server.js
const express = require("express");
const path = require("path");

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

// Serve the frontend so fetch('/api/notes') works from the same origin
app.use(express.static(path.join(__dirname, "..", "frontend")));

let nextId = 1;
const notes = [];

app.get("/api/notes", (req, res) => {
  res.json(notes);
});

app.post("/api/notes", (req, res) => {
  const { title, body } = req.body || {};

  if (typeof body !== "string" || !body.trim()) {
    return res.status(400).json({ error: "'body' is required and must be a non-empty string." });
  }

  if (title !== undefined && typeof title !== "string") {
    return res.status(400).json({ error: "'title' must be a string if provided." });
  }

  const note = {
    id: nextId++,
    title: title && title.trim() ? title.trim() : "Untitled",
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };
  notes.unshift(note);
  res.status(201).json(note);
});

app.use("/api", (req, res) => {
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
app.listen(PORT, () => {
  console.log(`Notes server listening on port ${PORT}`);
});