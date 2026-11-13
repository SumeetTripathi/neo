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
var MATS={},FX=null,_c=new T.Color(),_c2=new T.Color(),_hsl={h:0,s:0,l:0};
// PV = pet variant of the monster being built: 0 hostile, 'necro' (bound dead: dark, drained, green-lit) or 'beast' (tamed: warm natural hide).
// Each variant has its own cached material set, so a pet never shares (or recolours) the materials of the hostile monsters around it.
var PV=0;
function M(hex,shade){
  var key=(PV?PV+'|':'')+hex+'|'+(shade||0),m=MATS[key];if(m)return m;
  _c.set(hex);
  if(PV==='necro'){
    if(hex===BONE)_c.setRGB(.5,.62,.5);
    else{_c.getHSL(_hsl);_c.setHSL(_hsl.h*.4+.27,min(.3,_hsl.s*.3+.08),max(.1,min(.19,_hsl.l*.42)))}
  }else if(PV==='beast'&&hex!==BONE)_c.lerp(_c2.set(0xa07c4c),.3);
  if(shade>0)_c.lerp(_c2.set(PV==='necro'?0x8fae94:0xffffff),PV==='necro'?shade*.7:shade);else if(shade<0)_c.multiplyScalar(1+shade);
  m=new T.MeshStandardMaterial({color:_c.getHex(),roughness:.82,metalness:.04,flatShading:true});
  if(PV==='necro')m.emissive.setRGB(.012,.07,.03);else m.emissive.copy(_c).multiplyScalar(.06);
  m.userData.mbBody=true;
  return MATS[key]=m;
}
function fx(){
  if(FX)return FX;
  var glow=function(c,e,i){return new T.MeshStandardMaterial({color:c,emissive:e,emissiveIntensity:i,roughness:.4})};
  FX={
    eye:glow(0x5a4410,0xffd95e,1.5),eyeRed:glow(0x400008,0xff2238,1.5),ring:glow(0x2a0308,0xc8142e,1.25),star:glow(0x5a4410,0xffcf5a,1.4),
    pupil:new T.MeshBasicMaterial({color:0x08070a}),voidM:new T.MeshBasicMaterial({color:0x050408}),
    eyeGreen:glow(0x103a10,0x7fe85a,1.5),ember:glow(0x5a1a04,0xff7a22,1.5),iris:glow(0x4a2a00,0xffb428,1.5),irisHot:glow(0x5a0a00,0xff4a2a,2),
    white:new T.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1,roughness:1}),
    // pet eyes and glows
    eyeBlue:glow(0x1c3a5a,0xa8dcff,1.5),emberN:glow(0x0c3a14,0x4fe86a,1.4),ringN:glow(0x06280e,0x35d85a,1.25),ringB:glow(0x10283a,0x7cc4ff,1.2),
    irisN:glow(0x0c3a14,0x5cf07a,1.5),irisNHot:glow(0x1a5a20,0xb4ffc0,2.2),irisB:glow(0x12324a,0x8fd0ff,1.5),irisBHot:glow(0x2a5a7a,0xe4f6ff,2.2),
    leather:new T.MeshStandardMaterial({color:0x8a5527,emissive:0x2a1608,roughness:.7,flatShading:true}),
    brass:new T.MeshStandardMaterial({color:0xe2b04a,emissive:0x8a5a10,emissiveIntensity:.9,roughness:.3,metalness:.6})
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
  mk(lo?G.sphLo:G.sph,PV==='necro'?FX.eyeGreen:PV==='beast'?FX.eyeBlue:red==='g'?FX.eyeGreen:red?FX.eyeRed:FX.eye,par,x,y,z,er,er,er,true);
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
  bomber:{bob:.03,spd:3,y0:0,br:.05,top:1.75},summoner:{bob:.08,spd:2,y0:.14,br:.02,top:3.1,k:.92},beamer:{bob:.12,spd:2.4,y0:.3,br:.02,top:2.45},
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
  var mad=m.hp>0&&m.maxHp>0&&m.hp<m.maxHp/2,wind=st==='wind',ch=st==='charge',dz=st==='dazed',i,A;
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

