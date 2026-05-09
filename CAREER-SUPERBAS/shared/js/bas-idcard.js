/**
 * BAS ID Card Module — Shared Component
 * Usage: BASIdCard.render(containerId, userData)
 */

// QR Code: uses qrcode-generator CDN (loaded externally)

// ── BAS ID Card Module ──
var BASIdCard = (function() {
  var _theme = 'dark';
  var _canvas = null;
  var _userData = null;
  var _containerId = null;

  var THEMES = {
    dark: {
      bg1: '#1e1b4b', bg2: '#312e81', bg3: '#4338ca',
      text: '#ffffff', sub: 'rgba(255,255,255,0.6)',
      line: 'rgba(255,255,255,0.1)',
      logoAlpha: 1
    },
    light: {
      bg1: '#f8fafc', bg2: '#eef2ff', bg3: '#e0e7ff',
      text: '#1e293b', sub: '#1e293b',
      line: 'rgba(0,0,0,0.12)',
      logoAlpha: 0.9
    }
  };

  function render(containerId, userData) {
    _containerId = containerId;
    _userData = userData;
    var container = document.getElementById(containerId);
    if (!container) return;

    var hasId = userData.ops_id && userData.ops_id.trim() !== '';

    if (!hasId) {
      container.innerHTML =
        '<div class="idcard-locked">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
          '<h3>ID Card Belum Tersedia</h3>' +
          '<p>Anda belum mendapatkan OPS ID. ID Card dapat dicetak setelah OPS ID diterbitkan oleh sistem.</p>' +
        '</div>';
      return;
    }

    var h = '<div class="idcard-container">' +
      '<div class="idcard-toggle">' +
        '<button class="idcard-toggle-btn' + (_theme === 'dark' ? ' active' : '') + '" onclick="BASIdCard.setTheme(\'dark\')">Gelap</button>' +
        '<button class="idcard-toggle-btn' + (_theme === 'light' ? ' active' : '') + '" onclick="BASIdCard.setTheme(\'light\')">Terang</button>' +
      '</div>' +
      '<div class="idcard-canvas-wrap"><canvas id="basIdCardCanvas"></canvas></div>' +
      '<button class="idcard-download" onclick="BASIdCard.download()">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
        'Download ID Card</button>' +
    '</div>';

    container.innerHTML = h;
    drawCard();
  }

  function drawCard() {
    _canvas = document.getElementById('basIdCardCanvas');
    if (!_canvas || !_userData) return;

    // Portrait KTP ratio: 53.98mm x 85.6mm @ 300dpi = 638 x 1012
    var W = 638, H = 1012;
    _canvas.width = W; _canvas.height = H;
    var ctx = _canvas.getContext('2d');
    var t = THEMES[_theme];

    // Background gradient
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, t.bg1);
    grad.addColorStop(0.5, t.bg2);
    grad.addColorStop(1, t.bg3);
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, W, H, 32, true);

    // Decorative circles
    ctx.fillStyle = _theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.05)';
    ctx.beginPath(); ctx.arc(W - 40, 60, 120, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(60, H - 40, 100, 0, Math.PI * 2); ctx.fill();

    // Logo BAS (top center)
    var logoDrawn = false;
    if (typeof BAS_LOGO_BASE64 !== 'undefined' && BAS_LOGO_BASE64) {
      try {
        var logoImg = new Image();
        logoImg.onload = function() {
          var logoS = 360;
          var logoX = (W - logoS) / 2, logoY = 20;
          if (_theme === 'light') {
            // Recolor white logo to black for light mode
            var tc = document.createElement('canvas');
            tc.width = logoS; tc.height = logoS;
            var tctx = tc.getContext('2d');
            tctx.drawImage(logoImg, 0, 0, logoS, logoS);
            tctx.globalCompositeOperation = 'source-atop';
            tctx.fillStyle = '#1e293b';
            tctx.fillRect(0, 0, logoS, logoS);
            ctx.globalAlpha = t.logoAlpha;
            ctx.drawImage(tc, logoX, logoY, logoS, logoS);
          } else {
            ctx.globalAlpha = t.logoAlpha;
            ctx.drawImage(logoImg, logoX, logoY, logoS, logoS);
          }
          ctx.globalAlpha = 1;
          drawTexts(ctx, W, H, t);
        };
        logoImg.src = BAS_LOGO_BASE64;
        logoDrawn = true;
      } catch(e) {}
    }
    if (!logoDrawn) drawTexts(ctx, W, H, t);
  }

  function drawTexts(ctx, W, H, t) {
    // Title
    ctx.fillStyle = t.sub;
    ctx.font = '500 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KARTU IDENTITAS KARYAWAN', W / 2, 390);

    // Separator line
    ctx.strokeStyle = t.line;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 120, 405); ctx.lineTo(W / 2 + 120, 405); ctx.stroke();

    // QR Code — always black on white
    var qrData = _userData.ops_id || '';
    var qr = qrcode(0, 'M');
    qr.addData(qrData);
    qr.make();
    var qrSize = 240;
    var qrX = (W - qrSize) / 2;
    var qrY = 420;
    var modCount = qr.getModuleCount();
    var cellSize = qrSize / modCount;
    var qrPad = 20;

    // QR white background
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 16, true);

    // QR black modules
    ctx.fillStyle = '#000000';
    for (var r = 0; r < modCount; r++) {
      for (var c = 0; c < modCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }

    // OPS ID
    ctx.fillStyle = t.sub;
    ctx.font = '500 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(_userData.ops_id || '', W / 2, qrY + qrSize + 65);

    // Name
    ctx.fillStyle = t.text;
    ctx.font = '700 32px Inter, sans-serif';
    ctx.fillText((_userData.nama || '').toUpperCase(), W / 2, qrY + qrSize + 110);
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  function setTheme(theme) {
    _theme = theme;
    if (_containerId && _userData) render(_containerId, _userData);
  }

  function download() {
    if (!_canvas) return;
    var a = document.createElement('a');
    a.href = _canvas.toDataURL('image/jpeg', 0.7);
    a.download = 'IDCard_' + (_userData.ops_id || 'BAS') + '.jpg';
    a.click();
  }

  return {
    render: render,
    setTheme: setTheme,
    download: download
  };
})();
