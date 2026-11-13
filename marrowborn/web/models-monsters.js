// 3D monster models. Registers window.MBModels.monster = { create(m, MB), update(group, m, MB, dt) }.
// three.js r149 primitives only. Everything is authored in units of the body radius (m.r) with feet at Y=0
// and forward = +Z, then scaled by m.r. Hierarchy: group (renderer owns position/visible) > root (facing,
// scale, wind-up shake) > body (bob, squash and stretch) > parts. Geometries are shared, materials are
// cached by colour, and update() allocates nothing.
window.MBModels=window.MBModels||{};
(function(){
'use strict';
var T=window.THREE;if(!T)return;
var PI=Math.PI,TAU=PI*2,sin=Math.sin,cos=Math.cos,abs=Math.abs,max=Math.max,min=Math.min;
var BONE='#e7dfcd';

/* ---------- shared geometry ---------- */
var G=null,MG={},_o=new T.Object3D(),_up=new T.Vector3(0,1,0),_v=new T.Vector3();
function geos(){
  if(G)return G;
  G={
    sph:new T.SphereGeometry(1,10,7),sphLo:new T.SphereGeometry(1,7,5),
    ico:new T.IcosahedronGeometry(1,0),ico1:new T.IcosahedronGeometry(1,1),dod:new T.DodecahedronGeometry(1,0),oct:new T.OctahedronGeometry(1,0),
    cone:new T.ConeGeometry(1,1,6).translate(0,.5,0),cone4:new T.ConeGeometry(1,1,4).translate(0,.5,0),
    cyl:new T.CylinderGeometry(1,1,1,7).translate(0,.5,0),box:new T.BoxGeometry(1,1,1),
    torus:new T.TorusGeometry(1,.13,6,18).rotateX(PI/2),disc:new T.CircleGeometry(1,20).rotateX(-PI/2),
    robe:new T.CylinderGeometry(.3,.9,1.5,8).translate(0,.75,0),skirt:new T.CylinderGeometry(.45,.95,.9,7).translate(0,.45,0),
    aura:new T.CircleGeometry(1,28).rotateX(-PI/2)
  };
  return G;
}
function orient(o,dx,dy,dz){_v.set(dx,dy,dz).normalize();o.quaternion.setFromUnitVectors(_up,_v)}
// Bake several transformed primitives into one geometry (built once per key, then shared).
function merged(key,fn){
  if(MG[key])return MG[key];
  var parts=[],n=0;
  fn(function(geo,x,y,z,dx,dy,dz,sx,sy,sz){
    _o.position.set(x,y,z);orient(_o,dx,dy,dz);_o.scale.set(sx,sy,sz);_o.updateMatrix();
    var g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(_o.matrix);parts.push(g);n+=g.attributes.position.count;
  });
  var pos=new Float32Array(n*3),nor=new Float32Array(n*3),k=0;
  for(var i=0;i<parts.length;i++){pos.set(parts[i].attributes.position.array,k);nor.set(parts[i].attributes.normal.array,k);k+=parts[i].attributes.position.count*3;parts[i].dispose()}
  var bg=new T.BufferGeometry();bg.setAttribute('position',new T.BufferAttribute(pos,3));bg.setAttribute('normal',new T.BufferAttribute(nor,3));
  bg.computeBoundingSphere();
  return MG[key]=bg;
}
// ring of n cones around Y: base at radius r0/height y, pointing outward with a vertical slope
function ringGeo(key,n,r0,y,slope,len,rad,off){
  return merged(key,function(add){for(var i=0;i<n;i++){var b=i*TAU/n+(off||0);add(G.cone,cos(b)*r0,y,sin(b)*r0,cos(b),slope,sin(b),rad,len,rad)}});
}

/* ---------- materials ---------- */
var MATS={},FX=null,_c=new T.Color();
function M(hex,shade){
  var key=hex+'|'+(shade||0),m=MATS[key];if(m)return m;
  _c.set(hex);if(shade>0)_c.lerp(new T.Color(0xffffff),shade);else if(shade<0)_c.multiplyScalar(1+shade);
  m=new T.MeshStandardMaterial({color:_c.getHex(),roughness:.82,metalness:.04,flatShading:true});
  m.emissive.copy(_c).multiplyScalar(.14);
  return MATS[key]=m;
}
function fx(){
  if(FX)return FX;
  var glow=function(c,e,i){return new T.MeshStandardMaterial({color:c,emissive:e,emissiveIntensity:i,roughness:.4})};
  FX={
    eye:glow(0x5a4410,0xffd95e,1.5),eyeRed:glow(0x400008,0xff2238,1.5),ring:glow(0x2a0308,0xc8142e,1.25),star:glow(0x5a4410,0xffcf5a,1.4),
    pupil:new T.MeshBasicMaterial({color:0x08070a}),voidM:new T.MeshBasicMaterial({color:0x050408}),
    white:new T.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1,roughness:1})
  };
  var cv=document.createElement('canvas');cv.width=cv.height=64;var x=cv.getContext('2d'),g=x.createRadialGradient(32,32,6,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.45,'rgba(255,255,255,.4)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);
  FX.auraTex=new T.CanvasTexture(cv);FX.auras={};
  return FX;
}
function auraMat(hex){
  var a=FX.auras[hex];if(a)return a;
  return FX.auras[hex]=new T.MeshBasicMaterial({color:hex,map:FX.auraTex,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,fog:false});
}

/* ---------- build helpers ---------- */
var REG=null; // meshes of the monster being built (for the white hit flash)
function mk(geo,mat,par,x,y,z,sx,sy,sz,noShadow){
  var o=new T.Mesh(geo,mat);o.position.set(x||0,y||0,z||0);
  if(sx!==undefined)o.scale.set(sx,sy===undefined?sx:sy,sz===undefined?sx:sz);
  o.castShadow=!noShadow;par.add(o);REG.push(o);return o;
}
function seg(geo,mat,par,ax,ay,az,bx,by,bz,rad){
  var dx=bx-ax,dy=by-ay,dz=bz-az,o=mk(geo,mat,par,ax,ay,az);orient(o,dx,dy,dz);o.scale.set(rad,Math.sqrt(dx*dx+dy*dy+dz*dz),rad);return o;
}
function spike(mat,par,x,y,z,dx,dy,dz,len,rad){var o=mk(G.cone,mat,par,x,y,z);orient(o,dx,dy,dz);o.scale.set(rad,len,rad);return o}
function grp(par,x,y,z){var g=new T.Group();g.position.set(x||0,y||0,z||0);par.add(g);return g}
function eye(par,list,x,y,z,er,nx,ny,nz,red,lo){
  var l=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=l;ny/=l;nz/=l;
  mk(lo?G.sphLo:G.sph,red?FX.eyeRed:FX.eye,par,x,y,z,er,er,er,true);
  var pu=mk(G.sphLo,FX.pupil,par,x+nx*er*.7,y+ny*er*.7,z+nz*er*.7,er*.5,er*.5,er*.5,true);
  list.push({pu:pu,x:pu.position.x,er:er});
}
// n eyes on a forward-facing face: two in a row, a third above, more in a wider upper row
function eyesFace(par,list,n,cx,cy,cz,dx,er,red){
  if(n===1){eye(par,list,cx,cy,cz,er*1.25,0,.1,1,red);return}
  for(var i=0;i<n;i++){
    if(i<2)eye(par,list,cx+(i?dx:-dx),cy,cz,er,(i?.35:-.35),.1,1,red);
    else if(i===2)eye(par,list,cx,cy+dx*1.25,cz-dx*.25,er*.9,0,.3,1,red);
    else eye(par,list,cx+(i%2?1:-1)*dx*1.9,cy+dx*.9,cz-dx*.8,er*.75,(i%2?.7:-.7),.2,1,red);
  }
}

function claw3(){return merged('claw3',function(add){for(var k=-1;k<=1;k++)add(G.cone4,k*.5,-.3,.5,k*.35,-.5,1,.28,1.25,.28)})}

/* ---------- the nine bodies ---------- */
var BUILD={},ANIM={};
// bob amplitude, bob speed, hover height, breathing amount, head height (stars), all in r units
var CFG={
  crawler:{bob:.03,spd:5,y0:0,br:.03,top:1.25},hound:{bob:.04,spd:6,y0:0,br:.03,top:1.95},witch:{bob:.1,spd:2.2,y0:.2,br:.02,top:2.7},
  fist:{bob:.03,spd:2.5,y0:0,br:.03,top:2.2},mother:{bob:.02,spd:1.8,y0:0,br:.05,top:2},mite:{bob:.08,spd:14,y0:0,br:0,top:1.4},
  burrower:{bob:0,spd:2,y0:0,br:.02,top:2.2},mimic:{bob:.05,spd:3,y0:0,br:.03,top:2},hollow:{bob:.07,spd:1.7,y0:.22,br:.02,top:2.95,k:.86}
};

BUILD.crawler=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.3),n=max(4,s.legs||8),half=n>>1,i;
  mk(G.sph,c,b,0,.64,-.6,.8,.56,.86);mk(G.sph,dk,b,0,.52,.22,.6,.4,.56);
  mk(merged('crawlPlates',function(add){for(var k=0;k<4;k++)add(G.cone4,0,1.0-k*.05,-.15-k*.32,0,.8,-.6,.2-k*.02,.42,.2-k*.02)}),dk,b);
  p.head=grp(b,0,.5,.72);
  mk(G.sphLo,lt,p.head,0,0,.12,.44,.36,.42);
  p.mand=[spike(dk,grp(p.head,-.2,-.08,.4),0,0,0,.25,-.1,1,.5,.1).parent,spike(dk,grp(p.head,.2,-.08,.4),0,0,0,-.25,-.1,1,.5,.1).parent];
  eyesFace(p.head,p.eyes,s.eyes||2,0,.2,.42,.2,.13);
  p.legs=[];
  for(i=0;i<n;i++){
    var side=i%2?1:-1,k=i>>1,f=half>1?1-2*k/(half-1):0,o=grp(b,side*.42,.5,.12+f*.5),base=-side*f*.75;
    seg(G.cyl,dk,o,0,0,0,side*.55,.5,0,.085);seg(G.cone,dk,o,side*.55,.5,0,side*1.08,-.5,0,.1);
    mk(G.sphLo,dk,o,side*.55,.5,0,.12,.12,.12);
    o.rotation.y=base;p.legs.push({o:o,side:side,base:base,ph:(k+(side>0?0:1))*PI});
  }
};
ANIM.crawler=function(p,m,t,tt,st,look){
  var wind=st==='wind',lunge=st==='lunge',sp=lunge?24:9,amp=wind?.04:lunge?.14:.3,i,L,ph;
  for(i=0;i<p.legs.length;i++){
    L=p.legs[i];ph=t*sp+L.ph;
    L.o.rotation.y=L.base+sin(ph)*amp+(lunge?L.side*.55:wind?-L.side*.2:0);
    L.o.rotation.z=L.side*(max(0,cos(ph))*(wind?0:.3)+(wind?-.22:0));
  }
  var ch=wind?.35+.3*sin(t*40):.18+.14*sin(tt*5);
  p.mand[0].rotation.y=-ch+.25;p.mand[1].rotation.y=ch-.25;
  p.head.rotation.y=look*.5;p.head.rotation.x=wind?-.25:lunge?.1:0;
};

