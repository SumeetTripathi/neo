// Multiplayer over the local network: the transport (window.MBNet) and the lobby screens.
// Talks to the relay in server/src/com/marrowborn/net/Relay.java (inside the Android app, or the standalone server jar).
// The game itself is reached only through window.MB: MB.mp.begin(cfg) when the host starts, MB.mp.end(reason) when the session ends.
// Nothing here may throw at load, and nothing happens until the player opens Multiplayer (or a script calls MBNet.host / MBNet.join).
(function(){
'use strict';
var doc=document,win=window;
var PROTOCOL=1,DEFAULT_PORT=7777,NAME_MAX=16,MAX_MEMBERS=8;

/* ================================================================ join codes ================================================================
   An IPv4 address and port in Crockford base 32. Same scheme as server/src/com/marrowborn/net/JoinCode.java: keep the two in step.
   4 characters: 192.168.a.b on port 7777. 6: 10.x, 172.16-31.x, 100.64-127.x or 169.254.x on port 7777. 11: any address and port. */
var ALPHA='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function quad(ip){
  var m=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip||''));if(!m)return null;
  var q=[+m[1],+m[2],+m[3],+m[4]];return q.some(function(v){return v>255})?null:q;
}
function codeHash(q,port){var v=q.concat([port>>8&255,port&255]),h=7,i;for(i=0;i<v.length;i++)h=(h*31+v[i])&0xFFFF;return h}
function chk4(h){return (h^h>>4^h>>8^h>>12)&15}
function chk5(h){return (h^h>>5^h>>10^h>>15)&31}
function b32(v,n){var s='',i;for(i=0;i<n;i++){s=ALPHA.charAt(v%32)+s;v=Math.floor(v/32)}return s}
function codeEncode(ip,port){
  var q=quad(ip);port=+port;if(!q||!(port>=1&&port<=65535)||port%1)return null;
  var a=q[0],b=q[1],c=q[2],d=q[3],h=codeHash(q,port),kind=-1,v=0;
  if(port===DEFAULT_PORT){
    if(a===192&&b===168)return b32((c*256+d)*16+chk4(h),4);
    if(a===10){kind=0;v=b*65536+c*256+d}
    else if(a===172&&b>=16&&b<32){kind=1;v=(b-16)*65536+c*256+d}
    else if(a===100&&b>=64&&b<128){kind=2;v=(b-64)*65536+c*256+d}
    else if(a===169&&b===254){kind=3;v=c*256+d}
    if(kind>=0)return b32((kind*16777216+v)*16+chk4(h),6);
  }
  return b32((a*16777216+b*65536+c*256+d)*65536+port,10)+ALPHA.charAt(chk5(h));
}
function codeDecode(text){
  var s=String(text||'').toUpperCase().replace(/[\s.\-]/g,'').replace(/[IL]/g,'1').replace(/O/g,'0'),n=s.length,i,v=0,k;
  if(n!==4&&n!==6&&n!==11)return null;
  for(i=0;i<(n===11?10:n);i++){k=ALPHA.indexOf(s.charAt(i));if(k<0)return null;v=v*32+k}
  var a,b,c,d,port=DEFAULT_PORT,chk;
  if(n===4){chk=v%16;v=Math.floor(v/16);a=192;b=168;c=Math.floor(v/256)%256;d=v%256}
  else if(n===6){
    chk=v%16;v=Math.floor(v/16);var kind=Math.floor(v/16777216)%4,hi=Math.floor(v/65536)%256;c=Math.floor(v/256)%256;d=v%256;
    if(kind===0){a=10;b=hi}
    else if(kind===1){if(hi>15)return null;a=172;b=16+hi}
    else if(kind===2){if(hi>63)return null;a=100;b=64+hi}
    else{if(hi)return null;a=169;b=254}
  }else{
    chk=ALPHA.indexOf(s.charAt(10));if(chk<0)return null;
    port=v%65536;var ip=Math.floor(v/65536);if(ip>4294967295||port<1)return null;
    a=Math.floor(ip/16777216)%256;b=Math.floor(ip/65536)%256;c=Math.floor(ip/256)%256;d=ip%256;
  }
  var h=codeHash([a,b,c,d],port);
  if(chk!==(n===11?chk5(h):chk4(h)))return null;
  return a+'.'+b+'.'+c+'.'+d+':'+port;
}
function codePretty(c){return c&&c.length===11?c.slice(0,4)+'-'+c.slice(4,8)+'-'+c.slice(8):c||''}

/* What a player typed into "code or address": returns "host:port", or null. An address may come with a scheme, a path or no port. */
function parseTarget(text){
  var s=String(text||'').trim();if(!s)return null;
  var bare=s.replace(/^[a-z]+:\/\//i,'').replace(/[\/?#].*$/,'');
  if(/^\[[0-9a-f:.]+\](:\d{1,5})?$/i.test(bare))return /\]:\d+$/.test(bare)?bare:bare+':'+DEFAULT_PORT;
  var m=/^([a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*)(:(\d{1,5}))?$/i.exec(bare);
  var looksLikeHost=m&&(bare.indexOf('.')>=0||bare.indexOf(':')>=0||/^localhost$/i.test(bare));
  if(looksLikeHost){var port=m[6]?+m[6]:DEFAULT_PORT;if(port<1||port>65535)return null;if(/^[\d.]+$/.test(m[1])&&!quad(m[1]))return null;return m[1].toLowerCase()+':'+port}
  var viaCode=codeDecode(s);if(viaCode)return viaCode;
  // a bare machine name on the intranet ("gamepc") is the last reading; a mistyped code of the right length is not taken for one
  var len=s.replace(/[\s.\-]/g,'').length;
  if(m&&len!==4&&len!==6&&len!==11&&/[a-z]/i.test(bare))return bare.toLowerCase()+':'+DEFAULT_PORT;
  return null;
}

/* ================================================================ transport ================================================================ */
var handlers={},ws=null,gen=0,pending=null,localServer=false,ending=false,serverInfo=null,addr='',pingT=0,probeAt=0,probeOpen=false,maxFrame=1<<20;
var store={
  get:function(k,d){try{var v=localStorage.getItem('marrowborn.'+k);return v==null?d:v}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem('marrowborn.'+k,v)}catch(e){}}
};
function cleanName(s){
  s=String(s==null?'':s).replace(/[\u0000-\u001f\u007f-\u009f\u200b\u2028\u2029\u202d\u202e\ufeff]/g,' ').replace(/\s+/g,' ').trim();
  var a=Array.from?Array.from(s):s.split('');if(a.length>NAME_MAX)s=a.slice(0,NAME_MAX).join('').trim();
  return s;
}
function bridge(){var A=win.Android;return A&&typeof A.startServer==='function'?A:null}
// the page came from a Marrowborn server (the jar on a PC, or a phone that is hosting): that server is the default place to play
function served(){return /^https?:$/.test(location.protocol)&&!!location.host}
function servedAddr(){return location.hostname+':'+(location.port||(location.protocol==='https:'?443:80))}

