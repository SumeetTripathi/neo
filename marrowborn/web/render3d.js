// 3D renderer. Registers MB.renderer = { ok, draw(dt), screenToGame(clientX, clientY), dispose() }.
// World units = game pixels: X = game x, Z = game y, Y up. WebGL goes to #gl, text and the blind-fog go to the 2D overlay #cv.
(function(){
'use strict';
const MB=window.MB;if(!MB)return;
const W=MB.W,H=MB.H,WALL=MB.WALL,FOG=MB.FOG,TAU=Math.PI*2;
const cv=MB.cv,ctx=MB.ctx,glc=document.getElementById('gl');
const linearPick=(cx,cy)=>{const r=cv.getBoundingClientRect();return{x:(cx-r.left)/r.width*W,y:(cy-r.top)/r.height*H}};
const R={ok:false,draw(){},screenToGame:linearPick,dispose(){}};
MB.renderer=R;
const THREE=window.THREE;if(!THREE||!glc)return;

let renderer;
try{
  const hiDpi=(window.devicePixelRatio||1)>=2;
  renderer=new THREE.WebGLRenderer({canvas:glc,antialias:!hiDpi,alpha:false,powerPreference:'high-performance',stencil:false});
  if(!renderer.getContext())throw new Error('no context');
}catch(e){console.warn('Marrowborn: WebGL unavailable, staying 2D');return}

const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const TILT=52*Math.PI/180,LIFT=46,SHOT_Y=17;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x050408);
scene.fog=new THREE.Fog(0x050408,900,2600);
const camera=new THREE.PerspectiveCamera(30,W/H,50,6000);

/* ---------- lights: a constant set (hemisphere, one shadow sun, four points) so shaders never recompile ---------- */
const hemi=new THREE.HemisphereLight(0x8a94b8,0x1a1410,.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,.8);
sun.position.set(W/2-300,620,H/2+300);sun.target.position.set(W/2,0,H/2);
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
{const c=sun.shadow.camera;c.left=-560;c.right=560;c.top=420;c.bottom=-420;c.near=100;c.far=1500;c.updateProjectionMatrix()}
sun.shadow.bias=-.0006;sun.shadow.normalBias=.8;sun.shadow.radius=2;
scene.add(sun,sun.target);
const CORNERS=[[WALL+9,WALL+9],[W-WALL-9,WALL+9],[WALL+9,H-WALL-9],[W-WALL-9,H-WALL-9]];
const points=CORNERS.map(()=>{const l=new THREE.PointLight(0xff9a48,0,520,1.5);scene.add(l);return l});

/* ---------- small helpers ---------- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rng(seed){let s=seed;return()=>(s=s*16807%2147483647)/2147483647}
const hsl=(h,s,l,a)=>a===undefined?`hsl(${h},${s}%,${l}%)`:`hsla(${h},${s}%,${l}%,${a})`;
const hslColor=(h,s,l)=>new THREE.Color().setHSL(((h%360)+360)%360/360,s,l);
function canvasTex(c,repeat){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t}

const glowTex=(()=>{const c=mkCanvas(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.85)');gr.addColorStop(.45,'rgba(255,255,255,.28)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const glowMat=(hex,op)=>new THREE.SpriteMaterial({map:glowTex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op===undefined?1:op,fog:false,toneMapped:false});
const flatGlowMat=(hex,op)=>new THREE.MeshBasicMaterial({map:glowTex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op,fog:false,toneMapped:false});
const basic=(hex,o)=>new THREE.MeshBasicMaterial(Object.assign({color:hex,toneMapped:false},o||{}));
const std=(hex,o)=>new THREE.MeshStandardMaterial(Object.assign({color:hex,roughness:.85,metalness:0},o||{}));
const G={
  sphere:new THREE.SphereGeometry(1,14,10),
  disc:new THREE.CircleGeometry(1,48).rotateX(-Math.PI/2),
  ring:new THREE.RingGeometry(.9,1,56).rotateX(-Math.PI/2),
  rim:new THREE.RingGeometry(.955,1,56).rotateX(-Math.PI/2),
  quad:new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),
  box:new THREE.BoxGeometry(1,1,1),
  shaft:new THREE.CylinderGeometry(.7,.7,18,5).rotateX(Math.PI/2).translate(0,0,-9),
  tip:new THREE.ConeGeometry(1.8,5,5).rotateX(Math.PI/2),
};

/* ---------- textures ---------- */
function floorTexture(theme,hue){
  const TW=2048,TH=1024,c=mkCanvas(TW,TH),g=c.getContext('2d'),rnd=rng(11+hue);
  g.scale(TW/W,TH/H);
  const crypt=theme==='crypt';
  g.fillStyle=crypt?hsl(hue,14,5):hsl(hue,20,13);g.fillRect(0,0,W,H);
  if(!crypt){ // bare earth showing between the slabs
    for(let i=0;i<520;i++){const x=rnd()*W,y=rnd()*H,r=8+rnd()*34,l=rnd();g.fillStyle=l<.5?hsl(hue+rnd()*30-15,22,17+rnd()*7,.25):'rgba(0,0,0,.14)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
    for(let i=0;i<1500;i++){g.fillStyle=hsl(hue+rnd()*40-20,28,22+rnd()*14,.55);g.fillRect(rnd()*W,rnd()*H,1+rnd()*1.6,2+rnd()*3.5)}
  }
  let y=0;
  while(y<H){
    const rh=40+rnd()*16;let x=-rnd()*40;
    while(x<W){
      const w=42+rnd()*44,v=rnd();
      if(crypt||rnd()<.74){
        const jx=crypt?0:rnd()*3-1.5,jy=crypt?0:rnd()*3-1.5,sx=x+1.3+jx,sy=y+1.3+jy,sw=w-2.6,sh=rh-2.6;
        g.fillStyle=crypt?hsl(hue+v*24-12,3+v*7,25+v*10):hsl(v<.5?hue:35,2+v*5,24+v*10);g.fillRect(sx,sy,sw,sh);
        for(let i=0;i<9;i++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.045)':'rgba(0,0,0,.09)';g.beginPath();g.arc(sx+rnd()*sw,sy+rnd()*sh,1+rnd()*5,0,TAU);g.fill()}
        g.fillStyle='rgba(255,255,255,.1)';g.fillRect(sx,sy,sw,1.4);g.fillRect(sx,sy,1.4,sh);
        g.fillStyle='rgba(0,0,0,.4)';g.fillRect(sx,sy+sh-2,sw,2);g.fillRect(sx+sw-2,sy,2,sh);
        if(rnd()<.11){g.fillStyle=crypt?hsl(hue-95,30,34,.2):hsl(hue+10,26,26,.4);g.beginPath();g.arc(sx+rnd()*sw,sy+rnd()*sh,6+rnd()*12,0,TAU);g.fill()}
        if(rnd()<.16){g.strokeStyle='rgba(0,0,0,.62)';g.lineWidth=1.4;g.beginPath();const cx=sx+rnd()*sw,cy=sy+rnd()*sh;g.moveTo(cx,cy);g.lineTo(cx+rnd()*20-10,cy+rnd()*20-10);g.lineTo(cx+rnd()*32-16,cy+rnd()*32-16);g.stroke()}
      }
      x+=w;
    }
    y+=rh;
  }
  if(crypt){
    // old stains, and a worn ritual circle cut into the middle of the floor
    for(let i=0;i<7;i++){const x=WALL+40+rnd()*(W-2*WALL-80),y2=WALL+40+rnd()*(H-2*WALL-80);for(let j=0;j<5;j++){g.fillStyle='hsla(352,55%,16%,.2)';g.beginPath();g.arc(x+rnd()*30-15,y2+rnd()*24-12,7+rnd()*16,0,TAU);g.fill()}}
    g.save();g.translate(W/2,H/2);
    for(const[r,lw]of[[132,3],[118,1.5],[62,1.5]]){g.strokeStyle='rgba(0,0,0,.42)';g.lineWidth=lw;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=1;g.beginPath();g.arc(1,1.4,r,0,TAU);g.stroke()}
    g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.6;
    for(let i=0;i<24;i++){const a=i/24*TAU,r0=119,r1=i%2?126:131;g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke()}
    g.beginPath();for(let i=0;i<=7;i++){const a=i*3/7*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*62,Math.sin(a)*62)}g.stroke();
    g.restore();
  }
  // bones and rubble
  const bone='rgba(231,223,205,.5)';g.strokeStyle=g.fillStyle=bone;g.lineCap='round';
  for(let i=0;i<22;i++){const x=WALL+20+rnd()*(W-2*WALL-40),y2=WALL+20+rnd()*(H-2*WALL-40),a=rnd()*TAU,k=rnd();
    if(k<.5){const dx=Math.cos(a)*9,dy=Math.sin(a)*9;g.lineWidth=2.4;g.beginPath();g.moveTo(x-dx,y2-dy);g.lineTo(x+dx,y2+dy);g.stroke();for(const s of[-1,1]){g.beginPath();g.arc(x+s*dx,y2+s*dy,2.5,0,TAU);g.fill()}}
    else if(k<.7){g.beginPath();g.arc(x,y2,6,0,TAU);g.fill();g.fillStyle='rgba(0,0,0,.65)';g.beginPath();g.arc(x-2.2,y2-.5,1.6,0,TAU);g.arc(x+2.2,y2-.5,1.6,0,TAU);g.fill();g.fillStyle=bone}
    else for(let j=0;j<5;j++){g.beginPath();g.arc(x+rnd()*18-9,y2+rnd()*18-9,1.4+rnd()*2.6,0,TAU);g.fill()}}
  // grime where the floor meets the walls
  const ao=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(0,0,0,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(rx,ry,rw,rh)};
  const D=58;ao(0,WALL,0,WALL+D,0,WALL,W,D);ao(0,H-WALL,0,H-WALL-D,0,H-WALL-D,W,D);ao(WALL,0,WALL+D,0,WALL,0,D,H);ao(W-WALL,0,W-WALL-D,0,W-WALL-D,0,D,H);
  return canvasTex(c,false);
}
function brickTexture(hue,sat){
  const c=mkCanvas(256,256),g=c.getContext('2d'),rnd=rng(5+hue);
  g.fillStyle=hsl(hue,sat,7);g.fillRect(0,0,256,256);
  for(let r=0;r<4;r++)for(let i=-1;i<2;i++){
    const x=i*128+(r%2?64:0),y=r*64,v=rnd();
    g.fillStyle=hsl(hue+v*18-9,sat+v*6,30+v*13);g.fillRect(x+3,y+3,122,58);
    for(let k=0;k<14;k++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)';g.beginPath();g.arc(x+3+rnd()*122,y+3+rnd()*58,2+rnd()*9,0,TAU);g.fill()}
    g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x+3,y+3,122,3);g.fillStyle='rgba(0,0,0,.42)';g.fillRect(x+3,y+56,122,5);
    if(rnd()<.4){g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=2;g.beginPath();const cx=x+20+rnd()*90;g.moveTo(cx,y+4);g.lineTo(cx+rnd()*20-10,y+30);g.lineTo(cx+rnd()*30-15,y+60);g.stroke()}
  }
  return canvasTex(c,true);
}
function gateTexture(){
  const c=mkCanvas(128,128),g=c.getContext('2d');
  g.fillStyle='#020203';g.beginPath();g.moveTo(10,128);g.lineTo(10,58);g.arc(64,58,54,Math.PI,0);g.lineTo(118,128);g.closePath();g.fill();
  g.save();g.clip();g.strokeStyle='#2c2a33';g.lineWidth=5;for(let x=22;x<118;x+=17){g.beginPath();g.moveTo(x,0);g.lineTo(x,128);g.stroke()}
  for(const y of[52,92]){g.beginPath();g.moveTo(0,y);g.lineTo(128,y);g.stroke()}g.restore();
  g.strokeStyle='#4b4856';g.lineWidth=6;g.beginPath();g.moveTo(10,128);g.lineTo(10,58);g.arc(64,58,54,Math.PI,0);g.lineTo(118,128);g.stroke();
  return canvasTex(c,false);
}

