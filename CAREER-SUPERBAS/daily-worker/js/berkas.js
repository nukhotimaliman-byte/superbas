/**
 * BAS Daily Worker — Pemberkasan Module
 */
var BK={candidate:null,cid:0,docs:{},rendered:false,sigCtx:null,drawing:false,lx:0,ly:0,sigDone:false};
var BK_DOCS=[
{key:'KTP',db:'KTP',name:'Scan/Foto KTP',req:true},
{key:'PasPhoto',db:'Pas Photo',name:'Pas Photo 3x4',req:true},
{key:'SIM',db:'SIM',name:'SIM',req:true},
{key:'STNK',db:'STNK',name:'STNK',req:true},
{key:'KK',db:'KK',name:'Kartu Keluarga',req:true},
{key:'SKCK',db:'SKCK',name:'SKCK',req:false},
{key:'SuratSehat',db:'Surat Sehat',name:'Surat Sehat',req:false},
{key:'Paklaring',db:'Paklaring',name:'Paklaring',req:false}
];
var BK_BANKS=['BCA','BNI','BRI','Mandiri','BSI','CIMB Niaga','Danamon','Permata','BTN','BTPN','Bank Jago','SeaBank','Lainnya'];
var BK_EDU=['SD','SMP','SMA/SMK','D3','S1'];
var BK_REL=['Suami/Istri','Orang Tua','Anak','Saudara Kandung','Keluarga Lainnya','Teman/Kerabat'];
var BK_WIL='https://www.emsifa.com/api-wilayah-indonesia/api';
var _bkWC={};

function bkF(lbl,inp){return '<div class="bk-field"><label>'+lbl+'</label>'+inp+'</div>';}
function bkRadios(name,opts){return '<div class="bk-radio-group">'+opts.map(function(o){return '<label class="bk-radio"><input type="radio" name="'+name+'" value="'+o+'" onchange="bkUpdate()"><span>'+o+'</span></label>';}).join('')+'</div>';}

