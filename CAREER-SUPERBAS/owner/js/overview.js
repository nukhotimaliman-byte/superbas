/**
 * BAS Command Center — Overview & Charts v2.0
 * Modern gradient charts with fallback data
 */
let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

/* ── Chart.js Global Config ─────────────────────────── */
function isLightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light';
}

function getChartDefaults() {
    const light = isLightTheme();
    const cfg = {
        gridColor: light ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)',
        textColor: light ? '#374151' : '#c4c8d4',
        tooltipBg: light ? '#ffffff' : '#1a1a28',
        tooltipText: light ? '#111827' : '#f0f0f0',
        tooltipBorder: light ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)',
        pointBorder: light ? '#ffffff' : '#0d0d14',
    };
    // Set Chart.js global defaults for text color
    if (window.Chart) {
        Chart.defaults.color = cfg.textColor;
        Chart.defaults.borderColor = cfg.gridColor;
    }
    return cfg;
}

function chartTooltipStyle(cfg) {
    return {
        backgroundColor: cfg.tooltipBg,
        titleColor: cfg.tooltipText,
        bodyColor: cfg.tooltipText,
        borderColor: cfg.tooltipBorder,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { size: 12, weight: '600', family: "'Inter', sans-serif" },
        bodyFont: { size: 11, family: "'Inter', sans-serif" },
        boxPadding: 4,
        usePointStyle: true,
    };
}

/* ── Colors ──────────────────────────────────────────── */
const COLORS = {
    driver: { solid: '#38BDF8', bg: 'rgba(56,189,248,.12)', gradient: ['rgba(56,189,248,.3)', 'rgba(56,189,248,.02)'] },
    kurir:  { solid: '#FBBF24', bg: 'rgba(251,191,36,.12)', gradient: ['rgba(251,191,36,.25)', 'rgba(251,191,36,.02)'] },
    daily:  { solid: '#A78BFA', bg: 'rgba(167,139,250,.12)', gradient: ['rgba(167,139,250,.25)', 'rgba(167,139,250,.02)'] },
    success:{ solid: '#22C55E', bg: 'rgba(34,197,94,.12)' },
    danger: { solid: '#EF4444', bg: 'rgba(239,68,68,.12)' },
    info:   { solid: '#8B5CF6', bg: 'rgba(139,92,246,.12)' },
    warn:   { solid: '#FBBF24', bg: 'rgba(251,191,36,.12)' },
};

function makeGradient(ctx, color) {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, color[0]);
    g.addColorStop(1, color[1]);
    return g;
}

/* ── Overview ────────────────────────────────────────── */
async function loadOverview() {
    try {
        const d = await api('stats.php?action=overview');
        renderStatCards(d);
        renderStatusChart(d);
        renderPassRateChart(d);
        loadTrend();
        loadCities();
        initIndonesiaMap();
    } catch(e) {
        console.error('Overview error:', e);
        // Render with zeros so the UI doesn't look broken
        renderStatCards({ total: 0, driver: 0, kurir: 0, daily_worker: 0, today: { total: 0, driver: 0, kurir: 0, daily_worker: 0 }, by_status: {}, lulus: 0, tidak_lulus: 0 });
        toast('Gagal memuat overview data', 'error');
    }
}

