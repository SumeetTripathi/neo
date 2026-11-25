/* Ashes to Apex: the tower map, the seasoned-climb start, the between-floors glimpse and the trial HUD.
   Uses only window.MB and the DOM. Everything here stays hidden when its data (MB.tower, MB.trial) is absent, and the game runs without this file.
   Styles live in index.html (#mbt, .mbt-*, .trialHud, .mbt-peek). */
(function(){'use strict';
var win=window,doc=document;
try{
var MB=win.MB;
if(!MB||!doc.querySelector||!doc.querySelector('.stage'))return;
function $(id){return doc.getElementById(id)}
function h(tag,attrs){
  var e=doc.createElement(tag),i,k;
  if(attrs)for(k in attrs){if(k==='text')e.textContent=attrs[k];else if(k==='class')e.className=attrs[k];else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k]===true?'':attrs[k])}
  for(i=2;i<arguments.length;i++){var c=arguments[i];if(c==null||c===false)continue;if(Array.isArray(c)){for(var j=0;j<c.length;j++)if(c[j])e.appendChild(c[j]);continue}e.appendChild(typeof c==='string'?doc.createTextNode(c):c)}
  return e;
}
function num(v,d){v=+v;return isFinite(v)?v:(d||0)}
function touch(){try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}}
function calm(){try{return matchMedia('(prefers-reduced-motion:reduce)').matches}catch(e){return false}}
function blip(){try{if(MB.api&&MB.api.haptic)MB.api.haptic(10)}catch(e){}}
function S(){return MB.S||{}}
function coop(){try{return !!(MB.mp&&MB.mp.on)}catch(e){return false}}
// the tower data, or null: every feature checks this each time it is used
function T(){try{var t=MB.tower;return t&&typeof t==='object'&&typeof t.ahead==='function'?t:null}catch(e){return null}}
function trialNow(){try{return MB.trial||null}catch(e){return null}}

