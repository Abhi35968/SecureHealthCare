const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const statsRoutes = require("./routes/stats");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/records", recordRoutes);
app.use("/stats", statsRoutes);

app.listen(3000, () => console.log("Backend running on 3000"));