// 假設這是你的購物車資料，通常從 localStorage 撈出
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// 1. 初始化渲染購物車
function renderCart() {
    const cartContainer = document.getElementById('cart-container'); // 你的購物車列表容器
    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>購物車空空如也 🍔</p>';
        updateTotal();
        return;
    }

    cart.forEach((item, index) => {
        // 為每一個商品列建立一個 div 或 tr
        const itemRow = document.createElement('div');
        itemRow.className = 'cart-item';
        // ✨ 關鍵：給每一列一個獨一無二的 id，方便等一下精準定位
        itemRow.id = `cart-item-${index}`; 

        itemRow.innerHTML = `
            <span class="item-name">${item.name}</span>
            <span class="item-price">$${item.price}</span>
            
            <div class="quantity-control">
                <button onclick="changeQty(${index}, -1)">-</button>
                <span id="qty-${index}">${item.quantity}</span>
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
            
            <span class="item-subtotal" id="subtotal-${index}">$${item.price * item.quantity}</span>
            
            <button onclick="removeItem(${index})" class="delete-btn">🗑️ 刪除</button>
        `;
        cartContainer.appendChild(itemRow);
    });

    updateTotal(); // 計算總金額
}

// 2. ✨【核心功能】局部更新數量與小計（免刷頁）
function changeQty(index, amount) {
    // 調整數量
    cart[index].quantity += amount;

    // 防呆：如果數量小於 1，就維持 1 (或是直接觸發刪除)
    if (cart[index].quantity < 1) {
        cart[index].quantity = 1;
        return;
    }

    // 更新 localStorage 紀錄
    localStorage.setItem('cart', JSON.stringify(cart));

    // 🚀 【局部更新 DOM】不重刷網頁，直接改畫面的字！
    const qtySpan = document.getElementById(`qty-${index}`);
    const subtotalSpan = document.getElementById(`subtotal-${index}`);

    if (qtySpan && subtotalSpan) {
        qtySpan.innerText = cart[index].quantity; // 即時改數量
        subtotalSpan.innerText = `$${cart[index].price * cart[index].quantity}`; // 即時改小計
    }

    // 🚀 即時重新計算底部總金額
    updateTotal();
}

// 3. ✨【核心功能】局部刪除商品（免刷頁）
function removeItem(index) {
    if (confirm(`確定要刪除 ${cart[index].name} 嗎？`)) {
        // 從陣列中剔除該商品
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));

        // 🚀 【局部更新 DOM】直接把那一個商品的 HTML 節點拔掉
        const itemRow = document.getElementById(`cart-item-${index}`);
        if (itemRow) {
            itemRow.remove(); 
        }

        // 如果全部刪光了，重新呼叫 renderCart 顯示「購物車空空如也」
        if (cart.length === 0) {
            renderCart();
        } else {
            // 如果還有商品，只需要重新計算總金額
            updateTotal();
        }
    }
}

// 4. ✨ 重新計算並局部更新總金額
function updateTotal() {
    const totalAmountEl = document.getElementById('total-amount'); // 總金額的元素
    
    // 用 reduce 加總所有品項的 (價格 * 數量)
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (totalAmountEl) {
        totalAmountEl.innerText = `$${total}`; // 即時更新總計數字
    }
}

// 網頁載入時執行
renderCart();