BUILD.hound=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.3),n=s.spikes||6,i,x;
  mk(G.sph,c,b,0,1.02,.25,.6,.62,.75);mk(G.sph,c,b,0,1.0,-.58,.42,.44,.56);
  mk(merged('houndRibs',function(add){for(var k=0;k<3;k++)for(var sd=-1;sd<=1;sd+=2)add(G.box,sd*.55,1.0,.55-k*.26,sd*.3,1,0,.09,.66,.08)}),lt,b);
  mk(merged('houndSpine'+n,function(add){for(var k=0;k<n;k++){var f=k/(n-1),z=.72-f*1.65,h=.5-abs(f-.35)*.3;add(G.cone4,0,1.46-f*.14-(f<.15?.1:0),z,0,1,-.45,.14,h+.08,.14)}}),dk,b);
  p.tail=grp(b,0,1.05,-1.02);seg(G.cone,dk,p.tail,0,0,0,0,.3,-.75,.1);
  p.head=grp(b,0,1.25,.9);
  mk(G.ico1,c,p.head,0,.04,.25,.48,.42,.52);mk(G.box,c,p.head,0,-.1,.72,.34,.26,.5);
  p.jaw=grp(p.head,0,-.22,.3);mk(G.box,c,p.jaw,0,-.06,.34,.3,.09,.56);
  mk(merged('houndFangs',function(add){for(var sd=-1;sd<=1;sd+=2){add(G.cone4,sd*.13,-.22,.9,0,-1,0,.055,.2,.055);add(G.cone4,sd*.13,-.22,.7,0,-1,0,.045,.15,.045)}}),M(BONE),p.head);
  for(x=-1;x<=1;x+=2){seg(G.cyl,dk,p.head,x*.3,.28,.1,x*.64,.6,.3,.12);seg(G.cone,dk,p.head,x*.64,.6,.3,x*.6,.74,1.1,.125);mk(G.sphLo,dk,p.head,x*.64,.6,.3,.125,.125,.125)}
  eyesFace(p.head,p.eyes,s.eyes||2,0,.12,.62,.27,.12);
  p.legs=[];
  for(i=0;i<4;i++){
    var sd=i%2?1:-1,front=i<2,o=grp(b,sd*(front?.46:.36),front?.92:.88,front?.45:-.7),h=front?.92:.88;
    seg(G.cyl,c,o,0,0,0,0,-h*.5,-.14,.15);seg(G.cone,dk,o,0,-h*.5,-.14,0,-h,.06,.16);mk(G.sphLo,c,o,0,-h*.5,-.14,.17,.17,.17);
    p.legs.push({o:o,front:front,ph:(i===0||i===3)?0:PI});
  }
};
ANIM.hound=function(p,m,t,tt,st,look){
  var i,L,wind=st==='wind',ch=st==='charge',dz=st==='dazed';
  for(i=0;i<4;i++){
    L=p.legs[i];
    if(ch)L.o.rotation.x=(L.front?-1:1)*(.55+.55*sin(t*24));
    else if(wind)L.o.rotation.x=L.front?(i===0?-.5+.5*sin(t*18):-.15):.45;
    else if(dz)L.o.rotation.x=L.front?-.35:.35;
    else L.o.rotation.x=sin(t*10+L.ph)*.55;
  }
  p.head.rotation.y=ch||wind?0:look*.85;
  p.head.rotation.x=wind?.5:ch?.32:dz?.55+.1*sin(tt*4):.05*sin(tt*3);
  p.head.rotation.z=dz?.3*sin(tt*3):0;
  p.jaw.rotation.x=ch?.55:wind?.3+.15*sin(t*30):.12+.08*sin(tt*4);
  p.tail.rotation.y=ch?0:.4*sin(tt*(wind?16:5));p.tail.rotation.x=ch?.5:dz?.9:0;
};

