/* ═══════════════════════════════════════════════════
   Toast Notification System
   ═══════════════════════════════════════════════════ */

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function toast(message, type = 'info', duration = 4000) {
  const c = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span style="font-size:16px;flex-shrink:0">${icons[type] || ''}</span>
    <span style="flex:1">${message}</span>
  `;
  c.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}
