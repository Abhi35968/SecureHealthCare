const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { celebrate, Joi, Segments } = require("celebrate");
const db = require("../db");
const config = require("../config");
const { authenticate } = require("../middleware/auth");
const { logAudit } = require("../audit");

const router = express.Router();

const registerSchema = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    role: Joi.string().valid("patient", "physician", "researcher", "admin").default("patient"),
  }),
};

const loginSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshSchema = {
  [Segments.BODY]: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const passwordSchema = {
  [Segments.BODY]: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

function issueAccessToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

function storeRefreshToken(userId, token, cb) {
  const expires = new Date();
  expires.setDate(expires.getDate() + config.refreshTokenExpiresInDays);
  db.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expires],
    cb
  );
}

router.post("/register", celebrate(registerSchema), async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hash = await bcrypt.hash(password, 12);
    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, role],
      (err) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(400).json({ error: "Email already registered" });
          }
          return res.status(500).json({ error: "Registration failed" });
        }
        logAudit(null, "user_register", { email });
        res.json({ message: "Registered" });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", celebrate(loginSchema), (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email=?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ error: "Login failed" });
    if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = issueAccessToken(user);
    const refreshToken = crypto.randomBytes(40).toString("hex");

    storeRefreshToken(user.id, refreshToken, (storeErr) => {
      if (storeErr) return res.status(500).json({ error: "Login failed" });
      db.query("UPDATE users SET last_login = NOW() WHERE id=?", [user.id]);
      logAudit(user.id, "user_login", {
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });
      res.json({
        token,
        refreshToken,
        user: { id: user.id, name: user.name, role: user.role },
      });
    });
  });
});

router.post("/refresh", celebrate(refreshSchema), (req, res) => {
  const { refreshToken } = req.body;
  db.query(
    "SELECT refresh_tokens.*, users.role FROM refresh_tokens JOIN users ON users.id = refresh_tokens.user_id WHERE refresh_tokens.token = ?",
    [refreshToken],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Failed to refresh token" });
      if (!rows.length) return res.status(401).json({ error: "Invalid refresh token" });

      const record = rows[0];
      if (new Date(record.expires_at) < new Date()) {
        return res.status(401).json({ error: "Refresh token expired" });
      }

      const token = issueAccessToken({ id: record.user_id, role: record.role });
      res.json({ token });
    }
  );
});

router.post("/change-password", authenticate, celebrate(passwordSchema), (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  db.query("SELECT password FROM users WHERE id=?", [userId], async (err, rows) => {
    if (err || !rows.length) return res.status(500).json({ error: "Unable to change password" });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(400).json({ error: "Current password incorrect" });

    const hash = await bcrypt.hash(newPassword, 12);
      db.query("UPDATE users SET password=? WHERE id=?", [hash, userId], (updateErr) => {
        if (updateErr) return res.status(500).json({ error: "Unable to change password" });
        logAudit(userId, "password_change");
        res.json({ message: "Password updated" });
      });
  });
});

module.exports = router;