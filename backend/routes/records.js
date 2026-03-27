const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const { encrypt } = require("../crypto");

const router = express.Router();


// upload
router.post("/upload", auth, (req, res) => {
  const { data } = req.body;

  const enc = encrypt(data);
  const insertValues = [req.user.id, enc.encryptedData, enc.key + ":" + enc.iv];

  db.query(
    "INSERT INTO records (patient_id, encrypted_data, encrypted_key, created_at) VALUES (?, ?, ?, NOW())",
    insertValues,
    (err) => {
      if (err && err.code === "ER_BAD_FIELD_ERROR") {
        db.query(
          "INSERT INTO records (patient_id, encrypted_data, encrypted_key) VALUES (?, ?, ?)",
          insertValues,
          (legacyErr) => {
            if (legacyErr) return res.send(legacyErr);
            res.send("Stored securely");
          }
        );
        return;
      }

      if (err) return res.send(err);
      res.send("Stored securely");
    }
  );
});

// get records
router.get("/", auth, (req, res) => {
  db.query(
    "SELECT * FROM records WHERE patient_id=? ORDER BY created_at DESC, id DESC",
    [req.user.id],
    (err, result) => {
      if (err) return res.send(err);
      res.json(result);
    }
  );
});

module.exports = router;