/* ---------- environment (rebuilt only when the area changes) ---------- */
// A box between two corners whose UVs follow world position, so one brick texture tiles evenly over every wall.
function slab(x0,x1,y0,y1,z0,z1,mats){
  const geo=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);geo.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
  const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv,S=1/72;
  for(let i=0;i<p.count;i++){
    if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getX(i)*S,p.getZ(i)*S);
    else if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i)*S,p.getY(i)*S);
    else uv.setXY(i,p.getX(i)*S,p.getY(i)*S);
  }
  const m=new THREE.Mesh(geo,mats);m.castShadow=true;m.receiveShadow=true;return m;
}
function buildEnv(key){
  const crypt=key==='crypt',hue=crypt?208:+key.slice(1)||0;
  const root=new THREE.Group(),E={key,crypt,hue,root,flames:[],lit:[],tick:null};
  const rnd=rng(77+hue);
  const ftex=floorTexture(crypt?'crypt':'out',hue);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,H).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:ftex,bumpMap:ftex,bumpScale:1.6,roughness:.86,metalness:.04}));
  floor.position.set(W/2,0,H/2);floor.receiveShadow=true;root.add(floor);
  const btex=brickTexture(crypt?226:hue,crypt?9:4);
  const side=new THREE.MeshStandardMaterial({map:btex,bumpMap:btex,bumpScale:1.4,roughness:.9}),top=new THREE.MeshStandardMaterial({map:btex,color:0x2c2c35,roughness:.95});
  const mats=[side,side,top,top,side,side];
  if(crypt){
    const T=260,hN=92,hS=14;
    root.add(slab(-T,W+T,0,hN,-T,WALL,mats),slab(-T,WALL,0,hN,WALL,H+T,mats),slab(W-WALL,W+T,0,hN,WALL,H+T,mats),slab(WALL,W-WALL,0,hS,H-WALL,H+T,mats));
    // buttresses break up the long walls and catch the torchlight
    for(const x of[150,330,630,810])root.add(slab(x-15,x+15,0,hN+8,WALL-2,WALL+9,mats));
    for(const z of[170,320,470]){root.add(slab(WALL-2,WALL+9,0,hN+8,z-15,z+15,mats),slab(W-WALL-9,W-WALL+2,0,hN+8,z-15,z+15,mats))}
    const gate=new THREE.Mesh(new THREE.PlaneGeometry(84,78),new THREE.MeshStandardMaterial({map:gateTexture(),transparent:true,alphaTest:.5,roughness:.7,metalness:.3}));
    gate.position.set(W/2,39,WALL+.4);root.add(gate);
    scene.background.setHex(0x040306);
  }else{
    // outdoors: a ruined boundary wall of loose blocks, open ground beyond, standing stones in the mist
    const bg=hslColor(hue,.3,.035);scene.background.copy(bg);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000).rotateX(-Math.PI/2),std(hslColor(hue,.2,.045),{roughness:1}));
    ground.position.set(W/2,-.6,H/2);ground.receiveShadow=true;root.add(ground);
    const blocks=[];
    const run=(horizontal,fixed,from,to,hMin,hMax,out)=>{let a=from;while(a<to){const len=Math.min(to-a,34+rnd()*30),h=rnd()<.14?6+rnd()*6:hMin+rnd()*(hMax-hMin),th=30+rnd()*10;
      const mid=fixed+out*th/2;blocks.push(horizontal?[a+len/2,mid,len-1.5,h,th]:[mid,a+len/2,th,h,len-1.5]);a+=len}};
    run(true,WALL,-8,W+8,26,62,-1);run(true,H-WALL,-8,W+8,8,15,1);run(false,WALL,WALL,H-WALL,24,58,-1);run(false,W-WALL,WALL,H-WALL,24,58,1);
    const wallMat=new THREE.MeshStandardMaterial({color:0xa8a8a8,map:btex,bumpMap:btex,bumpScale:1.2,roughness:.92});
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),wallMat,blocks.length);
    const d=new THREE.Object3D(),col=new THREE.Color();
    blocks.forEach((b,i)=>{d.position.set(b[0],0,b[1]);d.scale.set(b[2],b[3],b[4]);d.rotation.set(0,(rnd()-.5)*.05,0);d.updateMatrix();inst.setMatrixAt(i,d.matrix);inst.setColorAt(i,col.setScalar(.75+rnd()*.35))});
    inst.castShadow=inst.receiveShadow=true;root.add(inst);
    const rockMat=std(hslColor(hue,.08,.16),{flatShading:true,roughness:1}),N=70;
    const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rockMat,N),spikes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.08,1,1,5).translate(0,.5,0),std(hslColor(hue+20,.1,.09),{flatShading:true,roughness:1}),N);
    for(let i=0;i<N;i++){
      let x,z;do{x=-620+rnd()*(W+1240);z=-560+rnd()*(H+700)}while(x>-60&&x<W+60&&z>-60&&z<H+60);
      const s=6+rnd()*16;d.position.set(x,s*.3,z);d.scale.set(s,s*(.6+rnd()*.8),s);d.rotation.set(rnd()*3,rnd()*3,rnd()*3);d.updateMatrix();rocks.setMatrixAt(i,d.matrix);
      do{x=-620+rnd()*(W+1240);z=-560+rnd()*(H+700)}while(x>-70&&x<W+70&&z>-70&&z<H+70);
      const hgt=z>H?40+rnd()*40:70+rnd()*110,w=5+rnd()*7;d.position.set(x,0,z);d.scale.set(w,hgt,w);d.rotation.set((rnd()-.5)*.3,rnd()*3,(rnd()-.5)*.3);d.updateMatrix();spikes.setMatrixAt(i,d.matrix);
    }
    rocks.castShadow=spikes.castShadow=true;root.add(rocks,spikes);
  }
  // rubble hugging the walls
  {const n=18,rm=std(crypt?0x4a4954:hslColor(hue,.1,.25),{flatShading:true,roughness:1}),rub=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),rm,n),d=new THREE.Object3D();
    for(let i=0;i<n;i++){const s=3+rnd()*5,e=i%3;let x,z;if(e===0){x=WALL+30+rnd()*(W-2*WALL-60);z=WALL+3+rnd()*5}else{x=e===1?WALL+3+rnd()*5:W-WALL-3-rnd()*5;z=WALL+30+rnd()*(H-2*WALL-60)}
      d.position.set(x,s*.35,z);d.scale.set(s,s*.7,s);d.rotation.set(rnd()*3,rnd()*3,rnd()*3);d.updateMatrix();rub.setMatrixAt(i,d.matrix)}
    rub.castShadow=rub.receiveShadow=true;root.add(rub)}
  // corner lights: iron braziers in the crypt, crystal-topped menhirs outside
  const iron=std(0x24222a,{roughness:.6,metalness:.5}),stone=std(crypt?0x55545f:hslColor(hue,.1,.3),{flatShading:true,roughness:1});
  const flameCol=crypt?0xff8a3a:hslColor(hue,.85,.6).getHex(),coreCol=crypt?0xffe2a0:hslColor(hue,.7,.82).getHex();
  E.lightColor=crypt?new THREE.Color(0xff9448):hslColor(hue,.3,.72);
  CORNERS.forEach(([x,z],i)=>{
    const g=new THREE.Group();g.position.set(x,0,z);
    let topY;
    if(crypt){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2.4,44,6),iron);pole.position.y=22;
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(3,6,4,6),iron);foot.position.y=2;
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(8,4,7,8),iron);bowl.position.y=47;
      const ember=new THREE.Mesh(new THREE.SphereGeometry(5.6,8,6),basic(0x2a1408));ember.position.y=50;ember.scale.y=.5;
      pole.castShadow=bowl.castShadow=true;g.add(pole,foot,bowl,ember);E.lit.push({m:ember.material,on:0xff7a2a,off:0x1c1612});topY=58;
    }else{
      const men=new THREE.Mesh(new THREE.CylinderGeometry(4,8,52,5),stone);men.position.y=26;men.rotation.y=i;men.castShadow=true;
      const cry=new THREE.Mesh(new THREE.OctahedronGeometry(6,0),basic(coreCol));cry.position.y=62;cry.scale.y=1.5;
      g.add(men,cry);E.crystals=E.crystals||[];E.crystals.push(cry);topY=62;
    }
    const f1=new THREE.Sprite(glowMat(flameCol,.95)),f2=new THREE.Sprite(glowMat(coreCol,.9)),halo=new THREE.Sprite(glowMat(flameCol,.22));
    f1.position.y=topY+3;f2.position.y=topY;halo.position.y=topY;halo.scale.setScalar(150);
    const fl=new THREE.Group();fl.add(halo,f1,f2);g.add(fl);
    E.flames.push({fl,f1,f2,halo,ph:i*1.7,y:topY});
    root.add(g);
  });
  scene.fog.color.copy(scene.background);
  scene.add(root);
  return E;
}
function disposeEnv(E){
  scene.remove(E.root);
  E.root.traverse(o=>{
    if(o.geometry)o.geometry.dispose();
    const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    for(const m of ms){if(m.map&&m.map!==glowTex)m.map.dispose();m.dispose()}
  });
}
let env=null,envLevel=-1;
function syncEnv(){
  const n=MB.S.level;if(env&&n===envLevel)return;envLevel=n;
  const key=n<8?'crypt':'h'+MB.levelDef(n).hue;
  if(env&&env.key===key)return;
  if(env)disposeEnv(env);
  env=buildEnv(key);
}

