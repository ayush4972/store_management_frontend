import { api } from "../api.js";
import { bindSubmit, dateOnly, escapeHtml, input, select, table, toast } from "../utils.js";

export async function renderSecurity(content, renderPage) {
  const users = await api("/api/auth/users");
  content.innerHTML = `
    <section class="section">
      <form class="panel panel-pad section" id="user-form">
        <div class="section-head"><div><h2>Staff Login</h2><p>Create staff users for daily billing and stock work.</p></div></div>
        <div class="field-grid">
          ${input("name", "Name")}
          ${input("email", "Email", "", "email")}
          ${input("password", "Password", "", "password")}
          ${select("role", "Role", [["staff", "Staff"], ["admin", "Admin"]])}
        </div>
        <div><button class="btn primary">Create User</button></div>
      </form>
      ${table(["Name", "Email", "Role", "Status", "Created"], users.map((u) => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td><span class="badge ${u.is_active ? "green" : "red"}">${u.is_active ? "Active" : "Inactive"}</span></td><td>${dateOnly(u.created_at)}</td></tr>`), "No users found.")}
    </section>
  `;
  bindSubmit("user-form", async (data) => {
    await api("/api/auth/users", { method: "POST", body: data });
    toast("User created");
    await renderPage();
  });
}