/* ---------- floor kinds: name, one plain line, and an icon drawn here ---------- */
var KIND={
  root:    {name:'Root',      line:'The crypt under the tower. Each kill gives part of a body back.',
            d:'<path d="M7.5 16.5l9-9"/><circle cx="5.6" cy="15.6" r="2"/><circle cx="8.4" cy="18.4" r="2"/><circle cx="15.6" cy="5.6" r="2"/><circle cx="18.4" cy="8.4" r="2"/>'},
  fight:   {name:'Fight',     line:'Kill what holds the floor.',
            d:'<path d="M5 4.5l10.5 10.5M19 4.5L8.5 15M4.5 14.5l5 5M19.5 14.5l-5 5M6 18l-2 2M18 18l2 2"/>'},
  survive: {name:'Hold out',  line:'A trial. Stay alive until the time runs out.',
            d:'<path d="M6 3.5h12M6 20.5h12M7.5 3.5c0 5.5 9 6.5 9 17M16.5 3.5c0 5.5-9 6.5-9 17"/><path d="M10.5 18.5h3" stroke-width="2.4"/>'},
  guard:   {name:'Protect',   line:'A trial. Keep the relic standing while they come for it.',
            d:'<path d="M5 12.5h14l-2.6 4.5H7.6zM9.5 17l-1.5 4M14.5 17l1.5 4"/><path d="M12 2.5c2.2 2.6 3.2 4.2 3.2 5.8a3.2 3.2 0 0 1-6.4 0c0-1.3 1-2.4 3.2-5.8z"/>'},
  race:    {name:'Race',      line:'A trial. Kill the monster before the time runs out.',
            d:'<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9M9.8 3.5h4.4M12 3.5v3M17.6 7.4L19 6"/>'},
  ordeal:  {name:'Ordeal',    line:'A trial. One fight under a handicap, for a bigger reward.',
            d:'<path d="M12 2.8l9.2 9.2-9.2 9.2L2.8 12z"/><path d="M8.2 15.8l7.6-7.6"/>'},
  cross:   {name:'Crossroads',line:'A trial. After the fight, two doors: each names a risk and a reward for the next floor.',
            d:'<path d="M3.5 20V9a4 4 0 0 1 8 0v11M12.5 20V9a4 4 0 0 1 8 0v11M2 20h20"/><path d="M9 14.5v1M15 14.5v1" stroke-width="2.4"/>'},
  guardian:{name:'Guardian',  line:'The guardian of these floors. A long fight in three phases.',
            d:'<path d="M2.8 12.5c3-4.6 6-6.8 9.2-6.8s6.2 2.2 9.2 6.8c-3 4.6-6 6.8-9.2 6.8s-6.2-2.2-9.2-6.8z"/><path d="M12 9.2v6.6M12 1.8v2.2M5.6 3.6l1.3 1.9M18.4 3.6l-1.3 1.9"/>'}
};
function kindOf(k){return KIND[k]||KIND.fight}
function icon(kind,cls){
  var s=h('span',{class:'mbt-ic'+(cls?' '+cls:''),'aria-hidden':'true'});
  s.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">'+kindOf(kind).d+'</svg>';
  return s;
}
// a band's colour: LOGIC gives a hue (0-360), or a colour as a hex string or number
function bandCol(b){
  var v=b&&b.hue,r,g,bl,n;
  if(typeof v==='string'&&/^#?[0-9a-f]{6}$/i.test(v))n=parseInt(v.replace('#',''),16);
  else if(typeof v==='number'&&v>360)n=v&0xffffff;
  if(n!=null){r=n>>16&255;g=n>>8&255;bl=n&255;var m=Math.max(r,g,bl,1),k=Math.max(1,200/m);r=Math.min(255,Math.round(r*k));g=Math.min(255,Math.round(g*k));bl=Math.min(255,Math.round(bl*k));
    return ['rgb('+r+','+g+','+bl+')','rgba('+r+','+g+','+bl+',.15)']}
  v=((num(v,265)%360)+360)%360;
  return ['hsl('+v+',72%,70%)','hsla('+v+',70%,55%,.15)'];
}
function bandName(b){return b==null?'':typeof b==='string'?b:typeof b==='object'?b.name||'':''}
// a floor row from MB.tower: its band may be a name, an index into the bands, or missing
function rowBand(t,a){if(!a)return '';if(a.bandName)return a.bandName;if(typeof a.band==='string')return a.band;return bandName(bandAt(t,a.floor))}
function floorAt(t,f){var r=null;try{if(typeof t.at==='function')r=t.at(f)}catch(e){}if(!r){var L=S().L;r={floor:f,kind:L&&Math.round(num(t.floor))===f&&(L.floorKind||(KIND[L.kind]&&L.kind))||'fight',rule:''}}return r}
function bands(t){var a=[];try{a=(t.bands||[]).filter(function(b){return b&&isFinite(+b.from)}).slice().sort(function(x,y){return x.from-y.from})}catch(e){}return a}
function bandAt(t,f){var a=bands(t),i;for(i=0;i<a.length;i++)if(f>=a[i].from&&f<=num(a[i].to,1e9))return a[i];return null}
function ahead(t,n){var a=[];try{a=t.ahead(n)||[]}catch(e){}return a.filter(function(x){return x&&isFinite(+x.floor)})}
function cps(t){var a=[];try{a=(t.checkpoints||[]).map(Number).filter(isFinite)}catch(e){}return a.sort(function(x,y){return x-y})}
function climbing(){var m=S().mode;return !!m&&m!=='title'}
function hasSetting(k){try{return !!MB.settings&&k in MB.settings&&typeof MB.setSetting==='function'}catch(e){return false}}
// the apex paths. The game owns them (MB.apexPaths: [{id, side, name, title, blurb, skills:[{name,text}]}]); until it lists them, this copy of the ten stands in:
// [id, side, name, title, one sentence]. The sides: 'dominion' = you command others, 'order' = you are the weapon.
var APEXTAB=[
  ['dominion','dominion','The Tithe','Tithe-Taker','What you kill owes you: the slain rise as the Owed and fight at your side.'],
  ['beasts','dominion','The Feral Vow','Vowkeeper','A spectral pack hunts beside you and grows stronger in numbers.'],
  ['frost','dominion','The Still Winter','Winterbound','Monsters are chilled, frozen solid and shattered, and ice-wights stand guard.'],
  ['plague','dominion','The Slow Rot','Rotwright','A rot spreads from monster to monster and weakens whatever it touches.'],
  ['flame','dominion','The Last Pyre','Pyrekeeper','The ground burns, and living cinders hurl themselves at monsters.'],
  ['order','order','The White Marrow','Whitemarrow','The power is your own: a ring of light, a beam, and ascension.'],
  ['storm','order','The Split Sky','Skysplit','Great speed, and lightning that chains from monster to monster.'],
  ['stone','order','The Standing Stone','Stonesworn','Guard plates that barely break, fissures and crushing blows.'],
  ['blade','order','The Thousandth Cut','Edgewalker','Blades of light float beside you, strike when you strike and finish the weak.'],
  ['tide','order','The Returning Tide','Tidecaller','Waves push monsters back and wear them down while you steadily heal.']];
function apexId(v){return typeof v==='string'&&/^[a-z][a-z0-9]{0,23}$/i.test(v)?v:''}
function apexRow(id){for(var i=0;i<APEXTAB.length;i++)if(APEXTAB[i][0]===id)return APEXTAB[i];return null}
function str(v){return typeof v==='string'?v:''}
// every path that can be named: the game's list when it has one (real:true), else the built-in ten with the game's own words for those it knows
function apexAll(){
  var src=null,out=[],i;
  try{src=MB.apexPaths}catch(e){}
  if(Array.isArray(src)){
    for(i=0;i<src.length;i++){var o=src[i],id=o&&apexId(o.id||o.path);if(!id)continue;var r=apexRow(id)||[id,'order',id,'',''];
      out.push({id:id,side:o.side==='dominion'||o.side==='order'?o.side:r[1],name:str(o.name)||r[2],title:str(o.title)||r[3],blurb:str(o.blurb)||str(o.sub)||r[4],text:str(o.text)||str(o.lore),
        skills:(Array.isArray(o.skills)?o.skills:[]).map(function(x){return x&&typeof x==='object'?str(x.name):str(x)}).filter(Boolean).slice(0,4),real:true})}
    if(out.length)return out;
  }
  var old=null;try{old=MB.APEX}catch(e){}
  return APEXTAB.map(function(r){var o=old&&typeof old==='object'&&old[r[0]]||{};return {id:r[0],side:r[1],name:str(o.name)||r[2],title:str(o.title)||r[3],blurb:r[4],text:str(o.text),skills:[],real:false}});
}
// the paths a seasoned climb can start with. The game's own list is taken as it is. Without one, a path is offered only if the game keeps it when asked what such a hero would be
// (it turns a path it does not know into another); where that cannot be asked, all are offered.
function apexOffer(t,floor,cls){
  var all=apexAll();if(!all.length||all[0].real||!t||typeof t.seasoned!=='function')return all;
  var ok=[],asked=false,i,d;
  for(i=0;i<all.length;i++){d=null;try{d=t.seasoned(Math.max(101,floor||101),{cls:cls,apex:all[i].id})}catch(e){}
    if(d&&typeof d==='object'&&'apex' in d){asked=true;if(d.apex===all[i].id)ok.push(all[i])}}
  return asked&&ok.length?ok:all;
}
function apexInfo(id){
  var all=apexAll(),i,a=null;for(i=0;i<all.length;i++)if(all[i].id===id){a=all[i];break}
  if(!a){var r=apexRow(id),m=null;try{m=MB.apex}catch(e){}if(m&&m.path!==id)m=null;
    a={id:apexId(id),side:m&&m.side||r&&r[1]||'order',name:m&&m.name||r&&r[2]||String(id||''),title:m&&m.title||r&&r[3]||'',blurb:r&&r[4]||'',text:m&&str(m.lore)||'',skills:[],real:false}}
  return a;
}
function sigil(){return h('i',{class:'apexSigil','aria-hidden':'true'})}
// a path named in passing (the map, the trail of a seasoned start): sigil, title, name
function apexBadge(id,short){var a=apexInfo(id);return h('span',{class:'apexBadge'+(a.id?' apexPath-'+a.id:'')+' apexSide-'+a.side},sigil(),short||!a.title?a.name:a.title,short||!a.title?null:h('small',{text:a.name}))}
function apexCard(a,fn,on,long){
  var b=h('button',{type:'button',class:'apexCard apexSide-'+a.side+' apexPath-'+a.id,'data-apex':a.id,'data-skills':a.skills.length?a.skills.join(' · '):null,'aria-pressed':on?'true':null},
    h('b',{text:a.name}),h('small',{text:a.title}),h('span',{text:long&&a.text||a.blurb}));
  b.addEventListener('click',function(){blip();fn()});return b;
}

/* ---------- the layer: one dialog over the arena (like the settings and multiplayer layers) ---------- */
var layer=null,panel=null,view=null,screen='',back=null;
function ensureLayer(){
  if(layer)return true;
  var stage=doc.querySelector('.stage');if(!stage)return false;
  panel=h('div',{class:'mbx-panel mbt-panel',role:'dialog','aria-modal':'true',tabindex:'-1','aria-label':'The climb'});
  layer=h('div',{id:'mbt',hidden:true},panel);
  stage.appendChild(layer);
  // while the layer is up the game must not see keys: Enter would press the screen underneath, Esc would unpause
  win.addEventListener('keydown',function(e){
    if(!layer||layer.hidden)return;
    e.stopImmediatePropagation();
    var t=e.target,tag=t&&t.tagName;
    if(e.key==='Escape'){e.preventDefault();if(view&&view.esc)view.esc();return}
    if(e.key==='Enter'){if(tag==='BUTTON')return;if(tag==='INPUT'&&t.type==='checkbox'){e.preventDefault();t.click();return}if(view&&view.enter){e.preventDefault();view.enter()}return}
    if(e.key==='Tab'){
      var f=[].filter.call(panel.querySelectorAll('button,input,[tabindex="0"]'),function(x){return !x.disabled&&x.offsetParent!==null});
      if(!f.length){e.preventDefault();return}
      var i=f.indexOf(doc.activeElement);
      if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}
      else if(!e.shiftKey&&(i<0||i===f.length-1)){e.preventDefault();f[0].focus()}
    }
  },true);
  win.addEventListener('keyup',function(e){if(layer&&!layer.hidden)e.stopImmediatePropagation()},true);
  return true;
}
function render(name,build,v){
  if(!ensureLayer())return;
  screen=name;view=v||{};panel.textContent='';panel.className='mbx-panel mbt-panel mbt-'+name;
  var focus=null;
  try{focus=build(panel)}catch(e){try{console.warn('tower: screen failed',e)}catch(_){}panel.textContent='';panel.appendChild(h('p',{class:'mbx-center',text:'The map could not be drawn.'}));panel.appendChild(h('div',{class:'btns'},focus=btn('Back',closeAll,true)))}
  if(layer.hidden){layer.hidden=false;var ov=$('ov');if(ov)try{ov.inert=true}catch(e){}}
  layer.scrollTop=0;panel.scrollTop=0;
  try{(focus||panel).focus({preventScroll:true})}catch(e){}
}
function hideLayer(){
  if(!layer||layer.hidden)return;
  layer.hidden=true;view=null;screen='';panel.textContent='';
  var ov=$('ov');if(ov){try{ov.inert=false}catch(e){}
    var b=!ov.hidden&&ov.querySelector('#ovBtns button');if(b&&!touch())try{b.focus({preventScroll:true})}catch(e){}}
}
function closeAll(){
  var b=back;back=null;hideLayer();
  if(typeof b==='function'){try{b()}catch(e){}}
}
function btn(label,fn,primary,attrs){
  var b=h('button',{type:'button',text:label,class:primary?'primary':null});
  if(attrs)for(var k in attrs)if(attrs[k]!=null&&attrs[k]!==false)b.setAttribute(k,attrs[k]===true?'':attrs[k]);
  b.addEventListener('click',function(){blip();fn(b)});return b;
}
function tile(value,label,cls){return h('div',{class:cls||null},h('b',{text:String(value)}),h('small',{text:label}))}

