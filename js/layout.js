/* Shared header, footer and utilities injected on every public page. */
(()=>{const $=id=>document.getElementById(id);
$('hdr').outerHTML=`<div id="ann"><span id="annT"></span><button onclick="this.parentNode.remove()" aria-label="Dismiss">${ICO('close',14)}</button></div>
<header class="nav"><a class="brand" href="index.html"><img src="assets/img/icon-192.png" width="44" alt=""><b id="bn"></b></a>
<form onsubmit="gsub(event)" style="flex:1;display:flex;min-width:140px"><input id="gs" type="search" placeholder="Search milk, paneer, ghee…" aria-label="Search products" oninput="gsearch(this.value)"></form>
<select id="loc" aria-label="Delivery location" onchange="setLoc(this.value)"><option>Hyderabad</option><option>Other area</option></select>
<button class="ib" onclick="openCart()" aria-label="Cart">${ICO('cart',22)} <span id="cc">0</span></button><button class="ib" onclick="wishList()" aria-label="Wishlist">${ICO('heart',22)}</button><button class="ib" onclick="notif()" aria-label="Notifications">${ICO('bell',22)}</button>
<a class="ib" id="acct" href="app.html">Login</a><button class="ib burger" aria-label="Menu" onclick="document.getElementById('menu').classList.toggle('show')">${ICO('menu',22)}</button><nav id="menu"></nav></header>`;
$('ftr').outerHTML=`<footer><div><b id="fn"></b><p>Freshness • Purity • Every Day</p></div>
<div><b>Pages</b><br><a href="shop.html">Our Products</a><br><a href="about.html">About Us</a><br><a href="categories.html">Categories</a><br><a href="quality.html">Quality</a><br><a href="gallery.html">Gallery</a><br><a href="billing.html">Billing options</a><br><a href="offers.html">Offers</a><br><a href="faq.html">FAQ</a><br><a href="contact.html">Contact</a></div>
<div><b>Account</b><br><a href="app.html">Login / Register</a><br><a href="app.html#Orders">My orders</a><br><a href="app.html#Bills">My bills</a></div>
<div><b>Policies</b><br>Privacy · Terms · Refunds<br><small>Add your policy text before launch.</small></div></footer>
<div id="pb"></div><button id="up" onclick="scrollTo({top:0})" aria-label="Back to top">${ICO('up',20)}</button><a id="wa" hidden target="_blank" rel="noopener" aria-label="WhatsApp">${ICO('chat',26)}</a><dialog id="cd"></dialog><div id="toast"></div>`})();

document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||a.target||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const h=a.getAttribute('href');if(!/^[\w-]+\.html(\?[^#]*)?(#.*)?$/.test(h)||h.split(/[?#]/)[0]==location.pathname.split('/').pop())return;e.preventDefault();document.body.classList.add('leaving');setTimeout(()=>location.href=h,180)});

/* 3D tilt + glare on cards (mouse devices only, skipped for reduced motion) */
if(matchMedia('(hover:hover)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){let cur=null;const off=()=>{if(cur){cur.style.transform='';cur=null}};
document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.card');if(c!==cur)off();if(!c||c.closest('dialog'))return;cur=c;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');c.style.transform=`perspective(900px) rotateX(${(.5-y)*7}deg) rotateY(${(x-.5)*9}deg) translateY(-4px)`});document.documentElement.addEventListener('mouseleave',off)}