var MBNet={
  state:'off',id:'',hostId:'',isHost:false,members:[],room:{code:'',mode:'coop',url:'',id:'',address:''},
  ping:0,version:PROTOCOL,
  /** msg: a JSON-serialisable object with a string `t`. to: a member id, or nothing for everyone else in the room. Returns true when it was handed to the socket. */
  send:function(msg,to){
    if(!ws||ws.readyState!==1||(MBNet.state!=='lobby'&&MBNet.state!=='playing')||!msg)return false;
    var s;try{s=JSON.stringify(msg)}catch(e){return false}
    if(s.length*3>maxFrame&&byteLen(s)>maxFrame-64){try{console.warn('MBNet: message of type '+msg.t+' is larger than the relay accepts ('+maxFrame+' bytes) and was not sent')}catch(e){}return false}
    try{ws.send(to==null?'B'+s:'T'+to+' '+s);return true}catch(e){return false}
  },
  /** fn(msg, fromId). Returns a function that removes the listener. System events arrive as types net:join, net:leave, net:host, net:start, net:end (and net:ready, net:name, net:mode, net:state for the lobby). */
  on:function(type,fn){
    if(typeof fn!=='function')return function(){};
    (handlers[type]||(handlers[type]=[])).push(fn);
    return function(){MBNet.off(type,fn)};
  },
  off:function(type,fn){var l=handlers[type],i=l?l.indexOf(fn):-1;if(i>=0)l.splice(i,1)},
  /** Leave the room and close the connection (and the server on this phone, if this page started it). Safe to call at any time. */
  leave:function(){finish('left',true)},

  /* ---- beyond the contract: what the lobby uses, also handy for tests ---- */
  /** Create a room and become its host. opts: {name, mode, server}. server: 'local' = start the relay in the Android app, 'host:port' or a join code = that relay, nothing = the server this page came from (or the phone, in the app). Resolves in the lobby. */
  host:function(opts){
    opts=opts||{};
    var where=opts.server||(served()?servedAddr():bridge()?'local':null);
    if(!where)return Promise.reject(new Error('There is nothing to host on here. Run the Ashes to Apex server on a computer, or host from the Android app.'));
    if(where==='local'){
      var b=bridge(),r;
      if(!b)return Promise.reject(new Error('This device cannot host a game.'));
      finish('',false); // an earlier session, and its server, go first
      try{r=JSON.parse(b.startServer(DEFAULT_PORT))}catch(e){r={ok:false,error:String(e&&e.message||e)}}
      if(!r||!r.ok)return Promise.reject(new Error(r&&r.error||'The game server did not start.'));
      localServer=true;
      return open('127.0.0.1:'+r.port,true).then(function(){return enter('',true,opts)});
    }
    var t=parseTarget(where);if(!t)return Promise.reject(new Error('That is not a join code or an address.'));
    return open(t).then(function(){return enter('',true,opts)});
  },
  /** Join a game. target: a join code, an address, or nothing for the server this page came from. opts: {name, room}. Resolves in the lobby, or with {rooms:[...]} when that server has several rooms to choose from (then call joinRoom). */
  join:function(target,opts){
    opts=opts||{};
    var t=target?parseTarget(target):served()?servedAddr():null;
    if(!t)return Promise.reject(new Error(target?'That is not a join code or an address.':'Enter a join code or an address.'));
    return open(t).then(function(){
      if(opts.room)return enter(opts.room,false,opts);
      return ask('L','rooms').then(function(ev){
        if(ev.server&&ev.server.single)return enter('',false,opts);
        var openRooms=(ev.rooms||[]).filter(function(r){return r.state==='lobby'&&r.count<r.max});
        if(openRooms.length===1&&(ev.rooms||[]).length===1)return enter(openRooms[0].code,false,opts);
        if(!(ev.rooms||[]).length){finish('',false);throw new Error('Nobody has opened a room on that server yet.')}
        return {rooms:ev.rooms};
      });
    });
  },
  /** After join() resolved with a list of rooms: enter one of them. */
  joinRoom:function(code,opts){if(!ws||ws.readyState!==1)return Promise.reject(new Error('Not connected.'));return enter(code,false,opts||{})},
  /** The rooms on a server, without joining: [{code,name,mode,state,count,max}]. target as for join(). */
  rooms:function(target){
    var t=target?parseTarget(target):served()?servedAddr():null;
    if(!t)return Promise.reject(new Error('No server.'));
    if(typeof fetch!=='function')return Promise.reject(new Error('unsupported'));
    return fetch('http://'+t+'/api/info',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){if(!j||j.name!=='marrowborn')throw new Error('not an Ashes to Apex server');var r=j.rooms||[];r.single=!!(j.server&&j.server.single);return r});
  },
  setReady:function(v){raw('R'+(v?1:0));var me=member(MBNet.id);if(me&&me.ready!==!!v){me.ready=!!v;emit('net:ready',{id:MBNet.id,ready:!!v})}},
  setName:function(n){n=cleanName(n);if(!n)return;store.set('mpname',n);var me=member(MBNet.id);if(me&&me.name!==n){me.name=n;raw('N'+encodeURIComponent(n));emit('net:name',{id:MBNet.id,name:n})}},
  name:function(){return cleanName(store.get('mpname',''))},
  /** Host only: start the game for everyone in the room. In versus it needs two players and, with teams, somebody on each side: returns false (and starts nothing) otherwise. */
  start:function(){
    if(!MBNet.isHost||MBNet.state!=='lobby'||MBNet.startBlock())return false;
    if(MBNet.room.mode==='versus')vsTell(); // the last word on options and teams reaches every member before the start does (one ordered queue)
    return raw('S'+Math.floor(Math.random()*2147483647));
  },
  /** Why the host cannot start right now ('' = it can). Ready states are the lobby screen's business, not checked here. */
  startBlock:function(){
    if(MBNet.room.mode!=='versus')return '';
    if(MBNet.members.length<2)return 'Versus needs at least two players.';
    if(MBNet.vs.format==='teams'){var c=teamCount();if(!c[0]||!c[1])return 'Each team needs at least one player.'}
    return '';
  },
  /** Host only, in the lobby: 'coop' or 'versus'. Everyone hears it as net:mode. */
  setMode:function(m){if(MBNet.isHost&&MBNet.state==='lobby'&&(m==='coop'||m==='versus')&&m!==MBNet.room.mode)raw('O'+m)},
  /* ---- versus options and teams. The host owns both; they travel as ordinary relayed messages (lb:o, lb:t, lb:q) and every change is announced as net:vs ---- */
  /** The versus options {format:'ffa'|'teams', floor, wins, time} as the room has them now (a fresh object after every change). */
  vs:null,
  /** Who is on which side in teams: {memberId: 0|1}. */
  teams:{},
  /** Host only, in the lobby: change some of the options, e.g. setVs({format:'teams'}). Values outside the offered ones are ignored. */
  setVs:function(patch){
    if(!MBNet.isHost||MBNet.state!=='lobby'||!patch)return false;
    var next=vsClean(patch,MBNet.vs),k,same=true;for(k in VS_OPT)if(next[k]!==MBNet.vs[k])same=false;
    if(same)return false;
    MBNet.vs=next;store.set('mpvs',JSON.stringify(next));vsTell();emit('net:vs',{});return true;
  },
  /** Choose a side (0 or 1). Members may do so while they are not ready; the host decides and tells everyone. The host may pass a member id to move somebody else. */
  setTeam:function(team,id){
    team=team?1:0;if(MBNet.state!=='lobby')return false;
    if(MBNet.isHost){var m=member(id||MBNet.id);if(!m||MBNet.teams[m.id]===team)return false;MBNet.teams[m.id]=team;vsTell();emit('net:vs',{});return true}
    var me=member(MBNet.id);if(!me||me.ready)return false;
    return MBNet.send({t:'lb:t',team:team},MBNet.hostId);
  },
  /** Host only: even the two sides out, moving as few players as possible (the latest arrivals first). */
  balance:function(){
    if(!MBNet.isHost||MBNet.state!=='lobby')return false;
    var c=teamCount(),moved=false,i,big;
    while(Math.abs(c[0]-c[1])>1){
      big=c[0]>c[1]?0:1;
      for(i=MBNet.members.length-1;i>=0;i--)if(teamOf(MBNet.members[i].id)===big){MBNet.teams[MBNet.members[i].id]=1-big;break}
      if(i<0)break;c[big]--;c[1-big]++;moved=true;
    }
    if(moved){vsTell();emit('net:vs',{})}
    return moved;
  },
  /** The values the lobby offers for each versus option. */
  vsOptions:function(){return JSON.parse(JSON.stringify(VS_OPT))},
  /** Host only: stop the running game and bring everyone back to the lobby. */
  end:function(reason){if(MBNet.isHost&&MBNet.state==='playing')raw('E'+(reason||'ended'))},
  kick:function(id){if(MBNet.isHost)raw('K'+id)},
  canHost:function(){return !!bridge()||served()},
  code:{encode:codeEncode,decode:codeDecode,pretty:codePretty,parse:parseTarget}
};
/* ---- versus options and teams ---- */
var VS_OPT={format:['ffa','teams'],floor:[11,31,51,101,151],wins:[2,3,5],time:[60,90,120]},VS_DEF={format:'ffa',floor:51,wins:3,time:90};
function vsClean(o,base){
  var r={},k;base=base||VS_DEF;o=o&&typeof o==='object'?o:{};
  for(k in VS_OPT)r[k]=VS_OPT[k].indexOf(o[k])>=0?o[k]:VS_OPT[k].indexOf(base[k])>=0?base[k]:VS_DEF[k];
  return r;
}
function vsStored(){var o=null;try{o=JSON.parse(store.get('mpvs','null'))}catch(e){}return vsClean(o)}
function teamOf(id){return MBNet.teams[id]===1?1:0}
function teamCount(){var c=[0,0];MBNet.members.forEach(function(m){c[teamOf(m.id)]++});return c}
/* host: everything about the versus set-up in one message, to everyone or to one member */
function vsTell(to){
  if(!MBNet.isHost)return;
  var tm={};MBNet.members.forEach(function(m){tm[m.id]=teamOf(m.id)});MBNet.teams=tm;
  MBNet.send({t:'lb:o',v:MBNet.vs,tm:tm},to);
}
function vsWire(){
  MBNet.on('lb:o',function(msg,from){ // host -> members: the options and the sides
    if(MBNet.isHost||from!==MBNet.hostId)return;
    MBNet.vs=vsClean(msg.v,MBNet.vs);
    var tm={},k,src=msg.tm&&typeof msg.tm==='object'?msg.tm:{};for(k in src)if(Object.prototype.hasOwnProperty.call(src,k))tm[k]=src[k]===1?1:0;
    MBNet.teams=tm;emit('net:vs',{});
  });
  MBNet.on('lb:t',function(msg,from){ // member -> host: "put me on that side"
    if(!MBNet.isHost||MBNet.state!=='lobby')return;
    var m=member(from),team=msg.team===1?1:0;if(!m||m.ready||MBNet.teams[from]===team)return;
    MBNet.teams[from]=team;vsTell();emit('net:vs',{});
  });
  MBNet.on('lb:q',function(msg,from){if(MBNet.isHost&&member(from))vsTell(from)}); // member -> host: "what are the options?"
}
function byteLen(s){try{return new TextEncoder().encode(s).length}catch(e){return s.length*3}}
function raw(s){if(ws&&ws.readyState===1)try{ws.send(s);return true}catch(e){}return false}
function member(id){for(var i=0;i<MBNet.members.length;i++)if(MBNet.members[i].id===id)return MBNet.members[i];return null}
function emit(type,msg,from){
  var l=handlers[type];if(!l)return;l=l.slice();
  for(var i=0;i<l.length;i++)try{l[i](msg,from)}catch(e){try{console.error('MBNet: a listener for "'+type+'" failed',e)}catch(_){}}
}
function setState(s){if(MBNet.state!==s){MBNet.state=s;emit('net:state',{state:s})}}