/* ---------- the map ---------- */
var pick=0; // which floor of the "next floors" strip is described
function showMap(){
  var t=T();if(!t){closeAll();return}
  render('map',function(p){
    var floor=Math.max(1,Math.round(num(t.floor,1))),best=Math.max(0,Math.round(num(t.best,0))),list=cps(t),bs=bands(t),inRun=climbing(),co=coop();
    var mark=inRun||floor>1,here=bandAt(t,floor),starts=list.filter(function(f){return f>=11}),canStart=!co&&starts.length>0&&typeof t.startAt==='function';
    var top=Math.max(best,floor)+50;
    p.appendChild(h('div',{class:'mbt-head'},h('p',{class:'kick',text:'The climb'}),h('h2',{text:t.name||'The tower'})));
    var mine=null;try{mine=MB.apex}catch(e){}
    if(mine&&mine.path&&mark&&S().cls)p.appendChild(h('p',{class:'mbt-apex'},apexBadge(mine.path)));
    p.appendChild(h('div',{class:'mbx-tiles mbt-tiles'},
      tile(mark?floor:'—',inRun?'Floor now':mark?'Resume at floor':'Not climbing','mbt-t-now'),
      tile(best||'—','Best floor','mbt-t-best'),
      tile(starts.length,starts.length===1?'Checkpoint':'Checkpoints'),
      h('div',{class:'mbt-t-band'},h('b',{text:bandName(here)||'—'}),h('small',{text:here?'Floors '+here.from+' to '+num(here.to,here.from):'Band'}))));
    if(co)p.appendChild(h('p',{class:'mbt-note mbt-co'},h('b',{text:'Co-op. '}),'The map is view only here. A climb from a checkpoint can only be started in a single-player game.'));

    /* next floors */
    var nx=inRun?ahead(t,10):[floorAt(t,floor)].concat(ahead(t,9)),about=h('p',{class:'mbt-about','aria-live':'polite'}),strip=h('div',{class:'mbt-strip',role:'group','aria-label':'The next floors'}),tiles=[];
    function describe(i){
      pick=i;var a=nx[i];if(!a)return;
      tiles.forEach(function(b,j){b.setAttribute('aria-pressed',j===i?'true':'false')});
      about.textContent='';var k=kindOf(a.kind),bn=rowBand(t,a);
      about.appendChild(h('b',{text:'Floor '+a.floor+' · '+k.name+(bn?' · '+bn:'')}));about.appendChild(doc.createTextNode(' '+(a.rule||k.line)));
    }
    nx.forEach(function(a,i){
      var k=kindOf(a.kind),b=h('button',{type:'button',class:'mbt-fl k-'+(KIND[a.kind]?a.kind:'fight')+(a.floor===floor&&inRun?' now':''),'aria-pressed':'false','aria-label':'Floor '+a.floor+', '+k.name},
        icon(a.kind),h('b',{text:String(a.floor)}),h('small',{text:k.name}));
      b.addEventListener('click',function(){describe(i)});b.addEventListener('focus',function(){describe(i)});
      tiles.push(b);strip.appendChild(b);
    });
    var right=h('section',{class:'mbt-next'},h('h3',{class:'mbt-h',text:inRun?'After this floor':floor>1?'From floor '+floor:'The first floors'}),strip,about);
    if(!nx.length){strip.hidden=true;about.textContent='Nothing is known of the floors above.'}
    else describe(Math.min(pick,nx.length-1)>=0&&screen==='map'&&pick<nx.length?pick:0);

    /* the tower: bands from the root up, the highest at the top */
    var col=h('div',{class:'mbt-col',tabindex:'0',role:'group','aria-label':'The tower, band by band'}),hereEl=null;
    bs.slice().reverse().forEach(function(b,ri){
      var i=bs.length-1-ri,from=Math.round(b.from),to=Math.round(num(b.to,from)),c=bandCol(b);if(from>top)return;
      var span=Math.max(1,to-from+1),pct=function(f){return Math.max(0,Math.min(1,(f-from+1)/span))};
      var el=h('div',{class:'mbt-band'+(floor>=from&&floor<=to&&mark?' here':'')+(best>=to?' done':'')+(from>Math.max(best,floor)?' far':''),style:'--bh:'+c[0]+';--bf:'+c[1]+';--i:'+Math.min(i,7)+';--pb:'+pct(best)+';--pc:'+(mark?pct(floor):0)});
      el.appendChild(h('i',{class:'mbt-rail','aria-hidden':'true'}));
      var tags=h('span',{class:'mbt-tags'});
      if(mark&&floor>=from&&floor<=to)tags.appendChild(h('span',{class:'mbt-tag you',text:(inRun?'You · floor ':'Resume · floor ')+floor}));
      if(best>=from&&best<=to)tags.appendChild(h('span',{class:'mbt-tag best',text:'Best '+best}));
      el.appendChild(h('div',{class:'mbt-bhead'},h('b',{class:'mbt-bn',text:bandName(b)||'Floors'}),h('span',{class:'mbt-br lab',text:from===to?'Floor '+from:'Floors '+from+' to '+to}),tags));
      var row=h('div',{class:'mbt-cps'}),f,any=false;
      for(f=Math.ceil((from-1)/10)*10+1;f<=Math.min(to,top);f+=10){
        var open=list.indexOf(f)>=0,isG=f>1;any=true;
        if(open&&canStart&&f>=11){(function(f){row.appendChild(btn(String(f),function(){startFlow(f)},false,{class:'mbt-cp open','aria-label':'Checkpoint, floor '+f+'. Start a seasoned climb here.'}))})(f)}
        else row.appendChild(h('span',{class:'mbt-cp'+(open?' open':' shut'),'aria-label':(open?'Checkpoint, floor ':'Locked checkpoint, floor ')+f,text:String(f)}));
      }
      if(any){el.appendChild(h('div',{class:'mbt-cprow'},h('span',{class:'lab',text:'Checkpoints'}),row))}
      if(el.classList.contains('here')||(!hereEl&&!inRun&&best>=from&&best<=to))hereEl=el;
      col.appendChild(el);
    });
    var left=h('section',{class:'mbt-tower'},h('h3',{class:'mbt-h',text:'The tower'}),col);
    p.appendChild(h('div',{class:'mbt-cols'},left,right));

    /* (round 16) fissures: side floors that stand open off the stair */
    var fz=null;try{fz=MB.fissures}catch(e){}
    if(fz&&!co&&S().cls&&(fz.open&&fz.open.length||fz.done)){
      var fs=h('section',{class:'mbt-fis'},h('h3',{class:'mbt-h',text:'Fissures'}));
      if(fz.open.length)fz.open.forEach(function(f){
        var row=h('div',{class:'mbt-fz'},h('div',{class:'mbt-fzt'},h('b',{text:f.name}),h('small',{text:'Off floor '+f.floor+' · '+f.time+' s · '+f.twist.name}),h('span',{text:f.twist.text})));
        if(fz.can)row.appendChild(btn('Step in',function(){var N=f.floor;back=null;hideLayer();var ok=false;try{ok=MB.fissureEnter(N)}catch(e){}if(!ok){try{if(MB.api&&MB.api.hide)MB.api.hide()}catch(e){}}},false,{class:'mbt-mini','aria-label':'Step into '+f.name+', the fissure off floor '+f.floor}));
        fs.appendChild(row)});
      else fs.appendChild(h('p',{class:'mbt-note',text:'None stands open. One splits the wall off one floor in every ten.'}));
      fs.appendChild(h('p',{class:'mbt-note',text:'A fissure is never on the way up: two packs and a keeper against a clock, with a twist. Closed in time it gives a drop that is rare or better and bears a mark. Closed so far on this climb: '+num(fz.done)+'.'}));
      right.appendChild(fs);
    }
    /* what can be done from here */
    if(!co){
      right.appendChild(h('p',{class:'mbt-note'+(canStart?' mbt-opt':'')},canStart?'A checkpoint opens every ten floors. A climb can start at any open one with a seasoned hero: a little weaker than one built floor by floor.'
        :'Reach floor 11 to open the first checkpoint. A new climb can then start from it with a seasoned hero.'));
    }
    if(hasSetting('testUnlock')&&MB.settings.testUnlock){
      // the switch itself is in Settings; here it can only be turned off, so nobody mistakes a test for their own climb
      p.appendChild(h('p',{class:'mbt-note mbt-testing'},h('b',{text:'Testing. '}),'Every checkpoint up to floor 201 is open, and Jump to floor reaches any floor up to 9999. ',btn('Turn off',function(){try{MB.setSetting('testUnlock',false)}catch(e){}if(screen==='map')showMap()},false,{class:'mbt-mini'})));
    }
    if(testing())p.appendChild(jumpBox(t,'map'));
    var first=btn(inRun&&!co&&S().paused?'Back':'Close',closeAll,!canStart),bt=h('div',{class:'btns'});
    if(canStart){var sb=btn('Start from a checkpoint',function(){startFlow(0)},true);bt.appendChild(sb);bt.appendChild(first);first=sb}else bt.appendChild(first);
    p.appendChild(bt);
    // bring the band you are in into view inside the scrolling column
    setTimeout(function(){try{var e=hereEl||col.lastChild;if(e)col.scrollTop=e.offsetTop-col.offsetTop-Math.max(0,(col.clientHeight-e.offsetHeight)/2)}catch(_){}},0);
    return first;
  },{esc:closeAll,enter:null});
}

