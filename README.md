## 🚀 Hướng dẫn sử dụng

### 📦 Cài đặt và chạy project:

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/NPM-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="NPM">
</div>

**Step 1:** 📂 Điều hướng đến thư mục backend
```bash
cd backend
```

**Step 2:** ⬇️ Cài đặt các dependencies
```bash
npm install
```

**Step 3:** 🌐 Khởi chạy server backend
```bash
npm run dev
```

**Step 4:** 📁 Điều hướng đến thư mục frontend  
```bash
cd ../frontend/
```

**Step 5:** 🖥️ Mở web bằng extension
> 💡 **Khuyến nghị:** Sử dụng **Live Preview** extension trong VS Code hoặc bất kỳ web server nào  
> 🔗 **Hoặc:** Mở trực tiếp file `index.html` trong trình duyệt

---

## 📁 Cấu trúc Project

```
Project Root/
│   .gitignore                    # Git ignore rules
│   LICENSE                       # License file  
│   README.md                     # Documentation
│
├───backend/                      # 🚀 Backend Server
│   │   .env                      # Environment variables
│   │   package.json              # NPM dependencies
│   │   server.js                 # Express server entry
│   │
│   ├───config/                   # ⚙️ Configuration
│   │       config.js             # App config
│   │       db.js                 # Database config
│   │
│   ├───controllers/              # 🎮 Controllers
│   │       walletController.js   # Wallet logic
│   │
│   ├───models/                   # 📊 Data Models
│   │       transaction.js        # Transaction model
│   │       wallet.js             # Wallet model
│   │
│   ├───routes/                   # 🛣️ API Routes
│   │       index.js              # Main routes
│   │       wallet.js             # Wallet routes
│   │
│   ├───services/                 # 🔧 Business Services
│   │       anomalyService.js     # Anomaly detection service
│   │       etherscanService.js   # Etherscan API service
│   │       graphService.js       # Graph processing service
│   │
│   └───utils/                    # 🛠️ Utilities
│       │   helpers.js            # Helper functions
│       │
│       └───anomalyDetection/     # 🎯 AI Algorithms
│               autoencoder.js    # Neural network approach
│               deep-learning.js  # Deep learning models
│               ensemble.js       # Ensemble methods
│               isolation-forest.js # Isolation Forest
│               lof.js            # Local Outlier Factor
│               one-class-svm.js  # One-Class SVM ⭐
│
└───frontend/                     # 🎨 Frontend Interface
    │   index.html                # Main HTML page
    │
    ├───css/                      # 💄 Stylesheets
    │       style.css             # Main styles
    │
    └───js/                       # ⚡ JavaScript
            graph.js              # Graph visualization
            main.js               # Main app logic
```
