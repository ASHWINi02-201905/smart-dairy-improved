/* Home extras: best sellers (only when real sales exist), about/quality text from settings. */
(()=>{const g=id=>document.getElementById(id),sold={};(D.deliveries||[]).filter(x=>x.status=='Delivered').forEach(x=>sold[x.pid]=(sold[x.pid]||0)+x.qty);
const top=D.products.filter(p=>p.active&&sold[p.id]).sort((a,b)=>sold[b.id]-sold[a.id]).slice(0,4);if(top.length&&g('best')){g('best').hidden=false;g('bp').innerHTML=top.map(card).join('')}})();
