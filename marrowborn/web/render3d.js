/* ==========================================================================================================
   window.MBStyle: the shared cel-shading kit. Defined at script load (needs only THREE), used by the models and the renderer.
     toon(hex, opts)    -> CACHED MeshToonMaterial (never mutate it; ask for another variant).
                           opts: emissive, emissiveIntensity, steps 2|3|4 (default 3), transparent, opacity, side, rim (default true),
                                 also passed through: flatShading, depthWrite, alphaTest, map, fog.
                           Stepped light from one shared ramp texture per step count; lights, fog and received shadows all work.
                           rim = a stepped back-light on edges facing up and away from the camera (one extra term in the fragment shader).
     toonRaw(hex, opts) -> the same material but NOT cached: the caller owns and may mutate/dispose it.
     glow(hex, opts)    -> CACHED unlit additive MeshBasicMaterial (depthWrite off). opts: opacity, side, map, depthTest.
     outline(obj, opts) -> ink outlines for every Mesh under obj (skips userData.noOutline, additive/see-through/sprite things):
                           a child mesh that shares the geometry and draws its back faces pushed out along smoothed normals in the
                           vertex shader. opts.thickness in world units (default 1.1), opts.color (default palette.ink). Never casts
                           shadows, one shared material per thickness+colour. Safe to call again (also after swapping a mesh's geometry).
                           In low graphics nothing is created; the request is remembered on obj.userData.mbOutline and
                           MBStyle.refresh(root) builds or strips outlines when the quality changes (the renderer calls it).
     COLOUR: hex values are what you see. toon() and glow() take ordinary sRGB hex (or '#rrggbb' / THREE.Color) and convert it, so a
                           surface in full light shows the hex you asked for (the old std materials showed it paler). Shadow bands are deep.
     palette            -> hex numbers. quality -> 'high'|'low' (live mirror of MB.settings.gfx). outlinesOn -> bool (live).
   ========================================================================================================== */
(function(){
'use strict';
const THREE=window.THREE;if(!THREE||window.MBStyle)return;
const palette={
  ink:0x0b0a16,shadow:0x1d1a3c,night:0x12102a,bone:0xece4d2,blood:0xc2203f,gold:0xf0b848,steel:0xc9d2e4,iron:0x2b2a3a,leather:0x3a2a2c,cloth:0x1c1b2c,
  white:0xffffff,power:0x8b4dff,power2:0xc4f4ff,powerDeep:0x3d1c9c,foe:0xff2d55,foe2:0xffb0a0,friend:0x6fe07a,necro:0x7dff8c,beast:0xcfeaff,
  fire:0xff8a3a,frost:0x8fd3ff,holy:0xffd66e,rim:0x93a0ff};
const low=()=>{try{const M=window.MB;return !!(M&&M.settings&&M.settings.gfx==='low')}catch(e){return false}};
const hexOf=c=>typeof c==='number'?c:new THREE.Color(c).getHex();
const lin=m=>{m.color.convertSRGBToLinear();if(m.emissive)m.emissive.convertSRGBToLinear();return m};

// light ramps: 32 texels across N.L = -1..1; hard steps, deep shadow band (the hemisphere light fills it with indigo)
const BANDS={2:[[-1,.16],[.04,1]],3:[[-1,.12],[-.04,.56],[.46,1]],4:[[-1,.1],[-.22,.36],[.12,.7],[.56,1]]};
const ramps={};
function ramp(steps){
  steps=BANDS[steps]?steps:3;if(ramps[steps])return ramps[steps];
  const n=32,d=new Uint8Array(n*4),b=BANDS[steps];
  for(let i=0;i<n;i++){const ndl=(i+.5)/n*2-1;let v=b[0][1];for(let j=1;j<b.length;j++)if(ndl>=b[j][0])v=b[j][1];const q=Math.round(v*255);d[i*4]=d[i*4+1]=d[i*4+2]=q;d[i*4+3]=255}
  const t=new THREE.DataTexture(d,n,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;
  return ramps[steps]=t;
}
// rim light: shared uniform (rgb = colour x strength) so the renderer can retune it per place; view-space direction is fixed because the camera tilt is
const uRim={value:new THREE.Color(palette.rim).multiplyScalar(.55)};
function rimCompile(sh){
  sh.uniforms.mbRim=uRim;
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 mbRim;')
    .replace('#include <output_fragment>','{float mbF=1.0-saturate(dot(normal,normalize(vViewPosition)));float mbD=smoothstep(0.0,0.35,normal.y*0.8+normal.x*0.35+0.12);outgoingLight+=mbRim*(smoothstep(0.6,0.68,mbF)*mbD)*(0.3+0.7*diffuseColor.rgb);}\n#include <output_fragment>');
}
function toonRaw(hex,o){
  o=o||{};
  const p={color:hexOf(hex),gradientMap:ramp(o.steps||3)};
  if(o.emissive!==undefined){p.emissive=hexOf(o.emissive);p.emissiveIntensity=o.emissiveIntensity===undefined?1:o.emissiveIntensity}
  if(o.transparent){p.transparent=true}
  if(o.opacity!==undefined)p.opacity=o.opacity;
  if(o.side!==undefined)p.side=o.side;
  if(o.depthWrite!==undefined)p.depthWrite=o.depthWrite;
  if(o.alphaTest)p.alphaTest=o.alphaTest;
  if(o.map)p.map=o.map;
  if(o.fog===false)p.fog=false;
  const m=new THREE.MeshToonMaterial(p);
  if(o.flatShading){m.flatShading=true}
  if(o.rim!==false)m.onBeforeCompile=rimCompile;
  lin(m);
  m.userData.mbToon=true;
  return m;
}
const toonCache=new Map(),glowCache=new Map(),lineCache=new Map();
const idOf=x=>x&&x.uuid?x.uuid:'';
function toon(hex,o){
  o=o||{};const h=hexOf(hex);
  const k=h+'|'+(o.emissive===undefined?'':hexOf(o.emissive))+'|'+(o.emissiveIntensity===undefined?'':o.emissiveIntensity)+'|'+(o.steps||3)+'|'+(o.transparent?1:0)+'|'+(o.opacity===undefined?'':o.opacity)+'|'+(o.side===undefined?'':o.side)+'|'+(o.rim===false?0:1)+'|'+(o.flatShading?1:0)+'|'+(o.depthWrite===undefined?'':+o.depthWrite)+'|'+(o.alphaTest||'')+'|'+idOf(o.map)+'|'+(o.fog===false?0:1);
  let m=toonCache.get(k);if(!m){m=toonRaw(h,o);toonCache.set(k,m)}return m;
}
function glow(hex,o){
  o=o||{};const h=hexOf(hex),op=o.opacity===undefined?1:o.opacity;
  const k=h+'|'+op+'|'+(o.side===undefined?'':o.side)+'|'+idOf(o.map)+'|'+(o.depthTest===false?0:1);
  let m=glowCache.get(k);
  if(!m){m=new THREE.MeshBasicMaterial({color:h,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op,toneMapped:false,fog:false});
    if(o.side!==undefined)m.side=o.side;if(o.map)m.map=o.map;if(o.depthTest===false)m.depthTest=false;lin(m);m.userData.mbGlow=true;glowCache.set(k,m)}
  return m;
}

/* ---- ink outlines (inverted hull) ---- */
// uMin = the smallest useful thickness in world units for the current view (about a pixel and a bit); the renderer keeps it current
const uMin={value:0};
const LINE_VS=[
  'attribute vec3 mbN;uniform float uT;uniform float uMin;',
  '#include <common>',
  '#include <fog_pars_vertex>',
  'void main(){',
  ' vec3 n=mbN;float l=length(n);vec4 p=vec4(position,1.0);',
  ' #ifdef USE_INSTANCING',
  '  mat3 im=mat3(instanceMatrix);n/=vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));n=im*n;p=instanceMatrix*p;',
  ' #endif',
  ' vec3 vn=normalMatrix*n;float vl=length(vn);vn=vl>1e-6?vn/vl*l:vec3(0.0);',
  ' vec4 mvPosition=modelViewMatrix*p;mvPosition.xyz+=vn*max(uT,uMin);',
  ' gl_Position=projectionMatrix*mvPosition;',
  ' #include <fog_vertex>',
  '}'].join('\n');
const LINE_FS='uniform vec3 uC;\n#include <common>\n#include <fog_pars_fragment>\nvoid main(){gl_FragColor=vec4(uC,1.0);\n#include <fog_fragment>\n}';
function lineMat(th,col){
  const k=th+'|'+col;let m=lineCache.get(k);
  if(!m){m=new THREE.ShaderMaterial({uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uT:{value:th},uC:{value:new THREE.Color(col)}}]),vertexShader:LINE_VS,fragmentShader:LINE_FS,side:THREE.BackSide,fog:true});
    m.uniforms.uMin=uMin;m.userData.mbLine=true;m.visible=!low();lineCache.set(k,m)}
  return m;
}
// one extra attribute per geometry, computed once: normals averaged over vertices that share a position (so hard-edged and flat-shaded
// shapes get a closed hull), lengthened at corners so the line keeps its width on every face
function hullNormals(geo){
  if(geo.attributes.mbN)return true;
  const P=geo.attributes.position,N=geo.attributes.normal;if(!P||!N)return false;
  const n=P.count,out=new Float32Array(n*3);
  if(n>24000){for(let i=0;i<n;i++){out[i*3]=N.getX(i);out[i*3+1]=N.getY(i);out[i*3+2]=N.getZ(i)}}
  else{
    if(!geo.boundingSphere)geo.computeBoundingSphere();
    const q=4096/Math.max(1e-6,geo.boundingSphere?geo.boundingSphere.radius:1),groups=new Map(),gid=new Int32Array(n),acc=[];
    for(let i=0;i<n;i++){
      const key=Math.round(P.getX(i)*q)+'_'+Math.round(P.getY(i)*q)+'_'+Math.round(P.getZ(i)*q);
      let g=groups.get(key);if(g===undefined){g=acc.length;groups.set(key,g);acc.push([])}
      gid[i]=g;const a=acc[g],x=N.getX(i),y=N.getY(i),z=N.getZ(i);let dup=false;
      for(let j=0;j<a.length;j+=3)if(a[j]*x+a[j+1]*y+a[j+2]*z>.995){dup=true;break}
      if(!dup&&a.length<36)a.push(x,y,z);
    }
    const res=new Float32Array(acc.length*3),ok=new Uint8Array(acc.length);
    for(let g=0;g<acc.length;g++){const a=acc[g];let x=0,y=0,z=0;for(let j=0;j<a.length;j+=3){x+=a[j];y+=a[j+1];z+=a[j+2]}
      const l=Math.hypot(x,y,z);if(l<1e-4)continue;x/=l;y/=l;z/=l;
      let d=0;for(let j=0;j<a.length;j+=3)d+=a[j]*x+a[j+1]*y+a[j+2]*z;d/=a.length/3;
      const s=1/Math.max(.55,Math.min(1,d));res[g*3]=x*s;res[g*3+1]=y*s;res[g*3+2]=z*s;ok[g]=1}
    for(let i=0;i<n;i++){const g=gid[i];if(ok[g]){out[i*3]=res[g*3];out[i*3+1]=res[g*3+1];out[i*3+2]=res[g*3+2]}else{out[i*3]=N.getX(i);out[i*3+1]=N.getY(i);out[i*3+2]=N.getZ(i)}}
  }
  geo.setAttribute('mbN',new THREE.BufferAttribute(out,3));
  return true;
}
function wantsLine(o){
  if(!o.isMesh||o.userData.mbLine||o.userData.noOutline||!o.geometry||!o.geometry.attributes||o.isSkinnedMesh)return false;
  const m=Array.isArray(o.material)?o.material[0]:o.material;if(!m)return false;
  if(m.blending===THREE.AdditiveBlending||m.depthWrite===false||(m.transparent&&m.opacity<.9)||m.visible===false)return false;
  return true;
}
function lock(o,name,val){try{Object.defineProperty(o,name,{get(){return val},set(){},configurable:true,enumerable:true})}catch(e){}}
const _todo=[];
function outline(root,opts){
  if(!root||!root.traverse)return root;
  const th=opts&&opts.thickness>0?+opts.thickness:1.1,col=opts&&opts.color!==undefined?hexOf(opts.color):palette.ink;
  root.userData.mbOutline={thickness:th,color:col};
  if(low())return root;
  const mat=lineMat(th,col);
  _todo.length=0;
  root.traverse(o=>{if(wantsLine(o))_todo.push(o)});
  for(let i=0;i<_todo.length;i++){
    const o=_todo[i];let c=o.userData.mbLineMesh;
    if(c&&c.parent===o){if(c.geometry!==o.geometry&&hullNormals(o.geometry))c.geometry=o.geometry;if(o.isInstancedMesh){c.count=o.count;c.instanceMatrix=o.instanceMatrix}continue}
    if(!hullNormals(o.geometry))continue;
    if(o.isInstancedMesh){c=new THREE.InstancedMesh(o.geometry,mat,0);c.instanceMatrix=o.instanceMatrix;c.count=o.count;c.frustumCulled=false}
    else c=new THREE.Mesh(o.geometry,mat);
    c.userData.mbLine=true;c.userData.noOutline=true;c.name='mbLine';c.matrixAutoUpdate=false;c.receiveShadow=false;c.renderOrder=o.renderOrder;
    // model code that walks a group to set shadows or swap materials (hit flash) must not disturb the line
    lock(c,'castShadow',false);lock(c,'material',mat);
    o.userData.mbLineMesh=c;o.add(c);
  }
  _todo.length=0;
  return root;
}
function strip(root){
  _todo.length=0;root.traverse(o=>{if(o.userData&&o.userData.mbLine)_todo.push(o)});
  for(let i=0;i<_todo.length;i++){const c=_todo[i],p=c.parent;if(p){p.remove(c);if(p.userData.mbLineMesh===c)p.userData.mbLineMesh=null}}
  _todo.length=0;
}
const _roots=[];
function refresh(root){
  const on=!low();
  lineCache.forEach(m=>{m.visible=on});
  if(!root)return;
  if(!on){strip(root);return}
  _roots.length=0;root.traverse(o=>{if(o.userData&&o.userData.mbOutline)_roots.push(o)});
  for(let i=0;i<_roots.length;i++)outline(_roots[i],_roots[i].userData.mbOutline);
  _roots.length=0;
}
window.MBStyle={toon,toonRaw,glow,outline,strip,refresh,palette,ramp,uRim,uMin,
  get quality(){return low()?'low':'high'},
  get outlinesOn(){return !low()}};
})();

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
const ST=window.MBStyle,PAL=ST.palette;

let renderer;
try{
  const hiDpi=(window.devicePixelRatio||1)>=2;
  renderer=new THREE.WebGLRenderer({canvas:glc,antialias:!hiDpi,alpha:false,powerPreference:'high-performance',stencil:false});
  if(!renderer.getContext())throw new Error('no context');
}catch(e){console.warn('Marrowborn: WebGL unavailable, staying 2D');return}

const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const TILT=52*Math.PI/180,LIFT=46,SHOT_Y=17;
// Colour: plain linear tone mapping (ACES bleached the class and monster colours toward white) and moderate lights; the floor textures are lifted instead.
// Cel look: one strong key light with crisp shadows, a cool indigo fill, torches as accents. Characters use MBStyle.toon (sRGB-true colours);
// the place uses the same toon ramp but paler, darker colours (ENV_K) so heroes, monsters and glows stand out against it.
const EXPOSURE=1.0,FLOOR_GAIN=.6,SUN_K=1.65,HEMI_K=1.25,PT_K=.5,ENV_K=.52;
// overlay text: one family constant (the page may bundle a font later)
const FONT='"Rajdhani","Oswald","Barlow Condensed","Roboto Condensed","Arial Narrow","sans-serif-condensed","Helvetica Neue",Arial,sans-serif';
// graphics quality: MB.settings.gfx 'low' = no shadow maps, pixel ratio 1, no bump maps, two point lights, few particles, blob shadows
const Q={low:false};
const isLow=()=>!!(MB.settings&&MB.settings.gfx==='low');
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.LinearToneMapping;renderer.toneMappingExposure=EXPOSURE;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x050408);
scene.fog=new THREE.Fog(0x050408,900,2600);
const camera=new THREE.PerspectiveCamera(30,W/H,50,6000);

/* ---------- lights: a constant set (hemisphere, one shadow sun, four points) so shaders never recompile ---------- */
const hemi=new THREE.HemisphereLight(0x7078e0,0x1c1436,.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,.8);
sun.position.set(W/2-300,620,H/2+300);sun.target.position.set(W/2,0,H/2);
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
{const c=sun.shadow.camera;c.left=-560;c.right=560;c.top=420;c.bottom=-420;c.near=100;c.far=1500;c.updateProjectionMatrix()}
sun.shadow.bias=-.0006;sun.shadow.normalBias=.8;sun.shadow.radius=1;
scene.add(sun,sun.target);
const CORNERS=[[WALL+9,WALL+9],[W-WALL-9,WALL+9],[WALL+9,H-WALL-9],[W-WALL-9,H-WALL-9]];
const points=CORNERS.map(()=>{const l=new THREE.PointLight(0xff9a48,0,520,1.5);scene.add(l);return l});
// two spare lights for whichever fire braziers are burning (high quality only)
const XL=[0,1].map(()=>{const l=new THREE.PointLight(0xff8a3a,0,330,1.6);scene.add(l);return l});

