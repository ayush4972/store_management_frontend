const API_BASE = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

const state = {
  token: localStorage.getItem("aa_token") || "",
  user: JSON.parse(localStorage.getItem("aa_user") || "null"),
  page: "dashboard",
  subPage: "company",
  loading: false,
  data: {},
  purchaseItems: [emptyPurchaseItem()],
  saleItems: [emptySaleItem()],
  filters: {
    stock: "all",
    expiryDays: "30"
  }
};

const pages = [
  ["dashboard", "DB", "Dashboard"],
  ["master", "MS", "Master Setup"],
  ["purchases", "PU", "Purchases"],
  ["sales", "SA", "Sales"],
  ["inventory", "ST", "Stock"],
  ["ledger", "LD", "Ledger"],
  ["payments", "PY", "Payments"],
  ["expenses", "EX", "Expenses"],
  ["reports", "RP", "Reports"],
  ["security", "US", "Users"]
];

function emptyPurchaseItem() {
  return {
    product_id: "",
    batch_no: "",
    mfg_date: "",
    expiry_date: "",
    quantity: 1,
    free_qty: 0,
    purchase_rate: 0,
    sale_rate: 0,
    mrp: 0,
    vat_percent: 0,
    discount_amount: 0
  };
}

function emptySaleItem() {
  return {
    product_id: "",
    stock_id: "",
    quantity: 1,
    sale_rate: 0,
    vat_percent: 0,
    mrp: 0
  };
}

function money(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2
  }).format(num);
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    if (response.status === 401) logout(false);
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

async function load(path, key) {
  state.data[key] = await api(path);
  return state.data[key];
}

async function loadLookups() {
  const requests = [];
  if (!state.data.parties) requests.push(load("/api/master/parties", "parties"));
  if (!state.data.products) requests.push(load("/api/master/products", "products"));
  if (!state.data.categories) requests.push(load("/api/master/categories", "categories"));
  if (!state.data.manufacturers) requests.push(load("/api/master/manufacturers", "manufacturers"));
  if (!state.data.expenseCategories) requests.push(load("/api/expenses/categories", "expenseCategories"));
  await Promise.all(requests);
}

function setUser(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("aa_token", token);
  localStorage.setItem("aa_user", JSON.stringify(user));
}

function logout(showMessage = true) {
  state.token = "";
  state.user = null;
  localStorage.removeItem("aa_token");
  localStorage.removeItem("aa_user");
  if (showMessage) toast("Signed out");
  render();
}