// Cinder Toad: squat, wide-mouthed, a smouldering crater in its back. Swells before it lobs, hops away when crowded.
BUILD.bomber=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.5),lt=M(s.col,.35),x,i;
  mk(G.sph,c,b,0,.68,-.05,1.08,.66,1.02);mk(G.sph,dk,b,0,.34,-.05,1.0,.3,.95);
  p.sac=mk(G.sph,lt,b,0,.5,.62,.6,.42,.5);
  p.head=grp(b,0,.92,.62);
  mk(G.sph,c,p.head,0,0,0,.74,.4,.56);
  mk(G.box,FX.voidM,p.head,0,-.1,.4,1.0,.05,.3,true);
  for(x=-1;x<=1;x+=2){mk(G.sphLo,c,p.head,x*.42,.3,.08,.24,.24,.24);eye(p.head,p.eyes,x*.44,.36,.2,.17,x*.3,.3,1)}
  // the crater and its coals
  mk(ringGeo('toadRim',7,.34,0,2.2,.3,.15),dk,b,0,1.16,-.3);
  p.coal=mk(G.sphLo,FX.ember,b,0,1.2,-.3,.3,.16,.3,true);
  var spots=[[.72,.98,-.1,.15],[-.7,.95,-.25,.17],[.45,1.02,-.72,.14],[-.4,1.05,-.75,.13],[.85,.7,-.5,.13],[-.88,.68,.1,.12]];
  p.pust=[];for(i=0;i<spots.length;i++)p.pust.push({o:mk(G.sphLo,FX.ember,b,spots[i][0],spots[i][1],spots[i][2],spots[i][3],spots[i][3],spots[i][3],true),r:spots[i][3]});
  p.legs=[];
  for(i=0;i<4;i++){
    var sd=i%2?1:-1,front=i<2,o=grp(b,sd*(front?.72:.82),front?.42:.5,front?.5:-.5);
    if(front){seg(G.cyl,dk,o,0,0,0,sd*.2,-.4,.25,.13);mk(G.sph,dk,o,sd*.24,-.4,.36,.2,.08,.26)}
    else{mk(G.sph,c,o,sd*.08,.06,0,.36,.4,.52);seg(G.cyl,dk,o,sd*.1,-.1,.3,sd*.3,-.46,-.1,.13);mk(G.sph,dk,o,sd*.36,-.48,.14,.22,.08,.4)}
    p.legs.push({o:o,front:front,sd:sd});
  }
};
ANIM.bomber=function(p,m,t,tt,st){
  var wind=st==='wind',leap=st==='leap',i,q,k,L,lift=m.lift||0;
  k=wind?1.5+.12*sin(t*40):1+.14*sin(tt*3.2);p.sac.scale.set(.6*k,.42*k,.5*k);
  for(i=0;i<p.pust.length;i++){q=p.pust[i];k=q.r*(1+.25*sin(tt*4+i*1.9)+(wind?.5:0));q.o.scale.set(k,k,k)}
  k=wind?1.5+.3*sin(t*30):1+.2*sin(tt*5);p.coal.scale.set(.3*k,.16*k,.3*k);
  p.head.rotation.x=wind?-.35:leap?.15:.04*sin(tt*2);
  p.body.rotation.x+=wind?-.16:leap?.2-lift*.5:0;
  for(i=0;i<4;i++){L=p.legs[i];L.o.rotation.x=leap?(L.front?-.7:1.1)*min(1,lift*2.5+.3):wind?(L.front?.25:-.2):sin(t*7+i*PI)*.12}
};

// Grave Caller: a tall hooded thing with a collar of ribs and a bell-staff. Raises both arms to call husks out of the floor.
BUILD.summoner=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.55),lt=M(s.col,.3),bone=M(BONE),x;
  p.robe=grp(b,0,0,0);
  mk(G.robe,c,p.robe,0,0,0,.82,1.22,.82);mk(ringGeo('hem8',8,.74,.02,-2.6,.34,.24),dk,p.robe,0,0,0,.84,1,.84);
  mk(merged('callerStrips',function(add){for(var i=0;i<5;i++){var a=i*TAU/5+.3;add(G.box,cos(a)*.5,.7,sin(a)*.5,cos(a)*.25,-1,sin(a)*.25,.16,1.1,.03)}}),dk,p.robe);
  mk(ringGeo('callerRibs',8,.36,0,.25,.62,.09,.2),bone,b,0,1.72,0);
  mk(G.cone,dk,b,0,1.5,0,.5,.5,.46);
  p.head=grp(b,0,2.2,.02);
  mk(G.sph,dk,p.head,0,0,-.04,.42,.48,.46);spike(dk,p.head,0,.3,-.12,0,1,-.25,.8,.3);
  mk(G.sph,FX.voidM,p.head,0,-.05,.24,.31,.34,.24,true);
  eyesFace(p.head,p.eyes,s.eyes||3,0,-.06,.44,.12,.07,'g');
  p.arms=[];
  for(x=-1;x<=1;x+=2){
    var a=grp(b,x*.44,1.72,.05);
    seg(G.cyl,dk,a,0,0,0,x*.3,-.5,.3,.09);var h=grp(a,x*.3,-.5,.3);mk(G.ico,bone,h,0,0,0,.13,.13,.13);mk(claw3(),bone,h,0,0,0,.18,.18,.18);
    if(x>0){p.staff=grp(h,0,0,0);seg(G.cyl,M('#3a2c20'),p.staff,0,-1.25,0,0,1.25,0,.05);
      mk(G.torus,bone,p.staff,0,1.42,0,.22,.4,.22).rotation.x=PI/2;p.orb=mk(G.sphLo,FX.eyeGreen,p.staff,0,1.42,0,.13,.13,.13,true)}
    p.arms.push({o:a,x:x});
  }
};
ANIM.summoner=function(p,m,t,tt,st,look){
  var wind=st==='wind',i,A,k;
  for(i=0;i<2;i++){A=p.arms[i];A.o.rotation.x=wind?-2.3+.08*sin(t*30+i):-.2+sin(tt*1.5+i*2)*.12;A.o.rotation.z=A.x*(wind?.5:.12)}
  p.staff.rotation.x=wind?2.2:.25+sin(tt*1.2)*.06;
  k=wind?.26+.08*sin(t*32):.13+.03*sin(tt*4);p.orb.scale.set(k,k,k);
  p.robe.rotation.z=sin(tt*1.4)*.05;p.robe.rotation.x=sin(tt*1.1)*.04-.03;
  p.head.rotation.y=look*.6;p.head.rotation.x=wind?-.4:.12;
};

