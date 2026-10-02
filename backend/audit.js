const db = require("./db");

function serializeMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch (err) {
    console.warn("Failed to serialize audit metadata", err);
    return null;
  }
}

function parseMetadata(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch (err) {
    return { raw };
  }
}

function logAudit(userId, action, metadata = null) {
  const payload = serializeMetadata(metadata);
  db.query(
    "INSERT INTO audit_logs (user_id, action, metadata) VALUES (?, ?, ?)",
    [userId || null, action, payload],
    (err) => {
      if (err) {
        console.error("Failed to persist audit log", action, err);
      }
    }
  );
}

module.exports = {
  logAudit,
  parseMetadata,
};
