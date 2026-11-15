// 3D player and ally models. Registers window.MBModels.player and window.MBModels.ally.
// Feet at Y=0, forward is +Z, the character's left is +X. Sub-meshes are merged per (slot, material) and rebuilt only
// when the stage/class/upgrade/rank key changes; update() only writes transforms and visibility.
// Everything about WHO is drawn comes from the object handed to create()/update() (has, cls, pw, S {adv, rank, mode, t}, skills) and from P:
// the local hero passes window.MB, another member's hero passes a small view object built from its look. Nothing here reads the global MB.
// Apex tier (round 8): MB.apex {path} / MB.S.apex ('dominion' | 'order'; a remote's view carries the same) adds a second layer over any class
// outfit: dominion = darkened gear, a hovering crown of bone, two slow orbits of bone shards and a dark spreading domain on the floor;
// order = pale lit gear, a broken halo with blade-wings of light behind the shoulders and an aura disc on the floor sized by P.auraR.
// Round 10: eight more paths (beasts, frost, plague, flame, storm, stone, blade, tide) are built by APEX_NEW below into a shared set of
// slots (ahead, aback, aorb, items it0..it5, aground, awave); P.pack / P.plates / P.blades / P.haste drive counts and motion in update().
// Look: cel-shaded through window.MBStyle (toon / glow / outline) when the renderer provides it; without it the same
// shapes are drawn with this file's own standard materials and no outlines.
window.MBModels=window.MBModels||{};
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const PI=Math.PI,TAU=PI*2,HP=PI/2;
const PARTS=['organs','skin','touch','sight','hearing','smell','taste'];

/* ---------- materials: MBStyle when present, own cache otherwise ---------- */
const MATS={},INFO=new WeakMap(),NOL=new WeakSet();   // INFO: what a material was made from (for dim twins); NOL: glows (no outline, no shadow)
const hx=c=>typeof c==='number'?c:new T.Color(c).getHex();
function stdMat(h,o){
  const k=h+(o?JSON.stringify(o):'');let m=MATS[k];if(m)return m;
  const p={color:h,roughness:.8,metalness:0,flatShading:true};
  if(o){if(o.emissive!==undefined){p.emissive=o.emissive;p.emissiveIntensity=o.emissiveIntensity==null?1:o.emissiveIntensity}
    if(o.transparent){p.transparent=true}if(o.opacity!==undefined)p.opacity=o.opacity;if(o.side!==undefined)p.side=o.side;if(o.depthWrite!==undefined)p.depthWrite=o.depthWrite}
  return MATS[k]=new T.MeshStandardMaterial(p);
}
function mat(hex,o){
  const h=hx(hex),S=window.MBStyle;let m=null;
  if(S&&typeof S.toon==='function')try{m=S.toon(h,o)}catch(e){m=null}
  if(!m||!m.isMaterial)m=stdMat(h,o);
  if(!INFO.has(m))INFO.set(m,[h,o||null]);
  return m;
}
const lit=(hex,k,base)=>mat(base===undefined?hex:base,{emissive:hx(hex),emissiveIntensity:k==null?1:Math.round(k*100)/100});
function glow(hex,op){
  const h=hx(hex),S=window.MBStyle;let m=null;op=op==null?1:op;
  if(S&&typeof S.glow==='function')try{m=S.glow(h,{opacity:op,side:T.DoubleSide})}catch(e){m=null}
  if(!m||!m.isMaterial){const k='g'+h+'|'+op;m=MATS[k]||(MATS[k]=new T.MeshBasicMaterial({color:h,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}))}
  NOL.add(m);return m;
}
// the dimmed twin of a material (spent shield): another cached variant, never a mutation
function dimOf(m){const i=INFO.get(m);return i?mat(i[0],Object.assign({},i[1]||{},{transparent:true,opacity:.3,depthWrite:false})):m}
// the one material this file animates (the melee arc fades): one per hero (several heroes can be on screen in multiplayer), owned by
// its model and never shared with the style cache
function slashMat(){const m=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});NOL.add(m);return m}
// a flat see-through decal that darkens the floor (the dominion's ground): this file's own cache, never mutated
function decal(hex,op){const k='d'+hex+'|'+op;let m=MATS[k];if(!m){m=MATS[k]=new T.MeshBasicMaterial({color:hex,transparent:true,opacity:op,depthWrite:false,fog:false});m.color.convertSRGBToLinear()}NOL.add(m);return m}
// which apex path the owner walks (null before floor 100). The local hero may be forced by the renderer's test hook.
const APEX_IDS={dominion:1,order:1,beasts:1,frost:1,plague:1,flame:1,storm:1,stone:1,blade:1,tide:1};
function apexOf(MB){let a=MB.renderer&&MB.renderer.testApex;if(!a){a=MB.apex;if(a&&typeof a==='object')a=a.path;if(!a)a=MB.S&&MB.S.apex}return typeof a==='string'&&APEX_IDS[a]===1?a:null}
// the eight paths of round 10: a = accent, h = its hot twin, g/k = what the gear is sunk toward and how far, e/ek = the gear's own light, cape
const APX={
  beasts:{a:0x5fe07a,h:0xd8ffd0,g:0x3d2f1c,k:.55,e:0x16380f,ek:.3,cape:0x4a3822},
  frost:{a:0x8fd8ff,h:0xf2fbff,g:0x8fb4d6,k:.6,e:0x2f6aa8,ek:.35,cape:0xb9d6ea},
  plague:{a:0x9fc414,h:0xb878d8,g:0x34361c,k:.62,e:0x2c3a06,ek:.35,cape:0x2a2c14},
  flame:{a:0xff6a1e,h:0xffd27a,g:0x17100e,k:.72,e:0x8a2204,ek:.45,cape:0x1c0f0b},
  storm:{a:0xffe74a,h:0xfffbe0,g:0x222b48,k:.6,e:0x28387a,ek:.35,cape:0x1a2240},
  stone:{a:0xe0a84a,h:0xffe0a0,g:0x7d8088,k:.66,e:0,ek:0,cape:0x55565c},
  blade:{a:0x8fa0ff,h:0xeef2ff,g:0x23273c,k:.6,e:0x2a3478,ek:.35,cape:0x1a1e36},
  tide:{a:0x19d3c5,h:0xd8fff8,g:0x0c2c48,k:.62,e:0x0a5a66,ek:.45,cape:0x0d3450}};
const _tc=new T.Color(),_tc2=new T.Color();
// apex gear: the same cloth and plate, sunk toward black-violet (dominion) or lifted toward lit bone-white (order); cached variants, nothing mutated
function apexTint(m,apex){const i=INFO.get(m);if(!i)return m;_tc.setHex(i[0]);
  if(apex==='dominion'){_tc.lerp(_tc2.setHex(0x0d0a18),.62);return mat(_tc.getHex(),{emissive:0x2a1466,emissiveIntensity:.35})}
  const A=APX[apex];if(A){_tc.lerp(_tc2.setHex(A.g),A.k);return A.ek?mat(_tc.getHex(),{emissive:A.e,emissiveIntensity:A.ek}):mat(_tc.getHex())}
  _tc.lerp(_tc2.setHex(0xf6f0e0),.56);const h=_tc.getHex();return mat(h,{emissive:h,emissiveIntensity:.3})}
function pal(k,d){const S=window.MBStyle;return S&&S.palette&&typeof S.palette[k]==='number'?S.palette[k]:d}
function ink(g,th){const S=window.MBStyle;if(S&&typeof S.outline==='function')try{S.outline(g,{thickness:th||1})}catch(e){}}
const C={bone:0xece4d2,boneS:0xa89f90,dark:0x100e18,skin:0xc68863,skinD:0x8f5a40,hand:0xe2a783,gold:0xf0b848,steel:0x596078,steelL:0xc9d2e4,lea:0x4a3528,hair:0xe9e4da,hairS:0xb9b3c4,green:0x5cf07a};
// one strong accent per class; a few upgrades shift it
const ACC={fighter:0xff7a1a,tank:0x4fb4ff,assassin:0xff2e55,mage:0x8b4dff,ranger:0xc8f03c,healer:0xffd66e,necro:0x3df59a};
const ACC2={pyromancer:0xff7a2e,nightblade:0xc04dff,phantom:0x9fe0ff,berserker:0xff4a2a,paladin:0xffd66e,inquisitor:0xff5a4a,reaper:0x9af0d8};
const CAPE={champion:0x8f1f30,duelist:0x26335e,paladin:0xd9d2c0,berserker:0x4f1719,nightblade:0x2e1a40,phantom:0x4a5064,archmage:0x3a2f80,pyromancer:0x7a2a18,sharpshooter:0x243f26,beastmaster:0x5a4a3a,saint:0xe6dfc8,inquisitor:0x6e242c,lich:0x1f3f2a,reaper:0x0e0e14};

/* ---------- geometry cache (unit primitives) ---------- */
const GEO={};
const geo=(k,f)=>GEO[k]||(GEO[k]=f());
const gSph=()=>geo('s',()=>new T.SphereGeometry(1,10,7));
const gBox=()=>geo('b',()=>new T.BoxGeometry(1,1,1));
const gCyl=(ratio,seg)=>geo('c'+ratio.toFixed(2)+'_'+seg,()=>new T.CylinderGeometry(ratio,1,1,seg));
const gCone=seg=>geo('k'+seg,()=>new T.ConeGeometry(1,1,seg));
const gTor=(tr,arc,ts)=>geo('t'+tr.toFixed(3)+'_'+arc.toFixed(2)+'_'+ts,()=>new T.TorusGeometry(1,tr,5,ts,arc));
const gWedge=(p0,pl,t0,tl)=>geo('w'+[p0,pl,t0,tl].map(v=>v.toFixed(2)).join('_'),()=>new T.SphereGeometry(1,10,6,p0,pl,t0,tl));
const gRing=(ri,seg,t0,tl)=>geo('r'+[ri,seg,t0,tl].map(v=>v.toFixed(2)).join('_'),()=>new T.RingGeometry(ri,1,seg,1,t0,tl));
// shield: a long angular kite with clipped shoulders
function gKite(){return geo('kite',()=>{const s=new T.Shape();s.moveTo(-4.4,10);s.lineTo(4.4,10);s.lineTo(7,6.4);s.lineTo(6,-3);s.lineTo(0,-14);s.lineTo(-6,-3);s.lineTo(-7,6.4);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:2});g.translate(0,0,-.5);return g})}

/* ---------- builder: collects transformed primitives, merges them per slot+material ---------- */
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3(),_d=new T.Vector3(),_up=new T.Vector3(0,1,0);
function Builder(slots){this.slots=slots;this.bins=new Map();this.fine=false}
Builder.prototype={
  // fine=true marks what follows as small detail: drawn without an ink outline
  push(slot,m,g){const k=slot+'|'+m.uuid+(this.fine?'|f':'');let b=this.bins.get(k);if(!b)this.bins.set(k,b={slot,m,list:[],fine:this.fine});const c=g.index?g.toNonIndexed():g.clone();c.applyMatrix4(_m);b.list.push(c)},
  put(slot,m,g,x,y,z,rx,ry,rz,sx,sy,sz){_e.set(rx||0,ry||0,rz||0);_q.setFromEuler(_e);_p.set(x,y,z);_s.set(sx==null?1:sx,sy==null?1:sy,sz==null?1:sz);_m.compose(_p,_q,_s);this.push(slot,m,g)},
  // sphere / ellipsoid
  sp(slot,m,x,y,z,r,sx,sy,sz,rx,ry,rz){this.put(slot,m,gSph(),x,y,z,rx,ry,rz,r*(sx||1),r*(sy||1),r*(sz||1))},
  bx(slot,m,x,y,z,w,h,d,rx,ry,rz){this.put(slot,m,gBox(),x,y,z,rx,ry,rz,w,h,d)},
  // cylinder centred at x,y,z; rt/rb radii; zs flattens it front to back
  cy(slot,m,x,y,z,rt,rb,h,rx,ry,rz,zs,seg){this.put(slot,m,gCyl(rt/rb,seg||8),x,y,z,rx,ry,rz,rb,h,rb*(zs||1))},
  co(slot,m,x,y,z,r,h,rx,ry,rz,seg,zs){this.put(slot,m,gCone(seg||6),x,y,z,rx,ry,rz,r,h,r*(zs||1))},
  // torus lying flat (in XZ) by default; zs squashes front to back
  to(slot,m,x,y,z,R,tube,zs,arc,rx,ry,rz){this.put(slot,m,gTor(tube/R,arc||TAU,arc?8:14),x,y,z,rx==null?HP:rx,ry,rz,R,R*(zs||1),R)},
  wedge(slot,m,x,y,z,r,p0,pl,t0,tl,rx,sx,sy,sz){this.put(slot,m,gWedge(p0,pl,t0,tl),x,y,z,rx,0,0,r*(sx||1),r*(sy||1),r*(sz||1))},
  // bone: shaft between two points with a knob at each end
  bone(slot,m,x1,y1,z1,x2,y2,z2,r,k1,k2){_d.set(x2-x1,y2-y1,z2-z1);const L=_d.length();_q.setFromUnitVectors(_up,_d.normalize());_p.set((x1+x2)/2,(y1+y2)/2,(z1+z2)/2);_s.set(r,L,r);_m.compose(_p,_q,_s);this.push(slot,m,gCyl(1,6));
    if(k1)this.sp(slot,m,x1,y1,z1,k1);if(k2)this.sp(slot,m,x2,y2,z2,k2)},
  // spike from a base point along a direction (flat = squash across the blade)
  spike(slot,m,x,y,z,dx,dy,dz,len,r,flat){_d.set(dx,dy,dz).normalize();_q.setFromUnitVectors(_up,_d);_p.set(x+_d.x*len/2,y+_d.y*len/2,z+_d.z*len/2);_s.set(r,len,r*(flat||1));_m.compose(_p,_q,_s);this.push(slot,m,gCone(4))},
  flush(){for(const b of this.bins.values()){let n=0;for(const g of b.list)n+=g.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
      for(const g of b.list){pos.set(g.attributes.position.array,o);nor.set(g.attributes.normal.array,o);o+=g.attributes.position.count*3;g.dispose()}
      const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(pos,3));G.setAttribute('normal',new T.BufferAttribute(nor,3));
      const mesh=new T.Mesh(G,b.m),gl=NOL.has(b.m);mesh.castShadow=!gl;mesh.receiveShadow=false;mesh.userData.part=true;if(gl||b.fine)mesh.userData.noOutline=true;this.slots[b.slot].add(mesh)}
    this.bins.clear()}
};
function clearSlots(slots){for(const k in slots){const s=slots[k];for(let i=s.children.length-1;i>=0;i--){const c=s.children[i];if(c.userData.part){s.remove(c);c.geometry.dispose()}}}}
function mkSlots(root,tree){const s={};for(const[name,parent]of tree){const g=new T.Group();g.name=name;s[name]=g;(parent?s[parent]:root).add(g)}return s}

/* ================= PLAYER ================= */
const P_TREE=[['aura'],['ready'],['slash'],['rig'],['hips','rig'],['legL','hips'],['shinL','legL'],['legR','hips'],['shinR','legR'],
  ['coatB','hips'],['coatL','hips'],['coatR','hips'],['torso','hips'],['heart','torso'],['lungs','torso'],
  ['head','torso'],['jaw','head'],['halo','head'],['band','head'],['armL','torso'],['foreL','armL'],['handL','foreL'],['wepL','handL'],['strA','wepL'],['strB','wepL'],
  ['armR','torso'],['foreR','armR'],['handR','foreR'],['wepR','handR'],['orb','wepR'],['spin','orb'],['shield','torso'],['shieldGlow','shield'],
  ['cape','torso'],['cape2','cape'],['scarf','torso'],['scarf2','scarf'],
  // apex: dominion floor + its spreading wave, two shard orbits, the crown; order aura + its pulse, the halo behind the shoulders and its two wings
  ['dom'],['domW'],['orbA'],['orbB'],['crown','head'],['oaura'],['oaura2','oaura'],['oauraW'],['nimbus','torso'],['nring','nimbus'],['wingL','nimbus'],['wingR','nimbus'],
  // round 10: what the eight newer paths hang their looks on (empty groups for everyone else)
  ['aground'],['aground2'],['awave'],['awave2'],['aorb'],['aorb2'],['items'],['it0','items'],['it1','items'],['it2','items'],['it3','items'],['it4','items'],['it5','items'],
  ['ahead','head'],['ahead2','head'],['aback','torso'],['aback2','aback']];
// a lean build about 6.4 heads tall: hip height, leg and arm segment lengths, shoulder and neck heights above the hips
const HIP=30.5,UL=15,LL=15.5,UA=10.5,FA=9,SH=17.3,SX=7.5,NECK=20.2,HEADY=4.9;
const WISPS=8;

function stageOf(MB){let n=0;for(let i=0;i<PARTS.length;i++)if(MB.has(PARTS[i]))n|=1<<i;return n}
// rank as a number: '' 0, E 1 ... A 5, S 6, S+ 7
function tierOf(S){const r=S&&typeof S.rank==='string'?S.rank:'';if(!r)return 0;if(r[0]==='X')return 8;const i='EDCBAS'.indexOf(r[0]);return i<0?0:i+1+(r.length>1?1:0)}

