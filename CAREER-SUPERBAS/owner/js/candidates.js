let candState={project:'all',status:'',search:'',city:'',page:1,limit:50,sort:'created_at',order:'DESC'};

function initCandidates(){
  Q('#candidateSubTabs').addEventListener('click',e=>{const b=e.target.closest('.sub-tab');if(!b)return;QQ('.sub-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');candState.project=b.dataset.project;candState.page=1;loadCandidates();});
  Q('#candidateSearch').addEventListener('input',debounce(()=>{candState.search=Q('#candidateSearch').value.trim();candState.page=1;loadCandidates();},400));
  Q('#candidateStatus').addEventListener('change',()=>{candState.status=Q('#candidateStatus').value;candState.page=1;loadCandidates();});
  Q('#candidateCity').addEventListener('change',()=>{candState.city=Q('#candidateCity').value;candState.page=1;loadCandidates();});
  loadCityFilter();
}

function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

async function loadCityFilter(){
  try{const d=await api('candidates.php?action=locations');const sel=Q('#candidateCity');(d.cities||[]).forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;sel.appendChild(o);});}catch(e){}
}

async function loadCandidates(){
  const s=candState;
  const params=`?project=${s.project}&status=${encodeURIComponent(s.status)}&search=${encodeURIComponent(s.search)}&city=${encodeURIComponent(s.city)}&page=${s.page}&limit=${s.limit}&sort=${s.sort}&order=${s.order}`;
  try{
    const d=await api('candidates.php'+params);
    const head=Q('#candidateHead');
    head.innerHTML='<th>Project</th><th>Nama</th><th>WhatsApp</th><th>Kota</th><th>Status</th><th>Tgl Daftar</th><th>Aksi</th>';
    head.querySelectorAll('th').forEach(th=>{
      const col=th.textContent.toLowerCase();
      const sortMap={nama:'name',whatsapp:'whatsapp','tgl daftar':'created_at',status:'status'};
      if(sortMap[col]){th.style.cursor='pointer';th.addEventListener('click',()=>{const f=sortMap[col];if(s.sort===f)s.order=s.order==='DESC'?'ASC':'DESC';else{s.sort=f;s.order='ASC';}loadCandidates();});}
    });
    const body=Q('#candidateBody');
    if(!d.data||!d.data.length){body.innerHTML='<tr><td colspan="7" class="tbl-empty">Tidak ada data</td></tr>';Q('#candidateInfo').textContent='';Q('#candidatePages').innerHTML='';return;}
    body.innerHTML=d.data.map(r=>`<tr>
      <td><span class="badge badge-${r.project}">${esc(r.project.replace('_',' '))}</span></td>
      <td style="color:var(--t1);font-weight:500">${esc(r.name)}</td>
      <td>${esc(r.whatsapp)}</td>
      <td>${esc(r.city)}</td>
      <td><span class="${badge(r.status)}">${esc(r.status)}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td><button class="act-btn" onclick="viewCandidate('${r.project}',${r.id})" title="Detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
    </tr>`).join('');
    Q('#candidateInfo').textContent=`${d.total} kandidat — Hal ${d.page}/${d.pages}`;
    renderPages(d.page,d.pages);
  }catch(e){console.error(e);Q('#candidateBody').innerHTML='<tr><td colspan="7" class="tbl-empty">Gagal memuat data</td></tr>';}
}

function renderPages(cur,total){
  const c=Q('#candidatePages');c.innerHTML='';
  if(total<=1)return;
  const add=(label,pg,disabled=false,active=false)=>{const b=document.createElement('button');b.className='page-btn'+(active?' active':'');b.textContent=label;b.disabled=disabled;if(!disabled&&!active)b.addEventListener('click',()=>{candState.page=pg;loadCandidates();});c.appendChild(b);};
  add('<',cur-1,cur<=1);
  let start=Math.max(1,cur-2),end=Math.min(total,cur+2);
  for(let i=start;i<=end;i++)add(i,i,false,i===cur);
  add('>',cur+1,cur>=total);
}

async function viewCandidate(project,id){
  try{
    const d=await api(`candidates.php?action=detail&project=${project}&id=${id}`);
    const fields=['name','whatsapp','address','city','status','korlap_notes','created_at'];
    const labels={name:'Nama',whatsapp:'WhatsApp',address:'Alamat',city:'Kota',status:'Status',korlap_notes:'Catatan Korlap',created_at:'Tgl Daftar'};
    let html='<div style="display:grid;gap:12px">';
    fields.forEach(f=>{let v=d[f]||'-';if(f==='created_at')v=fmtDate(v);if(f==='status')v=`<span class="${badge(v)}">${esc(v)}</span>`;else v=esc(v);html+=`<div><div class="s-form-label">${labels[f]}</div><div style="font-size:.82rem;color:var(--t1)">${v}</div></div>`;});
    html+='<div class="s-form-group"><label class="s-form-label">Update Status</label><select class="s-input" id="modalStatus" style="max-width:200px"><option value="Baru">Baru</option><option value="Proses">Proses</option><option value="Interview">Interview</option><option value="Lulus">Lulus</option><option value="Tidak Lulus">Tidak Lulus</option><option value="Blacklist">Blacklist</option></select></div>';
    html+='<div class="s-form-group"><label class="s-form-label">Catatan</label><textarea class="s-input s-textarea" id="modalNotes">'+(esc(d.korlap_notes||''))+'</textarea></div></div>';
    const footer=`<button class="s-btn" onclick="closeModal()">Tutup</button><button class="s-btn s-btn--primary" onclick="saveCandidate('${project}',${id})">Simpan</button>`;
    openModal('Detail — '+d.name,html,footer);
    Q('#modalStatus').value=d.status||'Baru';
  }catch(e){toast('Gagal memuat detail','error');}
}

async function saveCandidate(project,id){
  try{
    const status=Q('#modalStatus').value,notes=Q('#modalNotes').value;
    await api('candidates.php?action=update_status',{method:'PUT',body:{id,project,status}});
    await api('candidates.php?action=update_notes',{method:'PUT',body:{id,project,notes}});
    toast('Data disimpan');closeModal();loadCandidates();
  }catch(e){toast('Gagal menyimpan','error');}
}
