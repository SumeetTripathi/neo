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
  '  mat3 im=mat3(instanceMatrix[0].xyz,instanceMatrix[1].xyz,instanceMatrix[2].xyz);n/=vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2]));n=im*n;p=instanceMatrix*p;',
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

// graphics tier: MB.settings.gfx 'low' | 'high' | 'ultra' (anything else counts as high)
const tierNow=()=>{const g=MB.settings&&MB.settings.gfx;return g==='low'?'low':g==='ultra'?'ultra':'high'};
const wantAA=()=>{const t=tierNow();return t==='ultra'?true:t==='low'?false:(window.devicePixelRatio||1)<2};
let renderer,aaMade=false;
try{
  // MSAA is fixed when the context is made: off in low, on in ultra, on in high unless the screen is dense already. A later change of
  // tier that would want it the other way shows as MB.renderer.needsRestart (it applies the next time the game starts).
  aaMade=wantAA();
  renderer=new THREE.WebGLRenderer({canvas:glc,antialias:aaMade,alpha:false,powerPreference:'high-performance',stencil:false});
  if(!renderer.getContext())throw new Error('no context');
}catch(e){console.warn('Marrowborn: WebGL unavailable, staying 2D');return}

// what the hero can see: fogR is the radius of the lit circle while there is no sight (FOG in the crypt; wider when an ordeal brings the dark
// back), seeing mirrors the frame's sight flag for the overlay helpers
let fogR=FOG,seeing=true;
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const TILT=52*Math.PI/180,LIFT=46,SHOT_Y=17;
// Colour: plain linear tone mapping (ACES bleached the class and monster colours toward white) and moderate lights; the floor textures are lifted instead.
// Cel look: one strong key light with crisp shadows, a cool indigo fill, torches as accents. Characters use MBStyle.toon (sRGB-true colours);
// the place uses the same toon ramp but paler, darker colours (ENV_K) so heroes, monsters and glows stand out against it.
const EXPOSURE=1.0,FLOOR_GAIN=.6,SUN_K=1.65,HEMI_K=1.25,PT_K=.5,ENV_K=.52;
// overlay text: one family constant (the page may bundle a font later)
const FONT='"Rajdhani","Oswald","Barlow Condensed","Roboto Condensed","Arial Narrow","sans-serif-condensed","Helvetica Neue",Arial,sans-serif';
// graphics quality: MB.settings.gfx 'low' = no shadow maps, pixel ratio 1, no bump maps, two point lights, few particles, blob shadows
const Q={low:false,ultra:false,tier:'high'};
const isLow=()=>!!(MB.settings&&MB.settings.gfx==='low');
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.LinearToneMapping;renderer.toneMappingExposure=EXPOSURE;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
const anisoCap=renderer.capabilities.getMaxAnisotropy()||1,maxTex=renderer.capabilities.maxTextureSize||4096;
let maxAniso=Math.min(4,anisoCap); // ultra: the most the card offers
const maxRB=(()=>{try{const gl=renderer.getContext();return Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)||4096,maxTex)}catch(e){return 4096}})();

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
function floorTexture(theme,hue,area,low,bi){
  bi=bi|0;const far=area==='far',TW=low?1024:Q.ultra?Math.min(4096,maxTex):2048,TH=TW/2,c=mkCanvas(TW,TH),g=c.getContext('2d'),rnd=rng(11+hue+bi*53);
  g.scale(TW/W,TH/H);
  const crypt=theme==='crypt',court=area==='court';
  // base colour [h,s,l], slab colour fn, share of ground that is paved
  const A={crypt:[[hue,14,5],1],pass:[[hue,20,13],.74],ash:[[20,14,8],.46],fen:[[140,24,10],.5],peaks:[[215,18,17],.6],court:[[285,25,5],1],dark:[[340,34,4],.84],
    far:[[hue,16+bi%3*7,5+(bi*5)%8],[.62,.88,1,.74][bi%4]]}[area]||[[hue,20,13],.74];
  const eh=A[0][0];
  g.fillStyle=hsl(A[0][0],A[0][1],A[0][2]);g.fillRect(0,0,W,H);
  if(!crypt&&!court){ // bare earth showing between the slabs
    for(let i=0;i<520;i++){const x=rnd()*W,y=rnd()*H,r=8+rnd()*34,l=rnd();g.fillStyle=l<.5?hsl(eh+rnd()*30-15,22,A[0][2]+4+rnd()*7,.25):'rgba(0,0,0,.14)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
    for(let i=0;i<1500;i++){g.fillStyle=hsl(eh+rnd()*40-20,28,A[0][2]+9+rnd()*14,.55);g.fillRect(rnd()*W,rnd()*H,1+rnd()*1.6,2+rnd()*3.5)}
  }
  const slabCol=v=>crypt?hsl(232+v*16-8,9+v*5,21+v*9):area==='ash'?hsl(24,3+v*4,17+v*9):area==='fen'?hsl(135+v*30,9+v*9,20+v*9):area==='peaks'?hsl(215,8+v*6,27+v*10):area==='dark'?hsl(340,9+v*9,13+v*7):far?hsl(hue+v*24-12,7+v*9+bi%2*5,15+(bi*3)%4*3+v*9):hsl(v<.5?hue:35,2+v*5,24+v*10);
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
  }else if(far){
    // a band past floor 50: one of four markings, drawn in the band's second colour
    const ah=(hue+140+bi*47)%360,pat=bi%4;
    if(pat===0){ // veins of light running through the stone
      for(let i=0;i<14;i++){let x=rnd()*W,y=rnd()*H,a=rnd()*TAU;g.beginPath();g.moveTo(x,y);for(let s=0;s<8;s++){a+=rnd()*1.1-.55;x+=Math.cos(a)*(16+rnd()*24);y+=Math.sin(a)*(16+rnd()*24);g.lineTo(x,y)}
        g.strokeStyle=hsl(ah,90,55,.08);g.lineWidth=7;g.stroke();g.strokeStyle=hsl(ah,80,62,.45);g.lineWidth=.9;g.stroke()}
    }else if(pat===1){ // great rings cut into the floor, one inside the next
      g.save();g.translate(W/2,H/2);for(let i=0;i<6;i++){const r=70+i*74;g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=i%2?2:4;g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.strokeStyle=hsl(ah,60,60,.16);g.lineWidth=1.2;g.setLineDash([18+i*4,10]);g.beginPath();g.arc(0,0,r+4,0,TAU);g.stroke();g.setLineDash([])}
      for(let i=0;i<16;i++){const a=i/16*TAU;g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.6;g.beginPath();g.moveTo(Math.cos(a)*70,Math.sin(a)*70);g.lineTo(Math.cos(a)*440,Math.sin(a)*440);g.stroke()}g.restore();
    }else if(pat===2){ // long slanted bands, as if the floor were laid in strips
      for(let i=-6;i<16;i++){const x=i*86+rnd()*20;g.beginPath();g.moveTo(x,0);g.lineTo(x+44,0);g.lineTo(x+44+H*.5,H);g.lineTo(x+H*.5,H);g.closePath();g.fillStyle=i%2?'rgba(0,0,0,.2)':hsl(ah,40,50,.06);g.fill()}
      for(let i=0;i<40;i++)blob(rnd()*W,rnd()*H,10+rnd()*24,hsl(ah,70,50,.12));
    }else{ // a scatter of small cold lights set in the slabs
      for(let i=0;i<90;i++){const x=rnd()*W,y=rnd()*H;blob(x,y,7+rnd()*10,hsl(ah,90,55,.16));g.fillStyle=hsl(ah,80,78,.85);g.save();g.translate(x,y);g.rotate(Math.PI/4);g.fillRect(-1.3,-1.3,2.6,2.6);g.restore()}
      for(let i=0;i<10;i++)blob(rnd()*W,rnd()*H,50+rnd()*70,'rgba(0,0,0,.4)');
    }
    for(let i=0;i<8;i++)blob(rnd()*W,rnd()*H,60+rnd()*80,hsl(hue,50,40,.07));
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
  const k=Q.ultra?2:1,c=mkCanvas(256*k,256*k),g=c.getContext('2d'),rnd=rng(5+hue);g.scale(k,k);
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
let OUT_X=620; // how far to each side the scattered surroundings reach (further when the view is very wide)
function outside(rnd,pad,south){let x,z;do{x=-OUT_X+rnd()*(W+2*OUT_X);z=-560+rnd()*(H+(south?700:520))}while(x>-pad&&x<W+pad&&z>-pad&&z<H+pad);_pt.x=x;_pt.z=z;return _pt}
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
function buildEnv(key,low,wide){
  OUT_X=wide?1500:620;
  const crypt=key==='crypt',km=crypt?null:/^h(-?[\d.]+)(?:b(\d+))?$/.exec(key),hue=crypt?208:km?+km[1]||0:+key.slice(1)||0,far=!!(km&&km[2]!==undefined),bi=far?+km[2]:0,area=crypt?'crypt':far?'far':AREA_BY_HUE[hue]||'pass';
  let lightHue=hue;
  const root=new THREE.Group(),E={key,low,tier:Q.tier,wide:!!wide,crypt,area,hue,root,flames:[],lit:[],ticks:[],crystals:[],glowOnly:[],rune:null,runeM:null,fire:crypt,
    sun:new THREE.Color(0xe6e9f2),sunI:.66,hemiI:.36,lightI:1.6,lightD:400,fogFar:1300,mote:[1,.9,.68],moteMode:'drift',moteN:low?0:40};
  const rnd=rng(77+hue+bi*131),dk=(low?.5:Q.ultra?1.4:1)*(wide?1.6:1),dn=n=>Math.ceil(n*dk);
  const ftex=floorTexture(crypt?'crypt':'out',hue,area,low,bi);
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
    const T=wide?1900:260,hN=92,hS=14;
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
  }else if(far){
    // a band past floor 50, put together from the band's index and its two colours: what the arena stands on, what rings it, what looms
    // beyond the wall and what hangs in the air all turn over at different rates, so no two bands in a long climb repeat
    const ah=lightHue=(hue+140+bi*47)%360,gm=bi%3,pa=(bi>>1)%4,pb=(bi+(bi>>2))%3,H1=hue/360;
    scene.background.setHSL(H1,.5,.016+(bi%4)*.007);
    E.sun.copy(hslColor(hue,.5,.86));E.sunI=.56+(bi%3)*.05;E.hemiI=.28+(bi%2)*.05;E.lightI=2.4+(bi%3)*.5;E.lightD=470;E.fogFar=[1500,2300,1000,1900][bi%4];
    {const mc=hslColor(ah,.8,.7);E.mote=[mc.r,mc.g,mc.b];E.moteMode=['drift','rise','fall'][(bi+1)%3];E.moteN=low?10:36+(bi%3)*10}
    const rockM=std(hslColor(hue,.14,.11),{flatShading:true,roughness:.95}),hotM=basic(hslColor(ah,.9,.6)),glowAh=hslColor(ah,.9,.55).getHex();
    if(gm===0){ // a raft of stone over nothing
      const under=slab(-18,W+18,-70,-.3,-18,H+18,rockM);under.castShadow=false;root.add(under);
      const nJ=dn(36),jag=inst(new THREE.ConeGeometry(1,1,5).translate(0,.5,0),rockM,nJ,true);
      for(let i=0;i<nJ;i++){const s=i<nJ*.6,x=s?rnd()*W:(rnd()<.5?-10:W+10),z=s?H+6+rnd()*10:rnd()*H,w=14+rnd()*22;put(jag,i,x,-64,z,w,40+rnd()*110,w,Math.PI,rnd()*3,0)}root.add(jag);
    }else if(gm===1){ // solid ground running out into the dark
      ground(hslColor(hue,.22,.045));rocks(dn(50),hslColor(hue,.1,.15));
    }else{ // a shelf in a still, faintly lit sea
      const sea=noLine(new THREE.Mesh(new THREE.PlaneGeometry(7000,7000).rotateX(-Math.PI/2),std(hslColor(ah,.55,.07),{rim:false,k:.9,emissive:hslColor(ah,.8,.025)})));sea.position.set(W/2,-5,H/2);sea.receiveShadow=true;root.add(sea);
      const bank=slab(-26,W+26,-10,-.25,-26,H+26,rockM);bank.castShadow=false;root.add(bank);
      const nG=dn(16),gl=flatGlowMat(glowAh,.16),gq=inst(G.quad,gl,nG,true);for(let i=0;i<nG;i++){const p=outside(rnd,60,true),s=120+rnd()*240;put(gq,i,p.x,-4.6,p.z,s,1,s*.5)}root.add(gq);
      E.ticks.push(t=>{gl.opacity=.12+.06*Math.sin(t*.8)});
    }
    {const wc=hslColor(hue,.18,.5+(bi%3)*.1).getHex(),gap=[.25,.6,.42,.7][(bi+1)%4],tall=bi%2?[18,52]:[10,30];blockWall(wc,gap,tall,[tall[0]-2,tall[1]-8],[5,10])}
    const out=(pad)=>{const p=outside(rnd,pad,false);if(gm===0&&p.z>H)p.z=-60-rnd()*400;return p},y0=gm===0?-60:gm===2?-5:0;
    if(pa===0){ // a forest of leaning spires
      const n=dn(60),im=inst(new THREE.CylinderGeometry(.06,1,1,5).translate(0,.5,0),rockM,n);
      for(let i=0;i<n;i++){const p=out(70),h=90+rnd()*190,w=7+rnd()*11;put(im,i,p.x,y0,p.z,w,h,w,(rnd()-.5)*.4,rnd()*3,(rnd()-.5)*.4)}root.add(im);
    }else if(pa===1){ // a colonnade that fell: drums standing and lying
      const n=dn(34),cm=std(hslColor(hue,.1,.3),{flatShading:true}),im=inst(new THREE.CylinderGeometry(1,1,1,9).translate(0,.5,0),cm,n),caps=inst(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),cm,n);
      for(let i=0;i<n;i++){const p=out(60),lying=rnd()<.3,h=lying?50+rnd()*50:60+rnd()*130,w=11+rnd()*6;
        put(im,i,p.x,y0+(lying?w:0),p.z,w,h,w,lying?Math.PI/2:(rnd()-.5)*.12,rnd()*3,0);put(caps,i,p.x,lying?-200:y0+h,p.z,w*2.5,7,w*2.5,0,rnd()*3,0)}root.add(im,caps);
    }else if(pa===2){ // the ribs of something vast, arching in from every side but the south
      const boneM=std(0xcfc6b2,{flatShading:true}),ribG=new THREE.TorusGeometry(1,.05,6,14,Math.PI*.55),n=low?10:16,ribs=inst(ribG,boneM,n);let k=0;
      for(let i=0;i<7&&k<n;i++){const x=60+i*140+(rnd()-.5)*30,R0=120+rnd()*50;put(ribs,k++,x,y0-4,-40+R0,R0,R0*1.15,R0*1.5,0,Math.PI/2+(rnd()-.5)*.14,0)}
      for(let i=0;k<n;i++){const e=i%2,z=90+(i>>1)*110+(rnd()-.5)*24,R0=90+rnd()*36;put(ribs,k++,e?W+50-R0:R0-50,y0-4,z,R0,R0*1.1,R0*1.5,0,e?0:Math.PI,0)}root.add(ribs);
    }else{ // standing slabs, tall and thin, each a little out of true
      const n=dn(30),im=inst(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),rockM,n),seam=inst(G.box,hotM,n,true);
      for(let i=0;i<n;i++){const p=out(80),h=110+rnd()*210,w=26+rnd()*30,ry=rnd()*3,rx=(rnd()-.5)*.16;put(im,i,p.x,y0,p.z,w,h,9+rnd()*8,rx,ry,(rnd()-.5)*.16);put(seam,i,p.x,y0+h*.55,p.z,1.6,h*.5,12+rnd()*8,rx,ry,0)}root.add(im,seam);
    }
    if(pb===0){ // splinters of the world adrift around the floor
      const shardM=std(hslColor(hue,.25,.12),{emissive:hslColor(ah,.9,.07),flatShading:true,k:.8}),oct=new THREE.OctahedronGeometry(1,0),sets=[];
      for(let q=0;q<3;q++){const n=dn(18),im=inst(oct,shardM,n,true),hot=inst(oct,hotM,dn(7),true),grp=new THREE.Group();
        for(let i=0;i<n;i++){const p=outside(rnd,70,true),s=8+rnd()*rnd()*44,south=p.z>H-40;put(im,i,p.x,south?-150+rnd()*110:-60+rnd()*290,p.z,s*.55,s*1.7,s*.55,rnd()*3,rnd()*3,rnd()*3)}
        for(let i=0;i<hot.count;i++){const p=outside(rnd,50,true),s=2+rnd()*4,south=p.z>H-40;put(hot,i,p.x,south?-120+rnd()*90:-30+rnd()*240,p.z,s*.5,s*1.8,s*.5,rnd()*3,rnd()*3,rnd()*3)}
        grp.add(im,hot);root.add(grp);sets.push(grp)}
      E.ticks.push(t=>{for(let i=0;i<3;i++){sets[i].position.y=Math.sin(t*.35+i*2.1)*16;sets[i].position.x=Math.sin(t*.11+i*1.3)*12}});
    }else if(pb===1){ // clusters of crystal growing out of the ground, lit from inside
      const n=dn(22),per=4,im=inst(new THREE.ConeGeometry(1,1,5).translate(0,.5,0),hotM,n*per,true),pool=flatGlowMat(glowAh,.3),pq=inst(G.quad,pool,n,true);
      for(let i=0;i<n;i++){const p=out(30);for(let j=0;j<per;j++){const h=14+rnd()*40,w=3+rnd()*5;put(im,i*per+j,p.x+(rnd()-.5)*22,y0,p.z+(rnd()-.5)*22,w,h,w,(rnd()-.5)*.7,rnd()*3,(rnd()-.5)*.7)}put(pq,i,p.x,y0+.5,p.z,150,1,110)}
      root.add(im,pq);
    }else{ // lamps on thin iron stalks, swaying
      const n=dn(26),pole=inst(new THREE.CylinderGeometry(.5,1,1,4).translate(0,.5,0),std(0x1c1a22,{flatShading:true}),n),bulbs=inst(G.sphere,hotM,n,true),pts=[];
      for(let i=0;i<n;i++){const p=out(26),h=46+rnd()*90;put(pole,i,p.x,y0,p.z,1.6,h,1.6);put(bulbs,i,p.x,y0+h+4,p.z,4.2,5.4,4.2);pts.push(p.x,y0+h+4,p.z)}
      root.add(pole,bulbs);
      if(!low){const hz=flatGlowMat(glowAh,.22),hq=inst(G.quad,hz,n,true);for(let i=0;i<n;i++)put(hq,i,pts[i*3],y0+.6,pts[i*3+2],120,1,90);root.add(hq)}
    }
    E.ticks.push(t=>{const k=.5+.2*Math.sin(t*1.3);hotM.color.setHSL(ah/360,.92,k)});
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
  const flameCol=FL?FL[0]:hslColor(lightHue,.85,.6).getHex(),coreCol=FL?FL[1]:hslColor(lightHue,.7,.82).getHex();
  E.lightColor=FL?new THREE.Color(FL[2]):hslColor(lightHue,far?.45:.3,.72);
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
  if(Q.ultra)E.moteN=Math.min(MOTES,Math.round(E.moteN*1.6));
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
let env=null,envLevel=-1,envBand=null;
// Which band of the tower a floor past 50 lies in, when that band is one of the invented ones (it starts past floor 50 and is not the Endless Dark
// itself): {idx, hue}, else null and the place is drawn by its hue as it always was. Read from MB.tower.bands (S.L.band names or numbers the band),
// or from a bare numeric S.L.band; R.testBand = {idx, hue} forces one.
const _band={idx:0,hue:0};
function bandOf(n){
  const tb=R.testBand;if(tb&&typeof tb==='object'){_band.idx=Math.max(0,tb.idx|0);_band.hue=Math.round(num(tb.hue,200));return _band}
  let L=null,tw=null;try{L=MB.S.L;tw=MB.tower}catch(e){}
  const lb=L?L.band:undefined,bands=tw&&Array.isArray(tw.bands)?tw.bands:null;
  if(bands){
    const fl=n+1,nm=typeof lb==='string'?lb:lb&&typeof lb==='object'&&typeof lb.name==='string'?lb.name:null;let hit=-1;
    for(let i=0;i<bands.length;i++){const b=bands[i];if(b&&fl>=b.from&&fl<=b.to){hit=i;break}}
    if(hit<0&&typeof lb==='number'&&bands[lb])hit=lb;
    if(hit<0&&nm)for(let i=0;i<bands.length;i++)if(bands[i]&&bands[i].name===nm){hit=i;break}
    if(hit<0)return null;
    const b=bands[hit],hue=Math.round(num(b.hue,num(L&&L.hue,200)));
    if(!(b.from>50)||(hue===340&&/endless dark/i.test(b.name||'')))return null;
    _band.idx=hit;_band.hue=hue;return _band;
  }
  if(typeof lb==='number'&&lb>=5&&lb===Math.floor(lb)){_band.idx=lb;_band.hue=Math.round(num(L&&L.hue,MB.levelDef(n).hue));return _band}
  return null;
}
function syncEnv(){
  const n=MB.S.level,low=isLow(),tb=R.testBand||null,wide=camera.aspect>2.05;if(env&&n===envLevel&&env.tier===Q.tier&&env.wide===wide&&tb===envBand)return;envLevel=n;envBand=tb;
  let key=n<8?'crypt':'h'+MB.levelDef(n).hue;
  if(n>=50||R.testBand){const b=bandOf(n);if(b)key='h'+b.hue+'b'+b.idx}
  if(env&&env.key===key&&env.tier===Q.tier&&env.wide===wide)return;
  if(env)disposeEnv(env);
  env=buildEnv(key,low,wide);
}

/* ---------- pools for the short-lived things ---------- */
const blobMat=new THREE.MeshBasicMaterial({map:glowTex,color:0x000000,transparent:true,opacity:.85,depthWrite:false,fog:false});
const pbeamCore=new THREE.MeshBasicMaterial({color:0xeaf6ff,toneMapped:false,fog:false}),
  pbeamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:0x3f9cff,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  pbeamLine=new THREE.MeshBasicMaterial({color:0x8fd3ff,transparent:true,opacity:.6,depthWrite:false,toneMapped:false,fog:false});
const beamCore=new THREE.MeshBasicMaterial({color:0xfff2c8,toneMapped:false,fog:false}),
  beamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:0xffa02a,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  beamLine=new THREE.MeshBasicMaterial({color:0xff4a3a,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,fog:false});
const obeamCore=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false}),
  obeamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:PAL.power2,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  obeamEdge=new THREE.MeshBasicMaterial({map:glowTex,color:PAL.gold,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false});
const fieldTex={};
// foe = true (versus): the same marking in the foe palette, for a field an opponent laid
function fieldTexture(kind,foe){
  const key=foe?kind+'!':kind;
  if(fieldTex[key])return fieldTex[key];
  const c=mkCanvas(256,256),g=c.getContext('2d'),rnd=rng(kind.length*97+3),col=foe?(kind==='halo'?'255,120,70':kind==='rain'?'255,150,130':'255,52,84'):kind==='frost'?'143,211,255':kind==='halo'?'255,214,110':kind==='rain'?'231,223,205':kind==='domain'?'150,96,255':kind==='ice'?'178,228,255':kind==='rot'?'176,196,40':kind==='fire'?'255,112,36':'200,190,220',rgba=a=>'rgba('+col+','+a+')';
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
  }else if(kind==='domain'){
    // the tally ground: tally strokes in fives round the rim, a jagged inner edge
    g.strokeStyle=rgba(.85);g.lineWidth=2.4;
    for(let i=0;i<12;i++){g.save();g.rotate(i*TAU/12);for(let j=0;j<4;j++){g.beginPath();g.moveTo(-9+j*6,96);g.lineTo(-9+j*6,112);g.stroke()}g.beginPath();g.moveTo(-13,110);g.lineTo(13,98);g.stroke();g.restore()}
    g.fillStyle=rgba(.5);for(let i=0;i<18;i++){g.save();g.rotate(i*TAU/18+.1);const l=60+rnd()*26;g.beginPath();g.moveTo(-4,90);g.lineTo(0,l);g.lineTo(4,90);g.closePath();g.fill();g.restore()}
  }else if(kind==='ice'){
    // frozen ground: a sheet of ice broken into plates, a few six-armed crystals in it
    g.fillStyle=rgba(.16);g.beginPath();g.arc(0,0,118,0,TAU);g.fill();
    g.strokeStyle=rgba(.85);g.lineWidth=2.2;g.lineJoin='round';
    for(let i=0;i<9;i++){let a=i*TAU/9+rnd()*.4,x=Math.cos(a)*118,y=Math.sin(a)*118;g.beginPath();g.moveTo(x,y);for(let j=0;j<4;j++){a+=Math.PI+(rnd()-.5)*1.5;const l=22+rnd()*26;x+=Math.cos(a)*l*(j?.6:1);y+=Math.sin(a)*l*(j?.6:1);if(x*x+y*y>112*112)break;g.lineTo(x,y);a-=Math.PI}g.stroke()}
    for(const[x,y,s2]of[[-34,-22,26],[40,30,20],[8,-62,16],[-52,48,15]]){g.save();g.translate(x,y);g.rotate(rnd()*2);g.strokeStyle=rgba(.95);g.lineWidth=2.6;
      for(let i=0;i<6;i++){g.rotate(TAU/6);g.beginPath();g.moveTo(0,0);g.lineTo(0,s2);g.moveTo(-s2*.26,s2*.82);g.lineTo(0,s2*.56);g.lineTo(s2*.26,s2*.82);g.stroke()}g.restore()}
    g.fillStyle=rgba(.9);for(let i=0;i<18;i++){g.save();g.rotate(i*TAU/18+rnd()*.2);const l=8+rnd()*13;g.beginPath();g.moveTo(-5,121);g.lineTo(0,121-l);g.lineTo(5,121);g.closePath();g.fill();g.restore()}
  }else if(kind==='rot'){
    // a cloud of sickness: blotches, bubbles and spores, a ragged dashed edge
    for(let i=0;i<16;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*92,r2=14+rnd()*24;const gr2=g.createRadialGradient(Math.cos(a)*d,Math.sin(a)*d,0,Math.cos(a)*d,Math.sin(a)*d,r2);gr2.addColorStop(0,rgba(.3));gr2.addColorStop(1,rgba(0));g.fillStyle=gr2;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,r2,0,TAU);g.fill()}
    g.strokeStyle=rgba(.85);g.lineWidth=2.2;for(let i=0;i<9;i++){const a=rnd()*TAU,d=20+rnd()*84;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,3+rnd()*6,0,TAU);g.stroke()}
    g.fillStyle=rgba(.95);for(let i=0;i<34;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*108;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,1+rnd()*1.8,0,TAU);g.fill()}
    g.strokeStyle=rgba(.7);g.lineWidth=5;g.setLineDash([3,13,9,7]);g.beginPath();g.arc(0,0,113,0,TAU);g.stroke();g.setLineDash([]);
  }else if(kind==='fire'){
    // burning ground: tongues of flame licking inward from the rim, a bed of embers, a hot heart
    const hot=foe?'255,176,160':'255,214,130',gr2=g.createRadialGradient(0,0,0,0,0,112);gr2.addColorStop(0,'rgba('+hot+',.34)');gr2.addColorStop(.5,rgba(.26));gr2.addColorStop(1,rgba(.1));g.fillStyle=gr2;g.beginPath();g.arc(0,0,118,0,TAU);g.fill();
    g.fillStyle=rgba(.75);for(let i=0;i<20;i++){g.save();g.rotate(i*TAU/20+rnd()*.14);const l=60+rnd()*42,w=7+rnd()*5;g.beginPath();g.moveTo(-w,121);g.quadraticCurveTo(-w*.2,121-(121-l)*.5,rnd()*8-4,l);g.quadraticCurveTo(w*.6,121-(121-l)*.4,w,121);g.closePath();g.fill();g.restore()}
    g.fillStyle='rgba('+hot+',.95)';for(let i=0;i<30;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*100,s2=1.5+rnd()*2.6;g.beginPath();g.arc(Math.cos(a)*d,Math.sin(a)*d,s2,0,TAU);g.fill()}
    g.strokeStyle='rgba('+hot+',.7)';g.lineWidth=2;for(let i=0;i<7;i++){let a=rnd()*TAU,x=Math.cos(a)*14,y=Math.sin(a)*14;g.beginPath();g.moveTo(x,y);for(let j=0;j<3;j++){a+=(rnd()-.5)*1.4;x+=Math.cos(a)*20;y+=Math.sin(a)*20;g.lineTo(x,y)}g.stroke()}
  }else if(kind==='rain'){
    g.strokeStyle=rgba(.45);g.lineWidth=1.5;g.setLineDash([7,7]);g.beginPath();g.arc(0,0,84,0,TAU);g.stroke();g.beginPath();g.arc(0,0,44,0,TAU);g.stroke();g.setLineDash([]);
    for(let i=0;i<22;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*104,x=Math.cos(a)*d,y=Math.sin(a)*d;g.save();g.translate(x,y);g.rotate(-.5+rnd()*.3);
      g.strokeStyle=rgba(.95);g.lineWidth=2.4;g.beginPath();g.moveTo(0,0);g.lineTo(0,-22);g.stroke();g.beginPath();g.moveTo(-5,-6);g.lineTo(0,0);g.lineTo(5,-6);g.stroke();
      g.lineWidth=1.4;g.beginPath();g.moveTo(-4,-25);g.lineTo(0,-19);g.lineTo(4,-25);g.moveTo(-4,-21);g.lineTo(0,-15);g.lineTo(4,-21);g.stroke();g.restore()}
  }
  if(foe){ // a hooked thorn at each quarter of the rim: an opponent's ground, whatever its kind
    g.fillStyle=rgba(.95);for(let i=0;i<8;i++){g.save();g.rotate(i*TAU/8+.2);g.beginPath();g.moveTo(-9,121);g.lineTo(0,98);g.lineTo(9,121);g.closePath();g.fill();g.restore()}
    g.strokeStyle=rgba(.6);g.lineWidth=2;g.setLineDash([10,8]);g.beginPath();g.arc(0,0,112,0,TAU);g.stroke();g.setLineDash([])}
  return fieldTex[key]=canvasTex(c,false);
}
const fx=new THREE.Group();scene.add(fx);
class Pool{constructor(make){this.make=make;this.items=[];this.n=0}
  begin(){this.n=0}
  get(){let o=this.items[this.n];if(!o){o=this.make();fx.add(o);this.items.push(o)}this.n++;o.visible=true;return o}
  end(){for(let i=this.n;i<this.items.length;i++)this.items[i].visible=false}}
