// 3D player and ally models. Registers window.MBModels.player and window.MBModels.ally.
// Feet at Y=0, forward is +Z, the character's left is +X. Sub-meshes are merged per (slot, material) and rebuilt only
// when the stage/class/upgrade key changes; update() only writes transforms, visibility and a few material numbers.
window.MBModels=window.MBModels||{};
(function(){
'use strict';
const T=window.THREE;if(!T)return;
const PI=Math.PI,TAU=PI*2,HP=PI/2;
const PARTS=['organs','skin','touch','sight','hearing','smell','taste'];

/* ---------- shared materials ---------- */
const MATS={};
function mat(hex,o){const k=hex+(o?JSON.stringify(o):'');return MATS[k]||(MATS[k]=new T.MeshStandardMaterial(Object.assign({color:hex,roughness:.82,metalness:0,flatShading:true},o)))}
function lit(hex,k,base){return mat(base||hex,{emissive:hex,emissiveIntensity:k==null?1:k})}
function glow(hex,op,key){const k='g'+hex+op+(key||'');if(MATS[k])return MATS[k];const m=MATS[k]=new T.MeshBasicMaterial({color:hex,transparent:true,opacity:op,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});m.userData.noShadow=true;return m}
const C={bone:'#eee6d2',boneS:'#b3a88e',dark:'#15121b',skin:'#c68863',skinD:'#9d6344',hand:'#edb694',gold:'#d6a544',steel:'#9aa3ad',steelD:'#6d7781',steelL:'#dfe6ec',lea:'#5b4636',red:'#b8263d',green:'#7fd66b'};

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
function gKite(){return geo('kite',()=>{const s=new T.Shape();s.moveTo(-7,8);s.lineTo(7,8);s.lineTo(7,-1);s.quadraticCurveTo(5.5,-9,0,-13);s.quadraticCurveTo(-5.5,-9,-7,-1);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:4});g.translate(0,0,-.5);return g})}

/* ---------- builder: collects transformed primitives, merges them per slot+material ---------- */
const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3(),_d=new T.Vector3(),_up=new T.Vector3(0,1,0);
function Builder(slots){this.slots=slots;this.bins=new Map()}
Builder.prototype={
  push(slot,m,g){const k=slot+'|'+m.uuid;let b=this.bins.get(k);if(!b)this.bins.set(k,b={slot,m,list:[]});const c=g.index?g.toNonIndexed():g.clone();c.applyMatrix4(_m);b.list.push(c)},
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
  flush(){for(const b of this.bins.values()){let n=0;for(const g of b.list)n+=g.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
      for(const g of b.list){pos.set(g.attributes.position.array,o);nor.set(g.attributes.normal.array,o);o+=g.attributes.position.count*3;g.dispose()}
      const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(pos,3));G.setAttribute('normal',new T.BufferAttribute(nor,3));
      const mesh=new T.Mesh(G,b.m);mesh.castShadow=!b.m.userData.noShadow;mesh.receiveShadow=false;mesh.userData.part=true;this.slots[b.slot].add(mesh)}
    this.bins.clear()}
};
function clearSlots(slots){for(const k in slots){const s=slots[k];for(let i=s.children.length-1;i>=0;i--){const c=s.children[i];if(c.userData.part){s.remove(c);c.geometry.dispose()}}}}
function mkSlots(root,tree){const s={};for(const[name,parent]of tree){const g=new T.Group();g.name=name;s[name]=g;(parent?s[parent]:root).add(g)}return s}

/* ================= PLAYER ================= */
const P_TREE=[['aura'],['ready'],['slash'],['rig'],['hips','rig'],['legL','hips'],['shinL','legL'],['legR','hips'],['shinR','legR'],['torso','hips'],['heart','torso'],['lungs','torso'],
  ['head','torso'],['jaw','head'],['halo','head'],['armL','torso'],['foreL','armL'],['handL','foreL'],['wepL','handL'],['strA','wepL'],['strB','wepL'],
  ['armR','torso'],['foreR','armR'],['handR','foreR'],['wepR','handR'],['orb','wepR'],['spin','orb'],['shield','torso'],['shieldGlow','shield'],['cape','torso'],['scarf','torso']];
const HIP=22,UL=11,LL=11,UA=9,FA=8;   // hip height, leg and arm segment lengths
const CAPE={champion:'#b8263d',duelist:'#2b3a67',paladin:'#ece6d6',berserker:'#6b1d1d',nightblade:'#3a1d4a',phantom:'#565b6a',archmage:'#5a4aa6',pyromancer:'#b8421f',sharpshooter:'#2f5230',beastmaster:'#6b5a45',saint:'#f4ecd0',inquisitor:'#8c2f39',lich:'#2f5a3a',reaper:'#0e0e12'};

function stageOf(MB){let n=0;for(let i=0;i<PARTS.length;i++)if(MB.has(PARTS[i]))n|=1<<i;return n}

