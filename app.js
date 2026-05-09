// ─── storage ───────────────────────────────────────────────
const KEYS = { tx: 'ft_transactions', todos: 'ft_todos' };
const store = {
  get: k => JSON.parse(localStorage.getItem(k) || '[]'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ─── state ─────────────────────────────────────────────────
let transactions = store.get(KEYS.tx);
let todos        = store.get(KEYS.todos);
let todoFilter   = 'all';

// ─── utils ─────────────────────────────────────────────────
function money(n) {
  return Number(n).toLocaleString('vi-VN') + ' ₫';
}

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function thisMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function isOverdue(s) {
  return s && s < today();
}

// ─── theme ─────────────────────────────────────────────────
const THEME_KEY = 'ft_theme';

const ICON_DARK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
</svg>`;

const ICON_LIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  document.getElementById('theme-icon').innerHTML = theme === 'light' ? ICON_DARK : ICON_LIGHT;
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

// ─── clock ─────────────────────────────────────────────────
function tickClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const n = new Date();
  el.textContent = n.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(tickClock, 1000);
tickClock();

// ─── gold coin canvas ───────────────────────────────────────
(function initGold() {
  const canvas = document.getElementById('gold-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, coins = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function getCoinColor() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return isLight
      ? { outer: '#a07828', inner: '#c9a84c', alphaMax: 0.25 }
      : { outer: '#c9a84c', inner: '#e8c96a', alphaMax: 0.35 };
  }

  function randomCoin() {
    const { alphaMax } = getCoinColor();
    return {
      x:     Math.random() * W,
      y:     -20,
      r:     Math.random() * 5 + 3,
      speed: Math.random() * 1.2 + 0.4,
      drift: (Math.random() - 0.5) * 0.6,
      alpha: Math.random() * alphaMax + 0.06,
      spin:  Math.random() * Math.PI * 2,
      dSpin: (Math.random() - 0.5) * 0.06,
    };
  }

  function spawnCoins() {
    if (coins.length < 55) coins.push(randomCoin());
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.y    += c.speed;
      c.x    += c.drift;
      c.spin += c.dSpin;

      const { outer, inner } = getCoinColor();
      const scaleX = Math.abs(Math.cos(c.spin));

      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.translate(c.x, c.y);

      ctx.beginPath();
      ctx.ellipse(0, 0, c.r * scaleX + 0.5, c.r, 0, 0, Math.PI * 2);
      ctx.fillStyle = outer;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, -c.r * 0.2, (c.r * scaleX) * 0.55, c.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = inner;
      ctx.fill();

      ctx.restore();

      if (c.y > H + 20) coins.splice(i, 1);
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  setInterval(spawnCoins, 180);
  draw();
})();

// ─── tab nav ───────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
  });
});

// ─── dashboard ─────────────────────────────────────────────
function renderDashboard() {
  const now = new Date();
  document.getElementById('today-label').textContent =
    now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const m       = thisMonth();
  const mTx     = transactions.filter(t => t.date && t.date.startsWith(m));
  const income  = mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const max     = Math.max(income, expense, 1);

  document.getElementById('total-income').textContent  = money(income);
  document.getElementById('total-expense').textContent = money(expense);

  const balEl = document.getElementById('total-balance');
  balEl.textContent = money(balance);
  balEl.className   = 'stat-value ' + (balance >= 0 ? 'gold' : '');
  if (balance < 0) balEl.style.color = 'var(--red)';
  else balEl.style.color = '';

  document.getElementById('bar-income').style.width  = (income  / max * 100) + '%';
  document.getElementById('bar-expense').style.width = (expense / max * 100) + '%';

  const pending = todos.filter(t => !t.done).length;
  const total   = todos.length;
  document.getElementById('todo-pending').textContent = pending;
  document.getElementById('bar-todo').style.width = total
    ? ((total - pending) / total * 100) + '%' : '0%';

  // recent transactions
  const rtEl = document.getElementById('recent-transactions');
  const rt   = [...transactions].slice(0, 6);
  rtEl.innerHTML = rt.length ? rt.map(t => `
    <li>
      <div class="feed-left">
        <span class="feed-name">${t.desc}</span>
        <span class="feed-meta">${t.category} · ${fmtDate(t.date)}</span>
      </div>
      <span style="color:${t.type === 'income' ? 'var(--green)' : 'var(--red)'}; font-weight:700; font-size:13px">
        ${t.type === 'income' ? '+' : '-'}${money(t.amount)}
      </span>
    </li>
  `).join('') : '<li class="empty">Chưa có giao dịch</li>';

  // recent todos
  const rtdEl = document.getElementById('recent-todos');
  const rtd   = [...todos].slice(0, 6);
  rtdEl.innerHTML = rtd.length ? rtd.map(t => `
    <li>
      <div class="feed-left">
        <span class="feed-name" style="${t.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.title}</span>
        <span class="feed-meta">${t.done ? 'Hoàn thành' : 'Đang làm'}</span>
      </div>
      <span class="tag tag-${t.priority}">${{ high: 'Cao', medium: 'TB', low: 'Thấp' }[t.priority]}</span>
    </li>
  `).join('') : '<li class="empty">Chưa có công việc</li>';
}

// ─── expense ───────────────────────────────────────────────
document.getElementById('exp-date').value = today();

function buildMonthFilter() {
  const sel    = document.getElementById('filter-month');
  const prev   = sel.value;
  const months = [...new Set(transactions.map(t => t.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
  sel.innerHTML = '<option value="all">Tất cả tháng</option>' +
    months.map(m => {
      const [y, mo] = m.split('-');
      return `<option value="${m}" ${m === prev ? 'selected' : ''}>Tháng ${mo}/${y}</option>`;
    }).join('');
}

document.getElementById('expense-form').addEventListener('submit', e => {
  e.preventDefault();
  const desc   = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const date   = document.getElementById('exp-date').value;
  if (!desc || !amount || !date) return;

  transactions.unshift({
    id:       Date.now(),
    type:     document.getElementById('exp-type').value,
    category: document.getElementById('exp-category').value,
    desc, amount, date,
  });
  store.set(KEYS.tx, transactions);
  e.target.reset();
  document.getElementById('exp-date').value = today();
  buildMonthFilter();
  renderTransactions();
});

function filteredTx() {
  const type   = document.getElementById('filter-type').value;
  const month  = document.getElementById('filter-month').value;
  const q      = document.getElementById('filter-search').value.toLowerCase();
  return transactions.filter(t => {
    if (type !== 'all' && t.type !== type) return false;
    if (month !== 'all' && !t.date?.startsWith(month)) return false;
    if (q && !t.desc.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderTransactions() {
  const list = document.getElementById('transaction-list');
  const data = filteredTx();

  if (!data.length) {
    list.innerHTML = '<div class="empty-state">Không có giao dịch nào</div>';
    return;
  }

  list.innerHTML = data.map(t => `
    <div class="tx-item">
      <div class="tx-type-bar ${t.type}"></div>
      <div class="tx-info">
        <div class="tx-desc">${t.desc}</div>
        <div class="tx-meta">${t.category} · ${fmtDate(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">
        ${t.type === 'income' ? '+' : '-'}${money(t.amount)}
      </div>
      <button class="tx-delete" data-id="${t.id}">Xóa</button>
    </div>
  `).join('');

  list.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Xóa giao dịch này?')) return;
      transactions = transactions.filter(t => t.id !== Number(btn.dataset.id));
      store.set(KEYS.tx, transactions);
      buildMonthFilter();
      renderTransactions();
    });
  });
}

document.getElementById('clear-all-expense').addEventListener('click', () => {
  if (!transactions.length) return;
  if (!confirm('Xóa tất cả giao dịch? Không thể hoàn tác.')) return;
  transactions = [];
  store.set(KEYS.tx, transactions);
  buildMonthFilter();
  renderTransactions();
});

['filter-type', 'filter-month', 'filter-search'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderTransactions);
});

// ─── todo ──────────────────────────────────────────────────
document.getElementById('todo-form').addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('todo-title').value.trim();
  if (!title) return;

  todos.unshift({
    id:       Date.now(),
    title,
    priority: document.getElementById('todo-priority').value,
    due:      document.getElementById('todo-due').value,
    note:     document.getElementById('todo-note').value.trim(),
    done:     false,
  });
  store.set(KEYS.todos, todos);
  e.target.reset();
  renderTodos();
});

function filteredTodos() {
  const q = document.getElementById('todo-search').value.toLowerCase();
  return todos.filter(t => {
    if (todoFilter === 'pending' && t.done)  return false;
    if (todoFilter === 'done'    && !t.done) return false;
    if (todoFilter === 'high'    && t.priority !== 'high') return false;
    if (q && !t.title.toLowerCase().includes(q) && !(t.note || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderTodos() {
  const list  = document.getElementById('todo-list');
  const total = todos.length;
  const done  = todos.filter(t => t.done).length;
  const pct   = total ? Math.round(done / total * 100) : 0;

  document.getElementById('todo-progress-label').textContent = `${done} / ${total} hoàn thành`;
  document.getElementById('todo-progress-pct').textContent   = pct + '%';
  document.getElementById('todo-progress-fill').style.width  = pct + '%';

  const data = filteredTodos();
  if (!data.length) {
    list.innerHTML = '<li><div class="empty-state">Không có công việc nào</div></li>';
    return;
  }

  const PRIORITY_LABEL = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

  list.innerHTML = data.map(t => {
    const overdue = !t.done && isOverdue(t.due);
    const dueTag  = t.due
      ? `<span class="tag ${overdue ? 'tag-overdue' : 'tag-due'}">${overdue ? 'Quá hạn' : fmtDate(t.due)}</span>`
      : '';
    return `
      <li class="todo-item priority-${t.priority} ${t.done ? 'done' : ''}" data-id="${t.id}">
        <div class="todo-check" data-id="${t.id}"></div>
        <div class="todo-body">
          <div class="todo-title">${t.title}</div>
          <div class="todo-tags">
            <span class="tag tag-${t.priority}">${PRIORITY_LABEL[t.priority]}</span>
            ${dueTag}
          </div>
          ${t.note ? `<div class="todo-note">${t.note}</div>` : ''}
        </div>
        <button class="todo-delete" data-id="${t.id}">Xóa</button>
      </li>
    `;
  }).join('');

  list.querySelectorAll('.todo-check').forEach(el => {
    el.addEventListener('click', () => {
      const todo = todos.find(t => t.id === Number(el.dataset.id));
      if (todo) { todo.done = !todo.done; store.set(KEYS.todos, todos); renderTodos(); }
    });
  });

  list.querySelectorAll('.todo-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Xóa công việc này?')) return;
      todos = todos.filter(t => t.id !== Number(btn.dataset.id));
      store.set(KEYS.todos, todos);
      renderTodos();
    });
  });
}

document.getElementById('clear-done-todos').addEventListener('click', () => {
  const n = todos.filter(t => t.done).length;
  if (!n) return;
  if (!confirm(`Xóa ${n} công việc đã hoàn thành?`)) return;
  todos = todos.filter(t => !t.done);
  store.set(KEYS.todos, todos);
  renderTodos();
});

document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    todoFilter = btn.dataset.filter;
    renderTodos();
  });
});

document.getElementById('todo-search').addEventListener('input', renderTodos);

// ─── init ──────────────────────────────────────────────────
buildMonthFilter();
renderTransactions();
renderTodos();
renderDashboard();
