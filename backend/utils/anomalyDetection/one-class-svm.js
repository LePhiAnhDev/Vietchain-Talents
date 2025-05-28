function gaussianKernel(x1, x2, gamma = 0.1) {
  let sum = 0;
  for (let i = 0; i < x1.length; i++) {
    sum += Math.pow(x1[i] - x2[i], 2);
  }
  return Math.exp(-gamma * sum);
}

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
    };
  });

  const normalizedData = data.map((item) => {
    const normalized = {};

    normalized.hash = item.hash;

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

function extractFeatures(data, featureNames) {
  return data.map((item) => featureNames.map((feature) => item[feature]));
}

class SimpleOneClassSVM {
  constructor(nu = 0.1, gamma = 0.1, maxIterations = 100) {
    this.nu = nu;
    this.gamma = gamma;
    this.maxIterations = maxIterations;
    this.supportVectors = [];
    this.alpha = [];
    this.rho = 0;
  }

  fit(X) {
    const n = X.length;
    const m = Math.floor(this.nu * n);

    this.alpha = Array(n).fill(0);

    for (let i = 0; i < m; i++) {
      this.alpha[i] = 1;
    }

    const K = [];
    for (let i = 0; i < n; i++) {
      K[i] = [];
      for (let j = 0; j < n; j++) {
        K[i][j] = gaussianKernel(X[i], X[j], this.gamma);
      }
    }

    for (let iter = 0; iter < this.maxIterations; iter++) {
      let changed = false;

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;

          const oldAlphaI = this.alpha[i];
          const oldAlphaJ = this.alpha[j];

          if (
            (oldAlphaI > 0 && oldAlphaI < 1) ||
            (oldAlphaJ > 0 && oldAlphaJ < 1)
          ) {
            const eta = 2 * K[i][j] - K[i][i] - K[j][j];
            if (eta >= 0) continue;

            const newAlphaJ =
              oldAlphaJ - ((K[i][i] - K[i][j]) * (oldAlphaI - oldAlphaJ)) / eta;

            const L = Math.max(0, oldAlphaI + oldAlphaJ - 1);
            const H = Math.min(1, oldAlphaI + oldAlphaJ);

            if (newAlphaJ > H) {
              this.alpha[j] = H;
            } else if (newAlphaJ < L) {
              this.alpha[j] = L;
            } else {
              this.alpha[j] = newAlphaJ;
            }

            this.alpha[i] = oldAlphaI + oldAlphaJ - this.alpha[j];

            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    this.supportVectors = [];
    this.supportVectorAlphas = [];

    for (let i = 0; i < n; i++) {
      if (this.alpha[i] > 0) {
        this.supportVectors.push(X[i]);
        this.supportVectorAlphas.push(this.alpha[i]);
      }
    }

    if (this.supportVectors.length > 0) {
      let sum = 0;
      for (let i = 0; i < this.supportVectors.length; i++) {
        let innerSum = 0;
        for (let j = 0; j < this.supportVectors.length; j++) {
          innerSum +=
            this.supportVectorAlphas[j] *
            gaussianKernel(
              this.supportVectors[i],
              this.supportVectors[j],
              this.gamma
            );
        }
        sum += innerSum;
      }
      this.rho = sum / this.supportVectors.length;
    }
  }

  decision_function(x) {
    let sum = 0;
    for (let i = 0; i < this.supportVectors.length; i++) {
      sum +=
        this.supportVectorAlphas[i] *
        gaussianKernel(x, this.supportVectors[i], this.gamma);
    }
    return sum - this.rho;
  }

  predict(X) {
    return X.map((x) => (this.decision_function(x) >= 0 ? 1 : -1));
  }

  score_samples(X) {
    const decisionValues = X.map((x) => this.decision_function(x));

    const minVal = Math.min(...decisionValues);
    const maxVal = Math.max(...decisionValues);

    if (maxVal > minVal) {
      return decisionValues.map(
        (val) => 1 - (val - minVal) / (maxVal - minVal)
      );
    } else {
      return decisionValues.map(() => 0.5);
    }
  }
}

exports.detect = async function (data) {
  try {
    const { normalizedData, features } = normalizeData(data);

    if (features.length === 0 || normalizedData.length < 5) {
      return {};
    }

    const X = extractFeatures(normalizedData, features);

    const svm = new SimpleOneClassSVM(0.1, 0.1);
    svm.fit(X);

    const scores = svm.score_samples(X);

    const result = {};
    normalizedData.forEach((item, index) => {
      result[item.hash] = scores[index];
    });

    return result;
  } catch (error) {
    console.error("Error in One-Class SVM detection:", error);
    return {};
  }
};
