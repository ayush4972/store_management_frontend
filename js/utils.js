export function money(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 2
  }).format(num);
}

export function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

export function initials(name) {
  return String(name || "AA")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function kpi(label, value, detail) {
  return `<div class="kpi"><span>${label}</span><strong>${value}</strong><span>${detail}</span></div>`;
}

export function table(headers, rows, emptyText = "No records yet") {
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

export function optionList(items, valueKey, labelKey, selected = "", placeholder = "Select") {
  return `
    <option value="">${placeholder}</option>
    ${(items || []).map((item) => `
      <option value="${escapeHtml(item[valueKey])}" ${String(item[valueKey]) === String(selected) ? "selected" : ""}>
        ${escapeHtml(item[labelKey])}
      </option>
    `).join("")}
  `;
}

export function input(name, label, value = "", type = "text") {
  return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${type === "number" ? "step='any'" : ""} /></div>`;
}

export function textarea(name, label, value = "") {
  return `<div class="field"><label>${label}</label><textarea name="${name}">${escapeHtml(value)}</textarea></div>`;
}

export function select(name, label, options, selected = "") {
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map(([value, optionLabel]) => `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></div>`;
}

export function selectFrom(name, label, items, valueKey, labelKey, selected = "") {
  return `<div class="field"><label>${label}</label><select name="${name}">${optionList(items, valueKey, labelKey, selected)}</select></div>`;
}

export function fieldWrap(label, control) {
  return `<div class="field"><label>${label}</label>${control}</div>`;
}

export function bindSubmit(formId, handler) {
  document.getElementById(formId).addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit'], button:not([type])");
    if (button) button.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      await handler(data);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      if (button) button.disabled = false;
    }
  });
}

export function normalizeNumbers(object) {
  const out = { ...object };
  ["quantity", "free_qty", "purchase_rate", "sale_rate", "mrp", "vat_percent", "discount_amount", "paid_amount", "amount", "minimum_stock"].forEach((key) => {
    if (key in out) out[key] = Number(out[key] || 0);
  });
  ["product_id", "stock_id", "supplier_id", "customer_id", "category_id", "manufacturer_id", "party_id"].forEach((key) => {
    if (key in out && out[key] !== "" && out[key] !== null) out[key] = Number(out[key]);
  });
  return out;
}

export function stockMiniTable(rows) {
  return table(["Product", "Stock", "Minimum"], rows.map((row) => `
    <tr><td>${escapeHtml(row.product_name)}</td><td>${row.total_stock || row.quantity || 0} ${escapeHtml(row.unit || "")}</td><td>${row.minimum_stock || 0}</td></tr>
  `), "No low stock items.");
}

export function batchMiniTable(rows) {
  return table(["Product", "Batch", "Expiry", "Qty"], rows.map((row) => `
    <tr><td>${escapeHtml(row.product_name)}</td><td>${escapeHtml(row.batch_no)}</td><td>${dateOnly(row.expiry_date)}</td><td>${row.quantity}</td></tr>
  `), "No batch records.");
}
