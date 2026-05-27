import { api, loadLookups } from "../api.js";
import { state } from "../state.js";
import { bindSubmit, dateOnly, escapeHtml, input, money, select, selectFrom, table, today, toast } from "../utils.js";

export async function renderExpenses(content, renderPage) {
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
