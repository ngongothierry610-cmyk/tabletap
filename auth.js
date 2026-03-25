// ── auth.js ── Table Tap Authentication
// Supports separate roles: dashboard owner vs kitchen staff

const AUTH_URL = 'https://flcphwyjqawlmclrsitj.supabase.co';
const AUTH_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';

// ── Sign In ──
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
    // Store role based on email
    // kitchen staff use emails ending in @kitchen.tabletap or containing 'kitchen'
    var role = (email.toLowerCase().indexOf('kitchen') !== -1) ? 'kitchen' : 'dashboard';
    localStorage.setItem('tt_role', role);
    return { success: true, role: role };
  }
  return { success: false, error: data.error_description || 'Invalid email or password' };
}

// ── Sign Out ──
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
  localStorage.removeItem('tt_token');
  localStorage.removeItem('tt_refresh');
  localStorage.removeItem('tt_email');
  localStorage.removeItem('tt_role');
  window.location.href = 'login.html';
}

// ── Get current user ──
function getCurrentUser() { return localStorage.getItem('tt_email'); }
function getToken()       { return localStorage.getItem('tt_token'); }
function getCurrentRole() { return localStorage.getItem('tt_role') || 'dashboard'; }

// ── Require auth — redirect to login if not signed in ──
function requireAuth() {
  if (!localStorage.getItem('tt_token')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ── Require dashboard role ──
// Call on dashboard.html — redirects kitchen staff away
function requireDashboardAuth() {
  if (!localStorage.getItem('tt_token')) {
    window.location.href = 'login.html?redirect=dashboard';
    return false;
  }
  var role = localStorage.getItem('tt_role');
  if (role === 'kitchen') {
    // Kitchen staff trying to access dashboard — redirect them
    window.location.href = 'kitchen.html';
    return false;
  }
  return true;
}

// ── Require kitchen role ──
// Call on kitchen.html — redirects dashboard owners away
function requireKitchenAuth() {
  if (!localStorage.getItem('tt_token')) {
    window.location.href = 'login.html?redirect=kitchen';
    return false;
  }
  var role = localStorage.getItem('tt_role');
  if (role === 'dashboard') {
    // Dashboard owner trying to access kitchen — redirect them
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

// ── Redirect if already logged in ──
function redirectIfLoggedIn() {
  var token = localStorage.getItem('tt_token');
  if (!token) return;
  var role  = localStorage.getItem('tt_role') || 'dashboard';
  window.location.href = role === 'kitchen' ? 'kitchen.html' : 'dashboard.html';
}
