      (function() {
        // URL LAMA yang di-hardcode di JS bundle (JANGAN DIUBAH)
        var OLD_API = "https://script.google.com/macros/s/AKfycbyU-XM9W6BurTEPTzjiKOPaKbXG83EOI9oScoZdgtUVL1dj3EvYIMtWQwLeXqG2UeTB/exec";

        // ╔══════════════════════════════════════════════════════════╗
        // ║  GANTI URL DI BAWAH DENGAN URL WEB APP BARU ANDA       ║
        // ║  Setelah deploy Google Apps Script, paste URL-nya disini ║
        // ║  Atau ganti via menu Pengaturan API di owner.html       ║
        // ╚══════════════════════════════════════════════════════════╝
        var DEFAULT_NEW_API = "https://script.google.com/macros/s/AKfycbx52a6N0oZN0jzbbsv_tL0um3XwmgK6fVikQLZyyq_JODNT6fhMhjwY9Eop6BAyNxQ0/exec";
        var NEW_API = localStorage.getItem('bas_api_url') || DEFAULT_NEW_API;
        // Auto-clear stale localStorage URL if it doesn't look valid
        var storedUrl = localStorage.getItem('bas_api_url');
        if(storedUrl && storedUrl.indexOf('script.google.com') === -1) {
          localStorage.removeItem('bas_api_url');
          NEW_API = DEFAULT_NEW_API;
        }

        // ═══════════════════════════════════════════════════════════
        //  FIELD NORMALIZER — Map GAS response fields ke React fields
        //  GAS returns: ops, nama, jabatan, rekening, an, ...
        //  React expects: opsId, name, position, accountNo, ...
        // ═══════════════════════════════════════════════════════════
        var FIELD_MAP = {
          ops: 'opsId', opsId: 'opsId',
          nama: 'name', name: 'name',
          jabatan: 'position', position: 'position', posisi: 'position',
          rekening: 'accountNo', nomorRekening: 'accountNo', accountNo: 'accountNo',
          an: 'accountName', atasNama: 'accountName',
          bank: 'bank', namaBank: 'bank',
          nik: 'nik',
          wa: 'wa', nomorWhatsapp: 'wa',
          status: 'status',
          join: 'joinDate', joinDate: 'joinDate', tanggalBergabung: 'joinDate',
          station: 'station',
          shift: 'shift', shifting: 'shift',
          divisi: 'divisi',
          hubDc: 'hubDc',
          area: 'area'
        };
        function normalizeEmployee(obj) {
          if (!obj || typeof obj !== 'object' || obj.error) return obj;
          var out = {};
          for (var key in obj) {
            if (!obj.hasOwnProperty(key)) continue;
            var mapped = FIELD_MAP[key] || key;
            // Don't overwrite if already set (first match wins)
            if (out[mapped] === undefined) out[mapped] = obj[key];
          }
          // Ensure critical fields exist — React crashes without name
          if (!out.name && out.nama) out.name = out.nama;
          if (!out.opsId && out.ops) out.opsId = out.ops;
          if (!out.accountName && out.atasNama) out.accountName = out.atasNama;
          if (!out.accountName && out.an) out.accountName = out.an;
          if (!out.joinDate && out.join) out.joinDate = out.join;
          if (!out.name) out.name = out.opsId || 'Unknown';
          return out;
        }
        function normalizeResponse(action, data) {
          if (action === 'login') return normalizeEmployee(data);
          if (action === 'getAllEmployees' && Array.isArray(data)) return data.map(normalizeEmployee);
          return data;
        }

        var _originalFetch = window.fetch;

        // ═══════════════════════════════════════════════════════
        //  EMPLOYEE CACHE — Di-declare di IIFE scope supaya persists
        // ═══════════════════════════════════════════════════════════
        var _empCache = null;       // in-memory cache
        var _empCachePromise = null; // ongoing fetch promise

        function _getEmployees() {
          // 1. Return from memory if available
          if (_empCache && _empCache.length > 0) {
            return Promise.resolve(_empCache);
          }
          // 2. Return from sessionStorage if still fresh (10 min TTL)
          try {
              var cached = sessionStorage.getItem('bas_emp_cache');
              var ts = parseInt(sessionStorage.getItem('bas_emp_cache_ts') || '0');
              if (cached && (Date.now() - ts) < 600000) {
                _empCache = JSON.parse(cached);
                if (_empCache && _empCache.length > 0) {
                  console.log('[BAS] Employee cache hit (sessionStorage):', _empCache.length);
                  return Promise.resolve(_empCache);
                }
              }
            } catch(e) {}
            // 3. Fetch from server (reuse existing promise if in-flight)
            if (!_empCachePromise) {
              console.log('[BAS] Fetching employee list (background)...');
              _empCachePromise = _originalFetch.call(window, NEW_API, {
                method: 'POST',
                headers: {'Content-Type':'text/plain;charset=utf-8'},
                body: JSON.stringify({ action: 'getAllEmployees' })
              }).then(function(resp) { return resp.text(); })
              .then(function(text) {
                var arr;
                try { arr = JSON.parse(text); } catch(e) { arr = []; }
                if (!Array.isArray(arr)) arr = [];
                _empCache = arr;
                console.log('[BAS] Employee list loaded:', arr.length, 'records');
                // Save to sessionStorage for next page load
                try {
                  sessionStorage.setItem('bas_emp_cache', text);
                  sessionStorage.setItem('bas_emp_cache_ts', String(Date.now()));
                } catch(e) { /* quota exceeded, ignore */ }
                _empCachePromise = null;
                return arr;
              }).catch(function(err) {
                console.error('[BAS] Failed to pre-fetch employees:', err);
                _empCachePromise = null;
                return [];
              });
            }
            return _empCachePromise;
          }

          // Pre-fetch employee list NOW (saat halaman login load)
          // Data sudah siap di cache saat user selesai ketik credentials
          _getEmployees();

          // ═══════════════════════════════════════════════════════
          //  PAYSLIP SYNC — Field normalization + cache + auto-refresh
          //  Sinkronisasi data gaji dari spreadsheet ke webapp
          // ═══════════════════════════════════════════════════════════
          var _payCache = {};        // { opsId: { data: [], ts: number } }
          var _payFetchPromise = {}; // { opsId: Promise }

          // Map kolom spreadsheet ke field yang dipakai React component
          var PAYSLIP_FIELD_MAP = {
            // Identifikasi
            'ID': 'id', 'Id': 'id', 'slip_id': 'id', 'Slip ID': 'id',
            'No': 'no', 'NO': 'no', 'nomor': 'no', 'Nomor': 'no', 'no_slip': 'no', 'nomer': 'no', 'Nomer': 'no',
            'Periode': 'period', 'PERIODE': 'period', 'periode': 'period', 'bulan': 'period', 'Bulan': 'period', 'Period': 'period',
            'Help': 'help', 'HELP': 'help',
            // Data karyawan
            'Nama': 'nama', 'NAMA': 'nama', 'name': 'nama', 'nama_karyawan': 'nama', 'Nama Karyawan': 'nama', 'nama lengkap': 'nama',
            'OPS': 'ops', 'Ops': 'ops', 'ops_id': 'ops', 'opsId': 'ops', 'OPS ID': 'ops', 'Id Ops': 'ops', 'id_ops': 'ops',
            'Divisi': 'divisi', 'DIVISI': 'divisi', 'department': 'divisi', 'Department': 'divisi', 'dept': 'divisi',
            'Hub DC': 'hubDc', 'HUB DC': 'hubDc', 'hub_dc': 'hubDc', 'Hub': 'hubDc', 'hub': 'hubDc', 'HubDc': 'hubDc', 'hubdc': 'hubDc',
            'Area': 'area', 'AREA': 'area', 'wilayah': 'area', 'Wilayah': 'area',
            'Kota Kab': 'kotaKab', 'kota_kab': 'kotaKab', 'Kota/Kab': 'kotaKab', 'kota': 'kotaKab', 'Kota': 'kotaKab', 'KotaKab': 'kotaKab', 'kotakab': 'kotaKab',
            // Kehadiran & rate
            'HK': 'hk', 'Hk': 'hk', 'hari_kerja': 'hk', 'Hari Kerja': 'hk', 'hariKerja': 'hk',
            'HK Rapel': 'hkRapel', 'hk_rapel': 'hkRapel', 'Hk Rapel': 'hkRapel', 'hkrapel': 'hkRapel', 'HKRapel': 'hkRapel',
            'Rate Perhari': 'ratePerhari', 'rate_perhari': 'ratePerhari', 'Rate': 'ratePerhari', 'rate perhari': 'ratePerhari', 'rateperhari': 'ratePerhari', 'RatePerhari': 'ratePerhari',
            // Pendapatan
            'Gaji': 'gaji', 'GAJI': 'gaji', 'Gaji Pokok': 'gaji', 'gaji_pokok': 'gaji', 'salary': 'gaji', 'basic_pay': 'gaji', 'Salary': 'gaji', 'BasicPay': 'gaji', 'gajiPokok': 'gaji',
            'Rapel': 'rapel', 'RAPEL': 'rapel', 'backpay': 'rapel', 'Back Pay': 'rapel', 'BackPay': 'rapel',
            'Attendance Incentive': 'attendanceIncentive', 'attendance_incentive': 'attendanceIncentive', 'Insentif Kehadiran': 'attendanceIncentive', 'AttendanceIncentive': 'attendanceIncentive', 'insentifKehadiran': 'attendanceIncentive',
            'Campaign Incentive': 'campaignIncentive', 'campaign_incentive': 'campaignIncentive', 'Insentif Campaign': 'campaignIncentive', 'CampaignIncentive': 'campaignIncentive',
            'Incentive Performance Cache': 'incentivePerformanceCache', 'incentive_performance': 'incentivePerformanceCache', 'Performance Inc': 'incentivePerformanceCache', 'IncentivePerformanceCache': 'incentivePerformanceCache', 'incentivePerformance': 'incentivePerformanceCache',
            'Claim': 'claim', 'CLAIM': 'claim', 'Tunjangan': 'claim', 'tunjangan': 'claim',
            // Potongan
            'Pot Pribadi': 'potPribadi', 'pot_pribadi': 'potPribadi', 'Potongan Pribadi': 'potPribadi', 'potongan': 'potPribadi', 'PotPribadi': 'potPribadi', 'potpribadi': 'potPribadi',
            'Asuransi': 'asuransi', 'ASURANSI': 'asuransi', 'Insurance': 'asuransi', 'BPJS': 'asuransi', 'insurance': 'asuransi', 'bpjs': 'asuransi',
            // Total
            'Total Dibayarkan': 'totalDibayarkan', 'total_dibayarkan': 'totalDibayarkan', 'Total': 'totalDibayarkan', 'TOTAL': 'totalDibayarkan',
            'Net Total': 'totalDibayarkan', 'Take Home': 'totalDibayarkan', 'take_home': 'totalDibayarkan', 'TotalDibayarkan': 'totalDibayarkan', 'totaldibayarkan': 'totalDibayarkan', 'takeHome': 'totalDibayarkan', 'net': 'totalDibayarkan',
            // Info pembayaran
            'Done Proses': 'doneProses', 'done_proses': 'doneProses', 'Status Proses': 'doneProses', 'DoneProses': 'doneProses', 'doneproses': 'doneProses',
            'Nomor Rekening': 'nomorRekening', 'nomor_rekening': 'nomorRekening', 'No Rek': 'nomorRekening', 'no_rek': 'nomorRekening', 'Rekening': 'nomorRekening', 'NomorRekening': 'nomorRekening', 'norek': 'nomorRekening',
            'Atas Nama': 'atasNama', 'atas_nama': 'atasNama', 'AN': 'atasNama', 'AtasNama': 'atasNama', 'atasnama': 'atasNama',
            'Nama Bank': 'namaBank', 'nama_bank': 'namaBank', 'Bank': 'namaBank', 'BANK': 'namaBank', 'NamaBank': 'namaBank', 'namabank': 'namaBank',
            'Status': 'status', 'STATUS': 'status',
            'Tanggal Proses': 'tanggalProses', 'tanggal_proses': 'tanggalProses', 'Tgl Proses': 'tanggalProses', 'TanggalProses': 'tanggalProses', 'tglProses': 'tanggalProses',
            // Catatan
            'Note': 'note', 'NOTE': 'note', 'Catatan': 'note', 'catatan': 'note',
            'Bouncing': 'bouncing', 'BOUNCING': 'bouncing',
            'Nominal Invalid': 'nominalInvalid', 'nominal_invalid': 'nominalInvalid', 'NominalInvalid': 'nominalInvalid',
            'Nominal Bouncing': 'nominalBouncing', 'nominal_bouncing': 'nominalBouncing', 'NominalBouncing': 'nominalBouncing',
            'Note Mutia Neng': 'noteMutiaNeng', 'note_mutia_neng': 'noteMutiaNeng', 'NoteMutiaNeng': 'noteMutiaNeng',
            // Metadata
            'DW Event': 'dwEvent', 'dw_event': 'dwEvent', 'Event': 'dwEvent', 'DwEvent': 'dwEvent',
            'UMK': 'umk', 'Umk': 'umk',
            'Area 2': 'area2', 'area_2': 'area2', 'Area2': 'area2',
            'Jadwal Proses': 'jadwalProses', 'jadwal_proses': 'jadwalProses', 'Jadwal': 'jadwalProses', 'JadwalProses': 'jadwalProses',
            'Cash': 'cash', 'CASH': 'cash', 'Metode': 'cash', 'metode_bayar': 'cash', 'MetodeBayar': 'cash'
          };

          // Field numerik yang harus diparsing ke angka
          var PAYSLIP_NUMERIC = [
            'hk', 'hkRapel', 'ratePerhari', 'gaji', 'rapel',
            'attendanceIncentive', 'campaignIncentive', 'incentivePerformanceCache',
            'claim', 'potPribadi', 'asuransi', 'totalDibayarkan',
            'nominalInvalid', 'nominalBouncing', 'umk'
          ];

          function normalizePayslip(obj, idx) {
            if (!obj || typeof obj !== 'object') return obj;
            var out = {};
            for (var key in obj) {
              if (!obj.hasOwnProperty(key)) continue;
              var mapped = PAYSLIP_FIELD_MAP[key] || key;
              if (out[mapped] === undefined) out[mapped] = obj[key];
            }
            // Parse field numerik: "3.600.000" atau "3,600,000" → 3600000
            for (var i = 0; i < PAYSLIP_NUMERIC.length; i++) {
              var field = PAYSLIP_NUMERIC[i];
              if (out[field] !== undefined && typeof out[field] !== 'number') {
                var str = String(out[field]).replace(/\./g, '').replace(/,/g, '');
                var parsed = parseFloat(str.replace(/[^\d.-]/g, ''));
                out[field] = isNaN(parsed) ? 0 : parsed;
              }
              // Default 0 kalau undefined
              if (out[field] === undefined) out[field] = 0;
            }
            // Fallback totalDibayarkan = gaji kalau kosong
            if (!out.totalDibayarkan && out.gaji) {
              out.totalDibayarkan = out.gaji;
            }
            // Pastikan id ada (React butuh id untuk select slip)
            if (!out.id) {
              out.id = 'slip-' + idx + '-' + (out.period || out.no || '') + '-' + Math.random().toString(36).substr(2, 5);
            }
            // Pastikan no ada
            if (!out.no) out.no = String(idx + 1);
            // Default string fields
            if (!out.status) out.status = '-';
            if (!out.nama) out.nama = '';
            if (!out.ops) out.ops = '';
            return out;
          }

          function _getPayslips(opsId) {
            // 1. Memory cache (TTL 5 menit)
            var cached = _payCache[opsId];
            if (cached && cached.data && (Date.now() - cached.ts) < 300000) {
              console.log('[BAS-SYNC] Payslip cache hit:', opsId, '→', cached.data.length, 'slips');
              return Promise.resolve(cached.data);
            }
            // 2. sessionStorage cache (TTL 5 menit)
            try {
              var sKey = 'bas_pay_' + opsId;
              var sTs = parseInt(sessionStorage.getItem(sKey + '_ts') || '0');
              if ((Date.now() - sTs) < 300000) {
                var sData = JSON.parse(sessionStorage.getItem(sKey));
                if (Array.isArray(sData) && sData.length > 0) {
                  _payCache[opsId] = { data: sData, ts: sTs };
                  console.log('[BAS-SYNC] Payslip sessionStorage hit:', opsId, '→', sData.length, 'slips');
                  return Promise.resolve(sData);
                }
              }
            } catch(e) {}
            // 3. Fetch dari server (reuse promise kalau sedang fetch)
            if (!_payFetchPromise[opsId]) {
              console.log('[BAS-SYNC] Fetching payslips for', opsId, '...');
              _payFetchPromise[opsId] = _originalFetch.call(window, NEW_API, {
                method: 'POST',
                headers: {'Content-Type': 'text/plain;charset=utf-8'},
                body: JSON.stringify({ action: 'getPayslips', opsId: opsId })
              }).then(function(resp) { return resp.text(); })
              .then(function(text) {
                var arr;
                try { arr = JSON.parse(text); } catch(e) { arr = []; }
                if (!Array.isArray(arr)) arr = [];
                // Normalize setiap slip
                arr = arr.map(function(slip, idx) { return normalizePayslip(slip, idx); });
                // Simpan ke cache
                var now = Date.now();
                _payCache[opsId] = { data: arr, ts: now };
                try {
                  sessionStorage.setItem('bas_pay_' + opsId, JSON.stringify(arr));
                  sessionStorage.setItem('bas_pay_' + opsId + '_ts', String(now));
                } catch(e) {}
                console.log('[BAS-SYNC] Payslips loaded:', opsId, '→', arr.length, 'records');
                _payFetchPromise[opsId] = null;
                return arr;
              }).catch(function(err) {
                console.error('[BAS-SYNC] Failed to fetch payslips:', err);
                _payFetchPromise[opsId] = null;
                return [];
              });
            }
            return _payFetchPromise[opsId];
          }

          function _refreshPayslipCache() {
            // Hapus semua payslip cache
            _payCache = {};
            _payFetchPromise = {};
            try {
              var keys = [];
              for (var i = 0; i < sessionStorage.length; i++) {
                var k = sessionStorage.key(i);
                if (k && k.indexOf('bas_pay_') === 0) keys.push(k);
              }
              for (var j = 0; j < keys.length; j++) {
                sessionStorage.removeItem(keys[j]);
              }
            } catch(e) {}
            // Re-fetch kalau user sudah login (ambil opsId dari session)
            try {
              var session = localStorage.getItem('bas_session');
              if (session) {
                var decoded = JSON.parse(atob(session));
                var opsId = decoded && decoded.user && (decoded.user.opsId || decoded.user.ops);
                if (opsId) {
                  console.log('[BAS-SYNC] Refreshing payslips for', opsId, '...');
                  _getPayslips(opsId);
                }
              }
            } catch(e) {}
          }

          // ═══════════════════════════════════════════════════════
          //  AUTO-SYNC — Polling 5 menit + Visibility Change
          //  Sinkronisasi employee + payslip data secara otomatis
          // ═══════════════════════════════════════════════════════════

          // Force-invalidate cache & re-fetch silently
          function _refreshEmployeeCache() {
            _empCache = null;
            _empCachePromise = null;
            try {
              sessionStorage.removeItem('bas_emp_cache');
              sessionStorage.removeItem('bas_emp_cache_ts');
            } catch(e) {}
            console.log('[BAS-SYNC] Refreshing employee data...');
            return _getEmployees();
          }

          function _refreshAllCaches() {
            _refreshEmployeeCache();
            _refreshPayslipCache();
          }

          // 1) POLLING — refresh setiap 5 menit di background
          setInterval(function() {
            // Hanya refresh kalau user sudah login (session ada)
            if (localStorage.getItem('bas_session') || localStorage.getItem('bas_owner_auth')) {
              _refreshAllCaches();
            }
          }, 300000); // 5 menit = 300.000 ms

          // 2) VISIBILITY CHANGE — refresh saat user kembali ke tab
          //    Tapi hanya kalau cache sudah > 2 menit (hindari spam)
          document.addEventListener('visibilitychange', function() {
            if (document.hidden) return;
            // Skip kalau belum login
            if (!localStorage.getItem('bas_session') && !localStorage.getItem('bas_owner_auth')) return;
            try {
              var ts = parseInt(sessionStorage.getItem('bas_emp_cache_ts') || '0');
              var age = Date.now() - ts;
              if (age > 120000) { // > 2 menit
                console.log('[BAS-SYNC] Tab active, cache stale (' + Math.round(age/1000) + 's), refreshing all...');
                _refreshAllCaches();
              }
            } catch(e) {
              _refreshAllCaches();
            }
          });
        window.fetch = function(url, options) {
          var urlStr = typeof url === "string" ? url : (url && url.url ? url.url : String(url));

          // Parse action from body for routing
          var bodyAction = '';
          try {
            if (options && options.body) {
              bodyAction = JSON.parse(options.body).action || '';
            }
          } catch(ex) {}

          // Pre-fetch employees on every fetch call (uses cache internally)
          _getEmployees();

          // ═══════════════════════════════════════════════════════
          //  PAYSLIP INTERCEPTOR — Cache + normalize getPayslips
          // ═══════════════════════════════════════════════════════════
          if (bodyAction === 'getPayslips') {
            var payOpsId = '';
            try {
              payOpsId = JSON.parse(options.body).opsId || '';
            } catch(e) {}
            return _getPayslips(payOpsId).then(function(data) {
              return new Response(JSON.stringify(data), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
              });
            });
          }

          // ═══════════════════════════════════════════════════════
          //  LOGIN — Client-side match (instant dari cache)
          //  + loginOwner paralel untuk Owner/Korlap
          // ═══════════════════════════════════════════════════════════
          if (bodyAction === 'login') {
            var oid = '', nk = '';
            try {
              var parsed = JSON.parse(options.body);
              oid = (parsed.opsId || '').trim();
              nk = (parsed.nik || '').trim();
            } catch(ex) {}

            // Demo Account Hook (React fallback preventer)
            if ((oid === '123' || oid === 'OPS123') && nk === '321') {
              console.log('[BAS] ✓ Demo Login bypassed in Interceptor');
              var demoNode = {
                opsId: 'OPS123',
                name: 'Karyawan Demo',
                position: 'Daily Worker',
                status: 'Aktif',
                station: 'Kantor Pusat',
                wa: '081234567890'
              };
              return Promise.resolve(new Response(JSON.stringify(demoNode), {
                  status: 200, headers: {'Content-Type':'application/json'}
              }));
            }

            var oidClean = oid.toUpperCase().replace(/^OPS/i, '').trim();
            console.log('[BAS] Login attempt → opsId:', oid, '(clean:', oidClean, ') | nik:', nk);

            // Jalankan PARALEL: employee match + owner check
            var empPromise = _getEmployees().then(function(allEmps) {
              for (var i = 0; i < allEmps.length; i++) {
                var emp = allEmps[i];
                var empOps = String(emp.ops || emp.opsId || emp.opsid || '').trim().toUpperCase().replace(/^OPS/i, '').trim();
                var empNik = String(emp.nik || '').trim();
                if (empOps === oidClean && empNik === nk) return emp;
              }
              return null;
            });

            var ownerPromise = _originalFetch.call(window, NEW_API, {
              method: 'POST',
              headers: {'Content-Type':'text/plain;charset=utf-8'},
              body: JSON.stringify({ action: 'loginOwner', opsId: oid, nik: nk })
            }).then(function(resp) { return resp.text(); })
            .then(function(text) {
              try { return JSON.parse(text); } catch(e) { return {}; }
            }).catch(function() { return {}; });

            // Tunggu keduanya selesai, resolve yang cocok duluan
            return Promise.all([empPromise, ownerPromise]).then(function(results) {
              var foundEmp = results[0];
              var ownerData = results[1];

              // Priority 1: Employee match
              if (foundEmp) {
                console.log('[BAS] ✓ Employee matched →', foundEmp.nama || foundEmp.name);
                var normalized = normalizeResponse('login', foundEmp);
                return new Response(JSON.stringify(normalized), {
                  status: 200, headers: {'Content-Type':'application/json'}
                });
              }

              // Priority 2: Owner/Korlap
              if (ownerData && ownerData.isOwner === true) {
                var st = (ownerData.status || '').toUpperCase();
                console.log('[BAS] ✓ ' + st + ' login →', ownerData.nama);
                sessionStorage.setItem('bas_owner_auth', 'true');
                sessionStorage.setItem('bas_owner_profile', JSON.stringify({
                  ops: ownerData.ops,
                  nama: ownerData.nama,
                  station: ownerData.station,
                  status: ownerData.status,
                  wa: ownerData.wa
                }));
                window.location.href = 'owner.html';
                return new Promise(function(){});
              }

              // Tidak ditemukan
              console.log('[BAS] ✗ Tidak ditemukan di Employee maupun Owner');
              return new Response(JSON.stringify({error: 'OPS ID atau NIK tidak terdaftar atau salah.'}), {
                status: 200, headers: {'Content-Type':'application/json'}
              });
            }).catch(function(err) {
              console.error('[BAS] Login error:', err);
              return new Response(JSON.stringify({error: 'Koneksi ke server gagal: ' + (err.message || err)}), {
                status: 200, headers: {'Content-Type':'application/json'}
              });
            });
          }

          // Intercept jika URL mengandung OLD_API
          if (urlStr.indexOf(OLD_API) !== -1) {
            var newUrl = urlStr.replace(OLD_API, NEW_API);
            console.log("[BAS-API] " + (bodyAction||'?') + " → redirected to new URL");

            return _originalFetch.call(window, newUrl, options).then(function(resp) {
              console.log("[BAS-API] " + (bodyAction||'?') + " → status " + resp.status);
              // Normalize employee-related responses
              if (bodyAction === 'getAllEmployees') {
                return resp.text().then(function(txt) {
                  var d; try { d = JSON.parse(txt); } catch(e) { d = txt; }
                  var normalized = normalizeResponse(bodyAction, d);
                  return new Response(JSON.stringify(normalized), {
                    status: resp.status,
                    statusText: resp.statusText,
                    headers: {'Content-Type':'application/json'}
                  });
                });
              }
              return resp;
            }).catch(function(err) {
              console.error("[BAS-API] " + (bodyAction||'?') + " → ERROR:", err);
              throw err;
            });
          }

          return _originalFetch.apply(window, arguments);
        };

        // (smartLogin menggabungkan owner + employee check dalam 1 request)
        // Helper functions legacy dihapus — sudah tidak diperlukan

        console.log("[BAS] Fetch interceptor aktif → API dialihkan ke URL baru");
        window.__basInterceptorActive = true;

        // ═══════════════════════════════════════════════════════════
        //  AUTO-FIX: Perbaiki session lama yang corrupt (tanpa field 'name')
        //  React app crash jika user.name undefined
        // ═══════════════════════════════════════════════════════════
        try {
          var session = localStorage.getItem('bas_session');
          if (session) {
            var decoded = JSON.parse(atob(session));
            if (decoded && decoded.user) {
              var u = decoded.user;
              var needsFix = false;
              // Normalize session user fields
              if (!u.name && u.nama) { u.name = u.nama; needsFix = true; }
              if (!u.opsId && u.ops) { u.opsId = u.ops; needsFix = true; }
              if (!u.position && u.jabatan) { u.position = u.jabatan; needsFix = true; }
              if (!u.accountNo && u.rekening) { u.accountNo = u.rekening; needsFix = true; }
              if (!u.accountName && u.atasNama) { u.accountName = u.atasNama; needsFix = true; }
              if (!u.accountName && u.an) { u.accountName = u.an; needsFix = true; }
              if (!u.joinDate && u.join) { u.joinDate = u.join; needsFix = true; }
              if (!u.name) { u.name = u.opsId || u.ops || 'User'; needsFix = true; }
              if (needsFix) {
                decoded.user = u;
                localStorage.setItem('bas_session', btoa(JSON.stringify(decoded)));
                console.log('[BAS] Session diperbaiki: field names dinormalisasi');
              }
            }
          }
        } catch(e) {
          // Session corrupt — hapus saja, user akan login ulang
          localStorage.removeItem('bas_session');
          console.warn('[BAS] Session corrupt, dihapus:', e);
        }

      })();