const fbeamCore=new THREE.MeshBasicMaterial({color:0xff9a8c,toneMapped:false,fog:false}),
  fbeamGlow=new THREE.MeshBasicMaterial({map:glowTex,color:PAL.foe,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
  fbeamEdge=new THREE.MeshBasicMaterial({map:glowTex,color:0xff6a1e,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false});
const mCore={e:basic(0xffe6dc),hot:basic(0xfff0d0),bolt:basic(0xf2ecff),orb:basic(0xfff6cf),bone:basic(0xcfc7b4),dark:basic(0x15121b),steel:basic(0xd5dce2),
  morsel:ST.toon(0xe0244a,{emissive:0x7a0a1c,steps:2}),pink:basic(0xffb3bf)};
function trailOf(hex,len,w,op){const m=new THREE.Mesh(G.quad,flatGlowMat(hex,op));m.scale.set(len,1,w);m.position.x=-len*.42;m.renderOrder=5;return m}
function orbMaker(coreMat,glowHex,glowK){return()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.sphere,coreMat),halo=new THREE.Sprite(glowMat(glowHex,1)),hot=new THREE.Sprite(glowMat(0xffffff,.7)),pool=new THREE.Mesh(G.quad,flatGlowMat(glowHex,.5)),trail=trailOf(glowHex,glowK*2.3,glowK*.6,.75);
  halo.scale.setScalar(glowK*1.25);hot.scale.setScalar(glowK*.45);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(glowK*1.9);g.add(core,halo,hot,pool,trail);g.userData.core=core;g.userData.trail=trail;return g}}
function skullMaker(hex,eyeMat){return()=>{const g=new THREE.Group(),h=new THREE.Mesh(G.sphere,mCore.bone),jaw=new THREE.Mesh(G.box,mCore.bone),halo=new THREE.Sprite(glowMat(hex,.85)),pool=new THREE.Mesh(G.quad,flatGlowMat(hex,.38));
    jaw.scale.set(1.1,.6,.9);jaw.position.set(0,-.75,.35);g.add(h,jaw);
    for(const s of[-1,1]){const e=new THREE.Mesh(G.sphere,eyeMat);e.scale.setScalar(.27);e.position.set(s*.38,.12,.82);g.add(e)}
    const sc=new THREE.Group(),trail=trailOf(hex,9,2.6,.7);sc.add(g);halo.scale.setScalar(5.2);pool.position.y=-SHOT_Y+.5;pool.scale.setScalar(7);sc.add(halo,pool,trail);sc.userData.core=g;sc.userData.trail=trail;return sc}}
function arrowMaker(shaftMat,tipMat,hex,op){return()=>{const g=new THREE.Group(),s=new THREE.Mesh(G.shaft,shaftMat),t=new THREE.Mesh(G.tip,tipMat),halo=new THREE.Sprite(glowMat(hex,op)),trail=new THREE.Mesh(G.quad,flatGlowMat(hex,op+.1));halo.scale.setScalar(18);trail.scale.set(5,1,46);trail.position.z=-24;trail.renderOrder=5;s.castShadow=true;g.add(s,t,halo,trail);g.userData.trail=trail;return g}}
const pools={
  shot:new Pool(orbMaker(mCore.e,PAL.foe,6.4)),
  bolt:new Pool(orbMaker(mCore.bolt,PAL.power,7)),
  orb:new Pool(orbMaker(mCore.orb,0xffc64a,7)),
  skull:new Pool(skullMaker(0x58e04a,mCore.dark)),
  arrow:new Pool(arrowMaker(mCore.bone,mCore.steel,PAL.power2,.5)),
  // versus: the same four bodies as an opponent throws them, in the foe palette (nothing is built until one flies)
  fbolt:new Pool(orbMaker(mCore.e,PAL.foe,7.4)),
  forb:new Pool(orbMaker(mCore.hot,0xff5a1e,7.8)),
  fskull:new Pool(skullMaker(PAL.foe,mCore.e)),
  farrow:new Pool(arrowMaker(mCore.dark,mCore.e,PAL.foe,.75)),
  fobeam:new Pool(()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.box,fbeamCore),glow=new THREE.Mesh(G.quad,fbeamGlow),edge=new THREE.Mesh(G.quad,fbeamEdge);
    glow.position.y=-SHOT_Y+.8;glow.renderOrder=3;edge.position.y=-SHOT_Y+1;edge.renderOrder=3;core.renderOrder=5;g.add(core,glow,edge);g.userData={core,glow,edge};return g}),
  // versus: the ring and the pool of colour under the local hero, and the pool of colour under every other fighter (each has its own material)
  vmark:new Pool(()=>{const m=noLine(new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:idTexH,transparent:true,opacity:.92,depthWrite:false,toneMapped:false,fog:false})));m.position.y=1;m.renderOrder=2;return m}),
  vglow:new Pool(()=>{const m=noLine(new THREE.Mesh(G.quad,flatGlowMat(0xffffff,.3)));m.position.y=.58;m.renderOrder=1;return m}),
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
  // the floor going dark under a dominion field, and the beam an order hero sweeps
  dark:new Pool(()=>{const m=new THREE.Mesh(G.disc,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.5,depthWrite:false,fog:false}));m.position.y=.4;m.renderOrder=1;return m}),
  obeam:new Pool(()=>{const g=new THREE.Group(),core=new THREE.Mesh(G.box,obeamCore),glow=new THREE.Mesh(G.quad,obeamGlow),edge=new THREE.Mesh(G.quad,obeamEdge);
    glow.position.y=-SHOT_Y+.8;glow.renderOrder=3;edge.position.y=-SHOT_Y+1;edge.renderOrder=3;core.renderOrder=5;g.add(core,glow,edge);g.userData={core,glow,edge};return g}),
  ward:new Pool(()=>{const m=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:PAL.holy,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=1.25;m.renderOrder=4;return m}),
  ring:new Pool(()=>{const m=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=1.1;m.renderOrder=4;return m}),
};

