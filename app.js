const KEY = "dukadesk-data";

const starterProducts = [
  { id: 1, name: "Maize Flour 2kg", sku: "MF-002", price: 150, stock: 18, threshold: 5 },
  { id: 2, name: "Cooking Oil 1L", sku: "CO-001", price: 320, stock: 4, threshold: 5 },
  { id: 3, name: "Sugar 1kg", sku: "SG-001", price: 180, stock: 22, threshold: 6 },
  { id: 4, name: "Rice 2kg", sku: "RC-002", price: 280, stock: 3, threshold: 5 },
  { id: 5, name: "Bar Soap", sku: "BS-001", price: 120, stock: 16, threshold: 5 },
  { id: 6, name: "Milk 500ml", sku: "MK-500", price: 65, stock: 0, threshold: 8 }
];

let products = [];
let sales = [];
let cart = [];
let toastTimer;

const $ = id => document.getElementById(id);

function money(value) {
  return "KSh " + Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function saveData() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ products, sales }));
  } catch (error) {
    notify("Could not save data in this browser.");
  }
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));

    if (
      saved &&
      Array.isArray(saved.products) &&
      Array.isArray(saved.sales)
    ) {
      products = saved.products;
      sales = saved.sales;
      return;
    }
  } catch (error) {
    console.warn("Saved data could not be loaded.");
  }

  products = starterProducts.map(product => ({ ...product }));
  sales = [];
  saveData();
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return new Date(date).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function status(product) {
  if (product.stock === 0) {
    return { text: "Out of stock", css: "out" };
  }

  if (product.stock <= product.threshold) {
    return { text: "Low stock", css: "low" };
  }

  return { text: "In stock", css: "good" };
}

/* NAVIGATION */

