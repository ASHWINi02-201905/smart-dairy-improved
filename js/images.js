/* Product image library (assets/img/products). Used by the website and the admin app. */
const PIMG={milk:'assets/img/products/milk.jpg',curd:'assets/img/products/curd.jpg',paneer:'assets/img/products/paneer.jpg',butter:'assets/img/products/butter.jpg',ghee:'assets/img/products/ghee.jpg',cheese:'assets/img/products/cheese.jpg',cream:'assets/img/products/cream.jpg',sweet:'assets/img/products/sweet.jpg',farm:'assets/img/products/farm.jpg',cow:'assets/img/products/cow.jpg',buffalo:'assets/img/products/buffalo.jpg',shed:'assets/img/products/shed.jpg'};
function imgFor(p){if(p.img&&PIMG[p.img])return PIMG[p.img];const t=((p.name||'')+' '+(p.cat||'')).toLowerCase();
if(/buttermilk|lassi|shake|ice/.test(t))return'';if(/curd|yogurt|dahi/.test(t))return PIMG.curd;if(/paneer/.test(t))return PIMG.paneer;if(/ghee/.test(t))return PIMG.ghee;if(/butter/.test(t))return PIMG.butter;
if(/cheese/.test(t))return PIMG.cheese;if(/cream/.test(t))return PIMG.cream;if(/sweet|peda|dessert|kova/.test(t))return PIMG.sweet;if(/milk/.test(t))return PIMG.milk;return''}
const _q=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const imgTag=(p,w=40)=>imgFor(p)?`<img src="${imgFor(p)}" width="${w}" height="${w}" style="object-fit:cover;border-radius:8px" alt="${_q(p.name)}">`:ICO('bag',22);
const imgBig=p=>imgFor(p)?`<img src="${imgFor(p)}" alt="${_q(p.name)}" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:6px">`:'';
