export const pages = [
  ["dashboard", "DB", "Dashboard"],
  ["master", "MS", "Master Setup"],
  ["purchases", "PU", "Purchases"],
  ["sales", "SA", "Sales"],
  ["inventory", "ST", "Stock"],
  ["ledger", "LD", "Ledger"],
  ["payments", "PY", "Payments"],
  ["expenses", "EX", "Expenses"],
  ["reports", "RP", "Reports"],
  ["security", "US", "Users"]
];

export function emptyPurchaseItem() {
  return {
    product_id: "",
    batch_no: "",
    mfg_date: "",
    expiry_date: "",
    quantity: 1,
    free_qty: 0,
    purchase_rate: 0,
    sale_rate: 0,
    mrp: 0,
    vat_percent: 0,
    discount_amount: 0
  };
}

export function emptySaleItem() {
  return {
    product_id: "",
    stock_id: "",
    quantity: 1,
    sale_rate: 0,
    vat_percent: 0,
    mrp: 0
  };
}

export const state = {
  token: localStorage.getItem("aa_token") || "",
  user: JSON.parse(localStorage.getItem("aa_user") || "null"),
  page: "dashboard",
  subPage: "company",
  data: {},
  purchaseItems: [emptyPurchaseItem()],
  saleItems: [emptySaleItem()],
  filters: {
    stock: "all",
    expiryDays: "30"
  }
};

export function setUser(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("aa_token", token);
  localStorage.setItem("aa_user", JSON.stringify(user));
}

export function clearUser() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("aa_token");
  localStorage.removeItem("aa_user");
}
