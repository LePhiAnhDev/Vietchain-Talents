const etherscanService = require("../services/etherscanService");
const graphService = require("../services/graphService");
const anomalyService = require("../services/anomalyService");
const Wallet = require("../models/wallet");
const Transaction = require("../models/transaction");
const {
  getDemoTransactions,
  generateRandomHex,
} = require("../services/etherscanService");

exports.getWalletInfo = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    let wallet = await Wallet.findOne({ address });

    if (!wallet) {
      const etherscanData = await etherscanService.getWalletInfo(address);

      wallet = new Wallet({
        address,
        balance: etherscanData.balance,
        firstSeen: etherscanData.firstSeen,
        lastSeen: etherscanData.lastSeen,
        isContract: etherscanData.isContract,
      });

      await wallet.save();
    }

    return res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    console.error("Error in getWalletInfo:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin ví",
      error: error.message,
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 100, page = 1, demo = false } = req.query;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    if (demo === "true") {
      console.log(`[DEMO] Trả về dữ liệu demo cho ${address}`);
      const demoData = getDemoTransactions(address, parseInt(limit));
      return res.status(200).json({
        success: true,
        data: demoData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: false,
          isDemo: true,
        },
      });
    }

    let transactions = await Transaction.find({
      $or: [{ from: address }, { to: address }],
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    if (transactions.length < parseInt(limit)) {
      console.log(
        `[DB] Chỉ tìm thấy ${transactions.length} giao dịch trong DB, lấy thêm từ API`
      );
      const etherscanTxs = await etherscanService.getTransactions(
        address,
        limit
      );

      const existingTxHashes = transactions.map((tx) => tx.hash);
      const newTxs = etherscanTxs.filter(
        (tx) => !existingTxHashes.includes(tx.hash)
      );

      console.log(`[API] Tìm thấy ${newTxs.length} giao dịch mới từ API`);

      if (newTxs.length > 0) {
        try {
          await Transaction.insertMany(newTxs);
          console.log(`[DB] Đã lưu ${newTxs.length} giao dịch mới vào DB`);
        } catch (dbError) {
          console.error(`[DB] Lỗi khi lưu giao dịch vào DB:`, dbError.message);
        }

        transactions = await Transaction.find({
          $or: [{ from: address }, { to: address }],
        })
          .sort({ timestamp: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));
      }
    }

    if (transactions.length === 0) {
      console.log(`[DEMO] Không tìm thấy giao dịch thực, trả về dữ liệu demo`);
      const demoData = getDemoTransactions(address, parseInt(limit));
      return res.status(200).json({
        success: true,
        data: demoData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: false,
          isDemo: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: transactions.length === parseInt(limit),
        isDemo: false,
      },
    });
  } catch (error) {
    console.error("Error in getTransactions:", error);
    const demoData = getDemoTransactions(req.params.address, 100);
    return res.status(200).json({
      success: true,
      data: demoData,
      pagination: {
        page: 1,
        limit: 100,
        hasMore: false,
        isDemo: true,
        error: error.message,
      },
    });
  }
};

exports.getRelationshipGraph = async (req, res) => {
  try {
    const { address } = req.params;
    const { depth = 1, limit = 20 } = req.query;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    const graph = await graphService.buildRelationshipGraph(
      address,
      parseInt(depth),
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      data: graph,
    });
  } catch (error) {
    console.error("Error in getRelationshipGraph:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi xây dựng đồ thị quan hệ",
      error: error.message,
    });
  }
};

exports.getAnomalies = async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    const transactions = await Transaction.find({
      $or: [{ from: address }, { to: address }],
    })
      .sort({ timestamp: -1 })
      .limit(200);

    if (transactions.length === 0) {
      const etherscanTxs = await etherscanService.getTransactions(address, 200);

      if (etherscanTxs.length > 0) {
        try {
          await Transaction.insertMany(etherscanTxs);
        } catch (err) {
          console.warn("Error saving transactions to DB:", err.message);
        }
      }

      const anomalies = await anomalyService.detectAnomalies(
        etherscanTxs,
        address
      );

      return res.status(200).json({
        success: true,
        data: anomalies,
      });
    }

    const anomalies = await anomalyService.detectAnomalies(
      transactions,
      address
    );

    return res.status(200).json({
      success: true,
      data: anomalies,
    });
  } catch (error) {
    console.error("Error in getAnomalies:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi phát hiện giao dịch bất thường",
      error: error.message,
    });
  }
};