/* ---------- pools for the short-lived things ---------- */
const fx=new THREE.Group();scene.add(fx);
class Pool{constructor(make){this.make=make;this.items=[];this.n=0}
  begin(){this.n=0}
  get(){let o=this.items[this.n];if(!o){o=this.make();fx.add(o);this.items.push(o)}this.n++;o.visible=true;return o}
  end(){for(let i=this.n;i<this.items.length;i++)this.items[i].visible=false}}
const mCore={e:basic(0xfff0d8),bolt:basic(0xe8f6ff),orb:basic(0xfff6cf),bone:basic(0xe7dfcd),dark:basic(0x15121b),steel:basic(0xd5dce2),
  morsel:new THREE.MeshStandardMaterial({color:0xd1213f,roughness:.35,emissive:0x5a0714}),pink:basic(0xffb3bf)};
function orbMaker(coreMat,glowHex,glowK){return()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.sphere,coreMat),halo=new THREE.Sprite(glowMat(glowHex,.9)),pool=new THREE.Mesh(G.quad,flatGlowMat(glowHex,.4));
  halo.scale.setScalar(glowK);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(glowK*1.5);g.add(core,halo,pool);g.userData.core=core;return g}}
const pools={
  shot:new Pool(orbMaker(mCore.e,0xff7a30,6.4)),
  bolt:new Pool(orbMaker(mCore.bolt,0x4fb4ff,7)),
  orb:new Pool(orbMaker(mCore.orb,0xffc64a,7)),
  skull:new Pool(()=>{const g=new THREE.Group(),h=new THREE.Mesh(G.sphere,mCore.bone),jaw=new THREE.Mesh(G.box,mCore.bone),halo=new THREE.Sprite(glowMat(0x58e04a,.85)),pool=new THREE.Mesh(G.quad,flatGlowMat(0x58e04a,.38));
    jaw.scale.set(1.1,.6,.9);jaw.position.set(0,-.75,.35);g.add(h,jaw);
    for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,mCore.dark);e.scale.setScalar(.27);e.position.set(s*.38,.12,.82);g.add(e)}
    const sc=new THREE.Group();sc.add(g);halo.scale.setScalar(6);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(8);sc.add(halo,pool);sc.userData.core=g;return sc}),
  arrow:new Pool(()=>{const g=new THREE.Group(),s=new THREE.Mesh(G.shaft,mCore.bone),t=new THREE.Mesh(G.tip,mCore.steel),halo=new THREE.Sprite(glowMat(0xcfd8e6,.28));halo.scale.setScalar(16);s.castShadow=true;g.add(s,t,halo);return g}),
  morsel:new Pool(()=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.IcosahedronGeometry(7.5,1),mCore.morsel),hi=new THREE.Mesh(G.sphere,mCore.pink),pool=new THREE.Mesh(G.quad,flatGlowMat(0xff2a4c,.34));
    hi.scale.setScalar(2.3);hi.position.set(-2.4,4.2,3.6);m.castShadow=true;const b=new THREE.Group();b.add(m,hi);pool.scale.setScalar(46);pool.position.y=.5;g.add(b,pool);g.userData.bob=b;return g}),
  zone:new Pool(()=>{const g=new THREE.Group(),disc=new THREE.Mesh(G.disc,new THREE.MeshBasicMaterial({color:0xc41f3c,transparent:true,opacity:.2,depthWrite:false,toneMapped:false})),
    rim=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xe9b548,transparent:true,opacity:.95,depthWrite:false,toneMapped:false})),
    grow=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xf2ead8,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
    disc.position.y=.5;rim.position.y=.7;grow.position.y=.9;disc.renderOrder=1;rim.renderOrder=2;grow.renderOrder=3;g.add(disc,rim,grow);g.userData={disc,rim,grow};return g}),
  ring:new Pool(()=>{const m=new THREE.Mesh(G.ring,new THREE.MeshBasicMaterial({color:0xe9b548,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=1.1;m.renderOrder=4;return m}),
};

/* ---------- particles: one Points object, soft round dots sized in world units ---------- */
const PMAX=480;
function makePoints(n){
  const geo=new THREE.BufferGeometry(),pos=new Float32Array(n*3),col=new Float32Array(n*4),size=new Float32Array(n);
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aCol',new THREE.BufferAttribute(col,4).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize',new THREE.BufferAttribute(size,1).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:600}},
    vertexShader:'attribute vec4 aCol;attribute float aSize;uniform float uScale;varying vec4 vCol;void main(){vCol=aCol;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=max(1.5,aSize*uScale/-mv.z);}',
    fragmentShader:'varying vec4 vCol;void main(){float d=length(gl_PointCoord-0.5)*2.0;float a=smoothstep(1.0,0.55,d)*vCol.a;if(a<0.01)discard;gl_FragColor=vec4(vCol.rgb,a);}'});
  const p=new THREE.Points(geo,mat);p.frustumCulled=false;p.renderOrder=6;geo.setDrawRange(0,0);scene.add(p);
  return{p,geo,pos,col,size,mat};
}
const bitsP=makePoints(PMAX),motes=makePoints(40);
const colCache=new Map();
function cssRGB(c){let v=colCache.get(c);if(v)return v;v=[1,1,1];
  if(typeof c==='string'){if(c[0]==='#'){let h=c.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const n=parseInt(h,16);v=[(n>>16)/255,(n>>8&255)/255,(n&255)/255]}
    else{const m=c.match(/[\d.]+/g);if(m&&m.length>=3)v=[m[0]/255,m[1]/255,m[2]/255]}}
  if(colCache.size>400)colCache.clear();colCache.set(c,v);return v}