// Lidless Eye: a floating eyeball in a horned shell, nerves trailing under it. It turns to wherever its beam points.
BUILD.beamer=function(b,m,p){
  var s=m.s,c=M(s.col),dk=M(s.col,-.55),sclera=M('#e9e2d2'),n=s.spikes||5,i;
  p.ball=grp(b,0,1.3,0);
  mk(G.sph,sclera,p.ball,0,0,.06,.9,.9,.9);
  mk(G.sph,c,p.ball,0,.02,-.16,.98,.98,.9);
  mk(ringGeo('eyeLash'+n,n,.74,0,.5,.62,.17,.3),dk,p.ball,0,0,-.05).rotation.x=-PI/2;
  mk(merged('eyeVeins',function(add){for(var i=0;i<7;i++){var a=i*TAU/7+.2;add(G.box,cos(a)*.6,sin(a)*.6,.68,cos(a),sin(a),-.75,.035,.36,.02)}}),M('#b8263d'),p.ball,0,0,0,1,1,1,true);
  p.iris=mk(G.sph,FX.iris,p.ball,0,0,.6,.5,.5,.4,true);
  p.pupil=mk(G.sph,FX.pupil,p.ball,0,0,.86,.22,.3,.18,true);
  p.nerves=[];
  for(i=0;i<4;i++){var a=i*TAU/4+.6,o=grp(b,cos(a)*.34,.52,sin(a)*.34-.1);seg(G.cyl,dk,o,0,0,0,0,-.3,0,.085);var o2=grp(o,0,-.3,0);seg(G.cone,dk,o2,0,0,0,0,-.42,0,.085);mk(G.sphLo,dk,o2,0,0,0,.085,.085,.085);p.nerves.push({a:o,b:o2,ph:i*1.7})}
};
ANIM.beamer=function(p,m,t,tt,st,look,u){
  var wind=st==='wind',beam=st==='beam',i,q,k;
  p.ball.rotation.y=wind||beam?0:look*.5;p.ball.rotation.x=beam?.22:wind?.12:.05*sin(tt*1.7);
  var hot=beam||wind&&sin(t*38)>0,mat=u&&u.pv?(u.pv==='necro'?(hot?FX.irisNHot:FX.irisN):(hot?FX.irisBHot:FX.irisB)):hot?FX.irisHot:FX.iris;if(p.iris.material!==FX.white&&p.iris.material!==u.ghost&&p.iris.material!==mat)p.iris.material=mat;
  k=beam?1.12+.06*sin(t*50):wind?.8+.25*(1-max(0,min(1,(m.t||0)/.95))):1+.05*sin(tt*3);p.iris.scale.set(.5*k,.5*k,.4);
  k=beam?.5:wind?1.3:1;p.pupil.scale.set(.22*k,.3*k,.18);
  for(i=0;i<p.nerves.length;i++){q=p.nerves[i];q.a.rotation.x=sin(tt*2.2+q.ph)*.3+(beam?.5:0);q.a.rotation.z=cos(tt*1.8+q.ph)*.25;q.b.rotation.x=sin(tt*3+q.ph)*.4}
  if(beam)p.body.position.y+=.03*sin(t*60);
};

