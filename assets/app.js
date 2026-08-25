/* Panel de Finanzas Personales — revueltos.cl
   Fuente de verdad: data/finance.json (editado por Claude a partir de lo que reportas en el chat).
   Los registros agregados desde el navegador se guardan en localStorage y se pueden exportar
   como JSON para fusionarlos de vuelta en data/finance.json. */

const LS_TX_KEY = "revueltos_local_transactions";
const LS_CC_KEY = "revueltos_local_credit_cards";

const state = {
  config: { currency: "CLP", hormigaThreshold: 8000, hormigaCategories: [] },
  categories: { ingreso: [], gasto: [] },
  transactions: [],
  creditCards: [],
  usingDemo: false,
  selectedMonth: null, // "YYYY-MM" or "all"
  sort: { key: "date", dir: "desc" },
  filterType: "all",
  filterCategory: "all",
};

const fmtCLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatMoney(n) {
  return fmtCLP.format(Math.round(n || 0));
}

function monthKey(dateStr) {
  return (dateStr || "").slice(0, 7);
}

function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function setLocal(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

const DEMO_TRANSACTIONS = () => {
  const now = new Date();
  const mk = (offsetDays) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: "demo1", date: mk(2), type: "ingreso", category: "Sueldo", amount: 1200000, paymentMethod: "transferencia", description: "Sueldo mensual", isHormiga: false },
    { id: "demo2", date: mk(1), type: "gasto", category: "Vivienda", amount: 380000, paymentMethod: "transferencia", description: "Arriendo", isHormiga: false },
    { id: "demo3", date: mk(3), type: "gasto", category: "Supermercado", amount: 65000, paymentMethod: "debito", description: "Feria/supermercado", isHormiga: false },
    { id: "demo4", date: mk(4), type: "gasto", category: "Cafetería", amount: 3200, paymentMethod: "debito", description: "Café Starbucks", isHormiga: true },
    { id: "demo5", date: mk(5), type: "gasto", category: "Cafetería", amount: 2900, paymentMethod: "debito", description: "Café oficina", isHormiga: true },
    { id: "demo6", date: mk(6), type: "gasto", category: "Delivery/Comida rápida", amount: 12500, paymentMethod: "credito:Visa Principal", description: "Rappi almuerzo", isHormiga: true },
    { id: "demo7", date: mk(7), type: "gasto", category: "Suscripciones", amount: 7990, paymentMethod: "credito:Visa Principal", description: "Streaming", isHormiga: true },
    { id: "demo8", date: mk(8), type: "gasto", category: "Snacks/Kiosco", amount: 1800, paymentMethod: "efectivo", description: "Kiosco", isHormiga: true },
    { id: "demo9", date: mk(9), type: "gasto", category: "Apps de transporte", amount: 5400, paymentMethod: "credito:Visa Principal", description: "Uber", isHormiga: true },
    { id: "demo10", date: mk(10), type: "gasto", category: "Transporte", amount: 18000, paymentMethod: "efectivo", description: "Bencina", isHormiga: false },
    { id: "demo11", date: mk(12), type: "gasto", category: "Cafetería", amount: 3500, paymentMethod: "debito", description: "Café", isHormiga: true },
    { id: "demo12", date: mk(15), type: "gasto", category: "Delivery/Comida rápida", amount: 14200, paymentMethod: "credito:Visa Principal", description: "Delivery cena", isHormiga: true },
  ];
};

const DEMO_CARDS = () => [
  {
    id: "democc1",
    name: "Visa Principal",
    bank: "Banco Ejemplo",
    cupoTotal: 800000,
    cupoUtilizado: 310000,
    montoFacturado: 245000,
    fechaVencimiento: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 6);
      return d.toISOString().slice(0, 10);
    })(),
  },
];