/* ---------- a seasoned climb from a checkpoint: floor, class, upgrade past 50, apex path past 100, then a confirm step ---------- */
var flow=null;
function startFlow(floor,jump){
  var t=T();if(!t||coop())return;
  flow={floor:floor||0,cls:null,adv:null,apex:null,fixed:!!floor,jump:jump||'',hero:jump?heroFloor(t,floor):floor||0};
  step(floor?'cls':'cp');
}
function steps(){var a=['cp','cls'];if(flow.floor>50)a.push('adv');if(flow.floor>100)a.push('apex');a.push('ok');return a}
function nextOf(s){var a=steps(),i=a.indexOf(s);return a[Math.min(a.length-1,i+1)]}
function prevOf(s){var a=steps(),i=a.indexOf(s);return i<=0||(i===1&&flow.fixed)?null:a[i-1]}
function clsOf(id){try{return MB.CLASSES&&MB.CLASSES[id]||null}catch(e){return null}}
function advOf(cls,id){var c=clsOf(cls),a=c&&c.adv||[],i;for(i=0;i<a.length;i++)if(a[i]&&a[i][0]===id)return a[i];return null}
function trail(){
  var out=[];if(flow.floor)out.push('Floor '+flow.floor);
  var c=clsOf(flow.cls);if(c)out.push(c.name||flow.cls);
  var a=advOf(flow.cls,flow.adv);if(a&&flow.floor>50)out.push(a[1]);
  if(flow.apex&&flow.floor>100)out.push({apex:flow.apex});
  return out;
}
function crumb(x){return x&&x.apex?apexBadge(x.apex,true):h('span',{text:x})}
function card(title,sub,body,fn,cls,on){
  var b=h('button',{type:'button',class:cls||null,'aria-pressed':on?'true':null},h('b',{text:title}),h('small',{text:sub||''}),h('span',{text:body||''}));
  b.addEventListener('click',function(){blip();fn()});return b;
}
function step(name){
  var t=T();if(!t||!flow||coop()){showMap();return}
  var all=steps(),n=all.indexOf(name)+(flow.fixed?0:1),of=all.length-(flow.fixed?1:0),prev=prevOf(name);
  function goBack(){if(prev)step(prev);else{var j=flow.jump;flow=null;if(j==='jump')showJump();else showMap()}}
  render('flow',function(p){
    var focus=null,tr=trail();
    function head(title,lead){
      p.appendChild(h('div',{class:'mbt-head'},h('p',{class:'kick',text:'Seasoned climb · step '+n+' of '+of}),h('h2',{text:title})));
      if(tr.length&&name!=='ok')p.appendChild(h('p',{class:'mbt-trail'},tr.map(crumb)));
      if(lead)p.appendChild(h('p',{class:'mbx-center',text:lead}));
    }
    function foot(extra){var b=btn(prev?'Back':flow.jump==='jump'?'Back':'Back to the map',goBack),bt=h('div',{class:'btns'});if(extra)bt.appendChild(extra);bt.appendChild(b);p.appendChild(bt);return b}
    if(name==='cp'){
      head('Where the climb starts','Each open checkpoint is the floor after a guardian you have beaten.');
      var g=h('div',{class:'mbt-pick'});
      cps(t).filter(function(f){return f>=11}).forEach(function(f){
        var b=bandAt(t,f),c=bandCol(b),e=h('button',{type:'button',class:'mbt-cpb','aria-pressed':flow.floor===f?'true':null,style:'--bh:'+c[0]+';--bf:'+c[1]},h('b',{text:'Floor '+f}),h('small',{text:bandName(b)}));
        e.addEventListener('click',function(){blip();flow.floor=flow.hero=f;if(f<=50)flow.adv=null;if(f<=100)flow.apex=null;step(nextOf('cp'))});
        if(flow.floor===f||!focus)focus=flow.floor===f?e:focus||e;g.appendChild(e);
      });
      p.appendChild(g);var bk=foot();return focus||bk;
    }
    if(name==='cls'){
      head('Who climbs','The hero arrives with the skills, boons and equipment that are usual for floor '+(flow.hero||flow.floor)+'.');
      var cs=h('div',{class:'cards mbt-cards'}),C={};try{C=MB.CLASSES||{}}catch(e){}
      Object.keys(C).forEach(function(id){var c=C[id]||{},e=card(c.name||id,c.gear,c.text,function(){if(flow.cls!==id)flow.adv=null;flow.cls=id;step(nextOf('cls'))},null,flow.cls===id);
        if(flow.cls===id||!focus)focus=flow.cls===id?e:focus||e;cs.appendChild(e)});
      p.appendChild(cs);var b2=foot();return focus||b2;
    }
    if(name==='adv'){
      var c0=clsOf(flow.cls)||{};
      head('The upgrade','Past floor 50 a '+(c0.name||'hero').toLowerCase()+' has taken one of two upgrades.');
      var as=h('div',{class:'cards mbt-cards two'});
      (c0.adv||[]).forEach(function(a){var e=card(a[1],a[2],a[3],function(){flow.adv=a[0];step(nextOf('adv'))},null,flow.adv===a[0]);if(flow.adv===a[0]||!focus)focus=flow.adv===a[0]?e:focus||e;as.appendChild(e)});
      if(!as.children.length){flow.adv=null;as.appendChild(card('Go on','','This class has no upgrade to choose.',function(){step(nextOf('adv'))}))}
      p.appendChild(as);var b3=foot();return focus||b3;
    }
    if(name==='apex'){
      var offer=apexOffer(t,flow.floor,flow.cls),cnt={2:'two',3:'three',4:'four',5:'five',6:'six',8:'eight',10:'ten'}[offer.length]||String(offer.length);
      head('The apex path','Past floor 100 every hero has taken one of '+cnt+' paths, for good.');
      var xs=h('div',{class:'cards mbt-cards apexGrid',role:'group','aria-label':'The apex paths: those that command, then those that are the weapon'});
      // those who command first, so the keyboard walks the list as it is drawn
      offer.filter(function(a){return a.side==='dominion'}).concat(offer.filter(function(a){return a.side!=='dominion'})).forEach(function(a){
        var e=apexCard(a,function(){flow.apex=a.id;step(nextOf('apex'))},flow.apex===a.id,offer.length<=2);
        if(flow.apex===a.id||!focus)focus=flow.apex===a.id?e:focus||e;xs.appendChild(e)});
      p.appendChild(xs);var b4=foot();return focus||b4;
    }
    /* confirm */
    var d=null,swap='';try{if(typeof t.seasoned==='function')d=t.seasoned(flow.hero||flow.floor,{cls:flow.cls,adv:flow.floor>50?flow.adv:null,apex:flow.floor>100?flow.apex:null})}catch(e){}
    // a path this version of the game does not know becomes another: say so, and show what the hero will really be
    if(d&&typeof d==='object'&&flow.floor>100&&flow.apex&&apexId(d.apex)&&d.apex!==flow.apex){swap=apexInfo(flow.apex).name;flow.apex=d.apex;tr=trail()}
    head('Begin at floor '+flow.floor+'?');
    p.appendChild(h('p',{class:'mbt-trail big'},tr.map(crumb)));
    if(swap)p.appendChild(h('p',{class:'mbt-note',role:'note',text:swap+' is not open in this version of the game. This hero takes '+apexInfo(flow.apex).name+' instead.'}));
    var sv=null,cur='';try{sv=MB.api&&MB.api.getSave&&MB.api.getSave()}catch(e){}
    if(sv&&num(sv.level)>0){var sc=clsOf(sv.cls);cur=' (floor '+(Math.round(num(sv.level))+1)+(sc?', '+(sc.name||sv.cls):'')+')'}
    if(flow.jump&&flow.hero&&flow.hero!==flow.floor)p.appendChild(h('p',{class:'mbt-note mbt-testing',role:'note'},h('b',{text:'Testing. '}),'Ready-made heroes are made for checkpoint floors: this is the hero of floor '+flow.hero+', set down on floor '+flow.floor+'.'));
    p.appendChild(h('p',{class:'mbt-warn',role:'note'},h('b',{text:'This replaces your single-player run'+cur+'. '}),'That run cannot be brought back. Checkpoints, records and settings are kept.'));
    if(d&&typeof d==='object'){
      var dl=h('dl',{class:'mbt-kit'}),row=function(k,v){if(v)dl.appendChild(h('div',null,h('dt',{class:'lab',text:k}),h('dd',{text:v})))},names=function(a){return Array.isArray(a)?a.map(function(x){return x&&typeof x==='object'?x.name||'':x}).filter(Boolean):[]};
      var nb=0;if(d.boons&&typeof d.boons==='object')for(var bk in d.boons)nb+=num(d.boons[bk]);else nb=num(d.boons);
      row('Rank',d.rank?String(d.rank):'');row('Boons',nb?String(nb):'');row('Mana',d.mana?String(Math.round(num(d.mana))):'');
      var eq=Array.isArray(d.eq)?d.eq.map(function(x){return x&&x.name?x.name+(x.rarity?' ('+x.rarity+')':''):''}).filter(Boolean):[];
      row('Equipment',eq.join(', '));var sk=names(d.skills);row('Skills',sk.length?sk.length+': '+sk.join(', '):'');var pt=names(d.pets);row('Companions',pt.join(', '));
      if(dl.children.length)p.appendChild(dl);
    }
    p.appendChild(h('p',{class:'dim mbx-center',text:'A seasoned hero is about 85% as strong as one built floor by floor.'}));
    var msg=h('p',{class:'mbx-msg','aria-live':'polite'});p.appendChild(msg);
    var go=btn('Begin the climb',function(){begin(msg)},true);foot(go);
    return prev?go.parentNode.lastChild:go; // focus rests on Back, so a stray Enter does not wipe a run
  },{esc:goBack,enter:null});
}
function begin(msg){
  var t=T(),f=flow,ok=false;if(!t||!f||coop())return;
  var o={cls:f.cls,adv:f.floor>50?f.adv:null,apex:f.floor>100?f.apex:null};
  try{
    if(f.jump&&f.hero&&f.hero!==f.floor){
      // the game makes ready-made heroes for checkpoint floors only: start at the checkpoint below, and as soon as that floor has begun go on to the floor asked for
      pendingJump={base:f.hero,floor:f.floor};ok=t.startAt(f.hero,o);if(ok===false)pendingJump=null;
    }else ok=t.startAt(f.floor,o);
  }catch(e){ok=false;pendingJump=null;try{console.warn('tower: startAt failed',e)}catch(_){}}
  if(ok===false){if(msg){msg.className='mbx-msg bad';msg.textContent='The climb could not be started from here.'}return}
  flow=null;back=null;hideLayer();
  // the game normally takes the screen away itself; if the title is somehow still up, hand the overlay back to it
  try{var ov=$('ov');if(S().mode==='title'&&MB.api&&MB.api.hide)MB.api.hide();else if(ov&&!ov.hidden&&S().mode==='play'&&!S().paused&&MB.api&&MB.api.hide)MB.api.hide()}catch(e){}
}

