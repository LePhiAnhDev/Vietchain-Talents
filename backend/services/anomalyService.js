const config = require("../config/config");
const Transaction = require("../models/transaction");

exports.detectAnomalies = async (transactions, address) => {
  try {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const processedData = prepareData(transactions, address);

    const valueAnomalies = detectValueAnomalies(processedData);

    const frequencyAnomalies = detectFrequencyAnomalies(processedData);

    const patternAnomalies = detectPatternAnomalies(processedData);

    const allAnomalies = [
      ...valueAnomalies,
      ...frequencyAnomalies,
      ...patternAnomalies,
    ];

    allAnomalies.sort((a, b) => b.score - a.score);

    return allAnomalies;
  } catch (error) {
    console.error("Error in detectAnomalies:", error);
    return [];
  }
};

function prepareData(transactions, address) {
  address = address.toLowerCase();

  const sortedTransactions = [...transactions].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return sortedTransactions.map((tx) => {
    const value = parseFloat(tx.value) / 1e18;
    const isOutgoing = tx.from.toLowerCase() === address;

    return {
      hash: tx.hash,
      timestamp: tx.timestamp,
      from: tx.from.toLowerCase(),
      to: tx.to ? tx.to.toLowerCase() : null,
      value,
      isOutgoing,
      gasPrice: tx.gasPrice ? parseFloat(tx.gasPrice) / 1e9 : 0,
      gasUsed: tx.gasUsed ? parseFloat(tx.gasUsed) : 0,
      hasInput: tx.input && tx.input !== "0x",
      isError: tx.isError,
    };
  });
}

function detectValueAnomalies(transactions) {
  const anomalies = [];

  const values = transactions.map((tx) => tx.value);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;

  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const threshold = mean + 3 * stdDev;

  transactions.forEach((tx) => {
    if (tx.value > threshold && tx.value > 0.1) {
      const zScore = (tx.value - mean) / stdDev;
      const score = Math.min(1, zScore / 10);

      anomalies.push({
        transactionHash: tx.hash,
        timestamp: tx.timestamp,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        score,
        type: "large_value",
        description: `Giao dịch có giá trị cao bất thường (${tx.value.toFixed(
          4
        )} ETH, gấp ${(tx.value / mean).toFixed(2)} lần trung bình)`,
      });
    }
  });

  return anomalies;
}

function detectFrequencyAnomalies(transactions) {
  const anomalies = [];

  if (transactions.length < 3) {
    return anomalies;
  }

  const timeDiffs = [];
  for (let i = 1; i < transactions.length; i++) {
    timeDiffs.push(transactions[i].timestamp - transactions[i - 1].timestamp);
  }

  const sum = timeDiffs.reduce((acc, val) => acc + val, 0);
  const mean = sum / timeDiffs.length;

  if (timeDiffs.length < 3 || mean < 3600) {
    return anomalies;
  }

  for (let i = 1; i < transactions.length - 1; i++) {
    const prevDiff = transactions[i].timestamp - transactions[i - 1].timestamp;
    const nextDiff = transactions[i + 1].timestamp - transactions[i].timestamp;

    if (prevDiff < 300 && nextDiff < 300 && mean > 3600) {
      const score = Math.min(
        1,
        0.5 + (3600 - Math.min(prevDiff, nextDiff)) / 7200
      );

      anomalies.push({
        transactionHash: transactions[i].hash,
        timestamp: transactions[i].timestamp,
        from: transactions[i].from,
        to: transactions[i].to,
        value: transactions[i].value,
        score,
        type: "high_frequency",
        description:
          "Chuỗi giao dịch có tần suất cao bất thường trong thời gian ngắn",
      });
    }
  }

  return anomalies;
}

function detectPatternAnomalies(transactions) {
  const anomalies = [];

  transactions.forEach((tx) => {
    if (tx.isError) {
      anomalies.push({
        transactionHash: tx.hash,
        timestamp: tx.timestamp,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        score: 0.7,
        type: "failed_transaction",
        description:
          "Giao dịch bị lỗi, có thể là một phần của cuộc tấn công hoặc scam",
      });
    }
  });

  const addressGroups = {};

  transactions.forEach((tx) => {
    const partner = tx.isOutgoing ? tx.to : tx.from;

    if (!partner) return;

    if (!addressGroups[partner]) {
      addressGroups[partner] = [];
    }

    addressGroups[partner].push(tx);
  });

  Object.keys(addressGroups).forEach((address) => {
    const txs = addressGroups[address];

    if (txs.length < 3) return;

    txs.sort((a, b) => a.timestamp - b.timestamp);

    const timeSpan = txs[txs.length - 1].timestamp - txs[0].timestamp;
    const totalValue = txs.reduce((sum, tx) => sum + tx.value, 0);

    if (txs.length >= 3 && timeSpan < 3600 && totalValue > 0.5) {
      const score = Math.min(1, 0.6 + txs.length / 10 + totalValue / 20);

      anomalies.push({
        transactionHash: txs[0].hash,
        timestamp: txs[0].timestamp,
        from: txs[0].from,
        to: txs[0].to,
        value: totalValue,
        score,
        type: "split_transactions",
        description: `Phát hiện ${
          txs.length
        } giao dịch chia nhỏ đến cùng địa chỉ trong vòng ${Math.round(
          timeSpan / 60
        )} phút, tổng ${totalValue.toFixed(4)} ETH`,
      });
    }
  });

  return anomalies;
}