function buildSkeleton(b,s,org){
  const B=mat(C.bone),Bs=mat(C.boneS),O=mat(C.dark);
  s.armL.position.set(SX,SH,0);s.armR.position.set(-SX,SH,0);
  // pelvis
  b.to('hips',B,0,.9,0,4.1,1.6,.72);b.bx('hips',B,0,1.8,-2.1,3.6,4,1.7,.25);b.sp('hips',B,3.3,0,0,1.8);b.sp('hips',B,-3.3,0,0,1.8);
  // legs: femur, twin shin bones, foot
  for(const[u,l]of[['legL','shinL'],['legR','shinR']]){
    b.bone(u,B,0,0,0,0,-UL,0,1.1,0,1.85);
    b.bone(l,B,-.75,0,0,-.6,-LL+1.8,0,.66,0,0);b.bone(l,B,.75,0,0,.6,-LL+1.8,0,.66,0,0);b.sp(l,B,0,-LL+1.9,0,1.5);
    b.bx(l,B,0,-LL+.8,2.2,2.7,1.4,6);b.fine=true;b.bx(l,Bs,0,-LL+.8,5.4,2.9,1.1,1);b.fine=false;
  }
  // spine and neck
  for(let y=1.6;y<=20.5;y+=2.35)b.sp('torso',B,0,y,-1.6+(y>16?(y-16)*.38:0),1.35,1.1,.82,1.1);
  // ribcage: five hoops narrowing to the waist, and a breastbone
  const ry=[6.6,8.9,11.2,13.5,15.6],rr=[3.9,4.9,5.7,6.1,5.5];
  for(let i=0;i<5;i++)b.to('torso',B,0,ry[i],.4,rr[i],.78,.7);
  b.bx('torso',org?B:Bs,0,12.6,4.4,1.5,6.6,.9);
  // collarbones, shoulder knobs and blades
  b.bone('torso',B,-SX,SH,0,-.8,SH+.4,2.8,.85,1.95,0);b.bone('torso',B,SX,SH,0,.8,SH+.4,2.8,.85,1.95,0);
  b.bx('torso',B,-4.2,14.2,-3.5,3.4,4.6,.8,0,.25);b.bx('torso',B,4.2,14.2,-3.5,3.4,4.6,.8,0,-.25);
  // arms: upper arm, twin forearm bones, hand with fingers
  for(const[u,f,h]of[['armL','foreL','handL'],['armR','foreR','handR']]){
    b.bone(u,B,0,0,0,0,-UA,0,.98,0,1.6);
    b.bone(f,B,-.62,0,0,-.5,-FA,0,.56,0,0);b.bone(f,B,.62,0,0,.5,-FA,0,.56,0,0);
    b.sp(h,B,0,-.7,0,1.7,1,.95,.7);for(const x of[-1.2,0,1.2])b.bone(h,B,x,-1.6,0,x*1.5,-5+Math.abs(x)*.5,.4,.48,0,.6);b.bone(h,B,0,-.9,.5,0,-2.4,2.2,.48,0,.56);
  }
  // skull: cranium, brow, cheekbones, upper jaw; loose lower jaw in its own slot
  s.head.position.set(0,NECK+.4,0);s.jaw.position.set(0,1.4,-.4);
  b.sp('head',B,0,5.5,-.5,5.3,.94,.97,1.05);b.bx('head',B,0,1.9,1.5,5.3,2.6,4.9);
  b.bx('head',B,0,6.5,4.1,6.6,1,1.6,-.25);
  b.sp('head',Bs,3.7,3.5,2.6,1.3,.8,.7,1);b.sp('head',Bs,-3.7,3.5,2.6,1.3,.8,.7,1);
  b.fine=true;
  b.sp('head',O,2.05,5,4,1.85,1,1.08,.6,0,.25,-.18);b.sp('head',O,-2.05,5,4,1.85,1,1.08,.6,0,-.25,.18);
  b.co('head',O,0,3,4.6,.8,1.6,0,0,0,3,.5);
  b.bx('head',O,0,.7,3.95,4.9,.5,.4);for(const x of[-1.8,-.6,.6,1.8])b.bx('head',B,x,1.1,4.05,.95,1.05,.4);
  b.fine=false;
  b.bx('jaw',B,0,-1,2,5,1.7,4.6);b.bx('jaw',B,0,-.3,-.3,5.5,2.4,1.2);b.co('jaw',B,0,-1.3,4.3,1.2,1.5,PI*.85,0,0,4,.6);
  b.fine=true;for(const x of[-1.8,-.6,.6,1.8])b.bx('jaw',O,x,-.4,4.35,.25,1.05,.15);b.fine=false;
  if(org){
    s.heart.position.set(.9,12.3,1.2);s.lungs.position.set(0,12.3,-.2);
    const H=lit(0xff2a4a,.95,0xd1213f),Lg=lit(0xe08fa0,.25),V=mat(0x7a3b50);
    b.fine=true;
    b.sp('heart',H,0,0,0,2.3,1,1.12,.95);b.co('heart',H,-.2,-2.4,0,1.6,2.2,PI,0,-.2,6);b.cy('heart',V,.2,2.6,-.3,.6,.7,2);
    b.sp('heart',glow(0xff2a4a,.22),0,0,0,3.7);
    b.sp('lungs',Lg,-2.9,0,0,1,1.9,3.8,2.2,0,0,.14);b.sp('lungs',Lg,2.9,0,0,1,1.9,3.8,2.2,0,0,-.14);b.cy('lungs',V,0,4.2,0,.55,.55,2.8);
    b.fine=false;
  }
}

// swept-back bone-white hair: a cap, a mane of spikes, bangs, and one lock in the class colour. low = under a hat or circlet
function hair(b,acc,low){
  const H=mat(C.hair),Hs=mat(C.hairS),A=acc!=null?lit(acc,.6):Hs;
  b.wedge('head',H,0,HEADY+.25,-.35,5.1,0,TAU,0,PI*.5,-.42);
  // nape and side locks
  for(const[x,z,l,r]of[[0,-4.6,5.2,1.9],[2.6,-4.1,4.6,1.6],[-2.6,-4.1,4.6,1.6]])b.spike('head',Hs,x,3.2,z,x*.1,-1,-.55,l,r);
  b.spike('head',H,4.3,4.6,.6,.25,-1,.1,3.8,1.15);b.spike('head',H,-4.3,4.6,.6,-.25,-1,.1,3.8,1.15);
  if(!low){
    // crown spikes raked backwards, then the fringe
    for(const[x,y,z,dx,dy,dz,l,r]of[[0,8.6,-.6,0,.75,-1,6.4,2.2],[2.7,8.2,-.2,.5,.7,-.9,5.4,1.9],[-2.7,8.2,-.2,-.5,.7,-.9,5.4,1.9],[1.4,7,-3.4,.2,.2,-1,5.8,2],[-1.4,7,-3.4,-.2,.2,-1,5.8,2],[0,9,1.6,0,1,-.25,4.2,1.8]])b.spike('head',H,x,y,z,dx,dy,dz,l,r);
    b.spike('head',H,-1.9,8.2,3.6,-.2,-1,.7,4.2,1.3);b.spike('head',H,.3,8.5,3.9,.05,-1,.8,4.6,1.35);
    b.spike('head',A,2.4,8.1,3.4,.3,-1,.62,4.9,1.25);
  }else b.spike('head',A,3.3,5.4,3.2,.25,-1,.35,4.6,1.05);
}
function hood(b,M,tip){
  b.wedge('head',M,0,HEADY,0,5.75,0,TAU,0,PI*.36);                                // crown
  b.wedge('head',M,0,HEADY,0,5.75,HP+1.02,TAU-2.04,PI*.3,PI*.6);                  // back and sides, open at the face
  b.spike('head',M,0,8.6,-3,0,tip,-1,6.4,2.6);                                    // swept point
  b.sp('torso',M,0,NECK-1.6,-.4,1,6.9,2.1,4.6);                                   // cowl on the shoulders
}
// a hanging panel of cloth in a sway slot: tapered slab (w0 at the top, w1 at the hem), optional forked hem and trim
function panel(b,slot,M,len,w0,w1,ry,trim,fork){
  b.cy(slot,M,0,-len/2,0,w0,w1,len,0,ry,0,.15,6);
  const sx=ry?0:1,sz=ry?1:0;
  if(fork){for(const k of[-1,1])b.spike(slot,M,k*w1*.5*sx,-len+.2,k*w1*.5*sz,k*.12*sx,-1,k*.12*sz,fork,w1*.52,ry?1:.2);}
  if(trim){b.fine=true;b.bx(slot,trim,0,-len+.5,0,ry?.9:w1*1.9,.8,ry?w1*1.9:.9);b.fine=false}
}
// sword: grip, swept guard, dark diamond blade, burning edges
function sword(b,slot,len,w,grip,edge,gold,single){
  const dk=mat(0x3c4260),st=mat(C.steelL),lea=mat(0x241c22);
  b.cy(slot,lea,0,-grip/2+1.4,0,.75,.75,grip+2.6,0,0,0,1,6);b.co(slot,gold,0,-grip-.9,0,1.2,2,PI,0,0,4);
  b.bx(slot,gold,w*.7,2.3,0,w*1.5,1.1,1.5,0,0,.38);b.bx(slot,gold,-w*.7,2.3,0,w*1.5,1.1,1.5,0,0,-.38);b.sp(slot,edge,0,2.2,0,1.15,1,1,1.3);
  if(single){ // cleaver: straight spine, edge on one side, clipped point
    b.bx(slot,dk,-w*.14,3+len/2,0,w*.72,len,.95);b.bx(slot,st,w*.3,3+len/2,0,w*.34,len,.6);
    b.spike(slot,dk,-w*.5,3+len,0,.42,1,0,w*1.1,w*.5,.3);b.spike(slot,st,w*.24,3+len-.2,0,-.25,1,0,w*.9,w*.34,.25);
    b.fine=true;b.bx(slot,edge,w*.5,3+len/2,0,.5,len,.75);b.bx(slot,edge,-w*.2,3+len*.42,0,.4,len*.7,1.1);b.fine=false;
    b.bx(slot,glow(INFO.get(edge)[1].emissive,.22),w*.42,3+len/2,0,1.9,len+2,.3);
  }else{
    b.cy(slot,dk,0,3+len/2,0,w*.36,w*.5,len,0,PI/4,0,.26,4);b.spike(slot,dk,0,3+len,0,0,1,0,w*1.3,w*.36,.26);
    b.fine=true;b.bx(slot,edge,w*.44,3+len*.5,0,.42,len,.6,0,0,.03);b.bx(slot,edge,-w*.44,3+len*.5,0,.42,len,.6,0,0,-.03);b.fine=false;
    b.bx(slot,glow(INFO.get(edge)[1].emissive,.2),0,3+len/2,0,w+1.6,len+2.5,.3);
  }
}
// hooked knife: the blade leans forward and ends in a curved point
function knife(b,slot,edge,gold){
  const dk=mat(0x2a2c3c),lea=mat(0x241c22);
  b.cy(slot,lea,0,-.4,0,.75,.75,4.4,0,0,0,1,6);b.bx(slot,gold,0,2,0,3.6,.9,1.5,0,0,.2);
  b.cy(slot,dk,.4,7,0,1.1,1.5,9.4,0,PI/4,-.1,.3,4);b.spike(slot,dk,.9,11.4,0,.55,1,0,5.6,1.25,.3);
  b.fine=true;b.bx(slot,edge,1.5,7,0,.42,9,.55,0,0,-.1);b.bx(slot,edge,2.8,13,0,.4,4.6,.5,0,0,-.52);b.fine=false;
  b.bx(slot,glow(INFO.get(edge)[1].emissive,.22),1.2,8.6,0,3.6,13,.3,0,0,-.16);
}

