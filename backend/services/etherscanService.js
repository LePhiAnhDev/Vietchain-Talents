const axios = require("axios");
const dotenv = require("dotenv");
const NodeCache = require("node-cache");

dotenv.config();

const cache = new NodeCache({ stdTTL: 86400 });

const contractAddressCache = new Set();
const normalAddressCache = new Set();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
console.log(
  "Loaded API Key:",
  ETHERSCAN_API_KEY ? "Found (not showing for security)" : "Not found"
);

const callEtherscanAPI = async (module, action, params = {}) => {
  const url = "https://api.etherscan.io/api";

  try {
    console.log(
      `Calling Etherscan API: ${module}.${action} with key: ${ETHERSCAN_API_KEY.substring(
        0,
        5
      )}...`
    );

    const response = await axios.get(url, {
      params: {
        module,
        action,
        apikey: ETHERSCAN_API_KEY,
        ...params,
      },
    });

    if (module === "proxy" && action === "eth_getCode") {
      if (response.data && response.data.result !== undefined) {
        console.log(`Etherscan eth_getCode response received`);
        return response.data.result;
      } else {
        throw new Error(`Invalid response format`);
      }
    } else {
      console.log(
        `Etherscan response: status=${response.data.status}, message=${
          response.data.message || "N/A"
        }`
      );

      if (response.data.status === "1") {
        return response.data.result;
      } else {
        throw new Error(
          `Etherscan API Error: ${
            response.data.message || response.data.result || "Unknown Error"
          }`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error calling Etherscan API (${module}.${action}):`,
      error.message
    );
    throw error;
  }
};

exports.getWalletInfo = async (address) => {
  const cacheKey = `wallet_info_${address}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  try {
    let balance;
    try {
      balance = await callEtherscanAPI("account", "balance", {
        address,
        tag: "latest",
      });
    } catch (error) {
      console.warn(
        `Không thể lấy balance, sử dụng giá trị mặc định: ${error.message}`
      );
      balance = "0";
    }

    const isContract = await exports.isContract(address);

    const result = {
      address,
      balance,
      isContract,
      firstSeen: null,
      lastSeen: new Date(),
    };

    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error in getWalletInfo:", error);
    return {
      address,
      balance: "0",
      isContract: false,
      firstSeen: null,
      lastSeen: new Date(),
    };
  }
};

exports.getTransactions = async (address, limit = 100) => {
  const cacheKey = `transactions_${address}_${limit}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    console.log(
      `[CACHE] Lấy ${cachedData.length} giao dịch từ cache cho địa chỉ ${address}`
    );
    return cachedData;
  }

  try {
    console.log(`[API] Lấy giao dịch cho địa chỉ ${address}, limit=${limit}`);

    const txList = await callEtherscanAPI("account", "txlist", {
      address,
      startblock: 0,
      endblock: 99999999,
      page: 1,
      offset: limit,
      sort: "desc",
    });

    console.log(
      `[API] Nhận được ${
        Array.isArray(txList) ? txList.length : 0
      } giao dịch từ Etherscan`
    );

    const transactions = Array.isArray(txList)
      ? txList.map((tx) => ({
          hash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          timestamp: parseInt(tx.timeStamp),
          from: tx.from.toLowerCase(),
          to: tx.to ? tx.to.toLowerCase() : "",
          value: tx.value,
          valueInEth: (parseFloat(tx.value) / 1e18).toFixed(6),
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed,
          input: tx.input,
          isError: tx.isError === "1",
          methodId: tx.methodId,
          functionName: tx.functionName,
        }))
      : [];

    console.log(`[API] Đã xử lý ${transactions.length} giao dịch`);

    if (transactions.length === 0) {
      console.log(`[DEMO] Không có giao dịch thực, sử dụng dữ liệu demo`);
      const demoData = getDemoTransactions(address, limit);
      cache.set(cacheKey, demoData);
      return demoData;
    }

    cache.set(cacheKey, transactions);

    return transactions;
  } catch (error) {
    console.error("Error in getTransactions:", error.message);
    console.log(`[DEMO] Lỗi khi lấy giao dịch, sử dụng dữ liệu demo`);
    const demoData = getDemoTransactions(address, limit);
    return demoData;
  }
};

exports.isContract = async (address) => {
  address = address.toLowerCase();

  if (contractAddressCache.has(address)) return true;
  if (normalAddressCache.has(address)) return false;

  const cacheKey = `isContract_${address}`;
  const cachedData = cache.get(cacheKey);

  if (cachedData !== undefined) {
    if (cachedData) contractAddressCache.add(address);
    else normalAddressCache.add(address);
    return cachedData;
  }

  try {
    try {
      const result = await callEtherscanAPI("contract", "getsourcecode", {
        address,
      });

      if (Array.isArray(result) && result.length > 0) {
        const isContract =
          result[0].ABI !== "Contract source code not verified";

        cache.set(cacheKey, isContract, 86400); // cache 24 giờ

        if (isContract) contractAddressCache.add(address);
        else normalAddressCache.add(address);

        return isContract;
      }
    } catch (error) {
      console.warn(`Không thể kiểm tra bằng source code: ${error.message}`);
    }

    console.warn(`Không thể xác định contract, giả định là địa chỉ thường`);
    cache.set(cacheKey, false, 86400);
    normalAddressCache.add(address);
    return false;
  } catch (error) {
    console.error("Error in isContract:", error);
    cache.set(cacheKey, false, 86400);
    normalAddressCache.add(address);
    return false;
  }
};

function getDemoTransactions(address, limit = 10) {
  const currentTime = Math.floor(Date.now() / 1000);
  const demoTransactions = [];

  for (let i = 0; i < limit; i++) {
    const isOutgoing = i % 2 === 0;
    const randomValue = Math.floor(Math.random() * 1000000000000000000); // Random value in wei
    const randomETH = (randomValue / 1e18).toFixed(6);

    demoTransactions.push({
      hash: `0x${generateRandomHex(64)}`,
      blockNumber: 12000000 + i,
      timestamp: currentTime - i * 3600, // Mỗi giao dịch cách nhau 1 giờ
      from: isOutgoing ? address.toLowerCase() : `0x${generateRandomHex(40)}`,
      to: isOutgoing ? `0x${generateRandomHex(40)}` : address.toLowerCase(),
      value: randomValue.toString(),
      valueInEth: randomETH,
      gas: "21000",
      gasPrice: "20000000000",
      gasUsed: "21000",
      input: "0x",
      isError: false,
      methodId: "",
      functionName: "",
    });
  }

  return demoTransactions;
}

function generateRandomHex(length) {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

exports.testConnection = async () => {
  try {
    console.log("Testing Etherscan API connection...");
    const result = await callEtherscanAPI("stats", "ethprice");

    return {
      success: true,
      message: "Kết nối thành công với Etherscan API",
      result,
    };
  } catch (error) {
    console.error("Test connection failed:", error.message);
    return {
      success: false,
      message: `Lỗi kết nối: ${error.message}`,
    };
  }
};

exports.getDemoTransactions = getDemoTransactions;
exports.generateRandomHex = generateRandomHex;
