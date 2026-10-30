/* Public website – reads the same localStorage "database" as the admin demo. */
const NIL=new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':NIL,set:()=>true,apply:()=>NIL});/* absorbs calls on elements missing from the current page */
const K='smartdairy_v1',$=s=>document.querySelector(s)||NIL,fm=n=>'₹'+(+n||0).toFixed(2),
esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D=JSON.parse(localStorage.getItem(K)||'null')||seed();
D.orders=D.orders||[];D.users=D.users||[];D.co=D.co||{};
const save=()=>localStorage.setItem(K,JSON.stringify(D)),toast=m=>{const t=$('#toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2500)};
let cart=JSON.parse(localStorage.sd_cart||'[]'),cat='',q='',pg=0,sort='';
const U=D.users.find(u=>u.id==sessionStorage.uid),Pr=id=>D.products.find(x=>x.id==id),ICON={Milk:ICO('milk',44),Curd:ICO('bowl',44),Paneer:ICO('cheese',44),Butter:ICO('butter',44),Ghee:ICO('jar',44),Cheese:ICO('cheese',44),Buttermilk:ICO('milk',44),Lassi:ICO('cup',44),Cream:ICO('icecream',44),Milkshakes:ICO('cup',44),'Ice Cream':ICO('icecream',44),Other:ICO('bag',44)};
const link=(l,h)=>`<div class="dd"><a class="tl" href="${h}">${l}</a></div>`;
$('#menu').innerHTML=link('Home','index.html')+link('About Us','about.html')+link('Our Products','shop.html')+`<div class="dd"><span onclick="this.parentNode.classList.toggle('open')">Categories ▾</span><div>${CATS.filter(c=>!c.opt||catCount(c)).map(c=>`<a href="category.html?c=${c.s}">${c.n}</a>`).join('')}</div></div>`+link('Quality Assurance','quality.html')+link('Gallery','gallery.html')+link('Contact Us','contact.html');
function kw(l){const w=l.toLowerCase().replace(/ and /g,' ').split(' ').filter(x=>x.length>2&&!['fresh','other','dairy','products'].includes(x));q=w.join(/ and /i.test(l)?'|':'&');pg=0;cat='';$('#cf').value='';$('#gs').value=l;draw()}
const act=()=>D.products.filter(p=>p.active);
const match=p=>{if(!q)return 1;const t=(p.name+' '+p.cat).toLowerCase();return q.includes('&')?q.split('&').every(w=>t.includes(w)):q.split('|').some(w=>t.includes(w.toLowerCase()))};
function card(p){const lab=D.products.indexOf(p)>=D.products.length-2&&D.products.length>4?'<span class="pill n">New</span> ':'';
return`<div class="card pcard"><div class="pimg">${imgFor(p)?`<img src="${imgFor(p)}" alt="${esc(p.name)}" loading="lazy">`:(ICON[p.cat]||ICO('milk',44))}</div>${lab}<span class="pill">${esc(p.cat)}</span><b>${esc(p.name)}</b><div>${fm(p.price)} / ${p.unit}</div><small>${p.stock>0?'In stock':'<span class="pill x">Out of stock</span>'}</small><br>
<input type="number" min="1" value="1" id="q${p.id}" aria-label="Quantity"> <button class="btn sm" ${p.stock>0?'':'disabled'} onclick="add('${p.id}')">Add to Cart</button> <button class="btn sm alt" ${p.stock>0?'':'disabled'} onclick="add('${p.id}',1)">Buy Now</button> <a class="btn sm alt" href="product.html?id=${p.id}">View Details</a> <button class="wish ${wl().includes(p.id)?'on':''}" onclick="wish('${p.id}',this)" aria-label="Wishlist">${ICO('heart',18)}</button></div>`}
function draw(){const mp=+$('#mp').value||1e9;let L=act().filter(p=>(!cat||p.cat==cat)&&match(p)&&p.price<=mp);if(sort=='p')L.sort((a,b)=>a.price-b.price);if(sort=='n')L.sort((a,b)=>a.name.localeCompare(b.name));
const n=Math.ceil(L.length/8)||1;pg=Math.min(pg,n-1);$('#pl').innerHTML=L.slice(pg*8,pg*8+8).map(card).join('')||'<p>No products found.</p>';
$('#pp').innerHTML=`Page ${pg+1}/${n} <button class="btn sm" onclick="pg=Math.max(0,pg-1);draw()">‹</button> <button class="btn sm" onclick="pg=Math.min(${n-1},pg+1);draw()">›</button>`;
$('#fp').innerHTML=act().slice(0,4).map(card).join('')||'<p>No products published yet.</p>';$('#np').innerHTML=act().slice(-4).reverse().map(card).join('')||'<p>No products yet.</p>'}
/* cart */
function add(id,buy){const n=+$('#q'+id)?.value||1,p=Pr(id),e=cart.find(x=>x.pid==id);if(n>p.stock)return toast('Only '+p.stock+' in stock');e?e.qty+=n:cart.push({pid:id,qty:n});cs();toast('Added to cart');if(buy)openCart()}
const cs=()=>{localStorage.sd_cart=JSON.stringify(cart);$('#cc').textContent=cart.reduce((a,x)=>a+x.qty,0)};
function openCart(){const t=cart.reduce((a,x)=>a+x.qty*Pr(x.pid).price,0);$('#cd').innerHTML=`<h3>Your cart</h3>${cart.map(x=>`<p>${esc(Pr(x.pid).name)} × ${x.qty} – ${fm(x.qty*Pr(x.pid).price)} <button class="btn sm alt" onclick="rm('${x.pid}')">Remove</button></p>`).join('')||'<p>Cart is empty.</p>'}<p><b>Total ${fm(t)}</b></p><button class="btn" onclick="checkout()" ${cart.length?'':'disabled'}>Checkout</button> <button class="btn alt" onclick="cd.close()">Close</button>`;cd.showModal()}
const rm=id=>{cart=cart.filter(x=>x.pid!=id);cs();openCart()};
function checkout(){if(!U||U.role!='customer'){if(confirm('Please log in as a customer to place your order. Go to login?'))location='app.html';return}
const t=new Date().toISOString().slice(0,10);cart.forEach(x=>D.orders.push({id:Math.random().toString(36).slice(2,9),cid:U.cid,pid:x.pid,date:t,qty:x.qty,status:'Pending'}));save();cart=[];cs();cd.close();toast('Order placed – pending confirmation by the dairy')}
function news(e){e.preventDefault();(D.newsletter=D.newsletter||[]).push({email:$('#ne').value,at:new Date().toISOString()});save();e.target.reset();toast('Signed up – thank you')}
/* init */
const nm=D.co.name||'Daily Dairy Needs';$('#bn').textContent=nm;$('#fn').textContent=nm;
$('#annT').textContent=D.co.ann||'Fresh dairy, delivered daily. Edit this announcement in Admin → Settings.';
$('#area').textContent='Delivery area: '+($('#loc').value)+' (edit delivery areas in settings).';
$('#ct').innerHTML=`Phone: ${esc(D.co.phone||'add in Settings')}<br>Operating hours and delivery areas: add in Settings. No map is shown until a real location is configured.`;
const cats=[...new Set(act().map(p=>p.cat))];$('#cf').innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${c}</option>`).join('');
$('#cg').innerHTML=['Cow Milk','Buffalo Milk','Milk','Curd','Paneer','Butter','Ghee','Cheese','Sweets','Cream','Buttermilk','Lassi','Milkshakes','Ice Cream'].map(c=>{const k={'Cow Milk':'cow','Buffalo Milk':'buffalo',Milk:'milk',Curd:'curd',Paneer:'paneer',Butter:'butter',Ghee:'ghee',Cheese:'cheese',Cream:'cream',Sweets:'sweet'}[c];return`<div class="card c" tabindex="0" onclick="location='shop.html?f='+encodeURIComponent('${c}')"><i>${k?`<img src="${PIMG[k]}" alt="">`:(ICON[c]||ICO('bag',44))}</i>${c}</div>`}).join('');
if(U){$('#acct').textContent=U.name;$('#acct').href='app.html';
if(U.role=='customer'){const c=D.customers.find(c=>c.id==U.cid),t=new Date().toISOString().slice(0,10),m=t.slice(0,7),dv=D.deliveries.filter(x=>x.cid==U.cid),dd=dv.filter(x=>x.status=='Delivered'&&x.date.startsWith(m)),amt=a=>a.reduce((s,x)=>s+x.qty*x.price,0);
$('#mine').hidden=0;$('#mineB').innerHTML=`<b>Today:</b> ${dv.filter(x=>x.date==t).map(x=>esc(Pr(x.pid)?.name)+' ×'+x.qty+' ('+x.status+')').join(', ')||'No delivery recorded yet'}<br><b>Billing:</b> ${c.billing||'Monthly'}<br><b>This month:</b> ${dd.length} deliveries · ${fm(amt(dd))}<br><a href="app.html">View full statement</a>`}}
cs();draw();

/* hero: small "visit us offline" map box */
(()=>{const L=D.co||{},la=parseFloat(L.lat),ln=parseFloat(L.lng),ok=L.lat!==''&&L.lng!==''&&L.lat!=null&&L.lng!=null&&la>=-90&&la<=90&&ln>=-180&&ln<=180;
$('#mapbox').innerHTML=(ok?`<iframe title="Dairy location map" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${ln-.006}%2C${la-.004}%2C${ln+.006}%2C${la+.004}&layer=mapnik&marker=${la}%2C${ln}"></iframe>`:`<div class="ph0">${ICO('pin',22)} Map not set up yet.<br>Add address, latitude and longitude in Admin → Settings.</div>`)+
`<div class="mi"><b>Visit our dairy</b><br>${esc(L.addr||'Address not set')}<br>${esc(L.hours||'')}${ok?`<br><a href="https://www.google.com/maps?q=${la},${ln}" target="_blank" rel="noopener">Get directions</a>`:''}</div>`})();