/* ---------- testing: jump to any floor (only while the Checkpoints testing switch is on, never in multiplayer). It uses what the game already offers:
   MB.api.startLevel(n) for the hero as it is, MB.tower.startAt for a ready-made hero. ---------- */
var jumpF=0,pendingJump=null,JMAX=9999;
function testing(){try{return hasSetting('testUnlock')&&MB.settings.testUnlock===true&&!(MB.mp&&MB.mp.vs)}catch(e){return false}}
function isTrial(k){return k==='survive'||k==='guard'||k==='race'||k==='ordeal'||k==='cross'}
// the floor a ready-made hero is made for: the floor itself where a climb can start there, else the nearest checkpoint below (0: none)
function heroFloor(t,f){var a=cps(t).filter(function(c){return c>=11&&c<=f});return a.length?a[a.length-1]:0}
function jumpHero(f){
  f=Math.round(num(f));if(!testing()||coop()||!S().cls||!(f>=9&&f<=JMAX)||!MB.api||typeof MB.api.startLevel!=='function')return false;
  flow=null;back=null;pendingJump=null;hideLayer();
  if(S().paused){var pb=$('pauseB');if(pb)try{pb.click()}catch(e){}}
  var ok=false;try{ok=MB.api.startLevel(f-1)!==false}catch(e){try{console.warn('tower: jump failed',e)}catch(_){}}
  return ok;
}
function jumpBox(t,home){
  var cur=Math.max(1,Math.round(num(t.floor,1))),co=coop(),box=h('section',{class:'mbt-jump','aria-label':'Testing: jump to a floor'});
  box.appendChild(h('div',{class:'mbt-jhead'},h('h3',{class:'mbt-h',text:'Jump to floor'}),h('span',{class:'mbt-tag best',text:'Testing'})));
  if(co){box.appendChild(h('p',{class:'mbt-note',text:'Jumping between floors is off in multiplayer.'}));return box}
  var f=Math.max(1,Math.min(JMAX,jumpF||cur+1)),inp=h('input',{type:'number',class:'mbt-jnum',min:'1',max:String(JMAX),step:'1',inputmode:'numeric',value:String(f),'aria-label':'Floor to jump to'});
  var kind=h('p',{class:'mbt-jkind','aria-live':'polite'}),note=h('p',{class:'mbt-note mbt-jnote'});
  var bHero=btn('Jump with this hero',function(){jumpHero(f)},true),bMade=btn('Jump with a ready-made hero',function(){startFlow(f,home)});
  function set(v,keep){
    v=Math.round(num(v,f));f=jumpF=Math.max(1,Math.min(JMAX,v||1));if(!keep||String(f)!==inp.value)inp.value=String(f);
    var a=floorAt(t,f),k=kindOf(a.kind),bn=rowBand(t,a),hero=!!S().cls,base=heroFloor(t,f);
    kind.textContent='';kind.className='mbt-jkind k-'+(KIND[a.kind]?a.kind:'fight');
    kind.appendChild(icon(a.kind));kind.appendChild(h('span',null,h('b',{text:'Floor '+f+' \u00b7 '+k.name+(bn?' \u00b7 '+bn:'')}),' '+(a.rule||k.line)));
    bHero.disabled=!(hero&&f>=9);bMade.disabled=!(base&&typeof t.startAt==='function');
    note.textContent=f<9?'Floors 1 to 8 are the story start, with the body still in pieces: use Rise on the title screen for those. A ready-made hero can start from floor 11.'
      :!hero?(f<11?'There is no hero with a class yet, and a ready-made one can start from floor 11.':'There is no hero with a class yet: take a ready-made one.')
      :f<11?'A ready-made hero can start from floor 11.'
      :base&&base!==f?'A ready-made hero is the one of floor '+base+', the checkpoint below.':'';
    note.hidden=!note.textContent;
  }
  function near(test){for(var x=f+1;x<=Math.min(JMAX,f+400);x++){var k=floorAt(t,x).kind;if(test(k))return x}return 0}
  function stepB(lab,d){return btn(lab,function(){set(f+d)},false,{class:'mbt-step','aria-label':(d>0?'Up ':'Down ')+Math.abs(d)+(Math.abs(d)>1?' floors':' floor')})}
  inp.addEventListener('input',function(){if(inp.value!=='')set(inp.value,true)});
  inp.addEventListener('change',function(){set(inp.value===''?f:inp.value)});
  box.appendChild(h('div',{class:'mbt-jrow'},stepB('\u221210',-10),stepB('\u22121',-1),inp,stepB('+1',1),stepB('+10',10),
    btn('Next trial',function(){var x=near(isTrial);if(x)set(x)},false,{class:'mbt-step mbt-jgo'}),btn('Next guardian',function(){var x=near(function(k){return k==='guardian'});if(x)set(x)},false,{class:'mbt-step mbt-jgo'})));
  box.appendChild(kind);box.appendChild(h('div',{class:'btns mbt-jacts'},bHero,bMade));box.appendChild(note);
  box.appendChild(h('p',{class:'mbt-note',text:'For testing only. Nothing is marked: the single-player save simply goes on from the floor you land on.'}));
  set(f);box._focus=inp;
  return box;
}
function showJump(){
  var t=T();if(!t||!testing()){closeAll();return}
  render('jump',function(p){
    p.appendChild(h('div',{class:'mbt-head'},h('p',{class:'kick',text:'Testing'}),h('h2',{text:'Jump to a floor'})));
    var box=jumpBox(t,'jump');p.appendChild(box);
    var b=btn('Back',closeAll);p.appendChild(h('div',{class:'btns'},b));
    return touch()?b:box._focus||b;
  },{esc:closeAll,enter:null});
}
function openJump(backFn){
  if(!T()||!testing())return false;
  back=typeof backFn==='function'?backFn:function(){try{if(MB.api&&MB.api.hide)MB.api.hide()}catch(e){}};
  flow=null;showJump();return true;
}
if(typeof MB.on==='function'){
  MB.on('levelstart',function(d){var pj=pendingJump;if(!pj)return;pendingJump=null;
    if(d&&Math.round(num(d.level,-1))===pj.base-1&&!coop())setTimeout(function(){try{if(Math.round(num(S().level,-1))===pj.base-1)MB.api.startLevel(pj.floor-1)}catch(e){}},0)});
  MB.on('title',function(){pendingJump=null});
}
// the pause menu while testing: the jump control, and one floor up or down with the hero as it is
function addJump(){
  var b=$('ovBtns'),ov=$('ov'),s=S();
  if(!b||!ov||ov.hidden||b.hidden||!T()||!testing()||coop()||!s.paused||b.querySelector('[data-mbj]'))return;
  var all=b.querySelectorAll('button'),i,before=null;if(!all.length||all[0].textContent!=='Resume')return;
  for(i=0;i<all.length;i++)if(all[i].textContent==='Settings'){before=all[i];break}
  var cur=Math.round(num(s.level,0))+1,hero=!!s.cls;
  function add(label,fn,off){var e=h('button',{type:'button',text:label,'data-mbj':'1',class:'mbt-jbtn',disabled:off?true:null});e.addEventListener('click',function(){blip();fn()});b.insertBefore(e,before)}
  add('Jump to floor\u2026',function(){openJump()});
  add('Next floor',function(){jumpHero(cur+1)},!hero||cur+1<9||cur>=JMAX);
  add('Previous floor',function(){jumpHero(cur-1)},!hero||cur-1<9);
}

