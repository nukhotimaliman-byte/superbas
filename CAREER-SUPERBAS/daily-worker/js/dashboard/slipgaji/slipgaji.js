/**
 * BAS Daily Worker — Slip Gaji Page Module
 * Slip list, accordion, PDF download
 */

const DUMMY_SLIPGAJI = [];

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

  // HEADER BAR
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, W, 40, 'F');

  var textStart = M;
  if (typeof BAS_LOGO_BASE64 !== 'undefined' && BAS_LOGO_BASE64) {
    try { doc.addImage(BAS_LOGO_BASE64, 'PNG', M, 6, 22, 22); textStart = M + 28; } catch (e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(18);
  doc.text('SLIP GAJI', textStart, 16);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text('PT. Barokah Amanah Sentosa', textStart, 23);
  doc.text('Periode ' + s.periode + ' - ' + BULAN[s.bulan - 1] + ' ' + s.year, textStart, 29);
  if (s.tgl_proses) { doc.setFontSize(8); doc.text('Tgl Proses: ' + s.tgl_proses, W - M, 34, { align: 'right' }); }

  // DATA KARYAWAN
  var y = 52;
  doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'bold'); doc.setFontSize(10);
  doc.text('DATA KARYAWAN', M, y);
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 7;
  doc.setFont(undefined, 'normal'); doc.setFontSize(10);
  var empRows = [['Nama', s.nama], ['OPS ID', s.ops], ['Station', s.hub], ['Area', s.area], ['Kota', s.kota]];
  empRows.forEach(function(r) { doc.text(r[0], M, y); doc.text(':  ' + r[1], M + 32, y); y += 6; });

  // PENDAPATAN
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

  // POTONGAN
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

  // TOTAL BOX
  doc.setFillColor(99, 102, 241);
  doc.roundedRect(M, y - 6, PW, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold');
  doc.setFontSize(10); doc.text('TOTAL DIBAYARKAN', M + 10, y + 3);
  doc.setFontSize(18); doc.text(fmtRp(s.total), W - M - 10, y + 6, { align: 'right' }); y += 24;

  // TRANSFER INFO
  doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'bold'); doc.setFontSize(9);
  doc.text('INFORMASI TRANSFER', M, y);
  y += 2; doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 7;
  doc.setFont(undefined, 'normal'); doc.setFontSize(10);
  doc.text('Bank', M, y); doc.text(':  ' + s.bank, M + 32, y); y += 6;
  doc.text('No. Rekening', M, y); doc.text(':  ***' + s.rekening.slice(-4), M + 32, y); y += 6;
  doc.text('Atas Nama', M, y); doc.text(':  ' + s.atas_nama, M + 32, y); y += 10;

  // BOUNCING WARNING
  if (s.bouncing && s.bouncing.toLowerCase() === 'bouncing') {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(M, y - 4, PW, 12, 2, 2, 'F');
    doc.setTextColor(220, 38, 38); doc.setFont(undefined, 'bold'); doc.setFontSize(9);
    doc.text('BOUNCING - ' + (s.note || 'Pembayaran gagal'), M + 5, y + 3); y += 16;
  }

  // FOOTER
  doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 6;
  doc.setTextColor(160); doc.setFont(undefined, 'normal'); doc.setFontSize(7);
  doc.text('Dokumen ini digenerate otomatis oleh sistem BAS pada ' + new Date().toLocaleString('id-ID'), W / 2, y, { align: 'center' });

  doc.save('SlipGaji_' + s.ops + '_' + BULAN[s.bulan - 1].substring(0, 3) + s.year + '_P' + s.periode + '.pdf');
}