function initials(name) {
  return String(name || "AA")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function appTitle() {
  const current = pages.find(([id]) => id === state.page);
  return current ? current[2] : "Dashboard";
}

function appSubtitle() {
  const subtitles = {
    dashboard: "Today sales, purchases, stock value, ledgers, and alerts",
    master: "Company, parties, products, categories, and manufacturers",
    purchases: "Purchase bills with automatic stock and supplier ledger updates",
    sales: "Sales invoices with batch selection, expiry check, and stock deduction",
    inventory: "Current stock, low stock, expired stock, and batch-wise stock",
    ledger: "Outstanding balances and party-wise running ledger",
    payments: "Payment and receipt entries",
    expenses: "Expense entries and monthly expense categories",
    reports: "VAT report and profit/loss summary",
    security: "Admin and staff users"
  };
  return subtitles[state.page] || "";
}

function render() {
  const app = document.getElementById("app");
  if (!state.token) {
    app.innerHTML = loginView();
    bindLogin();
    return;
  }

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-mark">
          <div class="brand-icon">AA</div>
          <div>
            <div>Ayush & Ashish</div>
            <small>Medicine Distributors</small>
          </div>
        </div>
        <nav class="nav-list">
          ${pages.map(([id, icon, label]) => `
            <button class="nav-button ${state.page === id ? "active" : ""}" data-page="${id}">
              <span class="nav-icon">${icon}</span>
              <span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <small>Backend</small>
          <small>${escapeHtml(API_BASE)}</small>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="page-title">
            <h1>${appTitle()}</h1>
            <span>${appSubtitle()}</span>
          </div>
          <div class="toolbar">
            <div class="user-chip">
              <span class="avatar">${initials(state.user?.name)}</span>
              <span>${escapeHtml(state.user?.name || "User")}</span>
            </div>
            <button class="btn ghost" data-action="logout">Sign out</button>
          </div>
        </header>
        <section class="content" id="page-content">
          <div class="loading">Loading...</div>
        </section>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      render();
    });
  });
  document.querySelector("[data-action='logout']").addEventListener("click", () => logout());
  renderPage();
}

function loginView() {
  return `
    <div class="login-shell">
      <section class="login-hero">
        <div class="brand-mark">
          <div class="brand-icon">AA</div>
          <div>
            <div>Ayush & Ashish</div>
            <small>Medicine Distributors</small>
          </div>
        </div>
        <h1>Inventory, billing, and ledger control for medicine distribution.</h1>
        <div class="hero-meta">
          <span>Purchase stock by batch, invoice sales, monitor expiry, and track VAT from one workspace.</span>
          <span>Nepalgunj, Banke</span>
        </div>
      </section>
      <section class="login-panel">
        <form class="login-box" id="login-form">
          <h2>Sign in</h2>
          <p>Use the admin account created during database setup.</p>
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" value="admin@ayushashish.com" autocomplete="username" required />
          </div>
          <div class="field" style="margin-top:12px;">
            <label>Password</label>
            <input name="password" type="password" value="Admin@123" autocomplete="current-password" required />
          </div>
          <button class="btn primary" style="width:100%; margin-top:20px;" type="submit">Sign in</button>
          <div class="loading hide" id="login-loading">Checking credentials...</div>
        </form>
      </section>
    </div>
  `;
}

function bindLogin() {
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    document.getElementById("login-loading").classList.remove("hide");
    try {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: {
          email: form.get("email"),
          password: form.get("password")
        }
      });
      setUser(payload.token, payload.user);
      toast("Signed in");
      render();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      document.getElementById("login-loading")?.classList.add("hide");
    }
  });
}

async function renderPage() {
  const content = document.getElementById("page-content");
  try {
    if (state.page === "dashboard") await renderDashboard(content);
    if (state.page === "master") await renderMaster(content);
    if (state.page === "purchases") await renderPurchases(content);
    if (state.page === "sales") await renderSales(content);
    if (state.page === "inventory") await renderInventory(content);
    if (state.page === "ledger") await renderLedger(content);
    if (state.page === "payments") await renderPayments(content);
    if (state.page === "expenses") await renderExpenses(content);
    if (state.page === "reports") await renderReports(content);
    if (state.page === "security") await renderSecurity(content);
  } catch (error) {
    content.innerHTML = `<div class="panel panel-pad"><strong>Could not load ${appTitle()}.</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function table(headers, rows, emptyText = "No records yet") {
  if (!rows?.length) return `<div class="panel empty">${emptyText}</div>`;
  return `
    <div class="panel table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function optionList(items, valueKey, labelKey, selected = "", placeholder = "Select") {
  return `
    <option value="">${placeholder}</option>
    ${(items || []).map((item) => `
      <option value="${escapeHtml(item[valueKey])}" ${String(item[valueKey]) === String(selected) ? "selected" : ""}>
        ${escapeHtml(item[labelKey])}
      </option>
    `).join("")}
  `;
}

async function renderDashboard(content) {
  const dashboard = await load("/api/dashboard", "dashboard");
  const [lowStock, nearExpiry] = await Promise.all([
    api("/api/stock?low_stock=true"),
    api("/api/stock/near-expiry?days=30")
  ]);

  content.innerHTML = `
    <section class="section">
      <div class="kpi-grid">
        ${kpi("Today Sales", money(dashboard.today_sales?.total), `${dashboard.today_sales?.count || 0} bills`)}
        ${kpi("Today Purchase", money(dashboard.today_purchases?.total), `${dashboard.today_purchases?.count || 0} bills`)}
        ${kpi("Stock Value", money(dashboard.stock_value), "Current inventory value")}
        ${kpi("Monthly Expense", money(dashboard.month_expense), "This month")}
        ${kpi("Receivable", money(dashboard.receivable), "Customer outstanding")}
        ${kpi("Payable", money(dashboard.payable), "Supplier outstanding")}
        ${kpi("Expiry Alert", dashboard.expiry_alerts_30days || 0, "Batches within 30 days")}
        ${kpi("Low Stock", dashboard.low_stock_count || 0, "Below minimum stock")}
      </div>
    </section>
    <section class="split">
      <div class="section">
        <div class="section-head"><div><h2>Low Stock</h2><p>Products at or below minimum stock.</p></div></div>
        ${stockMiniTable(lowStock)}
      </div>
      <div class="section">
        <div class="section-head"><div><h2>Near Expiry</h2><p>Batches expiring in the next 30 days.</p></div></div>
        ${batchMiniTable(nearExpiry)}
      </div>
    </section>
  `;
}

function kpi(label, value, detail) {
  return `<div class="kpi"><span>${label}</span><strong>${value}</strong><span>${detail}</span></div>`;
}

function stockMiniTable(rows) {
  return table(["Product", "Stock", "Minimum"], rows.map((row) => `
    <tr><td>${escapeHtml(row.product_name)}</td><td>${row.total_stock || 0} ${escapeHtml(row.unit || "")}</td><td>${row.minimum_stock || 0}</td></tr>
  `), "No low stock items.");
}

function batchMiniTable(rows) {
  return table(["Product", "Batch", "Expiry", "Qty"], rows.map((row) => `
    <tr><td>${escapeHtml(row.product_name)}</td><td>${escapeHtml(row.batch_no)}</td><td>${dateOnly(row.expiry_date)}</td><td>${row.quantity}</td></tr>
  `), "No near-expiry batches.");
}

async function renderMaster(content) {
  await loadLookups();
  const tabs = [
    ["company", "Company"],
    ["parties", "Parties"],
    ["products", "Products"],
    ["categories", "Categories"],
    ["manufacturers", "Manufacturers"]
  ];

  content.innerHTML = `
    <div class="toolbar segmented">
      ${tabs.map(([id, label]) => `<button class="${state.subPage === id ? "active" : ""}" data-sub="${id}">${label}</button>`).join("")}
    </div>
    <div id="master-panel"></div>
  `;
  document.querySelectorAll("[data-sub]").forEach((button) => {
    button.addEventListener("click", () => {
      state.subPage = button.dataset.sub;
      renderPage();
    });
  });

  if (state.subPage === "company") await renderCompany();
  if (state.subPage === "parties") renderParties();
  if (state.subPage === "products") renderProducts();
  if (state.subPage === "categories") renderCategories();
  if (state.subPage === "manufacturers") renderManufacturers();
}

async function renderCompany() {
  const company = await load("/api/master/company", "company");
  document.getElementById("master-panel").innerHTML = `
    <form class="panel panel-pad section" id="company-form">
      <div class="section-head"><div><h2>Company Setup</h2><p>One-time company identity used for invoices and reports.</p></div></div>
      <div class="field-grid two">
        ${input("name", "Company Name", company.name || "Ayush & Ashish Medicine Distributors")}
        ${input("pan_vat", "PAN/VAT No.", company.pan_vat || "")}
        ${input("address", "Address", company.address || "")}
        ${input("city", "City", company.city || "Banke")}
        ${input("phone", "Contact", company.phone || "")}
        ${input("email", "Email", company.email || "", "email")}
        ${input("fiscal_year_start", "Fiscal Year Start", dateOnly(company.fiscal_year_start), "date")}
      </div>
      <div><button class="btn primary">Save Company</button></div>
    </form>
  `;
  bindSubmit("company-form", async (data) => {
    await api("/api/master/company", { method: "PUT", body: data });
    toast("Company saved");
    await renderPage();
  });
}

function renderParties() {
  const parties = state.data.parties || [];
  document.getElementById("master-panel").innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="party-form">
        <div class="section-head"><div><h2>Party Setup</h2><p>Create customers, suppliers, or both.</p></div></div>
        <div class="field-grid">
          ${select("party_type", "Type", [["customer", "Customer"], ["supplier", "Supplier"], ["both", "Both"]])}
          ${input("name", "Party Name")}
          ${input("mobile", "Mobile")}
          ${input("pan_vat", "PAN/VAT")}
          ${input("address", "Address")}
          ${input("city", "City")}
          ${input("credit_days", "Credit Days", "0", "number")}
          ${input("opening_balance", "Opening Balance", "0", "number")}
        </div>
        <div><button class="btn primary">Add Party</button></div>
      </form>
      ${table(["Name", "Type", "Mobile", "PAN/VAT", "Credit Days", "Balance"], parties.map((p) => `
        <tr>
          <td><strong>${escapeHtml(p.name)}</strong><br><span class="muted">${escapeHtml(p.address || "")}</span></td>
          <td><span class="badge">${escapeHtml(p.party_type)}</span></td>
          <td>${escapeHtml(p.mobile || "")}</td>
          <td>${escapeHtml(p.pan_vat || "")}</td>
          <td>${p.credit_days || 0}</td>
          <td>${money(p.current_balance)}</td>
        </tr>
      `), "No parties created yet.")}
    </section>
  `;
  bindSubmit("party-form", async (data) => {
    data.credit_days = Number(data.credit_days || 0);
    data.opening_balance = Number(data.opening_balance || 0);
    data.opening_balance_type = "debit";
    await api("/api/master/parties", { method: "POST", body: data });
    delete state.data.parties;
    toast("Party added");
    await loadLookups();
    await renderPage();
  });
}

function renderProducts() {
  const categories = state.data.categories || [];
  const manufacturers = state.data.manufacturers || [];
  const products = state.data.products || [];
  document.getElementById("master-panel").innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="product-form">
        <div class="section-head"><div><h2>Product Master</h2><p>Medicine details, rates, VAT, and minimum stock.</p></div></div>
        <div class="field-grid">
          ${input("product_name", "Product Name")}
          ${input("generic_name", "Generic Name")}
          ${select("manufacturer_id", "Company", manufacturers.map((m) => [m.id, m.name]))}
          ${select("category_id", "Category", categories.map((c) => [c.id, c.name]))}
          ${select("unit", "Unit", ["Box", "Strip", "Pcs", "Bottle", "Vial", "Tube", "Sachet"].map((u) => [u, u]))}
          ${input("purchase_rate", "Purchase Rate", "0", "number")}
          ${input("sale_rate", "Sale Rate", "0", "number")}
          ${input("mrp", "MRP", "0", "number")}
          ${input("vat_percent", "VAT %", "0", "number")}
          ${input("minimum_stock", "Minimum Stock", "0", "number")}
          ${input("barcode", "Barcode")}
          ${input("hsn_code", "HSN Code")}
        </div>
        <div><button class="btn primary">Add Product</button></div>
      </form>
      ${table(["Product", "Generic", "Company", "Category", "Unit", "Sale Rate", "Stock"], products.map((p) => `
        <tr>
          <td><strong>${escapeHtml(p.product_name)}</strong></td>
          <td>${escapeHtml(p.generic_name || "")}</td>
          <td>${escapeHtml(p.manufacturer_name || "")}</td>
          <td>${escapeHtml(p.category_name || "")}</td>
          <td>${escapeHtml(p.unit)}</td>
          <td>${money(p.sale_rate)}</td>
          <td>${p.current_stock || 0}</td>
        </tr>
      `), "No products created yet.")}
    </section>
  `;
  bindSubmit("product-form", async (data) => {
    ["purchase_rate", "sale_rate", "mrp", "vat_percent", "minimum_stock"].forEach((key) => data[key] = Number(data[key] || 0));
    data.manufacturer_id = data.manufacturer_id || null;
    data.category_id = data.category_id || null;
    await api("/api/master/products", { method: "POST", body: data });
    delete state.data.products;
    toast("Product added");
    await loadLookups();
    await renderPage();
  });
}

function renderCategories() {
  const categories = state.data.categories || [];
  document.getElementById("master-panel").innerHTML = `
    <section class="split">
      <form class="panel panel-pad section" id="category-form">
        <div class="section-head"><div><h2>New Category</h2><p>Medicine grouping for filtering and reporting.</p></div></div>
        ${input("name", "Category Name")}
        ${textarea("description", "Description")}
        <button class="btn primary">Add Category</button>
      </form>
      ${table(["Category", "Description"], categories.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.description || "")}</td></tr>`))}
    </section>
  `;
  bindSubmit("category-form", async (data) => {
    await api("/api/master/categories", { method: "POST", body: data });
    delete state.data.categories;
    toast("Category added");
    await loadLookups();
    await renderPage();
  });
}

function renderManufacturers() {
  const manufacturers = state.data.manufacturers || [];
  document.getElementById("master-panel").innerHTML = `
    <section class="split">
      <form class="panel panel-pad section" id="manufacturer-form">
        <div class="section-head"><div><h2>New Manufacturer</h2><p>Medicine company or supplier manufacturer.</p></div></div>
        ${input("name", "Company Name")}
        ${input("country", "Country")}
        <button class="btn primary">Add Manufacturer</button>
      </form>
      ${table(["Company", "Country"], manufacturers.map((m) => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.country || "")}</td></tr>`))}
    </section>
  `;
  bindSubmit("manufacturer-form", async (data) => {
    await api("/api/master/manufacturers", { method: "POST", body: data });
    delete state.data.manufacturers;
    toast("Manufacturer added");
    await loadLookups();
    await renderPage();
  });
}

async function renderPurchases(content) {
  await loadLookups();
  const [purchases, next] = await Promise.all([
    api("/api/purchases"),
    api("/api/purchases/meta/next-bill-no")
  ]);
  const suppliers = (state.data.parties || []).filter((p) => ["supplier", "both"].includes(p.party_type));
  const products = state.data.products || [];

  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="purchase-form">
        <div class="section-head"><div><h2>New Purchase</h2><p>Stock increases automatically by batch after saving.</p></div></div>
        <div class="field-grid">
          ${input("bill_no", "Purchase Bill No.", next.bill_no)}
          ${selectFrom("supplier_id", "Supplier", suppliers, "id", "name")}
          ${input("purchase_date", "Purchase Date", today(), "date")}
          ${select("payment_mode", "Payment Mode", [["credit", "Credit"], ["cash", "Cash"], ["bank", "Bank"]], "credit")}
          ${input("paid_amount", "Paid Amount", "0", "number")}
          ${input("discount_amount", "Bill Discount", "0", "number")}
        </div>
        <div class="section-head"><div><h2>Items</h2></div><button class="btn" type="button" data-action="add-purchase-line">Add Item</button></div>
        <div class="line-items" id="purchase-lines">
          ${state.purchaseItems.map((item, index) => purchaseLine(item, index, products)).join("")}
        </div>
        ${purchaseTotals()}
        <div><button class="btn primary">Save Purchase</button></div>
      </form>
      ${table(["Bill", "Supplier", "Date", "Total", "Paid", "Mode"], purchases.map((p) => `
        <tr><td>${escapeHtml(p.bill_no)}</td><td>${escapeHtml(p.supplier_name)}</td><td>${dateOnly(p.purchase_date)}</td><td>${money(p.total_amount)}</td><td>${money(p.paid_amount)}</td><td>${escapeHtml(p.payment_mode)}</td></tr>
      `), "No purchases yet.")}
    </section>
  `;
  bindPurchaseEvents();
}

function purchaseLine(item, index, products) {
  return `
    <div class="line-item" data-line="${index}">
      ${fieldWrap("Product", `<select data-purchase-field="product_id">${optionList(products, "id", "product_name", item.product_id)}</select>`)}
      ${fieldWrap("Batch No.", `<input data-purchase-field="batch_no" value="${escapeHtml(item.batch_no)}" />`)}
      ${fieldWrap("MFG", `<input type="date" data-purchase-field="mfg_date" value="${escapeHtml(item.mfg_date)}" />`)}
      ${fieldWrap("EXP", `<input type="date" data-purchase-field="expiry_date" value="${escapeHtml(item.expiry_date)}" />`)}
      ${fieldWrap("Qty", `<input type="number" min="1" data-purchase-field="quantity" value="${escapeHtml(item.quantity)}" />`)}
      ${fieldWrap("Rate", `<input type="number" min="0" data-purchase-field="purchase_rate" value="${escapeHtml(item.purchase_rate)}" />`)}
      <button class="btn danger" type="button" data-action="remove-purchase-line" data-index="${index}">Remove</button>
      ${fieldWrap("Free Qty", `<input type="number" min="0" data-purchase-field="free_qty" value="${escapeHtml(item.free_qty)}" />`)}
      ${fieldWrap("Sale Rate", `<input type="number" min="0" data-purchase-field="sale_rate" value="${escapeHtml(item.sale_rate)}" />`)}
      ${fieldWrap("MRP", `<input type="number" min="0" data-purchase-field="mrp" value="${escapeHtml(item.mrp)}" />`)}
      ${fieldWrap("VAT %", `<input type="number" min="0" data-purchase-field="vat_percent" value="${escapeHtml(item.vat_percent)}" />`)}
      ${fieldWrap("Discount", `<input type="number" min="0" data-purchase-field="discount_amount" value="${escapeHtml(item.discount_amount)}" />`)}
    </div>
  `;
}

function bindPurchaseEvents() {
  document.querySelectorAll("[data-purchase-field]").forEach((input) => {
    input.addEventListener("input", updatePurchaseState);
    input.addEventListener("change", updatePurchaseState);
  });
  document.querySelector("[data-action='add-purchase-line']").addEventListener("click", () => {
    updatePurchaseState();
    state.purchaseItems.push(emptyPurchaseItem());
    renderPage();
  });
  document.querySelectorAll("[data-action='remove-purchase-line']").forEach((button) => {
    button.addEventListener("click", () => {
      updatePurchaseState();
      state.purchaseItems.splice(Number(button.dataset.index), 1);
      if (!state.purchaseItems.length) state.purchaseItems.push(emptyPurchaseItem());
      renderPage();
    });
  });
  bindSubmit("purchase-form", async (data) => {
    updatePurchaseState();
    const items = state.purchaseItems
      .filter((item) => item.product_id && item.batch_no && item.expiry_date)
      .map(normalizeNumbers);
    if (!items.length) throw new Error("Add at least one valid purchase item");
    await api("/api/purchases", {
      method: "POST",
      body: {
        ...normalizeNumbers(data),
        supplier_id: Number(data.supplier_id),
        items
      }
    });
    state.purchaseItems = [emptyPurchaseItem()];
    delete state.data.products;
    toast("Purchase saved and stock updated");
    await loadLookups();
    await renderPage();
  });
}

function updatePurchaseState() {
  document.querySelectorAll("[data-line]").forEach((line) => {
    const index = Number(line.dataset.line);
    const item = state.purchaseItems[index] || emptyPurchaseItem();
    line.querySelectorAll("[data-purchase-field]").forEach((input) => {
      item[input.dataset.purchaseField] = input.value;
    });
    state.purchaseItems[index] = item;
  });
}

function purchaseTotals() {
  const subtotal = state.purchaseItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.purchase_rate || 0), 0);
  const vat = state.purchaseItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.purchase_rate || 0) * Number(item.vat_percent || 0)) / 100, 0);
  return `<div class="totals"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>VAT</span><strong>${money(vat)}</strong></div></div>`;
}