BUILD.witch=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.35),x;
  p.robe=grp(b,0,0,0);
  mk(G.robe,c,p.robe);mk(ringGeo('hem8',8,.74,.02,-2.6,.34,.24),c,p.robe);
  mk(G.cone,dk,b,0,1.28,0,.68,.5,.6);
  p.head=grp(b,0,1.86,0);
  mk(G.sph,dk,p.head,0,0,-.03,.5,.5,.52);
  spike(dk,p.head,0,.2,-.1,0,1,-.55,.95,.36);
  mk(G.sph,FX.voidM,p.head,0,-.04,.3,.36,.36,.26,true);
  eyesFace(p.head,p.eyes,s.eyes||2,0,-.02,.52,.15,.085);
  p.hands=[];
  for(x=-1;x<=1;x+=2){
    var h=grp(b,x*.98,1.12,.5);
    mk(G.ico,lt,h,0,0,0,.17,.17,.17);
    mk(claw3(),lt,h,0,0,0,.2,.2,.2);
    mk(G.oct,FX.eye,h,0,.36,0,.09,.13,.09,true);
    p.hands.push({o:h,x:x});
  }
};
ANIM.witch=function(p,m,t,tt,st,look){
  var mt=typeof m.t==='number'?m.t:9,cast=mt>1.2&&mt<=1.5?(mt-1.2)/.3:0,pre=mt<.4?1-mt/.4:0,i,H,k;
  for(i=0;i<2;i++){
    H=p.hands[i];k=tt*1.7+i*2.1;
    H.o.position.set(H.x*(.98-pre*.3-cast*.25)+sin(k)*.1,1.12+cos(k*1.3)*.12+pre*.75-cast*.1,.5+sin(k*.8)*.08+cast*.75);
    H.o.rotation.x=-.4-pre*1.2+cast*.6;H.o.rotation.z=H.x*(.25+.2*sin(k));
    H.o.children[2].scale.set(.09+pre*.1,.13+pre*.16,.09+pre*.1);
  }
  p.robe.rotation.z=sin(tt*1.6)*.06;p.robe.rotation.x=sin(tt*1.25)*.05-.04;
  p.head.rotation.y=look*.6;p.head.rotation.x=.1+pre*-.25+cast*.25;
};