/* ---------- placeholder models, used only when MBModels is missing or throws ---------- */
const PH={bone:std(0xe7dfcd),dark:basic(0x15121b),eye:basic(0xffffff),steel:std(0xb9c0c8,{metalness:.5,roughness:.4}),green:basic(0x7fd66b),wolf:std(0x8a8f96),
  cap:new THREE.CapsuleGeometry(7,22,4,10),leg:new THREE.CapsuleGeometry(2.6,16,3,6)};
function shadowAll(g){g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}
function phPlayer(){
  const g=new THREE.Group(),body=new THREE.Mesh(PH.cap,PH.bone),head=new THREE.Mesh(G.sphere,PH.bone),arm=new THREE.Mesh(G.box,PH.steel);
  body.position.y=34;head.scale.setScalar(8);head.position.y=56;arm.scale.set(2.2,2.2,26);arm.position.set(9,34,14);
  const legs=[-1,1].map(s=>{const l=new THREE.Mesh(PH.leg,PH.bone);l.position.set(s*4.5,11,0);return l});
  for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,PH.dark);e.scale.setScalar(1.9);e.position.set(s*3,57,6.6);g.add(e)}
  g.add(body,head,arm,...legs);g.userData={legs,arm,body};return shadowAll(g);
}
function phPlayerUpdate(g,P){
  const u=g.userData,a=P.atk>0?P.swing:P.face;g.rotation.y=Math.PI/2-a;
  const w=P.moving?Math.sin(P.walk||0):0;u.legs[0].rotation.x=w*.7;u.legs[1].rotation.x=-w*.7;
  u.arm.rotation.y=P.atk>0?(P.atk/.16-.5)*2.2:0;g.rotation.x=0;u.body.rotation.x=P.dashT>0?.5:0;
  g.visible=!(P.inv>0&&Math.floor(P.inv*14)%2);
}
function phMonster(m){
  const g=new THREE.Group(),r=m.r||16,mat=std(m.s&&m.s.col||'#888888',{roughness:.7}),body=new THREE.Mesh(G.sphere,mat);
  body.scale.set(r,r*.85,r);body.position.y=r*.85;g.add(body);
  for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,PH.eye),p=new THREE.Mesh(G.sphere,PH.dark);e.scale.setScalar(r*.2);e.position.set(s*r*.36,r*1.05,r*.8);p.scale.setScalar(r*.1);p.position.set(s*r*.36,r*1.05,r*.97);g.add(e,p)}
  g.userData={mat,body,r};return shadowAll(g);
}
function phMonsterUpdate(g,m){
  const u=g.userData,P=MB.P,a=(m.st==='charge'||m.st==='lunge')?m.ang:(P?Math.atan2(P.y-m.y,P.x-m.x):0);
  g.rotation.y=Math.PI/2-(a||0);u.mat.emissive.setScalar(m.flash>0?.8:0);
  const t=MB.S.t+(m.seed||0);u.body.position.y=u.r*.85+Math.sin(t*3)*u.r*.05;
  if(m.st==='wind')g.position.x+=Math.sin(t*60)*1.5;
  const k=m.st==='charge'||m.st==='lunge'?1.25:1;u.body.scale.set(u.r/Math.sqrt(k),u.r*.85/Math.sqrt(k),u.r*k);
}
function phAlly(a){
  const g=new THREE.Group(),wolf=a.kind==='wolf',r=a.r||10;
  if(wolf){const b=new THREE.Mesh(PH.cap,PH.wolf);b.rotation.x=Math.PI/2;b.scale.setScalar(r/9);b.position.y=r*1.1;const h=new THREE.Mesh(G.sphere,PH.wolf);h.scale.setScalar(r*.6);h.position.set(0,r*1.5,r*1.7);g.add(b,h)}
  else{const b=new THREE.Mesh(PH.cap,PH.bone);b.scale.setScalar(.6);b.position.y=20;const h=new THREE.Mesh(G.sphere,PH.bone);h.scale.setScalar(5.5);h.position.y=35;g.add(b,h);
    for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,PH.green);e.scale.setScalar(1.4);e.position.set(s*2.2,35.5,4.6);g.add(e)}}
  return shadowAll(g);
}
function phAllyUpdate(g,a){g.rotation.y=a.flip?-Math.PI/2:Math.PI/2;g.position.y=Math.abs(Math.sin(a.walk||0))*2}

