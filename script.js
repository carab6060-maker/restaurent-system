/* ═══════════════════════════════════════════════
   SAVEUR — script.js
   Full restaurant management logic (localStorage)
═══════════════════════════════════════════════ */

"use strict";

// ── State ────────────────────────────────────────
const state = { reservations: [], orders: [], menu: [] };

// ── Storage Helpers ──────────────────────────────
function loadState() {
  try {
    state.reservations = JSON.parse(localStorage.getItem("saveur_reservations") || "[]");
    state.orders       = JSON.parse(localStorage.getItem("saveur_orders") || "[]");
    state.menu         = JSON.parse(localStorage.getItem("saveur_menu") || "[]");
  } catch { /* ignore parse errors */ }
}

function saveReservations() { localStorage.setItem("saveur_reservations", JSON.stringify(state.reservations)); }
function saveOrders()       { localStorage.setItem("saveur_orders", JSON.stringify(state.orders)); }
function saveMenu()         { localStorage.setItem("saveur_menu", JSON.stringify(state.menu)); }

function getUsers() {
  try { return JSON.parse(localStorage.getItem("saveur_users") || "[]"); }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem("saveur_users", JSON.stringify(users)); }

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("saveur_current_user")); }
  catch { return null; }
}
function setCurrentUser(user) {
  if (user) localStorage.setItem("saveur_current_user", JSON.stringify(user));
  else localStorage.removeItem("saveur_current_user");
}

// ── Generate unique ID ───────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // Auth buttons
  document.getElementById("login-btn").addEventListener("click", loginUser);
  document.getElementById("signup-btn").addEventListener("click", signupUser);
  document.getElementById("show-signup-link").addEventListener("click", showSignup);
  document.getElementById("show-login-link").addEventListener("click", showLogin);
  document.getElementById("logout-btn").addEventListener("click", logoutUser);

  // Nav
  document.querySelectorAll(".nav-item[data-page]").forEach(item => {
    item.addEventListener("click", () => navigate(item.dataset.page));
  });
  document.getElementById("hamburger").addEventListener("click", toggleSidebar);

  // Nested menus (accordion)
  document.querySelectorAll(".has-submenu").forEach(item => {
    item.addEventListener("click", () => {
      const parent = item.parentElement;
      // Optional: Close others
      document.querySelectorAll(".nav-group").forEach(group => {
        if (group !== parent) group.classList.remove("expanded");
      });
      parent.classList.toggle("expanded");
    });
  });

  // Modal open buttons
  document.getElementById("open-reservation-modal").addEventListener("click", () => openModal("reservation-modal"));
  document.getElementById("open-order-modal").addEventListener("click", () => openModal("order-modal"));
  document.getElementById("open-menu-modal").addEventListener("click", () => openModal("menu-modal"));

  // Modal close buttons
  document.getElementById("close-reservation-modal").addEventListener("click", () => closeModal("reservation-modal"));
  document.getElementById("close-order-modal").addEventListener("click", () => closeModal("order-modal"));
  document.getElementById("close-menu-modal").addEventListener("click", () => closeModal("menu-modal"));

  // Modal form actions
  document.getElementById("add-reservation-btn").addEventListener("click", addReservation);
  document.getElementById("add-order-btn").addEventListener("click", addOrder);
  document.getElementById("add-menu-item-btn").addEventListener("click", addMenuItem);

  // Close modal on backdrop click
  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal-overlay")) {
      e.target.classList.add("hidden");
    }
  });

  // Enter key support for auth
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    const loginCard  = document.getElementById("login-card");
    const signupCard = document.getElementById("signup-card");
    if (loginCard && !loginCard.classList.contains("hidden"))  loginUser();
    if (signupCard && !signupCard.classList.contains("hidden")) signupUser();
  });

  // Live clock
  setInterval(() => {
    const el = document.getElementById("topbar-time");
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, 1000);

  // Check existing session
  const user = getCurrentUser();
  if (user) {
    showApp(user);
  } else {
    showAuth();
  }
});

// ═══════════════════════════════════════════════
// AUTH (localStorage-based)
// ═══════════════════════════════════════════════

function loginUser() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) return toast("Please fill in all fields");

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return toast("Invalid email or password");

  setCurrentUser(user);
  showApp(user);
  toast("Welcome back!");
}