/* Opens the socket to "host:port". Any earlier connection is dropped first. */
function open(target,keepLocal){
  var keep=keepLocal&&localServer;localServer=keep?false:localServer;finish('',false);if(keep)localServer=true;
  return new Promise(function(resolve,reject){
    var my=++gen,sock,done=false,timer;
    addr=target;setState('connecting');
    function fail(msg){if(done)return;done=true;clearTimeout(timer);if(my===gen){try{sock&&sock.close()}catch(e){}ws=null;setState('off');stopLocal()}reject(new Error(msg))}
    try{sock=new WebSocket((location.protocol==='https:'&&target===servedAddr()?'wss://':'ws://')+target+'/ws')}
    catch(e){fail('That address cannot be reached from this page.');return}
    ws=sock;
    timer=setTimeout(function(){fail('No answer from '+target+'. Check the code or address, and that both devices are on the same network.')},7000);
    sock.onopen=function(){if(my!==gen){try{sock.close()}catch(e){}return}done=true;clearTimeout(timer);startPing();resolve()};
    sock.onerror=function(){fail('Could not connect to '+target+'. Check the code or address, and that both devices are on the same network.')};
    sock.onclose=function(){
      if(!done){fail('Could not connect to '+target+'. Check the code or address, and that both devices are on the same network.');return}
      if(my!==gen)return;
      ws=null;
      if(pending){var p=pending;pending=null;p.reject(new Error('The connection was lost.'))}
      finish(closedWhy||'disconnected',false);
    };
    sock.onmessage=function(e){if(my===gen&&typeof e.data==='string')receive(e.data)};
  });
}
var closedWhy='';
/* One request that the relay answers with one event (or an error): L -> rooms, J -> welcome. */
function ask(text,want){
  return new Promise(function(resolve,reject){
    if(pending)pending.reject(new Error('Interrupted.'));
    var t=setTimeout(function(){if(pending&&pending.t===t){pending=null;reject(new Error('The server did not answer.'))}},7000);
    pending={want:want,t:t,resolve:function(v){clearTimeout(t);resolve(v)},reject:function(e){clearTimeout(t);reject(e)}};
    if(!raw(text)){pending=null;clearTimeout(t);reject(new Error('Not connected.'))}
  });
}
function enter(room,create,opts){
  var name=cleanName(opts.name)||MBNet.name()||'Player';
  if(opts.name)store.set('mpname',name);
  return ask('J'+PROTOCOL+'|'+(room||'')+'|'+(create?1:0)+'|'+(opts.mode==='versus'?'versus':'coop')+'|'+encodeURIComponent(name),'welcome')
    .then(function(){return MBNet},function(e){if(MBNet.state==='connecting')finish('',false);throw e});
}

