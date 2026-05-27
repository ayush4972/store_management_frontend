import { api, loadLookups } from "../api.js";
import { state } from "../state.js";
import { bindSubmit, dateOnly, escapeHtml, input, money, select, selectFrom, table, today, toast } from "../utils.js";

export async function renderPayments(content, renderPage) {
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
