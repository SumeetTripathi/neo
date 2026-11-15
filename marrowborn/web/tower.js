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
// the two apex paths. LOGIC owns the names: taken from whatever it exposes, with plain fallbacks
function apexInfo(id){
  var src=null,o=null;
  try{src=MB.APEX||MB.apexPaths||(T()&&T().apex)||null;if(!src&&MB.apex&&MB.apex.path===id)src={};if(MB.apex&&MB.apex.path===id&&!(src&&src[id]))o=MB.apex;if(!o)o=src&&(src[id]||(Array.isArray(src)&&src.filter(function(x){return x&&(x.id===id||x.path===id)})[0]))||null}catch(e){}
  var fb=id==='dominion'?{name:'The Tithe',sub:'Command what you kill',text:'What you kill owes you. The slain rise for a short while and fight at your side, your summons grow stronger, and pets hold less of your mana.'}
                        :{name:'The White Marrow',sub:'Be the weapon',text:'Nothing rises for you. The power is your own: you hit harder, last longer, and an aura around you hurts and slows whatever stands near.'};
  if(o&&typeof o==='object')return {name:o.name||fb.name,sub:o.sub||o.title||o.tag||fb.sub,text:o.text||o.lore||o.body||o.desc||fb.text};
  if(typeof o==='string')fb.name=o;
  return fb;
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

    /* what can be done from here */
    if(!co){
      right.appendChild(h('p',{class:'mbt-note'+(canStart?' mbt-opt':'')},canStart?'A checkpoint opens every ten floors. A climb can start at any open one with a seasoned hero: a little weaker than one built floor by floor.'
        :'Reach floor 11 to open the first checkpoint. A new climb can then start from it with a seasoned hero.'));
    }
    if(hasSetting('testUnlock')&&MB.settings.testUnlock){
      // the switch itself is in Settings; here it can only be turned off, so nobody mistakes a test for their own climb
      p.appendChild(h('p',{class:'mbt-note mbt-testing'},h('b',{text:'Testing. '}),'Every checkpoint up to floor 201 is open. ',btn('Turn off',function(){try{MB.setSetting('testUnlock',false)}catch(e){}if(screen==='map')showMap()},false,{class:'mbt-mini'})));
    }
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
function startFlow(floor){
  var t=T();if(!t||coop())return;
  flow={floor:floor||0,cls:null,adv:null,apex:null,fixed:!!floor};
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
  if(flow.apex&&flow.floor>100)out.push(apexInfo(flow.apex).name);
  return out;
}
function card(title,sub,body,fn,cls,on){
  var b=h('button',{type:'button',class:cls||null,'aria-pressed':on?'true':null},h('b',{text:title}),h('small',{text:sub||''}),h('span',{text:body||''}));
  b.addEventListener('click',function(){blip();fn()});return b;
}
function step(name){
  var t=T();if(!t||!flow||coop()){showMap();return}
  var all=steps(),n=all.indexOf(name)+(flow.fixed?0:1),of=all.length-(flow.fixed?1:0),prev=prevOf(name);
  function goBack(){if(prev)step(prev);else{flow=null;showMap()}}
  render('flow',function(p){
    var focus=null,tr=trail();
    function head(title,lead){
      p.appendChild(h('div',{class:'mbt-head'},h('p',{class:'kick',text:'Seasoned climb · step '+n+' of '+of}),h('h2',{text:title})));
      if(tr.length&&name!=='ok')p.appendChild(h('p',{class:'mbt-trail'},tr.map(function(x){return h('span',{text:x})})));
      if(lead)p.appendChild(h('p',{class:'mbx-center',text:lead}));
    }
    function foot(extra){var b=btn(prev?'Back':'Back to the map',goBack),bt=h('div',{class:'btns'});if(extra)bt.appendChild(extra);bt.appendChild(b);p.appendChild(bt);return b}
    if(name==='cp'){
      head('Where the climb starts','Each open checkpoint is the floor after a guardian you have beaten.');
      var g=h('div',{class:'mbt-pick'});
      cps(t).filter(function(f){return f>=11}).forEach(function(f){
        var b=bandAt(t,f),c=bandCol(b),e=h('button',{type:'button',class:'mbt-cpb','aria-pressed':flow.floor===f?'true':null,style:'--bh:'+c[0]+';--bf:'+c[1]},h('b',{text:'Floor '+f}),h('small',{text:bandName(b)}));
        e.addEventListener('click',function(){blip();flow.floor=f;if(f<=50)flow.adv=null;if(f<=100)flow.apex=null;step(nextOf('cp'))});
        if(flow.floor===f||!focus)focus=flow.floor===f?e:focus||e;g.appendChild(e);
      });
      p.appendChild(g);var bk=foot();return focus||bk;
    }
    if(name==='cls'){
      head('Who climbs','The hero arrives with the skills, boons and equipment that are usual for floor '+flow.floor+'.');
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
      head('The apex path','Past floor 100 every hero has taken one of two paths, for good.');
      var xs=h('div',{class:'cards mbt-cards two'});
      ['dominion','order'].forEach(function(id){var a=apexInfo(id),e=card(a.name,a.sub,a.text,function(){flow.apex=id;step(nextOf('apex'))},'apexCard '+(id==='dominion'?'apexDominion':'apexOrder'),flow.apex===id);
        if(flow.apex===id||!focus)focus=flow.apex===id?e:focus||e;xs.appendChild(e)});
      p.appendChild(xs);var b4=foot();return focus||b4;
    }
    /* confirm */
    head('Begin at floor '+flow.floor+'?');
    p.appendChild(h('p',{class:'mbt-trail big'},tr.map(function(x){return h('span',{text:x})})));
    var sv=null,cur='';try{sv=MB.api&&MB.api.getSave&&MB.api.getSave()}catch(e){}
    if(sv&&num(sv.level)>0){var sc=clsOf(sv.cls);cur=' (floor '+(Math.round(num(sv.level))+1)+(sc?', '+(sc.name||sv.cls):'')+')'}
    p.appendChild(h('p',{class:'mbt-warn',role:'note'},h('b',{text:'This replaces your single-player run'+cur+'. '}),'That run cannot be brought back. Checkpoints, records and settings are kept.'));
    var d=null;try{if(typeof t.seasoned==='function')d=t.seasoned(flow.floor,{cls:flow.cls,adv:flow.floor>50?flow.adv:null,apex:flow.floor>100?flow.apex:null})}catch(e){}
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
  try{ok=t.startAt(f.floor,o)}catch(e){ok=false;try{console.warn('tower: startAt failed',e)}catch(_){}}
  if(ok===false){if(msg){msg.className='mbx-msg bad';msg.textContent='The climb could not be started from here.'}return}
  flow=null;back=null;hideLayer();
  // the game normally takes the screen away itself; if the title is somehow still up, hand the overlay back to it
  try{var ov=$('ov');if(S().mode==='title'&&MB.api&&MB.api.hide)MB.api.hide();else if(ov&&!ov.hidden&&S().mode==='play'&&!S().paused&&MB.api&&MB.api.hide)MB.api.hide()}catch(e){}
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
var ob=$('ovBtns');
if(ob&&win.MutationObserver)new MutationObserver(function(){try{addButton()}catch(e){}}).observe(ob,{childList:true});
if(typeof MB.on==='function'){
  MB.on('title',function(){setTimeout(addButton,0)});
  MB.on('pause',function(){setTimeout(addButton,0)});
  // a co-op game starts or ends, or the run is replaced, while the map is up: it would show the wrong thing
  MB.on('mp',function(){if(layer&&!layer.hidden){if(screen==='flow'){flow=null}back=null;hideLayer();try{if(MB.api&&MB.api.hide)MB.api.hide()}catch(e){}}});
}
try{if(MB.api&&typeof MB.api.refreshTitle==='function')MB.api.refreshTitle()}catch(e){}
addButton();

/* ---------- between floors: a glimpse of the way up, at the foot of the arena as the floor begins. It blocks nothing and goes by itself. ---------- */
var peek=null,peekT=0,peekAt=0,peekFloor=-1,peekWhen=0;
function hidePeek(){clearTimeout(peekT);peekT=0;if(peek)peek.classList.remove('on')}
function showPeek(d){
  var t=T();if(!t)return;
  var floor=Math.round(num(d&&d.floor,num(t.floor,0)));if(floor<1)return;
  var now=Date.now();if(floor===peekFloor&&now-peekWhen<1500)return;peekFloor=floor;peekWhen=now;
  var stage=doc.querySelector('.stage');if(!stage)return;
  if(!peek){peek=h('div',{id:'mbtPeek',class:'mbt-peek','aria-hidden':'true'});stage.appendChild(peek)}
  var kind=d&&KIND[d.kind]&&d.kind||floorAt(t,floor).kind||'fight',b=bandAt(t,floor),c=bandCol(b),nx=ahead(t,5).filter(function(a){return a.floor>floor}).slice(0,4);
  peek.textContent='';peek.setAttribute('style','--bh:'+c[0]+';--bf:'+c[1]);
  peek.appendChild(h('span',{class:'mbt-pk now k-'+(KIND[kind]?kind:'fight')},icon(kind),h('b',{text:'Floor '+floor}),h('small',{text:kindOf(kind).name+(bandName(b)?' · '+bandName(b):'')})));
  if(nx.length){var up=h('span',{class:'mbt-pkup'});nx.forEach(function(a){up.appendChild(h('span',{class:'mbt-pk k-'+(KIND[a.kind]?a.kind:'fight')},icon(a.kind),h('b',{text:String(a.floor)})))});peek.appendChild(up)}
  void peek.offsetWidth;peek.classList.add('on');peekAt=now;
  clearTimeout(peekT);peekT=setTimeout(hidePeek,calm()?2600:3400);
}
function skipPeek(){if(peek&&peekT&&Date.now()-peekAt>900)hidePeek()}
if(typeof MB.on==='function'){
  MB.on('floor',function(d){try{showPeek(d)}catch(e){}});
  MB.on('levelstart',function(d){try{if(T())showPeek({floor:num(d&&d.level,-1)+1,kind:d&&d.L&&d.L.floorKind})}catch(e){}});
  MB.on('title',hidePeek);MB.on('death',hidePeek);MB.on('reward',hidePeek);
}
win.addEventListener('keydown',function(e){if(!e.repeat)skipPeek()},true);
win.addEventListener('pointerdown',skipPeek,true);

/* ---------- trial HUD: the rule in one sentence, the time or the count, the health of what you protect, and how it ended ---------- */
var lastTitle='',hud=null,H={},last={},stateT=0,endState='',endKind='',sawTrial=false;
var TLAB={survive:'Hold out',guard:'Protect',race:'Race',ordeal:'Ordeal',cross:'Crossroads'};
var HCAP={nomana:'No mana returns',dark:'The dark is back',alone:'No pets or familiars',halfheal:'Healing halved',swift:'Swift monsters'};
function clock(s){s=Math.max(0,s);if(s<10)return s.toFixed(1);s=Math.ceil(s);var m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}
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
  setVar(stage,'--hud-top',Math.round(top+gap));setVar(stage,'--hud-mid',Math.round(mid+gap+2));
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
MB.towerUi={open:openTower,close:closeAll,peek:showPeek,icon:icon,kinds:KIND};
}catch(e){try{console.warn('tower.js: not started',e)}catch(_){}}
})();