BUILD.fist=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.45),lt=M(s.col,.22),n=s.spikes||4,x,i;
  mk(G.dod,c,b,0,1.08,0,.86,.78,.7).rotation.y=.3;
  mk(G.dod,dk,b,0,.55,-.02,.6,.4,.5);
  for(x=-1;x<=1;x+=2)mk(G.box,dk,b,x*.36,.2,.02,.36,.4,.46);
  p.head=grp(b,0,1.74,.22);
  mk(G.dod,lt,p.head,0,0,0,.34,.3,.32);mk(G.box,dk,p.head,0,.17,.2,.5,.1,.2);
  eyesFace(p.head,p.eyes,s.eyes||1,0,.0,.27,.13,.115);
  for(i=0;i<n;i++){var sd=i%2?1:-1,back=i>>1;spike(dk,b,sd*(.62-back*.3),1.55+back*.1,-.05-back*.4,sd*(.7-back*.3),1,-.15-back*.6,.62-back*.1,.22)}
  p.arms=[];
  for(x=-1;x<=1;x+=2){
    var a=grp(b,x*.84,1.4,.02);
    mk(G.dod,c,a,0,0,0,.3,.3,.3);seg(G.cyl,dk,a,0,0,0,x*.24,-.6,.22,.19);
    var f=mk(G.dod,lt,a,x*.3,-.9,.32,.52,.5,.52);f.rotation.set(.4,x*.5,0);
    mk(merged('knuckles',function(add){for(var k=-1;k<=1;k++)add(G.box,k*.3,0,0,0,1,0,.24,.22,.3)}),c,a,x*.3,-.98,.72,.9,.9,.9);
    p.arms.push({o:a,x:x});
  }
};
ANIM.fist=function(p,m,t,tt,st,look,u){
  var lift=m.lift||0,leap=st==='leap',mt=typeof m.t==='number'?m.t:9,pre=!leap&&mt<.35?1-mt/.35:0,sl=u.slam/.3,i,A,up;
  for(i=0;i<2;i++){
    A=p.arms[i];up=leap?min(1,lift*1.6):0;
    A.o.rotation.x=leap?-2.7*up:sl>0?.5*sl:pre*.7+sin(t*4.5+i*PI)*.28;
    A.o.rotation.z=A.x*(leap?-.25*up:pre*.25+sl*.3);
  }
  p.body.rotation.z+=leap?0:sin(t*4.5)*.06;
  p.body.rotation.x+=pre*.18;
  p.body.scale.y*=1-pre*.14;
  p.head.rotation.y=look*.6;
};

