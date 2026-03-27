const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, hash, role],
    (err) => {
      if (err) return res.send(err);
      res.send("Registered");
    }
  );
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], async (err, result) => {
    if (result.length === 0) return res.send("Invalid email or password");

    const user = result[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.send("Invalid email or password");

    const token = jwt.sign({ id: user.id }, "secret");

    res.json({ token });
  });
});

module.exports = router;