/**
 * BAS Camera Module — Shared Component
 * Usage: BASCamera.open(function(photoBase64, sizeKB) { ... });
 */
var BASCamera = (function() {
  var _callback = null;
  var _stream = null;
  var _facingMode = 'environment';
  var _gpsData = null;
  var _photoData = null;
  var _overlay = null;

  // ── Create DOM ──
  function ensureDOM() {
    if (_overlay) return;
    _overlay = document.createElement('div');
    _overlay.className = 'bas-cam-overlay';
    _overlay.innerHTML =
      '<button class="bas-cam-close" onclick="BASCamera.close()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
      '<div class="bas-cam-video-wrap" id="basCamVideoWrap">' +
        '<video id="basCamVideo" autoplay playsinline muted></video>' +
        '<div class="bas-cam-gps" id="basCamGps">' +
          '<div class="bas-cam-gps-dot" id="basCamGpsDot"></div>' +
          '<span id="basCamGpsText">Mencari GPS...</span>' +
        '</div>' +
      '</div>' +
      '<div class="bas-cam-controls" id="basCamControls">' +
        '<button class="bas-cam-flip" onclick="BASCamera.flip()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>' +
        '</button>' +
        '<button class="bas-cam-capture" onclick="BASCamera.capture()"></button>' +
        '<div class="bas-cam-spacer"></div>' +
      '</div>' +
      '<div class="bas-cam-preview" id="basCamPreview">' +
        '<img id="basCamPreviewImg" src="">' +
        '<div class="bas-cam-preview-info" id="basCamPreviewInfo"></div>' +
        '<div class="bas-cam-preview-btns">' +
          '<button class="bas-cam-btn bas-cam-btn-retake" onclick="BASCamera.retake()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Ulang' +
          '</button>' +
          '<button class="bas-cam-btn bas-cam-btn-download" onclick="BASCamera.download()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Simpan' +
          '</button>' +
          '<button class="bas-cam-btn bas-cam-btn-use" onclick="BASCamera.use()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Gunakan' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(_overlay);
  }

  // ── GPS ──
  function fetchGPS() {
    _gpsData = null;
    var dotEl = document.getElementById('basCamGpsDot');
    var textEl = document.getElementById('basCamGpsText');
    if (!navigator.geolocation) {
      if (textEl) textEl.textContent = 'GPS tidak tersedia';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var lat = pos.coords.latitude.toFixed(6);
        var lon = pos.coords.longitude.toFixed(6);
        _gpsData = { lat: lat, lon: lon, address: '' };
        if (dotEl) dotEl.classList.add('active');
        if (textEl) textEl.textContent = lat + ', ' + lon;
        // Reverse geocode via Nominatim
        fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon + '&zoom=16&addressdetails=1')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var a = data.address || {};
            var parts = [];
            if (a.village || a.suburb || a.neighbourhood) parts.push(a.village || a.suburb || a.neighbourhood);
            if (a.city_district || a.town) parts.push(a.city_district || a.town);
            if (a.city || a.county) parts.push(a.city || a.county);
            if (a.state) parts.push(a.state);
            _gpsData.address = parts.join(', ');
            if (textEl) textEl.textContent = _gpsData.address || (lat + ', ' + lon);
          })
          .catch(function() {});
      },
      function() {
        if (textEl) textEl.textContent = 'GPS gagal';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ── Start Camera ──
  function startStream() {
    var video = document.getElementById('basCamVideo');
    if (!video) return;
    var constraints = {
      video: {
        facingMode: _facingMode,
        width: { ideal: 2560 },
        height: { ideal: 1920 }
      },
      audio: false
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        _stream = stream;
        video.srcObject = stream;
      })
      .catch(function(err) {
        alert('Gagal akses kamera: ' + err.message);
        close();
      });
  }

  function stopStream() {
    if (_stream) {
      _stream.getTracks().forEach(function(t) { t.stop(); });
      _stream = null;
    }
  }

  // ── Capture + Watermark + GPS Stamp ──
  function capture() {
    var video = document.getElementById('basCamVideo');
    if (!video) return;

    var vw = video.videoWidth, vh = video.videoHeight;
    var maxDim = 2560;
    var scale = Math.min(maxDim / vw, maxDim / vh, 1);
    var cw = Math.round(vw * scale), ch = Math.round(vh * scale);

    var canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    var ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(video, 0, 0, cw, ch);

    // Watermark BAS logo — top right, small, low opacity
    if (typeof BAS_LOGO_BASE64 !== 'undefined' && BAS_LOGO_BASE64) {
      var logoImg = new Image();
      logoImg.onload = function() {
        var logoSize = Math.round(cw * 0.08);
        var pad = 10;
        ctx.globalAlpha = 0.4;
        ctx.drawImage(logoImg, cw - logoSize - pad, pad, logoSize, logoSize);
        ctx.globalAlpha = 1.0;
        stampGPS(ctx, cw, ch);
        finalizeCapture(canvas);
      };
      logoImg.src = BAS_LOGO_BASE64;
    } else {
      stampGPS(ctx, cw, ch);
      finalizeCapture(canvas);
    }

    // Stop camera while previewing
    stopStream();
  }

  function stampGPS(ctx, cw, ch) {
    var fontSize = Math.max(12, Math.round(cw * 0.012));
    ctx.font = '600 ' + fontSize + 'px sans-serif';
    ctx.textBaseline = 'bottom';

    var lines = [];
    if (_gpsData) {
      lines.push(_gpsData.lat + ', ' + _gpsData.lon);
      if (_gpsData.address) lines.push(_gpsData.address);
    }
    // Timestamp
    var now = new Date();
    var ts = now.toLocaleDateString('id-ID') + ' ' +
      String(now.getHours()).padStart(2,'0') + ':' +
      String(now.getMinutes()).padStart(2,'0');
    lines.push(ts);

    var pad = 10;
    var lineH = fontSize + 4;
    var startY = ch - pad;

    // Draw text lines bottom-up
    for (var i = lines.length - 1; i >= 0; i--) {
      var txt = lines[i];
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(txt, pad + 1, startY + 1);
      // White text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, pad, startY);
      startY -= lineH;
    }
  }

  function finalizeCapture(canvas) {
    // Target: 800KB - 900KB, max 1MB
    var targetMin = 800 * 1024;
    var targetMax = 950 * 1024;
    var maxSize = 1024 * 1024;
    var result = null;
    var quality = 0.95;

    // Step down quality until under max
    for (var attempt = 0; attempt < 10; attempt++) {
      result = canvas.toDataURL('image/jpeg', quality);
      var sizeBytes = Math.round((result.length - 'data:image/jpeg;base64,'.length) * 0.75);
      if (sizeBytes <= targetMax) break;
      quality -= 0.05;
      if (quality < 0.3) break;
    }

    // If too small (low-res camera), use max quality for best output
    var finalSize = Math.round((result.length - 'data:image/jpeg;base64,'.length) * 0.75);
    if (finalSize < targetMin) {
      result = canvas.toDataURL('image/jpeg', 0.98);
    }

    // Show preview
    var previewEl = document.getElementById('basCamPreview');
    var imgEl = document.getElementById('basCamPreviewImg');
    var infoEl = document.getElementById('basCamPreviewInfo');
    var controlsEl = document.getElementById('basCamControls');
    var videoWrap = document.getElementById('basCamVideoWrap');

    if (imgEl) imgEl.src = result;
    if (infoEl) infoEl.textContent = sizeKB + ' KB | JPEG';
    if (previewEl) previewEl.classList.add('active');
    if (controlsEl) controlsEl.style.display = 'none';
    if (videoWrap) videoWrap.style.display = 'none';
  }

  // ── Actions ──
  function retake() {
    _photoData = null;
    var previewEl = document.getElementById('basCamPreview');
    var controlsEl = document.getElementById('basCamControls');
    var videoWrap = document.getElementById('basCamVideoWrap');
    if (previewEl) previewEl.classList.remove('active');
    if (controlsEl) controlsEl.style.display = '';
    if (videoWrap) videoWrap.style.display = '';
    startStream();
  }

  function download() {
    if (!_photoData) return;
    var a = document.createElement('a');
    a.href = _photoData;
    a.download = 'BAS_Foto_' + new Date().toISOString().slice(0,10) + '.jpg';
    a.click();
  }

  function use() {
    if (!_photoData) return;
    var sizeKB = Math.round((_photoData.length - 'data:image/jpeg;base64,'.length) * 0.75 / 1024);
    if (_callback) _callback(_photoData, sizeKB);
    close();
  }

  function flip() {
    _facingMode = _facingMode === 'environment' ? 'user' : 'environment';
    stopStream();
    startStream();
  }

  function open(callback) {
    _callback = callback || null;
    _photoData = null;
    _facingMode = 'environment';
    ensureDOM();
    _overlay.classList.add('active');
    // Reset to camera mode
    var previewEl = document.getElementById('basCamPreview');
    var controlsEl = document.getElementById('basCamControls');
    var videoWrap = document.getElementById('basCamVideoWrap');
    if (previewEl) previewEl.classList.remove('active');
    if (controlsEl) controlsEl.style.display = '';
    if (videoWrap) videoWrap.style.display = '';
    fetchGPS();
    startStream();
  }

  function close() {
    stopStream();
    _photoData = null;
    if (_overlay) _overlay.classList.remove('active');
  }

  // Public API
  return {
    open: open,
    close: close,
    flip: flip,
    capture: capture,
    retake: retake,
    download: download,
    use: use
  };
})();