function navigate(page) {
  const titles = {
    dashboard: ["OVERVIEW", "Dashboard"],
    products: ["INVENTORY", "Products"],
    sales: ["TRANSACTION", "Record Sale"],
    reports: ["ANALYTICS", "Reports"]
  };

  if (!titles[page]) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("eyebrow").textContent = titles[page][0];
  $("pageTitle").textContent = titles[page][1];
  $("sidebar").classList.remove("open");

  if (page === "products") renderProducts();
  if (page === "sales") {
    refreshSaleProducts();
    renderCart();
  }
  if (page === "reports") renderReports();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

/* DASHBOARD */

function renderDashboard() {
  const todaySales = sales.filter(
    sale => todayKey(new Date(sale.date)) === todayKey()
  );

  const revenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const lowStock = products.filter(
    product => product.stock <= product.threshold
  );

  $("todaySales").textContent = money(revenue);
  $("todayCount").textContent =
    `${todaySales.length} transaction(s) today`;

  $("productCount").textContent = products.length;
  $("stockCount").textContent = products.reduce(
    (sum, product) => sum + product.stock, 0
  );
  $("lowCount").textContent = lowStock.length;

  $("lowStockList").innerHTML = lowStock.length
    ? lowStock.slice(0, 6).map(product => `
        <div class="stock-item">
          <div>
            <b>${escapeHTML(product.name)}</b>
            <small>${escapeHTML(product.sku)}</small>
          </div>
          <span class="qty">${product.stock} left</span>
        </div>
      `).join("")
    : '<p class="empty">All products are sufficiently stocked.</p>';

  const recent = [...sales]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  $("recentSales").innerHTML = recent.map(sale => `
    <tr>
      <td>${escapeHTML(sale.receipt)}</td>
      <td>${sale.items.reduce((sum, item) => sum + item.qty, 0)}</td>
      <td><strong>${money(sale.total)}</strong></td>
    </tr>
  `).join("");

  $("noRecent").classList.toggle("hidden", recent.length > 0);
}

/* PRODUCT INVENTORY */

function renderProducts() {
  const query = $("search").value.trim().toLowerCase();
  const filter = $("stockFilter").value;

  const filtered = products.filter(product => {
    const matchesSearch =
      `${product.name} ${product.sku}`.toLowerCase().includes(query);

    const matchesFilter =
      filter === "all" ||
      (filter === "low" &&
        product.stock > 0 &&
        product.stock <= product.threshold) ||
      (filter === "out" && product.stock === 0);

    return matchesSearch && matchesFilter;
  });

  $("productRows").innerHTML = filtered.map(product => {
    const stockStatus = status(product);

    return `
      <tr>
        <td><strong>${escapeHTML(product.name)}</strong></td>
        <td>${escapeHTML(product.sku)}</td>
        <td>${money(product.price)}</td>
        <td>${product.stock}</td>
        <td>
          <span class="stock-status ${stockStatus.css}">
            ${stockStatus.text}
          </span>
        </td>
        <td>
          <button class="secondary" data-edit="${product.id}">Edit</button>
          <button class="secondary" data-delete="${product.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");

  $("noProducts").classList.toggle("hidden", filtered.length > 0);
}

$("search").addEventListener("input", renderProducts);
$("stockFilter").addEventListener("change", renderProducts);

$("productRows").addEventListener("click", event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;

  if (editId) {
    const product = products.find(p => p.id === Number(editId));
    if (product) openProductModal(product);
  }

  if (deleteId) {
    const product = products.find(p => p.id === Number(deleteId));
    if (!product) return;

    if (confirm(`Delete ${product.name} from inventory?`)) {
      products = products.filter(p => p.id !== product.id);
      cart = cart.filter(item => item.id !== product.id);
      saveData();
      refreshAll();
      notify("Product deleted.");
    }
  }
});

/* ADD AND EDIT PRODUCTS */

function openProductModal(product = null) {
  $("productForm").reset();
  $("editId").value = product ? product.id : "";
  $("modalTitle").textContent = product ? "Edit product" : "Add product";
  $("formError").textContent = "";

  $("name").value = product ? product.name : "";
  $("sku").value = product ? product.sku : "";
  $("price").value = product ? product.price : "";
  $("quantity").value = product ? product.stock : "";
  $("threshold").value = product ? product.threshold : 5;

  $("productModal").classList.remove("hidden");
  $("name").focus();
}

function closeProductModal() {
  $("productModal").classList.add("hidden");
}

$("addProduct").addEventListener("click", () => openProductModal());
$("closeModal").addEventListener("click", closeProductModal);
$("cancelModal").addEventListener("click", closeProductModal);

$("productModal").addEventListener("click", event => {
  if (event.target === $("productModal")) closeProductModal();
});

$("productForm").addEventListener("submit", event => {
  event.preventDefault();

  const id = $("editId").value;
  const product = {
    name: $("name").value.trim(),
    sku: $("sku").value.trim(),
    price: Number($("price").value),
    stock: Number($("quantity").value),
    threshold: Number($("threshold").value)
  };

  const error = $("formError");

  if (
    !product.name ||
    !product.sku ||
    !Number.isFinite(product.price) ||
    product.price <= 0 ||
    !Number.isInteger(product.stock) ||
    product.stock < 0 ||
    !Number.isInteger(product.threshold) ||
    product.threshold < 0
  ) {
    error.textContent = "Enter valid product details and whole-number quantities.";
    return;
  }

  const duplicate = products.some(p =>
    p.sku.toLowerCase() === product.sku.toLowerCase() &&
    String(p.id) !== id
  );

  if (duplicate) {
    error.textContent = "This product code already exists.";
    return;
  }

  if (id) {
    products = products.map(p =>
      String(p.id) === id ? { ...p, ...product } : p
    );

    // Refresh cart prices and names if the product was edited.
    cart = cart.map(item => {
      const updated = products.find(p => p.id === item.id);
      return updated
        ? { ...item, name: updated.name, price: updated.price }
        : item;
    });

    notify("Product updated.");
  } else {
    const nextId = products.length
      ? Math.max(...products.map(p => p.id)) + 1
      : 1;

    products.push({ id: nextId, ...product });
    notify("Product added.");
  }

  saveData();
  closeProductModal();
  refreshAll();
});

/* SALES AND SHOPPING CART */

function refreshSaleProducts() {
  const available = products.filter(p => p.stock > 0);
  const previous = $("saleProduct").value;

  $("saleProduct").innerHTML = available.length
    ? available.map(product => `
        <option value="${product.id}">
          ${escapeHTML(product.name)} — ${money(product.price)}
          (${product.stock} available)
        </option>
      `).join("")
    : '<option value="">No products in stock</option>';

  if (available.some(p => String(p.id) === previous)) {
    $("saleProduct").value = previous;
  }

  $("addToSale").disabled = available.length === 0;
}

$("addToSale").addEventListener("click", () => {
  const id = Number($("saleProduct").value);
  const quantity = Number($("saleQty").value);
  const product = products.find(p => p.id === id);

  if (!product) {
    notify("Add a product with available stock first.");
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    notify("Enter a valid whole-number quantity.");
    return;
  }

  const existing = cart.find(item => item.id === id);
  const inCart = existing ? existing.qty : 0;

  if (quantity + inCart > product.stock) {
    notify(`Only ${product.stock - inCart} more unit(s) available.`);
    return;
  }

  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: quantity
    });
  }

  $("saleQty").value = 1;
  renderCart();
  notify("Item added to sale.");
});

function renderCart() {
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty, 0
  );

  $("cartCount").textContent = itemCount;
  $("subtotal").textContent = money(subtotal);
  $("total").textContent = money(subtotal);

  $("cartItems").innerHTML = cart.length
    ? cart.map(item => `
        <div class="cart-item">
          <div>
            <b>${escapeHTML(item.name)}</b>
            <small>${item.qty} × ${money(item.price)}</small>
          </div>
          <strong>${money(item.price * item.qty)}</strong>
          <button class="remove" data-remove="${item.id}">×</button>
        </div>
      `).join("")
    : '<p class="empty">Your sale is empty.</p>';
}

$("cartItems").addEventListener("click", event => {
  const id = event.target.dataset.remove;
  if (!id) return;

  cart = cart.filter(item => item.id !== Number(id));
  renderCart();
});

$("completeSale").addEventListener("click", () => {
  if (!cart.length) {
    notify("Add at least one product first.");
    return;
  }

  // Recheck stock before completing the transaction.
  for (const item of cart) {
    const product = products.find(p => p.id === item.id);

    if (!product || product.stock < item.qty) {
      notify(`Insufficient stock for ${item.name}.`);
      return;
    }
  }

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    product.stock -= item.qty;
  });

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.qty, 0
  );

  sales.push({
    receipt: "DD-" + Date.now().toString().slice(-8),
    date: new Date().toISOString(),
    items: cart.map(item => ({ ...item })),
    total,
    payment: $("payment").value
  });

  cart = [];
  saveData();
  refreshAll();
  navigate("dashboard");
  notify(`Sale completed: ${money(total)}`);
});

/* REPORTS */

function renderReports() {
  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  $("revenue").textContent = money(revenue);
  $("transactionCount").textContent = sales.length;
  $("averageSale").textContent = money(
    sales.length ? revenue / sales.length : 0
  );

  const sorted = [...sales].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  $("reportRows").innerHTML = sorted.map(sale => `
    <tr>
      <td>${escapeHTML(sale.receipt)}</td>
      <td>${escapeHTML(formatDate(sale.date))}</td>
      <td>${sale.items.reduce((sum, item) => sum + item.qty, 0)}</td>
      <td>${escapeHTML(sale.payment)}</td>
      <td><strong>${money(sale.total)}</strong></td>
    </tr>
  `).join("");

  $("noReports").classList.toggle("hidden", sorted.length > 0);
}

$("exportCsv").addEventListener("click", () => {
  if (!sales.length) {
    notify("No sales to export yet.");
    return;
  }

  const rows = [[
    "Receipt", "Date", "Product", "Quantity",
    "Unit price (KSh)", "Line total (KSh)", "Payment"
  ]];

  sales.forEach(sale => {
    sale.items.forEach(item => {
      rows.push([
        sale.receipt,
        formatDate(sale.date),
        item.name,
        item.qty,
        item.price,
        (item.qty * item.price).toFixed(2),
        sale.payment
      ]);
    });
  });

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "dukadesk-sales-report.csv";
  link.click();

  URL.revokeObjectURL(url);
  notify("CSV report downloaded.");
});

/* INITIALIZE APPLICATION */

function refreshAll() {
  renderDashboard();
  renderProducts();
  refreshSaleProducts();
  renderCart();
  renderReports();
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProductModal();
    $("sidebar").classList.remove("open");
  }
});

loadData();
refreshAll();