async function loadData() {
  let data;
  try {
    const res = await fetch("data/finance.json", { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    data = { config: {}, categories: {}, transactions: [], creditCards: [] };
  }

  state.config = Object.assign(
    { currency: "CLP", hormigaThreshold: 8000, hormigaCategories: [] },
    data.config || {}
  );
  state.categories = Object.assign({ ingreso: [], gasto: [] }, data.categories || {});

  const localTx = getLocal(LS_TX_KEY);
  const localCc = getLocal(LS_CC_KEY);

  let transactions = [...(data.transactions || []), ...localTx];
  let creditCards = [...(data.creditCards || []), ...localCc];

  state.usingDemo = transactions.length === 0;
  if (state.usingDemo) {
    transactions = DEMO_TRANSACTIONS();
    if (creditCards.length === 0) creditCards = DEMO_CARDS();
  }

  state.transactions = transactions;
  state.creditCards = creditCards;
}

function isHormiga(tx) {
  if (tx.type !== "gasto") return false;
  if (typeof tx.isHormiga === "boolean") return tx.isHormiga;
  return (
    state.config.hormigaCategories.includes(tx.category) &&
    tx.amount <= state.config.hormigaThreshold
  );
}

function getAvailableMonths() {
  const set = new Set(state.transactions.map((t) => monthKey(t.date)));
  return [...set].filter(Boolean).sort().reverse();
}

function filteredByMonth() {
  if (!state.selectedMonth || state.selectedMonth === "all") return state.transactions;
  return state.transactions.filter((t) => monthKey(t.date) === state.selectedMonth);
}

function populateMonthSelect() {
  const sel = document.getElementById("monthSelect");
  const months = getAvailableMonths();
  if (!state.selectedMonth) {
    state.selectedMonth = months[0] || "all";
  }
  sel.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "Todos los meses";
  sel.appendChild(allOpt);
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = monthLabel(m);
    sel.appendChild(opt);
  });
  sel.value = state.selectedMonth;
}

function computeKPIs(txs) {
  let income = 0, expense = 0, hormigaTotal = 0, hormigaCount = 0;
  txs.forEach((t) => {
    if (t.type === "ingreso") income += Number(t.amount) || 0;
    else {
      expense += Number(t.amount) || 0;
      if (isHormiga(t)) {
        hormigaTotal += Number(t.amount) || 0;
        hormigaCount += 1;
      }
    }
  });
  const balance = income - expense;
  const hormigaPct = expense > 0 ? (hormigaTotal / expense) * 100 : 0;
  return { income, expense, balance, hormigaTotal, hormigaCount, hormigaPct };
}

function renderKPIs() {
  const txs = filteredByMonth();
  const k = computeKPIs(txs);
  document.getElementById("kpiIncome").textContent = formatMoney(k.income);
  document.getElementById("kpiExpense").textContent = formatMoney(k.expense);
  const balEl = document.getElementById("kpiBalance");
  balEl.textContent = formatMoney(k.balance);
  balEl.style.color = k.balance >= 0 ? "var(--income)" : "var(--expense)";
  document.getElementById("kpiHormiga").textContent = formatMoney(k.hormigaTotal);
  document.getElementById("kpiHormigaHint").textContent =
    k.expense > 0
      ? `${k.hormigaPct.toFixed(1)}% de tus gastos · ${k.hormigaCount} movimientos · ${formatMoney(k.hormigaTotal * 12)} proyectado al año`
      : "Sin gastos registrados";
}

let trendChart, categoryChart;

function last6MonthKeys() {
  const keys = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function renderTrendChart() {
  if (typeof Chart === "undefined") {
    document.getElementById("trendChart").parentElement.innerHTML =
      '<div class="empty-state">No se pudo cargar la librería de gráficos (Chart.js). Revisa tu conexión.</div>';
    return;
  }
  const keys = last6MonthKeys();
  const income = keys.map((k) =>
    state.transactions
      .filter((t) => t.type === "ingreso" && monthKey(t.date) === k)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );
  const expense = keys.map((k) =>
    state.transactions
      .filter((t) => t.type === "gasto" && monthKey(t.date) === k)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );
  const hormiga = keys.map((k) =>
    state.transactions
      .filter((t) => monthKey(t.date) === k && isHormiga(t))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0)
  );

  const ctx = document.getElementById("trendChart").getContext("2d");
  const labels = keys.map(monthLabel);
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Ingresos", data: income, backgroundColor: "#2f6f4f" },
        { label: "Gastos", data: expense, backgroundColor: "#b3492b" },
        { label: "Gasto hormiga", data: hormiga, backgroundColor: "#c98a1e", type: "line", borderColor: "#c98a1e", tension: 0.3, yAxisID: "y" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatMoney(v) } } },
    },
  });
}