function buildHuman(b,s,ud,st,c,adv,tier,apex){
  const has=i=>!!(st&(1<<i)),touch=has(2),sight=has(3),hearing=has(4),smell=has(5),taste=has(6);
  const F=mat(C.skin),Fd=mat(C.skinD);
  const acc=c?(adv&&ACC2[adv])||ACC[c]:null,K=.8+tier*.09+(adv?.35:0),tr=c?lit(acc,K):null;   // trim burns brighter with upgrades and rank
  const gold=lit(C.gold,adv?.5:.12),lea=mat(C.lea),dk=mat(0x1c1a28);
  // outfit: which material covers each body segment
  const o={torso:F,arm:F,fore:F,thigh:F,shin:F,foot:F,hand:mat(touch?C.hand:C.skin),hair:taste?1:0,coat:0};
  if(c==='fighter'){o.torso=mat(0x2b2433);o.thigh=o.shin=mat(0x3b3040);o.foot=dk;o.hand=mat(0xe7dfcd)}
  else if(c==='tank'){o.torso=o.fore=o.shin=mat(0x4a5268);o.arm=o.thigh=o.foot=o.hand=mat(0x2c3142);o.hair=0}
  else if(c==='assassin'){o.torso=o.arm=o.shin=mat(0x3a4260);o.fore=o.thigh=o.foot=mat(0x232838);o.hand=mat(0x2d3248);o.hair=0}
  else if(c==='mage'){o.torso=o.arm=o.fore=mat(0x2c2456);o.thigh=o.shin=o.foot=mat(0x1b1736);o.hair=2;o.coat=1}
  else if(c==='healer'){o.torso=o.arm=o.fore=mat(0xe9e3d5);o.thigh=o.shin=mat(0xa79c88);o.foot=mat(0x8a6f40);o.coat=1}
  else if(c==='necro'){o.torso=o.arm=o.fore=mat(0x1c2725);o.thigh=o.shin=o.foot=mat(0x10161a);o.hair=0;o.hand=mat(0xd9cfb8);o.coat=1}
  else if(c==='ranger'){o.torso=o.arm=mat(0x2a4530);o.fore=o.shin=o.foot=lea;o.thigh=mat(0x3a2f2a);o.hair=0}
  if(apex&&c)for(const k of['torso','arm','fore','thigh','shin','foot'])o[k]=apexTint(o[k],apex);
  ud.robe=!!o.coat;
  s.armL.position.set(SX,SH,0);s.armR.position.set(-SX,SH,0);
  // hips and legs
  b.sp('hips',o.thigh,0,.3,0,1,4.9,3.3,3.5);
  for(const[u,l]of[['legL','shinL'],['legR','shinR']]){
    b.cy(u,o.thigh,0,-UL/2,0,2.75,2.05,UL,0,0,0,1);b.sp(u,o.thigh,0,-UL,0,2.05);
    b.cy(l,o.shin,0,-(LL-2.2)/2,0,2,1.5,LL-2.2,0,0,0,1);b.bx(l,o.foot,0,-LL+1.2,1.6,3.2,2.4,6.4);
    if(c)b.spike(l,o.foot,0,-LL+.1,4.6,0,.12,1,2.6,1.6,.7);                                  // pointed toe
  }
  // torso: waist, a chest that widens to the shoulders, neck
  b.cy('torso',o.torso,0,4,0,4.3,4.5,7.4,0,0,0,.68,8);b.cy('torso',o.torso,0,12.2,0,7,4.3,9.6,0,0,0,.6,8);b.sp('torso',o.torso,0,16.9,0,1,7.1,1.9,3.9);
  b.cy('torso',F,0,NECK-1.2,0,1.7,1.95,3.2);
  // arms and hands
  for(const[u,f,h]of[['armL','foreL','handL'],['armR','foreR','handR']]){
    b.sp(u,o.arm,0,0,0,2.4);b.cy(u,o.arm,0,-UA/2,0,2.05,1.7,UA);b.sp(u,o.arm,0,-UA,0,1.75);
    b.cy(f,o.fore,0,-FA/2,0,1.8,1.4,FA);
    if(touch){b.sp(h,o.hand,0,-1.5,0,2.05,1,1.1,.72);b.sp(h,o.hand,0,-3.7,.35,1,1.75,1.6,1.15);b.sp(h,o.hand,0,-1.9,1.75,1,.8,1.2,.9)}   // palm, fingers, thumb
    else b.sp(h,o.hand,0,-1.1,0,1.8);                                                                                                    // numb stump
  }
  // head: skull, tapered jaw, then the senses one by one
  s.head.position.set(0,NECK,0);
  b.sp('head',F,0,HEADY,.1,4.7,.93,1,.98);b.co('head',F,0,1.9,.9,3.5,3.6,PI,0,0,6,.9);
  b.fine=true;
  if(hearing)for(const k of[-1,1]){b.sp('head',F,k*4.5,4.5,-.3,1.6,.45,1,.75);b.sp('head',Fd,k*4.85,4.5,0,.9,.35,1,.7)}
  if(sight){const W=lit(0xffffff,.55),Pp=c&&(adv||tier>=4)?lit(acc,1.2):mat(0x17121c),Br=mat(0x241c2c);
    for(const k of[-1,1]){b.sp('head',W,k*1.85,4.75,4.0,1.35,1.12,.56,.5,0,0,k*.24);b.sp('head',Pp,k*1.7,4.72,4.5,.66,1,.9,.5);b.bx('head',Br,k*1.95,5.5,4.42,2.7,.36,.7,0,0,k*.3)}}
  if(smell)b.co('head',Fd,0,3.75,4.9,.7,1.7,1.15,0,0,4);
  if(taste)b.bx('head',mat(0x6e2430),0,2.25,4.2,1.9,.42,.5);
  b.fine=false;
  if(o.hair)hair(b,acc,o.hair===2);
  // ----- no class yet: grave wrappings -----
  if(!c){const cl=mat(0x4a4458),cd=mat(0x34303f),bd=mat(0xd9cfb8);
    for(const k of[-1,1]){b.bx('torso',F,k*2.75,13.9,3.35,4.6,3.6,1.1,-.12,k*.22,k*.06);b.sp('torso',F,k*3,15.2,-2.6,1,3,3.2,1.4)}b.fine=true;b.bx('torso',Fd,0,7,3.05,.4,5.4,.3);b.bx('torso',Fd,0,6.2,3.05,3.4,.35,.3);b.bx('torso',Fd,0,8.2,3.1,3.6,.35,.3);b.fine=false;
    b.cy('hips',cl,0,.1,0,5,5.4,4.6,0,0,0,.72,8);b.cy('hips',cd,0,2.1,0,5.2,5.2,1.2,0,0,0,.72,8);
    s.coatB.position.set(-.8,-1.4,-3.3);s.coatL.position.set(1.3,-1.4,3.5);panel(b,'coatB',cl,8,2.6,2,0,null,2.4);panel(b,'coatL',cl,9.5,2.3,1.6,0,null,2.6);
    b.fine=true;for(const y of[-2.5,-4.3,-6.1])b.cy('foreL',bd,0,y,0,1.9,1.8,1.1);for(const y of[-4,-6,-8])b.cy('shinR',bd,0,y,0,2.05,1.95,1.1);b.fine=false}
  // long coats (mage, healer, necro): a swallowtail at the back and a panel over each hip, each in its own sway slot
  if(o.coat){const M=o.torso,nec=c==='necro',len=c==='healer'?23:22;
    b.cy('hips',M,0,.2,0,5,5.5,4.4,0,0,0,.72,8);
    s.coatB.position.set(0,-1,-3.3);s.coatL.position.set(4.6,-1,-.2);s.coatR.position.set(-4.6,-1,-.2);
    b.cy('coatB',M,-2.5,-len/2,0,2.9,3.3,len,0,0,-.05,.16,6);b.cy('coatB',M,2.5,-len/2,0,2.9,3.3,len,0,0,.05,.16,6);
    for(const k of[-1,1]){b.spike('coatB',M,k*3,-len+.3,0,k*.2,-1,0,nec?7:5,3.2,.18);if(nec)b.spike('coatB',M,k*1.2,-len+2,0,-k*.1,-1,0,5,1.8,.18)}
    panel(b,'coatL',M,len-2,3,3.6,HP,nec?null:tr,nec?5:3);panel(b,'coatR',M,len-2,3,3.6,HP,nec?null:tr,nec?5:3);
    b.fine=true;for(const k of[-1,1])b.bx('coatB',tr,k*2.9,-len*.5,-.55,.7,len*.8,.4,0,0,k*.05);b.fine=false}
  if(c==='fighter'){
    const iron=mat(0x3a3a4c),sash=lit(acc,.3,0xb8421f),wrap=mat(0xe7dfcd);
    // open collar vest, wide sash with two long tails at the back of the left hip, wrapped forearms
    b.cy('hips',o.thigh,0,-.6,0,5.1,5.6,5,0,0,0,.72,8);b.cy('hips',sash,0,2,0,5.1,5.1,2.6,0,0,0,.74,8);b.sp('hips',sash,3.2,2,-3.4,1.5);
    s.coatB.position.set(3,1.6,-3.6);panel(b,'coatB',sash,17,1.7,2.2,0,null,3);b.cy('coatB',sash,-2.4,-6.5,-.5,1.4,1.9,13,0,0,-.12,.15,6);b.spike('coatB',sash,-3.2,-12.6,-.5,-.15,-1,0,2.6,1.7,.2);
    b.fine=true;b.bx('torso',tr,-1.6,12.4,4.2,.7,7.4,.5,0,0,-.2);b.bx('torso',tr,1.6,12.4,4.2,.7,7.4,.5,0,0,.2);b.bx('torso',F,0,15.6,4.05,2.4,3.4,.5);b.fine=false;
    b.cy('torso',o.torso,0,NECK-1.4,-.6,2.9,3.2,3,0,0,0,.9,6);
    b.fine=true;for(const y of[-3,-4.8,-6.6])for(const f of['foreL','foreR'])b.cy(f,wrap,0,y,0,1.85,1.7,1.2);b.fine=false;
    // one layered pauldron on the left shoulder; champions wear two
    for(const[u,k]of adv==='champion'?[['armL',1],['armR',-1]]:[['armL',1]]){b.sp(u,iron,k*.5,.9,0,3.5,1.1,.78,1.1);b.sp(u,iron,k*1.4,-1.3,0,3,1,.7,1.05);b.spike(u,iron,k*1.5,1.6,0,k*.9,1,0,4.6,1.5,.6);
      b.fine=true;b.to(u,tr,k*.6,.5,0,3.5,.42,1.05);b.fine=false}
    // headband: knot and two tails in the band slot
    const R=lit(acc,.45,0xc2401c);b.to('head',R,0,7.5,-.2,4.5,.6,1.02,0,HP-.16);s.band.position.set(.6,6.8,-4.6);
    b.cy('band',R,.9,-3.6,-.2,.9,1.3,7.6,0,0,.14,.2,6);b.cy('band',R,-.8,-2.9,-.5,.8,1.1,6,0,0,-.2,.2,6);b.sp('band',R,0,0,0,1.15);
    b.cy('legL',iron,0,-UL+.6,.9,2.3,2.5,3,0,0,0,1,6);b.cy('legR',iron,0,-UL+.6,.9,2.3,2.5,3,0,0,0,1,6);
  }else if(c==='tank'){
    const p1=o.torso,p2=o.arm,lt=mat(0x8e9ab4),vis=lit(acc,K+.5);
    // angular plate: gorget, keeled breastplate, layered pauldrons with fins, tassets on sway slots, a short war-skirt behind
    b.cy('torso',p1,0,13,1.5,5.6,3.6,8.8,0,0,0,.62,6);b.cy('torso',lt,0,18.2,0,3.4,4.3,2.4,0,0,0,.9,6);b.cy('hips',p2,0,1.9,0,5.2,5.2,2.2,0,0,0,.74,8);
    b.fine=true;b.bx('torso',tr,0,12.6,5.05,.7,7.2,.5);b.bx('torso',tr,2.3,15,4.4,3.6,.6,.5,0,0,.5);b.bx('torso',tr,-2.3,15,4.4,3.6,.6,.5,0,0,-.5);b.fine=false;
    for(const[u,k]of[['armL',1],['armR',-1]]){b.sp(u,p1,k*.7,1,0,4.1,1.15,.8,1.15);b.sp(u,lt,k*1.9,-1.4,0,3.4,1,.72,1.1);b.spike(u,p1,k*1.2,2,-.4,k*.75,1,-.25,5.4,1.7,.5);
      b.fine=true;b.to(u,tr,k*.8,.6,0,4.1,.4,1.1);b.fine=false}
    for(const f of['foreL','foreR']){b.cy(f,lt,0,-4.6,0,2.3,2,5.4,0,0,0,1,6);b.spike(f,lt,0,-1.6,-1.4,0,.5,-1,3,1.2,.5)}
    for(const[u,l]of[['legL','shinL'],['legR','shinR']]){b.sp(u,lt,0,-UL,1.1,2.5,1,1.1,1);b.spike(u,lt,0,-UL+.6,1.8,0,1,.6,3.2,1.3,.6);b.cy(l,lt,0,-5.2,.5,2.4,1.9,8.6,0,0,0,.9,6)}
    s.coatL.position.set(4.7,1,.4);s.coatR.position.set(-4.7,1,.4);s.coatB.position.set(0,1,-3.4);
    for(const sl of['coatL','coatR']){b.cy(sl,p1,0,-3.6,0,2.6,3.1,7,0,HP,0,.2,6);b.spike(sl,p1,0,-7,0,0,-1,0,3,3.1,.2);b.fine=true;b.bx(sl,tr,0,-6.9,0,.8,.6,5);b.fine=false}
    panel(b,'coatB',mat(0x1f2f52),13,4.2,5.2,0,tr,3);
    // helm: smooth dome, swept cheek plates, a lit visor slit, two fins raked back (horns for a berserker)
    b.sp('head',p1,0,HEADY+.2,-.1,5.5,.95,1,1.02);b.cy('head',p1,0,2.4,.6,4.2,3.1,4.2,0,0,0,1,6);b.bx('head',lt,0,5.6,4.6,1.1,6.6,1.6,-.12);
    b.fine=true;b.bx('head',mat(0x07070c),0,4.9,4.75,7.4,1.5,1.2);b.bx('head',vis,-2.1,4.9,5.05,2.7,.62,.8,0,0,-.08);b.bx('head',vis,2.1,4.9,5.05,2.7,.62,.8,0,0,.08);b.fine=false;
    if(adv==='berserker'){const Bn=mat(C.bone);for(const k of[-1,1]){b.spike('head',Bn,k*4.6,6.4,0,k*1,.45,.1,4,1.5);b.spike('head',Bn,k*7.6,7.6,.3,k*.3,1,.35,5.6,1.25)}}
    else for(const k of[-1,1]){b.spike('head',lt,k*3.4,7.6,-1,k*.5,.8,-1,7,1.5,.4);b.fine=true;b.spike('head',tr,k*3.7,8.2,-1.6,k*.5,.8,-1,4.6,.6,.5);b.fine=false}
    if(adv!=='berserker'){
      // long kite shield on the left arm; its meshes swap to dim twins in update() when the block is spent
      s.shield.position.set(11.2,9.4,4.4);s.shield.rotation.set(-.08,.75,0);ud.shY=9.4;
      const face=mat(0x26365c),rim=adv==='paladin'?gold:lt,line=lit(acc,K+.3);
      b.put('shield',rim,gKite(),0,.2,-.4,0,0,0,1.02,1.02,.9);b.put('shield',face,gKite(),0,.3,.2,0,0,0,.86,.86,1);
      b.fine=true;b.bx('shield',line,0,-1.5,.85,.7,16,.4);b.bx('shield',line,2.2,3.6,.85,5.2,.7,.4,0,0,-.6);b.bx('shield',line,-2.2,3.6,.85,5.2,.7,.4,0,0,.6);b.sp('shield',rim,0,5,.9,1.5,1,1,.5);b.fine=false;
      b.put('shieldGlow',glow(acc,.2),gKite(),0,.2,.9,0,0,0,1.12,1.1,.3);b.sp('shieldGlow',glow(acc,.5),0,5,1.2,2.4,1,1,.4);
    }
  }else if(c==='assassin'){
    const A1=o.torso,A2=o.fore,wrap=mat(0x9aa0b4),R=lit(acc,.4,0xc2203f);
    // fitted jacket with crossed straps, deep hood and half mask, a short blade-skirt on the left hip, long two-tailed scarf
    b.cy('hips',A2,0,1.9,0,5,5,1.8,0,0,0,.74,8);
    b.fine=true;b.bx('torso',A2,0,10.5,4.3,1.1,13,.5,0,0,.6);b.bx('torso',A2,0,10.5,4.3,1.1,13,.5,0,0,-.6);b.sp('torso',tr,0,10.6,4.5,1.1,1,1,.5);
    for(const y of[-2.4,-4,-5.6])b.cy('foreR',wrap,0,y,0,1.85,1.75,1);b.cy('legR',A2,0,-6,0,2.9,2.8,1.4);b.bx('legR',wrap,-2.6,-7,0,.8,5.4,1.6);b.fine=false;
    s.coatL.position.set(4.4,1.2,-.6);panel(b,'coatL',A2,10,2.4,3.3,HP,tr,3.4);s.coatB.position.set(1.6,1.2,-3.3);panel(b,'coatB',A2,8.5,2.6,3,0,null,3);
    hood(b,A2,.5);
    b.wedge('head',mat(0x1a1d2a),0,HEADY,.1,4.95,HP-1.25,2.5,PI*.54,PI*.34);                 // mask over the lower face
    b.to('torso',R,0,NECK-1.4,.2,3.9,1.9,.85);
    s.scarf.position.set(-2.2,NECK-1.6,-3.4);s.scarf2.position.set(0,-10,-.2);
    b.cy('scarf',R,-.4,-5,0,1.5,1.9,10,0,0,-.06,.2,6);b.cy('scarf',R,2.2,-4.2,-.5,1.3,1.6,8.4,0,0,.16,.2,6);b.spike('scarf',R,3.5,-8.2,-.5,.2,-1,0,3.4,1.6,.2);
    b.cy('scarf2',R,-.5,-5,0,1.9,1.5,10,0,0,0,.2,6);b.spike('scarf2',R,-.5,-10,0,0,-1,0,3.6,1.5,.2);
  }else if(c==='mage'){
    const M1=o.torso,M2=o.thigh;
    // high collar, flared cuffs, belt with a hanging charm; a raked hat: tilted brim, bent point, lit band and a crystal on the tip
    b.cy('torso',M1,0,NECK-.8,-.5,3.9,3.1,3.6,0,0,0,.95,6);b.cy('hips',dk,0,2,0,5.1,5.1,1.4,0,0,0,.74,8);
    b.fine=true;b.bx('torso',tr,-1.5,10.6,4.2,.6,12.6,.5,0,0,-.1);b.bx('torso',tr,1.5,10.6,4.2,.6,12.6,.5,0,0,.1);b.co('hips',tr,2.2,-.6,3.6,.8,2.4,PI,0,0,4);b.fine=false;
    for(const f of['foreL','foreR']){b.cy(f,M1,0,-6.2,0,1.8,2.9,4.6);b.fine=true;b.to(f,tr,0,-8.3,0,2.9,.36);b.fine=false}
    b.cy('head',M2,0,8.1,-.5,8.9,9.3,.7,-.24,0,.08,1,10);b.fine=true;b.to('head',tr,0,8.75,-.35,4.6,.6,1,0,HP-.24,0,.08);b.fine=false;
    b.cy('head',M1,0,11,-1.2,2.9,4.6,5.4,-.3,0,.08,1,7);b.spike('head',M1,.3,13.2,-2.2,.25,.55,-1,8.6,2.9);
    b.fine=true;b.co('head',lit(acc,K+.4),2.4,16.4,-9.6,.8,2.4,PI,0,0,4);b.fine=false;b.sp('head',glow(acc,.3),2.4,16.4,-9.6,1.9);
  }else if(c==='ranger'){
    const R1=o.torso,R2=mat(0x1d3022);
    // tunic skirt, crossed baldric, bracers, deep hood, quiver; the short cloak lives in the cape slot
    b.cy('hips',R1,0,-1.2,0,4.9,5.8,5.6,0,0,0,.72,8);b.cy('hips',lea,0,1.9,0,5.1,5.1,1.7,0,0,0,.74,8);
    b.fine=true;b.bx('torso',lea,0,10.6,4.25,1.3,14,.5,0,0,-.62);b.bx('hips',tr,0,1.9,3.85,1.8,1.5,.5);b.to('foreL',tr,0,-2,0,1.95,.34);b.to('foreR',tr,0,-2,0,1.95,.34);b.fine=false;
    hood(b,R2,.35);b.fine=true;b.bx('head',tr,0,9.75,2.9,.6,.6,4.4,-.42);b.fine=false;
    b.cy('torso',lea,-3.6,12.6,-5,1.9,1.6,11,-.1,0,-.42);
    b.fine=true;for(const[x,z]of[[-1,0],[.8,.6],[.5,-.8]]){const ax=-6.6+x*.8,ay=19.4+x*.8;b.bone('torso',mat(C.bone),-5.6+x,16.4,-5.6+z,ax-1.2,ay+1.8,-6+z,.3,0,0);b.co('torso',tr,ax-1.3,ay+1.9,-6+z,.9,2.6,-.1,0,.42,4)}b.fine=false;
    if(adv==='beastmaster'){const fur=mat(0x8d96a4);b.sp('torso',fur,0,NECK-1.7,-1.3,1,8.2,2.9,5.6);for(const k of[-1,1]){b.sp('torso',fur,k*6.2,17,1.4,2.9);b.spike('torso',fur,k*7.4,17.4,-1,k*1,.3,-.4,4,2)}}
    if(!adv){s.cape.position.set(0,17.6,-3.6);s.cape2.position.set(0,-9,-.2);
      b.cy('cape',R2,0,-4.5,-.3,6.2,7,9,0,0,0,.14,8);b.cy('cape2',R2,0,-4,0,7,6.6,8,0,0,0,.14,8);for(const x of[-4.4,0,4.4])b.spike('cape2',R2,x,-7.8,0,x*.03,-1,0,4.4,2.5,.2)}
  }else if(c==='healer'){
    const H1=o.torso,inq=adv==='inquisitor',st=inq?mat(0x7a2630):lit(C.gold,.2,0xc9a04a);
    // capelet over the shoulders, a long stole down the front, sash; circlet and a broken halo of light behind the head
    b.sp('torso',H1,0,16.8,-.3,1,8.4,2.5,5);b.cy('hips',gold,0,2,0,5.1,5.1,1.4,0,0,0,.74,8);
    b.fine=true;for(const k of[-1,1]){b.bx('torso',st,k*2.3,9.4,4.3,1.7,15.5,.5,0,0,k*.05);b.bx('hips',st,k*2.6,-4,3.9,1.7,9,.5,-.06);b.spike('hips',st,k*2.6,-8.4,3.7,0,-1,0,2.4,.9,.3)}
    b.to('head',lit(acc,K),0,6.9,-.2,4.75,.5,1,0,HP-.2);b.co('head',lit(acc,K+.3),0,7.3,4.6,.8,2.2,PI,0,0,4);b.fine=false;
    for(const f of['foreL','foreR']){b.cy(f,H1,0,-6,0,1.8,2.7,4.8);b.fine=true;b.to(f,tr,0,-8.3,0,2.7,.34);b.fine=false}
    const hl=lit(acc,1.3,0xfff0c0),R=adv==='saint'?7.4:6.2;s.halo.position.set(0,12.6,-2.6);ud.haloY=12.6;
    b.fine=true;for(let i=0;i<4;i++){b.to('halo',hl,0,0,0,R,.55,1,1.2,HP,0,i*HP+.18)}
    for(let i=0;i<(adv==='saint'?8:4);i++){const a=i*TAU/(adv==='saint'?8:4)+PI/4;b.spike('halo',hl,Math.cos(a)*(R+.6),0,Math.sin(a)*(R+.6),Math.cos(a),0,Math.sin(a),adv==='saint'?4.4:2.8,.75,.5)}b.fine=false;
    b.to('halo',glow(acc,.22),0,0,0,R,1.9);
    if(inq){const R2=mat(0x7a2630);b.sp('torso',R2,0,17.2,-.3,1,8.7,2.2,5.2)}
  }else if(c==='necro'){
    const N1=o.torso,Bn=mat(C.bone);
    // ragged hooded robe, a collar of rib spikes, bone shoulder barbs, a small skull at the belt
    b.cy('hips',mat(0x10161a),0,2,0,5.1,5.1,1.4,0,0,0,.74,8);
    hood(b,N1,.2);
    for(let i=0;i<5;i++){const a=PI*.5+(i-2)*.62;b.spike('torso',Bn,Math.cos(a)*-5.4,17.4,Math.sin(a)*-3.4-.4,-Math.cos(a)*.9,.55,-Math.sin(a)*.9-.2,3.6,.75)}
    for(const k of[-1,1])b.spike('torso',Bn,k*7.6,17.6,0,k*.9,1,-.2,4.2,1.1);
    b.fine=true;b.bx('torso',tr,0,10.4,4.25,.6,10.5,.5);for(let i=0;i<3;i++)for(const k of[-1,1])b.bx('torso',tr,k*(1.3+i*.3),13.8-i*2.2,4.2,2+i*.6,.5,.5,0,0,k*.35);b.bx('hips',tr,0,-7,3.75,.6,12,.5,-.05);
    b.sp('hips',Bn,-2.8,1.2,3.8,1.6,1,1,.8);b.sp('hips',mat(C.dark),-3.3,1.4,4.9,.45);b.sp('hips',mat(C.dark),-2.3,1.4,4.9,.45);b.fine=false;
    b.cy('hips',N1,0,-6,3.4,2.2,2.8,13,-.05,0,0,.15,6);b.spike('hips',N1,0,-12.4,3.1,0,-1,0,4,2.8,.18);
    for(const f of['foreL','foreR'])b.cy(f,N1,0,-6,0,1.8,3,5);
    if(adv==='lich')for(let i=0;i<5;i++){const a=HP+(i-2)*.5;b.spike('head',tr,Math.cos(a)*5.4,8.2-Math.abs(i-2)*.5,Math.sin(a)*4.4-.6,Math.cos(a)*.25,1,0,4.6-Math.abs(i-2)*.6,.9)}
  }
  // ----- class upgrade: a mantle on the shoulders that falls into a long forked cape (short over a long coat) -----
  if((adv||apex)&&c){const dom=apex==='dominion',AX=APX[apex],cm=dom?mat(0x0c0a16,{emissive:0x24105a,emissiveIntensity:.4}):AX?(AX.ek?mat(AX.cape,{emissive:AX.e,emissiveIntensity:AX.ek}):mat(AX.cape)):apex?lit(0xf4eedd,.35):mat(CAPE[adv]||0x8f1f30),short=!!o.coat,l1=short?8:13,l2=(short?8:14)+(apex?3:0);
    s.cape.position.set(0,17.7,-3.7);s.cape2.position.set(0,-l1,-.25);
    b.cy('cape',cm,0,-l1/2,-.3,6.3,7.6,l1,0,0,0,.14,8);b.cy('cape2',cm,0,-l2/2,0,7.6,8.6,l2,0,0,0,.14,8);
    for(const x of[-5.6,-1.9,1.9,5.6])b.spike('cape2',cm,x,-l2+.3,0,x*.03,-1,0,(short?3.6:5.4)+(dom?(x>0?4.5:2):0),2.4,.2);
    b.fine=true;b.bx('cape2',tr,0,-l2+.9,-.6,15.6,.7,.5);b.bx('cape',tr,0,-l1*.5,-1,.7,l1,.4);b.fine=false;
    b.sp('torso',cm,0,17.9,-2.4,1,7.6,1.7,3);b.co('torso',lit(acc,K+.4),5.4,17.8,2.2,1.1,2.4,PI,0,0,4);b.co('torso',lit(acc,K+.4),-5.4,17.8,2.2,1.1,2.4,PI,0,0,4)}
}

// a flat blade lying in a slot's XZ plane: base at (x,z), pointing along angle phi (0 = +x, positive turns toward -z), with a short tail behind it
function blade(b,slot,m,x,z,phi,len,wid,th){const c=Math.cos(phi),sn=Math.sin(phi);
  b.put(slot,m,gCone(4),x+c*len/2,0,z-sn*len/2,0,phi,-HP,th,len,wid);b.put(slot,m,gCone(4),x-c*len*.11,0,z+sn*len*.11,0,phi+PI,-HP,th,len*.22,wid)}