/* ---------- small helpers ---------- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function rng(seed){const f=()=>(f.s=f.s*16807%2147483647)/2147483647;f.s=seed;return f}
const hsl=(h,s,l,a)=>a===undefined?`hsl(${h},${s}%,${l}%)`:`hsla(${h},${s}%,${l}%,${a})`;
const hslColor=(h,s,l)=>new THREE.Color().setHSL(((h%360)+360)%360/360,s,l);
function canvasTex(c,repeat){const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=maxAniso;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping}return t}

const glowTex=(()=>{const c=mkCanvas(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.85)');gr.addColorStop(.45,'rgba(255,255,255,.28)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const glowMat=(hex,op)=>new THREE.SpriteMaterial({map:glowTex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op===undefined?1:op,fog:false,toneMapped:false});
const flatGlowMat=(hex,op)=>new THREE.MeshBasicMaterial({map:glowTex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:op,fog:false,toneMapped:false});
const basic=(hex,o)=>new THREE.MeshBasicMaterial(Object.assign({color:hex,toneMapped:false},o||{}));
// scenery material: toon ramp, colour kept as authored for the old lighting and scaled down (not cached: places dispose what they build)
const _c0=new THREE.Color();
function std(hex,o){o=o||{};const q={flatShading:!!o.flatShading,steps:o.steps||3};
  if(o.transparent){q.transparent=true;q.opacity=o.opacity}if(o.depthWrite===false)q.depthWrite=false;if(o.side!==undefined)q.side=o.side;if(o.map)q.map=o.map;if(o.alphaTest)q.alphaTest=o.alphaTest;if(o.rim===false)q.rim=false;
  const m=ST.toonRaw(0xffffff,q);m.color.copy(_c0.set(hex)).multiplyScalar(o.k===undefined?ENV_K:o.k);
  if(o.emissive!==undefined){m.emissive.copy(_c0.set(o.emissive));m.emissiveIntensity=o.emissiveIntensity===undefined?1:o.emissiveIntensity}
  return m}
const noLine=o=>{o.userData.noOutline=true;return o};
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
function floorTexture(theme,hue,area,low){
  const TW=low?1024:2048,TH=TW/2,c=mkCanvas(TW,TH),g=c.getContext('2d'),rnd=rng(11+hue);
  g.scale(TW/W,TH/H);
  const crypt=theme==='crypt',court=area==='court';
  // base colour [h,s,l], slab colour fn, share of ground that is paved
  const A={crypt:[[hue,14,5],1],pass:[[hue,20,13],.74],ash:[[20,14,8],.46],fen:[[140,24,10],.5],peaks:[[215,18,17],.6],court:[[285,25,5],1],dark:[[340,34,4],.84]}[area]||[[hue,20,13],.74];
  const eh=A[0][0];
  g.fillStyle=hsl(A[0][0],A[0][1],A[0][2]);g.fillRect(0,0,W,H);
  if(!crypt&&!court){ // bare earth showing between the slabs
    for(let i=0;i<520;i++){const x=rnd()*W,y=rnd()*H,r=8+rnd()*34,l=rnd();g.fillStyle=l<.5?hsl(eh+rnd()*30-15,22,A[0][2]+4+rnd()*7,.25):'rgba(0,0,0,.14)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
    for(let i=0;i<1500;i++){g.fillStyle=hsl(eh+rnd()*40-20,28,A[0][2]+9+rnd()*14,.55);g.fillRect(rnd()*W,rnd()*H,1+rnd()*1.6,2+rnd()*3.5)}
  }
  const slabCol=v=>crypt?hsl(232+v*16-8,9+v*5,21+v*9):area==='ash'?hsl(24,3+v*4,17+v*9):area==='fen'?hsl(135+v*30,9+v*9,20+v*9):area==='peaks'?hsl(215,8+v*6,27+v*10):area==='dark'?hsl(340,9+v*9,13+v*7):hsl(v<.5?hue:35,2+v*5,24+v*10);
  if(court){
    // polished chequer, a gold inlay and a runner up the middle
    const T=60;
    for(let gy=0;gy*T<H;gy++)for(let gx=0;gx*T<W;gx++){const v=rnd(),x=gx*T,y=gy*T,lt=(gx+gy)%2;
      g.fillStyle=lt?hsl(280+v*14,10+v*6,27+v*6):hsl(288,20,8+v*4);g.fillRect(x+.8,y+.8,T-1.6,T-1.6);
      g.strokeStyle=lt?'rgba(255,255,255,.07)':'rgba(190,150,255,.07)';g.lineWidth=.8;for(let k=0;k<2;k++){g.beginPath();let px=x+rnd()*T,py=y;g.moveTo(px,py);for(let s=0;s<4;s++){px+=rnd()*24-12;py+=T/4;g.lineTo(Math.max(x,Math.min(x+T,px)),py)}g.stroke()}
      g.fillStyle='rgba(255,255,255,.08)';g.fillRect(x+.8,y+.8,T-1.6,1.2);g.fillStyle='rgba(0,0,0,.45)';g.fillRect(x+.8,y+T-2.4,T-1.6,1.6)}
    g.fillStyle='rgba(96,12,34,.88)';g.fillRect(W/2-56,WALL,112,H-2*WALL);
    g.fillStyle='rgba(0,0,0,.18)';for(let y=WALL;y<H-WALL;y+=7)g.fillRect(W/2-56,y,112,1.2);
    g.strokeStyle='rgba(214,165,68,.8)';g.lineWidth=3;g.strokeRect(W/2-50,WALL-4,100,H-2*WALL+8);
    g.strokeStyle='rgba(214,165,68,.5)';g.lineWidth=2.5;g.strokeRect(WALL+30,WALL+30,W-2*WALL-60,H-2*WALL-60);g.lineWidth=1;g.strokeRect(WALL+37,WALL+37,W-2*WALL-74,H-2*WALL-74);
    g.save();g.translate(W/2,H/2);g.fillStyle='rgba(40,6,30,.9)';g.beginPath();g.arc(0,0,84,0,TAU);g.fill();g.strokeStyle='rgba(214,165,68,.8)';g.lineWidth=3;g.beginPath();g.arc(0,0,84,0,TAU);g.stroke();g.lineWidth=1.6;g.beginPath();g.arc(0,0,70,0,TAU);g.stroke();
    g.beginPath();for(let i=0;i<=8;i++){const a=i*3/8*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*70,Math.sin(a)*70)}g.stroke();g.restore();
  }else{
    let y=0;
    while(y<H){
      const rh=40+rnd()*16;let x=-rnd()*40;
      while(x<W){
        const w=42+rnd()*44,v=Math.floor(rnd()*3)/2;
        if(crypt||rnd()<A[1]){
          const jx=crypt?0:rnd()*3-1.5,jy=crypt?0:rnd()*3-1.5,sx=x+1.3+jx,sy=y+1.3+jy,sw=w-2.6,sh=rh-2.6;
          g.fillStyle=slabCol(v);g.fillRect(sx,sy,sw,sh);
          for(let i=0;i<3;i++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.04)':'rgba(0,0,0,.1)';g.beginPath();g.arc(sx+rnd()*sw,sy+rnd()*sh,2+rnd()*6,0,TAU);g.fill()}
          g.fillStyle='rgba(255,255,255,.15)';g.fillRect(sx,sy,sw,1.5);g.fillRect(sx,sy,1.5,sh);
          g.fillStyle='rgba(4,3,12,.55)';g.fillRect(sx,sy+sh-2.6,sw,2.6);g.fillRect(sx+sw-2.6,sy,2.6,sh);
          g.strokeStyle='rgba(5,4,13,.95)';g.lineWidth=1.5;g.strokeRect(sx,sy,sw,sh);
          if(rnd()<.11){g.fillStyle=crypt?hsl(hue-95,30,34,.2):hsl(eh+10,26,26,.4);g.beginPath();g.arc(sx+rnd()*sw,sy+rnd()*sh,6+rnd()*12,0,TAU);g.fill()}
          if(rnd()<.16){g.strokeStyle='rgba(4,3,12,.85)';g.lineWidth=1.6;g.beginPath();const cx=sx+rnd()*sw,cy=sy+rnd()*sh;g.moveTo(cx,cy);g.lineTo(cx+rnd()*20-10,cy+rnd()*20-10);g.lineTo(cx+rnd()*32-16,cy+rnd()*32-16);g.stroke()}
        }
        x+=w;
      }
      y+=rh;
    }
  }
  const blob=(x,y,r,col)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,col);gr.addColorStop(1,col.replace(/[\d.]+\)$/,'0)'));g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill()};
  if(crypt){
    // old stains, and a worn ritual circle cut into the middle of the floor
    for(let i=0;i<7;i++){const x=WALL+40+rnd()*(W-2*WALL-80),y2=WALL+40+rnd()*(H-2*WALL-80);for(let j=0;j<5;j++){g.fillStyle='hsla(352,55%,16%,.2)';g.beginPath();g.arc(x+rnd()*30-15,y2+rnd()*24-12,7+rnd()*16,0,TAU);g.fill()}}
    g.save();g.translate(W/2,H/2);
    for(const[r,lw]of[[132,3],[118,1.5],[62,1.5]]){g.strokeStyle='rgba(0,0,0,.42)';g.lineWidth=lw;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=1;g.beginPath();g.arc(1,1.4,r,0,TAU);g.stroke()}
    g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.6;
    for(let i=0;i<24;i++){const a=i/24*TAU,r0=119,r1=i%2?126:131;g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke()}
    g.beginPath();for(let i=0;i<=7;i++){const a=i*3/7*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*62,Math.sin(a)*62)}g.stroke();
    g.restore();
  }else if(area==='ash'){
    // the road itself: packed cobbles and two wheel ruts running east to west, ash drifted over everything
    g.fillStyle='rgba(16,11,8,.5)';g.fillRect(0,H/2-100,W,200);
    for(let y=H/2-92;y<H/2+92;y+=15)for(let x=-rnd()*20;x<W;){const w=14+rnd()*14,v=rnd();g.fillStyle=hsl(24,4+v*5,15+v*10,.9);g.beginPath();g.ellipse(x+w/2,y+7+rnd()*2,w/2-1.2,6,0,0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.06)';g.fillRect(x+3,y+2.5,w-7,1.2);x+=w}
    for(const ry of[H/2-44,H/2+44]){g.strokeStyle='rgba(5,3,2,.6)';g.lineWidth=13;g.beginPath();for(let x=0;x<=W;x+=40)g[x?'lineTo':'moveTo'](x,ry+Math.sin(x*.013+ry)*7);g.stroke();g.strokeStyle='rgba(120,110,100,.12)';g.lineWidth=2;g.stroke()}
    for(let i=0;i<14;i++)blob(rnd()*W,rnd()*H,30+rnd()*60,'rgba(0,0,0,.5)');
    for(let i=0;i<70;i++)blob(rnd()*W,rnd()*H,20+rnd()*60,'rgba(196,188,180,.09)');
    for(let i=0;i<34;i++){const x=rnd()*W,y=rnd()*H;blob(x,y,9+rnd()*12,'rgba(255,90,20,.2)');g.fillStyle='rgba(255,170,70,.9)';g.fillRect(x,y,1.6,1.6)}
  }else if(area==='fen'){
    for(let i=0;i<90;i++)blob(rnd()*W,rnd()*H,14+rnd()*40,hsl(100+rnd()*40,40,24,.2));
    for(let i=0;i<16;i++)blob(rnd()*W,rnd()*H,40+rnd()*70,'rgba(2,14,12,.5)');
    for(let i=0;i<900;i++){g.fillStyle=hsl(95+rnd()*40,45,30+rnd()*14,.55);g.fillRect(rnd()*W,rnd()*H,1.2,2.5+rnd()*3)}
  }else if(area==='peaks'){
    for(let i=0;i<80;i++){const e=rnd()<.6,x=e?(rnd()<.5?rnd()*W:(rnd()<.5?WALL+rnd()*90:W-WALL-rnd()*90)):rnd()*W,y=e&&x>WALL+90&&x<W-WALL-90?(rnd()<.5?WALL+rnd()*70:H-WALL-rnd()*70):rnd()*H;blob(x,y,14+rnd()*34,'rgba(236,242,252,.34)')}
    for(let i=0;i<700;i++){g.fillStyle='rgba(240,246,255,.5)';g.fillRect(rnd()*W,rnd()*H,1.4,1.4)}
  }else if(area==='dark'){
    for(let i=0;i<16;i++){let x=rnd()*W,y=rnd()*H,a=rnd()*TAU;g.beginPath();g.moveTo(x,y);for(let s=0;s<7;s++){a+=rnd()*1.2-.6;x+=Math.cos(a)*(14+rnd()*22);y+=Math.sin(a)*(14+rnd()*22);g.lineTo(x,y)}
      g.strokeStyle='rgba(255,30,80,.07)';g.lineWidth=7;g.stroke();g.strokeStyle='rgba(235,60,100,.42)';g.lineWidth=.9;g.stroke()}
    for(let i=0;i<12;i++)blob(rnd()*W,rnd()*H,40+rnd()*60,'rgba(0,0,0,.55)');
  }
  // bones and rubble
  const bone='rgba(231,223,205,.5)';g.strokeStyle=g.fillStyle=bone;g.lineCap='round';
  for(let i=0;i<(court?6:area==='peaks'?40:22);i++){const x=WALL+20+rnd()*(W-2*WALL-40),y2=WALL+20+rnd()*(H-2*WALL-40),a=rnd()*TAU,k=rnd();
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
  g.fillStyle=hsl(240,20,3);g.fillRect(0,0,256,256);
  for(let r=0;r<4;r++)for(let i=-1;i<2;i++){
    const x=i*128+(r%2?64:0),y=r*64,v=rnd();
    g.fillStyle=hsl(hue+v*18-9,sat+v*6,27+Math.floor(v*3)*5.5);g.fillRect(x+3,y+3,122,58);
    g.strokeStyle='rgba(5,4,13,.95)';g.lineWidth=3;g.strokeRect(x+3,y+3,122,58);
    for(let k=0;k<4;k++){g.fillStyle=rnd()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)';g.beginPath();g.arc(x+3+rnd()*122,y+3+rnd()*58,2+rnd()*9,0,TAU);g.fill()}
    g.fillStyle='rgba(255,255,255,.14)';g.fillRect(x+4,y+4,120,3);g.fillStyle='rgba(4,3,12,.5)';g.fillRect(x+4,y+54,120,6);
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

/* ---------- environment (rebuilt only when the area or the graphics quality changes) ---------- */
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
const AREA_BY_HUE={28:'ash',165:'fen',215:'peaks',285:'court',340:'dark'};
const _d=new THREE.Object3D(),_col=new THREE.Color(),_pt={x:0,z:0};
function inst(geo,mat,n,noShadow){const m=new THREE.InstancedMesh(geo,mat,n);m.castShadow=!noShadow;m.receiveShadow=!noShadow;return m}
function put(im,i,x,y,z,sx,sy,sz,rx,ry,rz){_d.position.set(x,y,z);_d.scale.set(sx,sy,sz);_d.rotation.set(rx||0,ry||0,rz||0);_d.updateMatrix();im.setMatrixAt(i,_d.matrix)}
function outside(rnd,pad,south){let x,z;do{x=-620+rnd()*(W+1240);z=-560+rnd()*(H+(south?700:520))}while(x>-pad&&x<W+pad&&z>-pad&&z<H+pad);_pt.x=x;_pt.z=z;return _pt}
function bannerTexture(){
  const c=mkCanvas(64,128),g=c.getContext('2d');
  g.beginPath();g.moveTo(2,0);g.lineTo(62,0);g.lineTo(62,126);g.lineTo(32,104);g.lineTo(2,126);g.closePath();g.fillStyle='#3a1250';g.fill();g.save();g.clip();
  const gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(.3,'rgba(255,255,255,.08)');gr.addColorStop(.6,'rgba(0,0,0,.2)');gr.addColorStop(1,'rgba(255,255,255,.06)');g.fillStyle=gr;g.fillRect(0,0,64,128);
  g.strokeStyle='#d6a544';g.lineWidth=3;g.strokeRect(6,5,52,150);
  g.lineWidth=2.5;g.beginPath();g.arc(32,46,15,0,TAU);g.stroke();g.beginPath();g.moveTo(32,22);g.lineTo(32,84);g.moveTo(20,70);g.lineTo(32,84);g.lineTo(44,70);g.stroke();
  g.fillStyle='#d6a544';g.beginPath();g.arc(32,46,5,0,TAU);g.fill();g.restore();
  return canvasTex(c,false);
}
function runeTexture(R0){ // [colour, half-size in world units, [[radius,width]...], star points, star radius, ticks]
  const c=mkCanvas(256,256),g=c.getContext('2d'),k=128/R0[1];g.translate(128,128);g.scale(k,k);g.strokeStyle='#fff';g.lineCap='round';
  g.shadowColor='#fff';g.shadowBlur=5*k;
  for(const[r,lw]of R0[2]){g.lineWidth=lw+.6;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke()}
  g.lineWidth=1.8;
  if(R0[5])for(let i=0;i<24;i++){const a=i/24*TAU,r0=119,r1=i%2?126:131;g.beginPath();g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.stroke()}
  const n=R0[3],rr=R0[4];g.beginPath();for(let i=0;i<=n;i++){const a=i*3/n*TAU-Math.PI/2;g[i?'lineTo':'moveTo'](Math.cos(a)*rr,Math.sin(a)*rr)}g.stroke();
  return new THREE.CanvasTexture(c);
}
function buildEnv(key,low){
  const crypt=key==='crypt',hue=crypt?208:+key.slice(1)||0,area=crypt?'crypt':AREA_BY_HUE[hue]||'pass';
  const root=new THREE.Group(),E={key,low,crypt,area,hue,root,flames:[],lit:[],ticks:[],crystals:[],glowOnly:[],rune:null,runeM:null,fire:crypt,
    sun:new THREE.Color(0xe6e9f2),sunI:.66,hemiI:.36,lightI:1.6,lightD:400,fogFar:1300,mote:[1,.9,.68],moteMode:'drift',moteN:low?0:40};
  const rnd=rng(77+hue),dn=n=>low?Math.ceil(n*.5):n;
  const ftex=floorTexture(crypt?'crypt':'out',hue,area,low);
  const floor=noLine(new THREE.Mesh(new THREE.PlaneGeometry(W,H).rotateX(-Math.PI/2),ST.toonRaw(0xffffff,{map:ftex,rim:false})));
  floor.material.color.setScalar(crypt?FLOOR_GAIN*.9:area==='peaks'?FLOOR_GAIN*.72:area==='court'?FLOOR_GAIN*1.15:FLOOR_GAIN);
  floor.position.set(W/2,0,H/2);floor.receiveShadow=true;root.add(floor);
  const btex=brickTexture(crypt?226:hue,crypt?9:4);
  const side=ST.toonRaw(0xffffff,{map:btex}),top=ST.toonRaw(0xffffff,{map:btex,rim:false});
  side.color.setScalar(FLOOR_GAIN*1.1);top.color.setHex(0x2c2c35).multiplyScalar(.6);
  const mats=[side,side,top,top,side,side];
  // ruined boundary of loose blocks; gap = chance that a stretch has fallen
  const blockWall=(tint,gap,hN,hE,hS)=>{
    const blocks=[];
    const run=(horizontal,fixed,from,to,hh,out)=>{let a=from;while(a<to){const len=Math.min(to-a,34+rnd()*30),h=rnd()<.14?6+rnd()*6:hh[0]+rnd()*(hh[1]-hh[0]),th=30+rnd()*10;
      const mid=fixed+out*th/2;if(rnd()>=gap)blocks.push(horizontal?[a+len/2,mid,len-1.5,h,th]:[mid,a+len/2,th,h,len-1.5]);a+=len}};
    run(true,WALL,-8,W+8,hN,-1);run(true,H-WALL,-8,W+8,hS,1);run(false,WALL,WALL,H-WALL,hE,-1);run(false,W-WALL,WALL,H-WALL,hE,1);
    const wallMat=ST.toonRaw(0xffffff,{map:btex});wallMat.color.setHex(tint).multiplyScalar(.7);
    const im=inst(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),wallMat,blocks.length);
    blocks.forEach((b,i)=>{put(im,i,b[0],0,b[1],b[2],b[3],b[4],0,(rnd()-.5)*.05,0);im.setColorAt(i,_col.setScalar(.75+rnd()*.35))});
    root.add(im);
  };
  // things standing along the inside line of the boundary: fn(i,x,z,edge) with edge 0 north, 1 south, 2 west, 3 east
  const along=(stepN,stepE,stepS,fn)=>{let i=0;
    for(let x=6;x<W;x+=stepN*(.7+rnd()*.6))fn(i++,x,WALL-8-rnd()*10,0);
    for(let z=WALL+10;z<H-WALL;z+=stepE*(.7+rnd()*.6)){fn(i++,WALL-8-rnd()*10,z,2);fn(i++,W-WALL+8+rnd()*10,z,3)}
    if(stepS)for(let x=6;x<W;x+=stepS*(.7+rnd()*.6))fn(i++,x,H-WALL+8+rnd()*8,1);
    return i};
  const count=(a,b,c)=>{const keep=rnd.s;const n=along(a,b,c,()=>{});rnd.s=keep;return n};
  const ground=(col,o)=>{const g=noLine(new THREE.Mesh(new THREE.PlaneGeometry(7000,7000).rotateX(-Math.PI/2),std(col,{rim:false,k:.8})));g.position.set(W/2,-.6,H/2);g.receiveShadow=true;root.add(g);return g};
  const rocks=(n,col)=>{const im=inst(new THREE.DodecahedronGeometry(1,0),std(col,{flatShading:true,roughness:1}),n);
    for(let i=0;i<n;i++){const p=outside(rnd,60,true),s=6+rnd()*16;put(im,i,p.x,s*.3,p.z,s,s*(.6+rnd()*.8),s,rnd()*3,rnd()*3,rnd()*3)}root.add(im)};
  if(crypt){
    const T=260,hN=92,hS=14;
    root.add(slab(-T,W+T,0,hN,-T,WALL,mats),slab(-T,WALL,0,hN,WALL,H+T,mats),slab(W-WALL,W+T,0,hN,WALL,H+T,mats),slab(WALL,W-WALL,0,hS,H-WALL,H+T,mats));
    // buttresses break up the long walls and catch the torchlight
    for(const x of[150,330,630,810])root.add(slab(x-15,x+15,0,hN+8,WALL-2,WALL+9,mats));
    for(const z of[170,320,470]){root.add(slab(WALL-2,WALL+9,0,hN+8,z-15,z+15,mats),slab(W-WALL-9,W-WALL+2,0,hN+8,z-15,z+15,mats))}
    const gate=noLine(new THREE.Mesh(new THREE.PlaneGeometry(84,78),ST.toonRaw(0xffffff,{map:gateTexture(),transparent:true,alphaTest:.5,rim:false})));
    gate.position.set(W/2,39,WALL+.4);root.add(gate);
    // rune slits cut into the buttresses: the crypt's own cold light
    {const pts=[];for(const x of[150,330,630,810])pts.push([x,WALL+9.3,0]);for(const z of[170,320,470]){pts.push([WALL+9.3,z,1],[W-WALL-9.3,z,1])}
      const slitM=basic(0x8f7bff),sl=noLine(inst(G.box,slitM,pts.length,true)),hz=noLine(inst(G.quad,flatGlowMat(0x7a5cff,.3),pts.length,true));
      pts.forEach((q,i)=>{const a=q[2];put(sl,i,a?q[0]:q[0],52,a?q[1]:q[1],a?1.2:3,30,a?3:1.2);put(hz,i,a?q[0]+(q[0]<W/2?14:-14):q[0],.7,a?q[1]:q[1]+16,a?70:46,1,a?46:70)});
      root.add(sl,hz);E.glowOnly.push(sl,hz);
      E.ticks.push(t=>{const k=.62+.3*Math.sin(t*1.7);slitM.color.setRGB(.5*k,.42*k,1.0*k)})}
    scene.background.setHex(0x040306);E.sun.setHex(0xdfe4ff);E.sunI=.6;E.hemiI=.3;E.lightI=4.2;E.lightD=500;E.fogFar=2600;E.rune=[0x7a5cff,136,[[132,3],[118,1.5],[62,1.5]],7,62,true];
  }else if(area==='ash'){
    // the ash road: a burnt palisade, dead trees, embers still alive in the ground, the road running on east and west
    scene.background.setHSL(16/360,.5,.03);ground(hslColor(20,.16,.04));
    E.sun.setHex(0xffcfa6);E.sunI=.62;E.hemiI=.3;E.lightI=3.2;E.lightD=480;E.fire=true;E.mote=[1,.5,.16];E.moteMode='rise';E.moteN=low?14:56;
    blockWall(0x7a6f66,.5,[12,38],[10,32],[6,11]);
    const road=std(hslColor(26,.12,.07),{roughness:1});
    for(const x of[-700,W]){const r=new THREE.Mesh(new THREE.PlaneGeometry(700,210).rotateX(-Math.PI/2),road);r.position.set(x+350,-.3,H/2);r.receiveShadow=true;root.add(r)}
    const char=std(0x14100e,{flatShading:true,roughness:.95}),nS=count(20,24,30);
    const stakes=inst(new THREE.CylinderGeometry(.22,1,1,5).translate(0,.5,0),char,nS),tips=[];
    along(20,24,30,(i,x,z,e)=>{if((e===2||e===3)&&Math.abs(z-H/2)<90){put(stakes,i,x,-50,z,1,1,1);return}
      const h=e===1?9+rnd()*9:e===0?40+rnd()*46:32+rnd()*38,w=3.2+rnd()*2.4;put(stakes,i,x,0,z,w,h,w,(rnd()-.5)*.36,rnd()*3,(rnd()-.5)*.36);if(rnd()<.22)tips.push([x,h*.96,z])});
    root.add(stakes);
    const emberMat=basic(0xff6a1c),em=inst(G.sphere,emberMat,Math.max(1,tips.length),true);tips.forEach((p,i)=>put(em,i,p[0],p[1],p[2],1.7,2.2,1.7));root.add(em);
    const nT=dn(26),trunks=inst(new THREE.CylinderGeometry(.55,1,1,6).translate(0,.5,0),char,nT),limbs=inst(new THREE.CylinderGeometry(.3,1,1,4).translate(0,.5,0),char,nT*2);
    for(let i=0;i<nT;i++){const p=outside(rnd,90,false),h=90+rnd()*120,w=5+rnd()*5,ry=rnd()*6;put(trunks,i,p.x,0,p.z,w,h,w,(rnd()-.5)*.2,ry,(rnd()-.5)*.2);
      for(let j=0;j<2;j++){const a=ry+j*2.4+rnd(),hh=h*(.45+rnd()*.35);put(limbs,i*2+j,p.x,hh,p.z,w*.45,26+rnd()*34,w*.45,Math.cos(a)*1.0,0,Math.sin(a)*1.0)}}
    root.add(trunks,limbs);
    const glowM=flatGlowMat(0xff5a14,.5),nG=dn(18),glows=inst(G.quad,glowM,nG,true);
    for(let i=0;i<nG;i++){const p=outside(rnd,40,true),s=40+rnd()*90;put(glows,i,p.x,.2,p.z,s,1,s)}root.add(glows);
    E.ticks.push(t=>{const k=.75+.25*Math.sin(t*3.1)+.12*Math.sin(t*11.3);emberMat.color.setRGB(k,.42*k,.1*k);glowM.opacity=.3+.16*Math.sin(t*1.7)+.05*Math.sin(t*7.3)});
  }else if(area==='fen'){
    // the drowned fen: the arena is a mud bank in still black water, reeds and rotten posts around it
    scene.background.setHSL(172/360,.4,.028);
    E.sun.setHex(0xcfeadb);E.sunI=.6;E.hemiI=.34;E.lightI=2.1;E.lightD=430;E.fogFar=820;E.mote=[.72,1,.45];E.moteN=low?10:44;
    const water=noLine(new THREE.Mesh(new THREE.PlaneGeometry(7000,7000).rotateX(-Math.PI/2),std(hslColor(172,.5,.07),{rim:false,k:.9})));
    water.position.set(W/2,-4,H/2);water.receiveShadow=true;root.add(water);
    const mud=std(hslColor(120,.18,.07),{roughness:1}),bank=slab(-30,W+30,-9,-.25,-30,H+30,mud);bank.castShadow=false;root.add(bank);
    blockWall(0x7d9b88,.62,[8,24],[8,20],[5,9]);
    const wood=std(0x2a2219,{flatShading:true,roughness:1}),nP=count(46,52,70),posts=inst(new THREE.CylinderGeometry(.8,1,1,6).translate(0,.5,0),wood,nP);
    along(46,52,70,(i,x,z,e)=>{const h=e===1?8+rnd()*8:22+rnd()*30;put(posts,i,x,-4,z,3.2,h,3.2,(rnd()-.5)*.3,rnd()*3,(rnd()-.5)*.3)});root.add(posts);
    const nC=dn(64),per=6,reedM=std(hslColor(92,.38,.2),{flatShading:true,roughness:1}),reeds=inst(new THREE.ConeGeometry(1,1,4).translate(0,.5,0),reedM,nC*per),
      heads=inst(new THREE.CylinderGeometry(1,1,1,5),std(0x3a2414,{roughness:1}),nC*2,true);
    for(let i=0;i<nC;i++){
      let cx,cz;if(i<nC*.72){const p=outside(rnd,10,true);cx=p.x;cz=p.z;if(Math.abs(cx-W/2)>W/2+260||cz<-240||cz>H+200){const a=rnd()*TAU,d=40+rnd()*150;cx=W/2+Math.cos(a)*(W/2+d);cz=H/2+Math.sin(a)*(H/2+d)}}
      else{const c=CORNERS[i%4];cx=c[0]+(rnd()-.5)*90+(c[0]<W/2?26:-26);cz=c[1]+(rnd()-.5)*60+(c[1]<H/2?8:-8)}
      const south=cz>H-80,inside=cx>0&&cx<W&&cz>0&&cz<H,y0=inside?0:-4;
      for(let j=0;j<per;j++){const h=(south?12+rnd()*12:26+rnd()*36),x=cx+(rnd()-.5)*22,z=cz+(rnd()-.5)*22,rx=(rnd()-.5)*.3,rz=(rnd()-.5)*.3;
        put(reeds,i*per+j,x,y0,z,1.5,h,1.5,rx,rnd()*3,rz);if(j<2)put(heads,i*2+j,x+rz*-h*.9,y0+h*.9,z+rx*h*.9,1.7,south?4:7,1.7,rx,0,rz)}}
    root.add(reeds,heads);
    const nL=dn(40),pads=inst(new THREE.CircleGeometry(1,7).rotateX(-Math.PI/2),std(hslColor(128,.42,.17),{roughness:.7}),nL,true);
    for(let i=0;i<nL;i++){const p=outside(rnd,36,true),s=5+rnd()*8;put(pads,i,p.x,-3.7,p.z,s,1,s*(.7+rnd()*.3),0,rnd()*6,0)}root.add(pads);
    // shallow standing water on the bank itself
    const sheen=new THREE.MeshBasicMaterial({color:0x020a0a,transparent:true,opacity:.46,depthWrite:false}),nW=9,pud=inst(G.disc,sheen,nW,true);
    for(let i=0;i<nW;i++)put(pud,i,WALL+60+rnd()*(W-2*WALL-120),.3,WALL+50+rnd()*(H-2*WALL-100),30+rnd()*46,1,18+rnd()*26,0,rnd()*3,0);
    pud.receiveShadow=true;pud.renderOrder=0;root.add(pud);
    if(!low){const mist=flatGlowMat(0xa8d8c8,.07),nM=10,mm=inst(G.quad,mist,nM,true);for(let i=0;i<nM;i++){const s=360+rnd()*320;put(mm,i,rnd()*W,6+i*.4,rnd()*H,s,1,s*.5)}mm.renderOrder=3;root.add(mm);
      E.ticks.push(t=>{mm.position.x=Math.sin(t*.07)*70;mm.position.z=Math.cos(t*.05)*40;mist.opacity=.06+.02*Math.sin(t*.4)})}
  }else if(area==='peaks'){
    // the bone peaks: snow, mountains behind, and the ribs of something enormous arching over the pass
    scene.background.setHSL(218/360,.45,.055);ground(hslColor(216,.2,.2));
    E.sun.setHex(0xdfe8ff);E.sunI=.72;E.hemiI=.4;E.lightI=2.2;E.lightD=440;E.fire=true;E.mote=[1,1,1];E.moteMode='fall';E.moteN=low?16:60;E.fogFar=1700;
    blockWall(0xb9c6da,.3,[20,54],[18,46],[6,12]);
    rocks(dn(46),hslColor(216,.12,.3));
    const boneM=std(0xd8d0bc,{roughness:.7,flatShading:true});
    const ribG=new THREE.TorusGeometry(1,.055,6,14,Math.PI*.52),nR=low?9:14,ribs=inst(ribG,boneM,nR);let k=0;
    for(let i=0;i<6;i++){const x=90+i*156+(rnd()-.5)*30,R=118+rnd()*34;put(ribs,k++,x,-4,-34+R,R,R,R*1.5,0,Math.PI/2+(rnd()-.5)*.12,0)}
    for(let i=0;k<nR;i++){const e=i%2,z=110+(i>>1)*120+(rnd()-.5)*24,R=84+rnd()*26;put(ribs,k++,e?W+44-R:R-44,-4,z,R,R,R*1.5,0,e?0:Math.PI,0)}
    root.add(ribs);
    const nV=14,vert=inst(new THREE.DodecahedronGeometry(1,0),boneM,nV);for(let i=0;i<nV;i++)put(vert,i,40+i*68,10,-62+Math.sin(i*.9)*8,20,15,17,0,i*.7,0);root.add(vert);
    // a skull the size of a house, half buried beyond the east wall
    {const sk=new THREE.Group(),dark=basic(0x07070a);const cr=new THREE.Mesh(G.sphere,boneM);cr.scale.set(74,66,84);cr.position.y=40;const jaw=new THREE.Mesh(G.box,boneM);jaw.scale.set(70,30,40);jaw.position.set(0,6,62);
      sk.add(cr,jaw);for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,dark);e.scale.set(19,21,14);e.position.set(s*29,44,70);sk.add(e)}
      const nose=new THREE.Mesh(G.sphere,dark);nose.scale.set(8,12,8);nose.position.set(0,22,80);sk.add(nose);
      sk.position.set(W+190,0,-70);sk.rotation.set(-.15,-.75,.12);cr.castShadow=true;root.add(sk)}
    const nM=9,peakM=std(hslColor(218,.2,.17),{flatShading:true,roughness:1}),snowM=std(0xdfe6f2,{flatShading:true,roughness:.9}),cone=new THREE.ConeGeometry(1,1,6).translate(0,.5,0),
      pk=inst(cone,peakM,nM,true),caps=inst(cone,snowM,nM,true);
    for(let i=0;i<nM;i++){const far=i<6,x=far?-500+i*390+(rnd()-.5)*160:(i%2?W+560+rnd()*200:-560-rnd()*200),z=far?-520-rnd()*380:-150+rnd()*300,w=190+rnd()*170,h=330+rnd()*330,ry=rnd()*3;
      put(pk,i,x,-10,z,w,h,w,0,ry,0);put(caps,i,x,-10+h*.62,z,w*.4,h*.385,w*.4,0,ry,0)}
    root.add(pk,caps);
  }else if(area==='court'){
    // the black court: a finished hall open to the dark, colonnade and banners on the north side
    scene.background.setHSL(285/360,.4,.02);ground(hslColor(285,.3,.035),{roughness:.35,metalness:.3});
    E.sun.setHex(0xddd0f4);E.sunI=.56;E.hemiI=.3;E.lightI=3.6;E.lightD=520;E.fire=true;E.mote=[.85,.7,1];E.moteN=low?0:30;E.fogFar=1900;
    side.color.setHSL(285/360,.22,.5).multiplyScalar(.62);top.color.setHSL(285/360,.2,.12).multiplyScalar(.7);E.rune=[0xf0b848,88,[[84,3],[70,1.6]],8,70,false];
    root.add(slab(-60,W+60,0,46,-60,WALL-2,mats),slab(-60,WALL-2,0,34,WALL-2,H+40,mats),slab(W-WALL+2,W+60,0,34,WALL-2,H+40,mats),slab(WALL-2,W-WALL+2,0,9,H-WALL+2,H+40,mats));
    const marble=std(hslColor(285,.14,.26),{roughness:.45,metalness:.1,flatShading:true}),gold=std(0xb88a2e,{roughness:.35,metalness:.7});
    const cols=[];for(let i=0;i<7;i++)cols.push([96+i*128,13,156]);for(const z of[150,300,450]){cols.push([13,z,112],[W-13,z,112])}
    const shaft=inst(new THREE.CylinderGeometry(.84,1,1,10).translate(0,.5,0),marble,cols.length),caps=inst(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),marble,cols.length*2),rings=inst(new THREE.CylinderGeometry(1,1,1,10).translate(0,.5,0),gold,cols.length,true);
    cols.forEach((c,i)=>{put(shaft,i,c[0],6,c[1],10.5,c[2]-12,10.5);put(caps,i*2,c[0],0,c[1],28,7,28);put(caps,i*2+1,c[0],c[2]-7,c[1],28,7,28);put(rings,i,c[0],c[2]-11,c[1],11,3,11)});
    root.add(shaft,caps,rings);
    root.add(slab(60,W-60,156,170,2,24,[marble,marble,marble,marble,marble,marble]));
    const btexB=bannerTexture(),cloth=ST.toonRaw(0xffffff,{map:btexB,alphaTest:.5,side:THREE.DoubleSide,rim:false}),bg=new THREE.PlaneGeometry(50,100).translate(0,-50,0),banners=[];
    for(let i=0;i<6;i++){const b=noLine(new THREE.Mesh(bg,cloth));b.position.set(160+i*128,152,25.5);b.castShadow=true;root.add(b);banners.push(b)}
    E.ticks.push(t=>{for(let i=0;i<banners.length;i++)banners[i].rotation.x=.04+Math.sin(t*1.1+i*1.9)*.05});
    const nB=30,bal=inst(new THREE.CylinderGeometry(.6,1,1,6).translate(0,.5,0),marble,nB);for(let i=0;i<nB;i++)put(bal,i,20+i*(W-40)/(nB-1),9,H-WALL+10,3.4,8,3.4);root.add(bal);
    root.add(slab(8,W-8,17,20,H-WALL+5,H-WALL+15,[marble,marble,marble,marble,marble,marble]));
  }else if(area==='dark'){
    // the endless dark: the floor is a raft of stone over nothing, with splinters of the world hanging around it
    scene.background.setHSL(340/360,.6,.012);
    E.sun.setHex(0xffd2dc);E.sunI=.56;E.hemiI=.28;E.lightI=2.6;E.lightD=470;E.mote=[1,.35,.5];E.moteN=low?8:40;E.fogFar=2200;
    const rockM=std(hslColor(340,.12,.1),{flatShading:true,roughness:.95});
    const under=slab(-18,W+18,-70,-.3,-18,H+18,rockM);under.castShadow=false;root.add(under);
    const nJ=dn(40),jag=inst(new THREE.ConeGeometry(1,1,5).translate(0,.5,0),rockM,nJ,true);
    for(let i=0;i<nJ;i++){const s=i<nJ*.6,x=s?rnd()*W:(rnd()<.5?-10:W+10),z=s?H+6+rnd()*10:rnd()*H,w=14+rnd()*22;put(jag,i,x,-64,z,w,40+rnd()*110,w,Math.PI,rnd()*3,0)}root.add(jag);
    blockWall(0x8a7480,.68,[10,34],[8,26],[5,9]);
    const shardM=std(0x2a1a24,{emissive:hslColor(340,.9,.1),flatShading:true,k:.8}),hotM=basic(hslColor(345,.95,.6)),oct=new THREE.OctahedronGeometry(1,0);
    const sets=[];
    for(let g=0;g<3;g++){const n=dn(22),im=inst(oct,shardM,n,true),hot=inst(oct,hotM,dn(8),true),grp=new THREE.Group();
      for(let i=0;i<n;i++){const p=outside(rnd,70,true),s=8+rnd()*rnd()*46,south=p.z>H-40;put(im,i,p.x,south?-150+rnd()*110:-70+rnd()*290,p.z,s*.55,s*1.7,s*.55,rnd()*3,rnd()*3,rnd()*3)}
      for(let i=0;i<hot.count;i++){const p=outside(rnd,50,true),s=2+rnd()*4,south=p.z>H-40;put(hot,i,p.x,south?-120+rnd()*90:-40+rnd()*240,p.z,s*.5,s*1.8,s*.5,rnd()*3,rnd()*3,rnd()*3)}
      grp.add(im,hot);root.add(grp);sets.push(grp)}
    E.ticks.push(t=>{for(let i=0;i<3;i++){sets[i].position.y=Math.sin(t*.35+i*2.1)*16;sets[i].position.x=Math.sin(t*.11+i*1.3)*12}const k=.55+.25*Math.sin(t*1.3);hotM.color.setHSL(345/360,.95,k)});
  }else{
    // the pass: a ruined boundary wall of loose blocks, open ground beyond, standing stones in the mist
    scene.background.copy(hslColor(hue,.3,.035));ground(hslColor(hue,.2,.045));
    blockWall(0xa8a8a8,0,[26,62],[24,58],[8,15]);
    rocks(dn(70),hslColor(hue,.08,.16));
    const N=dn(70),spikes=inst(new THREE.CylinderGeometry(.08,1,1,5).translate(0,.5,0),std(hslColor(hue+20,.1,.09),{flatShading:true,roughness:1}),N);
    for(let i=0;i<N;i++){const p=outside(rnd,70,true),hgt=p.z>H?40+rnd()*40:70+rnd()*110,w=5+rnd()*7;put(spikes,i,p.x,0,p.z,w,hgt,w,(rnd()-.5)*.3,rnd()*3,(rnd()-.5)*.3)}
    root.add(spikes);
  }
  // rubble hugging the walls
  {const n=dn(18),rm=std(crypt?0x4a4954:hslColor(hue,.1,.25),{flatShading:true,roughness:1}),rub=inst(new THREE.DodecahedronGeometry(1,0),rm,n);
    for(let i=0;i<n;i++){const s=3+rnd()*5,e=i%3;let x,z;if(e===0){x=WALL+30+rnd()*(W-2*WALL-60);z=WALL+3+rnd()*5}else{x=e===1?WALL+3+rnd()*5:W-WALL-3-rnd()*5;z=WALL+30+rnd()*(H-2*WALL-60)}
      put(rub,i,x,s*.35,z,s,s*.7,s,rnd()*3,rnd()*3,rnd()*3)}
    root.add(rub)}
  // corner lights, one kind per place
  const iron=std(0x24222a,{roughness:.6,metalness:.5}),stone=std(crypt?0x55545f:hslColor(hue,.1,.3),{flatShading:true,roughness:1});
  const FL={crypt:[0xff8a3a,0xffe2a0,0xff9448],ash:[0xff6a22,0xffd890,0xff8a40],peaks:[0x6fb4ff,0xe4f2ff,0x9cc8ff],court:[0xb264ff,0xf0dcff,0xc08cff]}[area];
  const flameCol=FL?FL[0]:hslColor(hue,.85,.6).getHex(),coreCol=FL?FL[1]:hslColor(hue,.7,.82).getHex();
  E.lightColor=FL?new THREE.Color(FL[2]):hslColor(hue,.3,.72);
  CORNERS.forEach(([x,z],i)=>{
    const g=new THREE.Group();g.position.set(x,0,z);
    let topY;
    if(crypt||area==='court'){
      const tall=crypt?44:58;
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2.4,tall,6),iron);pole.position.y=tall/2;
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(3,6,4,6),iron);foot.position.y=2;
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(8,4,7,8),iron);bowl.position.y=tall+3;
      const ember=new THREE.Mesh(new THREE.SphereGeometry(5.6,8,6),basic(0x2a1408));ember.position.y=tall+6;ember.scale.y=.5;
      pole.castShadow=bowl.castShadow=true;g.add(pole,foot,bowl,ember);E.lit.push({m:ember.material,on:crypt?0xff7a2a:0xa050ff,off:0x1c1612});topY=tall+14;
    }else if(area==='ash'){
      const log=new THREE.CylinderGeometry(2.6,3,30,5);
      for(let j=0;j<3;j++){const l=new THREE.Mesh(log,std(0x1a120c,{roughness:1}));l.position.y=7+j*1.5;l.rotation.set(Math.PI/2-.3,j*2.1+i,0,'YXZ');l.castShadow=true;g.add(l)}
      const coal=new THREE.Mesh(new THREE.SphereGeometry(8,8,5),basic(0xff5a14));coal.scale.y=.4;coal.position.y=4;g.add(coal);topY=20;
    }else if(area==='peaks'){
      for(let j=0;j<3;j++){const s=new THREE.Mesh(new THREE.DodecahedronGeometry(11-j*3,0),stone);s.position.y=7+j*12;s.rotation.set(j,i+j*2,j*.5);s.castShadow=true;g.add(s)}
      topY=42;
    }else if(area==='fen'){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(2.4,3.4,50,6),std(0x2a2219,{flatShading:true,roughness:1}));post.position.y=23;post.rotation.set(.1*(i%2?1:-1),i,.12);post.castShadow=true;
      const cry=new THREE.Mesh(new THREE.OctahedronGeometry(3.4,0),basic(coreCol));cry.position.y=62;g.add(post,cry);E.crystals.push(cry);topY=62;
    }else if(area==='dark'){
      const cry=new THREE.Mesh(new THREE.OctahedronGeometry(7,0),basic(coreCol));cry.position.y=54;cry.scale.y=1.8;
      const bits=new THREE.Mesh(new THREE.OctahedronGeometry(5,0),stone);bits.position.y=20;bits.scale.y=1.6;bits.rotation.z=.4;bits.castShadow=true;g.add(cry,bits);E.crystals.push(cry);topY=54;
    }else{
      const men=new THREE.Mesh(new THREE.CylinderGeometry(4,8,52,5),stone);men.position.y=26;men.rotation.y=i;men.castShadow=true;
      const cry=new THREE.Mesh(new THREE.OctahedronGeometry(6,0),basic(coreCol));cry.position.y=62;cry.scale.y=1.5;
      g.add(men,cry);E.crystals.push(cry);topY=62;
    }
    const f1=new THREE.Sprite(glowMat(flameCol,.95)),f2=new THREE.Sprite(glowMat(coreCol,.9)),halo=new THREE.Sprite(glowMat(flameCol,.22)),spill=new THREE.Mesh(G.quad,flatGlowMat(flameCol,.2));
    f1.position.y=topY+3;f2.position.y=topY;halo.position.y=topY;halo.scale.setScalar(190);
    spill.position.set(x<W/2?40:-40,.8,z<H/2?34:-34);spill.scale.set(330,1,250);spill.renderOrder=1; // the light it throws on the floor, as a flat pool
    const fl=new THREE.Group();fl.add(halo,f1,f2,spill);g.add(fl);
    E.flames.push({fl,f1,f2,halo,ph:i*1.7,y:topY});
    root.add(g);
  });
  // obstacles take the colour of the place
  OB.stone.color.copy(crypt?_col.setHex(0x4e4d58):area==='court'?hslColor(285,.14,.22):area==='peaks'?hslColor(216,.1,.3):hslColor(hue,.1,.24));OB.ghost.color.copy(OB.stone.color);
  OB.stone.color.multiplyScalar(.46);OB.ghost.color.copy(OB.stone.color);
  // fill light: indigo from above, leaning a little toward the colour of the place
  E.sky=new THREE.Color(0x6f78e6).lerp(hslColor(crypt?236:hue,.5,.62),crypt?.1:.3);E.gnd=new THREE.Color(0x1c1436).lerp(hslColor(crypt?250:hue,.45,.14),.4);
  // a glowing seal over the circle painted on the floor (crypt, court)
  if(E.rune){const R0=E.rune,m=new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:runeTexture(R0),color:R0[0],transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));
    m.position.set(W/2,.5,H/2);m.scale.setScalar(R0[1]*2);m.renderOrder=1;root.add(m);E.runeM=m;E.glowOnly.push(m)}
  scene.fog.color.copy(scene.background);
  if(!low)ST.outline(root,{thickness:1.25});
  scene.add(root);
  return E;
}
function disposeEnv(E){
  scene.remove(E.root);
  E.root.traverse(o=>{
    if(o.geometry&&!SHARED.has(o.geometry))o.geometry.dispose();
    const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    for(const m of ms){if(m.map&&m.map!==glowTex)m.map.dispose();m.dispose()}
  });
}
let env=null,envLevel=-1;
function syncEnv(){
  const n=MB.S.level,low=isLow();if(env&&n===envLevel&&env.low===low)return;envLevel=n;
  const key=n<8?'crypt':'h'+MB.levelDef(n).hue;
  if(env&&env.key===key&&env.low===low)return;
  if(env)disposeEnv(env);
  env=buildEnv(key,low);
}

