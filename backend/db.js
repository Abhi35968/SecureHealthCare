const mysql = require("mysql2");
const config = require("./config");

const db = mysql.createConnection({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  multipleStatements: true,
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

const ensureRefreshTokensTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(sql, (err) => {
    if (err) {
      console.error("Failed to ensure refresh_tokens table", err);
    }
  });
};

const ensureAuditLogsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      action VARCHAR(64) NOT NULL,
      metadata JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_action (action),
      INDEX idx_user_action (user_id, action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(sql, (err) => {
    if (err) {
      console.error("Failed to ensure audit_logs table", err);
    }
  });
};

const ensureUserLastLoginColumn = () => {
  db.query("SHOW TABLES LIKE 'users'", (tableErr, tables) => {
    if (tableErr) {
      console.error("Failed to inspect users table", tableErr);
      return;
    }

    if (!tables.length) {
      console.warn("users table not found; skipping last_login check");
      return;
    }

    db.query("SHOW COLUMNS FROM users LIKE 'last_login'", (colErr, columns) => {
      if (colErr) {
        console.error("Failed to inspect users columns", colErr);
        return;
      }

      if (!columns.length) {
        db.query(
          "ALTER TABLE users ADD COLUMN last_login DATETIME NULL DEFAULT NULL",
          (alterErr) => {
            if (alterErr) {
              console.error("Failed to add last_login column", alterErr);
            }
          }
        );
      }
    });
  });
};

db.connect(err => {
  if (err) throw err;
  console.log("MySQL Connected");
  ensureRecordTimestamps();
  ensureRefreshTokensTable();
  ensureAuditLogsTable();
  ensureUserLastLoginColumn();
});

module.exports = db;