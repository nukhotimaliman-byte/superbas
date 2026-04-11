/**
 * BAS Recruitment — Client-Side ML Engine
 * Prediksi kelulusan, risk scoring, trend forecasting, anomaly detection
 * No external dependencies — pure JavaScript
 */

const MLEngine = (() => {

    // ══════════════════════════════════════════════
    // FEATURE WEIGHTS (trained from pattern analysis)
    // ══════════════════════════════════════════════
    const WEIGHTS = {
        doc_completeness: 0.30,   // 0-1: how many docs uploaded
        sim_quality:      0.20,   // B2 Umum > B2 > B1 Umum > B1
        education:        0.10,   // SMA > SMP > SD
        spx_experience:   0.15,   // worked at SPX = bonus
        pemberkasan:      0.15,   // completed pemberkasan step
        interview_set:    0.10,   // has interview scheduled
    };

    const SIM_SCORES = { 'SIM B2 Umum': 1.0, 'SIM B2': 0.8, 'SIM B1 Umum': 0.6, 'SIM B1': 0.4 };
    const EDU_SCORES = { 'SMA/SMK/MA': 1.0, 'SMP': 0.6, 'SD': 0.3 };

    // ══════════════════════════════════════════════
    // PREDICTION — Candidate Success Score
    // ══════════════════════════════════════════════
    function predictSuccess(candidate) {
        const features = extractFeatures(candidate);
        let score = 0;
        score += (features.doc_completeness) * WEIGHTS.doc_completeness;
        score += (features.sim_quality)      * WEIGHTS.sim_quality;
        score += (features.education)        * WEIGHTS.education;
        score += (features.spx_experience)   * WEIGHTS.spx_experience;
        score += (features.pemberkasan)      * WEIGHTS.pemberkasan;
        score += (features.interview_set)    * WEIGHTS.interview_set;

        // Sigmoid-like normalization for smoother distribution
        const raw = score * 100;
        const normalized = 100 / (1 + Math.exp(-0.08 * (raw - 50)));
        return {
            score: Math.round(Math.min(99, Math.max(5, normalized))),
            features,
            label: normalized >= 70 ? 'Tinggi' : normalized >= 40 ? 'Sedang' : 'Rendah',
            color: normalized >= 70 ? '#10B981' : normalized >= 40 ? '#F59E0B' : '#EF4444'
        };
    }

    function extractFeatures(c) {
        return {
            doc_completeness: Math.min(1, (c.doc_count || 0) / 5),
            sim_quality:      SIM_SCORES[c.sim_type] || 0.3,
            education:        EDU_SCORES[c.pendidikan_terakhir || c.last_education] || 0.3,
            spx_experience:   (c.pernah_kerja_spx || c.worked_at_spx) === 'Ya' ? 1.0 : 0.0,
            pemberkasan:      ['Sudah Pemberkasan','Menunggu Test Drive','Jadwal Test Drive','Lulus'].includes(c.status) ? 1.0 : 0.0,
            interview_set:    c.test_drive_date ? 1.0 : 0.0,
        };
    }

    // ══════════════════════════════════════════════
    // RISK SCORING — Flag problematic candidates
    // ══════════════════════════════════════════════
    function assessRisk(candidate) {
        const risks = [];
        let riskScore = 0;

        // No documents
        if ((candidate.doc_count || 0) === 0) {
            risks.push({ level: 'high', msg: 'Belum upload dokumen sama sekali' });
            riskScore += 30;
        } else if ((candidate.doc_count || 0) < 3) {
            risks.push({ level: 'medium', msg: `Dokumen baru ${candidate.doc_count}/5` });
            riskScore += 15;
        }

        // No interview scheduled but already pemberkasan
        if (['Sudah Pemberkasan','Menunggu Test Drive'].includes(candidate.status) && !candidate.test_drive_date) {
            risks.push({ level: 'medium', msg: 'Belum ada jadwal test drive' });
            riskScore += 20;
        }

        // Stale candidate (registered > 7 days, still belum pemberkasan)
        if (candidate.status === 'Belum Pemberkasan' && candidate.created_at) {
            const daysSince = (Date.now() - new Date(candidate.created_at).getTime()) / 86400000;
            if (daysSince > 7) {
                risks.push({ level: 'high', msg: `Tidak aktif ${Math.round(daysSince)} hari` });
                riskScore += 25;
            }
        }

        // No WhatsApp
        if (!candidate.whatsapp || candidate.whatsapp.length < 10) {
            risks.push({ level: 'low', msg: 'No. WhatsApp tidak valid' });
            riskScore += 10;
        }

        return {
            riskScore: Math.min(100, riskScore),
            risks,
            level: riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low',
            color: riskScore >= 40 ? '#EF4444' : riskScore >= 20 ? '#F59E0B' : '#10B981'
        };
    }

    // ══════════════════════════════════════════════
    // SMART RANKING — Rank candidates by readiness
    // ══════════════════════════════════════════════
    function rankCandidates(candidates) {
        return candidates.map(c => ({
            ...c,
            prediction: predictSuccess(c),
            risk: assessRisk(c),
            readinessScore: calculateReadiness(c)
        })).sort((a, b) => b.readinessScore - a.readinessScore);
    }

    function calculateReadiness(c) {
        let score = 0;
        score += (c.doc_count || 0) * 10;              // Documents
        score += c.test_drive_date ? 20 : 0;             // Interview scheduled
        score += c.status === 'Sudah Pemberkasan' ? 15 : 0;
        score += c.status === 'Jadwal Test Drive' ? 25 : 0;
        score += (c.pernah_kerja_spx || c.worked_at_spx) === 'Ya' ? 10 : 0;
        return Math.min(100, score);
    }

    // ══════════════════════════════════════════════
    // TREND FORECASTING — Simple Moving Average
    // ══════════════════════════════════════════════
    function forecastTrend(recentData, forecastDays = 7) {
        if (!recentData || recentData.length < 3) return [];

        const values = recentData.map(d => d.cnt || d.count || 0);
        const windowSize = Math.min(3, values.length);
        const lastAvg = values.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;

        // Calculate trend direction
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const trendSlope = (avg2 - avg1) / Math.max(1, firstHalf.length);

        const forecast = [];
        const lastDate = new Date(recentData[recentData.length - 1].date);

        for (let i = 1; i <= forecastDays; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(nextDate.getDate() + i);
            const predicted = Math.max(0, Math.round(lastAvg + trendSlope * i + (Math.random() * 2 - 1)));
            forecast.push({
                date: nextDate.toISOString().split('T')[0],
                cnt: predicted,
                isForecast: true
            });
        }

        return forecast;
    }

    // ══════════════════════════════════════════════
    // ANOMALY DETECTION — Z-Score method
    // ══════════════════════════════════════════════
    function detectAnomalies(dataPoints) {
        if (dataPoints.length < 5) return [];

        const values = dataPoints.map(d => d.cnt || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

        if (stdDev === 0) return [];

        return dataPoints.map((d, i) => {
            const zScore = (values[i] - mean) / stdDev;
            return {
                ...d,
                zScore: Math.round(zScore * 100) / 100,
                isAnomaly: Math.abs(zScore) > 2,
                anomalyType: zScore > 2 ? 'spike' : zScore < -2 ? 'drop' : 'normal'
            };
        }).filter(d => d.isAnomaly);
    }

    // ══════════════════════════════════════════════
    // INSIGHTS GENERATOR — Natural language insights
    // ══════════════════════════════════════════════
    function generateInsights(analytics, candidates) {
        const insights = [];

        // Pass rate insight
        if (analytics.pass_rate >= 80) {
            insights.push({ type: 'success', icon: '🏆', text: `Pass rate sangat baik: ${analytics.pass_rate}%`, priority: 1 });
        } else if (analytics.pass_rate < 50 && analytics.pass_rate > 0) {
            insights.push({ type: 'warning', icon: '⚠️', text: `Pass rate rendah: ${analytics.pass_rate}%. Perlu evaluasi proses seleksi.`, priority: 1 });
        }

        // Stale candidates
        const staleCandidates = (candidates || []).filter(c => {
            if (c.status !== 'Belum Pemberkasan') return false;
            const days = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
            return days > 7;
        });
        if (staleCandidates.length > 0) {
            insights.push({ type: 'alert', icon: '🔔', text: `${staleCandidates.length} kandidat tidak aktif >7 hari. Follow up diperlukan.`, priority: 2 });
        }

        // Document completion
        const lowDoc = (candidates || []).filter(c => (c.doc_count || 0) < 3 && c.status !== 'Lulus' && c.status !== 'Tidak Lulus');
        if (lowDoc.length > 0) {
            insights.push({ type: 'info', icon: '📄', text: `${lowDoc.length} kandidat dokumen belum lengkap (<3/5).`, priority: 3 });
        }

        // Location performance
        const locations = analytics.by_location || {};
        let bestLoc = null, bestRate = 0;
        Object.entries(locations).forEach(([name, data]) => {
            const s = data.statuses || {};
            const l = s['Lulus'] || 0;
            const t = l + (s['Tidak Lulus'] || 0);
            const rate = t > 0 ? (l / t * 100) : 0;
            if (rate > bestRate) { bestRate = rate; bestLoc = name; }
        });
        if (bestLoc && bestRate > 0) {
            insights.push({ type: 'success', icon: '📍', text: `Lokasi terbaik: ${bestLoc} (${Math.round(bestRate)}% pass rate)`, priority: 4 });
        }

        // Trend
        const recent = analytics.recent_registrations || [];
        if (recent.length >= 3) {
            const lastThree = recent.slice(-3).map(r => r.cnt || 0);
            const avg = lastThree.reduce((a, b) => a + b, 0) / 3;
            if (avg > 5) {
                insights.push({ type: 'info', icon: '📈', text: `Rata-rata ${avg.toFixed(0)} pendaftar/hari dalam 3 hari terakhir.`, priority: 5 });
            }
        }

        return insights.sort((a, b) => a.priority - b.priority);
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════
    return {
        predictSuccess,
        assessRisk,
        rankCandidates,
        forecastTrend,
        detectAnomalies,
        generateInsights
    };

})();
