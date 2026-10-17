const express = require("express");

const app = express();
app.use(express.json());

let nextId = 6;
const quotes = [
  { id: 1, text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { id: 2, text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { id: 3, text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { id: 4, text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { id: 5, text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
];

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/quotes", (req, res) => {
  res.json(quotes);
});

app.post("/api/quotes", (req, res) => {
  const { text, author } = req.body || {};

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "'text' is required and must be a non-empty string." });
  }
  if (author !== undefined && typeof author !== "string") {
    return res.status(400).json({ error: "'author' must be a string if provided." });
  }


  const quote = {
    id: nextId++,
    text: text.trim(),
    author: author && author.trim() ? author.trim() : "Unknown",
  };
  quotes.push(quote);
  res.status(201).json(quote);
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
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});