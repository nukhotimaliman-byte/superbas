/**
 * BAS Command Center — Forecast Engine + Calendar v1.0
 * Linear Regression forecast with interactive calendar date picker
 */

/* ═══════════════════════════════════════════════════
   LINEAR REGRESSION ENGINE
   ═══════════════════════════════════════════════════ */

function linearRegression(points) {
    const n = points.length;
    if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const p of points) {
        sumX  += p.x;
        sumY  += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    }
    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return { slope: 0, intercept: sumY / n };

    const slope     = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

function generateForecast(actualValues, forecastDays) {
    const points = actualValues.map((v, i) => ({ x: i, y: v }));
    const { slope, intercept } = linearRegression(points);

    const forecast = [];
    const startIdx = actualValues.length;
    for (let i = 0; i < forecastDays; i++) {
        const predicted = Math.max(0, Math.round(intercept + slope * (startIdx + i)));
        forecast.push(predicted);
    }
    return forecast;
}

/* ═══════════════════════════════════════════════════
   CALENDAR COMPONENT
   ═══════════════════════════════════════════════════ */

const CAL_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const CAL_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

let calState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    startDate: null,
    endDate: null,
    dataDots: new Set(),
};

function initForecastCalendar() {
    const prevBtn = Q('#calPrev');
    const nextBtn = Q('#calNext');
    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', () => {
        calState.month--;
        if (calState.month < 0) { calState.month = 11; calState.year--; }
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        calState.month++;
        if (calState.month > 11) { calState.month = 0; calState.year++; }
        renderCalendar();
    });

    // Preset buttons
    QQ('.cal-preset').forEach(btn => btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days);
        if (days === 0) {
            calState.startDate = null;
            calState.endDate = null;
            QQ('.cal-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCalendar();
            updateRangeDisplay();
            loadForecastChart();
            return;
        }
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days + 1);
        calState.startDate = start;
        calState.endDate = end;
        calState.year = end.getFullYear();
        calState.month = end.getMonth();
        QQ('.cal-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderCalendar();
        updateRangeDisplay();
        loadForecastChart();
    }));

    // Default: 14 hari
    const default14 = document.querySelector('.cal-preset[data-days="14"]');
    if (default14) default14.click();
}

