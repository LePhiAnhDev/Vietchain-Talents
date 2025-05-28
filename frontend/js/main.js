document.addEventListener("DOMContentLoaded", function () {
  const searchBtn = document.getElementById("search-btn");
  const demoBtn = document.getElementById("demo-btn");
  const walletInput = document.getElementById("wallet-address");
  const loading = document.getElementById("loading");
  const results = document.getElementById("results");

  const API_URL = "http://localhost:3000/api";

  searchBtn.addEventListener("click", async function () {
    const walletAddress = walletInput.value.trim();

    if (!walletAddress || !walletAddress.startsWith("0x")) {
      alert("Vui lòng nhập địa chỉ ví Ethereum hợp lệ (bắt đầu bằng 0x)");
      return;
    }

    loading.style.display = "block";
    results.style.display = "none";

    try {
      const response = await fetch(
        `${API_URL}/wallet/${walletAddress}/analysis`
      );

      if (!response.ok) {
        throw new Error("Không thể lấy dữ liệu ví");
      }

      const data = await response.json();

      displayTransactions(data.data.transactions);
      renderGraph(data.data.graph);
      displayAnomalies(data.data.anomalies);

      loading.style.display = "none";
      results.style.display = "block";
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra: " + error.message);
      loading.style.display = "none";
    }
  });

  demoBtn.addEventListener("click", function () {
    loading.style.display = "block";
    results.style.display = "none";

    const demoAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    walletInput.value = demoAddress;

    fetchDemoData(demoAddress);
  });

  async function fetchDemoData(address) {
    try {
      const response = await fetch(
        `${API_URL}/wallet/${address}/analysis?demo=true`
      );

      if (!response.ok) {
        throw new Error("Không thể lấy dữ liệu demo");
      }

      const data = await response.json();

      displayTransactions(data.data.transactions);
      renderGraph(data.data.graph);
      displayAnomalies(data.data.anomalies);

      loading.style.display = "none";
      results.style.display = "block";
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra: " + error.message);
      loading.style.display = "none";
    }
  }

  walletInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  function displayTransactions(transactions) {
    const tbody = document.querySelector("#transactions-table tbody");
    tbody.innerHTML = "";

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx) => {
        const row = document.createElement("tr");

        const hashCell = document.createElement("td");
        const hashLink = document.createElement("a");
        hashLink.href = `https://etherscan.io/tx/${tx.hash}`;
        hashLink.target = "_blank";
        hashLink.className = "transaction-link";
        hashLink.textContent = tx.hash.substring(0, 10) + "...";
        hashCell.appendChild(hashLink);

        const blockCell = document.createElement("td");
        blockCell.textContent = tx.blockNumber;

        const timeCell = document.createElement("td");
        const date = new Date(tx.timestamp * 1000);
        timeCell.textContent = date.toLocaleString();

        const fromCell = document.createElement("td");
        fromCell.className = "address-cell";
        fromCell.textContent = tx.from;
        fromCell.title = tx.from;

        const toCell = document.createElement("td");
        toCell.className = "address-cell";
        toCell.textContent = tx.to;
        toCell.title = tx.to;

        const valueCell = document.createElement("td");
        valueCell.textContent =
          tx.valueInEth || (parseFloat(tx.value) / 1e18).toFixed(6);

        row.appendChild(hashCell);
        row.appendChild(blockCell);
        row.appendChild(timeCell);
        row.appendChild(fromCell);
        row.appendChild(toCell);
        row.appendChild(valueCell);

        tbody.appendChild(row);
      });
    } else {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "Không tìm thấy giao dịch";
      cell.className = "text-center";
      row.appendChild(cell);
      tbody.appendChild(row);
    }
  }

  function displayAnomalies(anomalies) {
    const container = document.getElementById("anomalies-list");
    const noAnomalies = document.getElementById("no-anomalies");

    container.innerHTML = "";

    if (anomalies && anomalies.length > 0) {
      noAnomalies.style.display = "none";

      anomalies.forEach((anomaly) => {
        const card = document.createElement("div");
        card.className = "card anomaly-card";

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const title = document.createElement("h5");
        title.className = "card-title";
        title.textContent = anomaly.type;

        const desc = document.createElement("p");
        desc.className = "card-text";
        desc.textContent = anomaly.description;

        const txInfo = document.createElement("p");
        txInfo.className = "card-text";

        const txLink = document.createElement("a");
        txLink.href = `https://etherscan.io/tx/${anomaly.transactionHash}`;
        txLink.target = "_blank";
        txLink.className = "transaction-link";
        txLink.textContent = anomaly.transactionHash;

        txInfo.innerHTML = `Giao dịch: `;
        txInfo.appendChild(txLink);

        const score = document.createElement("div");
        score.className = "mt-2";
        score.innerHTML = `<strong>Mức độ bất thường:</strong> <span class="badge bg-danger">${anomaly.score.toFixed(
          2
        )}</span>`;

        cardBody.appendChild(title);
        cardBody.appendChild(desc);
        cardBody.appendChild(txInfo);
        cardBody.appendChild(score);

        card.appendChild(cardBody);
        container.appendChild(card);
      });
    } else {
      noAnomalies.style.display = "block";
    }
  }
});
