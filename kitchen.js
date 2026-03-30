// ── kitchen.js ──
const KB_URL      = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/orders';
const KB_MENU_URL = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/menu_items';
const KB_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';
const KB_HEADERS  = { 'apikey': KB_KEY, 'Authorization': 'Bearer ' + KB_KEY, 'Content-Type': 'application/json' };

// ── Category priority classification ──
// FAST: served quickly — skip "Preparing" → go straight to Ready
// SLOW: needs cooking time — goes through Preparing → Ready
const FAST_CATEGORIES = ['drinks', 'drink', 'beverage', 'beverages', 'appetizer', 'appetizers',
                          'starter', 'starters', 'soup', 'soups', 'salad', 'salads', 'snack', 'snacks'];

function isFastCategory(categoryName) {
  if (!categoryName) return false;
  return FAST_CATEGORIES.indexOf(categoryName.toLowerCase().trim()) !== -1;
}

// Given an order's items array, classify the order
// Returns: 'fast' | 'slow' | 'mixed'
function classifyOrder(items) {
  if (!items || !items.length) return 'slow';
  var hasFast = items.some(function(i) { return isFastCategory(i.category || i.cat || ''); });
  var hasSlow = items.some(function(i) { return !isFastCategory(i.category || i.cat || ''); });
  if (hasFast && hasSlow) return 'mixed';
  if (hasFast) return 'fast';
  return 'slow';
}

var lastNewCount = 0;
var allOrders    = [];
var kitMenuItems = [];
var activeFilter = 'all';
var menuTab      = 'items';

const columns = {
  new:   document.getElementById('col-new'),
  prep:  document.getElementById('col-prep'),
  ready: document.getElementById('col-ready'),
  done:  document.getElementById('col-done'),
};

// ── Sound alert ──
function playAlert() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value     = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

function getTodayISO() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
}

function getKitchenRestaurantId() {
  return (typeof getRestaurantId === 'function') ? getRestaurantId() : 'chilli-restaurant';
}

// ── Set restaurant name in topbar ──
function setRestaurantName() {
  var el   = document.getElementById('kitchenRestName');
  var name = (typeof getRestaurantName === 'function') ? getRestaurantName() : null;
  if (el && name && name !== 'Restaurant') {
    el.textContent = name;
  } else if (el) {
    var rid = getKitchenRestaurantId();
    fetch('https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/restaurants?restaurant_id=eq.' + rid + '&limit=1', {
      headers: { 'apikey': KB_KEY, 'Authorization': 'Bearer ' + KB_KEY }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) { if (data && data[0]) el.textContent = data[0].restaurant_name || rid; })
    .catch(function() { if (el) el.textContent = rid; });
  }
}

// ══════════════════════════════════════════
// ORDER FETCHING & RENDERING
// ══════════════════════════════════════════