async function renderSales(content) {
  await loadLookups();
  const [sales, next, batches] = await Promise.all([
    api("/api/sales"),
    api("/api/sales/meta/next-bill-no"),
    api("/api/stock/batches")
  ]);
  state.data.batches = batches;
  const customers = (state.data.parties || []).filter((p) => ["customer", "both"].includes(p.party_type));
  const products = state.data.products || [];

  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="sale-form">
        <div class="section-head"><div><h2>New Sales Invoice</h2><p>Stock is reduced from the selected batch after saving.</p></div></div>
        <div class="field-grid">
          ${input("bill_no", "Sales Bill No.", next.bill_no)}
          ${selectFrom("customer_id", "Customer", customers, "id", "name")}
          ${input("customer_name", "Walk-in Name")}
          ${input("sale_date", "Date", today(), "date")}
          ${select("payment_mode", "Payment Mode", [["cash", "Cash"], ["bank", "Bank"], ["credit", "Credit"]])}
          ${select("bill_type", "Print Type", [["tax_invoice", "Tax Invoice"], ["delivery_challan", "Delivery Challan"]])}
        </div>
        <div class="section-head"><div><h2>Items</h2></div><button class="btn" type="button" data-action="add-sale-line">Add Item</button></div>
        <div class="line-items">
          ${state.saleItems.map((item, index) => saleLine(item, index, products, batches)).join("")}
        </div>
        ${saleTotals()}
        <div><button class="btn primary">Save Sale</button></div>
      </form>
      ${table(["Bill", "Customer", "Date", "Total", "Paid", "Mode"], sales.map((s) => `
        <tr><td>${escapeHtml(s.bill_no)}</td><td>${escapeHtml(s.customer_display)}</td><td>${dateOnly(s.sale_date)}</td><td>${money(s.total_amount)}</td><td>${money(s.paid_amount)}</td><td>${escapeHtml(s.payment_mode)}</td></tr>
      `), "No sales yet.")}
    </section>
  `;
  bindSaleEvents();
}

function saleLine(item, index, products, batches) {
  const filteredBatches = item.product_id ? batches.filter((b) => String(b.product_id) === String(item.product_id)) : batches;
  return `
    <div class="line-item sales-line" data-sale-line="${index}">
      ${fieldWrap("Product", `<select data-sale-field="product_id">${optionList(products, "id", "product_name", item.product_id)}</select>`)}
      ${fieldWrap("Batch", `<select data-sale-field="stock_id">${optionList(filteredBatches, "id", "batch_no", item.stock_id, "Select batch")}</select>`)}
      ${fieldWrap("Qty", `<input type="number" min="1" data-sale-field="quantity" value="${escapeHtml(item.quantity)}" />`)}
      ${fieldWrap("Rate", `<input type="number" min="0" data-sale-field="sale_rate" value="${escapeHtml(item.sale_rate)}" />`)}
      ${fieldWrap("VAT %", `<input type="number" min="0" data-sale-field="vat_percent" value="${escapeHtml(item.vat_percent)}" />`)}
      <button class="btn danger" type="button" data-action="remove-sale-line" data-index="${index}">Remove</button>
    </div>
  `;
}

function bindSaleEvents() {
  document.querySelectorAll("[data-sale-field]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSaleState();
      hydrateSaleItems();
      renderPage();
    });
    input.addEventListener("input", updateSaleState);
  });
  document.querySelector("[data-action='add-sale-line']").addEventListener("click", () => {
    updateSaleState();
    state.saleItems.push(emptySaleItem());
    renderPage();
  });
  document.querySelectorAll("[data-action='remove-sale-line']").forEach((button) => {
    button.addEventListener("click", () => {
      updateSaleState();
      state.saleItems.splice(Number(button.dataset.index), 1);
      if (!state.saleItems.length) state.saleItems.push(emptySaleItem());
      renderPage();
    });
  });
  bindSubmit("sale-form", async (data) => {
    updateSaleState();
    hydrateSaleItems();
    const items = state.saleItems
      .filter((item) => item.product_id && item.stock_id)
      .map(normalizeNumbers);
    if (!items.length) throw new Error("Add at least one valid sale item");
    const body = {
      ...normalizeNumbers(data),
      customer_id: data.customer_id ? Number(data.customer_id) : null,
      customer_name: data.customer_name || null,
      items
    };
    await api("/api/sales", { method: "POST", body });
    state.saleItems = [emptySaleItem()];
    delete state.data.products;
    toast("Sale saved and stock deducted");
    await loadLookups();
    await renderPage();
  });
}

function updateSaleState() {
  document.querySelectorAll("[data-sale-line]").forEach((line) => {
    const index = Number(line.dataset.saleLine);
    const item = state.saleItems[index] || emptySaleItem();
    line.querySelectorAll("[data-sale-field]").forEach((input) => {
      item[input.dataset.saleField] = input.value;
    });
    state.saleItems[index] = item;
  });
}

function hydrateSaleItems() {
  const batches = state.data.batches || [];
  state.saleItems = state.saleItems.map((item) => {
    const batch = batches.find((b) => String(b.id) === String(item.stock_id));
    if (!batch) return item;
    return {
      ...item,
      product_id: item.product_id || batch.product_id,
      batch_no: batch.batch_no,
      expiry_date: dateOnly(batch.expiry_date),
      sale_rate: Number(item.sale_rate || batch.sale_rate || 0),
      mrp: Number(batch.mrp || 0),
      vat_percent: Number(item.vat_percent || batch.vat_percent || 0)
    };
  });
}

function saleTotals() {
  const subtotal = state.saleItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.sale_rate || 0), 0);
  const vat = state.saleItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.sale_rate || 0) * Number(item.vat_percent || 0)) / 100, 0);
  return `<div class="totals"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>VAT</span><strong>${money(vat)}</strong></div><div><span>Total</span><strong>${money(subtotal + vat)}</strong></div></div>`;
}

async function renderInventory(content) {
  const endpoint = state.filters.stock === "low" ? "/api/stock?low_stock=true"
    : state.filters.stock === "expired" ? "/api/stock/expired"
    : state.filters.stock === "near" ? `/api/stock/near-expiry?days=${state.filters.expiryDays}`
    : state.filters.stock === "batches" ? "/api/stock/batches"
    : "/api/stock";
  const rows = await api(endpoint);
  content.innerHTML = `
    <section class="section">
      <div class="section-head">
        <div><h2>Stock Management</h2><p>Review stock by product, alert status, and batch expiry.</p></div>
        <div class="toolbar">
          <div class="segmented">
            ${["all", "low", "batches", "near", "expired"].map((id) => `<button class="${state.filters.stock === id ? "active" : ""}" data-stock="${id}">${id}</button>`).join("")}
          </div>
          <select class="search ${state.filters.stock === "near" ? "" : "hide"}" data-expiry-days>
            ${["30", "60", "90"].map((d) => `<option ${state.filters.expiryDays === d ? "selected" : ""}>${d}</option>`).join("")}
          </select>
        </div>
      </div>
      ${state.filters.stock === "batches" || state.filters.stock === "near" || state.filters.stock === "expired"
        ? batchMiniTable(rows)
        : table(["Product", "Generic", "Category", "Stock", "Minimum", "Value"], rows.map((r) => `
          <tr><td>${escapeHtml(r.product_name)}</td><td>${escapeHtml(r.generic_name || "")}</td><td>${escapeHtml(r.category_name || "")}</td><td>${r.total_stock || 0} ${escapeHtml(r.unit || "")}</td><td>${r.minimum_stock || 0}</td><td>${money(r.stock_value)}</td></tr>
        `), "No stock records.")}
    </section>
  `;
  document.querySelectorAll("[data-stock]").forEach((button) => button.addEventListener("click", () => {
    state.filters.stock = button.dataset.stock;
    renderPage();
  }));
  document.querySelector("[data-expiry-days]")?.addEventListener("change", (event) => {
    state.filters.expiryDays = event.target.value;
    renderPage();
  });
}

async function renderLedger(content) {
  await loadLookups();
  const outstanding = await api("/api/ledger");
  const parties = state.data.parties || [];
  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad field-grid three" id="ledger-form">
        ${selectFrom("party_id", "Party Ledger", parties, "id", "name")}
        ${input("from", "From", "", "date")}
        ${input("to", "To", "", "date")}
        <div class="field"><label>&nbsp;</label><button class="btn primary">Load Ledger</button></div>
      </form>
      <div id="ledger-detail"></div>
      <div class="section-head"><div><h2>Outstanding Balances</h2><p>Balances across customers and suppliers.</p></div></div>
      ${table(["Party", "Type", "Mobile", "Balance"], outstanding.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.party_type)}</td><td>${escapeHtml(p.mobile || "")}</td><td>${money(p.balance)}</td></tr>`), "No outstanding balances.")}
    </section>
  `;
  bindSubmit("ledger-form", async (data) => {
    if (!data.party_id) throw new Error("Select a party");
    const qs = new URLSearchParams();
    if (data.from) qs.set("from", data.from);
    if (data.to) qs.set("to", data.to);
    const rows = await api(`/api/ledger/${data.party_id}?${qs.toString()}`);
    document.getElementById("ledger-detail").innerHTML = table(["Date", "Bill", "Debit", "Credit", "Balance"], rows.map((r) => `
      <tr><td>${dateOnly(r.transaction_date)}</td><td>${escapeHtml(r.reference_no || r.transaction_type)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(r.running_balance)}</td></tr>
    `), "No ledger entries for this party.");
  });
}

async function renderPayments(content) {
  await loadLookups();
  const payments = await api("/api/payments");
  const parties = state.data.parties || [];
  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="payment-form">
        <div class="section-head"><div><h2>Payment & Receipt Entry</h2><p>Ledger is updated automatically after saving.</p></div></div>
        <div class="field-grid">
          ${select("payment_type", "Type", [["receipt", "Receipt"], ["payment", "Payment"]])}
          ${selectFrom("party_id", "Party", parties, "id", "name")}
          ${input("payment_date", "Date", today(), "date")}
          ${input("amount", "Amount", "0", "number")}
          ${select("payment_mode", "Mode", [["cash", "Cash"], ["bank", "Bank"], ["cheque", "Cheque"], ["online", "Online"]])}
          ${input("reference_no", "Reference No.")}
          ${input("remarks", "Remarks")}
        </div>
        <div><button class="btn primary">Save Entry</button></div>
      </form>
      ${table(["Date", "Type", "Party", "Amount", "Mode", "Remarks"], payments.map((p) => `<tr><td>${dateOnly(p.payment_date)}</td><td>${escapeHtml(p.payment_type)}</td><td>${escapeHtml(p.party_name)}</td><td>${money(p.amount)}</td><td>${escapeHtml(p.payment_mode)}</td><td>${escapeHtml(p.remarks || "")}</td></tr>`), "No payments or receipts yet.")}
    </section>
  `;
  bindSubmit("payment-form", async (data) => {
    data.party_id = Number(data.party_id);
    data.amount = Number(data.amount || 0);
    await api("/api/payments", { method: "POST", body: data });
    toast("Payment entry saved");
    await renderPage();
  });
}