/* ---------- status and modifier dressing (shared materials, built lazily per monster, nothing allocated per frame) ---------- */
var FXM=null,MODS=['shielded','splitting','burning','swift','vampiric','thorned'];
function fxm(){
  if(FXM)return FXM;
  var add=function(c,o){return new T.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false})};
  FXM={
    ward:add(0xcfe6ff,.3),wardRim:new T.MeshBasicMaterial({color:0xe8f4ff,transparent:true,opacity:.22,wireframe:true,depthWrite:false,fog:false,toneMapped:false}),
    shell:new T.MeshStandardMaterial({color:0x8fb0e8,emissive:0x2a56b0,emissiveIntensity:.9,roughness:.3,metalness:.3,flatShading:true}),
    shellEdge:new T.MeshBasicMaterial({color:0xa9c8ff,transparent:true,opacity:.55,wireframe:true,depthWrite:false,fog:false,toneMapped:false}),
    flame:add(0xff8a2a,.9),flameCore:add(0xffe08a,.9),streak:add(0xdff3ff,.5),blood:add(0xb00a1c,.75),
    drop:new T.MeshStandardMaterial({color:0x7a0612,emissive:0xc0101e,emissiveIntensity:.8,roughness:.3}),
    thorn:new T.MeshStandardMaterial({color:0xe7dfcd,emissive:0x2a2620,roughness:.6,flatShading:true}),
    thornTip:new T.MeshStandardMaterial({color:0x8c2f39,emissive:0x2a0508,roughness:.5,flatShading:true}),
    seam:new T.MeshBasicMaterial({color:0x8fe02a,fog:false,toneMapped:false}),seamGlow:add(0x58c010,.3),
    dot:add(0x7fe85a,.8),mark:new T.MeshBasicMaterial({color:0xff2a40,fog:false,toneMapped:false,transparent:true,opacity:.95,depthTest:false}),
    burst:add(0xff6a5a,.6),frost:add(0x8fd3ff,.45)
  };
  return FXM;
}
// tinted twins of a body material, cached on the material itself so every monster of that colour shares them
var VAR={rage:new Map(),slow:new Map()};
function variant(mat,kind){
  if(!mat.userData||!mat.userData.mbBody)return mat;
  var map=VAR[kind],v=map.get(mat);if(v)return v;
  v=mat.clone();v.userData={};
  if(kind==='rage'){v.color.lerp(_c.set(0xff2a30),.28);v.emissive.setRGB(.85,.05,.07);v.emissiveIntensity=.5}
  else{v.color.lerp(_c.set(0x3f8cff),.6);v.emissive.setRGB(.05,.16,.4);v.emissiveIntensity=.5}
  map.set(mat,v);return v;
}
function fxMesh(geo,mat,par,x,y,z,sx,sy,sz){
  var o=new T.Mesh(geo,mat);o.position.set(x||0,y||0,z||0);if(sx!==undefined)o.scale.set(sx,sy===undefined?sx:sy,sz===undefined?sx:sz);o.castShadow=false;par.add(o);return o;
}
var DRESS={
  stars:function(u){var st=grp(u.root,0,u.cfg.top,u.ai==='hound'?.7:0),i;for(i=0;i<3;i++){var a=i*TAU/3;fxMesh(G.oct,FX.star,st,cos(a)*.62,0,sin(a)*.62,.15,.21,.15)}return st},
  ward:function(u){var g=grp(u.fx,0,u.top*.5,0);fxMesh(G.sph,FXM.ward,g,0,0,0,1.38,u.top*.62,1.38).renderOrder=5;fxMesh(G.ico1,FXM.wardRim,g,0,0,0,1.4,u.top*.63,1.4).renderOrder=5;return g},
  shielded:function(u){var g=grp(u.fx,0,u.top*.5,0),i;for(i=0;i<3;i++){var a=i*TAU/3,h=grp(g,cos(a)*1.3,0,sin(a)*1.3);h.rotation.y=PI/2-a;
      fxMesh(merged('shieldPlate',function(add){add(G.box,0,.06,0,0,1,0,.52,.5,.07);add(G.cone4,0,-.19,0,0,-1,0,.37,.4,.05);add(G.box,0,.06,.04,0,1,0,.1,.5,.05)}),FXM.shell,h).castShadow=true}return g},
  burning:function(u){var g=grp(u.fx),i;for(i=0;i<6;i++){var f=grp(g);fxMesh(G.cone4,FXM.flame,f,0,0,0,.2,.6,.2);fxMesh(G.cone4,FXM.flameCore,f,0,0,0,.1,.34,.1)}return g},
  swift:function(u){var g=grp(u.fx),i;for(i=0;i<4;i++)fxMesh(G.box,FXM.streak,g,(i-1.5)*.5,.35+((i*7)%3)*.42,-1.5,.05,.05,1.5);return g},
  vampiric:function(u){var g=grp(u.fx),i;fxMesh(G.aura,auraMat(0xb00a1c),g,0,.05,0,1.9,1,1.9).renderOrder=1;for(i=0;i<3;i++)fxMesh(G.sphLo,FXM.drop,g,0,0,0,.12,.17,.12);return g},
  thorned:function(u){var g=grp(u.fx);
    fxMesh(ringGeo('thornA',11,.82,0,.3,.7,.14),FXM.thorn,g,0,u.top*.3+.12,0).castShadow=true;
    fxMesh(ringGeo('thornB',7,.6,0,1.1,.55,.12,.4),FXM.thorn,g,0,u.top*.5+.1,0);return g},
  splitting:function(u){var g=grp(u.root,0,u.cfg.top*.47,0);var a=fxMesh(G.torus,FXM.seam,g,0,0,0,1,1,1);a.rotation.z=PI/2;a.scale.set(u.cfg.top*.5,.3,.92);
    var b=fxMesh(G.torus,FXM.seamGlow,g,0,0,0,1,1,1);b.rotation.z=PI/2;b.scale.set(u.cfg.top*.52,.9,.95);return g},
  dot:function(u){var g=grp(u.fx),i;for(i=0;i<5;i++)fxMesh(G.sphLo,FXM.dot,g,0,0,0,.14);return g},
  mark:function(u){var g=grp(u.fx,0,u.top+.55,0);g.renderOrder=7;fxMesh(G.torus,FXM.mark,g,0,0,0,.5,.6,.5).renderOrder=7;
    fxMesh(merged('markTicks',function(add){for(var i=0;i<4;i++){var a=i*TAU/4;add(G.box,cos(a)*.62,0,sin(a)*.62,cos(a),0,sin(a),.07,.36,.07)}}),FXM.mark,g).renderOrder=7;return g},
  burst:function(u){return fxMesh(G.sph,FXM.burst,u.fx,0,u.top*.5,0,1)},
  slow:function(u){return fxMesh(G.aura,auraMat(0x8fd3ff),u.fx,0,.06,0,1.5,1,1.5)}
};
function dress(u,k,on){
  var o=u.f[k];
  if(!on){if(o)o.visible=false;return null}
  if(!o)o=u.f[k]=DRESS[k](u);
  o.visible=true;return o;
}
// closest existing body for an ai id this file has no model for
function pickAi(m){
  if(BUILD[m.ai])return m.ai;if(ALIAS[m.ai])return ALIAS[m.ai];if(BUILD[m.kind])return m.kind;
  var s=m.s||{};
  if(s.ai&&BUILD[s.ai])return s.ai;
  if(s.void)return'hollow';if(s.hood)return'witch';if(s.pust)return'mother';if(s.mask)return'mimic';if(s.teeth)return'burrower';
  if(s.legs)return(m.r||s.r||20)<13?'mite':'crawler';if(s.spikes)return s.spikes>4?'hound':'fist';
  return'mimic';
}
var ALIAS={husk:'mite',splitter:'mimic',lobber:'bomber',caller:'summoner',sweeper:'beamer'};