async function fetchOrders() {
  try {
    var rid = getKitchenRestaurantId();
    var url = KB_URL +
      '?select=*' +
      '&restaurant_id=eq.' + encodeURIComponent(rid) +
      '&created_at=gte.' + encodeURIComponent(getTodayISO()) +
      '&order=created_at.desc';

    const res = await fetch(url, { headers: KB_HEADERS });
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

function renderOrders() {
  Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

  const filtered = activeFilter === 'all'
    ? allOrders
    : allOrders.filter(o => (o.status || 'new') === activeFilter);

  if (activeFilter === 'all') {
    filtered.forEach(order => {
      const status = order.status || 'new';
      const col    = columns[status];
      if (col) col.appendChild(buildCard(order));
    });
  } else {
    const col = columns[activeFilter];
    if (col) filtered.forEach(order => col.appendChild(buildCard(order)));
    Object.keys(columns).forEach(key => {
      const colEl = columns[key];
      if (!colEl) return;
      colEl.closest('.column').style.display = key === activeFilter ? 'flex' : 'none';
    });
    return;
  }

  Object.values(columns).forEach(col => {
    if (col) col.closest('.column').style.display = 'flex';
  });

  Object.keys(columns).forEach(function(key) {
    var col = columns[key];
    if (!col) return;
    if (!col.children.length) {
      var empty = document.createElement('div');
      empty.className = 'col-empty';
      empty.innerHTML = '<div class="col-empty-icon">🍽️</div><span>No orders</span>';
      col.appendChild(empty);
    }
  });
}

// ── Build order card with smart priority actions + ingredient mod display ──
function buildCard(order) {
  const status = order.status || 'new';
  let items = [];
  try { items = JSON.parse(order.items); } catch(e) {}

  // Classify order priority
  const priority = classifyOrder(items);

  // Build items HTML — show ⚡ for fast items, and ingredient mods
  const itemsHTML = items.map(function(item) {
    var cat  = item.category || item.cat || '';
    var fast = isFastCategory(cat);

    // Ingredient modification lines
    var modsHTML = '';
    if (item.removed && item.removed.length) {
      modsHTML += '<span style="display:block;font-size:0.6rem;color:#e07060;margin-top:2px">– ' + item.removed.join(', ') + '</span>';
    }
    if (item.added && item.added.length) {
      modsHTML += '<span style="display:block;font-size:0.6rem;color:#7cc47c;margin-top:2px">+ ' + item.added.join(', ') + '</span>';
    }

    return '<div class="card-item">' +
      '<span class="item-qty">\xd7' + item.quantity + '</span>' +
      '<div>' +
        '<span class="item-name-k">' + item.name + (fast ? ' <span style="color:#f59e0b;font-size:0.65rem">\u26a1</span>' : '') + '</span>' +
        (cat ? '<span class="item-note">' + cat + '</span>' : '') +
        modsHTML +
      '</div>' +
    '</div>';
  }).join('');

  const timeStr    = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mins       = Math.floor((Date.now() - new Date(order.created_at)) / 60000);
  const timerClass = mins >= 20 ? 'urgent' : mins >= 10 ? 'normal' : 'fresh';
  const timerText  = mins + 'min' + (mins >= 20 ? ' \u26a0' : '');

  // ── SMART ACTION BUTTONS based on status + priority ──
  let actionHTML = '';

  if (status === 'new') {
    if (priority === 'fast') {
      // Fast order — skip straight to Ready, or mark Preparing if they want
      actionHTML =
        '<button class="card-action ready-action" style="flex:1" onclick="updateStatus(\'' + order.id + '\',\'ready\')">\u26a1 Mark Ready</button>' +
        '<button class="card-action new-action" style="flex-shrink:0;font-size:0.62rem;padding:7px 8px" onclick="updateStatus(\'' + order.id + '\',\'prep\')" title="Mark as Preparing instead">\u2192 Prep</button>';
    } else if (priority === 'mixed') {
      // Mixed — give both options
      actionHTML =
        '<button class="card-action new-action" style="flex:1" onclick="updateStatus(\'' + order.id + '\',\'prep\')">Start Preparing \u2192</button>' +
        '<button class="card-action ready-action" style="flex-shrink:0;font-size:0.62rem;padding:7px 8px" onclick="updateStatus(\'' + order.id + '\',\'ready\')" title="Fast items ready">\u26a1 Ready</button>';
    } else {
      // Slow order — normal flow
      actionHTML = '<button class="card-action new-action" style="flex:1" onclick="updateStatus(\'' + order.id + '\',\'prep\')">Start Preparing \u2192</button>';
    }

  } else if (status === 'prep') {
    actionHTML = '<button class="card-action prep-action" style="flex:1" onclick="updateStatus(\'' + order.id + '\',\'ready\')">Mark Ready \u2713</button>';

  } else if (status === 'ready') {
    actionHTML = '<button class="card-action ready-action" style="flex:1" onclick="updateStatus(\'' + order.id + '\',\'done\')">Served \u2713</button>';

  } else if (status === 'done') {
    actionHTML = '<button class="card-action done-action" style="flex:1" disabled>Served</button>';
  }

  // Priority badge on card
  var priorityBadge = '';
  if (priority === 'fast') {
    priorityBadge = '<span style="font-size:0.55rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);padding:2px 7px;border-radius:4px">\u26a1 Fast</span>';
  } else if (priority === 'mixed') {
    priorityBadge = '<span style="font-size:0.55rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;background:rgba(168,85,247,0.1);color:#a855f7;border:1px solid rgba(168,85,247,0.25);padding:2px 7px;border-radius:4px">\u25d1 Mixed</span>';
  }

  const card = document.createElement('div');
  card.className  = 'order-card ' + status + '-card';
  card.dataset.id = order.id;
  card.innerHTML  =
    '<div class="card-head">' +
      '<span class="card-table">Table ' + (order.table_number || 'Walk-in') + '</span>' +
      '<div class="card-meta">' +
        (priorityBadge ? '<span>' + priorityBadge + '</span>' : '') +
        '<span class="card-time">' + timeStr + '</span>' +
        '<span class="card-timer ' + timerClass + '">' + timerText + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="card-items">' + itemsHTML + '</div>' +
    '<div class="card-foot">' +
      '<span class="card-order-id">#' + String(order.id).slice(0, 6) + '</span>' +
      '<div style="display:flex;gap:5px;flex:1;justify-content:flex-end">' + actionHTML + '</div>' +
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

// ── Update stats strip ──
function updateStats() {
  const count = {
    new:   allOrders.filter(o => (o.status || 'new') === 'new').length,
    prep:  allOrders.filter(o => o.status === 'prep').length,
    ready: allOrders.filter(o => o.status === 'ready').length,
    done:  allOrders.filter(o => o.status === 'done').length,
  };

  const stripNums = document.querySelectorAll('.strip-num');
  if (stripNums[0]) stripNums[0].textContent = count.new;
  if (stripNums[1]) stripNums[1].textContent = count.prep;
  if (stripNums[2]) stripNums[2].textContent = count.ready;
  if (stripNums[3]) stripNums[3].textContent = count.done;
  if (stripNums[4]) stripNums[4].textContent = allOrders.length;

  const colCounts = document.querySelectorAll('.col-count');
  if (colCounts[0]) colCounts[0].textContent = count.new;
  if (colCounts[1]) colCounts[1].textContent = count.prep;
  if (colCounts[2]) colCounts[2].textContent = count.ready;
  if (colCounts[3]) colCounts[3].textContent = count.done;

  const tabCounts = document.querySelectorAll('.status-tab .count');
  if (tabCounts[0]) tabCounts[0].textContent = allOrders.length;
  if (tabCounts[1]) tabCounts[1].textContent = count.new;
  if (tabCounts[2]) tabCounts[2].textContent = count.prep;
  if (tabCounts[3]) tabCounts[3].textContent = count.ready;
  if (tabCounts[4]) tabCounts[4].textContent = count.done;
}

// ══════════════════════════════════════════
// MENU PANEL
// ══════════════════════════════════════════

// Category sort order for menu panel: fast categories first
var FAST_CATS_KIT = ['drinks','drink','beverage','beverages','appetizer','appetizers',
                     'starter','starters','soup','soups','salad','salads','snack','snacks'];
function isFastCatKit(cat) {
  return FAST_CATS_KIT.indexOf((cat||'').toLowerCase().trim()) !== -1;
}

function openMenuPanel() {
  document.getElementById('menuPanelOverlay').classList.add('open');
  switchMenuTab('items');
  loadKitchenMenu();
}

function closeMenuPanel() {
  document.getElementById('menuPanelOverlay').classList.remove('open');
}

function switchMenuTab(tab) {
  menuTab = tab;
  document.getElementById('tabItems').classList.toggle('active', tab === 'items');
  document.getElementById('tabAdd').classList.toggle('active',   tab === 'add');
  if (tab === 'items') renderKitchenMenuItems();
  else renderAddItemForm();
}

async function loadKitchenMenu() {
  var rid = getKitchenRestaurantId();
  try {
    var res = await fetch(KB_MENU_URL + '?restaurant_id=eq.' + rid + '&order=category.asc', { headers: KB_HEADERS });
    kitMenuItems = await res.json();
    if (menuTab === 'items') renderKitchenMenuItems();
  } catch(e) { console.error('Menu load:', e); }
}

function renderKitchenMenuItems() {
  var body = document.getElementById('menuPanelBody');
  if (!kitMenuItems.length) {
    body.innerHTML = '<div class="empty-state"><div>🍽️</div>No menu items yet.<br>Use the Add Item tab to add your first item.</div>';
    return;
  }

  // Group by category
  var catMap = {};
  kitMenuItems.forEach(function(item) {
    var c = item.category || 'Other';
    if (!catMap[c]) catMap[c] = [];
    catMap[c].push(item);
  });

  // Sort: FAST categories first, SLOW last
  var allCats = Object.keys(catMap);
  allCats.sort(function(a, b) {
    var af = isFastCatKit(a);
    var bf = isFastCatKit(b);
    if (af && !bf) return -1;
    if (!af && bf) return 1;
    return a.localeCompare(b);
  });

  var html = '';
  allCats.forEach(function(cat) {
    var fast = isFastCatKit(cat);
    html += '<div style="font-size:0.6rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:' +
      (fast ? '#f59e0b' : '#555') +
      ';padding:10px 0 6px;display:flex;align-items:center;gap:6px">' +
      (fast ? '\u26a1 ' : '') + cat +
      (fast ? ' <span style="font-size:0.5rem;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);padding:1px 5px;border-radius:4px;color:#f59e0b">Fast</span>' : '') +
      '</div>';
    catMap[cat].forEach(function(item) {
      var avail = item.is_available !== false;
      var thumb = item.image_url
        ? '<img src="' + item.image_url + '" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'">'
        : '🍽️';
      html +=
        '<div class="kit-menu-item' + (avail ? '' : ' soldout') + '">' +
          '<div class="kit-item-thumb">' + thumb + '</div>' +
          '<div class="kit-item-info">' +
            '<div class="kit-item-name">' + item.name + '</div>' +
            '<div class="kit-item-cat">' + item.category + '</div>' +
          '</div>' +
          '<div class="kit-item-price">' + Number(item.price).toLocaleString() + '</div>' +
          '<div class="kit-item-actions">' +
            '<button class="avail-toggle ' + (avail ? 'available' : 'soldout') + '" ' +
              'onclick="kitToggleAvail(' + item.id + ',' + avail + ')">' +
              (avail ? 'In Stock' : 'Sold Out') +
            '</button>' +
            '<button class="kit-del-btn" onclick="kitDeleteItem(' + item.id + ',\'' + item.name.replace(/'/g, "\\'") + '\')">🗑</button>' +
          '</div>' +
        '</div>';
    });
  });

  body.innerHTML = html;
}

async function kitToggleAvail(itemId, current) {
  try {
    var res = await fetch(KB_MENU_URL + '?id=eq.' + itemId, {
      method: 'PATCH',
      headers: KB_HEADERS,
      body: JSON.stringify({ is_available: !current })
    });
    if (!res.ok) throw new Error();
    var item = kitMenuItems.find(function(i) { return i.id === itemId; });
    if (item) item.is_available = !current;
    renderKitchenMenuItems();
    kitToast(current ? '🔴 Marked as Sold Out' : '🟢 Marked as Available');
  } catch(e) { kitToast('Error updating item'); }
}

async function kitDeleteItem(itemId, itemName) {
  if (!confirm('Remove "' + itemName + '" from the menu?')) return;
  try {
    var res = await fetch(KB_MENU_URL + '?id=eq.' + itemId, {
      method: 'DELETE', headers: KB_HEADERS
    });
    if (!res.ok) throw new Error();
    kitMenuItems = kitMenuItems.filter(function(i) { return i.id !== itemId; });
    renderKitchenMenuItems();
    kitToast('"' + itemName + '" removed \u2713');
  } catch(e) { kitToast('Error removing item'); }
}

function renderAddItemForm() {
  var cats = ['Drinks', 'Appetizer', 'Main Course', 'Dessert'];
  kitMenuItems.forEach(function(i) { if (i.category && cats.indexOf(i.category) === -1) cats.push(i.category); });
  var catOptions = cats.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');

  document.getElementById('menuPanelBody').innerHTML =
    '<div class="add-item-form">' +
      '<div class="kit-form-group">' +
        '<label class="kit-form-label">Item Name</label>' +
        '<input type="text" class="kit-form-input" id="kitInputName" placeholder="e.g. Grilled Salmon">' +
      '</div>' +
      '<div class="kit-form-row">' +
        '<div class="kit-form-group">' +
          '<label class="kit-form-label">Category</label>' +
          '<select class="kit-form-select" id="kitInputCat">' + catOptions + '</select>' +
        '</div>' +
        '<div class="kit-form-group">' +
          '<label class="kit-form-label">Price (RWF)</label>' +
          '<input type="number" class="kit-form-input" id="kitInputPrice" placeholder="e.g. 12000">' +
        '</div>' +
      '</div>' +
      '<div class="kit-form-group">' +
        '<label class="kit-form-label">Description (optional)</label>' +
        '<textarea class="kit-form-textarea" id="kitInputDesc" placeholder="Short description..."></textarea>' +
      '</div>' +
      '<div class="kit-form-group">' +
        '<label class="kit-form-label">Photo URL (optional)</label>' +
        '<input type="url" class="kit-form-input" id="kitInputImg" placeholder="https://...">' +
      '</div>' +
      '<div style="font-size:0.68rem;color:#666;padding:8px 10px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:6px;line-height:1.6">' +
        '\u26a1 <strong style="color:#f59e0b">Tip:</strong> Categories like <em>Drinks</em> and <em>Appetizer</em> are marked Fast — orders skip the Preparing step and go straight to Ready.' +
      '</div>' +
      '<button class="kit-save-btn" id="kitSaveBtn" onclick="kitSaveItem()">Add to Menu \u2192</button>' +
    '</div>';
}

async function kitSaveItem() {
  var name  = (document.getElementById('kitInputName')  || {value:''}).value.trim();
  var cat   = (document.getElementById('kitInputCat')   || {value:'Main Course'}).value;
  var price = (document.getElementById('kitInputPrice') || {value:''}).value.trim();
  var desc  = (document.getElementById('kitInputDesc')  || {value:''}).value.trim();
  var img   = (document.getElementById('kitInputImg')   || {value:''}).value.trim();

  if (!name)                  { kitToast('Please enter an item name'); return; }
  if (!price || isNaN(price)) { kitToast('Please enter a valid price'); return; }

  var btn = document.getElementById('kitSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var payload = {
    name: name, category: cat, price: parseInt(price),
    description: desc, restaurant_id: getKitchenRestaurantId(),
    is_available: true
  };
  if (img) payload.image_url = img;

  try {
    var res = await fetch(KB_MENU_URL, {
      method: 'POST', headers: KB_HEADERS, body: JSON.stringify(payload)
    });
    if (res.ok) {
      kitToast('"' + name + '" added \u2713');
      await loadKitchenMenu();
      switchMenuTab('items');
    } else {
      var errTxt = await res.text();
      kitToast('Error: ' + errTxt.slice(0, 60));
      if (btn) { btn.disabled = false; btn.textContent = 'Add to Menu \u2192'; }
    }
  } catch(e) {
    kitToast('Network error');
    if (btn) { btn.disabled = false; btn.textContent = 'Add to Menu \u2192'; }
  }
}

function kitToast(msg) {
  var t = document.getElementById('kitToast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._kt);
  t._kt = setTimeout(function() { t.style.display = 'none'; }, 2800);
}

// ══════════════════════════════════════════
// FILTER TABS
// ══════════════════════════════════════════

document.querySelectorAll('.status-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.status-tab').forEach(function(t) { t.classList.remove('on'); });
    this.classList.add('on');
    if (this.classList.contains('new'))         activeFilter = 'new';
    else if (this.classList.contains('prep'))   activeFilter = 'prep';
    else if (this.classList.contains('ready'))  activeFilter = 'ready';
    else if (this.classList.contains('served')) activeFilter = 'done';
    else activeFilter = 'all';
    renderOrders();
  });
});

// ── Live Clock ──
function updateClock() {
  var el = document.getElementById('clock');
  if (!el) return;
  var now = new Date();
  el.textContent =
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
updateClock();
setInterval(updateClock, 1000);
setRestaurantName();
fetchOrders();
setInterval(fetchOrders, 10000);
