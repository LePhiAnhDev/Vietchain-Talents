class IsolationForest {
  constructor(subsampleSize = 256, numTrees = 100, maxTreeHeight = null) {
    this.subsampleSize = subsampleSize;
    this.numTrees = numTrees;
    this.maxTreeHeight = maxTreeHeight || Math.ceil(Math.log2(subsampleSize));
    this.trees = [];
  }

  createNode(data, height, maxHeight) {
    if (height >= maxHeight || data.length <= 1) {
      return { size: data.length };
    }

    const features = Object.keys(data[0]).filter(
      (key) =>
        typeof data[0][key] === "number" &&
        key !== "hash" &&
        key !== "timestamp"
    );

    if (features.length === 0) {
      return { size: data.length };
    }

    const splitFeature = features[Math.floor(Math.random() * features.length)];

    const values = data.map((item) => item[splitFeature]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      return { size: data.length };
    }

    const splitValue = min + Math.random() * (max - min);

    const leftData = data.filter((item) => item[splitFeature] < splitValue);
    const rightData = data.filter((item) => item[splitFeature] >= splitValue);

    return {
      feature: splitFeature,
      value: splitValue,
      left: this.createNode(leftData, height + 1, maxHeight),
      right: this.createNode(rightData, height + 1, maxHeight),
      size: data.length,
    };
  }

  fit(data) {
    this.trees = [];

    for (let i = 0; i < this.numTrees; i++) {
      const subsample = this.subsample(data, this.subsampleSize);

      const tree = this.createNode(subsample, 0, this.maxTreeHeight);

      this.trees.push(tree);
    }
  }

  subsample(data, size) {
    if (data.length <= size) {
      return [...data];
    }

    const subsample = [];
    const indices = new Set();

    while (indices.size < size) {
      const index = Math.floor(Math.random() * data.length);
      if (!indices.has(index)) {
        indices.add(index);
        subsample.push(data[index]);
      }
    }

    return subsample;
  }

  getDepth(point, tree, currentDepth = 0) {
    if (!tree.left || !tree.right) {
      return currentDepth;
    }

    if (point[tree.feature] < tree.value) {
      return this.getDepth(point, tree.left, currentDepth + 1);
    } else {
      return this.getDepth(point, tree.right, currentDepth + 1);
    }
  }

  scorePoint(point) {
    const depths = this.trees.map((tree) => this.getDepth(point, tree));
    const avgDepth =
      depths.reduce((sum, depth) => sum + depth, 0) / depths.length;

    const n = this.subsampleSize;
    const c = 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;

    const score = Math.pow(2, -avgDepth / c);

    return score;
  }

  predict(data) {
    return data.map((point) => this.scorePoint(point));
  }
}

exports.detect = async function (data) {
  try {
    const processedData = data.map((item) => {
      const result = {};

      result.hash = item.hash;

      for (const key in item) {
        if (typeof item[key] === "number") {
          result[key] = item[key];
        } else if (typeof item[key] === "boolean") {
          result[key] = item[key] ? 1 : 0;
        }
      }

      return result;
    });

    const isolationForest = new IsolationForest();
    isolationForest.fit(processedData);

    const scores = isolationForest.predict(processedData);

    const result = {};
    processedData.forEach((item, index) => {
      result[item.hash] = scores[index];
    });

    return result;
  } catch (error) {
    console.error("Error in Isolation Forest detection:", error);
    return {};
  }
};