async function renderExpenses(content) {
  await loadLookups();
  const expenses = await api("/api/expenses");
  const categories = state.data.expenseCategories || [];
  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="expense-form">
        <div class="section-head"><div><h2>Expense Entry</h2><p>Track monthly operating expenses.</p></div></div>
        <div class="field-grid">
          ${selectFrom("category_id", "Category", categories, "id", "name")}
          ${input("expense_date", "Date", today(), "date")}
          ${input("amount", "Amount", "0", "number")}
          ${select("payment_mode", "Mode", [["cash", "Cash"], ["bank", "Bank"]])}
          ${input("description", "Description")}
        </div>
        <div><button class="btn primary">Save Expense</button></div>
      </form>
      ${table(["Date", "Category", "Amount", "Mode", "Description"], expenses.map((e) => `<tr><td>${dateOnly(e.expense_date)}</td><td>${escapeHtml(e.category_name)}</td><td>${money(e.amount)}</td><td>${escapeHtml(e.payment_mode)}</td><td>${escapeHtml(e.description || "")}</td></tr>`), "No expenses yet.")}
    </section>
  `;
  bindSubmit("expense-form", async (data) => {
    data.category_id = Number(data.category_id);
    data.amount = Number(data.amount || 0);
    await api("/api/expenses", { method: "POST", body: data });
    toast("Expense saved");
    await renderPage();
  });
}

async function renderReports(content) {
  const from = `${new Date().getFullYear()}-01-01`;
  const to = today();
  const [vat, profitLoss] = await Promise.all([
    api(`/api/vat?from=${from}&to=${to}`),
    api(`/api/profit-loss?from=${from}&to=${to}`)
  ]);
  content.innerHTML = `
    <section class="split">
      <div class="panel panel-pad section">
        <div class="section-head"><div><h2>VAT Summary</h2><p>${from} to ${to}</p></div></div>
        <div class="kpi-grid" style="grid-template-columns:1fr 1fr;">
          ${kpi("Purchase VAT", money(vat.purchase_vat?.vat_amount), `${vat.purchase_vat?.bills || 0} bills`)}
          ${kpi("Sales VAT", money(vat.sales_vat?.vat_amount), `${vat.sales_vat?.bills || 0} bills`)}
          ${kpi("Net VAT Payable", money(vat.net_vat_payable), "Sales VAT minus purchase VAT")}
        </div>
      </div>
      <div class="panel panel-pad section">
        <div class="section-head"><div><h2>Profit & Loss</h2><p>${from} to ${to}</p></div></div>
        <div class="kpi-grid" style="grid-template-columns:1fr 1fr;">
          ${kpi("Revenue", money(profitLoss.revenue), "Sales")}
          ${kpi("COGS", money(profitLoss.cogs), "Purchase cost")}
          ${kpi("Gross Profit", money(profitLoss.gross_profit), "Before expenses")}
          ${kpi("Net Profit", money(profitLoss.net_profit), "After expenses")}
        </div>
      </div>
    </section>
  `;
}

async function renderSecurity(content) {
  const users = await api("/api/auth/users");
  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="user-form">
        <div class="section-head"><div><h2>Staff Login</h2><p>Create staff users for daily billing and stock work.</p></div></div>
        <div class="field-grid">
          ${input("name", "Name")}
          ${input("email", "Email", "", "email")}
          ${input("password", "Password", "", "password")}
          ${select("role", "Role", [["staff", "Staff"], ["admin", "Admin"]])}
        </div>
        <div><button class="btn primary">Create User</button></div>
      </form>
      ${table(["Name", "Email", "Role", "Status", "Created"], users.map((u) => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td><span class="badge ${u.is_active ? "green" : "red"}">${u.is_active ? "Active" : "Inactive"}</span></td><td>${dateOnly(u.created_at)}</td></tr>`), "No users found.")}
    </section>
  `;
  bindSubmit("user-form", async (data) => {
    await api("/api/auth/users", { method: "POST", body: data });
    toast("User created");
    await renderPage();
  });
}

function input(name, label, value = "", type = "text") {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === "number" ? "step='any'" : ""} /></div>`;
}

