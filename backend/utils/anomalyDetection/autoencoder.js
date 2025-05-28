const tf = require("@tensorflow/tfjs-node");

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

function createTensors(normalizedData, features) {
  const values = normalizedData.map((item) =>
    features.map((feature) => item[feature])
  );

  return tf.tensor2d(values);
}

function buildModel(inputDim) {
  const encodingDim = Math.ceil(inputDim / 2);

  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      units: encodingDim,
      activation: "relu",
      inputShape: [inputDim],
    })
  );

  model.add(
    tf.layers.dense({
      units: inputDim,
      activation: "sigmoid",
    })
  );

  model.compile({
    optimizer: "adam",
    loss: "meanSquaredError",
  });

  return model;
}

async function trainModel(model, inputTensor, epochs = 50, batchSize = 32) {
  await model.fit(inputTensor, inputTensor, {
    epochs,
    batchSize,
    shuffle: true,
    verbose: 0,
  });
}

function calculateAnomalyScores(model, inputTensor, normalizedData) {
  const outputTensor = model.predict(inputTensor);

  const inputArray = inputTensor.arraySync();
  const outputArray = outputTensor.arraySync();

  const reconstructionErrors = inputArray.map((input, i) => {
    const output = outputArray[i];

    let sumSquaredError = 0;
    for (let j = 0; j < input.length; j++) {
      sumSquaredError += Math.pow(input[j] - output[j], 2);
    }

    return sumSquaredError / input.length;
  });

  const maxError = Math.max(...reconstructionErrors);
  const minError = Math.min(...reconstructionErrors);

  const result = {};
  normalizedData.forEach((item, index) => {
    let score;
    if (maxError > minError) {
      score = (reconstructionErrors[index] - minError) / (maxError - minError);
    } else {
      score = 0;
    }

    result[item.hash] = score;
  });

  inputTensor.dispose();
  outputTensor.dispose();

  return result;
}

exports.detect = async function (data) {
  try {
    const { normalizedData, features, stats } = normalizeData(data);

    if (features.length === 0 || normalizedData.length < 5) {
      return {};
    }

    const inputTensor = createTensors(normalizedData, features);

    const model = buildModel(features.length);
    await trainModel(model, inputTensor);

    const scores = calculateAnomalyScores(model, inputTensor, normalizedData);

    return scores;
  } catch (error) {
    console.error("Error in Autoencoder detection:", error);
    return {};
  }
};
