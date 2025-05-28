const tf = require("@tensorflow/tfjs-node");

function normalizeData(data) {
  if (data[0].timestamp) {
    data.sort((a, b) => a.timestamp - b.timestamp);
  }

  const features = Object.keys(data[0]).filter(
    (key) =>
      typeof data[0][key] === "number" && key !== "hash" && key !== "timestamp"
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
    const normalized = {
      hash: item.hash,
      timestamp: item.timestamp,
    };

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

function createSequences(data, features, sequenceLength = 5) {
  const sequences = [];
  const targets = [];

  if (data.length < sequenceLength + 1) {
    return { sequences: [], targets: [] };
  }

  for (let i = 0; i <= data.length - sequenceLength - 1; i++) {
    const sequence = [];

    for (let j = i; j < i + sequenceLength; j++) {
      const featureValues = features.map((feature) => data[j][feature]);
      sequence.push(featureValues);
    }

    sequences.push(sequence);

    const target = features.map((feature) => data[i + sequenceLength][feature]);
    targets.push(target);
  }

  return { sequences, targets };
}

function buildModel(sequenceLength, numFeatures) {
  const model = tf.sequential();

  model.add(
    tf.layers.lstm({
      units: 64,
      inputShape: [sequenceLength, numFeatures],
      returnSequences: false,
    })
  );

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(
    tf.layers.dense({
      units: numFeatures,
      activation: "sigmoid",
    })
  );

  model.compile({
    optimizer: "adam",
    loss: "meanSquaredError",
  });

  return model;
}

async function trainModel(
  model,
  sequences,
  targets,
  epochs = 30,
  batchSize = 16
) {
  const xs = tf.tensor3d(sequences);
  const ys = tf.tensor2d(targets);

  await model.fit(xs, ys, {
    epochs,
    batchSize,
    shuffle: true,
    verbose: 0,
  });

  xs.dispose();
  ys.dispose();
}

function calculateAnomalyScores(
  model,
  data,
  sequences,
  targets,
  features,
  sequenceLength
) {
  if (sequences.length === 0) {
    const result = {};
    data.forEach((item) => {
      result[item.hash] = 0;
    });
    return result;
  }

  const xs = tf.tensor3d(sequences);
  const predictions = model.predict(xs);

  const predArray = predictions.arraySync();
  const targetArray = targets;

  const errors = [];

  for (let i = 0; i < predArray.length; i++) {
    let mse = 0;
    for (let j = 0; j < features.length; j++) {
      mse += Math.pow(predArray[i][j] - targetArray[i][j], 2);
    }
    mse /= features.length;
    errors.push(mse);
  }

  const maxError = Math.max(...errors);
  const minError = Math.min(...errors);

  const normalizedErrors = errors.map((error) => {
    if (maxError > minError) {
      return (error - minError) / (maxError - minError);
    }
    return 0.5;
  });

  const result = {};

  for (let i = 0; i < sequenceLength; i++) {
    result[data[i].hash] = 0;
  }

  for (let i = 0; i < normalizedErrors.length; i++) {
    result[data[i + sequenceLength].hash] = normalizedErrors[i];
  }

  xs.dispose();
  predictions.dispose();

  return result;
}

exports.detect = async function (data) {
  try {
    if (data.length < 10) {
      const result = {};
      data.forEach((item) => {
        result[item.hash] = 0;
      });
      return result;
    }

    const { normalizedData, features } = normalizeData(data);

    if (features.length === 0) {
      const result = {};
      data.forEach((item) => {
        result[item.hash] = 0;
      });
      return result;
    }

    const sequenceLength = Math.min(5, Math.floor(normalizedData.length / 3));
    const { sequences, targets } = createSequences(
      normalizedData,
      features,
      sequenceLength
    );

    if (sequences.length === 0) {
      const result = {};
      data.forEach((item) => {
        result[item.hash] = 0;
      });
      return result;
    }

    const model = buildModel(sequenceLength, features.length);
    await trainModel(model, sequences, targets);

    const scores = calculateAnomalyScores(
      model,
      normalizedData,
      sequences,
      targets,
      features,
      sequenceLength
    );

    return scores;
  } catch (error) {
    console.error("Error in Deep Learning detection:", error);

    const result = {};
    data.forEach((item) => {
      result[item.hash] = 0;
    });
    return result;
  }
};