/* billing options, enquiry, polish */
(()=>{const c=U&&U.role=='customer'?D.customers.find(x=>x.id==U.cid):null,T=['Daily','Weekly','Monthly'];
const paint=()=>{T.forEach(t=>$('#bo-'+t).classList.toggle('sel',!!c&&(c.billing||'Monthly')==t));$('#boMine').innerHTML=c?`<p>Your current billing preference: <b>${c.billing||'Monthly'}</b>. Select a card to change it – it applies to future bills.</p>`:'<p><a class="btn" href="app.html">Login / Register to choose</a></p>'};
const pick=t=>{if(!c)return toast('Please log in as a customer to choose');c.billing=t;save();paint();toast('Billing preference saved: '+t)};
T.forEach(t=>{const e=$('#bo-'+t);e.tabIndex=0;e.onclick=()=>pick(t);e.onkeydown=k=>{if(k.key=='Enter'||k.key==' '){k.preventDefault();pick(t)}}});paint();
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.06});
document.querySelectorAll('section:not(.hero)').forEach(s=>{s.classList.add('rv');io.observe(s)});
const nav=$('.nav'),up=$('#up'),pb=$('#pb');addEventListener('scroll',()=>{const h=document.documentElement,m=h.scrollHeight-innerHeight;pb.style.width=(m>0?scrollY/m*100:0)+'%';up.style.display=scrollY>600?'block':'none';nav.classList.toggle('sh',scrollY>10)},{passive:true});
$('#menu').addEventListener('click',e=>{if(e.target.closest('a'))$('#menu').classList.remove('show')});
const dg=(D.co.phone||'').replace(/\D/g,'');if(dg.length>=10&&/[1-9]/.test(dg.slice(-10))){const w=$('#wa');w.href='https://wa.me/'+(dg.length==10?'91'+dg:dg);w.hidden=0}
if(U){const l=document.createElement('a');l.className='ib';l.href='#';l.textContent='Logout';l.onclick=e=>{e.preventDefault();sessionStorage.clear();location.reload()};$('#acct').after(l);$('#acct').textContent=(U.role=='admin'?'Admin dashboard':'My dashboard')}})();
function enq(e){e.preventDefault();(D.msgs=D.msgs||[]).push({id:Math.random().toString(36).slice(2,9),name:$('#en').value,mobile:$('#em2').value,text:$('#et').value,at:new Date().toISOString()});save();e.target.reset();toast('Enquiry sent – the dairy will contact you')}

