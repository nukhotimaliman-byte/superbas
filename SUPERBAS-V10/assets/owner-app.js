// ═══════════════════════════════════════════════════════════════
//  GLOBAL UTILITIES — XSS Protection, Toast, Confirm, Debounce
// ═══════════════════════════════════════════════════════════════
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
// Suppress debug logs in production
(function(){const noop=function(){};if(location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){console.log=noop;console.debug=noop;}})();
function showToast(msg, type='info', duration=3500){
  const c=document.getElementById('toastContainer'); if(!c) return;
  const colors={info:'bg-accent-cyan/90 text-white',success:'bg-accent-green/90 text-bas-900',error:'bg-red-500/90 text-white',warning:'bg-accent-orange/90 text-bas-900'};
  const t=document.createElement('div');
  t.className='pointer-events-auto px-4 py-3 rounded-xl text-xs font-bold shadow-xl backdrop-blur-sm border border-white/10 animate-[fadeUp_0.3s_ease] '+(colors[type]||colors.info);
  t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(()=>t.remove(),300);},duration);
}
let _confirmResolve=null;
function showConfirmModal(msg){ return new Promise(r=>{_confirmResolve=r;document.getElementById('confirmMsg').textContent=msg;document.getElementById('confirmModal').classList.remove('hidden');document.getElementById('confirmModal').classList.add('flex');}); }
function closeConfirmModal(val){ document.getElementById('confirmModal').classList.add('hidden');document.getElementById('confirmModal').classList.remove('flex');if(_confirmResolve){_confirmResolve(val);_confirmResolve=null;} }
function debounce(fn,ms=300){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),ms);};}
const debouncedFilterEmp=debounce(()=>{if(typeof filterEmp==='function')filterEmp();},250);
const debouncedAttFilter=debounce((v)=>{if(typeof attFilterWorkTable==='function')attFilterWorkTable(v);},250);
function parseIDNumber(s){
  // Handle Indonesian number format: 1.234.567 → 1234567
  if(typeof s!=='string') s=String(s||'');
  s=s.trim();
  // If has dots and commas, assume Indonesian format (dots=thousands, comma=decimal)
  if(s.includes('.')&&s.includes(',')) return parseFloat(s.replace(/\./g,'').replace(',','.'))||0;
  // If only dots, check if it's thousands separator (more than one dot, or last segment ≠ 2-3 digits)
  if(s.includes('.')&&!s.includes(',')){
    const parts=s.split('.');
    if(parts.length>2||(parts.length===2&&parts[parts.length-1].length===3)) return parseFloat(s.replace(/\./g,''))||0;
  }
  return parseFloat(s.replace(/[^\d.-]/g,''))||0;
}
// ═══════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER — catch ANY crash and show on screen
// ═══════════════════════════════════════════════════════════════
window.onerror = function(msg, src, line, col, err) {
  console.error('[BAS CRASH]', msg, src, line, col, err);
  var el = document.getElementById('loader');
  if (el) {
    el.innerHTML = '<div style="text-align:left;padding:20px;max-width:600px;margin:auto">'
      + '<h2 style="color:#f72585;margin-bottom:10px">⚠ Dashboard Error</h2>'
      + '<p style="color:#fff;font-size:13px;margin-bottom:8px">' + esc(msg) + '</p>'
      + '<p style="color:#94a3b8;font-size:11px">Terjadi kesalahan saat memuat dashboard.</p>'
      + '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:#f72585;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:bold">↻ Reload</button>'
      + '</div>';
  }
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[BAS PROMISE CRASH]', e.reason);
  var el = document.getElementById('loader');
  if (el) {
    el.innerHTML = '<div style="text-align:left;padding:20px;max-width:600px;margin:auto">'
      + '<h2 style="color:#f72585;margin-bottom:10px">⚠ Async Error</h2>'
      + '<p style="color:#fff;font-size:13px;margin-bottom:8px">' + esc(e.reason && e.reason.message ? e.reason.message : String(e.reason)) + '</p>'
      + '<p style="color:#94a3b8;font-size:11px">Terjadi kesalahan async. Silakan reload.</p>'
      + '<button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:#f72585;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:bold">↻ Reload</button>'
      + '</div>';
  }
});

// ═══════════════════════════════════════════════════════════════
//  THEME: LIGHT / DARK MODE
// ═══════════════════════════════════════════════════════════════
function getTheme() {
  return localStorage.getItem('bas-theme') || localStorage.getItem('bas_owner_theme') || localStorage.getItem('bas-theme-mode') || 'dark';
}
function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
  }
  // Write to unified key + legacy keys for backward compat
  localStorage.setItem('bas-theme', theme);
  localStorage.setItem('bas_owner_theme', theme);
  localStorage.setItem('bas-theme-mode', theme);
  // Update label
  const lbl = document.getElementById('themeLabel');
  if (lbl) lbl.textContent = theme === 'light' ? 'Mode Terang' : 'Mode Gelap';
  // Re-render active chart colors if any charts are showing
  try { if (typeof updateChartsTheme === 'function') updateChartsTheme(); } catch(e) {}
}
function toggleTheme() {
  const cur = getTheme();
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// Cross-tab sync: jika user ganti tema di tab lain, update di sini juga
window.addEventListener('storage', function(e) {
  if (e.key === 'bas-theme' || e.key === 'bas-theme-mode' || e.key === 'bas_owner_theme') {
    var newTheme = e.newValue || 'dark';
    applyTheme(newTheme);
  }
});

// ═══════════════════════════════════════════════════════════════
//  CONFIG & STATE (must be before applyTheme call)
// ═══════════════════════════════════════════════════════════════
const DEFAULT_API = "https://script.google.com/macros/s/AKfycbyFnq_vA10udPChk73NAD5gjCS6YiT8867gylbFGHAns1VvspUF_fcWr_JDT7y4fe50/exec";
let API = localStorage.getItem('bas_api_url') || DEFAULT_API;
let employees=[], attMap={}, payMap={}, charts={}, curTab='overview';

// Apply saved theme immediately (after charts declared)
applyTheme(getTheme());

// ═══════════════════════════════════════════════════════════════
//  OWNER / KORLAP PROFILE
// ═══════════════════════════════════════════════════════════════
let ownerProfile = { ops:'', nama:'', station:'ALL', status:'OWNER', wa:'' };
try {
  const _p = JSON.parse(sessionStorage.getItem('bas_owner_profile') || '{}');
  if (_p && (_p.ops !== undefined || _p.nama || _p.status)) ownerProfile = _p;
} catch(e) {}
const isKorlap = ownerProfile.status === 'KORLAP';
const korlapStation = isKorlap ? (ownerProfile.station || '').toUpperCase() : '';

// Korlap only gets limited tabs
const TABS_FULL = [
  { id:'overview', icon:'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', label:'Overview', short:'Overview' },
  { id:'employees', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label:'Karyawan', short:'Karyawan' },
  { id:'attendance', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label:'Presensi & Station', short:'Presensi' },
  { id:'payroll', icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label:'Payroll Analytics', short:'Payroll' },

  { id:'idcard', icon:'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2', label:'ID Card Generator', short:'ID Card' },
  { id:'photomonitor', icon:'M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3zM12 16a3 3 0 100-6 3 3 0 000 6z', label:'Foto Absen', short:'Foto' }
];
// Korlap: limited tabs
const TABS_KORLAP = TABS_FULL;
const TABS = isKorlap ? TABS_KORLAP : TABS_FULL;

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0);
const fmtN = n => new Intl.NumberFormat('id-ID').format(n||0);
const pct = (a,b) => b?((a/b)*100).toFixed(1):'0';
const svgIcon = d => `<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/></svg>`;

// Greeting berdasarkan jam
function getGreetingTime() {
  const h = new Date().getHours();
  if (h < 5) return '🌙 Selamat Malam';
  if (h < 11) return '☀️ Selamat Pagi';
  if (h < 15) return '🌤️ Selamat Siang';
  if (h < 18) return '🌅 Selamat Sore';
  return '🌙 Selamat Malam';
}

// ═══════════════════════════════════════════════════════════════
//  ML & DEEP LEARNING ENGINE v2.0
//  Neural Networks • Autoencoders • Time Series DL • PCA
//  K-Means++ • Polynomial Regression • Feature Importance
// ═══════════════════════════════════════════════════════════════

// ─── Activation Functions ───────────────────────────────────
const Act = {
  sigmoid:  x => 1/(1+Math.exp(-Math.max(-500,Math.min(500,x)))),
  sigmoidD: y => y*(1-y),
  relu:     x => Math.max(0,x),
  reluD:    y => y>0?1:0.01, // leaky
  tanh:     x => Math.tanh(x),
  tanhD:    y => 1-y*y,
  softmax:  a => { const m=Math.max(...a); const e=a.map(x=>Math.exp(x-m)); const s=e.reduce((a,b)=>a+b,0); return e.map(x=>x/s); },
  swish:    x => x*Act.sigmoid(x),
  swishD:   (x,y) => y+Act.sigmoid(x)*(1-y),
};

// ─── Classical ML (backward compat) ────────────────────────
const ML = {
  linReg(data) {
    const n=data.length; if(n<2) return {slope:0,intercept:0,r2:0,predict:()=>0};
    let sx=0,sy=0,sxy=0,sx2=0,sy2=0;
    data.forEach(([x,y])=>{sx+=x;sy+=y;sxy+=x*y;sx2+=x*x;sy2+=y*y;});
    const sl=(n*sxy-sx*sy)/(n*sx2-sx*sx)||0, ic=(sy-sl*sx)/n;
    const tot=sy2-(sy*sy)/n, res=data.reduce((s,[x,y])=>s+(y-(sl*x+ic))**2,0);
    const r2=tot?Math.max(0,1-res/tot):0;
    return {slope:sl,intercept:ic,r2,predict:x=>sl*x+ic};
  },
  movAvg(d,w=3) { return d.map((_,i)=>{ const s=Math.max(0,i-w+1); const sl=d.slice(s,i+1); return sl.reduce((a,b)=>a+b,0)/sl.length; }); },
  expSmooth(d,a=0.3,p=3) {
    if(!d.length) return [];
    let f=[d[0]]; for(let i=1;i<d.length;i++) f.push(a*d[i]+(1-a)*f[i-1]);
    const last=f[f.length-1]; for(let i=0;i<p;i++) f.push(last);
    return f;
  },
  kMeans(data,k=3,iter=100) {
    if(!data.length) return {clusters:[],centroids:[],assignments:[]};
    const vals=data.map(d=>Array.isArray(d)?d:[d]);
    // K-Means++ initialization
    let cents=[vals[Math.floor(Math.random()*vals.length)].slice()];
    const dist=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-(b[i]||0))**2,0));
    while(cents.length<k){
      const dists=vals.map(v=>Math.min(...cents.map(c=>dist(v,c)**2)));
      const total=dists.reduce((a,b)=>a+b,0)||1;
      let r=Math.random()*total, cum=0;
      for(let i=0;i<vals.length;i++){cum+=dists[i];if(cum>=r){cents.push(vals[i].slice());break;}}
    }
    let asgn=new Array(vals.length).fill(0);
    for(let it=0;it<iter;it++){
      let ch=false;
      vals.forEach((v,i)=>{let md=Infinity,mc=0;cents.forEach((c,j)=>{const d=dist(v,c);if(d<md){md=d;mc=j;}});if(asgn[i]!==mc){asgn[i]=mc;ch=true;}});
      if(!ch)break;
      const nc=cents.map(()=>[]),cc=new Array(k).fill(0);
      vals.forEach((v,i)=>{const c=asgn[i];cc[c]++;v.forEach((x,j)=>{nc[c][j]=(nc[c][j]||0)+x;});});
      cents=nc.map((c,i)=>cc[i]?c.map(v=>v/cc[i]):cents[i]);
    }
    const cls=cents.map(()=>[]); vals.forEach((v,i)=>cls[asgn[i]].push({data:v,idx:i}));
    const wcss=vals.reduce((s,v,i)=>s+dist(v,cents[asgn[i]])**2,0);
    return {clusters:cls,centroids:cents,assignments:asgn,wcss};
  },
  anomaly(vals,th=2) {
    const m=vals.reduce((a,b)=>a+b,0)/vals.length;
    const s=Math.sqrt(vals.reduce((t,v)=>t+(v-m)**2,0)/vals.length)||1;
    return vals.map((v,i)=>({value:v,z:(v-m)/s,anom:Math.abs((v-m)/s)>th,idx:i}));
  },
  stats(vals) {
    if(!vals.length) return {mean:0,median:0,std:0,min:0,max:0,q1:0,q3:0,iqr:0,n:0,skewness:0,kurtosis:0};
    const s=[...vals].sort((a,b)=>a-b), n=s.length;
    const mean=s.reduce((a,b)=>a+b,0)/n;
    const median=n%2?(s[(n-1)/2]):(s[n/2-1]+s[n/2])/2;
    const std=Math.sqrt(s.reduce((t,v)=>t+(v-mean)**2,0)/n);
    const skewness=std?s.reduce((t,v)=>t+((v-mean)/std)**3,0)/n:0;
    const kurtosis=std?s.reduce((t,v)=>t+((v-mean)/std)**4,0)/n-3:0;
    return {mean,median,std,min:s[0],max:s[n-1],q1:s[Math.floor(n*.25)],q3:s[Math.floor(n*.75)],iqr:s[Math.floor(n*.75)]-s[Math.floor(n*.25)],n,skewness,kurtosis};
  },
  corr(x,y) {
    const n=Math.min(x.length,y.length); if(n<2)return 0;
    const mx=x.reduce((a,b)=>a+b,0)/n, my=y.reduce((a,b)=>a+b,0)/n;
    let num=0,dx=0,dy=0;
    for(let i=0;i<n;i++){num+=(x[i]-mx)*(y[i]-my);dx+=(x[i]-mx)**2;dy+=(y[i]-my)**2;}
    return (dx*dy)?num/Math.sqrt(dx*dy):0;
  },
  polyReg(data,degree=2) {
    if(data.length<degree+1) return {coeffs:[],predict:()=>0,r2:0,degree};
    const n=data.length, X=data.map(d=>d[0]), Y=data.map(d=>d[1]);
    const xm=X.reduce((a,b)=>a+b,0)/n, xs=Math.sqrt(X.reduce((s,x)=>s+(x-xm)**2,0)/n)||1;
    const ym=Y.reduce((a,b)=>a+b,0)/n, ys=Math.sqrt(Y.reduce((s,y)=>s+(y-ym)**2,0)/n)||1;
    const xn=X.map(x=>(x-xm)/xs), yn=Y.map(y=>(y-ym)/ys);
    const coeffs=new Array(degree+1).fill(0);
    const lr=0.01;
    for(let iter=0;iter<2000;iter++){
      const grads=new Array(degree+1).fill(0);
      for(let i=0;i<n;i++){
        let pred=0; for(let p=0;p<=degree;p++) pred+=coeffs[p]*Math.pow(xn[i],p);
        const err=pred-yn[i];
        for(let p=0;p<=degree;p++) grads[p]+=err*Math.pow(xn[i],p)/n;
      }
      for(let p=0;p<=degree;p++) coeffs[p]-=lr*grads[p];
    }
    const predict=x=>{const xv=(x-xm)/xs;let r=0;for(let p=0;p<=degree;p++)r+=coeffs[p]*Math.pow(xv,p);return r*ys+ym;};
    const ssTot=Y.reduce((s,y)=>s+(y-ym)**2,0);
    const ssRes=data.reduce((s,[x,y])=>s+(y-predict(x))**2,0);
    const r2=ssTot?Math.max(0,1-ssRes/ssTot):0;
    return {coeffs,predict,r2,degree};
  }
};

// ─── Deep Learning Engine ──────────────────────────────────
const DL = {
  // Xavier/He weight init
  initW(rows,cols,act='relu'){
    const s=act==='relu'?Math.sqrt(2/rows):Math.sqrt(2/(rows+cols));
    return Array.from({length:rows},()=>Array.from({length:cols},()=>(Math.random()*2-1)*s));
  },
  initB(n){ return new Array(n).fill(0); },

  // ── Feedforward Neural Network ──────────────────────────
  createNN(layers,{lr=0.01,activation='relu',dropout=0}={}){
    const W=[],B=[],adam={mW:[],vW:[],mB:[],vB:[],t:0};
    for(let i=0;i<layers.length-1;i++){
      W.push(DL.initW(layers[i],layers[i+1],activation));
      B.push(DL.initB(layers[i+1]));
      adam.mW.push(Array.from({length:layers[i]},()=>new Array(layers[i+1]).fill(0)));
      adam.vW.push(Array.from({length:layers[i]},()=>new Array(layers[i+1]).fill(0)));
      adam.mB.push(new Array(layers[i+1]).fill(0));
      adam.vB.push(new Array(layers[i+1]).fill(0));
    }
    const act=(x,l)=>l===W.length-1?Act.sigmoid(x):activation==='tanh'?Act.tanh(x):activation==='swish'?Act.swish(x):Act.relu(x);
    const actD=(x,l)=>l===W.length-1?Act.sigmoidD(x):activation==='tanh'?Act.tanhD(x):Act.reluD(x);

    return {
      layers,lr,W,B,activation,dropout,history:{loss:[],accuracy:[],valLoss:[]},adam,
      forward(input,training=false){
        let cur=input; const As=[input], masks=[];
        for(let l=0;l<W.length;l++){
          const z=W[l][0].map((_,j)=>{let s=B[l][j];for(let i=0;i<cur.length;i++)s+=cur[i]*W[l][i][j];return act(s,l);});
          if(training&&dropout>0&&l<W.length-1){
            const mask=z.map(()=>Math.random()>dropout?1:0);
            masks.push(mask);
            cur=z.map((v,i)=>mask[i]?v/(1-dropout):0);
          } else { cur=z; masks.push(null); }
          As.push(cur);
        }
        return {output:cur,As,masks};
      },
      backward(input,target){
        const{output,As,masks}=this.forward(input,true);
        const deltas=[];
        let err=output.map((o,i)=>(target[i]-o)*actD(o,W.length-1));
        deltas.unshift(err);
        for(let l=W.length-2;l>=0;l--){
          const layerErr=As[l+1].map((a,i)=>{
            let s=0;for(let j=0;j<deltas[0].length;j++)s+=deltas[0][j]*W[l+1][i][j];
            let d=s*actD(a,l);
            if(masks[l]&&!masks[l][i])d=0;
            return d;
          });
          deltas.unshift(layerErr);
        }
        // Adam optimizer
        adam.t++;
        const b1=0.9,b2=0.999,eps=1e-8;
        for(let l=0;l<W.length;l++){
          for(let i=0;i<W[l].length;i++){
            for(let j=0;j<W[l][i].length;j++){
              const g=-deltas[l][j]*As[l][i];
              adam.mW[l][i][j]=b1*adam.mW[l][i][j]+(1-b1)*g;
              adam.vW[l][i][j]=b2*adam.vW[l][i][j]+(1-b2)*g*g;
              const mh=adam.mW[l][i][j]/(1-Math.pow(b1,adam.t));
              const vh=adam.vW[l][i][j]/(1-Math.pow(b2,adam.t));
              W[l][i][j]-=lr*mh/(Math.sqrt(vh)+eps);
            }
          }
          for(let j=0;j<B[l].length;j++){
            const g=-deltas[l][j];
            adam.mB[l][j]=b1*adam.mB[l][j]+(1-b1)*g;
            adam.vB[l][j]=b2*adam.vB[l][j]+(1-b2)*g*g;
            const mh=adam.mB[l][j]/(1-Math.pow(b1,adam.t));
            const vh=adam.vB[l][j]/(1-Math.pow(b2,adam.t));
            B[l][j]-=lr*mh/(Math.sqrt(vh)+eps);
          }
        }
        return output;
      },
      train(X,Y,epochs=100,{batchSize=0,onEpoch=null,valX=null,valY=null}={}){
        this.history={loss:[],accuracy:[],valLoss:[]};
        const bs=batchSize||X.length;
        for(let e=0;e<epochs;e++){
          // Shuffle
          const idx=Array.from({length:X.length},(_,i)=>i);
          for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
          let totalLoss=0,correct=0;
          for(let b=0;b<idx.length;b+=bs){
            const batch=idx.slice(b,b+bs);
            for(const i of batch){
              const out=this.backward(X[i],Y[i]);
              totalLoss+=Y[i].reduce((s,t,j)=>s+(t-out[j])**2,0)/Y[i].length;
              if(Y[i].length===1){if((out[0]>0.5?1:0)===Math.round(Y[i][0]))correct++;}
            }
          }
          this.history.loss.push(totalLoss/X.length);
          this.history.accuracy.push(X.length>0?correct/X.length:0);
          if(valX&&valY){
            let vl=0;for(let i=0;i<valX.length;i++){
              const o=this.predict(valX[i]);vl+=valY[i].reduce((s,t,j)=>s+(t-o[j])**2,0)/valY[i].length;
            }
            this.history.valLoss.push(vl/valX.length);
          }
          if(onEpoch)onEpoch(e,this.history);
        }
        return this.history;
      },
      predict(input){ return this.forward(input,false).output; },
      getArchStr(){ return layers.join(' → '); }
    };
  },

  // ── Time Series Neural Forecaster ─────────────────────
  createTSNN(windowSize=5,hiddenSize=10,lr=0.008){
    const nn=DL.createNN([windowSize,hiddenSize,Math.ceil(hiddenSize/2),1],{lr,activation:'tanh'});
    let minV=0,maxV=1;
    return {
      nn,windowSize,
      normalize(vals){minV=Math.min(...vals);maxV=Math.max(...vals);const r=maxV-minV||1;return vals.map(v=>(v-minV)/r);},
      denormalize(v){return v*(maxV-minV)+minV;},
      train(series,epochs=250){
        if(series.length<windowSize+2) return {loss:[]};
        const norm=this.normalize(series);
        const X=[],Y=[];
        for(let i=0;i<=norm.length-windowSize-1;i++){X.push(norm.slice(i,i+windowSize));Y.push([norm[i+windowSize]]);}
        return nn.train(X,Y,epochs);
      },
      forecast(series,steps=3){
        const norm=this.normalize(series);
        const preds=[];let win=norm.slice(-windowSize);
        for(let i=0;i<steps;i++){
          const p=nn.predict(win);
          const v=Math.max(0,Math.min(1,p[0]));
          preds.push(this.denormalize(v));
          win=[...win.slice(1),v];
        }
        return preds;
      },
      getHistory(){return nn.history;}
    };
  },

  // ── Autoencoder (Anomaly Detection) ───────────────────
  createAutoencoder(inputSize,bottleneck=2,lr=0.005){
    const h=Math.max(bottleneck+1,Math.ceil((inputSize+bottleneck)/2));
    const nn=DL.createNN([inputSize,h,bottleneck,h,inputSize],{lr,activation:'sigmoid'});
    return {
      nn,bottleneck,
      train(data,epochs=150){return nn.train(data,data,epochs);},
      detect(data,thMult=2){
        const errors=data.map((d,idx)=>{
          const rec=nn.predict(d);
          const mse=d.reduce((s,v,i)=>s+(v-rec[i])**2,0)/d.length;
          return {idx,mse,data:d,reconstructed:rec};
        });
        const mses=errors.map(e=>e.mse);
        const mean=mses.reduce((a,b)=>a+b,0)/mses.length;
        const std=Math.sqrt(mses.reduce((s,v)=>s+(v-mean)**2,0)/mses.length)||1;
        const threshold=mean+thMult*std;
        errors.forEach(e=>e.isAnomaly=e.mse>threshold);
        return {errors,threshold,mean,std};
      },
      encode(input){
        let cur=input;
        const mid=Math.floor(nn.W.length/2);
        for(let l=0;l<mid;l++){
          cur=nn.W[l][0].map((_,j)=>{let s=nn.B[l][j];for(let i=0;i<cur.length;i++)s+=cur[i]*nn.W[l][i][j];return Act.sigmoid(s);});
        }
        return cur;
      },
      getHistory(){return nn.history;}
    };
  },

  // ── PCA (Principal Component Analysis) ────────────────
  pca(data,components=2){
    const n=data.length,m=data[0]?.length||0;
    if(n<2||m<2)return{transformed:data.map(d=>d.slice(0,components)),explained:[],means:[]};
    const means=new Array(m).fill(0);
    data.forEach(r=>r.forEach((v,j)=>means[j]+=v));
    means.forEach((_,j)=>means[j]/=n);
    const cen=data.map(r=>r.map((v,j)=>v-means[j]));
    const cov=Array.from({length:m},()=>new Array(m).fill(0));
    for(let i=0;i<m;i++)for(let j=i;j<m;j++){let s=0;for(let k=0;k<n;k++)s+=cen[k][i]*cen[k][j];cov[i][j]=cov[j][i]=s/(n-1);}
    const evecs=[]; let def=cov.map(r=>[...r]);
    for(let c=0;c<Math.min(components,m);c++){
      let v=Array.from({length:m},()=>Math.random()-0.5),ev=0;
      for(let it=0;it<200;it++){
        const nv=new Array(m).fill(0);
        for(let i=0;i<m;i++)for(let j=0;j<m;j++)nv[i]+=def[i][j]*v[j];
        ev=Math.sqrt(nv.reduce((s,x)=>s+x*x,0))||1;
        v=nv.map(x=>x/ev);
      }
      evecs.push({vector:v,eigenvalue:ev});
      for(let i=0;i<m;i++)for(let j=0;j<m;j++)def[i][j]-=ev*v[i]*v[j];
    }
    const totalVar=cov.reduce((s,r,i)=>s+r[i],0)||1;
    const transformed=cen.map(r=>evecs.map(ev=>r.reduce((s,v,j)=>s+v*ev.vector[j],0)));
    const explained=evecs.map(ev=>ev.eigenvalue/totalVar*100);
    return{transformed,explained,eigenvectors:evecs,means};
  },

  // ── Feature Importance (Permutation) ──────────────────
  featureImportance(X,Y,model,names){
    let base=0;for(let i=0;i<X.length;i++){const p=model.predict(X[i]);base+=Y[i].reduce((s,t,j)=>s+(t-p[j])**2,0);}
    base/=X.length;
    return X[0].map((_,f)=>{
      const shuf=X.map(x=>[...x]);
      for(let i=shuf.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuf[i][f],shuf[j][f]]=[shuf[j][f],shuf[i][f]];}
      let pe=0;for(let i=0;i<shuf.length;i++){const p=model.predict(shuf[i]);pe+=Y[i].reduce((s,t,j)=>s+(t-p[j])**2,0);}
      pe/=shuf.length;
      return{feature:names?.[f]||'F'+f,importance:Math.max(0,pe-base),ratio:base>0?pe/base:1};
    }).sort((a,b)=>b.importance-a.importance);
  },

  // ── Normalize dataset ──────────────────────────────────
  normalize(data){
    const m=data[0]?.length||0;
    const mins=new Array(m).fill(Infinity),maxs=new Array(m).fill(-Infinity);
    data.forEach(r=>r.forEach((v,j)=>{mins[j]=Math.min(mins[j],v);maxs[j]=Math.max(maxs[j],v);}));
    const ranges=maxs.map((mx,j)=>mx-mins[j]||1);
    return{normalized:data.map(r=>r.map((v,j)=>(v-mins[j])/ranges[j])),mins,maxs,ranges};
  },
  denorm(val,min,range){return val*range+min;},

  // ── Risk Score (multi-factor neural assessment) ───────
  calcRiskScore(empData){
    // Heuristic neural-style risk scoring
    const{attCount,avgAtt,totalPay,avgPay,daysSinceLastAtt,attVariance}=empData;
    const s1=Math.max(0,1-attCount/30); // low attendance = high risk
    const s2=daysSinceLastAtt>30?0.8:daysSinceLastAtt>14?0.4:0;
    const s3=attVariance>0.5?0.3:0;
    const raw=s1*0.4+s2*0.4+s3*0.2;
    const score=Act.sigmoid((raw-0.3)*6)*100;
    const level=score>70?'HIGH':score>40?'MEDIUM':'LOW';
    const color=score>70?'red':score>40?'orange':'green';
    return{score:Math.round(score),level,color,factors:{attendance:s1,recency:s2,variance:s3}};
  },

  // ── Silhouette Score for clustering quality ───────────
  silhouetteScore(data,assignments,centroids){
    if(data.length<2)return 0;
    const vals=data.map(d=>Array.isArray(d)?d:[d]);
    const dist=(a,b)=>Math.sqrt(a.reduce((s,v,i)=>s+(v-(b[i]||0))**2,0));
    let totalS=0;
    for(let i=0;i<vals.length;i++){
      const ci=assignments[i];
      const clusterMates=vals.filter((_,j)=>j!==i&&assignments[j]===ci);
      const a=clusterMates.length?clusterMates.reduce((s,m)=>s+dist(vals[i],m),0)/clusterMates.length:0;
      let minB=Infinity;
      centroids.forEach((c,k)=>{
        if(k===ci)return;
        const others=vals.filter((_,j)=>assignments[j]===k);
        if(others.length){const avg=others.reduce((s,m)=>s+dist(vals[i],m),0)/others.length;minB=Math.min(minB,avg);}
      });
      if(minB===Infinity)minB=0;
      const si=Math.max(a,minB)?((minB-a)/Math.max(a,minB)):0;
      totalS+=si;
    }
    return totalS/vals.length;
  }
};

