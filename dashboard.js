// ── dashboard.js ── Complete Table Tap Dashboard

const DB_URL     = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/menu_items';
const ORDERS_URL = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/orders';
const DB_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';
const DB_HEADERS = { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };
const RESTAURANT_ID = 'chilli-restaurant';

var editingId     = null;
var allItems      = [];
var activeSection = 'overview';
var sidebarOpen   = true;

// ══════════════════════════════════════════
// SECTION NAVIGATION
// ══════════════════════════════════════════

function showSection(name, clickedEl) {
  activeSection = name;
  document.querySelectorAll('.page-section').forEach(function(s) { s.classList.remove('active'); });
  var sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (clickedEl) clickedEl.classList.add('active');
  else {
    // find matching nav item by onclick content
    document.querySelectorAll('.nav-item').forEach(function(n) {
      if (n.getAttribute('onclick') && n.getAttribute('onclick').indexOf("'" + name + "'") !== -1) {
        n.classList.add('active');
      }
    });
  }
  if (name === 'orders')   loadAllOrders();
  if (name === 'menu')     loadMenuSection();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════
// SIDEBAR TOGGLE
// ══════════════════════════════════════════

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var main    = document.querySelector('.main');
  var openBtn = document.getElementById('sidebarToggleBtn');
  var colBtn  = document.getElementById('collapseBtn');
  sidebarOpen = !sidebarOpen;
  if (sidebarOpen) {
    sidebar.style.transform = 'translateX(0)';
    main.style.marginLeft   = '240px';
    if (openBtn) openBtn.classList.remove('show');
    if (colBtn)  colBtn.textContent = '← Hide Sidebar';
  } else {
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.style.transition = 'transform 0.3s ease';
    main.style.marginLeft   = '0';
    main.style.transition   = 'margin-left 0.3s ease';
    if (openBtn) openBtn.classList.add('show');
    if (colBtn)  colBtn.textContent = '→ Show Sidebar';
  }
}

// ══════════════════════════════════════════
// LOAD MENU — OVERVIEW TABLE
// ══════════════════════════════════════════

async function loadDashboardMenu() {
  try {
    var res = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&order=category.asc', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    allItems = await res.json();
    renderMenuTable(allItems, 'menuTableBody', 'all');
    updateFilterBtns(allItems, '.menu-filters .filter-btn');
    var sub = document.querySelector('.panel-sub');
    if (sub) sub.textContent = allItems.length + ' items across 4 categories';
    // Update menu stat
    var statVals = document.querySelectorAll('.stat-value');
    if (statVals[2]) statVals[2].textContent = allItems.length;
  } catch(err) { console.error('Load menu error:', err); }
}

function renderMenuTable(items, tbodyId, filterCat) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  var filtered = filterCat === 'all' ? items : items.filter(function(i) { return i.category === filterCat; });
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--muted);font-size:0.82rem">No items found</td></tr>';
    return;
  }
  filtered.forEach(function(item) {
    var isAvail = item.is_available !== false;
    var thumb   = item.image_url
      ? '<img src="' + item.image_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.style.display=\'none\'">'
      : '🍽️';
    var row = document.createElement('tr');
    row.innerHTML =
      '<td><div class="item-cell">' +
        '<div class="item-thumb" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.2rem">' + thumb + '</div>' +
        '<div><div class="item-name">' + item.name + '</div><div class="item-cat">' + item.category + '</div></div>' +
      '</div></td>' +
      '<td><span style="font-size:0.72rem;color:var(--muted)">' + item.category + '</span></td>' +
      '<td><span class="price-cell">' + Number(item.price).toLocaleString() + '</span></td>' +
      '<td><span class="status-badge ' + (isAvail ? 'available' : 'soldout') + '" style="cursor:pointer" onclick="toggleStatus(' + item.id + ',' + isAvail + ')">' + (isAvail ? 'Available' : 'Sold Out') + '</span></td>' +
      '<td><div class="row-actions" style="opacity:1">' +
        '<button class="row-btn" onclick="openEditModal(' + item.id + ')">✏️</button>' +
        '<button class="row-btn del" onclick="deleteItem(' + item.id + ',\'' + item.name.replace(/'/g, "\\'") + '\')">🗑️</button>' +
      '</div></td>';
    tbody.appendChild(row);
  });
}