/* ---------- ways in: MB.openTower(back) for the game's own menus, and a button added to the title, pause and co-op menus when the game offers none ---------- */
function openTower(backFn){
  if(!T())return false;
  back=typeof backFn==='function'?backFn:function(){try{if(MB.api&&MB.api.hide)MB.api.hide()}catch(e){}};
  flow=null;pick=0;showMap();return true;
}
MB.openTower=openTower;
var LABEL='The climb';
function addButton(){
  var b=$('ovBtns'),ov=$('ov'),s=S();
  if(!b||!ov||ov.hidden||b.hidden||!T())return;
  var all=b.querySelectorAll('button'),i,txt=[],before=null;
  for(i=0;i<all.length;i++){var x=all[i].textContent;txt.push(x);if(/\bclimb\b|tower|\bmap\b/i.test(x)&&!/^Continue/i.test(x))return;if(!before&&(x==='Multiplayer'||x==='Settings'||x==='Records'||x==='Leave the game'))before=all[i]}
  var onTitle=s.mode==='title'&&txt.indexOf('Rise')>=0,
      onPause=!!s.paused&&txt[0]==='Resume',
      onCoop=coop()&&txt.indexOf('Leave the game')>=0&&/^Back/.test(txt[0]||'');
  if(!onTitle&&!onPause&&!onCoop)return;
  var e=h('button',{type:'button',text:LABEL,'data-mbt':'1'});
  e.addEventListener('click',function(){blip();openTower()});
  b.insertBefore(e,before);
}
// Enter on a focused button of the game's own screens: the game's key handler would also press the FIRST button of the screen (on the title that is "Rise", which starts a run).
// The key is kept from that handler; the browser still clicks the focused button.
win.addEventListener('keydown',function(e){
  try{var t=e.target,ov=$('ov');if(e.key!=='Enter'||!t||t.tagName!=='BUTTON'||!ov||ov.hidden||!ov.contains(t))return;
    var first=ov.querySelector('#ovBtns button');if(t!==first)e.stopImmediatePropagation()}catch(_){}
},true);
// Arrow keys walk a grid of choice cards by where the cards are drawn (Home and End: first and last). On the tower's own screens this is every card grid;
// on the game's screens only the apex choice, where an arrow key with nothing in focus also enters the grid.
function cardGrid(){
  var a=doc.activeElement,g=a&&a.tagName==='BUTTON'&&a.parentNode,ov=$('ov'),inT=!!layer&&!layer.hidden;
  if(g&&g.classList&&g.classList.contains('cards')&&(inT?layer.contains(g):!!ov&&!ov.hidden&&ov.contains(g)&&!!g.querySelector('.apexCard[class*="apexSide-"]')))return {g:g,a:a};
  if(a&&a!==doc.body&&a!==panel&&/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(a.tagName))return null;
  var x=doc.querySelector('#mbx:not([hidden]),#mbn:not([hidden])');if(x)return null;
  g=inT?panel.querySelector('.cards.apexGrid'):ov&&!ov.hidden&&!ov.inert?ov.querySelector('#ovCards:not([hidden])'):null;
  return g&&g.querySelector('.apexCard[class*="apexSide-"]')?{g:g,a:null}:null;
}
win.addEventListener('keydown',function(e){
  try{
    var k=e.key,dx=k==='ArrowRight'?1:k==='ArrowLeft'?-1:0,dy=k==='ArrowDown'?1:k==='ArrowUp'?-1:0,edge=k==='Home'||k==='End';
    if(!dx&&!dy&&!edge||e.altKey||e.ctrlKey||e.metaKey)return;
    var c=cardGrid();if(!c)return;
    var all=[].filter.call(c.g.querySelectorAll('button'),function(b){return !b.disabled&&b.offsetParent!==null});if(!all.length)return;
    var R=all.map(function(b){var r=b.getBoundingClientRect();return {b:b,l:r.left,r:r.right,t:r.top,m:r.bottom,x:(r.left+r.right)/2,y:(r.top+r.bottom)/2}});
    // reading order: rows from the top, each from the left
    var ord=R.slice().sort(function(p,q){return Math.abs(p.t-q.t)>6?p.t-q.t:p.l-q.l}),to=null,i,best=1e18;
    if(!c.a)to=(c.g.querySelector('button[aria-pressed="true"]')||ord[0].b);
    else if(edge)to=ord[k==='Home'?0:ord.length-1].b;
    else{var me=R[all.indexOf(c.a)];if(!me)return;
      for(i=0;i<R.length;i++){var o=R[i];if(o===me)continue;
        var along=dx?(o.x-me.x)*dx:(o.y-me.y)*dy,across=dx?Math.max(0,Math.max(o.t,me.t)-Math.min(o.m,me.m)):Math.max(0,Math.max(o.l,me.l)-Math.min(o.r,me.r));
        if(along<4)continue;var sc=along+across*6+(dx?Math.abs(o.y-me.y):Math.abs(o.x-me.x))*.05;if(sc<best){best=sc;to=o.b}}
      if(!to)to=c.a}
    e.preventDefault();e.stopImmediatePropagation();
    if(to&&to!==doc.activeElement)try{to.focus()}catch(_){}
  }catch(_){}
},true);
var ob=$('ovBtns');
if(ob&&win.MutationObserver)new MutationObserver(function(){try{addButton()}catch(e){}try{addJump()}catch(e){}}).observe(ob,{childList:true});
if(typeof MB.on==='function'){
  MB.on('title',function(){setTimeout(addButton,0)});
  MB.on('pause',function(){setTimeout(addButton,0);setTimeout(function(){try{addJump()}catch(e){}},0)});
  // a co-op game starts or ends, or the run is replaced, while the map is up: it would show the wrong thing
  MB.on('mp',function(){if(layer&&!layer.hidden){if(screen==='flow'){flow=null}back=null;hideLayer();try{if(MB.api&&MB.api.hide)MB.api.hide()}catch(e){}}});
}
try{if(MB.api&&typeof MB.api.refreshTitle==='function')MB.api.refreshTitle()}catch(e){}
addButton();

/* ---------- between floors: a glimpse of the way up, at the foot of the arena as the floor begins. It blocks nothing and goes by itself. ---------- */
var peek=null,peekT=0,peekAt=0,peekFloor=-1,peekWhen=0;
var peekWait=0;
function hidePeek(){clearTimeout(peekT);clearInterval(peekWait);peekT=0;if(peek)peek.classList.remove('on')}
function versus(){try{return !!(MB.mp&&MB.mp.vs)}catch(e){return false}}
function showPeek(d){
  var t=T();if(!t)return;
  if(versus()){hidePeek();return} // a versus round is not a floor of the climb
  var floor=Math.round(num(d&&d.floor,num(t.floor,0)));if(floor<1)return;
  var now=Date.now();if(floor===peekFloor&&now-peekWhen<1500)return;peekFloor=floor;peekWhen=now;
  var stage=doc.querySelector('.stage');if(!stage)return;
  if(!peek){peek=h('div',{id:'mbtPeek',class:'mbt-peek','aria-hidden':'true'});stage.appendChild(peek)}
  var kind=d&&KIND[d.kind]&&d.kind||floorAt(t,floor).kind||'fight',b=bandAt(t,floor),c=bandCol(b),nx=ahead(t,5).filter(function(a){return a.floor>floor}).slice(0,4);
  peek.textContent='';peek.setAttribute('style','--bh:'+c[0]+';--bf:'+c[1]);
  peek.appendChild(h('span',{class:'mbt-pk now k-'+(KIND[kind]?kind:'fight')},icon(kind),h('b',{text:'Floor '+floor}),h('small',{text:kindOf(kind).name+(bandName(b)?' · '+bandName(b):'')})));
  if(nx.length){var up=h('span',{class:'mbt-pkup'});nx.forEach(function(a){up.appendChild(h('span',{class:'mbt-pk k-'+(KIND[a.kind]?a.kind:'fight')},icon(a.kind),h('b',{text:String(a.floor)})))});peek.appendChild(up)}
  // a screen may still be up (a story interlude, a co-op wait): the few seconds start when the arena is in view
  clearTimeout(peekT);clearInterval(peekWait);var tries=0;
  var go=function(){void peek.offsetWidth;peek.classList.add('on');peekAt=Date.now();clearTimeout(peekT);peekT=setTimeout(hidePeek,calm()?2600:3400)};
  if(!screenUp())go();else peekWait=setInterval(function(){if(++tries>100||S().mode==='title'){clearInterval(peekWait);return}if(!screenUp()&&S().mode==='play'){clearInterval(peekWait);go()}},200);
}
function screenUp(){var ids=['ov','mbx','mbn','mbt'],i,e;for(i=0;i<ids.length;i++){e=$(ids[i]);if(e&&!e.hidden)return true}return false}
function skipPeek(){if(peek&&peekT&&peek.classList.contains('on')&&Date.now()-peekAt>900)hidePeek()}
if(typeof MB.on==='function'){
  MB.on('floor',function(d){try{if(asideNow())return;showPeek(d)}catch(e){}});
  MB.on('levelstart',function(d){try{if(d&&d.aside){hidePeek();return}if(T())showPeek({floor:num(d&&d.level,-1)+1,kind:d&&d.L&&d.L.floorKind})}catch(e){}});
  MB.on('title',hidePeek);MB.on('death',hidePeek);MB.on('reward',hidePeek);
}
win.addEventListener('keydown',function(e){if(!e.repeat)skipPeek()},true);
win.addEventListener('pointerdown',skipPeek,true);

