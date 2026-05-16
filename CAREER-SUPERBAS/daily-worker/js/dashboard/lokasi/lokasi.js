/**
 * BAS Daily Worker — Lokasi DC Page Module
 * DC station locations, Google Maps links
 */

// DC Locations data (can be loaded from API later)
var DC_LOCATIONS = [];

async function loadDCLocations() {
  try {
    var res = await fetch(API_BASE + 'site-config.php?action=get_locations');
    var data = await res.json();
    if (data.success && data.data) DC_LOCATIONS = data.data;
  } catch(e) {
    console.warn('Load DC locations failed:', e);
  }
}

function renderLokasi() {
  var container = document.getElementById('lokasiContent');
  if (!container) return;

  if (DC_LOCATIONS.length === 0) {
    // Show user's station if available
    var userStation = USER_DATA.station || '';
    var h = '<div class="lokasi-header-info">' +
      '<h3>Lokasi Distribution Center</h3>' +
      '<p>Temukan lokasi DC station Anda</p>' +
    '</div>';

    if (userStation) {
      var mapsUrl = 'https://www.google.com/maps/search/' + encodeURIComponent('DC ' + userStation + ' BAS');
      h += '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="lokasi-card">' +
        '<div class="lokasi-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>' +
        '<div class="lokasi-card-info">' +
          '<div class="lokasi-card-name">DC ' + userStation + '</div>' +
          '<div class="lokasi-card-address">Tap untuk buka di Google Maps</div>' +
        '</div>' +
        '<div class="lokasi-card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
      '</a>';
    } else {
      h += '<div class="lokasi-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
        '<p>Belum ada data lokasi DC tersedia.<br>Hubungi admin untuk informasi.</p>' +
      '</div>';
    }

    container.innerHTML = h;
    return;
  }

  // Render from API data
  var h = '<div class="lokasi-header-info">' +
    '<h3>Lokasi Distribution Center</h3>' +
    '<p>' + DC_LOCATIONS.length + ' lokasi tersedia</p>' +
  '</div>';

  DC_LOCATIONS.forEach(function(loc) {
    var mapsUrl = loc.maps_url || ('https://www.google.com/maps/search/' + encodeURIComponent(loc.name));
    h += '<a href="' + mapsUrl + '" target="_blank" rel="noopener" class="lokasi-card">' +
      '<div class="lokasi-card-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>' +
      '<div class="lokasi-card-info">' +
        '<div class="lokasi-card-name">' + loc.name + '</div>' +
        '<div class="lokasi-card-address">' + (loc.address || '') + '</div>' +
      '</div>' +
      '<div class="lokasi-card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
    '</a>';
  });

  container.innerHTML = h;
}