BUILD.mother=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.45),lt=M(s.col,.38),i;
  mk(G.sph,c,b,0,.86,0,1.04,.82,1.04);mk(G.sph,dk,b,0,.36,-.06,1.14,.36,1.14);mk(G.sph,c,b,0,1.4,-.16,.68,.5,.68);
  mk(ringGeo('stubs7',7,.92,.22,-.55,.42,.2,.45),dk,b);
  var spots=[[.72,1.25,.2,.2],[-.8,.95,.1,.24],[.5,1.05,-.72,.22],[-.42,1.5,-.55,.19],[.1,1.82,-.22,.2],[-.6,1.55,.25,.15],[.88,.7,-.35,.2],[0,.75,-1.0,.24],[-.75,.6,-.6,.17]];
  p.pust=[];
  for(i=0;i<spots.length;i++)p.pust.push({o:mk(G.sphLo,lt,b,spots[i][0],spots[i][1],spots[i][2],spots[i][3]),r:spots[i][3]});
  mk(G.sph,FX.voidM,b,0,.52,.98,.26,.2,.14,true);
  mk(ringGeo('motherFangs',6,.2,0,2.4,.2,.07),M(BONE),b,0,.52,1.05).rotation.x=PI/2;
  var n=s.eyes||5,E=[[0,1.3,.84,.18],[-.34,1.02,.94,.14],[.34,1.02,.94,.14],[-.5,1.5,.5,.115],[.5,1.5,.5,.115],[0,1.72,.36,.1],[-.72,1.2,.62,.09],[.72,1.2,.62,.09]];
  for(i=0;i<n&&i<E.length;i++)eye(b,p.eyes,E[i][0],E[i][1],E[i][2],E[i][3],E[i][0]*.6,(E[i][1]-1)*.6,1);
};
ANIM.mother=function(p,m,t,tt){
  var mt=typeof m.t==='number'?m.t:9,pre=mt<.35?1-mt/.35:0,i,q,k;
  for(i=0;i<p.pust.length;i++){q=p.pust[i];k=q.r*(1+.22*sin(tt*3+i*1.7)+pre*.35);q.o.scale.set(k,k,k)}
  p.body.scale.x*=1+pre*.07;p.body.scale.z*=1+pre*.07;p.body.scale.y*=1-pre*.05;
  p.body.rotation.z+=sin(tt*1.3)*.035;
};

BUILD.mite=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5);
  mk(merged('miteBody',function(add){add(G.sphLo,0,.78,-.05,0,1,0,.8,.62,1.0);add(G.cone4,0,1.2,-.5,0,.7,-.8,.3,.7,.3);add(G.cone4,-.3,.7,.8,-.4,-.2,1,.14,.5,.14);add(G.cone4,.3,.7,.8,.4,-.2,1,.14,.5,.14)}),c,b);
  var leg=function(add,sx,sz){add(G.cone4,sx*.45,.75,sz*.4,sx*.75,.35,sz*.25,.2,.75,.2);add(G.cone4,sx*1.22,0,sz*.75,-sx*.35,1,-sz*.15,.17,1.05,.17)};
  p.la=mk(merged('miteLegA',function(add){leg(add,-1,1);leg(add,1,-1)}),dk,b,0,0,0,undefined,undefined,undefined,true);
  p.lb=mk(merged('miteLegB',function(add){leg(add,1,1);leg(add,-1,-1)}),dk,b,0,0,0,undefined,undefined,undefined,true);
  eye(b,p.eyes,0,.95,.72,.34,0,.15,1,false,true);
};
ANIM.mite=function(p,m,t,tt){
  var k=sin(tt*22);
  p.la.rotation.y=k*.3;p.lb.rotation.y=-k*.3;p.la.rotation.x=k*.1;p.lb.rotation.x=-k*.1;
  p.body.rotation.z+=k*.07;
};