/* ---------- particles: one Points object, soft round dots sized in world units ---------- */
const PMAX=480,PMAX_LOW=140,MOTES=104;
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
    let near=true;if(!sight&&P){const dx=o.x-P.x,dy=o.y-P.y,lim=fogR+u.r+8;near=dx*dx+dy*dy<lim*lim}
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
  const u=g.userData,P=m.tgt&&typeof m.tgt.x==='number'?m.tgt:MB.P,a=(m.st==='charge'||m.st==='lunge')?m.ang:(P?Math.atan2(P.y-m.y,P.x-m.x):0);
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
// a trophy the model file cannot draw (or an ally of a kind nobody knows): a plain friendly light, never a monster body
PH.wisp=basic(PAL.power2,{transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
PH.wispHalo=glowMat(PAL.power,.7);
function phTrophy(a){
  const g=new THREE.Group(),c=noLine(new THREE.Mesh(G.sphere,PH.wisp)),h=new THREE.Sprite(PH.wispHalo),gold=a&&a.kind==='guardian';
  c.scale.setScalar(gold?9:5);h.scale.setScalar(gold?70:40);c.position.y=h.position.y=gold?40:34;g.add(c,h);g.userData={c,h,y:c.position.y};return g;
}
function phTrophyUpdate(g,a){const u=g.userData,y=u.y+Math.sin(MB.S.t*2.3+(a.seed||0))*2.5;u.c.position.y=u.h.position.y=y}

const warned={};
function warnOnce(k,e){if(warned[k])return;warned[k]=1;console.warn('Marrowborn renderer: '+k+' model failed, using placeholder.',e&&e.message||e)}
function modelOf(name){const M=window.MBModels&&window.MBModels[name];return M&&typeof M.create==='function'&&typeof M.update==='function'?M:null}
const ents=new THREE.Group();scene.add(ents);
// V: the MB-like object a model reads its owner from. Nothing (the local path) = the game itself; another member's hero and allies pass that member's view.
function makeEnt(name,e,phMake,V){
  const M=!warned[name]&&modelOf(name),B=V||MB;
  if(M){try{const g=name==='player'?M.create(B):M.create(e,B);if(g&&g.isObject3D){ents.add(g);return{g,real:true,V:V||null}}throw new Error('create() returned no Object3D')}catch(err){warnOnce(name,err)}}
  const g=phMake(e);ents.add(g);return{g,real:false,V:V||null};
}
function updateEnt(rec,name,e,dt,phMake,phUpdate){
  if(rec.real){
    try{const B=rec.V||MB;if(name==='player')window.MBModels.player.update(rec.g,e,B,dt);else window.MBModels[name].update(rec.g,e,B,dt);return}
    catch(err){warnOnce(name,err);const pos=rec.g.position.clone();ents.remove(rec.g);rec.g=phMake(e);rec.g.position.copy(pos);rec.real=false;ents.add(rec.g)}
  }
  phUpdate(rec.g,e,dt);
}
let playerRec=null,stamp=0;
const monMap=new Map(),allyMap=new Map();
// Allies that carry a monster spec (bound or tamed pets and whatever they raise) are drawn with the monster bodies; the model reads pet/owner and builds the friendly variant.
const isPet=e=>!!(e&&(e.pet||e.shade||e.kind==='shade'||e.owner==='necro'||e.owner==='beast')&&(e.s||e.ai));
// Trophies that stand in the arena (a mage's familiar, a healer's guardian) have their own friendly models. An ally of a kind this file has
// never heard of is drawn the same way (as a plain wisp), so nothing friendly can ever come out looking like a hostile monster or throw.
const isTrophy=e=>!!(e&&(e.kind==='familiar'||e.kind==='guardian'||(e.trophy&&e.kind!=='pet'&&e.kind!=='shade')));
const allyModel=e=>isTrophy(e)?'trophy':isPet(e)?'monster':e.kind==='thrall'||e.kind==='wolf'||(typeof e.kind==='string'&&APX_ALLY[e.kind]===1)?'ally':'trophy';
const dying=[]; // pets that left the list in the middle of a fight: they fade out where they stood
let dyingLevel=-1;
function dropEnt(rec){ents.remove(rec.g);
  if(rec.tro&&rec.real){const M=modelOf('trophy');if(M&&typeof M.dispose==='function')try{M.dispose(rec.g)}catch(e){}}
  if(rec.pet&&rec.real){const M=modelOf('monster');if(M&&typeof M.dispose==='function')try{M.dispose(rec.g)}catch(e){}}}
function syncMap(map,list,name,dt,phMake,phUpdate,sight,V){
  const P=MB.P;
  for(let i=0;i<list.length;i++){
    const e=list[i];if(!e)continue;let rec=map.get(e);
    if(!rec){const k=name==='ally'?allyModel(e):name,pet=name==='ally'&&k==='monster',tro=k==='trophy';
      rec=tro?makeEnt('trophy',e,phTrophy,V):pet?makeEnt('monster',e,phMonster,V):makeEnt(name,e,phMake,V);rec.pet=pet;rec.tro=tro;rec.e=e;map.set(e,rec);
      if(k==='ally'&&e.apexAlly===true&&typeof e.kind==='string'&&APX_ALLY[e.kind]===1){rec.apx=true;if(MB.S.mode==='play')apexAllyFx(e,0,V)}}
    rec.stamp=stamp;
    let hide=!!e.hidden||(rec.pet&&(e.dead||e.hp<=0));
    if(!hide&&!sight&&P){const dx=e.x-P.x,dy=e.y-P.y,lim=fogR+(e.r||0)+8;if(dx*dx+dy*dy>lim*lim)hide=true}
    rec.g.position.set(e.x,(e.lift||0)*LIFT,e.y);rec.g.visible=!hide;
    if(rec.pet){
      if(e.dead||e.hp<=0){if(!rec.gone){rec.gone=true;startFade(rec)}continue} // still listed but dead: its ghost is already fading
      rec.gone=false;updateEnt(rec,'monster',e,dt,phMonster,phMonsterUpdate);
    }else if(rec.tro)updateEnt(rec,'trophy',e,dt,phTrophy,phTrophyUpdate);
    else updateEnt(rec,name,e,dt,phMake,phUpdate);
    if(name==='monster'){const fz=e.frozen>0;if(rec.fz&&!fz&&!hide)shatterAt(e.x,e.y,e.r||16,Q.low);rec.fz=fz} // frozen solid, then thawed: the shell bursts
    if(hide)rec.g.visible=false;
    else if(Q.low&&!rec.tro&&e.kind!=='shade'){const b=pools.blob.get(),r=e.r||12,k=1-.4*(e.lift||0);b.position.set(e.x,.55,e.y);b.scale.set(r*5.4*k,1,r*4.4*k)}
  }
  if(map.size>list.length||(map.size&&!list.length))for(const[e,rec]of map)if(rec.stamp!==stamp){
    map.delete(e);
    if(rec.fz&&rec.g.visible&&MB.S.mode!=='title')shatterAt(rec.g.position.x,rec.g.position.z,rec.e.r||16,Q.low);          // died frozen: it shatters
    else if(rec.apx&&rec.g.visible&&MB.S.mode==='play'&&rec.e)apexAllyFx(rec.e,1,rec.V);                                    // an apex ally whose time is up
    if(rec.pet&&!rec.gone&&rec.g.visible&&MB.S.mode==='play'&&MB.S.level===dyingLevel)startFade(rec,true);else dropEnt(rec);
  }
}
// own=true: the record has left the map and the fading copy is the record's own group; otherwise a ghost twin is made so the listed pet can come back later
function startFade(rec,own){
  let g=rec.g;const M=rec.real&&modelOf('monster');
  if(!M||typeof M.fade!=='function'){if(own)dropEnt(rec);return}
  if(!own){ // the pet object stays in the list (dead for this level): fade a twin, keep the record
    try{g=M.create(rec.e,rec.V||MB);g.position.copy(rec.g.position);g.position.y=0;const a=rec.g.userData.mb,b=g.userData.mb;if(a&&b){b.root.rotation.y=a.root.rotation.y;b.born=9;b.grown=false}ents.add(g)}catch(e){return}
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

/* ---------- trophy echoes: MB.echoes = [{ai,s,x,y,ang,life,max,owner,col}] ----------
   Each entry is the monster a trophy was taken from, seen for a moment as a rim-lit spectre in the owner's accent colour, playing its attack
   and fading. The spectres are pooled and kept between uses (a trophy fires the same body again and again), so a firing builds nothing after
   the first. High graphics shows up to 6 at once, low graphics 2; past that an echo is only a flare on the floor. */
const ECHO_MAX=8,echoRecs=[],echoMap=new Map(),ECHO_SKIP={skip:true,stamp:0};
const ECHO_FWD={crawler:1.5,hound:1.9,fist:.9,mite:1,mimic:.5};
let echoLive=0;const HEX_RE=/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
function echoHex(c){if(typeof c==='number'&&c===c)return c;if(typeof c==='string'&&HEX_RE.test(c))return parseInt(c.length===4?c[1]+c[1]+c[2]+c[2]+c[3]+c[3]:c.slice(1),16);return PAL.power}
function echoRing(){const m=new THREE.Mesh(G.rim,new THREE.MeshBasicMaterial({color:PAL.power,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}));m.position.y=1.3;m.renderOrder=4;noLine(m);return m}
function echoDrop(rec){fx.remove(rec.root);try{window.MBModels.spectre.dispose(rec.g)}catch(e){}rec.ring.material.dispose()}
function echoClaim(e){
  const SM=window.MBModels&&window.MBModels.spectre;if(!SM||warned.echo||echoLive>=(Q.low?2:6)+(Q.low?1:2)*rems.length)return null;
  const s=e.s&&typeof e.s==='object'?e.s:null,r=Math.max(13,Math.min(32,+(s&&s.r)||+e.r||20));
  const key=(e.ai||'')+'|'+(s?s.col+'|'+(s.eyes||0)+'|'+(s.legs||0)+'|'+(s.spikes||0):'')+'|'+r;
  let rec=null,spare=-1;
  for(let i=0;i<echoRecs.length;i++){const q=echoRecs[i];if(q.e)continue;if(q.key===key){rec=q;break}spare=i}
  if(!rec){
    if(echoRecs.length>=(Q.low?3:ECHO_MAX)+(Q.low?1:3)*rems.length){if(spare<0)return null;echoDrop(echoRecs[spare]);echoRecs.splice(spare,1)}
    let g;try{g=SM.create({s:s||{},ai:e.ai,seed:e.seed||0},MB,r)}catch(err){warnOnce('echo',err);return null}
    rec={key,r,g,root:new THREE.Group(),ring:echoRing(),e:null,c1:0,c2:0,age:0,stamp:0,ai:SM.ai(g),top:SM.top(g)};
    rec.root.add(g,rec.ring);fx.add(rec.root);echoRecs.push(rec);
  }
  const c=echoHex(e.col);rec.c1=c;rec.c2=_col.setHex(c).lerp(_c0.setHex(0xffffff),.45).getHex();rec.ring.material.color.setHex(c);
  rec.e=e;rec.age=0;rec.root.visible=true;echoLive++;try{SM.reset(rec.g)}catch(err){}
  return rec;
}
function syncEchoes(dt,sight){
  const list=rems.length?echoMerge():R.testEchoes||MB.echoes||NONE,SM=window.MBModels&&window.MBModels.spectre,t=MB.S.t;
  if(!list.length&&!echoMap.size)return;
  // entries that have run out give their spectre back first, so the ones arriving this frame can use it
  if(echoMap.size)for(const[e,rec]of echoMap)if(list.indexOf(e)<0){echoMap.delete(e);if(rec!==ECHO_SKIP&&rec.e===e){rec.e=null;rec.root.visible=false}}
  echoLive=0;for(let i=0;i<echoRecs.length;i++)if(echoRecs[i].e)echoLive++;
  for(let i=0;i<list.length;i++){
    const e=list[i];if(!e||typeof e.x!=='number'||typeof e.y!=='number')continue;
    let rec=echoMap.get(e);
    if(!rec){
      rec=echoClaim(e)||ECHO_SKIP;echoMap.set(e,rec);
      // the moment it appears: a flare where it stands (this is all there is of an echo past the limit)
      if(sight&&(!Q.low||rec===ECHO_SKIP))flashAt(e.x,rec===ECHO_SKIP?14:24,e.y,rec===ECHO_SKIP?30:20,rec===ECHO_SKIP?110:80,echoHex(e.col),.2,.85);
    }
    if(rec===ECHO_SKIP)continue;
    rec.age+=dt;
    const max=e.max>0?e.max:.6,q=clamp01(typeof e.life==='number'?1-e.life/max:rec.age/max),ang=typeof e.ang==='number'&&e.ang===e.ang?e.ang:0;
    if(!sight){rec.root.visible=false;continue}
    rec.root.visible=true;
    try{
      const lift=SM.pose(rec.g,e.x,e.y,ang,q,MB,dt),d=4+(ECHO_FWD[rec.ai]||.3)*rec.r*easeOut(clamp01((q-.3)/.5)),k=(.72+.28*easeOut(clamp01(q*5)))*(1+.1*q);
      rec.root.position.set(e.x+Math.cos(ang)*d,0,e.y+Math.sin(ang)*d);
      rec.g.position.y=lift*LIFT*.7;rec.g.scale.setScalar(k);
      SM.tint(rec.g,rec.c1,rec.c2,1.8*clamp01(q*9)*(1-q*q*q),.24,t);
    }catch(err){warnOnce('echo',err);rec.root.visible=false}
    const rk=rec.r*(1.2+1.3*easeOut(q));rec.ring.scale.setScalar(rk);rec.ring.material.opacity=.9*(1-q)*(1-q);
  }
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
// Sizes. The CSS box shared by #gl and #cv can be any size and shape; both backing stores follow it:
//   #gl  = box x devicePixelRatio x MB.settings.res (0.5..1), the ratio capped by tier (low 1, high 2, ultra 3) and the frame by a pixel budget
//          (low/high about 8.3 million = native 4K, ultra half as much again) and by the card's largest renderbuffer;
//   #cv  = box x devicePixelRatio (up to 3, low 2; at least three quarters of full even when res is turned down, so text stays sharp).
// Everything is measured every frame and reallocated only when a target size really changes (window, monitor, zoom, either setting).
// The overlay is laid out in OV units: OV.u CSS pixels each, chosen so text is neither tiny on a 360 px phone nor huge on a 4K monitor.
const OV={w:W,h:H,u:1,k:2,bw:0,bh:0,stamp:0},FR={w:0,h:0,pr:1,bw:0,bh:0};
function resize(){
  const w=cv.clientWidth||glc.clientWidth,h=cv.clientHeight||glc.clientHeight;if(!w||!h)return;
  const dpr=window.devicePixelRatio||1,res=Math.max(.5,Math.min(1,num(MB.settings&&MB.settings.res,1)));
  let pr=Math.min(dpr,Q.low?1:Q.ultra?3:2)*res;
  const budget=Q.ultra?12.45e6:8.3e6;if(w*h*pr*pr>budget)pr=Math.sqrt(budget/(w*h));
  pr=Math.min(pr,maxRB/w,maxRB/h);
  const bw=Math.max(1,Math.floor(w*pr)),bh=Math.max(1,Math.floor(h*pr));
  if(bw!==FR.bw||bh!==FR.bh||w!==viewW||h!==viewH){
    viewW=w;viewH=h;viewPR=pr;FR.w=w;FR.h=h;FR.pr=pr;FR.bw=bw;FR.bh=bh;
    renderer.setPixelRatio(pr);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();fitCamera();
    const s=h*pr/(2*Math.tan(camera.fov*Math.PI/360));for(let i=0;i<pointSets.length;i++)pointSets[i].mat.uniforms.uScale.value=s;
  }
  // the overlay canvas
  let ok=Math.min(dpr,Q.low?2:3)*Math.max(.75,res);if(w*h*ok*ok>8.3e6)ok=Math.sqrt(8.3e6/(w*h));
  const ow=Math.max(1,Math.round(w*ok)),oh=Math.max(1,Math.round(h*ok));
  if(ow!==OV.bw||oh!==OV.bh||cv.width!==ow||cv.height!==oh){
    cv.width=ow;cv.height=oh;OV.bw=ow;OV.bh=oh;
    const ref=Math.min(h/600,w/800),u=Math.max(.5,Math.pow(ref,.8));
    OV.u=u;OV.w=w/u;OV.h=h/u;OV.k=ow/OV.w;OV.stamp++;vig=null;capGrad.clear();hudAt=-1;padAt=-1;
  }
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
  if(!sight){const k=Math.min(1.75,fogR/FOG);want.x=W/2+(P.x-W/2)*(k>1?.66:.8);want.z=H/2+(P.y-H/2)*(k>1?.66:.8)-4;want.zoom=.48*k;return}
  // the anchor: the hero; in versus, while the hero is down, whoever is being watched (or the middle of the fighters still standing)
  let ax=P.x,ay=P.y,rx=430,rz=300;
  if(VS.on&&SPEC.on){ax=SPEC.x;ay=SPEC.y;if(!SPEC.rm){rx=1e4;rz=1e4}}
  bb.x0=bb.x1=ax;bb.z0=bb.z1=ay;bb.h=0;grow(ax,ay,46,66);
  const B=MB.boss,mons=MB.mons,zs=MB.zones;
  if(B&&B.hp>0&&!B.hidden)grow(B.x,B.y,B.r+16,B.r*2.5+(B.lift||0)*LIFT);
  else for(let i=0;i<mons.length;i++){const m=mons[i];if(m.hidden||m.decoy)continue;const dx=m.x-ax,dy=m.y-ay;if(dx*dx+dy*dy<340*340)grow(m.x,m.y,m.r+8,m.r*2.2)}
  for(let i=0;i<zs.length;i++){const z=zs[i];if(z.mine&&z.foe!==true)continue;const dx=z.x-ax,dy=z.y-ay,lim=z.r+300;if(dx*dx+dy*dy<lim*lim)grow(z.x,z.y,z.r+4,0)}
  if(TR.obj)grow(TR.ox,TR.oy,TR.or+26,74); // the thing being guarded stays in view while the hero is anywhere near it
  // versus: every opponent still standing counts as the boss does (those past the reach below sit at the edge, or get an edge badge);
  // a spectator's view takes in everyone near the one being watched, or every fighter left when it is watching the fight as a whole
  if(VS.on)for(let i=0;i<rems.length;i++){const rm=rems[i];if(!rm.vis||rm.dead)continue;
    if(SPEC.on){if(SPEC.rm){if(rm===SPEC.rm)continue;const dx=rm.P.x-ax,dy=rm.P.y-ay;if(dx*dx+dy*dy>380*380)continue}}
    else if(!rm.foe)continue;
    grow(rm.P.x,rm.P.y,40,70)}
  if(VS.on&&VS.ringOn&&!SPEC.on){ // the way back into the ring stays in view
    const dx=VS.rx-ax,dy=VS.ry-ay,d=Math.hypot(dx,dy);if(d>VS.rr-40&&d>1){const k=Math.max(0,(VS.rr-60))/d;grow(VS.rx-dx*k,VS.ry-dy*k,30,0)}}
  // never chase something across the whole arena: past this reach it may sit at the edge of the view
  {if(bb.x0<ax-rx)bb.x0=ax-rx;if(bb.x1>ax+rx)bb.x1=ax+rx;if(bb.z0<ay-rz)bb.z0=ay-rz;if(bb.z1>ay+rz)bb.z1=ay+rz}
  if(bb.x0<0)bb.x0=0;if(bb.x1>W)bb.x1=W;if(bb.z0<0)bb.z0=0;if(bb.z1>H)bb.z1=H;
  // lean a third of the way from the player to the middle of the group
  const fx=ax+((bb.x0+bb.x1)/2-ax)*.6,fz=ay+((bb.z0+bb.z1)/2-ay)*.6,base=viewW&&viewW<640?.5:.58;
  for(let z=base;;z+=.05){
    if(z>=1){want.x=W/2;want.z=H/2-4;want.zoom=1;return}
    const f=(z-base)/(1-base),fol=.62*(1-f*f);
    want.x=W/2+(fx-W/2)*fol;want.z=H/2+(fz-H/2)*fol-4;want.zoom=z;
    placeCamera(want.x,want.z,fitD*z);if(bbFits())return;
  }
}
const sp={x:0,y:0,ok:true};
function toScreen(x,y,z){v3.set(x,y,z).project(camera);sp.x=(v3.x*.5+.5)*OV.w;sp.y=(.5-v3.y*.5)*OV.h;sp.ok=v3.z<1;return sp}

/* ---------- 2D overlay ---------- */
function groundEllipse(x,z,r){ // screen-space ellipse of a circle lying on the floor
  toScreen(x,0,z);const cx=sp.x,cy=sp.y;toScreen(x+r,0,z);const rx=Math.abs(sp.x-cx);toScreen(x,0,z+r);const a=Math.abs(sp.y-cy);toScreen(x,0,z-r);const b=Math.abs(sp.y-cy);
  return{cx,cy:cy+(a-b)/2,rx,ry:(a+b)/2};
}
// how far the page's floating HUD (.vitals is fixed over the arena on small screens) reaches down the view, in overlay units; measured twice a second
let hudY=0,hudAt=-1,hudEl;
function hudBottom(){
  const H=OV.h;
  const now=MB.S.t;if(now>=hudAt&&now-hudAt<.5)return hudY;hudAt=now;
  try{
    if(hudEl===undefined)hudEl=document.querySelector('.vitals')||null;
    const c=cv.getBoundingClientRect(),v=hudEl&&hudEl.getBoundingClientRect();
    hudY=v&&c.height>0&&v.height>0&&v.height<c.height*.4&&v.top<c.top+c.height*.3&&v.bottom>c.top&&v.right>c.left&&v.left<c.right&&getComputedStyle(hudEl).visibility!=='hidden'?Math.min(H*.4,(v.bottom-c.top)/c.height*H):0;
  }catch(e){hudY=0}
  return hudY;
}
let vig=null;
function vignette(){const W=OV.w,H=OV.h;if(!vig){vig=ctx.createRadialGradient(W/2,H/2,H*.4,W/2,H/2,H*.98);vig.addColorStop(0,'rgba(6,4,18,0)');vig.addColorStop(.6,'rgba(6,4,18,.3)');vig.addColorStop(1,'rgba(5,3,16,.8)')}return vig}
// overlay text helpers: condensed, slightly slanted, inked
const CSS={ink:'#0b0a16',bone:'#f2ecff',gold:'#f0b848',power:'#8b4dff',power2:'#c4f4ff',foe:'#ff2d55',dim:'#a9a4c8'};
// colours on the overlay lose their hue with the eyes: the game's own grey before there are eyes, a grey worked out here when an ordeal takes them away again
const greys=new Map();
function greyOf(c){let v=greys.get(c);if(v)return v;const q=cssRGB(c),l=Math.round(Math.min(255,(q[0]*.3+q[1]*.59+q[2]*.11)*255*1.08));v='rgb('+l+','+l+','+(l+6>255?255:l+6)+')';if(greys.size>200)greys.clear();greys.set(c,v);return v}
const tint=c=>seeing?c:MB.has('sight')?greyOf(c):MB.col(c);
const clamp01=v=>v<0?0:v>1?1:v;
let hasSpacing=null;
function spaced(px){if(hasSpacing===null)hasSpacing='letterSpacing' in ctx;if(hasSpacing)ctx.letterSpacing=px+'px'}
function slant(x,y,rot,sx,sy){ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.transform(sx,0,-.2*sy,sy,0,0)}
function inked(txt,x,y,fill,lw){ctx.lineJoin='round';ctx.lineWidth=lw;ctx.strokeStyle=CSS.ink;ctx.strokeText(txt,x,y);ctx.fillStyle=fill;ctx.fillText(txt,x,y)}
// a pet's health bar. idCss = null: one of ours (the pip is in the owner's colour); else the identity colour of the member it belongs to
function petBar(a,MM,idCss,foe){
  const W=OV.w,H=OV.h;
  const small=!!a&&foe===true&&!a.pet&&(a.kind==='thrall'||a.kind==='wolf'||(typeof a.kind==='string'&&APX_ALLY[a.kind]===1)); // versus: an opponent's thralls and wolves can be killed, so they show their health too
  if(!a||!(a.pet||small)||a.minion||a.hidden||a.dead||!(a.maxHp>0)||!(a.hp>0))return;
  let top=small?(a.kind==='wolf'||a.kind==='packbeast'?24:a.kind==='icewight'?54:a.kind==='cinder'?30:40):(a.r||16)*2.4;if(!small&&MM&&MM.height)try{top=MM.height(a)}catch(e){}
  toScreen(a.x,top+10+(a.lift||0)*LIFT,a.y);if(!sp.ok)return;
  if(idCss&&(sp.x<-12||sp.x>W+12||sp.y>H+12))return; // another member's pet out of frame: no bar pinned to the edge
  // on a phone the health and boss bars float over the top of the view: a bar that would sit under them is held just below (and never off the sides)
  const beast=a.owner==='beast',q=Math.max(0,Math.min(1,a.hp/a.maxHp)),bw=Math.max(34,Math.min(64,(a.r||16)*1.7)),bx=Math.max(18,Math.min(W-bw-6,sp.x-bw/2)),by=Math.max(hudBottom()+7,sp.y-8);
  if(foe){ // versus, an opponent's creature: a slanted bar filled with the owner's colour, no friendly pip
    ctx.beginPath();ctx.moveTo(bx-1,by-2);ctx.lineTo(bx+bw+4,by-2);ctx.lineTo(bx+bw+1,by+7);ctx.lineTo(bx-4,by+7);ctx.closePath();ctx.fillStyle='rgba(8,8,12,.88)';ctx.fill();
    ctx.fillStyle='#2a0c14';ctx.fillRect(bx,by,bw,5);ctx.fillStyle=idCss;ctx.fillRect(bx,by,bw*q,5);ctx.lineWidth=1;ctx.strokeStyle=CSS.foe;ctx.stroke();return}
  ctx.fillStyle='rgba(8,8,12,.82)';ctx.fillRect(bx-2,by-2,bw+4,9);
  ctx.fillStyle=beast?'#1d3348':'#12301a';ctx.fillRect(bx,by,bw,5);
  ctx.fillStyle=q<.3?'#e0a23c':beast?'#cfeaff':'#6fe07a';ctx.fillRect(bx,by,bw*q,5);
  ctx.strokeStyle=beast?'rgba(207,234,255,.9)':'rgba(125,255,140,.85)';ctx.lineWidth=1;ctx.strokeRect(bx-1.5,by-1.5,bw+3,8);
  // a small diamond pip marks it as yours; another member's pet carries a round pip in that member's colour
  if(idCss){ctx.fillStyle=idCss;ctx.beginPath();ctx.arc(bx-9,by+2.5,4,0,TAU);ctx.fill()}
  else{ctx.fillStyle=beast?'#cfeaff':'#7dff8c';ctx.beginPath();ctx.moveTo(bx-9,by-1);ctx.lineTo(bx-5,by+2.5);ctx.lineTo(bx-9,by+6);ctx.lineTo(bx-13,by+2.5);ctx.closePath();ctx.fill()}
  ctx.strokeStyle='rgba(8,8,12,.8)';ctx.stroke();
}
function drawOverlay(sight){
  const S=MB.S,P=MB.P,W=OV.w,H=OV.h; // W and H in here are the overlay's own width and height in OV units, not the arena's
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,cv.width,cv.height);
  ctx.setTransform(OV.k,0,0,OV.k,0,0);
  if(!sight&&P){
    // no eyes: everything past arm's reach is black
    const e=groundEllipse(P.x,P.y,fogR*1.04),k=e.ry/e.rx;
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
    if(obs)for(let i=0;i<obs.length;i++){const o=obs[i];if(!o||o.kind==='pillar')continue;const dx=o.x-P.x,dy=o.y-P.y,lim=fogR+o.r;if(dx*dx+dy*dy>lim*lim)continue;
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
  if(TR.on)trialOverlay(sight);
  // damage numbers: bold and tilted, bigger and hotter with the size of the hit; words get a small caps tag with an accent line
  const floats=MB.floats;
  if(floats.length){ctx.textAlign='center';ctx.textBaseline='alphabetic';
    for(let i=0;i<floats.length;i++){const f=floats[i];toScreen(f.x,26,f.y);if(!sp.ok)continue;
      const cl=clOf.get(f);if(cl&&cl.lead!==f)continue; // folded into a newer number of its group
      const b0=born.get(f)||f.life,age=b0-f.life,a=clamp01(f.life*3),txt=cl?cl.txt:''+f.txt,c0=txt.charCodeAt(0),v=cl?cl.sum:parseFloat(txt),num=v===v&&(c0===45||c0===43||(c0>=48&&c0<=57));
      ctx.save();ctx.globalAlpha=a;
      if(num){
        // a merged number grows with its total but only a single heavy blow turns crimson
        const many=cl&&cl.n>1,hit=c0>=48&&c0<=57&&f.c==='#e7dfcd',k=hit&&FX.avg>0?v/FX.avg:1,pop=age<.1?(many?1.35:1.7)-(many?.35:.7)*(age/.1):1,size=hit?Math.min(46,17+9*Math.min(3.2,many?1+(k-1)*.5:k)):c0===45?27:22;
        const col=hit?(k>=1.7&&!many?CSS.foe:k>=1.15?CSS.gold:CSS.bone):c0===45?CSS.foe:f.c,rot=many?-.05:((f.x*7.13+i)%1-.5)*.26;
        slant(sp.x,sp.y-age*10+(cl?cl.oy:0),rot,pop*.9,pop);ctx.font='700 '+size+'px '+FONT;
        if(hit&&k>=1.7&&sight&&!many){ctx.fillStyle=tint(CSS.power);ctx.globalAlpha=a*.55;ctx.fillText(txt,2.5,2.5);ctx.globalAlpha=a}
        inked(txt,0,0,tint(col),size>30?5:4);
        if(many){const w=ctx.measureText(txt).width;ctx.font='700 '+Math.round(size*.5)+'px '+FONT;ctx.textAlign='left';inked(cl.tag,w/2+3,-size*.34,tint(CSS.power2),3);ctx.textAlign='center'}
      }else{
        const t2=txt.toUpperCase(),in1=easeOut(clamp01(age/.16));
        slant(sp.x+(1-in1)*-26,sp.y,0,.92,1);ctx.font='700 17px '+FONT;spaced(2);
        const w=ctx.measureText(t2).width;inked(t2,0,0,tint(f.c),4);spaced(0);
        ctx.fillStyle=tint(f.c);ctx.fillRect(-w/2*in1,5,w*in1,1.5);
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
    for(let i=0;i<al.length;i++)petBar(al[i],MM,null);
    if(rems.length)remoteOverlay(MM,sight)}
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
  if(VS.on)vsOverlay(sight);
  // level banner: a slanted dark band that cuts in from the left, thin accent lines, the title sliding in against it
  if(S.banner>0&&S.mode==='play'&&S.L){
    const L=S.L,age=2.8-S.banner,tin=easeOut(clamp01(age/.32)),out=clamp01(S.banner/.4),a=Math.min(1,tin*1.2)*out,sl=28,y0=Math.round(H*.34),y1=y0+134,xr=W*tin+sl,ac=tint(CSS.power),ac2=tint(CSS.power2);
    ctx.save();ctx.globalAlpha=a;
    ctx.beginPath();ctx.moveTo(-sl,y0);ctx.lineTo(xr+sl,y0);ctx.lineTo(xr-sl,y1);ctx.lineTo(-sl*3,y1);ctx.closePath();ctx.fillStyle='rgba(8,7,18,.84)';ctx.fill();
    ctx.fillStyle=ac;ctx.fillRect(0,y0-5,W*tin,2);ctx.fillRect(W*(1-tin),y1+3,W*tin,2);
    const run=(age*.55)%1.4-.2;ctx.fillStyle=ac2;ctx.fillRect(W*run,y0-5,90,2);ctx.fillRect(W*(1-run)-90,y1+3,90,2);
    const tl=easeOut(clamp01((age-.1)/.36)),ox=(1-tl)*90+(1-out)*-60;
    ctx.globalAlpha=a*tl;ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.font='700 15px '+FONT;spaced(4);ctx.fillStyle=tint(CSS.gold);ctx.fillText(((MB.tower?'FLOOR ':'LEVEL ')+(S.level+1)+'  //  '+L.spec.name).toUpperCase(),W/2-ox*.5,y0+30);spaced(0);
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
const FX={fall:0,prevAtk:0,dir:1,ghostT:0,px:0,py:0,lvl:-1,mode:'',boss:null,ph:0,rage:false,bx:W/2,bz:H/2,drama:0,dramaMax:1,kind:'',hurt:0,avg:0,nAvg:0,rankK:0,clock:0,apex:null,stT:0,stN:0,trD:0,trN:0};
const born=new WeakMap(),prevZones=[],prevRings=[];
// Damage numbers that land on the same spot within half a second are shown as ONE number (the running total, with a small hit count), led by
// the newest float of the group; the older ones are not drawn. Numbers that cannot merge (a heavy hit, another colour) are stacked upward.
const CL=[],clOf=new WeakMap();for(let i=0;i<24;i++)CL.push({lead:null,sum:0,n:0,tl:0,heavy:false,c:'',oy:0,txt:'',tag:''});
let clI=0;
function clusterNew(f,v,heavy,t){
  if(!heavy)for(let i=0;i<CL.length;i++){const c=CL[i],l=c.lead;
    if(!l||!(l.life>0)||c.heavy||c.c!==f.c||t-c.tl>.55||Math.abs(f.x-l.x)>38||Math.abs(f.y-l.y)>36)continue;
    c.sum+=v;c.n++;c.tl=t;c.lead=f;c.txt=c.sum%1?c.sum.toFixed(1):''+c.sum;c.tag='\u00d7'+c.n;clOf.set(f,c);return}
  let near=0;
  for(let i=0;i<CL.length;i++){const l=CL[i].lead;if(l&&l.life>0&&Math.abs(f.x-l.x)<46&&Math.abs(f.y-l.y)<30)near++}
  const c=CL[clI];clI=(clI+1)%CL.length;
  c.lead=f;c.sum=v;c.n=1;c.tl=t;c.heavy=heavy;c.c=f.c;c.oy=-19*(near%4);c.txt=''+f.txt;c.tag='';clOf.set(f,c);
}
const auraP=makePoints(48);pointSets.push(auraP);auraP.mat.blending=THREE.AdditiveBlending;
const auraDisc=new THREE.Mesh(G.quad,flatGlowMat(PAL.power,.2));auraDisc.position.y=.62;auraDisc.renderOrder=1;auraDisc.visible=false;fx.add(auraDisc);
const easeOut=q=>1-(1-q)*(1-q)*(1-q);
function upSlash(o,q){const u=o.userData,e=easeOut(q);o.rotation.y=-(u.ang+u.dir*(e-.5)*u.arc);o.scale.setScalar(u.reach*(1.75+.45*e));const k=(1-q)*(1-q);u.a.material.opacity=k*.95;u.b.material.opacity=Math.min(1,k*1.3)}
function upGhost(o,q){o.material.opacity=(1-q)*o.userData.k;o.scale.y=1-.08*q}
function upStreak(o,q){const u=o.userData;o.material.opacity=(1-q)*.85;o.scale.set(u.len,1,u.w*(1-.7*q))}
function upFlash(o,q){const u=o.userData,e=easeOut(q);o.scale.setScalar(u.s0+(u.s1-u.s0)*e);o.material.opacity=(1-q)*(1-q)*u.k}
function upCrack(o,q){const u=o.userData;u.d.material.opacity=Math.min(1,(1-q)*2.6)*.82;u.h.material.opacity=Math.max(0,1-q*4.5)*.95;u.h.visible=u.hot&&q<.23}
function flashAt(x,y,z,s0,s1,hex,life,k,pool){const o=(pool||TF.flash).spawn(life||.14),u=o.userData;o.position.set(x,y,z);u.s0=s0;u.s1=s1;u.k=k===undefined?1:k;o.material.color.setHex(hex);o.material.rotation=(x*.37+z*.11)%1.5;o.scale.setScalar(s0);return o}
function burstAt(x,y,z,s0,s1,hex,life){const o=TF.burst.spawn(life||.2),u=o.userData;o.position.set(x,y,z);u.s0=s0;u.s1=s1;u.k=.9;o.material.color.setHex(hex);o.material.rotation=(x*.21+z*.4)%TAU;o.scale.setScalar(s0)}
function crackAt(x,z,r,hex,life){const o=TF.crack.spawn(life||2.6),u=o.userData;o.position.set(x,0,z);o.rotation.y=(x*.13+z*.29)%TAU;o.scale.setScalar(Math.max(40,r*2.5));u.hot=!Q.low;u.h.material.color.setHex(hex)}
function clearFx(){for(const k in TF)TF[k].clear();if(TFR)for(const k in TFR)TFR[k].clear();if(TX){TX.trail.clear();TX.shard.clear()}}
function drama(kind,x,z,len){if(calm)return;FX.drama=FX.dramaMax=len;FX.kind=kind;FX.bx=x;FX.bz=z}
const RANK_K={'':0,E:.22,D:.38,C:.54,B:.7,A:.85,S:1};
// the apex tier: which path a hero walks ('dominion' | 'order' | null), read from the object its model reads (the game, or a member's view);
// R.testApex forces the local hero's. The motes that rise off a hero take the path's colours [base rgb, hot rgb].
function apexPath(B){let a=B===MB?R.testApex:null;if(!a){a=B.apex;if(a&&typeof a==='object')a=a.path;if(!a)a=B.S&&B.S.apex}return typeof a==='string'&&APEX_OK[a]===1?a:null}
const APEX_COL={'':[.55,.3,1,.77,.96,1],dominion:[.5,.22,1,.93,.88,1],order:[.72,.95,1,1,.86,.5],
  beasts:[.37,.88,.48,.85,1,.82],frost:[.56,.85,1,.95,.98,1],plague:[.6,.76,.1,.6,.35,.7],flame:[1,.42,.12,1,.82,.48],storm:[1,.9,.29,1,.98,.88],stone:[.88,.66,.29,.66,.67,.71],blade:[.56,.63,1,.93,.95,1],tide:[.1,.83,.77,.85,1,.97]},FOE_COL=[1,.16,.3,1,.72,.62];
if(typeof MB.on==='function')try{
  MB.on('bossdead',()=>{if(!alive)return;const x=FX.bx,z=FX.bz;drama('death',x,z,1.25);flashAt(x,34,z,60,330,0xffffff,.42,1);burstAt(x,34,z,90,420,PAL.power2,.38);crackAt(x,z,90,PAL.power,3.4)});
  MB.on('levelstart',()=>{clearFx();FX.drama=0;FX.hurt=0;FX.avg=0;FX.nAvg=0;prevZones.length=0;prevRings.length=0});
}catch(e){}
// what a hero's own movement throws off: F = that hero's little state {prevAtk,dir,ghostT,px,py}, T = the timed pools to draw from
// (the local hero has its own; the other members share a larger set)
function heroFx(F,P,cls,dt,sight,low,T,ap){
  // weapon trail on a swing, a muzzle flare on a cast or shot
  const atk=P.atk||0;
  if(atk>F.prevAtk+.04){
    const ang=P.swing===undefined?P.face:P.swing,melee=MB.melee(cls);
    if(melee){const o=T.slash.spawn(cls==='assassin'?.16:.22),u=o.userData;F.dir=-F.dir;u.ang=ang;u.dir=F.dir;u.arc=cls==='assassin'?1.1:cls==='tank'?1.3:1.6;u.reach=cls==='tank'?58:cls?64:50;
      o.position.set(P.x,cls?30:26,P.y);u.a.material.color.setHex(F.foe?PAL.foe:cls?PAL.power:0xcfd0e6);u.b.material.color.setHex(F.foe?PAL.foe2:cls?PAL.power2:0xffffff);upSlash(o,0)}
    else if(!low){const hex=F.foe?PAL.foe:cls==='healer'?PAL.holy:cls==='necro'?PAL.necro:cls==='ranger'?PAL.power2:PAL.power;flashAt(P.x+Math.cos(ang)*20,36,P.y+Math.sin(ang)*20,16,58,hex,.13,.95,T.flash)}
  }
  F.prevAtk=atk;
  // afterimages: a trail of ghosts on a dash, a streak and ghosts along a blink
  const dx=P.x-F.px,dy=P.y-F.py,jump=dx*dx+dy*dy;
  if(!low&&sight){
    if(P.dashT>0){F.ghostT-=dt;if(F.ghostT<=0){F.ghostT=.034;const o=T.ghost.spawn(.26);o.position.set(P.x,0,P.y);o.rotation.set(.3,Math.PI/2-P.face,0,'YXZ');o.userData.k=.36;o.material.color.setHex(F.foe?PAL.foe:PAL.power)}}
    else{F.ghostT=0;
      if(jump>80*80&&jump<260*260&&cls==='mage'){const len=Math.sqrt(jump),a=Math.atan2(dy,dx);
        for(let i=0;i<4;i++){const o=T.ghost.spawn(.3+i*.05),q=i/4;o.position.set(F.px+dx*q,0,F.py+dy*q);o.rotation.set(.22,Math.PI/2-a,0,'YXZ');o.userData.k=.2+.1*i;o.material.color.setHex(F.foe?(i%2?PAL.foe2:PAL.foe):i%2?PAL.power2:PAL.power)}
        const s=T.streak.spawn(.3),u=s.userData;s.position.set(F.px+dx/2,22,F.py+dy/2);s.rotation.y=-a;u.len=len*1.15;u.w=34;if(T===TFR)s.material.color.setHex(F.foe?PAL.foe:PAL.power);upStreak(s,0);
        flashAt(P.x,34,P.y,24,96,F.foe?PAL.foe2:PAL.power2,.2,.9,T.flash)}}
  }
  // the newer apex paths: a Split Sky hero stutters after-images as it runs (more with its speed surge), a Feral Vow hero leaves paw prints and a Last Pyre hero scorched footprints
  if(ap&&sight){
    if(ap==='storm'){if(!low&&P.moving&&!(P.dashT>0)){const h=P.haste>0?Math.min(1,P.haste):0;F.stT-=dt;if(F.stT<=0){F.stT=.13-.07*h;F.stN++;const o=T.ghost.spawn(.2+.1*h),k=F.stN%2?10:19;
      o.position.set(P.x-Math.cos(P.face)*k,0,P.y-Math.sin(P.face)*k);o.rotation.set(.12,Math.PI/2-P.face,0,'YXZ');o.userData.k=.2+.22*h;o.material.color.setHex(F.foe?PAL.foe:0xffe74a)}}}
    else if((ap==='beasts'||ap==='flame')&&jump<200*200){F.trD+=Math.sqrt(jump);if(F.trD>(low?46:24)){F.trD=0;F.trN++;trailAt(ap,P.x,P.y,Math.atan2(dy,dx),F.trN%2?1:-1,F.foe)}}
  }
  F.px=P.x;F.py=P.y;
}
function syncFx(dt,sight){
  const S=MB.S,P=MB.P,low=Q.low,t=S.t,cls=MB.cls();
  if(FX.drama>0)FX.drama=Math.max(0,FX.drama-dt);
  if(FX.hurt>0)FX.hurt=Math.max(0,FX.hurt-dt*2.6);
  const d=FX.drama>0?FX.drama/FX.dramaMax:0,fdt=dt*(1-.72*Math.sin(Math.min(1,d*1.4)*Math.PI/2)); // effects run slow while a big moment holds
  FX.clock+=fdt;
  const play=S.mode==='play';
  if(S.level!==FX.lvl||S.mode!==FX.mode){if(S.level!==FX.lvl||S.mode==='title'){clearFx();FX.drama=0}FX.lvl=S.level;FX.mode=S.mode;if(P){FX.px=P.x;FX.py=P.y}FX.prevAtk=P?P.atk:0;FX.boss=null}
  // the boss: a phase breaking or the rage starting is a held beat
  const B=MB.boss;
  if(B!==FX.boss){FX.boss=B;FX.ph=B?B.phase||1:0;FX.rage=B?!!B.rage:false}
  else if(B&&B.hp>0){const ph=B.phase||1,rg=!!B.rage;
    if((ph>FX.ph||(rg&&!FX.rage))&&play){drama('phase',B.x,B.y,.85);if(sight){flashAt(B.x,B.r+10,B.y,B.r*2,B.r*7,PAL.foe,.32,1);if(!low)burstAt(B.x,B.r+10,B.y,B.r*3,B.r*9,PAL.foe2,.3);crackAt(B.x,B.y,B.r*1.5,PAL.foe,3)}}
    FX.ph=ph;FX.rage=rg}
  if(B&&B.hp>0){FX.bx=B.x;FX.bz=B.y}
  if(P&&play&&!P.down)heroFx(FX,P,cls,dt,sight,low,TF,cls?apexPath(MB):null);else if(P&&P.down){FX.px=P.x;FX.py=P.y;FX.prevAtk=P.atk||0}
  // slams: a telegraphed blast going off, or a heavy shockwave, cracks the floor for a while
  {const zs=MB.zones;
    for(let i=0;i<prevZones.length;i++){const z=prevZones[i];if(zs.indexOf(z)>=0||!(z.t>=z.dur*.92)||!play)continue;
      const zm=z.mine&&z.foe!==true;if(sight){crackAt(z.x,z.y,z.r*.9,zm?PAL.power:PAL.foe,low?1.6:2.6);if(!low)flashAt(z.x,10,z.y,z.r*.8,z.r*2.6,zm?PAL.power2:0xffd9a0,.16,.8)}}
    prevZones.length=0;for(let i=0;i<zs.length;i++)prevZones.push(zs[i]);
    const rs=MB.rings;
    if(sight&&!low)for(let i=0;i<rs.length;i++){const r=rs[i];if(!r.fx||r.r<118||r.under||prevRings.indexOf(r)>=0)continue;crackAt(r.x,r.y,(r.r-70)*.9,r.foe===true?PAL.foe:PAL.gold,2.2)}
    prevRings.length=0;for(let i=0;i<rs.length;i++)prevRings.push(rs[i])}
  // hits: every new damage number is an event; the big ones flash and throw speed lines
  {const fl=MB.floats;
    for(let i=0;i<fl.length;i++){const f=fl[i];if(born.has(f))continue;born.set(f,f.life);
      const v=parseFloat(f.txt);if(!(v===v)||typeof f.txt!=='string')continue;
      const c0=f.txt.charCodeAt(0);
      if(c0===45){if(P&&Math.abs(f.x-P.x)<4&&f.c==='#ff5b6e')FX.hurt=1;continue} // '-': something of ours was hurt
      if(c0===43)continue;
      if(f.c!=='#e7dfcd'){if(c0>=48&&c0<=57)clusterNew(f,v,false,t);continue}
      FX.nAvg++;FX.avg=FX.nAvg<4?(FX.avg*(FX.nAvg-1)+v)/FX.nAvg:FX.avg+(v-FX.avg)*.12;
      const k=FX.avg>0?v/FX.avg:1,heavy=k>=1.7&&FX.nAvg>3;
      clusterNew(f,v,heavy,t);
      if(!sight)continue;
      if(heavy){flashAt(f.x,26,f.y+22,30,120+26*Math.min(3,k),0xffffff,.17,1);if(!low)burstAt(f.x,26,f.y+22,50,150+40*Math.min(3,k),cls?PAL.power2:0xffffff,.2)}
      else if(!low)flashAt(f.x,26,f.y+20,14,50,cls?PAL.power2:0xffffff,.11,.8)}}
  TF.slash.run(fdt,upSlash);TF.ghost.run(fdt,upGhost);TF.streak.run(fdt,upStreak);TF.flash.run(fdt,upFlash);TF.burst.run(fdt,upFlash);TF.crack.run(fdt,upCrack);
  if(TFR){TFR.slash.run(fdt,upSlash);TFR.ghost.run(fdt,upGhost);TFR.streak.run(fdt,upStreak);TFR.flash.run(fdt,upFlash)}
  if(TX){TX.trail.run(fdt,upTrail);TX.shard.run(fdt,upShard)}
  // power rising off the hero: more of it with every rank
  {let k=0;const ap=cls?apexPath(MB):null;if(cls&&P&&play&&sight){const r=MB.rank?MB.rank():'';k=ap||(r&&r[0]==='X')?1.25:r&&r[0]==='S'?1:RANK_K[r]||.12}
    FX.rankK+=(k-FX.rankK)*Math.min(1,dt*2);const rk=FX.rankK,AC=APEX_COL[ap||''];
    const n=rk<.02||!P?0:Math.min(48,Math.round((low?3:8)+(low?9:40)*rk)),pos=auraP.pos,col=auraP.col,size=auraP.size,c=FX.clock;
    for(let i=0;i<n;i++){const a=i*2.399+c*(.5+i%3*.22),rad=9+(i*7%19)+6*Math.sin(c*1.3+i),h=(i*17.3+c*(20+i%5*7+26*rk))%(54+34*rk),q=h/(54+34*rk);
      pos[i*3]=P.x+Math.cos(a)*rad;pos[i*3+1]=3+h;pos[i*3+2]=P.y+Math.sin(a)*rad*.8;
      const hot=i%4===0,o=hot?3:0;col[i*4]=AC[o];col[i*4+1]=AC[o+1];col[i*4+2]=AC[o+2];col[i*4+3]=Math.sin(q*Math.PI)*(.5+.4*Math.min(1,rk));size[i]=(hot?1.5:2.1)+rk*1.1+(i%3)*.4}
    auraP.geo.setDrawRange(0,n);
    if(n){auraP.geo.attributes.position.needsUpdate=true;auraP.geo.attributes.aCol.needsUpdate=true;auraP.geo.attributes.aSize.needsUpdate=true}
    auraDisc.visible=rk>.02&&!!P;if(auraDisc.visible){if(ap!==FX.apex){FX.apex=ap;auraDisc.material.color.setHex(APEX_HEX[ap]||PAL.power)}
      auraDisc.position.x=P.x;auraDisc.position.z=P.y;auraDisc.scale.setScalar(64+52*Math.min(1,rk)+4*Math.sin(c*3));auraDisc.material.opacity=(.1+.2*Math.min(1,rk)+.03*Math.sin(c*5))*(APEX_DISC[ap]||1)}}
}

// one of our side's projectiles (pool = which body: bolt, orb, skull, arrow), drawn at x,y
function drawPshot(p,i,x,y,t,low,pool){
  const r=p.r||5,o=pool.get(),vx=p.vx||0,vy=p.vy||0;o.position.set(x,SHOT_Y,y);
  if(o.userData.trail)o.userData.trail.visible=!low;
  if(pool===pools.arrow||pool===pools.farrow)o.rotation.y=Math.PI/2-Math.atan2(vy,vx);
  else if(pool===pools.skull||pool===pools.fskull){const a=Math.atan2(vy,vx);o.scale.setScalar(r*1.25);o.rotation.y=0;o.userData.trail.rotation.y=-a;o.userData.trail.position.set(-Math.cos(a)*3.8,0,-Math.sin(a)*3.8);o.userData.core.rotation.y=Math.PI/2-a;o.userData.core.rotation.z=Math.sin(t*14+i)*.25}
  else{o.scale.setScalar(Math.max(4.5,r));o.rotation.y=-Math.atan2(vy,vx);o.userData.core.scale.setScalar(.8)}
}
// an order hero's sweeping beam: P.beam = {a, len, w, on}, from the hero outward
function heroBeam(P,t,foe){const b=P&&P.beam;if(!b||typeof b!=='object'||b.on===false)return;const a=num(b.a,0),len=Math.max(1,num(b.len,300)),w=Math.max(4,num(b.w,16)),o=(foe?pools.fobeam:pools.obeam).get(),u=o.userData,fl=1+.14*Math.sin(t*53);
  o.position.set(P.x+Math.cos(a)*len/2,SHOT_Y+8,P.y+Math.sin(a)*len/2);o.rotation.y=-a;
  u.core.scale.set(len,w*.22*fl,w*.5*fl);u.glow.position.y=-SHOT_Y-7.2;u.edge.position.y=-SHOT_Y-7;u.glow.scale.set(len+w*3,1,w*5*fl);u.edge.scale.set(len+w*5,1,w*9)}
// a pet's beam is the same shape as a monster's, in friendly blue (an opponent's pet in versus: the monsters' own red)
function allyBeams(allies,t,foe){
  for(let i=0;i<allies.length;i++){const m=allies[i],b=m&&m.beam;if(!b||m.hidden||!b.rays||m.hp<=0)continue;
    for(let j=0;j<b.rays.length;j++){const ry=b.rays[j];if(!ry)continue;const o=(foe?pools.beam:pools.pbeam).get(),u=o.userData,len=Math.max(1,ry.len||0),w=b.w||12,a=+ry.a||0;
      o.position.set(m.x+Math.cos(a)*len/2,SHOT_Y,m.y+Math.sin(a)*len/2);o.rotation.y=-a;
      u.core.visible=u.glow.visible=!!b.on;u.line.visible=!b.on;
      if(b.on){const fl=1+.18*Math.sin(t*47+j);u.core.scale.set(len,w*.55*fl,w*.9*fl);u.glow.scale.set(len+w*3,1,w*5.5*fl)}
      else u.line.scale.set(len,.6,2.2+1.2*Math.sin(t*26))}}
}

/* ---------- round 10: the eight newer apex paths ----------
   Fields: 'ice', 'rot', 'fire' are discs like the older kinds (their own textures, a few standing pieces in high graphics); 'wave' is a moving
   front (vx, vy: a crest of water rolling the way it travels, r = half its width); 'quake' is a fissure from x,y to x2,y2 (w = half-width, optional).
   MB.arcs = [{x1,y1,x2,y2,life,max,col?,foe?}]: jagged lightning between two points with a flash where it lands.
   Trails: a Feral Vow hero leaves ghostly paw prints, a Last Pyre hero scorched footprints; a Split Sky hero stutters after-images as it runs.
   A frozen monster that thaws or dies bursts into shards. All of it is built on first use and costs nothing until then. */
const APEX_OK={dominion:1,order:1,beasts:1,frost:1,plague:1,flame:1,storm:1,stone:1,blade:1,tide:1},APX_ALLY={packbeast:1,icewight:1,cinder:1};
const APEX_HEX={dominion:PAL.power,order:PAL.power2,beasts:0x5fe07a,frost:0x8fd8ff,plague:0x9fc414,flame:0xff6a1e,storm:0xffe74a,stone:0xe0a84a,blade:0x8fa0ff,tide:0x19d3c5};
const APEX_DISC={dominion:.45,plague:.5,stone:.45,flame:.7,beasts:.6,blade:.7};
const ALLY_HEX={packbeast:0x5fe07a,icewight:0x8fd8ff,cinder:0xff6a1e};
const hsh=i=>{const v=Math.sin(i*12.9898+7.3)*43758.5453;return v-Math.floor(v)};
let TX=null,ARCG=null;
function upTrail(o,q){o.material.opacity=o.userData.k*(1-q)*(q<.08?q*12.5:1)}
function upShard(o,q){const c=o.children,R=o.userData.r;for(let i=0;i<c.length;i++){const m=c[i],d=m.userData,k=R*.3*d.k*(1-q*q);
  m.position.set(d.x*R*(.4+2.1*q),Math.max(1,R*(.7+d.y*2.2*q-2.6*q*q)),d.z*R*(.4+2.1*q));m.rotation.set(q*d.s*7,i,q*d.s*5);m.scale.set(k,k*1.9,k)}}
function txSetup(){
  if(TX)return TX;
  const paw=fxTex(64,(g,h)=>{g.fillStyle='#fff';g.beginPath();g.ellipse(-h*.12,0,h*.34,h*.3,0,0,TAU);g.fill();
    for(const[x,y]of[[.3,-.42],[.52,-.15],[.52,.15],[.3,.42]]){g.beginPath();g.ellipse(h*x,h*y,h*.15,h*.12,0,0,TAU);g.fill()}});
  const scorch=fxTex(64,(g,h)=>{ // a charred sole with an ember edge: black stays black under the tint, the white rim takes the colour
    g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.ellipse(h*.2,0,h*.5,h*.3,0,0,TAU);g.ellipse(-h*.5,0,h*.26,h*.24,0,0,TAU);g.fill();
    g.fillStyle='rgba(0,0,0,.92)';g.beginPath();g.ellipse(h*.2,0,h*.42,h*.22,0,0,TAU);g.ellipse(-h*.5,0,h*.19,h*.17,0,0,TAU);g.fill();
    g.fillStyle='#fff';for(const[x,y]of[[.1,.05],[.36,-.08],[-.5,.03]]){g.beginPath();g.arc(h*x,h*y,h*.035,0,TAU);g.fill()}});
  const ice=ST.toon(0xcfeeff,{emissive:0x4aa8e8,emissiveIntensity:.55}),sg=new THREE.OctahedronGeometry(1,0);
  TX={paw,scorch,
    trail:new Timed(56,()=>{const m=noLine(new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:paw,transparent:true,depthWrite:false,toneMapped:false,fog:false})));m.renderOrder=1;return m}),
    shard:new Timed(4,()=>{const g=new THREE.Group();for(let i=0;i<10;i++){const m=noLine(new THREE.Mesh(sg,ice)),a=i*TAU/10+hsh(i)*.6;m.userData={x:Math.cos(a)*(.5+hsh(i+9)*.6),z:Math.sin(a)*(.5+hsh(i+9)*.6),y:.5+hsh(i+20),s:hsh(i+30)-.5,k:.6+hsh(i+40)*.8};g.add(m)}g.userData.r=16;return g})};
  return TX;
}
function trailAt(ap,x,z,a,side,foe){const T=txSetup(),paw=ap==='beasts',o=T.trail.spawn(paw?1.5:2.6),m=o.material,tex=paw?T.paw:T.scorch;
  if(m.map!==tex){m.map=tex;m.blending=paw?THREE.AdditiveBlending:THREE.NormalBlending}
  m.color.setHex(foe?PAL.foe:paw?0x5fe07a:0xff7a2a);o.userData.k=paw?.7:.95;m.opacity=0;
  o.position.set(x-Math.sin(a)*side*6,.47,z+Math.cos(a)*side*6);o.rotation.y=-a;o.scale.set(paw?17:20,1,paw?17:13)}
function shatterAt(x,z,r,low){const o=txSetup().shard.spawn(.6);o.position.set(x,0,z);o.userData.r=Math.max(10,Math.min(60,r));o.rotation.y=(x*.7+z*.3)%TAU;upShard(o,0);
  flashAt(x,r,z,r*1.2,r*5,0xdff4ff,.22,.9);if(!low)burstAt(x,r,z,r*2,r*6.5,0x8fd8ff,.26)}
// an apex ally arriving (out = 0) or going when its time is up (out = 1)
function apexAllyFx(e,out,V){const foe=!!(V&&V.foe),hex=foe?PAL.foe:ALLY_HEX[e.kind]||PAL.power2,r=e.r||12,low=Q.low;
  if(!out){flashAt(e.x,r,e.y,r,r*5.5,hex,.24,.9);if(!low)burstAt(e.x,r,e.y,r*2,r*6,hex,.22);return}
  if(e.kind==='icewight'&&!foe)shatterAt(e.x,e.y,r*1.2,low);
  else{flashAt(e.x,r+4,e.y,r*1.5,r*(e.kind==='cinder'?9:5),e.kind==='cinder'&&!foe?0xffd27a:hex,.26,1);if(!low||e.kind==='cinder')burstAt(e.x,r+4,e.y,r*2,r*(e.kind==='cinder'?10:6),hex,.26)}}
// lightning: each shape is two crossed ribbons along x (-.5 .. .5) that wander in y and z, so it shows from every side; a thin one and a wide one
function arcShape(seed,h){const n=9,pos=[],idx=[],rnd=rng(seed*7+3),py=[],pz=[];
  for(let i=0;i<=n;i++){const e=i===0||i===n?0:1;py.push((rnd()-.5)*e);pz.push((rnd()-.5)*e)}
  for(let s2=0;s2<2;s2++){const base=pos.length/3;
    for(let i=0;i<=n;i++){const x=i/n-.5;if(s2)pos.push(x,py[i],pz[i]+h,x,py[i],pz[i]-h);else pos.push(x,py[i]+h,pz[i],x,py[i]-h,pz[i])}
    for(let i=0;i<n;i++){const a=base+i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeBoundingSphere();return g}
const arcSeen=new WeakSet();
pools.arc=new Pool(()=>{if(!ARCG){ARCG=[];for(let i=0;i<3;i++)ARCG.push(arcShape(i+1,.05));for(let i=0;i<3;i++)ARCG.push(arcShape(i+1,.2))}
  const g=new THREE.Group(),core=new THREE.Mesh(ARCG[0],new THREE.MeshBasicMaterial({color:0xfffbe0,transparent:true,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,fog:false})),
    glow=new THREE.Mesh(ARCG[3],new THREE.MeshBasicMaterial({color:0xffe74a,transparent:true,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,fog:false})),
    pool=new THREE.Mesh(G.quad,flatGlowMat(0xffe74a,.4));
  pool.position.y=-SHOT_Y-8.4;pool.renderOrder=3;glow.renderOrder=5;core.renderOrder=6;g.add(glow,core,pool);g.userData={core,glow,pool};return g});
function drawArcs(list,t,low,sight){
  for(let i=0;i<list.length&&i<64;i++){const a=list[i];if(!a||typeof a!=='object')continue;
    const x1=num(a.x1,null),y1=num(a.y1,null),x2=num(a.x2,null),y2=num(a.y2,null);if(x1===null||y1===null||x2===null||y2===null)continue;
    const dx=x2-x1,dz=y2-y1,len=Math.sqrt(dx*dx+dz*dz);if(len<2)continue;
    const max=a.max>0?a.max:.2,q=clamp01(num(a.life,max)/max),foe=a.foe===true,hex=foe?PAL.foe:typeof a.col==='number'&&a.col===a.col?a.col:typeof a.col==='string'&&HEX_RE.test(a.col)?echoHex(a.col):0xffe74a;
    if(!arcSeen.has(a)){arcSeen.add(a);if(sight){flashAt(x2,SHOT_Y+9,y2,16,low?60:84,foe?PAL.foe2:0xfffbe0,.15,.95);if(!low)flashAt(x1,SHOT_Y+9,y1,10,44,hex,.12,.8)}}
    if(!sight)continue;
    const o=pools.arc.get(),u=o.userData,v=(i+Math.floor(t*22))%3,amp=Math.min(30,7+len*.14);
    o.position.set((x1+x2)/2,SHOT_Y+9,(y1+y2)/2);o.rotation.y=-Math.atan2(dz,dx);
    u.core.geometry=ARCG[v];u.glow.geometry=ARCG[3+v];u.core.scale.set(len,amp,amp);u.glow.scale.set(len,amp,amp);
    u.core.material.color.setHex(foe?0xffd9d0:0xfffbe0);u.core.material.opacity=Math.min(1,q*2.4);u.glow.material.color.setHex(hex);u.glow.material.opacity=.9*Math.min(1,q*1.6);
    u.pool.visible=!low;if(!low){u.pool.scale.set(len+34,1,40);u.pool.material.color.setHex(hex);u.pool.material.opacity=.42*q}}
}
// standing pieces for the newer fields: one instanced mesh per kind of piece, filled each frame (nothing is made until a field needs it)
const IMX={},IMK=[];
function imx(key){
  let s=IMX[key];if(s)return s;let geo,mat,n=96,shadow=false;
  if(key==='flame'){geo=new THREE.ConeGeometry(1,1,5).translate(0,.5,0);mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false});n=160}
  else if(key==='spike'||key==='fspike'){geo=new THREE.ConeGeometry(1,1,4).translate(0,.5,0);mat=ST.toonRaw(0xffffff,{emissive:key==='spike'?0x2f6aa8:0x8a1424,emissiveIntensity:.5});shadow=true}
  else if(key==='puff'){geo=new THREE.SphereGeometry(1,8,6);mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.34,depthWrite:false,toneMapped:false,fog:false});n=64}
  else{geo=new THREE.DodecahedronGeometry(1,0);mat=ST.toonRaw(0xffffff,{});shadow=true}
  const m=noLine(new THREE.InstancedMesh(geo,mat,n));m.count=0;m.frustumCulled=false;m.castShadow=shadow;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);if(key==='flame'||key==='puff')m.renderOrder=4;
  m.setColorAt(0,_col.setHex(0xffffff));m.instanceColor.setUsage(THREE.DynamicDrawUsage);fx.add(m);
  s=IMX[key]={m,n:0,max:n};IMK.push(s);return s;
}
function putI(s,x,y,z,sx,sy,sz,ry,rz,hex){if(s.n>=s.max)return;_d.position.set(x,y,z);_d.scale.set(sx,sy,sz);_d.rotation.set(0,ry,rz);_d.updateMatrix();s.m.setMatrixAt(s.n,_d.matrix);s.m.setColorAt(s.n,_col.setHex(hex).convertSRGBToLinear());s.n++}
function imxEnd(){for(let i=0;i<IMK.length;i++){const s=IMK[i],m=s.m;if(!s.n&&!m.count){m.visible=false;continue}m.count=s.n;m.visible=s.n>0;if(s.n){m.instanceMatrix.needsUpdate=true;m.instanceColor.needsUpdate=true}s.n=0}}
const waveTex={},quakeTex={};
function waveTexture(){if(waveTex.t)return waveTex.t;
  const c=mkCanvas(256,256),g=c.getContext('2d');g.translate(128,128);g.lineCap='round'; // the front faces +x: a bright crescent, streaks of foam trailing behind it
  for(let i=0;i<5;i++){g.strokeStyle='rgba(255,255,255,'+(.95-i*.19)+')';g.lineWidth=i?4-i*.5:9;g.beginPath();g.arc(-150-i*4,0,255-i*19,-.44+i*.02,.44-i*.02);g.stroke()}
  const rnd=rng(77);g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=2.5;
  for(let i=0;i<16;i++){const y=(rnd()-.5)*190,x=95-Math.abs(y)*.34-rnd()*30,l=30+rnd()*70;g.beginPath();g.moveTo(x,y);g.lineTo(x-l,y*1.04);g.stroke()}
  const gr=g.createLinearGradient(-128,0,128,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.75,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.ellipse(0,0,120,104,0,0,TAU);g.fill();
  return waveTex.t=canvasTex(c,false)}
function quakeTexture(glow){const k=glow?'g':'d';if(quakeTex[k])return quakeTex[k];
  const c=mkCanvas(512,96),g=c.getContext('2d'),rnd=rng(41),top=[],bot=[];g.translate(0,48);
  for(let i=0;i<=24;i++){const x=6+i*500/24,e=Math.sin(i/24*Math.PI),m=(rnd()-.5)*16*e,w=(glow?3:5+rnd()*9)*Math.pow(e,.6);top.push(x,m-w);bot.push(x,m+w)}
  g.fillStyle=glow?'#fff':'rgba(3,2,6,.96)';if(glow){g.shadowColor='#fff';g.shadowBlur=14}
  g.beginPath();g.moveTo(top[0],top[1]);for(let i=2;i<top.length;i+=2)g.lineTo(top[i],top[i+1]);for(let i=bot.length-2;i>=0;i-=2)g.lineTo(bot[i],bot[i+1]);g.closePath();g.fill();if(glow)g.fill();
  g.shadowBlur=0;g.strokeStyle=glow?'rgba(255,255,255,.7)':'rgba(3,2,6,.9)';g.lineWidth=glow?1.5:3;g.lineCap='round';
  for(let i=2;i<23;i+=2){const x=top[i*2],y=(top[i*2+1]+bot[i*2+1])/2,s2=i%4?1:-1,l=12+rnd()*22;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rnd()-.5)*26,y+s2*l*.6);g.lineTo(x+(rnd()-.5)*40,y+s2*l);g.stroke()}
  return quakeTex[k]=canvasTex(c,false)}
pools.wave=new Pool(()=>{const g=new THREE.Group(),tg=new THREE.TorusGeometry(1,.13,6,18,2.1).rotateZ(-1.05).rotateX(-Math.PI/2),
    floor=noLine(new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:waveTexture(),color:0x19d3c5,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}))),
    crest=noLine(new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:0x1fa8c8,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,fog:false}))),
    foam=noLine(new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:0xd8fff8,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false})));
  floor.position.y=.5;floor.renderOrder=1;crest.renderOrder=3;foam.renderOrder=4;g.add(floor,crest,foam);g.userData={floor,crest,foam};return g});
