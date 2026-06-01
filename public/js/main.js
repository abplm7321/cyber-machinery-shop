let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let productsData = []; // 用來儲存從 API 撈出來的商品列表

fetch('/api/products')
  .then(res => res.json())
  .then(data => {
      productsData = data; // 存起來
      const productList = document.getElementById('product-list');
      productList.innerHTML = ""; // 清空容器

      data.forEach((product, index) => {
          productList.innerHTML += `
              <div class="card">
                  <div class="card-content">
                      <h2>${product.name}</h2>
                      <p class="price">$${product.price}</p>
                      <button onclick="handleAddToCart(${index})">
                          加入購物車
                      </button>
                  </div>
              </div>
          `;
      });
  });

// 重新整理後的加入購物車函式
function handleAddToCart(index) {
  const product = productsData[index]; // 透過 index 抓到完整的商品物件
  
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity++;
  } else {
    // 確保把完整的商品資訊（id, name, price）一起存進去
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
// alert(`${product.name} 已加入購物車！`); // 加個提示比較貼心
}

function updateCartCount() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartCountEl = document.getElementById("cart-count");
  if (cartCountEl) {
    cartCountEl.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// 初始執行
updateCartCount();