const warned={};
function warnOnce(k,e){if(warned[k])return;warned[k]=1;console.warn('Marrowborn renderer: '+k+' model failed, using placeholder.',e&&e.message||e)}
function modelOf(name){const M=window.MBModels&&window.MBModels[name];return M&&typeof M.create==='function'&&typeof M.update==='function'?M:null}
const ents=new THREE.Group();scene.add(ents);
function makeEnt(name,e,phMake){
  const M=!warned[name]&&modelOf(name);
  if(M){try{const g=name==='player'?M.create(MB):M.create(e,MB);if(g&&g.isObject3D){ents.add(g);return{g,real:true}}throw new Error('create() returned no Object3D')}catch(err){warnOnce(name,err)}}
  const g=phMake(e);ents.add(g);return{g,real:false};
}
function updateEnt(rec,name,e,dt,phMake,phUpdate){
  if(rec.real){
    try{if(name==='player')window.MBModels.player.update(rec.g,e,MB,dt);else window.MBModels[name].update(rec.g,e,MB,dt);return}
    catch(err){warnOnce(name,err);const pos=rec.g.position.clone();ents.remove(rec.g);rec.g=phMake(e);rec.g.position.copy(pos);rec.real=false;ents.add(rec.g)}
  }
  phUpdate(rec.g,e,dt);
}
let playerRec=null,stamp=0;
const monMap=new Map(),allyMap=new Map();
function syncMap(map,list,name,dt,phMake,phUpdate,sight){
  const P=MB.P;
  for(let i=0;i<list.length;i++){
    const e=list[i];let rec=map.get(e);
    if(!rec){rec=makeEnt(name,e,phMake);map.set(e,rec)}
    rec.stamp=stamp;
    let hide=!!e.hidden;
    if(!hide&&!sight&&P){const dx=e.x-P.x,dy=e.y-P.y,lim=FOG+(e.r||0)+8;if(dx*dx+dy*dy>lim*lim)hide=true}
    rec.g.position.set(e.x,(e.lift||0)*LIFT,e.y);rec.g.visible=!hide;
    updateEnt(rec,name,e,dt,phMake,phUpdate);
    if(hide)rec.g.visible=false;
  }
  if(map.size>list.length)for(const[e,rec]of map)if(rec.stamp!==stamp){ents.remove(rec.g);map.delete(e)}
}

