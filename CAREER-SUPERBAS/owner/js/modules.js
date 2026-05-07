/* Blacklist */
async function loadBlacklist(){
  try{
    const d=await api('candidates.php?project=all&status=Blacklist&limit=100');
    const body=Q('#blacklistBody');
    if(!d.data||!d.data.length){body.innerHTML='<tr><td colspan="5" class="tbl-empty">Tidak ada data blacklist</td></tr>';return;}
    body.innerHTML=d.data.map(r=>`<tr><td style="color:var(--t1)">${esc(r.name)}</td><td>${esc(r.whatsapp)}</td><td><span class="badge badge-${r.project}">${esc(r.project.replace('_',' '))}</span></td><td>${esc(r.korlap_notes||'-')}</td><td>${fmtDate(r.created_at)}</td></tr>`).join('');
  }catch(e){Q('#blacklistBody').innerHTML='<tr><td colspan="5" class="tbl-empty">Gagal memuat</td></tr>';}
}

Q('#blacklistSearch')?.addEventListener('input',debounce(()=>{
  const q=Q('#blacklistSearch').value.toLowerCase();
  QQ('#blacklistBody tr').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none';});
},300));

/* Analytics */
async function loadAnalytics(){
  try{
    const d=await api('stats.php?action=comparison');
    const cards=Q('#comparisonCards');
    cards.innerHTML=['driver','kurir','daily_worker'].map(p=>{
      const c=d[p];const trendIcon=c.trend>=0?'&#9650;':'&#9660;';const trendCls=c.trend>=0?'up':'down';
      return`<div class="stat-card"><div class="stat-label">${p.replace('_',' ')}</div><div class="stat-value">${c.total.toLocaleString('id-ID')}</div><div class="stat-trend ${trendCls}">${trendIcon} ${Math.abs(c.trend)} vs bulan lalu</div><div style="margin-top:8px;font-size:.65rem;color:var(--t3)">Pass rate: ${c.pass_rate}% | Bulan ini: ${c.this_month}</div></div>`;
    }).join('');
    // Comparison chart
    destroyChart('chartComparison');
    chartInstances.chartComparison=new Chart(Q('#chartComparison'),{type:'bar',data:{labels:['Driver','Kurir','Daily Worker'],datasets:[
      {label:'Bulan Ini',data:[d.driver.this_month,d.kurir.this_month,d.daily_worker.this_month],backgroundColor:'#38BDF8',borderRadius:4},
      {label:'Bulan Lalu',data:[d.driver.last_month,d.kurir.last_month,d.daily_worker.last_month],backgroundColor:'rgba(56,189,248,.3)',borderRadius:4}
    ]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#999'},grid:{display:false}},y:{ticks:{color:'#666'},grid:{color:'rgba(255,255,255,.04)'}}},plugins:{legend:{labels:{color:'#999'}}}}});
    // Distribution chart
    destroyChart('chartDistribution');
    chartInstances.chartDistribution=new Chart(Q('#chartDistribution'),{type:'pie',data:{labels:['Driver','Kurir','Daily Worker'],datasets:[{data:[d.driver.total,d.kurir.total,d.daily_worker.total],backgroundColor:['#38BDF8','#FBBF24','#22C55E'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#999',font:{size:11}}}}}});
  }catch(e){toast('Gagal memuat analytics','error');}
}

/* Settings */
async function loadSettings(){
  try{
    const s=await api('settings.php?action=get');
    // Maintenance
    Q('#maintToggle').checked=s.maintenance?.enabled||false;
    Q('#maintMessage').value=s.maintenance?.message||'';
    Q('#maintEstimate').value=s.maintenance?.estimate||'';
    if(s.maintenance?.enabled)Q('#maintBanner').classList.add('show');
    // Landing stats
    Q('#autoCountToggle').checked=s.landing_stats?.auto_count||false;
    Q('#statPelamar').value=s.landing_stats?.total_pelamar||'';
    Q('#statKota').value=s.landing_stats?.kota_aktif||'';
    // Social
    renderSocialFields(s.social_media||[]);
    // FAQ
    renderFaqFields(s.faq||[]);
    // Testimonials
    renderTestiFields(s.testimonials||[]);
    // System info
    Q('#systemInfo').innerHTML=`<div style="font-size:.78rem;color:var(--t2);line-height:2"><div>Version: 1.0.0</div><div>Server Time: ${new Date().toLocaleString('id-ID')}</div><div>Session: Active</div></div>`;
  }catch(e){toast('Gagal memuat settings','error');}
}

function renderSocialFields(items){
  const c=Q('#socialFields');
  c.innerHTML=items.map((s,i)=>`<div class="s-form-group" style="display:flex;gap:8px;align-items:end"><div style="flex:1"><label class="s-form-label">Platform</label><input class="s-input social-platform" value="${esc(s.platform||'')}" data-i="${i}"></div><div style="flex:2"><label class="s-form-label">URL</label><input class="s-input social-url" value="${esc(s.url||'')}" data-i="${i}"></div><div style="flex:1"><label class="s-form-label">Label</label><input class="s-input social-label" value="${esc(s.label||'')}" data-i="${i}"></div></div>`).join('');
}

function renderFaqFields(items){
  const c=Q('#faqFields');
  c.innerHTML=items.map((f,i)=>`<div class="settings-card" style="padding:16px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:.7rem;font-weight:600;color:var(--t3)">FAQ #${i+1}</span><button class="s-btn s-btn--danger" style="padding:4px 10px;font-size:.65rem" onclick="this.closest('.settings-card').remove()">Hapus</button></div><div class="s-form-group"><label class="s-form-label">Pertanyaan</label><input class="s-input faq-q" value="${esc(f.question||'')}"></div><div class="s-form-group" style="margin-bottom:0"><label class="s-form-label">Jawaban</label><textarea class="s-input s-textarea faq-a">${esc(f.answer||'')}</textarea></div></div>`).join('');
}

function renderTestiFields(items){
  const c=Q('#testiFields');
  c.innerHTML=items.map((t,i)=>`<div class="settings-card" style="padding:16px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:.7rem;font-weight:600;color:var(--t3)">Testimoni #${i+1}</span><button class="s-btn s-btn--danger" style="padding:4px 10px;font-size:.65rem" onclick="this.closest('.settings-card').remove()">Hapus</button></div><div class="s-form-group"><label class="s-form-label">Nama</label><input class="s-input testi-name" value="${esc(t.name||'')}"></div><div class="s-form-group"><label class="s-form-label">Role</label><input class="s-input testi-role" value="${esc(t.role||'')}"></div><div class="s-form-group" style="margin-bottom:0"><label class="s-form-label">Testimoni</label><textarea class="s-input s-textarea testi-text">${esc(t.text||'')}</textarea></div></div>`).join('');
}

function initSettingsSave(){
  Q('#saveMaintBtn')?.addEventListener('click',async()=>{try{await api('settings.php?action=maintenance',{method:'POST',body:{enabled:Q('#maintToggle').checked,message:Q('#maintMessage').value,estimate:Q('#maintEstimate').value}});toast('Maintenance disimpan');Q('#maintBanner').classList.toggle('show',Q('#maintToggle').checked);}catch(e){toast('Gagal','error');}});
  Q('#saveLandingBtn')?.addEventListener('click',async()=>{try{await api('settings.php?action=landing_stats',{method:'POST',body:{auto_count:Q('#autoCountToggle').checked,total_pelamar:Q('#statPelamar').value,kota_aktif:Q('#statKota').value}});toast('Landing stats disimpan');}catch(e){toast('Gagal','error');}});
  Q('#saveSocialBtn')?.addEventListener('click',async()=>{const items=[...QQ('.social-platform')].map((el,i)=>({platform:el.value,url:QQ('.social-url')[i].value,label:QQ('.social-label')[i].value}));try{await api('settings.php?action=social_media',{method:'POST',body:{social_media:items}});toast('Social media disimpan');}catch(e){toast('Gagal','error');}});
  Q('#saveFaqBtn')?.addEventListener('click',async()=>{const faq=[...QQ('.faq-q')].map((el,i)=>({question:el.value,answer:QQ('.faq-a')[i].value}));try{await api('settings.php?action=faq',{method:'POST',body:{faq}});toast('FAQ disimpan');}catch(e){toast('Gagal','error');}});
  Q('#addFaqBtn')?.addEventListener('click',()=>{renderFaqFields([...QQ('.faq-q')].map((el,i)=>({question:el.value,answer:QQ('.faq-a')[i].value})).concat({question:'',answer:''}));});
  Q('#saveTestiBtn')?.addEventListener('click',async()=>{const testimonials=[...QQ('.testi-name')].map((el,i)=>({name:el.value,role:QQ('.testi-role')[i].value,text:QQ('.testi-text')[i].value}));try{await api('settings.php?action=testimonials',{method:'POST',body:{testimonials}});toast('Testimonial disimpan');}catch(e){toast('Gagal','error');}});
  Q('#addTestiBtn')?.addEventListener('click',()=>{renderTestiFields([...QQ('.testi-name')].map((el,i)=>({name:el.value,role:QQ('.testi-role')[i].value,text:QQ('.testi-text')[i].value})).concat({name:'',role:'',text:''}));});
}

/* Quick Access */
function renderQuickAccess(){
  Q('#quickAccessGrid').innerHTML=`
  <div class="qa-card"><div class="qa-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Admin Dashboards</div><div class="qa-links">
    <a class="qa-link" href="/driver/admin/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Driver Admin</a>
    <a class="qa-link" href="/kurir/admin/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Kurir Admin</a>
    <a class="qa-link" href="/daily-worker/admin/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Daily Worker Admin</a>
  </div></div>
  <div class="qa-card"><div class="qa-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>Landing Pages</div><div class="qa-links">
    <a class="qa-link" href="/driver/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Driver Portal</a>
    <a class="qa-link" href="/kurir/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Kurir Portal</a>
    <a class="qa-link" href="/daily-worker/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Daily Worker Portal</a>
  </div></div>
  <div class="qa-card"><div class="qa-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Tools</div><div class="qa-links">
    <a class="qa-link" href="/" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Main Website</a>
    <a class="qa-link" href="#" onclick="Q('[data-tab=export]').click();return false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Export Data</a>
    <a class="qa-link" href="#" onclick="Q('[data-tab=settings]').click();return false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Settings</a>
  </div></div>`;
}

/* Export */
function initExport(){
  Q('#exportBtn')?.addEventListener('click',()=>{
    const p=Q('#exportProject').value,f=Q('#exportFrom').value,t=Q('#exportTo').value,s=Q('#exportStatus').value;
    const params=new URLSearchParams({project:p});
    if(f)params.set('from',f);if(t)params.set('to',t);if(s)params.set('status',s);
    window.open(API+'export.php?'+params.toString(),'_blank');
    toast('Export dimulai','info');
  });
}

/* Blacklist add */
function initBlacklist(){
  Q('#addBlacklistBtn')?.addEventListener('click',()=>{
    openModal('Tambah Blacklist',`<div class="s-form-group"><label class="s-form-label">Cari berdasarkan WhatsApp</label><input class="s-input" id="blWa" placeholder="628xxx"></div><div class="s-form-group"><label class="s-form-label">Catatan / Alasan</label><textarea class="s-input s-textarea" id="blNotes"></textarea></div>`,`<button class="s-btn" onclick="closeModal()">Batal</button><button class="s-btn s-btn--primary" onclick="toast('Fitur segera tersedia','info');closeModal()">Simpan</button>`);
  });
}