function textarea(name, label, value = "") {
  return `<div class="field"><label>${label}</label><textarea name="${name}">${escapeHtml(value)}</textarea></div>`;
}

function select(name, label, options, selected = "") {
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map(([value, optionLabel]) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></div>`;
}

function selectFrom(name, label, items, valueKey, labelKey, selected = "") {
  return `<div class="field"><label>${label}</label><select name="${name}">${optionList(items, valueKey, labelKey, selected)}</select></div>`;
}

function fieldWrap(label, control) {
  return `<div class="field"><label>${label}</label>${control}</div>`;
}

function bindSubmit(formId, handler) {
  document.getElementById(formId).addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit'], button:not([type])");
    button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await handler(data);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

function normalizeNumbers(object) {
  const out = { ...object };
  ["quantity", "free_qty", "purchase_rate", "sale_rate", "mrp", "vat_percent", "discount_amount", "paid_amount", "amount", "minimum_stock"].forEach((key) => {
    if (key in out) out[key] = Number(out[key] || 0);
  });
  ["product_id", "stock_id", "supplier_id", "customer_id", "category_id", "manufacturer_id", "party_id"].forEach((key) => {
    if (key in out && out[key] !== "" && out[key] !== null) out[key] = Number(out[key]);
  });
  return out;
}

render();