/* ---------- pools for the short-lived things ---------- */
const blobMat=new THREE.MeshBasicMaterial({map:glowTex,color:0x000000,transparent:true,opacity:.85,depthWrite:false,fog:false});
const pbeamCore=new THREE.MeshBasicMaterial({color:0xeaf6ff,toneMapped:false,fog:false}),
  pbeamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:0x3f9cff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  pbeamLine=new THREE.MeshBasicMaterial({color:0x8fd3ff,transparent:true,opacity:.6,depthWrite:false,toneMapped:false,fog:false});
const beamCore=new THREE.MeshBasicMaterial({color:0xfff2c8,toneMapped:false,fog:false}),
  beamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:0xffa02a,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  beamLine=new THREE.MeshBasicMaterial({color:0xff4a3a,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,fog:false});
const fieldTex={};
function fieldTexture(kind){
  if(fieldTex[kind])return fieldTex[kind];
  const c=mkCanvas(256,256),g=c.getContext('2d'),rnd=rng(kind.length*97+3),col=kind==='frost'?'143,211,255':kind==='halo'?'255,214,110':kind==='rain'?'231,223,205':'200,190,220',rgba=a=>'rgba('+col+','+a+')';
  g.translate(128,128);
  const gr=g.createRadialGradient(0,0,10,0,0,122);gr.addColorStop(0,rgba(.1));gr.addColorStop(.75,rgba(.2));gr.addColorStop(1,rgba(.42));
  g.fillStyle=gr;g.beginPath();g.arc(0,0,122,0,TAU);g.fill();g.strokeStyle=rgba(.95);g.lineWidth=3.5;g.beginPath();g.arc(0,0,121,0,TAU);g.stroke();
  g.lineCap='round';
  if(kind==='frost'){
    g.strokeStyle=rgba(.75);
    for(let i=0;i<6;i++){g.save();g.rotate(i*TAU/6);g.lineWidth=3;g.beginPath();g.moveTo(0,10);g.lineTo(0,104);g.stroke();g.lineWidth=2;
      for(const d of[40,66,88]){g.beginPath();g.moveTo(-(112-d)*.3,d+(112-d)*.3);g.lineTo(0,d);g.lineTo((112-d)*.3,d+(112-d)*.3);g.stroke()}g.restore()}
    g.fillStyle=rgba(.8);for(let i=0;i<26;i++){const a=rnd()*TAU,d=30+rnd()*84,s=2+rnd()*4;g.save();g.translate(Math.cos(a)*d,Math.sin(a)*d);g.rotate(rnd()*3);g.fillRect(-s/2,-s/2,s,s);g.restore()}
  }else if(kind==='halo'){
    g.fillStyle=rgba(.5);
    for(let i=0;i<24;i++){g.save();g.rotate(i*TAU/24);const l=i%2?104:84;g.beginPath();g.moveTo(-3.2,52);g.lineTo(0,l);g.lineTo(3.2,52);g.closePath();g.fill();g.restore()}
    g.strokeStyle=rgba(.9);g.lineWidth=3;g.beginPath();g.arc(0,0,46,0,TAU);g.stroke();g.lineWidth=1.5;g.beginPath();g.arc(0,0,110,0,TAU);g.stroke();
    g.lineWidth=3;g.beginPath();g.moveTo(0,-26);g.lineTo(0,26);g.moveTo(-17,-6);g.lineTo(17,-6);g.stroke();
  }else if(kind==='rain'){
    g.strokeStyle=rgba(.45);g.lineWidth=1.5;g.setLineDash([7,7]);g.beginPath();g.arc(0,0,84,0,TAU);g.stroke();g.beginPath();g.arc(0,0,44,0,TAU);g.stroke();g.setLineDash([]);
    for(let i=0;i<22;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*104,x=Math.cos(a)*d,y=Math.sin(a)*d;g.save();g.translate(x,y);g.rotate(-.5+rnd()*.3);
      g.strokeStyle=rgba(.95);g.lineWidth=2.4;g.beginPath();g.moveTo(0,0);g.lineTo(0,-22);g.stroke();g.beginPath();g.moveTo(-5,-6);g.lineTo(0,0);g.lineTo(5,-6);g.stroke();
      g.lineWidth=1.4;g.beginPath();g.moveTo(-4,-25);g.lineTo(0,-19);g.lineTo(4,-25);g.moveTo(-4,-21);g.lineTo(0,-15);g.lineTo(4,-21);g.stroke();g.restore()}
  }
  return fieldTex[kind]=canvasTex(c,false);
}
const fx=new THREE.Group();scene.add(fx);
class Pool{constructor(make){this.make=make;this.items=[];this.n=0}
  begin(){this.n=0}
  get(){let o=this.items[this.n];if(!o){o=this.make();fx.add(o);this.items.push(o)}this.n++;o.visible=true;return o}
  end(){for(let i=this.n;i<this.items.length;i++)this.items[i].visible=false}}