/* notifications, product details, location */
function notif(){const it=[];if(U&&U.role=='customer'){D.orders.filter(o=>o.cid==U.cid).slice(-5).reverse().forEach(o=>it.push(`Order ${esc(Pr(o.pid)?.name)} ×${o.qty}: ${o.status}`));(D.invoices||[]).filter(i=>i.cid==U.cid).slice(-3).reverse().forEach(i=>it.push(`Bill ${i.no}: ${fm(i.due)} due by ${i.dueDate}`))}
D.products.filter(p=>p.active).slice(-3).reverse().forEach(p=>it.push(`Available: ${esc(p.name)} (${fm(p.price)}/${p.unit})`));
$('#cd').innerHTML=`<h3>Notifications</h3>${it.map(x=>`<p>• ${x}</p>`).join('')||'<p>No notifications.</p>'}${U?'':'<p><a href="app.html">Log in</a> to see your order and bill updates.</p>'}<button class="btn alt" onclick="cd.close()">Close</button>`;cd.showModal()}
function det(id){const p=Pr(id);$('#cd').innerHTML=`${imgBig(p)}<h3>${esc(p.name)}</h3><p><span class="pill">${esc(p.cat)}</span></p><p>${fm(p.price)} / ${p.unit}<br>${p.stock>0?'In stock':'Out of stock'}</p><p>${esc(p.desc||'No description added yet.')}</p><button class="btn" ${p.stock>0?'':'disabled'} onclick="add('${id}');cd.close()">Add to Cart</button> <button class="btn alt" onclick="cd.close()">Close</button>`;cd.showModal()}
function setLoc(v){localStorage.sd_loc=v;$('#area').textContent='Delivery area: '+v+' (edit delivery areas in settings).'}
if(localStorage.sd_loc){$('#loc').value=localStorage.sd_loc;setLoc(localStorage.sd_loc)}

