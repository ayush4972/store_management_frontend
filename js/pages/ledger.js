import { api, loadLookups } from "../api.js";
import { state } from "../state.js";
import { bindSubmit, dateOnly, escapeHtml, input, money, selectFrom, table } from "../utils.js";

export async function renderLedger(content) {
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