const mCore={e:basic(0xffe6dc),bolt:basic(0xf2ecff),orb:basic(0xfff6cf),bone:basic(0xcfc7b4),dark:basic(0x15121b),steel:basic(0xd5dce2),
  morsel:ST.toon(0xe0244a,{emissive:0x7a0a1c,steps:2}),pink:basic(0xffb3bf)};
function trailOf(hex,len,w,op){const m=new THREE.Mesh(G.quad,flatGlowMat(hex,op));m.scale.set(len,1,w);m.position.x=-len*.42;m.renderOrder=5;return m}
function orbMaker(coreMat,glowHex,glowK){return()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.sphere,coreMat),halo=new THREE.Sprite(glowMat(glowHex,1)),hot=new THREE.Sprite(glowMat(0xffffff,.7)),pool=new THREE.Mesh(G.quad,flatGlowMat(glowHex,.5)),trail=trailOf(glowHex,glowK*2.3,glowK*.6,.75);
  halo.scale.setScalar(glowK*1.25);hot.scale.setScalar(glowK*.45);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(glowK*1.9);g.add(core,halo,hot,pool,trail);g.userData.core=core;g.userData.trail=trail;return g}}
const pools={
  shot:new Pool(orbMaker(mCore.e,PAL.foe,6.4)),
  bolt:new Pool(orbMaker(mCore.bolt,PAL.power,7)),
  orb:new Pool(orbMaker(mCore.orb,0xffc64a,7)),
  skull:new Pool(()=>{const g=new THREE.Group(),h=new THREE.Mesh(G.sphere,mCore.bone),jaw=new THREE.Mesh(G.box,mCore.bone),halo=new THREE.Sprite(glowMat(0x58e04a,.85)),pool=new THREE.Mesh(G.quad,flatGlowMat(0x58e04a,.38));
    jaw.scale.set(1.1,.6,.9);jaw.position.set(0,-.75,.35);g.add(h,jaw);
    for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,mCore.dark);e.scale.setScalar(.27);e.position.set(s*.38,.12,.82);g.add(e)}
    const sc=new THREE.Group(),trail=trailOf(0x58e04a,9,2.6,.7);sc.add(g);halo.scale.setScalar(5.2);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(7);sc.add(halo,pool,trail);sc.userData.core=g;sc.userData.trail=trail;return sc}),
  arrow:new Pool(()=>{const g=new THREE.Group(),s=new THREE.Mesh(G.shaft,mCore.bone),t=new THREE.Mesh(G.tip,mCore.steel),halo=new THREE.Sprite(glowMat(PAL.power2,.5)),trail=new THREE.Mesh(G.quad,flatGlowMat(PAL.power2,.6));halo.scale.setScalar(18);trail.scale.set(5,1,46);trail.position.z=-24;trail.renderOrder=5;s.castShadow=true;g.add(s,t,halo,trail);g.userData.trail=trail;return g}),
  morsel:new Pool(()=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.IcosahedronGeometry(7.5,1),mCore.morsel),hi=new THREE.Mesh(G.sphere,mCore.pink),pool=new THREE.Mesh(G.quad,flatGlowMat(0xff2a4c,.34));
    hi.scale.setScalar(2.3);hi.position.set(-2.4,4.2,3.6);m.castShadow=true;const b=new THREE.Group();b.add(m,hi);pool.scale.setScalar(46);pool.position.y=.5;g.add(b,pool);g.userData.bob=b;return g}),
  zone:new Pool(()=>{const g=new THREE.Group(),disc=new THREE.Mesh(G.disc,new THREE.MeshBasicMaterial({color:0xc41f3c,transparent:true,opacity:.2,depthWrite:false,toneMapped:false})),
    rim=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xe9b548,transparent:true,opacity:.95,depthWrite:false,toneMapped:false})),
    grow=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xf2ead8,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));
    disc.position.y=.5;rim.position.y=.7;grow.position.y=.9;disc.renderOrder=1;rim.renderOrder=2;grow.renderOrder=3;g.add(disc,rim,grow);g.userData={disc,rim,grow};return g}),
  field:new Pool(()=>{const m=new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:fieldTexture('frost'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=.45;m.renderOrder=1;return m}),
  beam:new Pool(()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.box,beamCore),glow=new THREE.Mesh(G.quad,beamGlow),line=new THREE.Mesh(G.box,beamLine);
    glow.position.y=-SHOT_Y+.8;glow.renderOrder=3;line.position.y=-SHOT_Y+1;line.renderOrder=3;core.renderOrder=5;g.add(core,glow,line);g.userData={core,glow,line};return g}),
  pbeam:new Pool(()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.box,pbeamCore),glow=new THREE.Mesh(G.quad,pbeamGlow),line=new THREE.Mesh(G.box,pbeamLine);
    glow.position.y=-SHOT_Y+.8;glow.renderOrder=3;line.position.y=-SHOT_Y+1;line.renderOrder=3;core.renderOrder=5;g.add(core,glow,line);g.userData={core,glow,line};return g}),
  pbomb:new Pool(()=>{const g=new THREE.Group(),b=new THREE.Mesh(G.sphere,mCore.bolt),halo=new THREE.Sprite(glowMat(0x4fb4ff,.9));b.scale.setScalar(5.5);b.castShadow=true;halo.scale.setScalar(30);g.add(b,halo);return g}),
  bomb:new Pool(()=>{const g=new THREE.Group(),b=new THREE.Mesh(G.sphere,mCore.dark),halo=new THREE.Sprite(glowMat(0xff7a30,.9)),f=new THREE.Mesh(G.sphere,mCore.e);b.scale.setScalar(6.5);b.castShadow=true;halo.scale.setScalar(30);f.scale.setScalar(2.2);f.position.y=6.5;g.add(b,halo,f);return g}),
  blob:new Pool(()=>{const m=new THREE.Mesh(G.quad,blobMat);m.renderOrder=0;return m}),
  ring:new Pool(()=>{const m=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=1.1;m.renderOrder=4;return m}),
};