function updateFilterBtns(items, selector) {
  var counts = {
    all: items.length,
    Drinks: items.filter(function(i){ return i.category==='Drinks'; }).length,
    Appetizer: items.filter(function(i){ return i.category==='Appetizer'; }).length,
    'Main Course': items.filter(function(i){ return i.category==='Main Course'; }).length,
    Dessert: items.filter(function(i){ return i.category==='Dessert'; }).length
  };
  var btns = document.querySelectorAll(selector);
  if (btns[0]) btns[0].textContent = 'All (' + counts.all + ')';
  if (btns[1]) btns[1].textContent = 'Drinks (' + counts.Drinks + ')';
  if (btns[2]) btns[2].textContent = 'Appetizer (' + counts.Appetizer + ')';
  if (btns[3]) btns[3].textContent = 'Main (' + counts['Main Course'] + ')';
  if (btns[4]) btns[4].textContent = 'Dessert (' + counts.Dessert + ')';
}

// Overview filter buttons
document.querySelectorAll('.menu-filters .filter-btn').forEach(function(btn, i) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.menu-filters .filter-btn').forEach(function(b) { b.classList.remove('on'); });
    btn.classList.add('on');
    var cats = ['all','Drinks','Appetizer','Main Course','Dessert'];
    renderMenuTable(allItems, 'menuTableBody', cats[i] || 'all');
  });
});

// ══════════════════════════════════════════
// LOAD MENU — MENU SECTION
// ══════════════════════════════════════════

async function loadMenuSection() {
  try {
    var res   = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&order=category.asc', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var items = await res.json();
    var sub   = document.getElementById('menuSecSub');
    if (sub) sub.textContent = items.length + ' items total';
    renderMenuTable(items, 'menuSecBody', 'all');
    updateFilterBtns(items, '#menuSecFilters .filter-btn');

    // Wire menu section filter buttons
    document.querySelectorAll('#menuSecFilters .filter-btn').forEach(function(btn, i) {
      // Remove old listeners by cloning
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', function() {
        document.querySelectorAll('#menuSecFilters .filter-btn').forEach(function(b) { b.classList.remove('on'); });
        newBtn.classList.add('on');
        var cats = ['all','Drinks','Appetizer','Main Course','Dessert'];
        renderMenuTable(items, 'menuSecBody', cats[i] || 'all');
      });
    });
  } catch(err) { console.error('Menu section error:', err); }
}

// ══════════════════════════════════════════
// LIVE ORDERS — OVERVIEW PANEL
// ══════════════════════════════════════════

