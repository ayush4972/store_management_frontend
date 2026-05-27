import { api } from "../api.js";
import { kpi, money, today } from "../utils.js";

export async function renderReports(content) {
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
