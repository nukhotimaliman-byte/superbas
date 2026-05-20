/* ═══════════════════════════════════════════════════
   Simple Client-Side Router
   ═══════════════════════════════════════════════════ */

const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.history.pushState({}, '', '/data-kalsul' + path);
  render();
}

export async function render() {
  const path = window.location.pathname.replace('/data-kalsul', '') || '/';
  const app = document.getElementById('app');
  
  // Run cleanup of previous page
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  
  // Find matching route
  const handler = routes[path] || routes['/404'] || routes['/'];
  
  if (handler) {
    const cleanup = await handler(app);
    if (typeof cleanup === 'function') {
      currentCleanup = cleanup;
    }
  }
}

export function initRouter() {
  window.addEventListener('popstate', render);
  
  // Intercept link clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-link]');
    if (link) {
      e.preventDefault();
      navigate(link.getAttribute('href'));
    }
  });
  
  render();
}
