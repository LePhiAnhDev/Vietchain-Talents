🚀 Hướng dẫn sử dụng
Cài đặt và chạy project:
Step 1: Điều hướng đến thư mục backend
bashcd backend
Step 2: Cài đặt các dependencies
bashnpm install
Step 3: Khởi chạy server backend
bashnpm run dev
Step 4: Điều hướng đến thư mục frontend
bashcd ..\frontend\
Step 5: Mở web bằng extension (ví dụ: Live Preview)

Sử dụng Live Preview extension trong VS Code hoặc bất kỳ web server nào

📁 Cấu trúc Project
Project:.
|   .gitignore
|   LICENSE
|   README.md
|
+---backend
|   |   .env
|   |   package.json
|   |   server.js
|   |
|   +---config
|   |       config.js
|   |       db.js
|   |
|   +---controllers
|   |       walletController.js
|   |
|   +---models
|   |       transaction.js
|   |       wallet.js
|   |
|   +---routes
|   |       index.js
|   |       wallet.js
|   |
|   +---services
|   |       anomalyService.js
|   |       etherscanService.js
|   |       graphService.js
|   |
|   \---utils
|       |   helpers.js
|       |
|       \---anomalyDetection
|               autoencoder.js
|               deep-learning.js
|               ensemble.js
|               isolation-forest.js
|               lof.js
|               one-class-svm.js
|
\---frontend
    |   index.html
    |
    +---css
    |       style.css
    |
    \---js
            graph.js
            main.js
