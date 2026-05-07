let chartInstances={};
function destroyChart(id){if(chartInstances[id]){chartInstances[id].destroy();delete chartInstances[id];}}

async function loadOverview(){
  try{
    const d=await api('stats.php?action=overview');
    const g=Q('#statGrid');
    g.innerHTML=[
      {l:'Total Kandidat',v:d.total,a:true,t:'+'+d.today.total+' hari ini',up:d.today.total>0},
      {l:'Driver',v:d.driver,t:'+'+d.today.driver+' hari ini',up:d.today.driver>0},
      {l:'Kurir',v:d.kurir,t:'+'+d.today.kurir+' hari ini',up:d.today.kurir>0},
      {l:'Daily Worker',v:d.daily_worker,t:'+'+d.today.daily_worker+' hari ini',up:d.today.daily_worker>0}
    ].map(c=>`<div class="stat-card${c.a?' stat-card--accent':''}"><div class="stat-label">${c.l}</div><div class="stat-value">${c.v.toLocaleString('id-ID')}</div><div class="stat-trend ${c.up?'up':'down'}">${c.t}</div></div>`).join('');

    // Status chart
    const statusData=d.by_status||{};
    const sLabels=Object.keys(statusData),sValues=Object.values(statusData);
    const sColors=['#38BDF8','#FBBF24','#8B5CF6','#22C55E','#EF4444','#EF4444'];
    destroyChart('chartStatus');
    chartInstances.chartStatus=new Chart(Q('#chartStatus'),{type:'doughnut',data:{labels:sLabels,datasets:[{data:sValues,backgroundColor:sColors.slice(0,sLabels.length),borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#999',font:{size:11},padding:12}}}}});

    // Pass rate chart
    destroyChart('chartPassRate');
    chartInstances.chartPassRate=new Chart(Q('#chartPassRate'),{type:'doughnut',data:{labels:['Lulus','Tidak Lulus'],datasets:[{data:[d.lulus||0,d.tidak_lulus||0],backgroundColor:['#22C55E','#EF4444'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#999',font:{size:11}}}},cutout:'65%'}});

    loadTrend();
    loadCities();
  }catch(e){console.error('Overview error:',e);toast('Gagal memuat overview','error');}
}

async function loadTrend(){
  try{
    const d=await api('stats.php?action=trend&days=30');
    const allDates=new Set();
    ['driver','kurir','daily_worker'].forEach(p=>(d[p]||[]).forEach(r=>allDates.add(r.date)));
    const dates=[...allDates].sort();
    const mkData=(p)=>dates.map(dt=>{const f=(d[p]||[]).find(r=>r.date===dt);return f?parseInt(f.cnt):0;});
    destroyChart('chartTrend');
    chartInstances.chartTrend=new Chart(Q('#chartTrend'),{type:'line',data:{labels:dates.map(d=>d.slice(5)),datasets:[
      {label:'Driver',data:mkData('driver'),borderColor:'#38BDF8',backgroundColor:'rgba(56,189,248,.1)',tension:.4,fill:true,pointRadius:1},
      {label:'Kurir',data:mkData('kurir'),borderColor:'#FBBF24',backgroundColor:'rgba(251,191,36,.1)',tension:.4,fill:true,pointRadius:1},
      {label:'Daily Worker',data:mkData('daily_worker'),borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.1)',tension:.4,fill:true,pointRadius:1}
    ]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:'#666',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#666',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}}},plugins:{legend:{labels:{color:'#999',font:{size:11}}}}}});
  }catch(e){console.error('Trend error:',e);}
}

async function loadCities(){
  try{
    const d=await api('stats.php?action=top_cities&limit=8');
    const labels=d.map(r=>r.city),values=d.map(r=>parseInt(r.total));
    destroyChart('chartCities');
    chartInstances.chartCities=new Chart(Q('#chartCities'),{type:'bar',data:{labels,datasets:[{label:'Pelamar',data:values,backgroundColor:'rgba(56,189,248,.5)',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',scales:{x:{ticks:{color:'#666',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#999',font:{size:10}},grid:{display:false}}},plugins:{legend:{display:false}}}});
  }catch(e){console.error('Cities error:',e);}
}