exports.analyzeWallet = async (req, res) => {
  try {
    const { address } = req.params;
    const { demo = false } = req.query;

    console.log(`[ANALYZE] Phân tích ví ${address}, demo=${demo}`);

    if (!address || !address.startsWith("0x")) {
      return res.status(400).json({
        success: false,
        message: "Địa chỉ ví không hợp lệ",
      });
    }

    if (demo === "true") {
      console.log(`[DEMO] Trả về phân tích demo cho ${address}`);
      return res.status(200).json({
        success: true,
        data: {
          wallet: {
            address,
            balance: (Math.random() * 10).toFixed(6),
            isContract: false,
            firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
            lastSeen: new Date(),
          },
          transactions: getDemoTransactions(address, 20),
          graph: getFallbackGraph(address),
          anomalies: getDemoAnomalies(address, 3),
        },
      });
    }

    let wallet = await Wallet.findOne({ address });

    if (!wallet) {
      console.log(`[DB] Không tìm thấy ví ${address} trong DB, lấy từ API`);
      const etherscanData = await etherscanService.getWalletInfo(address);

      try {
        wallet = new Wallet({
          address,
          balance: etherscanData.balance,
          firstSeen: etherscanData.firstSeen,
          lastSeen: etherscanData.lastSeen,
          isContract: etherscanData.isContract,
        });

        await wallet.save();
        console.log(`[DB] Đã lưu ví ${address} vào DB`);
      } catch (dbError) {
        console.error(`[DB] Lỗi khi lưu ví vào DB:`, dbError.message);
        wallet = etherscanData;
      }
    }

    let transactions = await Transaction.find({
      $or: [{ from: address }, { to: address }],
    })
      .sort({ timestamp: -1 })
      .limit(20);

    if (transactions.length === 0) {
      console.log(
        `[DB] Không tìm thấy giao dịch cho ${address} trong DB, lấy từ API`
      );
      const etherscanTxs = await etherscanService.getTransactions(address, 20);

      if (etherscanTxs.length > 0) {
        try {
          await Transaction.insertMany(etherscanTxs);
          console.log(
            `[DB] Đã lưu ${etherscanTxs.length} giao dịch mới vào DB`
          );
          transactions = etherscanTxs;
        } catch (dbError) {
          console.error(`[DB] Lỗi khi lưu giao dịch vào DB:`, dbError.message);
          transactions = etherscanTxs;
        }
      } else {
        console.log(`[API] Không tìm thấy giao dịch từ API, sử dụng demo`);
        transactions = getDemoTransactions(address, 20);
      }
    }

    console.log(`[GRAPH] Xây dựng đồ thị quan hệ cho ${address}`);
    let graph;
    try {
      graph = await graphService.buildRelationshipGraph(address, 1, 20);
    } catch (graphError) {
      console.error(`[GRAPH] Lỗi khi xây dựng đồ thị:`, graphError.message);
      graph = getFallbackGraph(address);
    }

    console.log(`[ANOMALY] Phát hiện bất thường cho ${address}`);
    let anomalies;
    try {
      anomalies = await anomalyService.detectAnomalies(transactions, address);
    } catch (anomalyError) {
      console.error(
        `[ANOMALY] Lỗi khi phát hiện bất thường:`,
        anomalyError.message
      );
      anomalies = getDemoAnomalies(address, 2);
    }

    console.log(`[ANALYZE] Hoàn tất phân tích cho ${address}`);
    return res.status(200).json({
      success: true,
      data: {
        wallet: wallet || { address, balance: "0" },
        transactions:
          transactions.length > 0
            ? transactions
            : getDemoTransactions(address, 20),
        graph: graph || getFallbackGraph(address),
        anomalies: anomalies || getDemoAnomalies(address, 2),
      },
    });
  } catch (error) {
    console.error("Error in analyzeWallet:", error);
    return res.status(200).json({
      success: true,
      data: {
        wallet: {
          address: req.params.address,
          balance: "0",
          isContract: false,
          firstSeen: null,
          lastSeen: new Date(),
        },
        transactions: getDemoTransactions(req.params.address, 20),
        graph: getFallbackGraph(req.params.address),
        anomalies: getDemoAnomalies(req.params.address, 2),
        error: error.message,
      },
    });
  }
};

function getFallbackGraph(centralAddress) {
  const nodes = [{ address: centralAddress, type: "main" }];

  const edges = [];

  for (let i = 0; i < 5; i++) {
    const randomAddress = `0x${generateRandomHex(40)}`;
    const isContract = i % 3 === 0;

    nodes.push({
      address: randomAddress,
      type: isContract ? "contract" : "normal",
    });

    const isOutgoing = i % 2 === 0;
    edges.push({
      from: isOutgoing ? centralAddress : randomAddress,
      to: isOutgoing ? randomAddress : centralAddress,
      value: Math.random() * 5,
      count: Math.floor(Math.random() * 5) + 1,
      type: isOutgoing ? "sent" : "received",
    });
  }

  return { nodes, edges };
}

// Tạo dữ liệu bất thường demo
function getDemoAnomalies(address, count = 2) {
  const anomalies = [];
  const currentTime = Math.floor(Date.now() / 1000);

  const anomalyTypes = [
    {
      type: "large_value",
      description: "Giao dịch có giá trị cao bất thường",
    },
    {
      type: "high_frequency",
      description: "Chuỗi giao dịch có tần suất cao bất thường",
    },
    {
      type: "split_transactions",
      description: "Phát hiện giao dịch chia nhỏ đến cùng địa chỉ",
    },
    {
      type: "unusual_pattern",
      description:
        "Giao dịch có mẫu bất thường so với các giao dịch thông thường",
    },
  ];

  for (let i = 0; i < count; i++) {
    const anomalyType = anomalyTypes[i % anomalyTypes.length];
    anomalies.push({
      transactionHash: `0x${generateRandomHex(64)}`,
      timestamp: currentTime - i * 86400, // Mỗi giao dịch cách nhau 1 ngày
      from: i % 2 === 0 ? address : `0x${generateRandomHex(40)}`,
      to: i % 2 === 0 ? `0x${generateRandomHex(40)}` : address,
      value: (Math.random() * 5 + 1).toFixed(4),
      score: Math.random() * 0.3 + 0.7, // Điểm 0.7-1.0
      type: anomalyType.type,
      description: anomalyType.description,
    });
  }

  return anomalies;
}
