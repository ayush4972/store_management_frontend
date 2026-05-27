import { clearUser, state } from "./state.js";

export const API_BASE = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text };
  }

  if (!response.ok) {
    if (response.status === 401) clearUser();
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

export async function load(path, key) {
  state.data[key] = await api(path);
  return state.data[key];
}

export async function loadLookups() {
  const requests = [];
  if (!state.data.parties) requests.push(load("/api/master/parties", "parties"));
  if (!state.data.products) requests.push(load("/api/master/products", "products"));
  if (!state.data.categories) requests.push(load("/api/master/categories", "categories"));
  if (!state.data.manufacturers) requests.push(load("/api/master/manufacturers", "manufacturers"));
  if (!state.data.expenseCategories) requests.push(load("/api/expenses/categories", "expenseCategories"));
  await Promise.all(requests);
}
