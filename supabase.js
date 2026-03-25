// ── supabase.js ──
// Your connection to the Supabase database

const SUPABASE_URL = 'https://flcphwyjqawlmclrsitj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsY3Bod3lqcWF3bG1jbHJzaXRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTQ3MzIsImV4cCI6MjA4OTc5MDczMn0.J2FjVGGs2jlC7WeTC1uhYayzSmh2doESx-UiggjNg2E';

// This function fetches menu items for a specific restaurant
async function getMenuItems(restaurantId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/menu_items?restaurant_id=eq.${restaurantId}&order=category.asc`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    }
  );
  const data = await response.json();
  return data;
}