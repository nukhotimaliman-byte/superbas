/**
 * BAS Daily Worker — Aduan Pungli Page Module
 * Report form, submit, locked state
 */

var DUMMY_ADUAN = null;

function renderAduan() {
  var container = document.getElementById('aduanContent');
  if (!container) return;
  var d = USER_DATA;
  var h = '';

  if (DUMMY_ADUAN) {
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
    h += '<div class="aduan-intro">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
      '<h3>Laporkan Pungutan Liar</h3>' +
      '<p>Laporkan jika Anda mengalami pungutan tidak resmi. Laporan bersifat rahasia dan akan ditindaklanjuti oleh tim.</p>' +
    '</div>';

    h += '<div class="aduan-section">' +
      '<div class="aduan-section-title">Detail Pelapor</div>' +
      '<div class="aduan-field"><label>Nama</label><input type="text" value="' + d.nama + '" readonly class="aduan-input aduan-readonly"></div>' +
      '<div class="aduan-field"><label>OPS ID</label><input type="text" value="' + (d.ops_id || '-') + '" readonly class="aduan-input aduan-readonly"></div>' +
      '<div class="aduan-field"><label>Station</label><input type="text" value="' + (d.station || '-') + '" readonly class="aduan-input aduan-readonly"></div>' +
    '</div>';

    h += '<div class="aduan-section">' +
      '<div class="aduan-section-title">Detail Pengaduan</div>' +
      '<div class="aduan-field"><label>Jenis Pungli</label><input type="text" id="aduanJenis" placeholder="Contoh: Potongan gaji tidak resmi" class="aduan-input"></div>' +
      '<div class="aduan-field"><label>Kronologi</label><textarea id="aduanKronologi" placeholder="Ceritakan kronologi kejadian secara detail..." class="aduan-input aduan-textarea" rows="5"></textarea></div>' +
      '<div class="aduan-field"><label>Bukti (opsional)</label>' +
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
