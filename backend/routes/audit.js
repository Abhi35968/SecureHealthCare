const express = require("express");
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { parseMetadata } = require("../audit");

const router = express.Router();

router.get("/", authenticate, requireRole("admin"), (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || "100", 10) || 100, 500));
  const userFilter = parseInt(req.query.userId || "", 10);

  let whereClause = "1=1";
  const params = [];

  if (!Number.isNaN(userFilter)) {
    whereClause += " AND a.user_id = ?";
    params.push(userFilter);
  }

  params.push(limit);

  db.query(
    `SELECT a.id, a.user_id, a.action, a.metadata, a.created_at,
            u.name AS user_name, u.email AS user_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ?`,
    params,
    (err, rows) => {
      if (err) {
        console.error("Failed to fetch audit logs", err);
        return res.status(500).json({ error: "Failed to fetch audit logs" });
      }

      const normalized = rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        action: row.action,
        metadata: parseMetadata(row.metadata),
        createdAt: row.created_at,
      }));

      res.json({ logs: normalized });
    }
  );
});

module.exports = router;