/* ---------- interface ---------- */
function wrap(a){a=(a+PI)%TAU;if(a<0)a+=TAU;return a-PI}
/* ---------- pets (allies drawn with the monster bodies) ---------- */
// which variant an entity is: anything flagged pet, or owned by a class, is friendly
function petKind(m,MB){
  if(!m||!(m.pet||m.owner==='necro'||m.owner==='beast'))return 0;
  if(m.owner==='beast'||m.owner==='necro')return m.owner;
  var c=null;try{c=MB&&MB.S&&MB.S.cls}catch(e){}
  return c==='ranger'?'beast':'necro';
}
// ground marks: a rune circle with a green glow for the bound dead, a broken blue-white ring for the tamed
var PTEX={};
function petTex(pv){
  if(PTEX[pv])return PTEX[pv];
  var cv=document.createElement('canvas');cv.width=cv.height=256;var x=cv.getContext('2d'),g,i,a;
  x.translate(128,128);x.lineCap='round';
  if(pv==='necro'){
    g=x.createRadialGradient(0,0,8,0,0,126);g.addColorStop(0,'rgba(70,255,120,.5)');g.addColorStop(.5,'rgba(50,230,100,.3)');g.addColorStop(.8,'rgba(40,200,90,.14)');g.addColorStop(1,'rgba(40,200,90,0)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,126,0,TAU);x.fill();
    x.strokeStyle='rgba(150,255,170,.95)';x.lineWidth=5;x.beginPath();x.arc(0,0,92,0,TAU);x.stroke();
    x.lineWidth=2.5;x.beginPath();x.arc(0,0,78,0,TAU);x.stroke();
    x.lineWidth=4;for(i=0;i<9;i++){a=i*TAU/9;x.beginPath();x.moveTo(cos(a)*80,sin(a)*80);x.lineTo(cos(a+.16)*90,sin(a+.16)*90);x.stroke()}
    x.lineWidth=3;x.beginPath();for(i=0;i<=5;i++){a=i*2/5*TAU-PI/2;x[i?'lineTo':'moveTo'](cos(a)*76,sin(a)*76)}x.stroke();
  }else{
    g=x.createRadialGradient(0,0,30,0,0,126);g.addColorStop(0,'rgba(150,215,255,.1)');g.addColorStop(.7,'rgba(150,215,255,.26)');g.addColorStop(1,'rgba(150,215,255,0)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,126,0,TAU);x.fill();
    x.strokeStyle='rgba(18,40,66,.6)';x.lineWidth=15;for(i=0;i<4;i++){a=i*TAU/4;x.beginPath();x.arc(0,0,96,a+.2,a+TAU/4-.2);x.stroke()}
    x.strokeStyle='rgba(236,248,255,1)';x.lineWidth=9;for(i=0;i<4;i++){a=i*TAU/4;x.beginPath();x.arc(0,0,96,a+.2,a+TAU/4-.2);x.stroke()}
    x.strokeStyle='rgba(140,205,255,.95)';x.lineWidth=3;x.beginPath();x.arc(0,0,80,0,TAU);x.stroke();
    x.fillStyle='rgba(236,248,255,1)';for(i=0;i<4;i++){a=i*TAU/4;x.beginPath();x.arc(cos(a)*96,sin(a)*96,6,0,TAU);x.fill()}
  }
  return PTEX[pv]=new T.CanvasTexture(cv);
}
var PM=null;
function petMats(){
  if(PM)return PM;
  var add=function(c,o){return new T.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false})};
  return PM={necro:add(0x7dff8c,.95),beast:add(0xcfeaff,.95),quad:new T.PlaneGeometry(1,1).rotateX(-PI/2)};
}
// where the collar or harness of a tamed beast sits: [parent part or 0 = body, x,y,z, radius, squash, axis ('y' upright neck, 'z' around a lying body), tag distance]
var COLLAR={crawler:[0,0,.55,.43,.5,.8,'z'],hound:[0,0,1.14,.66,.5,1,'z'],witch:[0,0,1.6,0,.36,1,'y'],fist:[0,0,1.5,.08,.5,1,'y'],mother:[0,0,1.16,-.08,.9,1,'y'],
  mite:[0,0,.78,.3,.74,.8,'z'],burrower:['worm',0,.62,.05,.76,1,'y'],mimic:[0,0,1.08,-.08,.76,1,'y'],hollow:[0,0,1.96,-.42,.3,1,'y'],bomber:[0,0,.66,.3,1.0,.64,'z'],
  summoner:[0,0,1.98,0,.3,1,'y'],beamer:['ball',0,0,-.28,.96,1,'z']};
function petDress(u,g,m,pv){
  var pm=petMats(),big=!!m.pet,r=u.r,own=u.own,i,o;
  // ground mark (stays on the floor while the body leaps); its material belongs to this pet so it can pulse and fade
  var gm=new T.MeshBasicMaterial({map:petTex(pv),transparent:true,opacity:pv==='necro'?.8:.95,depthWrite:false,fog:false,toneMapped:false});
  own.push(gm);
  o=new T.Mesh(pm.quad,gm);o.position.y=1.2;o.renderOrder=2;g.add(o);u.gmark=o;u.gmat=gm;u.gk=pv==='necro'?(big?4.6:4):(big?4:3.6);
  // entry: a ring racing outward and motes rising
  var sm=new T.MeshBasicMaterial({map:petTex(pv),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false});
  own.push(sm);o=new T.Mesh(pm.quad,sm);o.position.y=1.6;o.renderOrder=3;o.visible=false;g.add(o);u.sring=o;u.smat=sm;
  u.motes=grp(g);u.motes.visible=false;for(i=0;i<(big?8:4);i++)fxMesh(G.sphLo,pm[pv],u.motes,0,0,0,1);
  if(pv==='necro'){
    // two slow wisps keep circling the bound dead
    u.wisps=grp(u.fx);for(i=0;i<(big?3:1);i++)fxMesh(G.sphLo,pm.necro,u.wisps,0,0,0,.09,.13,.09);
  }else{
    var c=COLLAR[u.ai];
    if(c){
      var par=c[0]&&u.p[c[0]]||u.body,col=grp(par,c[1],c[2],c[3]);
      if(c[6]==='z')col.rotation.x=PI/2;
      var band=mk0(G.torus,FX.leather,col,0,0,0,c[4],c[4]*1.5,c[4]*c[5]);
      var tag=mk0(G.sphLo,FX.brass,col,0,c[6]==='z'?0:-.02,c[6]==='z'?-c[4]*c[5]-.1:c[4]+.06,.11,.13,.11);
      if(c[6]==='y'){tag.position.set(0,-.1,c[4]+.05)}
      u.meshes.push(band,tag);u.mats.push(FX.leather,FX.brass);
    }
  }
}
function mk0(geo,mat,par,x,y,z,sx,sy,sz){var o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;par.add(o);return o}

