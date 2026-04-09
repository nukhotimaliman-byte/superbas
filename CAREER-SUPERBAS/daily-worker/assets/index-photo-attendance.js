/**
 * BAS — Photo Attendance Module
 * Absen foto masuk/keluar dengan kamera + GPS
 * Inject tab "Absen" ke bottom nav user app
 */
(function () {
  'use strict';

  // ═══════════════════════════════════════════
  //  CONFIG
  // ═══════════════════════════════════════════
  const CAMERA_FACING = 'user'; // front camera

  function resolvePhotoApiUrl() {
    const origin = window.location.origin;
    const path = window.location.pathname || '';
    if (path.includes('/daily-worker/')) {
      return `${origin}/daily-worker/api/absen-foto.php`;
    }
    return `${origin}/api/absen-foto.php`;
  }

  const API_URL = resolvePhotoApiUrl();

  // ═══════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════
  let stream = null;
  let currentUser = null;
  let panelVisible = false;
  let gpsData = { lat: null, lng: null, accuracy: null, alamat: null };
  let isUploading = false;
  const PHOTO_DIMENSION = 960;
  const PHOTO_TARGET_BYTES = 350 * 1024;
  const PHOTO_MAX_BYTES = 520 * 1024;

  // ═══════════════════════════════════════════
  //  GET USER SESSION
  // ═══════════════════════════════════════════
  function getUser() {
    try {
      const raw = localStorage.getItem('bas_session');
      if (raw) {
        const data = JSON.parse(atob(raw));
        return data.user || null;
      }
    } catch (e) {}
    try {
      const raw = sessionStorage.getItem('bas_session');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  // ═══════════════════════════════════════════
  //  INJECT NAV BUTTON
  // ═══════════════════════════════════════════
  function injectNavButton() {
    let delegationAdded = false;

    function doInject() {
      const nav = document.querySelector('nav[class*="fixed"][class*="bottom-0"] .flex');
      if (!nav) return false;
      if (document.getElementById('absen-foto-nav-btn')) return true; // already there

      const buttons = nav.querySelectorAll('button');
      if (buttons.length < 2) return false; // React hasn't rendered fully

      const btn = document.createElement('button');
      btn.id = 'absen-foto-nav-btn';
      btn.className = 'flex flex-col items-center justify-center w-full h-full group relative outline-none transition-smooth active:scale-90';
      btn.innerHTML = `
        <div class="nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden"></div>
        <div class="nav-icon-wrap mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
        <span class="nav-label text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100">Absen</span>
      `;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePanel(true);
        setActiveNav(btn);
      });

      // Clear active state when another tab is clicked
      document.addEventListener('click', function(e) {
        var clickedNav = e.target.closest('nav[class*="fixed"][class*="bottom-0"] button');
        if (clickedNav) {
            // If clicking a standard React tab, release the Body CSS Suppression lock
            if (clickedNav.id !== 'absen-foto-nav-btn' && clickedNav.id !== 'settings-nav-btn') {
                document.body.classList.remove('custom-tab-active');
            }
            if (clickedNav.id !== 'absen-foto-nav-btn') {
                var absenBtn = document.getElementById('absen-foto-nav-btn');
                if (absenBtn) resetNavStyle(absenBtn);
            }
        }
      });

      // Insert as position #2 (after Home)
      const secondBtn = buttons[1];
      if (secondBtn) {
        nav.insertBefore(btn, secondBtn);
      } else {
        nav.appendChild(btn);
      }

      // Event delegation: close photo panel when ANY other nav button is clicked
      if (!delegationAdded) {
        delegationAdded = true;
        document.addEventListener('click', function (e) {
          if (!panelVisible) return;
          const navBtn = e.target.closest('nav[class*="fixed"][class*="bottom-0"] button');
          if (navBtn && navBtn.id !== 'absen-foto-nav-btn') {
            togglePanel(false);
            const absenBtn = document.getElementById('absen-foto-nav-btn');
            if (absenBtn) resetNavStyle(absenBtn);
          }
        }, true);
      }

      return true;
    }

    // Try immediately and with retries
    if (!doInject()) {
      const checkNav = setInterval(() => { if (doInject()) clearInterval(checkNav); }, 500);
      setTimeout(() => clearInterval(checkNav), 15000);
    }

    // Re-inject if React re-renders nav (keeps our button alive)
    new MutationObserver(function () {
      if (!document.getElementById('absen-foto-nav-btn')) doInject();
    }).observe(document.body, { childList: true, subtree: true });
  }

  function setActiveNav(btn) {
    const nav = btn.closest('.flex');
    if (!nav) return;
    
    // Engages the React DOM CSS Suppressor logic
    document.body.classList.add('custom-tab-active');
    
    // Reset ALL tabs to completely inactive state using exact Tailwind strings
    nav.querySelectorAll('button').forEach(b => {
        b.classList.remove('is-custom-active');
        const wrap = b.querySelector('div.mb-1');
        if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105';
        
        const label = b.querySelector('span.text-\\[10px\\]') || b.querySelector('span');
        if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100';
        
        const indicator = b.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || b.querySelector('.nav-active-indicator');
        if (indicator) {
            indicator.style.display = 'none';
            indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden';
        }
    });

    // Activate the clicked custom tab using exact Tailwind strings! (Perfect animation parity)
    const wrap = btn.querySelector('div.mb-1');
    if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-[#f72585] -translate-y-1 bg-white/5 scale-110 shadow-[0_0_15px_rgba(247,37,133,0.3)]';
    
    const label = btn.querySelector('span.text-\\[10px\\]') || btn.querySelector('span');
    if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-white opacity-100';
    
    const indicator = btn.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || btn.querySelector('.nav-active-indicator');
    if (indicator) {
        indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585]';
        indicator.style.display = ''; // Clear display none
        void indicator.offsetWidth; // Force CSS reflow to restart animation frame!
        indicator.classList.add('animate-slide-in-bottom');
    }
    
    // Mark this specific button to avoid being flattened by the CSS Suppressor
    btn.classList.add('is-custom-active');
  }

  function resetNavStyle(btn) {
    btn.classList.remove('is-custom-active');
    const wrap = btn.querySelector('div.mb-1');
    if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105';
    
    const label = btn.querySelector('span.text-\\[10px\\]') || btn.querySelector('span');
    if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100';
    
    const indicator = btn.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || btn.querySelector('.nav-active-indicator');
    if (indicator) {
        indicator.style.display = 'none';
        indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden';
    }
  }

  // ═══════════════════════════════════════════
  //  PANEL
  // ═══════════════════════════════════════════
  function createPanel() {
    const existing = document.getElementById('photo-attendance-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'photo-attendance-panel';
    panel.className = 'photo-att-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="pa-container">
        <!-- Header -->
        <div class="pa-header">
          <h2 class="pa-title">📷 Absen Foto</h2>
          <button class="pa-close-btn" id="pa-close">&times;</button>
        </div>

        <!-- Camera Preview -->
        <div class="pa-camera-wrap" id="pa-camera-wrap">
          <video id="pa-video" autoplay playsinline muted></video>
          <canvas id="pa-canvas" style="display:none"></canvas>
          <div class="pa-camera-overlay" id="pa-cam-overlay">
            <div class="pa-face-guide"></div>
            <!-- Live Logo Watermark Preview -->
            <img id="pa-logo-watermark" style="position:absolute; top:16px; right:16px; width:100px; opacity:0.45; z-index:10; pointer-events:none;" />
          </div>
          <!-- Captured preview -->
          <img id="pa-preview" class="pa-preview-img" style="display:none" />
        </div>

        <!-- GPS Info -->
        <div class="pa-gps-info" id="pa-gps-info">
          <div class="pa-gps-dot"></div>
          <div style="flex:1;min-width:0">
            <div id="pa-gps-area" style="font-size:13px;font-weight:800;color:#fff;margin-bottom:2px">Mencari lokasi...</div>
            <div id="pa-gps-coords" style="font-size:10px;color:#64748b"></div>
            <!-- Live Alamat Preview -->
            <div id="pa-gps-alamat" style="font-size:9px;color:#94a3b8;margin-top:2px;line-height:1.2;"></div>
          </div>
        </div>

        <!-- Time Display -->
        <div class="pa-time" id="pa-time"></div>

        <!-- Station Selection -->
        <div class="pa-station-wrap" style="padding: 0 16px; margin-top: 16px; margin-bottom: 20px;">
          <p style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Pilih Station Absen:</p>
          <div style="position:relative;">
            <select id="pa-station-select" onchange="window.checkStationSelection()" style="width: 100%; border:1px solid rgba(148,163,184,0.3); background:transparent; color:inherit; border-radius: 12px; padding: 14px; font-size: 14px; font-weight: 700; outline: none; appearance:none; backdrop-filter:blur(10px);">
              <option value="">-- Wajib Pilih Station --</option>
            </select>
            <div style="position:absolute; right:14px; top:50%; transform:translateY(-50%); pointer-events:none; color:#94a3b8;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pa-actions" id="pa-actions">
          <button class="pa-btn pa-btn-masuk pa-btn-disabled" id="pa-btn-masuk" disabled style="transition: all 0.3s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            MASUK
          </button>
          <button class="pa-btn pa-btn-keluar pa-btn-disabled" id="pa-btn-keluar" disabled style="transition: all 0.3s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            KELUAR
          </button>
        </div>

        <!-- Status -->
        <div class="pa-status" id="pa-status" style="display:none"></div>

        <!-- Today's History -->
        <div class="pa-history">
          <h3 class="pa-history-title">Riwayat Hari Ini</h3>
          <div id="pa-history-list" class="pa-history-list">
            <p class="pa-history-empty">Belum ada absen hari ini</p>
          </div>
        </div>
      </div>
    `;

    const root = document.getElementById('root') || document.body;
    root.appendChild(panel);

    // Event listeners
    document.getElementById('pa-close').addEventListener('click', () => togglePanel(false));
    document.getElementById('pa-btn-masuk').addEventListener('click', () => captureAndUpload('checkin'));
    document.getElementById('pa-btn-keluar').addEventListener('click', () => captureAndUpload('checkout'));

    // Start clock
    updateClock();
    setInterval(updateClock, 1000);
  }

  function togglePanel(show) {
    const panel = document.getElementById('photo-attendance-panel');
    const main = document.querySelector('main');
    const settingsPanel = document.getElementById('settings-panel');

    if (show) {
      currentUser = getUser();
      if (!currentUser) {
        alert('Silakan login terlebih dahulu.');
        return;
      }
      if (panel) panel.style.display = 'block';
      if (main) main.style.display = 'none';
      
      // Load stations from Google Apps Script
      loadStations();

      // Hide settings panel properly (uses CSS class, not display)
      if (settingsPanel && settingsPanel.classList.contains('active')) {
        settingsPanel.classList.remove('active');
        document.documentElement.classList.remove('settings-panel-open');
        const settingsBtn = document.getElementById('settings-nav-btn');
        if (settingsBtn) settingsBtn.classList.remove('active');
      }
      panelVisible = true;
      // Initialize live logo watermark
      const logoWm = document.getElementById('pa-logo-watermark');
      if (logoWm && !logoWm.getAttribute('src')) {
        logoWm.src = window.__BAS_WHITE_LOGO || 'assets/LogoBas.png';
      }

      startCamera();
      getGPS();
      loadHistory();
    } else {
      if (panel) panel.style.display = 'none';
      // Only restore main if settings panel isn't about to open
      if (main) main.style.display = '';
      panelVisible = false;
      stopCamera();
    }
  }

  // ═══════════════════════════════════════════
  //  CAMERA
  // ═══════════════════════════════════════════
  async function startCamera() {
    const video = document.getElementById('pa-video');
    const preview = document.getElementById('pa-preview');
    const overlay = document.getElementById('pa-cam-overlay');
    if (!video) return;

    // Reset to camera mode
    video.style.display = 'block';
    preview.style.display = 'none';
    overlay.style.display = 'flex';

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: CAMERA_FACING, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      video.srcObject = stream;
    } catch (err) {
      console.error('Camera error:', err);
      showStatus('❌ Kamera tidak tersedia. Izinkan akses kamera.', 'error');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  let basLogoImg = null;

  function estimateDataUrlBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return 0;
    const payload = dataUrl.split(',')[1] || '';
    return Math.ceil((payload.length * 3) / 4);
  }

  function canvasToOptimizedJpeg(canvas) {
    let quality = 0.82;
    let best = canvas.toDataURL('image/jpeg', quality);
    let bytes = estimateDataUrlBytes(best);

    while (bytes > PHOTO_TARGET_BYTES && quality > 0.68) {
      quality = Math.max(0.68, quality - 0.04);
      const candidate = canvas.toDataURL('image/jpeg', quality);
      const candidateBytes = estimateDataUrlBytes(candidate);
      best = candidate;
      bytes = candidateBytes;
      if (candidateBytes <= PHOTO_TARGET_BYTES) break;
    }

    if (bytes > PHOTO_MAX_BYTES) {
      quality = Math.max(0.64, quality - 0.04);
      best = canvas.toDataURL('image/jpeg', quality);
    }

    return best;
  }

  function capturePhoto() {
    const video = document.getElementById('pa-video');
    const canvas = document.getElementById('pa-canvas');
    if (!video || !canvas) return null;

    // Load logo if not loaded
    if (!basLogoImg) {
      basLogoImg = new Image();
      basLogoImg.src = window.__BAS_WHITE_LOGO || 'assets/LogoBas.png';
    }

    // Set canvas size to a moderate resolution for sharp text watermarks and lighter uploads.
    const maxDim = PHOTO_DIMENSION;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    // Mirror for front camera
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw Transparent Logo Watermark (Top Right)
    if (basLogoImg && basLogoImg.complete) {
      ctx.globalAlpha = 0.45;
      const logoW = 120;
      const logoH = 120 * (basLogoImg.height / basLogoImg.width) || 24;
      ctx.drawImage(basLogoImg, w - logoW - 16, 16, logoW, logoH);
      ctx.globalAlpha = 1.0;
    }

    // Add timestamp + location watermark
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID');
    
    // Wrap full address text
    let wrappedAlamat = [];
    let wmH = 28; // Base height for time + GPS
    if (gpsData.alamat) {
      const words = gpsData.alamat.split(' ');
      let currentLine = words[0];
      for (let i = 1; i < words.length; i++) {
        if (currentLine.length + words[i].length < 60) {
          currentLine += ' ' + words[i];
        } else {
          wrappedAlamat.push(currentLine);
          currentLine = words[i];
        }
      }
      wrappedAlamat.push(currentLine);
      wmH += (wrappedAlamat.length * 13);
    } else if (gpsData.area) {
      wmH += 14;
    }

    // Draw dark ribbon background
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, h - wmH - 4, w, wmH + 4);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    let wmY = h - wmH + 9;
    ctx.fillText(timeStr, 8, wmY);
    
    if (gpsData.lat) {
      wmY += 14;
      ctx.fillText(`GPS: ${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)}`, 8, wmY);
    }
    
    if (gpsData.alamat && wrappedAlamat.length > 0) {
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#4cc9f0';
      wrappedAlamat.forEach(line => {
        wmY += 13;
        ctx.fillText(line, 8, wmY);
      });
    } else if (gpsData.area) {
      wmY += 14;
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = '#4cc9f0';
      ctx.fillText(gpsData.area, 8, wmY);
    }

    return canvasToOptimizedJpeg(canvas);
  }

  // ═══════════════════════════════════════════
  //  GPS
  // ═══════════════════════════════════════════
  function getGPS() {
    const gpsDot = document.querySelector('.pa-gps-dot');
    const areaEl = document.getElementById('pa-gps-area');

    if (!navigator.geolocation) {
      if (areaEl) areaEl.textContent = '⚠️ GPS tidak tersedia';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsData.lat = pos.coords.latitude;
        gpsData.lng = pos.coords.longitude;
        gpsData.accuracy = pos.coords.accuracy;
        const coordsEl = document.getElementById('pa-gps-coords');
        const areaEl = document.getElementById('pa-gps-area');
        if (areaEl) areaEl.textContent = '📍 Lokasi ditemukan';
        if (coordsEl) coordsEl.textContent = `${gpsData.lat.toFixed(6)}, ${gpsData.lng.toFixed(6)} (±${Math.round(gpsData.accuracy)}m)`;
        if (gpsDot) gpsDot.classList.add('active');

        // Try reverse geocode (simple, no API key needed)
        reverseGeocode(gpsData.lat, gpsData.lng);
      },
      (err) => {
        const areaErr = document.getElementById('pa-gps-area');
        if (areaErr) areaErr.textContent = '⚠️ Lokasi tidak ditemukan. Izinkan GPS.';
        console.warn('GPS error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function reverseGeocode(lat, lng) {
    try {
      // Primary: Nominatim for full detailed address
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&email=admin@super-bas.com&accept-language=id`);
      if (!res.ok) throw new Error('Nominatim limit reached or blocked');
      
      const data = await res.json();
      if (data.display_name) {
        gpsData.alamat = data.display_name;
        const parts = data.display_name.split(',').map(s => s.trim());
        const areaName = parts.slice(0, 3).join(', ');
        gpsData.area = areaName;
        
        const areaEl = document.getElementById('pa-gps-area');
        if (areaEl) {
          areaEl.textContent = '📍 ' + areaName;
          areaEl.style.color = '#4cc9f0';
        }
        const alamatEl = document.getElementById('pa-gps-alamat');
        if (alamatEl) {
          alamatEl.textContent = data.display_name;
        }
      } else {
        throw new Error('No display_name found');
      }
    } catch (e) {
      console.warn('Nominatim Geocoding failed, trying fallback:', e);
      // Fallback: Free BigDataCloud Client-side Geocoder
      try {
        const fallRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`);
        const bdc = await fallRes.json();
        const fallbackAddress = [bdc.locality, bdc.city, bdc.principalSubdivision, bdc.countryName].filter(Boolean).join(', ');
        
        gpsData.alamat = fallbackAddress;
        gpsData.area = bdc.locality || bdc.city || 'Area Ditemukan';
        
        const areaEl = document.getElementById('pa-gps-area');
        if (areaEl) {
          areaEl.textContent = '📍 ' + gpsData.area;
          areaEl.style.color = '#4cc9f0';
        }
        const alamatEl = document.getElementById('pa-gps-alamat');
        if (alamatEl) {
          alamatEl.textContent = fallbackAddress;
        }
      } catch (err) {
        console.warn('All geocoding failed:', err);
      }
    }
  }

  // ═══════════════════════════════════════════
  //  CAPTURE & UPLOAD
  // ═══════════════════════════════════════════
  async function captureAndUpload(action) {
    if (isUploading) return;

    const user = getUser();
    if (!user) {
      showStatus('❌ Sesi tidak valid. Silakan login ulang.', 'error');
      return;
    }

    // Require explicit station selection
    const stationSel = document.getElementById('pa-station-select');
    if (!stationSel || !stationSel.value) {
      showStatus('❌ Peringatan: Pilih Station Absen terlebih dahulu!', 'error');
      return;
    }

    // Capture photo
    const base64 = capturePhoto();
    if (!base64) {
      showStatus('❌ Gagal mengambil foto. Coba lagi.', 'error');
      return;
    }

    // Show preview
    const video = document.getElementById('pa-video');
    const preview = document.getElementById('pa-preview');
    const overlay = document.getElementById('pa-cam-overlay');
    if (video) video.style.display = 'none';
    if (preview) { preview.src = base64; preview.style.display = 'block'; }
    if (overlay) overlay.style.display = 'none';

    // Disable buttons
    isUploading = true;
    const btnMasuk = document.getElementById('pa-btn-masuk');
    const btnKeluar = document.getElementById('pa-btn-keluar');
    if (btnMasuk) btnMasuk.disabled = true;
    if (btnKeluar) btnKeluar.disabled = true;

    showStatus('⏳ Mengunggah foto...', 'loading');

    try {
      const payload = {
        action: action,
        ops_id: user.opsId || user.ops_id || user.ops || user.OPS || user['OPS ID'] || '',
        nama: user.name || user.nama || user.Nama || '',
        foto: base64,
        latitude: gpsData.lat,
        longitude: gpsData.lng,
        alamat: gpsData.alamat,
        station: stationSel.value
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (result.error) {
        showStatus('❌ ' + result.error, 'error');
      } else {
        const tipe = action === 'checkin' ? 'MASUK' : 'KELUAR';
        const kb = result.compression && result.compression.kilobytes
          ? ` • ${result.compression.kilobytes} KB`
          : '';
        showStatus(`✅ Absen ${tipe} berhasil! ${result.timestamp || ''}${kb}`, 'success');
        loadHistory();
      }
    } catch (err) {
      console.error('Upload error:', err);
      showStatus('❌ Gagal upload. Periksa koneksi internet.', 'error');
    } finally {
      isUploading = false;
      if (btnMasuk) btnMasuk.disabled = false;
      if (btnKeluar) btnKeluar.disabled = false;

      // Reset camera after 2s
      setTimeout(() => {
        if (panelVisible) {
          const video = document.getElementById('pa-video');
          const preview = document.getElementById('pa-preview');
          const overlay = document.getElementById('pa-cam-overlay');
          if (video) video.style.display = 'block';
          if (preview) preview.style.display = 'none';
          if (overlay) overlay.style.display = 'flex';
        }
      }, 2000);
    }
  }

  // ═══════════════════════════════════════════
  //  HISTORY
  // ═══════════════════════════════════════════
  async function loadHistory() {
    const user = getUser();
    if (!user) return;
    const listEl = document.getElementById('pa-history-list');
    if (!listEl) return;

    const opsId = user.opsId || user.ops_id || user.ops || user.OPS || user['OPS ID'] || '';
    try {
      const res = await fetch(`${API_URL}?action=my-logs&ops_id=${encodeURIComponent(opsId)}`);
      const logs = await res.json();

      if (!Array.isArray(logs) || logs.length === 0) {
        listEl.innerHTML = '<p class="pa-history-empty">Belum ada absen hari ini</p>';
        return;
      }

      window.__paLogs = logs;
      listEl.innerHTML = logs.map((log, i) => `
        <div class="pa-history-item group overflow-hidden active:scale-95 transition-all" onclick="window.showAttendanceDetail(window.__paLogs[${i}])" style="cursor:pointer; position:relative; z-index:10; border:1px solid transparent;" onmouseover="this.style.borderColor='rgba(76,201,240,0.3)'; this.style.background='rgba(255,255,255,0.02)';" onmouseout="this.style.borderColor='transparent'; this.style.background='transparent';">
          <img src="${log.foto_url}" class="pa-history-thumb" alt="foto" />
          <div class="pa-history-info" style="flex:1; min-width:0;">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:4px;">
                <span class="pa-history-type ${log.tipe === 'MASUK' ? 'masuk' : 'keluar'}">${log.tipe}</span>
                <span class="pa-history-time text-xs font-bold text-slate-300 group-hover:text-[#4cc9f0] transition-colors">${new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <span class="pa-history-loc text-xs text-slate-400 group-hover:text-slate-200 block truncate w-full" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${log.alamat ? log.alamat.split(',').slice(0, 2).join(', ') : (log.latitude ? log.latitude + ', ' + log.longitude : '-')}</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      listEl.innerHTML = '<p class="pa-history-empty">Gagal memuat riwayat</p>';
    }
  }

  // Attendance Detail Modal logic
  window.showAttendanceDetail = function(log) {
    let modal = document.getElementById('pa-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pa-detail-modal';
      modal.className = 'fixed inset-0 z-[10000] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-md opacity-0 transition-opacity duration-300';
      modal.style.pointerEvents = 'none';
      modal.innerHTML = `
        <div id="pa-detail-content" class="relative w-full max-w-sm bg-gradient-to-b from-[#10002b] to-[#240046] rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_0_40px_rgba(76,201,240,0.15)] transform scale-95 transition-transform duration-300">
          <button onclick="document.getElementById('pa-detail-modal').style.opacity='0'; document.getElementById('pa-detail-modal').style.pointerEvents='none'; setTimeout(() => document.getElementById('pa-detail-content').style.transform='scale(0.95)', 50);" class="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-20 border border-white/20 active:scale-90">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          <div class="w-full aspect-[3/4] bg-black/50 relative overflow-hidden">
            <img id="pa-detail-photo" src="" alt="Foto Absen" class="w-full h-full object-cover" />
            <div class="absolute bottom-0 left-0 right-0 p-6 pt-20 bg-gradient-to-t from-[#10002b] via-[#10002b]/90 to-transparent">
              <div class="flex items-center justify-between mb-3">
                <span id="pa-detail-type" class="px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-lg shadow-black/20"></span>
                <div class="text-right">
                  <span class="text-[#4cc9f0] text-sm font-black block" id="pa-detail-time"></span>
                  <span class="text-slate-400 text-[9px] font-bold uppercase tracking-wider block" id="pa-detail-date"></span>
                </div>
              </div>
              <p class="text-slate-300 text-[11px] font-medium leading-relaxed flex gap-2.5 items-start">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-[#f72585]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span id="pa-detail-loc"></span>
              </p>
              <p class="text-slate-500 text-[9px] mt-2 ml-6 break-all font-mono" id="pa-detail-coord"></p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Populate data safely
    document.getElementById('pa-detail-photo').src = log.foto_url || 'assets/LogoBas.png';
    
    const typeEl = document.getElementById('pa-detail-type');
    typeEl.textContent = log.tipe || 'ABSEN';
    if (log.tipe === 'MASUK') {
      typeEl.className = 'px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-[#00f5d4]/20 to-[#00f5d4]/10 text-[#00f5d4] border border-[#00f5d4]/30 shadow-lg shadow-[#00f5d4]/10';
    } else {
      typeEl.className = 'px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-[#ff9e00]/20 to-[#ff9e00]/10 text-[#ff9e00] border border-[#ff9e00]/30 shadow-lg shadow-[#ff9e00]/10';
    }
    
    const d = log.created_at ? new Date(log.created_at) : new Date();
    document.getElementById('pa-detail-time').textContent = d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    document.getElementById('pa-detail-date').textContent = d.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
    
    document.getElementById('pa-detail-loc').textContent = log.alamat || (log.station ? 'Station: ' + log.station : 'Lokasi tidak diketahui');
    document.getElementById('pa-detail-coord').textContent = (log.latitude && log.longitude) ? `${log.latitude}, ${log.longitude}` : '';
    
    // Show modal with animation
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        document.getElementById('pa-detail-content').style.transform = 'scale(1)';
    }, 10);
  };

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════
  function showStatus(msg, type) {
    const el = document.getElementById('pa-status');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'pa-status pa-status-' + type;
    el.textContent = msg;
    if (type === 'success' || type === 'error') {
      setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
    }
  }

  window.checkStationSelection = function() {
    const sel = document.getElementById('pa-station-select');
    const b1 = document.getElementById('pa-btn-masuk');
    const b2 = document.getElementById('pa-btn-keluar');
    const valid = sel && sel.value && sel.value.trim() !== '';
    if (b1) {
      b1.disabled = !valid;
      if (!valid) { b1.style.opacity = '0.4'; b1.style.filter = 'grayscale(100%)'; }
      else { b1.style.opacity = '1'; b1.style.filter = 'none'; }
    }
    if (b2) {
      b2.disabled = !valid;
      if (!valid) { b2.style.opacity = '0.4'; b2.style.filter = 'grayscale(100%)'; }
      else { b2.style.opacity = '1'; b2.style.filter = 'none'; }
    }
  };

  function updateClock() {
    const el = document.getElementById('pa-time');
    if (!el) return;
    const now = new Date();
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const date = now.toLocaleDateString('id-ID', opts);
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<span class="pa-time-clock">${time}</span><span class="pa-time-date">${date}</span>`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  STATION LOADER (Google Apps Script)
  // ═══════════════════════════════════════════════════════════════
  let _stationsCache = [];
  async function loadStations() {
    const sel = document.getElementById('pa-station-select');
    if (!sel) return;
    
    // If cached, use it instantly
    if (_stationsCache.length > 0) {
      renderStationOptions(sel, _stationsCache);
      return;
    }

    try {
      // Get generic API URL from localStorage (saved by login script or interceptor)
      const gasApi = localStorage.getItem('bas_api_url') || 'https://script.google.com/macros/s/AKfycbx52a6N0oZN0jzbbsv_tL0um3XwmgK6fVikQLZyyq_JODNT6fhMhjwY9Eop6BAyNxQ0/exec';
      const res = await fetch(gasApi, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getStations' })
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        _stationsCache = data;
        renderStationOptions(sel, data);
      } else {
        throw new Error('Data station kosong');
      }
    } catch (e) {
      console.error('Gagal load station:', e);
      sel.innerHTML = '<option value="">Gagal memuat. Hapus Cache atau Coba Lagi.</option>';
    }
  }

  function renderStationOptions(selectEl, stations) {
    let html = '<option value="" disabled selected>-- Wajib Pilih Station --</option>';
    stations.forEach(st => {
      if (st && st.trim() !== '') {
        html += `<option value="${st.trim()}">${st.trim()}</option>`;
      }
    });
    // Add default fallback options in case DB misses something
    if (!stations.includes('Kantor Pusat')) html += '<option value="Kantor Pusat">Kantor Pusat</option>';
    if (currentUser && currentUser.station && !stations.includes(currentUser.station)) {
      html += `<option value="${currentUser.station}">${currentUser.station} (Pribadi)</option>`;
    }
    selectEl.innerHTML = html;
    window.checkStationSelection(); // update buttons state after loading
  }

  // ═══════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════
  function init() {
    createPanel();
    injectNavButton();
  }

  // Wait for app to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
})();
