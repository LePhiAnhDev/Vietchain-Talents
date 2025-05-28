function euclideanDistance(point1, point2, features) {
  let sum = 0;
  for (const feature of features) {
    const diff = point1[feature] - point2[feature];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function findKNearestNeighbors(data, point, k, features) {
  const distances = data.map((otherPoint) => {
    if (otherPoint.hash === point.hash) {
      return { point: otherPoint, distance: Infinity };
    }

    const distance = euclideanDistance(point, otherPoint, features);
    return { point: otherPoint, distance };
  });

  distances.sort((a, b) => a.distance - b.distance);

  return distances.slice(0, k);
}

function reachabilityDistance(pointA, pointB, kNeighborsB, features) {
  const d = euclideanDistance(pointA, pointB, features);

  const kDistance = kNeighborsB[kNeighborsB.length - 1].distance;

  return Math.max(kDistance, d);
}

function localReachabilityDensity(point, kNeighbors, allKNeighbors, features) {
  let sum = 0;

  for (const neighbor of kNeighbors) {
    const neighborKNeighbors = allKNeighbors[neighbor.point.hash];

    const rd = reachabilityDistance(
      point,
      neighbor.point,
      neighborKNeighbors,
      features
    );
    sum += rd;
  }

  return kNeighbors.length / sum;
}

function calculateLOF(data, k, features) {
  const allKNeighbors = {};

  for (const point of data) {
    allKNeighbors[point.hash] = findKNearestNeighbors(data, point, k, features);
  }

  const lrd = {};

  for (const point of data) {
    lrd[point.hash] = localReachabilityDensity(
      point,
      allKNeighbors[point.hash],
      allKNeighbors,
      features
    );
  }

  const lof = {};

  for (const point of data) {
    let sum = 0;
    const neighbors = allKNeighbors[point.hash];

    for (const neighbor of neighbors) {
      sum += lrd[neighbor.point.hash] / lrd[point.hash];
    }

    lof[point.hash] = sum / neighbors.length;
  }

  return lof;
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

  return { normalizedData, features };
}

exports.detect = async function (data) {
  try {
    const { normalizedData, features } = normalizeData(data);

    if (features.length === 0 || normalizedData.length < 5) {
      return {};
    }

    const k = Math.min(20, Math.ceil(Math.sqrt(normalizedData.length)));

    const lofScores = calculateLOF(normalizedData, k, features);

    const scores = Object.values(lofScores);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const result = {};

    for (const hash in lofScores) {
      if (maxScore > minScore) {
        result[hash] = Math.min(
          1,
          Math.max(0, (lofScores[hash] - minScore) / (maxScore - minScore))
        );
      } else {
        result[hash] = 0.5;
      }
    }

    return result;
  } catch (error) {
    console.error("Error in LOF detection:", error);
    return {};
  }
};
