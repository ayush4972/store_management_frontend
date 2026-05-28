import { api, loadLookups } from "../api.js";
import { bindPartyPickers, bindProductPickers, partyPicker, productPicker } from "../inlineCreate.js";
import { emptySaleItem, state } from "../state.js";
import { bindSubmit, dateOnly, escapeHtml, fieldWrap, input, money, normalizeNumbers, optionList, select, table, today, toast } from "../utils.js";

export async function renderSales(content, renderPage) {
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
          ${partyPicker({ name: "customer_id", label: "Customer", items: customers, partyType: "customer", datalistId: "sale-customers" })}
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
  bindSaleEvents(renderPage);
}

function saleLine(item, index, products, batches) {
  const filteredBatches = item.product_id ? batches.filter((b) => String(b.product_id) === String(item.product_id)) : batches;
  return `
    <div class="line-item sales-line" data-sale-line="${index}">
      ${productPicker({ fieldName: "product_id", items: products, selectedId: item.product_id, datalistId: `sale-products-${index}`, context: "sale", index })}
      ${fieldWrap("Batch", `<select data-sale-field="stock_id">${optionList(filteredBatches, "id", "batch_no", item.stock_id, "Select batch")}</select>`)}
      ${fieldWrap("Qty", `<input type="number" min="1" data-sale-field="quantity" value="${escapeHtml(item.quantity)}" />`)}
      ${fieldWrap("Rate", `<input type="number" min="0" data-sale-field="sale_rate" value="${escapeHtml(item.sale_rate)}" />`)}
      ${fieldWrap("VAT %", `<input type="number" min="0" data-sale-field="vat_percent" value="${escapeHtml(item.vat_percent)}" />`)}
      <button class="btn danger" type="button" data-action="remove-sale-line" data-index="${index}">Remove</button>
    </div>
  `;
}

function bindSaleEvents(renderPage) {
  bindPartyPickers({ parties: state.data.parties || [] });
  bindProductPickers({
    products: state.data.products || [],
    onCreated: applySaleProduct,
    onSelected: applySaleProduct
  });
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
    const items = state.saleItems.filter((item) => item.product_id && item.stock_id).map(normalizeNumbers);
    if (!items.length) throw new Error("Add at least one valid sale item");
    await api("/api/sales", {
      method: "POST",
      body: {
        ...normalizeNumbers(data),
        customer_id: data.customer_id ? Number(data.customer_id) : null,
        customer_name: data.customer_name || null,
        items
      }
    });
    state.saleItems = [emptySaleItem()];
    delete state.data.products;
    toast("Sale saved and stock deducted");
    await loadLookups();
    await renderPage();
  });
}

function applySaleProduct(picker, product) {
  const line = picker.closest("[data-sale-line]");
  if (!line || !product) return;
  const setIfBlank = (field, value) => {
    const input = line.querySelector(`[data-sale-field="${field}"]`);
    if (input && (!input.value || Number(input.value) === 0)) input.value = value ?? "";
  };
  setIfBlank("sale_rate", product.sale_rate);
  setIfBlank("vat_percent", product.vat_percent);
  updateSaleState();
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
