import { api, load, loadLookups } from "../api.js";
import { state } from "../state.js";
import { bindSubmit, dateOnly, escapeHtml, input, money, select, selectFrom, table, textarea, toast } from "../utils.js";

export async function renderMaster(content, renderPage) {
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

  if (state.subPage === "company") await renderCompany(renderPage);
  if (state.subPage === "parties") renderParties(renderPage);
  if (state.subPage === "products") renderProducts(renderPage);
  if (state.subPage === "categories") renderCategories(renderPage);
  if (state.subPage === "manufacturers") renderManufacturers(renderPage);
}

async function renderCompany(renderPage) {
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

function renderParties(renderPage) {
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

function renderProducts(renderPage) {
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
          ${selectFrom("manufacturer_id", "Company", manufacturers, "id", "name")}
          ${selectFrom("category_id", "Category", categories, "id", "name")}
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
        <tr><td><strong>${escapeHtml(p.product_name)}</strong></td><td>${escapeHtml(p.generic_name || "")}</td><td>${escapeHtml(p.manufacturer_name || "")}</td><td>${escapeHtml(p.category_name || "")}</td><td>${escapeHtml(p.unit)}</td><td>${money(p.sale_rate)}</td><td>${p.current_stock || 0}</td></tr>
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

function renderCategories(renderPage) {
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

function renderManufacturers(renderPage) {
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