/* ---------- particles: one Points object, soft round dots sized in world units ---------- */
const PMAX=480,PMAX_LOW=140,MOTES=64;
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
const bitsP=makePoints(PMAX),motes=makePoints(MOTES);
const pointSets=[bitsP,motes];
const colCache=new Map();
function cssRGB(c){let v=colCache.get(c);if(v)return v;v=[1,1,1];
  if(typeof c==='string'){if(c[0]==='#'){let h=c.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];const n=parseInt(h,16);v=[(n>>16)/255,(n>>8&255)/255,(n&255)/255]}
    else{const m=c.match(/[\d.]+/g);if(m&&m.length>=3)v=[m[0]/255,m[1]/255,m[2]/255]}}
  if(colCache.size>400)colCache.clear();colCache.set(c,v);return v}

/* ---------- room obstacles (MB.obstacles): pillars, pits, spike plates, fire braziers ---------- */
function mergeGeos(gs){
  let n=0;const parts=gs.map(g=>{const q=g.index?g.toNonIndexed():g;n+=q.attributes.position.count;return q});
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3);let k=0;
  for(const q of parts){pos.set(q.attributes.position.array,k);nor.set(q.attributes.normal.array,k);k+=q.attributes.position.count*3}
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(pos,3));bg.setAttribute('normal',new THREE.BufferAttribute(nor,3));return bg;
}
const SPIKE_AT=[];for(let i=0;i<8;i++)SPIKE_AT.push([Math.cos(i*TAU/8+.39)*.66,Math.sin(i*TAU/8+.39)*.66]);for(let i=0;i<4;i++)SPIKE_AT.push([Math.cos(i*TAU/4)*.27,Math.sin(i*TAU/4)*.27]);
function pitTexture(){ // seen from the south: the far wall catches a little light, the rest is black
  const c=mkCanvas(128,128),g=c.getContext('2d');
  g.fillStyle='#020203';g.beginPath();g.arc(64,64,63,0,TAU);g.fill();g.save();g.clip();
  const gr=g.createLinearGradient(0,0,0,74);gr.addColorStop(0,'#4a4853');gr.addColorStop(.35,'#25242b');gr.addColorStop(1,'rgba(2,2,3,0)');g.fillStyle=gr;g.fillRect(0,0,128,80);
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.5;for(let i=0;i<4;i++){g.beginPath();g.ellipse(64,64+i*5,63-i*.5,58-i*6,0,Math.PI*1.08,Math.PI*1.92);g.stroke()}
  for(let x=10;x<120;x+=16){g.beginPath();g.moveTo(x+(x%32?5:0),4);g.lineTo(x+(x%32?5:0)+2,26);g.stroke()}
  g.fillStyle='#000';g.beginPath();g.ellipse(64,84,60,50,0,0,TAU);g.fill();g.restore();
  return canvasTex(c,false);
}
function fireTexture(){ // a strip of flame tongues, wrapped around the ring a burning brazier throws
  const c=mkCanvas(256,64),g=c.getContext('2d'),rnd=rng(41);
  const gr=g.createLinearGradient(0,64,0,0);gr.addColorStop(0,'rgba(255,150,50,.6)');gr.addColorStop(.3,'rgba(255,90,24,.4)');gr.addColorStop(.75,'rgba(200,40,10,.1)');gr.addColorStop(1,'rgba(160,20,0,0)');
  g.fillStyle=gr;g.fillRect(0,0,256,64);g.globalCompositeOperation='destination-out';
  for(let x=0;x<256;x+=8){const h=10+rnd()*42;g.beginPath();g.moveTo(x-7,0);g.quadraticCurveTo(x+4,h*.5,x+4+rnd()*6-3,h);g.quadraticCurveTo(x+4,h*.5,x+15,0);g.closePath();g.fill()}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.repeat.x=3;return t;
}
function plateTexture(){
  const c=mkCanvas(128,128),g=c.getContext('2d');
  g.fillStyle='#34323b';g.beginPath();g.arc(64,64,63,0,TAU);g.fill();
  g.strokeStyle='#6b6876';g.lineWidth=4;g.beginPath();g.arc(64,64,60,0,TAU);g.stroke();g.strokeStyle='#1b1a20';g.lineWidth=2;g.beginPath();g.arc(64,64,55,0,TAU);g.stroke();
  for(let i=0;i<8;i++){const a=i*TAU/8;g.fillStyle='#5a5864';g.beginPath();g.arc(64+Math.cos(a)*57.5,64+Math.sin(a)*57.5,1.8,0,TAU);g.fill()}
  for(const[x,z]of SPIKE_AT){g.fillStyle='#050506';g.beginPath();g.arc(64+x*64,64+z*64,6.4,0,TAU);g.fill();g.strokeStyle='#7a7786';g.lineWidth=1.3;g.stroke()}
  return canvasTex(c,false);
}
const OB={
  stone:std(0x77767f,{flatShading:true,roughness:.92}),
  ghost:std(0x77767f,{flatShading:true,roughness:.92,transparent:true,opacity:.3,depthWrite:false}),
  pillar:mergeGeos([new THREE.CylinderGeometry(.84,.9,.86,9).translate(0,.5,0),new THREE.CylinderGeometry(1.06,1.14,.08,9).translate(0,.04,0),new THREE.CylinderGeometry(.96,1.02,.05,9).translate(0,.1,0),
    new THREE.CylinderGeometry(1.1,.9,.09,9).translate(0,.955,0),new THREE.CylinderGeometry(.5,.9,.04,7).translate(.2,1.02,.1)]),
  stump:mergeGeos([new THREE.CylinderGeometry(.8,.9,.5,9).translate(0,.3,0),new THREE.CylinderGeometry(1.06,1.14,.1,9).translate(0,.05,0),new THREE.ConeGeometry(.5,.34,5).translate(.3,.7,.1),new THREE.ConeGeometry(.36,.22,5).translate(-.4,.64,-.2),
    new THREE.DodecahedronGeometry(.3,0).translate(1.25,.2,.6),new THREE.DodecahedronGeometry(.2,0).translate(-1.2,.14,.9)]),
  pitMat:null,plateMat:null,
  rimGeo:new THREE.TorusGeometry(1,.075,5,22).rotateX(Math.PI/2),
  rimMat:std(0x6a6974,{flatShading:true,roughness:1}),
  spikes:mergeGeos(SPIKE_AT.map(([x,z],i)=>new THREE.ConeGeometry(.085,1,5).translate(x,.5,z))),
  steel:std(0xdfe4ea,{roughness:.4,metalness:.25,flatShading:true}),
  iron:std(0x25232b,{roughness:.55,metalness:.55,flatShading:true}),
  bowl:mergeGeos([new THREE.CylinderGeometry(1,.5,.5,8).translate(0,1.25,0),new THREE.CylinderGeometry(.18,.3,1,6).translate(0,.5,0),new THREE.CylinderGeometry(.75,.9,.12,8).translate(0,.06,0)]),
  coal:basic(0x2a1408),coalHot:basic(0xff7a2a),coalGeo:new THREE.SphereGeometry(1,8,5),
  fl1:glowMat(0xff7a26,.95),fl2:glowMat(0xffe6a8,.95),heat:flatGlowMat(0xff6418,.4),
  warn:new THREE.MeshBasicMaterial({color:0xff5a2a,transparent:true,opacity:.5,depthWrite:false,toneMapped:false}),
  hot:new THREE.MeshBasicMaterial({color:0xffb04a,transparent:true,opacity:.9,depthWrite:false,toneMapped:false}),
  idle:new THREE.MeshBasicMaterial({color:0xb9b2c6,transparent:true,opacity:.28,depthWrite:false,toneMapped:false}),
};
const SHARED=new Set(Object.values(G));
const obsRoot=new THREE.Group();scene.add(obsRoot);
const obsMap=new Map(),NONE=[];
const hash2=(x,y)=>{const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s)};
function makeObstacle(o){
  const g=new THREE.Group(),r=o.r||20,k=o.kind,u={kind:k,up:o.on?1:0,r};
  if(k==='pit'){
    if(!OB.pitMat)OB.pitMat=new THREE.MeshBasicMaterial({map:pitTexture(),transparent:true,alphaTest:.5});
    const d=noLine(new THREE.Mesh(G.disc,OB.pitMat));d.scale.setScalar(r);d.position.y=.32;
    const rim=new THREE.Mesh(OB.rimGeo,OB.rimMat);rim.scale.set(r*1.03,Math.min(2.2,34/r)*r*.5,r*1.03);rim.position.y=.4;rim.rotation.y=hash2(o.x,o.y)*6;rim.receiveShadow=true;
    g.add(d,rim);
  }else if(k==='spikes'){
    if(!OB.plateMat){OB.plateMat=ST.toonRaw(0xffffff,{map:plateTexture(),transparent:true,alphaTest:.5,rim:false});OB.plateMat.color.setScalar(.8)}
    const d=noLine(new THREE.Mesh(G.disc,OB.plateMat));d.scale.setScalar(r);d.position.y=.36;d.receiveShadow=true;
    const sp=new THREE.Mesh(OB.spikes,OB.steel);sp.castShadow=true;
    const ring=new THREE.Mesh(G.rim,OB.warn);ring.scale.setScalar(r*1.04);ring.position.y=.62;ring.renderOrder=2;
    g.add(d,sp,ring);u.sp=sp;u.ring=ring;
  }else if(k==='brazier'){
    const s=Math.max(8,Math.min(16,o.core||r*.22)),b=new THREE.Mesh(OB.bowl,OB.iron);b.scale.set(s,s*1.15,s);b.castShadow=true;
    const coal=new THREE.Mesh(OB.coalGeo,OB.coal);coal.scale.set(s*.82,s*.3,s*.82);coal.position.y=s*1.66;
    const fl=new THREE.Group(),f1=new THREE.Sprite(OB.fl1),f2=new THREE.Sprite(OB.fl2);fl.position.y=s*1.9;fl.add(f1,f2);
    const heat=new THREE.Mesh(G.quad,OB.heat);heat.position.y=.55;heat.scale.setScalar(r*2.5);heat.renderOrder=1;
    const ring=new THREE.Mesh(G.rim,OB.idle);ring.scale.setScalar(r);ring.position.y=.6;ring.renderOrder=2;
    if(!OB.wallMat){OB.wallMat=new THREE.MeshBasicMaterial({map:fireTexture(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false});OB.wallGeo=new THREE.CylinderGeometry(1,1.06,1,28,1,true).translate(0,.5,0)}
    const wall=new THREE.Mesh(OB.wallGeo,OB.wallMat),wall2=new THREE.Mesh(OB.wallGeo,OB.wallMat);wall.renderOrder=wall2.renderOrder=5;
    g.add(b,coal,fl,heat,ring,wall,wall2);u.fl=fl;u.f1=f1;u.f2=f2;u.heat=heat;u.ring=ring;u.coal=coal;u.topY=s*1.9;u.wall=wall;u.wall2=wall2;
  }else{
    const hh=hash2(o.x,o.y),broken=hh>.78,h=broken?40+hh*20:66+hh*90%22;
    const p=new THREE.Mesh(broken?OB.stump:OB.pillar,OB.stone);p.scale.set(r,h,r);p.rotation.y=hh*6;p.castShadow=true;p.receiveShadow=true;g.add(p);u.p=p;u.h=h;u.kind='pillar';
  }
  g.position.set(o.x,0,o.y);ST.outline(g,{thickness:1.3});obsRoot.add(g);
  return{g,u,stamp:0};
}
let xlN=0;
function syncObstacles(dt,sight){
  const list=R.testObstacles||MB.obstacles||NONE,P=MB.P,t=MB.S.t,low=Q.low;xlN=0;
  for(let i=0;i<list.length;i++){
    const o=list[i];if(!o)continue;let rec=obsMap.get(o);
    if(!rec||rec.u.r!==(o.r||20)){if(rec)obsRoot.remove(rec.g);rec=makeObstacle(o);obsMap.set(o,rec)}
    rec.stamp=stamp;const u=rec.u,g=rec.g;g.position.set(o.x,0,o.y);
    let near=true;if(!sight&&P){const dx=o.x-P.x,dy=o.y-P.y,lim=FOG+u.r+8;near=dx*dx+dy*dy<lim*lim}
    g.visible=near;
    u.up+=((o.on?1:o.warn&&u.kind==='spikes'?.3:0)-u.up)*Math.min(1,dt*(o.on?22:7));
    if(u.kind==='pillar'){
      // a pillar standing between the camera and the player turns to glass
      let hide=false;if(P){const dx=Math.abs(P.x-o.x),dz=o.y-P.y;hide=dx<u.r+12&&dz>2&&dz<u.h*.8+12}
      u.p.material=hide?OB.ghost:OB.stone;u.p.castShadow=!hide||!low;{const lm=u.p.userData.mbLineMesh;if(lm)lm.visible=!hide}
      if(low){const b=pools.blob.get();b.position.set(o.x+u.r*.3,.5,o.y-u.r*.25);b.scale.set(u.r*6,1,u.r*5.2)}
    }else if(u.kind==='spikes'){
      const e=.1+.9*u.up+(o.warn&&!o.on?.06*Math.sin(t*46+o.x):0);u.sp.scale.set(u.r,28*e,u.r);u.sp.position.y=-1.5;
      u.ring.visible=!!(o.on||o.warn);u.ring.material=o.on?OB.warn:OB.hot;
    }else if(u.kind==='brazier'){
      const w=o.warn&&!o.on?.35+.12*Math.sin(t*30):0,lvl=Math.max(u.up,w),on=lvl>.04&&near;u.fl.visible=on;u.heat.visible=u.up>.04&&near;
      u.ring.material=o.on?OB.warn:o.warn?OB.hot:OB.idle;u.coal.material=o.on||o.warn?OB.coalHot:OB.coal;
      const burn=u.up>.03&&near;u.wall.visible=u.wall2.visible=burn;
      if(burn){const h=(30+5*Math.sin(t*11+o.x))*u.up;u.wall.scale.set(u.r*.97,h,u.r*.97);u.wall.rotation.y=t*.9;u.wall2.scale.set(u.r*.9,h*.72,u.r*.9);u.wall2.rotation.y=-t*1.3}
      if(on){const fl=1+.13*Math.sin(t*9+o.x)+.07*Math.sin(t*23.7+o.y),s=lvl;
        u.f1.scale.set(26*fl*s,44*fl*s+4*Math.sin(t*17+o.x),1);u.f1.position.y=9*s;u.f2.scale.set(13*s,22*fl*s,1);u.f2.position.y=4*s;
        if(sight&&xlN<XL.length&&!low){const l=XL[xlN++];l.intensity=2.6*fl*s;l.position.set(o.x,u.topY+26,o.y+10)}}
    }
  }
  for(let i=xlN;i<XL.length;i++)XL[i].intensity=0;
  if(obsMap.size>list.length||(obsMap.size&&!list.length))for(const[o,rec]of obsMap)if(rec.stamp!==stamp){obsRoot.remove(rec.g);obsMap.delete(o)}
  // shared looks
  OB.warn.opacity=.6+.3*Math.sin(t*14);OB.hot.opacity=.55+.4*Math.sin(t*24);OB.heat.opacity=.3+.08*Math.sin(t*6);
}

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
// Allies that carry a monster spec (bound or tamed pets and whatever they raise) are drawn with the monster bodies; the model reads pet/owner and builds the friendly variant.
const isPet=e=>!!(e&&(e.pet||e.owner==='necro'||e.owner==='beast')&&(e.s||e.ai));
const dying=[]; // pets that left the list in the middle of a fight: they fade out where they stood
let dyingLevel=-1;
function dropEnt(rec){ents.remove(rec.g);if(rec.pet&&rec.real){const M=modelOf('monster');if(M&&typeof M.dispose==='function')try{M.dispose(rec.g)}catch(e){}}}
function syncMap(map,list,name,dt,phMake,phUpdate,sight){
  const P=MB.P;
  for(let i=0;i<list.length;i++){
    const e=list[i];if(!e)continue;let rec=map.get(e);
    if(!rec){const pet=name==='ally'&&isPet(e);rec=pet?makeEnt('monster',e,phMonster):makeEnt(name,e,phMake);rec.pet=pet;rec.e=e;map.set(e,rec)}
    rec.stamp=stamp;
    let hide=!!e.hidden||(rec.pet&&(e.dead||e.hp<=0));
    if(!hide&&!sight&&P){const dx=e.x-P.x,dy=e.y-P.y,lim=FOG+(e.r||0)+8;if(dx*dx+dy*dy>lim*lim)hide=true}
    rec.g.position.set(e.x,(e.lift||0)*LIFT,e.y);rec.g.visible=!hide;
    if(rec.pet){
      if(e.dead||e.hp<=0){if(!rec.gone){rec.gone=true;startFade(rec)}continue} // still listed but dead: its ghost is already fading
      rec.gone=false;updateEnt(rec,'monster',e,dt,phMonster,phMonsterUpdate);
    }else updateEnt(rec,name,e,dt,phMake,phUpdate);
    if(hide)rec.g.visible=false;
    else if(Q.low){const b=pools.blob.get(),r=e.r||12,k=1-.4*(e.lift||0);b.position.set(e.x,.55,e.y);b.scale.set(r*5.4*k,1,r*4.4*k)}
  }
  if(map.size>list.length||(map.size&&!list.length))for(const[e,rec]of map)if(rec.stamp!==stamp){
    map.delete(e);
    if(rec.pet&&!rec.gone&&rec.g.visible&&MB.S.mode==='play'&&MB.S.level===dyingLevel)startFade(rec,true);else dropEnt(rec);
  }
}
// own=true: the record has left the map and the fading copy is the record's own group; otherwise a ghost twin is made so the listed pet can come back later
function startFade(rec,own){
  let g=rec.g;const M=rec.real&&modelOf('monster');
  if(!M||typeof M.fade!=='function'){if(own)dropEnt(rec);return}
  if(!own){ // the pet object stays in the list (dead for this level): fade a twin, keep the record
    try{g=M.create(rec.e,MB);g.position.copy(rec.g.position);g.position.y=0;const a=rec.g.userData.mb,b=g.userData.mb;if(a&&b){b.root.rotation.y=a.root.rotation.y;b.born=9;b.grown=false}ents.add(g)}catch(e){return}
  }
  g.visible=true;dying.push({g,t0:MB.S.t,pet:true,real:true});
}
function syncDying(dt){
  if(MB.S.level!==dyingLevel||MB.S.mode==='title'){for(let i=0;i<dying.length;i++)dropEnt(dying[i]);dying.length=0;dyingLevel=MB.S.level;return}
  const M=modelOf('monster');
  for(let i=dying.length-1;i>=0;i--){const d=dying[i],q=(MB.S.t-d.t0)/.8;
    if(q>=1||q<0||!M){dropEnt(d);dying.splice(i,1);continue}
    try{M.fade(d.g,q)}catch(e){dropEnt(d);dying.splice(i,1)}}
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
  const w=cv.clientWidth||glc.clientWidth,h=cv.clientHeight||glc.clientHeight,pr=Q.low?1:Math.min(2,window.devicePixelRatio||1);
  if(!w||!h||(w===viewW&&h===viewH&&pr===viewPR))return;
  viewW=w;viewH=h;viewPR=pr;
  renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera();
  const s=h*pr/(2*Math.tan(camera.fov*Math.PI/360));for(let i=0;i<pointSets.length;i++)pointSets[i].mat.uniforms.uScale.value=s;
}
// Framing: the hero stays large, but the boss (or the nearest pack) and any blast about to land near the player must be on screen.
// The view leans from the player toward that group and widens step by step until everything fits; at zoom 1 it is the whole arena.
const bb={x0:0,x1:0,z0:0,z1:0,h:0};
function grow(x,z,r,h){if(x-r<bb.x0)bb.x0=x-r;if(x+r>bb.x1)bb.x1=x+r;if(z-r<bb.z0)bb.z0=z-r;if(z+r>bb.z1)bb.z1=z+r;if(h>bb.h)bb.h=h}
function onScreen(x,y,z,top){v3.set(x,y,z).project(camera);return Math.abs(v3.x)<=.93&&v3.y>=-.88&&v3.y<=top}
function bbFits(){const top=viewW&&viewW<640?.74:.92; // on a phone the health and boss bars lie over the top of the view
  return onScreen(bb.x0,0,bb.z1,.95)&&onScreen(bb.x1,0,bb.z1,.95)&&onScreen(bb.x0,bb.h,bb.z0,top)&&onScreen(bb.x1,bb.h,bb.z0,top)}
const want={x:W/2,z:H/2,zoom:.72};
function frameWant(sight){
  const P=MB.P;
  if(!P){want.x=W/2;want.z=H/2-4;want.zoom=sight?.72:.58;return}
  if(!sight){want.x=W/2+(P.x-W/2)*.8;want.z=H/2+(P.y-H/2)*.8-4;want.zoom=.58;return}
  bb.x0=bb.x1=P.x;bb.z0=bb.z1=P.y;bb.h=0;grow(P.x,P.y,46,66);
  const B=MB.boss,mons=MB.mons,zs=MB.zones;
  if(B&&B.hp>0&&!B.hidden)grow(B.x,B.y,B.r+16,B.r*2.5+(B.lift||0)*LIFT);
  else for(let i=0;i<mons.length;i++){const m=mons[i];if(m.hidden||m.decoy)continue;const dx=m.x-P.x,dy=m.y-P.y;if(dx*dx+dy*dy<340*340)grow(m.x,m.y,m.r+8,m.r*2.2)}
  for(let i=0;i<zs.length;i++){const z=zs[i];if(z.mine)continue;const dx=z.x-P.x,dy=z.y-P.y,lim=z.r+300;if(dx*dx+dy*dy<lim*lim)grow(z.x,z.y,z.r+4,0)}
  // never chase something across the whole arena: past this reach it may sit at the edge of the view
  {const rx=430,rz=300;if(bb.x0<P.x-rx)bb.x0=P.x-rx;if(bb.x1>P.x+rx)bb.x1=P.x+rx;if(bb.z0<P.y-rz)bb.z0=P.y-rz;if(bb.z1>P.y+rz)bb.z1=P.y+rz}
  if(bb.x0<0)bb.x0=0;if(bb.x1>W)bb.x1=W;if(bb.z0<0)bb.z0=0;if(bb.z1>H)bb.z1=H;
  // lean a third of the way from the player to the middle of the group
  const fx=P.x+((bb.x0+bb.x1)/2-P.x)*.6,fz=P.y+((bb.z0+bb.z1)/2-P.y)*.6,base=viewW&&viewW<640?.6:.7;
  for(let z=base;;z+=.05){
    if(z>=1){want.x=W/2;want.z=H/2-4;want.zoom=1;return}
    const f=(z-base)/(1-base),fol=.62*(1-f*f);
    want.x=W/2+(fx-W/2)*fol;want.z=H/2+(fz-H/2)*fol-4;want.zoom=z;
    placeCamera(want.x,want.z,fitD*z);if(bbFits())return;
  }
}
const sp={x:0,y:0,ok:true};
function toScreen(x,y,z){v3.set(x,y,z).project(camera);sp.x=(v3.x*.5+.5)*W;sp.y=(.5-v3.y*.5)*H;sp.ok=v3.z<1;return sp}

/* ---------- 2D overlay ---------- */
function groundEllipse(x,z,r){ // screen-space ellipse of a circle lying on the floor
  toScreen(x,0,z);const cx=sp.x,cy=sp.y;toScreen(x+r,0,z);const rx=Math.abs(sp.x-cx);toScreen(x,0,z+r);const a=Math.abs(sp.y-cy);toScreen(x,0,z-r);const b=Math.abs(sp.y-cy);
  return{cx,cy:cy+(a-b)/2,rx,ry:(a+b)/2};
}
let vig=null;
function vignette(){if(!vig){vig=ctx.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H*.98);vig.addColorStop(0,'rgba(6,4,18,0)');vig.addColorStop(.6,'rgba(6,4,18,.3)');vig.addColorStop(1,'rgba(5,3,16,.8)')}return vig}
// overlay text helpers: condensed, slightly slanted, inked
const CSS={ink:'#0b0a16',bone:'#f2ecff',gold:'#f0b848',power:'#8b4dff',power2:'#c4f4ff',foe:'#ff2d55',dim:'#a9a4c8'};
const tint=c=>MB.has('sight')?c:MB.col(c);
const clamp01=v=>v<0?0:v>1?1:v;
let hasSpacing=null;
function spaced(px){if(hasSpacing===null)hasSpacing='letterSpacing' in ctx;if(hasSpacing)ctx.letterSpacing=px+'px'}
function slant(x,y,rot,sx,sy){ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.transform(sx,0,-.2*sy,sy,0,0)}
function inked(txt,x,y,fill,lw){ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=CSS.ink;ctx.strokeText(txt,x,y);ctx.fillStyle=fill;ctx.fillText(txt,x,y)}
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
    ctx.fillStyle=g;ctx.fillRect(-W*2,-H*2/k,W*4,H*4/k);
    // the edge of what can be sensed: a thin drawn line and a slow dashed ring, like ink on the dark
    ctx.strokeStyle='rgba(236,232,255,.34)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,e.rx*.74,0,TAU);ctx.stroke();
    ctx.strokeStyle='rgba(236,232,255,.16)';ctx.lineWidth=1;ctx.setLineDash([3,11]);ctx.lineDashOffset=-S.t*9;ctx.beginPath();ctx.arc(0,0,e.rx*.8,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.restore();
    // ...but footsteps still come up through the floor
    const rings=MB.rings;
    for(let i=0;i<rings.length;i++){const r=rings[i];if(!r.fx&&r.under)continue;
      const q=1-r.life/r.max,hot=r.fx,el=groundEllipse(r.x,r.y,6+r.r*q);
      ctx.globalAlpha=Math.max(0,(1-q)*(hot?.9:.62));ctx.strokeStyle=hot?'#d6a544':'#e7dfcd';ctx.lineWidth=hot?3:1.8;
      ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx,el.ry,0,0,TAU);ctx.stroke()}
    ctx.globalAlpha=1;
    // ...and the feet know where the floor ends or bites
    const obs=R.testObstacles||MB.obstacles;
    if(obs)for(let i=0;i<obs.length;i++){const o=obs[i];if(!o||o.kind==='pillar')continue;const dx=o.x-P.x,dy=o.y-P.y,lim=FOG+o.r;if(dx*dx+dy*dy>lim*lim)continue;
      const el=groundEllipse(o.x,o.y,o.r);ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx,el.ry,0,0,TAU);
      if(o.kind==='pit'){ctx.setLineDash([7,6]);ctx.strokeStyle='rgba(231,223,205,.75)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([])}
      else if(o.on){ctx.fillStyle='rgba(214,120,40,.1)';ctx.fill();ctx.strokeStyle='#d6a544';ctx.lineWidth=2.5;ctx.stroke()}
      else{ctx.strokeStyle='rgba(185,178,198,.4)';ctx.lineWidth=1.5;ctx.stroke()}}
    // ...and so does the weight of a blow about to land, once there are nerves to feel it
    if(MB.has('touch')){const zs=MB.zones;
      for(let i=0;i<zs.length;i++){const z=zs[i],q=Math.min(1,z.t/z.dur),el=groundEllipse(z.x,z.y,z.r);
        ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx,el.ry,0,0,TAU);ctx.fillStyle='rgba(184,38,61,'+(.14+.3*q)+')';ctx.fill();ctx.strokeStyle='#d6a544';ctx.lineWidth=2;ctx.stroke();
        ctx.beginPath();ctx.ellipse(el.cx,el.cy,el.rx*q,el.ry*q,0,0,TAU);ctx.strokeStyle='rgba(231,223,205,.8)';ctx.stroke()}}
  }
  else if(sight){ctx.fillStyle=vignette();ctx.fillRect(0,0,W,H)}
  // damage numbers: bold and tilted, bigger and hotter with the size of the hit; words get a small caps tag with an accent line
  const floats=MB.floats;
  if(floats.length){ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(let i=0;i<floats.length;i++){const f=floats[i];toScreen(f.x,26,f.y);if(!sp.ok)continue;
      const b0=born.get(f)||f.life,age=b0-f.life,a=clamp01(f.life*3),txt=''+f.txt,c0=txt.charCodeAt(0),v=parseFloat(txt),num=v===v&&(c0===45||c0===43||(c0>=48&&c0<=57));
      ctx.save();ctx.globalAlpha=a;
      if(num){
        const hit=c0>=48&&c0<=57&&f.c==='#e7dfcd',k=hit&&FX.avg>0?v/FX.avg:1,pop=age<.1?1.7-.7*(age/.1):1,size=hit?Math.min(46,17+9*Math.min(3.2,k)):c0===45?27:22;
        const col=hit?(k>=1.7?CSS.foe:k>=1.15?CSS.gold:CSS.bone):c0===45?CSS.foe:f.c,rot=((f.x*7.13+i)%1-.5)*.26;
        slant(sp.x,sp.y-age*10,rot,pop*.9,pop);ctx.font='700 '+size+'px '+FONT;
        if(hit&&k>=1.7&&sight){ctx.fillStyle=tint(CSS.power);ctx.globalAlpha=a*.55;ctx.fillText(txt,2.5,2.5);ctx.globalAlpha=a}
        inked(txt,0,0,tint(col),size>30?5:4);
      }else{
        const t2=txt.toUpperCase(),in1=easeOut(clamp01(age/.16));
        slant(sp.x+(1-in1)*-26,sp.y,0,.92,1);ctx.font='700 17px '+FONT;spaced(2);
        const w=ctx.measureText(t2).width;inked(t2,0,0,sight?f.c:MB.col(f.c),4);spaced(0);
        ctx.fillStyle=sight?f.c:MB.col(f.c);ctx.fillRect(-w/2*in1,5,w*in1,1.5);
      }
      ctx.restore()}
    ctx.globalAlpha=1}
  if(MB.has('touch')){
    const mons=MB.mons;ctx.textAlign='center';ctx.font='700 30px '+FONT;
    for(let i=0;i<mons.length;i++){const m=mons[i];if(m.st!=='wind'||m.hidden)continue;
      toScreen(m.x,m.r*2.3+16+(m.lift||0)*LIFT,m.y);if(!sp.ok)continue;
      const pu=1+.12*Math.sin(S.t*26+i);ctx.save();ctx.translate(sp.x,sp.y-9);ctx.scale(pu,pu);
      ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(13,0);ctx.lineTo(0,19);ctx.lineTo(-13,0);ctx.closePath();ctx.fillStyle='rgba(11,10,22,.86)';ctx.fill();ctx.strokeStyle=tint(CSS.foe);ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=tint(CSS.gold);ctx.fillText('!',0,10.5);ctx.restore()}
  }
  // pets: a small health bar over the head, in the owner's colour (also one more thing no hostile monster has)
  {const al=R.testAllies||MB.allies||NONE,MM=modelOf('monster');
    for(let i=0;i<al.length;i++){const a=al[i];if(!a||!a.pet||a.minion||a.hidden||a.dead||!(a.maxHp>0)||!(a.hp>0))continue;
      let top=(a.r||16)*2.4;if(MM&&MM.height)try{top=MM.height(a)}catch(e){}
      toScreen(a.x,top+10+(a.lift||0)*LIFT,a.y);if(!sp.ok)continue;
      const beast=a.owner==='beast',q=Math.max(0,Math.min(1,a.hp/a.maxHp)),bw=Math.max(34,Math.min(64,(a.r||16)*1.7)),bx=sp.x-bw/2,by=sp.y-8;
      ctx.fillStyle='rgba(8,8,12,.82)';ctx.fillRect(bx-2,by-2,bw+4,9);
      ctx.fillStyle=beast?'#1d3348':'#12301a';ctx.fillRect(bx,by,bw,5);
      ctx.fillStyle=q<.3?'#e0a23c':beast?'#cfeaff':'#6fe07a';ctx.fillRect(bx,by,bw*q,5);
      ctx.strokeStyle=beast?'rgba(207,234,255,.9)':'rgba(125,255,140,.85)';ctx.lineWidth=1;ctx.strokeRect(bx-1.5,by-1.5,bw+3,8);
      // a small heart-shaped pip marks it as yours
      ctx.fillStyle=beast?'#cfeaff':'#7dff8c';ctx.beginPath();ctx.moveTo(bx-9,by-1);ctx.lineTo(bx-5,by+2.5);ctx.lineTo(bx-9,by+6);ctx.lineTo(bx-13,by+2.5);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(8,8,12,.8)';ctx.stroke()}}
  // held beats and wounds: letterbox bars, focus lines toward the boss, a red pulse at the edges
  if(FX.hurt>0&&MB.has('touch')){const a=FX.hurt*FX.hurt*.5;ctx.fillStyle=sight?'rgba(255,45,85,'+a+')':'rgba(230,230,240,'+a*.7+')';
    ctx.globalCompositeOperation='lighter';ctx.fillRect(0,0,W,10);ctx.fillRect(0,H-10,W,10);ctx.fillRect(0,0,10,H);ctx.fillRect(W-10,0,10,H);
    ctx.globalAlpha=.45;ctx.fillRect(0,0,W,26);ctx.fillRect(0,H-26,W,26);ctx.fillRect(0,0,26,H);ctx.fillRect(W-26,0,26,H);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  if(FX.drama>0){const d=FX.drama/FX.dramaMax,e=Math.sin(Math.min(1,d*1.6)*Math.PI/2)*Math.min(1,(1-d)*9),death=FX.kind==='death';
    toScreen(FX.bx,30,FX.bz);const fx0=sp.x,fy0=sp.y;
    const g=ctx.createRadialGradient(fx0,fy0,H*.2,fx0,fy0,H*.95);g.addColorStop(0,'rgba(5,3,16,0)');g.addColorStop(1,'rgba(5,3,16,'+.72*e+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(!Q.low){ctx.fillStyle=sight?(death?'rgba(196,244,255,':'rgba(255,60,95,')+(.5*e)+')':'rgba(240,240,250,'+(.4*e)+')';ctx.beginPath();
      const fr=Math.floor(S.t*20);
      for(let i=0;i<22;i++){const a=i/22*TAU+Math.sin(i*12.9+fr*1.7)*.12,r1=H*(.5+.22*Math.sin(i*7.3+fr)),r0=W*.75,w=.007+.006*Math.sin(i*3.1+fr*.7),ca=Math.cos(a),sa=Math.sin(a);
        ctx.moveTo(fx0+Math.cos(a-w)*r0,fy0+Math.sin(a-w)*r0);ctx.lineTo(fx0+ca*r1,fy0+sa*r1);ctx.lineTo(fx0+Math.cos(a+w)*r0,fy0+Math.sin(a+w)*r0);ctx.closePath()}
      ctx.fill()}
    const bh=30*e;ctx.fillStyle='rgba(5,4,12,.96)';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh);
    ctx.fillStyle=sight?(death?CSS.power2:CSS.foe):'#ddd';ctx.globalAlpha=e;ctx.fillRect(0,bh,W,1.5);ctx.fillRect(0,H-bh-1.5,W,1.5);ctx.globalAlpha=1}
  // level banner: a slanted dark band that cuts in from the left, thin accent lines, the title sliding in against it
  if(S.banner>0&&S.mode==='play'&&S.L){
    const L=S.L,age=2.8-S.banner,tin=easeOut(clamp01(age/.32)),out=clamp01(S.banner/.4),a=Math.min(1,tin*1.2)*out,sl=28,y0=204,y1=338,xr=W*tin+sl,ac=tint(CSS.power),ac2=tint(CSS.power2);
    ctx.save();ctx.globalAlpha=a;
    ctx.beginPath();ctx.moveTo(-sl,y0);ctx.lineTo(xr+sl,y0);ctx.lineTo(xr-sl,y1);ctx.lineTo(-sl*3,y1);ctx.closePath();ctx.fillStyle='rgba(8,7,18,.84)';ctx.fill();
    ctx.fillStyle=ac;ctx.fillRect(0,y0-5,W*tin,2);ctx.fillRect(W*(1-tin),y1+3,W*tin,2);
    const run=(age*.55)%1.4-.2;ctx.fillStyle=ac2;ctx.fillRect(W*run,y0-5,90,2);ctx.fillRect(W*(1-run)-90,y1+3,90,2);
    const tl=easeOut(clamp01((age-.1)/.36)),ox=(1-tl)*90+(1-out)*-60;
    ctx.globalAlpha=a*tl;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.font='700 15px '+FONT;spaced(4);ctx.fillStyle=tint(CSS.gold);ctx.fillText(('LEVEL '+(S.level+1)+'  //  '+L.spec.name).toUpperCase(),W/2-ox*.5,y0+30);spaced(0);
    ctx.save();slant(W/2+ox,y0+86,0,.88,1);ctx.font='700 60px '+FONT;spaced(1.5);const tt=(''+L.title).toUpperCase(),tw=ctx.measureText(tt).width,fit=tw>W*.98?W*.98/tw:1;if(fit<1)ctx.scale(fit,1);
    ctx.fillStyle=ac;ctx.globalAlpha=a*tl*.7;ctx.fillText(tt,3.5,3.5);ctx.globalAlpha=a*tl;ctx.fillStyle=CSS.bone;ctx.fillText(tt,0,0);spaced(0);ctx.restore();
    ctx.fillStyle=ac2;ctx.fillRect(W/2-110*tl,y0+99,220*tl,1.5);
    ctx.font='500 19px '+FONT;spaced(.6);ctx.fillStyle=CSS.dim;ctx.fillText(L.hint,W/2-ox*.4,y0+123);spaced(0);
    ctx.restore();ctx.globalAlpha=1;
  }
}

/* ---------- action effects: pooled and timed, visual only (they never touch game time); fewer or none in low graphics ---------- */
function fxTex(size,draw){const c=mkCanvas(size,size),g=c.getContext('2d');g.translate(size/2,size/2);draw(g,size/2);return new THREE.CanvasTexture(c)}
const slashTex=fxTex(128,(g,h)=>{ // a crescent bulging toward +x: bright outer edge, tapering to both ends
  const R=h*.94,a=1.22,ex=Math.cos(a)*R,ey=Math.sin(a)*R,cx=-h*.47,r2=Math.hypot(ex-cx,ey),a2=Math.atan2(ey,ex-cx);
  g.beginPath();g.arc(0,0,R,-a,a);g.arc(cx,0,r2,a2,-a2,true);g.closePath();
  const gr=g.createRadialGradient(0,0,R*.62,0,0,R);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.55,'rgba(255,255,255,.35)');gr.addColorStop(.9,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,.9)');
  g.fillStyle=gr;g.fill()});
const burstTex=fxTex(128,(g,h)=>{const rnd=rng(9);g.fillStyle='#fff'; // short radial speed lines
  for(let i=0;i<26;i++){const a=i/26*TAU+rnd()*.16,r0=h*(.3+rnd()*.2),r1=h*(.72+rnd()*.26),w=.018+rnd()*.03;
    g.beginPath();g.moveTo(Math.cos(a-w)*r0,Math.sin(a-w)*r0);g.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);g.lineTo(Math.cos(a+w)*r0,Math.sin(a+w)*r0);g.closePath();g.fill()}});
