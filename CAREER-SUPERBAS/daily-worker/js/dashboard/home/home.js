/**
 * BAS Daily Worker — Home Page Module
 * OPS card, services grid, notifications, linktree
 */

// ── Home Grid: 7 + Lainnya ──
function renderHomeGrid() {
  const grid = document.getElementById('services-grid');
  if (!grid) return;
  const menus = getOrderedMenus().slice(0, 7);
  let html = menus.map(m => makeItemHTML(m, true)).join('');
  html += `<div class="service-item" onclick="showPage('page-lainnya')"><div class="service-icon si-gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></div><span class="service-label">Lainnya</span></div>`;
  grid.innerHTML = html;
}

// ── OPS Card ──
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

  // UX Enhancements
  renderProgressRing();
  renderSalaryEstimator();
}

// ── Progress Ring (OPS Card completion) ──
function renderProgressRing() {
  var container = document.getElementById('opsProgressRing');
  if (!container) return;

  var steps = [
    { label: 'Berkas', done: USER_DATA.status_berkas === 'Sudah Pemberkasan' },
    { label: 'OPS ID', done: !!(USER_DATA.ops_id && USER_DATA.ops_id !== '') },
    { label: 'Link Gaji', done: USER_DATA.status_gaji === 'Sudah isi link gaji' },
    { label: 'Rekening', done: !!(USER_DATA.rekening && USER_DATA.rekening !== '') },
  ];

  var doneCount = steps.filter(function(s) { return s.done; }).length;
  var pct = Math.round((doneCount / steps.length) * 100);

  // SVG progress ring
  var R = 21, C = 2 * Math.PI * R;
  var offset = C - (C * pct / 100);

  var h = '<svg class="progress-ring-svg" viewBox="0 0 54 54">' +
    '<circle class="progress-ring-bg" cx="27" cy="27" r="' + R + '"/>' +
    '<circle class="progress-ring-bar" cx="27" cy="27" r="' + R + '" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '"/>' +
    '<text class="progress-ring-text" x="27" y="31">' + pct + '%</text>' +
  '</svg>' +
  '<div class="progress-ring-info">' +
    '<div class="progress-ring-label">Kelengkapan Profil</div>' +
    '<div class="progress-ring-value">' + doneCount + '/' + steps.length + ' Selesai</div>' +
    '<div class="progress-ring-steps">' +
      steps.map(function(s) { return '<span class="progress-step' + (s.done ? ' done' : '') + '">' + s.label + '</span>'; }).join('') +
    '</div>' +
  '</div>';

  container.innerHTML = h;
}

// ── Salary Estimator ──
function renderSalaryEstimator() {
  var container = document.getElementById('salaryEstimator');
  if (!container) return;

  // Only show if user has OPS ID (is an active worker)
  if (!USER_DATA.ops_id) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  // Calculate current period attendance
  var today = new Date();
  var day = today.getDate();
  var periodeLabel = day <= 15 ? 'Periode 1 (1-15)' : 'Periode 2 (16+)';
  var monthLabel = typeof BULAN !== 'undefined' ? BULAN[today.getMonth()] : '';

  // Estimate from cached absensi data
  var monthKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
  var absensiData = (typeof _absensiCache !== 'undefined' && _absensiCache[monthKey]) ? _absensiCache[monthKey] : [];

  var periodeData = day <= 15
    ? absensiData.filter(function(d) { return parseInt(d.date.split('-')[2]) <= 15; })
    : absensiData.filter(function(d) { return parseInt(d.date.split('-')[2]) > 15; });

  var hk = periodeData.length;
  var dailyRate = 74000; // Default DW rate
  var estimated = hk * dailyRate;

  var h = '<div class="salary-est-header">' +
    '<div class="salary-est-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>' +
    '<div><div class="salary-est-title">Estimasi Gaji</div><div class="salary-est-subtitle">' + periodeLabel + ' — ' + monthLabel + '</div></div>' +
  '</div>' +
  '<div class="salary-est-body">' +
    '<div class="salary-est-row"><span>Hari Kerja (HK)</span><span>' + hk + ' hari</span></div>' +
    '<div class="salary-est-row"><span>Rate / Hari</span><span>' + fmtRp(dailyRate) + '</span></div>' +
    '<div class="salary-est-total"><span>Estimasi Total</span><span>' + fmtRp(estimated) + '</span></div>' +
  '</div>' +
  '<div class="salary-est-note">* Estimasi berdasarkan data absensi saat ini. Belum termasuk insentif & potongan.</div>';

  container.innerHTML = h;
}

// ── Notifications ──
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
    standalone.forEach(function(l){ html += renderLtLink(l); });
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
    container.querySelectorAll('.lt-group').forEach(function(g){ g.classList.add('lt-collapsed'); });
  } catch(e) {
    console.warn('Linktree load failed:', e);
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--text-secondary);font-size:13px;">Gagal memuat link</div>';
  }
}