pools.quake=new Pool(()=>{const g=new THREE.Group(),
    d=noLine(new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:quakeTexture(false),transparent:true,depthWrite:false,toneMapped:false,fog:false}))),
    h=noLine(new THREE.Mesh(G.quad,new THREE.MeshBasicMaterial({map:quakeTexture(true),color:0xe0a84a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false})));
  d.position.y=.46;h.position.y=.54;d.renderOrder=1;h.renderOrder=2;g.add(d,h);g.userData={d,h};return g});
function drawWave(f,i,t,low){
  const vx=num(f.vx,0),vy=num(f.vy,0),a=vx||vy?Math.atan2(vy,vx):num(f.a,0),r=Math.max(12,num(f.r,60)),foe=f.foe===true,dur=f.dur>0?f.dur:1,k=Math.max(0,Math.min(1,num(f.t,1)*6,(dur-num(f.t,0))*3));
  const o=pools.wave.get(),u=o.userData,ca=Math.cos(a),sa=Math.sin(a),sw=1+.06*Math.sin(t*9+i);
  o.position.set(f.x,0,f.y);o.rotation.y=-a;
  u.floor.scale.set(r*1.7,1,r*2.3);u.floor.position.x=-r*.42;u.floor.material.color.setHex(foe?PAL.foe:0x19d3c5);u.floor.material.opacity=.9*k;
  const hy=Math.min(9,(16+r*.12)/(.13*r))*k*sw;
  u.crest.position.set(-r*.86,0,0);u.crest.scale.set(r,r*hy,r);u.crest.material.color.setHex(foe?0x8a1430:0x1fa8c8);u.crest.material.opacity=.62*k;
  u.foam.visible=!low;if(!low){u.foam.position.set(-r*.84,(16+r*.12)*k*sw*.92,0);u.foam.scale.set(r*1.01,r*.2,r*1.01);u.foam.material.color.setHex(foe?PAL.foe2:0xd8fff8);u.foam.material.opacity=.8*k}
  if(!low&&k>.2){const s=imx('puff');for(let j=0;j<5;j++){const q=(t*1.4+j*.2+i*.37)%1,off=(j-2)*r*.36,bx=f.x+ca*(r*(.1-.12*Math.abs(j-2)))-sa*off,bz=f.y+sa*(r*(.1-.12*Math.abs(j-2)))+ca*off,sz=(3+r*.05)*(1-q*.6)*k;
    putI(s,bx+ca*q*10,6+q*(18+r*.1),bz+sa*q*10,sz,sz,sz,0,0,foe?0xffb0a0:0xd8fff8)}}
}
function drawQuake(f,i,t,low){
  const x1=num(f.x,0),y1=num(f.y,0),x2=num(f.x2,x1+1),y2=num(f.y2,y1),dx=x2-x1,dz=y2-y1,len=Math.max(8,Math.sqrt(dx*dx+dz*dz)),a=Math.atan2(dz,dx),foe=f.foe===true,dur=f.dur>0?f.dur:1,ft=num(f.t,1);
  const open=Math.min(1,ft*7),k=Math.max(0,Math.min(1,(dur-ft)*2.5)),w=(num(f.w,num(f.r,15))*2+22)*(.55+.45*open),o=pools.quake.get(),u=o.userData,L=len*open;
  o.position.set(x1+dx/len*L/2,0,y1+dz/len*L/2);o.rotation.y=-a;
  u.d.scale.set(L*1.04,1,w);u.d.material.opacity=k;u.h.scale.set(L*1.04,1,w);u.h.material.color.setHex(foe?PAL.foe:0xe0a84a);u.h.material.opacity=k*(.5+.5*Math.max(0,1-ft*1.6))*(.8+.2*Math.sin(t*7+i));
  if(!low){const s=imx('rock'),n=Math.min(12,Math.max(3,Math.round(len/34))),px=-dz/len,pz=dx/len;
    for(let j=0;j<n;j++){const q=(j+.5)/n;if(q>open)break;const h1=hsh(j+i*13+x1*.1),side=j%2?1:-1,d=(w*.24+h1*5)*side,rise=Math.min(1,(open-q)*n*.8+.3)*k,sz=(3.6+h1*4.2)*rise;
      putI(s,x1+dx*q+px*d,sz*.5,y1+dz*q+pz*d,sz,sz*(1.1+h1*.6),sz,h1*6,side*.35,foe?0x5a2a34:j%3?0x777a84:0x9a9ca4)}}
}
// the standing pieces of a disc field (high graphics): flames on burning ground, ice teeth round frozen ground, a slow murk over a rot cloud
function fieldExtras(f,i,t,k){
  const r=f.r,foe=f.foe===true,seed=f.x*.13+f.y*.07+i;
  if(f.kind==='fire'){const s=imx('flame'),n=Math.min(14,Math.round(5+r/11));
    for(let j=0;j<n;j++){const h1=hsh(seed+j),h2=hsh(seed+j*3.1+5),a=h1*TAU,d=Math.sqrt(h2)*r*.86,fl=1+.3*Math.sin(t*13+j*2.1)+.15*Math.sin(t*29+j),hgt=(9+h2*15)*fl*k,rad=2.6+h1*2.6;
      putI(s,f.x+Math.cos(a)*d,.6,f.y+Math.sin(a)*d,rad,hgt,rad,j,0,foe?PAL.foe:0xff6a1e);
      if(j%2===0)putI(s,f.x+Math.cos(a)*d,.6,f.y+Math.sin(a)*d,rad*.5,hgt*.6,rad*.5,j,0,foe?PAL.foe2:0xffd27a)}}
  else if(f.kind==='ice'){const s=imx(foe?'fspike':'spike'),n=Math.min(12,Math.round(5+r/16)),grow=Math.min(1,f.t*4)*k;
    for(let j=0;j<n;j++){const h1=hsh(seed+j),a=j*TAU/n+h1*.5,d=r*(.74+.2*hsh(seed+j*2.3)),hgt=(9+h1*13)*grow,rad=2.4+h1*2;
      putI(s,f.x+Math.cos(a)*d,0,f.y+Math.sin(a)*d,rad,hgt,rad,-a,-.28,foe?0xffc0c8:0xcfeeff)}}
  else if(f.kind==='rot'){const s=imx('puff');
    for(let j=0;j<6;j++){const h1=hsh(seed+j),a=j*TAU/6+t*.22+h1,d=r*(.22+.5*h1),sz=r*.3*(1+.16*Math.sin(t*1.3+j*1.7))*k;
      putI(s,f.x+Math.cos(a)*d,9+5*Math.sin(t*.9+j*2),f.y+Math.sin(a)*d,sz,sz*.62,sz,0,0,foe?0x7a1c30:j%2?0x6a7414:0x4a5210)}}
}
function drawFields(fs,t,low,sight){
  for(let i=0;i<fs.length;i++){const f=fs[i];if(!f||typeof f!=='object')continue;
    if(f.kind==='wave'){if(sight)drawWave(f,i,t,low);continue}
    if(f.kind==='quake'){if(sight)drawQuake(f,i,t,low);continue}
    const kd=f.kind,nw=kd==='ice'||kd==='rot'||kd==='fire',o=pools.field.get(),m=o.material,tex=fieldTexture(kd==='frost'||kd==='halo'||kd==='rain'||kd==='domain'||nw?kd:'other',f.foe===true),k=Math.max(0,Math.min(1,f.t*5,(f.dur-f.t)*2.5));
    if(kd==='domain'){const d=pools.dark.get();d.position.x=f.x;d.position.z=f.y;d.scale.setScalar(f.r*(1+.02*Math.sin(t*2+i)));d.material.opacity=.5*Math.max(0,Math.min(1,f.t*4,(f.dur-f.t)*2))}
    else if(kd==='rot'||kd==='fire'){const d=pools.dark.get();d.position.x=f.x;d.position.z=f.y;d.scale.setScalar(f.r*.97);d.material.opacity=(kd==='rot'?.42:.36)*k}
    if(m.map!==tex)m.map=tex;o.position.x=f.x;o.position.z=f.y;o.scale.setScalar(f.r*2.1);o.rotation.y=kd==='rain'||kd==='ice'?0:kd==='fire'?Math.floor(t*7+i)*1.3:kd==='rot'?t*.1:t*(kd==='frost'?.22:-.3);
    m.opacity=nw?k*(kd==='fire'?.8+.2*Math.sin(t*17+i):.86+.1*Math.sin(t*3+i)):Math.max(0,Math.min(1,f.t*5,(f.dur-f.t)*2.5))*(.8+.14*Math.sin(t*5+i));
    if(nw&&!low&&sight&&k>0)fieldExtras(f,i,t,k)}
}