function receive(data){
  probeOpen=false;
  var k=data.charAt(0);
  if(k==='M'){
    var sp=data.indexOf(' '),from=data.slice(1,sp),msg;
    try{msg=JSON.parse(data.slice(sp+1))}catch(e){return}
    if(!msg||typeof msg.t!=='string'||msg.t.slice(0,4)==='net:')return; // system event names cannot be forged by a member
    emit(msg.t,msg,from);return;
  }
  if(k==='P'){var t0=+data.slice(1);if(t0>0)MBNet.ping=Math.max(0,Date.now()-t0);return}
  var ev;try{ev=JSON.parse(data.slice(1))}catch(e){return}
  if(k==='W'){
    serverInfo=ev.server||{};maxFrame=serverInfo.maxFrame||maxFrame;
    MBNet.id=ev.id;MBNet.hostId=ev.hostId;MBNet.isHost=ev.id===ev.hostId;
    MBNet.members=(ev.members||[]).map(function(m){return {id:m.id,name:m.name,ready:!!m.ready,isHost:!!m.isHost}});
    describeRoom(ev.room||{});
    MBNet.teams={};
    if(MBNet.isHost){MBNet.vs=vsStored();MBNet.teams[MBNet.id]=0}
    setState(ev.room&&ev.room.state==='playing'?'playing':'lobby');
    if(!MBNet.isHost)MBNet.send({t:'lb:q'},MBNet.hostId);
    if(pending&&pending.want==='welcome'){var p=pending;pending=null;p.resolve(ev)}
    emit('net:host',{id:MBNet.hostId});
    return;
  }
  if(k!=='S')return;
  var m;
  switch(ev.e){
    case 'rooms':if(pending&&pending.want==='rooms'){var pr=pending;pending=null;pr.resolve(ev)}break;
    case 'error':
      if(pending){var pe=pending;pending=null;var err=new Error(ev.msg||'The server refused.');err.code=ev.code;pe.reject(err)}
      else emit('net:error',{code:ev.code,msg:ev.msg});
      break;
    case 'join':
      if(!member(ev.id)){
        MBNet.members.push({id:ev.id,name:ev.name,ready:false,isHost:false});
        // the host seats a newcomer on the smaller side and sends everyone the set-up as it now is (the newcomer learns the options from it)
        if(MBNet.isHost){var tc=teamCount();tc[teamOf(ev.id)]--;MBNet.teams[ev.id]=tc[1]<tc[0]?1:0;vsTell()}
        emit('net:join',{id:ev.id,name:ev.name});
      }
      break;
    case 'leave':
      m=member(ev.id);if(m){MBNet.members.splice(MBNet.members.indexOf(m),1);delete MBNet.teams[ev.id];emit('net:leave',{id:ev.id,name:m.name,why:ev.why})}
      break;
    case 'ready':m=member(ev.id);if(m){m.ready=!!ev.ready;emit('net:ready',{id:ev.id,ready:m.ready})}break;
    case 'name':m=member(ev.id);if(m){m.name=ev.name;emit('net:name',{id:ev.id,name:ev.name})}break;
    case 'mode':MBNet.room.mode=ev.mode;emit('net:mode',{mode:ev.mode});break;
    case 'start':begin(ev);break;
    case 'end': // the host stopped the game: the room is a lobby again
      MBNet.members.forEach(function(x){x.ready=false});
      setState('lobby');endGame(ev.reason||'ended');
      break;
    case 'closed':closedWhy=ev.reason||'host-left';break; // the socket closes next; finish() runs from onclose
  }
}
function describeRoom(r){
  var s=serverInfo||{},ips=s.ips||[],host=addr.replace(/:\d+$/,''),port=s.port||+addr.replace(/^.*:/,'')||DEFAULT_PORT;
  // the address other devices should use: the one this page reached the server by when that is a LAN address, else the server's own idea of it
  var ip=quad(host)&&!/^127\./.test(host)?host:ips[0]||'';
  MBNet.room={code:ip?codeEncode(ip,port)||'':'',mode:r.mode||'coop',url:ip?'http://'+ip+':'+port+'/':'',id:r.code||'',address:ip?ip+':'+port:'',ips:ips.slice(),port:port,single:!!s.single};
}
function begin(ev){
  var versus=ev.mode==='versus',V=MBNet.vs||VS_DEF,teams=versus&&V.format==='teams';
  // versus: every member carries a side: 0 or 1 with teams, its own place in the list when everyone fights alone
  var members=(ev.members||[]).map(function(m,i){var o={id:m.id,name:m.name};if(versus)o.team=teams?teamOf(m.id):i;return o});
  if(ev.hostId)MBNet.hostId=ev.hostId;
  setState('playing');
  var cfg={mode:ev.mode||'coop',members:members,hostId:MBNet.hostId,myId:MBNet.id,seed:ev.seed};
  if(versus)cfg.vs={format:V.format,floor:V.floor,wins:V.wins,time:V.time};
  var note={mode:cfg.mode,members:members,seed:cfg.seed,hostId:cfg.hostId,myId:cfg.myId};if(versus)note.vs=cfg.vs;
  emit('net:start',note);
  var mp=win.MB&&win.MB.mp;
  if(mp&&typeof mp.begin==='function'){
    try{mp.begin(cfg)}catch(e){try{console.error('MBNet: MB.mp.begin failed',e)}catch(_){}emit('net:error',{code:'begin',msg:'The game could not start on this device.'})}
  }else emit('net:error',{code:'nogame',msg:'This build of the game has no multiplayer mode.'});
}
/* Tells listeners and the game that the multiplayer game is over. Guarded: MB.mp.end may call MBNet.leave, which must not come back here. */
function endGame(reason){
  if(ending)return;ending=true;
  try{
    emit('net:end',{reason:reason});
    var mp=win.MB&&win.MB.mp;
    if(mp&&mp.on&&typeof mp.end==='function')try{mp.end(reason)}catch(e){try{console.error('MBNet: MB.mp.end failed',e)}catch(_){}}
  }finally{ending=false}
}
/* The connection is over, for whatever reason. reason '' = quietly (before a new attempt). */
function finish(reason,closeSocket){
  var was=MBNet.state,hostWas=MBNet.hostId,sock=ws;
  if(closeSocket||reason===''){gen++;ws=null;if(sock)try{sock.close(1000)}catch(e){}}
  if(pending&&(closeSocket||reason==='')){var p=pending;pending=null;p.reject(new Error('Cancelled.'))}
  stopPing();closedWhy='';
  if(was==='off'){stopLocal();return}
  MBNet.members=[];MBNet.id='';MBNet.hostId='';MBNet.isHost=false;MBNet.teams={};
  setState('off');
  stopLocal();
  if(reason==='')return;
  if(reason==='host-left'&&hostWas){emit('net:leave',{id:hostWas,why:'host-left'});emit('net:host',{id:null})}
  if(was==='playing')endGame(reason);
  else if(was==='lobby')emit('net:end',{reason:reason});
}
function stopLocal(){if(!localServer)return;localServer=false;var b=bridge();if(b&&typeof b.stopServer==='function')try{b.stopServer()}catch(e){}}
/* A probe every 5 s measures the round trip. Two probes in a row without any traffic coming back means the link is dead
   (a socket can stay "open" for minutes after Wi-Fi drops). Timers are slowed in background tabs, which this allows for. */
function startPing(){
  stopPing();probeOpen=false;
  pingT=setInterval(function(){
    if(!ws||ws.readyState!==1)return;
    if(probeOpen&&Date.now()-probeAt>12000){var s=ws;closedWhy='disconnected';try{s.close()}catch(e){}return}
    if(!probeOpen){probeOpen=true;probeAt=Date.now()}
    raw('P'+Date.now());
  },5000);
}
function stopPing(){if(pingT){clearInterval(pingT);pingT=0}}
try{win.addEventListener('pagehide',function(){if(MBNet.state!=='off')finish('left',true)})}catch(e){}
MBNet.vs=vsStored();vsWire();
win.MBNet=MBNet;

/* ================================================================ lobby screens ================================================================
   One layer over the arena (like the settings layer of extras.js), built from the page's own classes. All names are set with textContent. */
