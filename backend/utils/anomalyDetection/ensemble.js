function normalizeData(data) {
  const features = Object.keys(data[0]).filter(
    (key) => typeof data[0][key] === "number" && key !== "hash"
  );

  const stats = {};
  features.forEach((feature) => {
    const values = data.map((item) => item[feature]);
    stats[feature] = {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
    };
  });

  const normalizedData = data.map((item) => {
    const normalized = { hash: item.hash };

    features.forEach((feature) => {
      const { min, max } = stats[feature];
      if (max > min) {
        normalized[feature] = (item[feature] - min) / (max - min);
      } else {
        normalized[feature] = 0;
      }
    });

    return normalized;
  });

  return { normalizedData, features, stats };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const base = Math.floor(position);
  const rest = position - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

function detectAnomaliesByThreshold(data, features) {
  const result = {};
  const anomalyScores = {};

  features.forEach((feature) => {
    const values = data.map((item) => item[feature]);
    const q1 = percentile(values, 0.25);
    const q3 = percentile(values, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    data.forEach((item) => {
      if (!anomalyScores[item.hash]) {
        anomalyScores[item.hash] = [];
      }

      const value = item[feature];

      if (value < lowerBound || value > upperBound) {
        const distance = Math.min(
          Math.abs(value - lowerBound),
          Math.abs(value - upperBound)
        );

        const score = Math.min(1, distance / (upperBound - lowerBound));
        anomalyScores[item.hash].push(score);
      } else {
        anomalyScores[item.hash].push(0);
      }
    });
  });

  for (const hash in anomalyScores) {
    const scores = anomalyScores[hash];
    if (scores.length > 0) {
      result[hash] = Math.max(...scores);
    } else {
      result[hash] = 0;
    }
  }

  return result;
}

function detectPatternAnomalies(data) {
  if (data[0].timestamp) {
    data.sort((a, b) => a.timestamp - b.timestamp);
  }

  const result = {};

  if (data.length < 5) {
    data.forEach((item) => {
      result[item.hash] = 0;
    });
    return result;
  }

  const valueKey = "value";

  if (!data[0][valueKey]) {
    data.forEach((item) => {
      result[item.hash] = 0;
    });
    return result;
  }

  const changes = [];
  for (let i = 1; i < data.length; i++) {
    const change = Math.abs(data[i][valueKey] - data[i - 1][valueKey]);
    changes.push(change);
  }

  const mean = changes.reduce((sum, val) => sum + val, 0) / changes.length;
  const variance =
    changes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    changes.length;
  const stdDev = Math.sqrt(variance);

  for (let i = 1; i < data.length; i++) {
    const change = Math.abs(data[i][valueKey] - data[i - 1][valueKey]);
    const zScore = (change - mean) / (stdDev || 1); // Tránh chia cho 0

    result[data[i].hash] = Math.min(1, Math.max(0, (zScore - 2) / 3));
  }

  result[data[0].hash] = 0;

  return result;
}

function combineScores(scores1, scores2, weight1 = 0.5, weight2 = 0.5) {
  const result = {};

  const allHashes = new Set([...Object.keys(scores1), ...Object.keys(scores2)]);

  for (const hash of allHashes) {
    const score1 = scores1[hash] || 0;
    const score2 = scores2[hash] || 0;

    result[hash] = score1 * weight1 + score2 * weight2;
  }

  return result;
}

exports.detect = async function (data) {
  try {
    const { normalizedData, features } = normalizeData(data);

    if (features.length === 0 || normalizedData.length < 3) {
      return {};
    }

    const thresholdScores = detectAnomaliesByThreshold(
      normalizedData,
      features
    );

    const patternScores = detectPatternAnomalies(normalizedData);

    const combinedScores = combineScores(
      thresholdScores,
      patternScores,
      0.4,
      0.6
    );

    return combinedScores;
  } catch (error) {
    console.error("Error in Ensemble detection:", error);
    return {};
  }
};