function create(m,MB){
  geos();fx();fxm();
  var s=m.s||{},ai=pickAi(m),pv=petKind(m,MB);
  if(!m.s||typeof m.s.col!=='string')m={s:{col:'#888888',eyes:m.s&&m.s.eyes||2,legs:m.s&&m.s.legs,spikes:m.s&&m.s.spikes},ai:ai,r:m.r||20,seed:0,boss:m.boss,pet:m.pet,x:m.x,y:m.y,st:m.st};
  var g=new T.Group(),root=grp(g),body=grp(root),p={body:body,eyes:[]},cfg=CFG[ai],r=m.r||m.s.r||20;
  REG=[];PV=pv;
  try{BUILD[ai](body,m,p,root)}finally{PV=0}
  var meshes=REG,mats=[],i,o;REG=null;
  if(pv){ // the few glowing parts that are not tinted through M(): no hostile reds or ambers left on a pet
    for(i=0;i<meshes.length;i++){o=meshes[i].material;
      if(pv==='necro')o=o===FX.eye||o===FX.eyeRed?FX.eyeGreen:o===FX.ember?FX.emberN:o===FX.ring?FX.ringN:o===FX.iris?FX.irisN:o;
      else o=o===FX.eye||o===FX.eyeRed?FX.eyeBlue:o===FX.ring?FX.ringB:o===FX.iris?FX.irisB:o;
      meshes[i].material=o}
  }
  for(i=0;i<meshes.length;i++)mats.push(meshes[i].material);
  root.scale.setScalar(r*(cfg.k||1));
  var u={ai:ai,root:root,body:body,p:p,cfg:cfg,meshes:meshes,mats:mats,mode:0,rot:0,init:false,sx:1,sy:1,sz:1,tilt:0,shake:0,slam:0,prev:m.st,aura:null,r:r,
    fx:grp(g),f:{},top:cfg.top*(cfg.k||1),extra:0,rage:!!m.rage,phase:m.phase||1,burst:0,px:m.x||0,pz:m.y||0,mv:0,ma:0,auraCol:m.s.col,rageMats:null,
    pv:pv,own:null,born:0,ghost:null,fa:0,hx:m.x||0,hz:m.y||0};
  u.fx.scale.setScalar(r);
  if(pv){u.own=[];petDress(u,g,m,pv)}
  else if(m.boss&&ai!=='mimic'){
    var au=new T.Mesh(G.aura,auraMat(m.s.col));au.scale.setScalar(r*2.3);au.position.y=.8;au.renderOrder=1;g.add(au);u.aura=au;
  }
  g.userData.mb=u;g.name=(pv?'pet:':'mon:')+ai;
  return g;
}
// what a pet looks at: an explicit target if the game gives one, else the nearest monster that is not underground
var _f={x:0,y:0,ok:false};
function petFocus(m,MB){
  var t=m.target||m.tgt,ms,i,q,d,bd=1e12,dx,dy;_f.ok=false;
  if(t&&typeof t.x==='number'&&typeof t.y==='number'&&!t.hidden){_f.x=t.x;_f.y=t.y;_f.ok=true;return _f}
  if(typeof m.tx==='number'&&typeof m.ty==='number'){_f.x=m.tx;_f.y=m.ty;_f.ok=true;return _f}
  ms=MB.mons;if(!ms)return _f;
  for(i=0;i<ms.length;i++){q=ms[i];if(!q||q.hidden||q===m)continue;dx=q.x-m.x;dy=q.y-m.y;d=dx*dx+dy*dy;if(d<bd){bd=d;_f.x=q.x;_f.y=q.y;_f.ok=true}}
  return _f;
}
// everything that marks a pet as a pet; runs after the normal monster update
function petUpdate(g,m,u,t,dt,r){
  var k,q,i,o,n,pv=u.pv,seed=m.seed||0,ground=1.2-g.position.y,big=!!m.pet;
  u.born+=dt;
  // entry: the body swells into place out of the ring
  q=u.born<.55?u.born/.55:1;
  if(q<1||!u.grown){k=q<1?(.25+.75*q)*(1+.22*sin(q*PI)):1;u.root.scale.setScalar(r*(u.cfg.k||1)*k);u.grown=q>=1}
  var fade=u.fa>0?1-u.fa:1;
  k=r*u.gk*(.9+.1*min(1,u.born*3));if(k<30)k=30;
  o=u.gmark;o.position.y=ground;o.rotation.y=pv==='necro'?-t*.35+seed:t*.5+seed;o.scale.set(k,1,k);
  u.gmat.opacity=(pv==='necro'?.74+.16*sin(t*2.6+seed):.9+.08*sin(t*3+seed))*fade;
  o=u.sring;
  if(u.born<.9&&!u.fa){
    q=u.born/.9;o.visible=true;o.position.y=ground+.4;k=max(30,r*u.gk)*(.5+1.9*q);o.scale.set(k,1,k);o.rotation.y=t*2;u.smat.opacity=.95*(1-q)*(1-q);
  }else if(o.visible)o.visible=false;
  o=u.motes;
  if(u.born<1.25&&!u.fa){
    o.visible=true;n=o.children.length;
    for(i=0;i<n;i++){q=u.born/1.25*1.35-i*.045;q=q<0?0:q>1?1:q;k=i*TAU/n+seed+q*2.2;var rr=r*(1.25-.5*q),c=o.children[i];
      c.position.set(cos(k)*rr,-g.position.y+2+q*u.top*r*1.35,sin(k)*rr);k=r*.11*sin(q*PI)*(big?1:.8);c.scale.set(k,k*1.7,k)}
  }else if(o.visible)o.visible=false;
  if(u.wisps){o=u.wisps;n=o.children.length;for(i=0;i<n;i++){k=t*1.5+i*TAU/n+seed;o.children[i].position.set(cos(k)*1.25,u.top*(.35+.25*i)+.18*sin(t*2.3+i*2),sin(k)*1.25)}}
}
// death: the body turns to light and thins out (q 0..1). The ghost material belongs to this one pet.
function fade(g,q){
  var u=g&&g.userData&&g.userData.mb;if(!u)return;
  var i,k,r=u.r,necro=u.pv!=='beast';q=q<0?0:q>1?1:q;
  if(!u.ghost){
    u.ghost=new T.MeshBasicMaterial({color:necro?0x4be070:0xbfe2ff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false});
    if(!u.own)u.own=[];u.own.push(u.ghost);
    for(i=0;i<u.meshes.length;i++){u.meshes[i].material=u.ghost;u.meshes[i].castShadow=false}
    u.mode=-1;u.fx.visible=false;if(u.aura)u.aura.visible=false;if(u.sring)u.sring.visible=false;if(u.motes)u.motes.visible=false;
  }
  u.fa=max(.001,q);
  u.ghost.opacity=.85*(1-q)*(1-q);
  k=r*(u.cfg.k||1);u.root.scale.set(k*(1-.45*q),k*(necro?1-.6*q:1+.35*q),k*(1-.45*q));
  u.root.position.y=necro?0:q*r*.9;
  if(u.gmark){k=max(30,r*u.gk)*(1-.5*q);u.gmark.scale.set(k,1,k);u.gmat.opacity=.85*(1-q)}
}
function dispose(g){
  var u=g&&g.userData&&g.userData.mb;if(!u||!u.own)return;
  for(var i=0;i<u.own.length;i++)u.own[i].dispose(); // only this pet's own materials; textures, geometry and the cached sets are shared
  u.own.length=0;
}
function update(g,m,MB,dt){
  var u=g.userData.mb;if(!u||u.ghost)return;
  var P=MB.P,S=MB.S,t=S.t,seed=m.seed||0,st=m.st||'idle',cfg=u.cfg,p=u.p,body=u.body,root=u.root,i,o,k,q;
  dt=dt>0?min(dt,.1):1/60;
  var rage=!!m.rage,stun=m.stun>0;
  if(rage)u.extra+=dt*.8; // enraged: everything idles faster
  var tt=t+seed+u.extra;
  var r=m.r||u.r;if(r!==u.r){u.r=r;root.scale.setScalar(r*(cfg.k||1));u.fx.scale.setScalar(r);if(u.aura)u.aura.scale.setScalar(r*2.3)}
  // facing
  var a=P?Math.atan2(P.y-m.y,P.x-m.x):0;
  if(u.pv){ // a pet watches its prey, not its master; with nothing to fight it looks where it is walking
    o=petFocus(m,MB);
    if(o.ok)a=Math.atan2(o.y-m.y,o.x-m.x);
    else{k=m.x-u.hx;q=m.y-u.hz;if(k*k+q*q>36){u.ha=Math.atan2(q,k);u.hx=m.x;u.hz=m.y}a=typeof u.ha==='number'?u.ha:a+PI}
  }
  var fast=st==='charge'||st==='lunge',face=fast&&typeof m.ang==='number'?m.ang:a;
  if(u.ai==='hound'&&st==='idle'&&typeof m.side==='number')face=a+.9*m.side;
  else if(u.ai==='beamer'&&(st==='wind'||st==='beam')&&typeof m.ba==='number')face=m.ba;
  else if(u.ai==='mite')face=a+sin(t*3+seed)*.6;
  var want=PI/2-face;
  if(!u.init){u.init=true;u.rot=want}else if(!stun)u.rot+=wrap(want-u.rot)*min(1,dt*(fast?30:11));
  root.rotation.y=u.rot;
  var look=wrap(PI/2-a-u.rot);look=look>1.1?1.1:look<-1.1?-1.1:look;
  // pose targets
  var sx=1,sy=1,sz=1,tilt=0,roll=0,shake=0,lift=m.lift||0;
  if(st==='wind'){sy=.8;sx=sz=1.1;tilt=-.1;shake=1}
  else if(fast){sz=1.28;sx=.9;sy=.9;tilt=.2}
  else if(st==='dazed'||stun){sy=.86;sx=sz=1.05;tilt=.16;roll=sin(tt*3)*.12}
  else if(st==='leap'){sy=1.12-.1*sin(lift*PI);sx=sz=.94}
  if(rage&&!shake)shake=.22;
  if(u.prev==='leap'&&st!=='leap')u.slam=.3;u.prev=st;
  if(u.slam>0){u.slam=max(0,u.slam-dt);q=u.slam/.3;sy*=1-.32*q;sx*=1+.2*q;sz*=1+.2*q}
  k=min(1,dt*16);
  u.sx+=(sx-u.sx)*k;u.sy+=(sy-u.sy)*k;u.sz+=(sz-u.sz)*k;u.tilt+=(tilt-u.tilt)*k;u.shake+=(shake-u.shake)*k;
  var br=1+cfg.br*(rage?1.8:1)*sin(tt*cfg.spd*.8);
  body.scale.set(u.sx*br,u.sy*(2-br),u.sz*br);
  body.rotation.set(u.tilt,0,roll);
  body.position.y=cfg.y0+(st==='idle'||st==='up'?cfg.bob*(.5+.5*sin(tt*cfg.spd)):0);
  if(u.shake>.02)root.position.set(sin(t*91+seed)*.07*r*u.shake,0,cos(t*77+seed)*.05*r*u.shake);else root.position.set(0,0,0);
  ANIM[u.ai](p,m,t,tt,st,look,u,dt);
  if(u.pv)petUpdate(g,m,u,t,dt,r);
  // eyes follow the player
  var E=p.eyes;for(i=0;i<E.length;i++)E[i].pu.position.x=E[i].x+look*E[i].er*.38;
  // dazed or stunned: stars
  var dz=st==='dazed'||stun;
  if(dz||u.f.stars){o=dress(u,'stars',dz);if(o){o.rotation.y=t*5;o.position.y=cfg.top*u.sy+.08*sin(t*7)}}
  // enrage and phase changes: a burst, then a red pulse that stays
  var ph=m.phase||1;
  if(rage!==u.rage||ph!==u.phase){if(rage&&!u.rage||ph>u.phase)u.burst=.55;u.rage=rage;u.phase=ph}
  if(u.burst>0||u.f.burst){
    u.burst=max(0,u.burst-dt);o=dress(u,'burst',u.burst>0);
    if(o){q=1-u.burst/.55;k=1.1+q*2.6;o.scale.set(k,k*.8,k);FXM.burst.opacity=.42*(1-q)*(1-q)}
  }
  // boss aura stays on the ground while the body leaps
  if(u.aura){
    var ac=rage?'#ff2038':u.auraCol;if(ac!==u.auraNow){u.auraNow=ac;u.aura.material=auraMat(ac)}
    u.aura.position.y=.8-g.position.y;
    if(rage){k=r*(2.5+.25*sin(t*9));u.aura.scale.set(k,k,k);u.aura.material.opacity=.62+.2*sin(t*9)}
    else{u.aura.material.opacity=.5+.12*sin(t*2.4)}
  }
  // body materials: hit flash, then chill, then rage
  var mode=m.flash>0?1:m.slow>0?3:rage?2:0;
  if(mode!==u.mode){
    u.mode=mode;var ms=u.meshes,mt=u.mats,kind=mode===2?'rage':'slow';
    for(i=0;i<ms.length;i++)ms[i].material=mode===0?mt[i]:mode===1?FX.white:variant(mt[i],kind);
    if(mode===2&&!u.rageMats){u.rageMats=[];for(i=0;i<mt.length;i++){o=variant(mt[i],'rage');if(o!==mt[i]&&u.rageMats.indexOf(o)<0)u.rageMats.push(o)}}
  }
  if(mode===2&&u.rageMats){k=.42+.3*sin(t*7.5);for(i=0;i<u.rageMats.length;i++)u.rageMats[i].emissiveIntensity=k}
  // statuses
  var F=u.f,top=u.top,on;
  on=m.slow>0;if(on||F.slow){o=dress(u,'slow',on);if(o){o.position.y=.06-g.position.y/r;o.rotation.y=t*.7}}
  on=m.ward>0;if(on||F.ward){o=dress(u,'ward',on);if(o){k=1+.05*sin(t*11);o.scale.set(k,k,k);o.rotation.y=t*.8;FXM.ward.opacity=.26+.1*sin(t*11)}}
  on=m.dotT>0;if(on||F.dot){o=dress(u,'dot',on);if(o)for(i=0;i<o.children.length;i++){q=(tt*.85+i*.2)%1;k=i*2.4+seed;
    o.children[i].position.set(cos(k+q*2)*(1.12-.3*q),.25+q*top*1.05,sin(k+q*2)*(1.12-.3*q));k=.2*(1-q*.7);o.children[i].scale.set(k,k*1.3,k)}}
  on=m.markT>0;if(on||F.mark){o=dress(u,'mark',on);if(o){o.rotation.y=t*2.2;k=1+.14*sin(t*9);o.scale.set(k,k,k);o.position.y=top+.6+.06*sin(t*5)}}
  // modifiers
  var mods=m.mods,nm=mods?mods.length:0;
  if(nm||u.nm){
    u.nm=nm;
    // how fast and which way it is moving, for the streaks
    var vx=(m.x-u.px)/dt,vz=(m.y-u.pz)/dt,sp=Math.sqrt(vx*vx+vz*vz);u.px=m.x;u.pz=m.y;
    if(sp>12&&sp<1500)u.ma=Math.atan2(vz,vx);u.mv+=((sp>12?min(1,sp/120):0)-u.mv)*min(1,dt*8);
    for(i=0;i<MODS.length;i++){
      k=MODS[i];on=nm>0&&mods.indexOf(k)>=0;
      if(!on&&!F[k])continue;
      o=dress(u,k,on);if(!o)continue;
      var j,c;
      if(k==='shielded'){o.rotation.y=t*1.1+seed;o.position.y=top*.5+.08*sin(t*2.3);q=m.ward>0?1.12:1;o.scale.set(q,1,q)}
      else if(k==='burning'){for(j=0;j<o.children.length;j++){c=o.children[j];q=(tt*1.6+j*.37)%1;var ba=j*TAU/6+seed+sin(tt+j)*.3;
        c.position.set(cos(ba)*(1.14-.2*q),.2+((j*5)%3)*.3*top*.4+q*top*.6,sin(ba)*(1.14-.2*q));var fs=(1-q)*(1+.3*sin(t*31+j));c.scale.set(fs,fs*(1+q),fs)}}
      else if(k==='swift'){o.rotation.y=PI/2-u.ma;q=.25+.75*u.mv;FXM.streak.opacity=.5;
        for(j=0;j<o.children.length;j++){c=o.children[j];var sl=(.5+.9*q)*(1+.3*sin(t*17+j*2));c.scale.z=sl;c.position.z=-.9-sl*.5-.25*sin(t*13+j);c.visible=q>.3||j<2}}
      else if(k==='vampiric'){c=o.children[0];c.position.y=.05-g.position.y/r;q=1.9+.2*sin(t*3);c.scale.set(q,1,q);
        for(j=1;j<o.children.length;j++){c=o.children[j];ba=t*2.2+j*TAU/3;c.position.set(cos(ba)*1.15,top*.45+.3*sin(t*3+j),sin(ba)*1.15)}}
      else if(k==='thorned'){o.rotation.y=sin(tt*1.3)*.12;q=1+(st==='wind'?.12:.03)*sin(t*(st==='wind'?30:3));o.scale.set(q,1,q)}
      else if(k==='splitting'){q=.5+.5*sin(t*5+seed);FXM.seamGlow.opacity=.15+.25*q;o.scale.set(1+.4*q,1,1)}
    }
  }
}
window.MBModels.monster={create:create,update:update,fade:fade,petKind:petKind,
  // optional helpers for the renderer: world height of the top of the head, and a no-op dispose (geometry and materials are shared)
  height:function(m){var c=CFG[pickAi(m)]||CFG.mimic;return c.top*(c.k||1)*(m.r||20)},dispose:dispose};
})();