const flareTex=fxTex(128,(g,h)=>{ // a hard four-point flash with a soft core
  const gr=g.createRadialGradient(0,0,0,0,0,h*.55);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(-h,-h,h*2,h*2);
  g.fillStyle='#fff';for(let i=0;i<4;i++){g.save();g.rotate(i*Math.PI/2+.5);g.beginPath();g.moveTo(0,-h*.09);g.lineTo(h*(i%2?.62:.98),0);g.lineTo(0,h*.09);g.closePath();g.fill();g.restore()}});
const crackTex=fxTex(256,(g,h)=>{const rnd=rng(23);g.strokeStyle='#fff';g.lineCap='round';g.lineJoin='round';
  const branch=(x,y,a,len,w,d)=>{g.lineWidth=w;g.beginPath();g.moveTo(x,y);const n=3+(rnd()*3|0);for(let i=0;i<n;i++){a+=rnd()*.9-.45;x+=Math.cos(a)*len/n;y+=Math.sin(a)*len/n;g.lineTo(x,y);if(d<2&&rnd()<.55){g.stroke();branch(x,y,a+(rnd()<.5?.8:-.8),len*.45,w*.6,d+1);g.lineWidth=w;g.beginPath();g.moveTo(x,y)}}g.stroke()};
  for(let i=0;i<9;i++)branch(0,0,i/9*TAU+rnd()*.4,h*(.55+rnd()*.38),5,0);
  g.lineWidth=2;g.setLineDash([14,9,5,12]);g.beginPath();g.arc(0,0,h*.52,0,TAU);g.stroke();g.setLineDash([]);
  g.fillStyle='#fff';g.beginPath();g.arc(0,0,h*.09,0,TAU);g.fill()});