// ═══════════════════════════════════════════════════════════════
//  CHART CONFIG
// ═══════════════════════════════════════════════════════════════
const C = {
  pk:'rgba(247,37,133,1)', pkB:'rgba(247,37,133,0.12)',
  bl:'rgba(67,97,238,1)', blB:'rgba(67,97,238,0.12)',
  cy:'rgba(76,201,240,1)', cyB:'rgba(76,201,240,0.12)',
  gn:'rgba(0,245,212,1)', gnB:'rgba(0,245,212,0.12)',
  or:'rgba(255,158,0,1)', orB:'rgba(255,158,0,0.12)',
  pr:'rgba(157,78,221,1)', prB:'rgba(157,78,221,0.12)',
  rd:'rgba(239,68,68,1)', rdB:'rgba(239,68,68,0.12)',
  multi:['rgba(247,37,133,1)','rgba(67,97,238,1)','rgba(76,201,240,1)','rgba(0,245,212,1)','rgba(255,158,0,1)','rgba(157,78,221,1)','rgba(239,68,68,1)','rgba(99,102,241,1)']
};
function setChartTheme() {
  if (typeof Chart === 'undefined') return;
  const isLight = document.documentElement.classList.contains('light');
  Chart.defaults.color = isLight ? 'rgba(100,116,139,0.8)' : 'rgba(148,163,184,0.6)';
  Chart.defaults.borderColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
}
setChartTheme();
if (typeof Chart !== 'undefined') Chart.defaults.font.family='Inter';
function updateChartsTheme() {
  setChartTheme();
  Object.values(charts).forEach(c => { if(c && c.update) c.update(); });
}
function mkChart(id,cfg){if(typeof Chart==='undefined'){console.warn('[BAS] Chart.js not loaded');return null;}if(charts[id])charts[id].destroy();const x=document.getElementById(id);if(!x)return null;charts[id]=new Chart(x,cfg);return charts[id];}

// ═══════════════════════════════════════════════════════════════
//  API
// ═══════════════════════════════════════════════════════════════
let dbStatus = { connected: false, error: null, emptySheetsWarning: false };

function fetchWithTimeout(url, opts={}, ms=30000){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(), ms);
  return fetch(url,{...opts,signal:ctrl.signal}).finally(()=>clearTimeout(timer));
}

async function api(action,params={}){
  try{
    const r=await fetchWithTimeout(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...params}),redirect:'follow'},30000);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const text=await r.text();
    if(!text) return null;
    try{ const j=JSON.parse(text); if(j && j.error) { console.warn('API error ('+action+'):', j.error); return j; } return j; }
    catch(pe){ console.error('API parse error ('+action+'):', text.substring(0,200)); return null; }
  }
  catch(e){
    if(e.name==='AbortError') console.error('API timeout ('+action+') — 30s exceeded');
    else console.error('API ('+action+'):', e);
    return null;
  }
}

async function healthCheck(){
  try{
    const r=await fetchWithTimeout(API,{method:'GET',headers:{'Accept':'application/json'}},15000);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const text=await r.text();
    const j=JSON.parse(text);
    if(j && j.status==='ONLINE'){
      dbStatus.connected=true;
      console.log('[BAS] Database connected ✓ version:', j.version);
      return true;
    }
    throw new Error('Unexpected response: '+JSON.stringify(j));
  }catch(e){
    // If localStorage URL fails, try DEFAULT_API as fallback
    if(API !== DEFAULT_API){
      console.warn('[BAS] localStorage URL gagal, fallback ke DEFAULT_API...');
      API = DEFAULT_API;
      localStorage.removeItem('bas_api_url');
      try{
        const r2=await fetchWithTimeout(API,{method:'GET',headers:{'Accept':'application/json'}},15000);
        if(r2.ok){
          const t2=await r2.text();
          const j2=JSON.parse(t2);
          if(j2 && j2.status==='ONLINE'){
            dbStatus.connected=true;
            console.log('[BAS] Fallback ke DEFAULT_API berhasil ✓');
            return true;
          }
        }
      }catch(e2){}
    }
    dbStatus.connected=false;
    dbStatus.error=(e.name==='AbortError'?'Koneksi timeout (15s)':e.message)||String(e);
    console.error('[BAS] Database connection failed:', e);
    return false;
  }
}

function showDbBanner(){
  let existing=document.getElementById('db-status-banner');
  if(existing) existing.remove();
  const banner=document.createElement('div');
  banner.id='db-status-banner';
  banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 16px;font-size:12px;font-weight:700;text-align:center;transition:opacity 0.5s;';
  
  if(!dbStatus.connected){
    banner.style.background='linear-gradient(135deg,#dc2626,#b91c1c)';
    banner.style.color='#fff';
    banner.innerHTML='⚠ TIDAK TERHUBUNG KE DATABASE — <a onclick="reloadData()" style="text-decoration:underline;cursor:pointer;color:#fff;font-weight:900">Coba Lagi ↻</a> <span style="font-weight:400;opacity:0.8">('+esc(dbStatus.error||'Unknown error')+')</span> <button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;padding:2px 10px;border-radius:4px;cursor:pointer;font-size:11px">✕</button>';
  } else if(dbStatus.emptySheetsWarning){
    banner.style.background='linear-gradient(135deg,#f59e0b,#d97706)';
    banner.style.color='#fff';
    banner.innerHTML='⚠ API TERHUBUNG TAPI DATA KOSONG — Deep Learning akan otomatis mengolah data begitu sheet terisi. <a onclick="reloadData()" style="text-decoration:underline;cursor:pointer;color:#fff;font-weight:900">Refresh ↻</a> <button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;padding:2px 10px;border-radius:4px;cursor:pointer;font-size:11px">✕</button>';
  } else if(window._autoDiscoveryInfo){
    banner.style.background='linear-gradient(135deg,#6366f1,#8b5cf6)';
    banner.style.color='#fff';
    const maps = window._autoDiscoveryInfo;
    const parts = [];
    if(maps.employees) parts.push(maps.employees.sheet+' ('+maps.employees.rows+' karyawan)');
    if(maps.attendance) parts.push(maps.attendance.sheet+' ('+maps.attendance.rows+' presensi)');
    if(maps.payslips) parts.push(maps.payslips.sheet+' ('+maps.payslips.rows+' payslips)');
    banner.innerHTML='🧠 AUTO-DISCOVERY — DL Engine memuat data dari: '+parts.join(', ')+' — '+employees.length+' karyawan terdaftar <button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;padding:2px 10px;border-radius:4px;cursor:pointer;font-size:11px">✕</button>';
    setTimeout(()=>{banner.style.opacity='0';setTimeout(()=>banner.remove(),600);},6000);
  } else {
    banner.style.background='linear-gradient(135deg,#10b981,#059669)';
    banner.style.color='#fff';
    banner.innerHTML='✓ Database terhubung — '+employees.length+' karyawan, '+allAtt().length+' presensi, '+allPay().length+' payslips dimuat'+(window._autoDiscoveryInfo?' (via Auto-Discovery)':'');
    setTimeout(()=>{banner.style.opacity='0';setTimeout(()=>banner.remove(),600);},3000);
  }
  document.body.prepend(banner);
}

// ─── Smart Field Normalizer ────────────────────────────────
// Maps Indonesian/variant field names to standard English names
function normalizeFields(obj, fieldMap) {
  const result = {};
  const keys = Object.keys(obj);
  for (const [standard, aliases] of Object.entries(fieldMap)) {
    const found = keys.find(k => aliases.includes(k.toLowerCase()));
    result[standard] = found ? obj[found] : (obj[standard] !== undefined ? obj[standard] : '');
  }
  // Keep extra fields too
  for (const k of keys) {
    if (!(k in result)) result[k] = obj[k];
  }
  return result;
}

const EMP_FIELDS = {
  opsId: ['opsid','ops id','opsId','id ops','idops','id_ops','ops_id'],
  nik: ['nik','no ktp','noktp','no_ktp'],
  name: ['name','nama','nama lengkap','namalengkap','nama_lengkap','full name','fullname'],
  position: ['position','jabatan','posisi','role','pos'],
  status: ['status','statuskerja','status kerja','status_kerja','ket','keterangan'],
  phone: ['phone','hp','no hp','nohp','no_hp','telepon','telp','wa','whatsapp','no wa','nowa'],
  address: ['address','alamat','domisili'],
  station: ['station','stasiun','lokasi','area','hub','hubDc','hub dc','hub_dc','penempatan'],
  joinDate: ['joindate','join date','join_date','tanggal masuk','tglmasuk','tgl_masuk','mulai kerja'],
  bankAccount: ['bankaccount','rekening','norek','no rek','no_rek','no rekening'],
  bankName: ['bankname','bank','namabank','nama bank','nama_bank'],
};

const ATT_FIELDS = {
  opsId: ['opsid','ops id','opsId','id ops','idops','id_ops','ops_id'],
  date: ['date','tanggal','tgl','tgl_presensi','tanggalpresensi','tanggal presensi'],
  station: ['station','stasiun','lokasi','area','penempatan'],
  status: ['status','keterangan','ket','hadir','kehadiran'],
  shifting: ['shifting','shift','jadwal','sesi'],
  name: ['name','nama','nama lengkap'],
};

const PAY_FIELDS = {
  opsId: ['opsid','ops id','opsId','id ops','idops','id_ops','ops_id','ops'],
  period: ['period','periode','bulan','bln','month'],
  gaji: ['gaji','salary','basicpay','basic pay','basic_pay','upah'],
  totalDibayarkan: ['totaldibayarkan','total dibayarkan','total_dibayarkan','totalbayar','total bayar','total','nett','take home pay','thp','net pay','nominal','totalyangdibayarkan','total yang dibayarkan','total_yang_dibayarkan'],
  hk: ['hk','hari kerja','harikerja','hari_kerja','workdays','working days'],
  rate: ['rate','rateharian','rate harian','rate_harian','daily rate','rateperhari','rate perhari','rate_perhari'],
  incentive: ['incentive','insentif','bonus','tunjangan','attendanceincentive','attendance incentive','campaignincentive','campaign incentive'],
  hubDc: ['hubdc','hub dc','hub_dc','hub','dc','area'],
  station: ['station','stasiun','lokasi','penempatan'],
  name: ['name','nama','nama lengkap'],
  rekening: ['rekening','norek','no rek','no_rek','bank account','bankaccount','nomorrekening','nomor rekening','nomor_rekening'],
  bank: ['bank','namabank','nama bank','nama_bank'],
  atasNama: ['atasnama','atas nama','atas_nama','a.n','namarekening','nama rekening','nama_rekening','an','account name','account holder'],
  potongan: ['potongan','pot','deduction','pot pribadi','potpribadi','pot_pribadi','potpriba di'],
  asuransi: ['asuransi','bpjs','insurance'],
  rapel: ['rapel','backpay','back pay','hkrapel','hk rapel','hk_rapel'],
  claim: ['claim','klaim'],
  bouncing: ['bouncing','bounce'],
  divisi: ['divisi','division','dept','department'],
  umk: ['umk','upah minimum'],
  note: ['note','catatan','keterangan'],
  tanggalProses: ['tanggalproses','tanggal proses','tanggal_proses','process date','tgl proses'],
  jadwalProses: ['jadwalproses','jadwal proses','jadwal_proses'],
};

async function loadAll(){
  const loaderMsg=document.querySelector('#loader p');
  const setMsg=t=>{if(loaderMsg)loaderMsg.textContent=t;};
  
  // 1. Health check dulu
  setMsg('Mengecek koneksi API...');
  await healthCheck();
  if(!dbStatus.connected){
    showDbBanner();
    return;
  }
  
  // 2. Try normal flow first: getAllEmployees
  setMsg('Memuat data karyawan...');
  const ed=await api('getAllEmployees');
  let allEmployees=Array.isArray(ed)?ed:[];
  
  // Detect if API returned error
  if(ed===null){
    dbStatus.connected=false;
    dbStatus.error='getAllEmployees gagal — periksa Apps Script.';
    showDbBanner();
    return;
  }
  
  // Detect if API returned an error object  
  if(ed && ed.error && !Array.isArray(ed)){
    // Continue — will try auto-discovery below
    allEmployees=[];
  }

  // 3. If employees empty, try AUTO-DISCOVERY (getAllData)
  let usedAutoDiscovery = false;
  if(allEmployees.length === 0){
    setMsg('Auto-discovery: scanning sheets...');
    console.log('[BAS] Employees kosong, mencoba auto-discovery getAllData...');
    const ad = await api('getAllData');
    
    if(ad && !ad.error){
      usedAutoDiscovery = true;
      console.log('[BAS] Auto-discovery berhasil:', ad.mappings);
      
      // Normalize employee data
      if(ad.employees && ad.employees.length > 0){
        allEmployees = ad.employees.map(e => normalizeFields(e, EMP_FIELDS));
        // Generate opsId if missing
        allEmployees.forEach((e,i) => {
          if(!e.opsId && e.nik) e.opsId = e.nik;
          if(!e.opsId) e.opsId = 'AUTO-'+(i+1);
        });
        console.log('[BAS] Auto-discovered '+allEmployees.length+' employees from sheet: '+(ad.mappings?.employees?.sheet||'?'));
      }
      
      // Normalize & group attendance data by opsId
      if(ad.attendance && ad.attendance.length > 0){
        const normAtt = ad.attendance.map(a => normalizeFields(a, ATT_FIELDS));
        normAtt.forEach(a => {
          if(!a.opsId && a.nik) a.opsId = a.nik;
          if(!a.opsId && a.name){
            // Try to match by name to find opsId
            const match = allEmployees.find(e => e.name && e.name.toLowerCase() === a.name.toLowerCase());
            if(match) a.opsId = match.opsId;
          }
          if(a.opsId){
            if(!attMap[a.opsId]) attMap[a.opsId] = [];
            attMap[a.opsId].push(a);
          }
        });
        console.log('[BAS] Auto-discovered '+normAtt.length+' attendance records from sheet: '+(ad.mappings?.attendance?.sheet||'?'));
      }
      
      // Normalize & group payslip data by opsId
      if(ad.payslips && ad.payslips.length > 0){
        const normPay = ad.payslips.map(p => normalizeFields(p, PAY_FIELDS));
        normPay.forEach(p => {
          if(!p.opsId && p.nik) p.opsId = p.nik;
          if(!p.opsId && p.name){
            const match = allEmployees.find(e => e.name && e.name.toLowerCase() === p.name.toLowerCase());
            if(match) p.opsId = match.opsId;
          }
          // Parse totalDibayarkan to number
          if(typeof p.totalDibayarkan === 'string') p.totalDibayarkan = parseFloat(p.totalDibayarkan.replace(/[^\d.-]/g,''))||0;
          if(!p.totalDibayarkan && p.gaji) p.totalDibayarkan = parseFloat(String(p.gaji).replace(/[^\d.-]/g,''))||0;
          if(p.opsId){
            if(!payMap[p.opsId]) payMap[p.opsId] = [];
            payMap[p.opsId].push(p);
          }
        });
        console.log('[BAS] Auto-discovered '+normPay.length+' payslips from sheet: '+(ad.mappings?.payslips?.sheet||'?'));
      }
      
      // If we got payslips but no employees, extract unique employees from payslips/attendance
      if(allEmployees.length === 0){
        const seen = new Set();
        const extractFrom = [...(ad.payslips||[]).map(p=>normalizeFields(p,PAY_FIELDS)), ...(ad.attendance||[]).map(a=>normalizeFields(a,ATT_FIELDS))];
        extractFrom.forEach(r => {
          const id = r.opsId || r.nik || r.name;
          if(id && !seen.has(id)){
            seen.add(id);
            allEmployees.push({
              opsId: r.opsId || r.nik || 'AUTO-'+(allEmployees.length+1),
              name: r.name || id,
              nik: r.nik || '',
              position: r.position || r.jabatan || '',
              status: r.status || 'AKTIF',
              phone: r.phone || '',
              station: r.station || r.hubDc || r.area || '',
            });
          }
        });
        console.log('[BAS] Extracted '+allEmployees.length+' employees from payslip/attendance data');
      }

      // Store discovery info for Settings tab
      window._autoDiscoveryInfo = ad.mappings;
      window._spreadsheetName = ad.spreadsheetName;
    } else {
      console.log('[BAS] Auto-discovery juga gagal:', ad?.error || 'no response');
      // getAllData not deployed yet — this is expected for old deployments
    }
  }
  
  // Set employees
  employees = allEmployees;
  
  // 3.5. Normalize field names across all data sources
  // DataKaryawan uses "ops" instead of "opsId", Absensi uses "opsid", SlipGaji uses "totalYangDibayarkan"
  employees.forEach(e => {
    if(!e.opsId && e.ops) e.opsId = e.ops;
    if(!e.opsId && e.opsid) e.opsId = e.opsid;
    if(!e.name && e.nama) e.name = e.nama;
    if(!e.name && e.namaLengkap) e.name = e.namaLengkap;
    if(!e.position && e.jabatan) e.position = e.jabatan;
    if(!e.phone && e.wa) e.phone = e.wa;
    if(!e.bankAccount && e.rekening) e.bankAccount = e.rekening;
    if(!e.bankName && e.namaBank) e.bankName = e.namaBank;
    if(!e.bankName && e.bank) e.bankName = e.bank;
    if(!e.station && e.hubDc) e.station = e.hubDc;
    if(!e.joinDate && e.join) e.joinDate = e.join;
    if(!e.an && e.atasNama) e.an = e.atasNama;
  });
  
  // 4. BULK load attendance & payslips (2 calls instead of 2000!)
  if(!usedAutoDiscovery && employees.length > 0) {
    setMsg('Memuat presensi & payslip ('+employees.length+' karyawan)...');
    console.log('[BAS] Bulk loading attendance & payslips...');
    const [allAttData, allPayData] = await Promise.all([
      api('getAllAttendance'),
      api('getAllPayslips')
    ]);
    
    // Normalize & group attendance by opsId
    const attArr = Array.isArray(allAttData) ? allAttData : [];
    console.log('[BAS] Bulk attendance:', attArr.length, 'records');
    attArr.forEach(r => {
      // Normalize fields
      if(!r.opsId && r.opsid) r.opsId = r.opsid;
      if(!r.opsId && r.ops) r.opsId = r.ops;
      if(!r.name && r.namaLengkap) r.name = r.namaLengkap;
      if(!r.name && r.nama) r.name = r.nama;
      if(!r.station && r.hubDc) r.station = r.hubDc;
      if(r.opsId) {
        if(!attMap[r.opsId]) attMap[r.opsId] = [];
        attMap[r.opsId].push(r);
      }
    });
    
    // Normalize & group payslips by opsId
    const payArr = Array.isArray(allPayData) ? allPayData : [];
    console.log('[BAS] Bulk payslips:', payArr.length, 'records');
    payArr.forEach(r => {
      // Normalize fields
      if(!r.opsId && r.ops) r.opsId = r.ops;
      if(!r.opsId && r.opsid) r.opsId = r.opsid;
      if(!r.name && r.nama) r.name = r.nama;
      // totalYangDibayarkan → totalDibayarkan
      if(r.totalDibayarkan === undefined && r.totalYangDibayarkan !== undefined) r.totalDibayarkan = r.totalYangDibayarkan;
      // Ensure numeric
      if(typeof r.totalDibayarkan === 'string') r.totalDibayarkan = parseFloat(r.totalDibayarkan.replace(/[^\d.-]/g,''))||0;
      if(!r.totalDibayarkan && r.gaji) r.totalDibayarkan = typeof r.gaji === 'number' ? r.gaji : parseFloat(String(r.gaji).replace(/[^\d.-]/g,''))||0;
      if(!r.station && r.hubDc) r.station = r.hubDc;
      if(!r.period && r.periode) r.period = r.periode;
      if(r.opsId) {
        if(!payMap[r.opsId]) payMap[r.opsId] = [];
        payMap[r.opsId].push(r);
      }
    });
    
    // Fallback: if bulk endpoints not deployed yet, try per-employee (batched)
    if(attArr.length === 0 && payArr.length === 0) {
      console.log('[BAS] Bulk endpoints kosong, fallback ke per-employee (batched)...');
      const batchSize = 10;
      for(let i = 0; i < employees.length; i += batchSize) {
        const batch = employees.slice(i, i + batchSize);
        const proms = batch.map(async e => {
          const [a, p] = await Promise.all([
            api('getAttendance', {opsId: e.opsId}),
            api('getPayslips', {opsId: e.opsId})
          ]);
          const normA = (Array.isArray(a)?a:[]).map(r => {
            if(!r.opsId && r.opsid) r.opsId = r.opsid;
            if(!r.opsId && r.ops) r.opsId = r.ops;
            if(!r.name && r.namaLengkap) r.name = r.namaLengkap;
            if(!r.name && r.nama) r.name = r.nama;
            return r;
          });
          const normP = (Array.isArray(p)?p:[]).map(r => {
            if(!r.opsId && r.ops) r.opsId = r.ops;
            if(!r.opsId && r.opsid) r.opsId = r.opsid;
            if(!r.name && r.nama) r.name = r.nama;
            if(r.totalDibayarkan === undefined && r.totalYangDibayarkan !== undefined) r.totalDibayarkan = r.totalYangDibayarkan;
            if(typeof r.totalDibayarkan === 'string') r.totalDibayarkan = parseFloat(r.totalDibayarkan.replace(/[^\d.-]/g,''))||0;
            if(!r.totalDibayarkan && r.gaji) r.totalDibayarkan = typeof r.gaji === 'number' ? r.gaji : parseFloat(String(r.gaji).replace(/[^\d.-]/g,''))||0;
            if(!r.station && r.hubDc) r.station = r.hubDc;
            if(!r.period && r.periode) r.period = r.periode;
            return r;
          });
          attMap[e.opsId] = normA;
          payMap[e.opsId] = normP;
        });
        await Promise.all(proms);
      }
    }
  }
  
  // 5. Korlap: filter employees to only those with attendance at this station
  if (isKorlap && korlapStation) {
    employees = allEmployees.filter(e => {
      const att = attMap[e.opsId] || [];
      return att.some(a => (a.station||'').toUpperCase() === korlapStation);
    });
    const empSet = new Set(employees.map(e=>e.opsId));
    for (const k of Object.keys(attMap)) { if (!empSet.has(k)) delete attMap[k]; }
    for (const k of Object.keys(payMap)) { if (!empSet.has(k)) delete payMap[k]; }
  }
  
  // 6. Check if data is empty
  if(employees.length===0){
    dbStatus.emptySheetsWarning=true;
  }
  showDbBanner();
}

// ═══════════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════════
function buildNav(){
  const sn=document.getElementById('sideNav');
  const mn=document.getElementById('mobileNav');
  sn.setAttribute('role','navigation'); sn.setAttribute('aria-label','Menu Utama');
  mn.setAttribute('role','navigation'); mn.setAttribute('aria-label','Menu Mobile');
  sn.innerHTML=TABS.map(t=>`<button onclick="go('${t.id}')" data-t="${t.id}" aria-label="${esc(t.label)}" class="sidebar-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-transparent">${svgIcon(t.icon)}<span>${t.label}</span><span class="dot w-1.5 h-1.5 rounded-full ml-auto bg-transparent"></span></button>`).join('');
  mn.innerHTML=`<div class="flex items-center justify-around w-full h-full">`+TABS.map(t=>`<button onclick="go('${t.id}')" data-t="${t.id}" aria-label="${esc(t.label)}" class="mob-tab flex flex-col items-center justify-center py-1 px-2 text-slate-500 transition-all relative"><svg class="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${t.icon}"/></svg><span class="text-[7px] font-bold mt-0.5 leading-tight text-center">${t.short}</span><span class="mob-dot absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent-pink opacity-0 transition-opacity"></span></button>`).join('')+`</div>`;
}
function go(tab){
  curTab=tab;
  document.querySelectorAll('[id^="tab-"]').forEach(e=>e.classList.add('hidden'));
  document.getElementById('tab-'+tab)?.classList.remove('hidden');
  document.querySelectorAll('#sideNav button').forEach(b=>{b.classList.remove('active');b.classList.add('text-slate-400');});
  document.querySelector(`#sideNav [data-t="${tab}"]`)?.classList.add('active');
  document.querySelector(`#sideNav [data-t="${tab}"]`)?.classList.remove('text-slate-400');
  document.querySelectorAll('#mobileNav .mob-tab').forEach(b=>{b.classList.remove('text-accent-pink');b.classList.add('text-slate-500');const dot=b.querySelector('.mob-dot');if(dot)dot.style.opacity='0';});
  const mb=document.querySelector(`#mobileNav [data-t="${tab}"]`);
  if(mb){mb.classList.remove('text-slate-500');mb.classList.add('text-accent-pink');const dot=mb.querySelector('.mob-dot');if(dot)dot.style.opacity='1';}
  try{history.pushState(null,'','#'+tab);}catch(e){}
  const R={overview:rOverview,employees:rEmployees,attendance:rAttendance,payroll:rPayroll,idcard:rIDCard,photomonitor:rPhotoMonitor};
  R[tab]?.();
}
function logout(){
  sessionStorage.removeItem('bas_owner_auth');
  sessionStorage.removeItem('bas_owner_profile');
  localStorage.removeItem('bas_session');
  window.location.replace('index.html');
}

// ═══════════════════════════════════════════════════════════════
//  HELPER: Table Sort
// ═══════════════════════════════════════════════════════════════
let sortState={};
function sortTable(tableId,col,type='string'){
  const key=tableId+col;
  sortState[key]=sortState[key]==='asc'?'desc':'asc';
  const dir=sortState[key];
  const tbody=document.getElementById(tableId);
  const rows=[...tbody.querySelectorAll('tr')];
  rows.sort((a,b)=>{
    let va=a.children[col]?.textContent.trim()||'';
    let vb=b.children[col]?.textContent.trim()||'';
    if(type==='number'){va=parseFloat(va.replace(/[^\d.-]/g,''))||0;vb=parseFloat(vb.replace(/[^\d.-]/g,''))||0;}
    if(type==='number') return dir==='asc'?va-vb:vb-va;
    return dir==='asc'?va.localeCompare(vb):vb.localeCompare(va);
  });
  rows.forEach(r=>tbody.appendChild(r));
  // Update sort indicators
  const th=document.querySelector(`[data-sort-table="${tableId}"]`)?.closest('thead')?.querySelectorAll('th');
  th?.forEach(h=>{h.classList.remove('sort-asc','sort-desc');});
  const header=document.querySelector(`[data-sort-table="${tableId}"][data-sort-col="${col}"]`);
  header?.classList.add(dir==='asc'?'sort-asc':'sort-desc');
}

// ═══════════════════════════════════════════════════════════════
//  COMPUTED DATA HELPERS  
// ═══════════════════════════════════════════════════════════════
function allAtt(){
  const all = Object.values(attMap).flat();
  if (isKorlap && korlapStation) return all.filter(a => (a.station||'').toUpperCase() === korlapStation);
  return all;
}
function allPay(){
  if (isKorlap) {
    // Only payslips of employees at this station
    const empOps = new Set(employees.map(e=>e.opsId));
    return Object.entries(payMap).filter(([k])=>empOps.has(k)).flatMap(([,v])=>v);
  }
  return Object.values(payMap).flat();
}
function getStations(){
  const st=new Set();
  allAtt().forEach(a=>{ if(a.station) st.add(a.station.toUpperCase()); });
  return [...st].sort();
}
function getPositions(){
  const p=new Set(); employees.forEach(e=>{ if(e.position) p.add(e.position); });
  return [...p].sort();
}
function getStatuses(){
  const s=new Set(); employees.forEach(e=>{ if(e.status) s.add(e.status); });
  return [...s].sort();
}

