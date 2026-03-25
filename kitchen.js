// ── kitchen.js ──
const KB_URL = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/orders';
const KB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';
const KB_HEADERS = { 'apikey': KB_KEY, 'Authorization': 'Bearer ' + KB_KEY, 'Content-Type': 'application/json' };

let lastNewCount  = 0;
let allOrders     = [];
let activeFilter  = 'all';

const columns = {
  new:   document.getElementById('col-new'),
  prep:  document.getElementById('col-prep'),
  ready: document.getElementById('col-ready'),
  done:  document.getElementById('col-done'),
};

// ── Sound alert ──
function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

// ── Fetch orders from Supabase ──
async function fetchOrders() {
  try {
    const res = await fetch(KB_URL + '?select=*&order=created_at.desc', { headers: KB_HEADERS });
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    allOrders = await res.json();

    const newCount = allOrders.filter(o => o.status === 'new').length;
    if (newCount > lastNewCount && lastNewCount !== 0) playAlert();
    lastNewCount = newCount;

    renderOrders();
    updateStats();
  } catch(err) {
    console.error('Kitchen fetch error:', err);
  }
}

// ── Render orders based on active filter ──
function renderOrders() {
  // Clear all columns
  Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

  // Filter orders
  const filtered = activeFilter === 'all'
    ? allOrders
    : allOrders.filter(o => (o.status || 'new') === activeFilter);

  if (activeFilter === 'all') {
    // Show in kanban columns
    filtered.forEach(order => {
      const status = order.status || 'new';
      const col = columns[status];
      if (col) col.appendChild(buildCard(order));
    });
  } else {
    // Show only in matching column
    const col = columns[activeFilter];
    if (col) {
      filtered.forEach(order => col.appendChild(buildCard(order)));
    }
    // Hide other columns visually
    Object.keys(columns).forEach(key => {
      const colEl = columns[key];
      if (!colEl) return;
      colEl.closest('.column').style.display = key === activeFilter ? 'flex' : 'none';
    });
    return;
  }

  // Show all columns in all mode
  Object.values(columns).forEach(col => {
    if (col) col.closest('.column').style.display = 'flex';
  });
}

// ── Build a card element ──
function buildCard(order) {
  const status = order.status || 'new';
  let items = [];
  try { items = JSON.parse(order.items); } catch(e) {}

  const itemsHTML = items.map(function(item) {
    return '<div class="card-item"><span class="item-qty">\xd7' + item.quantity + '</span>' +
           '<div><span class="item-name-k">' + item.name + '</span></div></div>';
  }).join('');

  const timeStr = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mins = Math.floor((Date.now() - new Date(order.created_at)) / 60000);
  const timerClass = mins >= 20 ? 'urgent' : mins >= 10 ? 'normal' : 'fresh';
  const timerText = mins + ' min' + (mins >= 20 ? ' \u26a0' : '');

  const btnConfig = {
    new:   { next: 'prep',  cls: 'new-action',   text: 'Start Preparing \u2192' },
    prep:  { next: 'ready', cls: 'prep-action',  text: 'Mark Ready \u2713'      },
    ready: { next: 'done',  cls: 'ready-action', text: 'Served \u2713'          },
    done:  { next: null,    cls: 'done-action',  text: 'Served'                 },
  };
  const btn = btnConfig[status] || btnConfig.new;

  const actionBtn = btn.next
    ? '<button class="card-action ' + btn.cls + '" onclick="updateStatus(\'' + order.id + '\', \'' + btn.next + '\')">' + btn.text + '</button>'
    : '<button class="card-action ' + btn.cls + '" disabled>' + btn.text + '</button>';

  const card = document.createElement('div');
  card.className = 'order-card ' + status + '-card';
  card.dataset.id = order.id;
  card.innerHTML =
    '<div class="card-head">' +
      '<span class="card-table">Table ' + (order.table_number || 'Walk-in') + '</span>' +
      '<div class="card-meta">' +
        '<span class="card-time">' + timeStr + '</span>' +
        '<span class="card-timer ' + timerClass + '">' + timerText + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="card-items">' + itemsHTML + '</div>' +
    '<div class="card-foot">' +
      '<span class="card-order-id">#' + String(order.id).slice(0, 6) + '</span>' +
      actionBtn +
    '</div>';
  return card;
}

// ── Update order status ──
async function updateStatus(orderId, newStatus) {
  try {
    const res = await fetch(KB_URL + '?id=eq.' + orderId, {
      method: 'PATCH',
      headers: KB_HEADERS,
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Update failed');
    fetchOrders();
  } catch(err) {
    console.error('Update error:', err);
  }
}

// ── Update stats numbers ──
function updateStats() {
  const count = {
    new:   allOrders.filter(o => (o.status || 'new') === 'new').length,
    prep:  allOrders.filter(o => o.status === 'prep').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    done:  allOrders.filter(o => o.status === 'done').length,
  };

  // Stats strip
  const stripNums = document.querySelectorAll('.strip-num');
  if (stripNums[0]) stripNums[0].textContent = count.new;
  if (stripNums[1]) stripNums[1].textContent = count.prep;
  if (stripNums[2]) stripNums[2].textContent = count.ready;
  if (stripNums[3]) stripNums[3].textContent = count.done;

  // Column header counts
  const colCounts = document.querySelectorAll('.col-count');
  if (colCounts[0]) colCounts[0].textContent = count.new;
  if (colCounts[1]) colCounts[1].textContent = count.prep;
  if (colCounts[2]) colCounts[2].textContent = count.ready;
  if (colCounts[3]) colCounts[3].textContent = count.done;

  // Tab bar counts (skip index 0 = All tab)
  const tabCounts = document.querySelectorAll('.status-tab .count');
  if (tabCounts[0]) tabCounts[0].textContent = allOrders.length;
  if (tabCounts[1]) tabCounts[1].textContent = count.new;
  if (tabCounts[2]) tabCounts[2].textContent = count.prep;
  if (tabCounts[3]) tabCounts[3].textContent = count.ready;
  if (tabCounts[4]) tabCounts[4].textContent = count.done;
}

// ── Filter tabs ──
document.querySelectorAll('.status-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.status-tab').forEach(function(t) { t.classList.remove('on'); });
    this.classList.add('on');

    // Get filter from tab classes
    if (this.classList.contains('new'))    activeFilter = 'new';
    else if (this.classList.contains('prep'))   activeFilter = 'prep';
    else if (this.classList.contains('ready'))  activeFilter = 'ready';
    else if (this.classList.contains('served')) activeFilter = 'done';
    else activeFilter = 'all';

    renderOrders();
  });
});

// ── Live Clock ──
function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

// ── Alert banner dismiss ──
var alertBanner = document.getElementById('alertBanner');
if (alertBanner) {
  var dismissBtn = alertBanner.querySelector('.alert-dismiss');
  if (dismissBtn) dismissBtn.onclick = function() { alertBanner.style.display = 'none'; };
}

// ── Initialize ──
updateClock();
setInterval(updateClock, 1000);
fetchOrders();
setInterval(fetchOrders, 10000);
