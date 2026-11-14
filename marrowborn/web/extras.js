// Settings, tutorial hints, records, story interludes and save export/import.
// Talks to the game only through window.MB and the DOM. Every feature checks for the MB members it needs
// and stays off without them; nothing here may throw at load.
(function(){
'use strict';
var MB=window.MB,doc=document;
if(!MB||!doc.querySelector)return;
var $=function(id){return doc.getElementById(id)};
var root=doc.documentElement;
var isTouch=function(){try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}};
var store={
  get:function(k,d){try{var v=JSON.parse(localStorage.getItem('marrowborn.'+k));return v==null?d:v}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem('marrowborn.'+k,JSON.stringify(v))}catch(e){}}
};
var listen=function(name,fn){if(typeof MB.on!=='function')return false;try{MB.on(name,function(d){try{fn(d||{})}catch(e){console.warn('extras: '+name,e)}});return true}catch(e){return false}};
var api=function(){return MB.api||{}};
// multiplayer (MB.mp, game.js): records, the story and the pause hint are for the single-player run only
var inMp=function(){return !!(MB.mp&&MB.mp.on)};
var guard=function(label,fn){try{fn()}catch(e){try{console.warn('extras: '+label+' is off',e)}catch(_){}}};
var num=function(v,d){v=+v;return isFinite(v)?v:(d||0)};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
function h(tag,attrs){
  var e=doc.createElement(tag),i,k;
  if(attrs)for(k in attrs){if(k==='text')e.textContent=attrs[k];else if(k==='class')e.className=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k]===true?'':attrs[k])}
  for(i=2;i<arguments.length;i++){var c=arguments[i];if(c==null||c===false)continue;e.appendChild(typeof c==='string'?doc.createTextNode(c):c)}
  return e;
}
function clock(s){s=Math.max(0,Math.round(num(s)));var hh=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;return hh?hh+'h '+(m<10?'0':'')+m+'m':m+':'+(ss<10?'0':'')+ss}
function blip(){try{if(api().haptic)api().haptic(10)}catch(e){}}
function className(id){var c=MB.CLASSES&&MB.CLASSES[id];return c&&c.name||id||''}
function bossName(level){try{return MB.levelDef(level).spec.name}catch(e){return ''}}

/* ---------- the layer: one dialog over the arena, used by settings, records and story ---------- */
var layer=null,panel=null,view=null; // view: {esc:fn, enter:fn|null}
function ensureLayer(){
  if(layer)return true;
  var stage=doc.querySelector('.stage');if(!stage)return false;
  panel=h('div',{class:'mbx-panel',role:'dialog','aria-modal':'true',tabindex:'-1'});
  layer=h('div',{id:'mbx',hidden:true},panel);
  stage.appendChild(layer);
  // while the layer is open the game must not see keys: Enter would press the overlay underneath, Esc would unpause
  addEventListener('keydown',function(e){
    if(!layer||layer.hidden||!view)return;
    e.stopImmediatePropagation();
    var t=e.target,tag=t&&t.tagName;
    if(e.key==='Escape'){e.preventDefault();if(view.esc)view.esc();return}
    if(e.key==='Enter'){
      if(view.enter){e.preventDefault();view.enter();return}
      if(tag==='INPUT'&&(t.type==='checkbox'||t.type==='radio')){e.preventDefault();t.click()}
      return;
    }
    if(e.key==='Tab'){
      var f=[].filter.call(panel.querySelectorAll('button,input,textarea,[tabindex="0"]'),function(x){return !x.disabled&&x.offsetParent!==null&&!(x.type==='radio'&&!x.checked)});
      if(!f.length){e.preventDefault();return}
      var i=f.indexOf(doc.activeElement);
      if(e.shiftKey&&i<=0){e.preventDefault();f[f.length-1].focus()}
      else if(!e.shiftKey&&(i<0||i===f.length-1)){e.preventDefault();f[0].focus()}
    }
  },true);
  return true;
}
function openView(cls,label,build,v){
  if(!ensureLayer())return false;
  panel.textContent='';panel.className='mbx-panel'+(cls?' '+cls:'');panel.setAttribute('aria-label',label);panel.onclick=null;
  view=v||{};layer.className=cls==='mbx-story'?'mbx-veil':'';
  var focus=build(panel);
  layer.hidden=false;layer.scrollTop=0;
  var ov=$('ov');if(ov)try{ov.inert=true}catch(e){}
  try{(focus||panel).focus({preventScroll:true})}catch(e){}
  return true;
}
function closeLayer(){
  if(!layer)return;
  layer.hidden=true;view=null;panel.textContent='';
  var ov=$('ov');if(ov){try{ov.inert=false}catch(e){}
    if(!ov.hidden&&!isTouch()){var b=ov.querySelector('#ovBtns button,#ovCards button');if(b)try{b.focus({preventScroll:true})}catch(e){}}}
}
function heading(kick,title){return [kick?h('p',{class:'kick',text:kick}):null,title?h('h2',{text:title}):null]}
function button(label,fn,primary){return h('button',{type:'button',class:primary?'primary':'',text:label,onclick:function(e){e.stopPropagation();blip();fn()}})}

