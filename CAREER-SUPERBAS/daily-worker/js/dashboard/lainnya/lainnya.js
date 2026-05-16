/**
 * BAS Daily Worker — Lainnya (All Menu) Page Module
 * Full services grid, edit mode, drag & drop reorder
 */

let editMode = false;

function renderLainnyaPage() {
  editMode = false;
  const b = document.getElementById('editToggleBtn');
  if (b) { b.classList.remove('active'); b.querySelector('span').textContent = 'Edit'; }
  document.getElementById('editHint').style.display = 'none';
  renderLainnyaGrid();
}

function renderLainnyaGrid() {
  const grid = document.getElementById('all-services-grid');
  if (!grid) return;
  const menus = getOrderedMenus();
  grid.innerHTML = menus.map(m => makeItemHTML(m, !editMode)).join('');
  if (editMode) {
    grid.classList.add('edit-mode');
    initGridDrag(grid);
  } else {
    grid.classList.remove('edit-mode');
  }
}

function toggleEditMode() {
  editMode = !editMode;
  const btn = document.getElementById('editToggleBtn');
  const hint = document.getElementById('editHint');
  if (editMode) {
    btn.classList.add('active');
    btn.querySelector('span').textContent = 'Selesai';
    hint.style.display = 'block';
  } else {
    btn.classList.remove('active');
    btn.querySelector('span').textContent = 'Edit';
    hint.style.display = 'none';
    const grid = document.getElementById('all-services-grid');
    const newOrder = Array.from(grid.querySelectorAll('.service-item')).map(i => i.dataset.key);
    saveMenuOrder(newOrder);
    renderHomeGrid();
  }
  renderLainnyaGrid();
}

// ── Grid Drag (edit mode) ──
function initGridDrag(grid) {
  let dragEl = null, placeholder = null, offsetX, offsetY, isLong = false, timer;

  function onStart(e, item) {
    dragEl = item;
    dragEl.classList.add('dragging');
    const rect = dragEl.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    placeholder = document.createElement('div');
    placeholder.className = 'service-item drag-placeholder';
    placeholder.style.width = rect.width + 'px';
    placeholder.style.height = rect.height + 'px';
    dragEl.parentNode.insertBefore(placeholder, dragEl);
    Object.assign(dragEl.style, { position:'fixed', zIndex:'1000', width:rect.width+'px', left:rect.left+'px', top:rect.top+'px', pointerEvents:'none' });
  }

  function onMove(e) {
    if (!dragEl) return;
    e.preventDefault();
    const touch = e.touches ? e.touches[0] : e;
    dragEl.style.left = (touch.clientX - offsetX) + 'px';
    dragEl.style.top = (touch.clientY - offsetY) + 'px';
    const items = Array.from(grid.querySelectorAll('.service-item:not(.dragging):not(.drag-placeholder)'));
    for (const item of items) {
      const r = item.getBoundingClientRect();
      if (touch.clientX > r.left && touch.clientX < r.right && touch.clientY > r.top && touch.clientY < r.bottom) {
        const mid = r.left + r.width / 2;
        grid.insertBefore(placeholder, touch.clientX < mid ? item : item.nextSibling);
        break;
      }
    }
  }

  function onEnd() {
    if (!dragEl) return;
    Object.assign(dragEl.style, { position:'', zIndex:'', width:'', left:'', top:'', pointerEvents:'' });
    dragEl.classList.remove('dragging');
    if (placeholder?.parentNode) { placeholder.parentNode.insertBefore(dragEl, placeholder); placeholder.remove(); }
    placeholder = null; dragEl = null;
  }

  grid.addEventListener('touchstart', e => {
    const item = e.target.closest('.service-item');
    if (!item || item.classList.contains('drag-placeholder')) return;
    timer = setTimeout(() => { isLong = true; onStart(e, item); if(navigator.vibrate) navigator.vibrate(30); }, 300);
  }, { passive: true });
  grid.addEventListener('touchmove', e => { clearTimeout(timer); if (isLong && dragEl) onMove(e); }, { passive: false });
  grid.addEventListener('touchend', () => { clearTimeout(timer); if (isLong) { onEnd(); isLong = false; } });
  grid.addEventListener('mousedown', e => {
    const item = e.target.closest('.service-item');
    if (!item || item.classList.contains('drag-placeholder')) return;
    timer = setTimeout(() => { isLong = true; onStart(e, item); }, 300);
  });
  document.addEventListener('mousemove', e => { if (isLong && dragEl) onMove(e); });
  document.addEventListener('mouseup', () => { clearTimeout(timer); if (isLong) { onEnd(); isLong = false; } });
}