/* ---------- trial HUD: the rule in one sentence, the time or the count, the health of what you protect, and how it ended ---------- */
var lastTitle='',hud=null,H={},last={},stateT=0,endState='',endKind='',sawTrial=false;
var TLAB={survive:'Hold out',guard:'Protect',race:'Race',ordeal:'Ordeal',cross:'Crossroads'};
var HCAP={nomana:'No mana returns',dark:'The dark is back',alone:'No pets or familiars',halfheal:'Healing halved',swift:'Swift monsters'};
function clock(s){s=Math.max(0,s);if(s<=0)return '0:00';if(s<10)return s.toFixed(1);s=Math.ceil(s);var m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}
function meter(cls,label){
  var fill=h('i'),val=h('b'),lab=h('span',{class:'lab',text:label}),e=h('span',{class:'th-m '+cls,hidden:true},lab,h('span',{class:'th-bar'},fill),val);
  return {el:e,fill:fill,val:val,lab:lab};
}
function ensureHud(){
  if(hud)return true;
  var stage=doc.querySelector('.stage');if(!stage)return false;
  H.ic=h('span',{class:'th-ico'});H.kind=h('b',{class:'th-kind'});H.rule=h('span',{class:'th-rule'});H.state=h('span',{class:'th-state'});
  H.time=meter('th-time','Time');H.goal=meter('th-goal','Progress');H.obj=meter('th-obj','Relic');
  H.cap=h('span',{class:'th-cap',hidden:true});H.say=h('span',{class:'mbt-sr',role:'status','aria-live':'polite'});
  hud=h('div',{id:'trialHud',class:'trialHud',hidden:true},H.ic,h('div',{class:'th-text'},h('span',{class:'th-top'},H.kind,H.state),H.rule),h('div',{class:'th-meters'},H.time.el,H.goal.el,H.obj.el,H.cap),H.say);
  stage.appendChild(hud);return true;
}
function setTxt(key,el,v){if(last[key]!==v){last[key]=v;el.textContent=v}}
function setW(key,el,f){f=Math.round(Math.max(0,Math.min(1,f))*1000)/10;if(last[key]!==f){last[key]=f;el.style.width=f+'%'}}
function setCls(c){if(last.cls!==c){last.cls=c;hud.className=c}}
function hudOff(){if(hud&&!hud.hidden){hud.hidden=true;last={}}}
function hudTick(){
  var s=S(),tr=trialNow(),mode=s.mode,live=!!tr&&typeof tr==='object'&&(mode==='play'||mode==='clear'),now=Date.now();
  // (round 12) a dare (MB.objective) borrows the band on a floor that is not a trial: never both on one floor
  if(!live){var as=asideNow();if(as&&(mode==='play'||mode==='clear')){endState='';asideTick(as,now);return}}
  if(asideOn){asideOn=false;asideKey='';last={}}
  if(!live&&!endState){var dr=dareNow();if(dr&&(mode==='play'||mode==='clear')){dareTick(dr,now);return}}
  if(dareOn){dareOn=false;dareKey='';dareEnd=0;last={}}
  if(endState&&now>stateT){endState='';endKind=''}
  if(!live&&!(endState&&mode!=='title')){hudOff();sawTrial=false;return}
  if(!ensureHud())return;
  var kind=live?tr.kind:endKind,failed=live&&!!tr.failed,st=failed?'fail':live&&tr.cleared?'clear':endState==='clear'&&live&&!tr.cleared&&num(tr.t)<1?'':endState;
  if(live&&tr.title)lastTitle=tr.title;
  if(live&&!sawTrial){sawTrial=true;if(!st){st=endState='start';stateT=now+2400}say((tr.title||TLAB[kind]||'Trial')+'. '+(tr.rule||''))}
  if(last.kind!==kind){last.kind=kind;H.ic.textContent='';H.ic.appendChild(icon(kind))}
  setTxt('k',H.kind,live&&tr.title||(!live&&lastTitle)||TLAB[kind]||'Trial');
  setTxt('st',H.state,st==='clear'?'Cleared':st==='fail'?'Failed':'Trial');
  if(live){
    setTxt('rule',H.rule,st==='fail'?(tr.rule?tr.rule+' ':'')+'The floor begins again.':tr.rule||kindOf(kind).line);
    /* (round 13) the Hourglass is cut to the hero's measure a few seconds in: the band says the new time and beats once, so the rules need no float over the top of the screen */
    if(kind==='race'&&!st&&last.rr!==undefined&&last.rr!==tr.rule&&tr.rule){endState='start';stateT=now+1600;say('The glass narrows. '+tr.rule)}last.rr=tr.rule||'';
    var dur=num(tr.dur),t=num(tr.t),goal=num(tr.goal),pr=num(tr.progress),o=tr.obj,left=Math.max(0,dur-t),urgent=false,late=false;
    if(H.time.el.hidden!==!(dur>0))H.time.el.hidden=!(dur>0);
    if(dur>0){
      // a race drains towards failure; holding out fills towards success
      var drain=kind!=='survive'&&kind!=='guard';
      setTxt('tv',H.time.val,clock(left));setW('tw',H.time.fill,drain?left/dur:t/dur);
      setTxt('tl',H.time.lab,drain?'Time left':'Hold for');
      late=urgent=drain&&left<Math.max(5,dur*.25)&&!st;
    }
    if(H.goal.el.hidden!==!(goal>0))H.goal.el.hidden=!(goal>0);
    if(goal>0){setTxt('gv',H.goal.val,Math.min(goal,Math.floor(pr))+' / '+Math.round(goal));setW('gw',H.goal.fill,pr/goal);setTxt('gl',H.goal.lab,kind==='guard'||kind==='race'?'Slain':'Progress')}
    var hasO=!!o&&num(o.maxHp)>0;
    if(H.obj.el.hidden!==!hasO)H.obj.el.hidden=!hasO;
    if(hasO){setTxt('ol2',H.obj.lab,o.name?String(o.name).replace(/^the\s+/i,''):'Relic');var f=Math.max(0,num(o.hp))/num(o.maxHp);setTxt('ov',H.obj.val,Math.ceil(f*100)+'%');setW('ow',H.obj.fill,f);if(f<.34&&!st)urgent=true;if(last.ol!==(f<.34)){last.ol=f<.34;H.obj.el.classList.toggle('low',f<.34)}}
    var cap=tr.handicap&&(HCAP[tr.handicap]||'')||'';if(H.cap.hidden!==!cap)H.cap.hidden=!cap;if(cap)setTxt('cap',H.cap,cap);
    setCls('trialHud k-'+(TLAB[kind]?kind:'ordeal')+(st?' s-'+st:'')+(urgent?' urgent':'')+(late?' late':''));
  }else{
    setTxt('rule',H.rule,st==='clear'?'The trial is passed. A better reward waits.':'The trial is lost. The floor begins again.');
    H.time.el.hidden=H.goal.el.hidden=H.obj.el.hidden=H.cap.hidden=true;
    setCls('trialHud k-'+(TLAB[kind]?kind:'ordeal')+' s-'+st+' done');
  }
  if(hud.hidden){hud.hidden=false;measure()}
}
function say(x){try{if(H.say)H.say.textContent=x}catch(e){}}
/* (round 12) dares: MB.objective = null | {kind:'hunt'|'unscathed'|'holdout'|'protect', title, rule, state:'run'|'done'|'fail', t, dur, left, value, obj}.
   An optional objective on a plain floor: the same band in the dare's own colour (.trialHud.dare), with the time, the ember's health or the harm taken;
   once it is met or missed the outcome shows for a few seconds and the band goes. */
