const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { errors } = require("celebrate");
const config = require("./config");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const statsRoutes = require("./routes/stats");
const auditRoutes = require("./routes/audit");

const app = express();
app.set("trust proxy", 1);

const baseLimiter = rateLimit({
	windowMs: config.rateLimit.windowMs,
	max: config.rateLimit.max,
	standardHeaders: true,
	legacyHeaders: false,
});

const authLimiter = rateLimit({
	windowMs: config.rateLimit.authWindowMs,
	max: config.rateLimit.authMax,
	standardHeaders: true,
	legacyHeaders: false,
});

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(baseLimiter);

app.use("/auth", authLimiter, authRoutes);
app.use("/records", recordRoutes);
app.use("/stats", statsRoutes);
app.use("/audit", auditRoutes);

app.use(errors());

app.use((err, req, res, next) => {
	console.error("Unhandled error", err);
	res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(config.port, () =>
	console.log(`Backend running on ${config.port} (${config.env})`)
);