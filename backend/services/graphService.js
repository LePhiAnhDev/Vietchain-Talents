const Transaction = require("../models/transaction");
const etherscanService = require("./etherscanService");

exports.buildRelationshipGraph = async (
  centralAddress,
  depth = 1,
  limit = 50
) => {
  try {
    centralAddress = centralAddress.toLowerCase();

    const nodes = {};

    const edges = {};

    nodes[centralAddress] = {
      address: centralAddress,
      type: "main",
    };

    let transactions = await Transaction.find({
      $or: [{ from: centralAddress }, { to: centralAddress }],
    })
      .sort({ timestamp: -1 })
      .limit(50);

    if (!transactions || transactions.length === 0) {
      try {
        transactions = await etherscanService.getTransactions(
          centralAddress,
          50
        );

        if (transactions && transactions.length > 0) {
          await Transaction.insertMany(transactions).catch((err) => {
            console.warn("Error saving transactions to DB:", err.message);
          });
        }
      } catch (error) {
        console.error("Error fetching transactions:", error.message);
        transactions = generateDemoTransactions(centralAddress, 20);
      }
    }

    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to ? tx.to.toLowerCase() : null;

      if (!to) continue;

      if (!nodes[from]) {
        let isFromContract = false;

        try {
          isFromContract = await etherscanService.isContract(from);
        } catch (error) {
          console.warn(
            `Không thể kiểm tra contract cho ${from}: ${error.message}`
          );
        }

        nodes[from] = {
          address: from,
          type:
            from === centralAddress
              ? "main"
              : isFromContract
              ? "contract"
              : "normal",
        };
      }

      if (!nodes[to]) {
        let isToContract = false;

        try {
          isToContract = await etherscanService.isContract(to);
        } catch (error) {
          console.warn(
            `Không thể kiểm tra contract cho ${to}: ${error.message}`
          );
        }

        nodes[to] = {
          address: to,
          type:
            to === centralAddress
              ? "main"
              : isToContract
              ? "contract"
              : "normal",
        };
      }

      const edgeKey = `${from}-${to}`;
      if (!edges[edgeKey]) {
        edges[edgeKey] = {
          from,
          to,
          value: parseFloat(tx.value) / 1e18,
          count: 1,
          type: from === centralAddress ? "sent" : "received",
        };
      } else {
        edges[edgeKey].value += parseFloat(tx.value) / 1e18;
        edges[edgeKey].count++;
      }

      if (Object.keys(nodes).length >= limit) {
        break;
      }
    }

    return {
      nodes: Object.values(nodes),
      edges: Object.values(edges),
    };
  } catch (error) {
    console.error("Error in buildRelationshipGraph:", error);
    return getFallbackGraph(centralAddress);
  }
};

function generateDemoTransactions(address, count = 10) {
  const transactions = [];
  const currentTime = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const isOutgoing = i % 2 === 0;
    const randomAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

    transactions.push({
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      blockNumber: 12000000 + i,
      timestamp: currentTime - i * 3600,
      from: isOutgoing ? address : randomAddress,
      to: isOutgoing ? randomAddress : address,
      value: (Math.random() * 10).toFixed(18).toString().replace(".", ""),
      gas: "21000",
      gasPrice: "20000000000",
      gasUsed: "21000",
      input: "0x",
      isError: false,
    });
  }

  return transactions;
}

function getFallbackGraph(centralAddress) {
  const nodes = [{ address: centralAddress, type: "main" }];

  const edges = [];

  for (let i = 0; i < 5; i++) {
    const randomAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
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