/* hero entrance timeline (Web Animations API) + optional looping scene video */
(()=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const seq=(el,d)=>el&&el.animate([{opacity:0,transform:'translateY(40px)',filter:'blur(12px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:900,delay:d,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
const n=document.querySelector('.nav');n&&n.animate([{opacity:0,transform:'translateY(-30px)'},{opacity:1,transform:'none'}],{duration:700,fill:'backwards',easing:'ease-out'});
seq($('.hlogo'),100);seq($('.hk'),250);document.querySelectorAll('.hl').forEach((e,i)=>seq(e,400+i*160));seq($('.hs'),950);document.querySelectorAll('.hb a').forEach((e,i)=>seq(e,1050+i*120));seq($('.hero2 .hr'),1300);document.querySelectorAll('.hc').forEach((e,i)=>seq(e,1450+i*140));
const v=$('#hv');v.addEventListener('loadeddata',()=>{v.classList.add('on');v.play().catch(()=>{})});v.addEventListener('error',()=>v.remove());v.src='assets/video/hero.mp4'})();

/* search + deep links from other pages */
function gsearch(v){if(document.getElementById('pl')){q=v;pg=0;draw()}}
function gsub(e){e.preventDefault();const v=$('#gs').value;if(!document.getElementById('pl'))location='shop.html?q='+encodeURIComponent(v)}
(()=>{const P=new URLSearchParams(location.search),f=P.get('f'),s=P.get('q');if(f)kw(f);if(s){q=s;$('#gs').value=s;draw()}})();

/* wishlist */
function wl(){try{return JSON.parse(localStorage.sd_wish||'[]')}catch(e){return[]}}
function wish(id,b){let w=wl();w=w.includes(id)?w.filter(x=>x!=id):[...w,id];localStorage.sd_wish=JSON.stringify(w);b&&b.classList.toggle('on',w.includes(id));toast(w.includes(id)?'Added to wishlist':'Removed from wishlist')}
function wishList(){const L=wl().map(Pr).filter(Boolean);$('#cd').innerHTML=`<h3>Wishlist</h3>${L.map(p=>`<p><a href="product.html?id=${p.id}">${esc(p.name)}</a> – ${fm(p.price)}/${p.unit}</p>`).join('')||'<p>Your wishlist is empty.</p>'}<button class="btn alt" onclick="cd.close()">Close</button>`;cd.showModal()}
