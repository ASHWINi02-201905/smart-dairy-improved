/* Shared demo seed data, used by both the storefront and the admin app. */
const uid=()=>Math.random().toString(36).slice(2,9);
function seed(){const p=(n,cat,unit,price,stock)=>({id:uid(),name:n,cat,unit,price,stock,active:1,sample:1});
const P=[p('Cow Milk','Milk','litre',60,200),p('Buffalo Milk','Milk','litre',75,150),p('Curd','Curd','kg',80,40),p('Paneer','Paneer','kg',380,15),p('Ghee','Ghee','kg',650,10),p('Butter','Butter','kg',520,12),p('Cheese','Cheese','kg',480,10),p('Cream','Cream','kg',300,8),p('Kova Peda','Sweets','kg',600,10)];
const c=(n,m,r,o)=>({id:uid(),code:'C'+m.slice(-4),name:n,mobile:m,address:'Hyderabad',route:r,status:'Active',opening:o,prices:{},sample:1});
return{co:{name:'Daily Dairy Needs',phone:'+91 00000 00000',pay:'UPI / Cash / Bank transfer'},products:P,
customers:[c('Ravi Kumar','9000000001','R1',0),c('Anita Rao','9000000002','R1',100),c('Suresh Reddy','9000000003','R2',0)],
deliveries:[],payments:[],invoices:[],audit:[]}}
