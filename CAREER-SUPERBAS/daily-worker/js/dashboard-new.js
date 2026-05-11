/**
 * BAS Daily Worker — Dashboard Logic
 * Menu: 7+Lainnya on Home | All menu grid on Lainnya page | Edit mode for reorder
 */

const ALL_MENUS = [
  { key:'berkas', label:'Pemberkasan', page:'page-berkas', cls:'si-red', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { key:'absensi', label:'Absensi', page:'page-absensi', cls:'si-blue', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key:'slipgaji', label:'Slip Gaji', page:'page-slipgaji', cls:'si-green', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { key:'linkgaji', label:'Link Gaji', page:'page-linkgaji', cls:'si-purple', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' },
  { key:'chat', label:'Chat Admin', cls:'si-orange', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
  { key:'lokasi', label:'Lokasi DC', cls:'si-pink', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { key:'idcard', label:'ID Card', page:'page-idcard', cls:'si-teal', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' },
  { key:'rekening', label:'Rekening', page:'page-rekening', cls:'', style:'background:rgba(6,182,212,0.1);color:#06b6d4;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/></svg>' },
  { key:'gantirek', label:'Ganti Rek', page:'page-gantirek', cls:'', style:'background:rgba(234,179,8,0.1);color:#eab308;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>' },
  { key:'aduan', label:'Aduan Pungli', page:'page-aduan', cls:'', style:'background:rgba(239,68,68,0.1);color:#ef4444;', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
];

function getMenuOrder() {
  try { const s = localStorage.getItem('dw_menu_order'); return s ? JSON.parse(s) : ALL_MENUS.map(m=>m.key); }
  catch(e) { return ALL_MENUS.map(m=>m.key); }
}
function saveMenuOrder(order) { localStorage.setItem('dw_menu_order', JSON.stringify(order)); }
function getOrderedMenus() {
  const order = getMenuOrder();
  const map = {}; ALL_MENUS.forEach(m => map[m.key] = m);
  const ordered = order.filter(k => map[k]).map(k => map[k]);
  ALL_MENUS.forEach(m => { if (!order.includes(m.key)) ordered.push(m); });
  return ordered;
}

function makeItemHTML(m, clickable) {
  const st = m.style ? `style="${m.style}"` : '';
  const click = clickable && m.page ? `onclick="showPage('${m.page}')"` : '';
  return `<div class="service-item" data-key="${m.key}" ${click}><div class="service-icon ${m.cls}" ${st}>${m.icon}</div><span class="service-label">${m.label}</span></div>`;
}

// ── Home Grid: 7 + Lainnya ──
function renderHomeGrid() {
  const grid = document.getElementById('services-grid');
  if (!grid) return;
  const menus = getOrderedMenus().slice(0, 7);
  let html = menus.map(m => makeItemHTML(m, true)).join('');
  html += `<div class="service-item" onclick="showPage('page-lainnya')"><div class="service-icon si-gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div><span class="service-label">Lainnya</span></div>`;
  grid.innerHTML = html;
}

// ── Lainnya Grid: all items ──
let editMode = false;

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
    // Save and refresh home
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

// ── User Data & Notifications ──
var USER_DATA = { nama:'', nik:'', ops_id:'', station:'', join_date:'', bank:'', rekening:'', atas_nama:'', status_berkas:'Belum Pemberkasan', status_gaji:'' };
var CURRENT_USER = null;

function showPage(pageId) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId)?.classList.add('active');
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
  if (pageId === 'page-lainnya') { editMode = false; const b=document.getElementById('editToggleBtn'); if(b){b.classList.remove('active');b.querySelector('span').textContent='Edit';} document.getElementById('editHint').style.display='none'; renderLainnyaGrid(); }
  if (pageId === 'page-absensi') renderAbsensi();
  if (pageId === 'page-slipgaji') renderSlipGaji();
  if (pageId === 'page-rekening') renderRekening();
  if (pageId === 'page-gantirek') renderGantiRekening();
  if (pageId === 'page-aduan') renderAduan();
  if (pageId === 'page-berkas') renderBerkas();
  if (pageId === 'page-idcard') BASIdCard.render('idcardContent', USER_DATA);
  if (pageId === 'page-settings') renderSettings();
  if (pageId === 'page-chat' && typeof UserChat !== 'undefined') UserChat.init();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNotifications() {
  const c = document.getElementById('notif-container'); if (!c) return;
  let h = '';
  const hasBerkas = USER_DATA.status_berkas === 'Sudah Pemberkasan';
  const hasOps = USER_DATA.ops_id && USER_DATA.ops_id !== '';
  const hasGaji = USER_DATA.status_gaji === 'Sudah isi link gaji';
  if (!hasOps) {
    if (!hasBerkas) h += `<div class="notif-box notif-berkas animate-in"><div class="notif-icon ni-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div class="notif-text"><div class="notif-title">Segera Lakukan Pemberkasan!</div><div class="notif-desc">Lengkapi dokumen untuk proses selanjutnya</div></div><button class="notif-btn nb-orange" onclick="showPage('page-berkas')">Isi</button></div>`;
    h += `<div class="notif-box notif-grup animate-in"><div class="notif-icon ni-green"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></div><div class="notif-text"><div class="notif-title">Segera Join Grup!</div><div class="notif-desc">Gabung grup WhatsApp station Anda</div></div><button class="notif-btn nb-green" onclick="document.getElementById('linktree-section').scrollIntoView({behavior:'smooth'})">Join</button></div>`;
  }
  if (hasOps && !hasGaji) h += `<div class="notif-box notif-gaji animate-in"><div class="notif-icon ni-purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div><div class="notif-text"><div class="notif-title">Segera Isi Link Gaji!</div><div class="notif-desc">Lakukan pengisian data penggajian</div></div><button class="notif-btn nb-purple" onclick="showPage('page-linkgaji')">Isi</button></div>`;
  // Rekening mismatch warning
  if (hasGaji && USER_DATA.atas_nama && !isNameMatch(USER_DATA.nama, USER_DATA.atas_nama)) {
    h += `<div class="notif-box notif-rek animate-in"><div class="notif-icon ni-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="notif-text"><div class="notif-title">Rekening Tidak Sesuai!</div><div class="notif-desc">Gunakan rekening atas nama Anda sendiri</div></div><button class="notif-btn nb-red" onclick="showPage('page-gantirek')">Ganti</button></div>`;
  }
  c.innerHTML = h;
}

function updateOpsCard() {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = USER_DATA.nama;
  if (el('userAvatar')) el('userAvatar').textContent = USER_DATA.nama.split(' ').map(n=>n[0]).join('').substring(0,2);
  if (USER_DATA.ops_id) {
    if (el('opsId')) el('opsId').textContent = USER_DATA.ops_id.split('').join(' ');
    if (el('opsStation')) el('opsStation').textContent = USER_DATA.station;
    if (el('joinDate')) el('joinDate').textContent = USER_DATA.join_date;
    if (el('statusGajiCard')) el('statusGajiCard').textContent = USER_DATA.status_gaji==='Sudah isi link gaji' ? 'SUDAH \u2713' : 'BELUM \u2717';
  } else {
    if (el('opsId')) el('opsId').textContent = '- Menunggu OPS ID -';
    if (el('opsStation')) el('opsStation').textContent = 'Belum terdaftar di sistem operasional';
    if (el('statusGajiCard')) el('statusGajiCard').textContent = '\u2014';
    if (el('joinDate')) el('joinDate').textContent = '\u2014';
  }
  if (el('statusGaji')) { el('statusGaji').textContent = USER_DATA.status_gaji==='Sudah isi link gaji'?'Sudah':'Belum'; el('statusGaji').className='qi-value '+(USER_DATA.status_gaji==='Sudah isi link gaji'?'success':'pending'); }
  if (el('bankName')) el('bankName').textContent = USER_DATA.bank||'\u2014';
  if (el('rekeningNo')) el('rekeningNo').textContent = USER_DATA.rekening?'***'+USER_DATA.rekening.slice(-4):'\u2014';
}



// ══════════════════════════════════════════
// ABSENSI PAGE
// ══════════════════════════════════════════
const DUMMY_ABSENSI = [];

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HARI = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderAbsensi();
}

function renderAbsensi() {
  const ml = document.getElementById('monthLabel');
  if (ml) ml.textContent = BULAN[currentMonth] + ' ' + currentYear;

  const monthStr = String(currentMonth + 1).padStart(2, '0');
  const data = DUMMY_ABSENSI.filter(d => d.date.startsWith(currentYear + '-' + monthStr));

  // Split by period
  const p1Data = data.filter(d => parseInt(d.date.split('-')[2]) <= 15);
  const p2Data = data.filter(d => parseInt(d.date.split('-')[2]) > 15);
  const hadirDates = {};
  data.forEach(d => { const day = parseInt(d.date.split('-')[2]); hadirDates[day] = day <= 15 ? 'p1' : 'p2'; });

  // Summary cards
  const e = id => document.getElementById(id);
  if (e('absP1')) e('absP1').textContent = p1Data.length;
  if (e('absP2')) e('absP2').textContent = p2Data.length;
  if (e('absTotalAll')) e('absTotalAll').textContent = data.length;

  // Gaji dates
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  if (e('absP1Gaji')) e('absP1Gaji').textContent = 'Gaji: 25 ' + BULAN[currentMonth].substring(0,3);
  if (e('absP2Gaji')) e('absP2Gaji').textContent = 'Gaji: 10 ' + BULAN[nextMonth].substring(0,3);

  // Remark Banner
  const rb = e('remarkBanner');
  if (rb) {
    rb.innerHTML = `
      <div class="remark-item r1"><span class="remark-icon">📅</span> <strong>Periode 1</strong>&nbsp;(tgl 1-15) → Gajian <strong>25 ${BULAN[currentMonth]} ${currentYear}</strong></div>
      <div class="remark-item r2"><span class="remark-icon">📅</span> <strong>Periode 2</strong>&nbsp;(tgl 16+) → Gajian <strong>10 ${BULAN[nextMonth]} ${nextYear}</strong></div>
    `;
  }

  // Calendar
  const cal = e('miniCalendar');
  if (cal) {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    let html = '<div class="cal-header">';
    HARI.forEach(h => html += `<div class="cal-day-name">${h}</div>`);
    html += '</div><div class="cal-grid">';
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-cell empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      let cls = 'cal-cell';
      if (isCurrentMonth && d === today.getDate()) cls += ' today';
      if (hadirDates[d]) cls += ' hadir-' + hadirDates[d];
      html += `<div class="${cls}">${d}</div>`;
    }
    html += '</div>';
    cal.innerHTML = html;
  }

  // List
  const list = e('absensiList');
  if (list) {
    if (data.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-secondary);font-size:13px;">Belum ada data absensi bulan ini</div>';
      return;
    }
    list.innerHTML = [...data].reverse().map(d => {
      const dt = new Date(d.date);
      const dayNum = dt.getDate();
      const dayName = HARI[dt.getDay()];
      const periode = dayNum <= 15 ? 'P1' : 'P2';
      const pCls = dayNum <= 15 ? 'p1' : 'p2';
      return `<div class="abs-item">
        <div class="abs-date-box"><div class="abs-date-num">${dayNum}</div><div class="abs-date-day">${dayName}</div></div>
        <div class="abs-info"><div class="abs-shift">${d.shifting}</div><div class="abs-station">${d.station}</div></div>
        <div class="abs-badge ${pCls}">${periode}</div>
      </div>`;
    }).join('');
  }
}

// ══════════════════════════════════════════
// SLIP GAJI PAGE — List + Accordion + PDF
// ══════════════════════════════════════════
const DUMMY_SLIPGAJI = [];

function fmtRp(n) { return !n||n===0?'-':'Rp '+Number(n).toLocaleString('id-ID'); }

function renderSlipGaji() {
  const sum = document.getElementById('slipSummary');
  const list = document.getElementById('slipList');
  if (!sum||!list) return;
  const data = [...DUMMY_SLIPGAJI].reverse();
  const totalAll = DUMMY_SLIPGAJI.reduce((a,s)=>a+s.total,0);

  sum.innerHTML = `<div class="slip-sum-card"><div class="slip-sum-label">Total Pendapatan</div><div class="slip-sum-amount">${fmtRp(totalAll)}</div><div class="slip-sum-count">${data.length} slip gaji tersedia</div></div>`;

  list.innerHTML = data.map((s,i) => {
    const isBouncing = s.bouncing&&s.bouncing.toLowerCase()==='bouncing';
    const badge = isBouncing?'<span class="slip-badge bouncing">BOUNCING</span>':s.status?'<span class="slip-badge done">DIBAYAR</span>':'<span class="slip-badge pending">PROSES</span>';
    const pLabel = BULAN[s.bulan-1]+' '+s.year+' — P'+s.periode;
    const earnings = [['Gaji Pokok ('+s.hk+' HK × '+fmtRp(s.rate)+')',s.gaji],['Rapel',s.rapel],['Insentif Kehadiran',s.att_incentive],['Insentif Campaign',s.camp_incentive],['Insentif Performa',s.perf_incentive],['Claim',s.claim]].filter(e=>e[1]);
    const deductions = [['Pot. Pribadi',s.pot_pribadi],['Asuransi',s.asuransi]].filter(d=>d[1]);
    const totE = s.gaji+s.rapel+s.att_incentive+s.camp_incentive+s.perf_incentive+s.claim;
    const totD = s.pot_pribadi+s.asuransi;

    return `<div class="slip-item" data-idx="${i}">
      <div class="slip-item-header" onclick="toggleSlip(${i})">
        <div class="slip-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="slip-item-info"><div class="slip-item-period">${pLabel}</div><div class="slip-item-amount">${fmtRp(s.total)}</div></div>
        ${badge}
        <div class="slip-chevron" id="chevron-${i}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>
      </div>
      <div class="slip-item-body" id="slip-body-${i}">
        <div class="slip-detail-section"><div class="slip-detail-title earn">PENDAPATAN</div>${earnings.map(e=>`<div class="slip-detail-row"><span>${e[0]}</span><span class="positive">${fmtRp(e[1])}</span></div>`).join('')}<div class="slip-detail-row subtotal"><span>Subtotal</span><span class="positive">${fmtRp(totE)}</span></div></div>
        ${deductions.length?`<div class="slip-detail-section"><div class="slip-detail-title deduct">POTONGAN</div>${deductions.map(d=>`<div class="slip-detail-row"><span>${d[0]}</span><span class="negative">- ${fmtRp(d[1])}</span></div>`).join('')}<div class="slip-detail-row subtotal"><span>Subtotal</span><span class="negative">- ${fmtRp(totD)}</span></div></div>`:''}
        <div class="slip-detail-total"><div>TOTAL DIBAYARKAN</div><div class="slip-total-num">${fmtRp(s.total)}</div></div>
        <div class="slip-detail-transfer"><span>Transfer: ${s.bank} — ***${s.rekening.slice(-4)} a.n. ${s.atas_nama}</span></div>
        ${isBouncing?'<div class="slip-detail-warn">⚠️ BOUNCING — '+(s.note||'Pembayaran gagal')+'</div>':''}
        <button class="slip-dl-btn" onclick="event.stopPropagation();downloadSlipPDF(${i})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download PDF</button>
      </div>
    </div>`;
  }).join('');
}

function toggleSlip(i) {
  const body = document.getElementById('slip-body-'+i);
  const chev = document.getElementById('chevron-'+i);
  if (!body) return;
  const isOpen = body.classList.contains('open');
  document.querySelectorAll('.slip-item-body.open').forEach(b=>{b.classList.remove('open');});
  document.querySelectorAll('.slip-chevron.open').forEach(c=>{c.classList.remove('open');});
  if (!isOpen) { body.classList.add('open'); chev.classList.add('open'); }
}

function downloadSlipPDF(idx) {
  var data = DUMMY_SLIPGAJI.slice().reverse();
  var s = data[idx];
  if (!s) return;

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var W = 210, M = 20, PW = W - M * 2;

  // ── HEADER BAR ──
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, W, 40, 'F');

  var textStart = M;
  if (BAS_LOGO_BASE64) {
    try {
      doc.addImage(BAS_LOGO_BASE64, 'PNG', M, 6, 22, 22);
      textStart = M + 28;
    } catch (e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(18);
  doc.text('SLIP GAJI', textStart, 16);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text('PT. Barokah Amanah Sentosa', textStart, 23);
  doc.text('Periode ' + s.periode + ' - ' + BULAN[s.bulan - 1] + ' ' + s.year, textStart, 29);
  if (s.tgl_proses) {
    doc.setFontSize(8);
    doc.text('Tgl Proses: ' + s.tgl_proses, W - M, 34, { align: 'right' });
  }

  // ── DATA KARYAWAN ──
  var y = 52;
  doc.setTextColor(50, 50, 50);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('DATA KARYAWAN', M, y);
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 7;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  var empRows = [['Nama', s.nama], ['OPS ID', s.ops], ['Station', s.hub], ['Area', s.area], ['Kota', s.kota]];
  empRows.forEach(function(r) { doc.text(r[0], M, y); doc.text(':  ' + r[1], M + 32, y); y += 6; });

  // ── PENDAPATAN ──
  y += 4;
  doc.setFillColor(236, 253, 245);
  doc.rect(M, y - 4, PW, 8, 'F');
  doc.setFont(undefined, 'bold'); doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text('PENDAPATAN', M + 3, y + 1); y += 8;

  doc.setTextColor(50, 50, 50); doc.setFontSize(10);
  var earns = [['Gaji Pokok (' + s.hk + ' HK x ' + fmtRp(s.rate) + ')', s.gaji], ['Rapel', s.rapel],
    ['Insentif Kehadiran', s.att_incentive], ['Insentif Campaign', s.camp_incentive],
    ['Insentif Performa', s.perf_incentive], ['Claim', s.claim]];
  var totE = 0;
  earns.forEach(function(e) { if (!e[1]) return; totE += e[1]; doc.setFont(undefined, 'normal'); doc.text(e[0], M + 3, y); doc.text(fmtRp(e[1]), W - M - 3, y, { align: 'right' }); y += 6; });
  doc.setDrawColor(180); doc.line(M, y - 2, W - M, y - 2);
  doc.setFont(undefined, 'bold'); doc.text('Subtotal Pendapatan', M + 3, y + 2);
  doc.setTextColor(5, 150, 105); doc.text(fmtRp(totE), W - M - 3, y + 2, { align: 'right' }); y += 12;

  // ── POTONGAN ──
  doc.setTextColor(50, 50, 50);
  doc.setFillColor(254, 242, 242);
  doc.rect(M, y - 4, PW, 8, 'F');
  doc.setFont(undefined, 'bold'); doc.setFontSize(9);
  doc.setTextColor(220, 38, 38);
  doc.text('POTONGAN', M + 3, y + 1); y += 8;

  doc.setTextColor(50, 50, 50); doc.setFontSize(10);
  var deds = [['Potongan Pribadi', s.pot_pribadi], ['Asuransi', s.asuransi]];
  var totD = 0;
  deds.forEach(function(d) { if (!d[1]) return; totD += d[1]; doc.setFont(undefined, 'normal'); doc.text(d[0], M + 3, y); doc.text('- ' + fmtRp(d[1]), W - M - 3, y, { align: 'right' }); y += 6; });
  doc.setDrawColor(180); doc.line(M, y - 2, W - M, y - 2);
  doc.setFont(undefined, 'bold'); doc.text('Subtotal Potongan', M + 3, y + 2);
  doc.setTextColor(220, 38, 38); doc.text(totD ? '- ' + fmtRp(totD) : '-', W - M - 3, y + 2, { align: 'right' }); y += 16;

  // ── TOTAL BOX ──
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(M, y - 6, PW, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold');
  doc.setFontSize(10); doc.text('TOTAL DIBAYARKAN', M + 10, y + 3);
  doc.setFontSize(18); doc.text(fmtRp(s.total), W - M - 10, y + 6, { align: 'right' }); y += 24;

  // ── TRANSFER INFO ──
  doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'bold'); doc.setFontSize(9);
  doc.text('INFORMASI TRANSFER', M, y);
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 7;
  doc.setFont(undefined, 'normal'); doc.setFontSize(10);
  doc.text('Bank', M, y); doc.text(':  ' + s.bank, M + 32, y); y += 6;
  doc.text('No. Rekening', M, y); doc.text(':  ***' + s.rekening.slice(-4), M + 32, y); y += 6;
  doc.text('Atas Nama', M, y); doc.text(':  ' + s.atas_nama, M + 32, y); y += 10;

  // ── BOUNCING WARNING ──
  if (s.bouncing && s.bouncing.toLowerCase() === 'bouncing') {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(M, y - 4, PW, 12, 2, 2, 'F');
    doc.setTextColor(220, 38, 38); doc.setFont(undefined, 'bold'); doc.setFontSize(9);
    doc.text('BOUNCING - ' + (s.note || 'Pembayaran gagal'), M + 5, y + 3); y += 16;
  }

  // ── FOOTER ──
  doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 6;
  doc.setTextColor(160); doc.setFont(undefined, 'normal'); doc.setFontSize(7);
  doc.text('Dokumen ini digenerate otomatis oleh sistem BAS pada ' + new Date().toLocaleString('id-ID'), W / 2, y, { align: 'center' });

  doc.save('SlipGaji_' + s.ops + '_' + BULAN[s.bulan - 1].substring(0, 3) + s.year + '_P' + s.periode + '.pdf');
}

// ══════════════════════════════════════════
// SMART NAME MATCHING
// ══════════════════════════════════════════
function normalizeNama(str) {
  return str.toLowerCase()
    .replace(/[.,\-_'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  var m = a.length, n = b.length;
  var d = [];
  for (var i = 0; i <= m; i++) { d[i] = [i]; }
  for (var j = 0; j <= n; j++) { d[0][j] = j; }
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      var cost = a[i-1] === b[j-1] ? 0 : 1;
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + cost);
    }
  }
  return d[m][n];
}

function tokenSimilarity(a, b) {
  var maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - (levenshtein(a, b) / maxLen);
}

function isNameMatch(nama1, nama2) {
  var n1 = normalizeNama(nama1);
  var n2 = normalizeNama(nama2);
  // Exact match after normalize
  if (n1 === n2) return true;
  // Tokenize
  var t1 = n1.split(' ').filter(function(w) { return w.length > 1; });
  var t2 = n2.split(' ').filter(function(w) { return w.length > 1; });
  // Check if any token from nama1 matches any token from nama2 (>60% similar)
  for (var i = 0; i < t1.length; i++) {
    for (var j = 0; j < t2.length; j++) {
      if (tokenSimilarity(t1[i], t2[j]) >= 0.6) return true;
    }
  }
  return false;
}

// ══════════════════════════════════════════
// REKENING PAGE
// ══════════════════════════════════════════

// Dummy data: rekening baru dari GDoc pergantian (null = belum ada pengajuan)
var DUMMY_REK_BARU = null;
// Contoh jika ada pengajuan:
// var DUMMY_REK_BARU = { bank: 'BCA', rekening: '7820334106', atas_nama: 'Ramdan RH Woli', tgl_ajuan: '2026-05-08', status: 'Menunggu Verifikasi' };

function renderRekening() {
  var container = document.getElementById('rekeningContent');
  if (!container) return;
  var d = USER_DATA;
  var valid = isNameMatch(d.nama, d.atas_nama || '');
  var statusClass = valid ? 'rek-valid' : 'rek-invalid';
  var statusText = valid ? 'Terverifikasi' : 'Tidak Sesuai';

  var h = '';

  // Warning banner if invalid
  if (!valid) {
    h += '<div class="rek-warning">' +
      '<div class="rek-warning-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>' +
      '<div class="rek-warning-text">' +
        '<strong>Rekening bukan milik Anda!</strong><br>' +
        'Nama pemilik rekening tidak sesuai dengan nama Anda. Segera ganti menggunakan rekening atas nama sendiri.' +
      '</div>' +
      '<button class="rek-warning-btn" onclick="showPage(\'page-gantirek\')">Ganti Rekening</button>' +
    '</div>';
  }

  // Section: Rekening Aktif (dari Link Gaji)
  h += '<div class="rek-section-label">Rekening Aktif <span class="rek-source">dari Link Gaji</span></div>';
  h += buildBankCard(d.bank, d.rekening, d.atas_nama, statusClass, statusText, false);
  h += '<div class="rek-info-section">' +
    '<div class="rek-info-title">Detail Rekening Aktif</div>' +
    '<div class="rek-info-row"><span>Nama OPS</span><span>' + d.nama + '</span></div>' +
    '<div class="rek-info-row"><span>Nama Pemilik Rek</span><span>' + (d.atas_nama || '-') + '</span></div>' +
    '<div class="rek-info-row"><span>Status</span><span class="' + statusClass + '">' + statusText + '</span></div>' +
    '<div class="rek-info-row"><span>Bank</span><span>' + (d.bank || '-') + '</span></div>' +
    '<div class="rek-info-row"><span>No. Rekening</span><span>' + (d.rekening || '-') + '</span></div>' +
  '</div>';

  // Section: Rekening Pengajuan Baru (dari GDoc Pergantian)
  if (DUMMY_REK_BARU) {
    var nb = DUMMY_REK_BARU;
    var validBaru = isNameMatch(d.nama, nb.atas_nama || '');
    var scBaru = validBaru ? 'rek-valid' : 'rek-invalid';
    var stBaru = validBaru ? 'Terverifikasi' : 'Tidak Sesuai';
    var statusAjuan = nb.status || 'Menunggu Verifikasi';

    h += '<div class="rek-section-label" style="margin-top:24px;">Rekening Pengajuan Baru <span class="rek-source">dari Form Pergantian</span></div>';
    h += buildBankCard(nb.bank, nb.rekening, nb.atas_nama, scBaru, stBaru, true);
    h += '<div class="rek-info-section">' +
      '<div class="rek-info-title">Detail Pengajuan Baru</div>' +
      '<div class="rek-info-row"><span>Bank Baru</span><span>' + (nb.bank || '-') + '</span></div>' +
      '<div class="rek-info-row"><span>No. Rekening Baru</span><span>' + (nb.rekening || '-') + '</span></div>' +
      '<div class="rek-info-row"><span>Atas Nama</span><span>' + (nb.atas_nama || '-') + '</span></div>' +
      '<div class="rek-info-row"><span>Nama Cocok</span><span class="' + scBaru + '">' + stBaru + '</span></div>' +
      '<div class="rek-info-row"><span>Tanggal Ajuan</span><span>' + (nb.tgl_ajuan || '-') + '</span></div>' +
      '<div class="rek-info-row"><span>Status Pengajuan</span><span class="rek-pending">' + statusAjuan + '</span></div>' +
    '</div>';
  } else {
    h += '<div class="rek-section-label" style="margin-top:24px;">Rekening Pengajuan Baru <span class="rek-source">dari Form Pergantian</span></div>';
    h += '<div class="rek-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/></svg>' +
      '<p>Belum ada pengajuan pergantian rekening</p>' +
    '</div>';
  }

  // Button — hanya tampil jika belum ada pengajuan
  if (!DUMMY_REK_BARU) {
    h += '<button class="rek-change-btn" onclick="showPage(\'page-gantirek\')">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>' +
      ' Ajukan Pergantian Rekening</button>';
  }

  container.innerHTML = h;
}

function buildBankCard(bank, rek, nama, statusClass, statusText, isNew) {
  var gradient = isNew
    ? 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)'
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)';
  var shadow = isNew
    ? '0 8px 32px rgba(5,150,105,0.35)'
    : '0 8px 32px rgba(99,102,241,0.35)';
  return '<div class="bank-card" style="background:' + gradient + ';box-shadow:' + shadow + ';">' +
    '<div class="bank-card-top">' +
      '<div class="bank-card-label">Bank</div>' +
      '<div class="bank-card-bank">' + (bank || '-') + '</div>' +
    '</div>' +
    '<div class="bank-card-number">' + formatRekening(rek || '-') + '</div>' +
    '<div class="bank-card-bottom">' +
      '<div>' +
        '<div class="bank-card-label">Atas Nama</div>' +
        '<div class="bank-card-name">' + (nama || '-') + '</div>' +
      '</div>' +
      '<div class="bank-card-status ' + statusClass + '">' + statusText + '</div>' +
    '</div>' +
  '</div>';
}

function formatRekening(rek) {
  if (!rek || rek === '-') return '-';
  return rek.replace(/(.{4})/g, '$1 ').trim();
}

// ══════════════════════════════════════════
// GANTI REKENING PAGE
// ══════════════════════════════════════════
const DUMMY_GANTIREK_LINKS = [
  { area: 'Sulawesi + Papua', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', link: '#', desc: 'Form pergantian rekening wilayah Sulawesi & Papua' },
  { area: 'Kalimantan', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', link: '#', desc: 'Form pergantian rekening wilayah Kalimantan' },
  { area: 'Sumatera', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', link: '#', desc: 'Form pergantian rekening wilayah Sumatera' },
  { area: 'Jawa + Bali + NTB + NTT', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>', link: '#', desc: 'Form pergantian rekening wilayah Jawa, Bali, NTB, NTT' },
];

function renderGantiRekening() {
  var container = document.getElementById('gantirekContent');
  if (!container) return;
  var h = '<div class="gantirek-header">' +
    '<div class="gantirek-header-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></div>' +
    '<h3>Pilih Area Anda</h3>' +
    '<p>Klik link sesuai daerah kerja untuk mengajukan pergantian rekening.</p>' +
  '</div>';
  DUMMY_GANTIREK_LINKS.forEach(function(item) {
    h += '<a href="' + item.link + '" target="_blank" class="gantirek-link">' +
      '<div class="gantirek-link-icon">' + item.icon + '</div>' +
      '<div class="gantirek-link-info">' +
        '<div class="gantirek-link-title">' + item.area + '</div>' +
        '<div class="gantirek-link-desc">' + item.desc + '</div>' +
      '</div>' +
      '<div class="gantirek-link-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
    '</a>';
  });
  container.innerHTML = h;
}


// ══════════════════════════════════════════
// ADUAN PUNGLI PAGE
// ══════════════════════════════════════════
var DUMMY_ADUAN = null;
// Contoh jika sudah ada aduan:
// var DUMMY_ADUAN = { tiket: 'ADU-20260508-001', jenis: 'Potongan gaji tidak resmi', kronologi: 'Dipotong Rp50.000 tanpa keterangan...', bukti: 'bukti.jpg', tgl: '2026-05-08', status: 'Diterima' };

function renderAduan() {
  var container = document.getElementById('aduanContent');
  if (!container) return;
  var d = USER_DATA;
  var h = '';

  if (DUMMY_ADUAN) {
    // Sudah ada aduan — tampilkan riwayat, locked
    var a = DUMMY_ADUAN;
    var statusCls = a.status === 'Selesai' ? 'aduan-selesai' : (a.status === 'Diproses' ? 'aduan-proses' : 'aduan-diterima');
    h += '<div class="aduan-locked-banner">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
      ' Anda sudah mengirim laporan. Pengaduan tidak dapat dikirim lebih dari 1 kali.</div>';

    h += '<div class="aduan-card">' +
      '<div class="aduan-card-header">' +
        '<div class="aduan-tiket">' + a.tiket + '</div>' +
        '<div class="aduan-status ' + statusCls + '">' + a.status + '</div>' +
      '</div>' +
      '<div class="aduan-detail">' +
        '<div class="aduan-row"><span>Tanggal Laporan</span><span>' + a.tgl + '</span></div>' +
        '<div class="aduan-row"><span>Pelapor</span><span>' + d.nama + '</span></div>' +
        '<div class="aduan-row"><span>OPS ID</span><span>' + (d.ops_id || '-') + '</span></div>' +
        '<div class="aduan-row"><span>Station</span><span>' + (d.station || '-') + '</span></div>' +
        '<div class="aduan-row"><span>Jenis Pungli</span><span>' + a.jenis + '</span></div>' +
      '</div>' +
      '<div class="aduan-kronologi">' +
        '<div class="aduan-kronologi-label">Kronologi</div>' +
        '<div class="aduan-kronologi-text">' + a.kronologi + '</div>' +
      '</div>' +
      (a.bukti ? '<div class="aduan-bukti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Bukti terlampir</div>' : '') +
    '</div>';
  } else {
    // Belum ada aduan — tampilkan form
    h += '<div class="aduan-intro">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
      '<h3>Laporkan Pungutan Liar</h3>' +
      '<p>Laporkan jika Anda mengalami pungutan tidak resmi. Laporan bersifat rahasia dan akan ditindaklanjuti oleh tim.</p>' +
    '</div>';

    // Detail Pelapor (auto-filled, read-only)
    h += '<div class="aduan-section">' +
      '<div class="aduan-section-title">Detail Pelapor</div>' +
      '<div class="aduan-field">' +
        '<label>Nama</label>' +
        '<input type="text" value="' + d.nama + '" readonly class="aduan-input aduan-readonly">' +
      '</div>' +
      '<div class="aduan-field">' +
        '<label>OPS ID</label>' +
        '<input type="text" value="' + (d.ops_id || '-') + '" readonly class="aduan-input aduan-readonly">' +
      '</div>' +
      '<div class="aduan-field">' +
        '<label>Station</label>' +
        '<input type="text" value="' + (d.station || '-') + '" readonly class="aduan-input aduan-readonly">' +
      '</div>' +
    '</div>';

    // Form Pengaduan
    h += '<div class="aduan-section">' +
      '<div class="aduan-section-title">Detail Pengaduan</div>' +
      '<div class="aduan-field">' +
        '<label>Jenis Pungli</label>' +
        '<input type="text" id="aduanJenis" placeholder="Contoh: Potongan gaji tidak resmi" class="aduan-input">' +
      '</div>' +
      '<div class="aduan-field">' +
        '<label>Kronologi</label>' +
        '<textarea id="aduanKronologi" placeholder="Ceritakan kronologi kejadian secara detail..." class="aduan-input aduan-textarea" rows="5"></textarea>' +
      '</div>' +
      '<div class="aduan-field">' +
        '<label>Bukti (opsional)</label>' +
        '<div class="aduan-upload" onclick="BASCamera.open(function(photo,size){window._aduanBukti=photo;document.getElementById(\'aduanFileName\').textContent=\'Foto (\'+ size +\' KB)\';document.getElementById(\'aduanPreviewThumb\').src=photo;document.getElementById(\'aduanPreviewThumb\').style.display=\'block\';})">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 9h2M19 9h2"/></svg>' +
          '<span id="aduanFileName">Tap untuk buka kamera</span>' +
        '</div>' +
        '<img id="aduanPreviewThumb" src="" style="display:none;width:100%;border-radius:10px;margin-top:8px;">' +
    '</div>';

    h += '<button class="aduan-submit" onclick="submitAduan()">Kirim Laporan</button>';
  }

  container.innerHTML = h;
}

function submitAduan() {
  var jenis = document.getElementById('aduanJenis').value.trim();
  var kronologi = document.getElementById('aduanKronologi').value.trim();
  var bukti = window._aduanBukti || '';

  if (!jenis) { alert('Harap isi jenis pungli'); return; }
  if (!kronologi) { alert('Harap isi kronologi kejadian'); return; }

  var tiket = 'ADU-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + String(Math.floor(Math.random()*999)+1).padStart(3,'0');

  DUMMY_ADUAN = {
    tiket: tiket,
    jenis: jenis,
    kronologi: kronologi,
    bukti: bukti,
    tgl: new Date().toLocaleDateString('id-ID'),
    status: 'Diterima'
  };

  renderAduan();
}

// ══════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════
function renderSettings() {
  var container = document.getElementById('settingsContent');
  if (!container) return;
  var isDark = document.body.classList.contains('dark-mode');

  var h = '<div style="padding:16px;">';

  // Appearance section
  h += '<div class="set-section">' +
    '<div class="set-section-title">Tampilan</div>' +
    '<div class="set-row">' +
      '<div class="set-row-left">' +
        '<div class="set-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></div>' +
        '<div><div class="set-label">Mode Gelap</div><div class="set-desc">Tampilan lebih nyaman di malam hari</div></div>' +
      '</div>' +
      '<label class="set-toggle">' +
        '<input type="checkbox" id="darkModeToggle" ' + (isDark ? 'checked' : '') + ' onchange="toggleDarkMode(this.checked)">' +
        '<span class="set-toggle-slider"></span>' +
      '</label>' +
    '</div>' +
  '</div>';

  // Account section
  h += '<div class="set-section">' +
    '<div class="set-section-title">Akun</div>' +
    '<div class="set-row">' +
      '<div class="set-row-left">' +
        '<div class="set-icon set-icon-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>' +
        '<div><div class="set-label">' + USER_DATA.nama + '</div><div class="set-desc">' + (USER_DATA.ops_id || 'Belum ada OPS ID') + '</div></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  // Logout
  h += '<button class="set-logout" onclick="doLogout()">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
    'Keluar dari Akun</button>';

  h += '</div>';
  container.innerHTML = h;
}

function toggleDarkMode(on) {
  if (on) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('bas_dark_mode', '1');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('bas_dark_mode', '0');
  }
}

function initDarkMode() {
  if (localStorage.getItem('bas_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
  }
}

function doLogout() {
  if (confirm('Yakin ingin keluar dari akun?')) {
    if (typeof handleUserLogout === 'function') { handleUserLogout(); }
    else { localStorage.clear(); sessionStorage.clear(); window.location.href = 'login.html'; }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initDarkMode();

  // Auth check
  if (typeof checkUserAuth === 'function') {
    try {
      CURRENT_USER = await checkUserAuth();
      if (!CURRENT_USER) { window.location.href = 'login.html'; return; }
      if (['owner','korlap','korlap_interview','korlap_td'].includes(CURRENT_USER.role)) { window.location.href = 'admin.html'; return; }
      // Load candidate data from API
      try {
        const res = await fetch('./api/candidates.php?user_id=' + CURRENT_USER.id);
        const data = await res.json();
        if (data.candidate) {
          const c = data.candidate;
          USER_DATA.nama = c.name || CURRENT_USER.name || '';
          USER_DATA.nik = c.nik || CURRENT_USER.nik || '';
          USER_DATA.ops_id = c.given_id || c.candidate_id || '';
          USER_DATA.station = c.location_name || '';
          USER_DATA.join_date = c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '';
          USER_DATA.bank = c.bank_name || '';
          USER_DATA.rekening = c.bank_account_no || '';
          USER_DATA.atas_nama = c.bank_account_name || '';
          USER_DATA.status_berkas = c.status || 'Belum Pemberkasan';
          USER_DATA.status_gaji = '';
        } else {
          USER_DATA.nama = CURRENT_USER.name || '';
          USER_DATA.nik = CURRENT_USER.nik || '';
        }
      } catch(e) { console.warn('Failed to load candidate:', e); USER_DATA.nama = CURRENT_USER.name || ''; }

      // Enrich with importrange data (station, bank, gaji status)
      // Use only the LATEST record (sorted by last_synced_at DESC)
      try {
        var searchKey = USER_DATA.nik || USER_DATA.ops_id || '';
        if (searchKey) {
          var irRes = await fetch('./api/importrange.php?action=list&search=' + encodeURIComponent(searchKey) + '&limit=1');
          var irData = await irRes.json();
          if (irData.success && irData.data && irData.data.length > 0) {
            var ir = irData.data[0]; // latest record only
            // Override all fields from the most recent importrange data
            if (ir.ops_id) USER_DATA.ops_id = ir.ops_id;
            if (ir.station) USER_DATA.station = ir.station;
            if (ir.bank) USER_DATA.bank = ir.bank;
            if (ir.rekening) USER_DATA.rekening = ir.rekening;
            if (ir.atas_nama) USER_DATA.atas_nama = ir.atas_nama;
            if (ir.join_date) USER_DATA.join_date = ir.join_date;
            if (ir.status_gaji) USER_DATA.status_gaji = ir.status_gaji;
            if (ir.nama) USER_DATA.nama = ir.nama;
          }
        }
      } catch(e) { console.warn('Importrange enrich failed:', e); }

    } catch(e) { console.warn('Auth check failed:', e); }
  }

  renderHomeGrid();
  updateOpsCard();
  updateNotifications();
  loadLinktree();
  document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  var chatBtn = document.getElementById('chatBtn');
  if (chatBtn) chatBtn.addEventListener('click', function() { showPage('page-chat'); });
});

// ══════════════════════════════════════════
// LINKTREE — Dynamic from API
// ══════════════════════════════════════════
const LT_SVG = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};
const LT_CHEVRON = '<svg class="lt-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
const LT_ARROW = '<div class="lt-link-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>';

function ltIcon(key) { return LT_SVG[key] || LT_SVG.link; }
function ltIconClass(key) { return ['whatsapp','instagram','tiktok','facebook','youtube','telegram'].includes(key) ? ' ic-'+key : ' ic-link'; }

function renderLtLink(l) {
  var esc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
  return '<a href="'+esc(l.url)+'" target="_blank" rel="noopener" class="lt-link">' +
    '<div class="lt-link-icon'+ltIconClass(l.icon_key)+'">'+ltIcon(l.icon_key)+'</div>' +
    '<div class="lt-link-body"><div class="lt-link-title">'+esc(l.title)+'</div>' +
    (l.description ? '<div class="lt-link-desc">'+esc(l.description)+'</div>' : '') +
    '</div>' + LT_ARROW + '</a>';
}

async function loadLinktree() {
  var container = document.getElementById('linktreeContainer');
  if (!container) return;
  try {
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, 4000);
    var res = await fetch('api/linktree.php?action=list', { signal: ctrl.signal });
    clearTimeout(timer);
    var json = await res.json();
    if (!json.ok || !json.links || json.links.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--text-secondary);font-size:13px;">Belum ada link tersedia</div>';
      return;
    }
    var standalone = [];
    var groups = {};
    json.links.forEach(function(l) {
      if (l.group_name) {
        if (!groups[l.group_name]) groups[l.group_name] = { order: parseInt(l.group_order)||0, items: [] };
        groups[l.group_name].items.push(l);
      } else {
        standalone.push(l);
      }
    });
    var sortedGroups = Object.entries(groups).sort(function(a,b){ return a[1].order - b[1].order; });
    var html = '<div class="lt-container">';
    // Standalone links first
    standalone.forEach(function(l){ html += renderLtLink(l); });
    // Grouped links
    sortedGroups.forEach(function(entry) {
      var name = entry[0], data = entry[1];
      html += '<div class="lt-group">' +
        '<div class="lt-group-header" onclick="this.parentElement.classList.toggle(\'lt-collapsed\')">' +
          LT_CHEVRON +
          '<span class="lt-group-title">'+name+'</span>' +
          '<span class="lt-group-count">'+data.items.length+'</span>' +
        '</div>' +
        '<div class="lt-group-body">';
      data.items.forEach(function(l){ html += renderLtLink(l); });
      html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
    // Auto-collapse groups on mobile to save space
    container.querySelectorAll('.lt-group').forEach(function(g){ g.classList.add('lt-collapsed'); });
  } catch(e) {
    console.warn('Linktree load failed:', e);
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--text-secondary);font-size:13px;">Gagal memuat link</div>';
  }
}
