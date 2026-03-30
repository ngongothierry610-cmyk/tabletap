// ── dashboard.js ── Complete Table Tap Dashboard

const DB_URL     = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/menu_items';
const ORDERS_URL = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/orders';
const REST_URL   = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/restaurants';
const DB_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';
const DB_HEADERS = { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' };

var RESTAURANT_ID = (typeof getRestaurantId === 'function') ? getRestaurantId() : 'chilli-restaurant';
var CURRENT_PLAN  = (typeof getPlan === 'function') ? getPlan() : 'starter';

// Plan limits
var PLAN_LIMITS = {
  starter:  { maxItems: 15, analytics: false, appearance: false, orders: false },
  pro:      { maxItems: Infinity, analytics: true,  appearance: true,  orders: true  },
  business: { maxItems: Infinity, analytics: true,  appearance: true,  orders: true  }
};
function getPlanLimit(feature) {
  return (PLAN_LIMITS[CURRENT_PLAN] || PLAN_LIMITS.starter)[feature];
}

var editingId      = null;
var allItems       = [];
var activeSection  = 'overview';
var sidebarOpen    = true;
var uploadedBase64 = '';
var customCats     = [];
var _currentMenuUrl = 'https://tabletap-demo.netlify.app/menu.html';

// ══════════════════════════════════════════
// SECTION NAVIGATION
// ══════════════════════════════════════════
function showSection(name, el) {
  activeSection = name;
  document.querySelectorAll('.page-section').forEach(function(s) { s.classList.remove('active'); });
  var sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(function(n) {
      if ((n.getAttribute('onclick')||'').indexOf("'"+name+"'") !== -1) n.classList.add('active');
    });
  }
  if (name === 'orders')     loadAllOrders();
  if (name === 'menu')       loadMenuSection();
  if (name === 'categories') loadCategories();
  if (name === 'analytics')  loadAnalytics();
  if (name === 'activity')   loadActivitySection();
  if (name === 'appearance') loadAppearance();
  if (name === 'settings')   loadSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════
// SIDEBAR TOGGLE
// ══════════════════════════════════════════
function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var main    = document.querySelector('.main');
  var openBtn = document.getElementById('sidebarToggleBtn');
  sidebarOpen = !sidebarOpen;
  sidebar.style.transition = 'transform 0.3s ease';
  main.style.transition    = 'margin-left 0.3s ease';
  if (sidebarOpen) {
    sidebar.style.transform = 'translateX(0)';
    main.style.marginLeft   = '240px';
    if (openBtn) openBtn.classList.remove('show');
  } else {
    sidebar.style.transform = 'translateX(-100%)';
    main.style.marginLeft   = '0';
    if (openBtn) openBtn.classList.add('show');
  }
}

// ══════════════════════════════════════════
// OVERVIEW STATS (real data from DB)
// ══════════════════════════════════════════
async function loadOverviewStats() {
  try {
    var todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    var res = await fetch(
      ORDERS_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&created_at=gte.' + encodeURIComponent(todayStart.toISOString()) + '&order=created_at.desc',
      { headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY } }
    );
    var orders = await res.json();
    if (!Array.isArray(orders)) orders = [];

    var totalOrders  = orders.length;
    var totalRevenue = orders.reduce(function(s,o){ return s+(o.total||0); },0);
    var activeOrders = orders.filter(function(o){ return o.status==='new'||o.status==='prep'; }).length;

    var el; 
    el = document.getElementById('statOrders');   if(el) el.textContent = totalOrders;
    el = document.getElementById('statOrdersSub');if(el) el.textContent = totalOrders>0 ? totalOrders+' order'+(totalOrders!==1?'s':'')+' today' : 'no orders today';
    el = document.getElementById('statRevenue');  if(el) el.textContent = totalRevenue>=1000 ? Math.round(totalRevenue/1000)+'k' : totalRevenue.toLocaleString();
    el = document.getElementById('statRevenueSub');if(el) el.textContent = 'RWF '+totalRevenue.toLocaleString();
    el = document.getElementById('statActive');   if(el) el.textContent = activeOrders;
    el = document.getElementById('statActiveSub');if(el) el.textContent = activeOrders>0 ? 'being prepared now' : 'none active';

    var badge = document.getElementById('navBadge');
    if (badge) badge.textContent = activeOrders;

    renderLiveOrders(orders);
  } catch(e) { console.error('Stats:', e); }
}

// ══════════════════════════════════════════
// MENU TABLE
// ══════════════════════════════════════════
async function loadDashboardMenu() {
  try {
    var res = await fetch(DB_URL + '?restaurant_id=eq.' + RESTAURANT_ID + '&order=category.asc', {
      headers: { 'apikey': DB_KEY, 'Authorization': 'Bearer ' + DB_KEY }
    });
    allItems = await res.json();
    if (!Array.isArray(allItems)) allItems = [];
    renderMenuTable(allItems, 'menuTableBody', 'all');
    updateFilterBtns(allItems, '.menu-filters .filter-btn');
    var sub = document.querySelector('#sec-overview .panel-sub');
    if (sub) sub.textContent = allItems.length + ' items total';
    var smEl  = document.getElementById('statMenuItems');
    var ssoEl = document.getElementById('statSoldOut');
    if (smEl) smEl.textContent = allItems.length;
    var soldOut = allItems.filter(function(i){ return i.is_available===false; }).length;
    if (ssoEl) ssoEl.textContent = soldOut+(soldOut===1?' item':' items')+' sold out';
  } catch(e) { console.error('Load menu:', e); }
}