function buildSkeleton(b,s,org){
  const B=mat(C.bone),Bs=mat(C.boneS),O=mat(C.dark);
  s.armL.position.set(9.5,17.5,0);s.armR.position.set(-9.5,17.5,0);
  // pelvis
  b.to('hips',B,0,1.2,0,5.2,2.1,.72);b.bx('hips',B,0,2.2,-2.6,4.6,4.6,2.2,.25);b.sp('hips',B,4.4,0,0,2.3);b.sp('hips',B,-4.4,0,0,2.3);
  // legs: femur, kneecap, twin shin bones, foot
  for(const[u,l]of[['legL','shinL'],['legR','shinR']]){
    b.bone(u,B,0,0,0,0,-UL,0,1.45,0,2.3);
    b.bone(l,B,-.95,0,0,-.8,-LL+1.4,0,.85,0,0);b.bone(l,B,.95,0,0,.8,-LL+1.4,0,.85,0,0);b.sp(l,B,0,-LL+1.6,0,1.9);
    b.bx(l,B,0,-LL+.9,2.6,3.4,1.6,7.2);b.bx(l,Bs,0,-LL+.9,6.4,3.6,1.2,1.2);
  }
  // spine and neck
  for(let y=1.5;y<=21;y+=2.8)b.sp('torso',B,0,y,-2.2+(y>17?(y-17)*.45:0),1.75,1.1,.8,1.1);
  // ribcage: four hoops and a short breastbone
  const ry=[8,10.9,13.8,16.6],rr=[6.3,7.5,7.9,7.1];
  for(let i=0;i<4;i++)b.to('torso',B,0,ry[i],.6,rr[i],1.02,.74);
  b.bx('torso',org?B:Bs,0,15.4,6.1,2,5,1.1);
  // collarbones and shoulder knobs
  b.bone('torso',B,-9.5,17.5,0,-1,18,3.6,1.1,2.4,0);b.bone('torso',B,9.5,17.5,0,1,18,3.6,1.1,2.4,0);
  b.bx('torso',B,-5.4,15,-4.6,4.4,5.4,1,0,.25);b.bx('torso',B,5.4,15,-4.6,4.4,5.4,1,0,-.25);
  // arms: upper arm, twin forearm bones, hand with fingers
  for(const[u,f,h]of[['armL','foreL','handL'],['armR','foreR','handR']]){
    b.bone(u,B,0,0,0,0,-UA,0,1.3,0,2);
    b.bone(f,B,-.8,0,0,-.7,-FA,0,.75,0,0);b.bone(f,B,.8,0,0,.7,-FA,0,.75,0,0);
    b.sp(h,B,0,-.6,0,2.1,1,.9,.75);for(const x of[-1.5,0,1.5])b.bone(h,B,x,-1.6,0,x*1.5,-5+Math.abs(x)*.5,.5,.6,0,.75);b.bone(h,B,0,-.8,.6,0,-2.6,2.6,.6,0,.7);
  }
  // skull: cranium, cheekbones, upper jaw; loose lower jaw in its own slot
  s.head.position.set(0,21,0);s.jaw.position.set(0,2.2,-.6);
  b.sp('head',B,0,9,-.4,7.8,.96,.98,1.06);b.bx('head',B,0,3.4,2.4,8,3.6,7.2);
  b.sp('head',Bs,5.6,5.6,3.6,1.9,.8,.7,1);b.sp('head',Bs,-5.6,5.6,3.6,1.9,.8,.7,1);
  b.sp('head',O,3.1,8.4,6.3,2.7,1,1.08,.55,0,.25);b.sp('head',O,-3.1,8.4,6.3,2.7,1,1.08,.55,0,-.25);
  b.co('head',O,0,5.3,7.2,1.2,2.3,0,0,0,3,.5);
  b.bx('head',O,0,1.5,6,7.4,.7,.5);for(const x of[-2.7,-.9,.9,2.7])b.bx('head',B,x,2.1,6.1,1.4,1.5,.5);
  b.bx('jaw',B,0,-1.3,3.2,7.6,2.5,6.6);b.bx('jaw',B,0,-.4,-.4,8.2,3.4,1.6);for(const x of[-2.7,-.9,.9,2.7])b.bx('jaw',O,x,-.5,6.55,.35,1.5,.2);
  if(org){
    s.heart.position.set(1.2,12.6,1.6);s.lungs.position.set(0,12.6,-.2);
    const H=lit('#d1213f',.75),Lg=lit('#e08fa0',.18);
    b.sp('heart',H,0,0,0,3.1,1,1.12,.95);b.co('heart',H,-.3,-3.2,0,2.2,2.8,PI,0,-.2,6);b.cy('heart',mat('#7a3b50'),.2,3.4,-.4,.8,.9,2.6);
    b.sp('lungs',Lg,-3.9,0,0,1,2.6,4.7,2.9,0,0,.14);b.sp('lungs',Lg,3.9,0,0,1,2.6,4.7,2.9,0,0,-.14);b.cy('lungs',mat('#7a3b50'),0,5,0,.7,.7,3.4);
  }
}

function hood(b,M,tipTilt){
  b.wedge('head',M,0,8,0,9.1,0,TAU,0,PI*.36);                                     // crown
  b.wedge('head',M,0,8,0,9.1,HP+1.02,TAU-2.04,PI*.3,PI*.62);                      // back and sides, open at the face
  b.co('head',M,0,16.6,-3.4,4.2,7.5,tipTilt,0,0,5);                                // drooping point
  b.sp('torso',M,0,19.2,-.4,1,10.2,2.9,7.4);                                       // cowl on the shoulders
}

