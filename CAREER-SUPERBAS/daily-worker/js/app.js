/**
 * BAS Recruitment — Candidate Portal Logic
 * @deprecated Functionality moved to inline JS in daftar.html
 *             Uses shared utils from js/utils.js
 */

const API_BASE = './api';

// ── State ───────────────────────────────────
let selectedPosisi = null;
let selectedLocation = null;
let candidateId = null;
let uploadedDocs = {};

// ── Toast Notification ──────────────────────
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️'}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ── Tab Switching ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Posisi Cards
    document.querySelectorAll('.Posisi-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.Posisi-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedPosisi = card.dataset.type;
        });
    });

    // Location Cards
    document.querySelectorAll('.location-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.location-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedLocation = parseInt(card.dataset.id);
        });
    });

    // Registration Form
    const regForm = document.getElementById('registrationForm');
    if (regForm) {
        regForm.addEventListener('submit', handleRegistration);
    }

    // Status Check Form
    const statusForm = document.getElementById('statusForm');
    if (statusForm) {
        statusForm.addEventListener('submit', handleStatusCheck);
    }

    // File upload slots
    document.querySelectorAll('.upload-slot input[type="file"]').forEach(input => {
        input.addEventListener('change', (e) => handleFileUpload(e, input.dataset.doctype));
    });

    // Page enter animation
    document.querySelector('.page-enter')?.classList.add('page-enter');
});

