/* SUPER-BAS — Minimal Interactions */

document.addEventListener('DOMContentLoaded', () => {

    // Header scroll
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    // Scroll reveal
    const els = document.querySelectorAll('.card, .val, .values__heading, .register');
    els.forEach(el => el.classList.add('reveal'));

    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('show');
                io.unobserve(e.target);
            }
        });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 });

    els.forEach((el, i) => {
        el.style.transitionDelay = `${(i % 4) * 80}ms`;
        io.observe(el);
    });

    // Smooth scroll for anchor links (only if target exists on page)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href.length <= 1) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Theme toggle (dark/light) — key synced with driver portal ('bas-theme')
    const toggle = document.getElementById('theme-toggle');
    toggle?.addEventListener('click', () => {
        const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('bas-theme', next); } catch {}
    });

});