async function loadLiveOrders() {
  var list = document.getElementById('liveOrdersList');
  var sub  = document.getElementById('liveOrdersSub');
  if (!list) return;
  try {
    var res    = await fetch(ORDERS_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&order=created_at.desc&limit=8', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var orders = await res.json();
    var active = orders.filter(function(o) { return o.status !== 'done'; }).length;
    if (sub)  sub.textContent = active + ' active right now';

    var badge = document.getElementById('navBadge');
    if (badge) badge.textContent = active;

    // Update stats
    var sv = document.querySelectorAll('.stat-value');
    if (sv[0]) sv[0].textContent = orders.length;
    var rev = orders.reduce(function(s,o){ return s+(o.total||0); }, 0);
    if (sv[1]) sv[1].textContent = rev >= 1000 ? Math.round(rev/1000)+'k' : rev.toLocaleString();

    list.innerHTML = '';
    if (!orders.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.82rem">No orders yet</div>';
      return;
    }
    orders.forEach(function(order) {
      var status = order.status || 'new';
      var items  = []; try { items = JSON.parse(order.items); } catch(e) {}
      var names  = items.slice(0,2).map(function(i){ return i.name; }).join(' + ');
      if (items.length > 2) names += ' +' + (items.length-2) + ' more';
      var mins   = Math.floor((Date.now() - new Date(order.created_at)) / 60000);
      var ago    = mins < 1 ? 'Just now' : mins < 60 ? mins+'m ago' : Math.floor(mins/60)+'h ago';
      var labels = { new:'New', prep:'Preparing', ready:'Ready', done:'Served' };
      var el = document.createElement('div');
      el.className = 'order-item';
      el.innerHTML =
        '<div class="order-table-badge">T'+(order.table_number||'?')+'</div>' +
        '<div class="order-info"><div class="order-name">'+(names||'Order')+'</div>' +
        '<div class="order-meta">'+ago+' · '+items.length+' item'+(items.length!==1?'s':'')+'</div></div>' +
        '<div class="order-status">' +
          '<span class="order-price">'+(order.total||0).toLocaleString()+'</span>' +
          '<span class="order-badge '+status+'">'+(labels[status]||'New')+'</span>' +
        '</div>';
      list.appendChild(el);
    });
  } catch(err) { console.error('Live orders error:', err); }
}

// ══════════════════════════════════════════
// ALL ORDERS SECTION
// ══════════════════════════════════════════

async function loadAllOrders() {
  var list = document.getElementById('allOrdersList');
  var sub  = document.getElementById('allOrdersSub');
  if (!list) return;
  list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.85rem">Loading...</div>';
  try {
    var res    = await fetch(ORDERS_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&order=created_at.desc', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var orders = await res.json();
    if (sub) sub.textContent = orders.length + ' total orders';
    list.innerHTML = '';
    if (!orders.length) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.85rem">No orders yet</div>';
      return;
    }
    orders.forEach(function(order) {
      var status = order.status || 'new';
      var items  = []; try { items = JSON.parse(order.items); } catch(e) {}
      var names  = items.map(function(i){ return i.name+' ×'+i.quantity; }).join(', ');
      var dt     = new Date(order.created_at);
      var dtStr  = dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var labels = { new:'New', prep:'Preparing', ready:'Ready', done:'Served' };
      var el = document.createElement('div');
      el.className = 'orders-full-item';
      el.innerHTML =
        '<div class="order-table-badge" style="flex-shrink:0">T'+(order.table_number||'?')+'</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:0.82rem;font-weight:600;color:var(--ink);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(names||'Order #'+order.id)+'</div>' +
          '<div style="font-size:0.7rem;color:var(--muted)">'+dtStr+'</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">' +
          '<span style="font-family:var(--font-d);font-size:0.88rem;font-weight:600;color:var(--ink)">'+(order.total||0).toLocaleString()+' RWF</span>' +
          '<span class="order-badge '+status+'">'+(labels[status]||'New')+'</span>' +
        '</div>';
      list.appendChild(el);
    });
  } catch(err) { console.error('All orders error:', err); }
}

// ══════════════════════════════════════════
// MODAL — ADD / EDIT
// ══════════════════════════════════════════

function openModal() {
  editingId = null;
  clearForm();
  var t = document.getElementById('modalTitle');
  var b = document.getElementById('saveBtn');
  if (t) t.textContent = 'Add Menu Item';
  if (b) b.textContent = 'Save Item';
  document.querySelector('.modal-overlay').classList.add('open');
}

async function openEditModal(itemId) {
  editingId = itemId;
  try {
    var res  = await fetch(DB_URL + '?id=eq.' + itemId, { headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY } });
    var data = await res.json();
    if (!data.length) return;
    var item = data[0];
    document.getElementById('inputName').value     = item.name        || '';
    document.getElementById('inputCategory').value = item.category    || 'Main Course';
    document.getElementById('inputDesc').value     = item.description || '';
    document.getElementById('inputPrice').value    = item.price       || '';
    document.getElementById('inputBadge').value    = item.badge       || 'None';
    var imgEl = document.getElementById('inputImage');
    if (imgEl) { imgEl.value = item.image_url || ''; previewImg(item.image_url || ''); }
    var t = document.getElementById('modalTitle');
    var b = document.getElementById('saveBtn');
    if (t) t.textContent = 'Edit Menu Item';
    if (b) b.textContent = 'Update Item';
    document.querySelector('.modal-overlay').classList.add('open');
  } catch(err) { console.error('Edit error:', err); }
}

function closeModal() {
  document.querySelector('.modal-overlay').classList.remove('open');
  editingId = null;
  clearForm();
}

