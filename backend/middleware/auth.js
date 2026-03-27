const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers["authorization"];

  console.log("=== AUTH MIDDLEWARE ===");
  console.log("Full header:", header);
  console.log("All headers:", req.headers);

  if (!header) {
    console.log("❌ No authorization header");
    return res.status(401).json({ error: "No token provided" });
  }

  if (!header.startsWith("Bearer ")) {
    console.log("❌ Invalid header format (should be 'Bearer <token>')");
    return res.status(401).json({ error: "Invalid token format" });
  }

  const token = header.substring(7); // Remove "Bearer " prefix

  console.log("Token to verify:", token.substring(0, 20) + "...");

  try {
    const verified = jwt.verify(token, "secret");
    console.log("✅ Token verified, user ID:", verified.id);
    req.user = verified;
    next();
  } catch (err) {
    console.log("❌ JWT verification failed:", err.message);
    return res.status(401).json({ error: "Invalid token: " + err.message });
  }
};