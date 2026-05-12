/**
 * BAS Daily Worker — Pemberkasan Module
 */
var BK={candidate:null,cid:0,docs:{},rendered:false,sigCtx:null,drawing:false,lx:0,ly:0,sigDone:false,userInfo:{},addrLocked:false};
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

// Step 1 — Identitas
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">1</div><div class="bk-card-title">Identitas</div><div class="bk-card-check" id="bkCheck1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="bk-fields">';
h+=bkF('Nama Lengkap','<input class="bk-input" id="bkName" readonly>');
h+=bkF('NIK <span style="font-weight:400;color:var(--text-secondary)">(16 digit)</span>','<input class="bk-input" id="bkNIK" placeholder="Nomor Induk Kependudukan" maxlength="16" inputmode="numeric" oninput="bkUpdate()">');
h+=bkF('Email','<input class="bk-input" type="email" id="bkEmail" placeholder="email@contoh.com" oninput="bkUpdate()">');
h+=bkF('No. WhatsApp','<input class="bk-input" type="tel" id="bkWA" placeholder="08xxxxxxxxxx" maxlength="15" oninput="bkUpdate()">');
h+='<div class="bk-divider"><div class="bk-divider-label">Alamat Domisili</div></div>';
h+='<div class="bk-row">'+bkF('Provinsi','<select class="bk-input" id="bkProv" onchange="bkLoadReg(this.value)"><option value="">— Pilih —</option></select>')+bkF('Kabupaten/Kota','<select class="bk-input" id="bkKab" onchange="bkLoadDist(this.value)" disabled><option value="">— Pilih —</option></select>')+'</div>';
h+='<div class="bk-row">'+bkF('Kecamatan','<select class="bk-input" id="bkKec" onchange="bkLoadVil(this.value)" disabled><option value="">— Pilih —</option></select>')+bkF('Kelurahan','<select class="bk-input" id="bkKel" onchange="bkBuildAddr()" disabled><option value="">— Pilih —</option></select>')+'</div>';
h+=bkF('Detail Alamat <span style="font-weight:400;color:var(--text-secondary)">(RT/RW, Jalan)</span>','<textarea class="bk-input" id="bkAddrDetail" rows="2" placeholder="Jl. Merpati No. 5, RT 01/RW 02" oninput="bkBuildAddr()"></textarea><input type="hidden" id="bkAddr">');
h+='</div></div>';

// Step 2 — Data Pribadi
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">2</div><div class="bk-card-title">Data Pribadi</div><div class="bk-card-check" id="bkCheck2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="bk-fields">';
h+='<div class="bk-row">'+bkF('Tempat Lahir','<input class="bk-input" id="bkBirthPlace" placeholder="Jakarta" oninput="bkUpdate()">')+bkF('Tanggal Lahir','<input class="bk-input" type="date" id="bkBirthDate" onchange="bkUpdate()">')+'</div>';
h+='<div class="bk-row"><div class="bk-field"><label>Pendidikan Terakhir</label>'+bkRadios('bk_edu',BK_EDU)+'</div><div class="bk-field"><label>Pernah Bekerja di SPX?</label>'+bkRadios('bk_spx',['Ya','Tidak'])+'</div></div>';
h+=bkF('Referensi <span style="font-weight:400;color:var(--text-secondary)">(Opsional)</span>','<input class="bk-input" id="bkRef" placeholder="Dari Facebook / Diajak teman" oninput="bkUpdate()">');
h+='</div></div>';

// Step 3 — Kontak Darurat
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">3</div><div class="bk-card-title">Kontak Darurat</div><div class="bk-card-check" id="bkCheck3"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="bk-fields">';
h+='<div class="bk-row">'+bkF('Nama','<input class="bk-input" id="bkEmName" placeholder="Budi Santoso" oninput="bkUpdate()">')+bkF('No. HP','<input class="bk-input" type="tel" id="bkEmPhone" placeholder="08123456789" oninput="bkUpdate()">')+'</div>';
h+=bkF('Hubungan','<select class="bk-input" id="bkEmRel" onchange="bkUpdate()"><option value="">— Pilih —</option>'+BK_REL.map(function(r){return '<option value="'+r+'">'+r+'</option>';}).join('')+'</select>');
h+='</div></div>';