function clearForm() {
  ['inputName','inputDesc','inputPrice','inputImage'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var cat = document.getElementById('inputCategory');
  var bdg = document.getElementById('inputBadge');
  if (cat) cat.value = 'Main Course';
  if (bdg) bdg.value = 'None';
  previewImg('');
}

function previewImg(url) {
  var wrap = document.getElementById('imgPreviewWrap');
  var img  = document.getElementById('imgPreview');
  if (!wrap || !img) return;
  if (url) { img.src = url; wrap.style.display = 'block'; img.onerror = function(){ wrap.style.display='none'; }; }
  else wrap.style.display = 'none';
}

// Wire image input live preview
document.addEventListener('DOMContentLoaded', function() {
  var imgInput = document.getElementById('inputImage');
  if (imgInput) imgInput.addEventListener('input', function() { previewImg(this.value); });
});

async function saveItem() {
  var name  = document.getElementById('inputName').value.trim();
  var cat   = document.getElementById('inputCategory').value;
  var desc  = document.getElementById('inputDesc').value.trim();
  var price = document.getElementById('inputPrice').value.trim();
  var badge = document.getElementById('inputBadge').value;
  var imgEl = document.getElementById('inputImage');
  var imgUrl = imgEl ? imgEl.value.trim() : '';

  if (!name)             { alert('Please enter an item name.'); return; }
  if (!price||isNaN(price)) { alert('Please enter a valid price.'); return; }

  var payload = { name:name, category:cat, description:desc, price:parseInt(price), badge:badge, restaurant_id:RESTAURANT_ID };
  if (imgUrl) payload.image_url = imgUrl;

  var btn = document.getElementById('saveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    var res;
    if (editingId) {
      res = await fetch(DB_URL + '?id=eq.' + editingId, { method:'PATCH', headers:DB_HEADERS, body:JSON.stringify(payload) });
    } else {
      res = await fetch(DB_URL, { method:'POST', headers:DB_HEADERS, body:JSON.stringify(payload) });
    }
    if (res.ok) {
      closeModal();
      loadDashboardMenu();
      if (activeSection === 'menu') loadMenuSection();
      showToast(editingId ? '"'+name+'" updated \u2713' : '"'+name+'" added \u2713');
    } else {
      var err = await res.text();
      console.error('Save error:', err);
      alert('Error: ' + err);
      if (btn) { btn.disabled = false; btn.textContent = editingId ? 'Update Item' : 'Save Item'; }
    }
  } catch(err) {
    console.error('Save error:', err);
    if (btn) { btn.disabled = false; btn.textContent = editingId ? 'Update Item' : 'Save Item'; }
  }
}

async function deleteItem(itemId, itemName) {
  if (!confirm('Remove "'+itemName+'" from the menu?')) return;
  try {
    var res = await fetch(DB_URL + '?id=eq.' + itemId, { method:'DELETE', headers:DB_HEADERS });
    if (res.ok) {
      loadDashboardMenu();
      if (activeSection === 'menu') loadMenuSection();
      showToast('"'+itemName+'" removed');
    }
  } catch(err) { console.error('Delete error:', err); }
}

async function toggleStatus(itemId, currentStatus) {
  try {
    await fetch(DB_URL + '?id=eq.' + itemId, { method:'PATCH', headers:DB_HEADERS, body:JSON.stringify({ is_available: !currentStatus }) });
    loadDashboardMenu();
    if (activeSection === 'menu') loadMenuSection();
    showToast('Status updated \u2713');
  } catch(err) { console.error('Toggle error:', err); }
}

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════

function toggleNotif() {
  var dd  = document.getElementById('notifDropdown');
  var dot = document.getElementById('notifDot');
  if (!dd) return;
  dd.classList.toggle('open');
  if (dd.classList.contains('open') && dot) dot.style.display = 'none';
}

function clearNotifs() {
  var body = document.getElementById('notifBody');
  if (body) body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.8rem">No new notifications</div>';
  var dot  = document.getElementById('notifDot');
  if (dot) dot.style.display = 'none';
}

document.addEventListener('click', function(e) {
  var wrapper = document.querySelector('.notif-wrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    var dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.remove('open');
  }
});

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════

function showToast(msg) {
  var ex = document.getElementById('dashToast'); if (ex) ex.remove();
  var t  = document.createElement('div');
  t.id   = 'dashToast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 24px;border-radius:8px;font-size:0.82rem;font-weight:500;font-family:var(--font-b);border:1px solid var(--border);box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:9999';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(function(){ if(t.parentNode) t.remove(); },300); }, 3000);
}

