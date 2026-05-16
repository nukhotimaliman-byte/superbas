/**
 * BAS Daily Worker — Link Gaji Page Module
 * Site links, link gaji per area
 */

var SITE_LINKS = { link_gaji: [], link_gantirek: [] };

async function loadSiteLinks() {
  try {
    var res = await fetch(API_BASE + 'site-config.php?action=get_links');
    var data = await res.json();
    if (data.success) SITE_LINKS = data.data;
  } catch(e) { console.warn('Load site links failed:', e); }
  renderLinkGajiPage();
}

function renderLinkGajiPage() {
  var container = document.getElementById('gajiLinksContainer');
  if (!container) return;
  var links = SITE_LINKS.link_gaji || [];
  if (links.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">Belum ada link gaji tersedia.</div>';
    return;
  }
  var h = '';
  links.forEach(function(item) {
    h += '<a href="' + item.link + '" target="_blank" rel="noopener" class="gaji-link-card">' +
      '<div class="gaji-link-icon si-purple">💰</div>' +
      '<div class="gaji-link-info">' +
        '<div class="gaji-link-title">Link Gaji — ' + item.area + '</div>' +
        '<div class="gaji-link-desc">' + (item.desc || '') + '</div>' +
      '</div>' +
      '<div class="gaji-link-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
    '</a>';
  });
  container.innerHTML = h;
}