function renderMenuTable(items, tbodyId, cat) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  var list = cat === 'all' ? items : items.filter(function(i){ return i.category===cat; });
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--muted);font-size:0.82rem">No items found</td></tr>';
    return;
  }
  list.forEach(function(item) {
    var avail = item.is_available !== false;
    var thumb = item.image_url
      ? '<img src="'+item.image_url+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.style.display=\'none\'">'
      : '🍽️';
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><div class="item-cell">'+
        '<div class="item-thumb" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.2rem">'+thumb+'</div>'+
        '<div><div class="item-name">'+item.name+'</div><div class="item-cat">'+item.category+'</div></div>'+
      '</div></td>'+
      '<td><span style="font-size:0.72rem;color:var(--muted)">'+item.category+'</span></td>'+
      '<td><span class="price-cell">'+Number(item.price).toLocaleString()+'</span></td>'+
      '<td><span class="status-badge '+(avail?'available':'soldout')+'" style="cursor:pointer" onclick="toggleStatus('+item.id+','+avail+')">'+(avail?'Available':'Sold Out')+'</span></td>'+
      '<td><div class="row-actions" style="opacity:1">'+
        '<button class="row-btn" onclick="openEditModal('+item.id+')">✏️</button>'+
        '<button class="row-btn del" onclick="deleteItem('+item.id+',\''+item.name.replace(/'/g,"\\'")+'\')">🗑️</button>'+
      '</div></td>';
    tbody.appendChild(tr);
  });
}

function updateFilterBtns(items, sel) {
  var cats = {};
  items.forEach(function(i){ cats[i.category]=(cats[i.category]||0)+1; });
  var btns = document.querySelectorAll(sel);
  if (btns[0]) btns[0].textContent = 'All ('+items.length+')';
  ['Drinks','Appetizer','Main Course','Dessert'].forEach(function(c,i) {
    if (btns[i+1]) btns[i+1].textContent = c.replace('Main Course','Main')+' ('+(cats[c]||0)+')';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.menu-filters .filter-btn').forEach(function(btn, i) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.menu-filters .filter-btn').forEach(function(b){ b.classList.remove('on'); });
      btn.classList.add('on');
      renderMenuTable(allItems, 'menuTableBody', ['all','Drinks','Appetizer','Main Course','Dessert'][i]||'all');
    });
  });
});

// ══════════════════════════════════════════
// LIVE ORDERS (overview panel)
// ══════════════════════════════════════════
function renderLiveOrders(orders) {
  var list = document.getElementById('liveOrdersList');
  var sub  = document.getElementById('liveOrdersSub');
  if (!list) return;
  var active = orders.filter(function(o){ return o.status!=='done'; }).length;
  if (sub) sub.textContent = active+' active · '+orders.length+' today';
  list.innerHTML = '';
  if (!orders.length) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.82rem">No orders yet today</div>';
    return;
  }
  orders.slice(0,10).forEach(function(order) {
    var status = order.status||'new';
    var items  = []; try{ items=JSON.parse(order.items); }catch(e){}
    var names  = items.slice(0,2).map(function(i){ return i.name; }).join(' + ');
    if (items.length>2) names+=' +'+(items.length-2)+' more';
    var mins = Math.floor((Date.now()-new Date(order.created_at))/60000);
    var ago  = mins<1?'Just now':mins<60?mins+'m ago':Math.floor(mins/60)+'h ago';
    var labels = {new:'New',prep:'Preparing',ready:'Ready',done:'Served'};
    var el = document.createElement('div');
    el.className = 'order-item';
    el.innerHTML =
      '<div class="order-table-badge">T'+(order.table_number||'?')+'</div>'+
      '<div class="order-info"><div class="order-name">'+(names||'Order')+'</div>'+
      '<div class="order-meta">'+ago+' · '+items.length+' item'+(items.length!==1?'s':'')+'</div></div>'+
      '<div class="order-status">'+
        '<span class="order-price">'+(order.total||0).toLocaleString()+'</span>'+
        '<span class="order-badge '+status+'">'+(labels[status]||'New')+'</span>'+
      '</div>';
    list.appendChild(el);
  });
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
    var res = await fetch(ORDERS_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&order=created_at.desc',
      { headers: { 'apikey':DB_KEY, 'Authorization':'Bearer '+DB_KEY } });
    var orders = await res.json();
    if (!Array.isArray(orders)) orders=[];
    if (sub) sub.textContent = orders.length+' total orders';
    list.innerHTML = '';
    if (!orders.length) { list.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.85rem">No orders yet</div>'; return; }
    orders.forEach(function(order) {
      var status=order.status||'new';
      var items=[]; try{items=JSON.parse(order.items);}catch(e){}
      var names=items.map(function(i){ return i.name+' ×'+i.quantity; }).join(', ');
      var dt=new Date(order.created_at);
      var dtStr=dt.toLocaleDateString()+' '+dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var labels={new:'New',prep:'Preparing',ready:'Ready',done:'Served'};
      var el=document.createElement('div'); el.className='orders-full-item';
      el.innerHTML=
        '<div class="order-table-badge" style="flex-shrink:0">T'+(order.table_number||'?')+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:0.82rem;font-weight:600;color:var(--ink);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(names||'Order #'+order.id)+'</div>'+
        '<div style="font-size:0.7rem;color:var(--muted)">'+dtStr+'</div></div>'+
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">'+
          '<span style="font-family:var(--font-d);font-size:0.88rem;font-weight:600;color:var(--ink)">'+(order.total||0).toLocaleString()+' RWF</span>'+
          '<span class="order-badge '+status+'">'+(labels[status]||'New')+'</span>'+
        '</div>';
      list.appendChild(el);
    });
  } catch(e) { console.error('All orders:',e); }
}