/* ---------- multiplayer: the other members of the party ----------
   MB.mp.remotes (or the test hook R.testRemotes, same shape) = [{id, name, dead, slot?, P:{x,y,face,moving,walk,hp,maxHp,inv,atk,swing,dashT,shield,skCd},
     look:{level,cls,adv,rank,pw:[b,b,b],parts,skill0Ready}, allies:[...as MB.allies, each with a stable nid], pshots:[{x,y,vx,vy,r,kind}], echoes:[...as MB.echoes]}]
   Every member is drawn exactly as the local hero is: the same player model reading a small per-member VIEW object in place of the game (its
   class, upgrade, rank and powers come from look), the same ally / pet / familiar / guardian paths (syncMap with that view), the same shots,
   echoes, slash trails and afterimages. What arrives is plain data that may be replaced by fresh objects many times a second, so nothing here
   holds on to it: each hero and each ally has a persistent copy (allies keyed by nid, else by index) whose position is eased from snapshot
   to snapshot, and whose short timers (swing, dash, blink) run on locally between snapshots.
   Identity: each member has one colour (by slot when the data carries one, else by place in the list): a broken ring with a facing notch under
   the hero, a thin ring under each of their allies, the name tag, the pip on their pets' bars and the arrow at the edge of the view.
   None of this exists until the first remote appears, and none of it runs in single-player. */
const ID_HEX=[0x4fd8ff,0xff9f1a,0x7dff5a,0xff5ad2,0xffe14a,0x6a8cff,0x3df5c0,0xd8c8ff];
const cssOf=h=>'#'+('00000'+h.toString(16)).slice(-6);
// a member's colour by index: the session's own list when it has one (MB.mp.colors, which the party list on the page uses too), else this one
function memberHex(i){i=i|0;const mp=MB.mp,c=mp&&mp.colors&&mp.colors[i];if(typeof c==='string'&&HEX_RE.test(c))return echoHex(c);return ID_HEX[((i%8)+8)%8]}
function memberColor(i){return cssOf(memberHex(i))}
const rems=[],remById=new Map(),echoAll=[];
let TFR=null,auraR=null,idTexH=null,idTexA=null,idTexHF=null,idTexAF=null,remStamp=0,PART_IX=null;
const PK={bolt:1,orb:1,skull:1,arrow:1},FPK={bolt:'fbolt',orb:'forb',skull:'fskull',arrow:'farrow'},CLS_OK={fighter:1,tank:1,assassin:1,mage:1,ranger:1,healer:1,necro:1},WORD_RE=/^[a-z]{1,24}$/,NOLOOK={};
const NAME_RE=/[\u0000-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff9-\ufffb]/g;
const num=(v,d)=>typeof v==='number'&&v===v&&v!==Infinity&&v!==-Infinity?v:d;
const sp0=r=>r.P&&typeof r.P==='object'?r.P:NOLOOK;
function cleanName(n,i){let s='';try{s=typeof n==='string'?n:n==null?'':''+n}catch(e){s=''}
  s=s.replace(NAME_RE,'').replace(/\s+/g,' ').trim();if(s.length>16)s=Array.from(s).slice(0,16).join('').trim();return s||'Player '+(i+1)}
function remSetup(){
  if(TFR)return;
  // the same timed effects the local hero has, enough of them for seven more
  TFR={
    slash:new Timed(16,()=>{const g=new THREE.Group(),a=new THREE.Mesh(G.quad,addMat(slashTex,PAL.power)),b=new THREE.Mesh(G.quad,addMat(slashTex,PAL.power2));b.scale.setScalar(.9);b.position.y=.6;a.renderOrder=b.renderOrder=7;g.add(a,b);g.userData.a=a;g.userData.b=b;return g}),
    ghost:new Timed(48,()=>{const m=new THREE.Mesh(GHOST_GEO,new THREE.MeshBasicMaterial({color:PAL.power,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,toneMapped:false}));m.renderOrder=6;return m}),
    streak:new Timed(8,()=>{const m=new THREE.Mesh(G.quad,flatGlowMat(PAL.power,.8));m.renderOrder=6;return m}),
    flash:new Timed(20,()=>new THREE.Sprite(addMat(flareTex,0xffffff,true)))};
  auraR=makePoints(384);auraR.mat.blending=THREE.AdditiveBlending;auraR.mat.uniforms.uScale.value=bitsP.mat.uniforms.uScale.value;pointSets.push(auraR);
  const ring=(g,h,R,lw,parts,gap,ink)=>{g.lineCap='butt';
    for(let pass=0;pass<2;pass++){g.strokeStyle=pass?'#fff':'rgba(0,0,0,'+ink+')';g.lineWidth=pass?lw:lw+h*.07;
      for(let i=0;i<parts;i++){const a=i*TAU/parts;g.beginPath();g.arc(0,0,R,a+gap,a+TAU/parts-gap);g.stroke()}}};
  // hero: a ring broken in three with a notch pointing the way the hero faces (+x of the texture)
  idTexH=fxTex(128,(g,h)=>{ring(g,h,h*.8,h*.085,3,.2,.5);
    g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.moveTo(h*.99,0);g.lineTo(h*.74,h*.17);g.lineTo(h*.74,-h*.17);g.closePath();g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(h*.95,0);g.lineTo(h*.78,h*.11);g.lineTo(h*.78,-h*.11);g.closePath();g.fill();
    g.globalAlpha=.55;g.strokeStyle='#fff';g.lineWidth=h*.022;g.beginPath();g.arc(0,0,h*.62,0,TAU);g.stroke()});
  // ally: a thin ring in two halves with a bead on each gap
  idTexA=fxTex(128,(g,h)=>{ring(g,h,h*.86,h*.06,2,.16,.45);g.fillStyle='#fff';for(const a of[0,Math.PI]){g.beginPath();g.arc(Math.cos(a)*h*.86,Math.sin(a)*h*.86,h*.055,0,TAU);g.fill()}});
  // versus, an opponent: a heavier ring broken in four with a fang driven inward through each gap and the facing notch; nothing on it is round
  const fang=(g,h,r0,r1,w,ink)=>{for(let pass=0;pass<2;pass++){g.fillStyle=pass?'#fff':'rgba(0,0,0,'+ink+')';const e=pass?0:h*.035;
    g.beginPath();g.moveTo(r0+e,-w-e);g.lineTo(r1-e*1.6,0);g.lineTo(r0+e,w+e);g.closePath();g.fill()}};
  idTexHF=fxTex(128,(g,h)=>{ring(g,h,h*.8,h*.12,4,.3,.6);
    for(let i=1;i<4;i++){g.save();g.rotate(i*TAU/4);if(i)fang(g,h,h*.9,h*.5,h*.12,.6);g.restore()}
    g.fillStyle='rgba(0,0,0,.6)';g.beginPath();g.moveTo(h*.995,0);g.lineTo(h*.7,h*.2);g.lineTo(h*.7,-h*.2);g.closePath();g.fill();
    g.fillStyle='#fff';g.beginPath();g.moveTo(h*.96,0);g.lineTo(h*.74,h*.14);g.lineTo(h*.74,-h*.14);g.closePath();g.fill();
    g.globalAlpha=.7;g.strokeStyle='#fff';g.lineWidth=h*.03;g.setLineDash([h*.09,h*.07]);g.beginPath();g.arc(0,0,h*.58,0,TAU);g.stroke();g.setLineDash([])});
  // an opponent's creature: a thin ring of six thorns
  idTexAF=fxTex(128,(g,h)=>{ring(g,h,h*.84,h*.045,6,.1,.45);for(let i=0;i<6;i++){g.save();g.rotate(i*TAU/6);fang(g,h,h*.85,h*.99,h*.065,.45);g.restore()}});
}
const newSm=()=>({init:false,x:0,y:0,w:0,l:0,fx:0,fy:0,fw:0,fl:0,tx:0,ty:0,tw:0,tl:0,T:0,el:0,since:0,iv:.083});
// ease a position (and a walk phase and a lift) from one snapshot to the next. A new target starts a straight run from where the thing is drawn
// now, timed by how often targets have been arriving; data that already moves every frame is simply followed; a big jump (blink, new level) snaps.
function chase(sm,tx,ty,tw,tl,dt,snap){
  if(!sm.init){sm.init=true;sm.x=sm.fx=sm.tx=tx;sm.y=sm.fy=sm.ty=ty;sm.w=sm.fw=sm.tw=tw;sm.l=sm.fl=sm.tl=tl;sm.T=0;sm.since=0;return}
  sm.since+=dt;
  if(tx!==sm.tx||ty!==sm.ty||tw!==sm.tw||tl!==sm.tl){
    const dx=tx-sm.tx,dy=ty-sm.ty;
    if(dx*dx+dy*dy>snap*snap||Math.abs(tw-sm.tw)>30){sm.x=tx;sm.y=ty;sm.w=tw;sm.l=tl;sm.T=0}
    else{if(sm.since<.25)sm.iv+=(Math.max(.004,sm.since)-sm.iv)*.35;sm.fx=sm.x;sm.fy=sm.y;sm.fw=sm.w;sm.fl=sm.l;sm.T=sm.iv;sm.el=0}
    sm.tx=tx;sm.ty=ty;sm.tw=tw;sm.tl=tl;sm.since=0;
  }
  if(sm.T>0){sm.el+=dt;const q=sm.el>=sm.T?1:sm.el/sm.T;sm.x=sm.fx+(sm.tx-sm.fx)*q;sm.y=sm.fy+(sm.ty-sm.fy)*q;sm.w=sm.fw+(sm.tw-sm.fw)*q;sm.l=sm.fl+(sm.tl-sm.fl)*q;if(q>=1)sm.T=0}
  else{sm.x=sm.tx;sm.y=sm.ty;sm.w=sm.tw;sm.l=sm.tl}
}
// a countdown that arrives in steps: it runs on here between snapshots and takes the sent value only when a new one disagrees
function runTimer(tm,k,rk,raw,dt){let v=tm[k]-dt;if(v<0)v=0;raw=num(raw,0);if(raw<0)raw=0;
  if(raw!==tm[rk]){tm[rk]=raw;if(raw>v+.045||raw<v-.08)v=raw}
  return tm[k]=v}
function remNew(id){
  const P={x:W/2,y:H/2,face:Math.PI/2,swing:Math.PI/2,moving:false,walk:0,hp:1,maxHp:1,inv:0,atk:0,dashT:0,shield:0,skCd:0,auraR:0,blades:undefined,plates:undefined,pack:undefined,haste:0};
  const S={adv:null,rank:'',level:0,mode:'play',t:0,cls:null,paused:false,apex:null},sk0={unlocked:true,ready:false};
  // the view: everything the models ask the game about their owner, answered for this member
  const V={S,P,remote:true,foe:false,apex:null,parts:7,pwA:null,skills:[sk0],sk0,settings:MB.settings,melee:MB.melee,col:MB.col,
    has(p){if(!PART_IX){PART_IX={};const a=MB.PARTS||[];for(let i=0;i<a.length;i++)PART_IX[a[i]&&a[i].id||a[i]]=i}const i=PART_IX[p];return i===undefined?true:i<V.parts},
    cls(){return S.cls},pw(i){const a=V.pwA;return !!(a&&a[i-1])},rank(){return S.rank},
    get mons(){return MB.mons},get allies(){return rm.allyList},get boss(){return MB.boss}};
  const rm={id,idx:0,i:0,stamp:0,foe:false,foeTex:false,team:-1,V,P,sm:newSm(),tm:{atk:0,ratk:0,dashT:0,rdashT:0,inv:0,rinv:0},rec:null,fx:{prevAtk:0,dir:1,ghostT:0,px:0,py:0,init:false,foe:false,stT:0,stN:0,trD:0,trN:0},packN:0,
    allyMap:new Map(),allyList:[],allyRecs:new Map(),aStamp:0,echo:[],eStamp:0,psRef:null,psX:NaN,psN:0,psAge:0,
    name:'',initial:'?',nameW:0,nameAt:-9,rawName:undefined,nameI:-1,dead:false,fall:0,vis:false,rankK:0,apexC:null,
    mat:null,matA:null,mark:null,marks:null,disc:null,beacon:null,hex:-1,css:'#ffffff',soft:'#ffffff'};
  return rm;
}
const MARKS=48;
function remColour(rm,hex){
  if(rm.hex===hex)return;
  rm.hex=hex;rm.css=cssOf(hex);rm.soft='#'+_col.setHex(hex).lerp(_c0.setHex(0xffffff),.45).getHexString();
  if(!rm.mat){
    const mk=tex=>new THREE.MeshBasicMaterial({map:tex,color:hex,transparent:true,opacity:.92,depthWrite:false,toneMapped:false,fog:false});
    rm.mat=mk(idTexH);rm.matA=mk(idTexA);
    rm.mark=noLine(new THREE.Mesh(G.quad,rm.mat));rm.mark.renderOrder=2;rm.mark.position.y=1;
    rm.marks=noLine(new THREE.InstancedMesh(G.quad,rm.matA,MARKS));rm.marks.count=0;rm.marks.frustumCulled=false;rm.marks.renderOrder=2;rm.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rm.disc=new THREE.Mesh(G.quad,flatGlowMat(PAL.power,.2));rm.disc.position.y=.62;rm.disc.renderOrder=1;rm.disc.visible=false;
    rm.beacon=new THREE.Sprite(glowMat(hex,.4));rm.beacon.visible=false;
    fx.add(rm.mark,rm.marks,rm.disc,rm.beacon);
  }else{rm.mat.color.setHex(hex);rm.matA.color.setHex(hex);rm.beacon.material.color.setHex(hex)}
}
function remDrop(rm){
  if(rm.rec){ents.remove(rm.rec.g);if(rm.rec.real){const M=modelOf('player');if(M&&typeof M.dispose==='function')try{M.dispose(rm.rec.g)}catch(e){}}rm.rec=null}
  for(const rec of rm.allyMap.values())dropEnt(rec);rm.allyMap.clear();rm.allyRecs.clear();rm.allyList.length=0;rm.echo.length=0;
  if(rm.mat){fx.remove(rm.mark,rm.marks,rm.disc,rm.beacon);rm.marks.dispose();rm.mat.dispose();rm.matA.dispose();rm.disc.material.dispose();rm.beacon.material.dispose();rm.mat=null}
}
// does this incoming ally still describe the body its persistent copy was built as?
function sameBody(q,a){const s=a.s&&typeof a.s==='object'?a.s:NOLOOK;
  return q.kind===a.kind&&q.ai===a.ai&&q.owner===a.owner&&q.pet===!!a.pet&&q.minion===!!a.minion&&q.trophy===!!a.trophy&&q.col===s.col&&q.eyes===s.eyes&&q.legs===s.legs&&q.spikes===s.spikes}