function buildHuman(b,s,ud,st,c,adv){
  const has=i=>!!(st&(1<<i)),touch=has(2),sight=has(3),hearing=has(4),smell=has(5),taste=has(6);
  const F=mat(C.skin),Fd=mat(C.skinD),gold=adv?lit(C.gold,.55):mat(C.gold),lea=mat(C.lea);
  // outfit: which material covers each body segment
  const o={torso:F,arm:F,fore:F,thigh:F,shin:F,foot:F,hand:mat(touch?C.hand:C.skin),robe:null,hair:taste,sleeve:0};
  if(c==='fighter'){o.torso=mat('#8c3b2f');o.thigh=o.shin=mat('#4a3a30');o.foot=lea;o.hand=mat('#e7dfcd')}
  else if(c==='tank'){o.torso=mat(C.steel,{metalness:.25,roughness:.5});o.arm=o.fore=o.shin=o.foot=mat(C.steelD,{metalness:.25,roughness:.55});o.thigh=mat('#4a4f5c');o.hand=mat(C.steelD);o.hair=false}
  else if(c==='assassin'){o.torso=o.arm=o.fore=o.thigh=o.shin=o.foot=mat('#22242b');o.hand=mat('#3a3d47');o.hair=false}
  else if(c==='mage'){o.robe=o.torso=o.arm=o.fore=mat('#3b2f73');o.thigh=o.shin=o.foot=mat('#2c2358');o.sleeve=1}
  else if(c==='healer'){o.robe=o.torso=o.arm=o.fore=mat('#ece6d6');o.thigh=o.shin=mat('#d9cfb8');o.foot=mat('#b99a5a');o.sleeve=1}
  else if(c==='necro'){o.robe=o.torso=o.arm=o.fore=mat('#1c2622');o.thigh=o.shin=o.foot=mat('#12181a');o.sleeve=1;o.hair=false;o.hand=mat('#cdbfa6')}
  else if(c==='ranger'){o.torso=o.arm=mat('#3f6b3a');o.thigh=mat('#4a3a30');o.shin=o.foot=lea;o.fore=lea;o.hair=false}
  ud.robe=!!o.robe;
  s.armL.position.set(10.4,16.6,0);s.armR.position.set(-10.4,16.6,0);
  // hips and legs
  b.sp('hips',o.robe||o.thigh,0,.6,0,1,7,4.6,4.9);
  for(const[u,l]of[['legL','shinL'],['legR','shinR']]){
    b.cy(u,o.thigh,0,-UL/2,0,3.4,2.9,UL,0,0,0,1);b.sp(u,o.thigh,0,-UL,0,2.9);
    b.cy(l,o.shin,0,-(LL-2)/2,0,2.8,2.3,LL-2,0,0,0,1);b.bx(l,o.foot,0,-LL+1.3,1.9,4.6,2.6,8);
  }
  // torso, shoulders, neck
  b.cy('torso',o.torso,0,9.5,0,8.4,6.7,15,0,0,0,.64,10);b.sp('torso',o.torso,0,17,0,1,8.4,2.6,5.4);b.cy('torso',F,0,19.6,0,2.7,3,3.6);
  // arms and hands
  for(const[u,f,h]of[['armL','foreL','handL'],['armR','foreR','handR']]){
    b.sp(u,o.arm,0,0,0,3.1);b.cy(u,o.arm,0,-UA/2,0,2.8,2.4,UA);b.sp(u,o.arm,0,-UA,0,2.45);
    if(o.sleeve)b.cy(f,o.fore,0,-FA/2+.4,0,2.4,3.5,FA-.6);else b.cy(f,o.fore,0,-FA/2,0,2.35,2,FA);
    if(touch){b.sp(h,o.hand,0,-1.5,0,2.9,1,1,.8);b.sp(h,o.hand,0,-3.9,.5,1,2.5,1.9,1.7);b.sp(h,o.hand,0,-2,2.5,1.4,.8,1.3,1)}   // palm, fingers, thumb
    else b.sp(h,o.hand,0,-1.2,0,2.5);                                                                                              // numb stump
  }
  // head and face
  s.head.position.set(0,20.4,0);
  b.sp('head',F,0,8,0,8,.96,1,.98);
  if(hearing){b.sp('head',F,7.7,7.8,-.2,2.7,.5,1,.8);b.sp('head',F,-7.7,7.8,-.2,2.7,.5,1,.8);b.sp('head',Fd,8.4,7.8,.3,1.5,.4,1,.7);b.sp('head',Fd,-8.4,7.8,.3,1.5,.4,1,.7)}
  if(sight){const W=lit('#ffffff',.35),Pp=mat('#1a1410');for(const x of[-3.1,3.1]){b.sp('head',W,x,8.8,6.6,2,1,1.05,.6);b.sp('head',Pp,x,8.7,7.6,1.1,1,1,.5)}}
  if(smell)b.co('head',Fd,0,6.7,8.4,1.25,2.8,1.05,0,0,4);
  if(taste)b.to('head',mat('#8c2f39'),0,5.6,7.1,2.5,.55,1,PI*.6,.3,0,PI*1.2);
  if(o.hair){const Hm=mat('#2a1a14');b.wedge('head',Hm,0,8.3,-.5,8.7,0,TAU,0,PI*.5,-.5);b.sp('head',Hm,0,6.4,-4.6,5.6,1.15,1,.7)}
  // ----- no class yet: loincloth -----
  if(!c){const cl=mat('#d9cfb8'),cd=mat('#b9ae95');b.cy('hips',cl,0,-.6,0,7.3,7.9,5.2,0,0,0,.72,10);b.cy('hips',cd,0,1.9,0,7.5,7.5,1.3,0,0,0,.72,10);b.bx('hips',cl,1.4,-4.6,5.6,4.4,7.5,.9,-.12);b.bx('hips',cl,-1,-4,-5.5,5,6,.9,.12)}
  // ----- robes (mage, healer, necro) -----
  if(o.robe){b.cy('hips',o.robe,0,-9.6,0,7.3,11,19.6,0,0,0,.8,10)}
  if(c==='fighter'){
    b.cy('hips',o.torso,0,-1.6,0,7,8.2,6.4,0,0,0,.72,10);b.cy('hips',lea,0,1.8,0,7.3,7.3,1.9,0,0,0,.74,10);b.bx('hips',gold,0,1.8,5.3,2.8,2.6,.9);
    b.bx('torso',mat('#5e241c'),0,14.6,5.25,4.4,6,.6);
    const R=mat(C.red);b.to('head',R,0,10.4,0,7.75,1.15);b.bx('head',R,2.4,8.6,-9.6,1.7,6.4,.7,.5,0,.25);b.bx('head',R,-1.4,9.4,-9.9,1.7,5,.7,.8,0,-.3);
    b.cy('foreL',lea,0,-5.6,0,2.5,2.3,3.4);b.cy('foreR',lea,0,-5.6,0,2.5,2.3,3.4);
    if(adv==='champion'){b.sp('armL',gold,.6,1,0,4,1.1,.8,1.1);b.sp('armR',gold,-.6,1,0,4,1.1,.8,1.1)}
  }else if(c==='tank'){
    const st=o.torso,sd=o.arm,lt=mat('#d5dce2',{metalness:.2,roughness:.45});
    b.cy('hips',st,0,-1.2,0,7,8.3,5.4,0,0,0,.72,10);b.cy('hips',lea,0,1.8,0,7.3,7.3,1.9,0,0,0,.74,10);
    b.bx('torso',lt,0,11.5,5.3,1,9.6,.6);b.sp('armL',sd,.8,1,0,4.5,1.1,.85,1.1);b.sp('armR',sd,-.8,1,0,4.5,1.1,.85,1.1);
    b.sp('legL',sd,0,-UL,1,3.2);b.sp('legR',sd,0,-UL,1,3.2);
    // helmet: dome, cheek guards open at the face, nose bar, red crest
    b.wedge('head',st,0,8,0,9.2,0,TAU,0,PI*.46);b.wedge('head',st,0,8,0,9.2,HP+.72,TAU-1.44,PI*.4,PI*.42);b.bx('head',st,0,7,8.6,1.7,7.4,1.2);
    b.bx('head',mat('#0d0c11'),0,6.6,6.8,9,6.4,1.2);
    b.bx('head',lit(C.red,.25),0,18.2,-1.4,1.9,4.4,12.5);b.bx('head',lit(C.red,.25),0,13.6,-8.6,1.9,7,3,-.5);
    if(adv==='berserker'){const Bn=mat(C.bone);b.co('head',Bn,9.4,13.2,0,2,7.5,0,0,-.75,5);b.co('head',Bn,-9.4,13.2,0,2,7.5,0,0,.75,5)}
    else{
      // kite shield on the left arm; meshes swap between lit and dim materials in update()
      s.shield.position.set(13.4,8.6,5.6);s.shield.rotation.set(-.08,.75,0);
      const blue=lit('#3d5a80',.25,'#4a6c99'),rim=adv==='paladin'?gold:lt;
      b.put('shield',rim,gKite(),0,.3,-.5,0,0,0,1.42,1.4,1);b.put('shield',blue,gKite(),0,.4,.25,0,0,0,1.2,1.2,1.1);b.sp('shield',gold,0,1,1,2.7,1,1,.6);
      b.bx('shield',rim,0,-1,.9,1.2,19,.4);b.bx('shield',rim,0,4.6,.9,13,1.2,.4);
      b.to('shieldGlow',glow(C.gold,.8),0,-1,1.6,15.2,.8,1.12,0,0);b.sp('shieldGlow',lit(C.gold,1.2),0,1,1.2,2.9,1,1,.6);
    }
  }else if(c==='assassin'){
    const dk=o.torso,gr=mat('#3a3d47'),R=lit(C.red,.2);
    b.cy('hips',gr,0,1.6,0,7.2,7.2,1.9,0,0,0,.74,10);b.bx('torso',gr,0,10.5,5.2,1.5,17,.5,0,0,.72);b.bx('torso',gr,0,10.5,5.2,1.5,17,.5,0,0,-.72);
    hood(b,dk,-1.25);
    b.wedge('head',mat('#2d3039'),0,8,0,8.5,HP-1.25,2.5,PI*.52,PI*.34);                 // mask over the lower face
    b.to('torso',R,0,19.2,.3,6.6,2.6,.8);s.scarf.position.set(-3.6,18.4,-5);b.bx('scarf',R,0,-7,-.3,5,14,1);b.bx('scarf',R,2.4,-10,-1.2,3.6,11,.9,0,0,.22);
  }else if(c==='mage'){
    const tr=mat('#5a4aa6'),br=mat('#2c2358');
    b.bx('torso',tr,0,9.6,5.3,1.9,15,.6);b.bx('hips',tr,0,-9.6,8,1.9,19.6,.6,-.19);b.to('hips',gold,0,-19,0,11.2,.85,.8);b.cy('hips',gold,0,1.6,0,7.5,7.5,1.5,0,0,0,.74,10);
    b.cy('head',br,0,13.2,-.4,13.4,13.4,1.1,-.1,0,0,1,12);b.cy('head',gold,0,14.4,-.5,8.5,8.7,1.7,-.1,0,0,1,10);
    b.cy('head',o.robe,0,19.2,-1.3,4.6,8.3,9.6,-.18,0,0,1,8);b.co('head',o.robe,0,28,-4.2,4.6,10,-.6,0,0,8);
  }else if(c==='ranger'){
    const dg=mat('#2f5230');
    b.cy('hips',o.torso,0,-2,0,7,8.4,7,0,0,0,.72,10);b.cy('hips',lea,0,1.7,0,7.3,7.3,1.9,0,0,0,.74,10);b.bx('torso',lea,0,10.6,5.2,1.7,18,.5,0,0,-.75);b.bx('torso',lea,0,10.6,-5.2,1.7,18,.5,0,0,.75);
    hood(b,dg,-1.1);
    // quiver on the back with three arrows
    b.cy('torso',lea,-4.4,13,-7,2.6,2.2,13,-.12,0,-.45);
    for(const[x,z]of[[-1,0],[.8,.7],[.6,-.9]]){const ax=-7.6+x*.9,ay=21+x;b.bone('torso',mat(C.bone),-6.4+x,17.6,-7.6+z,ax-1.6,ay+2.6,-8.2+z,.4,0,0);b.co('torso',lit(C.red,.2),ax-1.6,ay+2.2,-8.2+z,1.2,3.2,-.12,0,.45,4)}
    if(adv==='beastmaster'){const fur=mat('#8d96a4');b.sp('torso',fur,0,18.4,-1.6,1,11.4,3.6,7.6);b.sp('torso',fur,7.5,17.6,2,3.6);b.sp('torso',fur,-7.5,17.6,2,3.6)}
  }else if(c==='healer'){
    b.bx('torso',gold,0,9.6,5.3,1.7,15,.6);b.bx('torso',gold,0,12.6,5.3,8,1.7,.6);b.bx('hips',gold,0,-9.6,8,1.7,19.6,.6,-.19);b.to('hips',gold,0,-19,0,11.2,.85,.8);b.cy('hips',gold,0,1.6,0,7.5,7.5,1.5,0,0,0,.74,10);
    b.to('head',gold,0,11.8,-.3,8,.75,1,0,HP-.22);                                    // circlet
    const hl=lit('#ffe08a',1.1,C.gold);s.halo.position.set(0,20.5,-.5);
    b.to('halo',hl,0,0,0,adv==='saint'?8.2:6.8,1.05);b.to('halo',glow('#ffe08a',.28),0,0,0,adv==='saint'?8.2:6.8,2.6);
    if(adv==='saint')for(let i=0;i<8;i++){const a=i*TAU/8;b.co('halo',hl,Math.cos(a)*11,0,Math.sin(a)*11,1.1,3.6,HP,0,HP-a+PI,4)}
    if(adv==='inquisitor'){const R=mat('#8c2f39');b.bx('torso',R,4.4,9,5.5,3,17,.6);b.bx('torso',R,-4.4,9,5.5,3,17,.6);b.sp('torso',R,0,18.4,0,1,9,2.4,6)}
  }else if(c==='necro'){
    const tr=lit(C.green,.8);
    b.to('hips',tr,0,-19,0,11.2,.8,.8);b.bx('torso',tr,0,12.6,5.3,1.2,8,.5);b.cy('hips',mat('#12181a'),0,1.6,0,7.5,7.5,1.5,0,0,0,.74,10);
    b.sp('torso',mat(C.bone),0,8.4,5.6,2.6,1,1,.6);b.sp('torso',mat(C.dark),-.9,8.8,7,.75);b.sp('torso',mat(C.dark),.9,8.8,7,.75);
    hood(b,o.robe,-1.3);
    if(adv==='lich')for(let i=0;i<5;i++){const a=HP+(i-2)*.5;b.co('head',tr,-Math.cos(a)*-8.4,15.4-Math.abs(i-2)*.9,Math.sin(a)*7.6-.6,1.3,5.4,0,0,0,4)}
  }
  // ----- class upgrade: cape with clasps -----
  if(adv&&c){const cm=mat(CAPE[adv]||C.red);s.cape.position.set(0,18.2,-5.2);
    b.cy('cape',cm,0,-13.5,-.6,7.6,11.5,27,0,0,0,.14,8);b.bx('cape',gold,0,-26.6,-.6,22,1.5,1.9);b.sp('torso',gold,6.6,18.4,-3,1.9);b.sp('torso',gold,-6.6,18.4,-3,1.9);b.sp('torso',cm,0,18.6,-3.4,1,9.4,2,3.4)}
}

