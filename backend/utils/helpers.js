exports.isValidEthereumAddress = (address) => {
  return (
    typeof address === "string" &&
    address.length === 42 &&
    address.startsWith("0x") &&
    /^0x[0-9a-fA-F]{40}$/.test(address)
  );
};

exports.mean = (arr) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

exports.standardDeviation = (arr) => {
  if (!arr || arr.length <= 1) return 0;

  const avg = exports.mean(arr);
  const squareDiffs = arr.map((val) => Math.pow(val - avg, 2));
  const variance = exports.mean(squareDiffs);

  return Math.sqrt(variance);
};

exports.weiToEth = (wei) => {
  if (!wei) return 0;
  return parseFloat(wei) / 1e18;
};

exports.timestampToDate = (timestamp) => {
  return new Date(timestamp * 1000);
};

exports.shortenAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

exports.formatNumber = (num, decimals = 2) => {
  if (num === undefined || num === null) return "0";

  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(decimals) + "B";
  } else if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(decimals) + "M";
  } else if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(decimals) + "K";
  } else if (Math.abs(num) < 0.001 && num !== 0) {
    return num.toExponential(decimals);
  }

  return num.toFixed(decimals);
};

exports.convertUnit = (value, fromUnit, toUnit) => {
  const units = {
    wei: 0,
    gwei: 9,
    eth: 18,
  };

  if (!(fromUnit in units) || !(toUnit in units)) {
    throw new Error("Unit không hợp lệ");
  }

  const factor = units[toUnit] - units[fromUnit];
  return value * Math.pow(10, factor);
};

exports.pickKeys = (obj, keys) => {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
};

exports.sortByKey = (arr, key, ascending = true) => {
  return [...arr].sort((a, b) => {
    if (a[key] < b[key]) return ascending ? -1 : 1;
    if (a[key] > b[key]) return ascending ? 1 : -1;
    return 0;
  });
};

exports.groupBy = (arr, key) => {
  return arr.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

exports.generateId = (length = 8) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