BUILD.burrower=function(b,m,p,root){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.3),earth=M(s.col,-.72),n=s.spikes||0;
  p.mound=mk(merged('mound',function(add){for(var i=0;i<9;i++){var a=i*TAU/9,q=.2+((i*7)%3)*.07;add(G.dod,cos(a)*1.02,.08,sin(a)*1.02,sin(a*3)*.3,1,cos(a*2)*.3,q+.12,q,q+.1)}}),earth,root);
  mk(G.disc,FX.voidM,root,0,.03,0,.95,1,.95,true);
  p.worm=grp(b,0,0,0);
  mk(G.sph,c,p.worm,0,.3,0,.84,.5,.84);mk(G.sph,dk,p.worm,0,.62,.05,.7,.14,.7);
  mk(G.sph,c,p.worm,0,.9,.14,.78,.46,.78);mk(G.sph,dk,p.worm,0,1.2,.26,.66,.13,.66);
  mk(G.sph,lt,p.worm,0,.8,.58,.46,.6,.4);
  if(n)mk(ringGeo('wyrmSpk'+n,n,.62,.88,.5,.6,.17,.3),dk,p.worm,0,0,.08);
  p.maw=grp(p.worm,0,1.52,.4);p.maw.rotation.x=.6;
  mk(G.sph,c,p.maw,0,-.14,0,.86,.32,.86);
  mk(G.torus,lt,p.maw,0,.2,0,.74,.9,.74);
  mk(G.disc,FX.voidM,p.maw,0,.2,0,.72,1,.72,true);
  p.teeth=mk(merged('teeth9',function(add){for(var i=0;i<9;i++){var a=i*TAU/9;add(G.cone4,cos(a)*.7,.22,sin(a)*.7,-cos(a)*.75,.55,-sin(a)*.75,.13,.46,.13)}}),M(BONE),p.maw);
  p.fangs=mk(ringGeo('fangs5',5,.86,.12,1.4,.5,.13,.3),M(BONE),p.maw);
};
ANIM.burrower=function(p,m,t,tt,st){
  var mt=typeof m.t==='number'?m.t:1,e=1;
  if(st==='under'||st==='idle'&&m.hidden)e=0;
  else if(st==='rise')e=max(0,min(1,1-mt/.7))*.45;
  else if(st==='up'){var d=typeof m.t==='number'?2.4-mt:9;e=d>=0&&d<.2?.45+.55*d/.2:mt<.3?max(.05,mt/.3):1}
  p.worm.scale.y=max(.02,e);p.worm.visible=e>.03;
  var sway=sin(tt*2.2)*.09;
  p.worm.rotation.z=sway;p.worm.rotation.x=sin(tt*1.7)*.06;
  p.maw.rotation.x=.6+sin(tt*2.6)*.1;p.maw.rotation.z=sway*.8;
  var g=1+.07*sin(tt*5);p.maw.scale.set(g,1,g);
  p.teeth.rotation.y=t;p.fangs.rotation.y=-t*.4;
};

BUILD.mimic=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),bone=M(BONE),x;
  mk(G.sph,c,b,0,.82,0,.86,.78,.8);mk(G.sph,dk,b,0,.3,0,1.0,.3,1.0);mk(G.sph,c,b,0,1.3,-.16,.62,.5,.6);
  mk(ringGeo('mimicFeet',6,.8,.16,-.35,.5,.2,.2),dk,b);
  p.mask=grp(b,0,1.2,.6);p.mask.rotation.x=-.16;
  mk(G.sph,bone,p.mask,0,0,0,.6,.7,.2);spike(bone,p.mask,0,-.42,.02,0,-1,.1,.42,.3).scale.z=.1;
  mk(G.box,M(BONE,-.45),p.mask,0,-.3,.17,.22,.035,.06,true);
  eyesFace(p.mask,p.eyes,s.eyes||3,0,.02,.22,.23,.125);
  p.tend=[];
  for(x=-1;x<=1;x+=2){
    var t0=grp(b,x*.36,1.55,-.2);seg(G.cyl,dk,t0,0,0,0,x*.34,.42,-.05,.11);
    var t1=grp(t0,x*.34,.42,-.05);seg(G.cone,dk,t1,0,0,0,x*.3,.3,.3,.11);mk(G.sphLo,c,t1,x*.3,.3,.3,.11,.11,.11);
    p.tend.push({a:t0,b:t1,x:x});
  }
};
ANIM.mimic=function(p,m,t,tt,st,look){
  var i,q;
  for(i=0;i<2;i++){q=p.tend[i];q.a.rotation.z=sin(tt*2.4+i*1.3)*.2;q.b.rotation.z=q.x*sin(tt*3.1+i)*.35;q.a.rotation.x=sin(tt*1.9+i)*.15}
  p.mask.rotation.y=look*.4;p.mask.rotation.z=sin(tt*1.4)*.1;
  p.body.rotation.z+=sin(tt*2)*.05;
};