function signupUser() {
  const name     = document.getElementById("signup-name").value.trim();
  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  if (!name || !email || !password) return toast("Please fill in all fields");
  if (password.length < 6) return toast("Password must be at least 6 characters");
  if (!email.includes("@")) return toast("Please enter a valid email");

  const users = getUsers();
  if (users.find(u => u.email === email)) return toast("Email already in use");

  const user = { id: genId(), name, email, password };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  showApp(user);
  toast(`Welcome, ${name}!`);
}

function logoutUser() {
  setCurrentUser(null);
  showAuth();
  toast("Signed out");
}

function showLogin() {
  document.getElementById("login-card").classList.remove("hidden");
  document.getElementById("signup-card").classList.add("hidden");
}
function showSignup() {
  document.getElementById("signup-card").classList.remove("hidden");
  document.getElementById("login-card").classList.add("hidden");
}

// ═══════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════

function showApp(user) {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("sidebar-user").textContent = user.name || user.email;
  loadState();
  navigate("dashboard");
  renderReservations();
  renderOrders();
  renderMenu();
  updateDashboard();
}

function showAuth() {
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

function navigate(page) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
    p.classList.add("hidden");
  });
  const target = document.getElementById("page-" + page);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
  }
  document.querySelectorAll(".nav-item[data-page]").forEach(n => {
    n.classList.toggle("active", n.dataset.page === page);
  });
  const titles = { dashboard: "Dashboard", reservations: "Reservations", orders: "Orders", menu: "Menu" };
  let title = titles[page] || page.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  document.getElementById("page-title").textContent = title;
  if(window.innerWidth <= 720) closeSidebar(); // only close sidebar on mobile
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}
function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
}

// ═══════════════════════════════════════════════
// RESERVATIONS
// ═══════════════════════════════════════════════

function renderReservations() {
  const tbody = document.getElementById("reservations-body");
  if (!tbody) return;
  if (!state.reservations.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No reservations yet</td></tr>`;
    return;
  }
  tbody.innerHTML = state.reservations.map(r => `
    <tr>
      <td>${esc(r.name)}</td>
      <td>${esc(r.date)}</td>
      <td>${esc(r.time)}</td>
      <td>${r.guests}</td>
      <td>#${r.table}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
      <td>
        ${r.status === "pending" ? `<button class="btn-action" data-action="confirm-res" data-id="${r.id}">Confirm</button>` : ""}
        ${r.status !== "cancelled" ? `<button class="btn-action danger" data-action="cancel-res" data-id="${r.id}">Cancel</button>` : ""}
        <button class="btn-action danger" data-action="delete-res" data-id="${r.id}">Delete</button>
      </td>
    </tr>`).join("");

  // Attach event listeners
  tbody.querySelectorAll("[data-action='confirm-res']").forEach(btn => {
    btn.addEventListener("click", () => updateReservationStatus(btn.dataset.id, "confirmed"));
  });
  tbody.querySelectorAll("[data-action='cancel-res']").forEach(btn => {
    btn.addEventListener("click", () => updateReservationStatus(btn.dataset.id, "cancelled"));
  });
  tbody.querySelectorAll("[data-action='delete-res']").forEach(btn => {
    btn.addEventListener("click", () => deleteReservation(btn.dataset.id));
  });
}

function addReservation() {
  const name   = document.getElementById("res-name").value.trim();
  const date   = document.getElementById("res-date").value;
  const time   = document.getElementById("res-time").value;
  const guests = document.getElementById("res-guests").value;
  const table  = document.getElementById("res-table").value;
  const notes  = document.getElementById("res-notes").value.trim();
  if (!name || !date || !time) return toast("Please fill in name, date, and time");

  const reservation = {
    id: genId(), name, date, time, guests: +guests, table: +table, notes,
    status: "pending", createdAt: new Date().toISOString()
  };
  state.reservations.unshift(reservation);
  saveReservations();
  renderReservations();
  updateDashboard();
  closeModal("reservation-modal");
  clearFields(["res-name","res-date","res-time","res-notes"]);
  toast("Reservation booked!");
}

function updateReservationStatus(id, status) {
  const r = state.reservations.find(r => r.id === id);
  if (r) r.status = status;
  saveReservations();
  renderReservations();
  updateDashboard();
  toast(`Reservation ${status}`);
}

function deleteReservation(id) {
  if (!confirm("Delete this reservation?")) return;
  state.reservations = state.reservations.filter(r => r.id !== id);
  saveReservations();
  renderReservations();
  updateDashboard();
  toast("Reservation deleted");
}

// ═══════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════

function renderOrders() {
  const tbody = document.getElementById("orders-body");
  if (!tbody) return;
  if (!state.orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="loading-row">No orders yet</td></tr>`;
    return;
  }
  tbody.innerHTML = state.orders.map((o, i) => `
    <tr>
      <td>#${String(i + 1).padStart(3, "0")}</td>
      <td>Table ${o.table}</td>
      <td>${formatItems(o.items)}</td>
      <td class="gold">$${(+o.total).toFixed(2)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>${formatTime(o.createdAt)}</td>
      <td>
        ${o.status === "pending"   ? `<button class="btn-action" data-action="prepare-order" data-id="${o.id}">Prepare</button>` : ""}
        ${o.status === "preparing" ? `<button class="btn-action" data-action="serve-order" data-id="${o.id}">Serve</button>` : ""}
        <button class="btn-action danger" data-action="delete-order" data-id="${o.id}">Delete</button>
      </td>
    </tr>`).join("");

  // Attach event listeners
  tbody.querySelectorAll("[data-action='prepare-order']").forEach(btn => {
    btn.addEventListener("click", () => updateOrderStatus(btn.dataset.id, "preparing"));
  });
  tbody.querySelectorAll("[data-action='serve-order']").forEach(btn => {
    btn.addEventListener("click", () => updateOrderStatus(btn.dataset.id, "served"));
  });
  tbody.querySelectorAll("[data-action='delete-order']").forEach(btn => {
    btn.addEventListener("click", () => deleteOrder(btn.dataset.id));
  });
}