function renderCategoryChart() {
  if (typeof Chart === "undefined") {
    document.getElementById("categoryChart").parentElement.innerHTML =
      '<div class="empty-state">No se pudo cargar la librería de gráficos (Chart.js). Revisa tu conexión.</div>';
    return;
  }
  const txs = filteredByMonth().filter((t) => t.type === "gasto");
  const byCat = {};
  txs.forEach((t) => {
    byCat[t.category] = (byCat[t.category] || 0) + (Number(t.amount) || 0);
  });
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const ctx = document.getElementById("categoryChart").getContext("2d");
  const palette = ["#2f6f4f", "#b3492b", "#c98a1e", "#3d6fa8", "#7a5ca8", "#a85c8f", "#5c9ea8", "#8c8c3f", "#a86a3f", "#4f7a4f", "#7a4f4f", "#4f5c7a"];
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: entries.map((e) => e[0]),
      datasets: [{ data: entries.map((e) => e[1]), backgroundColor: entries.map((_, i) => palette[i % palette.length]) }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatMoney(ctx.parsed)}` } },
      },
    },
  });
}

function renderHormigaRanking() {
  const txs = filteredByMonth().filter((t) => isHormiga(t));
  const key = (t) => t.description?.trim() || t.category;
  const groups = {};
  txs.forEach((t) => {
    const k = key(t);
    if (!groups[k]) groups[k] = { name: k, category: t.category, total: 0, count: 0 };
    groups[k].total += Number(t.amount) || 0;
    groups[k].count += 1;
  });
  const list = Object.values(groups).sort((a, b) => b.total - a.total).slice(0, 8);
  const container = document.getElementById("hormigaList");
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay gastos hormiga detectados en este período. 🎉</div>';
    return;
  }
  list.forEach((g) => {
    const row = document.createElement("div");
    row.className = "hormiga-row";
    row.innerHTML = `
      <div>
        <div class="name">${escapeHtml(g.name)}</div>
        <div class="meta">${escapeHtml(g.category)} · ${g.count} ${g.count === 1 ? "vez" : "veces"} · ${formatMoney(g.total * 12)} / año si continúa</div>
      </div>
      <div class="amount">${formatMoney(g.total)}</div>
    `;
    container.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderTable() {
  let txs = filteredByMonth();
  if (state.filterType !== "all") txs = txs.filter((t) => t.type === state.filterType);
  if (state.filterCategory !== "all") txs = txs.filter((t) => t.category === state.filterCategory);

  const { key, dir } = state.sort;
  txs = [...txs].sort((a, b) => {
    let av = a[key], bv = b[key];
    if (key === "amount") { av = Number(av) || 0; bv = Number(bv) || 0; }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById("txTableBody");
  tbody.innerHTML = "";
  if (txs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Sin movimientos para este filtro.</td></tr>';
    return;
  }
  txs.forEach((t) => {
    const tr = document.createElement("tr");
    const hormigaBadge = isHormiga(t) ? '<span class="badge hormiga">Hormiga</span>' : "";
    const typeBadge = t.type === "ingreso" ? '<span class="badge income">Ingreso</span>' : "";
    tr.innerHTML = `
      <td>${t.date || ""}</td>
      <td>${typeBadge || "Gasto"}</td>
      <td>${escapeHtml(t.category || "")}</td>
      <td>${escapeHtml(t.description || "")} ${hormigaBadge}</td>
      <td>${escapeHtml(t.paymentMethod || "")}</td>
      <td class="amount-cell ${t.type === "ingreso" ? "income" : "expense"}">${t.type === "ingreso" ? "+" : "-"}${formatMoney(t.amount)}</td>
      <td class="row-actions">${t.id && String(t.id).startsWith("demo") ? "" : `<button data-del="${t.id}">Borrar</button>`}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteLocalTransaction(id);
    });
  });
}

function populateCategoryFilter() {
  const sel = document.getElementById("categoryFilter");
  const all = [...new Set(state.transactions.map((t) => t.category))].sort();
  sel.innerHTML = '<option value="all">Todas las categorías</option>';
  all.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  });
  sel.value = state.filterCategory;
}

function daysUntil(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

function renderCreditCards() {
  const container = document.getElementById("cardsGrid");
  container.innerHTML = "";
  if (state.creditCards.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay tarjetas registradas todavía.</div>';
    return;
  }
  state.creditCards.forEach((c) => {
    const pct = c.cupoTotal ? Math.min(100, (c.cupoUtilizado / c.cupoTotal) * 100) : 0;
    let barClass = "";
    if (pct >= 90) barClass = "danger";
    else if (pct >= 70) barClass = "warn";
    const dleft = c.fechaVencimiento ? daysUntil(c.fechaVencimiento) : null;
    const soon = dleft !== null && dleft <= 5;
    const div = document.createElement("div");
    div.className = "cc-card";
    div.innerHTML = `
      <div class="cc-top">
        <div>
          <div class="cc-name">${escapeHtml(c.name || "Tarjeta")}</div>
          <div class="cc-bank">${escapeHtml(c.bank || "")}</div>
        </div>
      </div>
      <div class="cc-bar-track"><div class="cc-bar-fill ${barClass}" style="width:${pct}%"></div></div>
      <div class="cc-meta"><span>${formatMoney(c.cupoUtilizado)} usado</span><span>Cupo ${formatMoney(c.cupoTotal)}</span></div>
      <div class="cc-meta"><span>Facturado</span><span>${formatMoney(c.montoFacturado)}</span></div>
      ${c.fechaVencimiento ? `<div class="cc-due ${soon ? "soon" : ""}">Vence ${c.fechaVencimiento} ${dleft !== null ? `(${dleft >= 0 ? dleft + " días" : "vencida"})` : ""}</div>` : ""}
    `;
    container.appendChild(div);
  });
}

function renderDemoBanner() {
  const banner = document.getElementById("demoBanner");
  banner.classList.toggle("visible", state.usingDemo);
}

function renderAll() {
  const steps = [
    populateMonthSelect,
    populateCategoryFilter,
    renderDemoBanner,
    renderKPIs,
    renderTrendChart,
    renderCategoryChart,
    renderHormigaRanking,
    renderTable,
    renderCreditCards,
  ];
  steps.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`Error en ${fn.name}:`, err);
    }
  });
}

