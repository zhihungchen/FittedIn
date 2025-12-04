# 📚 資料庫遷移操作教學

這份教學會教你如何執行資料庫遷移（Migration），將新的變更應用到資料庫中。

---

## 📋 什麼是資料庫遷移？

資料庫遷移就像是資料庫的「版本控制」，用來：
- 建立新表格
- 修改表格結構（例如：改變欄位類型）
- 新增或移除欄位
- 更新資料庫結構

---

## ⚙️ 前置準備

### 1. 確認資料庫正在運行

首先，確認 PostgreSQL 資料庫正在運行：

**如果使用 Docker：**
```bash
# 檢查 Docker 容器狀態
docker-compose ps

# 如果沒有運行，啟動它
docker-compose up -d
```

**如果使用本地 PostgreSQL：**
```bash
# 檢查 PostgreSQL 服務狀態
pg_isready

# 或在 Linux/Mac 上
sudo systemctl status postgresql
```

### 2. 確認環境變數設置

進入 `backend` 目錄，檢查是否有 `.env` 檔案：

```bash
cd backend
ls -la | grep .env
```

如果沒有 `.env` 檔案，請參考 `backend/env.production.example` 建立一個。

**開發環境的 `.env` 範例：**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fittedin_dev
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

---

## 🚀 執行遷移的步驟

### 方法一：使用 npm 腳本（推薦）

這是最簡單的方法：

```bash
# 1. 進入 backend 目錄
cd backend

# 2. 執行遷移
npm run db:migrate
```

### 方法二：直接使用 Sequelize CLI

```bash
# 1. 進入 backend 目錄
cd backend

# 2. 執行遷移
npx sequelize-cli db:migrate
```

---

## ✅ 驗證遷移是否成功

### 1. 檢查終端輸出

成功的話，你會看到類似這樣的訊息：
```
Sequelize CLI [Node: x.x.x]

Loaded configuration file "src/config/config.json".
Using environment "development".
== 20250101000000-update-avatar-url-to-text: migrating =======
== 20250101000000-update-avatar-url-to-text: migrated (0.xxx s)

✅ Migration completed successfully!
```

### 2. 檢查資料庫

**使用 pgAdmin：**
1. 開啟 `http://localhost:5050`
2. 連接到資料庫
3. 檢查 `users` 表格的 `avatar_url` 欄位類型是否已改為 `TEXT`

**使用 PostgreSQL 命令列：**
```bash
# 連接到資料庫
psql -h localhost -U postgres -d fittedin_dev

# 查看 users 表格結構
\d users

# 或查看特定欄位
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'avatar_url';

# 退出
\q
```

---

## 📝 其他有用的遷移命令

### 查看遷移狀態
```bash
# 查看已執行的遷移
npx sequelize-cli db:migrate:status
```

### 撤銷最後一次遷移
```bash
# 撤銷最後一次執行的遷移
npx sequelize-cli db:migrate:undo
```

### 撤銷所有遷移
```bash
# ⚠️ 注意：這會刪除所有表格結構！
npx sequelize-cli db:migrate:undo:all
```

### 重新執行所有遷移
```bash
# 這會先撤銷所有遷移，然後重新執行
npm run db:reset
```

---

## 🔍 常見問題排除

### 問題 1: 找不到 config.json

**錯誤訊息：**
```
Error: Cannot find module 'src/config/config.json'
```

**解決方法：**
```bash
# 確認你在 backend 目錄中
cd backend

# 確認 config.json 存在
ls src/config/config.json
```

### 問題 2: 資料庫連接失敗

**錯誤訊息：**
```
ECONNREFUSED 127.0.0.1:5432
```

**解決方法：**
1. 確認資料庫正在運行
2. 檢查 `.env` 檔案中的資料庫連接資訊
3. 確認資料庫名稱、用戶名、密碼是否正確

```bash
# 測試資料庫連接
cd backend
node -e "require('./src/config/database.js').testConnection()"
```

### 問題 3: 遷移檔案已存在

**錯誤訊息：**
```
Error: Migration "xxxxx" already exists
```

**解決方法：**
這通常不是問題，只是表示遷移檔案已存在。如果你想重新執行：
```bash
# 撤銷該遷移
npx sequelize-cli db:migrate:undo

# 重新執行
npm run db:migrate
```

### 問題 4: 表格已存在

**錯誤訊息：**
```
error: relation "users" already exists
```

**解決方法：**
這表示資料庫中已有該表格。如果你想重新建立：
```bash
# ⚠️ 警告：這會刪除所有資料！
npx sequelize-cli db:migrate:undo:all
npm run db:migrate
```

---

## 🎯 這次的遷移內容

這次我們執行的遷移是：`20250101000000-update-avatar-url-to-text.js`

**變更內容：**
- 將 `users` 表格的 `avatar_url` 欄位從 `VARCHAR(500)` 改為 `TEXT`
- 這樣可以支援更長的 base64 圖片資料

**為什麼需要這個遷移？**
- 之前的欄位限制為 500 字元，但 base64 編碼的圖片通常超過這個長度
- 改為 `TEXT` 類型可以儲存任意長度的資料

---

## 📖 延伸閱讀

- [Sequelize 官方文檔](https://sequelize.org/docs/v6/other-topics/migrations/)
- [專案資料庫管理指南](./DATABASE_MANAGEMENT.md)

---

## 💡 提示

1. **執行遷移前備份資料庫**（如果是生產環境）
   ```bash
   pg_dump -h localhost -U postgres fittedin_dev > backup.sql
   ```

2. **開發環境可以隨時重置**
   ```bash
   npm run db:reset  # 清除所有資料並重新建立
   ```

3. **檢查遷移狀態**
   ```bash
   npx sequelize-cli db:migrate:status
   ```

---

如有任何問題，請參考錯誤訊息或查看專案文檔！