// ══════════════════════════════════════════
// INITIALIZE
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  // Show logged in user
  if (typeof getCurrentUser === 'function') {
    var email = getCurrentUser();
    var userP = document.querySelector('.user-info p:last-child');
    if (userP && email) userP.textContent = email;
  }

  loadDashboardMenu();
  loadLiveOrders();
  setInterval(loadLiveOrders, 15000);
});

// ══════════════════════════════════════════
// PHOTO UPLOAD
// ══════════════════════════════════════════

var uploadedImageBase64 = '';

function switchPhotoTab(tab) {
  var uploadArea = document.getElementById('photoUploadArea');
  var urlArea    = document.getElementById('photoUrlArea');
  var tabUpload  = document.getElementById('tabUpload');
  var tabUrl     = document.getElementById('tabUrl');

  if (tab === 'upload') {
    uploadArea.style.display = 'block';
    urlArea.style.display    = 'none';
    tabUpload.style.borderColor  = 'var(--accent)';
    tabUpload.style.background   = 'var(--accent2)';
    tabUpload.style.color        = 'var(--accent)';
    tabUrl.style.borderColor = 'var(--border)';
    tabUrl.style.background  = 'transparent';
    tabUrl.style.color       = 'var(--muted)';
  } else {
    uploadArea.style.display = 'none';
    urlArea.style.display    = 'block';
    tabUrl.style.borderColor    = 'var(--accent)';
    tabUrl.style.background     = 'var(--accent2)';
    tabUrl.style.color          = 'var(--accent)';
    tabUpload.style.borderColor = 'var(--border)';
    tabUpload.style.background  = 'transparent';
    tabUpload.style.color       = 'var(--muted)';
  }
}

function handleFileUpload(input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('Image too large. Max 5MB.'); return; }

  var reader = new FileReader();
  reader.onload = function(e) {
    uploadedImageBase64 = e.target.result; // base64 data URL
    previewImg(uploadedImageBase64);
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  uploadedImageBase64 = '';
  var fileInput = document.getElementById('inputImageFile');
  var urlInput  = document.getElementById('inputImage');
  if (fileInput) fileInput.value = '';
  if (urlInput)  urlInput.value  = '';
  previewImg('');
}

// ══════════════════════════════════════════
// CATEGORIES MANAGEMENT
// ══════════════════════════════════════════

// Default categories — loaded from existing items
var customCategories = ['Drinks', 'Appetizer', 'Main Course', 'Dessert'];

async function loadCategories() {
  // Load categories from existing menu items
  try {
    var res   = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&select=category', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var items = await res.json();
    var found = [];
    items.forEach(function(i) {
      if (i.category && found.indexOf(i.category) === -1) found.push(i.category);
    });
    if (found.length > 0) customCategories = found;
  } catch(e) {}

  // Add defaults if missing
  ['Drinks','Appetizer','Main Course','Dessert'].forEach(function(c) {
    if (customCategories.indexOf(c) === -1) customCategories.push(c);
  });

  renderCategoriesList();
  syncCategoryDropdowns();
}

function renderCategoriesList() {
  var list = document.getElementById('categoriesList');
  if (!list) return;
  list.innerHTML = '';

  customCategories.forEach(function(cat) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--border);transition:background 0.15s';
    row.onmouseover = function(){ row.style.background = 'var(--bg)'; };
    row.onmouseout  = function(){ row.style.background = 'transparent'; };
    row.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="width:36px;height:36px;background:var(--accent2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏷️</div>' +
        '<div>' +
          '<div style="font-weight:600;font-size:0.85rem;color:var(--ink)">' + cat + '</div>' +
          '<div style="font-size:0.7rem;color:var(--muted)" id="catCount-' + cat.replace(/\s/g,'_') + '">Loading...</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="openEditCategory(\'' + cat.replace(/'/g,"\\'") + '\')" class="row-btn">✏️</button>' +
        '<button onclick="deleteCategory(\'' + cat.replace(/'/g,"\\'") + '\')" class="row-btn del">🗑️</button>' +
      '</div>';
    list.appendChild(row);

    // Load count for this category
    loadCategoryCount(cat);
  });
}