// Step 4 — Berkas
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">4</div><div class="bk-card-title">Upload Berkas</div><div class="bk-card-check" id="bkCheck4"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div>';
h+='<div class="bk-doc-list">';
BK_DOCS.forEach(function(d){
  h+='<div class="bk-doc-row" id="bkSlot-'+d.key+'"><div class="bk-doc-thumb" id="bkThumb-'+d.key+'"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div><div class="bk-doc-info"><div class="bk-doc-name">'+d.name+(d.req?'':'<span class="bk-doc-opt">Opsional</span>')+'</div><div class="bk-doc-status" id="bkStat-'+d.key+'">Belum upload</div></div><div class="bk-doc-actions"><button class="bk-doc-btn upload" onclick="bkTriggerUpload(\''+d.key+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button><button class="bk-doc-btn camera" onclick="bkCamUpload(\''+d.key+'\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button></div><input type="file" id="bkFile-'+d.key+'" accept="image/*,.pdf" style="display:none" onchange="bkHandleUpload(\''+d.key+'\',event)"></div>';
});
h+='</div></div>';

// Step 5 — Rekening
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">5</div><div class="bk-card-title">Rekening Bank</div><div class="bk-card-check" id="bkCheck5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div></div><div class="bk-fields">';
h+='<div class="bk-row">'+bkF('Nama Bank','<input class="bk-input" id="bkBank" placeholder="Contoh: BCA, BRI, BSI" oninput="bkUpdate()">')+bkF('No. Rekening','<input class="bk-input" id="bkBankNo" placeholder="Nomor rekening" inputmode="numeric" oninput="bkUpdate()">')+'</div>';
h+=bkF('Atas Nama','<input class="bk-input" id="bkBankName" placeholder="Sesuai buku tabungan" oninput="bkUpdate()">');
h+='</div></div>';

// Step 6 — TTD
h+='<div class="bk-card"><div class="bk-card-head"><div class="bk-card-num">6</div><div class="bk-card-title">Tanda Tangan</div></div>';
h+='<div class="bk-sig-wrap" id="bkSigWrap"><canvas id="bkSigCanvas"></canvas><button class="bk-sig-clear" onclick="bkClearSig()">Hapus</button></div></div>';

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
    var r=await fetch('./api/user-auth.php?action=check',{credentials:'same-origin'});
    var u=await r.json();
    if(u&&u.user){
      var r2=await fetch('./api/candidates.php?user_id='+u.user.id);
      var d=await r2.json();
      if(d.candidate){
        BK.candidate=d.candidate;BK.cid=d.candidate.id;
        BK.userInfo=d.user||{};
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
  BK.candidate={name:USER_DATA.nama,whatsapp:'',tempat_lahir:'',tanggal_lahir:''};
  BK.cid=0;BK.userInfo={};
  document.getElementById('bkName').value=USER_DATA.nama;
  bkInitSig();bkLoadProv();
}

function bkLock(id){
  var el=document.getElementById(id);if(!el)return;
  var wrap=el.closest('.bk-field');if(wrap)wrap.classList.add('bk-locked');
  el.readOnly=true;
  if(el.tagName==='SELECT'){el.style.pointerEvents='none';}
  var lbl=wrap?wrap.querySelector('label'):null;
  if(lbl&&!lbl.querySelector('.bk-source')){
    lbl.insertAdjacentHTML('beforeend','<span class="bk-source" title="Dari Pendaftaran"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>');
  }
}
function bkFillAndLock(id,val){
  var el=document.getElementById(id);if(!el||!val)return false;
  el.value=val;bkLock(id);return true;
}
function bkFillForm(){
  var c=BK.candidate;if(!c)return;
  var u=BK.userInfo||{};
  var s=function(id,v){var e=document.getElementById(id);if(e&&v)e.value=v;};
  // Nama — always lock
  s('bkName',c.name);bkLock('bkName');
  // NIK — lock if exists (from user table or candidate)
  var nik=u.nik||c.nik||'';
  if(nik){bkFillAndLock('bkNIK',nik);}
  // Email — lock if exists
  var email=u.email||'';
  if(email){bkFillAndLock('bkEmail',email);}
  // WhatsApp — lock if from registration
  var wa=c.whatsapp||u.phone||'';
  if(wa){bkFillAndLock('bkWA',wa);}
  // Birth
  s('bkBirthPlace',c.tempat_lahir);s('bkBirthDate',c.tanggal_lahir);
  // Address — fallback: candidate → user table (registration data)
  var addr=c.address||u.address||'';
  if(addr){s('bkAddrDetail',addr);s('bkAddr',addr);}
  var prov=c.provinsi||u.provinsi||'';
  var kab=c.kabupaten||u.kabupaten||'';
  var kec=c.kecamatan||u.kecamatan||'';
  var kel=c.kelurahan||u.kelurahan||'';
  BK.savedAddr={provinsi:prov,kabupaten:kab,kecamatan:kec,kelurahan:kel};
  // Lock ONLY for non-Google users who have address data
  var isGoogle=!!(u.google_id);
  if(prov&&kab&&!isGoogle){BK.addrLocked=true;}
  // Other fields
  s('bkRef',c.referensi);s('bkEmName',c.emergency_name);s('bkEmPhone',c.emergency_phone);
  s('bkBankNo',c.bank_account_no);s('bkBankName',c.bank_account_name);
  var ss=function(id,v){var e=document.getElementById(id);if(!e||!v)return;for(var i=0;i<e.options.length;i++){if(e.options[i].value===v){e.selectedIndex=i;break;}}};
  ss('bkEmRel',c.emergency_relation);s('bkBank',c.bank_name);
  var sr=function(n,v){if(!v)return;var r=document.querySelector('input[name="'+n+'"][value="'+v+'"]');if(r)r.checked=true;};
  sr('bk_edu',c.pendidikan_terakhir);sr('bk_spx',c.pernah_kerja_spx);
  sr('bk_sehat',c.surat_sehat);sr('bk_paklaring',c.paklaring);
}

// ── Wilayah Cascading ──
function bkTC(s){return s.toLowerCase().replace(/\b\w/g,function(c){return c.toUpperCase();});}
async function bkFW(ep){if(_bkWC[ep])return _bkWC[ep];try{var r=await fetch(BK_WIL+'/'+ep);var d=await r.json();_bkWC[ep]=d;return d;}catch(e){return [];}}
function bkPopSel(id,items,ph){var s=document.getElementById(id);s.innerHTML='<option value="">— '+ph+' —</option>'+items.map(function(i){return '<option value="'+i.id+'" data-name="'+i.name+'">'+bkTC(i.name)+'</option>';}).join('');s.disabled=false;}
function bkResSel(id,ph){var s=document.getElementById(id);s.innerHTML='<option value="">— '+ph+' —</option>';s.disabled=true;}
async function bkLoadProv(){
  var d=await bkFW('provinces.json');bkPopSel('bkProv',d,'Pilih Provinsi');
  // Auto-select saved address (from candidate OR user registration data)
  var sa=BK.savedAddr||{};
  if(sa.provinsi){
    var provId=bkFindByName('bkProv',sa.provinsi);
    if(provId){
      document.getElementById('bkProv').value=provId;
      var kabs=await bkFW('regencies/'+provId+'.json');bkPopSel('bkKab',kabs,'Pilih Kabupaten');
      if(sa.kabupaten){
        var kabId=bkFindByName('bkKab',sa.kabupaten);
        if(kabId){
          document.getElementById('bkKab').value=kabId;
          var kecs=await bkFW('districts/'+kabId+'.json');bkPopSel('bkKec',kecs,'Pilih Kecamatan');
          if(sa.kecamatan){
            var kecId=bkFindByName('bkKec',sa.kecamatan);
            if(kecId){
              document.getElementById('bkKec').value=kecId;
              var kels=await bkFW('villages/'+kecId+'.json');bkPopSel('bkKel',kels,'Pilih Kelurahan');
              if(sa.kelurahan){bkFindByName('bkKel',sa.kelurahan);}
            }
          }
        }
      }
    }
    bkBuildAddr();
    if(BK.addrLocked){bkLockAddr();}
  }
}
function bkFindByName(selId,name){
  if(!name)return null;
  var sel=document.getElementById(selId);if(!sel)return null;
  var nm=name.toUpperCase();
  for(var i=0;i<sel.options.length;i++){
    var opt=sel.options[i];
    if(opt.dataset.name&&opt.dataset.name.toUpperCase()===nm){sel.selectedIndex=i;return opt.value;}
  }
  return null;
}
function bkLockAddr(){
  ['bkProv','bkKab','bkKec','bkKel'].forEach(function(id){bkLock(id);});
  bkLock('bkAddrDetail');
}
async function bkLoadReg(v){bkResSel('bkKab','Pilih Kabupaten');bkResSel('bkKec','Pilih Kecamatan');bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('regencies/'+v+'.json');bkPopSel('bkKab',d,'Pilih Kabupaten');}
async function bkLoadDist(v){bkResSel('bkKec','Pilih Kecamatan');bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('districts/'+v+'.json');bkPopSel('bkKec',d,'Pilih Kecamatan');}
async function bkLoadVil(v){bkResSel('bkKel','Pilih Kelurahan');bkBuildAddr();if(!v)return;var d=await bkFW('villages/'+v+'.json');bkPopSel('bkKel',d,'Pilih Kelurahan');}
function bkSelName(id){var s=document.getElementById(id);var o=s.options[s.selectedIndex];return o&&o.dataset.name?bkTC(o.dataset.name):'';}
function bkBuildAddr(){var d=document.getElementById('bkAddrDetail').value.trim();var parts=[];if(d)parts.push(d);var k=bkSelName('bkKel');if(k)parts.push('Kel. '+k);var c=bkSelName('bkKec');if(c)parts.push('Kec. '+c);var kb=bkSelName('bkKab');if(kb)parts.push(kb);var p=bkSelName('bkProv');if(p)parts.push(p);document.getElementById('bkAddr').value=parts.join(', ');bkUpdate();}

// ── Document Upload ──
function bkTriggerUpload(k){document.getElementById('bkFile-'+k).click();}
function bkHandleUpload(k,evt){var f=evt.target.files[0];if(!f)return;bkCompressAndUpload(k,f);}

// ── Auto Compress if image > 1MB ──
function bkCompressAndUpload(k, file) {
  var maxSize = 1 * 1024 * 1024; // 1MB target
  var ext = file.name.split('.').pop().toLowerCase();
  // Only compress images, not PDF
  if (['jpg','jpeg','png'].indexOf(ext) < 0 || file.size <= maxSize) {
    bkUploadFile(k, file);
    return;
  }
  var st = document.getElementById('bkStat-' + k);
  if (st) st.textContent = 'Mengompres...';
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxDim = 1920;
      var w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        var ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // Find quality that gets us under maxSize
      var quality = 0.85;
      var blob;
      (function tryCompress() {
        canvas.toBlob(function(b) {
          if (b.size > maxSize && quality > 0.3) {
            quality -= 0.1;
            tryCompress();
          } else {
            var origKB = Math.round(file.size / 1024);
            var newKB = Math.round(b.size / 1024);
            console.info('[BAS] Compressed ' + origKB + 'KB → ' + newKB + 'KB (q=' + quality.toFixed(2) + ')');
            var compressed = new File([b], file.name, { type: 'image/jpeg' });
            bkUploadFile(k, compressed);
          }
        }, 'image/jpeg', quality);
      })();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function bkCamUpload(k){if(typeof BASCamera==='undefined'){alert('Kamera tidak tersedia');return;}BASCamera.open(function(dataUrl){var blob=bkDataUrlToBlob(dataUrl);var file=new File([blob],k+'_photo.jpg',{type:'image/jpeg'});bkCompressAndUpload(k,file);});}
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
  // Step 1: Identitas + Alamat (4)
  var f1=[v('bkNIK'),v('bkEmail'),v('bkWA'),v('bkAddr')];
  t+=f1.length;f1.forEach(function(x){if(x)f++;});
  // Step 2: Data Pribadi (4 required)
  var f2=[v('bkBirthPlace'),v('bkBirthDate'),rv('bk_edu'),rv('bk_spx')];
  t+=f2.length;f2.forEach(function(x){if(x)f++;});
  // Step 3: Kontak Darurat (3)
  var f3=[v('bkEmName'),v('bkEmPhone'),v('bkEmRel')];
  t+=f3.length;f3.forEach(function(x){if(x)f++;});
  // Step 4: Required docs (5)
  var reqDocs=['KTP','Pas Photo','SIM','STNK','KK'];
  t+=reqDocs.length;reqDocs.forEach(function(k){if(BK.docs[k])f++;});
  // Step 5: Rekening (3)
  var f5=[v('bkBank'),v('bkBankNo'),v('bkBankName')];
  t+=f5.length;f5.forEach(function(x){if(x)f++;});
  // Step 6: Signature
  t++;if(BK.sigDone||(BK.candidate&&BK.candidate.signature_data))f++;
  var pct=t>0?Math.round(f/t*100):0;
  var fill=document.getElementById('bkFill');var pe=document.getElementById('bkPct');
  if(fill)fill.style.width=pct+'%';if(pe)pe.textContent=pct+'%';
  // Check icons per step
  var ck=function(id,done){var el=document.getElementById(id);if(el)el.classList.toggle('done',done);};
  ck('bkCheck1',!!(v('bkNIK')&&v('bkEmail')&&v('bkWA')&&v('bkAddr')));
  ck('bkCheck2',!!(v('bkBirthPlace')&&v('bkBirthDate')&&rv('bk_edu')&&rv('bk_spx')));
  ck('bkCheck3',!!(v('bkEmName')&&v('bkEmPhone')&&v('bkEmRel')));
  ck('bkCheck4',reqDocs.every(function(k){return BK.docs[k];}));
  ck('bkCheck5',!!(v('bkBank')&&v('bkBankNo')&&v('bkBankName')));
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
        nik:v('bkNIK'),email:v('bkEmail'),
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
