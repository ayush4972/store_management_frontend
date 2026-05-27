import { api } from "../api.js";
import { state } from "../state.js";
import { batchMiniTable, escapeHtml, money, table } from "../utils.js";

export async function renderInventory(content, renderPage) {
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
