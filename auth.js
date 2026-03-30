// ── auth.js ── Table Tap Authentication

const AUTH_URL = 'https://flcphwyjqawlmclrsitj.supabase.co';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';

async function signIn(email, password) {
  var res  = await fetch(AUTH_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': AUTH_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  });
  var data = await res.json();
  if (data.access_token) {
    localStorage.setItem('tt_token',   data.access_token);
    localStorage.setItem('tt_refresh', data.refresh_token);
    localStorage.setItem('tt_email',   email);
    var role = (email.toLowerCase().indexOf('kitchen') !== -1) ? 'kitchen' : 'dashboard';
    localStorage.setItem('tt_role', role);
    // Decode user ID from JWT
    try {
      var payload = JSON.parse(atob(data.access_token.split('.')[1]));
      localStorage.setItem('tt_uid', payload.sub);
      // Fetch restaurant profile
      await _fetchRestaurantProfile(payload.sub, data.access_token, role);
    } catch(e) {}
    return { success: true, role: role };
  }
  return { success: false, error: data.error_description || 'Invalid email or password' };
}

async function _fetchRestaurantProfile(userId, token, role) {
  try {
    // Try owner lookup
    var field = role === 'kitchen' ? 'kitchen_user_id' : 'owner_id';
    var res   = await fetch(
      AUTH_URL + '/rest/v1/restaurants?' + field + '=eq.' + userId + '&limit=1',
      { headers: { 'apikey': AUTH_KEY, 'Authorization': 'Bearer ' + token } }
    );
    var data  = await res.json();
    if (data && data.length) {
      localStorage.setItem('tt_restaurant_id',   data[0].restaurant_id);
      localStorage.setItem('tt_restaurant_name', data[0].restaurant_name);
      localStorage.setItem('tt_plan',            data[0].plan || 'starter');
      return;
    }
    // Fallback — try other field
    var field2 = role === 'kitchen' ? 'owner_id' : 'kitchen_user_id';
    var res2   = await fetch(
      AUTH_URL + '/rest/v1/restaurants?' + field2 + '=eq.' + userId + '&limit=1',
      { headers: { 'apikey': AUTH_KEY, 'Authorization': 'Bearer ' + token } }
    );
    var data2  = await res2.json();
    if (data2 && data2.length) {
      localStorage.setItem('tt_restaurant_id',   data2[0].restaurant_id);
      localStorage.setItem('tt_restaurant_name', data2[0].restaurant_name);
      localStorage.setItem('tt_plan',            data2[0].plan || 'starter');
    }
  } catch(e) {}
}

async function signOut() {
  var token = localStorage.getItem('tt_token');
  if (token) {
    try {
      await fetch(AUTH_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { 'apikey': AUTH_KEY, 'Authorization': 'Bearer ' + token }
      });
    } catch(e) {}
  }
  ['tt_token','tt_refresh','tt_email','tt_role','tt_uid','tt_restaurant_id','tt_restaurant_name','tt_plan'].forEach(function(k) {
    localStorage.removeItem(k);
  });
  window.location.href = 'login.html';
}

function getCurrentUser()     { return localStorage.getItem('tt_email'); }
function getToken()           { return localStorage.getItem('tt_token'); }
function getCurrentRole()     { return localStorage.getItem('tt_role') || 'dashboard'; }
function getRestaurantId()    { return localStorage.getItem('tt_restaurant_id') || 'chilli-restaurant'; }
function getRestaurantName()  { return localStorage.getItem('tt_restaurant_name') || 'Restaurant'; }

function getPlan()           { return localStorage.getItem('tt_plan') || 'starter'; }

function requireAuth() {
  if (!localStorage.getItem('tt_token')) { window.location.href = 'login.html'; return false; }
  return true;
}

function requireDashboardAuth() {
  if (!localStorage.getItem('tt_token')) { window.location.href = 'login.html?redirect=dashboard'; return false; }
  if (localStorage.getItem('tt_role') === 'kitchen') { window.location.href = 'kitchen.html'; return false; }
  return true;
}

function requireKitchenAuth() {
  if (!localStorage.getItem('tt_token')) { window.location.href = 'login.html?redirect=kitchen'; return false; }
  if (localStorage.getItem('tt_role') === 'dashboard') { window.location.href = 'dashboard.html'; return false; }
  return true;
}

function redirectIfLoggedIn() {
  var token = localStorage.getItem('tt_token');
  if (!token) return;
  window.location.href = localStorage.getItem('tt_role') === 'kitchen' ? 'kitchen.html' : 'dashboard.html';
}