BUILD.hollow=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.28),horn=M(BONE,-.18),n=s.spikes||9,x;
  mk(G.skirt,c,b);mk(ringGeo('hem8',8,.74,.02,-2.6,.34,.24),c,b,0,.02,0,1.06,1,1.06);
  mk(merged('hollowRibs',function(add){for(var i=0;i<6;i++){var a=i*TAU/6;add(G.cone4,cos(a)*.46,.82,sin(a)*.46,cos(a)*.7,1,sin(a)*.7,.12,.7,.12)}}),dk,b);
  mk(G.sph,FX.voidM,b,0,1.3,.04,.58,.58,.58);
  p.ring=mk(G.torus,FX.ring,b,0,1.3,.04,.76,.7,.76,true);p.ring.rotation.x=.35;
  p.ring2=mk(G.torus,FX.ring,b,0,1.3,.04,.66,.4,.66,true);
  p.spin=mk(ringGeo('hollowSpk'+n,n,.84,0,.12,.72,.2),M(s.col,.16),b,0,.84,0);
  seg(G.cyl,dk,b,0,.8,-.5,0,1.95,-.55,.13);mk(G.ico,c,b,0,2.0,-.38,.4,.2,.34);
  mk(merged('hollowSpine',function(add){for(var k=0;k<4;k++)add(G.cone4,0,1.0+k*.27,-.6,0,.5,-1,.11,.4,.11)}),dk,b);
  p.head=grp(b,0,2.22,-.12);
  mk(G.sphLo,dk,p.head,0,0,0,.3,.33,.32);spike(dk,p.head,0,-.12,.2,0,-1,.15,.34,.16);
  for(x=-1;x<=1;x+=2){seg(G.cyl,horn,p.head,x*.18,.16,-.02,x*.62,.42,-.1,.11);seg(G.cone,horn,p.head,x*.62,.42,-.1,x*.72,1.0,.22,.115);mk(G.sphLo,horn,p.head,x*.62,.42,-.1,.115,.115,.115)}
  eyesFace(p.head,p.eyes,s.eyes||2,0,.04,.27,.13,.075,true);
  p.arms=[];
  for(x=-1;x<=1;x+=2){
    var a=grp(b,x*.98,1.86,-.1);
    mk(G.ico,c,a,0,0,0,.27,.22,.27);spike(dk,a,0,.05,0,x*.8,1,-.2,.6,.19);
    seg(G.cyl,dk,a,0,0,0,x*.3,-.62,.2,.11);
    var h=grp(a,x*.3,-.62,.2);mk(G.ico,c,h,0,0,0,.17,.17,.17);
    mk(claw3(),lt,h,0,0,0,.24,.24,.24);
    p.arms.push({o:a,x:x});
  }
};
ANIM.hollow=function(p,m,t,tt,st,look){
  var mad=m.hp<m.maxHp/2,wind=st==='wind',ch=st==='charge',dz=st==='dazed',i,A;
  p.spin.rotation.y=-t*(ch?5:wind?3.4:mad?1.5:.6);
  p.ring.rotation.z=sin(tt*1.1)*.25;p.ring.rotation.x=.35+cos(tt*.9)*.2;p.ring2.rotation.x=-.5+sin(tt*1.3)*.3;p.ring2.rotation.z=cos(tt*1.2)*.4;
  var g=.76*(1+(mad?.09:.04)*sin(tt*(mad?9:4)));p.ring.scale.set(g,.7,g);
  for(i=0;i<2;i++){
    A=p.arms[i];
    A.o.rotation.x=ch?.9:wind?-1.5+.1*sin(t*40):dz?.2:-.25+sin(tt*1.6+i*2)*.15;
    A.o.rotation.z=A.x*(wind?.5:ch?.5:dz?-.1:.15+.1*sin(tt*1.3+i));
  }
  p.head.rotation.y=ch||wind?0:look*.6;p.head.rotation.x=wind?-.3:ch?.35:dz?.6:0;p.head.rotation.z=dz?.25*sin(tt*3):0;
};

