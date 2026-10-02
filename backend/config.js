const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function number(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const config = {
  env: process.env.NODE_ENV || "development",
  port: number(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || "change-me-in-prod",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  refreshTokenExpiresInDays: number(process.env.REFRESH_TOKEN_DAYS, 7),
  rateLimit: {
    windowMs: number(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: number(process.env.RATE_LIMIT_MAX, 120),
    authWindowMs: number(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60_000),
    authMax: number(process.env.AUTH_RATE_LIMIT_MAX, 10),
  },
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "healthcare",
    port: number(process.env.DB_PORT, 3306),
  },
};

module.exports = config;