function buildWeapon(b,s,ud,skin,c,adv){
  const steel=lit(C.steelL,.3),gold=adv?lit(C.gold,.55):mat(C.gold),lea=mat(C.lea),B=lit(C.bone,.22);
  const sword=(slot,len,w,grip)=>{b.cy(slot,lea,0,-grip/2+1.5,0,.95,.95,grip+3);b.sp(slot,gold,0,-grip-.4,0,1.5);b.bx(slot,gold,0,2.6,0,w*2.4,1.7,2);
    b.bx(slot,steel,0,3.4+len/2,0,w,len,1.1);b.co(slot,steel,0,3.4+len+w*.55,0,w/2,w*1.1,0,0,0,4,.55);b.bx(slot,lit(C.steel,.2),0,3.4+len*.45,0,w*.28,len*.8,1.35)};
  const dagger=(slot,M)=>{b.cy(slot,lea,0,-.6,0,1,1,4.6);b.bx(slot,gold,0,2,0,6,1.4,1.8);b.bx(slot,M,0,8.4,0,3.2,12,1);b.co(slot,M,0,16,0,1.6,3.4,0,0,0,4,.4)};
  const staff=(wood,lo,hi)=>{b.cy('wepR',mat(wood),0,(lo+hi)/2,0,.95,1.15,hi-lo,0,0,0,1,6);s.orb.position.set(0,hi+3.2,0)};
  ud.wtype='club';
  if(!c){b.bone('wepR',B,0,-3,0,0,16.5,0,1.35,1.9,0);b.sp('wepR',B,-1.5,17.2,0,2.4);b.sp('wepR',B,1.5,17.2,0,2.4);ud.wtype='club'}
  else if(c==='fighter'){sword('wepR',31,4.4,5);ud.wtype='great'}
  else if(c==='tank'){sword('wepR',23,3.3,3.5);ud.wtype='sword'}
  else if(c==='assassin'){const M=adv==='nightblade'?lit('#b06bff',.7,C.steelL):adv==='phantom'?lit('#9fd8ff',.6,C.steelL):steel;dagger('wepR',M);dagger('wepL',M);ud.wtype='dual'}
  else if(c==='mage'){const col=adv==='pyromancer'?'#ff8a4c':'#8fd3ff';staff('#6b4a2b',-27,26);ud.wtype='staff';
    for(let i=0;i<3;i++){const a=i*TAU/3;b.bone('wepR',mat('#6b4a2b'),0,25.5,0,Math.cos(a)*3.2,29.2,Math.sin(a)*3.2,.5,0,.7)}
    b.sp('orb',lit(col,1.5,'#ffffff'),0,0,0,3.5);b.sp('orb',glow(col,.3),0,0,0,6.2);
    if(adv==='archmage')for(let i=0;i<3;i++){const a=i*TAU/3;b.sp('spin',lit(col,1.5,'#ffffff'),Math.cos(a)*7.5,Math.sin(a*2)*1.5,Math.sin(a)*7.5,1.5)}
    if(adv==='pyromancer')b.co('orb',glow('#ffb347',.55,'fl'),0,5,0,2.6,7,0,0,0,5)}
  else if(c==='healer'){staff('#b99a5a',-27,25);ud.wtype='staff';
    b.sp('orb',lit('#ffe08a',1.4,'#fff4c8'),0,0,0,3.7);b.sp('orb',glow('#ffe08a',.28),0,0,0,6.6);
    for(let i=0;i<8;i++){const a=i*TAU/8;b.co('spin',lit(C.gold,.9),Math.cos(a)*6.3,Math.sin(a)*6.3,0,1,3.4,0,0,a-HP,4)}}
  else if(c==='necro'){staff('#3a2f2a',-27,24);ud.wtype='staff';const g=lit(C.green,1.6);
    b.sp('orb',B,0,.6,0,4.2,.95,1,1.05);b.bx('orb',B,0,-2.8,1,4.6,2.4,4.4);b.sp('orb',g,-1.6,.6,3.6,1.3);b.sp('orb',g,1.6,.6,3.6,1.3);b.co('orb',mat(C.dark),0,-1.2,4.1,.7,1.4,0,0,0,3,.5);
    b.sp('orb',glow(C.green,.22),0,0,0,7.4);
    if(adv==='reaper'){const bl=mat('#cfd6dc',{metalness:.3,roughness:.4,side:T.DoubleSide});b.to('wepR',bl,0,10.5,9.5,13,1.5,.5,1.25,0,-HP,.55);b.bx('wepR',mat('#3a2f2a'),0,21.5,1.5,1.6,1.6,5)}}
  else if(c==='ranger'){ud.wtype='bow';const wood=mat('#8a5a2b');
    // bow lives in the left hand: arc bulging forward (+Z), string behind it; the two string halves stretch in update()
    b.to('wepL',wood,0,0,-14.6,20,1.05,1,1.5,0,-HP,-.75);b.cy('wepL',lea,0,0,5.4,1.35,1.35,6);
    const tip=adv==='sharpshooter'?gold:wood;b.sp('wepL',tip,0,13.6,0,1.5);b.sp('wepL',tip,0,-13.6,0,1.5);
    s.strA.position.set(0,13.6,0);s.strB.position.set(0,-13.6,0);const sm=mat(C.bone);
    b.cy('strA',sm,0,-.5,0,.32,.32,1,0,0,0,1,4);b.cy('strB',sm,0,.5,0,.32,.32,1,0,0,0,1,4)}
}

