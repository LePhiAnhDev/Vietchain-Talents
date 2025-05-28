module.exports = {
  etherscanApiKey: process.env.ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY",
  etherscanApiUrl: "https://api.etherscan.io/api",
  cacheTimeoutSeconds: 3600,
  defaultTransactionLimit: 100,
  anomalyDetectionThreshold: 0.7, // Ngưỡng phát hiện bất thường
};
