// ── menu.js ──
// Cart, ordering, and Supabase integration for Table Tap customer menu

const MENU_SUPABASE_URL = 'https://flcphwyjqawlmclrsitj.supabase.co/rest/v1/orders';
const MENU_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';
const RESTAURANT_ID     = 'chilli-restaurant';

// ── Cart ──
var cart = [];

// ── Add to Cart ──
function addToCart(button) {
  var card  = button.closest('.card');
  if (!card) return;
  var name  = card.dataset.name;
  var price = parseInt(card.dataset.price);
  if (!name || isNaN(price)) return;

  var existing = cart.find(function(item) { return item.name === name; });
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name: name, price: price, quantity: 1 });
  }

  button.textContent = '\u2713 Added';
  button.classList.add('added');
  setTimeout(function() {
    button.textContent = '+ Add';
    button.classList.remove('added');
  }, 1000);

  updateCart();
  showFab();
}

// ── Update Cart Display ──
function updateCart() {
  var cartItems  = document.getElementById('cartItems');
  var cartEmpty  = document.getElementById('cartEmpty');
  var cartFooter = document.getElementById('cartFooter');
  var cartSub    = document.getElementById('cartSub');
  var cartTotal  = document.getElementById('cartTotal');
  var fabCount   = document.getElementById('fabCount');

  var totalItems = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
  var totalPrice = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);

  if (cartSub)   cartSub.textContent   = totalItems + (totalItems === 1 ? ' item' : ' items');
  if (fabCount)  fabCount.textContent  = totalItems;
  if (cartTotal) cartTotal.textContent = totalPrice.toLocaleString() + ' RWF';

  if (cart.length === 0) {
    if (cartEmpty)  cartEmpty.style.display  = 'flex';
    if (cartFooter) cartFooter.style.display = 'none';
  } else {
    if (cartEmpty)  cartEmpty.style.display  = 'none';
    if (cartFooter) cartFooter.style.display = 'block';
  }

  if (!cartItems) return;
  cartItems.querySelectorAll('.cart-item').forEach(function(row) { row.remove(); });

  cart.forEach(function(item, index) {
    var row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML =
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-price">' + (item.price * item.quantity).toLocaleString() + ' RWF</div>' +
      '</div>' +
      '<div class="cart-item-controls">' +
        '<button class="qty-btn" onclick="changeQty(' + index + ', -1)">\u2212</button>' +
        '<span class="qty-num">' + item.quantity + '</span>' +
        '<button class="qty-btn" onclick="changeQty(' + index + ', +1)">+</button>' +
      '</div>';
    cartItems.appendChild(row);
  });
}

// ── Change Quantity ──
function changeQty(index, change) {
  if (!cart[index]) return;
  cart[index].quantity += change;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  updateCart();
  if (cart.length === 0) {
    var fab = document.getElementById('cartFab');
    if (fab) fab.style.display = 'none';
    closeCart();
  }
}

// ── Toggle Cart Drawer ──
function toggleCart() {
  var drawer  = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer)  drawer.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

function closeCart() {
  var drawer  = document.getElementById('cartDrawer');
  var overlay = document.getElementById('cartOverlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function showFab() {
  var fab = document.getElementById('cartFab');
  if (fab) fab.style.display = 'flex';
}

// ── Place Order — saves to Supabase ──
async function placeOrder() {
  if (cart.length === 0) return;

  // Get table number from URL ?table=3
  var params      = new URLSearchParams(window.location.search);
  var tableNumber = params.get('table') || 'Walk-in';

  // Calculate total
  var total = cart.reduce(function(sum, item) {
    return sum + (item.price * item.quantity);
  }, 0);

  // Show loading state on button
  var btn = document.querySelector('.place-order-btn');
  if (btn) { btn.textContent = 'Placing order...'; btn.disabled = true; }

  try {
    var response = await fetch(MENU_SUPABASE_URL, {
      method: 'POST',
      headers: {
        'apikey':        MENU_SUPABASE_KEY,
        'Authorization': 'Bearer ' + MENU_SUPABASE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify({
        restaurant_id: RESTAURANT_ID,
        table_number:  tableNumber,
        items:         JSON.stringify(cart),
        total:         total,
        status:        'new'
      })
    });

    if (response.ok) {
      // Success
      closeCart();
      var confirm = document.getElementById('orderConfirm');
      if (confirm) confirm.classList.add('show');
      cart = [];
      updateCart();
      var fab = document.getElementById('cartFab');
      if (fab) fab.style.display = 'none';
    } else {
      var errText = await response.text();
      console.error('Order error:', errText);
      alert('Could not place order. Please try again.');
      if (btn) { btn.textContent = 'Place Order \u2192'; btn.disabled = false; }
    }
  } catch(err) {
    console.error('Order error:', err);
    alert('Connection error. Please check your internet and try again.');
    if (btn) { btn.textContent = 'Place Order \u2192'; btn.disabled = false; }
  }
}
