const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { encrypt, decrypt } = require("../crypto");
const { logAudit } = require("../audit");
const { celebrate } = require("celebrate");
const schemas = require("../validation");

const router = express.Router();

function getKeyParts(encryptedKey) {
  if (!encryptedKey) return [];
  const [key, iv] = encryptedKey.split(":");
  return [key, iv];
}

function findRecord(recordId, userId, callback) {
  db.query(
    "SELECT id, encrypted_data, encrypted_key, created_at FROM records WHERE id=? AND patient_id=?",
    [recordId, userId],
    (err, rows) => {
      if (err) return callback(err);
      if (!rows.length) return callback(null, null);
      callback(null, rows[0]);
    }
  );
}

// upload
router.post("/upload", authenticate, celebrate(schemas.recordUpload), (req, res) => {
  const { data } = req.body;

  const enc = encrypt(data);
  const insertValues = [req.user.id, enc.encryptedData, enc.key + ":" + enc.iv];

  db.query(
    "INSERT INTO records (patient_id, encrypted_data, encrypted_key, created_at) VALUES (?, ?, ?, NOW())",
    insertValues,
    (err, result) => {
      if (err && err.code === "ER_BAD_FIELD_ERROR") {
        db.query(
          "INSERT INTO records (patient_id, encrypted_data, encrypted_key) VALUES (?, ?, ?)",
          insertValues,
          (legacyErr, legacyResult) => {
            if (legacyErr) return res.send(legacyErr);
            const recordId = legacyResult?.insertId;
            logAudit(req.user.id, "record_upload", { recordId, size: data?.length || 0 });
            res.json({ message: "Stored securely", recordId });
          }
        );
        return;
      }

      if (err) return res.send(err);
      const recordId = result?.insertId;
      logAudit(req.user.id, "record_upload", { recordId, size: data?.length || 0 });
      res.json({ message: "Stored securely", recordId });
    }
  );
});

// get records
router.get("/", authenticate, (req, res) => {
  db.query(
    "SELECT * FROM records WHERE patient_id=? ORDER BY created_at DESC, id DESC",
    [req.user.id],
    (err, result) => {
      if (err) return res.send(err);
      logAudit(req.user.id, "records_list", { count: result.length });
      res.json(result);
    }
  );
});

router.get("/:id/decrypt", authenticate, celebrate(schemas.recordById), (req, res) => {
  const recordId = parseInt(req.params.id, 10);

  findRecord(recordId, req.user.id, (err, record) => {
    if (err) return res.status(500).json({ error: "Failed to load record" });
    if (!record) return res.status(404).json({ error: "Record not found" });

    const [key, iv] = getKeyParts(record.encrypted_key);
    if (!key || !iv) {
      return res.status(400).json({ error: "Record missing encryption metadata" });
    }

    try {
      const decrypted = decrypt(record.encrypted_data, key, iv);
      logAudit(req.user.id, "record_decrypt", { recordId });
      res.json({ recordId, decrypted });
    } catch (decryptErr) {
      console.error("Failed to decrypt record", recordId, decryptErr);
      res.status(500).json({ error: "Failed to decrypt record" });
    }
  });
});

router.get("/:id/download", authenticate, celebrate(schemas.recordById), (req, res) => {
  const recordId = parseInt(req.params.id, 10);

  findRecord(recordId, req.user.id, (err, record) => {
    if (err) return res.status(500).json({ error: "Failed to load record" });
    if (!record) return res.status(404).json({ error: "Record not found" });

    const [key, iv] = getKeyParts(record.encrypted_key);
    if (!key || !iv) {
      return res.status(400).json({ error: "Record missing encryption metadata" });
    }

    try {
      const decrypted = decrypt(record.encrypted_data, key, iv);
      logAudit(req.user.id, "record_download", { recordId });
      res.setHeader("Content-Type", "text/plain;charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=record-${recordId}.txt`
      );
      res.send(decrypted);
    } catch (decryptErr) {
      console.error("Failed to decrypt record", recordId, decryptErr);
      res.status(500).json({ error: "Failed to decrypt record" });
    }
  });
});

module.exports = router;