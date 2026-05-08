/**
 * BAS Command Center — Indonesia Province Map v2.0
 * Choropleth heat map + pulse dots + counter badges
 * Fixed: badge overlap, light-mode contrast, theme-aware re-render
 */

/* ── Province ID Mapping (SVG id → provinsi name in DB) ── */
const PROV_MAP = {
  'IDAC': 'Aceh', 'IDSU': 'Sumatera Utara', 'IDSB': 'Sumatera Barat',
  'IDRI': 'Riau', 'IDJA': 'Jambi', 'IDSS': 'Sumatera Selatan',
  'IDBE': 'Bengkulu', 'IDLA': 'Lampung', 'IDBB': 'Bangka-Belitung',
  'IDKR': 'Kepulauan Riau', 'IDJK': 'Dki Jakarta', 'IDJB': 'Jawa Barat',
  'IDJT': 'Jawa Tengah', 'IDYO': 'Yogyakarta', 'IDJI': 'Jawa Timur',
  'IDBT': 'Banten', 'IDBA': 'Bali', 'IDNB': 'Nusa Tenggara Barat',
  'IDNT': 'Nusa Tenggara Timur', 'IDKB': 'Kalimantan Barat',
  'IDKT': 'Kalimantan Tengah', 'IDKS': 'Kalimantan Selatan',
  'IDKI': 'Kalimantan Timur', 'IDKU': 'Kalimantan Utara',
  'IDSA': 'Sulawesi Utara', 'IDST': 'Sulawesi Tengah',
  'IDSN': 'Sulawesi Selatan', 'IDSG': 'Sulawesi Tenggara',
  'IDGO': 'Gorontalo', 'IDSR': 'Sulawesi Barat',
  'IDMA': 'Maluku', 'IDMU': 'Maluku Utara',
  'IDPA': 'Papua', 'IDPB': 'Papua Barat',
};

const NAME_TO_ID = {};
Object.entries(PROV_MAP).forEach(([id, name]) => {
  NAME_TO_ID[name.toLowerCase()] = id;
});

const ALIASES = {
  'dki jakarta': 'IDJK', 'jakarta raya': 'IDJK', 'jakarta': 'IDJK',
  'di yogyakarta': 'IDYO', 'yogyakarta': 'IDYO', 'diy': 'IDYO',
  'north kalimantan': 'IDKU', 'kalimantan utara': 'IDKU',
  'kepulauan bangka belitung': 'IDBB', 'bangka belitung': 'IDBB',
  'kepulauan riau': 'IDKR',
  'nusa tenggara barat': 'IDNB', 'ntb': 'IDNB',
  'nusa tenggara timur': 'IDNT', 'ntt': 'IDNT',
};

/* Manual badge offsets (dx, dy) for crowded regions */
const BADGE_OFFSETS = {
  'IDJB': { dx: 15, dy: 20 },     // Jawa Barat → push right-down
  'IDBT': { dx: -20, dy: -10 },   // Banten → push left-up
  'IDJK': { dx: -10, dy: 10 },    // DKI Jakarta → push left-down
  'IDJT': { dx: 10, dy: -15 },    // Jawa Tengah → push right-up
  'IDJI': { dx: 15, dy: -10 },    // Jawa Timur → push right-up
  'IDYO': { dx: 0, dy: 20 },      // Yogyakarta → push down
  'IDKR': { dx: 0, dy: -15 },     // Kep. Riau → push up
  'IDBB': { dx: 0, dy: 15 },      // Bangka → push down
};

function matchProvince(dbName) {
  const n = dbName.toLowerCase().trim();
  if (NAME_TO_ID[n]) return NAME_TO_ID[n];
  if (ALIASES[n]) return ALIASES[n];
  for (const [key, id] of Object.entries(NAME_TO_ID)) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  for (const [key, id] of Object.entries(ALIASES)) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  return null;
}

/* ── Color Scales (improved light mode contrast) ── */
function getMapColors() {
  const light = document.documentElement.getAttribute('data-theme') === 'light';
  return {
    empty:  light ? '#dfe4ea' : '#1e1e2e',
    level1: light ? '#93c5fd' : '#0c4a6e',
    level2: light ? '#60a5fa' : '#0369a1',
    level3: light ? '#3b82f6' : '#0ea5e9',
    level4: light ? '#1d4ed8' : '#38bdf8',
    stroke: light ? '#94a3b8' : '#2a2a3e',
    strokeHover: light ? '#1d4ed8' : '#38bdf8',
    text:   light ? '#111827' : '#f0f0f0',
    textSub: light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.5)',
    tooltipBg: light ? '#ffffff' : '#1a1a2a',
    tooltipBorder: light ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.08)',
    badge:  light ? '#1d4ed8' : '#38bdf8',
    badgeText: light ? '#ffffff' : '#0a0a14',
    badgeShadow: light ? 'rgba(29,78,216,.35)' : 'rgba(56,189,248,.3)',
    pulseColor: light ? 'rgba(29,78,216,' : 'rgba(56,189,248,',
    pulseDot: light ? '#1d4ed8' : '#38bdf8',
    liveDot: '#22C55E',
  };
}