/* ---------- camera ---------- */
const v3=new THREE.Vector3(),camTarget=new THREE.Vector3(W/2,0,H/2),basePos=new THREE.Vector3();
let fitD=1200,zoom=1,viewW=0,viewH=0,viewPR=0;
function placeCamera(tx,tz,d){camera.position.set(tx,d*Math.sin(TILT),tz+d*Math.cos(TILT));camera.lookAt(tx,0,tz);camera.updateMatrixWorld()}
function fitCamera(){
  // nearest distance at which the whole floor is on screen, looking at the arena centre
  let lo=300,hi=5000;
  for(let i=0;i<22;i++){
    const d=(lo+hi)/2;placeCamera(W/2,H/2,d);let ok=true;
    for(const[x,z]of[[0,0],[W,0],[0,H],[W,H]]){v3.set(x,0,z).project(camera);if(Math.abs(v3.x)>.985||Math.abs(v3.y)>.97)ok=false}
    if(ok)hi=d;else lo=d;
  }
  fitD=hi;
}
function resize(){
  const w=cv.clientWidth||glc.clientWidth,h=cv.clientHeight||glc.clientHeight,pr=Math.min(2,window.devicePixelRatio||1);
  if(!w||!h||(w===viewW&&h===viewH&&pr===viewPR))return;
  viewW=w;viewH=h;viewPR=pr;
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera();
  const s=h*pr/(2*Math.tan(camera.fov*Math.PI/360));bitsP.mat.uniforms.uScale.value=s;motes.mat.uniforms.uScale.value=s;
}
const sp={x:0,y:0,ok:true};
function toScreen(x,y,z){v3.set(x,y,z).project(camera);sp.x=(v3.x*.5+.5)*W;sp.y=(.5-v3.y*.5)*H;sp.ok=v3.z<1;return sp}