function deleteLocalTransaction(id) {
  const local = getLocal(LS_TX_KEY).filter((t) => t.id !== id);
  setLocal(LS_TX_KEY, local);
  loadData().then(renderAll);
}

function addLocalTransaction(tx) {
  const local = getLocal(LS_TX_KEY);
  local.push(tx);
  setLocal(LS_TX_KEY, local);
}

function addLocalCard(card) {
  const local = getLocal(LS_CC_KEY);
  local.push(card);
  setLocal(LS_CC_KEY, local);
}

function populateFormCategories() {
  const typeSel = document.getElementById("txType");
  const catSel = document.getElementById("txCategory");
  const cats = state.categories[typeSel.value] || [];
  catSel.innerHTML = "";
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    catSel.appendChild(opt);
  });
}

function exportMergedJSON() {
  const merged = {
    config: state.config,
    categories: state.categories,
    transactions: state.usingDemo ? [] : state.transactions,
    creditCards: state.usingDemo ? [] : state.creditCards,
  };
  const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finance.json";
  a.click();
  URL.revokeObjectURL(url);
}

function wireEvents() {
  document.getElementById("monthSelect").addEventListener("change", (e) => {
    state.selectedMonth = e.target.value;
    renderKPIs();
    renderCategoryChart();
    renderHormigaRanking();
    renderTable();
  });

  document.getElementById("typeFilter").addEventListener("change", (e) => {
    state.filterType = e.target.value;
    renderTable();
  });

  document.getElementById("categoryFilter").addEventListener("change", (e) => {
    state.filterCategory = e.target.value;
    renderTable();
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
      } else {
        state.sort = { key, dir: "desc" };
      }
      renderTable();
    });
  });

  document.getElementById("addTxBtn").addEventListener("click", () => {
    document.getElementById("txForm").reset();
    document.getElementById("txDate").value = todayISO();
    populateFormCategories();
    document.getElementById("txDialog").showModal();
  });

  document.getElementById("txType").addEventListener("change", populateFormCategories);

  document.getElementById("txCancelBtn").addEventListener("click", () => {
    document.getElementById("txDialog").close();
  });

  document.getElementById("txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const tx = {
      id: uid(),
      date: document.getElementById("txDate").value,
      type: document.getElementById("txType").value,
      category: document.getElementById("txCategory").value,
      amount: Number(document.getElementById("txAmount").value),
      paymentMethod: document.getElementById("txPayment").value,
      description: document.getElementById("txDescription").value,
      isHormiga: document.getElementById("txHormiga").checked || undefined,
    };
    addLocalTransaction(tx);
    document.getElementById("txDialog").close();
    loadData().then(renderAll);
  });

  document.getElementById("addCardBtn").addEventListener("click", () => {
    document.getElementById("cardForm").reset();
    document.getElementById("cardDialog").showModal();
  });

  document.getElementById("cardCancelBtn").addEventListener("click", () => {
    document.getElementById("cardDialog").close();
  });

  document.getElementById("cardForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const card = {
      id: uid(),
      name: document.getElementById("cardName").value,
      bank: document.getElementById("cardBank").value,
      cupoTotal: Number(document.getElementById("cardCupo").value),
      cupoUtilizado: Number(document.getElementById("cardUtilizado").value),
      montoFacturado: Number(document.getElementById("cardFacturado").value),
      fechaVencimiento: document.getElementById("cardVencimiento").value,
    };
    addLocalCard(card);
    document.getElementById("cardDialog").close();
    loadData().then(renderAll);
  });

  document.getElementById("exportBtn").addEventListener("click", exportMergedJSON);

  document.getElementById("resetLocalBtn").addEventListener("click", () => {
    if (confirm("¿Borrar los movimientos agregados desde este navegador? Esto no afecta data/finance.json.")) {
      localStorage.removeItem(LS_TX_KEY);
      localStorage.removeItem(LS_CC_KEY);
      loadData().then(renderAll);
    }
  });
}

async function init() {
  await loadData();
  wireEvents();
  renderAll();
}

init();