function renderStatCards(d) {
    const g = Q('#statGrid');
    const cards = [
        { l: 'Total Kandidat', v: d.total || 0, accent: true, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', today: d.today?.total || 0 },
        { l: 'Driver', v: d.driver || 0, color: COLORS.driver.solid, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', today: d.today?.driver || 0 },
        { l: 'Kurir', v: d.kurir || 0, color: COLORS.kurir.solid, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="20" height="14" rx="2"/><path d="M1 10h20"/><path d="M7 6V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>', today: d.today?.kurir || 0 },
        { l: 'Daily Worker', v: d.daily_worker || 0, color: COLORS.daily.solid, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', today: d.today?.daily_worker || 0 },
    ];

    g.innerHTML = cards.map(c => {
        const valColor = c.color ? `color:${c.color}` : (c.accent ? 'color:var(--accent)' : '');
        const iconBg = c.color ? `color:${c.color};background:${c.color}12` : '';
        const trendUp = c.today > 0;
        return `<div class="stat-card${c.accent ? ' stat-card--accent' : ''}">
            <div class="stat-card-top">
                <div class="stat-label">${c.l}</div>
                <div class="stat-icon" ${iconBg ? `style="${iconBg}"` : ''}>${c.icon}</div>
            </div>
            <div class="stat-value" style="${valColor}">${(c.v || 0).toLocaleString('id-ID')}</div>
            <div class="stat-trend ${trendUp ? 'up' : 'neutral'}">
                ${trendUp ? '&#9650;' : '&#9679;'} +${c.today} hari ini
            </div>
        </div>`;
    }).join('');
}

function renderStatusChart(d) {
    const statusData = d.by_status || {};
    const labels = Object.keys(statusData);
    const values = Object.values(statusData);

    if (!labels.length) {
        Q('#chartStatus').parentElement.innerHTML = '<div class="chart-empty">Belum ada data status</div>';
        return;
    }

    const colorMap = { 'Baru': '#38BDF8', 'Belum Pemberkasan': '#64748B', 'Sudah Pemberkasan': '#06B6D4', 'Proses': '#FBBF24', 'Undang WI': '#F59E0B', 'Jadwal Test Drive': '#8B5CF6', 'Menunggu Test Drive': '#A78BFA', 'Hadir': '#10B981', 'Tidak Hadir': '#F97316', 'Interview': '#6366F1', 'Lulus': '#22C55E', 'Tidak Lulus': '#EF4444', 'Blacklist': '#DC2626', 'abnormal': '#94A3B8' };
    const colors = labels.map(l => colorMap[l] || '#666');
    const cfg = getChartDefaults();

    destroyChart('chartStatus');
    chartInstances.chartStatus = new Chart(Q('#chartStatus'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 6,
                spacing: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { position: 'bottom', labels: { color: cfg.textColor, font: { size: 11, family: "'Inter'" }, padding: 16, usePointStyle: true, pointStyleWidth: 8, } },
                tooltip: chartTooltipStyle(cfg),
            }
        }
    });
}

function renderPassRateChart(d) {
    const lulus = d.lulus || 0, tidakLulus = d.tidak_lulus || 0;
    if (!lulus && !tidakLulus) {
        Q('#chartPassRate').parentElement.innerHTML = '<div class="chart-empty">Belum ada data pass rate</div>';
        return;
    }
    const cfg = getChartDefaults();
    destroyChart('chartPassRate');
    chartInstances.chartPassRate = new Chart(Q('#chartPassRate'), {
        type: 'doughnut',
        data: {
            labels: ['Lulus', 'Tidak Lulus'],
            datasets: [{
                data: [lulus, tidakLulus],
                backgroundColor: [COLORS.success.solid, COLORS.danger.solid],
                borderWidth: 0,
                hoverOffset: 6,
                spacing: 2,
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { position: 'bottom', labels: { color: cfg.textColor, font: { size: 11, family: "'Inter'" }, padding: 16, usePointStyle: true, pointStyleWidth: 8, } },
                tooltip: chartTooltipStyle(cfg),
            }
        }
    });
}

/* ── Trend Chart ─────────────────────────────────────── */
async function loadTrend() {
    try {
        const d = await api('stats.php?action=trend&days=30');
        const allDates = new Set();
        ['driver','kurir','daily_worker'].forEach(p => (d[p] || []).forEach(r => allDates.add(r.date)));
        const dates = [...allDates].sort();

        if (!dates.length) {
            Q('#chartTrend').parentElement.innerHTML = '<div class="chart-empty">Belum ada data trend</div>';
            return;
        }

        const mkData = (p) => dates.map(dt => { const f = (d[p] || []).find(r => r.date === dt); return f ? parseInt(f.cnt) : 0; });
        const cfg = getChartDefaults();
        const ctx = Q('#chartTrend').getContext('2d');

        destroyChart('chartTrend');
        chartInstances.chartTrend = new Chart(Q('#chartTrend'), {
            type: 'line',
            data: {
                labels: dates.map(dt => { const p = dt.split('-'); return parseInt(p[2]) + '/' + parseInt(p[1]); }),
                datasets: [
                    { label: 'Driver', data: mkData('driver'), borderColor: COLORS.driver.solid, backgroundColor: makeGradient(ctx, COLORS.driver.gradient), tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: COLORS.driver.solid, pointBorderColor: cfg.pointBorder, pointBorderWidth: 2, borderWidth: 2 },
                    { label: 'Kurir', data: mkData('kurir'), borderColor: COLORS.kurir.solid, backgroundColor: makeGradient(ctx, COLORS.kurir.gradient), tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: COLORS.kurir.solid, pointBorderColor: cfg.pointBorder, pointBorderWidth: 2, borderWidth: 2 },
                    { label: 'Daily Worker', data: mkData('daily_worker'), borderColor: COLORS.daily.solid, backgroundColor: makeGradient(ctx, COLORS.daily.gradient), tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: COLORS.daily.solid, pointBorderColor: cfg.pointBorder, pointBorderWidth: 2, borderWidth: 2 },
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" }, maxRotation: 0 }, grid: { color: cfg.gridColor, drawBorder: false } },
                    y: { ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" } }, grid: { color: cfg.gridColor, drawBorder: false }, beginAtZero: true },
                },
                plugins: {
                    legend: { labels: { color: cfg.textColor, font: { size: 11, family: "'Inter'" }, usePointStyle: true, pointStyleWidth: 8, padding: 16 } },
                    tooltip: { ...chartTooltipStyle(cfg), mode: 'index', intersect: false },
                }
            }
        });
    } catch(e) { console.error('Trend error:', e); }
}

/* ── Cities Chart ────────────────────────────────────── */
async function loadCities() {
    try {
        const d = await api('stats.php?action=top_cities&limit=8');
        if (!d || !d.length) {
            Q('#chartCities').parentElement.innerHTML = '<div class="chart-empty">Belum ada data kota</div>';
            return;
        }
        const labels = d.map(r => r.city), values = d.map(r => parseInt(r.total));
        const cfg = getChartDefaults();

        destroyChart('chartCities');
        chartInstances.chartCities = new Chart(Q('#chartCities'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Pelamar',
                    data: values,
                    backgroundColor: COLORS.driver.solid,
                    hoverBackgroundColor: '#60CDFF',
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.6,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                scales: {
                    x: { ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" } }, grid: { color: cfg.gridColor, drawBorder: false }, beginAtZero: true },
                    y: { ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" } }, grid: { display: false } },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: chartTooltipStyle(cfg),
                }
            }
        });
    } catch(e) { console.error('Cities error:', e); }
}
