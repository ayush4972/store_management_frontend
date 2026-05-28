import { api, loadLookups } from "./api.js";
import { state } from "./state.js";
import { escapeHtml, toast } from "./utils.js";

function findById(items, id) {
  return (items || []).find((item) => String(item.id) === String(id));
}

function findByName(items, field, value) {
  const wanted = String(value || "").trim().toLowerCase();
  if (!wanted) return null;
  return (items || []).find((item) => String(item[field] || "").trim().toLowerCase() === wanted);
}

export function partyPicker({ name, label, items, selectedId = "", partyType, datalistId }) {
  const selected = findById(items, selectedId);
  const addText = partyType === "supplier" ? "Add as new supplier" : "Add as new customer";
  return `
    <div class="field inline-picker" data-party-picker data-party-type="${partyType}">
      <label>${label}</label>
      <input class="picker-input" data-party-search list="${datalistId}" value="${escapeHtml(selected?.name || "")}" placeholder="Type ${label.toLowerCase()} name" />
      <input type="hidden" name="${name}" data-party-id value="${escapeHtml(selectedId)}" />
      <datalist id="${datalistId}">
        ${(items || []).map((item) => `<option value="${escapeHtml(item.name)}"></option>`).join("")}
      </datalist>
      <button class="btn mini hide" type="button" data-open-party-create>${addText}</button>
      <div class="inline-create hide" data-party-create>
        <div class="field-grid two">
          <div class="field"><label>Name</label><input data-new-party-field="name" /></div>
          <div class="field"><label>Mobile</label><input data-new-party-field="mobile" /></div>
          <div class="field"><label>PAN/VAT</label><input data-new-party-field="pan_vat" /></div>
          <div class="field"><label>Address</label><input data-new-party-field="address" /></div>
        </div>
        <div class="toolbar">
          <button class="btn primary mini" type="button" data-confirm-party-create>Create and Select</button>
          <button class="btn mini" type="button" data-cancel-inline-create>Cancel</button>
        </div>
      </div>
    </div>
  `;
}

export function productPicker({ fieldName, items, selectedId = "", datalistId, context, index }) {
  const selected = findById(items, selectedId);
  return `
    <div class="field inline-picker" data-product-picker data-context="${context}" data-index="${index}">
      <label>Product</label>
      <input class="picker-input" data-product-search list="${datalistId}" value="${escapeHtml(selected?.product_name || "")}" placeholder="Type product name" />
      <input type="hidden" data-${context}-field="${fieldName}" value="${escapeHtml(selectedId)}" />
      <datalist id="${datalistId}">
        ${(items || []).map((item) => `<option value="${escapeHtml(item.product_name)}"></option>`).join("")}
      </datalist>
      <button class="btn mini hide" type="button" data-open-product-create>Add this as a new product</button>
      <div class="inline-create hide" data-product-create>
        <div class="field-grid three">
          <div class="field"><label>Product Name</label><input data-new-product-field="product_name" /></div>
          <div class="field"><label>Generic Name</label><input data-new-product-field="generic_name" /></div>
          <div class="field">
            <label>Unit</label>
            <select data-new-product-field="unit">
              ${["Box", "Strip", "Pcs", "Bottle", "Vial", "Tube", "Sachet"].map((unit) => `<option value="${unit}">${unit}</option>`).join("")}
            </select>
          </div>
          <div class="field"><label>Purchase Rate</label><input type="number" step="any" value="0" data-new-product-field="purchase_rate" /></div>
          <div class="field"><label>Sale Rate</label><input type="number" step="any" value="0" data-new-product-field="sale_rate" /></div>
          <div class="field"><label>VAT %</label><input type="number" step="any" value="0" data-new-product-field="vat_percent" /></div>
          <div class="field"><label>Minimum Stock</label><input type="number" step="1" value="0" data-new-product-field="minimum_stock" /></div>
        </div>
        <div class="toolbar">
          <button class="btn primary mini" type="button" data-confirm-product-create>Create and Select</button>
          <button class="btn mini" type="button" data-cancel-inline-create>Cancel</button>
        </div>
      </div>
    </div>
  `;
}

export function bindPartyPickers({ parties, onCreated }) {
  document.querySelectorAll("[data-party-picker]").forEach((picker) => {
    const input = picker.querySelector("[data-party-search]");
    const hidden = picker.querySelector("[data-party-id]");
    const addButton = picker.querySelector("[data-open-party-create]");
    const panel = picker.querySelector("[data-party-create]");
    const partyType = picker.dataset.partyType;
    const visibleParties = parties.filter((party) => [partyType, "both"].includes(party.party_type));

    const sync = () => {
      const typed = input.value.trim();
      const exact = findByName(visibleParties, "name", typed);
      hidden.value = exact ? exact.id : "";
      addButton.classList.toggle("hide", !typed || Boolean(exact));
      picker.querySelector("[data-new-party-field='name']").value = typed;
    };

    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    addButton.addEventListener("click", () => panel.classList.remove("hide"));
    picker.querySelector("[data-cancel-inline-create]").addEventListener("click", () => panel.classList.add("hide"));
    picker.querySelector("[data-confirm-party-create]").addEventListener("click", async () => {
      const body = { party_type: partyType, credit_days: 0, opening_balance: 0, opening_balance_type: "debit" };
      picker.querySelectorAll("[data-new-party-field]").forEach((field) => {
        body[field.dataset.newPartyField] = field.value.trim();
      });
      if (!body.name) {
        toast("Party name is required", "error");
        return;
      }
      const created = await api("/api/master/parties", { method: "POST", body });
      hidden.value = created.id;
      input.value = created.name;
      toast(`${partyType === "supplier" ? "Supplier" : "Customer"} created`);
      delete state.data.parties;
      await loadLookups();
      onCreated?.(created);
    });
    sync();
  });
}

export function bindProductPickers({ products, onCreated, onSelected }) {
  document.querySelectorAll("[data-product-picker]").forEach((picker) => {
    const input = picker.querySelector("[data-product-search]");
    const hidden = picker.querySelector("input[type='hidden']");
    const addButton = picker.querySelector("[data-open-product-create]");
    const panel = picker.querySelector("[data-product-create]");

    const sync = () => {
      const typed = input.value.trim();
      const exact = findByName(products, "product_name", typed);
      hidden.value = exact ? exact.id : "";
      addButton.classList.toggle("hide", !typed || Boolean(exact));
      picker.querySelector("[data-new-product-field='product_name']").value = typed;
      if (exact) onSelected?.(picker, exact);
    };

    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    addButton.addEventListener("click", () => panel.classList.remove("hide"));
    picker.querySelector("[data-cancel-inline-create]").addEventListener("click", () => panel.classList.add("hide"));
    picker.querySelector("[data-confirm-product-create]").addEventListener("click", async () => {
      const body = {};
      picker.querySelectorAll("[data-new-product-field]").forEach((field) => {
        body[field.dataset.newProductField] = field.value.trim();
      });
      if (!body.product_name || !body.unit) {
        toast("Product name and unit are required", "error");
        return;
      }
      ["purchase_rate", "sale_rate", "vat_percent", "minimum_stock"].forEach((key) => {
        body[key] = Number(body[key] || 0);
      });
      body.mrp = Number(body.sale_rate || 0);
      const created = await api("/api/master/products", { method: "POST", body });
      hidden.value = created.id;
      input.value = created.product_name;
      toast("Product created");
      delete state.data.products;
      await loadLookups();
      onCreated?.(picker, created);
    });
    sync();
  });
}