function rebuildPlayer(g,MB){
  const ud=g.userData,s=ud.s,S=MB.S,st=stageOf(MB),skin=!!(st&2),c=skin&&MB.cls()||null,adv=c&&S.adv||null;
  clearSlots(s);
  for(const k in s){if(k!=='rig'&&k!=='hips'){s[k].position.set(0,0,0)}s[k].rotation.set(0,0,0);s[k].scale.set(1,1,1);s[k].visible=true}
  s.hips.position.set(0,HIP,0);s.legL.position.set(4,0,0);s.legR.position.set(-4,0,0);s.shinL.position.set(0,-UL,0);s.shinR.position.set(0,-UL,0);
  s.foreL.position.set(0,-UA,0);s.foreR.position.set(0,-UA,0);s.handL.position.set(0,-FA,0);s.handR.position.set(0,-FA,0);
  ud.cls=c;ud.adv=adv;ud.skin=skin;ud.robe=false;
  const b=new Builder(s);
  if(skin)buildHuman(b,s,ud,st,c,adv);else buildSkeleton(b,s,!!(st&1));
  buildWeapon(b,s,ud,skin,c,adv);
  // ground effects: upgrade aura, skill-ready ring, melee slash arc
  if(adv){b.put('aura',glow(C.gold,.5,'au'),gRing(.9,8,0,TAU),0,.7,0,-HP,0,0,24,24,1);b.put('aura',glow(C.gold,.5,'au'),gRing(.95,28,0,TAU),0,.7,0,-HP,0,0,28.5,28.5,1);b.put('aura',glow(C.gold,.1,'aud'),gRing(.01,20,0,TAU),0,.6,0,-HP,0,0,21.6,21.6,1)}
  b.put('ready',glow(C.gold,.6,'rd'),gRing(.9,28,0,TAU),0,.9,0,-HP,0,0,19,19,1);
  const full=c==='fighter'&&MB.pw(1),R=c?(full?74:62):54;ud.full=full;
  const sl=glow(c?C.steelL:C.bone,.8,'sl');ud.slashMat=sl;
  if(full)b.put('slash',sl,gRing(.62,32,0,TAU),0,0,0,-HP,0,0,R,R,1);else b.put('slash',sl,gRing(.62,14,-HP-1.15,2.3),0,0,0,-HP,0,0,R,R,1);
  s.slash.position.set(0,27,0);
  b.flush();
  ud.shieldMeshes.length=0;
  for(const m of s.shield.children)if(m.userData.part){const on=m.material,k='dim'+on.uuid;let off=MATS[k];if(!off){off=MATS[k]=on.clone();off.transparent=true;off.opacity=.32;off.depthWrite=false}ud.shieldMeshes.push(m,on,off)}
}