function remAllies(rm,src,dt){
  const list=rm.allyList,recs=rm.allyRecs,st=++rm.aStamp,foe=rm.foe;let n=0;
  for(let i=0;i<src.length&&n<96;i++){
    const a=src[i];if(!a||typeof a!=='object'||num(a.x,null)===null||num(a.y,null)===null)continue;
    let key=a.nid;if(key==null||typeof key==='object'||key!==key)key=-1-i;
    let q=recs.get(key);
    if(q&&q.stamp===st){key=-1001-i;q=recs.get(key)} // the same nid twice in one list: the second goes by its place
    if(!q||q.foe!==foe||!sameBody(q,a)){const s=a.s&&typeof a.s==='object'?a.s:NOLOOK;
      q={pe:{},sm:newSm(),stamp:0,foe,kind:a.kind,ai:a.ai,owner:a.owner,pet:!!a.pet,minion:!!a.minion,trophy:!!a.trophy,col:s.col,eyes:s.eyes,legs:s.legs,spikes:s.spikes};recs.set(key,q)}
    q.stamp=st;const pe=q.pe;
    for(const k in a)pe[k]=a[k];
    for(const k in pe)if(!(k in a))pe[k]=undefined;
    if(foe)pe.foe=true; // versus: the models build an opponent's creature without the friendly ground mark, lights and eyes
    chase(q.sm,a.x,a.y,num(a.walk,0),num(a.lift,0),dt,170);
    pe.x=q.sm.x;pe.y=q.sm.y;pe.lift=q.sm.l;if(typeof a.walk==='number')pe.walk=q.sm.w;
    if(typeof pe.r!=='number'||!(pe.r>0))pe.r=pe.s&&pe.s.r>0?+pe.s.r:pe.kind==='thrall'||pe.kind==='wolf'?10:16;
    list[n++]=pe;
  }
  list.length=n;
  if(recs.size>n)for(const[k,q]of recs)if(q.stamp!==st)recs.delete(k);
}
// echoes are short and stand still: one is recognised from snapshot to snapshot by its nid, or else by what and where it is
function remEchoes(rm,src,dt){
  const mine=rm.echo,st=++rm.eStamp;let n=0;
  for(let i=0;i<src.length&&n<10;i++){
    const e=src[i];if(!e||typeof e!=='object'||num(e.x,null)===null||num(e.y,null)===null)continue;
    const life=num(e.life,-1);let pe=null;
    for(let j=0;j<mine.length;j++){const q=mine[j];if(q.stamp===st)continue;
      if(e.nid!=null?q.nid===e.nid:(q.ai===e.ai&&q.x===e.x&&q.y===e.y&&!(life>q.raw+.05))){pe=q;break}}
    if(!pe){pe={ai:e.ai,s:e.s,x:e.x,y:e.y,ang:e.ang,life:life<0?undefined:life,max:e.max,owner:e.owner,col:rm.foe?CSS.foe:e.col,seed:e.seed,nid:e.nid,raw:life,stamp:0};mine.push(pe)}
    else if(life!==pe.raw){pe.raw=life;if(life>=0)pe.life=life}
    else if(typeof pe.life==='number')pe.life=Math.max(0,pe.life-dt);
    pe.stamp=st;n++;
  }
  if(mine.length>n){let k=0;for(let j=0;j<mine.length;j++)if(mine[j].stamp===st)mine[k++]=mine[j];mine.length=k}
}
function echoMerge(){
  const own=R.testEchoes||MB.echoes||NONE;echoAll.length=0;
  for(let i=0;i<own.length;i++)echoAll.push(own[i]);
  for(let i=0;i<rems.length;i++){const e=rems[i].echo;for(let j=0;j<e.length;j++)echoAll.push(e[j])}
  return echoAll;
}
// a hero that is down: tipped onto its back about its feet, and slid so the body lies centred on the spot where it stood
function layDown(g,P,f){const e=easeOut(f),ry=g.rotation.y;g.rotation.x=-e*(Math.PI/2-.07);g.position.set(P.x+Math.sin(ry)*30*e,4.2*f,P.y+Math.cos(ry)*30*e)}
function markAt(im,n,x,z,size,ry){_d.position.set(x,1,z);_d.scale.set(size,1,size);_d.rotation.set(0,ry,0);_d.updateMatrix();im.setMatrixAt(n,_d.matrix)}
function syncRemotes(list,dt,sight){
  const S0=MB.S,t=S0.t,low=Q.low,play=S0.mode==='play',LP=MB.P,st=++remStamp;
  if(list.length)remSetup();
  for(let i=0;i<list.length&&i<16;i++){
    const r=list[i];if(!r||typeof r!=='object')continue;
    const id=r.id==null?'#'+i:r.id;let rm=remById.get(id);
    if(!rm){rm=remNew(id);remById.set(id,rm);rems.push(rm)}
    if(rm.stamp===st)continue;rm.stamp=st;rm.i=i;
    const slot=num(r.idx,num(r.slot,null)),foe=r.foe===true,team=num(r.team,-1);rm.foe=foe;rm.team=team;rm.idx=slot===null?i:slot|0;
    remColour(rm,VS.on?vsHex(rm.idx,team):memberHex(rm.idx));
    if(foe!==rm.foeTex){rm.foeTex=foe;rm.mat.map=foe?idTexHF:idTexH;rm.matA.map=foe?idTexAF:idTexA;rm.fx.foe=foe;rm.V.foe=foe;rm.apexC=0}
    if(r.name!==rm.rawName||i!==rm.nameI){rm.rawName=r.name;rm.nameI=i;rm.name=cleanName(r.name,slot===null?i+1:slot|0);rm.initial=Array.from(rm.name)[0].toUpperCase();rm.nameAt=-9}
    // who they are
    const L=r.look&&typeof r.look==='object'?r.look:NOLOOK,V=rm.V,S=V.S,P=rm.P,dead=!!r.dead;
    S.cls=typeof L.cls==='string'&&CLS_OK[L.cls]===1?L.cls:null;S.adv=S.cls&&typeof L.adv==='string'&&WORD_RE.test(L.adv)?L.adv:null;
    S.rank=typeof L.rank==='string'&&L.rank.length<6?L.rank:'';S.level=num(L.level,S0.level);S.mode=S0.mode;S.t=t;
    V.parts=typeof L.parts==='number'?L.parts:7;V.pwA=Array.isArray(L.pw)?L.pw:null;
    S.apex=V.apex=S.cls&&typeof L.apex==='string'&&APEX_OK[L.apex]===1?L.apex:null;
    // what the newer paths show of a hero's state: sent with P (or look), else a default the model picks; the pack is counted from their allies when not sent
    P.blades=num(sp0(r).blades,num(L.blades,undefined));P.plates=num(sp0(r).plates,num(L.plates,undefined));P.haste=num(sp0(r).haste,0);P.pack=num(sp0(r).pack,num(L.pack,rm.packN));
    // where they are and what they are doing
    const sp=r.P&&typeof r.P==='object'?r.P:NOLOOK,tm=rm.tm;
    if(num(sp.x,null)!==null&&num(sp.y,null)!==null)chase(rm.sm,sp.x,sp.y,num(sp.walk,0),0,dt,130);
    if(rm.sm.init){P.x=rm.sm.x;P.y=rm.sm.y;P.walk=rm.sm.w}
    P.face=num(sp.face,P.face);P.swing=num(sp.swing,P.face);P.moving=!!sp.moving&&!dead;
    P.maxHp=Math.max(1,num(sp.maxHp,P.maxHp));P.hp=Math.max(0,Math.min(P.maxHp,num(sp.hp,P.hp)));P.shield=sp.shield===true?1:num(sp.shield,0);P.skCd=num(sp.skCd,0);
    // the order aura: the radius the member sends (P.auraR, or look.auraR), else our own when we walk the same path, else a plain default
    P.beam=!dead&&sp.beam&&typeof sp.beam==='object'?sp.beam:null;P.ascT=num(sp.ascT,0);if(P.beam&&!r.away)heroBeam(P,t,foe);
    P.auraR=S.apex==='order'&&!dead?Math.max(0,Math.min(400,num(sp.auraR,num(L.auraR,LP&&LP.auraR>0?LP.auraR:96)))):0;
    P.atk=runTimer(tm,'atk','ratk',sp.atk,dt);P.dashT=runTimer(tm,'dashT','rdashT',sp.dashT,dt);P.inv=runTimer(tm,'inv','rinv',sp.inv,dt);
    if(dead){P.atk=P.dashT=P.inv=tm.atk=tm.dashT=tm.inv=0}
    V.sk0.ready=!dead&&(L.skill0Ready===undefined?V.pw(2)&&P.skCd<=0:!!L.skill0Ready);
    rm.dead=dead;rm.fall+=((dead?1:0)-rm.fall)*Math.min(1,dt*(dead?5:9));
    const away=!!r.away;let hide=!rm.sm.init||away;
    if(!hide&&!sight&&LP){const dx=P.x-LP.x,dy=P.y-LP.y,lim=fogR+22;if(dx*dx+dy*dy>lim*lim)hide=true}
    rm.vis=!hide;
    // the hero
    if(!rm.rec)rm.rec=makeEnt('player',P,phPlayer,V);
    rm.rec.g.position.set(P.x,0,P.y);rm.rec.g.visible=!hide;
    updateEnt(rm.rec,'player',P,dt,phPlayer,phPlayerUpdate);
    const g=rm.rec.g,f=rm.fall;
    // down: the body lies where it fell, on its back, and a pale column of the member's colour stands over it
    g.rotation.order='YXZ';if(f>.002)layDown(g,P,f);else g.rotation.x=0;
    if(low&&!hide){const b=pools.blob.get();b.position.set(P.x,.55,P.y);b.scale.set(70+30*f,1,56+30*f)}
    const F=rm.fx;
    if(!F.init||!play||dead||hide){F.init=true;F.px=P.x;F.py=P.y;F.prevAtk=P.atk;F.ghostT=0}
    else heroFx(F,P,S.cls,dt,sight,low,TFR,S.apex);
    // their allies, through the same path as ours
    remAllies(rm,!away&&Array.isArray(r.allies)?r.allies:NONE,dt);
    syncMap(rm.allyMap,rm.allyList,'ally',dt,phAlly,phAllyUpdate,true,V);
    const al=rm.allyList;
    allyBeams(al,t,foe);
    if(sight&&!hide&&!dead)for(let j=0;j<al.length;j++){const a=al[j];if(a.kind!=='guardian'||!(a.shield===true||a.shield>0))continue;
      const o=pools.ward.get();o.position.x=P.x;o.position.z=P.y;o.scale.setScalar(27+1.5*Math.sin(t*4+i));o.rotation.y=t*.8+i;o.material.opacity=.5+.15*Math.sin(t*4+i);o.material.color.setHex(foe?PAL.foe:PAL.holy);break}
    // identity marks: the notched ring under the hero, a thin ring under every ally
    const mk=rm.mark,pulse=dead?1+.1*Math.sin(t*5+i):1;
    mk.visible=!hide;mk.position.x=P.x;mk.position.z=P.y;mk.scale.setScalar((foe?90:74)*pulse);mk.rotation.y=dead?t*.7:g.rotation.y-Math.PI/2;rm.mat.opacity=dead?.5+.3*Math.sin(t*5+i):.92;
    // versus: a pool of the fighter's colour on the floor under the ring (brighter under an opponent), so the colour carries at any size
    if(VS.on&&!hide&&!dead&&sight){const o=pools.vglow.get();o.position.x=P.x;o.position.z=P.y;o.scale.setScalar(foe?150+8*Math.sin(t*3+i):118);o.material.color.setHex(rm.hex);o.material.opacity=foe?.5:.3}
    {const im=rm.marks;let n=0,pk=0;
      for(let j=0;j<al.length;j++)if(al[j].kind==='packbeast')pk++;rm.packN=pk;
      for(let j=0;j<al.length&&n<MARKS;j++){const a=al[j];if(a.hidden||a.dead||a.hp<=0)continue;
        const r0=a.r||12,rad=a.kind==='guardian'?r0*1.5+7:a.kind==='familiar'?19:a.pet||a.s?(a.minion?r0*1.7+5:r0*2.05+9):r0+8;
        markAt(im,n++,a.x,a.y,rad*(foe?2.4:2.33),t*(j%2?.5:-.5)+j)}
      im.count=n;im.visible=n>0;if(n)im.instanceMatrix.needsUpdate=true}
    const bc=rm.beacon;bc.visible=f>.05&&!hide;if(bc.visible){bc.position.set(P.x,46,P.y);bc.scale.set(26+4*Math.sin(t*3+i),150,1);bc.material.opacity=(.62+.14*Math.sin(t*3+i))*f}
    // their shots: drawn where the last snapshot put them, carried on along their flight until the next one
    {const ps=!away&&Array.isArray(r.pshots)?r.pshots:NONE,p0=ps.length?ps[0]:null,x0=p0?p0.x:NaN;
      if(ps!==rm.psRef||x0!==rm.psX||ps.length!==rm.psN){rm.psRef=ps;rm.psX=x0;rm.psN=ps.length;rm.psAge=0}else rm.psAge=Math.min(.3,rm.psAge+dt);
      for(let j=0;j<ps.length&&j<160;j++){const p=ps[j];if(!p||num(p.x,null)===null||num(p.y,null)===null)continue;
        drawPshot(p,j,p.x+num(p.vx,0)*rm.psAge,p.y+num(p.vy,0)*rm.psAge,t,low,pools[foe?FPK[p.kind]||'fbolt':PK[p.kind]===1?p.kind:'bolt'])}}
    remEchoes(rm,!away&&Array.isArray(r.echoes)?r.echoes:NONE,dt);
    // power rising off them, as it does off the local hero
    {let k=0;const ap=S.apex;if(S.cls&&play&&sight&&!dead&&!hide){const rk=S.rank;k=ap||(rk&&rk[0]==='X')?1.25:rk&&rk[0]==='S'?1:RANK_K[rk]||.12}
      rm.rankK+=(k-rm.rankK)*Math.min(1,dt*2);const rk=rm.rankK,d=rm.disc,c=FX.clock;
      d.visible=rk>.02&&!hide;if(d.visible){if(ap!==rm.apexC){rm.apexC=ap;d.material.color.setHex(foe?PAL.foe:APEX_HEX[ap]||PAL.power)}
        d.position.x=P.x;d.position.z=P.y;d.scale.setScalar(64+52*Math.min(1,rk)+4*Math.sin(c*3+i));d.material.opacity=(.1+.2*Math.min(1,rk)+.03*Math.sin(c*5+i))*(APEX_DISC[ap]||1)}}
  }
  // members who have left
  for(let i=rems.length-1;i>=0;i--){const rm=rems[i];if(rm.stamp!==st){remDrop(rm);remById.delete(rm.id);rems.splice(i,1)}}
  // one cloud of rising motes for all of them
  {const pos=auraR.pos,col=auraR.col,size=auraR.size,c=FX.clock;let k=0;
    for(let m=0;m<rems.length;m++){const rm=rems[m],rk=rm.rankK,P=rm.P,n=rk<.02||!rm.vis?0:Math.min(48,Math.round((low?3:8)+(low?9:40)*rk)),AC=rm.foe?FOE_COL:APEX_COL[rm.V.S.apex||''];
      for(let i=0;i<n&&k<384;i++,k++){const a=i*2.399+c*(.5+i%3*.22)+m,rad=9+(i*7%19)+6*Math.sin(c*1.3+i),h=(i*17.3+c*(20+i%5*7+26*rk)+m*9)%(54+34*rk),q=h/(54+34*rk);
        pos[k*3]=P.x+Math.cos(a)*rad;pos[k*3+1]=3+h;pos[k*3+2]=P.y+Math.sin(a)*rad*.8;
        const hot=i%4===0,o=hot?3:0;col[k*4]=AC[o];col[k*4+1]=AC[o+1];col[k*4+2]=AC[o+2];col[k*4+3]=Math.sin(q*Math.PI)*(.5+.4*Math.min(1,rk));size[k]=(hot?1.5:2.1)+rk*1.1+(i%3)*.4}}
    auraR.geo.setDrawRange(0,k);
    if(k){auraR.geo.attributes.position.needsUpdate=true;auraR.geo.attributes.aCol.needsUpdate=true;auraR.geo.attributes.aSize.needsUpdate=true}}
}
// where the page's touch controls (stick, buttons) lie over the view, in overlay units: an edge badge is nudged out from under them. Measured twice a second.
const edgeX=new Float32Array(16),edgeY=new Float32Array(16);let edgeN=0;
const TAG_FONT='700 14px '+FONT,TAG_FONT_S='700 11px '+FONT;
const padBox=[{on:false,x0:0,y0:0,x1:0,y1:0},{on:false,x0:0,y0:0,x1:0,y1:0}];let padAt=-1,padEls;
function padBoxes(){
  const W=OV.w,H=OV.h;
  const now=MB.S.t;if(now>=padAt&&now-padAt<.5)return;padAt=now;
  try{
    if(padEls===undefined)padEls=[document.getElementById('pad'),document.querySelector('.touch .acts')];
    const c=cv.getBoundingClientRect();
    for(let i=0;i<2;i++){const b=padBox[i],el=padEls[i],r=el&&c.width>0?el.getBoundingClientRect():null;
      b.on=!!(r&&r.width>0&&r.height>0&&r.right>c.left&&r.left<c.right&&r.bottom>c.top&&r.top<c.bottom);
      if(b.on){b.x0=(r.left-c.left)/c.width*W;b.x1=(r.right-c.left)/c.width*W;b.y0=(r.top-c.top)/c.height*H;b.y1=(r.bottom-c.top)/c.height*H}}
  }catch(e){padBox[0].on=padBox[1].on=false}
}
// overlay: name and health over each member, bars over their pets, and an arrow at the edge of the view toward anyone out of frame
function remoteOverlay(MM,sight){
  const W=OV.w,H=OV.h;
  const top=hudBottom(),now=MB.S.t;edgeN=0;
  for(let m=0;m<rems.length;m++){const al=rems[m].allyList,css=rems[m].css,foe=rems[m].foe;for(let i=0;i<al.length;i++)petBar(al[i],MM,css,foe)}
  ctx.save();ctx.textBaseline='alphabetic';ctx.lineJoin='round';
  for(let m=0;m<rems.length;m++){
    const rm=rems[m];if(!rm.vis)continue;
    const P=rm.P,css=rm.css,soft=rm.soft,dead=rm.dead,foe=rm.foe;
    v3.set(P.x,dead?26:76,P.y).project(camera);
    let nx=v3.x,ny=v3.y;const behind=v3.z>1;if(behind){nx=-nx;ny=-ny}
    const px=(nx*.5+.5)*W,py=(.5-ny*.5)*H;
    if(!behind&&px>-6&&px<W+6&&py>-4&&py<H+34){
      // over the head: the name in the member's colour, then a small health bar
      ctx.textAlign='center';ctx.font=TAG_FONT;ctx.globalAlpha=dead?.75:1;
      if(now-rm.nameAt>2||now<rm.nameAt){rm.nameAt=now;rm.nameW=ctx.measureText(rm.name).width} // measured now and then (the page's font may arrive late)
      const hw=Math.max(27,Math.min(60,rm.nameW/2))+4,bw=46,by=Math.max(top+19,Math.min(H-8,py-5)),x=Math.max(hw,Math.min(W-hw,px)),bx=x-bw/2;
      if(foe&&!dead){ // an opponent: the name in their colour under a chevron that points down at them, the bar slanted and filled with the colour
        const q=Math.max(0,Math.min(1,P.hp/P.maxHp)),fw=58,fx0=x-fw/2,bob=1.5*Math.sin(now*5+m);
        ctx.lineWidth=3.5;ctx.strokeStyle=CSS.ink;ctx.strokeText(rm.name,x,by-7,120);ctx.fillStyle=css;ctx.fillText(rm.name,x,by-7,120);
        ctx.beginPath();ctx.moveTo(x-8,by-30+bob);ctx.lineTo(x+8,by-30+bob);ctx.lineTo(x,by-21+bob);ctx.closePath();ctx.lineWidth=3;ctx.strokeStyle=CSS.ink;ctx.stroke();ctx.fillStyle=css;ctx.fill();
        ctx.beginPath();ctx.moveTo(fx0-1,by-3);ctx.lineTo(fx0+fw+5,by-3);ctx.lineTo(fx0+fw+1,by+7);ctx.lineTo(fx0-5,by+7);ctx.closePath();ctx.fillStyle='rgba(8,8,12,.9)';ctx.fill();
        ctx.fillStyle='#2a0c14';ctx.fillRect(fx0,by-.5,fw,5);ctx.fillStyle=css;ctx.fillRect(fx0,by-.5,fw*q,5);
        ctx.fillStyle='rgba(8,8,12,.75)';for(let j=1;j<4;j++)ctx.fillRect(fx0+fw*j/4-.5,by-.5,1,5);
        ctx.lineWidth=1.2;ctx.strokeStyle=CSS.foe;ctx.stroke();
        ctx.globalAlpha=1;continue}
      ctx.lineWidth=3.5;ctx.strokeStyle=CSS.ink;ctx.strokeText(rm.name,x,by-5,120);ctx.fillStyle=dead?CSS.dim:soft;ctx.fillText(rm.name,x,by-5,120);
      if(dead){ctx.font=TAG_FONT_S;spaced(1.5);ctx.lineWidth=3;ctx.strokeText('DOWN',x,by+7);ctx.fillStyle=CSS.foe;ctx.fillText('DOWN',x,by+7);spaced(0)}
      else{const q=Math.max(0,Math.min(1,P.hp/P.maxHp));
        ctx.fillStyle='rgba(8,8,12,.85)';ctx.fillRect(bx-2,by-2,bw+4,8);ctx.fillStyle='#1c1a30';ctx.fillRect(bx,by,bw,4);
        ctx.fillStyle=q<.3?CSS.foe:CSS.bone;ctx.fillRect(bx,by,bw*q,4);
        ctx.strokeStyle=css;ctx.lineWidth=1;ctx.strokeRect(bx-1.5,by-1.5,bw+3,7)}
      ctx.globalAlpha=1;
    }else if(!VS.on||(VS.teams?!foe:true)){
      // out of frame: a badge on the edge of the view, on the line from the middle of the screen to where they are
      // (versus: every opponent in a free-for-all, team-mates only in a team match)
      const cx=W/2,cy=H/2,x0=26,x1=W-26,y0=Math.max(26,top+24),y1=H-26;let dx=px-cx,dy=py-cy;
      if(Math.abs(dx)<.01&&Math.abs(dy)<.01)dy=1;
      let k=1e9;if(dx>0)k=Math.min(k,(x1-cx)/dx);else if(dx<0)k=Math.min(k,(x0-cx)/dx);if(dy>0)k=Math.min(k,(y1-cy)/dy);else if(dy<0)k=Math.min(k,(y0-cy)/dy);
      let ex=cx+dx*k;const ey=cy+dy*k,a=Math.atan2(dy,dx),q=dead?0:Math.max(0,Math.min(1,P.hp/P.maxHp));
      padBoxes();for(let j=0;j<2;j++){const b=padBox[j];if(b.on&&ex>b.x0-22&&ex<b.x1+22&&ey>b.y0-16&&ey<b.y1+16)ex=(b.x0+b.x1)/2<cx?Math.min(cx,b.x1+24):Math.max(cx,b.x0-24)}
      let ey2=ey;
      if(VS.on){ // versus: badges that would lie on one another step along the edge
        const side=Math.abs(ex-x0)<2||Math.abs(ex-x1)<2;
        for(let pass=0;pass<8;pass++){let hit=false;for(let j=0;j<edgeN;j++)if(Math.abs(ex-edgeX[j])<32&&Math.abs(ey2-edgeY[j])<32){hit=true;break}
          if(!hit)break;if(side)ey2=ey2+33>y1?ey2-33*(pass+1):ey2+33;else ex=ex+33>x1?ex-33*(pass+1):ex+33}
        if(edgeN<16){edgeX[edgeN]=ex;edgeY[edgeN]=ey2;edgeN++}}
      ctx.save();ctx.translate(ex,ey2);ctx.globalAlpha=.95;
      if(foe){ // an opponent out of frame: a diamond, filled from the bottom with what health they have left
        ctx.rotate(a);ctx.beginPath();ctx.moveTo(27,0);ctx.lineTo(16,-8);ctx.lineTo(16,8);ctx.closePath();ctx.fillStyle=css;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=CSS.ink;ctx.stroke();ctx.rotate(-a);
        ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(15,0);ctx.lineTo(0,15);ctx.lineTo(-15,0);ctx.closePath();ctx.fillStyle='rgba(11,10,22,.92)';ctx.fill();
        if(q>0){ctx.save();ctx.clip();ctx.globalAlpha=.5;ctx.fillStyle=css;ctx.fillRect(-15,15-30*q,30,30*q);ctx.restore()}
        ctx.lineWidth=2.5;ctx.strokeStyle=css;ctx.stroke();
        if(dead){ctx.strokeStyle=CSS.foe;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-4.5,-4.5);ctx.lineTo(4.5,4.5);ctx.moveTo(4.5,-4.5);ctx.lineTo(-4.5,4.5);ctx.stroke()}
        else{ctx.font=TAG_FONT;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle=CSS.ink;ctx.strokeText(rm.initial,0,5,18);ctx.fillStyle='#ffffff';ctx.fillText(rm.initial,0,5,18)}
        ctx.restore();continue}
      ctx.rotate(a);ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(12,-7);ctx.lineTo(12,7);ctx.closePath();ctx.fillStyle=css;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=CSS.ink;ctx.stroke();ctx.rotate(-a);
      ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.fillStyle='rgba(11,10,22,.9)';ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.14)';ctx.stroke();
      if(q>0){ctx.beginPath();ctx.arc(0,0,12,-Math.PI/2,-Math.PI/2+TAU*q);ctx.strokeStyle=q<.3?CSS.foe:css;ctx.stroke()}
      if(dead){ctx.strokeStyle=CSS.foe;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-4.5,-4.5);ctx.lineTo(4.5,4.5);ctx.moveTo(4.5,-4.5);ctx.lineTo(-4.5,4.5);ctx.stroke()}
      else{ctx.font=TAG_FONT;ctx.textAlign='center';ctx.fillStyle=soft;ctx.fillText(rm.initial,0,5,18)}
      ctx.restore();
    }
  }
  ctx.restore();
}
/* ---------- trials (round 8): MB.trial = null | {kind:'survive'|'guard'|'race'|'ordeal'|'cross', rule, t, dur, goal, progress, handicap, failed,
     obj: null | {x,y,r,hp,maxHp}}; R.testTrial (same shape) wins when set. Nothing here exists until the first trial is seen.
   guard   : the objective is a marrow-lamp: a low plinth, a cage of five ribs and a heart of marrow-light burning inside it. Its health is a ring
             on the floor around it (gold, amber, then crimson) and a small bar over it; it gutters as it is hurt and stands dark and splayed
             open when it breaks. A thin inner ring counts the time or the kills still to go.
   survive : a track of light just inside the walls fills clockwise as the time is served.
   race    : the same track starts full and burns away; it turns crimson and beats in the last quarter.
   ordeal  : the screen's edge takes a tint by handicap (drained violet-grey for no mana, sick green for no summons, dull red for halved healing,
             hot streaks for swift monsters); 'the dark returns' is the crypt's own no-sight treatment at a wider radius (see draw()). ---------- */