function addOrder() {
  const table = document.getElementById("order-table").value;
  const selected = getSelectedOrderItems();
  if (!selected.length) return toast("Select at least one item");
  const total = selected.reduce((s, i) => s + i.price * i.qty, 0);

  const order = {
    id: genId(), table: +table, items: selected, total: +total.toFixed(2),
    status: "pending", createdAt: new Date().toISOString()
  };
  state.orders.unshift(order);
  saveOrders();
  renderOrders();
  updateDashboard();
  closeModal("order-modal");
  toast("Order placed!");
}

function updateOrderStatus(id, status) {
  const o = state.orders.find(o => o.id === id);
  if (o) o.status = status;
  saveOrders();
  renderOrders();
  updateDashboard();
  toast(`Order marked as ${status}`);
}

function deleteOrder(id) {
  if (!confirm("Delete this order?")) return;
  state.orders = state.orders.filter(o => o.id !== id);
  saveOrders();
  renderOrders();
  updateDashboard();
  toast("Order deleted");
}

// ── Order modal helpers ──────────────────────────
function populateOrderModal() {
  const container = document.getElementById("order-menu-items");
  if (!container) return;
  if (!state.menu.length) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:.82rem;padding:.5rem">No menu items. Add items first.</p>`;
    return;
  }
  container.innerHTML = state.menu.map(item => `
    <div class="order-item-row" data-id="${item.id}" data-price="${item.price}">
      <span class="item-name">${esc(item.name)}</span>
      <span class="item-price">$${(+item.price).toFixed(2)}</span>
      <div class="qty-control">
        <button class="qty-btn" data-action="qty-minus" data-item-id="${item.id}">−</button>
        <span class="qty-display" id="qty-${item.id}">0</span>
        <button class="qty-btn" data-action="qty-plus" data-item-id="${item.id}">+</button>
      </div>
    </div>`).join("");

  // Attach quantity controls
  container.querySelectorAll("[data-action='qty-minus']").forEach(btn => {
    btn.addEventListener("click", () => changeQty(btn.dataset.itemId, -1));
  });
  container.querySelectorAll("[data-action='qty-plus']").forEach(btn => {
    btn.addEventListener("click", () => changeQty(btn.dataset.itemId, 1));
  });

  updateOrderTotal();
}

function changeQty(id, delta) {
  const el = document.getElementById("qty-" + id);
  if (!el) return;
  let v = parseInt(el.textContent) + delta;
  if (v < 0) v = 0;
  el.textContent = v;
  updateOrderTotal();
}

function updateOrderTotal() {
  let total = 0;
  state.menu.forEach(item => {
    const qtyEl = document.getElementById("qty-" + item.id);
    if (qtyEl) total += (+item.price) * parseInt(qtyEl.textContent || 0);
  });
  const el = document.getElementById("order-total-display");
  if (el) el.textContent = "$" + total.toFixed(2);
}