/* ---------- 2D overlay ---------- */
function groundEllipse(x,z,r){ // screen-space ellipse of a circle lying on the floor
  toScreen(x,0,z);const cx=sp.x,cy=sp.y;toScreen(x+r,0,z);const rx=Math.abs(sp.x-cx);toScreen(x,0,z+r);const a=Math.abs(sp.y-cy);toScreen(x,0,z-r);const b=Math.abs(sp.y-cy);
  return{cx,cy:cy+(a-b)/2,rx,ry:(a+b)/2};
}
let vig=null;
function vignette(){if(!vig){vig=ctx.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,H*.98);vig.addColorStop(0,'rgba(4,3,8,0)');vig.addColorStop(1,'rgba(4,3,8,.62)')}return vig}
function drawOverlay(sight){
  const S=MB.S,P=MB.P;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0);
  if(!sight&&P){
    // no eyes: everything past arm's reach is black
    const e=groundEllipse(P.x,P.y,FOG*1.04),k=e.ry/e.rx;
    ctx.save();ctx.translate(e.cx,e.cy-10);ctx.scale(1,k);
    const g=ctx.createRadialGradient(0,0,e.rx*.36,0,0,e.rx);
    g.addColorStop(0,'rgba(5,4,8,0)');g.addColorStop(.3,'rgba(5,4,8,.12)');g.addColorStop(.62,'rgba(5,4,8,.55)');g.addColorStop(.85,'rgba(5,4,8,.9)');g.addColorStop(1,'rgba(5,4,8,.985)');
    ctx.fillStyle=g;ctx.fillRect(-W*2,-H*2/k,W*4,H*4/k);ctx.restore();
    // ...but footsteps still come up through the floor
    const rings=MB.rings;
    for(let i=0;i<rings.length;i++){const r=rings[i];if(!r.fx&&r.under)continue;
      const q=1-r.life/r.max,hot=r.fx,el=groundEllipse(r.x,r.y,6+r.r*q);
      ctx.globalAlpha=Math.max(0,(1-q)*(hot?.9:.62));ctx.strokeStyle=hot?'#d6a544':'#e7dfcd';ctx.lineWidth=hot?3:1.8;
      ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx,el.ry,0,0,TAU);ctx.stroke()}
    ctx.globalAlpha=1;
    // ...and so does the weight of a blow about to land, once there are nerves to feel it
    if(MB.has('touch')){const zs=MB.zones;
      for(let i=0;i<zs.length;i++){const z=zs[i],q=Math.min(1,z.t/z.dur),el=groundEllipse(z.x,z.y,z.r);
        ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx,el.ry,0,0,TAU);ctx.fillStyle='rgba(184,38,61,'+(.14+.3*q)+')';ctx.fill();ctx.strokeStyle='#d6a544';ctx.lineWidth=2;ctx.stroke();
        ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx*q,el.ry*q,0,0,TAU);ctx.strokeStyle='rgba(231,223,205,.8)';ctx.stroke()}}
  }
  else if(sight){ctx.fillStyle=vignette();ctx.fillRect(0,0,W,H)}
  const floats=MB.floats;
  if(floats.length){ctx.font='22px "Pirata One",Georgia,serif';ctx.textAlign='center';
    for(let i=0;i<floats.length;i++){const f=floats[i];toScreen(f.x,26,f.y);if(!sp.ok)continue;ctx.globalAlpha=Math.max(0,Math.min(1,f.life*2.5));ctx.fillStyle='#0d0c11';ctx.fillText(f.txt,sp.x+1.5,sp.y+1.5);ctx.fillStyle=f.c;ctx.fillText(f.txt,sp.x,sp.y)}
    ctx.globalAlpha=1}
  if(MB.has('touch')){
    const mons=MB.mons;ctx.font='700 30px Spectral,Georgia,serif';ctx.textAlign='center';
    for(let i=0;i<mons.length;i++){const m=mons[i];if(m.st!=='wind')continue;
      toScreen(m.x,m.r*2.3+16+(m.lift||0)*LIFT,m.y);ctx.fillStyle='#0d0c11';ctx.fillText('!',sp.x+1.5,sp.y+1.5);ctx.fillStyle='#d6a544';ctx.fillText('!',sp.x,sp.y)}
  }
  if(S.banner>0&&S.mode==='play'&&S.L){
    const L=S.L;ctx.globalAlpha=Math.min(1,S.banner/.6);ctx.textAlign='center';
    ctx.fillStyle='rgba(13,12,17,.72)';ctx.fillRect(0,196,W,150);
    ctx.fillStyle='#d6a544';ctx.font='600 15px Spectral,Georgia,serif';ctx.fillText(('LEVEL '+(S.level+1)+'  ·  '+L.spec.name).toUpperCase(),W/2,228);
    ctx.fillStyle='#e7dfcd';ctx.font='58px "Pirata One",Georgia,serif';ctx.fillText(L.title,W/2,286);
    ctx.fillStyle='#b9b2c6';ctx.font='italic 20px Spectral,Georgia,serif';ctx.fillText(L.hint,W/2,322);ctx.globalAlpha=1;
  }
}

