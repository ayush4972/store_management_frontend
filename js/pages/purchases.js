import { api, loadLookups } from "../api.js";
import { bindPartyPickers, bindProductPickers, partyPicker, productPicker } from "../inlineCreate.js";
import { emptyPurchaseItem, state } from "../state.js";
import { bindSubmit, escapeHtml, fieldWrap, input, money, normalizeNumbers, select, table, today, toast, dateOnly } from "../utils.js";

export async function renderPurchases(content, renderPage) {
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
          ${partyPicker({ name: "supplier_id", label: "Supplier", items: suppliers, partyType: "supplier", datalistId: "purchase-suppliers" })}
          ${input("purchase_date", "Purchase Date", today(), "date")}
          ${select("payment_mode", "Payment Mode", [["credit", "Credit"], ["cash", "Cash"], ["bank", "Bank"]], "credit")}
          ${input("paid_amount", "Paid Amount", "0", "number")}
          ${input("discount_amount", "Bill Discount", "0", "number")}
        </div>
        <div class="section-head"><div><h2>Items</h2></div><button class="btn" type="button" data-action="add-purchase-line">Add Item</button></div>
        <div class="line-items">
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
  bindPurchaseEvents(renderPage);
}

function purchaseLine(item, index, products) {
  return `
    <div class="line-item" data-line="${index}">
      ${productPicker({ fieldName: "product_id", items: products, selectedId: item.product_id, datalistId: `purchase-products-${index}`, context: "purchase", index })}
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

function bindPurchaseEvents(renderPage) {
  bindPartyPickers({ parties: state.data.parties || [] });
  bindProductPickers({
    products: state.data.products || [],
    onCreated: applyPurchaseProduct,
    onSelected: applyPurchaseProduct
  });
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
    const items = state.purchaseItems.filter((item) => item.product_id && item.batch_no && item.expiry_date).map(normalizeNumbers);
    if (!items.length) throw new Error("Add at least one valid purchase item");
    await api("/api/purchases", {
      method: "POST",
      body: { ...normalizeNumbers(data), supplier_id: Number(data.supplier_id), items }
    });
    state.purchaseItems = [emptyPurchaseItem()];
    delete state.data.products;
    toast("Purchase saved and stock updated");
    await loadLookups();
    await renderPage();
  });
}

function applyPurchaseProduct(picker, product) {
  const line = picker.closest("[data-line]");
  if (!line || !product) return;
  const setIfBlank = (field, value) => {
    const input = line.querySelector(`[data-purchase-field="${field}"]`);
    if (input && (!input.value || Number(input.value) === 0)) input.value = value ?? "";
  };
  setIfBlank("purchase_rate", product.purchase_rate);
  setIfBlank("sale_rate", product.sale_rate);
  setIfBlank("mrp", product.mrp || product.sale_rate);
  setIfBlank("vat_percent", product.vat_percent);
  updatePurchaseState();
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