// ----- the apex tier: what a hero past floor 100 wears over everything else -----
function buildApex(b,s,ud,c,apex,tier){
  const pw=pal('power',0x8b4dff),pw2=pal('power2',0xc4f4ff),W=ud.apexMat,gp=ud.foe?pal('foe',0xff2d55):pw,gp2=ud.foe?pal('foe2',0xffb0a0):pw2; // gp, gp2: what lies on the floor
  if(APEX_NEW[apex]){const A=APX[apex];APEX_NEW[apex](b,s,ud,c,A,ud.foe?gp:A.a,ud.foe?gp2:A.h,W);return}
  if(apex==='dominion'){
    // the crown: a dark band that hovers over the head, ringed with upturned finger-bones of uneven height, one violet splinter turning above it
    const Bd=mat(0x241d33),Bn=mat(C.bone),V=lit(pw,1.7,0xc9a8ff),cy=c==='mage'?12.4:c==='tank'?12:c==='healer'?11.6:11,cr=c==='mage'?5.3:6;
    ud.crownY=cy;s.crown.position.set(0,cy,-.5);
    b.to('crown',Bd,0,0,0,cr,.62,1);
    const hs=[11.5,6,8.6,5,7.4,5.6,9.6];
    for(let i=0;i<7;i++){const a=HP+.45+i*TAU/7,x=Math.cos(a)*cr,z=Math.sin(a)*cr,h=hs[i];
      b.spike('crown',i%2?Bd:Bn,x,.1,z,Math.cos(a)*.34,1,Math.sin(a)*.34,h,1.45);b.sp('crown',i%2?Bn:Bd,x,.1,z,1.15);
      b.fine=true;b.spike('crown',V,x*1.04,h*.25,z*1.04,Math.cos(a)*.3,1,Math.sin(a)*.3,h*.52,.42);b.fine=false}
    b.fine=true;b.co('crown',V,0,8.6,0,1.4,3.8,0,0,0,4);b.co('crown',V,0,5.4,0,1.4,2.6,PI,0,0,4);b.fine=false;b.sp('crown',glow(pw,.34),0,7.2,0,3.6);
    // a yoke of vertebrae across the shoulders
    for(let i=-3;i<=3;i++)b.sp('torso',i%2?Bd:Bn,i*2.5,18.4-Math.abs(i)*.42,-2.2-Math.abs(i)*.1,1.5,1.05,.8,1.05);
    for(const k of[-1,1])b.spike('torso',Bn,k*8.6,17.6,-1.4,k*.9,.75,-.5,6.2,1.3);
    // the orbit: shards of rib and bone carried round the body in two slow rings that lean against each other
    s.orbA.position.set(0,33,0);s.orbB.position.set(0,17,0);
    for(let i=0;i<4;i++){const a=i*TAU/4+.4,R=20+(i%2)*2.5,x=Math.cos(a)*R,z=Math.sin(a)*R,y=(i%2?3:-2),dx=-Math.sin(a)*.5,dz=Math.cos(a)*.5;
      b.spike('orbA',Bn,x,y,z,dx,1,dz,10+i%2*3,2,.55);b.spike('orbA',Bn,x,y,z,-dx,-1,-dz,5,2,.55);
      b.fine=true;b.spike('orbA',V,x*.94,y,z*.94,dx,1,dz,6.6,.6);b.fine=false;b.sp('orbA',glow(pw,.22),x,y+2,z,4)}
    for(let i=0;i<3;i++){const a=i*TAU/3+1.3,R=25.5,x=Math.cos(a)*R,z=Math.sin(a)*R;
      b.sp('orbB',Bd,x,0,z,2.8,1.1,.8,1.1);b.spike('orbB',Bn,x,0,z,Math.cos(a),.35,Math.sin(a),6.6,1.4);b.spike('orbB',Bn,x,0,z,-Math.sin(a),.2,Math.cos(a),5.2,1.2);b.spike('orbB',Bn,x,0,z,Math.sin(a),.2,-Math.cos(a),5.2,1.2);
      b.fine=true;b.sp('orbB',V,x,1.6,z,1.05);b.fine=false;b.sp('orbB',glow(pw,.2),x,1,z,3.6)}
    // the domain: the floor goes dark under the hero in a jagged stain, edged in violet; a wave keeps spreading out of it
    const D=decal(0x05030c,.56),D2=decal(0x05030c,.34);
    b.put('dom',D,gRing(.01,32,0,TAU),0,.52,0,-HP,0,0,40,40,1);b.put('dom',D2,gRing(.01,32,0,TAU),0,.5,0,-HP,0,0,53,53,1);
    for(let i=0;i<13;i++){const a=i*TAU/13+(i%3)*.11,L=58+(i*37%23);b.put('dom',D,gRing(.01,3,-.09,.18),0,.54,0,-HP,0,a,L,L,1)}
    b.put('dom',glow(gp,.5),gRing(.955,40,0,TAU),0,.6,0,-HP,0,0,41,41,1);
    for(let i=0;i<3;i++)b.put('dom',glow(gp,.3),gRing(.93,12,i*TAU/3,1.35),0,.62,0,-HP,0,0,29,29,1);
    for(let i=0;i<5;i++){const a=i*TAU/5+.3;b.put('dom',glow(gp,.34),gRing(.6,2,-.022,.044),0,.64,0,-HP,0,a,58,58,1)}
    b.put('domW',W,gRing(.9,40,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  }else{
    // the halo: a great ring of light broken in three, standing behind the shoulders, a thin gold circle inside it
    const L=lit(pw2,1.6,0xffffff),Gd=lit(C.gold,1,0xffe9a8),R=15.5;
    s.nimbus.position.set(0,18.5,-6);s.nimbus.rotation.set(HP-.1,0,0);
    b.fine=true;
    for(const[a0,len]of[[.25,1.75],[2.4,1.2],[4.05,1.85]])b.to('nring',L,0,0,0,R,1,1,len,HP,0,a0);
    b.to('nring',Gd,0,0,0,R-3.4,.34,1);
    for(let i=0;i<6;i++){const a=i*TAU/6+.2;b.spike('nring',Gd,Math.cos(a)*(R-3.4),0,Math.sin(a)*(R-3.4),-Math.cos(a),0,-Math.sin(a),2.6,.55,.5)}
    b.fine=false;
    b.to('nring',glow(pw2,.16),0,0,0,R,2.5);
    // blade-wings: three long splinters of light on each side, hanging in the air off the halo, longest on top
    for(const[sl,k]of[['wingL',1],['wingR',-1]]){s[sl].position.set(k*8,0,-1);
      const BL=[[1.0,36,3.4],[.52,29,3],[.06,20,2.6]];
      for(let i=0;i<3;i++){const q=BL[i],phi=k>0?q[0]:PI-q[0],x=k*(8+i*1.4),z=-5+i*5.4;
        b.fine=true;blade(b,sl,L,x,z,phi,q[1],q[2],.6);b.fine=false;blade(b,sl,glow(pw2,.2),x,z,phi,q[1]*1.12,q[2]*2.1,.3)}
      b.fine=true;blade(b,sl,Gd,k*5.5,-1,k>0?.8:PI-.8,7,.9,.4);b.fine=false}
    // a brow-mark of light and bright cuffs
    b.fine=true;b.co('head',L,0,c==='tank'?10.6:9.6,c==='mage'?5.2:3.6,.9,2.6,0,0,0,4);for(const f of['foreL','foreR'])b.to(f,L,0,-7.2,0,2.5,.36);b.fine=false;
    // the aura: a disc of radius 1 that update() scales to P.auraR; rim, faint fill, inward teeth, a broken gold ring turning inside, and a pulse
    b.put('oaura',glow(gp2,.6),gRing(.972,56,0,TAU),0,.7,0,-HP,0,0,1,1,1);b.put('oaura',glow(ud.foe?gp:pw2,.07),gRing(.01,40,0,TAU),0,.62,0,-HP,0,0,1,1,1);
    for(let i=0;i<12;i++)b.put('oaura',glow(gp2,.5),gRing(.86,2,i*TAU/12-.02,.04),0,.72,0,-HP,0,0,1,1,1);
    for(let i=0;i<4;i++)b.put('oaura2',glow(ud.foe?0xff7a30:C.gold,.42),gRing(.955,14,i*HP+.2,1.05),0,.74,0,-HP,0,0,.72,.72,1);
    b.put('oauraW',W,gRing(.93,48,0,TAU),0,.76,0,-HP,0,0,1,1,1);
  }
}

/* ----- round 10: the eight newer apex paths. Each builder dresses the hero (silhouette), lays its floor mark and prepares what update() moves.
   A = APX[path], gp/gp2 = the floor colours (the path's own, or the foe palette for an opponent), W = this hero's own pulsing material. ----- */
const hr=i=>{const v=Math.sin(i*12.9898+4.1)*43758.5453;return v-Math.floor(v)};
const cnt=(v,d,m)=>typeof v==='number'&&v===v?(v<0?0:v>m?m:Math.round(v)):d;
const headY=c=>c==='mage'?10.4:c==='tank'?10:c==='healer'?9.6:9;
// flat marks on the floor: a tapered stroke between two points, a stroke by centre/angle, a disc
function fseg(b,slot,m,x1,z1,x2,z2,wid,y){const dx=x2-x1,dz=z2-z1;b.put(slot,m,gRing(.01,4,0,TAU),(x1+x2)/2,y,(z1+z2)/2,-HP,0,Math.atan2(-dz,dx),Math.hypot(dx,dz)/2,wid/2,1)}
function fmark(b,slot,m,x,z,a,len,wid,y){b.put(slot,m,gRing(.01,4,0,TAU),x,y,z,-HP,0,a,len/2,wid/2,1)}
function fdisc(b,slot,m,x,z,r,y,seg,r2){b.put(slot,m,gRing(.01,seg||16,0,TAU),x,y,z,-HP,0,0,r,r2||r,1)}
// a jagged run of square bars through points [x,y,...] at depth z (lightning)
function zig(b,slot,m,pts,z,w){for(let i=0;i+3<pts.length;i+=2){const dx=pts[i+2]-pts[i],dy=pts[i+3]-pts[i+1];b.put(slot,m,gBox(),(pts[i]+pts[i+2])/2,(pts[i+1]+pts[i+3])/2,z,0,0,Math.atan2(-dx,dy),w,Math.hypot(dx,dy)+w*.6,w)}}
const APEX_NEW={
  // The Feral Vow: antlers of bone, a mantle of hide and claws, the floor raked by claws, one paw-print circling for each beast of the pack
  beasts(b,s,ud,c,A,gp,gp2,W){
    const Bn=mat(C.bone),Fur=mat(0x8a6a3c),FurD=mat(0x5a4426),G1=lit(A.a,1.5,0xd8ffd0),hy=headY(c);
    s.ahead.position.set(0,hy-2.6,-.6);
    for(const k of[-1,1]){
      b.bone('ahead',Bn,k*3,0,0,k*9,7,-1.5,1.9,2,1.8);b.bone('ahead',Bn,k*9,7,-1.5,k*13.5,16,-.5,1.6,0,1.5);b.bone('ahead',Bn,k*13.5,16,-.5,k*11.5,25,.8,1.3,0,0);
      b.spike('ahead',Bn,k*11.5,25,.8,-k*.2,1,.2,6.5,1.3);
      b.spike('ahead',Bn,k*6,3.6,-.8,k*.25,.9,.9,8,1.4);b.spike('ahead',Bn,k*10,9.5,-1.3,k*1,.7,.1,10,1.4);
      b.spike('ahead',Bn,k*13.4,15.5,-.6,k*1,.55,-.2,9.5,1.3);b.spike('ahead',Bn,k*12.6,20,0,-k*.9,.9,0,7.5,1.2);
      b.fine=true;b.sp('ahead',G1,k*11.2,31.6,1.4,1.2);b.sp('ahead',G1,k*21,20.6,-2.3,1.1);b.sp('ahead',G1,k*17.6,15.4,-.2,1.1);b.fine=false;
      
    }
    for(const[x,y,z,r]of[[0,19.2,-3,4.8],[5.6,18.6,-1.6,4.4],[-5.6,18.6,-1.6,4.4],[9.4,17.2,-.6,3.5],[-9.4,17.2,-.6,3.5],[3,18.4,2.2,2.6],[-3,18.4,2.2,2.6]])b.sp('aback',Fur,x,y,z,r,1,.72,1);
    for(let i=0;i<9;i++){const a=(i-4)*.36;b.spike('aback',i%2?FurD:Fur,Math.sin(a)*9.8,17.4,-2.6-Math.cos(a)*2.2,Math.sin(a)*.5,-1,-.5,5.5+(i%3),1.8,.6)}
    for(let i=0;i<5;i++){const x=(i-2)*2.5;b.spike('aback',Bn,x,17.2-Math.abs(i-2)*.2,3.6,x*.04,-1,.45,3.4-Math.abs(i-2)*.4,.65)}
    b.fine=true;for(const f of['foreL','foreR'])b.to(f,Fur,0,-2.4,0,2.3,1);b.fine=false;
    const D=decal(0x060a05,.6),g1=glow(gp,.6);
    for(const[cx,cz,a]of[[-9,7,.55],[11,-9,2.5]])for(let j=-1;j<=1;j++){const ox=Math.sin(a)*j*8-Math.cos(a)*j*j*3,oz=Math.cos(a)*j*8+Math.sin(a)*j*j*3,L=56-Math.abs(j)*10;
      fmark(b,'aground',D,cx+ox,cz+oz,a,L,7,.52);fmark(b,'aground',g1,cx+ox,cz+oz,a,L*.8,1.7,.6)}
    for(let i=0;i<4;i++){b.put('aground',glow(gp,.42),gRing(.955,14,i*HP+.35,.95),0,.58,0,-HP,0,0,41,41,1);b.put('aground',glow(gp2,.6),gRing(.78,2,i*HP+.8,.075),0,.6,0,-HP,0,0,41,41,1)}
    b.put('awave',W,gRing(.92,36,0,TAU),0,.66,0,-HP,0,0,1,1,1);
    for(let i=0;i<6;i++){const sl='it'+i,a=i*TAU/6;s[sl].position.set(Math.cos(a)*31,.74,Math.sin(a)*31);s[sl].rotation.y=-a;
      b.put(sl,glow(gp,.75),gRing(.01,10,0,TAU),0,0,0,-HP,0,0,3.1,2.6,1);for(const[x,z]of[[-3.2,-2.4],[-1.2,-4],[1.2,-4],[3.2,-2.4]])b.put(sl,glow(gp2,.75),gRing(.01,8,0,TAU),x,0,z,-HP,0,0,1.2,1.6,1)}
  },
  // The Still Winter: a slow six-pointed wheel of ice shards at the hip, rime on the shoulders and brow, a hexagon of frost creeping over the floor
  frost(b,s,ud,c,A,gp,gp2,W){
    const Ice=mat(0xcfeeff,{emissive:0x4aa8e8,emissiveIntensity:.55}),IceD=mat(0x8fc4ea,{emissive:0x2f6aa8,emissiveIntensity:.4}),Wh=lit(0xf2fbff,.5),hy=headY(c);
    s.aorb.position.set(0,27,0);
    for(let i=0;i<6;i++){const a=i*TAU/6,cx=Math.cos(a),cz=-Math.sin(a),L=i%2?17:25;
      blade(b,'aorb',Ice,cx*12.5,cz*12.5,a,L,4,1.5);
      const a2=a+TAU/12;blade(b,'aorb',IceD,Math.cos(a2)*14.5,-Math.sin(a2)*14.5,a2,7,2,1.2);
      b.fine=true;blade(b,'aorb',Wh,cx*13.5,cz*13.5,a,L*.7,1,1.7);b.fine=false}
    b.put('aorb',glow(A.a,.12),gRing(.3,24,0,TAU),0,-.5,0,-HP,0,0,38,38,1);
    for(const k of[-1,1]){b.spike('aback',Ice,k*7.6,18,0,k*.5,1,-.2,9,1.8);b.spike('aback',IceD,k*9.6,17.4,-1,k*1,.6,-.3,6.5,1.5);b.spike('aback',Ice,k*6,18.4,-2,k*.1,1,-.7,6,1.4);b.sp('aback',Wh,k*7.6,18.3,0,2.9,1,.5,1)}
    s.ahead.position.set(0,hy-1.8,-.5);
    for(let i=0;i<5;i++){const x=(i-2)*2.2;b.spike('ahead',i%2?IceD:Ice,x,0,-2,x*.12,1,-.35,5+(2-Math.abs(i-2))*1.6,1.15)}
    b.fine=true;for(const f of['foreL','foreR'])b.to(f,Wh,0,-7,0,2.4,.5);for(const l of['shinL','shinR'])b.to(l,Wh,0,-9.5,0,2.3,.5);b.fine=false;
    const gl=glow(gp,.5),gl2=glow(gp2,.6);
    b.put('aground',decal(0xbfe4ff,.14),gRing(.01,6,0,TAU),0,.5,0,-HP,0,0,44,44,1);b.put('aground',glow(gp,.45),gRing(.95,6,0,TAU),0,.58,0,-HP,0,0,44,44,1);
    for(let i=0;i<6;i++){const a=i*TAU/6,cx=Math.cos(a),cz=Math.sin(a);fseg(b,'aground',gl2,cx*6,cz*6,cx*41,cz*41,1.7,.6);
      for(const d of[17,28]){const L=(45-d)*.42;for(const k of[-1,1]){const a2=a+k*1.05;fseg(b,'aground',gl,cx*d,cz*d,cx*d+Math.cos(a2)*L,cz*d+Math.sin(a2)*L,1.3,.6)}}}
    b.put('awave',W,gRing(.9,6,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  },
  // The Slow Rot: cracked bone piling up on one shoulder and weeping, sickly motes adrift, a blotched stain that bubbles
  plague(b,s,ud,c,A,gp,gp2,W){
    const Bn=mat(0xa89c6c),BnD=mat(0x6e6840),Dk=mat(0x15120a),Pu=lit(A.a,1.5,0xe8f08a),Br=mat(0x6b3a7a,{emissive:0x3a1450,emissiveIntensity:.4}),Drip=lit(A.a,.9,0x8f9a18),hy=headY(c);
    for(const[x,y,z,r]of[[9,18.5,-.5,5.4],[13,23.4,-1.8,4.8],[9.6,28.6,-2.8,4.2],[15,30,-1,3.2],[5.6,22.5,-3.6,3.4],[16,18,-1,3.2],[11.5,33.5,-2.4,2.6]])b.sp('aback',Bn,x,y,z,r,1,.92,1);b.spike('aback',BnD,11.5,35,-2.4,.2,1,-.2,7,1.3);b.spike('aback',BnD,16,24,-1.6,1,.5,-.1,8,1.4);
    b.spike('aback',BnD,12.4,24,-1.8,.9,.8,-.2,7.5,1.2);b.spike('aback',BnD,9.4,28.6,-2.8,-.2,1,-.3,7,1.1);b.spike('aback',BnD,14.8,18,-1,1,.1,0,6,1);b.spike('aback',BnD,13.8,29,-1,.6,1,.2,5,.9);
    b.sp('aback',Bn,-6.5,13,-4,2.9);b.sp('aback',Bn,-8.8,15.6,-3.2,2.1);b.spike('aback',BnD,-8.8,16,-3.2,-.8,.8,-.4,5,.85);
    b.fine=true;
    b.sp('aback',Dk,10.4,18.6,4,2,1,1,.5);b.sp('aback',Dk,14.6,24,2.2,1.7,1,1,.6);b.sp('aback',Dk,10.2,29.4,.8,1.5,1,1,.6);
    b.sp('aback',Pu,6.6,20.8,3.4,1.7);b.sp('aback',Pu,16.6,21.6,1.8,1.5);b.sp('aback',Pu,11.4,26.4,2.4,1.6);b.sp('aback',Pu,7.4,31,.4,1.3);b.sp('aback',Pu,16.4,31.4,.8,1.1);b.sp('aback',Pu,-7.4,13.8,-1.5,1);
    b.sp('aback',Br,13,20.6,3.4,2,1,1,.6);b.sp('aback',Br,8,25,1.2,1.8,1,1,.6);b.sp('aback',Br,-5.6,16.8,3,2.2,1,.6,.5);b.sp('aback',Br,4.4,10,3.7,1.8,.8,1,.4);
    b.cy('aback',Drip,10.4,15.4,2.9,.35,.5,6);b.sp('aback',Drip,10.4,12.2,2.9,.85,1,1.3,1);b.cy('aback',Drip,14.8,18.4,.8,.3,.4,5);b.sp('aback',Drip,14.8,15.8,.8,.7);
    b.fine=false;
    
    s.ahead.position.set(0,hy-3,0);b.sp('ahead',Bn,3.6,.6,1.2,2.5,1,.9,1);b.spike('ahead',BnD,4.4,1.6,.6,.6,1,-.2,6,.95);b.spike('ahead',BnD,2.2,2,0,.1,1,-.4,4,.75);b.fine=true;b.sp('ahead',Pu,4.8,.4,3.1,.85);b.fine=false;
    for(let i=0;i<5;i++){const a=i*2.4+.5,R=14+hr(i)*11,y=12+i*9.5;b.sp('aorb',glow(A.a,.8),Math.cos(a)*R,y,Math.sin(a)*R,1.3);b.sp('aorb',glow(A.a,.2),Math.cos(a)*R,y,Math.sin(a)*R,3)}
    for(let i=0;i<4;i++){const a=i*1.7+2,R=18+hr(i+20)*9,y=8+i*12;b.sp('aorb2',glow(A.h,.7),Math.cos(a)*R,y,Math.sin(a)*R,1);b.sp('aorb2',glow(0x6b3a7a,.5),Math.cos(a)*R,y,Math.sin(a)*R,2.2)}
    const D=decal(0x141a05,.55),D2=decal(0x283008,.34);
    ud.blots=[[0,0,27],[21,9,16],[-19,-13,15],[7,-25,11],[-27,10,9],[30,-8,7],[-6,29,8],[38,14,4],[-34,-24,4.5],[16,-38,3.5],[-14,40,3]];
    ud.blots.forEach(([x,z,r],i)=>{fdisc(b,'aground',D2,x,z,r*1.2,.5,14);fdisc(b,'aground',D,x,z,r,.52,14,r*.92);
      if(i<5)b.put('aground',glow(gp,.4),gRing(.9,14,i*1.3,2.4),x,.58,z,-HP,0,0,r*1.06,r*1.06,1)});
    for(let i=0;i<10;i++){const a=hr(i+50)*TAU,d=6+hr(i+60)*26;fdisc(b,'aground',glow(gp2,.55),Math.cos(a)*d,Math.sin(a)*d,.9+hr(i+70)*1.3,.6,8)}
    b.put('awave',W,gRing(.78,16,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  },
  // The Last Pyre: a tall guttering crown of fire, embers in the seams of charred gear, a scorched ring on the floor
  flame(b,s,ud,c,A,gp,gp2,W){
    const Ch=mat(0x1a1210),Em=lit(A.a,1.7,0xffd27a),F1=glow(A.a,.8),F2=glow(0xffd27a,.9),F3=glow(0xff3a10,.45),hy=headY(c);
    b.to('head',Ch,0,hy-1.6,-.3,5.3,.85,1);b.fine=true;for(let i=0;i<6;i++){const a=i*TAU/6+.5;b.sp('head',Em,Math.cos(a)*5.3,hy-1.6,-.3+Math.sin(a)*5.3,.75)}b.fine=false;
    s.ahead.position.set(0,hy-1.4,-.3);s.ahead2.position.set(0,hy-1.4,-.3);
    const tongue=(sl,x,z,H,r)=>{b.co(sl,F3,x,H*.42,z,r*1.35,H*.84,0,0,0,5);b.co(sl,F1,x,H/2,z,r,H,0,0,0,5);b.co(sl,F2,x,H*.3,z,r*.5,H*.6,0,0,0,5)};
    tongue('ahead',0,0,21,3);tongue('ahead',3.4,-.8,13,2.2);tongue('ahead',-3.4,-.8,13,2.2);
    tongue('ahead2',1.8,1.9,10,1.9);tongue('ahead2',-1.9,1.7,11,1.9);tongue('ahead2',0,-2.8,16,2.4);tongue('ahead2',4.6,1,7.5,1.5);tongue('ahead2',-4.6,1,7.5,1.5);
    for(const k of[-1,1]){b.co('aback',F1,k*8,20.6,-.5,1.9,6.5,0,0,0,5);b.co('aback',F2,k*8,19.6,-.5,.95,3.8,0,0,0,5)}
    b.fine=true;
    for(const[x,y,w,h,rz]of[[0,12,.7,7,.2],[-1.7,9,.6,4,-.5],[1.9,14.6,.6,3.6,.7],[2.5,10,.5,3,-.3],[-2.7,14,.5,3.4,.4]])b.bx('torso',Em,x,y,3.6+Math.max(0,y-9)*.12,w,h,.5,0,0,rz);
    b.bx('torso',Em,0,11.5,-4.2,.7,9,.5,0,0,.1);b.bx('torso',Em,1.8,14,-4.3,.5,4,.5,0,0,-.6);
    for(const f of['foreL','foreR']){b.to(f,Em,0,-3,0,2.05,.34);b.to(f,Em,0,-6.6,0,1.85,.34)}
    for(const l of['shinL','shinR'])b.bx(l,Em,0,-6,1.95,.5,7,.4,0,0,.15);
    for(const u of['legL','legR'])b.bx(u,Em,.6,-7,2.6,.5,6,.4,0,0,-.2);
    b.fine=false;
    fdisc(b,'aground',decal(0x070302,.3),0,0,47,.48,28);fdisc(b,'aground',decal(0x070302,.6),0,0,36,.5,28);
    const g1=glow(gp,.75),g2=glow(gp2,.8);
    for(let i=0;i<8;i++){let a=i*TAU/8+hr(i)*.5,x=Math.cos(a)*5,z=Math.sin(a)*5;for(let j=0;j<3;j++){a+=(hr(i*5+j)-.5)*1.1;const L=6+hr(i+j*9)*6,x2=x+Math.cos(a)*L,z2=z+Math.sin(a)*L;
      fseg(b,'aground',g1,x,z,x2,z2,2-j*.4,.58);if(!j)fseg(b,'aground',g2,x,z,x2,z2,.8,.6);x=x2;z=z2}}
    b.put('aground',glow(gp,.36),gRing(.93,40,0,TAU),0,.56,0,-HP,0,0,37,37,1);
    for(let i=0;i<11;i++){const a=i*TAU/11+hr(i+30)*.3,d=37+hr(i+40)*6;fmark(b,'aground',glow(i%3?gp:gp2,.65),Math.cos(a)*d,Math.sin(a)*d,a,2.4+hr(i)*2,1.4,.6)}
    b.put('awave',W,gRing(.88,36,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  },
  // The Split Sky: hair and two long streamers blown straight back, a shard of lightning hanging behind the shoulders, arcs crawling over the body,
  // a forked scorch that stutters on the floor
  storm(b,s,ud,c,A,gp,gp2,W){
    const Y=lit(A.a,1.8,0xfffbe0),Yg=glow(A.a,.45),Wh=glow(0xfffbe0,.95),Sl=mat(0xc9d2f0,{emissive:0x6a78c8,emissiveIntensity:.35}),hy=headY(c);
    s.ahead.position.set(0,hy-2.8,-1);
    for(const[x,y,l,r]of[[0,2,15,2.1],[2.6,1.2,12,1.8],[-2.6,1.2,12,1.8],[1.3,-.6,10,1.6],[-1.3,-.6,10,1.6],[4.2,-.8,8,1.4],[-4.2,-.8,8,1.4]])b.spike('ahead',Y,x,y,-1,x*.05,.3,-1,l,r,.6);
    s.aback.position.set(0,17.6,-4.2);s.aback2.position.set(0,-1.6,-15);
    for(const k of[-1,1]){b.bx('aback',Sl,k*4.6,-.8,-7.5,2.2,.5,15.4,.1,k*-.1,0);b.bx('aback2',Sl,k*5.6,-.4,-7,1.7,.4,14.5,-.04,k*-.12,0);b.spike('aback2',Sl,k*6.4,-.1,-14,k*.15,0,-1,8,.9,.2);b.spike('aback2',Sl,k*7.2,-.1,-12,k*.5,0,-1,6,.7,.2);
      b.fine=true;b.bx('aback',Y,k*4.6,-.4,-7.5,.6,.5,14.6,.1,k*-.1,0);b.bx('aback2',Y,k*5.6,-.1,-7,.5,.4,14,-.04,k*-.12,0);b.fine=false}
    b.fine=true;
    const BOLT=[-5,90,4.4,76,-3.2,74.4,5.6,61,-1.4,59.6,3.4,46];zig(b,'aorb',Y,BOLT,-12,2.6);b.spike('aorb',Y,3.4,46,-12,.15,-1,0,7,1.7);
    for(const f of['foreL','foreR'])b.to(f,Y,0,-7,0,2.4,.36);
    b.fine=false;zig(b,'aorb',glow(A.a,.28),BOLT,-9,5.6);
    const ARC=[[-4,47,2,43,-3,39,3,35],[5,45,-1,41,4,36],[-2,30,3,26,-3,21,2,17],[4,58,-2,55,3,51],[-3,14,2,10,-2,5],[3,33,-3,29,1,24]],AZ=[5.5,-6,5,3,4.5,-6.5],AX2=[0,2,-9,0,3,9];
    for(let i=0;i<6;i++){zig(b,'it'+i,Wh,ARC[i].map((v,j)=>j%2?v:v+AX2[i]),AZ[i],.75);zig(b,'it'+i,Yg,ARC[i].map((v,j)=>j%2?v:v+AX2[i]),AZ[i],2.4)}
    fdisc(b,'aground',decal(0x04050c,.42),0,0,31,.5,20);
    for(let i=0;i<8;i++)b.put('aground',glow(gp,.42),gRing(.95,6,i*TAU/8,.5),0,.56,0,-HP,0,0,39,39,1);
    const fork=(slot,seed)=>{for(let i=0;i<5;i++){let a=i*TAU/5+hr(seed+i)*.7,x=Math.cos(a)*5,z=Math.sin(a)*5;for(let j=0;j<4;j++){a+=(hr(seed+i*7+j)-.5)*1.3;const L=7+hr(seed+i+j*3)*6,x2=x+Math.cos(a)*L,z2=z+Math.sin(a)*L;
      fseg(b,slot,glow(gp,.7),x,z,x2,z2,2.4-j*.4,.6);if(j===1){const a3=a+(hr(seed+i)>.5?.9:-.9);fseg(b,slot,glow(gp2,.6),x2,z2,x2+Math.cos(a3)*9,z2+Math.sin(a3)*9,1.2,.6)}x=x2;z=z2}}};
    fork('aground2',1);fork('awave2',40);
    b.put('awave',W,gRing(.93,36,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  },
  // The Standing Stone: slab pauldrons wider than the body, a ring of standing stones in slow orbit (one per guard plate left), the floor broken into flags
  stone(b,s,ud,c,A,gp,gp2,W){
    const Gr=mat(0x858891),GrD=mat(0x5a5d68),GrL=mat(0xa9acb4),Fi=lit(A.a,1.4,0xffe0a0),hy=headY(c);
    for(const[u,k]of[['armL',1],['armR',-1]]){b.bx(u,Gr,k*2.8,2.8,0,11,4.8,10,0,0,k*-.16);b.bx(u,GrD,k*5,-.6,0,7.8,3.5,8.6,0,0,k*-.3);b.bx(u,GrL,k*1.4,5.7,-.4,6.2,2.1,7.2,0,0,k*-.1);
      b.fine=true;b.bx(u,Fi,k*3,2.8,5.1,5.4,.55,.3,0,0,k*.3);b.bx(u,Fi,k*4.6,3.6,5.1,.55,2.6,.3);b.bx(u,Fi,k*8.4,2,0,.3,.55,6,0,0,k*-.16);b.fine=false}
    b.bx('aback',GrD,0,18.7,-2.8,13.5,3.5,4.6);b.bx('aback',Gr,0,12.4,4.6,5.6,6.6,1.6,0,0,PI/4);
    b.fine=true;b.bx('aback',Fi,0,12.6,5.5,.55,4.8,.3);b.bx('aback',Fi,0,13.6,5.5,2.8,.55,.3);b.fine=false;
    for(const f of['foreL','foreR'])b.bx(f,Gr,0,-5.2,0,4.8,5.6,4.8);
    for(const l of['shinL','shinR'])b.bx(l,GrD,0,-1.4,1.7,4.6,4.2,3.2);
    s.ahead.position.set(0,hy-2.2,0);b.bx('ahead',Gr,0,-.4,3.7,7.8,1.9,2.6,-.2);b.fine=true;b.bx('ahead',Fi,0,-.4,5.05,3,.5,.3,-.2);b.fine=false;
    for(let i=0;i<4;i++){const sl='it'+i,a=i*TAU/4+PI/4;s[sl].position.set(Math.cos(a)*28,0,Math.sin(a)*28);s[sl].rotation.y=HP-a;
      b.bx(sl,i%2?Gr:GrL,0,13.5,0,9.6,27,3.6,0,0,(i%2?.04:-.05));b.bx(sl,i%2?Gr:GrL,.6,28,0,7.4,3.2,3.2,0,0,.12);b.bx(sl,i%2?Gr:GrL,-3.4,1.6,.4,4.4,3.2,4.4,0,.3,0);
      b.fine=true;for(const z of[1.95,-1.95]){b.bx(sl,Fi,0,15.5,z,.75,12.5,.3);b.bx(sl,Fi,1.7,20,z,3.2,.65,.3,0,0,.6);b.bx(sl,Fi,-1.7,20,z,3.2,.65,.3,0,0,-.6);b.bx(sl,Fi,0,9.6,z,3.8,.65,.3)}b.fine=false;
      fdisc(b,sl,glow(gp,.3),0,0,9,.7,12,5.5)}
    const D=decal(0x050408,.72),pts=[],N=7;
    for(let i=0;i<N;i++){const a=i*TAU/N+hr(i+3)*.4,r1=20+hr(i+9)*6,r2=40+hr(i+5)*10,mx=Math.cos(a)*r1,mz=Math.sin(a)*r1,a2=a+(hr(i)-.5)*.7;
      fseg(b,'aground',D,0,0,mx,mz,3.4,.5);fseg(b,'aground',D,mx,mz,mx+Math.cos(a2)*(r2-r1),mz+Math.sin(a2)*(r2-r1),2.6,.5);fseg(b,'aground',glow(gp,.5),mx*.25,mz*.25,mx,mz,1,.56);pts.push(mx,mz)}
    for(let i=0;i<N;i++){const j=(i+1)%N;fseg(b,'aground',D,pts[i*2],pts[i*2+1],pts[j*2],pts[j*2+1],2.2,.5)}
    fdisc(b,'aground',decal(0x050408,.22),0,0,34,.46,7);
    b.put('awave',W,gRing(.94,7,0,TAU),0,.66,0,-HP,0,0,1,1,1);
  },
  // The Thousandth Cut: a splayed tail of floating swords behind the back (one per blade held) that swings forward with every blow, the floor scored with cuts
  blade(b,s,ud,c,A,gp,gp2,W){
    const St=lit(0xeef2ff,1.1,0xf4f6ff),Ed=lit(A.a,1.7,0xdfe4ff),Gm=mat(0x2a2e44),Gd=lit(C.gold,.5),Gl=glow(A.a,.22);
    s.items.position.set(0,HIP+7,-3);
    const PHI=[.32,-.32,.95,-.95,1.6,-1.6];
    for(let i=0;i<6;i++){const sl='it'+i,p=PHI[i];s[sl].position.set(Math.sin(p)*9,0,-Math.cos(p)*9);s[sl].rotation.set(-.62,-p,0);
      b.cy(sl,Gd,0,4.2,0,.7,.7,4.6,0,0,0,1,6);b.sp(sl,Gd,0,1.5,0,1.05);b.bx(sl,Gd,0,6.9,0,6.6,1.05,1.4);
      b.bx(sl,St,0,20.5,0,2.7,26,.75);b.spike(sl,St,0,33.5,0,0,1,0,5.5,1.35,.28);
      b.fine=true;b.bx(sl,Ed,1.5,20.5,0,.45,26,.85);b.bx(sl,Ed,-1.5,20.5,0,.45,26,.85);b.fine=false;
      b.bx(sl,Gl,0,22,0,7,33,.3)}
    b.fine=true;for(const f of['foreL','foreR']){b.to(f,Ed,0,-7,0,2.4,.36);b.spike(f,St,0,-3,-1.6,0,.5,-1,5,1.1,.3)}b.fine=false;
    for(const[u,k]of[['armL',1],['armR',-1]]){b.spike(u,St,k*2.6,1.4,0,k*.9,.9,-.2,7,1.6,.3);b.spike(u,Gm,k*2,1,0,k*1,.2,0,5,2,.4)}
    const D=decal(0x04040a,.55),g1=glow(gp,.7),g2=glow(gp2,.8);
    for(const[a,o,L]of[[-.2,3,66],[.9,-6,60],[2.0,8,62],[2.75,-2,54],[1.45,15,46],[.4,-18,48]]){const x=Math.sin(a)*o,z=Math.cos(a)*o;fmark(b,'aground',D,x,z,a,L,2.8,.5);fmark(b,'aground',g1,x,z,a,L*.92,1,.58);fmark(b,'aground',g2,x,z,a,L*.4,.5,.6)}
    b.put('aground',glow(gp,.4),gRing(.975,48,0,TAU),0,.56,0,-HP,0,0,38,38,1);
    for(let i=0;i<12;i++)b.put('aground',glow(gp2,.5),gRing(.9,2,i*TAU/12-.012,.024),0,.58,0,-HP,0,0,38,38,1);
    fmark(b,'awave',W,0,0,0,2,.05,.66);
  },
  // The Returning Tide: ribbons of water winding up round the body in two turning coils, foam at the collar, ripples that keep spreading
  tide(b,s,ud,c,A,gp,gp2,W){
    const Wt=mat(0x2fa8dc,{emissive:A.a,emissiveIntensity:.75,transparent:true,opacity:.84}),Fo=lit(0xd8fff8,1.2,0xffffff),Gl=glow(A.a,.18);
    const rib=(sl,y,R,tube,arc,d,rz)=>{b.to(sl,Wt,0,y,0,R,tube,1,arc,HP+d,0,rz);b.to(sl,Gl,0,y,0,R,tube*2.1,1,arc,HP+d,0,rz);
      b.fine=true;for(const u of[rz,rz+arc])b.sp(sl,Fo,R*Math.cos(u),y-R*Math.sin(u)*Math.sin(d),R*Math.sin(u)*Math.cos(d),tube*1.15);b.fine=false};
    rib('aorb',12,14.5,2.2,3.9,.25,0);rib('aorb',40,11.5,1.6,3.3,-.3,2.4);rib('aorb2',26,13,1.9,3.6,.2,1.2);rib('aorb2',53,9,1.2,2.8,.3,4);
    b.fine=true;b.to('aback',Fo,0,18.9,-.6,7.8,1.05,.62);for(const f of['foreL','foreR'])b.to(f,Fo,0,-7,0,2.4,.42);for(const l of['shinL','shinR'])b.to(l,Fo,0,-9.5,0,2.3,.42);b.fine=false;
    for(const k of[-1,1]){b.spike('aback',Wt,k*7.6,18.6,-.6,k*.7,.9,-.5,7,2.2,.5);b.fine=true;b.sp('aback',Fo,k*10.6,23,-2.6,1.2);b.fine=false}
    fdisc(b,'aground',glow(gp,.07),0,0,46,.5,32);
    b.put('aground',glow(gp,.34),gRing(.93,48,0,TAU),0,.56,0,-HP,0,0,21,21,1);b.put('aground',glow(gp,.24),gRing(.955,48,0,TAU),0,.56,0,-HP,0,0,35,35,1);
    for(let i=0;i<5;i++)b.put('aground',glow(gp2,.5),gRing(.9,6,i*TAU/5+.3,.5),0,.58,0,-HP,0,0,28,28,1);
    b.put('awave',W,gRing(.93,48,0,TAU),0,.66,0,-HP,0,0,1,1,1);b.put('awave2',ud.apexMat2,gRing(.95,48,0,TAU),0,.64,0,-HP,0,0,1,1,1);
  }
};
const flick=(t,rate,i)=>{const v=Math.sin((Math.floor(t*rate)+i*7.13)*12.9898)*43758.5453;return v-Math.floor(v)};
// what moves on the eight newer paths, every frame (no allocation): show = the rig is not blinked out
function apexAnim(ud,s,P,t,dt,show,mb,dl,ab,yv){
  const ap=ud.apex,W=ud.apexMat;let q,w,n,i;
  s.aorb.visible=s.aorb2.visible=s.items.visible=show;
  if(ap==='beasts'){
    s.ahead.rotation.set(-mb*.05,0,Math.sin(t*1.3)*.03-yv*.3);
    q=(t*.5)%1;w=20+46*q;s.awave.scale.set(w,1,w);W.opacity=.45*(1-q)*(1-q);
    n=cnt(P.pack,0,6);s.items.rotation.y=t*.55;for(i=0;i<6;i++)s['it'+i].visible=i<n;
  }else if(ap==='frost'){
    s.aorb.rotation.set(.16,t*.28,.05*Math.sin(t*.5));s.aorb.position.y=27+Math.sin(t*1.1)*.8;
    s.aground.rotation.y=s.awave.rotation.y=t*.04;const f=1+.02*Math.sin(t*1.4);s.aground.scale.set(f,1,f);
    q=(t*.3)%1;w=12+52*q;s.awave.scale.set(w,1,w);W.opacity=.5*(1-q);
  }else if(ap==='plague'){
    s.aorb.rotation.y=t*.5;s.aorb.position.y=Math.sin(t*.8)*2;s.aorb2.rotation.set(.08*Math.sin(t*.6),-t*.33,0);s.aorb2.position.y=Math.sin(t*.63+2)*2.5;
    const f=1+.025*Math.sin(t*3.1);s.aback.scale.set(f,f,f);
    const bl=ud.blots,k=Math.floor(t*.6)%5;q=(t*.6)%1;w=bl[k][2]*(.3+.95*q);s.awave.position.set(bl[k][0],0,bl[k][1]);s.awave.scale.set(w,1,w);W.opacity=.55*(1-q);
  }else if(ap==='flame'){
    s.ahead.scale.set(1+.08*Math.sin(t*13),1+.2*Math.sin(t*11)+.1*Math.sin(t*23.7),1+.08*Math.sin(t*17));
    s.ahead2.scale.set(1+.1*Math.sin(t*15+1),1+.24*Math.sin(t*14+2)+.1*Math.sin(t*29),1+.1*Math.sin(t*19+2));
    s.ahead.rotation.set(-mb*.4-dl*.5,0,Math.sin(t*5)*.06-yv*.5);s.ahead2.rotation.set(-mb*.5-dl*.5,0,Math.sin(t*6.3+1)*.08-yv*.6);
    s.ahead.visible=s.ahead2.visible=show;
    const f=1+.03*Math.sin(t*6);s.aground.scale.set(f,1,f);
    q=(t*.9)%1;w=16+38*q;s.awave.scale.set(w,1,w);W.opacity=.5*(1-q)*(1-q);
  }else if(ap==='storm'){
    const hs=typeof P.haste==='number'&&P.haste>0?Math.min(1,P.haste):0;ud.hsK+=(hs-ud.hsK)*Math.min(1,dt*6);const h=ud.hsK;
    s.ahead.rotation.set(Math.sin(t*11)*.05*(1+h)+mb*.1,0,Math.sin(t*8.3)*.04);
    s.aback.rotation.set(-.42+mb*.42+h*.18+dl*.2+Math.sin(t*9)*.07*(1+h),0,-yv);s.aback2.rotation.set(-.2+mb*.25+Math.sin(t*9-1.2)*.22*(1+h*.6),Math.sin(t*6.1)*.1,-yv*.8);
    s.aorb.visible=show&&flick(t,11,0)>.14;s.aorb.scale.x=flick(t,5,3)>.5?1:-1;s.aorb.position.y=Math.sin(t*2.2)*1.2;
    for(i=0;i<6;i++){const o=s['it'+i];o.visible=flick(t,14,i)<.3+.5*h;o.rotation.y=Math.floor(t*14)*2.4+i}
    w=flick(t,9,5)>.45;s.aground2.visible=w;s.awave2.visible=!w&&flick(t,9,6)>.25;
    q=(t*(1.5+h))%1;w=14+42*q;s.awave.scale.set(w,1,w);W.opacity=.5*(1-q)*(1-q);
  }else if(ap==='stone'){
    s.items.rotation.y=t*.32;n=cnt(P.plates,3,4);
    for(i=0;i<4;i++){const o=s['it'+i];o.visible=i<n;o.position.y=1.6+Math.sin(t*1.4+i*1.7)*1.3}
    q=(t*.25)%1;w=28+34*q;s.awave.scale.set(w,1,w);W.opacity=.4*(1-q)*(1-q);
  }else if(ap==='blade'){
    n=cnt(P.blades,4,6);const e=ab*ab*(3-2*ab);
    s.items.rotation.set(e*1.3-mb*.14-dl*.3,Math.sin(t*.9)*.07-yv*.5,0);s.items.position.set(0,HIP+7+e*5,-3+e*4);
    for(i=0;i<6;i++){const o=s['it'+i];o.visible=i<n;o.rotation.x=-.62*(1-e*.75)+Math.sin(t*1.7+i*1.3)*.04;o.position.y=Math.sin(t*2+i*1.9)*.9}
    q=(t/.9)%1;w=Math.floor(t/.9)*2.4;s.awave.rotation.y=w;s.awave.position.set(Math.sin(w*1.7)*8,0,Math.cos(w*2.3)*8);w=40*Math.min(1,q*5);s.awave.scale.set(w,1,w*.6+3);W.opacity=.85*(1-q)*(1-q);
  }else if(ap==='tide'){
    s.aorb.rotation.y=t*1.3;s.aorb2.rotation.y=-t*1+1;s.aorb.position.y=Math.sin(t*1.7)*1.2;s.aorb2.position.y=Math.sin(t*1.5+2)*1.2;
    const f=1+.05*Math.sin(t*2);s.aground.scale.set(f,1,f);
    q=(t*.55)%1;w=14+48*q;s.awave.scale.set(w,1,w);W.opacity=.5*(1-q);
    q=(t*.55+.5)%1;w=14+48*q;s.awave2.scale.set(w,1,w);ud.apexMat2.opacity=.5*(1-q);
  }
}

function buildWeapon(b,s,ud,skin,c,adv,tier){
  const acc=c?(adv&&ACC2[adv])||ACC[c]:C.bone,K=1.1+tier*.1+(adv?.4:0),edge=lit(acc,K,0xffffff);
  const gold=lit(C.gold,adv?.5:.12),lea=mat(0x241c22),B=lit(C.bone,.18);
  const staff=(hex,lo,hi)=>{b.cy('wepR',mat(hex),0,(lo+hi)/2,0,.7,.85,hi-lo,0,0,0,1,6);b.spike('wepR',mat(hex),0,lo,0,0,-1,0,3,.85);s.orb.position.set(0,hi+3.4,0)};
  ud.wtype='club';
  if(!c){b.bone('wepR',B,0,-2.6,0,0,15,0,1.05,1.5,0);b.sp('wepR',B,-1.2,15.6,0,1.9);b.sp('wepR',B,1.2,15.6,0,1.9)}
  else if(c==='fighter'){sword(b,'wepR',27,5.2,5.5,edge,gold,true);ud.wtype='great'}
  else if(c==='tank'){sword(b,'wepR',21,3.4,3.4,edge,gold,false);ud.wtype='sword'}
  else if(c==='assassin'){knife(b,'wepR',edge,gold);knife(b,'wepL',edge,gold);ud.wtype='dual'}
  else if(c==='mage'){const col=adv==='pyromancer'?0xff8a4c:pal('power',0x8b4dff),hot=lit(col,1.6,0xffffff);staff(0x221c3a,-24,24);ud.wtype='staff';
    // crescent head cradling a floating crystal
    b.to('wepR',mat(0x221c3a),0,27.6,0,4.3,.75,1,PI*1.25,0,0,-PI*.125+PI);b.fine=true;b.to('wepR',lit(col,K),0,24.2,0,1.1,.4);b.fine=false;
    b.co('orb',hot,0,1.6,0,1.9,3.2,0,0,0,4);b.co('orb',hot,0,-1.6,0,1.9,3.2,PI,0,0,4);b.sp('orb',glow(col,.3),0,0,0,4.6);
    if(adv==='archmage')for(let i=0;i<3;i++){const a=i*TAU/3;b.co('spin',hot,Math.cos(a)*6.4,Math.sin(a*2)*1.2,Math.sin(a)*6.4,.8,2.8,0,0,0,4)}
    if(adv==='pyromancer')b.co('orb',glow(0xffb347,.5),0,4.6,0,2.2,6.4,0,0,0,5)}
  else if(c==='healer'){staff(0xb99a5a,-24,23);ud.wtype='staff';const hl=lit(acc,1.4,0xfff4c8);
    b.sp('orb',hl,0,0,0,2.4);b.sp('orb',glow(acc,.28),0,0,0,5);
    b.fine=true;b.to('spin',lit(C.gold,.6),0,0,0,4.3,.5,1,0,0);for(let i=0;i<8;i++){const a=i*TAU/8;b.spike('spin',hl,Math.cos(a)*4.6,Math.sin(a)*4.6,0,Math.cos(a),Math.sin(a),0,i%2?2:3.4,.6,.5)}b.fine=false}
  else if(c==='necro'){staff(0x2a2226,-24,22);ud.wtype='staff';const g=lit(acc,1.7,0xffffff);
    b.sp('orb',B,0,.4,0,3.2,.95,1,1.05);b.bx('orb',B,0,-2.2,.8,3.4,1.9,3.3);b.spike('orb',B,-2.2,2,-.6,-.6,1,-.3,3,.8);b.spike('orb',B,2.2,2,-.6,.6,1,-.3,3,.8);
    b.fine=true;b.sp('orb',g,-1.2,.5,2.7,1);b.sp('orb',g,1.2,.5,2.7,1);b.co('orb',mat(C.dark),0,-.9,3.1,.5,1.1,0,0,0,3,.5);b.fine=false;
    b.sp('orb',glow(acc,.2),0,0,0,5.6);
    if(adv==='reaper'){const bl=mat(0x3a3f52,{side:T.DoubleSide});b.to('wepR',bl,0,8.5,8.2,11.5,1.3,.4,1.25,0,-HP,.55);b.to('wepR',edge,0,8.5,8.2,10.4,.45,.5,1.25,0,-HP,.55);b.bx('wepR',mat(0x2a2226),0,19.6,1.3,1.3,1.3,4.4)}}
  else if(c==='ranger'){ud.wtype='bow';const wood=mat(0x6a5a52),R=18,ha=.8,H=R*Math.sin(ha);ud.bowH=H;
    // recurve bow in the left hand: arc bulging forward (+Z), tips flicking forward, a lit string whose halves stretch in update()
    b.to('wepL',wood,0,0,-R*Math.cos(ha),R,.85,1,ha*2,0,-HP,-ha);b.cy('wepL',lea,0,0,R-R*Math.cos(ha),1.2,1.2,5.4);
    const tip=adv==='sharpshooter'?gold:wood;b.spike('wepL',tip,0,H-.6,-.3,0,1,.9,4.2,1);b.spike('wepL',tip,0,-H+.6,-.3,0,-1,.9,4.2,1);
    b.fine=true;b.bx('wepL',edge,0,5.6,R-R*Math.cos(ha)-.6,.5,4,.5);b.bx('wepL',edge,0,-5.6,R-R*Math.cos(ha)-.6,.5,4,.5);
    s.strA.position.set(0,H,0);s.strB.position.set(0,-H,0);
    b.cy('strA',edge,0,-.5,0,.26,.26,1,0,0,0,1,4);b.cy('strB',edge,0,.5,0,.26,.26,1,0,0,0,1,4);b.fine=false}
}

function rebuildPlayer(g,MB){
  const ud=g.userData,s=ud.s,S=MB.S,st=stageOf(MB),skin=!!(st&2),c=skin&&MB.cls()||null,adv=c&&S.adv||null,apex=c?apexOf(MB):null,tier=c?(apex?Math.max(8,tierOf(S)):tierOf(S)):0;
  clearSlots(s);
  for(const k in s){if(k!=='rig'&&k!=='hips'){s[k].position.set(0,0,0)}s[k].rotation.set(0,0,0);s[k].scale.set(1,1,1);s[k].visible=true}
  s.hips.position.set(0,HIP,0);s.legL.position.set(2.9,0,0);s.legR.position.set(-2.9,0,0);s.shinL.position.set(0,-UL,0);s.shinR.position.set(0,-UL,0);
  s.foreL.position.set(0,-UA,0);s.foreR.position.set(0,-UA,0);s.handL.position.set(0,-FA,0);s.handR.position.set(0,-FA,0);
  ud.cls=c;ud.adv=adv;ud.apex=apex;ud.skin=skin;ud.robe=false;ud.tier=tier;ud.shY=9.4;ud.haloY=12.6;ud.bowH=13;
  // versus: an opponent's marks on the floor (upgrade aura, skill-ready ring, the apex ground and aura) are laid in the foe palette; the body is untouched
  const foe=MB.foe===true;ud.foe=foe;
  const AXP=APX[apex],b=new Builder(s),pw=foe?pal('foe',0xff2d55):AXP?AXP.a:pal('power',0x8b4dff),pw2=foe?pal('foe2',0xffb0a0):AXP?AXP.h:pal('power2',0xc4f4ff),acc=c?(adv&&ACC2[adv])||ACC[c]:C.bone; // (a newer path: the upgrade aura and the ready ring take its colours)
  if(skin)buildHuman(b,s,ud,st,c,adv,tier,apex);else buildSkeleton(b,s,!!(st&1));
  if(apex){const W=ud.apexMat||(ud.apexMat=slashMat()),AX=APX[apex];W.color.setHex(foe?pal('foe',0xff2d55):AX?AX.a:apex==='dominion'?pal('power',0x8b4dff):pal('power2',0xc4f4ff));
    if(apex==='tide'){const W2=ud.apexMat2||(ud.apexMat2=slashMat());W2.color.copy(W.color)}
    buildApex(b,s,ud,c,apex,tier)}
  buildWeapon(b,s,ud,skin,c,adv,tier);
  // ground effects: upgrade aura, skill-ready ring, melee slash arc
  if(adv){b.put('aura',glow(pw,.42),gRing(.9,8,0,TAU),0,.7,0,-HP,0,0,24,24,1);b.put('aura',glow(pw2,.4),gRing(.95,28,0,TAU),0,.7,0,-HP,0,0,28.5,28.5,1);b.put('aura',glow(pw,.1),gRing(.01,20,0,TAU),0,.6,0,-HP,0,0,21.6,21.6,1)}
  b.put('ready',glow(pw,.6),gRing(.9,28,0,TAU),0,.9,0,-HP,0,0,19,19,1);b.put('ready',glow(pw2,.5),gRing(.8,4,0,TAU),0,.95,0,-HP,0,0,14.5,14.5,1);
  const full=c==='fighter'&&MB.pw(1),R=c?(full?74:62):54;ud.full=full;
  const SLASH=ud.slashMat||(ud.slashMat=slashMat());SLASH.color.setHex(c?acc:C.bone).lerp(_white,.45);
  if(full){b.put('slash',SLASH,gRing(.93,48,0,TAU),0,0,0,-HP,0,0,R,R,1);b.put('slash',SLASH,gRing(.975,40,0,TAU),0,0,0,-HP,0,0,R*.8,R*.8,1)}else b.put('slash',SLASH,gRing(.62,14,-HP-1.15,2.3),0,0,0,-HP,0,0,R,R,1);
  s.slash.position.set(0,32,0);
  b.flush();
  ud.shieldMeshes.length=0;ud.shieldOn=null;
  for(const m of s.shield.children)if(m.userData.part)ud.shieldMeshes.push(m,m.material,dimOf(m.material));
  // power wisps: more of them with an upgrade and with every rank
  ud.nw=Math.min(WISPS,(adv?3:0)+Math.max(0,tier-1));ud.auraK=0;ud.ascK=0;
  {const AX=APX[apex],c1=AX?AX.a:pal('power',0x8b4dff),c2=AX?AX.h:pal('power2',0xc4f4ff);   // the rising wisps take a newer path's colours (cached variants; the old ones are what create() gave them)
    for(let i=0;i<WISPS;i++){const w=ud.wisps[i];w.visible=false;w.material=glow(i%3===2?c2:c1,i%3===2?.5:.6)}}
  ink(g,.75);
}
const _white=new T.Color(0xffffff);

function lerpAng(a,b,k){let d=(b-a)%TAU;if(d>PI)d-=TAU;else if(d<-PI)d+=TAU;return a+d*k}

const player={
  drawsSlash:true,drawsAura:true,drawsReadyRing:true,   // hints for the renderer: these ground effects are already part of the model
  create(MB){
    const g=new T.Group();g.name='player';const s=mkSlots(g,P_TREE);
    g.userData={s,key:'',rot:null,mb:0,ab:0,k:1,dl:0,yv:0,atkDur:.16,lastAtk:0,cls:null,adv:null,skin:false,robe:false,wtype:'club',full:false,shieldMeshes:[],slashMat:slashMat(),shieldOn:null,
      wisps:[],nw:0,tier:0,shY:9.4,haloY:12.6,bowH:13,apex:null,apexMat:null,apexMat2:null,crownY:11,auraK:0,ascK:0,hsK:0};
    for(let i=0;i<6;i++)s['it'+i].rotation.order='YXZ';
    // rising wisps of power: a fixed handful of shared-geometry meshes, placed in update()
    const wg=new T.Group();wg.name='wisps';g.add(wg);
    for(let i=0;i<WISPS;i++){const w=new T.Mesh(gCone(4),glow(i%3===2?pal('power2',0xc4f4ff):pal('power',0x8b4dff),i%3===2?.5:.6));w.castShadow=false;w.userData.noOutline=true;w.visible=false;wg.add(w);g.userData.wisps.push(w)}
    if(MB&&MB.S)try{player.update(g,MB.P||{x:0,y:0,face:HP,walk:0,hp:3,maxHp:3},MB,0)}catch(e){}
    return g;
  },
  update(g,P,MB,dt){
    const ud=g.userData,s=ud.s,S=MB.S,t=S.t||0;dt=dt||0;
    const key=stageOf(MB)+'|'+(MB.cls()||'')+'|'+(S.adv||'')+'|'+(MB.pw(1)?1:0)+'|'+tierOf(S)+'|'+(apexOf(MB)||'')+(MB.foe===true?'|foe':'');
    if(key!==ud.key){ud.key=key;rebuildPlayer(g,MB)}
    const c=ud.cls,wt=ud.wtype,atk=P.atk>0,mel=wt!=='staff'&&wt!=='bow';
    // facing (and how fast it is turning, for the cloth)
    const tr=HP-(atk?P.swing:P.face),r0=ud.rot;
    ud.rot=ud.rot==null||atk?tr:lerpAng(ud.rot,tr,Math.min(1,dt*18));g.rotation.y=ud.rot;
    if(r0!=null&&dt>0){let dr=(ud.rot-r0)%TAU;if(dr>PI)dr-=TAU;else if(dr<-PI)dr+=TAU;dr=dr/dt;dr=dr>7?7:dr<-7?-7:dr;ud.yv+=(dr-ud.yv)*Math.min(1,dt*7)}
    const yv=ud.yv*.045;
    // attack progress k 0..1 and a blend that lingers briefly after the swing so the pose reads
    if(atk){if(P.atk>ud.lastAtk)ud.atkDur=Math.max(P.atk,.05);ud.k=Math.min(1,Math.max(0,1-P.atk/ud.atkDur));ud.ab=1}else ud.ab=Math.max(0,ud.ab-dt*(mel?9:6));
    ud.lastAtk=P.atk>0?P.atk:0;
    const k=ud.k,ab=ud.ab*ud.ab*(3-2*ud.ab);
    ud.mb+=((P.moving?1:0)-ud.mb)*Math.min(1,dt*12);ud.dl+=((P.dashT>0?1:0)-ud.dl)*Math.min(1,dt*24);
    const mb=ud.mb,dl=ud.dl,sw=Math.sin(P.walk||0)*mb,cw=Math.cos(P.walk||0)*mb,br=Math.sin(t*2.4);
    const rig=s.rig;
    // blink while invulnerable
    rig.visible=!(P.inv>0&&Math.floor(t*18)%2);
    // rattle: a numb body on its last health shakes
    const rat=!MB.has('touch')&&P.hp<=2&&S.mode==='play'?1:0;
    rig.position.set(rat*Math.sin(t*70)*1.3,-Math.abs(sw)*1.2-dl*2.5,rat*Math.sin(t*57)*.6);
    rig.rotation.x=mb*.1+dl*.5+(mel?0:ab*.08);rig.scale.set(1-dl*.06,1-dl*.1,1+dl*.2);
    // legs: a long stride, the back leg kicking out on a dash
    const LA=ud.robe?.6:.72;
    s.legL.rotation.x=-sw*LA-dl*.9;s.legR.rotation.x=sw*LA+dl*.3;s.legL.rotation.z=.05;s.legR.rotation.z=-.05;
    s.shinL.rotation.x=Math.max(0,cw)*LA*1.2+dl*.9+mb*.12;s.shinR.rotation.x=Math.max(0,-cw)*LA*1.2+dl*.5+mb*.12;
    s.hips.rotation.y=sw*.14;
    // rest pose per weapon type: [R arm x, R elbow, weapon tilt, L arm x, L elbow, R swing, L swing]
    let rx=-.25,re=-.6,tilt=.62,lx=0,le=-.18,fr=.5,fl=1,ltilt=1,rz=-.15,lz=.15;
    if(wt==='great'){rx=-.2;re=-.7;tilt=.2;fr=.35;rz=-.24}
    else if(wt==='sword'){lx=-.45;le=-1.05;fl=.15}
    else if(wt==='dual'){rx=-.2;re=-.8;tilt=.75;lx=-.2;le=-.8;ltilt=.75;fl=.6;fr=.6;rz=-.3;lz=.3}
    else if(wt==='staff'){rx=-.55;re=-.75;tilt=.05;fr=.12}
    else if(wt==='bow'){rx=0;re=-.2;lx=-.4;le=-.7;ltilt=.12;fl=.2;fr=1}
    rx-=sw*.6*fr;lx+=sw*.6*fl;re-=Math.max(0,-sw)*.3*fr+mb*.25*fr;le-=Math.max(0,sw)*.3*fl+mb*.25*fl;
    let twist=-sw*.18,spin=0;
    // attack pose, blended in by ab
    if(ab>0){
      const e=k*k*(3-2*k);
      if(wt==='staff'){rx+=(-1.35-rx)*ab;re+=(-.2-re)*ab;tilt+=(1.05-tilt)*ab;twist+=.25*ab}
      else if(wt==='bow'){lx+=(-1.5-lx)*ab;le+=(0-le)*ab;ltilt+=(0-ltilt)*ab;rx+=(-1.15-rx)*ab;re+=(-1.9-re)*ab;twist-=.3*ab}
      else{
        rx+=(-1.3-rx)*ab;re+=(-.12-re)*ab;tilt+=(1.42-tilt)*ab;rz+=-.3*ab;
        if(ud.full)spin=e*TAU;else twist+=(-1.2+2.4*e)*ab;
        if(wt==='dual'){lx+=(-1.35-lx)*ab;le+=(-.15-le)*ab;ltilt+=(1.45-ltilt)*ab}
        if(wt==='great'){lx+=(-1.1-lx)*ab;le+=(-.5-le)*ab;lz+=-.5*ab}
      }
    }
    rx+=dl*.9*(mel?1:.3);lx+=dl*.8;rz-=dl*.25;lz+=dl*.25;
    s.torso.rotation.set(mb*.07+(mel?ab*.14:0),twist+spin,0);s.torso.position.y=br*.22;s.torso.scale.y=1+br*.01;
    s.armR.rotation.set(rx,0,rz+rat*Math.sin(t*83)*.14);s.foreR.rotation.x=re;
    s.armL.rotation.set(lx,0,lz+rat*Math.sin(t*77)*.14);s.foreL.rotation.x=le;
    s.wepR.rotation.x=tilt-(rx+re)-s.torso.rotation.x-rig.rotation.x*.6;
    s.wepL.rotation.x=ltilt-(lx+le)-s.torso.rotation.x-rig.rotation.x*.6;
    s.head.rotation.set(-dl*.3-mb*.08+(ud.skin?br*.015:0),-(twist)*.7,rat*Math.sin(t*61)*.13);
    // skeleton only: chattering jaw, beating heart, breathing lungs
    if(!ud.skin){
      s.jaw.rotation.x=(P.moving?Math.abs(Math.sin((P.walk||0)*1.5))*.42:atk?.55:0)+rat*(.12+.12*Math.sin(t*45));
      const beat=1+.3*Math.max(0,Math.sin(t*7));s.heart.scale.set(beat,beat,beat);s.lungs.scale.set(1+br*.07,1+br*.03,1+br*.09);
    }
    // cloth: tails, hip panels, cape, scarf and headband trail behind movement, lag a turn and never quite hang still
    const fl1=Math.sin(t*2.7),fl2=Math.sin(t*3.3+1.3),fl3=Math.sin(t*7.1+.6);
    s.coatB.rotation.set(.07+mb*.5+dl*.45+fl1*.04+Math.abs(sw)*.08,0,sw*.06-yv);
    s.coatL.rotation.set(mb*.3+dl*.4-sw*LA*.5+fl2*.03,0,.1+mb*.14+dl*.2+fl1*.03-yv*.6);
    s.coatR.rotation.set(mb*.3+dl*.4+sw*LA*.5+fl1*.03,0,-.1-mb*.14-dl*.2-fl2*.03-yv*.6);
    s.cape.rotation.set(.1+mb*.4+dl*.4+fl1*.04+Math.sin((P.walk||0)*2)*.05*mb,-twist*.5,-yv);
    s.cape2.rotation.set(mb*.26+dl*.3+Math.sin(t*2.7-1)*.07*(.5+mb)+ab*.2,0,-yv*.8);
    s.scarf.rotation.set(.3+mb*.75+dl*.55+fl3*.09*(.4+mb),-twist*.4,.1-yv*1.4);
    s.scarf2.rotation.set(.1+mb*.3+dl*.2+Math.sin(t*7.1-.5)*.16*(.4+mb),0,-yv);
    s.band.rotation.set(.25+mb*.9+dl*.5+fl3*.12*(.4+mb),0,-yv*1.5);
    // class extras
    if(wt==='staff'){const f=1+.55*ab+Math.sin(t*5)*.04;s.orb.scale.set(f,f,f);
      if(c==='necro'){s.orb.position.y=25.4;s.orb.rotation.y=0}else if(c==='healer')s.spin.rotation.z=t;else{s.orb.position.y=27.6+Math.sin(t*2.6)*.5;s.orb.rotation.y=t*1.6;s.spin.rotation.y=t*1.2}}
    if(wt==='bow'){const H=ud.bowH,p=atk?(1-k)*9:0,L=Math.sqrt(H*H+p*p),a=Math.atan2(p,H);s.strA.scale.y=L;s.strB.scale.y=L;s.strA.rotation.x=a;s.strB.rotation.x=-a}
    if(c==='healer'){s.halo.position.y=ud.haloY+Math.sin(t*2)*.5;s.halo.rotation.set(HP-.35,0,t*.6)}
    if(ud.adv){s.aura.rotation.y=t*.6;const f=1+.05*Math.sin(t*3);s.aura.scale.set(f,1,f)}
    // apex: the crown hovers and turns, the shards orbit, the domain breathes and throws its wave; or the halo turns, the wings fan and the aura pulses
    if(ud.apex==='dominion'){
      s.crown.position.y=ud.crownY+Math.sin(t*1.7)*.45;s.crown.rotation.set(-.06+s.head.rotation.x*-.5,t*.35,Math.sin(t*1.1)*.04);
      s.orbA.rotation.set(.16*Math.sin(t*.31),t*.55,.2);s.orbA.position.y=33+Math.sin(t*.9)*1.2;s.orbB.rotation.set(-.14,-t*.4,.12*Math.sin(t*.43));
      s.orbA.visible=s.orbB.visible=rig.visible;
      const f=1+.04*Math.sin(t*1.9);s.dom.scale.set(f,1,f);s.dom.rotation.y=t*.07;
      const q=(t*.42)%1,w=22+52*q;s.domW.scale.set(w,1,w);ud.apexMat.opacity=.5*(1-q)*(1-q);
    }else if(ud.apex==='order'){
      s.nimbus.position.y=18.5+Math.sin(t*1.6)*.5;s.nring.rotation.y=t*.3;
      const asc=P.ascT>0?1:0;ud.ascK+=(asc-ud.ascK)*Math.min(1,dt*6);const ak=ud.ascK;
      const open=.1*Math.sin(t*1.3)+ab*.3+dl*.45-mb*.12+ak*.35;s.wingL.rotation.y=open;s.wingR.rotation.y=-open;s.wingL.rotation.x=s.wingR.rotation.x=mb*.2+dl*.25;
      const ws=1+ak*(.4+.05*Math.sin(t*9));s.nimbus.scale.set(ws,ws,ws);
      const ar=+P.auraR||0,on=ar>4;ud.auraK+=((on?ar:0)-ud.auraK)*Math.min(1,dt*6+(ud.auraK?0:1));
      const R=ud.auraK;s.oaura.visible=s.oauraW.visible=R>4;
      if(R>4){const f=R*(1+.012*Math.sin(t*4));s.oaura.scale.set(f,1,f);s.oaura.rotation.y=t*.12;s.oaura2.rotation.y=-t*.5;
        const q=(t*.7)%1,w=R*(.2+.8*q);s.oauraW.scale.set(w,1,w);ud.apexMat.opacity=.55*(1-q)}
    }
    else if(ud.apex)apexAnim(ud,s,P,t,dt,rig.visible,mb,dl,ab,yv);
    if(ud.nw){const W=ud.wisps,n=ud.nw;for(let i=0;i<n;i++){const w=W[i],q=(t*(.5+i*.03)+i*.37)%1,a=i*2.4+t*.5,r=9+2.5*Math.sin(i*1.7+t),f=Math.sin(q*PI);
        w.visible=rig.visible;w.position.set(Math.cos(a)*r,3+q*(44+ud.tier*2),Math.sin(a)*r);w.scale.set(1.5*f,(6+ud.tier*.6)*(.5+q),1.5*f)}}
    if(ud.shieldMeshes.length){const on=!!P.shield;
      if(on!==ud.shieldOn){ud.shieldOn=on;const a=ud.shieldMeshes;for(let i=0;i<a.length;i+=3){a[i].material=on?a[i+1]:a[i+2];const l=a[i].userData.mbLineMesh;if(l)l.visible=on}}
      s.shieldGlow.visible=on;if(on){const f=1+.04*Math.sin(t*6);s.shieldGlow.scale.set(f,f,1)}
      s.shield.position.y=ud.shY+(on?0:-2.5)+sw*.4;s.shield.rotation.y=.75-(on?0:.35)}
    else ud.shieldOn=null;
    const rd=!!(S.mode==='play'&&(MB.skills?MB.skills[0]&&MB.skills[0].unlocked&&MB.skills[0].ready:MB.pw(2)&&P.skCd<=0));
    s.ready.visible=rd;if(rd){s.ready.rotation.y=-t*.9;const f=1+.04*Math.sin(t*5);s.ready.scale.set(f,1,f)}
    // melee slash arc fades over the swing
    const sl=s.slash;sl.visible=atk&&mel;
    if(sl.visible){ud.slashMat.opacity=(ud.full?.62:.8)*(1-k);const f=.82+.18*k;sl.scale.set(f,1,f)}
  },
  // a hero that leaves (another member in multiplayer): free what this one model owns. Cached materials and unit geometry are shared and stay.
  dispose(g){const ud=g&&g.userData;if(!ud||!ud.s)return;clearSlots(ud.s);if(ud.slashMat){ud.slashMat.dispose();ud.slashMat=null}if(ud.apexMat){ud.apexMat.dispose();ud.apexMat=null}if(ud.apexMat2){ud.apexMat2.dispose();ud.apexMat2=null}}
};

/* ================= ALLIES ================= */
const T_TREE=[['body'],['head','body'],['armL','body'],['armR','body'],['legL'],['legR'],['p0'],['p1'],['p2']];
const W_TREE=[['body'],['head','body'],['tail','body'],['legFL'],['legFR'],['legBL'],['legBR']];
// Thrall: a hunched skeleton of soot-dark bone under a torn shroud, green fire in its eyes and ribs, smoke around its feet
function buildThrall(s){
  const b=new Builder(s),B=mat(0x3d4a52),Bl=mat(0x61737c),O=mat(0x07090b),E=lit(C.green,2,0xffffff),Sh=mat(0x12181c),smoke=mat(0x0c1210,{transparent:true,opacity:.5,depthWrite:false});
  s.body.position.set(0,10.5,0);s.legL.position.set(2.3,10.5,0);s.legR.position.set(-2.3,10.5,0);s.head.position.set(0,11.4,1.4);s.armL.position.set(4.6,9.4,.6);s.armR.position.set(-4.6,9.4,.6);
  b.to('body',B,0,0,0,2.5,1.1,.75);
  for(let y=1.6;y<=10;y+=2.2)b.sp('body',B,0,y,-.8,1.05);
  b.to('body',Bl,0,4.6,.2,2.9,.6,.78);b.to('body',Bl,0,6.5,.2,3.5,.6,.78);b.to('body',Bl,0,8.3,.2,3.3,.6,.78);
  b.bone('body',B,-4.6,9.4,.6,4.6,9.4,.6,.65,1.3,1.3);
  // shroud: a torn mantle over the shoulders and down the back
  b.sp('body',Sh,0,9.8,-.6,1,5.6,1.6,3.2);b.cy('body',Sh,0,4.6,-2.6,4.4,3.4,9,.12,0,0,.16,6);for(const x of[-2.4,0,2.4])b.spike('body',Sh,x,.6,-3.1,x*.06,-1,-.1,3.4+Math.abs(x)*.6,1.5,.2);
  for(const k of[-1,1])b.spike('body',Bl,k*4.9,9.8,.2,k*.8,1,-.3,3,.75);
  b.fine=true;b.sp('body',E,0,6.2,.4,1.1,1,1.3,1);b.sp('body',glow(C.green,.3),0,6.2,.4,2.6);b.fine=false;
  for(const a of['armL','armR']){b.bone(a,B,0,0,0,0,-4.8,0,.68,0,.95);b.bone(a,B,0,-4.8,0,0,-9,1.6,.58,0,0);for(const x of[-.7,0,.7])b.spike(a,Bl,x,-8.8,1.6,x*.4,-.8,1,3,.42)}
  for(const l of['legL','legR']){b.bone(l,B,0,0,0,0,-5,.6,.8,1.2,1.1);b.bone(l,B,0,-5,.6,0,-9.6,0,.66,0,.95);b.spike(l,B,0,-10,0,0,.1,1,4,1.1,.6)}
  // skull: long jaw, swept brow, eyes that burn
  b.sp('head',B,0,4.2,0,4.2,.94,.96,1.06);b.bx('head',B,0,.9,1.3,4,2,3.8);b.spike('head',B,0,-.2,2.6,0,-1,.5,2.2,1.5,.7);
  b.spike('head',Bl,2.6,6.4,-1,.5,.7,-1,3.6,1.1);b.spike('head',Bl,-2.6,6.4,-1,-.5,.7,-1,3.6,1.1);
  b.fine=true;
  b.sp('head',O,-1.6,4.2,3.4,1.5,1.1,1,.6,0,0,.25);b.sp('head',O,1.6,4.2,3.4,1.5,1.1,1,.6,0,0,-.25);b.sp('head',E,-1.6,4.2,3.9,.85);b.sp('head',E,1.6,4.2,3.9,.85);
  b.spike('head',glow(C.green,.5),-2,4.4,3.6,-.7,.6,-.5,3.4,.7);b.spike('head',glow(C.green,.5),2,4.4,3.6,.7,.6,-.5,3.4,.7);
  b.sp('head',glow(C.green,.26),-1.6,4.2,3.9,1.9);b.sp('head',glow(C.green,.26),1.6,4.2,3.9,1.9);b.bx('head',O,0,.5,3.25,3,.4,.2);
  for(const p of['p0','p1','p2'])b.sp(p,smoke,0,0,0,1);
  b.fine=false;
  b.flush();
}
// Wolf: long-legged and narrow at the waist, a swept mane, a blade of a tail and a pale glowing mark down its brow and flank
function buildWolf(s){
  const b=new Builder(s),F=mat(0x566178),D=mat(0x363d52),L=mat(0xb9c2d4),O=mat(C.dark),bw=pal('beast',0xcfeaff),E=lit(bw,1.8,0xffffff),Mk=lit(bw,1.1,0xe8f6ff);
  s.body.position.set(0,12,0);s.head.position.set(0,3.4,9.4);s.tail.position.set(0,1.8,-9.2);
  s.legFL.position.set(2.7,10.5,6.2);s.legFR.position.set(-2.7,10.5,6.2);s.legBL.position.set(2.6,10.5,-6.4);s.legBR.position.set(-2.6,10.5,-6.4);
  b.sp('body',F,0,.6,4.4,1,4.6,5.2,5.6);b.sp('body',F,0,.3,-2.6,1,3.5,3.9,7.6);b.sp('body',L,0,-1.6,3.4,1,3.2,3,5.4);
  for(const[z,l]of[[7,3.6],[4.6,4.4],[2,4],[-.8,3.2],[-3.6,2.4]])b.spike('body',D,0,4.6-Math.max(0,-z)*.2,z,0,.75,-1,l,1.5,.5);
  b.fine=true;for(const k of[-1,1]){b.bx('body',Mk,k*4.2,1,3.6,.4,.7,5,0,k*.12,0);b.bx('body',Mk,k*3.5,.8,-2.2,.4,.6,3.4,0,-k*.1,0)}b.fine=false;
  b.sp('head',F,0,0,0,4,1,.95,1.05);b.cy('head',F,0,-.9,4.6,1.3,2.5,5.4,HP,0,0,.8,6);b.cy('head',L,0,-1.9,4.2,1,1.8,4.6,HP,0,0,.6,6);b.sp('head',O,0,-.5,7.4,.85);
  b.spike('head',D,2.3,2.6,-.6,.4,1,-.5,5,1.5,.6);b.spike('head',D,-2.3,2.6,-.6,-.4,1,-.5,5,1.5,.6);
  b.spike('head',F,3.2,-.6,.4,.9,-.3,-.6,3,1.3,.6);b.spike('head',F,-3.2,-.6,.4,-.9,-.3,-.6,3,1.3,.6);
  b.fine=true;b.sp('head',E,2,1,3.3,.8,1.2,.7,.7,0,0,.3);b.sp('head',E,-2,1,3.3,.8,1.2,.7,.7,0,0,-.3);b.bx('head',Mk,0,2.6,2.6,.6,.5,3.4,-.5);
  b.spike('head',L,1.2,-2.4,5.6,0,-1,0,1.4,.4);b.spike('head',L,-1.2,-2.4,5.6,0,-1,0,1.4,.4);b.fine=false;
  b.spike('tail',D,0,0,0,0,.25,-1,10,1.9,.6);b.spike('tail',L,0,1.2,-5,0,.25,-1,5.6,1.1,.5);
  for(const l of['legFL','legFR','legBL','legBR']){const back=l[3]==='B';b.sp(l,F,0,.4,0,2.3,.9,1.3,1.3);b.bone(l,D,0,0,0,0,-5,back?-1.4:.6,1.15,0,1);b.bone(l,D,0,-5,back?-1.4:.6,0,-9.6,0,.8,0,0);b.spike(l,D,0,-10.2,-.4,0,.12,1,3.4,1.1,.7)}
  b.flush();
}
/* ----- round 10: the free allies of three apex paths (a.apexAlly): packbeast (The Feral Vow), icewight (The Still Winter), cinder (The Last Pyre).
   Friendly ones carry their path's light and a soft mark on the floor; an opponent's (a.foe, versus) burn in the foe palette and have no mark
   (the renderer lays its thorn ring there). They swell into place when they arrive and gutter out as a.life runs down. ----- */
const PB_TREE=[['mark'],['body'],['head','body'],['tail','body'],['legFL'],['legFR'],['legBL'],['legBR']];
const IW_TREE=[['mark'],['base'],['body'],['head','body'],['armL','body'],['armR','body']];
const CI_TREE=[['mark'],['body'],['tail','body'],['tail2','body']];
// Packbeast: a hunting spirit in a cage of bone: dark hide lit from inside, a skull for a face, antler stubs, ribs over the flank
function buildPackbeast(s,foe){
  const col=foe?pal('foe',0xff2d55):0x5fe07a,b=new Builder(s),F=mat(0x1c3324,{emissive:col,emissiveIntensity:.55}),D=mat(0x0f1c14,{emissive:col,emissiveIntensity:.3}),Bn=mat(C.bone),O=mat(C.dark),E=lit(col,2,0xffffff);
  s.body.position.set(0,12,0);s.head.position.set(0,3.4,9.4);s.tail.position.set(0,1.8,-9.2);
  s.legFL.position.set(2.7,10.5,6.2);s.legFR.position.set(-2.7,10.5,6.2);s.legBL.position.set(2.6,10.5,-6.4);s.legBR.position.set(-2.6,10.5,-6.4);
  b.sp('body',F,0,.6,4.4,1,4.4,5,5.6);b.sp('body',F,0,.3,-2.6,1,3.2,3.6,7.6);
  for(const[z,R]of[[6.4,4.9],[3.8,5.1],[1.2,4.7],[-1.4,4.1]])b.to('body',Bn,0,.3,z,R,.55,1,PI*.94,0,0,.1);
  for(const[z,l]of[[7,3.8],[4.6,4.8],[2,4.2],[-.8,3.4],[-3.6,2.6]])b.spike('body',Bn,0,4.4-Math.max(0,-z)*.2,z,0,.8,-1,l,1.1,.5);
  b.sp('head',Bn,0,.2,0,3.9,1,.92,1.06);b.cy('head',Bn,0,-.9,4.5,1.2,2.4,5.4,HP,0,0,.8,6);
  for(const k of[-1,1]){b.spike('head',Bn,k*2.2,2.6,-.6,k*.5,1,-.3,6.4,.95);b.spike('head',Bn,k*3.6,5.6,-1.3,k*1,.5,.3,3.4,.65);b.spike('head',D,k*3.1,-.6,.2,k*.9,-.3,-.6,3,1.2,.6)}
  b.fine=true;for(const k of[-1,1]){b.sp('head',O,k*1.9,.9,3,1.25,1.1,1,.6);b.sp('head',E,k*1.9,.9,3.5,.75);b.spike('head',Bn,k*1.2,-2.4,5.8,0,-1,0,1.6,.42)}
  b.sp('head',O,0,-.5,7.3,.7);b.fine=false;
  b.spike('tail',D,0,0,0,0,.25,-1,10,1.9,.6);b.spike('tail',glow(col,.5),0,1.2,-3,0,.3,-1,10,1.5,.5);
  for(const l of['legFL','legFR','legBL','legBR']){const back=l[3]==='B';b.sp(l,D,0,.4,0,2.2,.9,1.3,1.3);b.bone(l,D,0,0,0,0,-5,back?-1.4:.6,1.1,0,1);b.bone(l,D,0,-5,back?-1.4:.6,0,-9.6,0,.8,0,0);b.spike(l,D,0,-10.2,-.4,0,.12,1,3.4,1.1,.7)}
  b.sp('body',glow(col,.16),0,.4,1,1,6.6,6.4,11.5);
  if(!foe){for(let i=0;i<3;i++)b.put('mark',glow(col,.5),gRing(.9,10,i*TAU/3+.2,1.6),0,.8,0,-HP,0,0,15,15,1);b.put('mark',glow(col,.1),gRing(.01,14,0,TAU),0,.7,0,-HP,0,0,14,14,1)}
  b.flush();
}
// Icewight: a dead thing standing in a pillar of ice: no legs, a wide block of a chest with its ribs showing, two clubs of ice for arms, a crown of icicles
function buildIcewight(s,foe){
  const col=foe?pal('foe',0xff2d55):0x8fd8ff,b=new Builder(s),Ice=mat(0xcfeeff,{emissive:foe?0x8a1424:0x4aa8e8,emissiveIntensity:.5}),IceD=mat(0x7fb4dc,{emissive:foe?0x5a0c18:0x2f6aa8,emissiveIntensity:.4}),Bn=mat(0xdfe8ee),O=mat(0x0a1420),E=lit(col,2,0xffffff);
  s.body.position.set(0,18,0);s.head.position.set(0,15.6,1);s.armL.position.set(10,11.5,0);s.armR.position.set(-10,11.5,0);
  b.cy('base',Ice,0,9,0,4.4,7,18,0,0,0,1,6);
  for(let i=0;i<6;i++){const a=i*TAU/6+.3,L=8+(i*5%4)*1.6;b.spike('base',i%2?IceD:Ice,Math.cos(a)*5.4,0,Math.sin(a)*5.4,Math.cos(a)*.55,1,Math.sin(a)*.55,L,3.1)}
  b.cy('body',Ice,0,7,0,9,5.6,14,0,0,0,.7,6);b.sp('body',IceD,0,13.6,0,1,9.6,2.6,5.4);
  for(const k of[-1,1]){b.spike('body',Ice,k*8.4,12.6,0,k*.8,1,-.1,9.5,3.3);b.spike('body',IceD,k*10.4,10.6,0,k*1,.3,0,6.4,2.7)}
  b.fine=true;for(const y of[5,7.4,9.8])b.bx('body',Bn,0,y,5.2,7.4-(9.8-y)*.5,.9,.6);b.bx('body',Bn,0,7.4,5.3,1,6.6,.5);
  b.sp('body',E,0,7.6,4.2,1.7);b.fine=false;b.sp('body',glow(col,.3),0,7.6,4.2,4.4);
  b.sp('head',Bn,0,3.4,0,3.7,.95,1,1.05);b.bx('head',Bn,0,.6,1.2,3.6,2,3.6);
  b.spike('head',Ice,0,6,-.5,0,1,-.2,7.5,1.7);b.spike('head',IceD,2.7,5.4,-.4,.35,1,-.2,5.4,1.4);b.spike('head',IceD,-2.7,5.4,-.4,-.35,1,-.2,5.4,1.4);
  b.fine=true;for(const k of[-1,1]){b.sp('head',O,k*1.5,3.6,3,1.3,1.1,1,.6);b.sp('head',E,k*1.5,3.6,3.5,.8)}b.bx('head',O,0,.5,3.05,2.6,.4,.2);b.fine=false;
  for(const a of['armL','armR']){b.cy(a,IceD,0,-5,0,2.1,2.7,10,0,0,0,1,6);b.cy(a,Ice,0,-14.5,0,2.8,4.6,10.5,0,0,0,1,6);b.spike(a,Ice,0,-19.5,0,0,-1,.3,5.5,2.4);b.spike(a,IceD,0,-13,2.6,0,-.2,1,4.5,1.8)}
  if(!foe){b.put('mark',glow(col,.5),gRing(.9,6,0,TAU),0,.8,0,-HP,0,0,21,21,1);b.put('mark',decal(0xbfe4ff,.12),gRing(.01,6,0,TAU),0,.7,0,-HP,0,0,21,21,1)}
  b.flush();
}
// Cinder: a coal with a face, hovering: seams of fire, two flame horns, a tail of flame streaming off it
function buildCinder(s,foe){
  const col=foe?pal('foe',0xff2d55):0xff6a1e,hot=foe?pal('foe2',0xffb0a0):0xffd27a,b=new Builder(s),Co=mat(0x1a1210,{emissive:col,emissiveIntensity:.35}),Em=lit(col,1.8,hot),F1=glow(col,.8),F2=glow(hot,.9);
  s.body.position.set(0,13,0);s.tail.position.set(0,1.5,-2);s.tail2.position.set(0,1.5,-2);
  b.sp('body',Co,0,0,0,4.6,1,.95,1.1);
  for(const k of[-1,1]){b.spike('body',Co,k*4,-1.4,1.5,k*.6,-.6,.8,3.8,1.1);b.co('body',F1,k*2.7,4.8,0,1.3,5,0,0,-k*.3,5)}
  b.fine=true;b.to('body',Em,0,.3,0,4.55,.4,1.1);b.to('body',Em,0,0,0,4.5,.36,1,PI,0,HP,0);
  for(const k of[-1,1])b.sp('body',F2,k*1.7,.9,4.3,1.1,1.25,.75,.5,0,0,k*.35);b.bx('body',F2,0,-1.5,4.5,2.4,.45,.4);
  b.fine=false;b.sp('body',glow(col,.22),0,0,0,8.5);
  b.co('tail',F1,0,5.5,-1.5,3.1,12,-.35,0,0,5);b.co('tail',F2,0,3.6,-1,1.6,7,-.35,0,0,5);
  b.co('tail2',F1,2.2,3.6,-2,1.7,7,-.5,0,-.3,5);b.co('tail2',F1,-2.2,3.6,-2,1.7,7,-.5,0,.3,5);
  if(!foe){b.put('mark',glow(col,.28),gRing(.01,14,0,TAU),0,.7,0,-HP,0,0,13,13,1);b.put('mark',glow(hot,.5),gRing(.9,14,0,TAU),0,.8,0,-HP,0,0,9,9,1)}
  b.flush();
}
const APEX_ALLY={packbeast:[PB_TREE,buildPackbeast,11,.8],icewight:[IW_TREE,buildIcewight,16,1],cinder:[CI_TREE,buildCinder,8,.6]};
function apexAllyCreate(a){
  const K=APEX_ALLY[a.kind],g=new T.Group(),foe=a.foe===true;g.name=a.kind;
  const s=mkSlots(g,K[0]);K[1](s,foe);
  g.userData={s,kind:a.kind,apexAlly:true,foe,lx:a.x,ly:a.y,rot:typeof a.face==='number'?HP-a.face:HP,mv:0,seed:(a.seed||0)+(a.x||0)*.37,t0:null,k:0,pose:0,r0:K[2]};
  g.rotation.y=g.userData.rot;ink(g,K[3]);
  return g;
}
function apexAllyUpdate(g,a,MB,dt){
  const ud=g.userData,s=ud.s,t0=MB&&MB.S&&MB.S.t||0,t=t0+ud.seed,st=a.st||'idle',fast=st==='lunge'||st==='charge';dt=dt||0;
  if(ud.t0===null||t0<ud.t0)ud.t0=t0;
  const age=t0-ud.t0,dx=a.x-ud.lx,dy=a.y-ud.ly,d2=dx*dx+dy*dy;ud.lx=a.x;ud.ly=a.y;
  let moving=0,want=ud.rot;
  if(fast&&typeof a.ang==='number')want=HP-a.ang;else if(d2>1e-4&&d2<900){want=HP-Math.atan2(dy,dx);moving=1}else if(typeof a.face==='number')want=HP-a.face;
  if(d2>1e-4&&d2<900)moving=1;
  ud.rot=lerpAng(ud.rot,want,Math.min(1,dt*(fast?26:11)+.04));g.rotation.y=ud.rot;
  ud.mv+=(moving-ud.mv)*Math.min(1,dt*10);
  const mv=ud.mv,w=a.walk||0,sw=Math.sin(w)*mv,wind=st==='wind'?1:0,hit=fast||st==='cast'?1:0;
  ud.pose+=((hit?2:wind)-ud.pose)*Math.min(1,dt*(hit?30:12));const p=ud.pose,pw=p>1?2-p:p,ph=p>1?p-1:0;   // pw: how wound up, ph: how far through the blow
  // arrival and the end of its time
  const born=age<.4?age/.4:1,life=typeof a.life==='number'?a.life:9,end=life<.7?Math.max(0,life/.7):1;
  let k=(a.r>0?a.r/ud.r0:1)*(.2+.8*born)*(1+.25*Math.sin(born*PI))*(.35+.65*end)*(a.flash>0?1.07:1);
  g.visible=g.visible&&(end>=1||Math.sin(t0*46)>-.45);
  s.mark.rotation.y=t*.6-ud.rot;
  if(ud.kind==='packbeast'){
    const A=.85;s.legFL.rotation.x=-sw*A-ph*.9+pw*.3;s.legBR.rotation.x=-Math.sin(w+.6)*mv*A+ph*.8;s.legFR.rotation.x=Math.sin(w+.3)*mv*A-ph*.9+pw*.3;s.legBL.rotation.x=Math.sin(w+.9)*mv*A+ph*.8;
    s.body.position.y=12+Math.abs(Math.cos(w))*1.2*mv+Math.sin(t*2.2)*.2-pw*2.6+ph*1.5;s.body.rotation.x=Math.sin(w)*.07*mv+pw*.16-ph*.2;s.body.position.z=-pw*2+ph*4;
    s.head.rotation.x=-.1+Math.sin(w+1)*.08*mv+Math.sin(t*1.3)*.04+mv*.12+pw*.3-ph*.35;s.head.rotation.y=Math.sin(t*.9)*.15*(1-mv);
    s.tail.rotation.y=Math.sin(t*6)*.3*(.3+mv*.7);s.tail.rotation.x=-.3+mv*.4+ph*.4;
    g.scale.set(k*(1-ph*.08),k,k*(1+ph*.2));
  }else if(ud.kind==='icewight'){
    const sh=wind?Math.sin(t0*70)*.6:0;
    s.base.rotation.y=Math.sin(t*.7)*.05;s.body.position.set(sh,18+Math.sin(t*1.6)*.4-ph*1.6+(1-born)*-10,0);s.body.rotation.set(-pw*.22+ph*.42+mv*.06,0,Math.sin(t*1.1)*.03+sw*.03);
    const ax=.12+Math.sin(t*1.6)*.05-pw*2.7-ph*.85;s.armL.rotation.set(ax,0,.16+pw*.2);s.armR.rotation.set(ax+Math.sin(t*1.3)*.04,0,-.16-pw*.2);
    s.head.rotation.set(-pw*.25+ph*.3,Math.sin(t*.8)*.12*(1-p*.5),0);
    g.scale.set(k*(1+ph*.07),k*(1-ph*.1),k*(1+ph*.07));
  }else{
    const f1=1+.25*Math.sin(t*17)+.12*Math.sin(t*31),f2=1+.3*Math.sin(t*21+2);
    s.body.position.set(wind?Math.sin(t0*80)*.5:0,13+Math.sin(t*7)*1.5+pw*3-ph*7.5,0);s.body.rotation.set(ph*.75-pw*.3+mv*.2,0,Math.sin(t*9)*.08);
    const sc=1+pw*.32+Math.max(0,st==='cast'?.3:0);s.body.scale.set(sc*(1-ph*.12),sc*(1-ph*.12),sc*(1+ph*.4));
    s.tail.scale.set(1,f1*(1+mv*.5+ph*.9),1);s.tail2.scale.set(1,f2*(1+mv*.4+ph*.6),1);s.tail.rotation.x=-mv*.5-ph*.7;s.tail2.rotation.x=-mv*.5-ph*.7;
    g.scale.set(k,k,k);
  }
}
const ally={
  create(a,MB){
    if(a&&typeof a.kind==='string'&&APEX_ALLY.hasOwnProperty(a.kind))return apexAllyCreate(a);
    const g=new T.Group(),wolf=a&&a.kind==='wolf';g.name=wolf?'wolf':'thrall';
    const s=mkSlots(g,wolf?W_TREE:T_TREE);if(wolf)buildWolf(s);else buildThrall(s);
    g.userData={s,wolf,puffs:wolf?null:[s.p0,s.p1,s.p2],lx:a?a.x:0,ly:a?a.y:0,rot:a&&a.flip?-HP:HP,mv:0,seed:Math.random()*TAU};g.rotation.y=g.userData.rot;
    if(!wolf)g.scale.setScalar(1.18);
    ink(g,.8);
    return g;
  },
  update(g,a,MB,dt){
    if(g.userData.apexAlly)return apexAllyUpdate(g,a,MB,dt);
    const ud=g.userData,s=ud.s,t=(MB&&MB.S&&MB.S.t||0)+ud.seed;dt=dt||0;
    // heading from the change in position; a.flip is only the fallback on the first frame
    const dx=a.x-ud.lx,dy=a.y-ud.ly,d2=dx*dx+dy*dy;ud.lx=a.x;ud.ly=a.y;
    let moving=0;if(d2>1e-4&&d2<900){ud.rot=lerpAng(ud.rot,HP-Math.atan2(dy,dx),Math.min(1,dt*(ud.wolf?12:9)+.05));moving=1}
    ud.mv+=(moving-ud.mv)*Math.min(1,dt*10);g.rotation.y=ud.rot;
    const mv=ud.mv,w=a.walk||0,sw=Math.sin(w)*mv;
    if(ud.wolf){
      const A=.85;s.legFL.rotation.x=-sw*A;s.legBR.rotation.x=-Math.sin(w+.6)*mv*A;s.legFR.rotation.x=Math.sin(w+.3)*mv*A;s.legBL.rotation.x=Math.sin(w+.9)*mv*A;
      s.body.position.y=12+Math.abs(Math.cos(w))*1.2*mv+Math.sin(t*2.2)*.2;s.body.rotation.x=Math.sin(w)*.07*mv;
      s.head.rotation.x=-.1+Math.sin(w+1)*.08*mv+Math.sin(t*1.3)*.04+mv*.12;s.head.rotation.y=Math.sin(t*.9)*.15*(1-mv);
      s.tail.rotation.y=Math.sin(t*6)*.3*(.3+mv*.7);s.tail.rotation.x=-.3+mv*.4;
    }else{
      const A=.6;s.legL.rotation.x=-sw*A;s.legR.rotation.x=sw*A;
      s.body.rotation.x=.26+mv*.12;s.body.rotation.z=sw*.12;s.body.position.y=10.5-Math.abs(sw)*.5;
      s.armL.rotation.x=-1.15+sw*.25+Math.sin(t*2)*.06;s.armR.rotation.x=-1.05-sw*.25+Math.sin(t*2+1)*.06;
      s.head.rotation.z=Math.sin(t*1.7)*.1-sw*.1;s.head.rotation.x=-.12;
      // smoke: three dark puffs that swell, drift up from the feet and thin away
      for(let i=0;i<3;i++){const p=ud.puffs[i],q=(t*.6+i*.33)%1,a2=i*2.1+t*.7,f=Math.sin(q*PI);p.position.set(Math.cos(a2)*(3+q*2),1+q*9,Math.sin(a2)*(3+q*2)-1);p.scale.set(3.4*f+.01,2.6*f+.01,3.4*f+.01)}
    }
  }
};

window.MBModels.player=player;
window.MBModels.ally=ally;
})();
