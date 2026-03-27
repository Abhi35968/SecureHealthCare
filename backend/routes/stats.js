const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.get("/", auth, (req, res) => {
  db.query("SELECT COUNT(*) AS total_users FROM users", (userErr, userResult) => {
    if (userErr) {
      console.error("Stats users error", userErr);
      return res.status(500).json({ error: "Failed to fetch user stats" });
    }

    db.query("SELECT COUNT(*) AS total_records FROM records", (recordErr, recordResult) => {
      if (recordErr) {
        console.error("Stats records error", recordErr);
        return res.status(500).json({ error: "Failed to fetch record stats" });
      }

      res.json({
        activeSessions: userResult?.[0]?.total_users || 0,
        totalRecords: recordResult?.[0]?.total_records || 0,
      });
    });
  });
});

module.exports = router;
