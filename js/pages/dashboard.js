import { api, load } from "../api.js";
import { batchMiniTable, kpi, money, stockMiniTable } from "../utils.js";

export async function renderDashboard(content) {
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