function lerpAng(a,b,k){let d=(b-a)%TAU;if(d>PI)d-=TAU;else if(d<-PI)d+=TAU;return a+d*k}

const player={
  drawsSlash:true,drawsAura:true,drawsReadyRing:true,   // hints for the renderer: these ground effects are already part of the model
  create(MB){
    const g=new T.Group();g.name='player';const s=mkSlots(g,P_TREE);
    g.userData={s,key:'',rot:null,mb:0,ab:0,k:1,dl:0,atkDur:.16,lastAtk:0,cls:null,adv:null,skin:false,robe:false,wtype:'club',full:false,shieldMeshes:[],slashMat:null,shieldOn:null};
    if(MB&&MB.S)try{player.update(g,MB.P||{x:0,y:0,face:HP,walk:0,hp:3,maxHp:3},MB,0)}catch(e){}
    return g;
  },
  update(g,P,MB,dt){
    const ud=g.userData,s=ud.s,S=MB.S,t=S.t||0;dt=dt||0;
    const key=stageOf(MB)+'|'+(MB.cls()||'')+'|'+(S.adv||'')+'|'+(MB.pw(1)?1:0);
    if(key!==ud.key){ud.key=key;rebuildPlayer(g,MB)}
    const c=ud.cls,wt=ud.wtype,atk=P.atk>0,mel=wt!=='staff'&&wt!=='bow';
    // facing
    const tr=HP-(atk?P.swing:P.face);
    ud.rot=ud.rot==null||atk?tr:lerpAng(ud.rot,tr,Math.min(1,dt*18));g.rotation.y=ud.rot;
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
    rig.position.set(rat*Math.sin(t*70)*1.3,-Math.abs(sw)*(ud.robe?.6:1.3),rat*Math.sin(t*57)*.6);
    rig.rotation.x=dl*.5+(mel?0:ab*.08);rig.scale.set(1-dl*.06,1-dl*.1,1+dl*.22);
    // legs
    const LA=ud.robe?.36:.78;
    s.legL.rotation.x=-sw*LA-dl*.75;s.legR.rotation.x=sw*LA+dl*.55;
    s.shinL.rotation.x=Math.max(0,cw)*LA*1.15+dl*.5;s.shinR.rotation.x=Math.max(0,-cw)*LA*1.15+dl*.9;
    s.hips.rotation.y=sw*.12;
    // rest pose per weapon type: [R arm x, R elbow, weapon tilt, L arm x, L elbow, R swing, L swing]
    let rx=-.25,re=-.6,tilt=.62,lx=0,le=-.18,fr=.5,fl=1,ltilt=1,rz=-.13,lz=.13;
    if(wt==='great'){rx=-.3;re=-.75;tilt=.4;fr=.35}
    else if(wt==='sword'){lx=-.45;le=-1.05;fl=.15}
    else if(wt==='dual'){rx=-.2;re=-.8;tilt=.75;lx=-.2;le=-.8;ltilt=.75;fl=.6;fr=.6;rz=-.3;lz=.3}
    else if(wt==='staff'){rx=-.55;re=-.75;tilt=.05;fr=.12}
    else if(wt==='bow'){rx=0;re=-.2;lx=-.4;le=-.7;ltilt=.12;fl=.2;fr=1}
    rx-=sw*.55*fr;lx+=sw*.55*fl;re-=Math.max(0,-sw)*.3*fr;le-=Math.max(0,sw)*.3*fl;
    let twist=-sw*.16,spin=0;
    if(ud.robe){rz=-.2;lz=.2}
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
    rx-=dl*.2;lx+=dl*.55;
    s.torso.rotation.set(mb*.06+(mel?ab*.14:0),twist+spin,0);s.torso.position.y=br*.25;s.torso.scale.y=1+br*.012;
    s.armR.rotation.set(rx,0,rz+rat*Math.sin(t*83)*.14);s.foreR.rotation.x=re;
    s.armL.rotation.set(lx,0,lz+rat*Math.sin(t*77)*.14);s.foreL.rotation.x=le;
    s.wepR.rotation.x=tilt-(rx+re)-s.torso.rotation.x-rig.rotation.x*.6;
    s.wepL.rotation.x=ltilt-(lx+le)-s.torso.rotation.x-rig.rotation.x*.6;
    s.head.rotation.set(-dl*.3+(ud.skin?br*.015:0),-(twist)*.7,rat*Math.sin(t*61)*.13);
    // skeleton only: chattering jaw, beating heart, breathing lungs
    if(!ud.skin){
      s.jaw.rotation.x=(P.moving?Math.abs(Math.sin((P.walk||0)*1.5))*.42:atk?.55:0)+rat*(.12+.12*Math.sin(t*45));
      const beat=1+.3*Math.max(0,Math.sin(t*7));s.heart.scale.set(beat,beat,beat);s.lungs.scale.set(1+br*.07,1+br*.03,1+br*.09);
    }
    // class extras
    if(wt==='staff'){const f=1+.55*ab+Math.sin(t*5)*.04;s.orb.scale.set(f,f,f);if(c==='necro')s.spin.rotation.y=0;else if(c==='healer')s.spin.rotation.z=t;else s.spin.rotation.y=t*2.2}
    if(wt==='bow'){const p=atk?(1-k)*10:0,L=Math.sqrt(184.96+p*p),a=Math.atan2(p,13.6);s.strA.scale.y=L;s.strB.scale.y=L;s.strA.rotation.x=a;s.strB.rotation.x=-a}
    if(c==='healer'){s.halo.position.y=20.5+Math.sin(t*2)*.8;s.halo.rotation.y=t*.7}
    if(c==='assassin')s.scarf.rotation.x=.25+mb*.7+dl*.6+Math.sin(t*6+1)*.1*(.4+mb);
    if(ud.adv){s.cape.rotation.x=.12+mb*.4+dl*.7+Math.sin(t*3.1)*.04+Math.sin((P.walk||0)*2)*.06*mb;s.cape.rotation.y=-twist*.5;
      s.aura.rotation.y=t*.6;const au=MATS['g'+C.gold+'0.5au'];if(au)au.opacity=.34+.14*Math.sin(t*3)}
    if(ud.shieldMeshes.length){const on=!!P.shield;
      if(on!==ud.shieldOn){ud.shieldOn=on;const a=ud.shieldMeshes;for(let i=0;i<a.length;i+=3)a[i].material=on?a[i+1]:a[i+2]}
      s.shieldGlow.visible=on;if(on){const f=1+.04*Math.sin(t*6);s.shieldGlow.scale.set(f,f,1)}
      s.shield.position.y=8.6+(on?0:-2.5)+sw*.4;s.shield.rotation.y=.75-(on?0:.35)}
    else ud.shieldOn=null;
    s.ready.visible=!!(MB.pw(2)&&P.skCd<=0&&S.mode==='play');
    // melee slash arc fades over the swing
    const sl=s.slash;sl.visible=atk&&mel;
    if(sl.visible){ud.slashMat.opacity=.75*(1-k);const f=.82+.18*k;sl.scale.set(f,1,f)}
  }
};