function getSelectedOrderItems() {
  return state.menu.flatMap(item => {
    const qtyEl = document.getElementById("qty-" + item.id);
    const qty = qtyEl ? parseInt(qtyEl.textContent) : 0;
    return qty > 0 ? [{ name: item.name, price: +item.price, qty }] : [];
  });
}

// ═══════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════

function renderMenu() {
  const grid = document.getElementById("menu-grid");
  if (!grid) return;
  if (!state.menu.length) {
    grid.innerHTML = `<p style="color:var(--text-dim);grid-column:1/-1;padding:2rem;text-align:center;font-size:.85rem">No menu items yet. Add your first dish →</p>`;
    return;
  }
  grid.innerHTML = state.menu.map(item => `
    <div class="menu-card">
      <div class="menu-card-cat">${esc(item.category)}</div>
      <div class="menu-card-name">${esc(item.name)}</div>
      <div class="menu-card-desc">${esc(item.description || "")}</div>
      <div class="menu-card-footer">
        <div class="menu-card-price">$${(+item.price).toFixed(2)}</div>
        <button class="btn-action danger" data-action="delete-menu" data-id="${item.id}">Remove</button>
      </div>
    </div>`).join("");

  // Attach event listeners
  grid.querySelectorAll("[data-action='delete-menu']").forEach(btn => {
    btn.addEventListener("click", () => deleteMenuItem(btn.dataset.id));
  });
}

function addMenuItem() {
  const name     = document.getElementById("menu-name").value.trim();
  const desc     = document.getElementById("menu-desc").value.trim();
  const price    = document.getElementById("menu-price").value;
  const category = document.getElementById("menu-category").value;
  if (!name || !price) return toast("Name and price are required");

  const item = {
    id: genId(), name, description: desc, price: +price, category,
    createdAt: new Date().toISOString()
  };
  state.menu.unshift(item);
  saveMenu();
  renderMenu();
  updateDashboard();
  closeModal("menu-modal");
  clearFields(["menu-name","menu-desc","menu-price"]);
  toast("Menu item added!");
}

function deleteMenuItem(id) {
  if (!confirm("Remove this item from the menu?")) return;
  state.menu = state.menu.filter(m => m.id !== id);
  saveMenu();
  renderMenu();
  updateDashboard();
  toast("Item removed");
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════

function updateDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const todayRes = state.reservations.filter(r => r.date === today);
  const activeOrders = state.orders.filter(o => o.status === "pending" || o.status === "preparing");
  const todayRevenue = state.orders
    .filter(o => o.status === "served")
    .reduce((s, o) => s + (+o.total || 0), 0);

  document.getElementById("stat-reservations").textContent = todayRes.length;
  document.getElementById("stat-orders").textContent       = activeOrders.length;
  document.getElementById("stat-revenue").textContent      = "$" + todayRevenue.toFixed(0);
  document.getElementById("stat-menu").textContent         = state.menu.length;

  // Recent reservations
  const resEl = document.getElementById("recent-reservations");
  if (resEl) {
    const recent = state.reservations.slice(0, 5);
    resEl.innerHTML = recent.length
      ? recent.map(r => `<div class="mini-row"><span class="name">${esc(r.name)}</span><span class="meta">${r.date} · Table ${r.table} · <span class="badge badge-${r.status}">${r.status}</span></span></div>`).join("")
      : `<p style="color:var(--text-dim);font-size:.82rem">No reservations</p>`;
  }

  // Recent orders
  const ordEl = document.getElementById("recent-orders");
  if (ordEl) {
    const recent = state.orders.slice(0, 5);
    ordEl.innerHTML = recent.length
      ? recent.map(o => `<div class="mini-row"><span class="name">Table ${o.table}</span><span class="meta">$${(+o.total).toFixed(2)} · <span class="badge badge-${o.status}">${o.status}</span></span></div>`).join("")
      : `<p style="color:var(--text-dim);font-size:.82rem">No orders</p>`;
  }
}

// ═══════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  if (id === "order-modal") populateOrderModal();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3000);
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatItems(items) {
  if (!items || !items.length) return "—";
  return items.map(i => `${i.qty}× ${i.name}`).join(", ").slice(0, 60) + (items.length > 2 ? "…" : "");
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function clearFields(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

// Add gold color inline
document.head.insertAdjacentHTML("beforeend", `<style>.gold{color:var(--gold)}</style>`);