const addMat=(tex,hex,sprite)=>sprite?new THREE.SpriteMaterial({map:tex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,transparent:true,fog:false,toneMapped:false})
  :new THREE.MeshBasicMaterial({map:tex,color:hex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,toneMapped:false,side:THREE.DoubleSide});
class Timed{
  constructor(n,make){this.a=[];this.i=0;for(let i=0;i<n;i++){const o=make();o.visible=false;o.userData.life=0;o.userData.max=1;fx.add(o);this.a.push(o)}}
  spawn(life){const o=this.a[this.i];this.i=(this.i+1)%this.a.length;o.userData.life=o.userData.max=life;o.visible=true;return o}
  run(dt,fn){const a=this.a;for(let i=0;i<a.length;i++){const o=a[i],u=o.userData;if(u.life<=0)continue;u.life-=dt;if(u.life<=0){o.visible=false;continue}fn(o,1-u.life/u.max)}}
  clear(){const a=this.a;for(let i=0;i<a.length;i++){a[i].userData.life=0;a[i].visible=false}}
}
const GHOST_GEO=mergeGeos([new THREE.CapsuleGeometry(6.5,20,3,8).translate(0,33,0),new THREE.SphereGeometry(7,10,8).translate(0,55,1),new THREE.CylinderGeometry(3,2.4,22,6).translate(-4,11,0),new THREE.CylinderGeometry(3,2.4,22,6).translate(4,11,0),new THREE.ConeGeometry(11,30,7,1,true).translate(0,24,-3)]);
const TF={
  slash:new Timed(4,()=>{const g=new THREE.Group(),a=new THREE.Mesh(G.quad,addMat(slashTex,PAL.power)),b=new THREE.Mesh(G.quad,addMat(slashTex,PAL.power2));b.scale.setScalar(.9);b.position.y=.6;a.renderOrder=b.renderOrder=7;g.add(a,b);g.userData.a=a;g.userData.b=b;return g}),
  ghost:new Timed(8,()=>{const m=new THREE.Mesh(GHOST_GEO,new THREE.MeshBasicMaterial({color:PAL.power,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,toneMapped:false}));m.renderOrder=6;return m}),
  streak:new Timed(3,()=>{const m=new THREE.Mesh(G.quad,flatGlowMat(PAL.power,.8));m.renderOrder=6;return m}),
  flash:new Timed(12,()=>new THREE.Sprite(addMat(flareTex,0xffffff,true))),
  burst:new Timed(5,()=>new THREE.Sprite(addMat(burstTex,0xffffff,true))),
  crack:new Timed(7,()=>{const g=new THREE.Group(),d=new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:crackTex,color:0x06050e,transparent:true,depthWrite:false,fog:false,toneMapped:false})),h=new THREE.Mesh(G.quad,addMat(crackTex,PAL.foe));
    d.position.y=.42;h.position.y=.5;d.renderOrder=1;h.renderOrder=2;g.add(d,h);g.userData.d=d;g.userData.h=h;return g}),
};
const FX={prevAtk:0,dir:1,ghostT:0,px:0,py:0,lvl:-1,mode:'',boss:null,ph:0,rage:false,bx:W/2,bz:H/2,drama:0,dramaMax:1,kind:'',hurt:0,avg:0,nAvg:0,rankK:0,clock:0};
const born=new WeakMap(),prevZones=[],prevRings=[];
const auraP=makePoints(48);pointSets.push(auraP);auraP.mat.blending=THREE.AdditiveBlending;
const auraDisc=new THREE.Mesh(G.quad,flatGlowMat(PAL.power,.2));auraDisc.position.y=.62;auraDisc.renderOrder=1;auraDisc.visible=false;fx.add(auraDisc);
const easeOut=q=>1-(1-q)*(1-q)*(1-q);
function upSlash(o,q){const u=o.userData,e=easeOut(q);o.rotation.y=-(u.ang+u.dir*(e-.5)*u.arc);o.scale.setScalar(u.reach*(1.75+.45*e));const k=(1-q)*(1-q);u.a.material.opacity=k*.95;u.b.material.opacity=Math.min(1,k*1.3)}
function upGhost(o,q){o.material.opacity=(1-q)*o.userData.k;o.scale.y=1-.08*q}
function upStreak(o,q){const u=o.userData;o.material.opacity=(1-q)*.85;o.scale.set(u.len,1,u.w*(1-.7*q))}
function upFlash(o,q){const u=o.userData,e=easeOut(q);o.scale.setScalar(u.s0+(u.s1-u.s0)*e);o.material.opacity=(1-q)*(1-q)*u.k}
function upCrack(o,q){const u=o.userData;u.d.material.opacity=Math.min(1,(1-q)*2.6)*.82;u.h.material.opacity=Math.max(0,1-q*4.5)*.95;u.h.visible=u.hot&&q<.23}
function flashAt(x,y,z,s0,s1,hex,life,k){const o=TF.flash.spawn(life||.14),u=o.userData;o.position.set(x,y,z);u.s0=s0;u.s1=s1;u.k=k===undefined?1:k;o.material.color.setHex(hex);o.material.rotation=(x*.37+z*.11)%1.5;o.scale.setScalar(s0);return o}
function burstAt(x,y,z,s0,s1,hex,life){const o=TF.burst.spawn(life||.2),u=o.userData;o.position.set(x,y,z);u.s0=s0;u.s1=s1;u.k=.9;o.material.color.setHex(hex);o.material.rotation=(x*.21+z*.4)%TAU;o.scale.setScalar(s0)}
function crackAt(x,z,r,hex,life){const o=TF.crack.spawn(life||2.6),u=o.userData;o.position.set(x,0,z);o.rotation.y=(x*.13+z*.29)%TAU;o.scale.setScalar(Math.max(40,r*2.5));u.hot=!Q.low;u.h.material.color.setHex(hex)}
function drama(kind,x,z,len){if(calm)return;FX.drama=FX.dramaMax=len;FX.kind=kind;FX.bx=x;FX.bz=z}
const RANK_K={'':0,E:.22,D:.38,C:.54,B:.7,A:.85,S:1};
if(typeof MB.on==='function')try{
  MB.on('bossdead',()=>{if(!alive)return;const x=FX.bx,z=FX.bz;drama('death',x,z,1.25);flashAt(x,34,z,60,330,0xffffff,.42,1);burstAt(x,34,z,90,420,PAL.power2,.38);crackAt(x,z,90,PAL.power,3.4)});
  MB.on('levelstart',()=>{for(const k in TF)TF[k].clear();FX.drama=0;FX.hurt=0;FX.avg=0;FX.nAvg=0;prevZones.length=0;prevRings.length=0});
}catch(e){}
function syncFx(dt,sight){
  const S=MB.S,P=MB.P,low=Q.low,t=S.t,cls=MB.cls();
  if(FX.drama>0)FX.drama=Math.max(0,FX.drama-dt);
  if(FX.hurt>0)FX.hurt=Math.max(0,FX.hurt-dt*2.6);
  const d=FX.drama>0?FX.drama/FX.dramaMax:0,fdt=dt*(1-.72*Math.sin(Math.min(1,d*1.4)*Math.PI/2)); // effects run slow while a big moment holds
  FX.clock+=fdt;
  const play=S.mode==='play';
  if(S.level!==FX.lvl||S.mode!==FX.mode){if(S.level!==FX.lvl||S.mode==='title'){for(const k in TF)TF[k].clear();FX.drama=0}FX.lvl=S.level;FX.mode=S.mode;if(P){FX.px=P.x;FX.py=P.y}FX.prevAtk=P?P.atk:0;FX.boss=null}
  // the boss: a phase breaking or the rage starting is a held beat
  const B=MB.boss;
  if(B!==FX.boss){FX.boss=B;FX.ph=B?B.phase||1:0;FX.rage=B?!!B.rage:false}
  else if(B&&B.hp>0){const ph=B.phase||1,rg=!!B.rage;
    if((ph>FX.ph||(rg&&!FX.rage))&&play){drama('phase',B.x,B.y,.85);if(sight){flashAt(B.x,B.r+10,B.y,B.r*2,B.r*7,PAL.foe,.32,1);if(!low)burstAt(B.x,B.r+10,B.y,B.r*3,B.r*9,PAL.foe2,.3);crackAt(B.x,B.y,B.r*1.5,PAL.foe,3)}}
    FX.ph=ph;FX.rage=rg}
  if(B&&B.hp>0){FX.bx=B.x;FX.bz=B.y}
  if(P&&play){
    // weapon trail on a swing, a muzzle flare on a cast or shot
    const atk=P.atk||0;
    if(atk>FX.prevAtk+.04){
      const ang=P.swing===undefined?P.face:P.swing,melee=MB.melee(cls);
      if(melee){const o=TF.slash.spawn(cls==='assassin'?.16:.22),u=o.userData;FX.dir=-FX.dir;u.ang=ang;u.dir=FX.dir;u.arc=cls==='assassin'?1.1:cls==='tank'?1.3:1.6;u.reach=cls==='tank'?58:cls?64:50;
        o.position.set(P.x,cls?30:26,P.y);u.a.material.color.setHex(cls?PAL.power:0xcfd0e6);u.b.material.color.setHex(cls?PAL.power2:0xffffff);upSlash(o,0)}
      else if(!low){const hex=cls==='healer'?PAL.holy:cls==='necro'?PAL.necro:cls==='ranger'?PAL.power2:PAL.power;flashAt(P.x+Math.cos(ang)*20,36,P.y+Math.sin(ang)*20,16,58,hex,.13,.95)}
    }
    FX.prevAtk=atk;
    // afterimages: a trail of ghosts on a dash, a streak and ghosts along a blink
    const dx=P.x-FX.px,dy=P.y-FX.py,jump=dx*dx+dy*dy;
    if(!low&&sight){
      if(P.dashT>0){FX.ghostT-=dt;if(FX.ghostT<=0){FX.ghostT=.034;const o=TF.ghost.spawn(.26);o.position.set(P.x,0,P.y);o.rotation.set(.3,Math.PI/2-P.face,0,'YXZ');o.userData.k=.36;o.material.color.setHex(PAL.power)}}
      else{FX.ghostT=0;
        if(jump>80*80&&jump<260*260&&cls==='mage'){const len=Math.sqrt(jump),a=Math.atan2(dy,dx);
          for(let i=0;i<4;i++){const o=TF.ghost.spawn(.3+i*.05),q=i/4;o.position.set(FX.px+dx*q,0,FX.py+dy*q);o.rotation.set(.22,Math.PI/2-a,0,'YXZ');o.userData.k=.2+.1*i;o.material.color.setHex(i%2?PAL.power2:PAL.power)}
          const s=TF.streak.spawn(.3),u=s.userData;s.position.set(FX.px+dx/2,22,FX.py+dy/2);s.rotation.y=-a;u.len=len*1.15;u.w=34;upStreak(s,0);
          flashAt(P.x,34,P.y,24,96,PAL.power2,.2,.9)}}
    }
    FX.px=P.x;FX.py=P.y;
  }
  // slams: a telegraphed blast going off, or a heavy shockwave, cracks the floor for a while
  {const zs=MB.zones;
    for(let i=0;i<prevZones.length;i++){const z=prevZones[i];if(zs.indexOf(z)>=0||!(z.t>=z.dur*.92)||!play)continue;
      if(sight){crackAt(z.x,z.y,z.r*.9,z.mine?PAL.power:PAL.foe,low?1.6:2.6);if(!low)flashAt(z.x,10,z.y,z.r*.8,z.r*2.6,z.mine?PAL.power2:0xffd9a0,.16,.8)}}
    prevZones.length=0;for(let i=0;i<zs.length;i++)prevZones.push(zs[i]);
    const rs=MB.rings;
    if(sight&&!low)for(let i=0;i<rs.length;i++){const r=rs[i];if(!r.fx||r.r<118||r.under||prevRings.indexOf(r)>=0)continue;crackAt(r.x,r.y,(r.r-70)*.9,PAL.gold,2.2)}
    prevRings.length=0;for(let i=0;i<rs.length;i++)prevRings.push(rs[i])}
  // hits: every new damage number is an event; the big ones flash and throw speed lines
  {const fl=MB.floats;
    for(let i=0;i<fl.length;i++){const f=fl[i];if(born.has(f))continue;born.set(f,f.life);
      const v=parseFloat(f.txt);if(!(v===v)||typeof f.txt!=='string')continue;
      const c0=f.txt.charCodeAt(0);
      if(c0===45){if(P&&Math.abs(f.x-P.x)<4&&f.c==='#ff5b6e')FX.hurt=1;continue} // '-': something of ours was hurt
      if(c0===43||f.c!=='#e7dfcd')continue;
      FX.nAvg++;FX.avg=FX.nAvg<4?(FX.avg*(FX.nAvg-1)+v)/FX.nAvg:FX.avg+(v-FX.avg)*.12;
      if(!sight)continue;
      const k=FX.avg>0?v/FX.avg:1,heavy=k>=1.7&&FX.nAvg>3;
      if(heavy){flashAt(f.x,26,f.y+22,30,120+26*Math.min(3,k),0xffffff,.17,1);if(!low)burstAt(f.x,26,f.y+22,50,150+40*Math.min(3,k),cls?PAL.power2:0xffffff,.2)}
      else if(!low)flashAt(f.x,26,f.y+20,14,50,cls?PAL.power2:0xffffff,.11,.8)}}
  TF.slash.run(fdt,upSlash);TF.ghost.run(fdt,upGhost);TF.streak.run(fdt,upStreak);TF.flash.run(fdt,upFlash);TF.burst.run(fdt,upFlash);TF.crack.run(fdt,upCrack);
  // power rising off the hero: more of it with every rank
  {let k=0;if(cls&&P&&play&&sight){const r=MB.rank?MB.rank():'';k=r&&r[0]==='S'?1:RANK_K[r]||.12}
    FX.rankK+=(k-FX.rankK)*Math.min(1,dt*2);const rk=FX.rankK;
    const n=rk<.02||!P?0:Math.round((low?3:8)+(low?9:40)*rk),pos=auraP.pos,col=auraP.col,size=auraP.size,c=FX.clock;
    for(let i=0;i<n;i++){const a=i*2.399+c*(.5+i%3*.22),rad=9+(i*7%19)+6*Math.sin(c*1.3+i),h=(i*17.3+c*(20+i%5*7+26*rk))%(54+34*rk),q=h/(54+34*rk);
      pos[i*3]=P.x+Math.cos(a)*rad;pos[i*3+1]=3+h;pos[i*3+2]=P.y+Math.sin(a)*rad*.8;
      const hot=i%4===0;col[i*4]=hot?.77:.55;col[i*4+1]=hot?.96:.3;col[i*4+2]=1;col[i*4+3]=Math.sin(q*Math.PI)*(.5+.4*rk);size[i]=(hot?1.5:2.1)+rk*1.1+(i%3)*.4}
    auraP.geo.setDrawRange(0,n);
    if(n){auraP.geo.attributes.position.needsUpdate=true;auraP.geo.attributes.aCol.needsUpdate=true;auraP.geo.attributes.aSize.needsUpdate=true}
    auraDisc.visible=rk>.02&&!!P;if(auraDisc.visible){auraDisc.position.x=P.x;auraDisc.position.z=P.y;auraDisc.scale.setScalar(64+52*rk+4*Math.sin(c*3));auraDisc.material.opacity=.1+.2*rk+.03*Math.sin(c*5)}}
}

