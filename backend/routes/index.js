const express = require("express");
const walletRoutes = require("./wallet");
const etherscanService = require("../services/etherscanService");

const router = express.Router();

router.use("/wallet", walletRoutes);

router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is working" });
});

router.get("/test-etherscan", async (req, res) => {
  const result = await etherscanService.testConnection();
  res.status(result.success ? 200 : 500).json(result);
});

module.exports = router;
