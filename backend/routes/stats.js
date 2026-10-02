const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { celebrate } = require("celebrate");
const schemas = require("../validation");

const router = express.Router();

router.get("/", authenticate, celebrate(schemas.statsQuery), (req, res) => {
  const range = req.query.range || "7d";
  const days = parseInt(range.replace("d", ""), 10);

  db.query("SELECT COUNT(*) AS total_users FROM users", (userErr, userResult) => {
    if (userErr) {
      console.error("Stats users error", userErr);
      return res.status(500).json({ error: "Failed to fetch user stats" });
    }

    db.query(
      "SELECT COUNT(*) AS total_records FROM records",
      (recordErr, recordResult) => {
        if (recordErr) {
          console.error("Stats records error", recordErr);
          return res.status(500).json({ error: "Failed to fetch record stats" });
        }

        db.query(
          `SELECT DATE(created_at) as day, COUNT(*) as count
           FROM records
           WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           GROUP BY DATE(created_at)
           ORDER BY day ASC`,
          [days],
          (timelineErr, timelineRows) => {
            if (timelineErr) {
              console.error("Stats timeline error", timelineErr);
              return res.status(500).json({ error: "Failed to fetch timeline" });
            }

            res.json({
              activeSessions: userResult?.[0]?.total_users || 0,
              totalRecords: recordResult?.[0]?.total_records || 0,
              timeline: timelineRows,
            });
          }
        );
      }
    );
  });
});

module.exports = router;
