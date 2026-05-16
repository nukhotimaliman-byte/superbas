/**
 * BAS Daily Worker — Absensi Page Module
 * Calendar, summary cards, attendance list, month navigation
 */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let _absensiCache = {};

function changeMonth(dir) {
  currentMonth += dir;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderAbsensi();
}

async function renderAbsensi() {
  const ml = document.getElementById('monthLabel');
  if (ml) ml.textContent = BULAN[currentMonth] + ' ' + currentYear;

  const monthStr = String(currentMonth + 1).padStart(2, '0');
  const monthKey = currentYear + '-' + monthStr;

  // Fetch from API (cache per month)
  let data = _absensiCache[monthKey];
  if (!data) {
    try {
      const r = await fetch('/daily-worker/api/attendance.php?action=history&month=' + monthKey, {credentials:'same-origin'});
      const d = await r.json();
      data = (d && d.attendance) ? d.attendance : [];
      _absensiCache[monthKey] = data;
      if (d && d.ops_id) {
        const opsEl = document.getElementById('absOpsId');
        if (opsEl) opsEl.textContent = d.ops_id;
      }
    } catch(e) {
      console.warn('[Absensi] API error:', e);
      data = [];
    }
  }

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

  // Streak
  renderStreak(data);
}

// ── Attendance Streak ──
function renderStreak(data) {
  var container = document.getElementById('absStreak');
  if (!container) return;
  if (!data || data.length === 0) { container.innerHTML = ''; return; }

  // Sort dates ascending
  var dates = data.map(function(d) { return d.date; }).sort();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate streak from latest date backwards
  var streak = 0;
  var checkDate = new Date(today);

  // Build set of attendance dates
  var dateSet = {};
  dates.forEach(function(d) { dateSet[d] = true; });

  // Count consecutive days from today backwards
  for (var i = 0; i < 60; i++) {
    var key = checkDate.getFullYear() + '-' +
      String(checkDate.getMonth() + 1).padStart(2, '0') + '-' +
      String(checkDate.getDate()).padStart(2, '0');

    if (dateSet[key]) {
      streak++;
    } else if (i > 0) {
      break; // streak broken
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (streak === 0) { container.innerHTML = ''; return; }

  // Last 7 days dots
  var dots = '';
  for (var j = 6; j >= 0; j--) {
    var d = new Date(today);
    d.setDate(d.getDate() - j);
    var dk = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    var cls = 'abs-streak-dot';
    if (dateSet[dk]) cls += ' active';
    if (j === 0) cls += ' today';
    dots += '<div class="' + cls + '"></div>';
  }

  container.innerHTML = '<div class="abs-streak-fire">🔥</div>' +
    '<div class="abs-streak-info">' +
      '<div class="abs-streak-count">' + streak + ' <small>hari berturut-turut</small></div>' +
      '<div class="abs-streak-label">Streak kehadiran Anda bulan ini</div>' +
      '<div class="abs-streak-bar">' + dots + '</div>' +
    '</div>';
}