// ══════════════════════════════════════════
// MENU SECTION
// ══════════════════════════════════════════
async function loadMenuSection() {
  var tbody=document.getElementById('menuSecBody'), sub=document.getElementById('menuSecSub');
  if (!tbody) return;
  try {
    var res=await fetch(DB_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&order=category.asc',
      {headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var items=await res.json(); if(!Array.isArray(items)) items=[];
    if(sub) sub.textContent=items.length+' items total';
    tbody.innerHTML='';
    if (!items.length){ tbody.innerHTML='<tr><td colspan="5" style="padding:32px;text-align:center;color:var(--muted);font-size:0.82rem">No items yet</td></tr>'; return; }
    items.forEach(function(item){
      var avail=item.is_available!==false;
      var thumb=item.image_url?'<img src="'+item.image_url+'" style="width:100%;height:100%;object-fit:cover;border-radius:6px" onerror="this.style.display=\'none\'">':'🍽️';
      var tr=document.createElement('tr');
      tr.innerHTML=
        '<td><div class="item-cell"><div class="item-thumb" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:1.2rem">'+thumb+'</div>'+
        '<div><div class="item-name">'+item.name+'</div><div class="item-cat">'+item.category+'</div></div></div></td>'+
        '<td><span style="font-size:0.72rem;color:var(--muted)">'+item.category+'</span></td>'+
        '<td><span class="price-cell">'+Number(item.price).toLocaleString()+'</span></td>'+
        '<td><span class="status-badge '+(avail?'available':'soldout')+'" style="cursor:pointer" onclick="toggleStatus('+item.id+','+avail+')">'+(avail?'Available':'Sold Out')+'</span></td>'+
        '<td><div class="row-actions" style="opacity:1"><button class="row-btn" onclick="openEditModal('+item.id+')">✏️</button>'+
        '<button class="row-btn del" onclick="deleteItem('+item.id+',\''+item.name.replace(/'/g,"\\'")+'\')">🗑️</button></div></td>';
      tbody.appendChild(tr);
    });
    document.querySelectorAll('#menuSecFilters .filter-btn').forEach(function(btn,i){
      var nb=btn.cloneNode(true); btn.parentNode.replaceChild(nb,btn);
      nb.addEventListener('click',function(){
        document.querySelectorAll('#menuSecFilters .filter-btn').forEach(function(b){b.classList.remove('on');});
        nb.classList.add('on');
        var cats=['all','Drinks','Appetizer','Main Course','Dessert'], cat=cats[i]||'all';
        tbody.querySelectorAll('tr').forEach(function(row){
          var ce=row.querySelector('.item-cat'); if(!ce) return;
          row.style.display=(cat==='all'||ce.textContent===cat)?'':'none';
        });
      });
    });
  } catch(e){ console.error('Menu section:',e); }
}

// ══════════════════════════════════════════
// ADD / EDIT MODAL
// ══════════════════════════════════════════
function openModal() {
  var limit=getPlanLimit('maxItems');
  if (limit!==Infinity && allItems.length>=limit) {
    showToast('⚠️ '+CURRENT_PLAN.charAt(0).toUpperCase()+CURRENT_PLAN.slice(1)+' plan: max '+limit+' items. Upgrade to add more.');
    return;
  }
  editingId=null; uploadedBase64=''; clearForm();
  var t=document.getElementById('modalTitle'), b=document.getElementById('saveBtn');
  if(t) t.textContent='Add Menu Item';
  if(b){ b.textContent='Save Item'; b.disabled=false; }
  document.getElementById('itemModalOverlay').classList.add('open');
  switchPhotoTab('upload');
}

async function openEditModal(itemId) {
  if (itemId && typeof itemId==='object'){ openModal(); return; }
  editingId=itemId; uploadedBase64='';
  try {
    var res=await fetch(DB_URL+'?id=eq.'+itemId,{headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var data=await res.json(); if(!data.length) return;
    var item=data[0];
    document.getElementById('inputName').value     = item.name||'';
    document.getElementById('inputCategory').value = item.category||'Main Course';
    document.getElementById('inputDesc').value     = item.description||'';
    document.getElementById('inputPrice').value    = item.price||'';
    document.getElementById('inputBadge').value    = item.badge||'None';
    var ingEl=document.getElementById('inputIngredients'); if(ingEl) ingEl.value=item.ingredients||'';
    var imgInp=document.getElementById('inputImage'); if(imgInp){ imgInp.value=item.image_url||''; previewImg(item.image_url||''); }
    if(item.image_url) switchPhotoTab('url');
    var t=document.getElementById('modalTitle'), b=document.getElementById('saveBtn');
    if(t) t.textContent='Edit Menu Item';
    if(b){ b.textContent='Update Item'; b.disabled=false; }
    document.getElementById('itemModalOverlay').classList.add('open');
  } catch(e){ console.error('Edit load:',e); }
}

function closeModal() {
  document.getElementById('itemModalOverlay').classList.remove('open');
  editingId=null; uploadedBase64=''; clearForm();
}

function clearForm() {
  ['inputName','inputDesc','inputPrice','inputIngredients'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  var cat=document.getElementById('inputCategory'), bdg=document.getElementById('inputBadge');
  var img=document.getElementById('inputImage'),    fi=document.getElementById('inputImageFile');
  if(cat) cat.value='Main Course'; if(bdg) bdg.value='None';
  if(img) img.value=''; if(fi) fi.value='';
  uploadedBase64=''; previewImg('');
}

function switchPhotoTab(tab) {
  var ua=document.getElementById('photoUploadArea'), url=document.getElementById('photoUrlArea');
  var tu=document.getElementById('tabUpload'),       tl=document.getElementById('tabUrl');
  if(!ua||!url) return;
  if(tab==='upload'){
    ua.style.display='block'; url.style.display='none';
    if(tu){tu.style.borderColor='var(--accent)';tu.style.background='var(--accent2)';tu.style.color='var(--accent)';}
    if(tl){tl.style.borderColor='var(--border)';tl.style.background='transparent';tl.style.color='var(--muted)';}
  } else {
    ua.style.display='none'; url.style.display='block';
    if(tl){tl.style.borderColor='var(--accent)';tl.style.background='var(--accent2)';tl.style.color='var(--accent)';}
    if(tu){tu.style.borderColor='var(--border)';tu.style.background='transparent';tu.style.color='var(--muted)';}
  }
}

function handleFileUpload(input) {
  var file=input.files[0]; if(!file) return;
  if(file.size>5*1024*1024){ alert('Max 5MB.'); return; }
  var reader=new FileReader();
  reader.onload=function(e){ uploadedBase64=e.target.result; previewImg(uploadedBase64); };
  reader.readAsDataURL(file);
}

function previewImg(src) {
  var wrap=document.getElementById('imgPreviewWrap'), img=document.getElementById('imgPreview');
  if(!wrap||!img) return;
  if(src){ img.src=src; wrap.style.display='block'; img.onerror=function(){ wrap.style.display='none'; }; }
  else wrap.style.display='none';
}

function clearPhoto() {
  uploadedBase64='';
  var fi=document.getElementById('inputImageFile'), ui=document.getElementById('inputImage');
  if(fi) fi.value=''; if(ui) ui.value=''; previewImg('');
}

async function saveItem() {
  var name  = document.getElementById('inputName').value.trim();
  var cat   = document.getElementById('inputCategory').value;
  var desc  = document.getElementById('inputDesc').value.trim();
  var price = document.getElementById('inputPrice').value.trim();
  var badge = document.getElementById('inputBadge').value;
  var imgEl = document.getElementById('inputImage');
  var imgUrl= uploadedBase64||(imgEl?imgEl.value.trim():'');
  var ingEl = document.getElementById('inputIngredients');
  var ingredients=ingEl?ingEl.value.trim():'';
  if(!name){ alert('Please enter an item name.'); return; }
  if(!price||isNaN(price)){ alert('Please enter a valid price.'); return; }
  if(!editingId){
    var limit=getPlanLimit('maxItems');
    if(limit!==Infinity&&allItems.length>=limit){ alert('Item limit ('+limit+') reached. Upgrade to add more.'); return; }
  }
  var payload={name,category:cat,description:desc,price:parseInt(price),badge,restaurant_id:RESTAURANT_ID,ingredients};
  if(imgUrl) payload.image_url=imgUrl;
  var btn=document.getElementById('saveBtn');
  if(btn){ btn.disabled=true; btn.textContent='Saving...'; }
  try {
    var res;
    if(editingId) res=await fetch(DB_URL+'?id=eq.'+editingId,{method:'PATCH',headers:DB_HEADERS,body:JSON.stringify(payload)});
    else           res=await fetch(DB_URL,{method:'POST',headers:DB_HEADERS,body:JSON.stringify(payload)});
    if(res.ok){
      closeModal(); loadDashboardMenu();
      if(activeSection==='menu') loadMenuSection();
      showToast(editingId?'"'+name+'" updated ✓':'"'+name+'" added ✓');
    } else {
      var et=await res.text(); alert('Error: '+et);
      if(btn){ btn.disabled=false; btn.textContent=editingId?'Update Item':'Save Item'; }
    }
  } catch(e){ console.error(e); if(btn){ btn.disabled=false; btn.textContent=editingId?'Update Item':'Save Item'; } }
}

async function deleteItem(itemId,itemName) {
  if(!confirm('Remove "'+itemName+'"?')) return;
  try {
    var res=await fetch(DB_URL+'?id=eq.'+itemId,{method:'DELETE',headers:DB_HEADERS});
    if(res.ok){ loadDashboardMenu(); if(activeSection==='menu') loadMenuSection(); showToast('"'+itemName+'" removed'); }
  } catch(e){ console.error(e); }
}

async function toggleStatus(itemId,current) {
  try {
    await fetch(DB_URL+'?id=eq.'+itemId,{method:'PATCH',headers:DB_HEADERS,body:JSON.stringify({is_available:!current})});
    loadDashboardMenu(); if(activeSection==='menu') loadMenuSection(); showToast('Status updated ✓');
  } catch(e){ console.error(e); }
}

// ══════════════════════════════════════════
// CATEGORIES — order + parent/subcategory
// ══════════════════════════════════════════
function getCatMeta() {
  try{ return JSON.parse(localStorage.getItem('tt_cat_meta_'+RESTAURANT_ID)||'{}'); }catch(e){ return {}; }
}
function setCatMeta(meta){ localStorage.setItem('tt_cat_meta_'+RESTAURANT_ID,JSON.stringify(meta)); }

async function loadCategories() {
  try {
    var res=await fetch(DB_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&select=category',
      {headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var items=await res.json(); var found=[];
    items.forEach(function(i){ if(i.category&&found.indexOf(i.category)===-1) found.push(i.category); });
    ['Drinks','Appetizer','Main Course','Dessert'].forEach(function(c){ if(found.indexOf(c)===-1) found.push(c); });
    customCats=found;
  } catch(e){}
  renderCategoriesList();
  syncCatDropdowns();
}

function getSortedCats() {
  var meta=getCatMeta();
  return customCats.slice().sort(function(a,b){
    var ao=(meta[a]&&meta[a].order)?meta[a].order:999;
    var bo=(meta[b]&&meta[b].order)?meta[b].order:999;
    return ao!==bo ? ao-bo : a.localeCompare(b);
  });
}

function renderCategoriesList() {
  var list=document.getElementById('categoriesList');
  if(!list) return;
  var meta=getCatMeta();
  var sorted=getSortedCats();
  // Build rows: top-level first, then children indented
  var topLevel=sorted.filter(function(c){ return !(meta[c]&&meta[c].parent); });
  var rows=[];
  topLevel.forEach(function(cat){
    rows.push({name:cat,isChild:false});
    sorted.filter(function(c){ return meta[c]&&meta[c].parent===cat; }).forEach(function(child){
      rows.push({name:child,isChild:true,parent:cat});
    });
  });
  // Orphans
  sorted.forEach(function(c){
    var p=meta[c]&&meta[c].parent;
    if(p&&customCats.indexOf(p)===-1&&rows.findIndex(function(r){return r.name===c;})===-1) rows.push({name:c,isChild:false});
  });
  list.innerHTML='';
  rows.forEach(function(row){
    var cat=row.name, m=meta[cat]||{};
    var el=document.createElement('div');
    el.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid var(--border);transition:background 0.15s'+(row.isChild?';padding-left:48px':'');
    el.onmouseover=function(){ el.style.background='var(--bg)'; };
    el.onmouseout=function(){ el.style.background=''; };
    var parentTag=row.isChild?'<span style="font-size:0.6rem;color:var(--muted);background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 6px;margin-left:6px">↳ '+row.parent+'</span>':'';
    var orderBadge=m.order?'<span style="font-size:0.6rem;color:var(--muted);margin-left:8px">#'+m.order+'</span>':'';
    el.innerHTML=
      '<div style="display:flex;align-items:center;gap:10px">'+
        '<div style="width:32px;height:32px;background:var(--accent2);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:0.85rem">'+(row.isChild?'↳':'🏷️')+'</div>'+
        '<div><span style="font-size:0.82rem;font-weight:600;color:var(--ink)">'+cat+'</span>'+parentTag+orderBadge+'</div>'+
      '</div>'+
      '<div style="display:flex;gap:6px">'+
        '<button class="row-btn" onclick="moveCatUp(\''+cat.replace(/'/g,"\\'")+'\')">↑</button>'+
        '<button class="row-btn" onclick="moveCatDown(\''+cat.replace(/'/g,"\\'")+'\')">↓</button>'+
        '<button class="row-btn" onclick="openEditCategory(\''+cat.replace(/'/g,"\\'")+'\')">✏️</button>'+
        '<button class="row-btn del" onclick="deleteCat(\''+cat.replace(/'/g,"\\'")+'\')">🗑️</button>'+
      '</div>';
    list.appendChild(el);
  });
}

function moveCatUp(cat) {
  var meta=getCatMeta(); if(!meta[cat]) meta[cat]={};
  var cur=meta[cat].order||99;
  meta[cat].order=Math.max(1,cur-1);
  Object.keys(meta).forEach(function(k){ if(k!==cat&&meta[k].order===meta[cat].order&&!(meta[k]&&meta[k].parent)) meta[k].order=cur; });
  setCatMeta(meta); renderCategoriesList(); showToast('"'+cat+'" moved up');
}

function moveCatDown(cat) {
  var meta=getCatMeta(); if(!meta[cat]) meta[cat]={};
  var cur=meta[cat].order||99;
  meta[cat].order=cur+1;
  Object.keys(meta).forEach(function(k){ if(k!==cat&&meta[k].order===meta[cat].order&&!(meta[k]&&meta[k].parent)) meta[k].order=cur; });
  setCatMeta(meta); renderCategoriesList(); showToast('"'+cat+'" moved down');
}

function syncCatDropdowns() {
  var sel=document.getElementById('inputCategory');
  if(sel){
    var cur=sel.value; sel.innerHTML='';
    var meta=getCatMeta();
    getSortedCats().forEach(function(c){
      var o=document.createElement('option');
      o.value=c; o.textContent=(meta[c]&&meta[c].parent?'  ↳ ':'')+c;
      if(c===cur) o.selected=true;
      sel.appendChild(o);
    });
  }
  var parentSel=document.getElementById('inputCatParent');
  if(parentSel){
    var curP=parentSel.value; parentSel.innerHTML='<option value="">— Top level —</option>';
    var meta2=getCatMeta();
    getSortedCats().filter(function(c){ return !(meta2[c]&&meta2[c].parent); }).forEach(function(c){
      var op=document.createElement('option'); op.value=c; op.textContent=c;
      if(c===curP) op.selected=true;
      parentSel.appendChild(op);
    });
  }
}

function openAddCategory() {
  document.getElementById('catModalTitle').textContent='Add Category';
  document.getElementById('inputCatName').value='';
  document.getElementById('editingCatOldName').value='';
  var co=document.getElementById('inputCatOrder'); if(co) co.value=customCats.length+1;
  syncCatDropdowns();
  var ps=document.getElementById('inputCatParent'); if(ps) ps.value='';
  document.getElementById('catModalOverlay').style.display='flex';
}

function openEditCategory(old) {
  document.getElementById('catModalTitle').textContent='Edit Category';
  document.getElementById('inputCatName').value=old;
  document.getElementById('editingCatOldName').value=old;
  var meta=getCatMeta(), m=meta[old]||{};
  syncCatDropdowns();
  var ps=document.getElementById('inputCatParent'); if(ps) ps.value=m.parent||'';
  var os=document.getElementById('inputCatOrder');  if(os) os.value=m.order||'';
  document.getElementById('catModalOverlay').style.display='flex';
}

function closeCatModal(){ document.getElementById('catModalOverlay').style.display='none'; }

async function saveCategory() {
  var newName  = document.getElementById('inputCatName').value.trim();
  var oldName  = document.getElementById('editingCatOldName').value;
  var parentVal= (document.getElementById('inputCatParent')||{value:''}).value;
  var orderVal = parseInt((document.getElementById('inputCatOrder')||{value:''}).value)||0;
  if(!newName){ alert('Please enter a category name.'); return; }
  var meta=getCatMeta();
  if(oldName){
    var idx=customCats.indexOf(oldName); if(idx!==-1) customCats[idx]=newName;
    if(meta[oldName]){ meta[newName]=meta[oldName]; delete meta[oldName]; }
    meta[newName]=meta[newName]||{};
    meta[newName].parent=parentVal||'';
    if(orderVal) meta[newName].order=orderVal;
    setCatMeta(meta);
    try{ await fetch(DB_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&category=eq.'+encodeURIComponent(oldName),{method:'PATCH',headers:DB_HEADERS,body:JSON.stringify({category:newName})}); }catch(e){}
    showToast('Category updated ✓');
  } else {
    if(customCats.indexOf(newName)!==-1){ alert('Category already exists.'); return; }
    customCats.push(newName);
    meta[newName]={parent:parentVal||'',order:orderVal||customCats.length};
    setCatMeta(meta);
    showToast('"'+newName+'" added ✓');
  }
  closeCatModal(); renderCategoriesList(); syncCatDropdowns(); loadDashboardMenu();
}

async function deleteCat(cat) {
  if(!confirm('Remove "'+cat+'"? Items keep their category name but it won\'t appear in the list.')) return;
  customCats=customCats.filter(function(c){ return c!==cat; });
  var meta=getCatMeta(); delete meta[cat];
  Object.keys(meta).forEach(function(k){ if(meta[k]&&meta[k].parent===cat) meta[k].parent=''; });
  setCatMeta(meta); renderCategoriesList(); syncCatDropdowns(); showToast('"'+cat+'" removed');
}

// ══════════════════════════════════════════
// ANALYTICS SECTION
// ══════════════════════════════════════════
async function loadAnalytics() {
  var notice=document.getElementById('anUpgradeNotice');
  var statsRow=document.querySelector('#sec-analytics .stats-row');
  var grid=document.querySelector('#sec-analytics > div:last-of-type');
  if(!getPlanLimit('analytics')){
    if(notice) notice.style.display='block';
    if(statsRow) statsRow.style.display='none';
    if(grid) grid.style.display='none';
    return;
  }
  if(notice) notice.style.display='none';
  if(statsRow) statsRow.style.display='';
  if(grid) grid.style.display='';
  try {
    var res=await fetch(ORDERS_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&order=created_at.desc',
      {headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var orders=await res.json(); if(!Array.isArray(orders)) orders=[];
    var total=orders.length;
    var revenue=orders.reduce(function(s,o){return s+(o.total||0);},0);
    var avg=total?Math.round(revenue/total):0;
    var done=orders.filter(function(o){return o.status==='done';}).length;
    var pct=total?Math.round(done/total*100):0;
    var el;
    el=document.getElementById('anTotalOrders');  if(el) el.textContent=total;
    el=document.getElementById('anTotalRevenue'); if(el) el.textContent=revenue>=1000?Math.round(revenue/1000)+'k':revenue.toLocaleString();
    el=document.getElementById('anAvgOrder');     if(el) el.textContent=avg>=1000?Math.round(avg/1000)+'k':avg.toLocaleString();
    el=document.getElementById('anCompletion');   if(el) el.textContent=pct+'%';
    // Top items
    var itemCount={};
    orders.forEach(function(o){
      var items=[]; try{items=JSON.parse(o.items);}catch(e){}
      items.forEach(function(i){ itemCount[i.name]=(itemCount[i.name]||0)+(i.quantity||1); });
    });
    var topItems=Object.keys(itemCount).map(function(k){return{name:k,count:itemCount[k]};});
    topItems.sort(function(a,b){return b.count-a.count;});
    var topEl=document.getElementById('anTopItems');
    if(topEl){
      if(!topItems.length){ topEl.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.82rem">No orders yet</div>'; }
      else {
        var maxC=topItems[0].count; topEl.innerHTML='';
        topItems.slice(0,8).forEach(function(item,i){
          var p=Math.round(item.count/maxC*100);
          var row=document.createElement('div');
          row.style.cssText='padding:10px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px';
          row.innerHTML='<span style="font-size:0.72rem;font-weight:700;color:var(--muted);width:16px">'+(i+1)+'</span>'+
            '<div style="flex:1;min-width:0"><div style="font-size:0.8rem;font-weight:600;color:var(--ink);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+item.name+'</div>'+
            '<div style="height:4px;background:var(--border);border-radius:2px"><div style="height:4px;background:var(--accent);border-radius:2px;width:'+p+'%"></div></div></div>'+
            '<span style="font-size:0.75rem;font-weight:700;color:var(--ink);flex-shrink:0">×'+item.count+'</span>';
          topEl.appendChild(row);
        });
      }
    }
    // Status breakdown
    var statusMap={new:'New',prep:'Preparing',ready:'Ready',done:'Served'};
    var statusColors={new:'#3b82f6',prep:'#f59e0b',ready:'#22c55e',done:'#a0a0a0'};
    var counts={new:0,prep:0,ready:0,done:0};
    orders.forEach(function(o){ var s=o.status||'new'; if(counts[s]!==undefined) counts[s]++; });
    var sbEl=document.getElementById('anStatusBreakdown');
    if(sbEl){
      sbEl.innerHTML='';
      Object.keys(counts).forEach(function(s){
        var p=total?Math.round(counts[s]/total*100):0;
        var row=document.createElement('div');
        row.style.cssText='display:flex;align-items:center;gap:10px;font-size:0.8rem';
        row.innerHTML='<span style="width:8px;height:8px;border-radius:50%;background:'+statusColors[s]+';flex-shrink:0"></span>'+
          '<span style="flex:1;color:var(--ink2)">'+statusMap[s]+'</span>'+
          '<span style="font-weight:700;color:var(--ink)">'+counts[s]+'</span>'+
          '<span style="color:var(--muted);font-size:0.72rem;width:36px;text-align:right">'+p+'%</span>';
        sbEl.appendChild(row);
      });
    }
  } catch(e){ console.error('Analytics:',e); }
}

// ══════════════════════════════════════════
// ACTIVITY SECTION
// ══════════════════════════════════════════
async function loadActivitySection() {
  var list=document.getElementById('activityOrdersList');
  if(!list) return;
  list.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted);font-size:0.85rem">Loading...</div>';
  try {
    var todayStart=new Date(); todayStart.setHours(0,0,0,0);
    var res=await fetch(ORDERS_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&created_at=gte.'+encodeURIComponent(todayStart.toISOString())+'&order=created_at.desc',
      {headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var orders=await res.json(); if(!Array.isArray(orders)) orders=[];
    var sub=document.querySelector('#sec-activity .panel-sub'); if(sub) sub.textContent=orders.length+' orders today';
    list.innerHTML='';
    if(!orders.length){ list.innerHTML='<div style="padding:48px;text-align:center;color:var(--muted);font-size:0.85rem">No activity today yet</div>'; return; }
    orders.forEach(function(order){
      var status=order.status||'new';
      var items=[]; try{items=JSON.parse(order.items);}catch(e){}
      var names=items.map(function(i){return i.name+' ×'+i.quantity;}).join(', ');
      var dt=new Date(order.created_at);
      var timeStr=dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
      var mins=Math.floor((Date.now()-dt)/60000);
      var ago=mins<1?'Just now':mins<60?mins+'m ago':Math.floor(mins/60)+'h ago';
      var labels={new:'New',prep:'Preparing',ready:'Ready',done:'Served'};
      var dotColors={new:'var(--blue,#3b82f6)',prep:'var(--yellow,#d4960a)',ready:'var(--green)',done:'var(--muted)'};
      var el=document.createElement('div');
      el.style.cssText='display:flex;align-items:flex-start;gap:14px;padding:16px 24px;border-bottom:1px solid var(--border);transition:background 0.15s';
      el.onmouseover=function(){el.style.background='var(--bg)';};
      el.onmouseout=function(){el.style.background='';};
      el.innerHTML=
        '<div style="width:8px;height:8px;border-radius:50%;background:'+(dotColors[status]||'var(--muted)')+';margin-top:5px;flex-shrink:0"></div>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:0.82rem;font-weight:600;color:var(--ink);margin-bottom:2px">Table '+(order.table_number||'?')+' · '+(order.total||0).toLocaleString()+' RWF</div>'+
          '<div style="font-size:0.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(names||'Order')+'</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">'+
          '<span class="order-badge '+status+'">'+(labels[status]||'New')+'</span>'+
          '<span style="font-size:0.65rem;color:var(--muted)">'+timeStr+' · '+ago+'</span>'+
        '</div>';
      list.appendChild(el);
    });
  } catch(e){ console.error('Activity:',e); }
}

// ══════════════════════════════════════════
// APPEARANCE SECTION
// ══════════════════════════════════════════
async function loadAppearance() {
  var notice=document.getElementById('appearanceUpgradeNotice');
  var panel=document.querySelector('#sec-appearance .panel');
  if(!getPlanLimit('appearance')){
    if(notice) notice.style.display='block';
    if(panel)  panel.style.display='none';
    return;
  }
  if(notice) notice.style.display='none';
  if(panel)  panel.style.display='';
  try {
    var res=await fetch(REST_URL+'?restaurant_id=eq.'+RESTAURANT_ID+'&select=hero_image&limit=1',
      {headers:{'apikey':DB_KEY,'Authorization':'Bearer '+DB_KEY}});
    var data=await res.json();
    if(data&&data[0]&&data[0].hero_image){
      var url=data[0].hero_image;
      var inp=document.getElementById('heroBgUrlInput'); if(inp) inp.value=url;
      previewHeroBg(url);
    }
  } catch(e){}
}

function previewHeroBg(url) {
  var inner=document.getElementById('heroBgPreviewInner'); if(!inner) return;
  var bg=url?url:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=70';
  inner.style.backgroundImage="linear-gradient(to bottom,rgba(12,11,9,0.3),rgba(12,11,9,0.85)),url('"+bg+"')";
  inner.style.backgroundSize='cover'; inner.style.backgroundPosition='center';
}

function setHeroBg(url) {
  var inp=document.getElementById('heroBgUrlInput'); if(inp) inp.value=url;
  previewHeroBg(url);
}

async function saveHeroBg() {
  var url=(document.getElementById('heroBgUrlInput')||{value:''}).value.trim();
  if(!url){ showToast('Please enter or choose an image URL'); return; }
  try {
    var res=await fetch(REST_URL+'?restaurant_id=eq.'+RESTAURANT_ID,{
      method:'PATCH',
      headers:Object.assign({},DB_HEADERS,{'Prefer':'return=minimal'}),
      body:JSON.stringify({hero_image:url})
    });
    if(res.ok){ showToast('Background saved ✓'); }
    else {
      var et=await res.text();
      if(et.indexOf('hero_image')!==-1) showToast('Add hero_image (text) column to restaurants table in Supabase');
      else showToast('Error: '+et.slice(0,60));
    }
  } catch(e){ showToast('Error saving background'); }
}

// ══════════════════════════════════════════
// SETTINGS SECTION
// ══════════════════════════════════════════
function loadSettings() {
  var rName=(typeof getRestaurantName==='function')?getRestaurantName():'—';
  var rId=RESTAURANT_ID, plan=CURRENT_PLAN, menuUrl=_currentMenuUrl;
  var el;
  el=document.getElementById('settingsRestName'); if(el) el.textContent=rName;
  el=document.getElementById('settingsRestId');   if(el) el.textContent=rId;
  el=document.getElementById('settingsPlan');     if(el){
    el.textContent=plan.charAt(0).toUpperCase()+plan.slice(1);
    el.style.color=plan==='business'?'#3b82f6':plan==='pro'?'#d4960a':'var(--accent)';
  }
  el=document.getElementById('settingsMenuUrl'); if(el) el.textContent=menuUrl;
  var featureList=document.getElementById('settingsPlanFeatures'); if(!featureList) return;
  var features=[
    {name:'Menu Items',     starter:'Up to 15',  pro:'Unlimited', business:'Unlimited'},
    {name:'QR Code',        starter:'✓',          pro:'✓',         business:'✓'},
    {name:'Order Management',starter:'✗',         pro:'✓',         business:'✓'},
    {name:'Kitchen Display',starter:'✗',          pro:'✓',         business:'✓'},
    {name:'Analytics',      starter:'✗',          pro:'✓',         business:'✓'},
    {name:'Appearance',     starter:'✗',          pro:'✓',         business:'✓'},
    {name:'Multi-Location', starter:'✗',          pro:'✗',         business:'✓'},
    {name:'Advanced Analytics',starter:'✗',       pro:'✗',         business:'✓'},
  ];
  featureList.innerHTML='';
  features.forEach(function(f,i){
    var val=f[plan]||'✗';
    var isYes=val==='✓'||val.indexOf('Unlimited')!==-1||val.indexOf('Up to')!==-1;
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:12px 24px;'+(i<features.length-1?'border-bottom:1px solid var(--border)':'');
    row.innerHTML='<span style="font-size:0.82rem;color:var(--ink2)">'+f.name+'</span>'+
      '<span style="font-size:0.8rem;font-weight:600;color:'+(isYes?'var(--green)':'var(--muted)')+'">'+val+'</span>';
    featureList.appendChild(row);
  });
}

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════
function toggleNotif() {
  var dd=document.getElementById('notifDropdown'), dot=document.getElementById('notifDot');
  if(!dd) return;
  dd.classList.toggle('open');
  if(dd.classList.contains('open')&&dot) dot.style.display='none';
}
function clearNotifs() {
  var body=document.getElementById('notifBody');
  if(body) body.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.8rem">No new notifications</div>';
  var dot=document.getElementById('notifDot'); if(dot) dot.style.display='none';
}
document.addEventListener('click',function(e){
  var w=document.querySelector('.notif-wrapper');
  if(w&&!w.contains(e.target)){ var dd=document.getElementById('notifDropdown'); if(dd) dd.classList.remove('open'); }
});

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function showToast(msg) {
  var ex=document.getElementById('dashToast'); if(ex) ex.remove();
  var t=document.createElement('div'); t.id='dashToast'; t.textContent=msg;
  t.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 24px;border-radius:8px;font-size:0.82rem;font-weight:500;font-family:var(--font-b);border:1px solid var(--border);box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:9999';
  document.body.appendChild(t);
  setTimeout(function(){ t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(function(){ if(t.parentNode) t.remove(); },300); },3500);
}

// ══════════════════════════════════════════
// MULTI-TENANCY — Dynamic QR + copy link
// ══════════════════════════════════════════
function updateQRCode() {
  var rid=RESTAURANT_ID;
  var menuUrl='https://tabletap-demo.netlify.app/menu.html?r='+rid;
  var qrUrl='https://api.qrserver.com/v1/create-qr-code/?size=140x140&data='+encodeURIComponent(menuUrl)+'&bgcolor=ffffff&color=000000&margin=4';
  var qrBig='https://api.qrserver.com/v1/create-qr-code/?size=300x300&data='+encodeURIComponent(menuUrl)+'&bgcolor=ffffff&color=000000&margin=4';
  _currentMenuUrl=menuUrl;
  document.querySelectorAll('.qr-code img').forEach(function(img){img.src=qrUrl;});
  var oqi=document.getElementById('overviewQrImg'); if(oqi) oqi.src=qrUrl;
  document.querySelectorAll('.qr-url').forEach(function(el){el.innerHTML='<strong>tabletap-demo.netlify.app/</strong>menu.html?r='+rid;});
  var oqu=document.getElementById('overviewQrUrl'); if(oqu) oqu.innerHTML='<strong>tabletap-demo.netlify.app/</strong>menu.html?r='+rid;
  document.querySelectorAll('a[download]').forEach(function(a){a.href=qrBig;});
  var oqd=document.getElementById('overviewQrDownload'); if(oqd) oqd.href=qrBig;
}

function copyMenuLink(btn) {
  navigator.clipboard.writeText(_currentMenuUrl).then(function(){
    btn.textContent='✅ Copied!'; setTimeout(function(){btn.textContent='📋 Copy Link';},2000);
  }).catch(function(){
    var ta=document.createElement('textarea'); ta.value=_currentMenuUrl;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    btn.textContent='✅ Copied!'; setTimeout(function(){btn.textContent='📋 Copy Link';},2000);
  });
}

// ══════════════════════════════════════════
// INITIALIZE
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  if(typeof getRestaurantId==='function') RESTAURANT_ID=getRestaurantId();
  if(typeof getPlan==='function')         CURRENT_PLAN=getPlan();

  if(typeof getRestaurantName==='function'){
    var rName=getRestaurantName();
    var h=new Date().getHours();
    var gr=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
    var greetEl=document.getElementById('dashGreeting');
    if(greetEl) greetEl.textContent=gr+', '+rName+' 👋';
    var restInfo=document.querySelector('.restaurant-info p:first-child');
    if(restInfo&&rName!=='Restaurant') restInfo.textContent=rName;
  }
  if(typeof getPlan==='function'){
    var planEl=document.getElementById('sidebarPlan'), p=getPlan();
    if(planEl) planEl.textContent=p.charAt(0).toUpperCase()+p.slice(1)+' · Active';
  }
  if(typeof getCurrentUser==='function'){
    var email=getCurrentUser()||'';
    var nameEl=document.getElementById('sidebarUserName'),emailEl=document.getElementById('sidebarUserEmail'),avEl=document.getElementById('sidebarUserAvatar');
    if(nameEl)  nameEl.textContent=email.split('@')[0]||'Owner';
    if(emailEl) emailEl.textContent=email;
    if(avEl)    avEl.textContent=(email[0]||'?').toUpperCase();
  }

  var imgInput=document.getElementById('inputImage');
  if(imgInput) imgInput.addEventListener('input',function(){previewImg(this.value);});

  updateQRCode();
  loadDashboardMenu();
  loadOverviewStats();
  loadCategories();
  setInterval(loadOverviewStats,15000);
});