// ── Registration Handler ────────────────────
async function handleRegistration(e) {
    e.preventDefault();

    const name = document.getElementById('regName').value.trim();
    const whatsapp = document.getElementById('regWhatsapp').value.trim();
    const address = document.getElementById('regAddress').value.trim();
    const simType = document.getElementById('regSimType').value;

    // Validation
    if (!name || !whatsapp || !simType) {
        showToast('Mohon lengkapi semua field yang wajib diisi', 'error');
        return;
    }

    if (!/^[0-9]{10,15}$/.test(whatsapp)) {
        showToast('Format nomor WhatsApp tidak valid (10-15 digit angka)', 'error');
        return;
    }

    if (!selectedPosisi) {
        showToast('Pilih tipe Posisi terlebih dahulu', 'error');
        return;
    }

    if (!selectedLocation) {
        showToast('Pilih lokasi interview terlebih dahulu', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner" style="width:20px;height:20px;margin:0;border-width:2px;"></div> Mendaftar...';

    try {
        const res = await fetch(`${API_BASE}/candidates.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, whatsapp, address,
                posisi_dilamar: selectedPosisi,
                pendidikan_terakhir: simType,
                location_id: selectedLocation
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Gagal mendaftar', 'error');
            return;
        }

        candidateId = data.candidate_id;
        showToast(data.message || 'Pendaftaran berhasil!');

        // Show upload section
        document.getElementById('registrationSection').classList.add('hidden');
        document.getElementById('uploadSection').classList.remove('hidden');

    } catch (err) {
        showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '🚀 Daftar Sekarang';
    }
}

// ── File Upload Handler ─────────────────────
async function handleFileUpload(e, docType) {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast(`File ${docType} melebihi batas 2MB`, 'error');
        e.target.value = '';
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
        showToast('Format file harus JPG, PNG, atau PDF', 'error');
        e.target.value = '';
        return;
    }

    if (!candidateId) {
        showToast('Daftar terlebih dahulu sebelum upload dokumen', 'error');
        return;
    }

    const slot = e.target.closest('.upload-slot');
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressContainer.classList.add('active');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidate_id', candidateId);
    formData.append('doc_type', docType);

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (evt) => {
            if (evt.lengthComputable) {
                const pct = Math.round((evt.loaded / evt.total) * 100);
                progressFill.style.width = pct + '%';
                progressText.textContent = `Mengupload ${docType}... ${pct}%`;
            }
        });

        const response = await new Promise((resolve, reject) => {
            xhr.onload = () => {
                try {
                    resolve({ ok: xhr.status >= 200 && xhr.status < 300, data: JSON.parse(xhr.responseText) });
                } catch { reject(new Error('Invalid response')); }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.open('POST', `${API_BASE}/documents.php`);
            xhr.send(formData);
        });

        if (response.ok) {
            slot.classList.add('uploaded');
            slot.querySelector('.upload-icon').textContent = '✅';
            slot.querySelector('.upload-label').textContent = `${docType} — Terupload`;
            uploadedDocs[docType] = true;
            showToast(response.data.message || `${docType} berhasil diupload`);

            // Check if all docs uploaded
            const totalSlots = document.querySelectorAll('.upload-slot').length;
            const uploadedCount = Object.keys(uploadedDocs).length;
            if (uploadedCount >= totalSlots) {
                document.getElementById('uploadComplete').classList.remove('hidden');
            }
        } else {
            showToast(response.data.error || `Gagal upload ${docType}`, 'error');
        }

    } catch (err) {
        showToast('Upload gagal, coba lagi', 'error');
    } finally {
        setTimeout(() => {
            progressContainer.classList.remove('active');
            progressFill.style.width = '0%';
        }, 1000);
    }
}

// ── Status Check Handler ────────────────────
async function handleStatusCheck(e) {
    e.preventDefault();

    const whatsapp = document.getElementById('statusWhatsapp').value.trim();
    if (!whatsapp) {
        showToast('Masukkan nomor WhatsApp Anda', 'error');
        return;
    }

    const resultDiv = document.getElementById('statusResult');
    resultDiv.innerHTML = '<div class="spinner"></div>';
    resultDiv.classList.remove('hidden');

    try {
        const res = await fetch(`${API_BASE}/candidates.php?whatsapp=${encodeURIComponent(whatsapp)}`);
        const data = await res.json();

        if (!res.ok) {
            resultDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Tidak Ditemukan</div>
                    <div class="empty-state-desc">${data.error}</div>
                </div>
            `;
            return;
        }

        const c = data.candidate;
        const docs = data.documents || [];

        // Status mapping
        const statusSteps = ['Belum Pemberkasan', 'Sudah Pemberkasan', 'Menunggu Test Drive', 'Jadwal Test Drive', 'Lulus'];
        const currentIdx = statusSteps.indexOf(c.status);
        const isFailed = c.status === 'Tidak Lulus';

        let stepperHTML = '<div class="stepper">';
        statusSteps.forEach((step, i) => {
            let cls = '';
            if (isFailed && i >= currentIdx) cls = '';
            else if (i < currentIdx) cls = 'completed';
            else if (i === currentIdx) cls = 'active';
            stepperHTML += `
                <div class="stepper-step ${cls}">
                    <div class="stepper-dot">${i < currentIdx ? '✓' : i + 1}</div>
                    <div class="stepper-label">${step}</div>
                </div>
            `;
        });
        stepperHTML += '</div>';

        if (isFailed) {
            stepperHTML += `<div class="text-center mt-2"><span class="badge badge-gagal">❌ Tidak Lulus</span></div>`;
        }

        // Docs list
        let docsHTML = '<div class="mt-2"><strong>Dokumen Terupload:</strong><div class="mt-1">';
        if (docs.length > 0) {
            docs.forEach(d => {
                docsHTML += `<span class="badge badge-lulus" style="margin:4px;">✅ ${d.doc_type}</span>`;
            });
        } else {
            docsHTML += '<span class="text-muted">Belum ada dokumen</span>';
        }
        docsHTML += '</div></div>';

        resultDiv.innerHTML = `
            <div class="card page-enter">
                <div class="flex-between mb-2">
                    <div>
                        <h3 style="font-weight:700;">${c.name}</h3>
                        <div style="color:var(--text-muted);font-size:0.85rem;">
                            ${c.posisi_dilamar} · ${c.pendidikan_terakhir} · ${c.location_name}
                        </div>
                    </div>
                    <span class="badge ${getStatusBadgeClass(c.status)}">${c.status}</span>
                </div>

                ${stepperHTML}

                ${c.test_drive_date ? `
                    <div class="card mt-2" style="background:var(--accent-light);border-color:var(--accent);">
                        <strong>📅 Jadwal Test Drive:</strong> ${formatDate(c.test_drive_date)}
                    </div>
                ` : ''}

                ${c.maps_link ? `
                    <a href="${c.maps_link}" target="_blank" class="btn btn-primary btn-block mt-2">
                        📍 Lihat Lokasi di Maps
                    </a>
                ` : ''}

                ${c.korlap_notes ? `
                    <div class="mt-2">
                        <strong>📝 Catatan:</strong>
                        <p style="color:var(--text-secondary);margin-top:4px;">${c.korlap_notes}</p>
                    </div>
                ` : ''}

                ${docsHTML}
            </div>
        `;

    } catch (err) {
        resultDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-title">Terjadi Kesalahan</div>
                <div class="empty-state-desc">Tidak dapat terhubung ke server. Coba lagi nanti.</div>
            </div>
        `;
    }
}

// ── Helpers ─────────────────────────────────
function getStatusBadgeClass(status) {
    const map = {
        'Belum Pemberkasan': 'badge-default',
        'Sudah Pemberkasan': 'badge-pemberkasan',
        'Menunggu Test Drive': 'badge-menunggu',
        'Jadwal Test Drive': 'badge-jadwal',
        'Lulus': 'badge-lulus',
        'Tidak Lulus': 'badge-gagal'
    };
    return map[status] || 'badge-default';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
