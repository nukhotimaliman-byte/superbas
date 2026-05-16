/**
 * BAS Daily Worker — Rekening Page Module
 * Rekening info, bank card, ganti rekening
 */

var _rekBaru = null;
var _rekBaruLoaded = false;

async function renderRekening() {
  var container = document.getElementById('rekeningContent');
  if (!container) return;

  if (!_rekBaruLoaded) {
    try {
      var r = await fetch('./api/attendance.php?action=rekening_status', {credentials:'same-origin'});
      var d = await r.json();
      _rekBaru = (d && d.request) ? d.request : null;
      _rekBaruLoaded = true;
    } catch(e) { console.warn('[Rekening] API error:', e); }
  }

  var d = USER_DATA;
  var valid = isNameMatch(d.nama, d.atas_nama || '');
  var statusClass = valid ? 'rek-valid' : 'rek-invalid';
  var statusText = valid ? 'Terverifikasi' : 'Tidak Sesuai';

  var h = '';

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

  if (_rekBaru) {
    var nb = _rekBaru;
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

  if (!_rekBaru) {
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

function renderGantiRekening() {
  var container = document.getElementById('gantirekContent');
  if (!container) return;
  var h = '<div class="gantirek-header">' +
    '<div class="gantirek-header-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg></div>' +
    '<h3>Pilih Area Anda</h3>' +
    '<p>Klik link sesuai daerah kerja untuk mengajukan pergantian rekening.</p>' +
  '</div>';
  var gantirekLinks = SITE_LINKS.link_gantirek || [];
  if (gantirekLinks.length === 0) {
    h += '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">Belum ada link ganti rekening tersedia.</div>';
  }
  gantirekLinks.forEach(function(item) {
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