function getColor(count, colors) {
  if (!count || count === 0) return colors.empty;
  if (count <= 5) return colors.level1;
  if (count <= 20) return colors.level2;
  if (count <= 50) return colors.level3;
  return colors.level4;
}

/* ── Cached data for theme re-render ── */
let _mapCache = null;

/* ── Main Init ── */
async function initIndonesiaMap() {
  const container = Q('#mapContainer');
  if (!container) return;

  try {
    // Load data (cache for theme switches)
    if (!_mapCache) {
      const data = await api('stats.php?action=by_province');
      const provinces = data.provinces || {};
      const today = data.today || {};
      const breakdown = data.breakdown || {};

      const byId = {}, todayById = {}, breakdownById = {};
      Object.entries(provinces).forEach(([name, count]) => {
        const id = matchProvince(name);
        if (id) {
          byId[id] = (byId[id] || 0) + count;
          breakdownById[id] = breakdownById[id] || {};
          const bd = breakdown[name] || {};
          Object.entries(bd).forEach(([proj, cnt]) => {
            breakdownById[id][proj] = (breakdownById[id][proj] || 0) + cnt;
          });
        }
      });
      Object.entries(today).forEach(([name, count]) => {
        const id = matchProvince(name);
        if (id) todayById[id] = (todayById[id] || 0) + count;
      });

      const svgResp = await fetch('/map.svg');
      const svgText = await svgResp.text();
      _mapCache = { svgText, byId, todayById, breakdownById };
    }

    renderMap(container, _mapCache.svgText, _mapCache.byId, _mapCache.todayById, _mapCache.breakdownById);

  } catch (e) {
    console.error('Map error:', e);
    container.innerHTML = '<div class="chart-empty">Gagal memuat peta</div>';
  }
}

function renderMap(container, svgText, byId, todayById, breakdownById) {
  const colors = getMapColors();

  // Top provinces for counter badges
  const sorted = Object.entries(byId).sort((a, b) => b[1] - a[1]);
  const top5 = sorted.slice(0, 5).map(e => e[0]);
  const totalToday = Object.values(todayById).reduce((a, b) => a + b, 0);

  container.innerHTML = `
    <div class="map-wrap">
      <div class="map-svg-box" id="mapSvgBox">${svgText}</div>
      <div class="map-tooltip" id="mapTooltip"></div>
      <div class="map-legend">
        <div class="map-legend-title">Kandidat</div>
        <div class="map-legend-row">
          <span class="map-legend-swatch" style="background:${colors.empty};border:1px solid ${colors.stroke}"></span><span>0</span>
        </div>
        <div class="map-legend-row">
          <span class="map-legend-swatch" style="background:${colors.level1}"></span><span>1–5</span>
        </div>
        <div class="map-legend-row">
          <span class="map-legend-swatch" style="background:${colors.level2}"></span><span>6–20</span>
        </div>
        <div class="map-legend-row">
          <span class="map-legend-swatch" style="background:${colors.level3}"></span><span>21–50</span>
        </div>
        <div class="map-legend-row">
          <span class="map-legend-swatch" style="background:${colors.level4}"></span><span>50+</span>
        </div>
      </div>
      ${totalToday > 0 ? `<div class="map-live"><span class="map-live-dot"></span> LIVE — ${totalToday} registrasi hari ini</div>` : ''}
    </div>
  `;

  const svg = container.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.maxHeight = '400px';

  const paths = svg.querySelectorAll('path[id]');
  paths.forEach(path => {
    const id = path.getAttribute('id');
    const count = byId[id] || 0;
    const fill = getColor(count, colors);

    path.style.fill = fill;
    path.style.stroke = colors.stroke;
    path.style.strokeWidth = '0.5';
    path.style.cursor = count > 0 ? 'pointer' : 'default';
    path.style.transition = 'fill .2s, stroke .2s, filter .2s';

    // Subtle glow for top 3
    if (top5.indexOf(id) < 3 && count > 0) {
      path.style.filter = `drop-shadow(0 0 5px ${colors.pulseColor}0.35))`;
    }

    path.addEventListener('mouseenter', (e) => {
      if (count > 0) {
        path.style.stroke = colors.strokeHover;
        path.style.strokeWidth = '1.5';
        path.style.filter = `drop-shadow(0 0 8px ${colors.pulseColor}0.5))`;
      }
      showTooltip(e, id, count, breakdownById[id], colors);
    });
    path.addEventListener('mousemove', (e) => moveTooltip(e));
    path.addEventListener('mouseleave', () => {
      path.style.stroke = colors.stroke;
      path.style.strokeWidth = '0.5';
      path.style.filter = top5.indexOf(id) < 3 && count > 0
        ? `drop-shadow(0 0 5px ${colors.pulseColor}0.35))`
        : 'none';
      hideTooltip();
    });
  });

  addPulseDots(svg, todayById, colors);
  addCounterBadges(svg, byId, top5, colors);
}

