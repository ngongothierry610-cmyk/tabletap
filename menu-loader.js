// ── menu-loader.js ──
// Loads menu items from Supabase and builds the cards dynamically

// Images mapped by item name
const itemImages = {
  // Drinks
  'Espresso':            'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Double Espresso':     'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Americano':           'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Cappuccino':          'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'House Red':           'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
  'House White':         'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80',
  'Champagne Brut':      'https://images.unsplash.com/photo-1561864030-1432f8c98c44?q=80&w',
  'Fresh Citrus Press':  'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
  'Still / Sparkling':   'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80',
  // Appetizers
  'Caesar Royale':       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Grilled Prawns':      'https://images.unsplash.com/photo-1559742811-822873691df8?w=600&q=80',
  'Burrata & Truffle':   'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&q=80',
  'Wagyu Dumplings':     'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
  'Lobster Bisque':      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  'Beef Carpaccio':      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  // Main Course
  'Ribeye au Poivre':    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  'Pan-Seared Salmon':   'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&q=80',
  'Duck Confit':         'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'Truffle Tagliatelle': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80',
  'Grilled Lobster':     'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&q=80',
  'Wild Mushroom Risotto':'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&q=80',
  // Desserts
  'Fondant au Chocolat': 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
  'Crème Brûlée':        'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600&q=80',
  'Mille-Feuille':       'https://images.unsplash.com/photo-1488477181228-c84dbe6ec50f?w=600&q=80',
  'Trio of Sorbets':     'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80',
  'Tarte Tatin':         'https://images.unsplash.com/photo-1562440499-64774951b0e2?w=600&q=80',
  'Tiramisu':            'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80',
};

// Fallback images by category if item name not found
const categoryImages = {
  'Drinks':      'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600&q=80',
  'Appetizer':   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'Main Course': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80',
  'Dessert':     'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80',
  'default':     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
};

// Build one card HTML from a database item
function buildCard(item) {
  // Try item name first, then category, then default
  const img = itemImages[item.name]
    || categoryImages[item.category]
    || categoryImages['default'];

  const badge = item.badge && item.badge !== 'None'
    ? `<span class="card-badge">${item.badge}</span>`
    : '';

  return `
    <div class="card" data-name="${item.name}" data-price="${item.price}">
      <img src="${img}" class="card-img" alt="${item.name}" loading="lazy">
      <div class="card-body">
        <p class="card-tag">${item.category}</p>
        <p class="card-name">${item.name}</p>
        <p class="card-desc">${item.description}</p>
        <div class="card-footer">
          <span class="card-price">${item.price.toLocaleString()} RWF</span>
          ${badge}
          <button class="add-btn" onclick="addToCart(this)">+ Add</button>
        </div>
      </div>
    </div>
  `;
}

// Load and render menu from Supabase
async function loadMenu(restaurantId) {
  const items = await getMenuItems(restaurantId);

  // Group items by category
  const groups = {
    'Drinks':      items.filter(i => i.category === 'Drinks'),
    'Appetizer':   items.filter(i => i.category === 'Appetizer'),
    'Main Course': items.filter(i => i.category === 'Main Course'),
    'Dessert':     items.filter(i => i.category === 'Dessert'),
  };

  // Inject into individual section grids
  injectCards('drinks-grid',    groups['Drinks']);
  injectCards('appetizer-grid', groups['Appetizer']);
  injectCards('main-grid',      groups['Main Course']);
  injectCards('dessert-grid',   groups['Dessert']);

  // Inject All section previews (first 3 of each)
  injectCards('all-drinks-grid',    groups['Drinks'].slice(0, 3));
  injectCards('all-appetizer-grid', groups['Appetizer'].slice(0, 3));
  injectCards('all-main-grid',      groups['Main Course'].slice(0, 3));
  injectCards('all-dessert-grid',   groups['Dessert'].slice(0, 3));
}
function injectCards(gridId, items) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  if (items.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;padding:20px 0">No items yet</p>';
    return;
  }
  grid.innerHTML = items.map(buildCard).join('');
}

// Run when page loads
loadMenu('chilli-restaurant');
