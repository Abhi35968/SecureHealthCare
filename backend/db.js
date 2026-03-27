const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "abhi123",
  database: "healthcare"
});

const ensureRecordTimestamps = () => {
  db.query("SHOW TABLES LIKE 'records'", (tableErr, tables) => {
    if (tableErr) {
      console.error("Failed to inspect records table", tableErr);
      return;
    }

    if (!tables.length) {
      console.warn("records table not found; skipping timestamp check");
      return;
    }

    db.query("SHOW COLUMNS FROM records LIKE 'created_at'", (colErr, columns) => {
      if (colErr) {
        console.error("Failed to inspect records columns", colErr);
        return;
      }

      const ensureBackfill = () => backfillMissingRecordTimestamps();

      if (columns.length === 0) {
        db.query(
          "ALTER TABLE records ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
          (alterErr) => {
            if (alterErr) {
              console.error("Failed to add created_at column", alterErr);
              return;
            }
            ensureBackfill();
          }
        );
      } else {
        ensureBackfill();
      }
    });
  });
};

const backfillMissingRecordTimestamps = () => {
  db.query(
    "SELECT id FROM records WHERE created_at IS NULL ORDER BY id ASC",
    (selectErr, rows) => {
      if (selectErr) {
        console.error("Failed to inspect missing record timestamps", selectErr);
        return;
      }

      if (!rows.length) {
        return;
      }

      const now = Date.now();
      rows.forEach((row, index) => {
        const minutesAgo = rows.length - index;
        const timestamp = new Date(now - minutesAgo * 60000);
        db.query(
          "UPDATE records SET created_at = ? WHERE id = ?",
          [timestamp, row.id],
          (updateErr) => {
            if (updateErr) {
              console.error(`Failed to backfill timestamp for record ${row.id}`, updateErr);
            }
          }
        );
      });
    }
  );
};

db.connect(err => {
  if (err) throw err;
  console.log("MySQL Connected");
  ensureRecordTimestamps();
});

module.exports = db;