/**
 * BAS Command Center — Linktree Manager
 * Shared linktree management for all projects
 */

let _ltCache = [];
let _ltSelectedIcon = 'link';

// ── SVG Icon Map ──
const LT_ICONS = {
    link:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
    'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    whatsapp:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    tiktok:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.33-6.33V9.37a8.16 8.16 0 0 0 4.79 1.56V7.5a4.81 4.81 0 0 1-.9-.81z"/></svg>',
    facebook:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    youtube:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    telegram:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};

const LT_SOCIAL = ['whatsapp','instagram','tiktok','facebook','youtube','telegram'];
function ltIconClass(key) { return LT_SOCIAL.includes(key) ? ' lt-ic-' + key : ''; }
function ltSvg(key) { return LT_ICONS[key] || LT_ICONS.link; }

// ── Load all links ──
async function loadLinktree() {
    const list = Q('#ltList');
    try {
        const d = await api('linktree.php?action=all');
        _ltCache = d.links || [];
        renderLinktree();
    } catch(e) {
        _ltCache = [];
        if (list) list.innerHTML = '<div class="lt-empty">Gagal memuat data</div>';
        console.warn('Linktree load error:', e);
    }
}

// ── Render list with groups ──
function renderLinktree() {
    const list = Q('#ltList');
    const count = Q('#ltCount');
    if (!list) return;

    const active = _ltCache.filter(l => l.is_active == 1).length;
    if (count) count.textContent = active + ' aktif / ' + _ltCache.length + ' total';

    if (_ltCache.length === 0) {
        list.innerHTML = '<div class="lt-empty">Belum ada link. Klik "Tambah Link" untuk membuat.</div>';
        return;
    }

    // Group links
    const standalone = [];
    const groups = {};
    _ltCache.forEach(item => {
        if (item.group_name) {
            if (!groups[item.group_name]) groups[item.group_name] = [];
            groups[item.group_name].push(item);
        } else {
            standalone.push(item);
        }
    });

    let html = '';

    // Standalone first
    standalone.forEach(item => { html += renderLtItem(item); });

    // Groups
    Object.keys(groups).sort((a,b) => {
        const oa = groups[a][0]?.group_order || 0;
        const ob = groups[b][0]?.group_order || 0;
        return oa - ob || a.localeCompare(b);
    }).forEach(gName => {
        const items = groups[gName];
        const allActive = items.every(i => i.is_active == 1);
        const toggleTitle = allActive ? 'Nonaktifkan semua' : 'Aktifkan semua';
        const toggleIcon = allActive
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

        html += '<div class="lt-group-hdr">' +
            '<div class="lt-group-left">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
                '<span>' + esc(gName) + '</span>' +
                '<span class="lt-group-cnt">(' + items.length + ')</span>' +
            '</div>' +
            '<div class="lt-group-acts">' +
                '<button onclick="toggleLtGroup(\'' + esc(gName).replace(/'/g,"\\'") + '\')" title="' + toggleTitle + '" class="lt-act-btn">' + toggleIcon + '</button>' +
                '<button onclick="renameLtGroup(\'' + esc(gName).replace(/'/g,"\\'") + '\')" title="Rename" class="lt-act-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                '<button onclick="deleteLtGroup(\'' + esc(gName).replace(/'/g,"\\'") + '\')" title="Hapus grup" class="lt-act-btn lt-act-del"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
            '</div>' +
        '</div>';
        items.forEach(item => { html += renderLtItem(item); });
    });

    list.innerHTML = html;
}

function renderLtItem(item) {
    const isActive = item.is_active == 1;
    const cls = isActive ? '' : ' lt-inactive';
    const iconHtml = ltSvg(item.icon_key);
    const iconCls = ltIconClass(item.icon_key);
    return '<div class="lt-item' + cls + '">' +
        '<div class="lt-item-icon' + iconCls + '">' + iconHtml + '</div>' +
        '<div class="lt-item-body">' +
            '<div class="lt-item-title">' + esc(item.title) + '</div>' +
            (item.description ? '<div class="lt-item-desc">' + esc(item.description) + '</div>' : '') +
            '<div class="lt-item-url">' + esc(item.url) + '</div>' +
        '</div>' +
        '<div class="lt-item-acts">' +
            '<label class="lt-switch"><input type="checkbox" ' + (isActive ? 'checked' : '') + ' onchange="toggleLtItem(' + item.id + ')"><span class="lt-switch-sl"></span></label>' +
            '<button onclick="editLtItem(' + item.id + ')" title="Edit" class="lt-act-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
            '<button onclick="deleteLtItem(' + item.id + ')" title="Hapus" class="lt-act-btn lt-act-del"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>' +
    '</div>';
}

// ── Open modal ──
function openLtModal(editItem) {
    const modal = Q('#ltModal');
    const title = Q('#ltModalTitle');

    if (editItem) {
        title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Link';
        Q('#ltEditId').value = editItem.id;
        Q('#ltTitle').value = editItem.title || '';
        Q('#ltUrl').value = editItem.url || '';
        Q('#ltDesc').value = editItem.description || '';
        Q('#ltGroupName').value = editItem.group_name || '';
        Q('#ltGroupOrder').value = editItem.group_order || 0;
        _ltSelectedIcon = editItem.icon_key || 'link';
    } else {
        title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Tambah Link Baru';
        Q('#ltEditId').value = '';
        Q('#ltTitle').value = '';
        Q('#ltUrl').value = '';
        Q('#ltDesc').value = '';
        Q('#ltGroupName').value = '';
        Q('#ltGroupOrder').value = '0';
        _ltSelectedIcon = 'link';
    }

    // Populate group suggestions
    const dl = Q('#ltGroupSuggest');
    const existingGroups = [...new Set(_ltCache.filter(l => l.group_name).map(l => l.group_name))];
    dl.innerHTML = existingGroups.map(g => '<option value="' + esc(g) + '">').join('');

    // Render icon picker
    renderIconPicker();

    modal.style.display = 'flex';
}

function closeLtModal() {
    Q('#ltModal').style.display = 'none';
}

function renderIconPicker() {
    const picker = Q('#ltIconPicker');
    picker.innerHTML = Object.keys(LT_ICONS).map(key => {
        const sel = key === _ltSelectedIcon ? ' selected' : '';
        const social = LT_SOCIAL.includes(key) ? ' lt-ico-' + key : '';
        return '<button type="button" class="lt-ico-opt' + sel + social + '" onclick="selectLtIcon(\'' + key + '\')" title="' + key + '">' +
            LT_ICONS[key] +
        '</button>';
    }).join('');
}

function selectLtIcon(key) {
    _ltSelectedIcon = key;
    QQ('.lt-ico-opt').forEach(el => el.classList.remove('selected'));
    const btns = [...QQ('.lt-ico-opt')];
    const btn = btns.find(el => el.title === key);
    if (btn) btn.classList.add('selected');
}

// ── Save link ──
async function saveLtItem() {
    const id    = Q('#ltEditId').value;
    const title = Q('#ltTitle').value.trim();
    const url   = Q('#ltUrl').value.trim();
    const desc  = Q('#ltDesc').value.trim();
    const group = Q('#ltGroupName').value.trim();
    const order = parseInt(Q('#ltGroupOrder').value) || 0;

    if (!title || !url) { toast('Judul dan URL wajib diisi', 'error'); return; }

    const action = id ? 'update' : 'add';
    const body = {
        title, url, description: desc,
        icon_key: _ltSelectedIcon, icon: '🔗',
        group_name: group || null, group_order: order
    };
    if (id) body.id = parseInt(id);

    try {
        const d = await api('linktree.php?action=' + action, { method: 'POST', body });
        if (d.ok) {
            toast(d.message || 'Berhasil!');
            closeLtModal();
            await loadLinktree();
        } else {
            toast(d.error || 'Gagal', 'error');
        }
    } catch(e) { toast('Gagal menyimpan', 'error'); }
}

// ── Edit ──
function editLtItem(id) {
    const item = _ltCache.find(l => l.id == id);
    if (item) openLtModal(item);
}

// ── Delete ──
async function deleteLtItem(id) {
    const item = _ltCache.find(l => l.id == id);
    if (!confirm('Hapus link "' + (item?.title || '') + '"?')) return;
    try {
        const d = await api('linktree.php?action=delete', { method: 'POST', body: { id } });
        if (d.ok) { toast('Link dihapus'); await loadLinktree(); }
        else toast(d.error || 'Gagal', 'error');
    } catch(e) { toast('Gagal menghapus', 'error'); }
}

// ── Toggle active ──
async function toggleLtItem(id) {
    try {
        await api('linktree.php?action=toggle', { method: 'POST', body: { id } });
        await loadLinktree();
    } catch(e) { toast('Gagal toggle', 'error'); }
}

// ── Group operations ──
function addLtGroup() {
    const name = prompt('Nama grup baru:');
    if (!name || !name.trim()) return;
    toast('Grup "' + name.trim() + '" dibuat. Tambahkan link ke dalam grup ini.', 'info');
}

async function toggleLtGroup(groupName) {
    const items = _ltCache.filter(l => l.group_name === groupName);
    const allActive = items.every(i => i.is_active == 1);
    for (const item of items) {
        if ((allActive && item.is_active == 1) || (!allActive && item.is_active == 0)) {
            try { await api('linktree.php?action=toggle', { method: 'POST', body: { id: item.id } }); }
            catch(e) {}
        }
    }
    await loadLinktree();
}

async function renameLtGroup(oldName) {
    const newName = prompt('Nama baru untuk grup "' + oldName + '":', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
        const d = await api('linktree.php?action=rename-group', { method: 'POST', body: { old_name: oldName, new_name: newName.trim() } });
        if (d.ok) { toast('Grup diubah nama'); await loadLinktree(); }
        else toast(d.error || 'Gagal', 'error');
    } catch(e) { toast('Gagal rename', 'error'); }
}

async function deleteLtGroup(groupName) {
    if (!confirm('Hapus grup "' + groupName + '"? Link di dalamnya akan menjadi standalone (tidak dihapus).')) return;
    try {
        const d = await api('linktree.php?action=delete-group', { method: 'POST', body: { group_name: groupName } });
        if (d.ok) { toast('Grup dihapus'); await loadLinktree(); }
        else toast(d.error || 'Gagal', 'error');
    } catch(e) { toast('Gagal hapus grup', 'error'); }
}
