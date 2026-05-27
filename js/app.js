import { API_BASE } from "./api.js";
import { clearUser, pages, state } from "./state.js";
import { escapeHtml, initials, toast } from "./utils.js";
import { bindLogin, loginView } from "./pages/login.js";
import { renderDashboard } from "./pages/dashboard.js";
import { renderMaster } from "./pages/master.js";
import { renderPurchases } from "./pages/purchases.js";
import { renderSales } from "./pages/sales.js";
import { renderInventory } from "./pages/inventory.js";
import { renderLedger } from "./pages/ledger.js";
import { renderPayments } from "./pages/payments.js";
import { renderExpenses } from "./pages/expenses.js";
import { renderReports } from "./pages/reports.js";
import { renderSecurity } from "./pages/users.js";

const subtitles = {
  dashboard: "Today sales, purchases, stock value, ledgers, and alerts",
  master: "Company, parties, products, categories, and manufacturers",
  purchases: "Purchase bills with automatic stock and supplier ledger updates",
  sales: "Sales invoices with batch selection, expiry check, and stock deduction",
  inventory: "Current stock, low stock, expired stock, and batch-wise stock",
  ledger: "Outstanding balances and party-wise running ledger",
  payments: "Payment and receipt entries",
  expenses: "Expense entries and monthly expense categories",
  reports: "VAT report and profit/loss summary",
  security: "Admin and staff users"
};

function appTitle() {
  return pages.find(([id]) => id === state.page)?.[2] || "Dashboard";
}

function appSubtitle() {
  return subtitles[state.page] || "";
}

function logout(showMessage = true) {
  clearUser();
  if (showMessage) toast("Signed out");
  render();
}

function render() {
  const app = document.getElementById("app");
  if (!state.token) {
    app.innerHTML = loginView();
    bindLogin(render);
    return;
  }

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand-mark">
          <div class="brand-icon">AA</div>
          <div>
            <div>Ayush & Ashish</div>
            <small>Medicine Distributors</small>
          </div>
        </div>
        <nav class="nav-list">
          ${pages.map(([id, icon, label]) => `
            <button class="nav-button ${state.page === id ? "active" : ""}" data-page="${id}">
              <span class="nav-icon">${icon}</span>
              <span>${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-footer">
          <small>Backend</small>
          <small>${escapeHtml(API_BASE)}</small>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="page-title">
            <h1>${appTitle()}</h1>
            <span>${appSubtitle()}</span>
          </div>
          <div class="toolbar">
            <div class="user-chip">
              <span class="avatar">${initials(state.user?.name)}</span>
              <span>${escapeHtml(state.user?.name || "User")}</span>
            </div>
            <button class="btn ghost" data-action="logout">Sign out</button>
          </div>
        </header>
        <section class="content" id="page-content">
          <div class="loading">Loading...</div>
        </section>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      render();
    });
  });
  document.querySelector("[data-action='logout']").addEventListener("click", () => logout());
  renderPage();
}

async function renderPage() {
  const content = document.getElementById("page-content");
  try {
    if (state.page === "dashboard") await renderDashboard(content, renderPage);
    if (state.page === "master") await renderMaster(content, renderPage);
    if (state.page === "purchases") await renderPurchases(content, renderPage);
    if (state.page === "sales") await renderSales(content, renderPage);
    if (state.page === "inventory") await renderInventory(content, renderPage);
    if (state.page === "ledger") await renderLedger(content, renderPage);
    if (state.page === "payments") await renderPayments(content, renderPage);
    if (state.page === "expenses") await renderExpenses(content, renderPage);
    if (state.page === "reports") await renderReports(content, renderPage);
    if (state.page === "security") await renderSecurity(content, renderPage);
  } catch (error) {
    content.innerHTML = `<div class="panel panel-pad"><strong>Could not load ${appTitle()}.</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

render();
