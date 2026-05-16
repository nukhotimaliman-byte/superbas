/**
 * BAS DW Admin V2 — ID Card Generator
 * Uses shared/js/bas-idcard.js (QR-based digital card)
 * Supports: Database Search, Paste from Sheet, Manual Entry
 * Batch generation with JSZip
 */

var IDCARD_SELECTED = [];
var IDCARD_SEARCH_RESULTS = [];
var IDCARD_MANUAL_COUNTER = 0;
var IDCARD_BATCH_THEME = 'dark';

// ═══ THEME TOGGLE FOR BATCH EXPORT ═══
function idcardSetBatchTheme(theme) {
    IDCARD_BATCH_THEME = theme;
    var btns = document.querySelectorAll('.idcard-theme-btn');
    btns.forEach(function(b) {
        if (b.getAttribute('data-theme') === theme) {
            b.style.background = 'var(--accent)';
            b.style.color = '#fff';
            b.classList.add('active');
        } else {
            b.style.background = 'transparent';
            b.style.color = 'var(--t3)';
            b.classList.remove('active');
        }
    });
}

function initIDCard() {
    var searchInput = document.getElementById('idcardSearch');
    if (!searchInput) return;
    var debounceTimer = null;
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            idcardSearchCandidates(searchInput.value.trim());
        }, 300);
    });
    renderIdcardSelected();
}