/* ---------- frame ---------- */
let lastSight=null,alive=true;
function draw(dt){
  if(!alive)return;
  const S=MB.S,P=MB.P,sight=MB.has('sight'),t=S.t;
  resize();syncEnv();
  if(sight!==lastSight){lastSight=sight;glc.style.filter=sight?'none':'grayscale(1) contrast(1.06)'}

  // camera: leans toward the player, never far from the arena centre
  const follow=sight?.22:.3,tx=P?W/2+(P.x-W/2)*follow:W/2,tz=(P?H/2+(P.y-H/2)*follow:H/2)-4,k=1-Math.exp(-dt*3.2);
  camTarget.x+=(tx-camTarget.x)*k;camTarget.z+=(tz-camTarget.z)*k;
  const zt=sight?.93:.88;zoom+=(zt-zoom)*k;
  placeCamera(camTarget.x,camTarget.z,fitD*zoom);basePos.copy(camera.position);
  scene.fog.near=fitD*zoom*.95;scene.fog.far=fitD*zoom+(env.crypt?2600:1300);

  // lights
  if(!sight){
    hemi.color.setHex(0xaab0c0);hemi.groundColor.setHex(0x1c1c22);hemi.intensity=.5;
    sun.color.setHex(0xffffff);sun.intensity=.85;
    points[0].color.setHex(0xffffff);points[0].intensity=1.05;points[0].distance=FOG*2.4;points[0].position.set(P?P.x:W/2,140,(P?P.y:H/2)+34);
    for(let i=1;i<4;i++)points[i].intensity=0;
  }else if(env.crypt){
    hemi.color.setHex(0x8f93ac);hemi.groundColor.setHex(0x2a1e14);hemi.intensity=.22;
    sun.color.setHex(0xcfd8f6);sun.intensity=1.0;
  }else{
    hemi.color.setHSL(env.hue/360,.07,.62);hemi.groundColor.setHSL(env.hue/360,.12,.1);hemi.intensity=.26;
    sun.color.setHex(0xe6e9f2);sun.intensity=1.05;
  }
  for(let i=0;i<4;i++){
    const f=env.flames[i],lit=sight,fl=1+.13*Math.sin(t*9+f.ph)+.07*Math.sin(t*23.7+f.ph*2.3);
    f.fl.visible=lit;
    if(lit){
      const l=points[i];l.color.copy(env.lightColor);l.intensity=(env.crypt?4.6:1.6)*fl;l.distance=env.crypt?500:400;l.position.set(CORNERS[i][0]+(i%2?-46:46),f.y+78,CORNERS[i][1]+(i<2?46:-46));
      if(env.crypt){f.f1.scale.set(30*fl,48*fl+4*Math.sin(t*17+f.ph),1);f.f1.position.y=f.y+10+Math.sin(t*13+f.ph)*1.2;f.f2.scale.set(15,24*fl,1);f.halo.material.opacity=.3*fl}
      else{f.f1.scale.setScalar(40*fl);f.f2.scale.setScalar(16);f.halo.material.opacity=.16*fl;env.crystals[i].rotation.y=t*.6+i}
    }
  }
  for(let i=0;i<env.lit.length;i++)env.lit[i].m.color.setHex(sight?env.lit[i].on:env.lit[i].off);

  // the living
  stamp++;
  if(P){
    if(!playerRec)playerRec=makeEnt('player',P,phPlayer);
    playerRec.g.position.set(P.x,0,P.y);playerRec.g.visible=true;
    updateEnt(playerRec,'player',P,dt,phPlayer,phPlayerUpdate);
  }else if(playerRec)playerRec.g.visible=false;
  syncMap(monMap,MB.mons,'monster',dt,phMonster,phMonsterUpdate,sight);
  syncMap(allyMap,MB.allies,'ally',dt,phAlly,phAllyUpdate,true);

  // projectiles
  for(const k2 in pools)pools[k2].begin();
  const shots=MB.shots;
  for(let i=0;i<shots.length;i++){const s=shots[i],o=pools.shot.get(),r=s.r||5;o.position.set(s.x,SHOT_Y,s.y);o.scale.setScalar(r);o.userData.core.scale.setScalar(.8+.12*Math.sin(t*30+i))}
  const ps=MB.pshots;
  for(let i=0;i<ps.length;i++){const p=ps[i],r=p.r||5,pool=pools[p.kind]||pools.bolt,o=pool.get();o.position.set(p.x,SHOT_Y,p.y);
    if(p.kind==='arrow')o.rotation.y=Math.PI/2-Math.atan2(p.vy,p.vx);
    else if(p.kind==='skull'){o.scale.setScalar(r*1.25);o.userData.core.rotation.y=Math.PI/2-Math.atan2(p.vy,p.vx);o.userData.core.rotation.z=Math.sin(t*14+i)*.25}
    else{o.scale.setScalar(Math.max(4.5,r));o.userData.core.scale.setScalar(.8)}}
  const mor=MB.morsels;
  for(let i=0;i<mor.length;i++){const f=mor[i],o=pools.morsel.get();o.position.set(f.x,0,f.y);const b=o.userData.bob;b.position.y=13+Math.sin(t*4+i)*3;b.rotation.y=t*1.6+i}
  if(sight&&MB.has('touch')){const zs=MB.zones;
    for(let i=0;i<zs.length;i++){const z=zs[i],q=Math.min(1,z.t/z.dur),o=pools.zone.get(),u=o.userData;o.position.set(z.x,0,z.y);
      u.disc.scale.setScalar(z.r);u.rim.scale.setScalar(z.r);u.grow.scale.setScalar(Math.max(.01,z.r*q));u.disc.material.opacity=.16+.4*q+(q>.8?.12*Math.sin(t*40):0)}}
  if(sight){const rs=MB.rings,hear=MB.has('hearing');
    for(let i=0;i<rs.length;i++){const r=rs[i];if(!r.fx&&!(r.under&&hear))continue;
      const q=1-r.life/r.max,o=pools.ring.get();o.position.x=r.x;o.position.z=r.y;o.scale.setScalar(6+r.r*q);o.material.opacity=Math.max(0,(1-q)*.9)}}
  for(const k2 in pools)pools[k2].end();

  // particles
  {const bits=MB.bits,n=Math.min(PMAX,bits.length),pos=bitsP.pos,col=bitsP.col,size=bitsP.size;
    for(let i=0;i<n;i++){const b=bits[i],q=Math.max(0,b.life/b.max),c=cssRGB(b.c);
      pos[i*3]=b.x;pos[i*3+1]=12+Math.sin((1-q)*Math.PI)*16+(i%5)*2;pos[i*3+2]=b.y;
      col[i*4]=c[0];col[i*4+1]=c[1];col[i*4+2]=c[2];col[i*4+3]=q;size[i]=(b.r||2.5)*2.3}
    bitsP.geo.setDrawRange(0,n);
    if(n){bitsP.geo.attributes.position.needsUpdate=true;bitsP.geo.attributes.aCol.needsUpdate=true;bitsP.geo.attributes.aSize.needsUpdate=true}}
  {const n=sight?40:0,pos=motes.pos,col=motes.col,size=motes.size;
    for(let i=0;i<n;i++){pos[i*3]=(i*137.5+t*(6+i%5))%W;pos[i*3+1]=14+(i*37%70)+Math.sin(t*.5+i)*8;pos[i*3+2]=(i*89.3+Math.sin(t*.4+i)*30+t*(3+i%3)+60)%H;
      col[i*4]=1;col[i*4+1]=.9;col[i*4+2]=.68;col[i*4+3]=.2+.14*Math.sin(t*1.3+i*2.1);size[i]=2.4+(i%3)*.9}
    motes.geo.setDrawRange(0,n);
    if(n){motes.geo.attributes.position.needsUpdate=true;motes.geo.attributes.aCol.needsUpdate=true;motes.geo.attributes.aSize.needsUpdate=true}}

  // shake moves the camera for this frame only, so picking stays steady
  if(S.shake>0&&!calm){const a=S.shake*24;camera.position.x+=(Math.random()-.5)*a;camera.position.y+=(Math.random()-.5)*a*.7;camera.updateMatrixWorld()}
  renderer.render(scene,camera);
  drawOverlay(sight);
  camera.position.copy(basePos);camera.updateMatrixWorld();
}

const dir=new THREE.Vector3();
function screenToGame(cx,cy){
  if(!alive)return linearPick(cx,cy);
  const r=cv.getBoundingClientRect();if(!r.width||!r.height)return{x:W/2,y:H/2};
  const nx=(cx-r.left)/r.width*2-1,ny=1-(cy-r.top)/r.height*2;
  dir.set(nx,ny,.5).unproject(camera).sub(camera.position);
  if(dir.y>-1e-6)return linearPick(cx,cy);
  const k=-camera.position.y/dir.y;
  return{x:camera.position.x+dir.x*k,y:camera.position.z+dir.z*k};
}
function dispose(){
  if(!alive)return;alive=false;R.ok=false;
  glc.hidden=true;glc.style.filter='';cv.style.zIndex='';
  glc.removeEventListener('webglcontextlost',onLost);
  try{ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,cv.width,cv.height)}catch(e){}
  try{if(env)disposeEnv(env);renderer.dispose()}catch(e){}
}
function onLost(e){e.preventDefault();console.warn('Marrowborn: WebGL context lost, falling back to 2D');dispose()}
glc.addEventListener('webglcontextlost',onLost);

// a CSS filter lifts #gl into its own stacking layer; give the overlay canvas a z-index so it stays on top (below #ov, which has z-index 1)
cv.style.zIndex='0';
glc.style.transition='filter 1.2s';
glc.hidden=false;
resize();placeCamera(W/2,H/2,fitD);
R.draw=draw;R.screenToGame=screenToGame;R.dispose=dispose;R.ok=true;
})();
