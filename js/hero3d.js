/* Cinematic hero: ONE mesh morphs Milk>Butter>Ghee>Cheese>Curd in the vertex shader (top-down "pour" delay + liquid wobble),
   lit by a PMREM studio environment, with slow-motion ballistic droplets. Pauses off-screen; static for reduced motion. */
(()=>{const host=document.getElementById('hero3d');if(!host||typeof THREE==='undefined')return;
const T=THREE,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,mob=innerWidth<820;let R;
try{R=new T.WebGLRenderer({antialias:!mob,alpha:true,powerPreference:'high-performance'})}catch(e){return}
R.setPixelRatio(Math.min(devicePixelRatio||1,mob?1.25:1.5));R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.12;R.outputEncoding=T.sRGBEncoding;
host.innerHTML='';host.appendChild(R.domElement);
const S=new T.Scene(),C=new T.PerspectiveCamera(32,1,.1,50);
{const E=new T.Scene(),mk=(c,k,s)=>{const x=new T.MeshBasicMaterial({color:c,side:s||T.DoubleSide});x.color.multiplyScalar(k);return x};
E.add(new T.Mesh(new T.BoxGeometry(30,30,30),mk(0xf3ecd6,1,T.BackSide)));
[[0xffffff,7,[6,6,4]],[0xcfe8c4,3,[-7,1,3]],[0xfff0c8,5,[0,9,0]]].forEach(([c,k,p])=>{const m=new T.Mesh(new T.PlaneGeometry(6,6),mk(c,k));m.position.set(...p);m.lookAt(0,0,0);E.add(m)});
[-6,6].forEach(x=>{const m=new T.Mesh(new T.PlaneGeometry(.8,9),mk(0xffffff,9));m.position.set(x,1,2);m.lookAt(0,0,0);E.add(m)});{const f=new T.Mesh(new T.PlaneGeometry(30,30),mk(0xe8dcb8,1.5));f.rotation.x=-Math.PI/2;f.position.y=-8;E.add(f)}
S.environment=new T.PMREMGenerator(R).fromScene(E,.03).texture}
const k1=new T.DirectionalLight(0xffe6bd,2.2);k1.position.set(3,5,4);const k2=new T.DirectionalLight(0x8BBD83,1.2);k2.position.set(-4,2,-3);S.add(k1,k2);
/* geometry + five target shapes */
const G=new T.SphereGeometry(1,mob?48:96,mob?36:72),n=G.attributes.position.count,D=G.attributes.position.array.slice();
const sm=(a,b,x)=>{x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)},se=(x,y,z,a,b,c,p)=>Math.pow(Math.pow(Math.abs(x/a),p)+Math.pow(Math.abs(y/b),p)+Math.pow(Math.abs(z/c),p),-1/p);
let sd=7;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
const H=Array.from({length:26},()=>{const u=rnd()*2-1,a=rnd()*6.283,s=Math.sqrt(1-u*u);return[s*Math.cos(a),u,s*Math.sin(a),.982+rnd()*.012]});
const F=[(x,y,z)=>{const c=Math.exp(-Math.pow((y-.12)/.16,2)),k=Math.pow(.5+.5*Math.sin(Math.atan2(z,x)*9),3)*c,r=1+.5*k+(y<-.3?.2:0);return[x*r*1.1,y*.55+k*.6,z*r*1.1]}, /* milk crown splash */
(x,y,z)=>{const r=se(x,y,z,1.15,.72,.82,7);return[x*r,y*r,z*r]}, /* butter block */
(x,y,z)=>{const t=Math.max(y,0),b=y<0?1:0,q=1-.65*t*t;return[x*q*(1+.25*b),y*(1+.5*t)*(1-.5*b),z*q*(1+.25*b)]}, /* ghee pour */
(x,y,z)=>{const r=se(x,y,z,1.25,.62,1,7)*(1+.016*Math.sin(y*34));return[x*r,y*r,z*r]}, /* stacked cheese slices */
(x,y,z)=>{const r=1+.06*Math.sin(x*4+1)*Math.sin(z*3.3);return[x*r*1.1,(y>0?y*.78:y*.38)*r,z*r*1.1]}]; /* curd mound */
const mp=new Map();for(let i=0;i<n;i++){const k=[0,1,2].map(j=>Math.round(D[i*3+j]*1e4)).join();(mp.get(k)||mp.set(k,[]).get(k)).push(i)}const grp=[...mp.values()].filter(g=>g.length>1);
const P=[],N=[];F.forEach(f=>{const a=new Float32Array(n*3);for(let i=0;i<n;i++)a.set(f(D[i*3],D[i*3+1],D[i*3+2]),i*3);P.push(a);
const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(a,3));g.setIndex(G.index);g.computeVertexNormals();const nr=g.attributes.normal.array;
for(const q of grp){let x=0,y=0,z=0;for(const i of q){x+=nr[i*3];y+=nr[i*3+1];z+=nr[i*3+2]}const l=Math.hypot(x,y,z)||1;for(const i of q){nr[i*3]=x/l;nr[i*3+1]=y/l;nr[i*3+2]=z/l}}N.push(nr)});
G.setAttribute('aP',new T.BufferAttribute(new Float32Array(n*3),3));G.setAttribute('aN',new T.BufferAttribute(new Float32Array(n*3),3));
const setPair=(a,b)=>{G.attributes.position.array.set(P[a]);G.attributes.normal.array.set(N[a]);G.attributes.aP.array.set(P[b]);G.attributes.aN.array.set(N[b]);['position','normal','aP','aN'].forEach(k=>G.attributes[k].needsUpdate=true)};
/* materials: clearcoat PBR + shader morph */
const M=new T.MeshPhysicalMaterial({roughness:.2,clearcoat:1,clearcoatRoughness:.08,transparent:true}),U={uT:{value:0},uTime:{value:0},uW:{value:0},uSSS:{value:new T.Color()},uBump:{value:0},uBF:{value:10},uTex:{value:null},uRA:{value:new T.Vector4(0,0,.25,1)},uRB:{value:new T.Vector4(0,0,.25,1)},uAm:{value:new T.Vector3()},uLoad:{value:0}};
M.onBeforeCompile=s=>{Object.assign(s.uniforms,U);s.fragmentShader='varying vec3 vP;uniform vec3 uSSS,uAm;uniform float uBump,uBF,uLoad;uniform sampler2D uTex;uniform vec4 uRA,uRB;vec3 trp(vec4 r,vec3 p,vec3 w){vec3 q=p*1.6;vec2 a=abs(fract(q.yz*.5)*2.-1.),b=abs(fract(q.xz*.5)*2.-1.),c=abs(fract(q.xy*.5)*2.-1.);return pow(texture2D(uTex,r.xy+r.zw*(a*.96+.02)).rgb*w.x+texture2D(uTex,r.xy+r.zw*(b*.96+.02)).rgb*w.y+texture2D(uTex,r.xy+r.zw*(c*.96+.02)).rgb*w.z,vec3(2.2));}\n'+s.fragmentShader  .replace('#include <color_fragment>','#include <color_fragment>\nvec3 tw=pow(abs(normalize(vP)),vec3(4.));tw/=tw.x+tw.y+tw.z;diffuseColor.rgb=mix(diffuseColor.rgb,mix(trp(uRA,vP,tw),trp(uRB,vP,tw),uAm.z),uLoad*mix(uAm.x,uAm.y,uAm.z));')
.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec3 q=vP*uBF;vec3 gg=vec3(cos(q.x+sin(q.y*1.3)+sin(q.z*.7)),cos(q.y+sin(q.z*1.1)+sin(q.x*.9)),cos(q.z+sin(q.x*1.2)+sin(q.y*.8)));normal=normalize(normal+uBump*(mat3(viewMatrix)*gg));').replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );','float fr=pow(1.-clamp(dot(normalize(normal),normalize(vViewPosition)),0.,1.),3.);outgoingLight+=uSSS*(.35+.65*fr);gl_FragColor=vec4(outgoingLight,mix(diffuseColor.a,1.,fr));');
s.vertexShader='varying vec3 vP;attribute vec3 aP;attribute vec3 aN;uniform float uT,uTime,uW;\n'+s.vertexShader
.replace('#include <beginnormal_vertex>','float tv=smoothstep(0.,1.,clamp(uT*1.7-(position.y*.5+.5)*.7,0.,1.));vec3 objectNormal=normalize(mix(normal,aN,tv));')
.replace('#include <begin_vertex>','vec3 transformed=mix(position,aP,tv);transformed+=objectNormal*uW*sin(transformed.x*5.+uTime*2.)*sin(transformed.y*4.-uTime*1.7)*sin(transformed.z*5.+uTime*1.3)*.16;vP=transformed;')};
const TL=new T.TextureLoader();U.uTex.value=TL.load('assets/img/hero/tex.jpg',()=>U.uLoad.value=1);
const mesh=new T.Mesh(G,M);mesh.frustumCulled=false;S.add(mesh);
const L=[[0xfdfdf8,.14,1,.35,0,0x2a2420,0,10,1.3,1],[0xf5d25f,.38,1,0,.1,0x6a4a08,.1,16,.9,.35],[0xe8991a,.05,.88,.6,.3,0x8a4400,0,10,1.7,1],[0xf2bb3d,.55,1,0,.05,0x5a3c06,.12,24,.7,.15],[0xfffffb,.5,1,.1,0,0x2e2a22,.08,6,.8,.2]],c2=new T.Color(),c3=new T.Color(),TI=[0,0,1,2,3],TA=[0,.8,.75,.8,.75];
/* droplets */
const M2=new T.MeshPhysicalMaterial({roughness:.1,clearcoat:1,transparent:true}),NB=mob?12:32,dm=new T.InstancedMesh(new T.SphereGeometry(.06,12,10),M2,NB),dd=new T.Object3D(),UP=new T.Vector3(0,1,0),tv=new T.Vector3(),
X=Array.from({length:NB},()=>({p:new T.Vector3(),v:new T.Vector3(),s:0,age:9}));dm.frustumCulled=false;S.add(dm);
const burst=()=>X.forEach(d=>{const a=rnd()*6.283,q=.6+rnd()*1.6;d.p.set(Math.cos(a)*.9,.2,Math.sin(a)*.9);d.v.set(Math.cos(a)*q,1.6+rnd()*2.4,Math.sin(a)*q);d.s=.4+rnd()*.9;d.age=-rnd()*.4});
const spr=(f,h)=>{const sp=new T.Sprite(new T.SpriteMaterial({transparent:true,depthWrite:false,opacity:0}));TL.load(f,t=>{sp.material.map=t;sp.material.needsUpdate=true;sp.userData.as=t.image.width/t.image.height;sp.scale.set(h*sp.userData.as,h,1)});S.add(sp);return sp};
const SP=spr('assets/img/hero/splash.png',2.9),DR=Array.from({length:mob?3:6},()=>spr('assets/img/hero/drop.png',.34));SP.position.y=.2;
/* soft contact shadow */
const cv=document.createElement('canvas');cv.width=cv.height=128;{const x=cv.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,.4)');g.addColorStop(1,'rgba(23,76,53,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
const sh=new T.Mesh(new T.PlaneGeometry(3.2,3.2),new T.MeshBasicMaterial({map:new T.CanvasTexture(cv),transparent:true,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.y=-.82;S.add(sh);
const bc=document.createElement('canvas');bc.width=bc.height=64;{const x=bc.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,240,190,.9)');g.addColorStop(.6,'rgba(255,240,190,.25)');g.addColorStop(1,'rgba(255,240,190,0)');x.fillStyle=g;x.fillRect(0,0,64,64)}
const NK=mob?8:18,bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(Float32Array.from({length:NK*3},(_,i)=>i%3==0?(rnd()-.5)*14:i%3==1?(rnd()-.5)*8:-9-rnd()*5),3));
const bk=new T.Points(bg,new T.PointsMaterial({map:new T.CanvasTexture(bc),size:.7,transparent:true,opacity:.2,depthWrite:false,blending:T.AdditiveBlending}));C.add(bk);S.add(C);
/* timeline */
const HOLD=2.6,MORPH=1.9,chips=[...document.querySelectorAll('#h3chips button')];let a=0,b=1,m=0,hold=0,t=0,ls=-1;setPair(a,b);
const apply=()=>{const k=sm(.15,.85,m),A=L[a],B=L[b],l=(i)=>A[i]+(B[i]-A[i])*k;M.color.set(A[0]).lerp(c2.set(B[0]),k);M.roughness=l(1);const sa=Math.min(1,(a==0?1-sm(0,.4,m):0)+(b==0?sm(.6,1,m):0));M.opacity=l(2)*(1-.98*sa);SP.material.opacity=sa;DR.forEach(d=>d.material.opacity=sa);M.emissive.copy(M.color).multiplyScalar(l(4));
M.envMapIntensity=l(8);M.clearcoat=l(9);U.uBump.value=l(6);U.uBF.value=l(7);U.uSSS.value.set(A[5]).lerp(c3.set(B[5]),k);U.uRA.value.set(TI[a]*.25,0,.25,1);U.uRB.value.set(TI[b]*.25,0,.25,1);U.uAm.value.set(TA[a],TA[b],k);U.uW.value=l(3)+Math.sin(Math.PI*m)*.9;U.uT.value=m;M2.color.copy(M.color);M2.roughness=M.roughness*.6;M2.opacity=l(2);
const s=m>.5?b:a;if(s!=ls){ls=s;chips.forEach((c,i)=>c.classList.toggle('on',i==s));if(chips[0])chips[0].parentNode.classList.toggle('all',s==4)}};
const goto=k=>{const cur=m>.5?b:a;if(cur==k&&m==0)return;if(reduce){a=k;b=(k+1)%5;m=0;setPair(a,b);apply();R.render(S,C);return}a=cur;b=k;m=0;setPair(a,b);hold=HOLD};
chips.forEach((c,i)=>c.onclick=()=>goto(i));
const step=dt=>{t+=dt;U.uTime.value=t;
if(m>0||hold>=HOLD){if(m==0)burst();m=Math.min(1,m+dt/MORPH);if(m>=1){a=b;b=(a+1)%5;setPair(a,b);m=0;hold=0}}else hold+=dt;apply();
const w=host.clientWidth,e=sm(0,4.5,t),Rd=2.2+2.7*e,an=-.5+t*.2;C.position.set(Math.sin(an)*Rd,.5+.25*Math.sin(t*.4),Math.cos(an)*Rd);C.lookAt(0,0,0);
bk.rotation.z=t*.012;mesh.position.y=Math.sin(t*1.2)*.04;sh.scale.setScalar(1+.06*Math.sin(t*1.2));
const ds=dt*.55;X.forEach((d,i)=>{d.age+=ds;let s=0;if(d.age>0&&d.age<2.4){d.v.y-=4*ds;d.p.addScaledVector(d.v,ds);s=d.s*(1-sm(1.6,2.4,d.age))*(d.p.y>-.8?1:0)}dd.position.copy(d.p);if(s){dd.quaternion.setFromUnitVectors(UP,tv.copy(d.v).normalize());dd.scale.set(s,s*(1+Math.min(1.2,d.v.length()*.25)),s)}else dd.scale.setScalar(.0001);dd.updateMatrix();dm.setMatrixAt(i,dd.matrix)});dm.instanceMatrix.needsUpdate=true;DR.forEach((d,i)=>{const x=X[i],h=(x.age>0&&x.age<2.4&&x.p.y>-.8?.5*x.s*(1-sm(1.6,2.4,x.age)):0)+.0001;d.position.copy(x.p);d.scale.set(h*(d.userData.as||.7),h,1)})};
const size=()=>{const w=host.clientWidth||600,h=host.clientHeight||400;R.setSize(w,h);C.aspect=w/h;C.fov=w<820?40:32;if(w>=820)C.setViewOffset(w,h,-w*.17,0,w,h);else C.clearViewOffset();C.updateProjectionMatrix();if(reduce||!run)R.render(S,C)};
let run=false,vis=true,last=0;const frame=ts=>{if(!run)return;requestAnimationFrame(frame);if(mob&&ts-last<30)return;const dt=Math.min(.05,(ts-last)/1000||0);last=ts;step(dt);R.render(S,C)};
const go=()=>{const w=vis&&!document.hidden&&!reduce;if(w&&!run){run=true;last=performance.now();requestAnimationFrame(frame)}else if(!w)run=false};
new ResizeObserver(size).observe(host);size();
if(reduce){t=9;apply();R.render(S,C)}else{new IntersectionObserver(e=>{vis=e[0].isIntersecting;go()}).observe(host);document.addEventListener('visibilitychange',go);go()}
})();