// ═══ MODE SWITCHING ═══
function idcardSwitchMode(mode) {
    // Toggle tab buttons
    document.querySelectorAll('.idcm-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // Toggle panels
    var panels = {
        database: document.getElementById('idcmDatabase'),
        paste: document.getElementById('idcmPaste'),
        manual: document.getElementById('idcmManual')
    };
    Object.keys(panels).forEach(function(key) {
        if (panels[key]) {
            panels[key].style.display = key === mode ? '' : 'none';
            panels[key].classList.toggle('active', key === mode);
        }
    });
}

// ═══ DATABASE SEARCH ═══
function idcardSearchCandidates(q) {
    var container = document.getElementById('idcardSearchResults');
    if (!container) return;
    if (!q || q.length < 2) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    var ql = q.toLowerCase();
    var results = (DUMMY.candidates || []).filter(function(c) {
        return (c.name && c.name.toLowerCase().includes(ql)) ||
               (c.nik && c.nik.includes(q)) ||
               (c.given_id && c.given_id.toLowerCase().includes(ql)) ||
               (c.candidate_id && String(c.candidate_id).includes(q));
    }).slice(0, 15);

    IDCARD_SEARCH_RESULTS = results;
    if (results.length === 0) {
        container.innerHTML = '<div style="padding:16px;text-align:center;color:var(--t3);font-size:.72rem;">Tidak ditemukan</div>';
        container.style.display = 'block';
        return;
    }
    var h = '';
    results.forEach(function(c, idx) {
        var isSelected = IDCARD_SELECTED.some(function(s) { return s.id === c.id; });
        var opsId = c.given_id || c.candidate_id || '';
        h += '<div class="idc-result' + (isSelected ? ' idc-selected' : '') + '" onclick="idcardToggleSelect(' + idx + ')" style="display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'\'">' +
            '<div style="width:20px;height:20px;border-radius:6px;border:2px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (isSelected ? 'var(--accent)' : 'transparent') + ';">' +
                (isSelected ? '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:.76rem;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (c.name || '-') + '</div>' +
                '<div style="font-size:.62rem;color:var(--t3);">' +
                    (opsId ? 'ID: ' + opsId + ' | ' : '') +
                    'NIK: ' + (c.nik || '-') +
                '</div>' +
            '</div>' +
            '<div style="font-size:.6rem;color:var(--t3);flex-shrink:0;">' + (c.station || c.location_name || '') + '</div>' +
        '</div>';
    });
    container.innerHTML = h;
    container.style.display = 'block';
}

function idcardToggleSelect(idx) {
    var c = IDCARD_SEARCH_RESULTS[idx];
    if (!c) return;
    var exists = IDCARD_SELECTED.findIndex(function(s) { return s.id === c.id; });
    if (exists >= 0) {
        IDCARD_SELECTED.splice(exists, 1);
    } else {
        IDCARD_SELECTED.push({
            id: c.id,
            nama: c.name || '',
            ops_id: c.given_id || c.candidate_id || '',
            nik: c.nik || '',
            station: c.station || c.location_name || '',
            source: 'database'
        });
    }
    var q = document.getElementById('idcardSearch');
    if (q) idcardSearchCandidates(q.value.trim());
    renderIdcardSelected();
}

function idcardRemoveSelected(idx) {
    IDCARD_SELECTED.splice(idx, 1);
    renderIdcardSelected();
    var q = document.getElementById('idcardSearch');
    if (q && q.value.trim().length >= 2) idcardSearchCandidates(q.value.trim());
}

function idcardSelectAll() {
    IDCARD_SEARCH_RESULTS.forEach(function(c) {
        var exists = IDCARD_SELECTED.some(function(s) { return s.id === c.id; });
        if (!exists) {
            IDCARD_SELECTED.push({
                id: c.id,
                nama: c.name || '',
                ops_id: c.given_id || c.candidate_id || '',
                nik: c.nik || '',
                station: c.station || c.location_name || '',
                source: 'database'
            });
        }
    });
    var q = document.getElementById('idcardSearch');
    if (q && q.value.trim().length >= 2) idcardSearchCandidates(q.value.trim());
    renderIdcardSelected();
}

function idcardClearAll() {
    IDCARD_SELECTED = [];
    renderIdcardSelected();
    var q = document.getElementById('idcardSearch');
    if (q && q.value.trim().length >= 2) idcardSearchCandidates(q.value.trim());
}

// ═══ PASTE FROM SHEET ═══
function _idcardNormalizeOpsId(raw) {
    raw = raw.trim();
    if (!raw) return '';
    // Strip common prefixes/typos
    raw = raw.replace(/^(OPS|ops|Ops)[_\-\s]*/i, 'ops');
    // If it's purely numeric, add ops prefix
    if (/^\d+$/.test(raw)) raw = 'ops' + raw;
    // Ensure lowercase ops prefix
    if (/^ops/i.test(raw)) raw = 'ops' + raw.replace(/^ops/i, '');
    return raw;
}

function _idcardTitleCase(str) {
    if (!str) return '';
    return str.trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(function(w) {
            if (w.length <= 2) return w.toLowerCase();
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
}

function idcardParsePaste() {
    var textarea = document.getElementById('idcardPasteArea');
    var previewEl = document.getElementById('idcardPastePreview');
    if (!textarea) return;

    var raw = textarea.value.trim();
    if (!raw) {
        showToast('Paste data terlebih dahulu', 'error');
        return;
    }

    var lines = raw.split(/\r?\n/).filter(function(l) { return l.trim(); });
    var parsed = [];
    var duplicates = 0;
    var invalid = 0;

    lines.forEach(function(line) {
        // Split by tab, or multiple spaces (2+), or comma
        var parts = line.split(/\t|,|\s{2,}/);
        var opsId = '', nama = '';

        if (parts.length >= 2) {
            opsId = _idcardNormalizeOpsId(parts[0]);
            nama = _idcardTitleCase(parts.slice(1).join(' '));
        } else {
            // Single column — try to determine if it's an OPS ID or a name
            var val = parts[0].trim();
            if (/^(ops|OPS)?\d+$/i.test(val)) {
                opsId = _idcardNormalizeOpsId(val);
            } else {
                nama = _idcardTitleCase(val);
            }
        }

        if (!opsId && !nama) { invalid++; return; }

        // Check duplicate in already selected
        var isDup = IDCARD_SELECTED.some(function(s) {
            return opsId && s.ops_id === opsId;
        });
        // Check duplicate within this batch
        var isDupBatch = parsed.some(function(p) {
            return opsId && p.ops_id === opsId;
        });

        if (isDup || isDupBatch) {
            duplicates++;
            return;
        }

        parsed.push({
            ops_id: opsId,
            nama: nama,
            status: opsId ? 'ok' : 'no-id'
        });
    });

    // Show preview table
    if (previewEl) {
        if (parsed.length === 0) {
            previewEl.innerHTML = '<div style="padding:10px;text-align:center;color:var(--t3);font-size:.68rem;">Tidak ada data valid ditemukan</div>';
            previewEl.style.display = 'block';
            return;
        }

        var h = '<div style="font-size:.65rem;color:var(--t2);margin-bottom:8px;font-weight:600;">Preview (' + parsed.length + ' baris' +
            (duplicates > 0 ? ', ' + duplicates + ' duplikat dilewati' : '') +
            (invalid > 0 ? ', ' + invalid + ' baris kosong' : '') +
            ')</div>';
        h += '<div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">';
        h += '<table style="width:100%;border-collapse:collapse;font-size:.68rem;">';
        h += '<tr style="background:var(--bg3);"><th style="padding:6px 10px;text-align:left;font-size:.6rem;color:var(--t3);text-transform:uppercase;">OPS ID</th><th style="padding:6px 10px;text-align:left;font-size:.6rem;color:var(--t3);text-transform:uppercase;">Nama</th><th style="padding:6px 10px;text-align:center;font-size:.6rem;color:var(--t3);text-transform:uppercase;">Status</th></tr>';
        parsed.forEach(function(p) {
            var statusHtml = p.status === 'ok'
                ? '<span style="color:#22c55e;font-weight:600;">OK</span>'
                : '<span style="color:#f59e0b;font-weight:600;">No ID</span>';
            h += '<tr style="border-bottom:1px solid var(--border);">' +
                '<td style="padding:5px 10px;font-family:monospace;color:var(--t1);">' + (p.ops_id || '-') + '</td>' +
                '<td style="padding:5px 10px;color:var(--t1);">' + (p.nama || '-') + '</td>' +
                '<td style="padding:5px 10px;text-align:center;">' + statusHtml + '</td>' +
            '</tr>';
        });
        h += '</table></div>';
        previewEl.innerHTML = h;
        previewEl.style.display = 'block';
    }

    // Add to selected list
    parsed.forEach(function(p) {
        IDCARD_MANUAL_COUNTER++;
        IDCARD_SELECTED.push({
            id: 'paste_' + IDCARD_MANUAL_COUNTER,
            nama: p.nama,
            ops_id: p.ops_id,
            nik: '',
            station: '',
            source: 'paste'
        });
    });

    var msg = parsed.length + ' data ditambahkan';
    if (duplicates > 0) msg += ' (' + duplicates + ' duplikat dilewati)';
    showToast(msg);
    textarea.value = '';
    if (previewEl) previewEl.style.display = 'none';
    renderIdcardSelected();
}

// ═══ MANUAL ENTRY ═══
function idcardAddManual() {
    var opsInput = document.getElementById('idcardManualOpsId');
    var namaInput = document.getElementById('idcardManualNama');
    if (!opsInput || !namaInput) return;

    var opsId = _idcardNormalizeOpsId(opsInput.value);
    var nama = _idcardTitleCase(namaInput.value);

    if (!opsId && !nama) {
        showToast('Isi minimal OPS ID atau Nama', 'error');
        return;
    }

    // Check duplicate
    if (opsId) {
        var isDup = IDCARD_SELECTED.some(function(s) { return s.ops_id === opsId; });
        if (isDup) {
            showToast('OPS ID ' + opsId + ' sudah ada di daftar', 'error');
            return;
        }
    }

    IDCARD_MANUAL_COUNTER++;
    IDCARD_SELECTED.push({
        id: 'manual_' + IDCARD_MANUAL_COUNTER,
        nama: nama,
        ops_id: opsId,
        nik: '',
        station: '',
        source: 'manual'
    });

    showToast((nama || opsId) + ' ditambahkan');
    opsInput.value = '';
    namaInput.value = '';
    opsInput.focus();
    renderIdcardSelected();
}

// ═══ RENDER SELECTED LIST ═══
function renderIdcardSelected() {
    var container = document.getElementById('idcardSelectedList');
    var countEl = document.getElementById('idcardSelectedCount');
    var batchBtn = document.getElementById('btnBatchDownload');
    var pdfBtn = document.getElementById('btnPdfDownload');
    if (countEl) countEl.textContent = IDCARD_SELECTED.length;
    if (batchBtn) batchBtn.disabled = IDCARD_SELECTED.length === 0;
    if (pdfBtn) pdfBtn.disabled = IDCARD_SELECTED.length === 0;

    if (!container) return;
    if (IDCARD_SELECTED.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--t3);font-size:.72rem;">Pilih kandidat dari hasil pencarian, paste dari sheet, atau ketik manual</div>';
        return;
    }

    var sourceIcons = {
        database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
        manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
    };

    var h = '';
    IDCARD_SELECTED.forEach(function(s, idx) {
        var srcIcon = sourceIcons[s.source] || '';
        var hasOps = s.ops_id && s.ops_id.trim() !== '';
        h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:4px;cursor:' + (hasOps ? 'pointer' : 'default') + ';transition:background .15s;" ' +
            (hasOps ? 'onclick="idcardShowPreview(' + idx + ')" onmouseenter="this.style.background=\'var(--bg4)\'" onmouseleave="this.style.background=\'var(--bg3)\'"' : '') + '>' +
            '<div style="width:24px;height:24px;border-radius:6px;background:var(--accent-d);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:800;flex-shrink:0;">' + (idx+1) + '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:.72rem;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (s.nama || 'Tanpa Nama') + '</div>' +
                '<div style="font-size:.58rem;color:var(--t3);display:flex;align-items:center;gap:4px;">' +
                    srcIcon +
                    (s.ops_id || 'No OPS ID') +
                '</div>' +
            '</div>' +
            (hasOps ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--t3);flex-shrink:0;opacity:.5;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '') +
            '<button onclick="event.stopPropagation();idcardRemoveSelected(' + idx + ')" style="background:none;border:none;color:var(--t3);cursor:pointer;padding:4px;flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>';
    });
    container.innerHTML = h;
}

// ═══ PREVIEW (inline at bottom) ═══
function idcardShowPreview(idx) {
    var item = IDCARD_SELECTED[idx];
    if (!item || !item.ops_id) return;
    var wrap = document.getElementById('idcardPreviewWrap');
    var previewArea = document.getElementById('idcardPreview');
    if (!wrap || !previewArea) return;

    previewArea.innerHTML = '<div id="idcardCanvasWrap"></div>';
    wrap.style.display = 'block';

    setTimeout(function() {
        if (typeof BASIdCard !== 'undefined') {
            BASIdCard.render('idcardCanvasWrap', item);
        }
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

// ═══ BATCH DOWNLOAD (ZIP) — optimized with renderToCanvas ═══
async function idcardBatchDownload() {
    if (IDCARD_SELECTED.length === 0) { showToast('Pilih kandidat terlebih dahulu', 'error'); return; }
    if (typeof JSZip === 'undefined') { showToast('JSZip belum dimuat', 'error'); return; }

    var btn = document.getElementById('btnBatchDownload');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

    var zip = new JSZip();
    var canvas = document.createElement('canvas');

    var hasOpsId = IDCARD_SELECTED.filter(function(s) { return !!s.ops_id; });
    var skipped = IDCARD_SELECTED.length - hasOpsId.length;

    for (var i = 0; i < hasOpsId.length; i++) {
        var s = hasOpsId[i];
        if (btn) btn.textContent = 'ZIP ' + (i+1) + '/' + hasOpsId.length + '...';

        await new Promise(function(resolve) {
            BASIdCard.renderToCanvas(canvas, s, IDCARD_BATCH_THEME, function() {
                setTimeout(resolve, 50);
            });
        });

        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        var base64 = dataUrl.split(',')[1];
        var filename = 'IDCard_' + (s.ops_id || s.nama).replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg';
        zip.file(filename, base64, { base64: true });
    }

    try {
        var blob = await zip.generateAsync({ type: 'blob' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'IDCards_BAS_' + new Date().toISOString().slice(0,10) + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
        var msg = hasOpsId.length + ' ID Card berhasil di-download';
        if (skipped > 0) msg += ' (' + skipped + ' dilewati karena belum punya OPS ID)';
        showToast(msg);
    } catch(e) {
        showToast('Gagal membuat ZIP: ' + e.message, 'error');
    }

    if (btn) {
        btn.disabled = IDCARD_SELECTED.length === 0;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download Batch (ZIP)';
    }
}

// ═══ PDF DOWNLOAD (full bleed, no margins) — optimized with renderToCanvas ═══
async function idcardBatchPDF() {
    if (IDCARD_SELECTED.length === 0) { showToast('Pilih kandidat terlebih dahulu', 'error'); return; }

    // Lazy-load jsPDF
    if (!window.jspdf) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
        document.head.appendChild(s);
        await new Promise(function(resolve) {
            s.onload = resolve;
            s.onerror = function() { showToast('Gagal memuat jsPDF library', 'error'); resolve(); };
        });
    }

    if (!window.jspdf) { showToast('jsPDF tidak tersedia', 'error'); return; }

    var btn = document.getElementById('btnPdfDownload');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }

    var hasOpsId = IDCARD_SELECTED.filter(function(s) { return !!s.ops_id; });
    var skipped = IDCARD_SELECTED.length - hasOpsId.length;

    if (hasOpsId.length === 0) {
        showToast('Tidak ada kandidat dengan OPS ID', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg> Download PDF'; }
        return;
    }

    // BASIdCard canvas = 638x1012 → PDF page: 75mm x proportional
    var cardW = 75;
    var cardH = cardW * (1012 / 638);
    var jsPDF = window.jspdf.jsPDF;
    var pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });
    var canvas = document.createElement('canvas');
    var addedPages = 0;

    for (var i = 0; i < hasOpsId.length; i++) {
        var item = hasOpsId[i];
        if (btn) btn.textContent = 'PDF ' + (i+1) + '/' + hasOpsId.length + '...';

        await new Promise(function(resolve) {
            BASIdCard.renderToCanvas(canvas, item, IDCARD_BATCH_THEME, function() {
                setTimeout(resolve, 50);
            });
        });

        if (addedPages > 0) pdf.addPage([cardW, cardH], 'portrait');
        var imgData = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', 0, 0, cardW, cardH);
        addedPages++;
    }

    if (addedPages === 0) {
        showToast('Gagal membuat PDF — tidak ada kartu yang ter-render', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg> Download PDF'; }
        return;
    }

    // Manual blob download to ensure correct filename
    try {
        var pdfBlob = pdf.output('blob');
        var a = document.createElement('a');
        a.href = URL.createObjectURL(pdfBlob);
        a.download = 'IDCards_BAS_' + new Date().toISOString().slice(0,10) + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);

        var msg = addedPages + ' ID Card berhasil di-download sebagai PDF';
        if (skipped > 0) msg += ' (' + skipped + ' dilewati karena belum punya OPS ID)';
        showToast(msg);
    } catch(e) {
        showToast('Gagal membuat PDF: ' + e.message, 'error');
    }

    if (btn) {
        btn.disabled = IDCARD_SELECTED.length === 0;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"/></svg> Download PDF';
    }
}
