const express = require('express'); // 載入 Express 套件，用來建立 Web 伺服器與處理網址
const path = require('path');       // 載入 Node.js 內建的 path 套件，用來處理檔案與資料夾的路徑
const app = express();              // 初始化 Express 應用程式執行個體，之後都用 app 來操作伺服器
const db = require('./db');         // 載入同目錄下的 db.js 檔案，用來連線並操作 SQLite 資料庫

app.use(express.json());            // 告訴伺服器：當前端傳送 JSON 格式的資料過來時，自動幫我解析（例如結帳資料
app.use(express.static('public'));  // 設定靜態檔案資料夾為 'public'，讓瀏覽器可以直接讀取裡面的 CSS 或圖片

/* ------ 初始化資料庫（建立資料表與預設商品）------*/

db.serialize(() => {
    // 如果 products (商品) 資料表還不存在，就建立它
    db.run(`
        CREATE TABLE IF NOT EXISTS products (

            id INTEGER PRIMARY KEY AUTOINCREMENT,   -- 商品編號，會自動加 1 (1, 2, 3...)

            name TEXT,                              -- 商品名稱

            price INTEGER,                          -- 商品價格

            image TEXT                              -- 商品圖片路徑
        )
    `);
    // 每次啟動伺服器時，自動塞入這兩筆預設的漢堡商品資料
    db.run(`
        INSERT INTO products (name, price, image)
        VALUES 
            ('高扭力伺服馬達 (MG996R)', 350, '/images/motor.jpg'),
            ('微控制器開發板 (Type-C 介面)', 280, '/images/mcu.jpg'),
            ('工業級超音波測距感測器', 420, '/images/sensor.jpg')
    `);
    // 如果 orders (訂單) 資料表還不存在，就建立它
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,   -- 訂單編號，自動加 1
            name TEXT,                              -- 訂購人姓名
            phone TEXT,                             -- 聯絡電話
            info TEXT,                              -- 外送地址或自取時間
            items TEXT,                             -- 點購明細，會把購物車陣列轉成 JSON 字串存進去
            total INTEGER,                          -- 訂單總金額
            status TEXT DEFAULT '處理中',            -- 訂單狀態，預設為 '處理中'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

/* ------ 網頁路由（決定輸入什麼網址該開哪張網頁）------*/

// 啟動伺服器，監聽 3000 連接埠 (Port)
app.listen(3000, () => {
    console.log('Server running');  // 成功啟動後在終端機列印出這行字
});

// 當瀏覽器輸入 http://localhost:3000/（首頁）
app.get('/', (req, res) => {
    // 回傳並打開 views 資料夾底下的 index.html 檔案
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// 當瀏覽器輸入 http://localhost:3000/cart（購物車頁面）
app.get('/cart', (req, res) => {
    // 回傳並打開 views 資料夾底下的 cart.html 檔案
    res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

// 當瀏覽器輸入 http://localhost:3000/admin（商品管理後台）
app.get('/admin', (req, res) => {
    // 回傳並打開 views 資料夾底下的 admin.html 檔案
    res.sendFile(path.join(__dirname, 'views', 'admin.html')); 
});

// 當瀏覽器輸入 http://localhost:3000/orders（訂單總覽後台）
app.get('/orders', (req, res) => {
    // 回傳並打開 views 資料夾底下的 orders.html 檔案
    res.sendFile(path.join(__dirname, 'views', 'orders.html')); 
});

/* ------ 商品管理 API（前台撈取、後台新增與下架）------*/

// 【GET API】提供給前端，用來撈取目前所有的商品
app.get('/api/products', (req, res) => {
    // 去資料庫執行撈取全部商品的 SQL 指令
    db.all('SELECT * FROM products',[],(err, rows) => {
        if(err){
            throw err;  // 如果查資料庫失敗，拋出錯誤
        }
        res.json(rows); // 成功就把所有商品轉成 JSON 格式回應給前端（網頁再用 JS 渲染成卡片）
    });
});

// 【POST API】後台用來「上架新商品」
app.post('/api/products', (req, res) => {
    const { name, price } = req.body;           // 從前端傳來的資料中，解構出商品名稱和價格
    const image = '/images/default.jpg'; //給一個預設圖

    const sql = `INSERT INTO products (name, price, image) VALUES (?, ?, ?)`;
    // 執行 SQL 語法，把資料塞進 products 表中，Number(price) 確保價格是數字
    db.run(sql, [name, Number(price), image], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "上架失敗" });
        }
        // 成功後回應前端
        res.json({ success: true, message: "商品上架成功！", productId: this.lastID });
    });
});

// 【DELETE API】後台用來「下架商品」
// :id 是一個動態參數，代表要刪除的商品 ID (例如 /api/products/3)
app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;    // 取得網址上的商品 ID

    const sql = `DELETE FROM products WHERE id = ?`;
    // 去資料庫把這個 ID 的商品刪除
    db.run(sql, [productId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "下架失敗" });
        }
        res.json({ success: true, message: "商品已成功下架！" });
    });
});
 
/* ------ 訂單管理 API（客戶送出訂單、老闆讀取訂單）------*/

// 【POST API】購物車填完表單後「確認結帳、送出訂單」
app.post('/api/orders', (req, res) => {
    // 接收前端包裝好的姓名、電話、備註、購物車品項、總金額
    const { name, phone, info, items, total } = req.body;

    // 將資料寫入 SQLite
    const sql = `INSERT INTO orders (name, phone, info, items, total) VALUES (?, ?, ?, ?, ?)`;
    // items 是一個陣列，資料庫不接受陣列，所以用 JSON.stringify 把它轉成一長串字串存進去
    const params = [name, phone, info, JSON.stringify(items), total];

    db.run(sql, params, function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "資料庫寫入失敗" });
        }
        // 成功後，回傳 success: true 以及這筆新訂單在資料庫的流水編號 (this.lastID) 给前端
        res.json({ success: true, orderId: this.lastID, message: "訂單送出成功！" });
    });
});

// 【GET API】訂單總覽頁面（orders.html）用來「讀取所有訂單」
app.get('/api/orders', (req, res) => {
    // ORDER BY created_at DESC 代表按照時間「由新到舊」排序，把最新訂單放最上面
    const sql = `SELECT * FROM orders ORDER BY created_at DESC`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "無法讀取訂單資料" });
        }
        // 將資料庫所有的訂單紀錄傳給前端表格去顯示
        res.json(rows);
    });
});

// 更新訂單狀態的 API
app.post('/api/orders/:id/complete', (req, res) => {
    const orderId = req.params.id;

    // 將該筆訂單的狀態改為 '已完成'
    const sql = `UPDATE orders SET status = '已完成' WHERE id = ?`;
    
    db.run(sql, [orderId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "更新訂單狀態失敗" });
        }
        res.json({ success: true, message: "訂單已順利完成！" });
    });
});

// 刪除單筆訂單的 API
app.delete('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;

    // 從 orders 資料表中刪除指定 ID 的訂單
    const sql = `DELETE FROM orders WHERE id = ?`;
    
    db.run(sql, [orderId], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: "刪除訂單失敗" });
        }
        res.json({ success: true, message: `訂單 #${orderId} 已成功刪除！` });
    });
});