function renderCalendar() {
    const grid = Q('#calGrid');
    if (!grid) return;

    const y = calState.year, m = calState.month;
    Q('#calMonth').textContent = CAL_MONTHS[m] + ' ' + y;

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday-based

    const today = new Date();
    const todayStr = fmtISO(today);

    let html = CAL_DAYS.map(d => `<div class="cal-head">${d}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
        html += '<div class="cal-day cal-day--empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(y, m, d);
        const iso = fmtISO(date);
        const classes = ['cal-day'];

        if (iso === todayStr) classes.push('cal-day--today');
        if (calState.dataDots.has(iso)) classes.push('cal-day--has-data');
        if (calState.startDate && calState.endDate) {
            const ds = fmtISO(calState.startDate), de = fmtISO(calState.endDate);
            if (iso === ds || iso === de) classes.push('cal-day--selected');
            if (iso > ds && iso < de) classes.push('cal-day--in-range');
        } else if (calState.startDate && !calState.endDate) {
            if (iso === fmtISO(calState.startDate)) classes.push('cal-day--selected');
        }

        html += `<div class="${classes.join(' ')}" data-date="${iso}">
            <span class="cal-day-num">${d}</span>
            ${calState.dataDots.has(iso) ? '<span class="cal-dot"></span>' : ''}
        </div>`;
    }

    grid.innerHTML = html;

    // Click handler
    grid.querySelectorAll('.cal-day:not(.cal-day--empty)').forEach(cell => {
        cell.addEventListener('click', () => {
            const clickedDate = new Date(cell.dataset.date + 'T00:00:00');
            if (!calState.startDate || (calState.startDate && calState.endDate)) {
                // Start new selection
                calState.startDate = clickedDate;
                calState.endDate = null;
            } else {
                // End selection
                if (clickedDate < calState.startDate) {
                    calState.endDate = calState.startDate;
                    calState.startDate = clickedDate;
                } else {
                    calState.endDate = clickedDate;
                }
                QQ('.cal-preset').forEach(b => b.classList.remove('active'));
                loadForecastChart();
            }
            renderCalendar();
            updateRangeDisplay();
        });
    });
}

function updateRangeDisplay() {
    const el = Q('#calRangeDisplay');
    if (!el) return;
    if (calState.startDate && calState.endDate) {
        const s = calState.startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const e = calState.endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const diff = Math.ceil((calState.endDate - calState.startDate) / 86400000) + 1;
        el.innerHTML = `<strong>${s} — ${e}</strong> <span class="cal-range-days">${diff} hari</span>`;
    } else if (calState.startDate) {
        el.innerHTML = `<span class="cal-range-hint">Klik tanggal akhir untuk menentukan rentang</span>`;
    } else {
        el.innerHTML = `<span class="cal-range-hint">Klik 2 tanggal untuk memilih rentang</span>`;
    }
}

function fmtISO(d) {
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

/* ═══════════════════════════════════════════════════
   FORECAST CHART
   ═══════════════════════════════════════════════════ */

async function loadForecastChart() {
    const cfg = getChartDefaults();
    const canvas = Q('#chartForecast');
    if (!canvas) return;

    // Determine date range
    let from, to;
    if (calState.startDate && calState.endDate) {
        from = fmtISO(calState.startDate);
        to = fmtISO(calState.endDate);
    } else {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 13);
        from = fmtISO(start);
        to = fmtISO(end);
    }

    try {
        const d = await api(`stats.php?action=trend&from=${from}&to=${to}`);

        // Build date range array (fill missing dates)
        const start = new Date(from + 'T00:00:00');
        const end = new Date(to + 'T00:00:00');
        const actualDates = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            actualDates.push(fmtISO(dt));
        }

        // Build per-project actual values
        const projects = [
            { key: 'driver',       label: 'Driver',       color: '#38BDF8', gradientA: ['rgba(56,189,248,.25)','rgba(56,189,248,.01)'],  gradientF: ['rgba(56,189,248,.10)','rgba(56,189,248,.01)'] },
            { key: 'kurir',        label: 'Kurir',        color: '#FBBF24', gradientA: ['rgba(251,191,36,.20)','rgba(251,191,36,.01)'],   gradientF: ['rgba(251,191,36,.08)','rgba(251,191,36,.01)'] },
            { key: 'daily_worker', label: 'Daily Worker', color: '#A78BFA', gradientA: ['rgba(167,139,250,.20)','rgba(167,139,250,.01)'], gradientF: ['rgba(167,139,250,.08)','rgba(167,139,250,.01)'] },
        ];

        // Map API data to daily values
        const projectData = {};
        const allDataDots = new Set();
        projects.forEach(p => {
            const map = {};
            (d[p.key] || []).forEach(r => {
                map[r.date] = parseInt(r.cnt);
                allDataDots.add(r.date);
            });
            projectData[p.key] = actualDates.map(dt => map[dt] || 0);
        });

        // Store data dots for calendar
        calState.dataDots = allDataDots;
        renderCalendar();

        // Generate forecasts per project
        const forecastDays = Math.max(7, Math.min(actualDates.length, 14));
        const forecastDates = [];
        const lastActual = new Date(actualDates[actualDates.length - 1] + 'T00:00:00');
        for (let i = 1; i <= forecastDays; i++) {
            const fd = new Date(lastActual);
            fd.setDate(fd.getDate() + i);
            forecastDates.push(fmtISO(fd));
        }

        // Combined labels
        const allDates = [...actualDates, ...forecastDates];
        const fmtLabel = (d) => {
            const dt = new Date(d + 'T00:00:00');
            return dt.getDate() + ' ' + CAL_MONTHS[dt.getMonth()].slice(0, 3);
        };
        const allLabels = allDates.map(fmtLabel);

        const ctx = canvas.getContext('2d');
        const datasets = [];

        projects.forEach(p => {
            const actual = projectData[p.key];
            const forecast = generateForecast(actual, forecastDays);

            // Actual dataset: values + nulls
            const actualData = [...actual, ...Array(forecastDays).fill(null)];

            // Forecast dataset: nulls + overlap last + forecast
            const forecastData = [
                ...Array(actual.length - 1).fill(null),
                actual[actual.length - 1],
                ...forecast
            ];

            // Gradient fills
            const gradA = ctx.createLinearGradient(0, 0, 0, 340);
            gradA.addColorStop(0, p.gradientA[0]);
            gradA.addColorStop(1, p.gradientA[1]);

            const gradF = ctx.createLinearGradient(0, 0, 0, 340);
            gradF.addColorStop(0, p.gradientF[0]);
            gradF.addColorStop(1, p.gradientF[1]);

            // Actual line
            datasets.push({
                label: p.label,
                data: actualData,
                borderColor: p.color,
                backgroundColor: gradA,
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: p.color,
                pointBorderColor: cfg.pointBorder,
                pointBorderWidth: 2,
                spanGaps: false,
            });

            // Forecast line (dashed)
            datasets.push({
                label: p.label + ' (Prediksi)',
                data: forecastData,
                borderColor: p.color + '99',
                backgroundColor: gradF,
                borderWidth: 2,
                borderDash: [6, 4],
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: p.color,
                pointBorderColor: cfg.pointBorder,
                pointBorderWidth: 2,
                pointStyle: 'circle',
                spanGaps: false,
            });
        });

        destroyChart('chartForecast');
        chartInstances.chartForecast = new Chart(canvas, {
            type: 'line',
            data: { labels: allLabels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: {
                        ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" }, maxRotation: 45, autoSkipPadding: 8 },
                        grid: { color: cfg.gridColor, drawBorder: false },
                    },
                    y: {
                        ticks: { color: cfg.textColor, font: { size: 10, family: "'Inter'" } },
                        grid: { color: cfg.gridColor, drawBorder: false },
                        beginAtZero: true,
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: cfg.textColor,
                            font: { size: 11, family: "'Inter'", weight: '500' },
                            usePointStyle: true, pointStyleWidth: 10, padding: 16,
                            filter: (item) => !item.text.includes('Prediksi'),
                        }
                    },
                    tooltip: {
                        ...chartTooltipStyle(cfg),
                        mode: 'index', intersect: false,
                        filter: (item) => item.raw !== null,
                        callbacks: {
                            label: (item) => {
                                if (item.raw === null) return null;
                                const isDashed = item.dataset.borderDash && item.dataset.borderDash.length;
                                const suffix = isDashed ? ' (prediksi)' : '';
                                return ` ${item.dataset.label.replace(' (Prediksi)','')}: ${item.raw}${suffix}`;
                            }
                        }
                    }
                }
            }
        });

    } catch (e) {
        console.error('Forecast error:', e);
        canvas.parentElement.innerHTML = '<div class="chart-empty">Gagal memuat data forecast</div>';
    }
}

/* ═══════════════════════════════════════════════════
   INIT — called from loadAnalytics
   ═══════════════════════════════════════════════════ */

function initForecast() {
    initForecastCalendar();
}