var MB=win.MB;
if(!MB||!doc.querySelector)return;
var $=function(id){return doc.getElementById(id)};
function h(tag,attrs){
  var e=doc.createElement(tag),i,k;
  if(attrs)for(k in attrs){if(k==='text')e.textContent=attrs[k];else if(k==='class')e.className=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k]===true?'':attrs[k])}
  for(i=2;i<arguments.length;i++){var c=arguments[i];if(c==null||c===false)continue;if(Array.isArray(c)){c.forEach(function(x){if(x)e.appendChild(x)});continue}e.appendChild(typeof c==='string'?doc.createTextNode(c):c)}
  return e;
}
function blip(){try{if(MB.api&&MB.api.haptic)MB.api.haptic(10)}catch(e){}}
function btn(label,fn,primary,attrs){
  var b=h('button',{type:'button',text:label,class:primary?'primary':null});
  if(attrs)for(var k in attrs)if(attrs[k]!=null&&attrs[k]!==false)b.setAttribute(k,attrs[k]===true?'':attrs[k]);
  b.addEventListener('click',function(){blip();fn(b)});return b;
}
var layer=null,panel=null,view=null,screen='',back=null,roomsTimer=0,notice='',busy=false;
function ensureLayer(){
  if(layer)return true;
  var stage=doc.querySelector('.stage');if(!stage)return false;
  panel=h('div',{class:'mbx-panel mbn-panel',role:'dialog','aria-modal':'true',tabindex:'-1','aria-label':'Multiplayer'});
  layer=h('div',{id:'mbn',hidden:true},panel);
  stage.appendChild(layer);
  // while the layer is up the game must not see keys: Enter would press the title screen underneath, letters would steer the hero
  win.addEventListener('keydown',function(e){
    if(!layer||layer.hidden)return;
    e.stopImmediatePropagation();
    var t=e.target,tag=t&&t.tagName;
    if(e.key==='Escape'){e.preventDefault();if(view&&view.esc)view.esc();return}
    if(e.key==='Enter'){if(tag==='BUTTON')return;if(view&&view.enter){e.preventDefault();view.enter()}return}
    if(e.key==='Tab'){
      var f=[].filter.call(panel.querySelectorAll('button,input'),function(x){return !x.disabled&&x.offsetParent!==null});
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
  clearInterval(roomsTimer);roomsTimer=0;
  var keep=screen===name?panel.scrollTop:0,keepL=screen===name?layer.scrollTop:0,act=doc.activeElement,actKey=screen===name&&act&&panel.contains(act)?act.getAttribute('data-k'):null,sel=actKey&&act.tagName==='INPUT'?[act.selectionStart,act.selectionEnd]:null;
  screen=name;view=v||{};panel.textContent='';panel.classList.remove('vs');
  var focus=build(panel);
  if(layer.hidden){layer.hidden=false;var ov=$('ov');if(ov)try{ov.inert=true}catch(e){}}
  panel.scrollTop=keep;layer.scrollTop=keepL;
  var again=actKey&&panel.querySelector('[data-k="'+actKey+'"]');
  try{(again||focus||panel).focus({preventScroll:true});if(again&&sel)again.setSelectionRange(sel[0],sel[1])}catch(e){}
}
function hideLayer(){
  clearInterval(roomsTimer);roomsTimer=0;
  if(!layer||layer.hidden)return;
  layer.hidden=true;view=null;screen='';panel.textContent='';
  var ov=$('ov');if(ov){try{ov.inert=false}catch(e){}
    var b=!ov.hidden&&ov.querySelector('#ovBtns button');if(b&&!touch())try{b.focus({preventScroll:true})}catch(e){}}
}
function touch(){try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}}
function closeAll(){hideLayer();var b=back;back=null;if(typeof b==='function')try{b()}catch(e){}}
function head(kick,title){return [h('p',{class:'kick',text:kick}),h('h2',{text:title})]}
function nameField(onchange){
  var inp=h('input',{type:'text',id:'mbnName','data-k':'name',maxlength:String(NAME_MAX),autocomplete:'off',autocapitalize:'words',spellcheck:'false',enterkeyhint:'done',placeholder:'Player',value:MBNet.name()});
  inp.addEventListener('change',function(){var n=cleanName(inp.value);if(n)store.set('mpname',n);if(onchange)onchange(n)});
  return h('label',{class:'mbn-field'},h('span',{class:'lab',text:'Your name'}),inp);
}
function typedName(){var i=$('mbnName'),n=i?cleanName(i.value):'';if(n)store.set('mpname',n);return n||MBNet.name()||'Player'}
function msgLine(text,bad){return h('p',{class:'mbx-msg'+(bad?' bad':''),id:'mbnMsg',role:'status',text:text||''})}
function say(text,bad){var m=$('mbnMsg');if(m){m.textContent=text||'';m.className='mbx-msg'+(bad?' bad':'')}}
/* Versus is offered only when the game on this device can play it: MB.mp.versus, or an MB.mp.vs slot (null between matches) */
function vsOk(){var mp=MB.mp;return !!(mp&&typeof mp.begin==='function'&&(mp.versus===true||'vs' in mp))}
var wantMode=store.get('mpmode','coop')==='versus'?'versus':'coop';
/* Co-op | Versus. pick: fn(mode) makes them buttons; without it they only show which one is on. */
function modes(cur,pick){
  var ok=vsOk();
  function chip(mode,label){
    var on=cur===mode,off=mode==='versus'&&!ok;
    if(!pick||off)return h('span',{class:'mbn-mode'+(on?' on':'')+(off?' off':''),'aria-disabled':off?'true':null},label,off?h('small',{text:'not in this build'}):null);
    return btn(label,function(){pick(mode)},false,{class:'mbn-mode'+(on?' on':''),'aria-pressed':on?'true':'false','data-k':'mode-'+mode});
  }
  return h('div',{class:'mbn-modes',role:'group','aria-label':'Mode'},chip('coop','Co-op'),chip('versus','Versus'));
}
/* ---- versus: words and colours ---- */
var VS_LAB={format:'Format',floor:'Hero level',wins:'Rounds to win',time:'Round time'};
function vsWord(k,v){return k==='format'?(v==='teams'?'Teams':'Free-for-all'):k==='floor'?'Floor '+v:k==='wins'?'First to '+v:v+' s'}
var TEAM_NAME=['Team A','Team B'],TEAM_COL=['#2f9dff','#ffb21e'],MEMBER_COL=['#4fd8ff','#ff9f1a','#7dff5a','#b46cff','#ffe14a','#6a8cff','#3df5c0','#d8c8ff'];
/* (round 11) the fourth member colour was a pink that sat too close to the crimson everything hostile is drawn in: it is violet now. The game's own list
   (MB.mp.colors, in game.js) is brought into line here until that file carries the new value itself. */
function fixColors(){try{var c=MB.mp&&MB.mp.colors;if(c&&typeof c[3]==='string'&&c[3].toLowerCase()==='#ff5ad2')c[3]=MEMBER_COL[3]}catch(e){}}
fixColors();
function hex(c){if(typeof c==='number'&&c>=0)c='#'+('000000'+Math.floor(c).toString(16)).slice(-6);return typeof c==='string'&&/^#[0-9a-f]{3,8}$/i.test(c)?c:''}
/* the colours the arena uses, so that the lobby, the HUD and the rings round the heroes agree: the renderer's own when it offers them, else the game's member colours */
function teamColor(t){
  var R=MB.renderer,mp=MB.mp||{},c='';t=t?1:0;
  try{if(R&&typeof R.teamColor==='function')c=hex(R.teamColor(t));var l=(mp.vs&&mp.vs.teamColors)||mp.teamColors;if(!c&&l)c=hex(l[t])}catch(e){}
  return c||TEAM_COL[t];
}
function memberColor(i){
  var R=MB.renderer,mp=MB.mp||{},c='';i=Math.max(0,i|0);
  try{if(R&&typeof R.memberColor==='function')c=hex(R.memberColor(i));if(!c&&mp.colors)c=hex(mp.colors[i%mp.colors.length])}catch(e){}
  return c||MEMBER_COL[i%MEMBER_COL.length];
}
/* one option of the versus set-up: the host gets a row of buttons, everyone else reads the choice */
function optRow(k,canEdit){
  var V=MBNet.vs,box=h('div',{class:'mbn-seg',role:'group','aria-label':VS_LAB[k]});
  VS_OPT[k].forEach(function(v){
    var on=V[k]===v,label=k==='format'?vsWord(k,v):k==='floor'?String(v):k==='wins'?String(v):v+' s';
    if(canEdit)box.appendChild(btn(label,function(){var p={};p[k]=v;MBNet.setVs(p)},false,{'aria-pressed':on?'true':'false','data-k':'vs-'+k+'-'+v,'aria-label':vsWord(k,v)}));
    else if(on)box.appendChild(h('b',{class:'mbn-val',text:vsWord(k,v)}));
  });
  return h('div',{class:'mbn-opt'},h('span',{class:'lab',text:VS_LAB[k]}),box);
}
/* (round 11) to: with teams, the side the HOST may send this player to from here (any player, ready or not: the host owns the sides) */
function memberRow(m,col,to){
  var tags=[];
  if(m.isHost)tags.push(h('span',{class:'lab mbn-tag host',text:'Host'}));
  else tags.push(h('span',{class:'lab mbn-tag'+(m.ready?' ok':''),text:m.ready?'Ready':'Not ready'}));
  var row=h('div',{class:'mbn-li'+(m.id===MBNet.id?' me':'')+(col?' col':'')},
    h('span',{class:'mbn-name',text:m.name+(m.id===MBNet.id?' (you)':'')}),tags,
    MBNet.isHost&&(to===0||to===1)?btn(to?'To B \u203a':'\u2039 To A',function(){notice='';MBNet.setTeam(to,m.id)},false,{class:'mbn-mv','data-k':'mv-'+m.id,'aria-label':'Move '+m.name+' to '+TEAM_NAME[to],title:'Move to '+TEAM_NAME[to]}):null,
    MBNet.isHost&&!m.isHost?btn('Remove',function(){MBNet.kick(m.id)},false,{class:'mbn-x','data-k':'kick-'+m.id,'aria-label':'Remove '+m.name}):null);
  if(col)row.style.setProperty('--tc',col);
  return row;
}
function fail(e){busy=false;var t=e&&e.message||'That did not work.';if(screen==='menu'||screen==='join')say(t,true);else showMenu(t)}
function go(promise,label){
  if(busy)return;busy=true;say(label||'Connecting…');
  promise.then(function(r){busy=false;if(r&&Array.isArray(r.rooms))showPick(r.rooms);else showLobby()},fail);
}

/* ---- first screen: name, mode, host or join ---- */
function showMenu(message){
  var isServed=served(),canLocal=!!bridge();
  render('menu',function(p){
    var first=null,list=null;
    p.appendChild(h('div',{class:'mbn-head'},head('Local network','Multiplayer')));
    if(wantMode==='versus'&&!vsOk())wantMode='coop';
    p.appendChild(h('div',{class:'mbn-row'},nameField(),modes(wantMode,function(m){typedName();wantMode=m;store.set('mpmode',m);showMenu()})));
    var actions=h('div',{class:'btns'});
    if(isServed){
      actions.appendChild(first=btn('Create a room',function(){go(MBNet.host({name:typedName(),mode:wantMode}),'Creating the room…')},true,{'data-k':'create'}));
      actions.appendChild(btn('Join another host',function(){showJoin()}));
    }else{
      if(canLocal)actions.appendChild(first=btn('Host on this phone',function(){go(MBNet.host({name:typedName(),server:'local',mode:wantMode}),'Starting the game server…')},true,{'data-k':'create'}));
      actions.appendChild(btn('Join a game',function(){showJoin()},!canLocal));
      if(!first)first=actions.firstChild;
    }
    actions.appendChild(btn('Back',closeAll));
    if(isServed){
      list=h('div',{class:'mbn-list',id:'mbnRooms','aria-label':'Rooms on this server'});
      var sub=h('p',{class:'lab mbn-sub',text:'Rooms on this server'});p.appendChild(sub);p.appendChild(list);
      var fill=function(){
        MBNet.rooms().then(function(rooms){
            if(screen!=='menu')return;
            // a phone that is hosting serves this page too: it has the one room, and no more can be made on it
            if(rooms.single&&!first.hidden){first.hidden=true;sub.textContent='The game hosted on this device';var j=list.querySelector('button');if(doc.activeElement===doc.body&&j)try{j.focus({preventScroll:true})}catch(e){}}
            roomRows(list,rooms,function(r){go(MBNet.join(null,{name:typedName(),room:r.code}),'Joining…')},rooms.single);
          },
          function(){if(screen==='menu'){list.textContent='';list.appendChild(h('p',{class:'dim',text:'This page was not opened from an Ashes to Apex server. Use "Join another host".'}))}});
      };
      fill();roomsTimer=setInterval(fill,2500);
    }else if(!canLocal)p.appendChild(h('p',{class:'dim mbx-center',text:'To host a game, run the Ashes to Apex server on a computer, or host from the Android app. This device can join either.'}));
    p.appendChild(msgLine(message,!!message));
    p.appendChild(actions);
    return touch()?p:first;
  },{esc:closeAll,enter:function(){var b=panel.querySelector('.btns .primary:not([hidden])');if(b)b.click()}});
}
function roomRows(list,rooms,join,single){
  var key=JSON.stringify(rooms)+(single?1:0);if(list.getAttribute('data-key')===key)return;list.setAttribute('data-key',key);
  var had=doc.activeElement&&list.contains(doc.activeElement)?doc.activeElement.getAttribute('data-k'):null;
  list.textContent='';
  if(!rooms.length){list.appendChild(h('p',{class:'dim',text:single?'Nobody is hosting right now. Ask the host to open a lobby again.':'No rooms yet. Create one, and the others will see it here.'}));return}
  rooms.forEach(function(r){
    var open=r.state==='lobby'&&r.count<r.max;
    list.appendChild(h('div',{class:'mbn-li'},
      h('span',{class:'mbn-name',text:(r.name||'Player')+'’s room'}),
      h('span',{class:'lab',text:(r.mode==='versus'?'Versus':'Co-op')+' · '+r.count+'/'+r.max}),
      open?btn('Join',function(){join(r)},false,{'data-k':'room-'+r.code}):h('span',{class:'lab mbn-tag',text:r.state==='playing'?'In game':'Full'})));
  });
  var again=had&&list.querySelector('[data-k="'+had+'"]');if(again)try{again.focus({preventScroll:true})}catch(e){}
}

/* ---- join by code or address ---- */
function showJoin(message){
  render('join',function(p){
    p.appendChild(h('div',{class:'mbn-head'},head('Local network','Join a game')));
    var inp=h('input',{type:'text',id:'mbnTarget','data-k':'target',maxlength:'64',autocomplete:'off',autocapitalize:'characters',autocorrect:'off',spellcheck:'false',enterkeyhint:'go',placeholder:'K7Q2  or  192.168.1.20:7777',value:store.get('mplast','')});
    p.appendChild(h('div',{class:'mbn-row'},nameField(),h('label',{class:'mbn-field'},h('span',{class:'lab',text:'Join code or address'}),inp)));
    p.appendChild(h('p',{class:'dim mbx-center',text:'The host’s lobby shows both. Every device must be on the same Wi-Fi or network.'}));
    p.appendChild(msgLine(message,!!message));
    var doJoin=function(){
      var v=inp.value.trim();
      if(!v){say('Enter the join code or the address shown on the host’s screen.',true);return}
      if(!parseTarget(v)){say('That is not a join code or an address. Codes have 4, 6 or 11 letters and digits.',true);return}
      store.set('mplast',v);go(MBNet.join(v,{name:typedName()}),'Connecting…');
    };
    p.appendChild(h('div',{class:'btns'},btn('Join',doJoin,true),btn('Back',function(){MBNet.leave();showMenu()})));
    view.enter=doJoin;
    return touch()?p:inp;
  },{esc:function(){MBNet.leave();showMenu()}});
}
/* ---- a server with several rooms: pick one ---- */
function showPick(rooms){
  render('pick',function(p){
    p.appendChild(h('div',{class:'mbn-head'},head('Local network','Choose a room')));
    var list=h('div',{class:'mbn-list'});p.appendChild(list);
    roomRows(list,rooms,function(r){go(MBNet.joinRoom(r.code,{name:MBNet.name()}),'Joining…')});
    p.appendChild(msgLine(''));
    p.appendChild(h('div',{class:'btns'},btn('Back',function(){MBNet.leave();showJoin()})));
    return touch()?p:list.querySelector('button');
  },{esc:function(){MBNet.leave();showJoin()}});
}

/* ---- the lobby: how to join, who is here, ready and start ---- */
function showLobby(){
  if(MBNet.state!=='lobby'){showMenu();return}
  render('lobby',function(p){
    var R=MBNet.room,me=member(MBNet.id)||{},others=MBNet.members.filter(function(m){return !m.isHost}),waiting=others.filter(function(m){return !m.ready}).length;
    var hostM=member(MBNet.hostId)||{};
    p.appendChild(h('div',{class:'mbn-head'},head((R.mode==='versus'?'Versus · '+vsWord('format',MBNet.vs.format):'Co-op')+' · '+MBNet.members.length+' of '+MAX_MEMBERS,MBNet.isHost?'Your room':(hostM.name||'Host')+'’s room')));
    var how=h('div',{class:'mbn-how'});
    if(R.code){
      how.appendChild(h('span',{class:'lab',text:'Join code'}));
      how.appendChild(h('b',{class:'mbn-code'+(R.code.length>6?' long':''),text:codePretty(R.code),'aria-label':'Join code '+codePretty(R.code).split('').join(' ')}));
      how.appendChild(h('span',{class:'lab',text:'or open in a browser'}));
      how.appendChild(h('span',{class:'mbn-url',text:R.url.replace(/\/$/,'')}));
      if(R.ips&&R.ips.length>1)how.appendChild(h('span',{class:'dim mbn-alt',text:'Other addresses of the host: '+R.ips.filter(function(ip){return R.address.indexOf(ip+':')!==0}).map(function(ip){return ip+':'+R.port}).join(', ')}));
    }else how.appendChild(h('p',{class:'dim',text:'The host has no local network address yet. Connect it to Wi-Fi, or turn on its hotspot, so that others can join.'}));
    var versus=R.mode==='versus',V=MBNet.vs,teams=versus&&V.format==='teams',block=MBNet.isHost?MBNet.startBlock():'';
    panel.classList.toggle('vs',versus);
    if(MBNet.isHost)p.appendChild(modes(R.mode,function(m){notice='';MBNet.setMode(m)}));
    var list=h('div',{class:'mbn-list mbn-members','aria-label':'Players'});
    if(!versus){
      MBNet.members.forEach(function(m){list.appendChild(memberRow(m))});
      p.appendChild(h('div',{class:'mbn-cols'},how,list));
    }else{
      var opts=h('div',{class:'mbn-opts'+(MBNet.isHost?'':' ro'),'aria-label':'Versus options'});
      ['format','floor','wins','time'].forEach(function(k){opts.appendChild(optRow(k,MBNet.isHost))});
      if(!MBNet.isHost)opts.appendChild(h('p',{class:'dim',text:'The host sets these. Everyone fights with a seasoned hero of that floor, chosen when the match starts.'}));
      p.appendChild(h('div',{class:'mbn-cols'},how,opts));
      if(teams){
        var cols=h('div',{class:'mbn-teams'}),mine=teamOf(MBNet.id);
        [0,1].forEach(function(t){
          var its=MBNet.members.filter(function(m){return teamOf(m.id)===t}),col=h('section',{class:'mbn-team'+(t===mine?' mine':''),'aria-label':TEAM_NAME[t]});
          col.style.setProperty('--tc',teamColor(t));
          var hd=h('div',{class:'mbn-th'},h('b',{text:TEAM_NAME[t]}),h('span',{class:'lab',text:its.length+(its.length===1?' player':' players')}));
          // the way across is a button on the other side; a member who has pressed Ready stays put until they take it back
          if(t!==mine)hd.appendChild(btn('Join',function(){notice='';MBNet.setTeam(t)},false,{'data-k':'team-join','aria-label':'Join '+TEAM_NAME[t],disabled:!MBNet.isHost&&!!me.ready,title:!MBNet.isHost&&me.ready?'Press Not ready to change team':null}));
          else hd.appendChild(h('span',{class:'lab mbn-tag mbn-yours',text:'Your team'}));
          col.appendChild(hd);
          var l=h('div',{class:'mbn-list'});its.forEach(function(m){l.appendChild(memberRow(m,null,1-t))});
          if(!its.length)l.appendChild(h('p',{class:'dim',text:'Nobody yet.'}));
          col.appendChild(l);cols.appendChild(col);
        });
        p.appendChild(cols);
      }else{
        list.classList.add('mbn-ffa');
        MBNet.members.forEach(function(m,i){list.appendChild(memberRow(m,memberColor(i)))});
        p.appendChild(list);
      }
    }
    var status=notice||(MBNet.isHost?(block?block:MBNet.members.length<2?'Waiting for players. You can also start alone.':waiting?'Waiting for '+waiting+(waiting>1?' players':' player')+' to be ready.':'Everyone is ready.')
      :me.ready?'Waiting for the host to start.':teams?'Pick your team, then press Ready.':'Press Ready when you are set.');
    p.appendChild(msgLine(status,!!notice));
    var btns=h('div',{class:'btns mbn-acts'}),first;
    if(MBNet.isHost)btns.appendChild(first=btn('Start',function(){notice='';MBNet.start()},true,{disabled:waiting>0||!!block,'data-k':'start'}));
    else btns.appendChild(first=btn(me.ready?'Not ready':'Ready',function(){notice='';MBNet.setReady(!me.ready)},!me.ready,{'data-k':'ready','aria-pressed':me.ready?'true':'false'}));
    if(MBNet.isHost&&teams){var tc=teamCount();btns.appendChild(btn('Balance',function(){notice='';MBNet.balance()},false,{'data-k':'balance','aria-label':'Balance teams',title:'Balance teams',disabled:Math.abs(tc[0]-tc[1])<2}))}
    btns.appendChild(btn('Leave',function(){notice='';MBNet.leave();showMenu()},false,{'data-k':'leave'}));
    p.appendChild(btns);
    return touch()?p:first;
  },{esc:null});
}
function showNotice(title,text){
  render('notice',function(p){
    p.appendChild(h('div',{class:'mbn-head'},head('Multiplayer',title)));
    p.appendChild(h('p',{class:'mbx-center',text:text}));
    var ok=btn('Continue',function(){showMenu()},true);
    p.appendChild(h('div',{class:'btns'},ok,btn('Title screen',closeAll)));
    return ok;
  },{esc:closeAll,enter:function(){showMenu()}});
}
var WHY={
  'host-left':['The host left','The host closed the game or lost the connection, so the session is over.'],
  'kicked':['Removed from the room','The host removed you from the room.'],
  'disconnected':['Connection lost','The link to the host dropped. Check that this device is still on the same network.'],
};

// keep the open screen in step with the room
['net:join','net:leave','net:ready','net:name','net:mode','net:vs'].forEach(function(t){MBNet.on(t,function(){if(screen==='lobby'&&MBNet.state==='lobby')showLobby()})});
MBNet.on('net:start',function(){notice='';fixColors();hideLayer()});
MBNet.on('net:error',function(e){
  if(e.code==='nogame'||e.code==='begin'){notice=e.msg;if(MBNet.isHost)MBNet.end('no-game');else if(MBNet.state==='playing'&&e.code==='begin')MBNet.leave()}
  else if(screen==='lobby'){notice=e.msg||'';showLobby()}
});
MBNet.on('net:end',function(e){
  busy=false;
  // the game has put its own screen back by now (MB.mp.end ran first); the lobby layer goes over it
  if(MBNet.state==='lobby'){showLobby();return}
  if(e.reason==='left'){if(layer&&!layer.hidden&&screen==='lobby')showMenu();return}
  var w=WHY[e.reason]||['The session ended','The multiplayer session is over.'];
  showNotice(w[0],w[1]);
});

/* ================================================================ versus: the match HUD ================================================================
   A strip over the top middle of the arena, drawn from MB.mp.vs (the game's own account of the match) while a versus match runs:
   the round, the clock, and what each side or each player has won. It takes no touches and is rebuilt only when the cast changes. */
var vh=null,vhKey='',vhRaf=0,vhBad=false,vhSay='',vhT={};
function vsNow(){var mp=MB.mp,v=mp&&mp.on?mp.vs:null;return v&&typeof v==='object'?v:null}
function vhMake(){
  var stage=doc.querySelector('.stage');if(!stage)return false;
  vh=h('div',{id:'vsHud',hidden:true,role:'group','aria-label':'Versus score'});
  stage.appendChild(vh);return true;
}
function vhOff(){
  if(vh&&!vh.hidden)vh.hidden=true;
  var w=doc.querySelector('.wrap');if(w&&w.classList.contains('vs-on'))w.classList.remove('vs-on');
  vhSay='';
}
function txt(el,s){if(el&&el.textContent!==s)el.textContent=s}
function cls(el,name,on){if(el&&el.classList.contains(name)!==!!on)el.classList.toggle(name,!!on)}
function clock(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+('0'+t%60).slice(-2)}
function pips(n){var b=h('span',{class:'vsh-pips','aria-hidden':'true'}),i;for(i=0;i<n;i++)b.appendChild(h('i'));return b}
function vhTeam(v,t){var l=Array.isArray(v.teams)?v.teams:[],i;for(i=0;i<l.length;i++)if(l[i]&&l[i].team===t)return l[i];return null}
function vhTeamName(v,t){var o=vhTeam(v,t),n=o&&typeof o.name==='string'?cleanName(o.name):'';return n||TEAM_NAME[t]}
function vhBuild(v,score,teams){
  vh.textContent='';vhT={sides:[],chips:{}};
  var mid=h('div',{class:'vsh-mid'},vhT.round=h('span',{class:'vsh-round'}),vhT.time=h('b',{class:'vsh-time'}),vhT.note=h('span',{class:'vsh-note'}));
  vhT.live=h('span',{class:'mbt-sr',role:'status','aria-live':'polite'});
  var wins=Math.max(1,Math.min(9,v.wins|0)),myId=MB.mp.myId,idx={};
  (MB.mp.members||[]).forEach(function(m,i){idx[m.id]=i});
  if(teams){
    [0,1].forEach(function(t){
      var men=h('span',{class:'vsh-men','aria-hidden':'true'}),side=h('div',{class:'vsh-side '+(t?'b':'a')+(v.myTeam===t?' mine':'')}),o={el:side,men:{},pips:null,sr:null};
      side.style.setProperty('--tc',teamColor(t));
      score.forEach(function(e){if((e.team?1:0)===t){var d=h('i',{class:e.id===myId?'me':null});o.men[e.id]=d;men.appendChild(d)}});
      side.appendChild(h('span',{class:'vsh-tn',text:vhTeamName(v,t)+(v.myTeam===t?' · you':'')}));
      side.appendChild(o.pips=pips(wins));side.appendChild(men);side.appendChild(o.sr=h('span',{class:'mbt-sr'}));
      vhT.sides.push(o);
    });
    vh.appendChild(vhT.sides[0].el);vh.appendChild(mid);vh.appendChild(vhT.sides[1].el);
  }else{
    var chips=h('div',{class:'vsh-chips'});
    score.forEach(function(e,i){
      var c=h('span',{class:'vsh-chip'+(e.id===myId?' me':'')}),o={el:c,n:null};
      c.style.setProperty('--tc',memberColor(idx[e.id]!=null?idx[e.id]:typeof e.team==='number'?e.team:i));
      c.appendChild(h('span',{class:'vsh-nm',text:String(e.name==null?'':e.name)}));c.appendChild(o.n=h('b',{class:'vsh-n'}));
      vhT.chips[e.id]=o;chips.appendChild(c);
    });
    vh.appendChild(mid);vh.appendChild(chips);
  }
  vh.appendChild(vhT.live);
  vh.className=teams?'vs-teams':'vs-ffa n'+Math.min(8,score.length);
}
function vhDraw(v){
  if(!vh&&!vhMake())return;
  var score=Array.isArray(v.score)?v.score:[],teams=v.format==='teams',ph=String(v.phase||''),t=+v.t||0,wins=v.wins|0;
  var key=(teams?'T'+vhTeamName(v,0)+'/'+vhTeamName(v,1):'F')+wins+'|'+v.myTeam+'|'+teamColor(0)+memberColor(1)+'|'+score.map(function(e){return e.id+':'+e.name+':'+e.team}).join(',');
  if(key!==vhKey){vhKey=key;vhBuild(v,score,teams)}
  var w=doc.querySelector('.wrap');if(w&&!w.classList.contains('vs-on'))w.classList.add('vs-on');
  // nothing to show while everyone is choosing a hero, and the results screen says it all
  var show=ph!=='pick'&&ph!=='results'&&score.length>0;
  if(vh.hidden===show)vh.hidden=!show;
  if(!show)return;
  var urgent=ph==='sudden'||(ph==='fight'&&t<=10);
  cls(vh,'urgent',urgent);cls(vh,'ph-count',ph==='countdown');cls(vh,'ph-sudden',ph==='sudden');cls(vh,'ph-over',ph==='over');
  txt(vhT.round,'Round '+Math.max(1,v.round|0)+' · first to '+wins);
  txt(vhT.time,ph==='countdown'?String(Math.max(1,Math.ceil(t))):ph==='sudden'?'Sudden death':ph==='over'?'Round over':clock(t));
  txt(vhT.note,ph==='countdown'?'Get ready':ph==='sudden'?'The ring is closing':ph==='over'?'':urgent?'Last seconds':'');
  var say=ph==='countdown'?'Round '+Math.max(1,v.round|0)+'. Get ready.':ph==='sudden'?'Sudden death. The ring is closing.':ph==='over'?'Round over.':ph==='fight'&&urgent?'Ten seconds left.':'';
  if(say!==vhSay){vhSay=say;if(say)txt(vhT.live,say)}
  var i,j,e,o,won,best=0;
  if(teams){
    for(i=0;i<2;i++){
      o=vhT.sides[i];won=0;var up=0,all=0;
      for(j=0;j<score.length;j++){e=score[j];if((e.team?1:0)!==i)continue;won=Math.max(won,e.rounds|0);cls(o.men[e.id],'down',e.down||e.left);cls(o.men[e.id],'left',e.left);if(e.left)continue;all++;if(!e.down)up++}
      var tt=vhTeam(v,i);if(tt&&typeof tt.rounds==='number')won=tt.rounds|0;
      for(j=0;j<o.pips.children.length;j++)cls(o.pips.children[j],'on',j<won);
      cls(o.el,'out',all>0&&!up);
      txt(o.sr,won+' of '+wins+' rounds, '+up+' of '+all+' standing');
    }
  }else{
    for(j=0;j<score.length;j++)best=Math.max(best,score[j].rounds|0);
    for(j=0;j<score.length;j++){e=score[j];o=vhT.chips[e.id];if(!o)continue;txt(o.n,String(e.rounds|0));cls(o.el,'down',e.down||e.left);cls(o.el,'left',e.left);cls(o.el,'lead',!e.left&&best>0&&(e.rounds|0)===best)}
  }
}
function vhTick(){
  vhRaf=0;
  var v=vhBad?null:vsNow();
  if(!v){vhOff();return}
  try{vhDraw(v)}catch(e){vhBad=true;vhOff();try{console.warn('net: the versus HUD stopped',e)}catch(_){}return}
  vhRaf=win.requestAnimationFrame(vhTick);
}
// asleep until a versus match is on: a slow look, then every frame while it lasts
setInterval(function(){if(!vhRaf&&!vhBad&&vsNow())vhTick()},250);
try{vhMake()}catch(e){} // the game looks for #vsHud to know that the page shows the score itself
MBNet.on('net:end',function(){vhBad=false});

/* ---- the way in: a Multiplayer button on the title screen ---- */
function openLobby(backFn){
  back=typeof backFn==='function'?backFn:null;
  if(MBNet.state==='lobby')showLobby();else showMenu();
}
MB.openMultiplayer=openLobby;
MBNet.openLobby=openLobby;
var TITLE_KICK='Bones first. Legend later.';
function addTitleButton(){
  var b=$('ovBtns'),k=$('ovKick'),ov=$('ov');
  if(!b||!k||!ov||ov.hidden||k.textContent!==TITLE_KICK||!MB.S||MB.S.mode!=='title')return;
  var all=b.querySelectorAll('button'),i,before=null;
  for(i=0;i<all.length;i++){var t=all[i].textContent;if(t==='Multiplayer')return;if(!before&&(t==='Settings'||t==='Records'))before=all[i]}
  var mb=h('button',{type:'button',text:'Multiplayer','data-mbn':'1'});
  mb.addEventListener('click',function(){blip();openLobby()});
  b.insertBefore(mb,before);
}
try{
  var target=$('ovBtns');
  if(target&&win.MutationObserver)new MutationObserver(addTitleButton).observe(target,{childList:true});
  if(typeof MB.on==='function')MB.on('title',function(){setTimeout(addTitleButton,0)});
  // the title screen was drawn before this file loaded: let the game add its own Multiplayer entry if it has one, else add ours
  if(MB.api&&typeof MB.api.refreshTitle==='function')MB.api.refreshTitle();
  addTitleButton();
}catch(e){try{console.warn('net: no title button',e)}catch(_){}}
})();