// ═══════════════════════════════════════════════════════════════
//  RENDER: OVERVIEW
// ═══════════════════════════════════════════════════════════════
function rOverview(){
  const el=document.getElementById('tab-overview');
  
  // Tampilkan panel kosong jika belum ada data
  if(!dbStatus.connected){
    el.innerHTML=`
      <div class="fade-up flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div class="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center text-4xl">🔌</div>
        <h2 class="text-xl font-black text-white">Tidak Terhubung ke Database</h2>
        <p class="text-sm text-slate-400 max-w-md">Gagal terhubung ke Google Apps Script API. Periksa koneksi internet dan pastikan URL API benar.</p>
        <p class="text-xs text-slate-500 font-mono bg-white/5 px-3 py-1.5 rounded-lg">${esc(dbStatus.error||'No response')}</p>
        <button onclick="location.reload()" class="mt-2 px-5 py-2 bg-accent-pink rounded-xl text-white text-sm font-bold hover:bg-accent-pink/80 transition">↻ Coba Lagi</button>
      </div>`;
    return;
  }
  
  if(employees.length===0){
    el.innerHTML=`
      <div class="fade-up flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div class="w-20 h-20 rounded-2xl bg-accent-orange/10 flex items-center justify-center text-4xl">🧠</div>
        <h2 class="text-xl font-black text-white">Database Terhubung — DL Engine Siap</h2>
        <p class="text-sm text-slate-400 max-w-md">Deep Learning Engine aktif dan sudah mencoba auto-discovery data dari semua sheet di Google Spreadsheet Anda, tapi belum menemukan data yang cocok.</p>
        <div class="text-left text-xs text-slate-400 space-y-2 max-w-md">
          <p class="text-accent-cyan font-bold text-sm">🔧 Yang Perlu Dilakukan:</p>
          <div class="flex items-start gap-2"><span class="text-accent-green font-bold">1.</span> Pastikan <b class="text-white">Apps Script</b> di-deploy dari spreadsheet yang BERISI data karyawan/presensi/gaji</div>
          <div class="flex items-start gap-2"><span class="text-accent-green font-bold">2.</span> Deep Learning akan <b class="text-white">otomatis mendeteksi</b> sheet manapun yang berisi data karyawan, presensi, atau gaji — tidak perlu nama sheet khusus</div>
          <div class="flex items-start gap-2"><span class="text-accent-green font-bold">3.</span> Header kolom yang dikenali: <code class="text-accent-cyan text-[10px]">OPS ID / NIK / Nama / Jabatan / Tanggal / Station / Gaji / Total Dibayarkan</code></div>
          <div class="flex items-start gap-2"><span class="text-accent-green font-bold">4.</span> Setelah deploy ulang Apps Script, klik <b class="text-accent-pink">Refresh</b></div>
        </div>
        <div class="flex gap-3 mt-2">
          <button onclick="reloadData()" class="px-5 py-2 bg-accent-pink rounded-xl text-white text-sm font-bold hover:bg-accent-pink/80 transition">↻ Refresh Data</button>
        </div>
        <div class="mt-4 glass rounded-xl p-3 text-[10px] text-slate-500">
          <span class="text-accent-green">✓</span> API: <b class="text-white">ONLINE</b> |
          <span class="text-accent-green">✓</span> DL Engine: <b class="text-white">AKTIF</b> |
          <span class="text-accent-green">✓</span> Auto-Discovery: <b class="text-white">AKTIF</b> |
          <span class="text-accent-orange">!</span> Data: <b class="text-accent-orange">Belum ditemukan</b>
        </div>
      </div>`;
    return;
  }
  
  const tot=employees.length;
  const ap=allPay(), aa=allAtt();
  const totalPay=ap.reduce((s,p)=>s+(p.totalDibayarkan||0),0);
  const totalAtt=aa.length;
  const stations=getStations();
  const avgAttPerEmp=tot?(totalAtt/tot).toFixed(1):0;
  
  // Station distribution
  const stDist={}; aa.forEach(a=>{const s=(a.station||'Unknown').toUpperCase();stDist[s]=(stDist[s]||0)+1;});
  
  // Position distribution
  const posDist={}; employees.forEach(e=>{const p=e.position||'Lainnya';posDist[p]=(posDist[p]||0)+1;});
  
  // Status distribution
  const statusDist={}; employees.forEach(e=>{const s=e.status||'Lainnya';statusDist[s]=(statusDist[s]||0)+1;});
  
  // Payroll trend
  const perTot={}; ap.forEach(p=>{perTot[p.period||'?']=(perTot[p.period||'?']||0)+(p.totalDibayarkan||0);});
  const periods=Object.keys(perTot).sort(), pVals=periods.map(p=>perTot[p]);
  const reg=ML.linReg(pVals.map((v,i)=>[i,v]));
  const tDir=reg.slope>0?'↑ Naik':reg.slope<0?'↓ Turun':'→ Stabil';

  // DL: Neural salary prediction
  const salaries=ap.map(p=>p.totalDibayarkan||0).filter(s=>s>0);
  const ss=ML.stats(salaries);
  // DL: Risk overview
  const riskScores=employees.map(e=>{
    const att=attMap[e.opsId]||[];
    const dates=att.map(a=>a.date).filter(Boolean).sort();
    const lastDate=dates[dates.length-1]||'';
    const daysSince=lastDate?Math.floor((Date.now()-new Date(lastDate))/(86400000)):999;
    const counts=att.length;
    const variance=counts>1?ML.stats(att.map((_,i)=>i)).std/counts:0;
    return DL.calcRiskScore({attCount:counts,avgAtt:counts/Math.max(1,tot),totalPay:0,avgPay:0,daysSinceLastAtt:daysSince,attVariance:variance});
  });
  const highRisk=riskScores.filter(r=>r.level==='HIGH').length;
  const medRisk=riskScores.filter(r=>r.level==='MEDIUM').length;
  const avgRisk=riskScores.length?Math.round(riskScores.reduce((s,r)=>s+r.score,0)/riskScores.length):0;

  // DL: Polynomial regression for payroll
  const polyR=pVals.length>3?ML.polyReg(pVals.map((v,i)=>[i,v]),2):{r2:0};

  const korlapBanner = isKorlap ? `
    <div class="fade-up glass rounded-2xl p-4 border border-accent-orange/20 bg-accent-orange/5 flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-accent-orange/15 flex items-center justify-center text-accent-orange text-sm flex-shrink-0">🔒</div>
      <div>
        <p class="text-[11px] font-bold text-accent-orange">Mode Korlap — ${esc(korlapStation)}</p>
        <p class="text-[9px] text-slate-400">Akses data terbatas hanya untuk station <b class="text-white">${esc(korlapStation)}</b>. Hubungi Owner untuk akses penuh.</p>
      </div>
    </div>` : '';

  el.innerHTML=`
    ${korlapBanner}
    <!-- Welcome Greeting -->
    <div class="fade-up relative overflow-hidden glass rounded-2xl p-5 sm:p-6 border border-white/5">
      <div class="absolute inset-0 bg-gradient-to-r from-accent-pink/5 via-accent-blue/5 to-accent-cyan/5"></div>
      <div class="absolute top-0 right-0 w-40 h-40 bg-accent-pink/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
      <div class="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">${getGreetingTime()}</p>
          <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">${isKorlap ? 'Halo, Korlap ' + esc(ownerProfile.nama||'') + ' 👋' : 'Selamat Datang, ' + esc(ownerProfile.nama||'Owner') + ' 👋'}</h1>
          <p class="text-xs text-slate-400 mt-1">${isKorlap ? 'Station <b class=\"text-accent-orange\">' + esc(korlapStation) + '</b> — semua data real-time tersedia.' : 'Semua sistem berjalan normal. Deep Learning Engine v2.0 aktif memproses data Anda.'}</p>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-bold text-slate-500 glass px-3 py-1.5 rounded-lg flex-shrink-0"><span class="w-2 h-2 rounded-full bg-accent-green pulse-dot"></span>DL Engine Active — ${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>

    <div class="fade-up" style="animation-delay:60ms">
      <h2 class="text-sm font-bold text-slate-400 uppercase tracking-wider">Dashboard Overview</h2>
    </div>
    
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 fade-up" style="animation-delay:80ms">
      ${kpiCard('Total Karyawan',fmtN(tot),'Terdaftar','pk','M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z')}
      ${kpiCard('Total Presensi',fmtN(totalAtt),'Avg '+avgAttPerEmp+'/org','bl','M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z')}
      ${kpiCard('Total Payroll',fmt(totalPay),'Semua Periode','gn','M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z')}
      ${kpiCard('Station Unik',stations.length+' lokasi',stations.slice(0,2).join(', '),'cy','M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z')}
      ${kpiCard('DL Tren',tDir,'R²='+reg.r2.toFixed(2)+' | Poly R²='+polyR.r2.toFixed(2),'or','M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v-5.5m3.75 5.5V8.25m3.75 3V9.75')}
    </div>

    <!-- Deep Learning Risk Assessment Panel -->
    <div class="glass rounded-2xl p-4 sm:p-5 border border-accent-pink/10 fade-up" style="animation-delay:110ms">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-7 h-7 bg-gradient-to-br from-accent-pink to-accent-blue rounded-lg flex items-center justify-center text-white text-[10px] font-black">DL</div>
        <div><h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Deep Learning Risk Assessment</h3><p class="text-[8px] text-slate-500">Neural Network multi-factor employee risk analysis</p></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white/[0.02] rounded-xl p-3 text-center">
          <div class="text-2xl font-black ${avgRisk>60?'text-red-400':avgRisk>35?'text-accent-orange':'text-accent-green'}">${avgRisk}%</div>
          <div class="text-[8px] text-slate-500 font-bold uppercase mt-1">Avg Risk Score</div>
        </div>
        <div class="bg-white/[0.02] rounded-xl p-3 text-center">
          <div class="text-2xl font-black text-red-400">${highRisk}</div>
          <div class="text-[8px] text-slate-500 font-bold uppercase mt-1">High Risk</div>
        </div>
        <div class="bg-white/[0.02] rounded-xl p-3 text-center">
          <div class="text-2xl font-black text-accent-orange">${medRisk}</div>
          <div class="text-[8px] text-slate-500 font-bold uppercase mt-1">Medium Risk</div>
        </div>
        <div class="bg-white/[0.02] rounded-xl p-3 text-center">
          <div class="text-2xl font-black text-accent-green">${tot-highRisk-medRisk}</div>
          <div class="text-[8px] text-slate-500 font-bold uppercase mt-1">Low Risk</div>
        </div>
      </div>
      <div class="mt-3 h-40"><canvas id="cRiskDist"></canvas></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 fade-up" style="animation-delay:150ms">
      <div class="glass rounded-2xl p-4 sm:p-5"><h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>Status Karyawan</h3><div class="h-48"><canvas id="cStatus"></canvas></div></div>
      <div class="glass rounded-2xl p-4 sm:p-5"><h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>Top 8 Station</h3><div class="h-48"><canvas id="cStation"></canvas></div></div>
      <div class="glass rounded-2xl p-4 sm:p-5"><h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>Posisi</h3><div class="h-48"><canvas id="cPos"></canvas></div></div>
    </div>

    <div class="glass rounded-2xl p-4 sm:p-5 fade-up" style="animation-delay:200ms">
      <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-green"></span>Payroll Trend + DL Forecast</h3>
      <p class="text-[9px] text-slate-600 font-medium mb-3">Linear Regression • Polynomial Regression • Exponential Smoothing • Neural Time Series</p>
      <div class="h-52 sm:h-64"><canvas id="cPayTrend"></canvas></div>
    </div>
    
    <div class="glass rounded-2xl p-4 sm:p-5 fade-up" style="animation-delay:250ms">
      <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-orange"></span>Station Heatmap — Presensi per Station per Bulan</h3>
      <p class="text-[9px] text-slate-600 font-medium mb-3">Distribusi kehadiran berdasarkan lokasi kerja</p>
      <div class="h-52 sm:h-72"><canvas id="cStationHeat"></canvas></div>
    </div>
  `;

  setTimeout(()=>{
    // Risk distribution chart
    const riskBuckets={'0-20':0,'21-40':0,'41-60':0,'61-80':0,'81-100':0};
    riskScores.forEach(r=>{
      if(r.score<=20)riskBuckets['0-20']++;
      else if(r.score<=40)riskBuckets['21-40']++;
      else if(r.score<=60)riskBuckets['41-60']++;
      else if(r.score<=80)riskBuckets['61-80']++;
      else riskBuckets['81-100']++;
    });
    mkChart('cRiskDist',{type:'bar',data:{labels:Object.keys(riskBuckets),datasets:[{label:'Employees',data:Object.values(riskBuckets),backgroundColor:['rgba(0,245,212,0.5)','rgba(76,201,240,0.5)','rgba(255,158,0,0.5)','rgba(247,37,133,0.5)','rgba(239,68,68,0.5)'],borderColor:['rgba(0,245,212,1)','rgba(76,201,240,1)','rgba(255,158,0,1)','rgba(247,37,133,1)','rgba(239,68,68,1)'],borderWidth:1,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{size:8}}},x:{ticks:{font:{size:9,weight:'600'}}}}}});

    mkChart('cStatus',{type:'doughnut',data:{labels:Object.keys(statusDist),datasets:[{data:Object.values(statusDist),backgroundColor:C.multi,borderWidth:0,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:9,weight:'600'}}}}}});
    
    // Station top 8
    const stSorted=Object.entries(stDist).sort((a,b)=>b[1]-a[1]).slice(0,8);
    mkChart('cStation',{type:'bar',data:{labels:stSorted.map(s=>s[0].length>18?s[0].slice(0,16)+'…':s[0]),datasets:[{data:stSorted.map(s=>s[1]),backgroundColor:C.cyB,borderColor:C.cy,borderWidth:1,borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{font:{size:9}}},y:{ticks:{font:{size:8}}}}}});
    
    mkChart('cPos',{type:'doughnut',data:{labels:Object.keys(posDist).map(p=>p.length>20?p.slice(0,18)+'…':p),datasets:[{data:Object.values(posDist),backgroundColor:C.multi.map(c=>c.replace('1)','0.7)')),borderWidth:0,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:8,weight:'600'}}}}}});

    // Payroll trend + DL forecast
    if(periods.length){
      const es=ML.expSmooth(pVals,0.4,2);
      const rl=[...periods.map((_,i)=>reg.predict(i)),reg.predict(periods.length),reg.predict(periods.length+1)];
      // Polynomial regression line
      const polyLine=polyR.predict?[...periods.map((_,i)=>polyR.predict(i)),polyR.predict(periods.length),polyR.predict(periods.length+1)]:[];
      // DL Neural forecast
      let dlForecast=new Array(periods.length).fill(null);
      if(pVals.length>=4){
        try{
          const tsnn=DL.createTSNN(Math.min(3,pVals.length-1),8,0.01);
          tsnn.train(pVals,150);
          const fc=tsnn.forecast(pVals,2);
          dlForecast=[...dlForecast,...fc];
        }catch(e){dlForecast.push(null,null);}
      } else {dlForecast.push(null,null);}
      const lbl=[...periods,'Next+1','Next+2'];
      const datasets=[
        {label:'Aktual',data:[...pVals,null,null],borderColor:C.cy,backgroundColor:C.cyB,fill:true,tension:0.4,pointRadius:3,borderWidth:2},
        {label:'Linear Reg',data:rl,borderColor:C.pk,borderDash:[5,5],borderWidth:2,pointRadius:0,fill:false},
        {label:'Exp.Smoothing',data:es,borderColor:C.gn,borderDash:[3,3],borderWidth:2,pointRadius:0,fill:false}
      ];
      if(polyLine.length){datasets.push({label:'Poly Reg (d=2)',data:polyLine,borderColor:C.or,borderDash:[8,4],borderWidth:2,pointRadius:0,fill:false});}
      if(dlForecast.some(v=>v!==null)){datasets.push({label:'Neural DL',data:dlForecast,borderColor:C.pr,borderWidth:2.5,pointRadius:4,pointBackgroundColor:C.pr,fill:false,segment:{borderDash:ctx=>ctx.p0DataIndex>=periods.length-1?[4,4]:undefined}});}
      mkChart('cPayTrend',{type:'line',data:{labels:lbl,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:10,font:{size:9,weight:'600'}}}},scales:{y:{ticks:{callback:v=>fmt(v),font:{size:8}}},x:{ticks:{font:{size:8}}}}}});
    }

    // Station heatmap (stacked bar by month)
    const stMonthData={};
    aa.forEach(a=>{
      const st=(a.station||'Unknown').toUpperCase();
      const d=a.date||'';
      const m=d.substring(0,7)||'Unknown';
      if(!stMonthData[st]) stMonthData[st]={};
      stMonthData[st][m]=(stMonthData[st][m]||0)+1;
    });
    const allMonths=[...new Set(aa.map(a=>(a.date||'').substring(0,7)).filter(Boolean))].sort();
    const topSt=Object.entries(stDist).sort((a,b)=>b[1]-a[1]).slice(0,6).map(s=>s[0]);
    if(allMonths.length && topSt.length){
      mkChart('cStationHeat',{type:'bar',data:{labels:allMonths,datasets:topSt.map((st,i)=>({
        label:st.length>20?st.slice(0,18)+'…':st,
        data:allMonths.map(m=>(stMonthData[st]||{})[m]||0),
        backgroundColor:C.multi[i%C.multi.length].replace('1)','0.6)'),
        borderColor:C.multi[i%C.multi.length],
        borderWidth:1,borderRadius:4
      }))},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:8,font:{size:8,weight:'600'}}}},scales:{x:{stacked:true,ticks:{font:{size:8}}},y:{stacked:true,beginAtZero:true,ticks:{font:{size:8}}}}}});
    }
  },80);
}

function kpiCard(label,value,sub,color,icon){
  const colors={pk:'accent-pink',bl:'accent-blue',cy:'accent-cyan',gn:'accent-green',or:'accent-orange'};
  const c=colors[color];
  const iconSvg=icon?`<svg class="w-5 h-5 text-${c} opacity-70" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg>`:'';
  return `<div class="stat-card glass rounded-xl p-4 relative overflow-hidden"><div class="absolute top-0 right-0 w-16 h-16 bg-${c} opacity-5 rounded-full blur-2xl -mr-4 -mt-4"></div><div class="flex items-center justify-between"><p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">${label}</p>${iconSvg}</div><p class="text-lg sm:text-xl font-black text-white mt-1 leading-tight">${value}</p><p class="text-[9px] text-${c} font-semibold mt-0.5">${sub}</p></div>`;
}

// ═══════════════════════════════════════════════════════════════
//  RENDER: EMPLOYEES
// ═══════════════════════════════════════════════════════════════
function rEmployees(){
  const el=document.getElementById('tab-employees');
  const positions=getPositions(), statuses=getStatuses(), stations=getStations();

  el.innerHTML=`
    <div class="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div><h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Data Karyawan</h1><p class="text-xs text-slate-500 font-medium mt-0.5">Total ${employees.length} karyawan terdaftar</p></div>
    </div>
    <div class="glass rounded-2xl overflow-hidden fade-up" style="animation-delay:80ms">
      <div class="p-4 space-y-3 border-b border-white/5">
        <div class="relative"><svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input id="empQ" type="text" placeholder="Cari nama, OPS ID, posisi, bank..." class="search-input" oninput="debouncedFilterEmp()"></div>
        <div class="flex flex-wrap gap-2">
          <select id="empPos" class="filter-select" onchange="filterEmp()"><option value="">Semua Posisi</option>${positions.map(p=>`<option>${esc(p)}</option>`).join('')}</select>
          <select id="empSt" class="filter-select" onchange="filterEmp()"><option value="">Semua Status</option>${statuses.map(s=>`<option>${esc(s)}</option>`).join('')}</select>
          <select id="empStation" class="filter-select" onchange="filterEmp()"><option value="">Semua Station</option>${stations.map(s=>`<option>${esc(s)}</option>`).join('')}</select>
        </div>
        <div class="flex items-center gap-2 text-[10px] text-slate-500 font-semibold"><span id="empCount">${employees.length}</span> hasil — klik header tabel untuk sort</div>
      </div>
      <div class="table-wrap overflow-x-auto">
        <table class="w-full text-xs">
          <thead><tr class="border-b border-white/5 text-left">
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider sort-btn" data-sort-table="empTb" data-sort-col="0" onclick="sortTable('empTb',0)">Nama</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider sort-btn" data-sort-table="empTb" data-sort-col="1" onclick="sortTable('empTb',1)">OPS ID</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider sort-btn hidden sm:table-cell" data-sort-table="empTb" data-sort-col="2" onclick="sortTable('empTb',2)">Posisi</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Status</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Bank</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Station Utama</th>
            <th class="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-right sort-btn" data-sort-table="empTb" data-sort-col="6" onclick="sortTable('empTb',6,'number')">Presensi</th>
          </tr></thead>
          <tbody id="empTb">
            ${employees.map(e=>{
              const att=attMap[e.opsId]||[];
              const stFreq={}; att.forEach(a=>{const s=(a.station||'-').toUpperCase();stFreq[s]=(stFreq[s]||0)+1;});
              const mainSt=Object.entries(stFreq).sort((a,b)=>b[1]-a[1])[0];
              return `<tr class="trow border-b border-white/[0.02]" data-pos="${esc(e.position||'')}" data-st="${esc(e.status||'')}" data-stn="${mainSt?esc(mainSt[0]):''}">
                <td class="px-4 py-3 font-semibold text-white">${esc(e.name||'-')}</td>
                <td class="px-4 py-3 text-accent-cyan font-mono font-semibold text-[11px]">${esc(e.opsId||'-')}</td>
                <td class="px-4 py-3 text-slate-400 hidden sm:table-cell">${esc(e.position||'-')}</td>
                <td class="px-4 py-3 hidden md:table-cell"><span class="chip ${(e.status||'').toLowerCase().includes('active')?'chip-green':'chip-orange'}">${esc(e.status||'-')}</span></td>
                <td class="px-4 py-3 text-slate-400 hidden lg:table-cell text-[10px]">${esc(e.bankName||e.bank||'-')}</td>
                <td class="px-4 py-3 hidden lg:table-cell"><span class="chip chip-cyan text-[9px]">${mainSt?esc(mainSt[0]):'-'}</span></td>
                <td class="px-4 py-3 text-right font-bold text-white">${att.length}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="glass rounded-2xl p-4 sm:p-5 fade-up" style="animation-delay:150ms">
      <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>K-Means++ Clustering — Segmentasi Aktivitas</h3>
      <p class="text-[9px] text-slate-600 font-medium mb-3">Unsupervised Deep Learning: K-Means++ clustering + Silhouette Score</p>
      <div class="h-52 sm:h-64"><canvas id="cCluster"></canvas></div>
    </div>
  `;

  setTimeout(()=>{
    const counts=employees.map(e=>(attMap[e.opsId]||[]).length);
    if(counts.length>2){
      const k=Math.min(3,employees.length);
      const res=ML.kMeans(counts,k);
      const silScore=DL.silhouetteScore(counts,res.assignments,res.centroids);
      const colors=[C.pk,C.bl,C.gn];
      const labels=res.clusters.map((cl,i)=>{ const names=['Low','Medium','High']; return (names[i]||'C'+(i+1))+' ('+(cl?.length||0)+')'; });
      const ds=res.clusters.map((cl,i)=>({label:labels[i]||'C'+(i+1),data:(cl||[]).map(it=>({x:it.idx,y:Array.isArray(it.data)?it.data[0]:it.data})),backgroundColor:colors[i%colors.length],pointRadius:5,pointHoverRadius:7}));
      mkChart('cCluster',{type:'scatter',data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:10,font:{size:9,weight:'600'}}},title:{display:true,text:'Silhouette Score: '+silScore.toFixed(3)+' | WCSS: '+res.wcss.toFixed(1),font:{size:9},color:'rgba(148,163,184,0.6)'}},scales:{x:{title:{display:true,text:'Index Karyawan',font:{size:9}},ticks:{font:{size:8}}},y:{title:{display:true,text:'Jumlah Presensi',font:{size:9}},beginAtZero:true,ticks:{font:{size:8}}}}}});
    }
  },80);
}

function filterEmp(){
  const q=(document.getElementById('empQ')?.value||'').toLowerCase();
  const pos=document.getElementById('empPos')?.value||'';
  const st=document.getElementById('empSt')?.value||'';
  const stn=document.getElementById('empStation')?.value||'';
  let count=0;
  document.querySelectorAll('#empTb tr').forEach(r=>{
    const txt=r.textContent.toLowerCase();
    const matchQ=!q||txt.includes(q);
    const matchPos=!pos||r.dataset.pos===pos;
    const matchSt=!st||r.dataset.st===st;
    const matchStn=!stn||(r.dataset.stn||'').toUpperCase()===stn.toUpperCase();
    const show=matchQ&&matchPos&&matchSt&&matchStn;
    r.style.display=show?'':'none';
    if(show) count++;
  });
  document.getElementById('empCount').textContent=count;
}

// ═══════════════════════════════════════════════════════════════
//  RENDER: ATTENDANCE & STATION
// ═══════════════════════════════════════════════════════════════
// ─── Presensi & Station: State ────
let attDateFrom='', attDateTo='', attCalMonth=null, attCalYear=null, attSelEmp='', attSelStation='', attCalPicking='from', attActivePeriode=0;

function attParseAllDates(){
  const dates=new Set();
  allAtt().forEach(a=>{ if(a.date) dates.add(a.date.substring(0,10)); });
  return dates;
}
function attFilteredRecords(){
  let recs=allAtt();
  if(attDateFrom){ recs=recs.filter(a=>(a.date||'')>=attDateFrom); }
  if(attDateTo){ recs=recs.filter(a=>(a.date||'').substring(0,10)<=attDateTo); }
  if(attSelStation){ recs=recs.filter(a=>(a.station||'').toUpperCase()=== attSelStation); }
  if(attSelEmp){ const empSet=new Set(attMap[attSelEmp]||[]); recs=recs.filter(a=>empSet.has(a)); }
  return recs;
}
function attBuildCalendar(year,month){
  const allDates=attParseAllDates();
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const startDay=(first.getDay()+6)%7; // Monday=0
  const daysInMonth=last.getDate();
  const today=new Date(); today.setHours(0,0,0,0);
  const mNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const dNames=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

  let html=`<div class="select-none">`;
  // Header
  html+=`<div class="flex items-center justify-between mb-3">
    <button onclick="attNavMonth(-1)" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
    </button>
    <div class="text-center">
      <span class="text-sm font-black text-white tracking-tight">${mNames[month]}</span>
      <span class="text-sm font-bold text-slate-500 ml-1">${year}</span>
    </div>
    <button onclick="attNavMonth(1)" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>`;
  // Day headers
  html+=`<div class="grid grid-cols-7 gap-0.5 mb-1">${dNames.map(d=>`<div class="text-center text-[9px] font-bold text-slate-600 uppercase py-1">${d}</div>`).join('')}</div>`;
  // Day cells
  html+=`<div class="grid grid-cols-7 gap-0.5">`;
  for(let i=0;i<startDay;i++) html+=`<div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasData=allDates.has(ds);
    const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===d;
    const isFrom=attDateFrom===ds;
    const isTo=attDateTo===ds;
    const inRange=attDateFrom&&attDateTo&&ds>=attDateFrom&&ds<=attDateTo;
    const isEndpoint=isFrom||isTo;
    let cls='relative flex flex-col items-center justify-center h-9 rounded-lg cursor-pointer transition-all text-xs font-bold ';
    if(isEndpoint) cls+='bg-accent-pink text-white shadow-lg shadow-accent-pink/30 ring-2 ring-accent-pink/50 z-10 ';
    else if(inRange) cls+='bg-accent-pink/15 text-accent-pink ';
    else if(hasData) cls+='text-white hover:bg-white/10 ';
    else cls+='text-slate-600 hover:bg-white/5 ';
    html+=`<div class="${cls}" onclick="attPickDate('${ds}')">
      <span>${d}</span>
      ${hasData&&!isEndpoint?`<span class="absolute bottom-1 w-1 h-1 rounded-full ${inRange?'bg-accent-pink':'bg-accent-cyan'}"></span>`:''}
      ${isToday&&!isEndpoint?`<span class="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-accent-green pulse-dot"></span>`:''}
    </div>`;
  }
  html+=`</div></div>`;
  return html;
}
function attNavMonth(dir){
  attCalMonth+=dir;
  if(attCalMonth>11){attCalMonth=0;attCalYear++;}
  if(attCalMonth<0){attCalMonth=11;attCalYear--;}
  document.getElementById('attCalendar').innerHTML=attBuildCalendar(attCalYear,attCalMonth);
}
function attPickDate(ds){
  attActivePeriode=0;
  if(attCalPicking==='from'){
    attDateFrom=ds; attDateTo=''; attCalPicking='to';
  } else {
    if(ds<attDateFrom){attDateFrom=ds;attDateTo='';attCalPicking='to';}
    else{attDateTo=ds;attCalPicking='from';}
  }
  document.getElementById('attCalendar').innerHTML=attBuildCalendar(attCalYear,attCalMonth);
  attUpdateRangeLabel();
  attRefreshData();
}
function attClearRange(){
  attActivePeriode=0;
  attDateFrom='';attDateTo='';attCalPicking='from';
  document.getElementById('attCalendar').innerHTML=attBuildCalendar(attCalYear,attCalMonth);
  attUpdateRangeLabel();
  attRefreshData();
}
function attUpdateRangeLabel(){
  const lbl=document.getElementById('attRangeLabel');
  if(!lbl)return;
  if(attDateFrom&&attDateTo){
    const f=new Date(attDateFrom), t=new Date(attDateTo);
    const diffDays=Math.ceil((t-f)/(1000*60*60*24))+1;
    lbl.innerHTML=`<span class="text-accent-pink font-black">${attDateFrom}</span> <span class="text-slate-500">→</span> <span class="text-accent-cyan font-black">${attDateTo}</span> <span class="text-slate-500 ml-2">(${diffDays} hari)</span>`;
  } else if(attDateFrom){
    lbl.innerHTML=`<span class="text-accent-pink font-black">${attDateFrom}</span> <span class="text-slate-500 animate-pulse">→ Pilih tanggal akhir...</span>`;
  } else {
    lbl.innerHTML=`<span class="text-slate-500 text-xs">Klik tanggal pada kalender untuk memilih rentang</span>`;
  }
}
function attSelectEmp(opsId){
  attSelEmp=opsId;
  // Update visual active state
  document.querySelectorAll('.att-emp-item').forEach(el=>{
    el.classList.toggle('border-accent-pink/40',el.dataset.oid===opsId);
    el.classList.toggle('bg-accent-pink/5',el.dataset.oid===opsId);
    el.classList.toggle('border-white/[0.04]',el.dataset.oid!==opsId);
    el.classList.toggle('bg-transparent',el.dataset.oid!==opsId);
  });
  attRefreshData();
}
function attClearEmp(){
  attSelEmp='';
  document.querySelectorAll('.att-emp-item').forEach(el=>{
    el.classList.remove('border-accent-pink/40','bg-accent-pink/5');
    el.classList.add('border-white/[0.04]','bg-transparent');
  });
  attRefreshData();
}
function attFilterEmpSearch(){
  const q=(document.getElementById('attEmpQ')?.value||'').toLowerCase();
  document.querySelectorAll('.att-emp-item').forEach(el=>{
    el.style.display=el.dataset.name.toLowerCase().includes(q)||el.dataset.oid.toLowerCase().includes(q)?'':'none';
  });
}
function attSetStation(val){
  attSelStation=val;
  attRefreshData();
}