/* ---------- interface ---------- */
function wrap(a){a=(a+PI)%TAU;if(a<0)a+=TAU;return a-PI}
function create(m,MB){
  geos();fx();
  var s=m.s||{},ai=BUILD[m.ai]?m.ai:BUILD[m.kind]?m.kind:'mimic';
  if(!m.s)m={s:{col:'#888888',eyes:2},ai:ai,r:m.r||20,seed:0,boss:m.boss};
  var g=new T.Group(),root=grp(g),body=grp(root),p={body:body,eyes:[]},cfg=CFG[ai],r=m.r||m.s.r||20;
  REG=[];
  BUILD[ai](body,m,p,root);
  var meshes=REG,mats=[],i;REG=null;
  for(i=0;i<meshes.length;i++)mats.push(meshes[i].material);
  root.scale.setScalar(r*(cfg.k||1));
  var u={ai:ai,root:root,body:body,p:p,cfg:cfg,meshes:meshes,mats:mats,fl:false,rot:0,init:false,sx:1,sy:1,sz:1,tilt:0,shake:0,slam:0,prev:m.st,stars:null,aura:null,r:r};
  if(ai==='hound'||ai==='hollow'){
    var st=grp(root,0,cfg.top,ai==='hound'?.7:0);st.visible=false;
    for(i=0;i<3;i++){var a=i*TAU/3,o=new T.Mesh(G.oct,FX.star);o.position.set(cos(a)*.62,0,sin(a)*.62);o.scale.set(.15,.21,.15);st.add(o)}
    u.stars=st;
  }
  if(m.boss&&ai!=='mimic'){
    var au=new T.Mesh(G.aura,auraMat(m.s.col));au.scale.setScalar(r*2.3);au.position.y=.8;au.renderOrder=1;g.add(au);u.aura=au;
  }
  g.userData.mb=u;g.name='mon:'+ai;
  return g;
}
function update(g,m,MB,dt){
  var u=g.userData.mb;if(!u)return;
  var P=MB.P,S=MB.S,t=S.t,seed=m.seed||0,tt=t+seed,st=m.st,cfg=u.cfg,p=u.p,body=u.body,root=u.root,i;
  dt=dt>0?min(dt,.1):1/60;
  var r=m.r||u.r;if(r!==u.r){u.r=r;root.scale.setScalar(r*(cfg.k||1));if(u.aura)u.aura.scale.setScalar(r*2.3)}
  // facing
  var a=Math.atan2(P.y-m.y,P.x-m.x),fast=st==='charge'||st==='lunge',face=fast?m.ang:a;
  if(u.ai==='hound'&&st==='idle'&&typeof m.side==='number')face=a+.9*m.side;
  else if(u.ai==='mite')face=a+sin(t*3+seed)*.6;
  var want=PI/2-face;
  if(!u.init){u.init=true;u.rot=want}else u.rot+=wrap(want-u.rot)*min(1,dt*(fast?30:11));
  root.rotation.y=u.rot;
  var look=wrap(PI/2-a-u.rot);look=look>1.1?1.1:look<-1.1?-1.1:look;
  // pose targets
  var sx=1,sy=1,sz=1,tilt=0,roll=0,shake=0,lift=m.lift||0;
  if(st==='wind'){sy=.8;sx=sz=1.1;tilt=-.1;shake=1}
  else if(fast){sz=1.28;sx=.9;sy=.9;tilt=.2}
  else if(st==='dazed'){sy=.86;sx=sz=1.05;tilt=.16;roll=sin(tt*3)*.12}
  else if(st==='leap'){sy=1.12-.1*sin(lift*PI);sx=sz=.94}
  if(u.prev==='leap'&&st!=='leap')u.slam=.3;u.prev=st;
  if(u.slam>0){u.slam=max(0,u.slam-dt);var q=u.slam/.3;sy*=1-.32*q;sx*=1+.2*q;sz*=1+.2*q}
  var k=min(1,dt*16);
  u.sx+=(sx-u.sx)*k;u.sy+=(sy-u.sy)*k;u.sz+=(sz-u.sz)*k;u.tilt+=(tilt-u.tilt)*k;u.shake+=(shake-u.shake)*k;
  var br=1+cfg.br*sin(tt*cfg.spd*.8);
  body.scale.set(u.sx*br,u.sy*(2-br),u.sz*br);
  body.rotation.set(u.tilt,0,roll);
  body.position.y=cfg.y0+(st==='idle'||st==='up'?cfg.bob*(.5+.5*sin(tt*cfg.spd)):0);
  if(u.shake>.02)root.position.set(sin(t*91+seed)*.07*r*u.shake,0,cos(t*77+seed)*.05*r*u.shake);else root.position.set(0,0,0);
  ANIM[u.ai](p,m,t,tt,st,look,u,dt);
  // eyes follow the player
  var E=p.eyes;for(i=0;i<E.length;i++)E[i].pu.position.x=E[i].x+look*E[i].er*.38;
  // dazed stars
  if(u.stars){var dz=st==='dazed';u.stars.visible=dz;if(dz){u.stars.rotation.y=t*5;u.stars.position.y=cfg.top*u.sy+.08*sin(t*7)}}
  // boss aura stays on the ground while the body leaps
  if(u.aura){u.aura.position.y=.8-g.position.y;u.aura.material.opacity=.5+.12*sin(t*2.4)}
  // hit flash
  var on=m.flash>0;
  if(on!==u.fl){u.fl=on;var ms=u.meshes,mt=u.mats;for(i=0;i<ms.length;i++)ms[i].material=on?FX.white:mt[i]}
}
window.MBModels.monster={create:create,update:update,
  // optional helpers for the renderer: world height of the top of the head, and a no-op dispose (geometry and materials are shared)
  height:function(m){var c=CFG[m.ai]||CFG.mimic;return c.top*(c.k||1)*(m.r||20)},dispose:function(){}};
})();