const TR={on:false,kind:'',obj:false,ox:0,oy:0,or:20,g:null,hp:1,hpShow:1,hit:0,dead:0,frac:0,edge:null,cap:'',capA:0,fail:0,t:0,q:1};
const HC_RE=[[/dark|blind|sight|eyes/i,'dark'],[/mana|dry|drain/i,'mana'],[/pet|familiar|summon|alone|deploy/i,'pets'],[/heal|mend|wound/i,'heal'],[/swift|fast|haste|quick/i,'swift']];
const hcCache=new Map();
function HCAP(tr){const h=tr&&tr.handicap;if(!h||typeof h!=='string')return '';let v=hcCache.get(h);if(v!==undefined)return v;v='other';for(let i=0;i<HC_RE.length;i++)if(HC_RE[i][0].test(h)){v=HC_RE[i][1];break}if(hcCache.size>40)hcCache.clear();hcCache.set(h,v);return v}
const HC_COL={mana:[108,96,170],pets:[70,150,96],heal:[170,52,60],swift:[255,70,60],other:[214,165,68]};
function trialOf(){const tr=R.testTrial||MB.trial;return tr&&typeof tr==='object'&&MB.S.mode==='play'?tr:null}
const SEGS=96,PER_IN=WALL+9;
function trialSetup(){
  if(TR.g)return;
  const g=TR.g=new THREE.Group();g.visible=false;scene.add(g);
  // the track inside the walls: SEGS short bars, clockwise from the middle of the north wall; the lit copy draws only the first `count`
  const trackM=new THREE.MeshBasicMaterial({color:0x8a86b0,transparent:true,opacity:.22,depthWrite:false,toneMapped:false,fog:false}),
    litM=new THREE.MeshBasicMaterial({color:PAL.power2,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),
    hazeM=flatGlowMat(PAL.power2,.16);
  const track=noLine(new THREE.InstancedMesh(G.quad,trackM,SEGS)),lit=noLine(new THREE.InstancedMesh(G.quad,litM,SEGS)),haze=noLine(new THREE.InstancedMesh(G.quad,hazeM,SEGS));
  const x0=PER_IN,x1=W-PER_IN,z0=PER_IN,z1=H-PER_IN,w=x1-x0,h=z1-z0,per=2*(w+h),step=per/SEGS;
  for(let i=0;i<SEGS;i++){let d=((i+.5)*step+w/2)%per,x,z,hor;
    if(d<w){x=x0+d;z=z0;hor=true}else if(d<w+h){x=x1;z=z0+d-w;hor=false}else if(d<2*w+h){x=x1-(d-w-h);z=z1;hor=true}else{x=x0;z=z1-(d-2*w-h);hor=false}
    put(track,i,x,.66,z,hor?step-3:4,1,hor?4:step-3);put(haze,i,x,.6,z,hor?step+10:34,1,hor?34:step+10)}
  lit.instanceMatrix=track.instanceMatrix;lit.count=0;haze.count=0;
  for(const m of[track,lit,haze]){m.frustumCulled=false;m.renderOrder=2}
  const head=new THREE.Sprite(glowMat(0xffffff,.9));head.scale.setScalar(46);head.position.y=4;
  const edge=new THREE.Group();edge.add(track,haze,lit,head);g.add(edge);
  // the same count as a thin arc round the hero's feet, for when the walls are out of view
  const footGeo=new THREE.RingGeometry(.9,1,64,1,Math.PI/2,-TAU).rotateX(-Math.PI/2),footM=new THREE.MeshBasicMaterial({color:PAL.power2,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false,side:THREE.DoubleSide}),
    foot=noLine(new THREE.Mesh(footGeo,footM)),footBack=noLine(new THREE.Mesh(G.ring,new THREE.MeshBasicMaterial({color:0x8a86b0,transparent:true,opacity:.2,depthWrite:false,toneMapped:false,fog:false})));
  foot.position.y=.82;footBack.position.y=.8;foot.renderOrder=footBack.renderOrder=3;foot.scale.setScalar(40);footBack.scale.setScalar(40);g.add(footBack,foot);
  TR.edge={g:edge,track,lit,haze,head,trackM,litM,hazeM,x0,x1,z0,z1,w,h,per,foot,footBack,footGeo,footM};
  // the marrow-lamp
  const o=new THREE.Group(),body=new THREE.Group(),stone=std(0x6a6876,{flatShading:true}),boneM=ST.toon(PAL.bone),boneD=ST.toon(0x8f8676),dead=ST.toon(0x3a3640);
  const plinth=new THREE.Mesh(mergeGeos([new THREE.CylinderGeometry(15,18,5,7).translate(0,2.5,0),new THREE.CylinderGeometry(11,13,4,7).translate(0,7,0)]),stone);plinth.castShadow=plinth.receiveShadow=true;body.add(plinth);
  const ribG=mergeGeos([new THREE.TorusGeometry(15,1.45,5,9,1.9).rotateZ(-.42).translate(-18.5,9,0),new THREE.ConeGeometry(1.5,5,5).rotateZ(1.05).translate(-5.2,31.4,0),new THREE.SphereGeometry(2.3,6,5).translate(-12,9,0)]);
  const ribs=[];for(let i=0;i<5;i++){const piv=new THREE.Group(),r=new THREE.Mesh(ribG,i%2?boneD:boneM);r.castShadow=true;piv.rotation.y=i*TAU/5+.3;piv.add(r);body.add(piv);ribs.push(r)}
  const spine=new THREE.Mesh(mergeGeos([0,1,2].map(i=>new THREE.SphereGeometry(2.6-i*.4,6,5).scale(1,.7,1).translate(0,10.5+i*2.8,0))),boneD);spine.castShadow=true;body.add(spine);
  const coreM=basic(0xfff0c2),core=noLine(new THREE.Mesh(new THREE.OctahedronGeometry(1,0),coreM));core.position.y=26;
  const shellM=new THREE.MeshBasicMaterial({color:PAL.gold,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),shell=noLine(new THREE.Mesh(G.sphere,shellM));shell.position.y=26;
  const halo=new THREE.Sprite(glowMat(PAL.gold,.55));halo.position.y=27;
  const pool=noLine(new THREE.Mesh(G.quad,flatGlowMat(PAL.gold,.3)));pool.position.y=.6;pool.renderOrder=1;
  body.add(core,shell,halo);
  // floor rings: the reach of the thing itself, its health (drawn up to a fraction through the geometry's draw range), and the count
  const ringGeo=()=>new THREE.RingGeometry(.9,1,72,1,Math.PI/2,-TAU).rotateX(-Math.PI/2);
  const fm=(hex,op,add)=>new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:op,depthWrite:false,toneMapped:false,fog:false,side:THREE.DoubleSide,blending:add?THREE.AdditiveBlending:THREE.NormalBlending});
  const hpBack=noLine(new THREE.Mesh(G.ring,fm(0x0a0814,.6))),hpGeo=ringGeo(),hpM=fm(PAL.gold,.95),hpRing=noLine(new THREE.Mesh(hpGeo,hpM));
  const cntGeo=new THREE.RingGeometry(.93,1,72,1,Math.PI/2,-TAU).rotateX(-Math.PI/2),cntM=fm(PAL.power2,.8,true),cnt=noLine(new THREE.Mesh(cntGeo,cntM));
  const reachM=fm(PAL.gold,.5),reach=noLine(new THREE.Mesh(G.rim,reachM));
  hpBack.position.y=.62;hpRing.position.y=.7;cnt.position.y=.72;reach.position.y=.66;for(const m of[hpBack,hpRing,cnt,reach])m.renderOrder=2;
  o.add(body,pool,hpBack,hpRing,cnt,reach);ST.outline(body,{thickness:1.1});g.add(o);
  TR.lamp={o,body,ribs,boneM,boneD,dead,core,coreM,shell,shellM,halo,pool,hpBack,hpRing,hpGeo,hpM,cnt,cntGeo,cntM,reach,reachM,broke:false};
}
const _hc=new THREE.Color();
function syncTrial(tr,dt,sight){
  if(!tr){if(TR.on){TR.on=false;TR.obj=false;TR.cap='';if(TR.g)TR.g.visible=false}return}
  trialSetup();
  const t=MB.S.t,P=MB.P,E=TR.edge,Lm=TR.lamp,kind=tr.kind,low=Q.low;
  if(!TR.on||kind!==TR.kind){TR.on=true;TR.kind=kind;TR.hpShow=1;TR.hit=0;TR.dead=0;TR.fail=0;Lm.broke=false}
  TR.g.visible=true;TR.t=num(tr.t,0);TR.cap=HCAP(tr);
  TR.fail+=((tr.failed?1:0)-TR.fail)*Math.min(1,dt*6);
  const dur=num(tr.dur,0),goal=num(tr.goal,0),frac=dur>0?clamp01(TR.t/dur):goal>0?clamp01(num(tr.progress,0)/goal):-1;TR.frac=frac;
  // the track at the walls: survive fills, race burns down
  const edgeOn=(kind==='survive'||kind==='race')&&frac>=0&&sight;E.g.visible=edgeOn;E.foot.visible=E.footBack.visible=edgeOn&&!!P&&!P.down;
  if(edgeOn){
    const race=kind==='race',q=race?1-frac:frac,n=Math.max(0,Math.min(SEGS,Math.round(q*SEGS))),hot=race&&q<.25,beat=hot?.6+.4*Math.sin(t*12):1,f=TR.fail;TR.q=q;
    E.lit.count=n;E.haze.count=low?0:n;
    if(race)_hc.setHex(hot?PAL.foe:PAL.gold);else _hc.setHex(PAL.power2).lerp(_c0.setHex(PAL.gold),q>.9?(q-.9)*10:0);
    if(f>.01)_hc.lerp(_c0.setHex(PAL.foe),f);
    E.litM.color.copy(_hc);E.litM.opacity=(.72+.14*Math.sin(t*3))*beat;E.hazeM.color.copy(_hc);E.hazeM.opacity=(.12+.04*Math.sin(t*3))*beat;
    E.trackM.opacity=.2+.25*f;
    // a bright bead rides the front of it
    const d=(q*E.per+E.w/2)%E.per,h=E.head;let x,z;
    if(d<E.w){x=E.x0+d;z=E.z0}else if(d<E.w+E.h){x=E.x1;z=E.z0+d-E.w}else if(d<2*E.w+E.h){x=E.x1-(d-E.w-E.h);z=E.z1}else{x=E.x0;z=E.z1-(d-2*E.w-E.h)}
    h.visible=q>.004&&q<.996;h.position.x=x;h.position.z=z;h.material.color.copy(_hc);h.scale.setScalar((hot?58:44)+6*Math.sin(t*9));
    if(P){E.foot.position.x=E.footBack.position.x=P.x;E.foot.position.z=E.footBack.position.z=P.y;E.footGeo.setDrawRange(0,Math.round(64*q)*6);E.footM.color.copy(_hc);E.footM.opacity=.8*beat}
  }
  // the thing to protect
  const ob=tr.obj&&typeof tr.obj==='object'&&num(tr.obj.x,null)!==null&&num(tr.obj.y,null)!==null?tr.obj:null;
  TR.obj=!!ob;Lm.o.visible=!!ob;
  if(ob){
    const r=Math.max(10,num(ob.r,22)),maxHp=Math.max(1,num(ob.maxHp,1)),hp=clamp01(num(ob.hp,maxHp)/maxHp),k=Math.max(.8,Math.min(1.9,r/22));
    TR.ox=ob.x;TR.oy=ob.y;TR.or=r;
    if(hp<TR.hp-1e-4&&TR.hp<=1){TR.hit=1;if(sight)flashAt(ob.x,24*k,ob.y,20,90,hp<.25?PAL.foe:0xffe0a0,.16,.9)}
    TR.hp=hp;TR.hit=Math.max(0,TR.hit-dt*4);TR.hpShow+=(hp-TR.hpShow)*Math.min(1,dt*9);
    const brk=hp<=0;TR.dead+=((brk?1:0)-TR.dead)*Math.min(1,dt*5);
    let near=true;if(!sight&&P){const dx=ob.x-P.x,dy=ob.y-P.y,lim=fogR+r;near=dx*dx+dy*dy<lim*lim}
    Lm.o.visible=near;Lm.o.position.set(ob.x,0,ob.y);
    const hitK=TR.hit,dk=TR.dead;
    Lm.body.scale.setScalar(k);Lm.body.position.x=hitK*Math.sin(t*70)*1.6;Lm.body.rotation.y=.2;
    if(brk!==Lm.broke){Lm.broke=brk;for(let i=0;i<5;i++)Lm.ribs[i].material=brk?Lm.dead:i%2?Lm.boneD:Lm.boneM;if(brk&&sight){burstAt(ob.x,24,ob.y,60,260,PAL.foe,.3);crackAt(ob.x,ob.y,r*1.6,PAL.foe,3)}}
    for(let i=0;i<5;i++){const rb=Lm.ribs[i];rb.rotation.z=dk*(.5+.12*i)+hitK*.08*Math.sin(t*50+i);rb.position.y=-dk*2}
    // the heart of it: steadier and gold when whole, small and red and guttering when nearly out
    const low25=hp<.25,flick=1+(low25?.22:.07)*Math.sin(t*(low25?23:7))+.05*Math.sin(t*31),sz=(4.2+5.2*hp)*flick*(1-dk);
    _hc.setHex(hp>.5?0xffe6a0:hp>.25?0xffa040:0xff4a3c);if(hitK>0)_hc.lerp(_c0.setHex(0xffffff),hitK*.7);
    Lm.core.visible=Lm.shell.visible=Lm.halo.visible=sz>.3;
    Lm.core.scale.set(sz*.62,sz*1.25,sz*.62);Lm.core.rotation.y=t*1.8;Lm.core.position.y=26+Math.sin(t*2.2)*1.1;Lm.coreM.color.copy(_hc).lerp(_c0.setHex(0xffffff),.45);
    Lm.shell.scale.setScalar(sz*1.5);Lm.shell.position.y=Lm.core.position.y;Lm.shellM.color.copy(_hc);Lm.shellM.opacity=.3+.12*Math.sin(t*5);
    Lm.halo.material.color.copy(_hc);Lm.halo.scale.setScalar((26+30*hp)*flick);Lm.halo.position.y=Lm.core.position.y;
    Lm.pool.visible=!brk&&sight;Lm.pool.material.color.copy(_hc);Lm.pool.material.opacity=(.14+.2*hp)*flick;Lm.pool.scale.set((r+60)*2.6,1,(r+60)*2.1);
    // rings
    const R1=r+17,sh=TR.hpShow;
    Lm.hpBack.scale.setScalar(R1+1.2);Lm.hpRing.scale.setScalar(R1);
    Lm.hpGeo.setDrawRange(0,Math.round(72*clamp01(sh))*6);
    _hc.setHex(hp>.5?PAL.gold:hp>.25?0xff9a2a:PAL.foe);if(hitK>0)_hc.lerp(_c0.setHex(0xffffff),hitK);Lm.hpM.color.copy(_hc);Lm.hpM.opacity=low25&&!brk?.7+.3*Math.sin(t*14):.95;
    Lm.reach.scale.setScalar(r+3);Lm.reach.rotation.y=t*.25;Lm.reachM.opacity=brk?.15:.32+.12*Math.sin(t*2.4);Lm.reachM.color.copy(_hc);
    Lm.cnt.visible=frac>=0&&!brk;if(Lm.cnt.visible){Lm.cnt.scale.setScalar(R1-5.5);Lm.cntGeo.setDrawRange(0,Math.round(72*frac)*6)}
    if(low&&near){const b=pools.blob.get();b.position.set(ob.x,.55,ob.y);b.scale.set(r*4.6,1,r*3.8)}
  }else{TR.hp=1;TR.hpShow=1}
}
const capGrad=new Map();
function capGradient(key,c){const W=OV.w,H=OV.h;let g=capGrad.get(key);if(!g){g=ctx.createRadialGradient(W/2,H/2,H*.34,W/2,H/2,H*.98);const p='rgba('+c[0]+','+c[1]+','+c[2]+',';g.addColorStop(0,p+'0)');g.addColorStop(.55,p+'.1)');g.addColorStop(1,p+'.5)');capGrad.set(key,g)}return g}
function trialOverlay(sight){
  const S=MB.S,t=S.t,cap=TR.cap,top=hudBottom(),W=OV.w,H=OV.h;
  // an ordeal's handicap: the edge of the view takes its colour, and two thin lines hold it top and bottom
  if(cap&&cap!=='dark'){const c=HC_COL[cap]||HC_COL.other,pu=.82+.18*Math.sin(t*1.7),css='rgb('+c[0]+','+c[1]+','+c[2]+')';
    ctx.save();ctx.globalAlpha=pu;ctx.fillStyle=capGradient(cap,c);ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.55*pu;ctx.fillStyle=tint(css);ctx.fillRect(0,top+2,W,2);ctx.fillRect(0,H-4,W,2);
    if(cap==='mana'){ // the colour is draining away: thin threads slide down off the top edge
      ctx.globalAlpha=.3;for(let i=0;i<14;i++){const x=(i*73.7+17)%W,l=20+(i*37%40),y=((t*18+i*53)%(l+90))-l;ctx.fillRect(x,top+4+y*.4,1.5,l*.5)}}
    else if(cap==='swift'&&!Q.low&&!calm){ // speed lines along both sides
      ctx.globalAlpha=.34;for(let i=0;i<10;i++){const y=(i*61.3+((t*520+i*97)%H))%H,l=40+(i*29%50),s=i%2;ctx.beginPath();ctx.moveTo(s?W:0,y);ctx.lineTo(s?W-l:l,y-3);ctx.lineTo(s?W:0,y-6);ctx.closePath();ctx.fill()}}
    else if(cap==='pets'){ // an empty circle at each lower corner where a companion would stand
      ctx.globalAlpha=.4*pu;ctx.strokeStyle=tint(css);ctx.lineWidth=1.5;ctx.setLineDash([5,7]);for(const x of[34,W-34]){ctx.beginPath();ctx.ellipse(x,H-26,22,9,0,0,TAU);ctx.stroke()}ctx.setLineDash([])}
    else if(cap==='heal'){ // the edge beats, slow and shallow
      const b=Math.max(0,Math.sin(t*2.2));ctx.globalAlpha=.2*b*b;ctx.fillRect(0,0,W,7);ctx.fillRect(0,H-7,W,7);ctx.fillRect(0,0,7,H);ctx.fillRect(W-7,0,7,H)}
    ctx.restore()}
  // failing: the edges go red for a moment
  if(TR.fail>.02){ctx.fillStyle='rgba(255,45,85,'+(.22*TR.fail)+')';ctx.fillRect(0,0,W,H)}
  // the lamp: a bar over it, a small shield of light for a pip, and the word for the first seconds
  if(TR.obj&&TR.lamp.o.visible){
    const k=Math.max(.8,Math.min(1.9,TR.or/22));toScreen(TR.ox,46*k+10,TR.oy);if(!sp.ok)return;
    const hp=TR.hpShow,bw=74,bx=Math.max(20,Math.min(W-bw-8,sp.x-bw/2)),by=Math.max(top+20,Math.min(H-14,sp.y-8)),brk=TR.hp<=0,col=brk?CSS.dim:TR.hp>.5?CSS.gold:TR.hp>.25?'#ff9a2a':CSS.foe;
    ctx.save();
    ctx.fillStyle='rgba(8,8,12,.85)';ctx.beginPath();ctx.moveTo(bx-3,by-3);ctx.lineTo(bx+bw+6,by-3);ctx.lineTo(bx+bw+3,by+9);ctx.lineTo(bx-6,by+9);ctx.closePath();ctx.fill();
    ctx.fillStyle='#231d14';ctx.fillRect(bx,by,bw,6);ctx.fillStyle=TR.hit>.05?'#ffffff':tint(col);ctx.fillRect(bx,by,bw*clamp01(hp),6);
    ctx.fillStyle='rgba(8,8,12,.7)';for(let i=1;i<4;i++)ctx.fillRect(bx+bw*i/4-.5,by,1,6);
    ctx.strokeStyle=tint(col);ctx.lineWidth=1;ctx.strokeRect(bx-1.5,by-1.5,bw+3,9);
    const px=bx-13,py=by+3;ctx.beginPath();ctx.moveTo(px-6,py-7);ctx.lineTo(px+6,py-7);ctx.lineTo(px+6,py+1);ctx.lineTo(px,py+8);ctx.lineTo(px-6,py+1);ctx.closePath();ctx.fillStyle='rgba(11,10,22,.92)';ctx.fill();ctx.strokeStyle=tint(col);ctx.lineWidth=1.6;ctx.stroke();
    ctx.fillStyle=tint(col);ctx.beginPath();ctx.moveTo(px,py-3.5);ctx.lineTo(px+2.6,py);ctx.lineTo(px,py+3.5);ctx.lineTo(px-2.6,py);ctx.closePath();ctx.fill();
    const tag=brk?'BROKEN':TR.t<4.5||TR.hit>.05||(TR.hp<.25&&Math.sin(t*6)>0)?'PROTECT':'';
    if(tag){ctx.globalAlpha=brk?1:TR.t<4.5?clamp01((4.5-TR.t)*2)*clamp01(TR.t*4)||1:1;ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font='700 13px '+FONT;spaced(3);inked(tag,bx+bw/2+1.5,by-8,tint(brk?CSS.foe:col),3.5);spaced(0)}
    ctx.restore();
  }
}

/* ---------- versus (round 9): MB.mp.vs = null | {format:'ffa'|'teams', floor, wins, time, round, phase:'pick'|'countdown'|'fight'|'sudden'|'over'|'results',
     t, ring:null|{x,y,r}, score:[{id,name,team,rounds,kills,dmg,down}], myTeam}; R.testVs (same shape) wins when set. remote.foe / remote.team say who is who.
   Who is who: every fighter has ONE colour. Teams: the two team colours (TEAM_HEX: azure and amber, or MB.mp.teamColors / vs.teamColors when the page
   sets them); free-for-all: the member colour by idx, as in co-op. The colour says WHOSE, the shape says FRIEND OR FOE: a friend keeps the smooth broken ring,
   the plain name and the white health bar of co-op; an opponent stands on a heavier ring of fangs over a pool of their colour, under a slanted bar filled
   with their colour and a chevron pointing down at them; their creatures stand on thorn rings (the friendly rune circles, collars' lights and green eyes are
   not built), and everything they throw, lay down or sweep is drawn in the foe palette (crimson and ember), whatever their own colour is.
   None of this exists until a versus session is seen, and none of it runs in single-player or co-op. ---------- */
const TEAM_HEX=[0x2f9dff,0xffb21e];
const VS={on:false,v:null,teams:false,my:-1,mine:-1,phase:'',prev:'',pt:0,clock:0,ringOn:false,rx:W/2,ry:H/2,rr:0,out:0,
  resOn:false,resBig:'',resSub:'',resTop:'',resCss:'#ffffff',resMine:0,resW:undefined,at:0,dt:0};
const SPEC={on:false,id:null,rm:null,x:W/2,y:H/2,name:'',css:'#ffffff',n:0};
const specList=[],vsRounds=new Map();
function vsOf(){const v=R.testVs||(MB.mp&&MB.mp.vs);return v&&typeof v==='object'?v:null}
// colours: the session's own list per member index when it gives one (vs.colors, which its scoreboards and the page's HUD use too); else the two
// team colours here (or vs.teamColors / MB.mp.teamColors) in a team match and the member colour otherwise
function vsListed(i){const v=VS.v,c=v&&v.colors&&v.colors[i];return typeof c==='string'&&HEX_RE.test(c)?echoHex(c):-1}
function teamHex(t){const mp=MB.mp,v=VS.v,l=(v&&v.teamColors)||(mp&&mp.teamColors),c=l&&l[t];if(typeof c==='string'&&HEX_RE.test(c))return echoHex(c);
  const sc=v&&Array.isArray(v.score)?v.score:NONE;for(let i=0;i<sc.length;i++){const e=sc[i];if(e&&e.team===t){const h=vsListed(num(e.idx,i));if(h>=0)return h;break}}
  return TEAM_HEX[t===1?1:0]}
function vsHex(idx,team){if(!VS.on)return memberHex(idx);const h=vsListed(idx);return h>=0?h:VS.teams&&(team===0||team===1)?teamHex(team):memberHex(idx)}
// a side: the team number (in a free-for-all every fighter is a side of one: its member index)
function vsKey(e,i){return num(e.team,num(e.idx,i))}
// who took the round (or the match): the session's own word when it gives one (vs.winner: a side, -1 / null for nobody; a member id is understood too),
// else whoever's count of rounds went up, else whoever is still standing
function vsResult(v,ph){
  const sc=Array.isArray(v.score)?v.score:NONE,teams=VS.teams,mp=MB.mp,myId=v.myId!==undefined?v.myId:mp?mp.myId:undefined,myIdx=num(v.myIdx,mp?num(mp.myIdx,-1):-1);
  let wk=null,known=false;
  VS.resW=v.winner;
  if(v.winner!==undefined&&v.winner!==null){const w=v.winner;known=true;
    if(typeof w==='number')wk=w<0?null:w;else if(w==='draw')wk=null;else{wk=null;for(let i=0;i<sc.length;i++)if(sc[i]&&sc[i].id===w){wk=vsKey(sc[i],i);break}}}
  if(!known&&ph==='results'){let best=-1,tie=false;
    for(let i=0;i<sc.length;i++){const e=sc[i];if(!e)continue;const k=vsKey(e,i),n=num(e.rounds,0);if(n>best){best=n;wk=k;tie=false}else if(n===best&&k!==wk)tie=true}
    known=true;if(tie||best<0)wk=null}
  if(!known){let n=0,k0;
    for(let i=0;i<sc.length;i++){const e=sc[i];if(!e)continue;const k=vsKey(e,i),was=vsRounds.get(e.id);if(was!==undefined&&num(e.rounds,0)>was&&k!==k0){k0=k;n++}}
    if(n===1)wk=k0;
    else{n=0;k0=undefined;for(let i=0;i<sc.length;i++){const e=sc[i];if(!e||e.down||e.left)continue;const k=vsKey(e,i);if(k!==k0){k0=k;n++}}
      wk=n===1?k0:null}}
  const match=ph==='results';let mine=0,who='',hex=0xf2ecff,tally='';
  if(wk===null||wk===undefined){VS.resBig=match?'NO WINNER':'DRAW';VS.resCss=CSS.bone;VS.resMine=0}
  else if(teams){mine=VS.my<0?0:wk===VS.my?1:-1;who=mine>0?'YOUR TEAM':mine<0?'ENEMY TEAM':'TEAM '+(wk?'B':'A');hex=teamHex(wk|0);
    let a=0,b=0;for(let i=0;i<sc.length;i++){const e=sc[i];if(!e)continue;if(e.team===0)a=Math.max(a,num(e.rounds,0));else if(e.team===1)b=Math.max(b,num(e.rounds,0))}
    tally=VS.my===1?b+' – '+a:a+' – '+b}
  else{let e=null,at=0;for(let i=0;i<sc.length;i++)if(sc[i]&&vsKey(sc[i],i)===wk){e=sc[i];at=i;break}
    const ix=e?num(e.idx,at):wk|0,me=!!e&&(e.me===true||(myId!==undefined&&e.id===myId)||(myIdx>=0&&ix===myIdx));mine=me?1:VS.mine>=0?-1:0;
    who=me?'YOU':cleanName(e?e.name:'',ix).toUpperCase();hex=vsHex(ix,wk);
    if(e)tally=num(e.rounds,0)+' / '+Math.max(1,num(v.wins,1))}
  if(who){VS.resCss=cssOf(hex);VS.resMine=mine;
    VS.resBig=match?(mine>0?'VICTORY':mine<0?'DEFEAT':who+' WINS'):who+(who==='YOU'?' WIN':' WINS')}
  VS.resTop=match?'MATCH OVER':'ROUND '+Math.max(1,num(v.round,1)|0);
  VS.resSub=match?(who?who+(who==='YOU'?' TAKE':' TAKES')+' THE MATCH':'NOBODY TAKES THE MATCH')+(tally?'     '+tally:''):(tally?'ROUNDS   '+tally:'');
  VS.resOn=true;
}
function specAlive(rm){return rm.vis&&!rm.dead&&rm.sm.init}
// who a downed hero may watch: living team-mates in a team match; with none of those (and in free-for-all), every fighter still standing
function specCands(){
  specList.length=0;let mates=false;
  if(VS.teams&&VS.my>=0)for(let i=0;i<rems.length;i++){const rm=rems[i];if(specAlive(rm)&&!rm.foe)specList.push(rm)}
  if(specList.length)mates=true;else for(let i=0;i<rems.length;i++){const rm=rems[i];if(specAlive(rm))specList.push(rm)}
  return mates;
}
// MB.renderer.spectate(next): next = true / 1 / undefined: the next one to watch; -1: the one before; false / 0 / null: back to the default.
// Returns {id, name} of the fighter now followed, or null (watching the fight as a whole, or not spectating at all).
function spectate(next){
  if(!VS.on||!SPEC.on)return null;
  const mates=specCands(),n=specList.length;
  if(next===false||next===0||next===null||!n)SPEC.id=null;
  else{let at=-1;for(let i=0;i<n;i++)if(specList[i].id===SPEC.id){at=i;break}
    // the stops: [the whole fight] (not in a team match while a team-mate stands), then each one in turn
    const stops=mates?n:n+1,cur=mates?(at<0?0:at):at+1,nx=((cur+(next===-1?-1:1))%stops+stops)%stops,i=mates?nx:nx-1;
    SPEC.id=i<0?null:specList[i].id}
  specPick(mates);
  return SPEC.rm?{id:SPEC.rm.id,name:SPEC.rm.name}:null;
}
function specPick(mates){
  let rm=null;const n=specList.length;
  if(SPEC.id!==null){for(let i=0;i<n;i++)if(specList[i].id===SPEC.id){rm=specList[i];break}if(!rm)SPEC.id=null}
  if(!rm&&mates)rm=specList[0];
  SPEC.rm=rm;SPEC.n=n;
  if(rm){SPEC.x=rm.P.x;SPEC.y=rm.P.y;SPEC.name=rm.name;SPEC.css=rm.css}
  else if(n){let x=0,y=0;for(let i=0;i<n;i++){x+=specList[i].P.x;y+=specList[i].P.y}SPEC.x=x/n;SPEC.y=y/n;SPEC.name='';SPEC.css=CSS.bone}
  else{const P=MB.P;SPEC.x=P?P.x:W/2;SPEC.y=P?P.y:H/2;SPEC.name='';SPEC.css=CSS.bone}
}
function vsFrame(dt){
  const v=vsOf();
  if(!v){if(VS.on){VS.on=false;VS.at=0;VS.v=null;VS.phase=VS.prev='';VS.ringOn=false;VS.resOn=false;VS.out=0;SPEC.on=false;SPEC.id=null;SPEC.rm=null;vsRounds.clear()}return}
  const mp=MB.mp,P=MB.P;
  // banners and the ring run on the wall clock (a slow device stretches game time, and a round's clock does not wait for it)
  {const now=performance.now();dt=VS.at>0?Math.max(0,Math.min(.25,(now-VS.at)/1000)):0;VS.at=now}
  VS.on=true;VS.v=v;VS.teams=v.format==='teams';VS.my=num(v.myTeam,-1);VS.clock+=dt;VS.dt=dt;
  {const ix=num(v.myIdx,mp?num(mp.myIdx,-1):-1);VS.mine=ix>=0?vsHex(ix,VS.my):VS.teams&&(VS.my===0||VS.my===1)?teamHex(VS.my):-1}
  const ph=typeof v.phase==='string'?v.phase:'';
  if(ph!==VS.phase){VS.prev=VS.phase;VS.phase=ph;VS.pt=0;VS.resOn=false;if(ph==='over'||ph==='results')vsResult(v,ph)}else{VS.pt+=dt;if(VS.resOn&&v.winner!==VS.resW)vsResult(v,ph)}
  if(ph!=='over'&&ph!=='results'){const sc=Array.isArray(v.score)?v.score:NONE;for(let i=0;i<sc.length&&i<16;i++){const e=sc[i];if(e)vsRounds.set(e.id,num(e.rounds,0))}}
  // the closing ring
  const rg=v.ring&&typeof v.ring==='object'&&num(v.ring.x,null)!==null&&num(v.ring.y,null)!==null&&num(v.ring.r,-1)>=0?v.ring:null;
  VS.ringOn=!!rg;if(rg){VS.rx=rg.x;VS.ry=rg.y;VS.rr=rg.r}
  {let out=0;if(rg&&P&&!P.down&&MB.S.mode==='play'&&(ph==='sudden'||ph==='fight')){const dx=P.x-rg.x,dy=P.y-rg.y;if(dx*dx+dy*dy>rg.r*rg.r)out=1}
    VS.out+=(out-VS.out)*Math.min(1,dt*(out?8:5))}
  // down: watch the others
  const down=!!P&&(P.down===true||(mp&&mp.down===true))&&MB.S.mode==='play'&&ph!=='pick'&&ph!=='results';
  if(down){SPEC.on=true;specPick(specCands())}else if(SPEC.on){SPEC.on=false;SPEC.id=null;SPEC.rm=null}
}
/* the closing ring: a wall of fire standing on a white-hot line, the floor outside it burnt dark and red, a cool pale band just inside it.
   One group, built the first time a ring is seen; a new radius only moves and scales it. */