function attRefreshData(){
  const recs=attFilteredRecords();
  const recsSet=new Set(recs);
  const totalRecords=recs.length;

  // Unique work days
  const uniqueDays=new Set(recs.map(a=>(a.date||'').substring(0,10)).filter(Boolean));
  // Unique employees in range
  const empIds=new Set();
  Object.entries(attMap).forEach(([oid,atts])=>{
    atts.forEach(a=>{ if(recsSet.has(a)) empIds.add(oid); });
  });
  // Station dist
  const stDist={};recs.forEach(a=>{const s=(a.station||'Unknown').toUpperCase();stDist[s]=(stDist[s]||0)+1;});
  const stSorted=Object.entries(stDist).sort((a,b)=>b[1]-a[1]);
  // Status dist
  const statusDist={};recs.forEach(a=>{const s=a.status||'Unknown';statusDist[s]=(statusDist[s]||0)+1;});
  // Shift dist
  const shiftDist={};recs.forEach(a=>{const sh=a.shifting||a.shift||'Unknown';shiftDist[sh]=(shiftDist[sh]||0)+1;});

  // Update KPIs
  document.getElementById('attKpiTotal').textContent=fmtN(totalRecords);
  document.getElementById('attKpiDays').textContent=uniqueDays.size;
  document.getElementById('attKpiEmps').textContent=empIds.size;
  document.getElementById('attKpiStations').textContent=Object.keys(stDist).length;

  // Update Station chart
  mkChart('cAttStation2',{type:'bar',data:{labels:stSorted.slice(0,8).map(s=>s[0].length>14?s[0].slice(0,12)+'…':s[0]),datasets:[{data:stSorted.slice(0,8).map(s=>s[1]),backgroundColor:stSorted.slice(0,8).map((_,i)=>C.multi[i%C.multi.length]?.replace('1)','0.7)')),borderColor:stSorted.slice(0,8).map((_,i)=>C.multi[i%C.multi.length]),borderWidth:1,borderRadius:6}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmtN(ctx.raw)+' presensi'}}},scales:{x:{beginAtZero:true,ticks:{font:{size:8}},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{font:{size:9,weight:'600'}},grid:{display:false}}}}});

  // Update Status chart
  mkChart('cAttStatus2',{type:'doughnut',data:{labels:Object.keys(statusDist),datasets:[{data:Object.values(statusDist),backgroundColor:C.multi,borderWidth:0,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:8,usePointStyle:true,pointStyleWidth:8,font:{size:9,weight:'600'}}}}}});

  // Shift chart
  mkChart('cAttShift2',{type:'polarArea',data:{labels:Object.keys(shiftDist),datasets:[{data:Object.values(shiftDist),backgroundColor:C.multi.map(c=>c.replace('1)','0.5)')),borderColor:C.multi,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:8,usePointStyle:true,pointStyleWidth:8,font:{size:9,weight:'600'}}}},scales:{r:{ticks:{display:false},grid:{color:'rgba(255,255,255,0.05)'}}}}});

  // Daily trend line (dates sorted) + DL enhancements
  const dailyCounts={};
  recs.forEach(a=>{const d=(a.date||'').substring(0,10);if(d)dailyCounts[d]=(dailyCounts[d]||0)+1;});
  const dailySorted=Object.entries(dailyCounts).sort((a,b)=>a[0].localeCompare(b[0]));
  if(dailySorted.length>1){
    const vals=dailySorted.map(d=>d[1]);
    const ma=ML.movAvg(vals,Math.min(3,Math.floor(vals.length/2))||1);
    const trendDatasets=[
      {label:'Presensi/Hari',data:vals,borderColor:C.cy,backgroundColor:C.cyB,fill:true,tension:0.4,pointRadius:vals.length>30?0:2,borderWidth:2},
      {label:'Moving Avg',data:ma,borderColor:C.pk,borderDash:[4,4],borderWidth:2,pointRadius:0}
    ];
    // DL: Exponential Smoothing
    if(vals.length>3){
      const expS=ML.expSmooth(vals,0.3,0);
      trendDatasets.push({label:'Exp.Smooth',data:expS.slice(0,vals.length),borderColor:C.gn,borderDash:[6,3],borderWidth:1.5,pointRadius:0,fill:false});
    }
    // DL: Neural forecast
    if(vals.length>5){
      try{
        const wSize=Math.min(3,vals.length-2);
        const tsnn=DL.createTSNN(wSize,8,0.01);
        tsnn.train(vals,150);
        const fcSteps=Math.min(3,Math.max(1,Math.floor(vals.length*0.15)));
        const forecast=tsnn.forecast(vals,fcSteps);
        const nnPred=[...new Array(vals.length).fill(null),...forecast];
        trendDatasets.push({label:'Neural DL ↗',data:nnPred,borderColor:C.pr,borderWidth:2.5,pointRadius:5,pointBackgroundColor:C.pr,fill:false});
      }catch(e){}
    }
    const lbls=[...dailySorted.map(d=>d[0].substring(5))];
    // extend labels if forecast added
    const maxLen=Math.max(...trendDatasets.map(d=>d.data?.length||0));
    while(lbls.length<maxLen)lbls.push('F+'+(lbls.length-dailySorted.length+1));
    // extend actual data to match
    trendDatasets[0].data=[...vals,...new Array(maxLen-vals.length).fill(null)];
    trendDatasets[1].data=[...ma,...new Array(maxLen-ma.length).fill(null)];

    mkChart('cAttTrend2',{type:'line',data:{labels:lbls,datasets:trendDatasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:8,font:{size:9,weight:'600'}}}},scales:{y:{beginAtZero:true,ticks:{font:{size:8}},grid:{color:'rgba(255,255,255,0.03)'}},x:{ticks:{font:{size:7},maxTicksLimit:12},grid:{display:false}}}}});
    document.getElementById('attTrendWrap').classList.remove('hidden');
  } else {
    document.getElementById('attTrendWrap').classList.add('hidden');
  }

  // Work days table per employee
  const empWork=employees.map(e=>{
    const myAtts=(attMap[e.opsId]||[]).filter(a=>{
      if(attDateFrom&&(a.date||'')<attDateFrom) return false;
      if(attDateTo&&(a.date||'').substring(0,10)>attDateTo) return false;
      if(attSelStation&&(a.station||'').toUpperCase()!==attSelStation) return false;
      return true;
    });
    const days=new Set(myAtts.map(a=>(a.date||'').substring(0,10)).filter(Boolean));
    const stns=new Set(myAtts.map(a=>(a.station||'').toUpperCase()).filter(Boolean));
    return {name:e.name,opsId:e.opsId,pos:e.position,count:myAtts.length,days:days.size,stations:[...stns],atts:myAtts};
  }).filter(e=>e.count>0).sort((a,b)=>b.days-a.days);

  let tbHtml='';
  empWork.forEach((e,i)=>{
    const stLabel=e.stations.length>2?e.stations.slice(0,2).join(', ')+' +'+(e.stations.length-2):e.stations.join(', ');
    tbHtml+=`<tr class="trow border-b border-white/[0.02] ${attSelEmp===e.opsId?'bg-accent-pink/5':''}">
      <td class="px-3 py-2.5 font-bold text-white text-xs">${esc(e.name)}</td>
      <td class="px-3 py-2.5 text-[10px] text-slate-400 font-mono">${esc(e.opsId)}</td>
      <td class="px-3 py-2.5 text-center"><span class="chip chip-cyan">${e.days}</span></td>
      <td class="px-3 py-2.5 text-xs text-slate-400 hidden md:table-cell" title="${esc(e.stations.join(', '))}">${esc(stLabel||'-')}</td>
      <td class="px-3 py-2.5 hidden lg:table-cell"><div class="w-full bg-white/5 rounded-full h-1.5"><div class="bg-accent-cyan h-1.5 rounded-full transition-all" style="width:${empWork[0]?.days?Math.max(3,(e.days/empWork[0].days)*100):0}%"></div></div></td>
    </tr>`;
  });
  document.getElementById('attWorkTbody').innerHTML=tbHtml||'<tr><td colspan="5" class="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data untuk filter ini</td></tr>';
  document.getElementById('attWorkCount').textContent=empWork.length+' karyawan';

  // Detail view: if emp selected, show their day-by-day
  const detailEl=document.getElementById('attDetailPanel');
  if(attSelEmp){
    const empData=empWork.find(e=>e.opsId===attSelEmp);
    const empInfo=employees.find(e=>e.opsId===attSelEmp);
    if(empData&&empData.atts.length){
      const sortedAtts=[...empData.atts].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      let detailHtml=`<div class="flex items-center justify-between mb-3">
        <div>
          <h4 class="text-sm font-black text-white">${esc(empInfo?.name||attSelEmp)}</h4>
          <p class="text-[10px] text-slate-500">${esc(attSelEmp)} • ${empData.days} hari kerja • ${empData.count} record</p>
        </div>
        <button onclick="attClearEmp()" class="text-[10px] font-bold text-slate-500 hover:text-accent-pink transition-colors px-2 py-1 rounded-lg hover:bg-white/5">✕ Tutup</button>
      </div>
      <div class="overflow-x-auto rounded-xl border border-white/5">
        <table class="w-full text-[11px]">
          <thead><tr class="border-b border-white/5 bg-white/[0.02]">
            <th class="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Tanggal</th>
            <th class="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Station</th>
            <th class="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Shift</th>
            <th class="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Status</th>
          </tr></thead><tbody>`;
      sortedAtts.forEach(a=>{
        const stColor=a.status==='Hadir'||a.status==='HADIR'?'chip-green':a.status==='Alpha'||a.status==='ALPHA'?'chip-red':'chip-orange';
        detailHtml+=`<tr class="border-b border-white/[0.02] hover:bg-white/[0.02]">
          <td class="px-3 py-2 font-mono font-bold text-slate-200">${esc((a.date||'').substring(0,10))}</td>
          <td class="px-3 py-2 text-slate-300">${esc((a.station||'-').toUpperCase())}</td>
          <td class="px-3 py-2 text-slate-400">${esc(a.shifting||a.shift||'-')}</td>
          <td class="px-3 py-2"><span class="chip ${stColor}">${esc(a.status||'-')}</span></td>
        </tr>`;
      });
      detailHtml+=`</tbody></table></div>`;
      detailEl.innerHTML=detailHtml;
      detailEl.classList.remove('hidden');
    } else {
      detailEl.innerHTML=`<p class="text-xs text-slate-600 text-center py-4">Tidak ada data presensi untuk karyawan ini dalam rentang waktu terpilih.</p>`;
      detailEl.classList.remove('hidden');
    }
  } else {
    detailEl.classList.add('hidden');
  }

  // --- RAW DATA TABLE LOGIC ---
  const pairedData = {}; 
  recs.forEach(r => {
    const pDate = (r.date||'').substring(0,10);
    if (!pDate) return;
    const key = r.opsId + '_' + pDate;
    if (!pairedData[key]) {
      pairedData[key] = {
        opsId: r.opsId, name: r.name || 'Unknown',
        date: pDate, station: (r.station||'Unk').toUpperCase(),
        masuk: null, keluar: null
      };
    }
    const type = (r.tipe||'').toUpperCase();
    if (type === 'MASUK') {
      if (!pairedData[key].masuk || r.created_at < pairedData[key].masuk.created_at) pairedData[key].masuk = r;
    } else if (type === 'KELUAR') {
      if (!pairedData[key].keluar || r.created_at > pairedData[key].keluar.created_at) pairedData[key].keluar = r;
    } else {
      if (!pairedData[key].masuk) pairedData[key].masuk = r;
    }
  });

  const rawList = Object.values(pairedData).sort((a,b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
  window._attRawList = rawList;

  let rawHtml = '';
  rawList.forEach((r, idx) => {
    let tIn = '-', tOut = '-', duration = '-';
    let locHtml = '-';
    let photoHtml = '-';
    let serverTime = '-';
    
    if (r.masuk) {
      const d = new Date(r.masuk.created_at);
      tIn = d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      serverTime = r.masuk.date || serverTime;
      const addr = r.masuk.alamat || (r.masuk.latitude ? `${r.masuk.latitude}, ${r.masuk.longitude}` : '-');
      locHtml = `<div class="text-[9px] text-slate-400 mb-1 w-[150px] lg:w-[200px] truncate" title="${esc(addr)}"><span class="text-accent-cyan font-bold">M:</span> ${esc(addr)}</div>`;
      if(r.masuk.foto_url) photoHtml += `<button onclick="window.showAttPhoto('${esc(r.masuk.foto_url)}')" class="px-2 py-1 bg-accent-cyan/10 text-accent-cyan rounded hover:bg-accent-cyan/20 border border-accent-cyan/30 text-[9px] mr-1 font-bold">M</button>`;
    }
    
    if (r.keluar) {
      const d = new Date(r.keluar.created_at);
      tOut = d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
      serverTime = serverTime === '-' ? (r.keluar.date || serverTime) : serverTime;
      const addr = r.keluar.alamat || (r.keluar.latitude ? `${r.keluar.latitude}, ${r.keluar.longitude}` : '-');
      locHtml = (locHtml !== '-' ? locHtml : '') + `<div class="text-[9px] text-slate-400 w-[150px] lg:w-[200px] truncate" title="${esc(addr)}"><span class="text-accent-pink font-bold">K:</span> ${esc(addr)}</div>`;
      if(photoHtml === '-') photoHtml = '';
      if(r.keluar.foto_url) photoHtml += `<button onclick="window.showAttPhoto('${esc(r.keluar.foto_url)}')" class="px-2 py-1 bg-accent-pink/10 text-accent-pink rounded hover:bg-accent-pink/20 border border-accent-pink/30 text-[9px] font-bold">K</button>`;
    }
    
    if(photoHtml==='-') photoHtml='';
    
    if (r.masuk && r.keluar) {
      const diffStr = (() => {
        const ms = Math.abs(new Date(r.keluar.created_at) - new Date(r.masuk.created_at));
        const hours = Math.floor(ms / 3600000);
        const mins = Math.floor((ms % 3600000) / 60000);
        return `${hours}j ${mins}m`;
      })();
      duration = `<span class="chip border border-accent-blue/30 text-accent-blue bg-accent-blue/10 font-bold">${diffStr}</span>`;
    }
    
    rawHtml += `<tr class="border-b border-white/[0.02] hover:bg-white/[0.05] transition-colors raw-row">
      <td class="px-3 py-2 text-center text-slate-500">${idx+1}</td>
      <td class="px-3 py-2 font-mono text-slate-400">${esc(r.opsId)}</td>
      <td class="px-3 py-2 font-bold text-white">${esc(r.name)}</td>
      <td class="px-3 py-2 text-slate-300"><span class="chip bg-black/30 border border-white/10">${esc(r.station)}</span></td>
      <td class="px-3 py-2 font-mono text-slate-400 text-[9px]">${esc(serverTime)}</td>
      <td class="px-3 py-2 text-center font-bold text-accent-cyan">${tIn}</td>
      <td class="px-3 py-2 text-center font-bold text-accent-pink">${tOut}</td>
      <td class="px-3 py-2 text-center">${duration}</td>
      <td class="px-3 py-2">${locHtml}</td>
      <td class="px-3 py-2 text-center flex justify-center items-center h-full pt-3">${photoHtml||'-'}</td>
    </tr>`;
  });
  
  const rawTbody = document.getElementById('attRawTbody');
  if(rawTbody) rawTbody.innerHTML = rawHtml || '<tr><td colspan="10" class="px-4 py-8 text-center text-slate-600">Tidak ada data mentah untuk filter ini</td></tr>';
}

function rAttendance(){
  const el=document.getElementById('tab-attendance');
  const aa=allAtt();
  const stations=getStations();

  // Initialize calendar to current month
  const now=new Date();
  if(!attCalMonth&&attCalMonth!==0){attCalMonth=now.getMonth();attCalYear=now.getFullYear();}

  // Employee list for sidebar
  const empList=employees.map(e=>({name:e.name,opsId:e.opsId,pos:e.position,count:(attMap[e.opsId]||[]).length})).sort((a,b)=>b.count-a.count);

  el.innerHTML=`
    <div class="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Presensi & Station Analytics</h1>
        <p class="text-xs text-slate-500 font-medium mt-0.5">Kalender interaktif • Analisis hari kerja • ML insights</p>
      </div>
      <div class="flex gap-2">
        <button onclick="attClearRange()" class="text-[10px] font-bold text-slate-500 hover:text-accent-pink transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-accent-pink/30 hover:bg-accent-pink/5">Reset Tanggal</button>
        <button onclick="attClearEmp()" class="text-[10px] font-bold text-slate-500 hover:text-accent-cyan transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-accent-cyan/30 hover:bg-accent-cyan/5">Reset Karyawan</button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 fade-up" style="animation-delay:60ms">
      <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-blue">
        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Records</div>
        <div class="text-2xl font-black text-white mt-1" id="attKpiTotal">${fmtN(aa.length)}</div>
        <div class="text-[9px] text-slate-600 mt-0.5">dalam rentang terpilih</div>
      </div>
      <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-cyan">
        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hari Kerja Unik</div>
        <div class="text-2xl font-black text-white mt-1" id="attKpiDays">${new Set(aa.map(a=>(a.date||'').substring(0,10)).filter(Boolean)).size}</div>
        <div class="text-[9px] text-slate-600 mt-0.5">tanggal tercatat</div>
      </div>
      <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-green">
        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Karyawan Aktif</div>
        <div class="text-2xl font-black text-white mt-1" id="attKpiEmps">${employees.filter(e=>(attMap[e.opsId]||[]).length>0).length}</div>
        <div class="text-[9px] text-slate-600 mt-0.5">memiliki presensi</div>
      </div>
      <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-orange">
        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Station</div>
        <div class="text-2xl font-black text-white mt-1" id="attKpiStations">${stations.length}</div>
        <div class="text-[9px] text-slate-600 mt-0.5">lokasi unik</div>
      </div>
    </div>

    <!-- Main Grid: Calendar + Filters -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up" style="animation-delay:100ms">
      <!-- Calendar Section -->
      <div class="glass rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-2 h-2 rounded-full bg-accent-pink pulse-dot"></span>
          <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kalender Rentang Tanggal</h3>
        </div>
        <div id="attCalendar">${attBuildCalendar(attCalYear,attCalMonth)}</div>
        <div class="mt-3 pt-3 border-t border-white/5">
          <div class="text-[9px] text-slate-600 uppercase font-bold tracking-wider mb-1.5">Rentang Terpilih</div>
          <div id="attRangeLabel" class="text-xs">${attDateFrom&&attDateTo?`<span class="text-accent-pink font-black">${attDateFrom}</span> <span class="text-slate-500">→</span> <span class="text-accent-cyan font-black">${attDateTo}</span>`:`<span class="text-slate-500 text-xs">Klik tanggal pada kalender untuk memilih rentang</span>`}</div>
        </div>
        <!-- Periode buttons -->
        <div class="flex gap-2 mt-3">
          <button id="attPeriode1Btn" onclick="attPeriode(1)" class="flex-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border transition-all ${attActivePeriode===1?'bg-accent-pink/15 text-accent-pink border-accent-pink/30':'text-slate-500 border-white/5 hover:text-accent-pink hover:border-accent-pink/20'}">
            <div>Periode 1</div><div class="text-[8px] font-medium mt-0.5 opacity-70">Tgl 1 – 15</div>
          </button>
          <button id="attPeriode2Btn" onclick="attPeriode(2)" class="flex-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border transition-all ${attActivePeriode===2?'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30':'text-slate-500 border-white/5 hover:text-accent-cyan hover:border-accent-cyan/20'}">
            <div>Periode 2</div><div class="text-[8px] font-medium mt-0.5 opacity-70">Tgl 16 – Akhir Bulan</div>
          </button>
        </div>
      </div>

      <!-- Filters + Quick Stats -->
      <div class="flex flex-col gap-4">
        <!-- Station Filter -->
        <div class="glass rounded-2xl p-4 sm:p-5">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-full bg-accent-orange"></span>
            <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filter Station</h3>
          </div>
          <select class="filter-select w-full text-xs" onchange="attSetStation(this.value)">
            <option value="">Semua Station</option>
            ${stations.map(s=>`<option value="${s}" ${attSelStation===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <!-- Mini Charts -->
        <div class="glass rounded-2xl p-4 sm:p-5 flex-1">
          <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>Status Presensi</h3>
          <div class="h-36"><canvas id="cAttStatus2"></canvas></div>
        </div>
        <div class="glass rounded-2xl p-4 sm:p-5">
          <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-green"></span>Distribusi Shift</h3>
          <div class="h-36"><canvas id="cAttShift2"></canvas></div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up" style="animation-delay:140ms">
      <div class="glass rounded-2xl p-4 sm:p-5">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>Distribusi Station</h3>
        <div class="h-52"><canvas id="cAttStation2"></canvas></div>
      </div>
      <div id="attTrendWrap" class="glass rounded-2xl p-4 sm:p-5">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>Tren Harian + DL Forecast</h3>
        <p class="text-[9px] text-slate-600 mb-2">Moving Average • Exp.Smoothing • Neural Time Series</p>
        <div class="h-48"><canvas id="cAttTrend2"></canvas></div>
      </div>
    </div>

    <!-- Employee Work Days Table -->
    <div class="glass rounded-2xl overflow-hidden fade-up" style="animation-delay:170ms">
      <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>Hari Kerja per Karyawan
          <span id="attWorkCount" class="chip chip-blue">${employees.length} karyawan</span>
        </h3>
        <div class="flex items-center gap-2 sm:ml-auto">
          <div class="relative">
            <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Cari di tabel..." class="search-input text-[11px] py-2 w-full sm:w-56" oninput="debouncedAttFilter(this.value)">
          </div>
          <button onclick="attDownloadExcel()" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-500/20 hover:border-emerald-500/40 whitespace-nowrap" title="Download Excel">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Excel
          </button>
        </div>
      </div>
      <div class="table-wrap overflow-x-auto" style="max-height:420px;overflow-y:auto">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-bas-900/95 backdrop-blur z-10"><tr class="border-b border-white/5 text-left">
            <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-[9px] sort-btn" data-sort-table="attWorkTbody" data-sort-col="0" onclick="sortTable('attWorkTbody',0)">Nama</th>
            <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-[9px]">OPS ID</th>
            <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-[9px] text-center sort-btn" data-sort-table="attWorkTbody" data-sort-col="2" onclick="sortTable('attWorkTbody',2,'number')">Hari</th>
            <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-[9px] hidden md:table-cell">Station</th>
            <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-[9px] hidden lg:table-cell">Visual</th>
          </tr></thead>
          <tbody id="attWorkTbody"></tbody>
        </table>
      </div>
    </div>

    <!-- Detail Panel (employee day-by-day) -->
    <div id="attDetailPanel" class="glass rounded-2xl p-4 sm:p-5 border border-accent-pink/10 fade-up hidden" style="animation-delay:200ms"></div>

    <!-- Raw Data Table -->
    <div class="glass rounded-2xl overflow-hidden fade-up mt-4" style="animation-delay:230ms">
      <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-accent-orange pulse-dot"></span>Data Kehadiran Harian / Raw Data
        </h3>
        <div class="flex items-center gap-2">
          <div class="relative w-full sm:w-64">
            <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" placeholder="Cari data mentah..." class="search-input text-[11px] py-1.5 px-8 w-full bg-white/5 border border-white/10 rounded-lg text-white font-medium focus:border-accent-cyan focus:bg-white/10 outline-none transition-all" oninput="window.attFilterRawTable(this.value)">
          </div>
        </div>
      </div>
      <div class="table-wrap overflow-x-auto" style="max-height:500px;overflow-y:auto">
        <table class="w-full text-[10px] whitespace-nowrap">
          <thead class="sticky top-0 bg-bas-900/95 backdrop-blur z-10 shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
            <tr class="border-b border-white/5 text-left text-slate-500 uppercase font-bold tracking-wider">
              <th class="px-3 py-2.5 w-10 text-center">No</th>
              <th class="px-3 py-2.5">OPS ID</th>
              <th class="px-3 py-2.5">Nama</th>
              <th class="px-3 py-2.5">Station</th>
              <th class="px-3 py-2.5">Waktu Server</th>
              <th class="px-3 py-2.5 text-center">Waktu Masuk</th>
              <th class="px-3 py-2.5 text-center">Waktu Keluar</th>
              <th class="px-3 py-2.5 text-center">Total Jam</th>
              <th class="px-3 py-2.5">Koordinat / Alamat</th>
              <th class="px-3 py-2.5 text-center">Foto</th>
            </tr>
          </thead>
          <tbody id="attRawTbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // Initial data render
  setTimeout(()=>attRefreshData(),50);
}

function attPeriode(p){
  const y=attCalYear, m=attCalMonth;
  if(p===1){
    attDateFrom=`${y}-${String(m+1).padStart(2,'0')}-01`;
    attDateTo=`${y}-${String(m+1).padStart(2,'0')}-15`;
  } else {
    const lastDay=new Date(y,m+1,0).getDate();
    attDateFrom=`${y}-${String(m+1).padStart(2,'0')}-16`;
    attDateTo=`${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  }
  attActivePeriode=p;
  attCalPicking='from';
  document.getElementById('attCalendar').innerHTML=attBuildCalendar(attCalYear,attCalMonth);
  attUpdateRangeLabel();
  attRefreshData();
  // Update button styles
  const b1=document.getElementById('attPeriode1Btn'),b2=document.getElementById('attPeriode2Btn');
  if(b1){ b1.className=b1.className.replace(/bg-accent-pink\/15 text-accent-pink border-accent-pink\/30|text-slate-500 border-white\/5 hover:text-accent-pink hover:border-accent-pink\/20/g, p===1?'bg-accent-pink/15 text-accent-pink border-accent-pink/30':'text-slate-500 border-white/5 hover:text-accent-pink hover:border-accent-pink/20'); }
  if(b2){ b2.className=b2.className.replace(/bg-accent-cyan\/15 text-accent-cyan border-accent-cyan\/30|text-slate-500 border-white\/5 hover:text-accent-cyan hover:border-accent-cyan\/20/g, p===2?'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30':'text-slate-500 border-white/5 hover:text-accent-cyan hover:border-accent-cyan/20'); }
}
function attFilterWorkTable(q){
  q=q.toLowerCase();
  document.querySelectorAll('#attWorkTbody tr').forEach(r=>{
    r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';
  });
}

window.attFilterRawTable = function(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#attRawTbody .raw-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};

window.showAttPhoto = function(url) {
  let modal = document.getElementById('attGlobalPhotoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'attGlobalPhotoModal';
    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300';
    modal.innerHTML = `
      <div class="relative max-w-2xl w-full max-h-[90vh] bg-bas-900 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,245,212,0.15)] border border-white/10 flex flex-col transform scale-95 transition-transform duration-300" id="attGlobalPhotoContent">
        <div class="absolute top-4 right-4 z-10 flex gap-2">
          <a id="attGlobalPhotoLink" href="" target="_blank" class="w-10 h-10 bg-black/50 hover:bg-accent-cyan/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-105">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
          <button onclick="document.getElementById('attGlobalPhotoModal').style.opacity='0'; document.getElementById('attGlobalPhotoModal').style.pointerEvents='none'; setTimeout(()=>document.getElementById('attGlobalPhotoContent').style.transform='scale(0.95)', 50);" class="w-10 h-10 bg-black/50 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/20 hover:scale-105">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <img id="attGlobalPhotoImg" src="" class="w-full h-auto max-h-[90vh] object-contain bg-black/50" />
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('attGlobalPhotoImg').src = url;
  document.getElementById('attGlobalPhotoLink').href = url;
  
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.getElementById('attGlobalPhotoContent').style.transform = 'scale(1)';
  }, 10);
};

function attDownloadExcel(){
  // Gather empWork data (same logic as attRefreshData)
  const empWork=employees.map(e=>{
    const myAtts=(attMap[e.opsId]||[]).filter(a=>{
      if(attDateFrom&&(a.date||'')<attDateFrom) return false;
      if(attDateTo&&(a.date||'').substring(0,10)>attDateTo) return false;
      if(attSelStation&&(a.station||'').toUpperCase()!==attSelStation) return false;
      return true;
    });
    const days=new Set(myAtts.map(a=>(a.date||'').substring(0,10)).filter(Boolean));
    const stns=new Set(myAtts.map(a=>(a.station||'').toUpperCase()).filter(Boolean));
    return {name:e.name,opsId:e.opsId,pos:e.position,days:days.size,stations:[...stns],atts:myAtts};
  }).filter(e=>e.atts.length>0).sort((a,b)=>b.days-a.days);

  if(!empWork.length){ showToast('Tidak ada data untuk diunduh.','warning'); return; }

  const rangeLabel=(attDateFrom||'All')+' s/d '+(attDateTo||'All');

  // Build HTML table that Excel reads with proper column separation
  let html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Hari Kerja</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>td,th{mso-number-format:\\@;padding:4px 8px;border:1px solid #ccc;font-family:Calibri,sans-serif;font-size:11pt;}
th{background:#217346;color:#fff;font-weight:bold;text-align:center;}
td{vertical-align:middle;}</style></head><body>
<table><thead><tr><th>No</th><th>Nama</th><th>OPS ID</th><th>Posisi</th><th>Hari Kerja</th><th>Station</th><th>Periode</th></tr></thead><tbody>`;

  empWork.forEach((e,i)=>{
    html+=`<tr>
<td style="text-align:center">${i+1}</td>
<td>${esc(e.name)}</td>
<td>${esc(e.opsId)}</td>
<td>${esc(e.pos)}</td>
<td style="text-align:center">${e.days}</td>
<td>${esc(e.stations.join(', '))}</td>
<td>${esc(rangeLabel)}</td></tr>`;
  });
  html+=`</tbody></table></body></html>`;

  // Download as .xls
  const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const fname='Hari_Kerja_'+(attDateFrom||'all')+'_'+(attDateTo||'all')+'.xls';
  a.href=url; a.download=fname; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
//  PAYROLL CALENDAR STATE & HELPERS
// ═══════════════════════════════════════════════════════════════
let payDateFrom='', payDateTo='', payCalMonth=null, payCalYear=null, payCalPicking='from', payActivePeriode=0;

function payParseAllPeriods(){
  // Get all unique months (YYYY-MM) that have payroll data
  const months=new Set();
  allPay().forEach(p=>{
    if(p.period){
      // Try to parse period to YYYY-MM format
      const per=String(p.period).trim();
      // If already in YYYY-MM format
      if(/^\d{4}-\d{2}$/.test(per)){ months.add(per); return; }
      // If month name + year like "Januari 2024"
      const mNames={'januari':'01','februari':'02','maret':'03','april':'04','mei':'05','juni':'06','juli':'07','agustus':'08','september':'09','oktober':'10','november':'11','desember':'12',
        'january':'01','february':'02','march':'03','april':'04','may':'05','june':'06','july':'07','august':'08','september':'09','october':'10','november':'11','december':'12',
        'jan':'01','feb':'02','mar':'03','apr':'04','mei':'05','jun':'06','jul':'07','agu':'08','aug':'08','sep':'09','okt':'10','oct':'10','nov':'11','des':'12','dec':'12'};
      const parts=per.toLowerCase().split(/[\s\-\/]+/);
      for(let i=0;i<parts.length-1;i++){
        if(mNames[parts[i]]&&/^\d{4}$/.test(parts[i+1])){ months.add(parts[i+1]+'-'+mNames[parts[i]]); break; }
        if(/^\d{4}$/.test(parts[i])&&mNames[parts[i+1]]){ months.add(parts[i]+'-'+mNames[parts[i+1]]); break; }
      }
      // If numeric like "01/2024" or "1-2024"
      const numMatch=per.match(/^(\d{1,2})[\/-](\d{4})$/);
      if(numMatch) months.add(numMatch[2]+'-'+numMatch[1].padStart(2,'0'));
      const numMatch2=per.match(/^(\d{4})[\/-](\d{1,2})$/);
      if(numMatch2) months.add(numMatch2[1]+'-'+numMatch2[2].padStart(2,'0'));
    }
  });
  return months;
}

function payPeriodMatchesRange(period, fromDate, toDate){
  // Check if a payslip period falls within the selected date range
  if(!period) return false;
  const per=String(period).trim();
  let ym='';
  if(/^\d{4}-\d{2}$/.test(per)) ym=per;
  else {
    const mNames={'januari':'01','februari':'02','maret':'03','april':'04','mei':'05','juni':'06','juli':'07','agustus':'08','september':'09','oktober':'10','november':'11','desember':'12',
      'january':'01','february':'02','march':'03','april':'04','may':'05','june':'06','july':'07','august':'08','september':'09','october':'10','november':'11','december':'12',
      'jan':'01','feb':'02','mar':'03','apr':'04','mei':'05','jun':'06','jul':'07','agu':'08','aug':'08','sep':'09','okt':'10','oct':'10','nov':'11','des':'12','dec':'12'};
    const parts=per.toLowerCase().split(/[\s\-\/]+/);
    for(let i=0;i<parts.length-1;i++){
      if(mNames[parts[i]]&&/^\d{4}$/.test(parts[i+1])){ ym=parts[i+1]+'-'+mNames[parts[i]]; break; }
      if(/^\d{4}$/.test(parts[i])&&mNames[parts[i+1]]){ ym=parts[i]+'-'+mNames[parts[i+1]]; break; }
    }
    const nm=per.match(/^(\d{1,2})[\/-](\d{4})$/);
    if(nm) ym=nm[2]+'-'+nm[1].padStart(2,'0');
    const nm2=per.match(/^(\d{4})[\/-](\d{1,2})$/);
    if(nm2) ym=nm2[1]+'-'+nm2[2].padStart(2,'0');
  }
  if(!ym) return false;
  // The period's month spans from YYYY-MM-01 to YYYY-MM-last
  const pStart=ym+'-01';
  const y=parseInt(ym.split('-')[0]), m=parseInt(ym.split('-')[1])-1;
  const lastDay=new Date(y,m+1,0).getDate();
  const pEnd=ym+'-'+String(lastDay).padStart(2,'0');
  // Check overlap: period range overlaps with selected range
  if(fromDate && pEnd < fromDate) return false;
  if(toDate && pStart > toDate) return false;
  return true;
}

function payFilteredRecords(){
  let recs=allPay();
  if(payDateFrom||payDateTo){
    recs=recs.filter(p=>payPeriodMatchesRange(p.period, payDateFrom, payDateTo));
  }
  return recs;
}

function payBuildCalendar(year,month){
  const allPeriods=payParseAllPeriods();
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const startDay=(first.getDay()+6)%7;
  const daysInMonth=last.getDate();
  const today=new Date(); today.setHours(0,0,0,0);
  const mNames=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const dNames=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const thisYM=`${year}-${String(month+1).padStart(2,'0')}`;
  const hasMonthData=allPeriods.has(thisYM);

  let html=`<div class="select-none">`;
  html+=`<div class="flex items-center justify-between mb-3">
    <button onclick="payNavMonth(-1)" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
    </button>
    <div class="text-center">
      <span class="text-sm font-black text-white tracking-tight">${mNames[month]}</span>
      <span class="text-sm font-bold text-slate-500 ml-1">${year}</span>
      ${hasMonthData?'<span class="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse"></span>':''}
    </div>
    <button onclick="payNavMonth(1)" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>`;
  html+=`<div class="grid grid-cols-7 gap-0.5 mb-1">${dNames.map(d=>`<div class="text-center text-[9px] font-bold text-slate-600 uppercase py-1">${d}</div>`).join('')}</div>`;
  html+=`<div class="grid grid-cols-7 gap-0.5">`;
  for(let i=0;i<startDay;i++) html+=`<div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===d;
    const isFrom=payDateFrom===ds;
    const isTo=payDateTo===ds;
    const inRange=payDateFrom&&payDateTo&&ds>=payDateFrom&&ds<=payDateTo;
    const isEndpoint=isFrom||isTo;
    let cls='relative flex flex-col items-center justify-center h-9 rounded-lg cursor-pointer transition-all text-xs font-bold ';
    if(isEndpoint) cls+='bg-accent-green text-white shadow-lg shadow-accent-green/30 ring-2 ring-accent-green/50 z-10 ';
    else if(inRange) cls+='bg-accent-green/15 text-accent-green ';
    else if(hasMonthData) cls+='text-white hover:bg-white/10 ';
    else cls+='text-slate-600 hover:bg-white/5 ';
    html+=`<div class="${cls}" onclick="payPickDate('${ds}')">
      <span>${d}</span>
      ${hasMonthData&&!isEndpoint?`<span class="absolute bottom-1 w-1 h-1 rounded-full ${inRange?'bg-accent-green':'bg-accent-cyan'}"></span>`:''}
      ${isToday&&!isEndpoint?`<span class="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-accent-orange pulse-dot"></span>`:''}
    </div>`;
  }
  html+=`</div></div>`;
  return html;
}

function payNavMonth(dir){
  payCalMonth+=dir;
  if(payCalMonth>11){payCalMonth=0;payCalYear++;}
  if(payCalMonth<0){payCalMonth=11;payCalYear--;}
  document.getElementById('payCalendar').innerHTML=payBuildCalendar(payCalYear,payCalMonth);
}
function payPickDate(ds){
  payActivePeriode=0;
  if(payCalPicking==='from'){
    payDateFrom=ds; payDateTo=''; payCalPicking='to';
  } else {
    if(ds<payDateFrom){payDateFrom=ds;payDateTo='';payCalPicking='to';}
    else{payDateTo=ds;payCalPicking='from';}
  }
  document.getElementById('payCalendar').innerHTML=payBuildCalendar(payCalYear,payCalMonth);
  payUpdateRangeLabel();
  payRefreshData();
}
function payClearRange(){
  payActivePeriode=0;
  payDateFrom='';payDateTo='';payCalPicking='from';
  document.getElementById('payCalendar').innerHTML=payBuildCalendar(payCalYear,payCalMonth);
  payUpdateRangeLabel();
  payRefreshData();
}
function payUpdateRangeLabel(){
  const lbl=document.getElementById('payRangeLabel');
  if(!lbl)return;
  if(payDateFrom&&payDateTo){
    const f=new Date(payDateFrom), t=new Date(payDateTo);
    const diffDays=Math.ceil((t-f)/(1000*60*60*24))+1;
    lbl.innerHTML=`<span class="text-accent-green font-black">${payDateFrom}</span> <span class="text-slate-500">→</span> <span class="text-accent-cyan font-black">${payDateTo}</span> <span class="text-slate-500 ml-2">(${diffDays} hari)</span>`;
  } else if(payDateFrom){
    lbl.innerHTML=`<span class="text-accent-green font-black">${payDateFrom}</span> <span class="text-slate-500 animate-pulse">→ Pilih tanggal akhir...</span>`;
  } else {
    lbl.innerHTML=`<span class="text-slate-500 text-xs">Klik tanggal pada kalender untuk memilih rentang periode</span>`;
  }
}
function payPeriode(p){
  const y=payCalYear, m=payCalMonth;
  if(p===1){
    payDateFrom=`${y}-${String(m+1).padStart(2,'0')}-01`;
    payDateTo=`${y}-${String(m+1).padStart(2,'0')}-15`;
  } else {
    const lastDay=new Date(y,m+1,0).getDate();
    payDateFrom=`${y}-${String(m+1).padStart(2,'0')}-16`;
    payDateTo=`${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  }
  payActivePeriode=p;
  payCalPicking='from';
  document.getElementById('payCalendar').innerHTML=payBuildCalendar(payCalYear,payCalMonth);
  payUpdateRangeLabel();
  payRefreshData();
  const b1=document.getElementById('payPeriode1Btn'),b2=document.getElementById('payPeriode2Btn');
  if(b1){ b1.className=b1.className.replace(/bg-accent-green\/15 text-accent-green border-accent-green\/30|text-slate-500 border-white\/5 hover:text-accent-green hover:border-accent-green\/20/g, p===1?'bg-accent-green/15 text-accent-green border-accent-green/30':'text-slate-500 border-white/5 hover:text-accent-green hover:border-accent-green/20'); }
  if(b2){ b2.className=b2.className.replace(/bg-accent-cyan\/15 text-accent-cyan border-accent-cyan\/30|text-slate-500 border-white\/5 hover:text-accent-cyan hover:border-accent-cyan\/20/g, p===2?'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30':'text-slate-500 border-white/5 hover:text-accent-cyan hover:border-accent-cyan/20'); }
}
function paySelectFullMonth(){
  const y=payCalYear, m=payCalMonth;
  const lastDay=new Date(y,m+1,0).getDate();
  payDateFrom=`${y}-${String(m+1).padStart(2,'0')}-01`;
  payDateTo=`${y}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  payActivePeriode=0;
  payCalPicking='from';
  document.getElementById('payCalendar').innerHTML=payBuildCalendar(payCalYear,payCalMonth);
  payUpdateRangeLabel();
  payRefreshData();
}

function payRefreshData(){
  const recs=payFilteredRecords();
  const salaries=recs.map(p=>p.totalDibayarkan||0).filter(s=>s>0);
  const ss=salaries.length>1?ML.stats(salaries):{mean:0,median:0,std:0,n:0,iqr:0,skewness:0,kurtosis:0};
  const attCounts=employees.map(e=>(attMap[e.opsId]||[]).length);
  const payTotals=employees.map(e=>(payMap[e.opsId]||[]).filter(p=>recs.includes(p)).reduce((s,p)=>s+(p.totalDibayarkan||0),0));
  const totalPay=salaries.reduce((a,b)=>a+b,0);
  const corr=attCounts.length>1?ML.corr(attCounts,payTotals):0;
  const salAnom=salaries.length>2?ML.anomaly(salaries):[];
  const anomCount=salAnom.filter(a=>a.anom).length;

  // Update KPI values
  const kpiAvg=document.getElementById('payKpiAvg');
  const kpiMedian=document.getElementById('payKpiMedian');
  const kpiStd=document.getElementById('payKpiStd');
  const kpiCorr=document.getElementById('payKpiCorr');
  const kpiAnom=document.getElementById('payKpiAnom');
  const kpiSlips=document.getElementById('payKpiSlips');
  const kpiTotal=document.getElementById('payKpiTotal');
  if(kpiAvg) kpiAvg.textContent=fmt(ss.mean);
  if(kpiMedian) kpiMedian.textContent=fmt(ss.median);
  if(kpiStd) kpiStd.textContent=fmt(ss.std);
  if(kpiCorr) kpiCorr.textContent=corr.toFixed(3);
  if(kpiAnom) kpiAnom.textContent=anomCount+' slip';
  if(kpiSlips) kpiSlips.textContent=fmtN(recs.length);
  if(kpiTotal) kpiTotal.textContent=fmt(totalPay);

  // Update histogram
  if(salaries.length){
    const step=500000; const bins={};
    salaries.forEach(s=>{const b=Math.floor(s/step)*step;const l=fmt(b);bins[l]=(bins[l]||0)+1;});
    mkChart('cSalHist',{type:'bar',data:{labels:Object.keys(bins),datasets:[{data:Object.values(bins),backgroundColor:C.pkB,borderColor:C.pk,borderWidth:1,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{font:{size:8}}},x:{ticks:{font:{size:7},maxRotation:45}}}}});
  }
  // Update status chart
  const payStatusDist={}; recs.forEach(p=>{payStatusDist[p.status||'Unknown']=(payStatusDist[p.status||'Unknown']||0)+1;});
  mkChart('cPaySt',{type:'doughnut',data:{labels:Object.keys(payStatusDist),datasets:[{data:Object.values(payStatusDist),backgroundColor:C.multi,borderWidth:0,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:9,weight:'600'}}}}}});

  // Update table
  const empPay=employees.map(e=>{const pays=(payMap[e.opsId]||[]).filter(p=>recs.includes(p));return{name:e.name,opsId:e.opsId,pos:e.position,total:pays.reduce((s,p)=>s+(p.totalDibayarkan||0),0),count:pays.length};}).sort((a,b)=>b.total-a.total);
  renderPayTable(empPay.slice(0,15));

  // Update station rates
  const srEl=document.getElementById('payStationRates');
  if(srEl){
    const stRates2={};
    recs.forEach(p=>{
      const st=(p.hubDc||p.station||'').toUpperCase().trim();
      if(!st) return;
      if(!stRates2[st]) stRates2[st]={rates:[],totalPay:0,slips:0,hk:0,emps:new Set()};
      const r=parseFloat(p.rate)||0;
      if(r>0) stRates2[st].rates.push(r);
      stRates2[st].totalPay+=(p.totalDibayarkan||0);
      stRates2[st].slips++;
      stRates2[st].hk+=(parseFloat(p.hk)||0);
      if(p.opsId) stRates2[st].emps.add(p.opsId);
    });
    const stArr2=Object.entries(stRates2).map(([n,d])=>({
      name:n,avgRate:d.rates.length?d.rates.reduce((a,b)=>a+b,0)/d.rates.length:0,
      totalPay:d.totalPay,slips:d.slips,hk:d.hk,empCount:d.emps.size
    })).sort((a,b)=>b.totalPay-a.totalPay);
    const esc2=s=>String(s||'-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    srEl.innerHTML=stArr2.length?stArr2.map(s=>`
      <div class="bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-4 border border-white/5 transition-all">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black text-white uppercase tracking-wider">${esc2(s.name)}</span>
          <span class="text-[8px] font-bold text-slate-600">${s.empCount} org</span>
        </div>
        <div class="text-lg font-black text-accent-green">${fmt(Math.round(s.avgRate))}</div>
        <div class="text-[8px] text-slate-500 font-bold uppercase">Rate / Hari</div>
        <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
          <div><div class="text-[9px] font-black text-white">${fmtN(s.slips)}</div><div class="text-[7px] text-slate-600">Slip</div></div>
          <div><div class="text-[9px] font-black text-white">${fmtN(Math.round(s.hk))}</div><div class="text-[7px] text-slate-600">Tot HK</div></div>
          <div><div class="text-[9px] font-black text-accent-cyan">${fmt(s.totalPay)}</div><div class="text-[7px] text-slate-600">Total</div></div>
        </div>
      </div>
    `).join(''):'<div class="col-span-full text-xs text-slate-500 text-center py-6">Tidak ada data rate station dalam rentang terpilih</div>';
  }
}

// ═══════════════════════════════════════════════════════════════
//  RENDER: PAYROLL
// ═══════════════════════════════════════════════════════════════
function rPayroll(){
  const el=document.getElementById('tab-payroll');
  const now=new Date();
  if(!payCalMonth&&payCalMonth!==0){payCalMonth=now.getMonth();payCalYear=now.getFullYear();}
  const ap=payFilteredRecords();
  const salaries=ap.map(p=>p.totalDibayarkan||0).filter(s=>s>0);
  const ss=salaries.length>1?ML.stats(salaries):{mean:0,median:0,std:0,n:0,iqr:0,skewness:0,kurtosis:0,q1:0,q3:0};
  const attCounts=employees.map(e=>(attMap[e.opsId]||[]).length);
  const payTotals=employees.map(e=>(payMap[e.opsId]||[]).filter(p=>ap.includes(p)).reduce((s,p)=>s+(p.totalDibayarkan||0),0));
  const totalPay=salaries.reduce((a,b)=>a+b,0);
  const corr=attCounts.length>1?ML.corr(attCounts,payTotals):0;
  const payStatusDist={}; ap.forEach(p=>{payStatusDist[p.status||'Unknown']=(payStatusDist[p.status||'Unknown']||0)+1;});
  const empPay=employees.map(e=>{const pays=(payMap[e.opsId]||[]).filter(p=>ap.includes(p));return{name:e.name,opsId:e.opsId,pos:e.position,total:pays.reduce((s,p)=>s+(p.totalDibayarkan||0),0),count:pays.length};}).sort((a,b)=>b.total-a.total);
  // DL: Polynomial regression for salary prediction
  const hkSal=ap.filter(p=>p.hk>0&&p.totalDibayarkan>0).map(p=>[p.hk,p.totalDibayarkan]);
  const polyR=hkSal.length>4?ML.polyReg(hkSal,2):{r2:0,predict:null};
  // DL: Anomaly detection on salaries
  const salAnom=salaries.length>2?ML.anomaly(salaries):[];
  const anomCount=salAnom.filter(a=>a.anom).length;

  // ── Station daily rates ──
  const stationRates={};
  ap.forEach(p=>{
    const st=(p.hubDc||p.station||'').toUpperCase().trim();
    if(!st) return;
    if(!stationRates[st]) stationRates[st]={rates:[],totalPay:0,slips:0,hk:0,emps:new Set()};
    const r=parseFloat(p.rate)||0;
    if(r>0) stationRates[st].rates.push(r);
    stationRates[st].totalPay+=(p.totalDibayarkan||0);
    stationRates[st].slips++;
    stationRates[st].hk+=(parseFloat(p.hk)||0);
    if(p.opsId) stationRates[st].emps.add(p.opsId);
  });
  const stArr=Object.entries(stationRates).map(([n,d])=>({
    name:n,avgRate:d.rates.length?d.rates.reduce((a,b)=>a+b,0)/d.rates.length:0,
    totalPay:d.totalPay,slips:d.slips,hk:d.hk,empCount:d.emps.size
  })).sort((a,b)=>b.totalPay-a.totalPay);

  // ── Bank validation (all payslips, not filtered) ──
  const BANK_DIGITS={'BCA':[10,10],'BNI':[10,16],'BRI':[15,15],'MANDIRI':[13,13],'SEABANK':[12,12],'BSI':[10,10],'ALLO BANK':[16,16],'JAGO':[12,16],'BPD SULUT':[10,15],'DANA':[10,16],'OVO':[10,16],'GOPAY':[10,16]};
  const bankIssues=[];
  employees.forEach(e=>{
    const pays=payMap[e.opsId]||[];
    if(!pays.length) return;
    const latest=pays[pays.length-1];
    const rek=String(latest.rekening||'').trim();
    const bank=String(latest.bank||'').toUpperCase().trim();
    const namaSlip=String(latest.name||'').trim();
    const atasNama=String(latest.atasNama||'').trim();
    const issues=[];
    const digitsOnly=rek.replace(/[\s\-\.]/g,'');
    if(rek&&/[a-zA-Z]/.test(digitsOnly)) issues.push({icon:'⚠️',desc:'Rekening mengandung huruf/simbol',cls:'text-accent-orange'});
    if(bank&&BANK_DIGITS[bank]&&digitsOnly.length>0){
      const[mn,mx]=BANK_DIGITS[bank];
      if(digitsOnly.length<mn||digitsOnly.length>mx) issues.push({icon:'🔢',desc:bank+' harus '+(mn===mx?mn:mn+'-'+mx)+' digit, terdeteksi '+digitsOnly.length,cls:'text-accent-pink'});
    }
    if(namaSlip&&atasNama){
      const n1=namaSlip.toUpperCase().replace(/\s+/g,' ').trim();
      const n2=atasNama.toUpperCase().replace(/\s+/g,' ').trim();
      if(n1!==n2&&!n1.includes(n2)&&!n2.includes(n1)) issues.push({icon:'👤',desc:'Nama: "'+namaSlip+'" ≠ A/N: "'+atasNama+'"',cls:'text-accent-cyan'});
    }
    if(issues.length) bankIssues.push({name:e.name,opsId:e.opsId,rek,bank,atasNama,issues});
  });

  el.innerHTML=`
    <div class="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Payroll Analytics</h1>
        <p class="text-xs text-slate-500 font-medium mt-0.5">Kalender interaktif • Deep Learning Statistics • Neural Payroll Analysis</p>
      </div>
      <div class="flex gap-2">
        <button onclick="payClearRange()" class="text-[10px] font-bold text-slate-500 hover:text-accent-green transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-accent-green/30 hover:bg-accent-green/5">Reset Tanggal</button>
      </div>
    </div>

    <!-- Calendar + KPI Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up" style="animation-delay:60ms">
      <!-- Calendar Section -->
      <div class="glass rounded-2xl p-4 sm:p-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-2 h-2 rounded-full bg-accent-green pulse-dot"></span>
          <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kalender Rentang Periode</h3>
        </div>
        <div id="payCalendar">${payBuildCalendar(payCalYear,payCalMonth)}</div>
        <div class="mt-3 pt-3 border-t border-white/5">
          <div class="text-[9px] text-slate-600 uppercase font-bold tracking-wider mb-1.5">Rentang Terpilih</div>
          <div id="payRangeLabel" class="text-xs">${payDateFrom&&payDateTo?`<span class="text-accent-green font-black">${payDateFrom}</span> <span class="text-slate-500">→</span> <span class="text-accent-cyan font-black">${payDateTo}</span>`:`<span class="text-slate-500 text-xs">Klik tanggal pada kalender untuk memilih rentang periode</span>`}</div>
        </div>
        <!-- Periode buttons -->
        <div class="flex gap-2 mt-3">
          <button id="payPeriode1Btn" onclick="payPeriode(1)" class="flex-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border transition-all ${payActivePeriode===1?'bg-accent-green/15 text-accent-green border-accent-green/30':'text-slate-500 border-white/5 hover:text-accent-green hover:border-accent-green/20'}">
            <div>Periode 1</div><div class="text-[8px] font-medium mt-0.5 opacity-70">Tgl 1 – 15</div>
          </button>
          <button id="payPeriode2Btn" onclick="payPeriode(2)" class="flex-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border transition-all ${payActivePeriode===2?'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30':'text-slate-500 border-white/5 hover:text-accent-cyan hover:border-accent-cyan/20'}">
            <div>Periode 2</div><div class="text-[8px] font-medium mt-0.5 opacity-70">Tgl 16 – Akhir Bulan</div>
          </button>
          <button onclick="paySelectFullMonth()" class="flex-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl border transition-all text-slate-500 border-white/5 hover:text-accent-orange hover:border-accent-orange/20">
            <div>Full Bulan</div><div class="text-[8px] font-medium mt-0.5 opacity-70">Tgl 1 – Akhir</div>
          </button>
        </div>
      </div>

      <!-- KPI Cards + Quick Stats -->
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-green">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Payroll</div>
            <div class="text-lg font-black text-white mt-1" id="payKpiTotal">${fmt(totalPay)}</div>
            <div class="text-[9px] text-slate-600 mt-0.5">dalam rentang terpilih</div>
          </div>
          <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-cyan">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Slip</div>
            <div class="text-lg font-black text-white mt-1" id="payKpiSlips">${fmtN(ap.length)}</div>
            <div class="text-[9px] text-slate-600 mt-0.5">slip gaji</div>
          </div>
          <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-pink">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Avg Gaji</div>
            <div class="text-lg font-black text-white mt-1" id="payKpiAvg">${fmt(ss.mean)}</div>
            <div class="text-[9px] text-slate-600 mt-0.5">per slip gaji</div>
          </div>
          <div class="stat-card glass rounded-2xl p-4 border-l-2 border-accent-blue">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Median</div>
            <div class="text-lg font-black text-white mt-1" id="payKpiMedian">${fmt(ss.median)}</div>
            <div class="text-[9px] text-slate-600 mt-0.5">nilai tengah</div>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="stat-card glass rounded-2xl p-3 border-l-2 border-accent-orange">
            <div class="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Std Dev</div>
            <div class="text-sm font-black text-white mt-1" id="payKpiStd">${fmt(ss.std)}</div>
          </div>
          <div class="stat-card glass rounded-2xl p-3 border-l-2 border-accent-green">
            <div class="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Korelasi HK↔Gaji</div>
            <div class="text-sm font-black text-white mt-1" id="payKpiCorr">${corr.toFixed(3)}</div>
          </div>
          <div class="stat-card glass rounded-2xl p-3 border-l-2 border-accent-cyan">
            <div class="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Anomali DL</div>
            <div class="text-sm font-black text-white mt-1" id="payKpiAnom">${anomCount} slip</div>
          </div>
        </div>
        <!-- Mini Status Chart -->
        <div class="glass rounded-2xl p-4 sm:p-5 flex-1">
          <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-green"></span>Status Pembayaran</h3>
          <div class="h-36"><canvas id="cPaySt"></canvas></div>
        </div>
      </div>
    </div>

    <!-- DL Salary Insights -->
    <div class="glass rounded-2xl p-4 sm:p-5 border border-accent-blue/10 fade-up" style="animation-delay:100ms">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-7 h-7 bg-gradient-to-br from-accent-blue to-accent-cyan rounded-lg flex items-center justify-center text-white text-[10px] font-black">DL</div>
        <div><h3 class="text-[10px] font-bold text-white uppercase tracking-wider">Deep Learning Salary Insights</h3><p class="text-[8px] text-slate-500">Advanced statistical distribution • Skewness • Kurtosis</p></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
        <div class="bg-white/[0.02] rounded-xl p-3"><div class="text-sm font-black text-white">${fmtN(ss.n)}</div><div class="text-[8px] text-slate-500 font-bold">N Samples</div></div>
        <div class="bg-white/[0.02] rounded-xl p-3"><div class="text-sm font-black text-accent-cyan">${fmt(ss.iqr)}</div><div class="text-[8px] text-slate-500 font-bold">IQR</div></div>
        <div class="bg-white/[0.02] rounded-xl p-3"><div class="text-sm font-black text-accent-orange">${ss.skewness.toFixed(3)}</div><div class="text-[8px] text-slate-500 font-bold">Skewness</div></div>
        <div class="bg-white/[0.02] rounded-xl p-3"><div class="text-sm font-black text-accent-pink">${ss.kurtosis.toFixed(3)}</div><div class="text-[8px] text-slate-500 font-bold">Kurtosis</div></div>
        <div class="bg-white/[0.02] rounded-xl p-3"><div class="text-sm font-black text-accent-green">${polyR.predict?'R²='+polyR.r2.toFixed(3):'N/A'}</div><div class="text-[8px] text-slate-500 font-bold">Poly Reg</div></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 fade-up" style="animation-delay:130ms">
      <div class="glass rounded-2xl p-4 sm:p-5"><h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>Histogram Gaji</h3><div class="h-52"><canvas id="cSalHist"></canvas></div></div>
      <div class="glass rounded-2xl p-4 sm:p-5">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>Scatter: HK vs Total Gaji</h3>
        <p class="text-[9px] text-slate-600 font-medium mb-3">Linear (r=${corr.toFixed(3)}) • Polynomial (R²=${polyR.r2?.toFixed(3)||'N/A'})</p>
        <div class="h-52"><canvas id="cPayCorr"></canvas></div>
      </div>
    </div>

    <!-- Rate Harian per Station -->
    <div class="glass rounded-2xl p-4 sm:p-5 fade-up" style="animation-delay:160ms">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-2 h-2 rounded-full bg-accent-cyan pulse-dot"></span>
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate Harian per Station</h3>
        <span class="text-[9px] font-bold text-accent-cyan ml-auto">${stArr.length} Station</span>
      </div>
      <div id="payStationRates" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${stArr.length?stArr.map(s=>`
          <div class="bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-4 border border-white/5 transition-all">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black text-white uppercase tracking-wider">${esc(s.name)}</span>
              <span class="text-[8px] font-bold text-slate-600">${s.empCount} org</span>
            </div>
            <div class="text-lg font-black text-accent-green">${fmt(Math.round(s.avgRate))}</div>
            <div class="text-[8px] text-slate-500 font-bold uppercase">Rate / Hari</div>
            <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
              <div><div class="text-[9px] font-black text-white">${fmtN(s.slips)}</div><div class="text-[7px] text-slate-600">Slip</div></div>
              <div><div class="text-[9px] font-black text-white">${fmtN(Math.round(s.hk))}</div><div class="text-[7px] text-slate-600">Tot HK</div></div>
              <div><div class="text-[9px] font-black text-accent-cyan">${fmt(s.totalPay)}</div><div class="text-[7px] text-slate-600">Total</div></div>
            </div>
          </div>
        `).join(''):'<div class="col-span-full text-xs text-slate-500 text-center py-6">Tidak ada data rate station dalam rentang terpilih</div>'}
      </div>
    </div>

    <div class="glass rounded-2xl overflow-hidden fade-up" style="animation-delay:220ms">
      <div class="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-accent-orange"></span>Top 15 Payroll per Karyawan</h3>
        <select id="paySort" class="filter-select text-[10px]" onchange="sortPayTable()"><option value="total">Sort: Total ↓</option><option value="count">Sort: Slip ↓</option><option value="name">Sort: Nama A-Z</option></select>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-white/5 text-left">
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">#</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">Nama</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase hidden sm:table-cell">OPS ID</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase hidden md:table-cell">Posisi</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase text-right">Slip</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase text-right">Total</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase text-center">Aksi</th>
      </tr></thead><tbody id="payTb"></tbody></table></div>
    </div>

    <!-- Validasi Rekening Bank -->
    <div class="glass rounded-2xl overflow-hidden fade-up" style="animation-delay:260ms">
      <div class="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full ${bankIssues.length?'bg-accent-orange':'bg-accent-green'}"></span>
          Validasi Rekening Bank
        </h3>
        <span class="text-[10px] font-bold ${bankIssues.length?'text-accent-orange':'text-accent-green'}">${bankIssues.length?bankIssues.length+' masalah ditemukan':'✅ Semua valid'}</span>
      </div>
      ${bankIssues.length?`
      <div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-white/5 text-left">
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">Nama</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase hidden sm:table-cell">OPS ID</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">Bank</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">No. Rekening</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase hidden md:table-cell">A/N Rekening</th>
        <th class="px-4 py-3 font-bold text-slate-500 uppercase">Masalah</th>
      </tr></thead><tbody>
        ${bankIssues.map(b=>`<tr class="trow border-b border-white/[0.02]">
          <td class="px-4 py-3 font-semibold text-white">${esc(b.name)}</td>
          <td class="px-4 py-3 text-accent-cyan font-mono hidden sm:table-cell">${esc(b.opsId)}</td>
          <td class="px-4 py-3 text-slate-400">${esc(b.bank)}</td>
          <td class="px-4 py-3 font-mono text-slate-400">${esc(b.rek)}</td>
          <td class="px-4 py-3 text-slate-400 hidden md:table-cell">${esc(b.atasNama)}</td>
          <td class="px-4 py-3">${b.issues.map(i=>'<div class="'+i.cls+' font-semibold text-[10px]">'+i.icon+' '+esc(i.desc)+'</div>').join('')}</td>
        </tr>`).join('')}
      </tbody></table></div>
      `:'<div class="p-6 text-center text-slate-500 text-xs">✅ Semua data rekening valid — tidak ada masalah terdeteksi</div>'}
    </div>

    <!-- Slip Detail Modal -->
    <div id="slipModal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm hidden" onclick="if(event.target===this)closeSlipModal()">
      <div class="glass rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-white/10 shadow-2xl" onclick="event.stopPropagation()">
        <div id="slipModalContent"></div>
      </div>
    </div>
  `;
  renderPayTable(empPay.slice(0,15));

  setTimeout(()=>{
    // Histogram
    if(salaries.length){
      const step=500000; const bins={};
      salaries.forEach(s=>{const b=Math.floor(s/step)*step;const l=fmt(b);bins[l]=(bins[l]||0)+1;});
      mkChart('cSalHist',{type:'bar',data:{labels:Object.keys(bins),datasets:[{data:Object.values(bins),backgroundColor:C.pkB,borderColor:C.pk,borderWidth:1,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{font:{size:8}}},x:{ticks:{font:{size:7},maxRotation:45}}}}});
    }
    mkChart('cPaySt',{type:'doughnut',data:{labels:Object.keys(payStatusDist),datasets:[{data:Object.values(payStatusDist),backgroundColor:C.multi,borderWidth:0,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:9,weight:'600'}}}}}});
    // Correlation + Multi-model regression
    if(attCounts.length){
      const sc=employees.map((_,i)=>({x:attCounts[i],y:payTotals[i]}));
      const rd=attCounts.map((x,i)=>[x,payTotals[i]]);
      const rg=ML.linReg(rd);
      const mnX=Math.min(...attCounts),mxX=Math.max(...attCounts);
      const datasets=[
        {label:'Karyawan',data:sc,backgroundColor:C.cy,pointRadius:4,pointHoverRadius:7},
        {label:'Linear (R²='+rg.r2.toFixed(2)+')',type:'line',data:[{x:mnX,y:rg.predict(mnX)},{x:mxX,y:rg.predict(mxX)}],borderColor:C.pk,borderDash:[5,5],borderWidth:2,pointRadius:0,fill:false}
      ];
      // Add polynomial regression curve if available
      if(polyR.predict&&hkSal.length>4){
        const prg=ML.polyReg(rd,2);
        if(prg.predict){
          const steps=20;const xStep=(mxX-mnX)/steps;
          const polyData=[];for(let i=0;i<=steps;i++){const x=mnX+i*xStep;polyData.push({x,y:prg.predict(x)});}
          datasets.push({label:'Poly d=2 (R²='+prg.r2.toFixed(2)+')',type:'line',data:polyData,borderColor:C.or,borderDash:[8,4],borderWidth:2,pointRadius:0,fill:false});
        }
      }
      mkChart('cPayCorr',{type:'scatter',data:{datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{usePointStyle:true,padding:10,font:{size:9,weight:'600'}}}},scales:{x:{title:{display:true,text:'Jumlah Presensi',font:{size:9}},ticks:{font:{size:8}}},y:{title:{display:true,text:'Total Gaji',font:{size:9}},ticks:{callback:v=>fmt(v),font:{size:8}}}}}});
    }
  },80);
}
function renderPayTable(data){
  document.getElementById('payTb').innerHTML=data.map((e,i)=>`<tr class="trow border-b border-white/[0.02]"><td class="px-4 py-3 font-bold text-slate-500">${i+1}</td><td class="px-4 py-3 font-semibold text-white">${esc(e.name)}</td><td class="px-4 py-3 text-accent-cyan font-mono hidden sm:table-cell">${esc(e.opsId)}</td><td class="px-4 py-3 text-slate-400 hidden md:table-cell">${esc(e.pos||'-')}</td><td class="px-4 py-3 text-right text-slate-400">${e.count}</td><td class="px-4 py-3 text-right font-bold text-accent-green">${fmt(e.total)}</td><td class="px-4 py-3 text-center"><button data-opsid="${esc(e.opsId)}" data-name="${esc(e.name)}" onclick="showSlipDetail(this.dataset.opsid,this.dataset.name)" class="text-[9px] font-bold text-accent-cyan hover:text-white bg-accent-cyan/10 hover:bg-accent-cyan/20 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap">📋 Slip</button></td></tr>`).join('');
}
function sortPayTable(){
  const v=document.getElementById('paySort')?.value;
  const recs=payFilteredRecords();
  const recsSet=new Set(recs);
  let d=employees.map(e=>{const p=(payMap[e.opsId]||[]).filter(x=>recsSet.has(x));return{name:e.name,opsId:e.opsId,pos:e.position,total:p.reduce((s,x)=>s+(x.totalDibayarkan||0),0),count:p.length};});
  if(v==='total') d.sort((a,b)=>b.total-a.total);
  else if(v==='count') d.sort((a,b)=>b.count-a.count);
  else d.sort((a,b)=>a.name.localeCompare(b.name));
  renderPayTable(d.slice(0,15));
}

function showSlipDetail(opsId, name){
  const pays=(payMap[opsId]||[]).slice().sort((a,b)=>{
    const pa=String(a.period||''),pb=String(b.period||'');
    return pb.localeCompare(pa);
  });
  const modal=document.getElementById('slipModal');
  const content=document.getElementById('slipModalContent');
  if(!modal||!content) return;
  const totalAll=pays.reduce((s,p)=>s+(p.totalDibayarkan||0),0);
  const latestBank=pays.length?String(pays[0].bank||'-'):'—';
  const latestRek=pays.length?String(pays[0].rekening||'-'):'—';
  const latestAN=pays.length?String(pays[0].atasNama||'-'):'—';
  content.innerHTML=`
    <div class="p-4 sm:p-5 border-b border-white/5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-black text-white tracking-tight">${esc(name)}</h2>
          <p class="text-[10px] text-slate-500 font-bold mt-0.5">OPS ID: <span class="text-accent-cyan font-mono">${esc(opsId)}</span> • ${pays.length} slip gaji</p>
        </div>
        <button onclick="closeSlipModal()" class="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        <div class="bg-white/[0.03] rounded-xl p-3"><div class="text-[8px] text-slate-500 font-bold uppercase">Total Diterima</div><div class="text-sm font-black text-accent-green mt-0.5">${fmt(totalAll)}</div></div>
        <div class="bg-white/[0.03] rounded-xl p-3"><div class="text-[8px] text-slate-500 font-bold uppercase">Bank</div><div class="text-sm font-bold text-white mt-0.5">${esc(latestBank)}</div></div>
        <div class="bg-white/[0.03] rounded-xl p-3"><div class="text-[8px] text-slate-500 font-bold uppercase">No. Rekening</div><div class="text-sm font-mono text-slate-300 mt-0.5 truncate">${esc(latestRek)}</div></div>
        <div class="bg-white/[0.03] rounded-xl p-3"><div class="text-[8px] text-slate-500 font-bold uppercase">A/N Rekening</div><div class="text-sm font-bold text-white mt-0.5 truncate">${esc(latestAN)}</div></div>
      </div>
    </div>
    <div class="overflow-auto max-h-[60vh]">
      ${pays.length?`<table class="w-full text-xs"><thead class="sticky top-0 z-10"><tr class="border-b border-white/10 text-left bg-bas-900/95 backdrop-blur-sm">
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase">Periode</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right">HK</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right">Rate</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right">Gaji</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right hidden sm:table-cell">Incentive</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right hidden sm:table-cell">Potongan</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right hidden md:table-cell">Asuransi</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase text-right font-black">Total</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase hidden lg:table-cell">Station</th>
        <th class="px-3 py-2.5 font-bold text-slate-500 uppercase">Status</th>
      </tr></thead><tbody>
      ${pays.map(p=>{
        const inc=(parseFloat(p.incentive)||0)+(parseFloat(p.campaignIncentive)||0)+(parseFloat(p.incentivePerformanceCache)||0);
        const pot=parseFloat(p.potongan)||0;
        const asr=parseFloat(p.asuransi)||0;
        const st=String(p.status||'').toLowerCase();
        const stCls=st.includes('done')?'text-accent-green':st.includes('bouncing')?'text-accent-orange':'text-slate-400';
        return '<tr class="trow border-b border-white/[0.02] hover:bg-white/[0.02]">'+
          '<td class="px-3 py-2.5 font-bold text-white whitespace-nowrap">'+esc(p.period)+'</td>'+
          '<td class="px-3 py-2.5 text-right text-slate-300">'+(p.hk||'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right text-slate-300">'+(p.rate?fmt(parseFloat(p.rate)):'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right text-slate-300">'+(p.gaji?fmt(parseFloat(p.gaji)):'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right text-slate-300 hidden sm:table-cell">'+(inc?fmt(inc):'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right text-accent-orange hidden sm:table-cell">'+(pot?'-'+fmt(pot):'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right text-accent-pink hidden md:table-cell">'+(asr?'-'+fmt(asr):'-')+'</td>'+
          '<td class="px-3 py-2.5 text-right font-black text-accent-green">'+fmt(p.totalDibayarkan||0)+'</td>'+
          '<td class="px-3 py-2.5 text-slate-400 hidden lg:table-cell">'+esc(p.hubDc||p.station)+'</td>'+
          '<td class="px-3 py-2.5 '+stCls+' font-bold">'+esc(p.status)+'</td>'+
        '</tr>';
      }).join('')}
      </tbody></table>`:'<div class="text-center text-slate-500 py-8">Tidak ada slip gaji untuk karyawan ini</div>'}
    </div>
  `;
  modal.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeSlipModal(){
  const m=document.getElementById('slipModal');
  if(m) m.classList.add('hidden');
  document.body.style.overflow='';
}

// ═══════════════════════════════════════════════════════════════
//  (Data Science Lab tab removed)




// ═══════════════════════════════════════════════════════════════
//  RENDER: ID CARD GENERATOR
// ═══════════════════════════════════════════════════════════════
const BAS_WHITE_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAAcCAYAAAAk9/CnAAAL8ElEQVR42u2ca6xcVRXHf+vM3Nt3S1tobQMKqGAUMFGigsYvqPEJISEaH2AIflFeaXyRkIBRIaKiFIhRY1QoGhOiEqMoETRGIqAgwSAQiiSoFLA8S2nvvTNzlh/OWr3r7p4zc+Z1H8adTGbmzJn9WHs9/2vtIwCqKoCISG7fNwCbgBVAk9mmQAOYBJbb99w+Z/YdoGMvv69pnxv2Wg5M2LUN9jmOQ+gL67th750wj7aNPwU8AjwI/EVEZmwdDRHpsAhanIuqLgOOBg4DNgP7bP2HASttnRmwFlgNrLI1+3pfBmw1uuUJrZx2CkjoS4BdwM3ADhGZ9r0XEe1zLQJkkbaqutnmtRk4xPZ4VRg/tzlMAutsXQK0bC/zsM/Yb5pcaxh9JoFl4boaLVaHa95H7CcL/TTsetP+6zTIjcdawLUSCaSq7wHOB44PjCsJfSSZxGJqHeAh4CbgOhHZqaoZoP0ywYiFIxORXFW3AGcDHwGOss1eiHYvcBlwk4h0BhESW9cW4HTgNOD1wHpj3v+V9lcxBloGXAOcMygPlAhRvK59/HfQJkFDYFr5EhG50jQeCyEkbjlU9VzgUrMSseUl9OpFGxlyWk6nPxiDP1+HPu5p2P+/CHzSrAUla2KMey4j3qa0v7atcbvYwr9li22XMNq4JzfqltvLXbbtwGfcHZxPIVHVpoi0VfXTwNcT4ktCS03co0hr6UF37XO/Io1uEJEz3crVtITbgQuC1Y5CJ0MIxHzzVhnN/b0JvFNU9RTgVtu4RskktcLPHZXkygiIkwemi/Num5t4tYhcWIcJxiAcZwA3GiOVKZ88xFT9Wuo6dNPgg5ftawN4i4jc1S1mC8KxFfhHcL+zijHzHkIzTo9Ca4zZ6/cfAx9vBrdKKoRjMccchKArJYyYFmgD56nqjSJy+3wE7jZG25TP9RUC7No30vYFC6T3Bg2/1oLfNV021UGRdhA4Z7S19r88YWYJ970buKsmI2+xALwX8zUSPuoEwUndvRRMGLXLVNX22+tx4EVzNR8F7jbL2mlacEWFhhHbrNuAZ20D2iUCNR02ZCoQY8rQALX31MS3gN3AHru3js+dB208YRtxMvBZQ0e0xCplwJnA7fMUkHdU9WjgOkMC8y7CcSfwA+Ae4Algt4i0Qn/LLG45zALglEYtYMbeW9ZvHujwcuBi4L0lQuI0WtkH023qYZUEeNr24xGb037jm06FgGQBHW0E4ZWSeycC72Ul8VtEzfJAC+ddn/eMCcQ+o3letaEPaNFynW0d+/6wqh63FOAGVT1BVR+zeadrUVX9u6pOhGBzHHPwmG6djaeq2taDm1/7rqo2u/U1onlNqOqvSubTsvcvuFvYzWW093NqrOvmpQZXqaqoaqaqTVVtOP2bIciKEuvm/VYRuV9VJxPJHweD6RD9TojI31T1l8CnTFM0k7keC5xgmlpGHVMZQRuqCrADeG0yj9RyXCUi2wLzHYjzREQD9N4rTuuFEE6KyLSq3mZWRIf0+zd2+Y9fe9bW1AjexHwF6dJnbOPWUM2KzLEkTeClLoMc5WZ8IfMINVpLVY8A3tXF9OuYgIYDcZDFHVcBH6gQDr92k4hsU9WGIWvtyt0u6K5DCG7HhOyQEa1za417/mlrai8xK+Jx0wG0s2ka9c3JJhwQELMerYBiCEXGcqLiP1mFxmtWIFhZyT1CkYX1GKNRMo4zzgRwIrANOKJEQHyOT1EkEWH01sMRq/OACyuEw63yv4Dz5zOBKSJq+zgKSHSihvZ+UlXXBg9FSgCCXho/8lBWASRlwfOIcUtWEotWAVAdYK+IPJtUBjQ8SL+7ZKI+oVdRZF1nAFHVKYqk4kZ7L3ONMuam91OkqQzBSJEPCf0P66Y5hPojEdk3ahQrIFbvB64uQaYiDP0f4AwR+fd8lsGYMDIiATm0AnSIe/xl4KIKBq0jHGUCoiWMXtWnVCjjKgF5SVUfA3YCvwD+KCJPuMbe3WWyDfOlF9z69fg9pzrH0AB+ClxijJKPkvEMsTrW4o6yzXBF0QY+LCJ/VtUVwEy3oHiUdDPL3xqRb7/f1jNNdR5kjb2WSltNUUP2JuCjwDOqerGIfKdpMG43ac4rNPR8ZD3rjtWomHcG3CMiZ4zapfH+VHUd8DPz8fMK924P8CER+Z0x7P75RviAUyviM6hXP+Vr+QpwEnBMAjxoifu7mFtWslcagIhvq+pEE3iGIgexnGrsuVNCqGHRkHEIUxqr5MAxqrpNRL7pTD0ixMp9+xvNypa5Vs6QNwA7VfU1JkivZBbzdxcwC//Jg5vaoEj2rQjr0uCGqrnAytzkn1LkTk4Gjgsua5my6enOevwpIg+p6knA54D3Aa9j8SeS+0W/PG76hKjqauB+4BWUJ5KWUivT4GIK4HgReWTYcpN4NEBVrwXOrRCO2FwBtXoEueN2t6QCVbtGRC5wsKGGW+nHIiZMOZxIAaNvMe2roX+Sz5oo3Lh3U0GxTTM37SDMzcTnHhsn2j+Fahuhzzy4u2+gqCDIqU54PtAUkb2qussERCs2995k0JwiA+lQXsyYz4R+ppM+U8TBNWyeEDWvQK78d8/M7zfGW09REfDWEjewbfecBlwZxhtUODIgTwo8e8USyxMEqDMAcw/jSvQqdlxWd5yAZGaW8b/PXkuqqerHagjILt/YJ7to4wdF5OQlsGABfgJ8sMKSHD6CYRyx+mofwlHGeI0xuqNa03oM7osUcVwnKX+vij3GXZreb2sGC9KLhrt9cx/vQtxJT2gxNwPdD5Y9bgK52TzLkIgjObiadM0w2jjkOs6nqDNqV7hVnQqYsWwD5os+vdr0iIRSuqxV51EIus3TXbw6KNv9LiAvdrlppQWIUwxWoqF9uApaoa3qMvGGgMiMspbJheN05uY6pCai1i1matm7u6uDul9e1vG87VU7uKRrLUboJSBSkx4REVzsaFWZAkNVN9a49zkXkL1dpHgtMN0reBuz+9SomNtyQ4UOoTjjfRlFKUTqUnhs1LfghETgGylyHUr52RO//jWK0vGOxWmxujZWInsg+qIxccu+t2sqjzSAdddhH0VpUB6qH94B/LYLCNPugx7x2QWHUiQO15uAbqWoHt5oinWNxTeTNj+vxi2rqvAg3TX8TKBrSj+nxxSzJeszzK3gjS6VV39ssvlsNXSPChfZDcGU//hwF7dpPfAlVX00sSCRCbOgUVeEzyttMqsCgbJkUs1wbZK52XS/PpHAmxLG2mD9N7r428JsmUk/wuGJwCMpzrmvqmCyjs3zYhG5fBFCl72skvZBj1xV3wZcQQFXb1hAZG7ctHvBGXUn1afaMuDzS2BBeZhvCmM+R3GqrzaCZG5EpqqrTDgOpxzO9TGuEJHLDfqs63roIIw6BG2GBUFUVZcD3wdeXTLvqpOng7q7Okbmb1SM56dQdwF/cgHZZUy0oUIDd4acrIzxv5IIRjTLB04UisgTfeZAvN8dFBBymXB4XmOHiFxkQtVeLJXPVnofBUSGYES3pm834Whx8JGC+UoY6oiVRh6EZsL2+lwReTIG6c9TXi5RhU7UXYgMsCgdgBhxk9w9uw+4SER+049wBNfqGxT5E2eGKHwYMW8Bzl4MjxfqAW36sdxYTNoOgl6XvqcEMGHYpPIg58YH5cVuffs6ngF+D1wpIneqatY0pGhKVac5uD5lKTaleKjA94DttrbalbPhMT2nUpTQk/jYEfe/GTjL7s8W8ZkZf8hao0RwsGC3rtLyBwE2F8leC9UPzuswm5GPD9ObMWCqZZ7T3RRHn28RkadivNUMmvXXzNb2xOx2WY1K6s7EMoAsoAueK8gpzrS3ODiTnj5kwB8+MB0QoDwgGO2AWDStzz220KcpDt0/7AWBQ5SVr6DID+UGHjgU+xxwB/BzEbklRXYWaVx2B8W59M2GLE0afffben5YIz7zvi61/laHuNUZ0XmnxewjpIS5FRaa8FMVgtZm7oMoHOmaKUG0SMCjeA59JuFPf5rjXmAmnv8PsSe+n5L8uDpBPlIByYMbkz6/KQrIzEI/8jOc1hvmNN6mBIZsA3vCI0QX7IF0/28j5RW3hp10L/8LPX4ku7+7uQEAAAAASUVORK5CYII=';

let idcardMode = 'single';
let idcardPreviewData = [];

function makeQR(text, size) {
  if (typeof qrcode === 'undefined') { console.warn('[BAS] QR code lib not loaded'); return ''; }
  var qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();
  var modules = qr.getModuleCount();
  var cellSize = Math.floor(size / modules);
  var canvas = document.createElement('canvas');
  canvas.width = cellSize * modules;
  canvas.height = cellSize * modules;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (var r = 0; r < modules; r++) {
    for (var c = 0; c < modules; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }
  return canvas.toDataURL('image/png');
}

function rIDCard(){
  const el = document.getElementById('tab-idcard');
  el.innerHTML = `
    <div class="fade-up flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div><h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">ID Card Generator</h1><p class="text-xs text-slate-500 font-medium mt-0.5">Generate kartu identitas karyawan — satuan atau bulk dari Excel/Sheet</p></div>
    </div>

    <!-- MODE TABS -->
    <div class="flex gap-2 fade-up" style="animation-delay:60ms">
      <button onclick="switchIDMode('single')" id="mSingle" class="mode-tab active flex items-center gap-2">
        ${svgIcon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')} Mode Satuan
      </button>
      <button onclick="switchIDMode('bulk')" id="mBulk" class="mode-tab flex items-center gap-2">
        ${svgIcon('M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7')} Mode Bulk (Excel/Sheet)
      </button>
    </div>

    <!-- SINGLE MODE -->
    <div id="idSingle" class="glass rounded-2xl p-5 sm:p-6 fade-up" style="animation-delay:100ms">
      <h3 class="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>Input Data Karyawan
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nama Lengkap *</label>
          <input id="icName" type="text" placeholder="Nama karyawan" class="search-input text-sm" />
        </div>
        <div>
          <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">OPS ID *</label>
          <input id="icOpsId" type="text" placeholder="Contoh: 010101" class="search-input text-sm" />
        </div>
      </div>

      <!-- Auto-fill dari data existing -->
      <div class="flex flex-wrap gap-2 mb-4">
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atau pilih dari data karyawan:</label>
        <select id="icAutoFill" class="filter-select text-sm" onchange="autoFillCard()">
          <option value="">— Pilih Karyawan —</option>
          ${employees.map(e=>'<option value="'+e.opsId+'">'+e.name+' ('+e.opsId+')</option>').join('')}
        </select>
      </div>

      <div class="flex flex-wrap gap-3">
        <button onclick="generateSingleCard()" class="px-6 py-2.5 bg-gradient-to-r from-accent-pink to-accent-blue text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
          ${svgIcon('M12 6v6m0 0v6m0-6h6m-6 0H6')} Generate ID Card
        </button>
        <button onclick="clearSingleForm()" class="px-4 py-2.5 border border-white/10 text-slate-400 text-xs font-bold rounded-xl hover:bg-white/5 transition-colors">Reset</button>
      </div>
    </div>

    <!-- BULK MODE -->
    <div id="idBulk" class="glass rounded-2xl p-5 sm:p-6 hidden fade-up" style="animation-delay:100ms">
      <h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>Paste Data dari Excel / Google Sheet
      </h3>
      <p class="text-[10px] text-slate-500 font-medium mb-4">Copy kolom dari Excel/Sheet lalu paste di bawah. Format kolom: <span class="text-accent-cyan font-bold">Nama [TAB] OPS ID</span><br/>Baris pertama bisa header (auto-deteksi).</p>

      <textarea id="bulkPaste" class="paste-area mb-4" rows="10" placeholder="Paste data dari Excel/Sheet di sini...&#10;&#10;Contoh:&#10;MOH. RIZKI&#9;Ops1615632&#10;RAMDAN RH. WOLI&#9;Ops1615630&#10;SURETNO&#9;Ops1615633&#10;DENIS RETNHARD LAGEBADA&#9;Ops1615634"></textarea>

      <div class="flex flex-wrap gap-3 mb-4">
        <button onclick="parseBulkData()" class="px-6 py-2.5 bg-gradient-to-r from-accent-cyan to-accent-blue text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
          ${svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')} Parse & Generate
        </button>
        <button onclick="loadAllEmployeesToBulk()" class="px-4 py-2.5 border border-accent-green/30 text-accent-green text-xs font-bold rounded-xl hover:bg-accent-green/10 transition-colors flex items-center gap-2">
          ${svgIcon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4')} Load Semua Karyawan (${employees.length})
        </button>
        <button onclick="document.getElementById('bulkPaste').value='';document.getElementById('bulkPreviewArea').innerHTML='';idcardPreviewData=[];" class="px-4 py-2.5 border border-white/10 text-slate-400 text-xs font-bold rounded-xl hover:bg-white/5 transition-colors">Clear</button>
      </div>

      <div id="bulkPreviewArea"></div>
    </div>

    <!-- PREVIEW & DOWNLOAD -->
    <div id="idPreviewSection" class="hidden fade-up" style="animation-delay:150ms">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-accent-green pulse-dot"></span>
          Preview ID Card (<span id="previewCount">0</span> kartu)
        </h3>
        <div class="flex gap-2 items-center">
          <div class="relative" id="downloadDropdownWrap">
            <button onclick="toggleDownloadMenu()" class="px-5 py-2 bg-gradient-to-r from-accent-green to-accent-cyan text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
              ${svgIcon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4')} Unduh ▾
            </button>
            <div id="downloadMenu" class="hidden absolute right-0 mt-2 w-52 glass rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
              <button onclick="downloadAllCards();closeDownloadMenu()" class="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                ${svgIcon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4')}
                <span>PNG <span class="text-slate-500 font-normal">— satu per satu</span></span>
              </button>
              <button onclick="downloadAsZip();closeDownloadMenu()" class="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5">
                ${svgIcon('M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8')}
                <span>ZIP <span class="text-slate-500 font-normal">— semua dalam 1 file</span></span>
              </button>
              <button onclick="downloadAsPDF();closeDownloadMenu()" class="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors border-t border-white/5">
                ${svgIcon('M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z')}
                <span>PDF <span class="text-slate-500 font-normal">— siap cetak A4</span></span>
              </button>
            </div>
          </div>
          <button onclick="printAllCards()" class="px-4 py-2 border border-white/10 text-slate-300 text-xs font-bold rounded-xl hover:bg-white/5 transition-colors flex items-center gap-2">
            ${svgIcon('M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z')} Print
          </button>
        </div>
      </div>
      <div id="printArea" class="id-card-grid"></div>
    </div>
  `;
}

function switchIDMode(mode) {
  idcardMode = mode;
  document.getElementById('mSingle').classList.toggle('active', mode === 'single');
  document.getElementById('mBulk').classList.toggle('active', mode === 'bulk');
  document.getElementById('idSingle').classList.toggle('hidden', mode !== 'single');
  document.getElementById('idBulk').classList.toggle('hidden', mode !== 'bulk');
}

function autoFillCard() {
  const opsId = document.getElementById('icAutoFill').value;
  if (!opsId) return;
  const emp = employees.find(e => e.opsId === opsId);
  if (!emp) return;
  document.getElementById('icName').value = emp.name || '';
  document.getElementById('icOpsId').value = emp.opsId || '';
}

function clearSingleForm() {
  ['icName','icOpsId'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('icAutoFill').value = '';
}

function generateSingleCard() {
  const name = document.getElementById('icName').value.trim();
  const rawId = document.getElementById('icOpsId').value.trim();
  if (!name || !rawId) { showToast('Nama dan OPS ID wajib diisi!','warning'); return; }
  const opsId = formatOpsId(rawId);
  // Cari posisi dari data employee jika ada
  const emp = employees.find(e => e.opsId === opsId || formatOpsId(e.opsId||'') === opsId);
  const data = [{
    name, opsId,
    position: emp?.position || 'Daily Worker'
  }];
  idcardPreviewData = data;
  renderCardPreview(data);
}

function detectOpsId(val) {
  return /^ops/i.test(val) || /^\d{4,}$/.test(val);
}

function formatOpsId(val) {
  val = val.trim();
  if (/^\d+$/.test(val)) return 'Ops' + val;
  if (/^ops/i.test(val)) return 'Ops' + val.replace(/^ops/i, '');
  return val;
}

function sortCardData(data, sortBy) {
  const sorted = [...data];
  if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'id'));
  else if (sortBy === 'opsId') sorted.sort((a, b) => a.opsId.localeCompare(b.opsId));
  return sorted;
}

let bulkSortBy = 'name';

function reSortBulk(sortBy) {
  bulkSortBy = sortBy;
  if (!idcardPreviewData.length) return;
  idcardPreviewData = sortCardData(idcardPreviewData, sortBy);
  showBulkTable(idcardPreviewData);
  renderCardPreview(idcardPreviewData);
}

function showBulkTable(data) {
  document.getElementById('bulkPreviewArea').innerHTML = `
    <div class="glass rounded-xl overflow-hidden mb-4">
      <div class="p-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">${data.length} data terdeteksi — diurutkan: ${bulkSortBy === 'name' ? 'Nama (A-Z)' : 'OPS ID'}</span>
        <div class="flex gap-2 items-center">
          <span class="text-[9px] text-slate-600 font-bold">Urutkan:</span>
          <button onclick="reSortBulk('name')" class="px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${bulkSortBy==='name'?'bg-accent-cyan/20 text-accent-cyan':'bg-white/5 text-slate-500 hover:bg-white/10'}">Nama A-Z</button>
          <button onclick="reSortBulk('opsId')" class="px-3 py-1 text-[10px] font-bold rounded-lg transition-colors ${bulkSortBy==='opsId'?'bg-accent-cyan/20 text-accent-cyan':'bg-white/5 text-slate-500 hover:bg-white/10'}">OPS ID</button>
          <button onclick="renderCardPreview(idcardPreviewData)" class="px-4 py-1.5 bg-accent-pink/20 text-accent-pink text-[10px] font-bold rounded-lg hover:bg-accent-pink/30 transition-colors">Generate Cards</button>
        </div>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-white/5">
        <th class="px-3 py-2 text-left font-bold text-slate-500">#</th>
        <th class="px-3 py-2 text-left font-bold text-slate-500">Nama</th>
        <th class="px-3 py-2 text-left font-bold text-slate-500">OPS ID</th>
      </tr></thead><tbody>${data.map((d,i) => `<tr class="trow border-b border-white/[0.02]">
        <td class="px-3 py-2 text-slate-500">${i+1}</td>
        <td class="px-3 py-2 font-semibold text-white">${d.name}</td>
        <td class="px-3 py-2 font-mono text-accent-cyan">${d.opsId}</td>
      </tr>`).join('')}</tbody></table></div>
    </div>
  `;
}

function parseBulkData() {
  const raw = document.getElementById('bulkPaste').value.trim();
  if (!raw) { showToast('Paste data terlebih dahulu!','warning'); return; }
  const lines = raw.split('\n').map(l => l.split('\t').map(c => c.trim())).filter(l => l.length >= 2 && l[0]);

  if (!lines.length) { showToast('Data tidak valid. Pastikan minimal 2 kolom (Nama, OPS ID) dipisah Tab.','error'); return; }

  let startIdx = 0;
  const firstRow = lines[0].map(c => c.toLowerCase());
  if (firstRow.some(c => ['nama','name','ops','opsid','ops id'].includes(c))) startIdx = 1;

  // Auto-detect column order: check if first data column looks like OPS ID
  const sampleRow = lines[startIdx];
  let nameCol = 0, opsCol = 1;
  if (sampleRow && detectOpsId(sampleRow[0]) && !detectOpsId(sampleRow[1])) {
    nameCol = 1; opsCol = 0; // columns are swapped
  }

  const data = [];
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];
    const name = (l[nameCol] || '').trim();
    const rawId = (l[opsCol] || '').trim();
    if (!name || !rawId) continue;
    const opsId = formatOpsId(rawId);
    data.push({
      name,
      opsId,
      position: (function(){ var m=employees.find(function(e){return formatOpsId(e.opsId||'')===opsId;}); return m&&m.position?m.position:'Daily Worker'; })()
    });
  }

  if (!data.length) { showToast('Tidak ada data valid yang terdeteksi.','error'); return; }

  // Auto-sort by name (A-Z)
  bulkSortBy = 'name';
  const sorted = sortCardData(data, bulkSortBy);
  idcardPreviewData = sorted;
  showBulkTable(sorted);
  renderCardPreview(sorted);
}

function loadAllEmployeesToBulk() {
  const data = employees.map(e => ({
    name: e.name || '',
    opsId: formatOpsId(e.opsId || ''),
    position: e.position || 'Daily Worker'
  }));
  bulkSortBy = 'name';
  const sorted = sortCardData(data, bulkSortBy);
  document.getElementById('bulkPaste').value = 'Nama\tOPS ID\n' + sorted.map(d => d.name+'\t'+d.opsId).join('\n');
  idcardPreviewData = sorted;
  showBulkTable(sorted);
  renderCardPreview(sorted);
}

function renderIDCardHTML(d) {
  const qrDataUrl = makeQR(d.opsId, 130);
  return `
    <div class="id-card" data-opsid="${d.opsId}">
      <div class="overlay"><div class="overlay-inner"></div></div>
      <div class="card-inner">
        <div class="top-bar">
          <div style="display:flex;flex-direction:column;align-items:flex-start">
            <img src="${BAS_WHITE_LOGO}" style="width:80px;height:auto;object-fit:contain;opacity:0.9" alt="BAS" />
          </div>
          <div class="side-bars" style="display:flex;gap:6px">
            <div class="bar bar-blue" style="width:6px;height:24px;background:#4361ee;opacity:0.8;border-radius:9999px"></div>
            <div class="bar bar-pink" style="width:6px;height:16px;background:#f72585;opacity:0.8;margin-top:8px;border-radius:9999px"></div>
          </div>
        </div>

        <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;width:100%;padding:0 16px">
          <div class="qr-section">
            <div class="qr-wrap">
              <div class="qr-inner">
                <img src="${qrDataUrl}" width="130" height="130" style="display:block" />
              </div>
            </div>
          </div>

          <div class="opsid-section">
            <span class="ops-id">${d.opsId}</span>
          </div>

          <div class="name-section">
            <h2 class="emp-name">${d.name}</h2>
            <div class="pos-line">
              <div class="pos-bar"></div>
              <p class="pos-text">${d.position || 'Daily Worker'}</p>
              <div class="pos-bar"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCardPreview(data) {
  if (!data || !data.length) return;
  const section = document.getElementById('idPreviewSection');
  const area = document.getElementById('printArea');
  const countEl = document.getElementById('previewCount');
  section.classList.remove('hidden');
  countEl.textContent = data.length;
  area.innerHTML = data.map(d => renderIDCardHTML(d)).join('');
}

function toggleDownloadMenu() {
  document.getElementById('downloadMenu').classList.toggle('hidden');
}
function closeDownloadMenu() {
  document.getElementById('downloadMenu').classList.add('hidden');
}
// Close menu on outside click
document.addEventListener('click', e => {
  const wrap = document.getElementById('downloadDropdownWrap');
  if (wrap && !wrap.contains(e.target)) closeDownloadMenu();
});

// ── Helper: ensure html2canvas is loaded ──
async function ensureHtml2Canvas() {
  if (!window.html2canvas) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    document.head.appendChild(s);
    await new Promise(r => s.onload = r);
  }
}

// ── Helper: render all cards to canvas array ──
async function renderAllCardsToCanvas() {
  await ensureHtml2Canvas();
  const cards = document.querySelectorAll('#printArea .id-card');
  const results = [];
  for (const card of cards) {
    const opsId = card.dataset.opsid || 'card';
    try {
      const canvas = await html2canvas(card, {
        backgroundColor: '#0d0025',
        scale: 3,
        useCORS: true,
        logging: false,
        width: 300,
        height: 480
      });
      results.push({ opsId, canvas });
    } catch(e) { console.error('Render error:', e); }
  }
  return results;
}

// ══════════ DOWNLOAD PNG (satu per satu) ══════════
async function downloadAllCards() {
  if (!idcardPreviewData.length) return;
  const items = await renderAllCardsToCanvas();
  for (const { opsId, canvas } of items) {
    const link = document.createElement('a');
    link.download = 'KARTU_IDENTITAS_' + opsId + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    await new Promise(r => setTimeout(r, 300));
  }
}

// ══════════ DOWNLOAD ZIP ══════════
async function downloadAsZip() {
  if (!idcardPreviewData.length) return;

  // Load JSZip
  if (!window.JSZip) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    document.head.appendChild(s);
    await new Promise(r => s.onload = r);
  }

  const items = await renderAllCardsToCanvas();
  const zip = new JSZip();
  const folder = zip.folder('ID_Cards_BAS');

  for (const { opsId, canvas } of items) {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    folder.file('KARTU_IDENTITAS_' + opsId + '.png', base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.download = 'ID_Cards_BAS_' + new Date().toISOString().slice(0,10) + '.zip';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

// ══════════ DOWNLOAD PDF ══════════
async function downloadAsPDF() {
  if (!idcardPreviewData.length) return;

  // Load jsPDF
  if (!window.jspdf) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    document.head.appendChild(s);
    await new Promise(r => s.onload = r);
  }

  const items = await renderAllCardsToCanvas();
  const { jsPDF } = window.jspdf;

  // Card ratio 300:480 = 5:8. Use mm, fit full page per card, 0 margin.
  const cardW = 75; // mm
  const cardH = cardW * (480 / 300); // 120 mm
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [cardW, cardH] });

  for (let i = 0; i < items.length; i++) {
    if (i > 0) pdf.addPage([cardW, cardH], 'portrait');
    const imgData = items[i].canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, cardW, cardH);
  }

  pdf.save('ID_Cards_BAS_' + new Date().toISOString().slice(0,10) + '.pdf');
}

function printAllCards() {
  const printArea = document.getElementById('printArea');
  if (!printArea || !printArea.innerHTML.trim()) return;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Print ID Cards - BAS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      body{margin:20px;font-family:'Inter',sans-serif;background:#fff;}
      .id-card-grid{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;}
      .id-card{width:300px;height:480px;background:linear-gradient(160deg,#0d0025 0%,#10002b 30%,#1a0a3e 60%,#0d0025 100%);position:relative;overflow:hidden;font-family:'Inter',sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .overlay{position:absolute;inset:0;z-index:0;pointer-events:none;}
      .overlay-inner{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(16,0,43,0.1),rgba(16,0,43,0.2),#10002b);opacity:0.9;}
      .card-inner{position:relative;z-index:1;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;}
      .top-bar{width:100%;display:flex;justify-content:space-between;align-items:center;padding:24px;padding-top:32px;margin-bottom:16px;}
      .bar{border-radius:9999px;}
      .bar-blue{box-shadow:0 0 8px rgba(67,97,238,0.6);}
      .bar-pink{box-shadow:0 0 8px rgba(247,37,133,0.6);}
      .qr-section{position:relative;margin-bottom:24px;}
      .qr-wrap{padding:12px;border-radius:24px;background:rgba(10,5,24,0.8);border:1px solid rgba(67,97,238,0.25);box-shadow:0 0 30px rgba(67,97,238,0.15),inset 0 1px 0 rgba(255,255,255,0.05);}
      .qr-inner{background:#ffffff;padding:10px;border-radius:16px;}
      .opsid-section{position:relative;z-index:20;margin-bottom:20px;width:100%;display:flex;justify-content:center;}
      .ops-id{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:900;font-size:20px;color:#00f5d4;letter-spacing:0.25em;text-shadow:0 0 10px rgba(0,245,212,0.5),0 0 30px rgba(0,245,212,0.2);display:block;text-align:center;line-height:1;}
      .name-section{text-align:center;width:100%;}
      .emp-name{font-weight:900;text-transform:uppercase;font-size:15px;color:#ffffff;line-height:1.25;letter-spacing:0.025em;text-shadow:0 2px 8px rgba(0,0,0,0.6),0 0 20px rgba(67,97,238,0.15);padding:0 10px;margin-bottom:8px;overflow-wrap:break-word;}
      .pos-line{display:flex;align-items:center;justify-content:center;gap:8px;opacity:0.9;}
      .pos-bar{height:2px;width:30px;background:linear-gradient(90deg,transparent,#f72585,transparent);}
      .pos-text{font-weight:700;text-transform:uppercase;letter-spacing:0.2em;font-size:10px;color:#f72585;}
      @media print{@page{margin:10mm;size:A4 portrait;}body{margin:0;}}
    </style>
  </head><body><div class="id-card-grid">${printArea.innerHTML}</div></body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 500);
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS & DIAGNOSTIK API
// ═══════════════════════════════════════════════════════════════
function rSettings(){
  const el=document.getElementById('tab-settings');
  el.innerHTML=`
  <div class="fade-up">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-white">Pengaturan & Diagnostik API</h1>
        <p class="text-xs text-slate-400 mt-1">Konfigurasi koneksi ke Google Sheets API</p>
      </div>
    </div>

    <!-- API URL CONFIG -->
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-accent-cyan"></span>
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">URL API (Google Apps Script Web App)</h3>
      </div>
      <div class="space-y-3">
        <input type="text" id="apiUrlInput" value="${API}" 
          class="search-input w-full text-xs" style="padding-left:14px"
          placeholder="https://script.google.com/macros/s/XXXXXXX/exec" />
        <div class="flex flex-wrap gap-2">
          <button onclick="saveApiUrl()" class="px-4 py-2 rounded-xl bg-accent-cyan/20 text-accent-cyan text-xs font-bold border border-accent-cyan/30 hover:bg-accent-cyan/30 transition-all">
            💾 Simpan & Muat Ulang
          </button>
          <button onclick="resetApiUrl()" class="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold border border-white/10 hover:bg-white/10 transition-all">
            🔄 Reset ke Default
          </button>
          <button onclick="runDiagnose()" class="px-4 py-2 rounded-xl bg-accent-green/20 text-accent-green text-xs font-bold border border-accent-green/30 hover:bg-accent-green/30 transition-all">
            🔍 Diagnosa Koneksi
          </button>
        </div>
        <p class="text-[10px] text-slate-500">URL saat ini: <code class="text-accent-cyan/70">${API}</code></p>
        <p class="text-[10px] text-slate-500">Status: <span id="apiStatusBadge" class="${dbStatus.connected ? 'text-accent-green' : 'text-red-400'}">${dbStatus.connected ? '● Terhubung' : '● Tidak terhubung'}</span></p>
      </div>
    </div>

    <!-- PETUNJUK DEPLOY -->
    <div class="glass rounded-2xl p-5 mb-5">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-accent-orange"></span>
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Petunjuk Deploy Apps Script</h3>
      </div>
      <div class="text-xs text-slate-400 space-y-2">
        <p><strong class="text-white">1.</strong> Buka Google Sheets yang berisi data Karyawan, Attendance, Payslips</p>
        <p><strong class="text-white">2.</strong> Klik <strong class="text-accent-cyan">Extensions → Apps Script</strong></p>
        <p><strong class="text-white">3.</strong> Hapus semua kode lama di Code.gs</p>
        <p><strong class="text-white">4.</strong> Copy-paste isi file <strong class="text-accent-pink">APPS_SCRIPT_COMPLETE.gs</strong> ke Code.gs</p>
        <p><strong class="text-white">5.</strong> Save (Ctrl+S)</p>
        <p><strong class="text-white">6.</strong> Klik <strong class="text-accent-cyan">Deploy → New deployment</strong></p>
        <p class="pl-5">• Pilih type: <strong class="text-white">Web app</strong></p>
        <p class="pl-5">• Execute as: <strong class="text-white">Me</strong></p>
        <p class="pl-5">• Who has access: <strong class="text-white">Anyone</strong></p>
        <p><strong class="text-white">7.</strong> Copy URL deployment, paste ke kolom di atas, lalu klik <strong class="text-accent-cyan">Simpan & Muat Ulang</strong></p>
        <div class="mt-3 p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
          <p class="text-accent-orange font-bold">⚠ PENTING:</p>
          <p class="mt-1">Setiap kali mengubah kode Apps Script, Anda harus membuat <strong class="text-white">New deployment</strong> dan menggunakan URL baru.</p>
          <p class="mt-1">Deep Learning Engine <strong class="text-accent-cyan">secara otomatis mendeteksi</strong> sheet manapun yang berisi data karyawan/presensi/gaji — tidak perlu nama sheet khusus.</p>
          <p class="mt-1">Nama sheet yang dikenali secara langsung: <strong class="text-white">DataKaryawan, Absensi, SlipGaji</strong></p>
        </div>
      </div>
    </div>

    <!-- AUTO-DISCOVERY PANEL -->
    <div class="glass rounded-2xl p-5 mb-5" id="autoDiscoveryPanel">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">🧠 DL Auto-Discovery — Sheet Scanner</h3>
      </div>
      ${window._autoDiscoveryInfo ? `
        <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-3">
          <p class="text-indigo-400 font-bold text-sm">✓ Auto-Discovery Aktif</p>
          <p class="text-slate-400 mt-1">Spreadsheet: <strong class="text-white">${window._spreadsheetName||'?'}</strong></p>
          <div class="mt-2 space-y-1 text-xs">
            ${Object.entries(window._autoDiscoveryInfo).map(([type,info])=>
              '<p>'+{employees:'👥 Karyawan',attendance:'📋 Presensi',payslips:'💰 Payslips'}[type]+': Sheet <strong class="text-accent-cyan">'+(info.sheet||'?')+'</strong> — <strong class="text-white">'+info.rows+'</strong> baris (score: '+info.score+')</p>'
            ).join('')}
          </div>
        </div>` : `
        <div class="p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
          <p class="text-slate-400">Auto-Discovery belum berjalan atau tidak menemukan data yang cocok.</p>
        </div>`}
      <div class="flex flex-wrap gap-2">
        <button onclick="runDiscoverSheets()" class="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-xs font-bold border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
          🔎 Scan Semua Sheet
        </button>
        <button onclick="runAutoLoad()" class="px-4 py-2 rounded-xl bg-accent-green/20 text-accent-green text-xs font-bold border border-accent-green/30 hover:bg-accent-green/30 transition-all">
          🧠 Jalankan Auto-Discovery & Load
        </button>
      </div>
      <div id="discoverResult" class="mt-3 text-xs text-slate-400"></div>
    </div>

    <!-- DIAGNOSE RESULT -->
    <div class="glass rounded-2xl p-5 mb-5" id="diagnosePanel">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-accent-pink"></span>
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Hasil Diagnostik</h3>
      </div>
      <div id="diagnoseResult" class="text-xs text-slate-400">
        <p>Klik tombol "🔍 Diagnosa Koneksi" untuk mengecek status koneksi dan data sheet.</p>
      </div>
    </div>

    <!-- CONNECTION LOG -->
    <div class="glass rounded-2xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <span class="w-2 h-2 rounded-full bg-accent-blue"></span>
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Info Koneksi Saat Ini</h3>
      </div>
      <div class="text-xs text-slate-400 space-y-1">
        <p>Database connected: <span class="${dbStatus.connected?'text-accent-green':'text-red-400'}">${dbStatus.connected}</span></p>
        <p>Error: <span class="text-red-400">${dbStatus.error||'tidak ada'}</span></p>
        <p>Total karyawan dimuat: <span class="text-white font-bold">${employees.length}</span></p>
        <p>Total attendance records: <span class="text-white font-bold">${Object.values(attMap).flat().length}</span></p>
        <p>Total payslip records: <span class="text-white font-bold">${Object.values(payMap).flat().length}</span></p>
      </div>
    </div>
  </div>`;
}

function saveApiUrl(){
  const val = document.getElementById('apiUrlInput')?.value?.trim();
  if(!val || !val.startsWith('https://script.google.com/macros/s/')){
    showToast('URL tidak valid. Harus dimulai dengan: https://script.google.com/macros/s/...','error');
    return;
  }
  localStorage.setItem('bas_api_url', val);
  API = val;
  showToast('URL API disimpan! Halaman akan dimuat ulang.','success');
  window.location.reload();
}

function resetApiUrl(){
  localStorage.removeItem('bas_api_url');
  API = DEFAULT_API;
  showToast('URL dikembalikan ke default. Halaman akan dimuat ulang.','success');
  window.location.reload();
}

async function runDiagnose(){
  const dr = document.getElementById('diagnoseResult');
  dr.innerHTML = '<p class="text-accent-cyan animate-pulse">⏳ Menjalankan diagnostik lengkap...</p>';
  
  const results = {};
  const log = [];
  
  try {
    // ── STEP 1: Health Check (GET) ──
    log.push('🔄 Testing health check (GET)...');
    let healthOk = false;
    let healthData = null;
    try {
      const hc = await fetch(API, {method:'GET', headers:{'Accept':'application/json'}});
      if(hc.ok) {
        healthData = await hc.json();
        healthOk = healthData && healthData.status === 'ONLINE';
      }
    } catch(e) { log.push('❌ Health check error: ' + e.message); }
    results.health = { ok: healthOk, data: healthData };

    if(!healthOk) {
      dr.innerHTML = `
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
          <p class="text-red-400 font-bold text-sm">❌ API TIDAK TERHUBUNG</p>
          <p class="text-slate-400">URL API tidak merespons atau tidak valid.</p>
          <p class="text-white break-all">URL: <code class="text-accent-cyan/70">${API}</code></p>
          <div class="mt-3 p-3 rounded-lg bg-white/5 space-y-2">
            <p class="text-accent-orange font-bold">🔧 Solusi:</p>
            <p class="text-slate-400">1. Pastikan sudah men-deploy Apps Script sebagai Web App</p>
            <p class="text-slate-400">2. Pastikan "Who has access" = <strong class="text-white">Anyone</strong></p>
            <p class="text-slate-400">3. Paste URL deployment yang benar di kolom URL di atas</p>
            <p class="text-slate-400">4. Klik <strong class="text-accent-cyan">Simpan & Muat Ulang</strong></p>
          </div>
        </div>`;
      return;
    }
    log.push('✅ Health check OK: v' + (healthData?.version||'?'));
    
    // ── STEP 2: Test getAllEmployees ──
    log.push('🔄 Testing getAllEmployees...');
    const empData = await api('getAllEmployees');
    const empArr = Array.isArray(empData) ? empData : [];
    const empError = empData?.error || null;
    results.employees = { count: empArr.length, error: empError, sample: empArr.slice(0,2) };
    log.push(empError ? '❌ Employees error: ' + empError : '📊 Employees: ' + empArr.length + ' records');

    // ── STEP 3: Test getAttendance (with first employee if available) ──
    let attCount = 0;
    if(empArr.length > 0 && empArr[0].opsId) {
      log.push('🔄 Testing getAttendance for ' + empArr[0].opsId + '...');
      const attData = await api('getAttendance', {opsId: empArr[0].opsId});
      attCount = Array.isArray(attData) ? attData.length : 0;
      results.attendance = { count: attCount, sample: (Array.isArray(attData) ? attData.slice(0,2) : []) };
      log.push('📊 Attendance for ' + empArr[0].opsId + ': ' + attCount + ' records');
    } else {
      log.push('⏭ Skipping attendance test (no employees found)');
      results.attendance = { count: 0, skipped: true };
    }

    // ── STEP 4: Test diagnose (if deployed) ──
    log.push('🔄 Testing diagnose action (opsional)...');
    const diagResp = await api('diagnose');
    const diagOk = diagResp && !diagResp.error && diagResp.sheets;
    results.diagnose = diagOk ? diagResp : null;
    if(diagOk) {
      log.push('✅ Diagnose OK: ' + diagResp.sheets.length + ' sheets found');
    } else {
      log.push('⚠ Diagnose not available: ' + (diagResp?.error || 'belum di-deploy'));
    }

    // ── STEP 5: Test setup action ──
    log.push('🔄 Testing setup action...');
    const setupResp = await api('setup');
    results.setup = setupResp;
    log.push(setupResp?.status === 'Success' ? '✅ Setup: ' + setupResp.message : '⚠ Setup: ' + (setupResp?.error || 'unknown'));

    // ── RENDER RESULTS ──
    const isDataEmpty = empArr.length === 0;
    const apiVersion = healthData?.version || '?';
    
    // Diagnose sheet table (if available)
    let sheetsTable = '';
    if(results.diagnose && results.diagnose.sheets) {
      const required = ['DataKaryawan', 'Absensi', 'SlipGaji', 'DataOwner', 'SystemMessage'];
      sheetsTable = `
        <div class="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
          <p class="font-bold text-white mb-2">📋 Daftar Sheet di Spreadsheet:</p>
          <p class="text-slate-500 mb-2">Spreadsheet: <strong class="text-white">${results.diagnose.spreadsheetName||'?'}</strong>
            ${results.diagnose.spreadsheetUrl ? ' — <a href="'+results.diagnose.spreadsheetUrl+'" target="_blank" class="text-accent-cyan hover:underline">Buka ↗</a>' : ''}</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="border-b border-white/10 text-slate-500">
                <th class="text-left py-1.5 px-2">Sheet</th>
                <th class="text-left py-1.5 px-2">Baris Data</th>
                <th class="text-left py-1.5 px-2">Kolom</th>
                <th class="text-left py-1.5 px-2">Headers</th>
              </tr></thead>
              <tbody>${results.diagnose.sheets.map(s => {
                const isReq = required.includes(s.name);
                const clr = s.rows > 0 ? 'text-accent-green' : 'text-accent-orange';
                return '<tr class="border-b border-white/5"><td class="py-1.5 px-2 '+(isReq?'text-white font-bold':'text-slate-400')+'">'+s.name+(isReq?' <span class="chip chip-cyan text-[8px]">required</span>':'')+'</td><td class="py-1.5 px-2 '+clr+' font-bold">'+(s.rows>0?'✅':'⚠️')+' '+s.rows+'</td><td class="py-1.5 px-2 text-slate-500">'+s.columns+'</td><td class="py-1.5 px-2 text-slate-500 text-[10px]">'+(s.headers||[]).slice(0,4).join(', ')+(s.headers?.length>4?'...':'')+'</td></tr>';
              }).join('')}</tbody>
            </table>
          </div>
          ${(results.diagnose.missingSheets||[]).length > 0 ? '<p class="text-red-400 mt-2 font-bold">❌ Sheet hilang: '+(results.diagnose.missingSheets||[]).join(', ')+'</p>' : '<p class="text-accent-green mt-2">✅ Semua required sheet ada</p>'}
        </div>`;
    }

    // Employee sample  
    let empSample = '';
    if(empArr.length > 0) {
      const sample = empArr.slice(0,3);
      const keys = Object.keys(sample[0]).slice(0,6);
      empSample = `
        <div class="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
          <p class="font-bold text-white mb-2">👥 Sample Data Karyawan (${empArr.length} total):</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead><tr class="border-b border-white/10 text-slate-500">${keys.map(k=>'<th class="text-left py-1 px-2">'+k+'</th>').join('')}</tr></thead>
              <tbody>${sample.map(e => '<tr class="border-b border-white/5">'+keys.map(k=>'<td class="py-1 px-2 text-slate-300">'+((e[k]!==null&&e[k]!==undefined)?String(e[k]).substring(0,25):'—')+'</td>').join('')+'</tr>').join('')}</tbody>
            </table>
          </div>
        </div>`;
    }

    // Main result
    const statusColor = isDataEmpty ? 'accent-orange' : 'accent-green';
    const statusIcon = isDataEmpty ? '⚠️' : '✅';
    const statusText = isDataEmpty ? 'API TERHUBUNG, TAPI DATA KOSONG' : 'SEMUA BERFUNGSI NORMAL';

    dr.innerHTML = `
      <div class="space-y-3">
        <!-- Status Utama -->
        <div class="p-4 rounded-xl bg-${statusColor}/10 border border-${statusColor}/30">
          <p class="text-${statusColor} font-bold text-sm">${statusIcon} ${statusText}</p>
          <p class="text-slate-400 mt-1">API Version: <strong class="text-white">${apiVersion}</strong> | Employees: <strong class="text-white">${empArr.length}</strong></p>
        </div>

        ${isDataEmpty ? `
        <!-- PANDUAN MENGATASI DATA KOSONG -->
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
          <p class="text-red-400 font-bold text-sm">🔍 KENAPA DATA KOSONG?</p>
          <div class="text-slate-400 space-y-2">
            <p>API Anda terhubung dan bekerja, tapi sheet <strong class="text-white">DataKaryawan</strong> di Google Sheets kosong atau tidak ditemukan.</p>
            
            <div class="p-3 rounded-lg bg-white/5 space-y-2">
              <p class="text-accent-pink font-bold">Kemungkinan Penyebab:</p>
              <p>❶ <strong class="text-white">Apps Script terpasang di spreadsheet yang salah</strong> — Apps Script harus di-deploy dari spreadsheet yang BERISI data karyawan (bukan spreadsheet kosong baru)</p>
              <p>❷ <strong class="text-white">Nama sheet tidak sesuai</strong> — Sheet harus bernama persis: <code class="text-accent-cyan">DataKaryawan</code>, <code class="text-accent-cyan">Absensi</code>, <code class="text-accent-cyan">SlipGaji</code></p>
              <p>❸ <strong class="text-white">Sheet ada tapi kosong</strong> — Belum ada data di baris ke-2 dan seterusnya</p>
              <p>❹ <strong class="text-white">Format header salah</strong> — Baris pertama harus berisi header kolom (OPS ID, NIK, Name, dll)</p>
            </div>

            <div class="p-3 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20 space-y-2">
              <p class="text-accent-cyan font-bold">🔧 Cara Memperbaiki:</p>
              <p>1. Buka spreadsheet tempat Anda men-deploy Apps Script</p>
              <p>2. Pastikan ada sheet bernama <strong class="text-white">DataKaryawan</strong> dengan data di dalamnya</p>
              <p>3. Jika data Anda ada di spreadsheet lain (misalnya "REKAP DW"), Anda perlu:</p>
              <p class="pl-4">a. Buka spreadsheet yang berisi data → Extensions → Apps Script</p>
              <p class="pl-4">b. Paste kode APPS_SCRIPT_COMPLETE.gs → Deploy → New deployment</p>
              <p class="pl-4">c. Copy URL deployment baru → paste di kolom URL API di atas</p>
              <p>4. Setelah deploy ulang, klik <strong class="text-accent-cyan">Simpan & Muat Ulang</strong></p>
            </div>
          </div>
        </div>` : ''}

        ${sheetsTable}
        ${empSample}

        <!-- Log Detail -->
        <div class="p-3 rounded-xl bg-white/3 border border-white/5">
          <p class="font-bold text-white mb-2">📝 Log Diagnostik:</p>
          <div class="font-mono text-[10px] text-slate-500 space-y-0.5">${log.map(l=>'<p>'+l+'</p>').join('')}</div>
        </div>

        <!-- Quick Actions -->
        <div class="flex flex-wrap gap-2">
          <button onclick="runSetup()" class="px-4 py-2 rounded-xl bg-accent-pink/20 text-accent-pink text-xs font-bold border border-accent-pink/30 hover:bg-accent-pink/30 transition-all">
            🛠 Setup - Buat Sheet yang Hilang
          </button>
          <button onclick="reloadData()" class="px-4 py-2 rounded-xl bg-accent-cyan/20 text-accent-cyan text-xs font-bold border border-accent-cyan/30 hover:bg-accent-cyan/30 transition-all">
            🔄 Muat Ulang Data
          </button>
        </div>
      </div>`;
  } catch(e) {
    dr.innerHTML = `<div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
      <p class="text-red-400 font-bold">❌ Error: ${esc(e.message)}</p>
    </div>`;
  }
}

async function runSetup(){
  const r = await api('setup');
  if(r && r.status === 'Success'){
    showToast('Setup berhasil: ' + r.message,'success');
    runDiagnose();
  } else {
    showToast('Setup gagal: ' + (r?.error || 'Unknown'),'error');
  }
}

async function runDiscoverSheets(){
  const dr = document.getElementById('discoverResult');
  dr.innerHTML = '<p class="text-indigo-400 animate-pulse">⏳ Scanning semua sheet di spreadsheet...</p>';
  
  const res = await api('discoverSheets');
  if(!res || res.error){
    dr.innerHTML = `<div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
      <p class="text-red-400 font-bold">❌ Gagal scan sheet</p>
      <p class="text-slate-400">${res?.error || 'Pastikan Apps Script sudah di-deploy ulang dengan kode terbaru (APPS_SCRIPT_COMPLETE.gs)'}</p>
    </div>`;
    return;
  }
  
  const typeColors = {employees:'accent-cyan',attendance:'accent-green',payslips:'accent-orange',unknown:'slate-500'};
  const typeLabels = {employees:'👥 Karyawan',attendance:'📋 Presensi',payslips:'💰 Payslips',unknown:'❓ Unknown'};
  
  dr.innerHTML = `
    <div class="space-y-3">
      <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
        <p class="text-indigo-400 font-bold">📊 Spreadsheet: ${res.spreadsheetName}</p>
        <p class="text-slate-400 mt-1">${res.sheets.length} sheet ditemukan</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-[10px]">
          <thead><tr class="border-b border-white/10 text-slate-500">
            <th class="py-2 px-2 text-left">Sheet</th>
            <th class="py-2 px-2 text-left">Tipe (AI)</th>
            <th class="py-2 px-2 text-center">Baris</th>
            <th class="py-2 px-2 text-center">Kolom</th>
            <th class="py-2 px-2 text-left">Score (E/A/P)</th>
            <th class="py-2 px-2 text-left">Headers</th>
          </tr></thead>
          <tbody>
            ${res.sheets.map(s => `<tr class="border-b border-white/5 hover:bg-white/3">
              <td class="py-2 px-2 font-bold text-white">${s.name}</td>
              <td class="py-2 px-2"><span class="text-${typeColors[s.guessedType]} font-bold">${typeLabels[s.guessedType]}</span></td>
              <td class="py-2 px-2 text-center text-white">${s.rows}</td>
              <td class="py-2 px-2 text-center">${s.columns}</td>
              <td class="py-2 px-2"><span class="text-accent-cyan">${s.scores.employees}</span>/<span class="text-accent-green">${s.scores.attendance}</span>/<span class="text-accent-orange">${s.scores.payslips}</span></td>
              <td class="py-2 px-2 text-[9px] text-slate-500 max-w-[200px] truncate">${s.headers.join(', ')}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-[9px] text-slate-600">Score = jumlah header yang cocok dengan pola data karyawan (E), presensi (A), atau payslips (P)</p>
    </div>`;
}

async function runAutoLoad(){
  const dr = document.getElementById('discoverResult');
  dr.innerHTML = '<p class="text-accent-green animate-pulse">🧠 Deep Learning Auto-Discovery sedang berjalan...</p>';
  
  // Reset state
  employees=[]; attMap={}; payMap={};
  dbStatus = { connected: true, error: null, emptySheetsWarning: false };
  
  // Run full loadAll (which includes auto-discovery)
  await loadAll();
  
  if(employees.length > 0){
    dr.innerHTML = `<div class="p-3 rounded-xl bg-accent-green/10 border border-accent-green/30">
      <p class="text-accent-green font-bold">✓ Auto-Discovery Berhasil!</p>
      <p class="text-slate-400 mt-1">${employees.length} karyawan, ${Object.values(attMap).flat().length} presensi, ${Object.values(payMap).flat().length} payslips dimuat.</p>
      <button onclick="go('overview')" class="mt-2 px-4 py-2 rounded-xl bg-accent-green/20 text-accent-green text-xs font-bold border border-accent-green/30 hover:bg-accent-green/30 transition-all">
        📊 Lihat Dashboard →
      </button>
    </div>`;
  } else {
    dr.innerHTML = `<div class="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/30">
      <p class="text-accent-orange font-bold">⚠ Tidak menemukan data</p>
      <p class="text-slate-400 mt-1">Auto-Discovery tidak menemukan data karyawan/presensi/gaji yang cocok. Pastikan Apps Script sudah di-deploy ulang dari spreadsheet yang BERISI data.</p>
      <p class="text-slate-500 mt-1 text-[10px]">Coba klik "Scan Semua Sheet" untuk melihat sheet apa saja yang ada di spreadsheet.</p>
    </div>`;
  }
}

async function reloadData(){
  const loaderEl=document.getElementById('loader');
  if(loaderEl) loaderEl.classList.remove('hidden');
  employees=[];attMap={};payMap={};
  dbStatus = { connected: false, error: null, emptySheetsWarning: false };
  await loadAll();
  if(loaderEl) loaderEl.classList.add('hidden');
  if(employees.length > 0) {
    go('overview');
  }
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
async function init(){
  console.log('[BAS] init() started');
  // Check auth
  if(sessionStorage.getItem('bas_owner_auth')!=='true'){
    console.log('[BAS] Auth check failed, redirecting to index.html');
    window.location.href='index.html';
    return;
  }
  console.log('[BAS] Auth OK');
  
  // Apply role-based UI
  applyRoleUI();
  console.log('[BAS] applyRoleUI done');
  
  buildNav();
  console.log('[BAS] buildNav done');
  const loaderEl=document.getElementById('loader');
  const loaderMsg=loaderEl?.querySelector('p');
  loaderEl?.classList.remove('hidden');
  if(loaderMsg) loaderMsg.textContent='Menghubungkan ke Database...';
  
  try {
    await loadAll();
  } catch(err) {
    console.error('[BAS] loadAll error:', err);
    dbStatus.connected=false;
    dbStatus.error=err.message||'Unexpected error';
    showDbBanner();
  }
  
  if(loaderMsg && dbStatus.connected) loaderMsg.textContent='Merender Dashboard & DL Engine...';
  loaderEl?.classList.add('hidden');
  
  // Restore tab from URL hash or default to overview
  const hashTab=(location.hash||'').replace('#','');
  const validTabs=['overview','employees','attendance','payroll','ds','idcard','settings'];
  go(validTabs.includes(hashTab)?hashTab:'overview');
  window.addEventListener('popstate',()=>{const h=(location.hash||'').replace('#','');if(validTabs.includes(h))go(h);});
}

function applyRoleUI() {
  const roleName = ownerProfile.nama || (isKorlap ? 'Korlap' : 'Owner');
  const roleLabel = isKorlap ? 'KORLAP' : 'OWNER';
  // Sidebar — only show role badge (logo is static)
  const rb = document.getElementById('sidebarRoleBadge');
  if (rb) {
    rb.classList.remove('hidden');
    if (isKorlap) {
      rb.innerHTML = `<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-orange/10 border border-accent-orange/20">`
        + `<span class="w-1.5 h-1.5 rounded-full bg-accent-orange animate-pulse"></span>`
        + `<span class="text-[9px] font-bold text-accent-orange uppercase tracking-wider">KORLAP — ${korlapStation}</span>`
        + `</div>`;
    } else {
      rb.innerHTML = `<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-pink/10 border border-accent-pink/20">`
        + `<span class="w-1.5 h-1.5 rounded-full bg-accent-pink animate-pulse"></span>`
        + `<span class="text-[9px] font-bold text-accent-pink uppercase tracking-wider">OWNER</span>`
        + `</div>`;
    }
  }
  
  // Mobile header — show BAS branding, not user name
  const mt = document.getElementById('mobileTitle');
  const ms = document.getElementById('mobileSub');
  if (mt) mt.textContent = 'BAS';
  if (ms) ms.textContent = isKorlap ? 'Korlap — ' + korlapStation : roleLabel;
}

// ═══════════════════════════════════════════════════════════════
//  RENDER: PHOTO MONITOR
// ═══════════════════════════════════════════════════════════════
const PHOTO_API = 'https://super-bas.com/api/absen-foto.php';

function rPhotoMonitor(){
  const el = document.getElementById('tab-photomonitor');
  if (!el) return;

  const today = new Date().toISOString().split('T')[0];
  el.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 class="text-2xl font-black tracking-tight">📷 Monitor Absen Foto</h2>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input type="date" id="pm-date" value="${today}" onchange="loadPhotoLogs()" 
            class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-pink outline-none" />
          <input type="text" id="pm-search" placeholder="Cari nama/OPS..." oninput="loadPhotoLogs()"
            class="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white flex-1 focus:ring-2 focus:ring-accent-pink outline-none" />
        </div>
      </div>
      <div id="pm-bulk-actions" class="hidden flex-wrap items-center gap-2 bg-gradient-to-r from-accent-pink/20 to-accent-orange/20 border border-accent-pink/30 p-3 rounded-2xl animate-fade-in-up">
        <label class="flex items-center gap-2 text-sm font-bold cursor-pointer text-white">
          <input type="checkbox" id="pm-cb-all" class="w-5 h-5 accent-accent-pink rounded cursor-pointer" onchange="toggleAllPhotos(this)">
          Pilih Semua
        </label>
        <div class="flex-1"></div>
        <button onclick="updateSelectedPhotosStatus('DITERIMA')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Terima</button>
        <button onclick="updateSelectedPhotosStatus('DITOLAK')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-red-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> Tolak</button>
        <button onclick="downloadSelectedPhotos()" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-500/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Unduh ZIP</button>
        <button onclick="deleteSelectedPhotos()" class="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-slate-900/50"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg> Hapus</button>
      </div>
      <div id="pm-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
      <div id="pm-list" class="space-y-3">
        <div class="flex items-center justify-center py-12">
          <div class="relative"><div class="w-10 h-10 border-4 border-white/5 rounded-full"></div><div class="w-10 h-10 border-4 border-accent-pink rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div></div>
        </div>
      </div>
    </div>
    <!-- Photo Modal -->
    <div id="pm-modal" class="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl hidden items-center justify-center p-4" onclick="this.classList.add('hidden');this.classList.remove('flex');">
      <div class="max-w-lg w-full" onclick="event.stopPropagation()">
        <img id="pm-modal-img" class="w-full rounded-2xl shadow-2xl" />
        <div id="pm-modal-info" class="mt-3 text-center text-sm text-white/70"></div>
        <button onclick="document.getElementById('pm-modal').classList.add('hidden');document.getElementById('pm-modal').classList.remove('flex');" class="mt-4 mx-auto block bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">Tutup</button>
      </div>
    </div>
  `;

  loadPhotoLogs();
}

async function loadPhotoLogs(){
  const date = document.getElementById('pm-date')?.value || new Date().toISOString().split('T')[0];
  const search = document.getElementById('pm-search')?.value || '';
  const listEl = document.getElementById('pm-list');
  const statsEl = document.getElementById('pm-stats');
  if (!listEl) return;

  try {
    const url = `${PHOTO_API}?action=all-logs&date=${date}&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const result = await res.json();
    
    if (result.error) {
      listEl.innerHTML = `<div class="text-center py-12 text-red-400 font-bold">${esc(result.error)}</div>`;
      return;
    }
    
    const data = result.data || [];
    const total = result.total || data.length;
    const masuk = data.filter(d => d.tipe === 'MASUK').length;
    const keluar = data.filter(d => d.tipe === 'KELUAR').length;
    
    // Stats cards
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="glass rounded-2xl p-4 border border-white/5 text-center">
          <p class="text-2xl font-black text-white">${total}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Record</p>
        </div>
        <div class="glass rounded-2xl p-4 border border-white/5 text-center">
          <p class="text-2xl font-black text-emerald-400">${masuk}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Masuk</p>
        </div>
        <div class="glass rounded-2xl p-4 border border-white/5 text-center">
          <p class="text-2xl font-black text-red-400">${keluar}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keluar</p>
        </div>
        <div class="glass rounded-2xl p-4 border border-white/5 text-center">
          <p class="text-2xl font-black text-cyan-400">${new Set(data.map(d=>d.ops_id)).size}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Karyawan</p>
        </div>
      `;
    }
    
    if (!data.length) {
      listEl.innerHTML = `<div class="text-center py-16 glass rounded-2xl border border-dashed border-white/10">
        <p class="text-slate-500 font-bold text-sm">Belum ada data absen foto untuk tanggal ini</p>
      </div>`;
      return;
    }
    
    listEl.innerHTML = data.map(d => {
      const time = new Date(d.created_at).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
      const typeClass = d.tipe === 'MASUK' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';
      const loc = d.alamat ? d.alamat.split(',').slice(0,2).join(', ') : (d.latitude ? d.latitude+', '+d.longitude : '-');
      const status = d.status || 'PENDING';
      let statusHtml = '<span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⌚ PENDING</span>';
      if(status === 'DITERIMA') statusHtml = '<span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✅ ACC</span>';
      if(status === 'DITOLAK') statusHtml = '<span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border bg-red-500/20 text-red-400 border-red-500/30">❌ REJECT</span>';

      return `
        <div class="glass rounded-2xl p-4 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-accent-pink/30 transition-all">
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <input type="checkbox" class="pm-cb w-5 h-5 accent-accent-pink rounded cursor-pointer shrink-0" value="${d.id}" onchange="refreshPhotoBulkUI()">
            <img src="${esc(d.foto_url)}" class="w-16 h-16 rounded-xl object-cover cursor-pointer shadow-lg border border-white/10 shrink-0" 
                 onclick="showPhotoModal('${esc(d.foto_url)}','${esc(d.nama)} — ${d.tipe} ${time}','${esc(loc)}')" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><rect fill=%22%23240046%22 width=%2264%22 height=%2264%22/><text x=%2232%22 y=%2238%22 fill=%22%23666%22 text-anchor=%22middle%22 font-size=%2220%22>📷</text></svg>'" />
            <div class="flex-1 min-w-0 sm:hidden">
              <div class="flex items-center justify-between mb-1">
                <span class="font-black text-white text-sm truncate pr-2">${esc(d.nama)}</span>
                <p class="text-sm font-black text-white tabular-nums">${time}</p>
              </div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">${esc(d.ops_id)} · ${d.station||'-'}</p>
              <div class="flex gap-1 flex-wrap">${statusHtml} <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${typeClass}">${d.tipe}</span></div>
            </div>
          </div>
          
          <div class="hidden sm:block flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-black text-white text-sm truncate">${esc(d.nama)}</span>
              <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${typeClass}">${d.tipe}</span>
              ${statusHtml}
            </div>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">${esc(d.ops_id)} · ${d.station||'-'}</p>
            <p class="text-[10px] text-slate-500 truncate mt-0.5">📍 ${esc(loc)}</p>
          </div>
          
          <div class="hidden sm:block text-right shrink-0 px-2 border-r border-white/10 pr-4 mr-2">
            <p class="text-xl font-black text-white tabular-nums">${time}</p>
          </div>

          <div class="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 mt-3 sm:mt-0">
            <div class="flex gap-1">
              <button onclick="updatePhotoStatus(${d.id}, 'DITERIMA')" class="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 p-2 rounded-lg transition-colors" title="Terima"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></button>
              <button onclick="updatePhotoStatus(${d.id}, 'DITOLAK')" class="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 p-2 rounded-lg transition-colors" title="Tolak"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div class="flex gap-1">
              <button onclick="downloadPhotos([${d.id}])" class="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/30 p-2 rounded-lg transition-colors" title="Unduh"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
              <button onclick="deletePhotos([${d.id}])" class="bg-slate-700/50 hover:bg-slate-700 text-slate-300 border border-slate-600 p-2 rounded-lg transition-colors" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
          </div>
        </div>`;
    }).join('');
    refreshPhotoBulkUI();
  } catch(e) {
    console.error('Photo monitor error:', e);
    listEl.innerHTML = `<div class="text-center py-12"><p class="text-red-400 font-bold mb-2">Gagal memuat data</p><p class="text-slate-500 text-xs">${esc(e.message)}</p><p class="text-slate-600 text-[10px] mt-2">Pastikan API endpoint aktif: ${PHOTO_API}</p></div>`;
  }
}

function showPhotoModal(url, info, loc){
  const modal = document.getElementById('pm-modal');
  const img = document.getElementById('pm-modal-img');
  const infoEl = document.getElementById('pm-modal-info');
  if(!modal||!img) return;
  img.src = url;
  if(infoEl) infoEl.innerHTML = `<p class="font-bold">${info}</p><p class="text-white/50 text-xs mt-1">📍 ${loc}</p>`;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// ═══════════════════════════════════════════════════════════════
//  PHOTO MONITOR ACTIONS (Status, Delete, Bulk Download)
// ═══════════════════════════════════════════════════════════════
window.toggleAllPhotos = function(el) {
  const cbs = document.querySelectorAll('.pm-cb');
  cbs.forEach(cb => cb.checked = el.checked);
  refreshPhotoBulkUI();
};

window.refreshPhotoBulkUI = function() {
  const cbs = Array.from(document.querySelectorAll('.pm-cb'));
  const checked = cbs.filter(c => c.checked).length;
  const bulkBar = document.getElementById('pm-bulk-actions');
  const cbAll = document.getElementById('pm-cb-all');
  if (cbAll) cbAll.checked = (checked > 0 && checked === cbs.length);
  if (bulkBar) {
    if (cbs.length > 0) {
      bulkBar.classList.remove('hidden');
      bulkBar.classList.add('flex');
    } else {
      bulkBar.classList.add('hidden');
      bulkBar.classList.remove('flex');
    }
  }
};

window.getSelectedPhotoIds = function() {
  return Array.from(document.querySelectorAll('.pm-cb:checked')).map(c => c.value);
};

window.updatePhotoStatus = async function(id, status) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return;
  try {
    const res = await fetch(PHOTO_API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-status', ids, status })
    });
    const result = await res.json();
    if (result.success) loadPhotoLogs();
    else alert('Gagal: ' + (result.error || 'Server error'));
  } catch (e) { alert('Network error'); }
};

window.updateSelectedPhotosStatus = function(status) {
  const ids = getSelectedPhotoIds();
  if (!ids.length) return alert('Pilih foto terlebih dahulu!');
  if (confirm(`Anda yakin ingin mengubah status ${ids.length} absen menjadi ${status}?`)) {
    updatePhotoStatus(ids, status);
  }
};

window.deletePhotos = async function(ids) {
  if (!ids.length) return;
  if (!confirm(`Hapus permanen ${ids.length} data absen (termasuk filenya)?`)) return;
  try {
    const res = await fetch(PHOTO_API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids })
    });
    const result = await res.json();
    if (result.success) loadPhotoLogs();
    else alert('Gagal hapus: ' + (result.error || 'Server error'));
  } catch (e) { alert('Network error'); }
};

window.deleteSelectedPhotos = function() {
  const ids = getSelectedPhotoIds();
  if (!ids.length) return alert('Pilih foto terlebih dahulu!');
  deletePhotos(ids);
};

window.downloadPhotos = function(ids) {
  if (!ids.length) return;
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = PHOTO_API;
  form.target = '_blank';
  
  const hAction = document.createElement('input');
  hAction.type = 'hidden'; hAction.name = 'action'; hAction.value = 'download-zip';
  form.appendChild(hAction);
  
  const hIds = document.createElement('input');
  hIds.type = 'hidden'; hIds.name = 'ids'; hIds.value = ' ' + ids.join(',') + ' '; 
  // note: prepending/appending space ensures the browser doesn't trip on purely numeric URLs in some setups, but we just want an array. The backend explodes by comma and calls TRIM. Actually backend explode(',') handles it fine. Let's just join.
  hIds.value = ids.join(',');
  form.appendChild(hIds);
  
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

window.downloadSelectedPhotos = function() {
  const ids = getSelectedPhotoIds();
  if (!ids.length) return alert('Pilih foto terlebih dahulu!');
  downloadPhotos(ids);
};

console.log('[BAS] Calling init()...');
init();

// Chart.js loads async — initialize when ready
window.addEventListener('load', function() {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = 'Inter';
    setChartTheme();
    console.log('[BAS] Chart.js loaded & initialized');
    // Re-render current tab to pick up charts
    if (curTab && typeof go === 'function') {
      var R={overview:typeof rOverview!=='undefined'?rOverview:null};
      if (R[curTab]) R[curTab]();
    }
  } else {
    console.warn('[BAS] Chart.js CDN not reachable — charts disabled');
  }
});
