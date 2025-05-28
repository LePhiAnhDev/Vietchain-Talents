const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const routes = require("./routes");

console.log("Environment:", process.env.NODE_ENV);
console.log("Port:", process.env.PORT);
console.log(
  "MongoDB URI:",
  process.env.MONGO_URI ? "Configured" : "Not configured"
);
console.log(
  "Etherscan API Key:",
  process.env.ETHERSCAN_API_KEY
    ? `Configured (${process.env.ETHERSCAN_API_KEY.substring(0, 5)}...)`
    : "Not configured"
);

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static("../frontend"));
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