/* ---------- touch layout: button size and left-handed mirror (CSS lives in index.html) ---------- */
function applyLayout(){
  var s=MB.settings||{},k=clamp(num(s.btn,1)||1,.8,1.4),phoneLand=false;
  try{phoneLand=matchMedia('(orientation:landscape) and (pointer:coarse) and (max-height:600px)').matches}catch(e){}
  // upright, the stick and the buttons share one row: do not let a large size push them off a narrow screen
  // (the button grid is 216 px wide at size 1, 192 px on screens up to 420 px wide: see .touch .acts in index.html)
  if(!phoneLand){var vw=root.clientWidth||innerWidth||1000,room=vw-32,narrow=vw<=420;while(k>.8&&(narrow?192:216)*k+120*Math.max(1,k)+(narrow?12:16)>room)k-=.05}
  root.style.setProperty('--mb-btn',(Math.round(Math.max(.8,k)*100)/100).toFixed(2));
  root.classList.toggle('mb-left',!!s.left);
}
guard('layout',function(){
  applyLayout();
  listen('settings',applyLayout);
  addEventListener('resize',applyLayout);
});

/* ---------- save codes ---------- */
// "MB1." + base64url(JSON) + "." + 8 hex digits of an FNV-1a hash of the JSON
function fnv(str){var x=0x811c9dc5,i;for(i=0;i<str.length;i++){x^=str.charCodeAt(i);x=Math.imul(x,0x01000193)}return ('0000000'+(x>>>0).toString(16)).slice(-8)}
function encodeSave(obj){
  var json=JSON.stringify(obj),b=btoa(unescape(encodeURIComponent(json))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return 'MB1.'+b+'.'+fnv(json);
}
// returns {ok:true,data} or {ok:false,why}
function decodeSave(code){
  code=String(code||'').replace(/\s+/g,'');
  if(!code)return{ok:false,why:'Paste a save code first.'};
  var m=/^MB(\d+)\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/.exec(code);
  if(!m)return{ok:false,why:/^MB\d+\./.test(code)?'This code is incomplete. Copy all of it, from MB1 to the last character.':'That is not a Marrowborn save code. A code starts with MB1.'};
  if(m[1]!=='1')return{ok:false,why:'This code comes from a newer version of the game.'};
  var json;
  try{var b=m[2].replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';json=decodeURIComponent(escape(atob(b)))}catch(e){return{ok:false,why:'This code is damaged. Part of it is missing or was changed.'}}
  if(fnv(json)!==m[3])return{ok:false,why:'This code is damaged. Part of it is missing or was changed.'};
  var data;try{data=JSON.parse(json)}catch(e){data=null}
  if(!data||typeof data!=='object'||!data.s||typeof data.s!=='object')return{ok:false,why:'This code does not hold a save.'};
  return{ok:true,data:data};
}
function saveLine(s){
  if(!s||typeof s!=='object')return '';
  var lv=Math.floor(num(s.level))+1,c=className(s.cls);
  return 'level '+lv+(c?', '+c:', still in the crypt');
}

/* ---------- records ---------- */
var REC_FIELDS=['best','runs','deaths','time','kills','bosses'];
function blankRec(){return{best:0,runs:0,deaths:0,time:0,kills:0,bosses:0}}
function cleanRec(r){
  var o=blankRec(),k,i;o.v=2;o.cls={};o.fast={};
  if(!r||typeof r!=='object')return o;
  for(i=0;i<REC_FIELDS.length;i++){k=REC_FIELDS[i];o[k]=clamp(Math.floor(num(r[k])),0,1e9)}
  if(r.cls&&typeof r.cls==='object')for(k in r.cls)if(MB.CLASSES&&Object.prototype.hasOwnProperty.call(MB.CLASSES,k)&&r.cls[k]&&typeof r.cls[k]==='object'){
    o.cls[k]=blankRec();for(i=0;i<REC_FIELDS.length;i++)o.cls[k][REC_FIELDS[i]]=clamp(Math.floor(num(r.cls[k][REC_FIELDS[i]])),0,1e9)}
  if(r.fast&&typeof r.fast==='object')for(k in r.fast){var f=r.fast[k],lv=Math.floor(+k);
    if(f&&typeof f==='object'&&lv>=0&&lv<10000&&num(f.t)>0)o.fast[lv]={t:Math.round(num(f.t)*10)/10,cls:typeof f.cls==='string'&&MB.CLASSES&&Object.prototype.hasOwnProperty.call(MB.CLASSES,f.cls)?f.cls:null}}
  // records from before level 10 became the Flayed King's: the time kept for that level was set against a lesser monster, and could never be beaten now
  if(num(r.v)<2)delete o.fast[9];
  return o;
}
var rec=cleanRec(store.get('records',null));
function saveRec(){
  // keep the list of fastest kills bounded: drop the slowest ordinary levels first
  var keys=Object.keys(rec.fast);
  if(keys.length>80){keys.sort(function(a,b){return rec.fast[b].t-rec.fast[a].t});for(var i=0;i<keys.length&&Object.keys(rec.fast).length>80;i++)if((+keys[i]+1)%10&&+keys[i]!==7)delete rec.fast[keys[i]]}
  store.set('records',rec);
}
function mergeRec(other){
  var o=cleanRec(other),k,i,f;
  for(i=0;i<REC_FIELDS.length;i++){f=REC_FIELDS[i];rec[f]=Math.max(rec[f],o[f])}
  for(k in o.cls){if(!rec.cls[k])rec.cls[k]=blankRec();for(i=0;i<REC_FIELDS.length;i++){f=REC_FIELDS[i];rec.cls[k][f]=Math.max(rec.cls[k][f],o.cls[k][f])}}
  for(k in o.fast)if(!rec.fast[k]||o.fast[k].t<rec.fast[k].t)rec.fast[k]=o.fast[k];
  saveRec();
}
function classRec(id){if(!id||!MB.CLASSES||!MB.CLASSES[id])return null;return rec.cls[id]||(rec.cls[id]=blankRec())}
var run={kills0:0,t0:0,crypt:false,died:-1,newBest:false,newFast:false};
function stat(k){return MB.stats?num(MB.stats[k]):0}
function bankLevel(seconds){
  // time and kills since the level began go into the totals
  var c=classRec(MB.S&&MB.S.cls),dk=Math.max(0,Math.floor(stat('kills')-run.kills0)),dt=Math.max(0,Math.round(seconds));
  run.kills0=stat('kills');
  if(dt>36000)dt=0;
  rec.time+=dt;rec.kills+=dk;if(c){c.time+=dt;c.kills+=dk}
}
function levelSeconds(given){
  if(num(given)>0)return num(given);
  if(MB.stats&&num(MB.stats.levelTime)>0)return num(MB.stats.levelTime);
  return run.t0?(Date.now()-run.t0)/1000:0;
}
guard('records',function(){
  if(typeof MB.on!=='function')return;
  listen('levelstart',function(d){
    if(inMp())return;
    var lv=Math.floor(num(d.level,MB.S?MB.S.level:0)),retry=run.died===lv,c=classRec(MB.S&&MB.S.cls);
    run.died=-1;run.t0=Date.now();run.kills0=stat('kills');run.newBest=false;
    if(lv===0&&!retry){rec.runs++;run.crypt=true} // a new skeleton
    if(lv+1>rec.best){rec.best=lv+1;run.newBest=rec.best>1}
    if(c&&lv+1>c.best)c.best=lv+1;
    saveRec();
  });
  listen('classpicked',function(d){
    if(inMp())return;
    var c=classRec(d.cls||(MB.S&&MB.S.cls));
    if(!run.crypt)rec.runs++; // straight to the class choice: that is a run too
    run.crypt=false;
    if(c)c.runs++;
    saveRec();
  });
  listen('bossdead',function(d){
    if(inMp())return;
    var lv=Math.floor(num(d.level,MB.S?MB.S.level:0)),t=levelSeconds(d.time),cid=d.cls||(MB.S&&MB.S.cls)||null,c=classRec(cid),old=rec.fast[lv];
    bankLevel(t);rec.bosses++;if(c)c.bosses++;
    if(lv===7)run.crypt=true; // the class choice that follows belongs to this run
    run.newFast=false;
    if(t>0&&(!old||t<old.t)){rec.fast[lv]={t:Math.round(t*10)/10,cls:cid&&MB.CLASSES&&MB.CLASSES[cid]?cid:null};run.newFast=!!old}
    saveRec();
  });
  listen('death',function(d){
    if(inMp())return;
    var lv=Math.floor(num(d.level,MB.S?MB.S.level:0)),t=levelSeconds(0),c=classRec(MB.S&&MB.S.cls);
    bankLevel(t);rec.deaths++;if(c)c.deaths++;run.died=lv;
    saveRec();
    var parts=['Level '+(lv+1)+', '+clock(t)+' into the fight.'];
    if(MB.stats){var k=Math.floor(stat('kills')),rt=stat('time');parts.push('This run: '+k+(k===1?' kill':' kills')+(rt>0?', '+clock(rt)+' played':'')+'.')}
    var best=h('b',{text:run.newBest&&rec.best===lv+1?'A new best: level '+rec.best+'.':'Best: level '+rec.best+'.'});
    panelNote(function(){return MB.S&&MB.S.mode==='dead'},h('p',{class:'keys mbx-note'},parts.join(' ')+' ',best));
  });
  MB.openRecords=openRecords;
});

// a line added to the game's own overlay panel (run summary, equipment hint); it goes away when the overlay changes
var noteEl=null,noteObs=null;
function dropNote(){if(noteObs){noteObs.disconnect();noteObs=null}if(noteEl&&noteEl.parentNode)noteEl.parentNode.removeChild(noteEl);noteEl=null}
function panelNote(still,el){
  setTimeout(function(){
    try{
      var ov=$('ov'),btns=$('ovBtns'),ttl=$('ovTitle'),p=$('ovPanel');
      if(!ov||ov.hidden||!btns||!ttl||!p||!still())return;
      dropNote();noteEl=el;p.insertBefore(el,$('ovCards')||btns);
      if(window.MutationObserver){noteObs=new MutationObserver(dropNote);noteObs.observe(ttl,{childList:true,characterData:true,subtree:true});noteObs.observe(ov,{attributes:true,attributeFilter:['hidden']})}
    }catch(e){}
  },0);
}

function openRecords(){
  var close=function(){closeLayer()};
  return openView('mbx-wide','Records',function(p){
    var hd=heading('Records',rec.best?'What the dark remembers':'Nothing to remember yet'),i;
    for(i=0;i<hd.length;i++)if(hd[i])p.appendChild(hd[i]);
    if(!rec.best&&!rec.runs){p.appendChild(h('p',{class:'dim mbx-center',text:'Start a run. Your best level, your fastest kills and your deaths are kept here.'}))}
    else{
      var tile=function(v,l){return h('div',null,h('b',{text:String(v)}),h('small',{text:l}))};
      p.appendChild(h('div',{class:'mbx-tiles'},tile(rec.best||'—','Best level'),tile(rec.runs,'Runs'),tile(rec.bosses,'Bosses killed'),tile(rec.deaths,'Deaths'),tile(clock(rec.time),'Time played')));
      var cols=h('div',{class:'mbx-rec'});
      // fastest kills: once a class is chosen only those fights count, the crypt ones are too short to compare
      var ks=Object.keys(rec.fast).map(Number),late=ks.filter(function(k){return k>=8}),pick=(late.length?late:ks).sort(function(a,b){return rec.fast[a].t-rec.fast[b].t}).slice(0,6);
      if(pick.length){
        var ol=h('ol');
        pick.forEach(function(k){var f=rec.fast[k],nm=bossName(k);ol.appendChild(h('li',null,h('span',{text:'Level '+(k+1)+(nm?' · '+nm:'')+(f.cls?' · '+className(f.cls):'')}),h('span',{text:clock(f.t)})))});
        cols.appendChild(h('section',null,h('h3',{text:'Fastest kills'}),ol));
      }
      var ids=Object.keys(MB.CLASSES||{}).filter(function(id){return rec.cls[id]});
      if(ids.length){
        var tb=h('tbody');
        ids.sort(function(a,b){return rec.cls[b].best-rec.cls[a].best}).forEach(function(id){var c=rec.cls[id];
          tb.appendChild(h('tr',null,h('td',{text:className(id)}),h('td',{text:String(c.best||'—')}),h('td',{text:String(c.runs)}),h('td',{text:String(c.deaths)}),h('td',{text:clock(c.time)})))});
        cols.appendChild(h('section',null,h('h3',{text:'By class'}),h('table',null,h('thead',null,h('tr',null,h('th',{scope:'col',text:'Class'}),h('th',{scope:'col',text:'Best'}),h('th',{scope:'col',text:'Runs'}),h('th',{scope:'col',text:'Deaths'}),h('th',{scope:'col',text:'Time'}))),tb)));
      }
      if(cols.firstChild)p.appendChild(cols);
    }
    var done=button('Back',close,true);
    p.appendChild(h('div',{class:'btns'},done));
    return done;
  },{esc:close});
}

/* ---------- settings ---------- */
function openSettings(){
  var S=MB.settings,close=function(){closeLayer()},syncers=[];
  var set=function(k,v){try{MB.setSetting(k,v)}catch(e){}sync()};
  var sync=function(){for(var i=0;i<syncers.length;i++)try{syncers[i]()}catch(e){}};
  var uid=0,id=function(){return 'mbx'+(++uid)};
  function slider(label,key,lo,hi,step,fmt,after){
    var i=id(),val=h('span',{class:'val','aria-hidden':'true'}),
      inp=h('input',{type:'range',id:i,min:lo,max:hi,step:step,oninput:function(){set(key,+inp.value/100)},onchange:function(){if(after)after()}});
    syncers.push(function(){var v=Math.round(clamp(num(S[key]),lo/100,hi/100)*100);if(+inp.value!==v)inp.value=v;inp.style.setProperty('--fill',(v-lo)/(hi-lo)*100+'%');val.textContent=fmt(v);inp.setAttribute('aria-valuetext',fmt(v))});
    return h('div',{class:'mbx-row'},h('label',{class:'lab',for:i,text:label}),h('div',{class:'mbx-ctl'},inp,val));
  }
  function choice(label,key,opts,after){
    var name=id(),seg=h('div',{class:'mbx-seg'}),inputs=[];
    opts.forEach(function(o){var inp=h('input',{type:'radio',name:name,onchange:function(){if(inp.checked){set(key,o[0]);if(after)after()}}});inputs.push(inp);seg.appendChild(h('label',null,inp,h('span',{text:o[1]})))});
    syncers.push(function(){var cur=S[key],best=0,i;
      if(typeof cur==='number'){for(i=1;i<opts.length;i++)if(Math.abs(opts[i][0]-cur)<Math.abs(opts[best][0]-cur))best=i}
      else for(i=0;i<opts.length;i++)if(opts[i][0]===cur)best=i;
      inputs[best].checked=true});
    return h('fieldset',{class:'mbx-row'},h('legend',{class:'lab',text:label}),h('div',{class:'mbx-ctl'},seg));
  }
  function toggle(label,key,onText,offText){
    var i=id(),note=h('em'),inp=h('input',{type:'checkbox',role:'switch',id:i,onchange:function(){set(key,inp.checked)}});
    syncers.push(function(){inp.checked=!!S[key];note.textContent=S[key]?onText:offText});
    return h('div',{class:'mbx-row'},h('label',{class:'lab',for:i,text:label}),h('div',{class:'mbx-ctl'},h('label',{class:'mbx-sw'},inp,h('span'),note)));
  }
  var pct=function(v){return v+'%'},ping=function(){try{if(api().sfx)api().sfx('pickup')}catch(e){}},buzz=function(){try{if(api().haptic)api().haptic(40)}catch(e){}};
  var canSave=typeof api().getSave==='function',canLoad=typeof api().loadSave==='function';
  return openView('','Settings',function(p){
    var hd=heading('',  'Settings');p.appendChild(hd[1]);
    var rows=h('div',{class:'mbx-rows'},
      slider('Music','music',0,100,5,function(v){return v?v+'%':'Off'}),
      slider('Effects','sfx',0,100,5,function(v){return v?v+'%':'Off'},ping),
      choice('Haptics','haptic',[[0,'Off'],[.5,'Low'],[1,'Full']],buzz),
      choice('Graphics','gfx',[['high','High'],['low','Low']]),
      slider('Button size','btn',80,140,5,pct),
      toggle('Left-handed','left','Stick on the right','Stick on the left'),
      toggle('Hints','hints','Shown once each','Off'));
    p.appendChild(rows);
    var done=button('Done',close,true),btns=h('div',{class:'btns'},done);
    if(canSave)btns.appendChild(button('Export save',function(){exportView(openSettings)}));
    if(canLoad)btns.appendChild(button('Import save',function(){importView(openSettings)}));
    if(hintsApi)btns.appendChild(button('Replay hints',function(){hintsApi.reset();var b=btns.lastChild;b.textContent='Hints reset';b.disabled=true}));
    p.appendChild(btns);
    sync();
    settingsSync=sync;
    return done;
  },{esc:close});
}
var settingsSync=null,hintsApi=null;
guard('settings',function(){
  if(!MB.settings||typeof MB.settings!=='object'||typeof MB.setSetting!=='function')return;
  MB.openSettings=openSettings;
  listen('settings',function(){if(layer&&!layer.hidden&&settingsSync)try{settingsSync()}catch(e){}});
});

function exportView(back){
  var goBack=function(){back()};
  openView('','Export save',function(p){
    var save=null,code='';
    try{save=api().getSave();if(save&&typeof save==='object')code=encodeSave({s:save,r:rec})}catch(e){code=''}
    var hd=heading('Save code','Export save');p.appendChild(hd[0]);p.appendChild(hd[1]);
    var msg=h('p',{class:'mbx-msg',role:'status'});
    if(!code){
      p.appendChild(h('p',{class:'dim mbx-center',text:'There is no run to export yet.'}));
      var b0=button('Back',goBack,true);p.appendChild(h('div',{class:'btns'},b0));return b0;
    }
    p.appendChild(h('p',{class:'dim mbx-center',text:'This code holds your run ('+saveLine(save)+') and your records. Keep it somewhere safe, or paste it into Import save on another device.'}));
    var ta=h('textarea',{readonly:true,rows:'4',spellcheck:'false','aria-label':'Save code',onclick:function(){ta.select()}});ta.value=code;
    p.appendChild(ta);p.appendChild(msg);
    var selectAll=function(){try{ta.focus();ta.select();ta.setSelectionRange(0,code.length)}catch(e){}};
    var fallback=function(){
      var ok=false;selectAll();try{ok=doc.execCommand('copy')}catch(e){ok=false}
      msg.className='mbx-msg good';msg.textContent=ok?'Copied.':'The code is selected. Copy it with a long press, or Ctrl+C.';
    };
    var copy=button('Copy',function(){
      var c=navigator.clipboard;
      if(c&&c.writeText){var pr;try{pr=c.writeText(code)}catch(e){pr=null}
        if(pr&&pr.then){pr.then(function(){msg.className='mbx-msg good';msg.textContent='Copied.'},fallback);return}}
      fallback();
    },true);
    p.appendChild(h('div',{class:'btns'},copy,button('Back',goBack)));
    return copy;
  },{esc:goBack});
}
function importView(back){
  var goBack=function(){back()};
  openView('','Import save',function(p){
    var hd=heading('Save code','Import save');p.appendChild(hd[0]);p.appendChild(hd[1]);
    var info=h('p',{class:'dim mbx-center',text:'Paste a code made with Export save. It replaces the run on this device.'});
    var ta=h('textarea',{rows:'4',spellcheck:'false',autocomplete:'off',autocapitalize:'off','aria-label':'Save code',placeholder:'MB1.…'});
    var msg=h('p',{class:'mbx-msg',role:'alert'}),pending=null;
    var bad=function(t){msg.className='mbx-msg bad';msg.textContent=t};
    var go=button('Import',function(){
      if(pending){
        var ok=false;try{ok=api().loadSave(pending.s)===true}catch(e){ok=false}
        if(!ok){pending=null;go.textContent='Import';ta.readOnly=false;bad('The game could not read this save. It may come from a different version.');return}
        if(pending.r)try{mergeRec(pending.r)}catch(e){}
        closeLayer();
        try{if(MB.S&&MB.S.mode==='title'&&api().refreshTitle)api().refreshTitle()}catch(e){}
        return;
      }
      var r=decodeSave(ta.value);
      if(!r.ok){bad(r.why);try{ta.focus()}catch(e){}return}
      pending=r.data;ta.readOnly=true;go.textContent='Replace my run';
      msg.className='mbx-msg good';msg.textContent='Code is good: '+saveLine(pending.s)+'. Your current run will be replaced.';
    },true);
    ta.addEventListener('input',function(){if(msg.textContent){msg.className='mbx-msg';msg.textContent=''}});
    p.appendChild(info);p.appendChild(ta);p.appendChild(msg);
    p.appendChild(h('div',{class:'btns'},go,button('Back',goBack)));
    return ta;
  },{esc:goBack});
}

/* ---------- story interludes ---------- */
// keyed by 0-based level; shown just before that level starts
var TALES={
  0:['The crypt','You were buried without a name, and the dark kept the rest: heart, skin, eyes, tongue. The things that crawl down here are wearing what was yours. Get up. Bones can still hold a blade.'],
  8:['Out of the crypt','The crypt door stands open behind you and nothing follows you out. You have a heartbeat again, and a face you do not recognise. A body has to eat, so you take up a trade, and the only work on this side of the door is killing what the door let loose.'],
  12:[null,'The King is dead behind you, and his road is yours to walk. It runs through country that burned a long time ago and never quite went out. Whatever outlived the fire did it by becoming worse.'],
  20:[null,'The road ends where the water begins. The fen swallowed a town once. Its roofs still show at low water, and the bell rings when something large moves underneath. Watch where you put your feet.'],
  30:[null,'Above the fen the ground rises into ribs. These peaks are a carcass, something vast that lay down here before there was anyone to see it fall. What nests in it has never had a reason to be afraid.'],
  40:[null,'Past the peaks stands a court with no kingdom left to rule. Its nobles keep their seats, their banners and their grudges. They have heard of you. That is new: until now, nothing had.'],
  50:[null,'Beyond the court there is no road and no map, only the dark that every one of these things crawled out of. People set candles in their windows now and say your name over them. There is no last monster. There is only how far you go.']
};
// one line before each boss of a tenth level: the Flayed King on level 10 (index 9), then the tyrants
var TYRANTS={
  9:'They flayed him for the crown and he kept it anyway. Everything past this hall still pays him its tithe. He is the first of the tyrants, and he has been expecting someone.',
  19:'It lit the fire that made this road, and it has stood guard over the cinders ever since.',
  29:'It drowned the town to have subjects who could never leave. It counts them every night.',
  39:'It has gnawed at the great carcass for an age, and it is not yet full.',
  49:'The last of the court to wear a crown. It will not bow, and it has forgotten how to die.'
};
var DARK=['The dark has no throne, so this one built its own out of everything that came before you.','Another one. The dark grows them the way a wound grows scar.','It knows your name. It has been saying it for some time.'];
function taleFor(lv){
  if(TALES[lv]){var t=TALES[lv],kick=t[0];if(!kick)try{kick=MB.levelDef(lv).title}catch(e){kick=''}return{kick:kick,text:t[1]}}
  var line=TYRANTS[lv]||(lv>=59&&(lv+1)%10===0?DARK[Math.floor((lv-59)/10)%DARK.length]:null);
  if(line)return{kick:(bossName(lv)||'A tyrant')+' · level '+(lv+1),text:line};
  return null;
}
guard('story',function(){
  var seen=store.get('tales',[]);
  if(!Array.isArray(seen))seen=[];
  seen=seen.filter(function(x){return typeof x==='number'}).slice(-60);
  // a new class is a new story from the crypt door on
  listen('classpicked',function(){if(inMp())return;seen=seen.filter(function(x){return x<8});store.set('tales',seen)});
  MB.interlude=function(level,done){
    try{
      var lv=Math.floor(num(level,-1));
      if(typeof done!=='function')return false;
      if(lv===0)seen=[]; // a new skeleton hears it all again
      else if(seen.indexOf(lv)>=0)return false;
      var tale=taleFor(lv);if(!tale)return false;
      var fired=false,finish=function(){if(fired)return;fired=true;closeLayer();try{done()}catch(e){console.warn('extras: interlude',e)}};
      var shown=openView('mbx-story',tale.kick||'Story',function(p){
        if(tale.kick)p.appendChild(h('p',{class:'kick',text:tale.kick}));
        p.appendChild(h('p',{class:'tale',text:tale.text}));
        var b=button('Go on',finish,true);
        p.appendChild(h('div',{class:'btns'},b));
        p.appendChild(h('p',{class:'dim',text:isTouch()?'Tap anywhere to go on.':'Enter, or click anywhere, to go on.'}));
        return b;
      },{esc:finish,enter:finish});
      if(!shown)return false;
      // one tap anywhere skips; ignore the tap that opened it
      var armed=false;setTimeout(function(){armed=true},250);
      layer.onclick=function(){if(armed&&view&&view.enter===finish){layer.onclick=null;finish()}};
      seen.push(lv);store.set('tales',seen);
      return true;
    }catch(e){try{closeLayer()}catch(_){}return false}
  };
});

/* ---------- contextual hints ---------- */
guard('hints',function(){
  var stage=doc.querySelector('.stage');
  if(!stage||!MB.S||typeof MB.has!=='function')return;
  var seen=store.get('hints',[]);if(!Array.isArray(seen))seen=[];
  var box=h('div',{id:'mbHint',role:'status','aria-live':'polite'}),label=h('b'),text=h('span');
  box.appendChild(label);box.appendChild(text);stage.appendChild(box);
  var cur=null,shownAt=0,moved=0,struck=0,playT=0,lvSeen=-1,lastT=0;
  var S=function(){return MB.S},P=function(){return MB.P||{}};
  var enabled=function(){return !MB.settings||MB.settings.hints!==false};
  var has=function(part){try{return !!MB.has(part)}catch(e){return false}};
  // when: may it appear now; until: it has done its job; t: play seconds on this level before it may appear
  var HINTS=[
    {id:'move',t:.2,when:function(){return S().level===0},until:function(){return moved>1.2},
      touch:'Drag the stick to walk.',keys:'Walk with WASD or the arrow keys.'},
    {id:'strike',t:1.5,when:function(){return S().level===0&&(moved>.6||playT>7)},until:function(){return struck>=3},
      touch:'Tap Strike. It swings at whatever is nearest.',keys:'Space strikes whatever is nearest. A click strikes where you point.'},
    {id:'rings',t:5,when:function(){return S().level<5&&!has('sight')&&(seen.indexOf('strike')>=0||S().level>0)},
      touch:'You have no eyes yet. The pale rings are footsteps. When they come fast, something is about to hit you.',keys:'You have no eyes yet. The pale rings are footsteps. When they come fast, something is about to hit you.'},
    {id:'dash',t:.5,when:function(){return has('organs')&&!MB.S.cls},until:function(){return P().dashT>0},
      touch:'You have lungs now. Tap Dash to dart the way you are moving. Nothing can hurt you mid-dash.',keys:'You have lungs now. Shift dashes the way you are moving. Nothing can hurt you mid-dash.'},
    {id:'pause',t:8,when:function(){return S().level>=2&&!inMp()},
      touch:'Need a breath? Pause is at the top of the screen. Settings are in there too.',keys:'Need a breath? Esc or P pauses. Settings are in there too.'},
    {id:'skills',t:.5,when:function(){return !!S().cls&&S().level>=8},until:function(){var sk=MB.skills;return !!(sk&&sk[0]&&sk[0].cd>0)},
      touch:'Your skills sit beside Strike. A number on a button counts the seconds until it is ready again.',keys:'Keys 1 to 6 use your skills as you unlock them. The bar under the arena counts the seconds until each is ready again.'},
    {id:'pet',t:1,when:function(){var p=MB.pets;return !!(p&&p.active&&p.active.length&&p.roster&&p.roster.length&&(S().cls==='necro'||S().adv==='beastmaster'))},
      touch:'A pet fights on its own, with every attack it had as a monster, and cannot hurt you. Each one that is out holds part of your mana, the stronger the more. If it falls, it rises again after a moment, paid for with mana. Pause to choose how many go with you.',keys:'A pet fights on its own, with every attack it had as a monster, and cannot hurt you. Each one that is out holds part of your mana, the stronger the more. If it falls, it rises again after a moment, paid for with mana. Pause (Esc) to choose how many go with you.'},
    {id:'mana',t:2,when:function(){var m=MB.mana;return !!S().cls&&S().level>=8&&!!m&&m.max>0&&m.cur<(m.max-m.reserved)*.7},
      touch:'Skills spend mana, the blue bar under your health. It seeps back on its own, and twice as fast while you stand still and draw it in from the room.',keys:'Skills spend mana, the blue bar under your health. It seeps back on its own, and twice as fast while you stand still and draw it in from the room.'}
  ];
  function mark(id){if(seen.indexOf(id)<0){seen.push(id);store.set('hints',seen)}}
  function hide(){box.classList.remove('on');cur=null}
  function show(hn){cur=hn;shownAt=playT;label.textContent='Hint';text.textContent=isTouch()?hn.touch:hn.keys;box.classList.add('on');mark(hn.id)}
  function poll(){
    var s=S(),now=num(s.t),dt=clamp(now-lastT,0,.5);lastT=now;
    if(s.level!==lvSeen||s.mode==='title'){lvSeen=s.level;playT=0;poll.gap=-9;if(cur)hide()}
    var playing=s.mode==='play'&&!s.paused&&!(s.banner>0)&&(!layer||layer.hidden);
    if(!playing){if(cur&&s.mode!=='play')hide();return}
    playT+=dt;
    var p=P();if(p.moving)moved+=dt;if(p.atk>0&&!poll.atk)struck++;poll.atk=p.atk>0;
    if(!enabled()){if(cur)hide();return}
    if(cur){var age=playT-shownAt;if(age>9||age>2.5&&cur.until&&cur.until())hide();return}
    if(playT-poll.gap<1.5)return;
    for(var i=0;i<HINTS.length;i++){var hn=HINTS[i];if(seen.indexOf(hn.id)<0&&playT>=hn.t&&hn.when()){
      if(hn.until&&hn.until()&&hn.id!=='move'&&hn.id!=='strike'){mark(hn.id);continue} // already doing it: no need to say so
      show(hn);poll.gap=1e9;return}}
  }
  poll.gap=-9;poll.atk=false;
  setInterval(function(){try{var before=cur;poll();if(before&&!cur)poll.gap=playT;if(!before&&!cur&&poll.gap>1e8)poll.gap=playT}catch(e){}},200);
  // equipment: explained on the first drop screen, as a line in that panel
  listen('reward',function(d){
    if(!enabled()||seen.indexOf('gear')>=0||num(d.level)<8)return;
    var isDrop=function(){var c=$('ovCards');return !!(c&&!c.hidden&&c.children.length===3&&/^Upgrade/.test(c.children[0].textContent))};
    setTimeout(function(){if(!isDrop())return;mark('gear');
      panelNote(isDrop,h('p',{class:'keys mbx-note'},h('b',{text:'Hint: '}),'Every boss drops one item. Upgrade is the steady choice. Replace is worth it when the drop is rarer than what you wear. Destroy only when neither helps.'))},0);
  });
  hintsApi={reset:function(){seen=[];store.set('hints',seen);moved=0;struck=0}};
});

/* ---------- reward accent (style only) ---------- */
// the first screen after a kill gets a class for an accent sweep, a rank-up a gold one (CSS in index.html); the game resets the panel's classes with each screen
guard('accent',function(){
  listen('reward',function(){setTimeout(function(){
    var ov=$('ov'),p=$('ovPanel'),k=$('ovKeys');if(!ov||ov.hidden||!p)return;
    p.classList.add(k&&/^Rank up/.test(k.textContent)?'mbx-rankup':'mbx-clear');
  },0)});
});

// the title screen was drawn before this file loaded: let it pick up the Settings and Records buttons
guard('title',function(){if((MB.openSettings||MB.openRecords)&&api().refreshTitle)api().refreshTitle()});
})();
