/**
 * BAS DW Admin V2 — Overview Page
 * KPI cards, Charts (theme-aware), Recent table
 */
function initOverview() {
    const data = filterByProvince(DUMMY.candidates);
    const total = data.length;
    const lulus = data.filter(c => c.status === 'Lulus').length;
    const gagal = data.filter(c => c.status === 'Tidak Lulus').length;
    const proses = total - lulus - gagal;

    // Stat cards
    const stats = [
        { label: 'Total Pendaftar', value: total, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', trend: '+12%', trendDir: 'up' },
        { label: 'Lulus', value: lulus, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', trend: '+8%', trendDir: 'up', accent: true },
        { label: 'Tidak Lulus', value: gagal, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', trend: '-3%', trendDir: 'down' },
        { label: 'Dalam Proses', value: proses, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', trend: '0%', trendDir: 'neutral' },
    ];

    document.getElementById('statGrid').innerHTML = stats.map(s => `
        <div class="stat-card${s.accent ? ' stat-card--accent' : ''}">
            <div class="stat-card-top">
                <div class="stat-icon">${s.icon}</div>
                <div class="stat-label">${s.label}</div>
            </div>
            <div class="stat-value">${s.value}</div>
            <span class="stat-trend ${s.trendDir}">${s.trendDir === 'up' ? '&#x25B2;' : s.trendDir === 'down' ? '&#x25BC;' : '●'} ${s.trend}</span>
        </div>
    `).join('');

    const cc = getChartColors();

    // Status Chart (Doughnut)
    const statusCounts = {};
    data.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
    const statusColors = { 'Belum Pemberkasan': '#38BDF8', 'Sudah Pemberkasan': '#FBBF24', 'Lulus': '#22C55E', 'Tidak Lulus': '#EF4444' };

    chartInstances.status = new Chart(document.getElementById('chartStatus'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{ data: Object.values(statusCounts), backgroundColor: Object.keys(statusCounts).map(k => statusColors[k] || '#8B5CF6'), borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: cc.legend, font: { size: 11, family: 'Inter' }, padding: 16 } } } }
    });

    // Station Chart (Bar)
    const stationCounts = {};
    data.forEach(c => { stationCounts[c.station] = (stationCounts[c.station] || 0) + 1; });

    chartInstances.station = new Chart(document.getElementById('chartStation'), {
        type: 'bar',
        data: {
            labels: Object.keys(stationCounts),
            datasets: [{ label: 'Kandidat', data: Object.values(stationCounts), backgroundColor: 'rgba(56,189,248,.6)', borderRadius: 6, borderSkipped: false }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 11 } } }, y: { grid: { display: false }, ticks: { color: cc.text, font: { size: 11 } } } } }
    });

    // Trend Chart (Line - 7 days)
    const days = [], counts = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
        counts.push(Math.floor(Math.random() * 5) + 1);
    }

    chartInstances.trend = new Chart(document.getElementById('chartTrend'), {
        type: 'line',
        data: {
            labels: days,
            datasets: [{ label: 'Pendaftar', data: counts, borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,.1)', fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: '#38BDF8', borderWidth: 2 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 11 } } }, y: { grid: { color: cc.grid }, ticks: { color: cc.text, font: { size: 11 } }, beginAtZero: true } } }
    });

    // Recent Table
    const recent = data.slice(0, 5);
    document.getElementById('recentTable').innerHTML = recent.map(c => {
        const bc = statusColors[c.status] || '#8B5CF6';
        return `<tr><td>${c.name}</td><td>${c.nik}</td><td>${c.station}</td><td><span class="badge" style="background:${bc}20;color:${bc}">${c.status}</span></td><td>${c.created_at}</td></tr>`;
    }).join('');
}
