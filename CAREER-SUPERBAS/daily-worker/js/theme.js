/**
 * BAS Recruitment — Universal Theme Controller
 * Runs immediately in <head> to prevent FOUC (flash of unstyled content).
 * Default: dark mode. Storage key: 'bas-theme' (shared across semua halaman).
 */
(function () {
    var STORAGE_KEY  = 'bas-theme';
    var DEFAULT_THEME = 'dark';

    function getSavedTheme() {
        try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    }

    /**
     * Update UI toggle icons.
     * Konvensi seragam: Dark Mode → tampil MOON 🌙 | Light Mode → tampil SUN ☀️
     */
    function updateToggleUI(theme) {
        // Admin sidebar uses explicit IDs (themeIconSun / themeIconMoon)
        var sun  = document.getElementById('themeIconSun');
        var moon = document.getElementById('themeIconMoon');
        if (sun && moon) {
            // Dark → moon, Light → sun
            sun.style.display  = theme === 'dark' ? 'none'  : 'block';
            moon.style.display = theme === 'dark' ? 'block' : 'none';
        }
        // Header icon-style toggles use CSS [data-theme] — no JS needed here.
    }

    // ── Apply instantly before paint ───────────────────────────
    applyTheme(getSavedTheme());

    // ── Bind toggle after DOM ready ─────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        var current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
        updateToggleUI(current);

        document.getElementById('themeToggle')?.addEventListener('click', function () {
            var cur  = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
            var next = cur === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            updateToggleUI(next);
        });
    });

    // ── Expose global toggle for any custom button ──────────────
    window.toggleTheme = function () {
        var cur  = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
        var next = cur === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        updateToggleUI(next);
    };
})();
