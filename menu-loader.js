// ── menu-loader.js ──
// Loads menu items from Supabase dynamically — supports multi-tenancy via ?r= URL param

const itemImages = {
  'Espresso':            'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Double Espresso':     'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Americano':           'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Cappuccino':          'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'House Red':           'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
  'House White':         'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
  'Champagne Brut':      'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?w=600&q=80',
  'Fresh Citrus Press':  'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
  'Still / Sparkling':   'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80',
  'Caesar Royale':       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Grilled Prawns':      'https://images.unsplash.com/photo-1559742811-822873691df8?w=600&q=80',
  'Burrata & Truffle':   'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&q=80',
  'Wagyu Dumplings':     'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
  'Lobster Bisque':      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  'Beef Carpaccio':      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  'Ribeye au Poivre':    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  'Pan-Seared Salmon':   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
  'Duck Confit':         'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'Truffle Tagliatelle': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
  'Grilled Lobster':     'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80',
  'Wild Mushroom Risotto':'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80',
  'Fondant au Chocolat': 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
  'Crème Brûlée':        'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80',
  'Mille-Feuille':       'https://images.unsplash.com/photo-1488477181228-c84dbe6ec50f?w=600&q=80',
  'Trio of Sorbets':     'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80',
  'Tarte Tatin':         'https://images.unsplash.com/photo-1562440499-64774951b0e2?w=600&q=80',
  'Tiramisu':            'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
};

const categoryImages = {
  'Drinks':      'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Appetizer':   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Main Course': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  'Dessert':     'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
  'default':     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
};

function buildCard(item) {
  // Use image_url from database if available, else fall back to name/category maps
  var img   = item.image_url || itemImages[item.name] || categoryImages[item.category] || categoryImages['default'];
  var badge = item.badge && item.badge !== 'None' ? '<span class="card-badge">' + item.badge + '</span>' : '';

  // Store full item data on the card element via data-item (base64 to avoid quoting issues)
  var itemData = btoa(unescape(encodeURIComponent(JSON.stringify({
    name:        item.name,
    category:    item.category,
    description: item.description || '',
    price:       item.price,
    img:         img,
    ingredients: item.ingredients || ''
  }))));

  return '<div class="card" data-name="' + item.name + '" data-price="' + item.price + '" data-category="' + (item.category || '') + '" data-item="' + itemData + '">' +
    '<img src="' + img + '" class="card-img" alt="' + item.name + '" loading="lazy" onerror="this.src=\'' + categoryImages['default'] + '\'" style="cursor:pointer" onclick="openItemModalFromCard(this.closest(\'.card\'))">' +
    '<div class="card-body">' +
      '<p class="card-tag">' + item.category + '</p>' +
      '<p class="card-name" style="cursor:pointer" onclick="openItemModalFromCard(this.closest(\'.card\'))">' + item.name + '</p>' +
      '<p class="card-desc">' + (item.description || '') + '</p>' +
      '<div class="card-footer">' +
        '<span class="card-price">' + Number(item.price).toLocaleString() + ' RWF</span>' +
        badge +
        '<button class="add-btn" onclick="addToCart(this)">+ Add</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

async function loadMenu(restaurantId) {
  var items = await getMenuItems(restaurantId);

  // Discover all unique categories from items
  var allCats = [];
  items.forEach(function(i) {
    if (i.category && allCats.indexOf(i.category) === -1) allCats.push(i.category);
  });

  // Group by category
  var groups = {};
  allCats.forEach(function(cat) {
    groups[cat] = items.filter(function(i) { return i.category === cat; });
  });

  // Standard grids (backward compatible)
  injectCards('drinks-grid',    groups['Drinks']      || []);
  injectCards('appetizer-grid', groups['Appetizer']   || []);
  injectCards('main-grid',      groups['Main Course'] || []);
  injectCards('dessert-grid',   groups['Dessert']     || []);

  injectCards('all-drinks-grid',    (groups['Drinks']      || []).slice(0, 3));
  injectCards('all-appetizer-grid', (groups['Appetizer']   || []).slice(0, 3));
  injectCards('all-main-grid',      (groups['Main Course'] || []).slice(0, 3));
  injectCards('all-dessert-grid',   (groups['Dessert']     || []).slice(0, 3));
}

function injectCards(gridId, items) {
  var grid = document.getElementById(gridId);
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;padding:20px 0">No items yet</p>';
    return;
  }
  grid.innerHTML = items.map(buildCard).join('');
}

// ── Fetch restaurant name from Supabase and update hero h1 + page title ──
async function loadRestaurantName(restaurantId) {
  try {
    var res = await fetch(
      'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/restaurants?restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&select=restaurant_name,hero_image&limit=1',
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E'
        }
      }
    );
    var data = await res.json();
    if (data && data[0] && data[0].restaurant_name) {
      var name = data[0].restaurant_name;
      // Update page <title>
      document.title = name + ' — Menu';
      // Update hero <h1>: last word in italic gold, rest plain white
      var heroH1 = document.querySelector('.hero h1');
      if (heroH1) {
        var words = name.trim().split(' ');
        if (words.length > 1) {
          var first = words.slice(0, -1).join(' ');
          var last  = words[words.length - 1];
          heroH1.innerHTML = first + ' <em>' + last + '</em>';
        } else {
          heroH1.innerHTML = '<em>' + name + '</em>';
        }
      }
      // Also update hero-label to show restaurant name
      var heroLabel = document.querySelector('.hero-label');
      if (heroLabel) heroLabel.textContent = name + ' — Digital Menu';
      // Apply custom hero background image if set
      if (data[0].hero_image) {
        var heroEl = document.querySelector('.hero');
        if (heroEl) {
          heroEl.style.backgroundImage =
            'linear-gradient(to bottom, rgba(12,11,9,0.3) 0%, rgba(12,11,9,0.85) 100%), url(\'' + data[0].hero_image + '\')';
          heroEl.style.backgroundSize = 'cover';
          heroEl.style.backgroundPosition = 'center';
        }
      }
    }
  } catch(e) {
    console.warn('Could not load restaurant name:', e);
  }
}

// ── Multi-tenancy: read restaurant from URL ?r= param ──
var urlParams    = new URLSearchParams(window.location.search);
var MENU_REST_ID = urlParams.get('r') || 'chilli-restaurant';

// Load name first (updates title fast), then load menu items
loadRestaurantName(MENU_REST_ID);
loadMenu(MENU_REST_ID);
