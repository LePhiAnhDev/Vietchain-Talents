const express = require("express");
const walletController = require("../controllers/walletController");

const router = express.Router();

router.get("/:address", walletController.getWalletInfo);

router.get("/:address/transactions", walletController.getTransactions);

router.get("/:address/graph", walletController.getRelationshipGraph);

router.get("/:address/anomalies", walletController.getAnomalies);

router.get("/:address/analysis", walletController.analyzeWallet);

module.exports = router;
