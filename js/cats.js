/* Category definitions: re = text match on name+category, no = exclusion. Counts come from live product data. */
const CATS=[
{s:'fresh-milk',n:'Fresh Milk',re:/milk/,no:/butter|flavou?r|shake|lassi/,img:'milk',i:'milk'},
{s:'cow-milk',n:'Cow Milk',re:/cow/,img:'cow',i:'milk'},{s:'buffalo-milk',n:'Buffalo Milk',re:/buffalo/,img:'buffalo',i:'milk'},
{s:'a2-milk',n:'A2 Milk',re:/\ba2\b/,img:'milk',i:'milk',opt:1},{s:'curd',n:'Curd',re:/curd|dahi/,img:'curd',i:'bowl'},
{s:'butter',n:'Butter',re:/butter/,no:/buttermilk/,img:'butter',i:'butter'},{s:'ghee',n:'Ghee',re:/ghee/,img:'ghee',i:'jar'},
{s:'paneer',n:'Paneer',re:/paneer/,img:'paneer',i:'cheese'},{s:'cheese',n:'Cheese',re:/cheese/,no:/paneer/,img:'cheese',i:'cheese'},
{s:'buttermilk',n:'Buttermilk',re:/buttermilk/,i:'cup'},{s:'lassi',n:'Lassi',re:/lassi/,i:'cup'},{s:'flavoured-milk',n:'Flavoured Milk',re:/flavou?r/,i:'cup'},
{s:'milkshakes',n:'Milkshakes',re:/shake/,i:'cup'},{s:'yogurt',n:'Yogurt',re:/yogh?urt/,img:'curd',i:'bowl'},{s:'cream',n:'Cream',re:/cream/,no:/ice/,img:'cream',i:'icecream'},
{s:'ice-cream',n:'Ice Cream',re:/ice ?cream/,i:'icecream'},{s:'dairy-sweets',n:'Dairy Sweets',re:/sweet|peda|kova|dessert|halwa/,img:'sweet',i:'bag'}];
const catMatch=(c,p)=>{const t=((p.name||'')+' '+(p.cat||'')).toLowerCase();return c.re.test(t)&&!(c.no&&c.no.test(t))};
const catCount=c=>D.products.filter(p=>p.active&&catMatch(c,p)).length;
const catSlug=n=>(CATS.find(c=>c.n==n)||{}).s||'fresh-milk';