/* ── Tooltip ── */
function showTooltip(e, id, count, bd, colors) {
  const tip = Q('#mapTooltip');
  if (!tip) return;
  const name = PROV_MAP[id] || id;
  let html = `<div class="mtt-name">${name}</div>`;
  if (count > 0) {
    html += `<div class="mtt-count">${count.toLocaleString('id-ID')} kandidat</div>`;
    if (bd) {
      html += '<div class="mtt-divider"></div>';
      if (bd.driver) html += `<div class="mtt-row"><span class="mtt-dot" style="background:#38BDF8"></span>Driver: ${bd.driver}</div>`;
      if (bd.kurir) html += `<div class="mtt-row"><span class="mtt-dot" style="background:#FBBF24"></span>Kurir: ${bd.kurir}</div>`;
      if (bd.daily_worker) html += `<div class="mtt-row"><span class="mtt-dot" style="background:#A78BFA"></span>Daily Worker: ${bd.daily_worker}</div>`;
    }
  } else {
    html += `<div class="mtt-empty">Belum ada kandidat</div>`;
  }
  tip.innerHTML = html;
  tip.style.opacity = '1';
  tip.style.pointerEvents = 'none';
  moveTooltip(e);
}

function moveTooltip(e) {
  const tip = Q('#mapTooltip');
  const box = Q('#mapSvgBox');
  if (!tip || !box) return;
  const rect = box.getBoundingClientRect();
  let x = e.clientX - rect.left + 16;
  let y = e.clientY - rect.top - 10;
  if (x + 200 > rect.width) x = e.clientX - rect.left - 210;
  if (y + 120 > rect.height) y = rect.height - 130;
  if (y < 0) y = 10;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

function hideTooltip() {
  const tip = Q('#mapTooltip');
  if (tip) tip.style.opacity = '0';
}

/* ── Pulse Dots ── */
function addPulseDots(svg, todayById, colors) {
  Object.entries(todayById).forEach(([id, count]) => {
    if (count <= 0) return;
    const path = svg.querySelector(`#${id}`);
    if (!path) return;

    const bbox = path.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;

    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('cx', cx);
    pulse.setAttribute('cy', cy);
    pulse.setAttribute('r', '3');
    pulse.setAttribute('fill', 'none');
    pulse.setAttribute('stroke', colors.pulseDot);
    pulse.setAttribute('stroke-width', '1');
    pulse.setAttribute('class', 'map-pulse');
    svg.appendChild(pulse);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('r', '2');
    dot.setAttribute('fill', colors.pulseDot);
    dot.setAttribute('class', 'map-dot');
    svg.appendChild(dot);
  });
}

/* ── Counter Badges (with overlap prevention) ── */
function addCounterBadges(svg, byId, top5, colors) {
  const placed = []; // track placed badge centers for collision detection

  top5.forEach((id, idx) => {
    const count = byId[id];
    if (!count) return;
    const path = svg.querySelector(`#${id}`);
    if (!path) return;

    const bbox = path.getBBox();
    let cx = bbox.x + bbox.width / 2;
    let cy = bbox.y + bbox.height / 2 - 6;

    // Apply manual offset if defined
    const off = BADGE_OFFSETS[id];
    if (off) { cx += off.dx; cy += off.dy; }

    // Collision avoidance with already placed badges
    for (let attempt = 0; attempt < 5; attempt++) {
      let collision = false;
      for (const p of placed) {
        const dist = Math.sqrt((cx - p.x) ** 2 + (cy - p.y) ** 2);
        if (dist < 18) { collision = true; break; }
      }
      if (!collision) break;
      cy -= 14; // push up
    }
    placed.push({ x: cx, y: cy });

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-badge');

    const label = count.toLocaleString('id-ID');
    const rw = Math.max(18, label.length * 6.5 + 10);

    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    shadow.setAttribute('x', cx - rw / 2 + 1);
    shadow.setAttribute('y', cy - 7);
    shadow.setAttribute('width', rw);
    shadow.setAttribute('height', 16);
    shadow.setAttribute('rx', 8);
    shadow.setAttribute('fill', colors.badgeShadow);
    g.appendChild(shadow);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', cx - rw / 2);
    rect.setAttribute('y', cy - 8);
    rect.setAttribute('width', rw);
    rect.setAttribute('height', 16);
    rect.setAttribute('rx', 8);
    rect.setAttribute('fill', colors.badge);
    g.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy + 4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', colors.badgeText);
    text.setAttribute('font-size', '8.5');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', "'Inter', sans-serif");
    text.textContent = label;
    g.appendChild(text);

    svg.appendChild(g);
  });
}
