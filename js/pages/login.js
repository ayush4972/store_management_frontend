import { api } from "../api.js";
import { setUser } from "../state.js";
import { toast } from "../utils.js";

export function loginView() {
  return `
    <div class="login-shell">
      <section class="login-hero">
        <div class="brand-mark">
          <div class="brand-icon">AA</div>
          <div>
            <div>Ayush & Ashish</div>
            <small>Medicine Distributors</small>
          </div>
        </div>
        <h1>Inventory, billing, and ledger control for medicine distribution.</h1>
        <div class="hero-meta">
          <span>Purchase stock by batch, invoice sales, monitor expiry, and track VAT from one workspace.</span>
          <span>Nepalgunj, Banke</span>
        </div>
      </section>
      <section class="login-panel">
        <form class="login-box" id="login-form">
          <h2>Sign in</h2>
          <p>Use the admin account created during database setup.</p>
          <div class="field">
            <label>Email</label>
            <input name="email" type="email" value="admin@ayushashish.com" autocomplete="username" required />
          </div>
          <div class="field" style="margin-top:12px;">
            <label>Password</label>
            <input name="password" type="password" value="Admin@123" autocomplete="current-password" required />
          </div>
          <button class="btn primary" style="width:100%; margin-top:20px;" type="submit">Sign in</button>
          <div class="loading hide" id="login-loading">Checking credentials...</div>
        </form>
      </section>
    </div>
  `;
}

export function bindLogin(render) {
  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    document.getElementById("login-loading").classList.remove("hide");
    try {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: {
          email: form.get("email"),
          password: form.get("password")
        }
      });
      setUser(payload.token, payload.user);
      toast("Signed in");
      render();
    } catch (error) {
      toast(error.message, "error");
    } finally {
      document.getElementById("login-loading")?.classList.add("hide");
    }
  });
}
