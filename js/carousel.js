/* Curved, draggable, auto-scrolling product carousel (cylinder-style geometry). Units: 1440-wide frame (640 on phones). */
(()=>{const el=document.getElementById('hcar');if(!el||typeof PIMG==='undefined')return;
const IT=[['milk','Fresh Milk'],['cow','Cow Milk'],['curd','Curd'],['paneer','Paneer'],['buffalo','Buffalo Milk'],['butter','Butter'],['ghee','Ghee'],['cheese','Cheese'],['cream','Cream'],['sweet','Dairy Sweets']],
reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,N=IT.length,P=196,L=N*P,SPEED=50;
el.innerHTML=IT.map(([k,t])=>`<a class="hk-card" role="button" tabindex="0" data-k="${t}"><img src="${PIMG[k]}" alt="${t}" draggable="false"><span>${t}</span></a>`).join('');
const cards=[...el.children];let u=1,W=0,H=0,s=0,v=0,drag=0,lx=0,lt=0,moved=0,down=null,last=performance.now(),vis=true,raf=0;
function size(){W=el.clientWidth;const mob=innerWidth<=820,top=el.getBoundingClientRect().top+scrollY,avail=innerHeight-top-24;
if(mob){H=Math.max(190,Math.min(250,avail));u=Math.min(W/640,(H-8)/372)}else{const hc=Math.max(200,Math.min(400,avail));u=Math.min(W/1440,hc/400);H=Math.round(400*u)}el.style.height=H+'px'}
addEventListener('resize',()=>{size();draw()});addEventListener('load',()=>{size();draw()});setTimeout(()=>{size();draw()},700);
function rp(p,r){const n=p.length;let d='';for(let i=0;i<n;i++){const a=p[(i+n-1)%n],c=p[i],b=p[(i+1)%n],la=Math.hypot(a[0]-c[0],a[1]-c[1]),lb=Math.hypot(b[0]-c[0],b[1]-c[1]),
p1=[c[0]+(a[0]-c[0])/la*r,c[1]+(a[1]-c[1])/la*r],p2=[c[0]+(b[0]-c[0])/lb*r,c[1]+(b[1]-c[1])/lb*r];d+=(i?'L':'M')+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+'Q'+c[0].toFixed(1)+' '+c[1].toFixed(1)+' '+p2[0].toFixed(1)+' '+p2[1].toFixed(1)}return d+'Z'}
const hAt=x=>280+92*Math.pow(Math.min(1.6,Math.abs(x-720)/706),2.6);
function draw(){const half=W/(2*u);cards.forEach((c,i)=>{const t=((i*P-s)%L+L+L/2)%L-L/2,x=720+t*(1+.083*Math.pow(t/706,2)),d=Math.min(1.4,Math.abs(x-720)/706),w=170+48*d*d,xl=x-w/2,xr=x+w/2;
if(xr<720-half-40||xl>720+half+40){c.style.display='none';return}c.style.display='';
const hl=hAt(xl),hr=hAt(xr),mh=Math.max(hl,hr),cy=H/2/u-12*d*d,px=W/2+(xl-720)*u,py=(cy-mh/2)*u,k=u;
c.style.width=w*k+'px';c.style.height=mh*k+'px';c.style.transform=`translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0)`;
c.style.clipPath=`path('${rp([[0,(mh-hl)/2*k],[w*k,(mh-hr)/2*k],[w*k,(mh+hr)/2*k],[0,(mh+hl)/2*k]],15*k)}')`;c.lastChild.style.bottom=((mh-hl)/2+16)*k+'px'})}
function tick(n){raf=0;if(!vis)return;const dt=Math.min(.05,(n-last)/1000);last=n;if(!drag){v*=Math.pow(.05,dt);s+=(SPEED+v)*dt}draw();raf=requestAnimationFrame(tick)}
const go=()=>{if(!raf&&vis&&!reduce){last=performance.now();raf=requestAnimationFrame(tick)}};
el.addEventListener('pointerdown',e=>{if(e.button)return;drag=1;moved=0;lx=e.clientX;lt=e.timeStamp;v=0;down=e.target.closest('.hk-card');el.setPointerCapture(e.pointerId);el.classList.add('grabbing')});
el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lx,dtE=Math.max(1,e.timeStamp-lt)/1000;moved+=Math.abs(dx);s-=dx/u;v=Math.max(-3000,Math.min(3000,.7*v+.3*(-dx/u/dtE)));lx=e.clientX;lt=e.timeStamp;if(reduce)draw()});
const end=()=>{if(!drag)return;drag=0;el.classList.remove('grabbing');if(moved<6&&down){location='category.html?c='+catSlug(down.dataset.k)}down=null};
el.addEventListener('pointerup',end);el.addEventListener('pointercancel',()=>{drag=0;el.classList.remove('grabbing')});
el.addEventListener('keydown',e=>{if((e.key=='Enter'||e.key==' ')&&e.target.dataset.k){e.preventDefault();location='category.html?c='+catSlug(e.target.dataset.k)}});
new ResizeObserver(()=>{size();draw()}).observe(el);new IntersectionObserver(es=>{vis=es[0].isIntersecting;go()}).observe(el);
document.addEventListener('visibilitychange',()=>{vis=!document.hidden;go()});
size();draw();go();
if(!reduce)el.animate([{opacity:0,transform:'translateY(60px)'},{opacity:1,transform:'none'}],{duration:900,delay:1450,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'})})();
