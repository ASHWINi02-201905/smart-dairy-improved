/* Page renderers: category grid, category page, product page, gallery, counters, timeline. */
const catCard=c=>`<a class="card ccard" href="category.html?c=${c.s}">${c.img?`<img src="${PIMG[c.img]}" alt="${c.n}" loading="lazy">`:`<div class="cico">${ICO(c.i,48)}</div>`}<b>${c.n}</b><small>${catCount(c)} product${catCount(c)==1?'':'s'}</small></a>`;
(()=>{const P=new URLSearchParams(location.search),$$=id=>document.getElementById(id);
const cg=$$('catgrid');if(cg)cg.innerHTML=CATS.filter(c=>!c.opt||catCount(c)).map(catCard).join('');
const cl=$$('catlist');if(cl){const c=CATS.find(x=>x.s==P.get('c'))||CATS[0],L=D.products.filter(p=>p.active&&catMatch(c,p));document.title=c.n+' – Daily Dairy Needs';
$$('cathead').innerHTML=`<h1>${c.n}</h1><p>${L.length} product${L.length==1?'':'s'} available · <a href="categories.html">All categories</a></p>`;
cl.innerHTML=L.map(card).join('')||`<div class="empty">${ICO(c.i,40)}<p>No ${c.n} products are listed right now.</p><a class="btn" href="shop.html">Browse all products</a></div>`;
const o=$$('catother');if(o)o.innerHTML=CATS.filter(x=>x.s!=c.s&&(!x.opt||catCount(x))).map(x=>`<a class="chip" href="category.html?c=${x.s}">${x.n}</a>`).join('')}
const pi=$$('pdinfo');if(pi){const p=Pr(P.get('id'));if(!p||!p.active){pi.innerHTML='<h1>Product not found</h1><p><a class="btn" href="shop.html">Back to products</a></p>';$$('pdmoreWrap').hidden=true}else{
document.title=p.name+' – Daily Dairy Needs';const im=imgFor(p),sec=(t,v)=>v?`<div class="pdsec"><h3>${t}</h3><p>${esc(v)}</p></div>`:'';
$$('pdimg').innerHTML=im?`<img src="${im}" alt="${esc(p.name)}">`:`<div class="cico big">${ICO('bag',80)}</div>`;
pi.innerHTML=`<p><span class="pill">${esc(p.cat)}</span></p><h1>${esc(p.name)}</h1><p class="price">${fm(p.price)} <small>/ ${p.unit}</small></p><p>${p.stock>0?'In stock':'<span class="pill x">Out of stock</span>'}</p><p>${esc(p.desc||'')}</p>
<div class="tools"><label>Quantity<input type="number" id="q${p.id}" min="1" value="1" style="width:80px"></label></div><p><button class="btn" ${p.stock>0?'':'disabled'} onclick="add('${p.id}')">Add to Cart</button> <button class="btn alt" ${p.stock>0?'':'disabled'} onclick="add('${p.id}',1)">Buy Now</button> <button class="wish ${wl().includes(p.id)?'on':''}" onclick="wish('${p.id}',this)" aria-label="Wishlist">${ICO('heart',20)}</button></p>`+sec('Ingredients',p.ingr)+sec('Nutritional information',p.nutr)+sec('Storage instructions',p.store);
const s=document.createElement('script');s.type='application/ld+json';s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:p.name,image:im?new URL(im,location).href:undefined,description:p.desc||undefined,category:p.cat,offers:{'@type':'Offer',priceCurrency:'INR',price:(+p.price).toFixed(2),availability:p.stock>0?'https://schema.org/InStock':'https://schema.org/OutOfStock'}});document.head.appendChild(s);
const R=D.products.filter(x=>x.active&&x.id!=p.id&&x.cat==p.cat).slice(0,4);$$('rel').innerHTML=R.map(card).join('');if(!R.length)$$('pdmoreWrap').hidden=true}}
const gl=$$('gal');if(gl){const G=[['shed','Our cattle shed'],['cow','Cow'],['buffalo','Buffalo'],['milk','Milk'],['curd','Curd'],['paneer','Paneer'],['butter','Butter'],['ghee','Ghee'],['cheese','Cheese'],['cream','Cream'],['sweet','Dairy sweets']];
gl.innerHTML=G.map(([k,t])=>`<figure><button onclick="lb('${k}','${t}')" aria-label="Enlarge ${t}"><img src="${PIMG[k]}" alt="${t}" loading="lazy"></button><figcaption>${t}</figcaption></figure>`).join('')}
/* counters from live data */
document.querySelectorAll('.cnt').forEach(e=>{const v={products:D.products.filter(p=>p.active).length,categories:CATS.filter(c=>catCount(c)).length,billing:3}[e.dataset.k]||0;e.dataset.n=v;e.textContent='0'});
const run=e=>{const n=+e.dataset.n;if(matchMedia('(prefers-reduced-motion:reduce)').matches||!n){e.textContent=n;return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1200);e.textContent=Math.round(n*(1-Math.pow(1-k,3)));k<1&&requestAnimationFrame(f)})(t0)};
const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){if(x.target.classList.contains('cnt'))run(x.target);else x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.3});
document.querySelectorAll('.cnt,.tl-item').forEach(e=>io.observe(e));
if(window.gsap&&window.ScrollTrigger&&!matchMedia('(prefers-reduced-motion:reduce)').matches){gsap.registerPlugin(ScrollTrigger);document.querySelectorAll('.tline').forEach(t=>gsap.fromTo(t,{'--prog':'0%'},{'--prog':'100%',ease:'none',scrollTrigger:{trigger:t,start:'top 70%',end:'bottom 60%',scrub:true}}));
gsap.utils.toArray('.parallax').forEach(el=>gsap.to(el,{yPercent:-12,ease:'none',scrollTrigger:{trigger:el.parentNode,scrub:true}}))}})();
function lb(k,t){$('#cd').innerHTML=`<img src="${PIMG[k]}" alt="${t}" style="width:100%;border-radius:12px"><p>${t}</p><button class="btn alt" onclick="cd.close()">Close</button>`;cd.showModal()}
/* About / certifications text from settings */
(()=>{const g=id=>document.getElementById(id),c=D.co||{};if(g('aboutTxt')&&c.about)g('aboutTxt').textContent=c.about;
if(g('mvTxt')&&(c.mission||c.vision))g('mvTxt').innerHTML=(c.mission?'<b>Mission:</b> '+esc(c.mission)+'<br>':'')+(c.vision?'<b>Vision:</b> '+esc(c.vision):'');
if(g('certs')&&c.cert){g('certs').hidden=false;g('certTxt').textContent=c.cert}})();