/* ---------- graphics quality, switched live ---------- */
function applyQuality(){
  const low=isLow();Q.low=low;
  sun.castShadow=!low;renderer.shadowMap.enabled=!low;
  if(low&&sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}
  points[2].visible=points[3].visible=!low;XL[0].visible=XL[1].visible=!low;
  viewPR=0; // resize() picks the new pixel ratio; syncEnv() rebuilds the place without bump maps and with fewer props
  ST.refresh(scene); // ink outlines: stripped in low, rebuilt from the remembered requests in high
}
if(typeof MB.on==='function')try{MB.on('settings',()=>{if(alive&&isLow()!==Q.low)applyQuality()})}catch(e){}

/* ---------- frame ---------- */
let lastSight=null,alive=true;
function draw(dt){
  if(!alive)return;
  const S=MB.S,P=MB.P,sight=MB.has('sight'),t=S.t;
  if(isLow()!==Q.low)applyQuality();
  resize();syncEnv();
  if(sight!==lastSight){lastSight=sight;glc.style.filter=sight?'none':'grayscale(1) contrast(1.22) brightness(1.06)';
    ST.uRim.value.setHex(sight?PAL.rim:0xffffff).multiplyScalar(sight?.55:.8)}
  for(let i=0;i<env.glowOnly.length;i++)env.glowOnly[i].visible=sight;
  if(env.runeM)env.runeM.material.opacity=.3+.14*Math.sin(t*1.3);

  // camera: leans toward the player, never far from the arena centre
  frameWant(sight);
  const k=1-Math.exp(-dt*3.2);
  camTarget.x+=(want.x-camTarget.x)*k;camTarget.z+=(want.z-camTarget.z)*k;
  zoom+=(want.zoom-zoom)*(want.zoom>zoom?1-Math.exp(-dt*4.5):1-Math.exp(-dt*1.3));
  {const d=FX.drama>0?FX.drama/FX.dramaMax:0,e=Math.sin(Math.min(1,d*1.5)*Math.PI/2),m=.22*e; // a held beat: push in a little toward the boss
    placeCamera(camTarget.x+(FX.bx-camTarget.x)*m,camTarget.z+(FX.bz-camTarget.z)*m,fitD*zoom*(1-.07*e))}
  basePos.copy(camera.position);
  scene.fog.near=fitD*zoom*.95;scene.fog.far=fitD*zoom+env.fogFar;
  ST.uMin.value=viewH?2*fitD*zoom*Math.tan(camera.fov*Math.PI/360)/viewH*.95:0; // ink lines never thinner than about a pixel

  // lights
  const low=Q.low,nL=low?2:4;
  if(!sight){
    hemi.color.setHex(0xaab0c0);hemi.groundColor.setHex(0x1c1c22);hemi.intensity=.3;
    sun.color.setHex(0xffffff);sun.intensity=.5;
    points[0].color.setHex(0xffffff);points[0].intensity=.8;points[0].distance=FOG*2.4;points[0].position.set(P?P.x:W/2,140,(P?P.y:H/2)+34);
    for(let i=1;i<4;i++)points[i].intensity=0;
  }else{
    hemi.color.copy(env.sky);hemi.groundColor.copy(env.gnd);
    hemi.intensity=env.hemiI*HEMI_K;sun.color.copy(env.sun);sun.intensity=env.sunI*SUN_K;
  }
  for(let i=0;i<4;i++){
    const f=env.flames[i],lit=sight,fl=1+.13*Math.sin(t*9+f.ph)+.07*Math.sin(t*23.7+f.ph*2.3);
    f.fl.visible=lit;
    if(lit){
      if(i<nL){const l=points[i];l.color.copy(env.lightColor);
        if(low){l.intensity=env.lightI*1.1*PT_K;l.distance=env.lightD*1.7;l.position.set(i?W*.76:W*.24,170,H*.45)}
        else{l.intensity=env.lightI*fl*PT_K;l.distance=env.lightD;l.position.set(CORNERS[i][0]+(i%2?-46:46),f.y+78,CORNERS[i][1]+(i<2?46:-46))}}
      if(env.fire){f.f1.scale.set(30*fl,48*fl+4*Math.sin(t*17+f.ph),1);f.f1.position.y=f.y+10+Math.sin(t*13+f.ph)*1.2;f.f2.scale.set(15,24*fl,1);f.halo.material.opacity=.36*fl}
      else{f.f1.scale.setScalar(40*fl);f.f2.scale.setScalar(16);f.halo.material.opacity=.24*fl;const c=env.crystals[i];if(c){c.rotation.y=t*.6+i;c.position.y=f.y+Math.sin(t*1.4+i*1.9)*2.5}}
    }
  }
  for(let i=0;i<env.lit.length;i++)env.lit[i].m.color.setHex(sight?env.lit[i].on:env.lit[i].off);
  for(let i=0;i<env.ticks.length;i++)env.ticks[i](t);

  // the living
  stamp++;
  for(const k2 in pools)pools[k2].begin();
  syncObstacles(dt,sight);
  if(P){
    if(!playerRec)playerRec=makeEnt('player',P,phPlayer);
    playerRec.g.position.set(P.x,0,P.y);playerRec.g.visible=true;
    updateEnt(playerRec,'player',P,dt,phPlayer,phPlayerUpdate);
    if(low){const b=pools.blob.get();b.position.set(P.x,.55,P.y);b.scale.set(70,1,56)}
  }else if(playerRec)playerRec.g.visible=false;
  syncMap(monMap,MB.mons,'monster',dt,phMonster,phMonsterUpdate,sight);
  const allies=R.testAllies||MB.allies||NONE;
  syncDying(dt);
  syncMap(allyMap,allies,'ally',dt,phAlly,phAllyUpdate,true);
  syncFx(dt,sight);

  // projectiles
  const shots=MB.shots;
  for(let i=0;i<shots.length;i++){const s=shots[i],o=pools.shot.get(),r=s.r||5;o.position.set(s.x,SHOT_Y,s.y);o.scale.setScalar(r);o.rotation.y=-Math.atan2(s.vy||0,s.vx||0);o.userData.trail.visible=!low&&!!(s.vx||s.vy);o.userData.core.scale.setScalar(.8+.12*Math.sin(t*30+i))}
  const ps=MB.pshots;
  for(let i=0;i<ps.length;i++){const p=ps[i],r=p.r||5,pool=pools[p.kind]||pools.bolt,o=pool.get();o.position.set(p.x,SHOT_Y,p.y);
    if(o.userData.trail)o.userData.trail.visible=!low;
    if(p.kind==='arrow')o.rotation.y=Math.PI/2-Math.atan2(p.vy,p.vx);
    else if(p.kind==='skull'){o.scale.setScalar(r*1.25);o.rotation.y=0;o.userData.trail.rotation.y=-Math.atan2(p.vy,p.vx);o.userData.trail.position.set(-Math.cos(Math.atan2(p.vy,p.vx))*3.8,0,-Math.sin(Math.atan2(p.vy,p.vx))*3.8);o.userData.core.rotation.y=Math.PI/2-Math.atan2(p.vy,p.vx);o.userData.core.rotation.z=Math.sin(t*14+i)*.25}
    else{o.scale.setScalar(Math.max(4.5,r));o.rotation.y=-Math.atan2(p.vy||0,p.vx||0);o.userData.core.scale.setScalar(.8)}}
  const mor=MB.morsels;
  for(let i=0;i<mor.length;i++){const f=mor[i],o=pools.morsel.get();o.position.set(f.x,0,f.y);const b=o.userData.bob;b.position.y=13+Math.sin(t*4+i)*3;b.rotation.y=t*1.6+i}
  {const fs=MB.fields;if(fs)for(let i=0;i<fs.length;i++){const f=fs[i],o=pools.field.get(),m=o.material,tex=fieldTexture(f.kind==='frost'||f.kind==='halo'||f.kind==='rain'?f.kind:'other');
    if(m.map!==tex)m.map=tex;o.position.x=f.x;o.position.z=f.y;o.scale.setScalar(f.r*2.1);o.rotation.y=f.kind==='rain'?0:t*(f.kind==='frost'?.22:-.3);
    m.opacity=Math.max(0,Math.min(1,f.t*5,(f.dur-f.t)*2.5))*(.8+.14*Math.sin(t*5+i))}}
  if(sight&&MB.has('touch')){const zs=MB.zones;
    for(let i=0;i<zs.length;i++){const z=zs[i],q=Math.min(1,z.t/z.dur),o=pools.zone.get(),u=o.userData;o.position.set(z.x,0,z.y);
      u.disc.material.color.setHex(z.mine?0x5a48ff:0xd0143c);u.rim.material.color.setHex(z.mine?PAL.power2:0xffc04a);
      u.disc.scale.setScalar(z.r);u.rim.scale.setScalar(z.r);u.grow.scale.setScalar(Math.max(.01,z.r*q));u.disc.material.opacity=.16+.4*q+(q>.8?.12*Math.sin(t*40):0)}}
  {const ms=MB.mons;for(let i=0;i<ms.length;i++){const m=ms[i],b=m.beam;if(!b||m.hidden||!b.rays)continue;
    for(let j=0;j<b.rays.length;j++){const ry=b.rays[j],o=pools.beam.get(),u=o.userData,len=Math.max(1,ry.len),w=b.w||12;
      o.position.set(m.x+Math.cos(ry.a)*len/2,SHOT_Y,m.y+Math.sin(ry.a)*len/2);o.rotation.y=-ry.a;
      u.core.visible=u.glow.visible=!!b.on;u.line.visible=!b.on;
      if(b.on){const fl=1+.18*Math.sin(t*47+j);u.core.scale.set(len,w*.55*fl,w*.9*fl);u.glow.scale.set(len+w*3,1,w*5.5*fl)}
      else u.line.scale.set(len,.6,2.2+1.2*Math.sin(t*26))}}}
  for(let i=0;i<allies.length;i++){const m=allies[i],b=m&&m.beam;if(!b||m.hidden||!b.rays||m.hp<=0)continue; // a pet's beam is the same shape in friendly blue
    for(let j=0;j<b.rays.length;j++){const ry=b.rays[j],o=pools.pbeam.get(),u=o.userData,len=Math.max(1,ry.len||0),w=b.w||12;
      o.position.set(m.x+Math.cos(ry.a)*len/2,SHOT_Y,m.y+Math.sin(ry.a)*len/2);o.rotation.y=-ry.a;
      u.core.visible=u.glow.visible=!!b.on;u.line.visible=!b.on;
      if(b.on){const fl=1+.18*Math.sin(t*47+j);u.core.scale.set(len,w*.55*fl,w*.9*fl);u.glow.scale.set(len+w*3,1,w*5.5*fl)}
      else u.line.scale.set(len,.6,2.2+1.2*Math.sin(t*26))}}
  {const zs=MB.zones;for(let i=0;i<zs.length;i++){const z=zs[i];if(typeof z.sx!=='number'||z.t>=z.dur)continue;const q=Math.max(0,z.t/z.dur),o=(z.mine?pools.pbomb:pools.bomb).get();
    o.position.set(z.sx+(z.x-z.sx)*q,12+Math.sin(q*Math.PI)*(70+z.dur*40),z.sy+(z.y-z.sy)*q);o.rotation.x=t*7+i}}
  if(sight){const rs=MB.rings,hear=MB.has('hearing');
    for(let i=0;i<rs.length;i++){const r=rs[i];if(!r.fx&&!(r.under&&hear))continue;
      const q=1-r.life/r.max,o=pools.ring.get();o.position.x=r.x;o.position.z=r.y;o.scale.setScalar(6+r.r*easeOut(q));o.material.opacity=Math.max(0,(1-q)*(1-q)*.95)}}
  for(const k2 in pools)pools[k2].end();

  // particles
  {const bits=MB.bits,n=Math.min(low?PMAX_LOW:PMAX,bits.length),pos=bitsP.pos,col=bitsP.col,size=bitsP.size;
    for(let i=0;i<n;i++){const b=bits[i],q=Math.max(0,b.life/b.max),c=cssRGB(b.c);
      pos[i*3]=b.x;pos[i*3+1]=12+Math.sin((1-q)*Math.PI)*16+(i%5)*2;pos[i*3+2]=b.y;
      col[i*4]=c[0];col[i*4+1]=c[1];col[i*4+2]=c[2];col[i*4+3]=q;size[i]=(b.r||2.5)*2.3}
    bitsP.geo.setDrawRange(0,n);
    if(n){bitsP.geo.attributes.position.needsUpdate=true;bitsP.geo.attributes.aCol.needsUpdate=true;bitsP.geo.attributes.aSize.needsUpdate=true}}
  {const n=sight?Math.min(MOTES,env.moteN):0,pos=motes.pos,col=motes.col,size=motes.size,mc=env.mote,mode=env.moteMode;
    for(let i=0;i<n;i++){
      if(mode==='rise'){pos[i*3]=(i*137.5+Math.sin(t*.7+i)*26)%W;pos[i*3+1]=(i*37+t*(16+i%7*3))%130;pos[i*3+2]=(i*89.3+t*(4+i%3))%H}
      else if(mode==='fall'){pos[i*3]=(i*137.5+t*(9+i%4*3))%W;pos[i*3+1]=140-(i*37+t*(24+i%5*5))%140;pos[i*3+2]=(i*89.3+Math.sin(t*.6+i)*20+60)%H}
      else{pos[i*3]=(i*137.5+t*(6+i%5))%W;pos[i*3+1]=14+(i*37%70)+Math.sin(t*.5+i)*8;pos[i*3+2]=(i*89.3+Math.sin(t*.4+i)*30+t*(3+i%3)+60)%H}
      col[i*4]=mc[0];col[i*4+1]=mc[1];col[i*4+2]=mc[2];col[i*4+3]=mode==='drift'?.2+.14*Math.sin(t*1.3+i*2.1):.5+.3*Math.sin(t*2.3+i*2.1);size[i]=2.4+(i%3)*.9}
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
if(isLow())applyQuality();
R.draw=draw;R.screenToGame=screenToGame;R.dispose=dispose;R.info=()=>renderer.info.render;R.settle=()=>{frameWant(MB.has('sight'));camTarget.x=want.x;camTarget.z=want.z;zoom=want.zoom};R.testObstacles=null;R.testAllies=null;R.scene=scene;R.camera=camera;R.ok=true;
})();
