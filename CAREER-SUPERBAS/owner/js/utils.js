const API='api/',Q=s=>document.querySelector(s),QQ=s=>document.querySelectorAll(s);
async function api(ep,o={}){o.credentials='include';if(o.body&&typeof o.body==='object'){o.headers={'Content-Type':'application/json'};o.body=JSON.stringify(o.body);}const r=await fetch(API+ep,o);if(!r.ok)throw await r.json().catch(()=>({error:'fail'}));return r.json();}
function toast(m,t='success'){const c=Q('#toastContainer'),d=document.createElement('div');d.className='toast toast--'+t;d.textContent=m;c.appendChild(d);setTimeout(()=>{d.remove();},3500);}
function openModal(t,b,f=''){Q('#modalTitle').textContent=t;Q('#modalBody').innerHTML=b;Q('#modalFooter').innerHTML=f;Q('#modalOverlay').classList.add('show');}
function closeModal(){Q('#modalOverlay').classList.remove('show');}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function badge(s){return'badge badge-'+(s||'').toLowerCase().replace(/\s+/g,'');}
function fmtDate(d){if(!d)return'-';try{return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return d;}}