var DKIND={hunt:'race',holdout:'survive',protect:'guard',unscathed:'ordeal'},dareOn=false,dareKey='',dareEnd=0,dareSaid='';
try{window.MBDareBand=true}catch(e){} /* (round 13) the band carries a dare's title and outcome, so the rules put no title float in the arena */
function dareNow(){var d=null;try{d=MB.objective}catch(e){}return d&&typeof d==='object'&&typeof d.kind==='string'?d:null}
function dareTick(d,now){
  if(!ensureHud())return;
  var key=S().level+'|'+d.kind,st=d.state==='done'?'clear':d.state==='fail'?'fail':'',fresh=key!==dareKey;
  if(fresh){dareKey=key;dareEnd=0;stateT=now+2400;last={};if(!st)say('Dare: '+(d.title||'')+'. '+(d.rule||''))}
  if(st&&!dareEnd){dareEnd=now+3600;if(dareSaid!==key+st){dareSaid=key+st;say(st==='clear'?'Dare met.':'Dare missed.')}}
  if(st&&now>dareEnd){hudOff();dareOn=true;return}
  dareOn=true;
  var kind=DKIND[d.kind]||'ordeal';
  if(last.kind!==kind){last.kind=kind;H.ic.textContent='';H.ic.appendChild(icon(kind))}
  setTxt('k',H.kind,d.title||'Dare');setTxt('st',H.state,st==='clear'?'Met':st==='fail'?'Missed':'Dare');
  setTxt('rule',H.rule,st==='clear'?'The mark rises and the drop is luckier.':st==='fail'?(d.why&&d.why!=='missed'?String(d.why).charAt(0).toUpperCase()+String(d.why).slice(1)+'. ':'')+'Nothing is lost. The floor goes on.':d.rule||'');
  var dur=num(d.dur),left=Math.max(0,num(d.left)),timed=dur>0&&!st&&(d.kind==='hunt'||d.kind==='holdout'),urgent=false,late=false;
  if(H.time.el.hidden!==!timed)H.time.el.hidden=!timed;
  if(timed){var drain=d.kind==='hunt';setTxt('tv',H.time.val,clock(left));setW('tw',H.time.fill,drain?left/dur:1-left/dur);setTxt('tl',H.time.lab,drain?'Time left':'Hold for');late=urgent=drain&&left<Math.max(4,dur*.25)}
  if(!H.goal.el.hidden)H.goal.el.hidden=true;
  var o=d.obj,hasO=!st&&!!o&&num(o.maxHp)>0;
  if(H.obj.el.hidden!==!hasO)H.obj.el.hidden=!hasO;
  if(hasO){setTxt('ol2',H.obj.lab,o.name?String(o.name).replace(/^the\s+/i,''):'Ember');var f=Math.max(0,num(o.hp))/num(o.maxHp);setTxt('ov',H.obj.val,Math.ceil(f*100)+'%');setW('ow',H.obj.fill,f);if(f<.34)urgent=true;if(last.ol!==(f<.34)){last.ol=f<.34;H.obj.el.classList.toggle('low',f<.34)}}
  var cap=!st&&d.kind==='unscathed'?'No harm so far':!st&&d.kind==='holdout'?'Stay above half health':'';
  if(H.cap.hidden!==!cap)H.cap.hidden=!cap;if(cap)setTxt('cap',H.cap,cap);
  setCls('trialHud dare k-'+kind+(st?' s-'+st+' done':now<stateT?' s-start':'')+(urgent?' urgent':'')+(late?' late':''));
  if(hud.hidden){hud.hidden=false;measure()}
}
/* (round 16) asides: MB.aside = null | {kind:'proof'|'fissure'|'bell', label, title, rule, twist:{id,name,text}|null, t, dur, left, hold, goal, progress, unit, state:'run'|'done'|'fail', step, of}.
   A floor that is no floor of the climb borrows the band in a colour of its own (.trialHud.aside): its name and rule, the clock, the count it asks for, the twist. */
var asideOn=false,asideKey='';
try{window.MBAsideBand=true}catch(e){}
function asideNow(){var d=null;try{d=MB.aside}catch(e){}return d&&typeof d==='object'&&typeof d.kind==='string'?d:null}
function asideTick(d,now){
  if(!ensureHud())return;
  var key=d.kind+'|'+d.id+'|'+d.step,done=d.state==='done',fresh=key!==asideKey;
  if(fresh){asideKey=key;stateT=now+2400;last={};say((d.label||'')+': '+(d.title||'')+'. '+(d.rule||''))}
  asideOn=true;
  var kind=d.hold?'survive':'race';
  if(last.kind!==kind){last.kind=kind;H.ic.textContent='';H.ic.appendChild(icon(kind))}
  setTxt('k',H.kind,d.title||d.label||'');setTxt('st',H.state,done?(d.kind==='proof'?'Passed':d.kind==='fissure'?'Closed':'Rung'):(d.label||'')+(num(d.of)>1?' · '+d.step+' of '+d.of:''));
  setTxt('rule',H.rule,d.rule||'');
  var dur=num(d.dur),left=Math.max(0,num(d.left)),timed=dur>0,urgent=false,late=false;
  if(H.time.el.hidden!==!timed)H.time.el.hidden=!timed;
  if(timed){setTxt('tv',H.time.val,clock(left));setW('tw',H.time.fill,d.hold?1-left/dur:left/dur);setTxt('tl',H.time.lab,d.hold?'Hold for':'Time left');late=urgent=!d.hold&&!done&&left<Math.max(5,dur*.25)}
  var goal=num(d.goal);
  if(H.goal.el.hidden!==!(goal>0))H.goal.el.hidden=!(goal>0);
  if(goal>0){setTxt('gv',H.goal.val,Math.min(goal,Math.floor(num(d.progress)))+' / '+Math.round(goal));setW('gw',H.goal.fill,num(d.progress)/goal);setTxt('gl',H.goal.lab,d.unit||'Progress')}
  if(!H.obj.el.hidden)H.obj.el.hidden=true;
  var cap=d.twist&&d.twist.name||'';if(H.cap.hidden!==!cap)H.cap.hidden=!cap;if(cap)setTxt('cap',H.cap,cap);
  setCls('trialHud aside a-'+d.kind+' k-'+kind+(done?' s-clear done':now<stateT?' s-start':'')+(urgent?' urgent':'')+(late?' late':''));
  if(hud.hidden){hud.hidden=false;measure()}
}
if(typeof MB.on==='function'){
  MB.on('trial',function(d){try{
    if(!d)return;var k=d.kind||(trialNow()&&trialNow().kind)||endKind;
    if(d.state==='start'){endKind=k;endState='start';stateT=Date.now()+2400;sawTrial=false}
    else if(d.state==='clear'||d.state==='fail'){endKind=k;endState=d.state;stateT=Date.now()+(d.state==='clear'?3000:3600);if(ensureHud())say(d.state==='clear'?'Trial cleared.':'Trial failed. The floor begins again.')}
    hudTick();
  }catch(e){}});
  MB.on('title',function(){endState='';hudOff()});
}
/* ---- where the floating HUD ends. The vitals wrap as health, pets and names grow, so what sits under them cannot have a fixed place:
   --hud-top = under the top left block (the trial HUD goes there), --hud-mid = under whatever holds the top middle (the hint toast), --hud-top2 = under the trial HUD too (the co-op party list).
   Set on .stage, in CSS pixels from its top edge; the style sheet has fallbacks for when this file is missing. ---- */
var mLast={};
function setVar(el,k,v){if(mLast[k]!==v){mLast[k]=v;el.style.setProperty(k,v+'px')}}
function measure(){
  var stage=doc.querySelector('.stage'),v=doc.querySelector('.vitals');if(!stage||!v)return;
  var sr=stage.getBoundingClientRect(),a=v.firstElementChild,b=v.lastElementChild,gap=Math.max(4,Math.round(sr.height/140));
  if(!a||!sr.height||getComputedStyle(v).visibility==='hidden')return; // a screen is up: keep the last figures
  var ra=a.getBoundingClientRect(),rb=b&&b!==a?b.getBoundingClientRect():ra,fixed=!!b&&getComputedStyle(b).position==='fixed';
  // the boss bar: in the block with the health (small screens) or on its own in the top middle (roomy ones)
  var top=(fixed?ra.bottom:Math.max(ra.bottom,rb.bottom))-sr.top,mid=fixed?rb.bottom-sr.top:top;
  var hd=doc.querySelector('header');if(hd&&hd.offsetParent!==null)mid=Math.max(mid,hd.getBoundingClientRect().bottom-sr.top);
  setVar(stage,'--hud-top',Math.round(top+gap));// the hint is centred but wide: on anything narrower than a wide monitor it would reach the left block, so it clears that too
  if(sr.width<1500*(parseFloat(getComputedStyle(doc.documentElement).fontSize)||16)/16)mid=Math.max(mid,top);
  setVar(stage,'--hud-mid',Math.round(mid+gap+2));
  var t2=top+gap;if(hud&&!hud.hidden){var rh=hud.getBoundingClientRect();if(rh.height&&rh.left<sr.left+sr.width/2)t2=rh.bottom-sr.top+gap}
  setVar(stage,'--hud-top2',Math.round(t2));
}
setInterval(function(){try{measure()}catch(e){}},400);
win.addEventListener('resize',function(){try{measure()}catch(e){}});
try{measure()}catch(e){}
// the interface scale: extras.js sets --mb-ui too; this keeps it right if that file is missing
function uiScale(){try{var u=num(MB.settings&&MB.settings.ui,1);u=Math.max(.8,Math.min(1.5,u||1));doc.documentElement.style.setProperty('--mb-ui',String(Math.round(u*100)/100))}catch(e){}}
if(typeof MB.on==='function')MB.on('settings',function(d){if(!d||d.key==='ui'||d.key==null){uiScale();setTimeout(function(){try{measure()}catch(e){}},0)}});
uiScale();
var hudOk=true;
setInterval(function(){if(!hudOk)return;try{hudTick()}catch(e){hudOk=false;try{hudOff();console.warn('tower: trial HUD stopped',e)}catch(_){}}},100);

// for tests and for the other files
MB.towerUi={openJump:openJump,jumpHero:jumpHero,open:openTower,close:closeAll,peek:showPeek,icon:icon,kinds:KIND,apexPaths:apexAll,apexOffer:apexOffer,apexBadge:apexBadge,apexCard:apexCard};
}catch(e){try{console.warn('tower.js: not started',e)}catch(_){}}
})();