async function loadCategoryCount(cat) {
  try {
    var res   = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&category=eq.' + encodeURIComponent(cat) + '&select=id', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var items = await res.json();
    var el = document.getElementById('catCount-' + cat.replace(/\s/g,'_'));
    if (el) el.textContent = items.length + ' items';
  } catch(e) {}
}

function syncCategoryDropdowns() {
  // Update all category dropdowns in modals
  ['inputCategory'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '';
    customCategories.forEach(function(cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === current) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

function openAddCategory() {
  document.getElementById('catModalTitle').textContent = 'Add Category';
  document.getElementById('inputCatName').value = '';
  document.getElementById('editingCatOldName').value = '';
  document.getElementById('catModalOverlay').style.display = 'flex';
}

function openEditCategory(oldName) {
  document.getElementById('catModalTitle').textContent = 'Rename Category';
  document.getElementById('inputCatName').value = oldName;
  document.getElementById('editingCatOldName').value = oldName;
  document.getElementById('catModalOverlay').style.display = 'flex';
}

function closeCatModal() {
  document.getElementById('catModalOverlay').style.display = 'none';
}

async function saveCategory() {
  var newName = document.getElementById('inputCatName').value.trim();
  var oldName = document.getElementById('editingCatOldName').value;
  if (!newName) { alert('Please enter a category name.'); return; }

  if (oldName) {
    // Rename — update all items with old category name
    var idx = customCategories.indexOf(oldName);
    if (idx !== -1) customCategories[idx] = newName;
    try {
      await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&category=eq.' + encodeURIComponent(oldName), {
        method: 'PATCH', headers: DB_HEADERS, body: JSON.stringify({ category: newName })
      });
      showToast('Category renamed to "' + newName + '" \u2713');
    } catch(e) { console.error(e); }
  } else {
    // Add new
    if (customCategories.indexOf(newName) !== -1) { alert('Category already exists.'); return; }
    customCategories.push(newName);
    showToast('Category "' + newName + '" added \u2713');
  }

  closeCatModal();
  renderCategoriesList();
  syncCategoryDropdowns();
  loadDashboardMenu();
}

async function deleteCategory(catName) {
  var count = 0;
  try {
    var res   = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&category=eq.' + encodeURIComponent(catName) + '&select=id', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    var items = await res.json();
    count = items.length;
  } catch(e) {}

  var msg = count > 0
    ? 'Remove "' + catName + '"? This category has ' + count + ' items. They will still exist but show under this category.'
    : 'Remove "' + catName + '"?';

  if (!confirm(msg)) return;
  customCategories = customCategories.filter(function(c) { return c !== catName; });
  renderCategoriesList();
  syncCategoryDropdowns();
  showToast('"' + catName + '" removed from categories');
}

// ══════════════════════════════════════════
// PATCH saveItem TO HANDLE BASE64 IMAGES
// ══════════════════════════════════════════

// Override the saveItem to handle base64
var _originalSaveItem = saveItem;
saveItem = async function() {
  // Get image source — either base64 from file or URL
  var imgUrl = '';
  var urlInput = document.getElementById('inputImage');
  if (uploadedImageBase64) {
    imgUrl = uploadedImageBase64;
  } else if (urlInput && urlInput.value.trim()) {
    imgUrl = urlInput.value.trim();
  }

  // Temporarily set inputImage value so original saveItem picks it up
  if (!urlInput) {
    // create hidden input
    var inp = document.createElement('input');
    inp.id = 'inputImage';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  document.getElementById('inputImage').value = imgUrl;

  await _originalSaveItem();
};

// ══════════════════════════════════════════
// PATCH clearForm TO ALSO CLEAR PHOTO
// ══════════════════════════════════════════

var _originalClearForm = clearForm;
clearForm = function() {
  _originalClearForm();
  uploadedImageBase64 = '';
  var fileInput = document.getElementById('inputImageFile');
  if (fileInput) fileInput.value = '';
  switchPhotoTab('upload');
};

// ══════════════════════════════════════════
// LOAD CATEGORIES ON INIT
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  loadCategories();
});