/* ================= ALLIES ================= */
const T_TREE=[['body'],['head','body'],['armL','body'],['armR','body'],['legL'],['legR']];
const W_TREE=[['body'],['head','body'],['tail','body'],['legFL'],['legFR'],['legBL'],['legBR']];
function buildThrall(s){
  const b=new Builder(s),B=mat('#e7dfcd'),O=mat(C.dark),E=lit(C.green,2);
  s.body.position.set(0,9.5,0);s.legL.position.set(2.6,9.5,0);s.legR.position.set(-2.6,9.5,0);s.head.position.set(0,10.2,1.2);s.armL.position.set(5,8.2,.6);s.armR.position.set(-5,8.2,.6);
  b.to('body',B,0,0,0,2.9,1.3,.75);
  for(let y=1.6;y<=9;y+=2.4)b.sp('body',B,0,y,-.9,1.25);
  b.to('body',B,0,4.6,.2,3.5,.75,.78);b.to('body',B,0,6.7,.2,4,.75,.78);
  b.bone('body',B,-5,8.2,.6,5,8.2,.6,.75,1.5,1.5);
  for(const a of['armL','armR']){b.bone(a,B,0,0,0,0,-4.4,0,.8,0,1.1);b.bone(a,B,0,-4.4,0,0,-8,1.6,.7,0,1.4)}
  for(const l of['legL','legR']){b.bone(l,B,0,0,0,0,-4.6,.6,.95,1.4,1.3);b.bone(l,B,0,-4.6,.6,0,-8.6,0,.8,0,1.1);b.bx(l,B,0,-8.9,1.4,2.2,1.2,4.2)}
  b.sp('head',B,0,4.6,0,5,.96,.96,1.04);b.bx('head',B,0,.6,1.4,5,2.6,4.6);
  b.sp('head',O,-1.9,4.6,4,1.75,1,1.05,.6);b.sp('head',O,1.9,4.6,4,1.75,1,1.05,.6);b.sp('head',E,-1.9,4.6,4.5,1.05);b.sp('head',E,1.9,4.6,4.5,1.05);
  b.sp('head',glow(C.green,.22),-1.9,4.6,4.5,1.9);b.sp('head',glow(C.green,.22),1.9,4.6,4.5,1.9);b.bx('head',O,0,.4,3.75,3.6,.5,.2);
  b.flush();
}
function buildWolf(s){
  const b=new Builder(s),F=mat('#9aa3b1'),D=mat('#7d8693'),L=mat('#c9cfd8'),O=mat(C.dark),E=lit('#ffd95e',1.6);
  s.body.position.set(0,10.5,0);s.head.position.set(0,3.4,9.6);s.tail.position.set(0,1.6,-9.6);
  s.legFL.position.set(3,9,6.4);s.legFR.position.set(-3,9,6.4);s.legBL.position.set(3,9,-6.6);s.legBR.position.set(-3,9,-6.6);
  b.sp('body',F,0,0,-1,1,5,5.2,10);b.sp('body',F,0,.8,5,1,5.6,6,5.6);b.sp('body',D,0,2.6,-1,1,3.6,3.4,9.4);
  b.sp('head',F,0,0,0,4.9,1,.95,1);b.cy('head',L,0,-1.1,5.2,1.7,2.7,5,HP);b.sp('head',O,0,-.6,7.9,1.15);
  b.co('head',D,2.7,4.6,-.8,1.7,4.4,-.15,0,-.2,4);b.co('head',D,-2.7,4.6,-.8,1.7,4.4,-.15,0,.2,4);
  b.sp('head',E,2.3,1.2,3.9,.95);b.sp('head',E,-2.3,1.2,3.9,.95);
  b.bone('tail',D,0,0,0,0,2.4,-7.4,1.5,1.7,1);b.sp('tail',L,0,2.6,-7.8,1.2);
  for(const l of['legFL','legFR','legBL','legBR']){b.cy(l,D,0,-4.2,0,1.7,1.15,8.4);b.sp(l,D,0,-8.4,.6,1.5,1,.7,1.4);b.sp(l,F,0,0,0,2.3)}
  b.flush();
}
const ally={
  create(a,MB){
    const g=new T.Group(),wolf=a&&a.kind==='wolf';g.name=wolf?'wolf':'thrall';
    const s=mkSlots(g,wolf?W_TREE:T_TREE);if(wolf)buildWolf(s);else buildThrall(s);
    g.userData={s,wolf,lx:a?a.x:0,ly:a?a.y:0,rot:a&&a.flip?-HP:HP,mv:0,seed:Math.random()*TAU};g.rotation.y=g.userData.rot;
    return g;
  },
  update(g,a,MB,dt){
    const ud=g.userData,s=ud.s,t=(MB&&MB.S&&MB.S.t||0)+ud.seed;dt=dt||0;
    // heading from the change in position; a.flip is only the fallback on the first frame
    const dx=a.x-ud.lx,dy=a.y-ud.ly,d2=dx*dx+dy*dy;ud.lx=a.x;ud.ly=a.y;
    let moving=0;if(d2>1e-4&&d2<900){ud.rot=lerpAng(ud.rot,HP-Math.atan2(dy,dx),Math.min(1,dt*(ud.wolf?12:9)+.05));moving=1}
    ud.mv+=(moving-ud.mv)*Math.min(1,dt*10);g.rotation.y=ud.rot;
    const mv=ud.mv,w=a.walk||0,sw=Math.sin(w)*mv;
    if(ud.wolf){
      const A=.85;s.legFL.rotation.x=-sw*A;s.legBR.rotation.x=-Math.sin(w+.6)*mv*A;s.legFR.rotation.x=Math.sin(w+.3)*mv*A;s.legBL.rotation.x=Math.sin(w+.9)*mv*A;
      s.body.position.y=10.5+Math.abs(Math.cos(w))*1.2*mv+Math.sin(t*2.2)*.2;s.body.rotation.x=Math.sin(w)*.07*mv;
      s.head.rotation.x=-.1+Math.sin(w+1)*.08*mv+Math.sin(t*1.3)*.04;s.head.rotation.y=Math.sin(t*.9)*.15*(1-mv);
      s.tail.rotation.y=Math.sin(t*6)*.35*(.3+mv*.7);s.tail.rotation.x=-.25+mv*.35;
    }else{
      const A=.6;s.legL.rotation.x=-sw*A;s.legR.rotation.x=sw*A;
      s.body.rotation.x=.22+mv*.1;s.body.rotation.z=sw*.12;s.body.position.y=9.5-Math.abs(sw)*.5;
      s.armL.rotation.x=-1.15+sw*.25+Math.sin(t*2)*.06;s.armR.rotation.x=-1.05-sw*.25+Math.sin(t*2+1)*.06;
      s.head.rotation.z=Math.sin(t*1.7)*.1-sw*.1;s.head.rotation.x=-.12;
    }
  }
};

window.MBModels.player=player;
window.MBModels.ally=ally;
})();