function bkHTML(){
var h='<div class="bk-wrap">';
// Progress
h+='<div class="bk-progress"><div class="bk-progress-top"><span>Kelengkapan Pemberkasan</span><span id="bkPct">0%</span></div><div class="bk-progress-bar"><div class="bk-progress-fill" id="bkFill"></div></div></div>';
// Step 1
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">1</div><div class="bk-card-title">Data Diri</div><div class="bk-card-check" id="bkCheck1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="bk-fields">';
h+=bkF('Nama Lengkap','<input class="bk-input" id="bkName" readonly>');
h+='<div class="bk-row">'+bkF('Tempat Lahir','<input class="bk-input" id="bkBirthPlace" placeholder="Jakarta" oninput="bkUpdate()">')+bkF('Tanggal Lahir','<input class="bk-input" type="date" id="bkBirthDate" onchange="bkUpdate()">')+'</div>';
h+='<div class="bk-row">'+bkF('Provinsi','<select class="bk-input" id="bkProv" onchange="bkLoadReg(this.value)"><option value="">— Pilih —</option></select>')+bkF('Kabupaten/Kota','<select class="bk-input" id="bkKab" onchange="bkLoadDist(this.value)" disabled><option value="">— Pilih —</option></select>')+'</div>';
h+='<div class="bk-row">'+bkF('Kecamatan','<select class="bk-input" id="bkKec" onchange="bkLoadVil(this.value)" disabled><option value="">— Pilih —</option></select>')+bkF('Kelurahan','<select class="bk-input" id="bkKel" onchange="bkBuildAddr()" disabled><option value="">— Pilih —</option></select>')+'</div>';
h+=bkF('Detail Alamat <span style="font-weight:400;color:var(--text-secondary)">(RT/RW, Jalan)</span>','<textarea class="bk-input" id="bkAddrDetail" rows="2" placeholder="Jl. Merpati No. 5, RT 01/RW 02" oninput="bkBuildAddr()"></textarea><input type="hidden" id="bkAddr">');
h+=bkF('No. WhatsApp','<input class="bk-input" type="tel" id="bkWA" placeholder="08xxxxxxxxxx" maxlength="15" oninput="bkUpdate()">');
h+=bkF('Pendidikan Terakhir',bkRadios('bk_edu',BK_EDU));
h+=bkF('Pernah Bekerja di SPX?',bkRadios('bk_spx',['Ya','Tidak']));
h+=bkF('Referensi <span style="font-weight:400;color:var(--text-secondary)">(Opsional)</span>','<input class="bk-input" id="bkRef" placeholder="Dari Facebook / Diajak teman" oninput="bkUpdate()">');
// Emergency
h+='<div class="bk-divider"><div class="bk-divider-label">Kontak Darurat</div></div>';
h+='<div class="bk-row">'+bkF('Nama','<input class="bk-input" id="bkEmName" placeholder="Budi Santoso" oninput="bkUpdate()">')+bkF('No. HP','<input class="bk-input" type="tel" id="bkEmPhone" placeholder="08123456789" oninput="bkUpdate()">')+'</div>';
h+=bkF('Hubungan','<select class="bk-input" id="bkEmRel" onchange="bkUpdate()"><option value="">— Pilih —</option>'+BK_REL.map(function(r){return '<option value="'+r+'">'+r+'</option>';}).join('')+'</select>');
h+='</div></div>';

// Step 2
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">2</div><div class="bk-card-title">Berkas & Rekening</div><div class="bk-card-check" id="bkCheck2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div>';
h+='<div class="bk-doc-list">';
BK_DOCS.forEach(function(d){
  h+='<div class="bk-doc-row" id="bkSlot-'+d.key+'"><div class="bk-doc-thumb" id="bkThumb-'+d.key+'"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div><div class="bk-doc-info"><div class="bk-doc-name">'+d.name+(d.req?'':'<span class="bk-doc-opt">Opsional</span>')+'</div><div class="bk-doc-status" id="bkStat-'+d.key+'">Belum upload</div></div><div class="bk-doc-actions"><button class="bk-doc-btn upload" onclick="bkTriggerUpload(\''+d.key+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button><button class="bk-doc-btn camera" onclick="bkCamUpload(\''+d.key+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button></div><input type="file" id="bkFile-'+d.key+'" accept="image/*,.pdf" style="display:none" onchange="bkHandleUpload(\''+d.key+'\',event)"></div>';
});
h+='</div>';

// Bank
h+='<div class="bk-divider"><div class="bk-divider-label">Informasi Rekening</div></div><div class="bk-fields">';
h+='<div class="bk-row">'+bkF('Nama Bank','<input class="bk-input" id="bkBank" placeholder="Contoh: BCA, BRI, BSI" oninput="bkUpdate()">')+bkF('No. Rekening','<input class="bk-input" id="bkBankNo" placeholder="Nomor rekening" inputmode="numeric" oninput="bkUpdate()">')+'</div>';
h+=bkF('Atas Nama','<input class="bk-input" id="bkBankName" placeholder="Sesuai buku tabungan" oninput="bkUpdate()">');
// Surat Sehat & Paklaring status
h+='<div class="bk-row">'+bkF('Surat Keterangan Sehat',bkRadios('bk_sehat',['Ada','Tidak Ada']))+bkF('Paklaring',bkRadios('bk_paklaring',['Ada','Tidak Ada']))+'</div>';
h+='</div>';

// Signature
h+='<div class="bk-divider"><div class="bk-divider-label">Tanda Tangan</div></div>';
h+='<div class="bk-sig-wrap" id="bkSigWrap"><canvas id="bkSigCanvas"></canvas><button class="bk-sig-clear" onclick="bkClearSig()">Hapus</button></div>';
h+='</div>';

// Save
h+='<button class="bk-save" id="bkSaveBtn" onclick="bkSave()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Simpan Data</button>';
h+='</div>';
return h;
}

function renderBerkas(){
  var c=document.getElementById('berkasContent');if(!c)return;
  if(!BK.rendered){BK.rendered=true;c.innerHTML=bkHTML();bkLoadData();}
  bkCalcProgress();
}

// ── Data Loading ──
async function bkLoadData(){
  try{
    var r=await fetch('./api/user-auth.php',{credentials:'same-origin'});
    var u=await r.json();
    if(u&&u.user){
      var r2=await fetch('./api/candidates.php?user_id='+u.user.id);
      var d=await r2.json();
      if(d.candidate){
        BK.candidate=d.candidate;BK.cid=d.candidate.id;
        (d.documents||[]).forEach(function(doc){
          var km={'Pas Photo':'PasPhoto','Surat Sehat':'SuratSehat'};
          var k=km[doc.doc_type]||doc.doc_type;
          BK.docs[doc.doc_type]=doc.file_path;
          bkMarkDoc(k,doc.doc_type,doc.file_path);
        });
        bkFillForm();bkCalcProgress();bkInitSig();bkLoadProv();
        return;
      }
    }
  }catch(e){console.warn('Berkas: API unavailable',e);}
  // Demo
  BK.candidate={name:USER_DATA.nama,whatsapp:'',tempat_lahir:'',tanggal_lahir:''};
  BK.cid=0;
  document.getElementById('bkName').value=USER_DATA.nama;
  bkInitSig();bkLoadProv();
}

function bkFillForm(){
  var c=BK.candidate;if(!c)return;
  var s=function(id,v){var e=document.getElementById(id);if(e&&v)e.value=v;};
  s('bkName',c.name);s('bkBirthPlace',c.tempat_lahir);s('bkBirthDate',c.tanggal_lahir);
  s('bkAddrDetail',c.address);s('bkAddr',c.address);s('bkWA',c.whatsapp);
  s('bkRef',c.referensi);s('bkEmName',c.emergency_name);s('bkEmPhone',c.emergency_phone);
  s('bkBankNo',c.bank_account_no);s('bkBankName',c.bank_account_name);
  // Selects
  var ss=function(id,v){var e=document.getElementById(id);if(!e||!v)return;for(var i=0;i<e.options.length;i++){if(e.options[i].value===v){e.selectedIndex=i;break;}}};
  ss('bkEmRel',c.emergency_relation);s('bkBank',c.bank_name);
  // Radios
  var sr=function(n,v){if(!v)return;var r=document.querySelector('input[name="'+n+'"][value="'+v+'"]');if(r)r.checked=true;};
  sr('bk_edu',c.pendidikan_terakhir);sr('bk_spx',c.pernah_kerja_spx);
  sr('bk_sehat',c.surat_sehat);sr('bk_paklaring',c.paklaring);
}

// ── Wilayah Cascading ──
function bkTC(s){return s.toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});}
async function bkFW(ep){if(_bkWC[ep])return _bkWC[ep];try{var r=await fetch(BK_WIL+'/'+ep);var d=await r.json();_bkWC[ep]=d;return d;}catch(e){return [];}}
function bkPopSel(id,items,ph){var s=document.getElementById(id);s.innerHTML='<option value="">— '+ph+' —</option>'+items.map(function(i){return '<option value="'+i.id+'" data-name="'+i.name+'">'+bkTC(i.name)+'</option>';}).join('');s.disabled=false;}
function bkResSel(id,ph){var s=document.getElementById(id);s.innerHTML='<option value="">— '+ph+' —</option>';s.disabled=true;}
async function bkLoadProv(){var d=await bkFW('provinces.json');bkPopSel('bkProv',d,'Pilih Provinsi');}
async function bkLoadReg(v){bkResSel('bkKab','Pilih Kabupaten');bkResSel('bkKec','Pilih Kecamatan');bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('regencies/'+v+'.json');bkPopSel('bkKab',d,'Pilih Kabupaten');}
async function bkLoadDist(v){bkResSel('bkKec','Pilih Kecamatan');bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('districts/'+v+'.json');bkPopSel('bkKec',d,'Pilih Kecamatan');}
async function bkLoadVil(v){bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('villages/'+v+'.json');bkPopSel('bkKel',d,'Pilih Kelurahan');}
function bkSelName(id){var s=document.getElementById(id);var o=s.options[s.selectedIndex];return o&&o.dataset.name?bkTC(o.dataset.name):'';}
function bkBuildAddr(){var d=document.getElementById('bkAddrDetail').value.trim();var parts=[];if(d)parts.push(d);var k=bkSelName('bkKel');if(k)parts.push('Kel. '+k);var c=bkSelName('bkKec');if(c)parts.push('Kec. '+c);var kb=bkSelName('bkKab');if(kb)parts.push(kb);var p=bkSelName('bkProv');if(p)parts.push(p);document.getElementById('bkAddr').value=parts.join(', ');bkUpdate();}

// ── Document Upload ──
function bkTriggerUpload(k){document.getElementById('bkFile-'+k).click();}
function bkHandleUpload(k,evt){var f=evt.target.files[0];if(!f)return;bkUploadFile(k,f);}
function bkCamUpload(k){if(typeof BASCamera==='undefined'){alert('Kamera tidak tersedia');return;}BASCamera.open(function(dataUrl){var blob=bkDataUrlToBlob(dataUrl);var file=new File([blob],k+'_photo.jpg',{type:'image/jpeg'});bkUploadFile(k,file);});}
function bkDataUrlToBlob(du){var p=du.split(',');var m=p[0].match(/:(.*?);/)[1];var b=atob(p[1]);var a=new Uint8Array(b.length);for(var i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m});}
async function bkUploadFile(k,file){
  var doc=BK_DOCS.find(function(d){return d.key===k;});if(!doc)return;
  if(!BK.cid){bkToast('Candidate ID tidak ditemukan','error');return;}
  var fd=new FormData();fd.append('candidate_id',BK.cid);fd.append('doc_type',doc.db);fd.append('file',file);
  var st=document.getElementById('bkStat-'+k);if(st)st.textContent='Mengupload...';
  try{
    var r=await fetch('./api/documents.php',{method:'POST',body:fd});var d=await r.json();
    if(d.success){BK.docs[doc.db]=d.file;bkMarkDoc(k,doc.db,d.file);bkCalcProgress();bkToast(doc.name+' berhasil diupload','success');}
    else{if(st)st.textContent='Gagal';bkToast(d.error||'Gagal upload','error');}
  }catch(e){if(st)st.textContent='Error';bkToast('Koneksi gagal','error');}
}
function bkMarkDoc(k,db,fp){
  var sl=document.getElementById('bkSlot-'+k);var st=document.getElementById('bkStat-'+k);var th=document.getElementById('bkThumb-'+k);
  if(st){st.textContent='Tersimpan';st.classList.add('done');}
  if(th&&fp){var ext=fp.split('.').pop().toLowerCase();if(['jpg','jpeg','png'].indexOf(ext)>=0)th.innerHTML='<img src="./uploads/'+fp+'?t='+Date.now()+'">';}
}

// ── Signature ──
function bkInitSig(){
  var cv=document.getElementById('bkSigCanvas');if(!cv)return;
  var wrap=document.getElementById('bkSigWrap');
  var dpr=window.devicePixelRatio||1;
  var w=wrap.offsetWidth;var h=150;
  cv.width=w*dpr;cv.height=h*dpr;
  cv.style.width=w+'px';cv.style.height=h+'px';
  BK.sigCtx=cv.getContext('2d');
  BK.sigCtx.scale(dpr,dpr);
  BK.sigCtx.strokeStyle='#1e293b';BK.sigCtx.lineWidth=2.5;BK.sigCtx.lineCap='round';BK.sigCtx.lineJoin='round';
  function getPos(e){var r=cv.getBoundingClientRect();var cx,cy;if(e.touches){cx=e.touches[0].clientX;cy=e.touches[0].clientY;}else{cx=e.clientX;cy=e.clientY;}return{x:cx-r.left,y:cy-r.top};}
  function onDown(e){e.preventDefault();BK.drawing=true;var p=getPos(e);BK.lx=p.x;BK.ly=p.y;BK.sigCtx.beginPath();BK.sigCtx.moveTo(p.x,p.y);}
  function onMove(e){if(!BK.drawing)return;e.preventDefault();var p=getPos(e);BK.sigCtx.lineTo(p.x,p.y);BK.sigCtx.stroke();BK.sigCtx.beginPath();BK.sigCtx.moveTo(p.x,p.y);BK.lx=p.x;BK.ly=p.y;BK.sigDone=true;}
  function onUp(){BK.drawing=false;bkUpdate();}
  cv.addEventListener('mousedown',onDown);cv.addEventListener('mousemove',onMove);cv.addEventListener('mouseup',onUp);cv.addEventListener('mouseleave',onUp);
  cv.addEventListener('touchstart',onDown,{passive:false});cv.addEventListener('touchmove',onMove,{passive:false});cv.addEventListener('touchend',onUp);
}
function bkClearSig(){var cv=document.getElementById('bkSigCanvas');if(cv&&BK.sigCtx){BK.sigCtx.clearRect(0,0,cv.width,cv.height);BK.sigDone=false;bkUpdate();}}

// ── Progress (required only) ──
function bkCalcProgress(){
  var t=0,f=0;
  var v=function(id){return(document.getElementById(id)||{}).value||'';};
  var rv=function(n){var r=document.querySelector('input[name="'+n+'"]:checked');return r?r.value:'';};
  // Data fields (13 required)
  var fields=[v('bkBirthPlace'),v('bkBirthDate'),v('bkAddr'),v('bkWA'),rv('bk_edu'),rv('bk_spx'),v('bkEmName'),v('bkEmPhone'),v('bkEmRel'),v('bkBank'),v('bkBankNo'),v('bkBankName')];
  t+=fields.length;fields.forEach(function(x){if(x)f++;});
  // Signature
  t++;if(BK.sigDone||(BK.candidate&&BK.candidate.signature_data))f++;
  // Required docs (5)
  var reqDocs=['KTP','Pas Photo','SIM','STNK','KK'];
  t+=reqDocs.length;reqDocs.forEach(function(k){if(BK.docs[k])f++;});
  var pct=t>0?Math.round(f/t*100):0;
  var fill=document.getElementById('bkFill');var pe=document.getElementById('bkPct');
  if(fill)fill.style.width=pct+'%';if(pe)pe.textContent=pct+'%';
  // Check icons
  var c1=document.getElementById('bkCheck1');var c2=document.getElementById('bkCheck2');
  var d1=!!(v('bkBirthPlace')&&v('bkBirthDate')&&v('bkAddr')&&v('bkWA')&&rv('bk_edu')&&rv('bk_spx')&&v('bkEmName')&&v('bkEmPhone')&&v('bkEmRel'));
  var d2=reqDocs.every(function(k){return BK.docs[k];})&&v('bkBank')&&v('bkBankNo')&&v('bkBankName');
  if(c1)c1.classList.toggle('done',d1);if(c2)c2.classList.toggle('done',d2);
}
function bkUpdate(){bkCalcProgress();}

// ── Save ──
async function bkSave(){
  if(!BK.cid){bkToast('Data belum terhubung ke server','error');return;}
  var v=function(id){return(document.getElementById(id)||{}).value||'';};
  var rv=function(n){var r=document.querySelector('input[name="'+n+'"]:checked');return r?r.value:'';};
  var btn=document.getElementById('bkSaveBtn');if(btn){btn.disabled=true;btn.innerHTML='Menyimpan...';}
  var sigCanvas=document.getElementById('bkSigCanvas');
  var sigData=sigCanvas?sigCanvas.toDataURL('image/png'):null;
  try{
    var r=await fetch('./api/candidates.php',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'submit_pemberkasan',candidate_id:BK.cid,
        birth_place:v('bkBirthPlace'),birth_date:v('bkBirthDate'),
        address:v('bkAddr'),provinsi:bkSelName('bkProv'),kabupaten:bkSelName('bkKab'),kecamatan:bkSelName('bkKec'),kelurahan:bkSelName('bkKel'),
        whatsapp:v('bkWA'),last_education:rv('bk_edu'),worked_at_spx:rv('bk_spx'),
        surat_sehat_status:rv('bk_sehat'),paklaring_status:rv('bk_paklaring'),
        referensi:v('bkRef'),emergency_name:v('bkEmName'),emergency_phone:v('bkEmPhone'),emergency_relation:v('bkEmRel'),
        bank_name:v('bkBank'),bank_account_no:v('bkBankNo'),bank_account_name:v('bkBankName'),
        signature_data:(sigData&&sigData.length>5000)?sigData:null
      })});
    var d=await r.json();
    if(d.success){bkToast('Data berhasil disimpan!','success');}
    else{bkToast(d.error||'Gagal menyimpan','error');}
  }catch(e){bkToast('Koneksi gagal','error');}
  if(btn){btn.disabled=false;btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Simpan Data';}
}

// ── Toast ──
function bkToast(msg,type){var d=document.createElement('div');d.className='bk-toast '+(type||'');d.textContent=msg;document.body.appendChild(d);setTimeout(function(){d.remove();},3000);}