let RG=null;
function ringTexture(seed,tall){ // flame tongues, tiling sideways; white-hot at the foot, ember, then crimson thinning to nothing
  const c=mkCanvas(512,128),g=c.getContext('2d'),rnd=rng(seed);
  const gr=g.createLinearGradient(0,128,0,0);gr.addColorStop(0,'rgba(255,236,200,.95)');gr.addColorStop(.05,'rgba(255,170,70,.8)');gr.addColorStop(.2,'rgba(255,84,30,.5)');gr.addColorStop(.5,'rgba(255,36,64,.24)');gr.addColorStop(1,'rgba(200,20,70,0)');
  g.fillStyle=gr;g.fillRect(0,0,512,128);g.globalCompositeOperation='destination-out';
  for(let x=0;x<512;x+=tall?34:21){const h=(tall?70:34)+rnd()*(tall?52:70),w=(tall?26:17)+rnd()*8,j=rnd()*14-7;
    for(const ox of[0,512,-512]){g.beginPath();g.moveTo(x+ox-w,0);g.quadraticCurveTo(x+ox+j,h*.45,x+ox+j*1.6,h);g.quadraticCurveTo(x+ox+j,h*.45,x+ox+w,0);g.closePath();g.fill()}}
  const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;return t;
}
function ringSetup(){
  if(RG)return;
  const g=new THREE.Group();g.visible=false;scene.add(g);
  const add=(tex,op)=>new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false});
  const t1=ringTexture(71,true),t2=ringTexture(113,false),wallGeo=new THREE.CylinderGeometry(1,1,1,160,1,true).translate(0,.5,0);
  const m1=add(t1,.9),m2=add(t2,.8),w1=noLine(new THREE.Mesh(wallGeo,m1)),w2=noLine(new THREE.Mesh(wallGeo,m2));w1.renderOrder=w2.renderOrder=5;
  // the floor: everything outside is burnt (a wide dark ring and a red wash over it), a hot line where the wall stands, a pale band on the safe side
  const outGeo=new THREE.RingGeometry(1,80,128,1).rotateX(-Math.PI/2),inGeo=new THREE.RingGeometry(.9,1,128,1).rotateX(-Math.PI/2),lineGeo=new THREE.RingGeometry(.985,1.012,160,1).rotateX(-Math.PI/2),
    hotGeo=new THREE.RingGeometry(1,1.07,128,1).rotateX(-Math.PI/2);
  const burnM=new THREE.MeshBasicMaterial({color:0x0a0206,transparent:true,opacity:.62,depthWrite:false,fog:false,toneMapped:false}),
    washM=new THREE.MeshBasicMaterial({color:0xff1c3c,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),
    hotM=new THREE.MeshBasicMaterial({color:0xff5a1e,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),
    lineM=new THREE.MeshBasicMaterial({color:0xfff4d6,transparent:true,opacity:1,depthWrite:false,fog:false,toneMapped:false}),
    safeM=new THREE.MeshBasicMaterial({color:0xc4f4ff,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false});
  const burn=noLine(new THREE.Mesh(outGeo,burnM)),wash=noLine(new THREE.Mesh(outGeo,washM)),hot=noLine(new THREE.Mesh(hotGeo,hotM)),line=noLine(new THREE.Mesh(lineGeo,lineM)),safe=noLine(new THREE.Mesh(inGeo,safeM));
  burn.position.y=.5;wash.position.y=.54;hot.position.y=.74;safe.position.y=.7;line.position.y=.8;burn.renderOrder=1;wash.renderOrder=1;hot.renderOrder=2;safe.renderOrder=2;line.renderOrder=3;
  for(const m of[w1,w2,burn,wash,hot,line,safe]){m.frustumCulled=false;g.add(m)}
  // sparks climbing off the wall (high graphics)
  const pts=makePoints(128);pts.mat.blending=THREE.AdditiveBlending;pts.mat.uniforms.uScale.value=bitsP.mat.uniforms.uScale.value;pointSets.push(pts);
  RG={g,w1,w2,m1,m2,t1,t2,burn,wash,hot,line,safe,burnM,washM,hotM,lineM,safeM,pts,r:-1,show:0,geos:[wallGeo,outGeo,inGeo,lineGeo,hotGeo]};
}
function syncRing(dt,sight){
  const on=VS.on&&VS.ringOn&&MB.S.mode==='play';
  if(!RG){if(!on)return;ringSetup()}
  const G0=RG,t=VS.clock,low=Q.low;dt=VS.on?VS.dt:dt;
  G0.show+=((on?1:0)-G0.show)*Math.min(1,dt*(on?4:6));
  if(G0.show<.01&&!on){if(G0.g.visible){G0.g.visible=false;G0.pts.geo.setDrawRange(0,0)}return}
  const r=Math.max(1,VS.rr),a=G0.show,sd=VS.phase==='sudden'?1:.8;
  G0.g.visible=true;G0.g.position.set(VS.rx,0,VS.ry);
  if(r!==G0.r){G0.r=r;const n=Math.max(4,Math.round(TAU*r/260));G0.t1.repeat.x=n;G0.t2.repeat.x=Math.max(8,Math.round(n*1.7))}
  const h=(low?64:84)*a,fl=1+.06*Math.sin(t*9)+.04*Math.sin(t*23.7);
  G0.w1.scale.set(r,h*fl,r);G0.w2.scale.set(r*1.004,h*.55*(2-fl),r*1.004);G0.w2.visible=!low;
  G0.t1.offset.x=t*.045;G0.t2.offset.x=-t*.11;
  G0.m1.opacity=.6*a*sd;G0.m2.opacity=.5*a*sd;
  G0.burn.scale.set(r,1,r);G0.wash.scale.set(r,1,r);G0.hot.scale.set(r,1,r);G0.line.scale.set(r,1,r);G0.safe.scale.set(r,1,r);
  G0.burnM.opacity=.62*a;G0.washM.opacity=(.13+.05*Math.sin(t*2.6))*a;G0.hotM.opacity=(.4+.12*Math.sin(t*7))*a;G0.lineM.opacity=a;G0.safeM.opacity=(.09+.03*Math.sin(t*2))*a;
  G0.safe.visible=r>46;
  // sparks
  {const P0=G0.pts,n=low||!sight?0:Math.min(128,Math.max(24,Math.round(r*.4))),pos=P0.pos,col=P0.col,size=P0.size;
    for(let i=0;i<n;i++){const an=i*2.399+t*.05*(i%2?1:-1),life=(t*(.5+i%5*.11)+i*.37)%1,rr=r+(i%3)*5+life*10,hot=i%4===0;
      pos[i*3]=VS.rx+Math.cos(an)*rr;pos[i*3+1]=6+life*(90+i%7*10);pos[i*3+2]=VS.ry+Math.sin(an)*rr;
      col[i*4]=1;col[i*4+1]=hot?.9:.42;col[i*4+2]=hot?.6:.16;col[i*4+3]=Math.sin(life*Math.PI)*.9*a;size[i]=(hot?2.2:3)+(i%3)*.6}
    P0.geo.setDrawRange(0,n);if(n){P0.geo.attributes.position.needsUpdate=true;P0.geo.attributes.aCol.needsUpdate=true;P0.geo.attributes.aSize.needsUpdate=true}}
}
// banner text is laid out for a wide view and scaled down for a narrow one; an upright phone, whose overlay unit is small, gets it larger again
function vsScale(){const W=OV.w,H=OV.h;return H>W*1.2?Math.min(1.35,W/500):Math.min(1,W/760)}
// a word across the middle of the view: a dark slanted band, a small line over it, the word, a line under it. k = 0..1 how far in it is
function vsBand(top,big,sub,css,a,slide,y0,size){
  const W=OV.w,H=OV.h,s=vsScale(),bh=(size*1.5+(top?26:0)+(sub?30:0))*s,y1=y0+bh,sl=24;
  ctx.save();ctx.globalAlpha=a;
  ctx.beginPath();ctx.moveTo(-sl,y0);ctx.lineTo(W+sl*2,y0);ctx.lineTo(W+sl,y1);ctx.lineTo(-sl*2,y1);ctx.closePath();ctx.fillStyle='rgba(8,7,18,.86)';ctx.fill();
  ctx.fillStyle=css;ctx.fillRect(0,y0-4,W,2);ctx.fillRect(0,y1+2,W,2);
  let y=y0+(top?26*s:8*s);
  if(top){ctx.font='700 '+Math.round(16*s)+'px '+FONT;spaced(4);ctx.fillStyle=CSS.gold;ctx.fillText(top,W/2-slide*.5,y);spaced(0)}
  y+=size*s*1.02;
  ctx.save();slant(W/2+slide,y,0,.9,1);ctx.font='700 '+Math.round(size*s)+'px '+FONT;spaced(1.5);
  const tw=ctx.measureText(big).width,fit=tw>W*.92?W*.92/tw:1;if(fit<1)ctx.scale(fit,1);
  ctx.globalAlpha=a*.6;ctx.fillStyle=CSS.ink;ctx.fillText(big,3.5,4);ctx.globalAlpha=a;inked(big,0,0,css,Math.max(3,size*s*.09));spaced(0);ctx.restore();
  if(sub){y+=24*s;ctx.font='600 '+Math.round(17*s)+'px '+FONT;spaced(2.5);const sw=ctx.measureText(sub).width,f2=sw>W*.92?W*.92/sw:1;
    ctx.save();ctx.translate(W/2-slide*.4,y);if(f2<1)ctx.scale(f2,1);ctx.fillStyle=CSS.dim;ctx.fillText(sub,0,0);ctx.restore();spaced(0)}
  ctx.restore();
}
function vsOverlay(sight){
  const v=VS.v;if(!v)return;
  const W=OV.w,H=OV.h,ph=VS.phase,pt=VS.pt,t=VS.clock,s=vsScale(),top=hudBottom(),play=MB.S.mode==='play';
  ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.lineJoin='round';
  // outside the ring: the edges burn and a word says so, with a chevron toward the way back
  if(VS.out>.02&&play){const a=VS.out,pu=.7+.3*Math.sin(t*9),e=18+8*pu;
    ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,45,85,'+(.3*a*pu)+')';ctx.fillRect(0,0,W,e);ctx.fillRect(0,H-e,W,e);ctx.fillRect(0,0,e,H);ctx.fillRect(W-e,0,e,H);ctx.globalCompositeOperation='source-over';
    const P=MB.P;if(P){toScreen(P.x,40,P.y);const hx=sp.x,hy=sp.y;toScreen(VS.rx,0,VS.ry);let dx=sp.x-hx,dy=sp.y-hy;const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
      const cx=Math.max(40,Math.min(W-40,hx+dx*70)),cy=Math.max(top+40,Math.min(H-40,hy+dy*70)),an=Math.atan2(dy,dx),bob=4*Math.sin(t*8);
      ctx.save();ctx.globalAlpha=a;ctx.translate(cx+dx*bob,cy+dy*bob);ctx.rotate(an);
      for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(-8+i*13,-12);ctx.lineTo(6+i*13,0);ctx.lineTo(-8+i*13,12);ctx.lineWidth=7;ctx.strokeStyle=CSS.ink;ctx.stroke();ctx.lineWidth=3.5;ctx.strokeStyle=i?CSS.bone:CSS.foe;ctx.stroke()}
      ctx.restore()}
    ctx.globalAlpha=a;ctx.font='700 '+Math.round(22*s)+'px '+FONT;spaced(4);inked('OUTSIDE THE RING',W/2,Math.max(top+34,H*.17),pu>.85?CSS.bone:CSS.foe,5);spaced(0);ctx.globalAlpha=1}
  // spectating: who (or what) is being watched
  if(SPEC.on&&play&&ph!=='over'){const y=H*.79;
    ctx.font='700 '+Math.round(13*s)+'px '+FONT;spaced(5);inked('SPECTATING',W/2,y,CSS.dim,4);spaced(0);
    ctx.font='700 '+Math.round(24*s)+'px '+FONT;spaced(1.5);inked(SPEC.rm?SPEC.name.toUpperCase():'THE FIGHT',W/2,y+26*s,SPEC.rm?SPEC.css:CSS.bone,5);spaced(0);
    if(SPEC.n>1||(SPEC.n===1&&SPEC.rm&&!(VS.teams&&!SPEC.rm.foe))){const w=64*s;ctx.fillStyle=SPEC.css;ctx.globalAlpha=.9;
      for(const k of[-1,1]){ctx.beginPath();ctx.moveTo(W/2+k*(w+40*s),y+16*s);ctx.lineTo(W/2+k*(w+30*s),y+9*s);ctx.lineTo(W/2+k*(w+30*s),y+23*s);ctx.closePath();ctx.fill()}ctx.globalAlpha=1}}
  if(ph==='countdown'){
    const tl=num(v.t,0);
    if(tl>0){const n=Math.min(9,Math.ceil(tl)),f=clamp01(n-tl),pop=calm?1:1.55-.55*easeOut(clamp01(f*5)),a=clamp01(f*8)*clamp01((1-f)*5),cy=H*.44,size=170*s;
      ctx.globalAlpha=.5;ctx.fillStyle=CSS.ink;ctx.beginPath();ctx.ellipse(W/2,cy,size*1.5,size*.95,0,0,TAU);ctx.fill();ctx.globalAlpha=.3;ctx.beginPath();ctx.ellipse(W/2,cy,size*1.15,size*.72,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
      ctx.font='700 '+Math.round(17*s)+'px '+FONT;spaced(5);inked('ROUND '+Math.max(1,num(v.round,1)|0),W/2,cy-size*.62,CSS.gold,4);spaced(0);
      ctx.save();ctx.globalAlpha=a;slant(W/2,cy+size*.3,0,pop*.9,pop);ctx.font='700 '+Math.round(size)+'px '+FONT;
      ctx.fillStyle=VS.mine>=0?cssOf(VS.mine):CSS.power;ctx.globalAlpha=a*.7;ctx.fillText(''+n,5,5);ctx.globalAlpha=a;inked(''+n,0,0,CSS.bone,Math.max(5,size*.07));ctx.restore();
      const w=num(v.wins,0);if(w>0){ctx.font='600 '+Math.round(15*s)+'px '+FONT;spaced(3);inked((VS.teams?'TEAMS':'FREE-FOR-ALL')+'   ·   FIRST TO '+w,W/2,cy+size*.56,CSS.dim,3.5);spaced(0)}}
  }else if(ph==='fight'&&VS.prev==='countdown'&&pt<1.1){
    const q=pt/1.1,pop=calm?1:1.5-.5*easeOut(clamp01(q*5)),a=clamp01(q*10)*clamp01((1-q)*3.4),size=120*s;
    ctx.save();ctx.globalAlpha=a;slant(W/2,H*.44+size*.3,-.03,pop*.9,pop);ctx.font='700 '+Math.round(size)+'px '+FONT;spaced(3);
    ctx.fillStyle=CSS.foe;ctx.globalAlpha=a*.7;ctx.fillText('FIGHT',5,5);ctx.globalAlpha=a;inked('FIGHT',0,0,CSS.bone,Math.max(5,size*.07));spaced(0);ctx.restore();
  }else if(ph==='sudden'&&pt<2.6){
    const q=pt/2.6,tin=easeOut(clamp01(pt/.3)),out=clamp01((2.6-pt)/.4);
    vsBand('TIME IS UP','SUDDEN DEATH','THE RING IS CLOSING',CSS.foe,Math.min(1,tin*1.2)*out,(1-tin)*90+(1-out)*-60,Math.round(H*.3),70);
  }else if((ph==='over'||(ph==='results'&&play))&&VS.resOn){
    const tin=easeOut(clamp01(pt/.34)),big=VS.resBig,css=ph==='results'?(VS.resMine>0?CSS.gold:VS.resMine<0?CSS.foe:VS.resCss):VS.resCss;
    vsBand(VS.resTop,big,VS.resSub,css,Math.min(1,tin*1.2),(1-tin)*90,Math.round(H*(ph==='results'?.26:.3)),ph==='results'?84:66);
  }
  ctx.restore();
}

/* ---------- graphics quality, switched live ---------- */
function applyQuality(){
  const low=isLow(),tier=tierNow(),ultra=tier==='ultra';Q.low=low;Q.ultra=ultra;Q.tier=tier;
  maxAniso=ultra?anisoCap:Math.min(4,anisoCap);
  sun.castShadow=!low;renderer.shadowMap.enabled=!low;
  // shadows: 1024 in high over the whole arena; ultra 4096 (2048 on small cards), fitted to the part of the arena in view (fitShadow)
  {const n=ultra?(maxTex>=8192?4096:2048):1024;if(sun.shadow.mapSize.x!==n||low){sun.shadow.mapSize.set(n,n);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}}
  shS=0;fitShadow();
  points[2].visible=points[3].visible=!low;XL[0].visible=XL[1].visible=!low;
  viewPR=0; // resize() picks the new pixel ratio; syncEnv() rebuilds the place without bump maps and with fewer props
  ST.refresh(scene); // ink outlines: stripped in low, rebuilt from the remembered requests in high
}
// ultra: the shadow camera covers only as much of the arena as the view shows (never less than six tenths), centred where the camera looks and
// moved in whole texels so edges do not crawl; the other tiers keep the whole arena
let shS=0,shX=1e9,shZ=1e9;
function fitShadow(){
  const c=sun.shadow.camera,s=Q.ultra?Math.max(.6,Math.min(1,Math.ceil((zoom+.16)*10)/10)):1;
  if(s!==shS){shS=s;shX=1e9;c.left=-560*s;c.right=560*s;c.top=420*s;c.bottom=-420*s;c.updateProjectionMatrix()}
  let ox=0,oz=0;
  if(s<1){const tx=1120*s/sun.shadow.mapSize.x*4,mx=560*(1-s),mz=300*(1-s);ox=Math.round(Math.max(-mx,Math.min(mx,camTarget.x-W/2))/tx)*tx;oz=Math.round(Math.max(-mz,Math.min(mz,camTarget.z-H/2))/tx)*tx}
  if(ox!==shX||oz!==shZ){shX=ox;shZ=oz;sun.position.set(W/2-300+ox,620,H/2+300+oz);sun.target.position.set(W/2+ox,0,H/2+oz);sun.target.updateMatrixWorld()}
}
if(typeof MB.on==='function')try{MB.on('settings',()=>{if(alive&&tierNow()!==Q.tier)applyQuality()})}catch(e){}

/* ---------- frame ---------- */
let lastSight=null,alive=true;
function draw(dt){
  if(!alive)return;
  const S=MB.S,P=MB.P,t=S.t,trial=trialOf(),dark=!!trial&&MB.has('sight')&&HCAP(trial)==='dark',sight=MB.has('sight')&&!dark;
  fogR=dark?Math.max(FOG,Math.min(520,trial.sight>0?+trial.sight:MB.sightR>0?+MB.sightR:FOG*1.85)):FOG;seeing=sight;
  if(tierNow()!==Q.tier)applyQuality();
  if(VS.on||R.testVs||(MB.mp&&MB.mp.vs))vsFrame(dt);
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
  ST.uMin.value=viewH?2*fitD*zoom*Math.tan(camera.fov*Math.PI/360)/viewH*.95*Math.max(1,1/viewPR)*Math.max(1,Math.min(1.8,viewH/900)):0; // ink lines never thinner than about a pixel (a little more on a very tall view)
  if(!Q.low)fitShadow();

  // lights
  const low=Q.low,nL=low?2:4;
  if(!sight){
    hemi.color.setHex(0xaab0c0);hemi.groundColor.setHex(0x1c1c22);hemi.intensity=.3;
    sun.color.setHex(0xffffff);sun.intensity=.5;
    points[0].color.setHex(0xffffff);points[0].intensity=.8;points[0].distance=fogR*2.4;points[0].position.set(P?P.x:W/2,140,(P?P.y:H/2)+34);
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
  if(trial||TR.on)syncTrial(trial,dt,sight);
  if(P){
    if(!playerRec)playerRec=makeEnt('player',P,phPlayer);
    playerRec.g.position.set(P.x,0,P.y);playerRec.g.visible=true;
    updateEnt(playerRec,'player',P,dt,phPlayer,phPlayerUpdate);
    if(P.down||FX.fall>0){ // multiplayer: our own hero is down and lies where it fell, as the other members' do
      const f=FX.fall+=((P.down?1:0)-FX.fall)*Math.min(1,dt*(P.down?5:9)),g=playerRec.g;if(!P.down&&f<.004)FX.fall=0;
      g.rotation.order='YXZ';layDown(g,P,FX.fall)}
    if(low){const b=pools.blob.get();b.position.set(P.x,.55,P.y);b.scale.set(70,1,56)}
    if(VS.on&&VS.mine>=0&&S.mode==='play'){ // versus: our own ring, in our own (or our team's) colour
      remSetup();const o=pools.vmark.get(),dn=!!P.down;o.position.x=P.x;o.position.z=P.y;o.scale.setScalar(74);o.rotation.y=dn?t*.7:playerRec.g.rotation.y-Math.PI/2;o.material.color.setHex(VS.mine);o.material.opacity=dn?.5+.3*Math.sin(t*5):.92;
      if(!dn&&sight){const q=pools.vglow.get();q.position.x=P.x;q.position.z=P.y;q.scale.setScalar(118);q.material.color.setHex(VS.mine);q.material.opacity=.3}}
  }else if(playerRec)playerRec.g.visible=false;
  syncMap(monMap,MB.mons,'monster',dt,phMonster,phMonsterUpdate,sight);
  const allies=R.testAllies||MB.allies||NONE;
  syncDying(dt);
  syncMap(allyMap,allies,'ally',dt,phAlly,phAllyUpdate,true);
  // multiplayer: the other members' heroes, allies, shots and echoes (nothing at all happens here in single-player)
  {const mp=MB.mp,rl=R.testRemotes||(mp&&mp.on&&mp.remotes)||null;if((rl&&rl.length)||rems.length)syncRemotes(rl||NONE,dt,sight)}
  syncFx(dt,sight);
  syncEchoes(dt,sight);

  // projectiles
  const shots=MB.shots;
  for(let i=0;i<shots.length;i++){const s=shots[i],o=pools.shot.get(),r=s.r||5;o.position.set(s.x,SHOT_Y,s.y);o.scale.setScalar(r);o.rotation.y=-Math.atan2(s.vy||0,s.vx||0);o.userData.trail.visible=!low&&!!(s.vx||s.vy);o.userData.core.scale.setScalar(.8+.12*Math.sin(t*30+i))}
  const ps=MB.pshots;
  for(let i=0;i<ps.length;i++){const p=ps[i];drawPshot(p,i,p.x,p.y,t,low,pools[p.kind]||pools.bolt)}
  const mor=MB.morsels;
  for(let i=0;i<mor.length;i++){const f=mor[i],o=pools.morsel.get();o.position.set(f.x,0,f.y);const b=o.userData.bob;b.position.y=13+Math.sin(t*4+i)*3;b.rotation.y=t*1.6+i}
  {const fs=MB.fields;if(fs&&fs.length)drawFields(fs,t,low,sight);if(R.testFields)drawFields(R.testFields,t,low,sight);
    const ar=R.testArcs||MB.arcs;if(ar&&ar.length)drawArcs(ar,t,low,sight);if(IMK.length)imxEnd()}
  if(sight&&MB.has('touch')){const zs=MB.zones;
    for(let i=0;i<zs.length;i++){const z=zs[i],q=Math.min(1,z.t/z.dur),o=pools.zone.get(),u=o.userData;o.position.set(z.x,0,z.y);
      const zm=z.mine&&z.foe!==true;u.disc.material.color.setHex(zm?0x5a48ff:0xd0143c);u.rim.material.color.setHex(zm?PAL.power2:0xffc04a);
      u.disc.scale.setScalar(z.r);u.rim.scale.setScalar(z.r);u.grow.scale.setScalar(Math.max(.01,z.r*q));u.disc.material.opacity=.16+.4*q+(q>.8?.12*Math.sin(t*40):0)}}
  {const ms=MB.mons;for(let i=0;i<ms.length;i++){const m=ms[i],b=m.beam;if(!b||m.hidden||!b.rays)continue;
    for(let j=0;j<b.rays.length;j++){const ry=b.rays[j],o=pools.beam.get(),u=o.userData,len=Math.max(1,ry.len),w=b.w||12;
      o.position.set(m.x+Math.cos(ry.a)*len/2,SHOT_Y,m.y+Math.sin(ry.a)*len/2);o.rotation.y=-ry.a;
      u.core.visible=u.glow.visible=!!b.on;u.line.visible=!b.on;
      if(b.on){const fl=1+.18*Math.sin(t*47+j);u.core.scale.set(len,w*.55*fl,w*.9*fl);u.glow.scale.set(len+w*3,1,w*5.5*fl)}
      else u.line.scale.set(len,.6,2.2+1.2*Math.sin(t*26))}}}
  // the guardian's ward, while it is ready to take a blow: a thin gold ring at the healer's feet
  if(P&&sight)for(let i=0;i<allies.length;i++){const a=allies[i];if(!a||a.kind!=='guardian'||!(a.shield===true||a.shield>0))continue;
    const o=pools.ward.get();o.position.x=P.x;o.position.z=P.y;o.scale.setScalar(27+1.5*Math.sin(t*4));o.rotation.y=t*.8;o.material.opacity=.5+.15*Math.sin(t*4);o.material.color.setHex(PAL.holy);break}
  allyBeams(allies,t);if(P&&P.beam)heroBeam(P,t);
  {const zs=MB.zones;for(let i=0;i<zs.length;i++){const z=zs[i];if(typeof z.sx!=='number'||z.t>=z.dur)continue;const q=Math.max(0,z.t/z.dur),o=(z.mine&&z.foe!==true?pools.pbomb:pools.bomb).get();
    o.position.set(z.sx+(z.x-z.sx)*q,12+Math.sin(q*Math.PI)*(70+z.dur*40),z.sy+(z.y-z.sy)*q);o.rotation.x=t*7+i}}
  if(sight){const rs=MB.rings,hear=MB.has('hearing');
    for(let i=0;i<rs.length;i++){const r=rs[i];if(!r.fx&&!(r.under&&hear))continue;
      const q=1-r.life/r.max,o=pools.ring.get();o.position.x=r.x;o.position.z=r.y;o.scale.setScalar(6+r.r*easeOut(q));o.material.opacity=Math.max(0,(1-q)*(1-q)*.95);o.material.color.setHex(r.foe===true?PAL.foe:0xffd27a)}}
  if(VS.on||RG)syncRing(dt,sight);
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
  try{cv.width=W*2;cv.height=H*2;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,cv.width,cv.height)}catch(e){} // back to the size the 2D game set at load
  try{if(env)disposeEnv(env);renderer.dispose()}catch(e){}
}
function onLost(e){e.preventDefault();console.warn('Marrowborn: WebGL context lost, falling back to 2D');dispose()}
glc.addEventListener('webglcontextlost',onLost);

// a CSS filter lifts #gl into its own stacking layer; give the overlay canvas a z-index so it stays on top (below #ov, which has z-index 1)
cv.style.zIndex='0';
glc.style.transition='filter 1.2s';
glc.hidden=false;
applyQuality();
resize();placeCamera(W/2,H/2,fitD);
R.draw=draw;R.screenToGame=screenToGame;R.dispose=dispose;R.info=()=>renderer.info.render;
// frame(): what is being drawn right now: CSS box, pixel ratio and backing size of #gl, the overlay's backing size and unit, the tier, MSAA
R.frame=()=>({css:[FR.w,FR.h],pr:FR.pr,gl:[FR.bw,FR.bh],pixels:FR.bw*FR.bh,overlay:[OV.bw,OV.bh],unit:OV.u,tier:Q.tier,msaa:aaMade,shadow:Q.low?0:sun.shadow.mapSize.x,aniso:maxAniso});
Object.defineProperty(R,'needsRestart',{get(){return alive&&wantAA()!==aaMade},enumerable:true});R.settle=()=>{frameWant(seeing);camTarget.x=want.x;camTarget.z=want.z;zoom=want.zoom};R.testObstacles=null;R.testAllies=null;R.testEchoes=null;R.testRemotes=null;R.testTrial=null;R.testApex=null;R.testFields=null;R.testArcs=null;R.testBand=null;R.testVs=null;R.memberColor=memberColor;R.teamColor=t=>cssOf(teamHex(t));R.vsColor=(idx,team)=>cssOf(vsHex(idx,team));R.spectate=spectate;R.scene=scene;R.camera=camera;R.ok=true;
})();
