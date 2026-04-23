(function() {
      var preloader = document.getElementById('bas-preloader');
      if (!preloader) return;
      var progressBar = preloader.querySelector('.pl-progress-bar');
      var statusText = preloader.querySelector('.pl-status');
      var messages = ['Memuat Sistem', 'Menyiapkan Data', 'Hampir Selesai'];
      var msgIdx = 0;
      var msgInterval = setInterval(function() {
        msgIdx++;
        if (msgIdx < messages.length && statusText) {
          statusText.textContent = messages[msgIdx];
        }
      }, 900);

      function hidePreloader() {
        clearInterval(msgInterval);
        if (progressBar) {
          progressBar.style.transition = 'width 0.3s ease';
          progressBar.style.width = '100%';
        }
        if (statusText) statusText.textContent = 'Selesai';
        setTimeout(function() {
          preloader.classList.add('hide');
          setTimeout(function() { preloader.remove(); }, 900);
        }, 350);
      }
      var root = document.getElementById('root');
      var observer = new MutationObserver(function() {
        if (root.children.length > 0) {
          observer.disconnect();
          setTimeout(hidePreloader, 500);
        }
      });
      observer.observe(root, { childList: true });
      setTimeout(hidePreloader, 5000);
    })();

      (function() {
        'use strict';
        
        const STORAGE_KEY = 'bas-theme';
        const LEGACY_KEYS = ['bas-theme-mode', 'bas_owner_theme'];
        const html = document.documentElement;
        const btn = document.getElementById('theme-toggle-btn');
        const overlay = document.getElementById('theme-overlay');
        
        function getStoredTheme() {
          try {
            return localStorage.getItem(STORAGE_KEY)
              || localStorage.getItem('bas-theme-mode')
              || localStorage.getItem('bas_owner_theme')
              || null;
          } catch(e) { return null; }
        }
        function setStoredTheme(mode) {
          try {
            localStorage.setItem(STORAGE_KEY, mode);
            // Write legacy keys so owner.html & settings stay in sync
            LEGACY_KEYS.forEach(function(k) { localStorage.setItem(k, mode); });
          } catch(e) {}
        }

        // Cross-tab sync: jika user ganti tema di tab lain
        window.addEventListener('storage', function(e) {
          if (e.key === 'bas-theme' || e.key === 'bas-theme-mode' || e.key === 'bas_owner_theme') {
            if (e.newValue && e.newValue !== (html.classList.contains('light-mode') ? 'light' : 'dark')) {
              applyTheme(e.newValue, false);
            }
          }
        });

        // Color mapping: dark → light
        const bgColorMap = {
          'rgb(16, 0, 43)': '#f7f8fc',
          'rgb(26, 11, 46)': '#f7f8fc',
          'rgb(36, 0, 70)': '#f1f5f9',
          'rgb(60, 9, 108)': '#eef2ff',
          'rgb(114, 9, 183)': '#8b5cf6',
          'rgb(123, 44, 191)': '#8b5cf6',
          'rgb(0, 0, 0)': '#f7f8fc',
        };

        // Aggressive: patch ALL elements with dark backgrounds
        function patchInlineStyles() {
          if (!html.classList.contains('light-mode')) return;
          
          document.querySelectorAll('#root *').forEach(el => {
            // Skip all elements inside <header>, z-50 modals, and ID card — handled by CSS
            if (el.closest('header') || el.closest('.fixed.inset-0.z-50') || el.closest('#card-capture-target')) return;
            const s = el.style;
            const cs = window.getComputedStyle(el);
            
            // 1. Patch explicit inline bg-color
            if (s.backgroundColor && bgColorMap[s.backgroundColor]) {
              if (!el.dataset._origBg) el.dataset._origBg = s.backgroundColor;
              s.backgroundColor = bgColorMap[s.backgroundColor];
            }
            
            // 2. Patch background (gradients with dark colors)
            if (s.background) {
              let bg = s.background;
              let changed = false;
              for (const [dark, light] of Object.entries(bgColorMap)) {
                if (bg.includes(dark)) {
                  if (!el.dataset._origBgFull) el.dataset._origBgFull = bg;
                  bg = bg.replaceAll(dark, light);
                  changed = true;
                }
              }
              if (changed) s.background = bg;
            }
            
            // 3. Patch backgroundImage (gradient overlays)
            if (s.backgroundImage) {
              let bgi = s.backgroundImage;
              let changed = false;
              for (const [dark, light] of Object.entries(bgColorMap)) {
                if (bgi.includes(dark)) {
                  if (!el.dataset._origBgi) el.dataset._origBgi = bgi;
                  bgi = bgi.replaceAll(dark, light);
                  changed = true;
                }
              }
              if (changed) s.backgroundImage = bgi;
            }

            // 4. Patch white text on light backgrounds
            if (s.color === 'rgb(255, 255, 255)' || s.color === 'white') {
              // Don't patch text inside gradient colored cards — it should stay white
              var inGradientCard = el.closest('[class*="bg-gradient-to-r"][class*="from-[#240046]"]') ||
                                   el.closest('[class*="bg-gradient-to-br"][class*="from-[#240046]"]') ||
                                   el.closest('[class*="bg-gradient-to-r"][class*="from-[#3c096c]"]');
              if (!inGradientCard) {
                if (!el.dataset._origColor) el.dataset._origColor = s.color;
                s.color = '#1e293b';
              }
            }

            // 5. Detect computed dark backgrounds (catches Tailwind classes applied via className)
            const compBg = cs.backgroundColor;
            if (compBg && bgColorMap[compBg] && !s.backgroundColor) {
              // These are class-based, CSS should handle them
              // But add data attr for verification
            }
          });

          // 6. NUCLEAR: force all text in info cards to be visible
          document.querySelectorAll('[class*="bg-[#240046]/30"] span, [class*="bg-[#240046]/30"] p').forEach(el => {
            const cls = el.className || '';
            el.setAttribute('data-nuc', '1');
            // Preserve accent colors
            if (cls.includes('text-[#f72585]')) { el.style.setProperty('color', '#6366f1', 'important'); }
            else if (cls.includes('text-[#4cc9f0]')) { el.style.setProperty('color', '#4cc9f0', 'important'); }
            else if (cls.includes('text-[#00f5d4]') || cls.includes('text-[#00F5D4]')) { el.style.setProperty('color', '#059669', 'important'); }
            else if (cls.includes('text-slate-400')) { el.style.setProperty('color', '#64748b', 'important'); }
            else if (cls.includes('text-slate-500')) { el.style.setProperty('color', '#94a3b8', 'important'); }
            else { el.style.setProperty('color', '#1e293b', 'important'); }
          });
        }

        function unpatchInlineStyles() {
          // Restore original background colors
          document.querySelectorAll('#root [data-_orig-bg]').forEach(el => {
            el.style.backgroundColor = el.dataset._origBg;
            delete el.dataset._origBg;
          });
          document.querySelectorAll('#root [data-_orig-bg-full]').forEach(el => {
            el.style.background = el.dataset._origBgFull;
            delete el.dataset._origBgFull;
          });
          document.querySelectorAll('#root [data-_orig-bgi]').forEach(el => {
            el.style.backgroundImage = el.dataset._origBgi;
            delete el.dataset._origBgi;
          });
          document.querySelectorAll('#root [data-_orig-color]').forEach(el => {
            el.style.color = el.dataset._origColor;
            delete el.dataset._origColor;
          });
          // Clean up ALL nuclear-patched info card text
          document.querySelectorAll('#root [data-nuc]').forEach(el => {
            el.style.removeProperty('color');
            el.removeAttribute('data-nuc');
          });
          // SAFETY: remove ANY lingering inline color on info card elements
          document.querySelectorAll('[class*="bg-[#240046]/30"] span, [class*="bg-[#240046]/30"] p').forEach(el => {
            el.style.removeProperty('color');
          });
        }

        // Modal stacking fix (JS fallback for browsers without :has())
        function checkModalStacking() {
          const mainEl = document.querySelector('main');
          const modal = mainEl && mainEl.querySelector('.fixed.inset-0.z-50');
          const parent = mainEl && mainEl.parentElement;
          if (modal) {
            if (mainEl && !mainEl.classList.contains('modal-active')) mainEl.classList.add('modal-active');
            if (parent && !parent.classList.contains('modal-active-parent')) parent.classList.add('modal-active-parent');
          } else {
            if (mainEl) mainEl.classList.remove('modal-active');
            if (parent) parent.classList.remove('modal-active-parent');
          }
        }

        // MutationObserver for React re-renders
        let patchTimeout;
        const observer = new MutationObserver(() => {
          clearTimeout(patchTimeout);
          patchTimeout = setTimeout(() => {
            patchInlineStyles();
            checkModalStacking();
          }, 50);
        });

        function startObserver() {
          const root = document.getElementById('root');
          if (root) {
            observer.observe(root, { 
              childList: true, subtree: true, 
              attributes: true, attributeFilter: ['style', 'class'] 
            });
          }
        }

        // Theme override for pages that must stay dark (e.g. ID Card)
        var _themeOverride = null;

        function applyTheme(mode, animate) {
          // Block theme changes during override
          if (_themeOverride !== null) return;

          if (animate) {
            overlay.style.background = mode === 'light'
              ? 'rgba(247,248,252,0.97)'
              : 'rgba(16,0,43,0.97)';
            overlay.classList.add('active');
            setTimeout(() => overlay.classList.remove('active'), 450);
          }

          if (mode === 'light') {
            html.classList.add('light-mode');
            // Run patches with delays to catch React renders
            setTimeout(patchInlineStyles, 30);
            setTimeout(patchInlineStyles, 150);
            setTimeout(patchInlineStyles, 500);
            startObserver();
          } else {
            observer.disconnect();
            unpatchInlineStyles();
            html.classList.remove('light-mode');
          }
          setStoredTheme(mode);
        }

        // Force theme override (used by ID card page)
        window.__basForceThemeOverride = function(mode) {
          if (mode === 'dark') {
            _themeOverride = 'dark';
            observer.disconnect();
            unpatchInlineStyles();
            html.classList.remove('light-mode');
          } else if (mode === null) {
            _themeOverride = null;
            var saved = getStoredTheme();
            if (saved === 'light') {
              html.classList.add('light-mode');
              setTimeout(patchInlineStyles, 30);
              setTimeout(patchInlineStyles, 150);
              setTimeout(patchInlineStyles, 500);
              startObserver();
            }
          }
        };

        btn.addEventListener('click', function() {
          if (_themeOverride !== null) return; // Ignore toggle during override
          const isLight = html.classList.contains('light-mode');
          applyTheme(isLight ? 'dark' : 'light', true);
        });
        btn.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
        });

        // Init
        const saved = getStoredTheme();
        if (saved) {
          applyTheme(saved, false);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          applyTheme('light', false);
        }

        if (window.matchMedia) {
          window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(e) {
            if (!getStoredTheme()) applyTheme(e.matches ? 'light' : 'dark', true);
          });
        }

        // Robust: patch on full load and after React hydration
        window.addEventListener('load', () => {
          if (html.classList.contains('light-mode')) {
            setTimeout(patchInlineStyles, 100);
            setTimeout(patchInlineStyles, 500);
            setTimeout(patchInlineStyles, 2000);
          }
        });

        // Expose for settings panel
        window.__basApplyTheme = applyTheme;

        // Floating toggle only visible on login screen (CSS handles visibility)
      })();
    

    
    
      (function() {
        'use strict';
        var settingsPanel = document.getElementById('settings-panel');
        var themeItem = document.getElementById('settings-theme-item');
        var themeDesc = document.getElementById('settings-theme-desc');
        var switchIcon = document.getElementById('settings-switch-icon');
        var logoutBtn = document.getElementById('settings-logout-btn');
        var html = document.documentElement;

        function updateThemeToggle() {
          var isLight = html.classList.contains('light-mode');
          themeDesc.textContent = isLight ? 'Mode Terang' : 'Mode Gelap';
          switchIcon.textContent = isLight ? '🌙' : '☀️';
        }

        themeItem.addEventListener('click', function() {
          var isLight = html.classList.contains('light-mode');
          if (window.__basApplyTheme) {
            window.__basApplyTheme(isLight ? 'dark' : 'light', true);
          }
          setTimeout(updateThemeToggle, 150);
        });

        logoutBtn.addEventListener('click', function() {
          // Tutup settings panel dulu
          hideSettings();

          // Clear session langsung
          localStorage.removeItem('bas_session');

          // Coba klik tombol logout asli React
          var origLogout = document.querySelector('header .justify-between > button');
          if (origLogout) {
            // Buat visible sementara agar clickable
            origLogout.style.cssText = 'position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important;margin:0!important;opacity:0;pointer-events:auto;';
            origLogout.click();
            // Monitor apakah React sudah handle logout (login form muncul)
            var checkCount = 0;
            var checkLogout = setInterval(function() {
              checkCount++;
              var loginForm = document.querySelector('form') || document.querySelector('input[type="text"]');
              var headerGone = !document.querySelector('header');
              if (loginForm || headerGone || checkCount > 20) {
                clearInterval(checkLogout);
                // Jika React belum handle setelah 2 detik, force reload
                if (checkCount > 20) {
                  location.reload();
                }
              }
            }, 100);
          } else {
            // Tidak ketemu tombol React, langsung reload
            location.reload();
          }
        });

        function getAppContainer() {
          return document.querySelector('.max-w-md') || document.querySelector('#root > div');
        }

        function showSettings() {
          // Pindahkan panel ke dalam container app supaya ikut layout
          var container = getAppContainer();
          if (container && settingsPanel.parentNode !== container) {
            container.appendChild(settingsPanel);
          }
          settingsPanel.classList.add('active');
          html.classList.add('settings-panel-open');
          updateThemeToggle();

          // Engages the React DOM CSS Suppressor logic
          document.body.classList.add('custom-tab-active');

          // Reset all other tabs to inactive state using precise Tailwind strings
          var nav = document.querySelector('nav[class*="fixed"][class*="bottom-0"]');
          if (nav) {
            nav.querySelectorAll('button').forEach(function(b) {
                b.classList.remove('is-custom-active');
                var wrap = b.querySelector('div.mb-1');
                if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105';
                
                var label = b.querySelector('span.text-\\[10px\\]') || b.querySelector('span');
                if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100';
                
                var indicator = b.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || b.querySelector('.nav-active-indicator');
                if (indicator) {
                    indicator.style.display = 'none';
                    indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden';
                }
            });
          }
          
          // Activate Pengaturan tab
          var btn = document.getElementById('settings-nav-btn');
          if (btn) {
            var wrap = btn.querySelector('div.mb-1');
            if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-[#f72585] -translate-y-1 bg-white/5 scale-110 shadow-[0_0_15px_rgba(247,37,133,0.3)]';
            
            var label = btn.querySelector('span.text-\\[10px\\]') || btn.querySelector('span');
            if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-white opacity-100';
            
            var indicator = btn.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || btn.querySelector('.nav-active-indicator');
            if (indicator) {
                indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585]';
                indicator.style.display = '';
                void indicator.offsetWidth; // Force CSS reflow
                indicator.classList.add('animate-slide-in-bottom');
            }
            
            btn.classList.add('is-custom-active');
          }
        }
        function hideSettings() {
          settingsPanel.classList.remove('active');
          html.classList.remove('settings-panel-open');
          
          var btn = document.getElementById('settings-nav-btn');
          if (btn) {
            btn.classList.remove('is-custom-active');
            var wrap = btn.querySelector('div.mb-1');
            if (wrap) wrap.className = 'mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105';
            
            var label = btn.querySelector('span.text-\\[10px\\]') || btn.querySelector('span');
            if (label) label.className = 'text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100';
            
            var indicator = btn.querySelector('.bg-gradient-to-r.animate-slide-in-bottom') || btn.querySelector('.nav-active-indicator');
            if (indicator) {
                indicator.style.display = 'none';
                indicator.className = 'nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden';
            }
          }
          // Handle global desync safety for Settings tab
          document.addEventListener('click', function(e) {
            var clickedNav = e.target.closest('nav[class*="fixed"][class*="bottom-0"] button');
            if (clickedNav && clickedNav.id !== 'settings-nav-btn') {
              if (settingsPanel.classList.contains('active')) {
                  hideSettings();
              }
            }
          });
        }

        function injectSettingsTab() {
          var nav = document.querySelector('nav[class*="fixed"][class*="bottom-0"]');
          if (!nav) return false;
          var flex = nav.querySelector('.flex');
          if (!flex) return false;
          if (flex.querySelector('#settings-nav-btn')) return true;

          var btn = document.createElement('button');
          btn.id = 'settings-nav-btn';
          btn.className = 'flex flex-col items-center justify-center w-full h-full group relative outline-none transition-smooth active:scale-90';
          btn.innerHTML =
            '<div class="nav-active-indicator absolute top-0 w-12 h-1.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] rounded-b-full shadow-[0_0_15px_#f72585] animate-slide-in-bottom hidden"></div>' +
            '<div class="nav-icon-wrap mb-1 p-2 rounded-2xl transition-smooth text-slate-500 group-hover:text-white group-hover:scale-105">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/>' +
                '<line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/>' +
                '<line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/>' +
                '<line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/>' +
                '<line x1="18" x2="22" y1="16" y2="16"/>' +
              '</svg>' +
            '</div>' +
            '<span class="nav-label text-[10px] font-black transition-smooth uppercase tracking-tighter text-slate-600 opacity-0 group-hover:opacity-100">Pengaturan</span>';

          flex.appendChild(btn);

          btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (settingsPanel.classList.contains('active')) {
              hideSettings();
            } else {
              showSettings();
              btn.classList.add('active');
            }
          });

          return true;
        }

        var injected = false;
        function tryInject() {
          if (!injected && injectSettingsTab()) injected = true;
        }
        tryInject();
        [300, 800, 1500, 3000, 5000].forEach(function(ms) { setTimeout(tryInject, ms); });

        var bodyObs = new MutationObserver(function() {
          if (!injected) { tryInject(); return; }
          if (!document.getElementById('settings-nav-btn')) { injected = false; tryInject(); }
        });
        bodyObs.observe(document.body, { childList: true, subtree: true });

        // Event delegation: klik tab lain di nav = tutup settings
        // Ini lebih robust karena tidak hilang saat React re-render
        document.addEventListener('click', function(e) {
          if (!settingsPanel.classList.contains('active')) return;
          var navBtn = e.target.closest('nav[class*="fixed"][class*="bottom-0"] button');
          if (navBtn && navBtn.id !== 'settings-nav-btn') {
            hideSettings();
          }
        }, true);

        new MutationObserver(function() {
          if (settingsPanel.classList.contains('active')) updateThemeToggle();
        }).observe(html, { attributes: true, attributeFilter: ['class'] });

        updateThemeToggle();
      })();
    

    
    
      (function() {
        // BAS logo embedded as base64 data URI — no CORS issues with html2canvas
        var BAS_LOGO = 'data:image/png;base64,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';

        function enhanceTemplate(templateDiv) {
          if (!templateDiv) return;
          if (templateDiv.dataset.enhanced) return;
          templateDiv.dataset.enhanced = '1';

          // === 1. Inject logo into header ===
          var header = templateDiv.querySelector('.text-center.mb-6');
          if (header) {
            if (!header.querySelector('.bas-logo-injected')) {
              var logoWrap = document.createElement('div');
              logoWrap.className = 'bas-logo-injected';
              logoWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;margin-bottom:10px;';
              var logo = document.createElement('img');
              logo.src = BAS_LOGO;
              logo.style.cssText = 'width:56px;height:56px;border-radius:50%;border:3px solid rgba(255,255,255,0.25);';
              logoWrap.appendChild(logo);
              var h2 = header.querySelector('h2');
              if (h2) header.insertBefore(logoWrap, h2);
            }

            // Tagline below company name
            var pLabel = header.querySelector('p');
            if (pLabel && !header.querySelector('.bas-tagline')) {
              var tagline = document.createElement('div');
              tagline.className = 'bas-tagline';
              tagline.style.cssText = 'color:rgba(199,210,254,0.65);font-size:7px;letter-spacing:0.1em;margin-top:2px;margin-bottom:8px;font-weight:600;';
              tagline.textContent = 'Jasa Pengiriman & Logistik Terpercaya';
              header.insertBefore(tagline, pLabel);
            }
          }

          // === 2. Inject watermark at bottom ===
          var footer = templateDiv.querySelector('.mt-10');
          if (footer && !templateDiv.querySelector('.bas-watermark')) {
            var wm = document.createElement('div');
            wm.className = 'bas-watermark';
            wm.style.cssText = 'text-align:center;padding:8px 32px 12px;font-size:6px;color:#cbd5e1;letter-spacing:0.15em;font-weight:700;';
            wm.textContent = 'DOKUMEN INI DIGENERATE SECARA DIGITAL OLEH SISTEM SUPER-BAS';
            templateDiv.appendChild(wm);
          }
        }

        // Monitor for slip modal and enhance template
        function checkAndEnhance() {
          var modals = document.querySelectorAll('.fixed.inset-0.z-50');
          modals.forEach(function(modal) {
            var hidden = modal.querySelector('.absolute.top-0.left-0.w-full');
            if (!hidden) return;
            var tpl = hidden.querySelector('div[style*="width"]');
            if (tpl) enhanceTemplate(tpl);
          });
        }

        var slipObs = new MutationObserver(checkAndEnhance);
        slipObs.observe(document.body, { childList: true, subtree: true });
      })();
    

    
    
      (function() {
        // White BAS logo on transparent bg (200x28) for dark card
        var BAS_CARD_LOGO = 'data:image/png;base64,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';
        // Expose globally for header logo replacer
        window.__BAS_WHITE_LOGO = BAS_CARD_LOGO;

        // ---- ID card theme: card itself always stays dark via CSS isolation ----
        // (Force-dark-mode removed; page stays in user's chosen theme)

        // ---- Enhance the ID card ----
        function enhanceIdCard() {
          var card = document.getElementById('card-capture-target');
          if (!card || card.dataset.cardEnhanced) return;
          card.dataset.cardEnhanced = '1';

          // 1. Inject original BAS logo in top-left area
          var topBar = card.querySelector('.relative.z-10.w-full.flex.justify-between');
          if (topBar) {
            var leftDiv = topBar.querySelector('.flex.flex-col.items-start');
            if (leftDiv && !leftDiv.querySelector('.bas-card-brand')) {
              var brand = document.createElement('div');
              brand.className = 'bas-card-brand';
              brand.style.cssText = 'display:flex;align-items:center;';
              brand.innerHTML = '<img src="' + BAS_CARD_LOGO + '" style="width:80px;height:auto;object-fit:contain;opacity:0.9;" />';
              leftDiv.appendChild(brand);
            }
          }

          // 2. Hide bottom clutter (SECURE ACCESS TOKEN + dots) via DOM
          var bottomArea = card.querySelector('.absolute.bottom-0.w-full');
          if (bottomArea) {
            bottomArea.style.display = 'none';
          }
        }

        // Combined observer
        var cardObs = new MutationObserver(function() {
          var card = document.getElementById('card-capture-target');
          if (card && !card.dataset.cardEnhanced) enhanceIdCard();
        });
        cardObs.observe(document.body, { childList: true, subtree: true });
      })();
    

    
    
      (function() {
        var LOCAL_LOGO = 'assets/bas-logo.png';
        var DRIVE_PATTERN = 'drive.google.com/thumbnail';

        function replaceLogos() {
          var imgs = document.querySelectorAll('img[src*="' + DRIVE_PATTERN + '"]');
          imgs.forEach(function(img) {
            if (img.src.indexOf(DRIVE_PATTERN) !== -1) {
              img.src = LOCAL_LOGO;
              img.referrerPolicy = '';
            }
          });
        }

        // Replace "BAS" h1 text in header with transparent logo image
        function replaceHeaderBAS() {
          var h1 = document.querySelector('header h1');
          if (!h1 || h1.dataset.basReplaced) return;
          if (h1.textContent.trim() !== 'BAS') return;
          h1.dataset.basReplaced = '1';
          var logo = document.createElement('img');
          logo.className = 'bas-header-logo';
          logo.alt = 'BAS';
          // Use white-on-transparent logo (same as ID card)
          logo.src = window.__BAS_WHITE_LOGO || LOCAL_LOGO;
          h1.textContent = '';
          h1.appendChild(logo);
          h1.style.cssText = 'display:flex !important;align-items:center !important;background:none !important;-webkit-text-fill-color:initial !important;';
        }

        // Inject superbas.svg logo below BAS transparent logo on login page
        function injectSuperbasLogo() {
          // Find the login card area - look for the BAS logo img on the login screen
          var logoImg = document.querySelector('.max-w-sm img[alt="Logo"]');
          if (!logoImg) return;
          var basLogoContainer = logoImg.closest('.w-20, [class*="w-20"]');
          if (!basLogoContainer) basLogoContainer = logoImg.parentElement;
          if (!basLogoContainer) return;
          var parentDiv = basLogoContainer.parentElement;
          if (!parentDiv || parentDiv.querySelector('.superbas-logo-login')) return;
          var superbasImg = document.createElement('img');
          superbasImg.src = 'assets/superbas.svg';
          superbasImg.alt = 'SUPER-BAS';
          superbasImg.className = 'superbas-logo-login';
          // Insert right after the BAS logo container
          basLogoContainer.parentNode.insertBefore(superbasImg, basLogoContainer.nextSibling);
        }

        replaceLogos();
        replaceHeaderBAS();
        injectSuperbasLogo();
        var logoObs = new MutationObserver(function() {
          replaceLogos();
          replaceHeaderBAS();
          injectSuperbasLogo();
          // Force numeric keyboard on login inputs (OPS ID & NIK)
          document.querySelectorAll('.max-w-sm input').forEach(function(inp) {
            if (!inp.dataset.numFixed) {
              inp.inputMode = 'numeric';
              inp.pattern = '[0-9]*';
              inp.dataset.numFixed = '1';
            }
          });
        });
        logoObs.observe(document.body, { childList: true, subtree: true });
      })();
