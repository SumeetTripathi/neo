(() => {
const W=960,H=600,DPR=2,WALL=28,FOG=175,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');cv.width=W*DPR;cv.height=H*DPR;
const fogC=document.createElement('canvas');fogC.width=W;fogC.height=H;const fctx=fogC.getContext('2d');
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=Math.random;

const PARTS=[
 {id:'organs',name:'Organs',text:'A heart to pump and lungs to fill. You gain 3 health, strike faster, and can dash.'},
 {id:'skin',name:'Skin',text:'Flesh closes over the bone. You gain 3 more health, and wounds slowly knit shut.'},
 {id:'touch',name:'Touch',text:'Nerves wake. You can feel your wounds now, so your health is shown, and you feel a blow coming before it lands.'},
 {id:'sight',name:'Sight',text:'Eyes. The dark lifts, and the crypt turns out to have colour.'},
 {id:'hearing',name:'Hearing',text:'Ears. Sound is no longer a dull thud inside your skull, and you can hear what moves under the floor.'},
 {id:'smell',name:'Smell',text:'A nose. Living things leave a scent. Illusions do not.'},
 {id:'taste',name:'Taste',text:'A tongue. Monsters drop morsels now. Eat them to heal.'},
];
const LEVELS=[
 {title:'Bare Bones',boss:'crawler',hint:'No eyes yet. You feel its steps through the floor.'},
 {title:'A Beating Heart',boss:'hound',hint:'It paws the ground, then charges. Dash aside and strike while it is dazed.'},
 {title:'Thin Skin',boss:'witch',hint:'She keeps her distance. Close in between volleys.'},
 {title:'First Touch',boss:'fist',hint:'You can feel where the blow will land. Step out of the ring.'},
 {title:'Open Eyes',boss:'mother',hint:'Kill the mites, or she will bury you in them.'},
 {title:'Listening',boss:'burrower',hint:'Listen for the rumble. Hit it when it surfaces.'},
 {title:'Scent',boss:'mimic',hint:'Three are false. Follow the scent.'},
 {title:'Whole',boss:'hollow',hint:'It wants back everything you took.'},
 {title:'Daylight',boss:'knight',hint:'You have a trade now. Keys 1 and 2, or the skill buttons, use its skills.'},
 {title:'The Mire',boss:'lich',hint:'It calls mites while it casts.'},
 {title:'The Pass',boss:'wyrm',hint:'Faster than the last thing that dug.'},
 {title:'The Throne',boss:'king',hint:'Everything you are, against everything it kept.'},
];
const CLASSES={
 fighter:{name:'Fighter',gear:'Greatsword, headband',hp:3,text:'A fast, heavy blade and no defence but your feet. 13 health.',pows:[
  ['Cleave','Your swing becomes a full circle with a longer reach.'],
  ['Whirlwind','A new skill. Spin and hit everything around you hard.'],
  ['Bloodrush','Hit 25% harder and swing 15% faster.']]},
 assassin:{name:'Assassin',gear:'Twin daggers, mask',hp:0,text:'The fastest strikes and the shortest dash cooldown. Your first strike after a dash hits triple. 10 health.',pows:[
  ['Twin Fangs','Every strike lands twice.'],
  ['Shadowstep','A new skill. Appear behind the nearest monster and stab it for heavy damage.'],
  ['Vanish','Your dash recharges almost twice as fast.']]},
 healer:{name:'Healer',gear:'Sun staff, white robe',hp:2,text:'Orbs of light at range, and you mend 1 health every 4 seconds. 12 health.',pows:[
  ['Sanctuary','You mend 1 health every 2.5 seconds.'],
  ['Mend','A new skill. Heal 5 health at once and throw back everything near you.'],
  ['Smite','Your orbs hit 60% harder.']]},
 tank:{name:'Tank',gear:'Sword, shield, plate',hp:6,text:'16 health and a heavy sword that hits twice as hard. Your shield blocks one hit every 6 seconds. Slowest on foot.',pows:[
  ['Bulwark','Your shield recharges in 3.5 seconds, and a blocked hit throws a shockwave that hurts everything near you.'],
  ['Earthsplitter','A new skill. Slam the ground to hit everything around you hard and wipe out nearby bolts.'],
  ['Iron Heart','4 more health, and your wounds close twice as fast.']]},
 mage:{name:'Mage',gear:'Staff, robe, hat',hp:0,text:'Arcane bolts that strike from across the room. Your dash becomes a blink that jumps you through danger. 10 health.',pows:[
  ['Forked Bolt','Every cast throws three bolts in a spread.'],
  ['Nova','A new skill. A ring of bolts bursts out of you and erases enemy bolts nearby.'],
  ['Arcane Lance','Your bolts pass straight through everything they hit.']]},
 ranger:{name:'Ranger',gear:'Bow, hood, quiver',hp:2,text:'Fast arrows at long range, and quick feet. 12 health.',pows:[
  ['Quickdraw','You loose arrows much faster.'],
  ['Volley','A new skill. Loose a fan of seven arrows at once.'],
  ['Longshot','Arrows that fly more than a few strides hit for double.']]},
 necro:{name:'Necromancer',gear:'Skull staff, grave robe',hp:1,text:'Bone spears at range, and the dead fight for you: a thrall rises every 6 seconds, up to two. 11 health.',pows:[
  ['Grave Call','Thralls rise every 4 seconds, and you can hold four.'],
  ['Army of Bones','A new skill. Four extra thralls claw out of the ground at once.'],
  ['Soul Leech','Every tenth hit by you or your thralls heals 1 health.']]},
};
// per class: a stacking boon [name, text, cap] and the two upgrades offered after level 50
const EXTRA={
 fighter:{boon:['Fury','Swing 8% faster.',5],adv:[['champion','Champion','Raw power','Hit 50% harder and gain 6 health.'],['duelist','Duelist','Footwork','Swing 50% faster and move 15% faster.']]},
 assassin:{boon:['Ambush','Your strike after a dash hits even harder.',5],adv:[['nightblade','Nightblade','Sharper','Every strike hits 60% harder.'],['phantom','Phantom','Unseen','Shadowstep recharges more than twice as fast, and you move 10% faster.']]},
 healer:{boon:['Grace','You mend 12% faster.',5],adv:[['saint','Saint','Second life','Once per level, a killing blow leaves you standing at half health.'],['inquisitor','Inquisitor','Judgement','Orbs pass through everything and hit 60% harder.']]},
 tank:{boon:['Rampart','Your shield recharges 15% faster.',5],adv:[['paladin','Paladin','Holy shield','Every blocked hit heals 2 health, and your shield recharges much faster.'],['berserker','Berserker','No shield','You throw the shield away. Swing 60% faster and hit 50% harder.']]},
 mage:{boon:['Split','One more bolt in every cast.',4],adv:[['archmage','Archmage','Mastery','Two more bolts in every cast, and your skill recharges twice as fast.'],['pyromancer','Pyromancer','Fire','Bolts explode on impact and burn everything near the target.']]},
 ranger:{boon:['Barbs','Arrows pass through one more enemy.',5],adv:[['sharpshooter','Sharpshooter','Precision','Arrows pass through everything and hit 75% harder.'],['beastmaster','Beastmaster','A wolf','A wolf fights beside you in every level and never tires.']]},
 necro:{boon:['Legion','One more thrall at your side.',5],adv:[['lich','Lich','Undeath','Three more thralls, and your thralls no longer crumble with time.'],['reaper','Reaper','Harvest','Bone spears pass through everything and hit twice as hard.']]},
};
for(const k in EXTRA)Object.assign(CLASSES[k],EXTRA[k]);
// Ten active skills per class, four carried at a time. Each row: [id, name, cooldown in seconds, text, effects, needs].
// Effects are small shared building blocks run in order by cast() (see there for the arguments); damage numbers are multiples of your damage multiplier.
// needs: 't' a monster above ground, 'near' one within reach, 'thrall' at least one thrall. A skill that cannot be used keeps its cooldown.
const SKILLS={
 fighter:[
  ['whirlwind','Whirlwind',5,'Spin and hit everything around you hard.',[['shock',115,3]]],
  ['lunge','Lunge',7,'Drive straight through your target and hit everything in the way. Nothing can hurt you while you move.',[['rush',4,0]]],
  ['warcry','War Cry',14,'For 5 seconds you hit 40% harder and swing 25% faster.',[['buff','rageT',5],['ring',90]]],
  ['rend','Rend',10,'One huge blow on the nearest monster in reach. It is slowed for 3 seconds.',[['hit',7,{slow:3}]],'near'],
  ['secondwind','Second Wind',22,'Heal 4 health and shrug off everything for a second.',[['heal',4],['buff','inv',1]]],
  ['bladestorm','Bladestorm',45,'Ultimate. For 4 seconds you are a storm of steel, hitting everything around you again and again while you move freely.',[['buff','stormT',4]]],
  ['breaker','Ground Breaker',11,'Crack the ground under your target. It bursts a moment later and hits very hard.',[['blast','at',100,.5,8]]],
  ['ironskin','Iron Skin',18,'For 5 seconds every hit on you does half damage.',[['buff','stoneT',5],['ring',60]]],
  ['hurl','Blade Hurl',8,'Throw your blade. It passes through everything in its path and hits hard.',[['fan',1,0,640,5,8,'bolt',99]]],
  ['challenge','Challenge',16,'Roar a challenge. Every monster near you is dragged closer and stunned for a moment.',[['pull',340],['near',340,{stun:1.2}],['ring',340]]]],
 tank:[
  ['earthsplitter','Earthsplitter',6,'Slam the ground to hit everything around you hard and wipe out nearby bolts.',[['shock',125,4]]],
  ['charge','Shield Charge',8,'Rush forward behind your shield, hitting and stunning whatever is in the way.',[['rush',3,1]]],
  ['bastion','Bastion',14,'For 3 seconds every hit is blocked and thrown back as a shockwave.',[['buff','guardT',3],['shield'],['ring',60]]],
  ['throw','Hammer Throw',7,'Hurl a hammer that passes through everything, hits hard and stuns.',[['fan',1,0,560,4,8,'bolt',99,{stun:1}]]],
  ['rally','Rally',22,'Heal 5 health and raise your shield at once.',[['heal',5],['shield']]],
  ['cataclysm','Cataclysm',50,'Ultimate. Three shockwaves roll out of you, each wider than the last.',[['shock',130,4],['seq','quake']]],
  ['stoneskin','Stone Skin',18,'For 6 seconds every hit on you does half damage.',[['buff','stoneT',6],['ring',60]]],
  ['tremor','Tremor',10,'Send a tremor toward your target: three bursts in a line, each hitting hard.',[['line',3,90,70,5]]],
  ['banner','War Banner',25,'Plant a banner for 8 seconds. It mends you while you stand near it and burns monsters near it.',[['field','halo','self',130,8,.5,1,false]]],
  ['leapslam','Leap Slam',12,'Leap onto your target and slam the ground around it.',[['tele'],['shock',130,5]],'t']],
 assassin:[
  ['shadowstep','Shadowstep',5,'Appear behind the nearest monster and stab it for heavy damage.',[['tele'],['hit',5,{}]],'t'],
  ['knives','Fan of Knives',6,'Throw five knives in a fan.',[['fan',5,.15,620,2,3,'arrow',0]]],
  ['smoke','Smoke Bomb',12,'Vanish for 2 seconds. Nothing can hurt you, nearby bolts are snuffed out, and your next strike is an ambush.',[['buff','inv',2],['buff','amb',3],['clear',130],['ring',130]]],
  ['venom','Venom',14,'Stab the nearest monster in reach with a poisoned blade. It keeps taking damage for 6 seconds.',[['hit',3,{dot:.6}]],'near'],
  ['mark','Death Mark',20,'Mark the nearest monster. For 6 seconds it takes 50% more damage from everything.',[['hit',0,{mark:6}]],'t'],
  ['cuts','Thousand Cuts',45,'Ultimate. Flicker around your target and cut it eight times. Nothing can touch you until you are done.',[['seq','cuts']],'t'],
  ['quicksilver','Quicksilver',16,'Move 40% faster for 5 seconds.',[['buff','fleetT',5],['ring',50]]],
  ['caltrops','Caltrops',12,'Scatter caltrops around you for 5 seconds. Monsters on them are slowed and hurt.',[['field','rain','self',105,5,.5,.6,true]]],
  ['garrote','Garrote',10,'Choke the nearest monster in reach. It takes heavy damage and cannot act for a moment.',[['hit',4,{stun:1.2}]],'near'],
  ['flurry','Blade Flurry',18,'Throw twelve heavy knives in a ring. Each passes through one monster.',[['ringp',12,620,3,3,'arrow',1]]]],
 mage:[
  ['nova','Nova',7,'A ring of bolts bursts out of you and erases enemy bolts nearby.',[['ringp',14,380,2,5,'bolt','pw3'],['clear',140],['ring',140]]],
  ['chain','Chain Lightning',6,'Lightning jumps to the three nearest monsters at any range.',[['chain']],'t'],
  ['frost','Frost Field',10,'Freeze the ground under your target for 4 seconds. Monsters on it are slowed and take damage.',[['field','frost','at',110,4,.5,1,true]]],
  ['meteor','Meteor',12,'Call a meteor down on your target. It lands after a moment and hits very hard.',[['blast','at',95,.8,10]]],
  ['warp','Time Warp',20,'Every enemy bolt vanishes and every monster moves at half speed for 5 seconds.',[['clear',9999],['near',9999,{slow:5}],['ring',300]]],
  ['starfall','Starfall',50,'Ultimate. Seven meteors fall on your target, one after another.',[['seq','star']]],
  ['barrier','Arcane Barrier',18,'For 5 seconds every hit on you does half damage, and nearby bolts are erased.',[['buff','stoneT',5],['clear',160],['ring',160]]],
  ['barrage','Arcane Barrage',9,'Five heavy bolts in a tight fan.',[['fan',5,.08,460,3,5,'bolt','pw3']]],
  ['repulse','Repulse',10,'Throw every monster near you back, stun it for a moment and erase nearby bolts.',[['knock',220],['near',300,{stun:.8}],['clear',220],['ring',220]]],
  ['combust','Combust',14,'Set your target alight at any range. It burns for 6 seconds.',[['hit',2,{dot:1}]],'t']],
 ranger:[
  ['volley','Volley',4.5,'Loose a fan of seven arrows at once.',[['fan',7,.13,720,1,3,'arrow','barb']]],
  ['tumble','Tumble',6,'Roll away from your target, untouchable, and loose three arrows as you go.',[['back'],['fan',3,.12,720,1.5,3,'arrow','barb']]],
  ['pin','Pinning Shot',9,'One heavy arrow that passes through everything, hits hard and slows what it hits for 3 seconds.',[['fan',1,0,820,4,5,'arrow',99,{slow:3}]]],
  ['rain','Arrow Rain',12,'Arrows fall on your target for 3 seconds.',[['field','rain','at',95,3,.3,1,false]]],
  ['boom','Blast Arrow',10,'An arrow that explodes on the first thing it hits and hurts everything near it.',[['fan',1,0,700,2,5,'arrow',0,{boom:4}]]],
  ['storm','Arrowstorm',45,'Ultimate. For 2.5 seconds you loose a stream of arrows at the nearest monster while you keep moving.',[['buff','fireT',2.5]]],
  ['pack','Call the Pack',30,'Two wolves fight beside you for 10 seconds.',[['summon','wolf',2,10]]],
  ['huntmark',"Hunter's Mark",20,'Mark the nearest monster. For 6 seconds it takes 50% more damage from everything.',[['hit',0,{mark:6}]],'t'],
  ['snare','Snare',12,'Throw a snare under your target. It snaps shut a moment later, hurting and stunning what it catches.',[['blast','at',80,.4,3,{stun:1.5}]]],
  ['fleet','Fleet Foot',16,'Move 40% faster for 6 seconds.',[['buff','fleetT',6],['ring',50]]]],
 healer:[
  ['lance','Sun Lance',7,'A spear of light that passes through everything and hits hard.',[['fan',1,0,560,5,9,'orb',99]]],
  ['mend','Mend',10,'Heal 5 health at once and throw a shockwave at everything near you.',[['heal',5],['shock',100,2]]],
  ['flash','Blinding Light',12,'Stun every monster near you and burn away nearby bolts.',[['near',220,{stun:1.2}],['clear',220],['ring',220]]],
  ['halo','Hallowed Ground',15,'Bless the ground around you for 5 seconds. It mends you and burns monsters that stand on it.',[['field','halo','self',120,5,.5,1,false]]],
  ['renew','Renewal',24,'Mend 1 health every second for 8 seconds.',[['buff','renewT',8]]],
  ['wrath','Wrath of the Sun',55,'Ultimate. Heal to full and scorch everything in a huge ring around you.',[['heal','full'],['shock',260,10]]],
  ['aegis','Aegis',20,'Nothing can hurt you for 2.5 seconds.',[['buff','inv',2.5],['ring',50]]],
  ['radiance','Radiance',9,'Ten orbs of light burst out of you in a ring.',[['ringp',10,420,2,5,'orb',0]]],
  ['judgement','Judgement',14,'A pillar of light falls on your target after a moment and hits very hard.',[['blast','at',90,.7,9]]],
  ['purify','Purify',12,'Erase every enemy bolt in the room and heal 2 health.',[['clear',9999],['heal',2],['ring',300]]]],
 necro:[
  ['army','Army of Bones',9,'Four extra thralls claw out of the ground at once and fight for 9 seconds.',[['army']]],
  ['drain','Soul Drain',8,'Tear life out of the nearest monster at any range. It is hurt and you heal 2 health.',[['beam'],['heal',2],['hit',3,{}]],'t'],
  ['grasp','Grave Grasp',9,'Dead hands seize your target. It takes heavy damage and cannot act for a moment.',[['hit',3,{stun:1.2}],['ringT',30]],'t'],
  ['burst','Bone Burst',10,'Your thralls explode and hurt everything near them. New ones rise in time.',[['burst']],'thrall'],
  ['plague','Plague',16,'Every monster near you sickens and keeps taking damage for 6 seconds.',[['near',260,{dot:.6}],['ring',260]]],
  ['legion','The Legion Rises',60,'Ultimate. Six thralls rise for 6 seconds, and every thrall hits 50% harder while they last.',[['buff','legT',6],['summon','thrall',6,6]]],
  ['spears','Bone Volley',7,'Five bone spears in a fan. Each passes through everything.',[['fan',5,.14,420,2,5,'skull',99]]],
  ['shroud','Death Shroud',20,'For 6 seconds every hit on you does half damage.',[['buff','stoneT',6],['ring',60]]],
  ['pit','Grave Pit',12,'Open a pit under your target for 4 seconds. Monsters in it are slowed and hurt.',[['field','frost','at',100,4,.5,1,true]]],
  ['pact','Dark Pact',25,'Unmake your thralls. Each one heals you 2 health, up to 8.',[['pact']],'thrall']],
};
const SKLV=[9,9,10,11,15,20,25,30,36,42]; // the level at which each skill is learned
const skText=d=>d[3]+' Cooldown: '+d[2]+' seconds.';
for(const k in SKILLS){const c=CLASSES[k];c.skills=SKILLS[k].map((d,i)=>({id:d[0],name:d[1],cd:d[2],text:skText(d),level:SKLV[i]}));c.pows[1]=[SKILLS[k][3][1],'A new skill. '+skText(SKILLS[k][3])]}
const SK=[0,1,2,3].map(i=>({id:'',name:'',key:''+(i+1),cd:0,max:0,ready:false,unlocked:false,index:-1}));
const known=(lv=S.level)=>S.cls&&lv>=8?SKLV.filter(l=>lv+1>=l).length:0;
const okLoad=l=>Array.isArray(l)&&l.length===4&&l.every((v,i)=>Number.isInteger(v)&&v>=0&&v<10&&l.indexOf(v)===i);

const BOONS=[
 {id:'might',name:'Might',text:'+20% damage with everything you do.'},
 {id:'haste',name:'Haste',text:'Attack 10% faster.',cap:8},
 {id:'vigor',name:'Vigor',text:'+3 maximum health.'},
 {id:'focus',name:'Focus',text:'Your skill recharges 12% faster.',cap:5},
 {id:'fleet',name:'Fleet',text:'Move 6% faster.',cap:5},
 {id:'spec'},
];
const SPEC={
 crawler:{name:'Gravecrawler',r:24,hp:9,col:'#7c9a52',eyes:2,legs:8},
 hound:{name:'Bonehound',r:22,hp:12,col:'#c9c1a8',eyes:2,spikes:6},
 witch:{name:'Tallow Witch',r:20,hp:13,col:'#8566b8',eyes:2,hood:1},
 fist:{name:'Gravel Fist',r:32,hp:18,col:'#8f8474',eyes:1,spikes:4},
 mother:{name:'Brood Mother',r:34,hp:15,col:'#b3557a',eyes:5,pust:1},
 burrower:{name:'The Burrower',r:26,hp:15,col:'#c0823c',eyes:0,teeth:1},
 mimic:{name:'The Mimic',r:22,hp:12,col:'#3fa596',eyes:3,mask:1},
 hollow:{name:'The Hollow',r:38,hp:40,col:'#4a3a66',eyes:2,void:1,spikes:9},
 knight:{name:'Carrion Knight',ai:'hound',r:26,hp:32,col:'#7d8a99',eyes:2,spikes:8},
 lich:{name:'Bog Lich',ai:'witch',r:22,hp:28,col:'#5f9a6a',eyes:3,hood:1},
 wyrm:{name:'Stone Wyrm',ai:'burrower',r:30,hp:30,col:'#9a8f86',eyes:0,teeth:1,spikes:6},
 king:{name:'The Flayed King',ai:'hollow',crown:1,r:40,hp:70,col:'#8c2f39',eyes:3,void:1,spikes:11},
 mite:{name:'Mite',r:10,hp:2,col:'#d07f98',eyes:1,legs:4},
};
// levels 13 and up are generated: a scaled monster from the pool, a tyrant every tenth level
const AREAS=[['The Ash Road',28],['The Drowned Fen',165],['The Bone Peaks',215],['The Black Court',285],['The Endless Dark',340]];
const PRE=['Ashen','Dread','Rotting','Gilded','Howling','Pale','Iron','Blighted','Starved','Elder'];
const POOL=['crawler','hound','witch','fist','mother','burrower'];
const TINT=['#7c9a52','#c9c1a8','#8566b8','#8f8474','#b3557a','#c0823c','#3fa596','#5f8fc9','#c9585a','#9aa34a'];
function levelDef(n){
  if(n<LEVELS.length){const L=LEVELS[n];return{title:L.title,hint:L.hint,kind:L.boss,spec:SPEC[L.boss],hue:100}}
  const N=n+1,area=AREAS[N<=20?0:Math.min(4,Math.floor((N-11)/10))],tyrant=N%10===0,kind=tyrant?'hollow':POOL[(n*5+3)%POOL.length],base=SPEC[kind],mult=1.6+(n-12)*.14;
  const spec={...base,ai:kind,crown:tyrant?1:0,name:tyrant?'Tyrant of '+area[0].replace('The ',''):PRE[n%10]+' '+base.name.replace('The ',''),hp:Math.round(base.hp*mult*(tyrant?1.3:1)),col:tyrant?'#8c2f39':TINT[(n*3)%10],r:base.r+(tyrant?6:2)};
  return{title:area[0],hint:tyrant?'A tyrant holds this ground.':N===50?'':'Stronger than the last. So are you.',kind,spec,hue:area[1]};
}

/* ---------- equipment: three slots, four rarities, dropped by every boss from level 9 on ---------- */
const SLOTS=['weapon','armor','trinket'];
const RAR=[['common','#b9b2c6',1,.15],['rare','#6ea3e0',1.5,.2],['epic','#b88cff',2.1,.3],['legendary','#d6a544',2.8,.4]]; // name, colour, stat multiplier, upgrade step it gives when melted down
const QUAL=['Plain','Fine','Runed','Ancient'];
const GEAR={fighter:['Greatsword','Harness','Headband'],tank:['Sword','Plate','Iron Band'],assassin:['Daggers','Shadow Wrap','Mask'],mage:['Staff','Robe','Hat'],ranger:['Bow','Hood','Quiver'],healer:['Sun Staff','White Robe','Circlet'],necro:['Skull Staff','Grave Robe','Bone Charm']};
const STAT={dmg:['damage',6,'%'],spd:['attack speed',4,'%'],hp:['max health',2,''],guard:['chance to shrug off a hit',3,'%'],cdr:['faster skill recharge',5,'%'],mv:['move speed',3,'%'],sh:['faster shield recharge',8,'%'],mend:['faster mending',8,'%'],thr:['thrall damage',10,'%']};
const slotStats=(c,slot)=>slot==='weapon'?['dmg','spd']:slot==='armor'?['hp','guard']:['cdr',c==='tank'?'sh':c==='healer'?'mend':c==='necro'?'thr':'mv'];
// an item is fully described by class, slot, rarity r (0-3), upgrade count lvl and upgrade total up; common items carry one stat line, the rest two
function item(c,slot,r,lvl=0,up=0){return{slot,name:QUAL[r]+' '+GEAR[c][SLOTS.indexOf(slot)],rarity:RAR[r][0],r,lvl,up,keys:slotStats(c,slot).slice(0,r?2:1)}}
const statV=(it,k)=>{const v=STAT[k][1]*RAR[it.r][2]*(1+it.up);return k==='hp'?Math.round(v):Math.round(v*10)/10};
const itemLine=it=>it.keys.map(k=>'+'+statV(it,k)+STAT[k][2]+' '+STAT[k][0]).join(', ');
const itemName=it=>it.name+(it.lvl?' +'+it.lvl:'');
const basicSet=c=>({weapon:item(c,'weapon',0),armor:item(c,'armor',0),trinket:item(c,'trinket',0)});
let EQ={};
function eqSync(){EQ={};if(S.eq)for(const sl of SLOTS){const it=S.eq[sl];if(it)for(const k of it.keys)EQ[k]=(EQ[k]||0)+statV(it,k)}}
const eqv=k=>S.level>=8&&S.cls&&EQ[k]||0;
function dropItem(n){
  const N=n+1,big=N===12||N%10===0,pL=Math.min(.25,.01+(N-9)*.004)*(big?4:1),pE=Math.min(.35,.05+(N-9)*.008)*(big?2:1),x=rand();
  return item(S.cls,SLOTS[Math.floor(rand()*3)],x<pL?3:x<pL+pE?2:big||x<pL+pE+.3?1:0);
}
const noBoons=()=>({might:0,haste:0,vigor:0,focus:0,fleet:0,spec:0});
const S={mode:'title',level:0,t:0,shake:0,stop:0,banner:0,clearT:0,cls:null,adv:null,b:noBoons(),elite:4,L:null,paused:false,rank:'',eq:null,scrap:0,load:[0,1,2,3]};
let P,mons=[],shots=[],pshots=[],allies=[],zones=[],fields=[],bits=[],rings=[],floats=[],morsels=[],boss=null;
const act2=()=>S.level>=8,cls=()=>act2()?S.cls:null,pw=n=>!!S.cls&&S.level-8>=n;
const ADV={berserker:{d:1.5,c:1.6},sharpshooter:{d:1.75},reaper:{d:2},archmage:{k:.5},champion:{d:1.5,hp:6},duelist:{c:1.5,s:1.15},nightblade:{d:1.6},phantom:{k:.4,s:1.1},inquisitor:{d:1.6}};
const adv=k=>(ADV[S.adv]||{})[k];
const dmgMul=()=>(P&&P.rageT>0?1.4:1)*(1+eqv('dmg')/100+(S.level>=8?S.scrap*.01:0))*(1+.2*S.b.might)*(adv('d')||1)*(S.cls==='fighter'&&pw(3)?1.25:1)*(S.cls==='healer'&&pw(3)?1.6:1);
const cdMul=()=>1/((P&&P.rageT>0?1.25:1)*(1+eqv('spd')/100)*(1+.1*S.b.haste)*(adv('c')||1)*(S.cls==='fighter'?(1+.08*S.b.spec)*(pw(3)?1.15:1):1));
const skMul=i=>Math.pow(.88,S.b.focus)*(1-Math.min(.5,eqv('cdr')/100))*(S.adv==='phantom'?(i?1:.4):adv('k')||1); // Phantom only speeds up Shadowstep
const aiK=m=>mspd()*(m.rage?(S.level<3?1.12:m.ai==='hollow'?1.15:1.3):1);
const melee=c=>!c||c==='tank'||c==='fighter'||c==='assassin';
const mspd=()=>S.level<8?1:Math.min(1.7,1.25+Math.max(0,S.level-12)*.01);
const tier=()=>S.level<12?0:Math.floor((S.level-12)/15);
// rank climbs with the levels once you have a trade: E at level 9, S by level 50, then S+1, S+2... every ten levels
const RANKS=[[50,'S'],[41,'A'],[32,'B'],[23,'C'],[15,'D'],[9,'E']];
function rank(n=S.level){if(!S.cls||n<8)return'';const N=n+1;if(N>=60)return'S+'+Math.floor((N-50)/10);for(const[a,r]of RANKS)if(N>=a)return r;return''}
const fmt=d=>d%1?d.toFixed(1):''+d;
const has=id=>PARTS.findIndex(p=>p.id===id)<S.level;

/* ---------- colour: the world is grey until you have eyes ---------- */
const cache=new Map();
function rgb(h){const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]}
function col(h,shade=0){
  const sight=has('sight'),k=h+shade+sight;let v=cache.get(k);if(v)return v;
  let[r,g,b]=rgb(h);const f=1+shade;r*=f;g*=f;b*=f;
  if(!sight){const l=.3*r+.59*g+.11*b;r=g=b=l*.9}
  v=`rgb(${Math.min(255,r|0)},${Math.min(255,g|0)},${Math.min(255,b|0)})`;cache.set(k,v);return v;
}
const floors={};
function floor(){
  const n=S.level,key=n<8?(has('sight')?'crypt':'grey'):'h'+levelDef(n).hue;
  return floors[key]||(floors[key]=buildFloor(key));
}
function buildFloor(key){
  const grey=key==='grey',crypt=key==='crypt',hue=crypt?200:+key.slice(1)||0,sat=grey?4:18;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  let seed=11;const rnd=()=>(seed=seed*16807%2147483647)/2147483647;
  g.fillStyle=grey?'#0b0a0f':`hsl(${hue},20%,6%)`;g.fillRect(0,0,W,H);
  const T=48;
  for(let y=0;y<H;y+=T)for(let x=(y/T%2?-T/2:0);x<W;x+=T){
    const v=rnd(),L=grey?10+v*6:13+v*8;
    g.fillStyle=`hsl(${hue+v*20},${sat+v*10}%,${L}%)`;g.fillRect(x+1,y+1,T-2,T-2);
    g.fillStyle='rgba(255,255,255,.055)';g.fillRect(x+1,y+1,T-2,1.5);g.fillRect(x+1,y+1,1.5,T-2);
    g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+1,y+T-3,T-2,2);g.fillRect(x+T-3,y+1,2,T-2);
    if(rnd()<.1){g.fillStyle=grey?'rgba(255,255,255,.035)':`hsla(${hue-90},35%,40%,.22)`;g.beginPath();g.arc(x+rnd()*T,y+rnd()*T,6+rnd()*11,0,TAU);g.fill()}
    if(rnd()<.12){g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=1.5;g.beginPath();const cx=x+rnd()*T,cy=y+rnd()*T;g.moveTo(cx,cy);g.lineTo(cx+rnd()*20-10,cy+rnd()*20-10);g.lineTo(cx+rnd()*30-15,cy+rnd()*30-15);g.stroke()}
  }
  // old bones and rubble
  const bone=grey?'rgba(231,223,205,.13)':'rgba(231,223,205,.3)';g.strokeStyle=g.fillStyle=bone;g.lineCap='round';
  for(let i=0;i<16;i++){const x=WALL+20+rnd()*(W-2*WALL-40),y=WALL+20+rnd()*(H-2*WALL-40),a=rnd()*TAU,k=rnd();
    if(k<.5){const dx=Math.cos(a)*9,dy=Math.sin(a)*9;g.lineWidth=2.4;g.beginPath();g.moveTo(x-dx,y-dy);g.lineTo(x+dx,y+dy);g.stroke();for(const s of[-1,1]){g.beginPath();g.arc(x+s*dx,y+s*dy,2.4,0,TAU);g.fill()}}
    else if(k<.7){g.beginPath();g.arc(x,y,6,0,TAU);g.fill();g.fillStyle='rgba(0,0,0,.6)';g.beginPath();g.arc(x-2.2,y-.5,1.6,0,TAU);g.arc(x+2.2,y-.5,1.6,0,TAU);g.fill();g.fillStyle=bone}
    else for(let j=0;j<4;j++){g.beginPath();g.arc(x+rnd()*16-8,y+rnd()*16-8,1.5+rnd()*2.5,0,TAU);g.fill()}}
  // walls: courses of brick with a lit top edge
  const wl=grey?13:16;
  for(const[wx,wy,ww,wh]of[[0,0,W,WALL],[0,H-WALL,W,WALL],[0,WALL,WALL,H-2*WALL],[W-WALL,WALL,WALL,H-2*WALL]]){
    g.fillStyle=grey?'#17161c':`hsl(${hue+160},12%,9%)`;g.fillRect(wx,wy,ww,wh);
    for(let y=wy,r=0;y<wy+wh;y+=14,r++)for(let x=wx-(r%2?16:0);x<wx+ww;x+=32){const v=rnd();
      g.fillStyle=grey?`hsl(260,4%,${wl+v*6}%)`:`hsl(${hue+160+v*14},${14+v*8}%,${wl+v*8}%)`;
      const bx=Math.max(wx,x+1),by=y+1,bw=Math.min(wx+ww,x+31)-bx,bh=Math.min(wy+wh,y+13)-by;if(bw>0&&bh>0){g.fillRect(bx,by,bw,bh);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(bx,by,bw,1.5)}}}
  g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=3;g.strokeRect(WALL,WALL,W-2*WALL,H-2*WALL);
  for(let i=0;i<14;i++){g.strokeStyle=`rgba(0,0,0,${.22*(1-i/14)})`;g.lineWidth=1;g.strokeRect(WALL+2+i,WALL+2+i,W-2*WALL-4-2*i,H-2*WALL-4-2*i)}
  const vg=g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.6)');g.fillStyle=vg;g.fillRect(0,0,W,H);
  return c;
}

/* ---------- sound: muffled through bone until you have ears ---------- */
let AC,master,lp,muted=false,bed=null,nbuf;
const live=()=>AC&&!muted&&!document.hidden;
function audio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.45;lp=AC.createBiquadFilter();lp.type='lowpass';master.connect(lp);lp.connect(AC.destination);tune();startBed()}catch(e){AC=null}}
// one oscillator voice: f -> f2 over d seconds, starting `at` seconds from now
function sfx(f,d=.1,type='square',v=.3,f2,at=0){
  if(!live())return;try{
  if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+at;o.type=type;
  o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.02)}catch(e){}
}
// without ears everything is muffled, but still loud enough for a phone speaker
function tune(){if(!AC)return;const h=has('hearing'),t=AC.currentTime;lp.frequency.setTargetAtTime(h?18000:700,t,.05);master.gain.setTargetAtTime(h?.45:.7,t,.05)}
// noise burst; with f it is band-passed and swept f -> f2 (whooshes, clangs, rattles)
function noise(d=.12,v=.3,f,f2,at=0){
  if(!live())return;try{
  if(!nbuf){nbuf=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate);const ch=nbuf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1}
  const n=AC.createBufferSource(),g=AC.createGain(),t=AC.currentTime+at;n.buffer=nbuf;n.loop=true;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  if(f){const q=AC.createBiquadFilter();q.type='bandpass';q.Q.value=1.4;q.frequency.setValueAtTime(f,t);if(f2)q.frequency.exponentialRampToValueAtTime(f2,t+d);n.connect(q);q.connect(g)}else n.connect(g);
  g.connect(master);n.start(t,Math.random()*.3);n.stop(t+d+.02)}catch(e){}
}
// soft-attack voice for the ambient bed
function voice(f,d,v,type,dest,at=0){try{const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+at;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.12,d*.2));g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.05)}catch(e){}}
// ambient bed: a low detuned drone under a slow filter sweep, sparse minor-key notes with an echo, and a heartbeat when you are close to death
const SCALE=[110,130.81,146.83,164.81,196,220,261.63,293.66,329.63];
function startBed(){
  const g=AC.createGain();g.gain.value=0;g.connect(master);
  const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=230;f.Q.value=1.5;f.connect(g);
  for(const[hz,ty,v]of[[55,'sawtooth',.4],[55.35,'sawtooth',.4],[82.41,'triangle',.3],[27.5,'sine',.5]]){const o=AC.createOscillator(),og=AC.createGain();o.type=ty;o.frequency.value=hz;og.gain.value=v;o.connect(og);og.connect(f);o.start()}
  const l=AC.createOscillator(),lg=AC.createGain();l.frequency.value=.06;lg.gain.value=80;l.connect(lg);lg.connect(f.frequency);l.start();
  const ng=AC.createGain(),dl=AC.createDelay(1),fb=AC.createGain();dl.delayTime.value=.47;fb.gain.value=.36;ng.connect(g);ng.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(g);
  bed={g,ng,next:AC.currentTime+3,hb:0,i:4};setInterval(bedTick,300);bedLevel();
}
function bedLevel(){if(bed)try{bed.g.gain.setTargetAtTime(muted?0:.11,AC.currentTime,.4)}catch(e){}}
function bedTick(){
  if(!bed||!live()||AC.state!=='running')return;const t=AC.currentTime,play=S.mode==='play'&&!S.paused;
  if(t>=bed.next){bed.i=Math.max(0,Math.min(SCALE.length-1,bed.i+Math.floor(Math.random()*5)-2));const f=SCALE[bed.i]*(S.mode==='dead'?.5:1);
    voice(f,2.6,.5,'triangle',bed.ng);if(Math.random()<.3)voice(f*1.5,2.2,.22,'sine',bed.ng,.24);bed.next=t+(play?1.5+Math.random()*1.7:2.6+Math.random()*2.6)}
  if(play&&P&&has('organs')&&P.hp<=Math.max(2,P.maxHp*.3)&&t>=bed.hb){voice(58,.16,1.6,'sine',bed.g);voice(50,.2,1.2,'sine',bed.g,.17);bed.hb=t+.72}
}
let hapOn=true,hapT=0;
// short ticks are rate-limited to one per 60 ms; patterns and heavy hits always go through
function haptic(p){if(!hapOn)return;const now=performance.now(),big=Array.isArray(p)||p>=40;if(!big&&now-hapT<60)return;hapT=now;try{if(window.Android&&Android.vibrate)Android.vibrate(String(p));else if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}
const pref=(k,v)=>{try{localStorage.setItem('marrowborn.'+k,v)}catch(e){}};
const chime=()=>[330,415,494,660].forEach((f,i)=>sfx(f,.35,'triangle',.25,0,i*.11));
let hitT=0;
const SND={
  swing(c){
    if(c==='fighter'){noise(.15,.3,900,220);sfx(170,.12,'sawtooth',.13,80)}
    else if(c==='tank'){noise(.13,.28,700,200);sfx(240,.09,'triangle',.2,110)}
    else if(c==='assassin'){noise(.06,.24,3200,1400);sfx(620,.05,'triangle',.1,300)}
    else{noise(.09,.22,1300,420);sfx(320,.08,'triangle',.15,120)}},
  bolt(){sfx(880,.14,'sine',.16,420);sfx(1760,.06,'triangle',.06,1320)},
  arrow(){sfx(1300,.05,'triangle',.12,500);noise(.05,.12,4200,2600)},
  skull(){sfx(260,.18,'sawtooth',.12,90);sfx(130,.2,'sine',.14,65)},
  orb(){sfx(1040,.16,'sine',.15,1560);sfx(1560,.2,'sine',.05,2080,.04)},
  roar(){sfx(110,.7,'sawtooth',.3,55);sfx(164,.6,'square',.12,70);noise(.6,.3,500,150)},
  ward(){const n=performance.now();if(n-hitT<120)return;hitT=n;sfx(1200,.07,'square',.08,900)},
  hit(quiet){const n=performance.now();if(n-hitT<45)return;hitT=n;const k=.88+Math.random()*.26;sfx(150*k,.09,'square',quiet?.12:.27,70);noise(.06,quiet?.08:.2,1900,500)},
  hurt(){sfx(200,.25,'sawtooth',.33,50);sfx(92,.3,'sine',.4,45);noise(.18,.33,800,200)},
  block(){sfx(950,.2,'square',.2,640);sfx(1432,.26,'square',.12,1180);noise(.08,.3,4200,2400)},
  dash(){noise(.14,.2,500,2600);sfx(500,.12,'sine',.12,900)},
  blink(){sfx(1400,.12,'sine',.16,500);sfx(500,.14,'sine',.12,1900,.09);noise(.1,.1,5000,2000)},
  skill(c,i){
    if(SKILLS[c][i][2]>=40){sfx(82,1,'sawtooth',.2,164);sfx(123,1,'triangle',.2,246,.05);noise(.9,.25,200,3000);[392,523.25,783.99].forEach((f,k)=>sfx(f,.5,'triangle',.12,0,.2+k*.12));return}
    if(i>1){i=i%2?1:2;const f={fighter:150,tank:110,assassin:700,mage:500,ranger:900,healer:660,necro:180}[c];
      if(i===1){noise(.2,.26,f*3,f*8);sfx(f*1.5,.22,'sawtooth',.15,f*.6);sfx(f*3,.1,'triangle',.1,f*4.5,.04)}
      else{sfx(f,.6,'triangle',.2,f*1.5);sfx(f*2,.5,'sine',.1,f*3,.08);noise(.5,.12,f*2,f*10)}return}
    if(c==='fighter'){noise(.4,.3,400,1800);sfx(140,.35,'sawtooth',.16,260)}
    else if(c==='assassin'){noise(.12,.25,2600,600);sfx(1200,.16,'sawtooth',.16,110);sfx(90,.16,'sine',.3,50,.1)}
    else if(c==='healer'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>sfx(f,.5,'sine',.17,0,i*.07))}
    else if(c==='tank'){sfx(60,.5,'sine',.5,32);noise(.4,.4,300,80);sfx(110,.3,'square',.16,40)}
    else if(c==='mage'){sfx(300,.4,'sine',.24,1300);sfx(600,.4,'triangle',.08,2600);noise(.35,.14,1500,6000)}
    else if(c==='necro'){sfx(120,.5,'sawtooth',.22,240);for(let i=0;i<5;i++)noise(.03,.2,2400,1800,.08+i*.07)}
    else for(let i=0;i<3;i++){sfx(1250-i*120,.06,'triangle',.14,480,i*.045);noise(.05,.1,4200,2600,i*.045)}},
  fizzle(){sfx(220,.08,'triangle',.12,160)},
  pickup(){sfx(600,.1,'sine',.2,900);sfx(900,.16,'sine',.18,1350,.08)},
  levelStart(){sfx(196,.7,'triangle',.2,98);sfx(146.83,.9,'sine',.16,73,.05);sfx(392,.5,'sine',.05,388,.02)},
  bossDeath(){sfx(90,.7,'sawtooth',.36,30);noise(.6,.4,1200,90);[392,311,233,155].forEach((f,i)=>sfx(f,.4,'triangle',.14,f*.97,.15+i*.12))},
  rankUp(){[392,523.25,659.25,783.99,1046.5].forEach((f,i)=>{sfx(f,.3+i*.06,'triangle',.22,0,.5+i*.1);sfx(f*2,.2,'sine',.05,0,.5+i*.1)})},
  dead(){sfx(120,.9,'sawtooth',.36,30);[220,207.65,164.81,110].forEach((f,i)=>sfx(f,.6,'triangle',.14,0,.2+i*.22))},
  pause(on){sfx(on?520:390,.08,'triangle',.14,on?390:520)},
};

/* ---------- helpers ---------- */
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
function clamp(e,r){const x=Math.max(WALL+r,Math.min(W-WALL-r,e.x)),y=Math.max(WALL+r,Math.min(H-WALL-r,e.y));const hit=x!==e.x||y!==e.y;e.x=x;e.y=y;return hit}
function move(m,a,spd,dt){m.x+=Math.cos(a)*spd*dt;m.y+=Math.sin(a)*spd*dt;m.moving=true;return clamp(m,m.r)}
function shoot(x,y,a,spd,r=6){shots.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r})}
function ringShot(m,n,spd,off=0){for(let i=0;i<n;i++)shoot(m.x,m.y,off+i*TAU/n,spd)}
function zone(x,y,r,dur,m){dur/=m?aiK(m):mspd();const z={x,y,r,t:0,dur};clamp(z,10);zones.push(z)}
function puff(e,c,n=10,spd=160){for(let i=0;i<n;i++){const a=rand()*TAU,s=spd*(.3+rand());bits.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5,max:.5,c,r:2+rand()*3})}}
function spawn(kind,x,y,isBoss,spec){const s=spec||SPEC[kind];let hp=s.hp;if(kind==='mite'&&S.level>=12)hp=Math.round(2*(1+(S.level-12)*.1));if(isBoss&&window.__mb&&window.__mb.hpK)hp=Math.round(hp*window.__mb.hpK);const m={kind,s,ai:s.ai||kind,x,y,r:s.r,hp,maxHp:hp,boss:!!isBoss,st:'idle',t:1,n:0,flash:0,ring:0,ang:rand()*TAU,side:1,hits:0,seed:rand()*9,hidden:false,lift:0};clamp(m,m.r);mons.push(m);return m}
function reshuffle(){
  mons=mons.filter(m=>!m.decoy);
  const spot=()=>{let p;do{p={x:WALL+60+rand()*(W-2*WALL-120),y:WALL+60+rand()*(H-2*WALL-120)}}while(dist(p,P)<210);return p};
  Object.assign(boss,spot());puff(boss,col('#3fa596'));
  for(let i=0;i<(boss.rage?4:3);i++){const p=spot(),d=spawn('mimic',p.x,p.y);d.decoy=true;d.t=1+rand()*2;d.side=rand()<.5?-1:1;puff(d,col('#3fa596'))}
}

/* ---------- monsters ---------- */
function chargeStates(m,dt,a,next,E){
  if(m.st==='wind'){m.ang=a;if((m.t-=dt)<=0){m.st='charge';m.t=1;sfx(180,.3,'sawtooth',.25,70);noise(.3,.16,300,900)}}
  else if(m.st==='charge'){const hit=move(m,m.ang,540,dt);if(hit||(m.t-=dt)<=0){
    if(hit){S.shake=.25;sfx(70,.2,'square',.35,40);if(E)ringShot(m,8,150,rand()*TAU)}
    if(E&&!m.again&&S.level>=8){m.again=1;m.st='wind';m.t=.42} // enraged: a second charge straight away
    else{m.again=0;m.st='dazed';m.t=hit?(E?1:1.5):.6}}}
  else if((m.t-=dt)<=0){m.st='idle';m.t=next}
}
// every boss enrages below 40% health (m.rage): its clock runs faster and it gains a pattern. The Hollow, the King and the tyrants fight in three phases instead (m.phase).
const AI={
  crawler(m,dt,a,d){
    const E=m.rage;
    if(m.st==='idle'){move(m,a,80,dt);m.t-=dt;if(m.t<=0&&d<170){m.st='wind';m.t=.52;m.ang=a;m.again=0;if(S.level>=12)for(const k of[-.3,0,.3])shoot(m.x,m.y,a+k,190)}}
    else if(m.st==='wind'){if((m.t-=dt)<=0){m.st='lunge';m.t=.28}}
    else{move(m,m.ang,400,dt);if((m.t-=dt)<=0){if(E&&S.level>=3)ringShot(m,6,140,a);if(E&&!m.again){m.again=1;m.st='wind';m.t=.4;m.ang=a}else{m.st='idle';m.t=1.15}}}
  },
  hound(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){if(move(m,a+1.1*m.side,E?130:110,dt))m.side*=-1;if((m.t-=dt)<=0){m.st='wind';m.t=E?.5:.68}}
    else chargeStates(m,dt,a,E?.8:1.15,E);
  },
  witch(m,dt,a,d){
    const E=m.rage;if(m.slide>0)m.slide-=dt;
    const dir=m.slide>0?a+Math.PI/2*m.side:d<200?a+Math.PI:d>330?a:a+Math.PI/2*m.side;
    if(move(m,dir,d<200?(S.level<8?78:112):90,dt)){m.side*=-1;m.slide=.7} // the first witch is slow enough to run down half-blind
    if((m.t-=dt)<=0){m.n++;if(m.n%(E?2:3)===0)ringShot(m,E?12:10,150,a);else for(const k of E?[-.5,-.25,0,.25,.5]:[-.25,0,.25])shoot(m.x,m.y,a+k,200);
      if(E&&S.level>=3&&m.n%2)zone(P.x,P.y,70,1,m);m.t=1.25;sfx(520,.12,'sine',.2,260)}
  },
  fist(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){move(m,a,60,dt);if((m.t-=dt)<=0){m.n++;m.st='leap';m.t=m.dur=.95;m.sx=m.x;m.sy=m.y;m.tx=P.x;m.ty=P.y;zone(P.x,P.y,85,.95,m);
      if(E||m.n%3===0)for(let i=0;i<3;i++){const b=a+i*TAU/3;zone(P.x+Math.cos(b)*150,P.y+Math.sin(b)*150,70,1.3,m)}}}
    else{m.t-=dt;const p=Math.min(1,1-m.t/m.dur);m.x=m.sx+(m.tx-m.sx)*p;m.y=m.sy+(m.ty-m.sy)*p;m.lift=Math.sin(p*Math.PI);clamp(m,m.r);if(m.t<=0){m.lift=0;m.st='idle';m.t=E?1:1.35;if(E)ringShot(m,8,150,rand()*TAU)}}
  },
  mother(m,dt,a){
    const E=m.rage;m.ang+=dt*.5;if(move(m,m.ang,E?46:30,dt))m.ang+=Math.PI;
    if((m.t-=dt)<=0){m.n++;for(let i=0;i<(E?2:1);i++)if(mons.length<(E?9:7)){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*44,m.y+Math.sin(b)*44)}
      if(E)for(const k of[-.3,0,.3])shoot(m.x,m.y,a+k,160,8);else if(m.n%2===0)shoot(m.x,m.y,a,150,8);m.t=1.4}
  },
  mite(m,dt,a){move(m,a+Math.sin(S.t*3+m.seed)*.6,125,dt)},
  burrower(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){m.st='under';m.t=1.6;m.hidden=true}
    else if(m.st==='under'){move(m,a,E?195:165,dt);if((m.t-=dt)<=0){m.st='rise';m.t=.7;zone(m.x,m.y,75,.7,m)}}
    else if(m.st==='rise'){if((m.t-=dt)<=0){m.hidden=false;m.st='up';m.t=E?1.5:2;m.spit=.6;ringShot(m,8,170,rand()*TAU);if(E)m.vol=.3;puff(m,col('#c0823c'),14)}}
    else{if(m.vol>0&&(m.vol-=dt)<=0)ringShot(m,8,170,rand()*TAU);
      if((m.spit-=dt)<=0){m.spit=.8;shoot(m.x,m.y,a,190)} // it spits while it is up, so standing in front of it is not free
      if((m.t-=dt)<=0){m.st='under';m.hidden=true;m.t=1.2+rand()*.8}}
  },
  mimic(m,dt,a){
    const E=boss&&boss.rage;
    if(move(m,a+m.side*1.3,E?118:95,dt))m.side*=-1;
    if((m.t-=dt)<=0){if(E&&m.boss)for(const k of[-.25,0,.25])shoot(m.x,m.y,a+k,190);else shoot(m.x,m.y,a,190);m.t=1.6+rand()*1.2}
    if(m.boss&&has('smell')&&rand()<dt*14)bits.push({x:m.x+rand()*20-10,y:m.y-m.r,vx:rand()*20-10,vy:-30-rand()*20,life:.9,max:.9,c:'#a6e06b',r:3})
  },
  hollow(m,dt,a){
    const ph=m.phase||1,crown=m.s.crown,g=[1,.8,.65][ph-1];
    if(m.vol>0&&(m.vol-=dt)<=0){ringShot(m,12,160,a+.26*m.volN);if(--m.volN>0)m.vol=.32}
    if(m.spiral>0){m.spiral-=dt;if((m.spT-=dt)<=0){m.spT=.11;m.spA+=.33;for(let i=0,n=crown&&ph>=3?4:2;i<n;i++)shoot(m.x,m.y,m.spA+i*TAU/n,170)}}
    if(m.chase>0&&(m.chT-=dt)<=0){m.chT=.4;m.chase--;zone(P.x,P.y,62,.8,m)}
    if(m.st==='idle'){move(m,a,[62,84,100][ph-1],dt);if((m.t-=dt)<=0){const k=m.n++%(ph>1||crown?5:4);
      if(k===0){m.st='wind';m.t=ph>=3?.5:.7;m.again=0}
      else if(k===1){ringShot(m,12,160,a);m.volN=ph-1;if(m.volN)m.vol=.32;m.t=1.4*g}
      else if(k===2){zone(P.x,P.y,85,.9,m);for(let i=0;i<3;i++){const b=a+i*TAU/3;zone(P.x+Math.cos(b)*150,P.y+Math.sin(b)*150,70,1.25,m)}if(ph>=2){m.chase=crown?4:2;m.chT=.7}m.t=1.6*g}
      else if(k===3){for(let i=0;i<=ph;i++)if(mons.length<5+ph){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}m.t=1.2*g}
      else{m.spiral=1.5;m.spT=0;m.spA=a;m.t=1.9*g}}}
    else chargeStates(m,dt,a,.9*g,ph>=3);
  },
};
function enrage(m,txt){
  m.rage=true;m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);
  floats.push({x:m.x,y:m.y-m.r-18,txt:txt||'Enraged',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90]);
}
// the three-phase bosses shrug off blows for a moment, throw a ring and call mites when a phase breaks
function phaseShift(m){
  if(m.phase>=3)enrage(m);else{m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);floats.push({x:m.x,y:m.y-m.r-18,txt:'It changes',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90])}
  m.ward=1;m.st='idle';m.t=1;m.again=0;m.lift=0;ringShot(m,14,150,rand()*TAU);
  for(let i=0;i<2;i++)if(mons.length<8){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}
}
function hurtM(m,d,quiet){
  if(m.decoy){puff(m,col('#3fa596'),16);ringShot(m,6,150,rand()*TAU);sfx(700,.2,'sine',.25,200);reshuffle();return}
  if(m.ward>0){SND.ward();return}
  if(m.markT>0)d*=1.5;
  const before=m.hp;m.hp-=d;m.flash=.12;puff(m,col(m.s.col),5,120);SND.hit(quiet);if(!quiet)haptic(12);floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(d),life:.7,c:'#e7dfcd'});
  const ch=m.maxHp/5;if(m.ai==='hollow'&&Math.floor(m.hp/ch)<Math.floor(before/ch)&&m.hp>0)morsels.push({x:m.x,y:m.y});
  if(m.boss&&m.hp>0){if(m.ai==='hollow'){const ph=m.hp<=m.maxHp/3?3:m.hp<=m.maxHp*2/3?2:1;if(ph>(m.phase||1)){m.phase=ph;phaseShift(m)}}else if(!m.rage&&m.hp<=m.maxHp*.4)enrage(m)}
  if(m.kind==='mimic'&&m.boss&&m.hp>0&&++m.hits%3===0)reshuffle();
  if(m.hp<=0){
    mons=mons.filter(x=>x!==m);puff(m,col(m.s.col),m.boss?50:10,m.boss?320:160);
    if(m.boss){mons=[];shots=[];pshots=[];zones=[];fields=[];S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);S.stop=.12}
    else if(has('taste')&&rand()<.35)morsels.push({x:m.x,y:m.y});
  }
}
function hurtP(d,src){
  if(P.inv>0||S.mode!=='play')return;
  if(window.__mb&&window.__mb.hits)window.__mb.hits[src]=(window.__mb.hits[src]||0)+1;
  if(P.guardT>0){P.inv=.4;puff(P,'#d6a544',10);SND.block();haptic(30);shock(115,2);return}
  if(rand()*100<Math.min(40,eqv('guard'))){P.inv=.5;floats.push({x:P.x,y:P.y-44,txt:'Shrugged off',life:.8,c:'#d5dce2'});SND.ward();return}
  if(cls()==='tank'&&P.shield){P.shield=false;P.shT=0;P.inv=.6;puff(P,'#d5dce2',10);SND.block();haptic(30);if(S.adv==='paladin'&&P.hp<P.maxHp){P.hp=Math.min(P.maxHp,P.hp+2);hud()}if(pw(1))shock(115,2);return}
  if(P.stoneT>0)d=Math.ceil(d/2);
  P.hp-=d;P.inv=1;S.shake=.3;S.stop=.06;const saved=P.hp<=0&&S.adv==='saint'&&!P.saved;haptic(P.hp>0||saved?70:[120,60,320]);if(has('touch'))floats.push({x:P.x,y:P.y-44,txt:'-'+d,life:.8,c:'#ff5b6e'});puff(P,has('skin')?'#b8263d':'#e7dfcd',8);SND.hurt();hud();
  if(saved){P.saved=true;P.hp=Math.ceil(P.maxHp/2);P.inv=2;hud();shock(140,3);floats.push({x:P.x,y:P.y-52,txt:'Saved',life:1.3,c:'#d6a544'});SND.skill('healer')}
  if(P.hp<=0){S.mode='dead';SND.dead();
    show({kick:'You came apart',title:has('skin')?'Flesh fails':'A pile of bones again',body:'You keep everything you have won back so far. '+S.L.spec.name+' is still waiting.',btns:[['Try level '+(S.level+1)+' again',()=>startLevel(S.level)]]})}
}

/* ---------- player ---------- */
const keys={},want={atk:false,dash:false,skill:false,sk:[false,false,false,false],pt:null},joy={x:0,y:0};
function aim(pt,range){
  if(pt)return Math.atan2(pt.y-P.y,pt.x-P.x);
  let best=null,bd=range;for(const m of mons){if(m.hidden)continue;const d=dist(m,P)-m.r;if(d<bd&&(has('sight')||d<FOG)){bd=d;best=m}}
  return best?angTo(P,best):P.face;
}
function pshot(a,spd,dmg,r,kind,pierce){pshots.push({x:P.x+Math.cos(a)*16,y:P.y-4+Math.sin(a)*16,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r,dmg,kind,pierce:pierce===true?99:pierce||0,hit:new Set(),sx:P.x,sy:P.y})}
function shock(r,d){
  rings.push({x:P.x,y:P.y,life:.4,max:.4,r,fx:true});
  for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,P)<r+m.r)hurtM(m,d*dmgMul());
  shots=shots.filter(s=>dist(s,P)>r+10);S.shake=.3;noise(.25,.4);sfx(70,.3,'square',.35,35);haptic(50);
}
function ally(kind,life){const a=rand()*TAU;return{kind,x:P.x+Math.cos(a)*30,y:P.y+Math.sin(a)*30,r:kind==='wolf'?12:9,life:life||(kind==='wolf'||S.adv==='lich'?1e9:14),cd:0,walk:rand()*6}}
function leech(){if(cls()==='necro'&&pw(3)&&++P.lc%10===0&&P.hp<P.maxHp){P.hp++;hud();puff(P,'#7fd66b',6)}}
function strike(pt){
  const c=cls(),a=aim(pt,melee(c)?170:1200),D=dmgMul(),H=cdMul();P.swing=a;
  if(c==='mage'){P.atk=.14;P.cd=.45*H;const n=1+(pw(1)?2:0)+S.b.spec+(S.adv==='archmage'?2:0);
    for(let i=0;i<n;i++){const o=i-(n-1)/2,mid=Math.abs(o)<.6;pshot(a+o*.17,430,(mid?2:1)*D,mid?5:4,'bolt',pw(3))}SND.bolt();return}
  if(c==='ranger'){P.atk=.1;P.cd=(pw(1)?.17:.28)*H;pshot(a,720,D,3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow();return}
  if(c==='necro'){P.atk=.14;P.cd=.5*H;pshot(a,400,1.5*D,5,'skull',S.adv==='reaper');SND.skull();return}
  if(c==='healer'){P.atk=.14;P.cd=.4*H;pshot(a,460,1.5*D,5,'orb',S.adv==='inquisitor');SND.orb();return}
  const M={tank:[2,.42,78,1.35],fighter:[2,.32,pw(1)?90:74,pw(1)?3.2:1.3],assassin:[1.5,.2,60,1.1]}[c]||[1,has('organs')?.3:.4,66,1.15];
  let dmg=M[0]*D;if(c==='assassin'&&P.amb>0){dmg*=3+S.b.spec;P.amb=0}
  const twice=c==='assassin'&&pw(1);
  P.atk=.16;P.cd=M[1]*H;SND.swing(c);
  for(const m of[...mons]){
    if(m.hidden||!mons.includes(m))continue;const d=dist(m,P);
    if(d<M[2]+m.r){const da=Math.atan2(Math.sin(angTo(P,m)-a),Math.cos(angTo(P,m)-a));
      if(Math.abs(da)<M[3]||d<m.r+18){const decoy=m.decoy;if(!m.boss&&!decoy){m.x+=Math.cos(a)*26;m.y+=Math.sin(a)*26;clamp(m,m.r)}hurtM(m,dmg);if(twice&&mons.includes(m))hurtM(m,dmg);if(decoy)break}}
  }
}
function field(kind,x,y,r,dur,every,dmg,slow){const f={kind,x,y,r,t:0,dur,every,tick:0,dmg,slow};clamp(f,10);fields.push(f)}
function rush(a,dmg,stun){P.dashT=dmg?.24:.2;P.dx=Math.cos(a);P.dy=Math.sin(a);P.face=a;P.rushD=dmg;P.rushStun=stun;P.rushHit=dmg?new Set():null;P.inv=Math.max(P.inv,.4)}
const debuff=(m,o,D)=>{if(o.slow)m.slow=Math.max(m.slow||0,o.slow);if(o.stun)m.stun=m.boss?o.stun:o.stun*2;if(o.dot){m.dotT=6;m.dotD=o.dot*D;m.dotK=.5;puff(m,'#7fd66b',10,120)}if(o.mark){m.markT=o.mark;rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+40,fx:true});puff(m,'#b8263d',14,120)}};
const pierceOf=g=>g==='pw3'?pw(3):g==='barb'?(S.adv==='sharpshooter'?99:S.b.spec):g;
// one effect of a skill. x = {t: nearest monster or null, ta: angle to it, at: its position or a spot ahead, D: damage multiplier}
function cast(op,x){
  const[o,a,b,c,d,e,f,g,h]=op,{t,ta,at,D}=x,ring=(p,r)=>rings.push({x:p.x,y:p.y,life:.5,max:.5,r,fx:true});
  switch(o){
  case'shock':shock(a,b);break;                                   // radius, damage
  case'rush':rush(ta,a*D,b);break;                                // damage, stun: dash through the target
  case'back':rush(ta+Math.PI,0,0);break;                          // untouchable roll away from the target
  case'buff':P[a]=Math.max(P[a]||0,b);puff(P,'#d6a544',14,180);break; // timer name, seconds
  case'heal':P.hp=a==='full'?P.maxHp:Math.min(P.maxHp,P.hp+a);hud();puff(P,'#7fd66b',18,200);break;
  case'shield':if(S.adv!=='berserker'){P.shield=true;P.shT=0}break;
  case'fan':for(let k=0;k<a;k++){pshot(ta+(k-(a-1)/2)*b,c,d*D,e,f,pierceOf(g));if(h){const p=pshots[pshots.length-1];if(h.boom)p.boom=h.boom*D;if(h.slow)p.slow=h.slow;if(h.stun)p.stun=h.stun}}break; // count, spread, speed, damage, radius, kind, pierce, extras
  case'ringp':for(let k=0;k<a;k++)pshot(k*TAU/a,b,c*D,d,e,pierceOf(f));break; // count, speed, damage, radius, kind, pierce
  case'blast':meteor(a==='at'?at:P,b,c,d*D,e);break;              // where, radius, delay, damage, extras
  case'line':for(let k=1;k<=a;k++)meteor({x:P.x+Math.cos(ta)*k*b,y:P.y+Math.sin(ta)*k*b},c,.3+k*.15,d*D);break; // count, spacing, radius, damage
  case'field':field(a,b==='at'?at.x:P.x,b==='at'?at.y:P.y,c,d,e,f*D,g);break; // kind, where, radius, seconds, tick, damage per tick, slows
  case'hit':debuff(t,b,D);if(a){puff(t,'#dfe6ec',12,200);hurtM(t,a*D)}break; // damage, debuffs: the target
  case'near':for(const m of[...mons])if(!m.hidden&&dist(m,P)<a+m.r)debuff(m,b,D);break; // radius, debuffs: every monster around you
  case'summon':for(let k=0;k<b;k++){const al=ally(a,c);al.extra=2;allies.push(al);puff(al,'#7fd66b',6)}break; // kind, count, seconds
  case'clear':shots=shots.filter(s=>dist(s,P)>a);break;
  case'tele':puff(P,'#22242b',12);P.x=t.x+Math.cos(ta)*(t.r+24);P.y=t.y+Math.sin(ta)*(t.r+24);clamp(P,14);P.face=ta+Math.PI;P.swing=P.face;P.inv=Math.max(P.inv,.6);puff(P,'#22242b',12);break;
  case'pull':case'knock':for(const m of mons)if(!m.hidden&&m.st!=='leap'&&dist(m,P)<a+m.r){const g2=angTo(P,m),dd=dist(m,P),nd=o==='pull'?Math.max(m.r+50,dd-(m.boss?90:400)):dd+(m.boss?80:160);m.x=P.x+Math.cos(g2)*nd;m.y=P.y+Math.sin(g2)*nd;clamp(m,m.r);if(m.st==='charge'||m.st==='lunge'){m.st='dazed';m.t=.6}}break;
  case'seq':if(a==='quake'){P.quakeN=2;P.quakeT=.4}else if(a==='cuts'){P.cutN=8;P.cutT=0;P.cutM=t;P.inv=Math.max(P.inv,1.9)}else{P.starN=7;P.starT=0}break;
  case'ring':ring(P,a);break;
  case'ringT':ring(t,t.r+a);puff(t,'#7fd66b',20,180);break;
  case'beam':for(let k=1;k<=6;k++)bits.push({x:t.x+(P.x-t.x)*k/6,y:t.y+(P.y-t.y)*k/6,vx:0,vy:0,life:.4,max:.4,c:'#7fd66b',r:3});break;
  case'chain':{const n3=mons.filter(m=>!m.hidden).sort((p,q)=>dist(p,P)-dist(q,P)).slice(0,3);for(const m of n3)if(mons.includes(m)){for(let k=1;k<=6;k++)bits.push({x:P.x+(m.x-P.x)*k/6+rand()*14-7,y:P.y+(m.y-P.y)*k/6+rand()*14-7,vx:0,vy:0,life:.3,max:.3,c:'#8fd3ff',r:3});hurtM(m,3*D)}break}
  case'army':for(const al of allies)if(al.extra===1)puff(al,'#e7dfcd',6);allies=allies.filter(al=>al.extra!==1); // a new army replaces the old one, so the cap holds
    for(let k=0;k<4;k++){const al=ally('thrall',9);al.extra=1;allies.push(al);puff(al,'#7fd66b',6)}break;
  case'burst':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);S.shake=.25;noise(.25,.35,900,150);
    for(const al of th){ring(al,70);puff(al,'#7fd66b',10,220);for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,al)<70+m.r)hurtM(m,2*D,true)}break}
  case'pact':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);for(const al of th)puff(al,'#7fd66b',8,160);P.hp=Math.min(P.maxHp,P.hp+Math.min(8,2*th.length));hud();break}
  }
}
function skill(si){
  const c=cls(),sk=SKILLS[c][si],need=sk[5];
  let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}
  // nothing to use it on: keep the skill ready instead of wasting the cooldown
  if(need==='t'&&!t||need==='near'&&!(t&&bd<t.r+110)||need==='thrall'&&!allies.some(a=>a.kind==='thrall')){SND.fizzle();return false}
  const x={t,ta:t?angTo(P,t):P.face,at:t?{x:t.x,y:t.y}:{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160},D:dmgMul()};
  P.atk=.16;P.swing=x.ta;SND.skill(c,si);if(sk[2]>=40){S.shake=Math.max(S.shake,.3);haptic([40,40,40,40,160])}else haptic(35);
  for(const op of sk[4]){if(S.mode!=='play')break;if((op[0]==='hit'||op[0]==='ringT'||op[0]==='beam')&&!mons.includes(t))continue;cast(op,x)}
  P.mxS[si]=sk[2]*skMul(si);P.cdS[si]=P.mxS[si];syncSkills();return true;
}
function meteor(at,r,dur,dmg,ex){const z={x:at.x,y:at.y,r,t:0,dur,mine:true,dmg,stun:ex&&ex.stun};clamp(z,10);zones.push(z)}
// skills that play out over time
function channels(dt){
  if(P.stormT>0){P.stormT-=dt;if((P.stormK-=dt)<=0){P.stormK=.4;shock(120,2);P.atk=.16;P.swing+=2}}
  if(P.quakeN>0&&(P.quakeT-=dt)<=0){P.quakeT=.4;shock(P.quakeN===2?190:250,4);P.quakeN--}
  if(P.cutN>0&&(P.cutT-=dt)<=0){const m=P.cutM;if(!mons.includes(m)||m.hidden)P.cutN=0;else{P.cutT=.2;P.cutN--;const a=rand()*TAU;puff(P,'#22242b',6);P.x=m.x+Math.cos(a)*(m.r+24);P.y=m.y+Math.sin(a)*(m.r+24);clamp(P,14);P.face=P.swing=a+Math.PI;P.atk=.16;P.inv=Math.max(P.inv,.5);SND.swing('assassin');hurtM(m,3*dmgMul())}}
  if(P.starN>0&&(P.starT-=dt)<=0){P.starT=.35;P.starN--;let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}const at=t||{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160};meteor({x:at.x+rand()*60-30,y:at.y+rand()*60-30},80,.6,6*dmgMul())}
  if(P.fireT>0){P.fireT-=dt;if((P.fireK-=dt)<=0){P.fireK=.1;const a=aim(null,1200);P.swing=a;P.atk=.1;pshot(a+rand()*.1-.05,720,dmgMul(),3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow()}}
  if(P.renewT>0){P.renewT-=dt;if((P.renewK+=dt)>=1){P.renewK=0;if(P.hp<P.maxHp){P.hp++;hud();puff(P,'#7fd66b',4,80)}}}
}
// slot i (0-3) carries skill S.load[i] once that skill is learned
const slotSkill=i=>{const si=S.load[i];return cls()&&si<known()?si:-1};
function syncSkills(){const c=cls();for(let i=0;i<4;i++){const s=SK[i],si=c?slotSkill(i):-1,d=si>=0&&SKILLS[c][si];s.index=si;s.id=d?d[0]:'';s.name=d?d[1]:'';s.unlocked=!!d;s.cd=P&&d?Math.max(0,P.cdS[si]):0;s.max=d?P&&P.mxS[si]||d[2]*skMul(si):0;s.ready=!!d&&s.cd<=0;if(P)P.skCds[i]=s.cd}if(P)P.skCd=P.skCds[0]}
function playerStep(dt){
  const c=cls(),spd=({ranger:245,tank:195,assassin:255,fighter:225}[c]||215)*(c?(1+.06*S.b.fleet)*(adv('s')||1)*(1+eqv('mv')/100)*(P.fleetT>0?1.4:1):1);
  let mx=(keys.right?1:0)-(keys.left?1:0)+joy.x,my=(keys.down?1:0)-(keys.up?1:0)+joy.y;
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}
  P.moving=l>.15;
  if(P.dashT>0){P.dashT-=dt;const v=P.rushHit?780:640;P.x+=P.dx*v*dt;P.y+=P.dy*v*dt;
    if(P.rushHit){for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&!P.rushHit.has(m)&&dist(m,P)<m.r+30){P.rushHit.add(m);if(P.rushStun)m.stun=m.boss?P.rushStun*.7:P.rushStun*2;if(P.rushD)hurtM(m,P.rushD)}if(P.dashT<=0){P.rushD=0;P.rushHit=null}}
    if(rand()<.6)bits.push({x:P.x,y:P.y,vx:0,vy:0,life:.25,max:.25,c:has('skin')?'#c68863':'#e7dfcd',r:6})}
  else if(P.moving){P.x+=mx*spd*dt;P.y+=my*spd*dt;P.face=Math.atan2(my,mx);P.walk+=dt*11}
  clamp(P,14);
  for(const k of['inv','atk','cd','dashCd','amb','rageT','guardT','legT','fleetT','stoneT'])if(P[k]>0)P[k]-=dt;
  for(let i=0;i<10;i++)if(P.cdS[i]>0)P.cdS[i]=Math.max(0,P.cdS[i]-dt);
  if(S.mode==='play')channels(dt);
  if((want.atk||keys.atk)&&P.cd<=0)strike(want.pt);
  want.atk=false;want.pt=null;
  if(want.dash&&has('organs')&&P.dashCd<=0&&P.dashT<=0){
    if(c==='mage'){puff(P,'#8fd3ff',10);P.x+=Math.cos(P.face)*150;P.y+=Math.sin(P.face)*150;clamp(P,14);puff(P,'#8fd3ff',10);P.inv=Math.max(P.inv,.35);P.dashCd=1.1;SND.blink()}
    else{P.dashT=.16;P.dashCd=c==='assassin'?(pw(3)?.25:.45):.85;P.amb=1.5;P.inv=Math.max(P.inv,.26);P.dx=Math.cos(P.face);P.dy=Math.sin(P.face);SND.dash()}
    haptic(10)}
  want.dash=false;
  if(want.skill)want.sk[0]=true;want.skill=false;
  for(let i=0;i<4;i++){const si=slotSkill(i);if(want.sk[i]&&si>=0&&P.cdS[si]<=0&&P.dashT<=0&&!(P.cutN>0))skill(si);want.sk[i]=false}
  if(c==='tank'&&S.adv!=='berserker'&&!P.shield&&(P.shT+=dt)>=(pw(1)?3.5:6)*Math.pow(.85,S.b.spec)*(S.adv==='paladin'?.6:1)/(1+eqv('sh')/100)){P.shield=true;P.shT=0;sfx(660,.08,'sine',.12)}
  if(c==='necro'&&S.mode==='play'&&(P.sumT+=dt)>=(pw(1)?4:6)){P.sumT=0;
    if(allies.filter(a=>a.kind==='thrall'&&!a.extra).length<2+(pw(1)?2:0)+S.b.spec+(S.adv==='lich'?3:0)){const t=ally('thrall');allies.push(t);puff(t,'#7fd66b',6);sfx(180,.2,'sawtooth',.12,90)}}
  if(has('skin')&&P.hp<P.maxHp&&(P.regen+=dt)>=(c==='healer'?(pw(1)?2.5:4)*Math.pow(.88,S.b.spec)/(1+eqv('mend')/100):c==='tank'&&pw(3)?3.5:7)){P.regen=0;P.hp++;hud()}
  syncSkills();
}

/* ---------- loop ---------- */
function step(dt){
  S.t+=dt;if(S.shake>0)S.shake-=dt;
  for(const b of bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.94;b.vy*=.94;b.life-=dt}bits=bits.filter(b=>b.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
  for(const f of floats){f.y-=34*dt;f.life-=dt}floats=floats.filter(f=>f.life>0);
  if(S.mode==='clear'&&(S.clearT-=dt)<=0)return reward();
  if(S.mode!=='play'&&S.mode!=='clear')return;
  playerStep(dt);
  for(const p of pshots){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL){p.dead=true;continue}
    for(const m of[...mons]){if(m.hidden||p.hit.has(m)||!mons.includes(m)||dist(m,p)>m.r+p.r+3)continue;
      let d=p.dmg;if(p.kind==='arrow'&&pw(3)&&Math.hypot(p.x-p.sx,p.y-p.sy)>200){d*=2;puff(p,'#d6a544',4,90)}
      p.hit.add(m);if(p.slow)m.slow=Math.max(m.slow||0,p.slow);if(p.stun)m.stun=m.boss?p.stun*.7:p.stun*2;hurtM(m,d);
      if(p.boom){rings.push({x:p.x,y:p.y,life:.35,max:.35,r:85,fx:true});puff(p,'#ff8a4c',14,220);S.shake=Math.max(S.shake,.2);noise(.2,.3,700,150);for(const o of[...mons])if(!o.hidden&&mons.includes(o)&&dist(o,p)<85+o.r)hurtM(o,p.boom,true)}if(p.kind==='skull')leech();
      if(p.kind==='bolt'&&S.adv==='pyromancer'){rings.push({x:p.x,y:p.y,life:.3,max:.3,r:70,fx:true});puff(p,'#ff8a4c',8,160);for(const o of[...mons])if(o!==m&&!o.hidden&&mons.includes(o)&&dist(o,p)<70+o.r)hurtM(o,d/2)}
      if(p.pierce>0)p.pierce--;else{p.dead=true;break}}}
  pshots=pshots.filter(p=>!p.dead);
  if(S.banner>0)S.banner-=dt;
  if(S.mode!=='play'||S.banner>1.5)return;
  for(const a of allies){a.life-=dt;a.cd-=dt;let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,a);if(d<bd){bd=d;t=m}}
    const to=t||P,d=dist(to,a),stop=t?t.r+a.r:46;
    if(d>stop){const g=angTo(a,to),sp=a.kind==='wolf'?250:175;a.x+=Math.cos(g)*sp*dt;a.y+=Math.sin(g)*sp*dt;a.walk+=dt*12;a.flip=Math.cos(g)<0;clamp(a,a.r)}
    else if(t&&a.cd<=0){a.cd=.7;hurtM(t,(a.kind==='wolf'?2:1)*dmgMul()*(1+eqv('thr')/100)*(P.legT>0?1.5:1),true);leech()}
    if(a.life<=0)puff(a,'#e7dfcd',6)}
  allies=allies.filter(a=>a.life>0);
  for(const f of fields){f.t+=dt;if((f.tick-=dt)<=0){f.tick=f.every;f.n=!f.n;rings.push({x:f.x,y:f.y,life:.45,max:.45,r:f.r,fx:true});
    const fc=f.kind==='frost'?'#8fd3ff':f.kind==='halo'?'#ffe08a':'#e7dfcd';for(let i=0;i<5;i++){const a=rand()*TAU,d=rand()*f.r;bits.push({x:f.x+Math.cos(a)*d,y:f.y+Math.sin(a)*d,vx:0,vy:f.kind==='rain'?60:-30,life:.5,max:.5,c:fc,r:2.5})}
    for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,f)<f.r+m.r){if(f.slow)m.slow=Math.max(m.slow||0,.8);hurtM(m,f.dmg,true)}
    if(f.kind==='halo'&&f.n&&dist(P,f)<f.r&&P.hp<P.maxHp){P.hp++;hud()}}}
  fields=fields.filter(f=>f.t<f.dur);
  if(S.mode!=='play')return;
  if(act2()&&boss&&boss.hp>0&&boss.ai!=='hollow'&&(S.elite-=dt)<=0){S.elite=5;if(mons.length<5){const b=rand()*TAU;spawn('mite',boss.x+Math.cos(b)*50,boss.y+Math.sin(b)*50)}}
  for(const m of[...mons]){
    if(S.mode!=='play')break;if(!mons.includes(m))continue; // the boss or the player died earlier in this loop
    m.moving=false;if(m.flash>0)m.flash-=dt;if(m.ward>0)m.ward-=dt;
    if(m.markT>0)m.markT-=dt;
    if(m.dotT>0){m.dotT-=dt;if((m.dotK-=dt)<=0){m.dotK=.5;hurtM(m,m.dotD,true);if(!mons.includes(m))continue}}
    let k=aiK(m);if(m.slow>0){m.slow-=dt;k*=.5}
    if(m.stun>0)m.stun-=dt;else AI[m.ai](m,dt*k,angTo(m,P),dist(m,P));
    if(m.rage&&rand()<dt*12)bits.push({x:m.x+rand()*m.r*2-m.r,y:m.y-rand()*m.r,vx:rand()*30-15,vy:-50-rand()*40,life:.6,max:.6,c:'#ff5b6e',r:2.5}); // enraged bosses smoulder, whatever draws them
    if((m.ring-=dt)<=0&&(m.moving||m.st==='wind')){rings.push({x:m.x,y:m.y,life:.8,max:.8,r:m.r+24,under:m.hidden});m.ring=m.st==='wind'?.12:.42}
    if(!m.hidden&&m.st!=='leap'&&dist(m,P)<m.r+11)hurtP((m.st==='charge'?2:1)+tier(),m.ai+':'+m.st);
  }
  if(S.mode!=='play')return;
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;if(dist(s,P)<s.r+10){hurtP(1+tier(),'shot');s.dead=true}
    if(s.x<WALL||s.x>W-WALL||s.y<WALL||s.y>H-WALL)s.dead=true}
  shots=shots.filter(s=>!s.dead);
  for(const z of zones){z.t+=dt;if(z.t>=z.dur){z.dead=true;puff(z,col('#d6a544'),18,240);S.shake=Math.max(S.shake,.2);sfx(80,.25,'square',.35,40);noise(.2,.3);
    if(z.mine){rings.push({x:z.x,y:z.y,life:.4,max:.4,r:z.r,fx:true});for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,z)<z.r+m.r){if(z.stun)m.stun=m.boss?z.stun:z.stun*2;hurtM(m,z.dmg)}}else if(dist(z,P)<z.r)hurtP(2+tier(),'zone')}}
  zones=zones.filter(z=>!z.dead);
  for(const f of morsels)if(dist(f,P)<24){f.dead=true;P.hp=Math.min(P.maxHp,P.hp+3);hud();SND.pickup();haptic(15)}
  morsels=morsels.filter(f=>!f.dead);
}

/* ---------- drawing ---------- */
const circ=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU)};
const line=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()};
function drawMon(m){
  if(m.hidden)return;const s=m.s,r=m.r,a=angTo(m,P);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(m.x,m.y+r*.8,r*.9,r*.3,0,0,TAU);ctx.fill();
  ctx.translate(m.x+(m.st==='wind'?rand()*4-2:0),m.y-m.lift*46);
  const c=m.flash>0?'#fff':col(s.col),dk=col(s.col,-.5),lt=col(s.col,.35);
  ctx.lineCap='round';
  if(m.boss&&m.kind!=='mimic'){const g=ctx.createRadialGradient(0,0,r*.6,0,0,r*2.1);g.addColorStop(0,col(s.col).replace('rgb','rgba').replace(')',',.3)'));g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;circ(0,0,r*2.1);ctx.fill()}
  if(s.legs){ctx.strokeStyle=dk;ctx.lineWidth=r>15?4:2.5;for(let i=0;i<s.legs;i++){const b=i*TAU/s.legs+Math.sin(S.t*9+i)*.25;line(Math.cos(b)*r*.7,Math.sin(b)*r*.7,Math.cos(b)*r*1.55,Math.sin(b)*r*1.55)}}
  if(s.spikes){ctx.fillStyle=dk;for(let i=0;i<s.spikes;i++){const b=i*TAU/s.spikes+S.t*(s.void?.6:0);ctx.beginPath();ctx.moveTo(Math.cos(b-.22)*r*.9,Math.sin(b-.22)*r*.9);ctx.lineTo(Math.cos(b)*r*1.5,Math.sin(b)*r*1.5);ctx.lineTo(Math.cos(b+.22)*r*.9,Math.sin(b+.22)*r*.9);ctx.fill()}}
  {const g=ctx.createRadialGradient(-r*.35,-r*.4,r*.08,0,0,r);g.addColorStop(0,m.flash>0?'#fff':lt);g.addColorStop(.5,c);g.addColorStop(1,dk);circ(0,0,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=2.6;ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,r*.78,Math.PI*1.08,Math.PI*1.55);ctx.stroke()}
  if(s.hood){ctx.fillStyle=dk;ctx.beginPath();ctx.arc(0,0,r,Math.PI,TAU);ctx.lineTo(0,-r*1.7);ctx.fill()}
  if(s.pust){ctx.fillStyle=lt;for(let i=0;i<6;i++){const b=i*1.05+1;circ(Math.cos(b)*r*.62,Math.sin(b)*r*.62,r*.14+Math.sin(S.t*3+i)*1.5);ctx.fill()}}
  if(s.mask){ctx.fillStyle=col('#e7dfcd');ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.2,Math.sin(a)*r*.2,r*.62,r*.72,0,0,TAU);ctx.fill()}
  if(s.void){circ(0,0,r*.55);ctx.fillStyle='#050408';ctx.fill();ctx.strokeStyle=col('#b8263d');ctx.lineWidth=2.5;ctx.stroke()}
  if(s.teeth){circ(0,0,r*.62);ctx.fillStyle='#120b08';ctx.fill();ctx.fillStyle=col('#e7dfcd');for(let i=0;i<9;i++){const b=i*TAU/9+S.t;ctx.beginPath();ctx.moveTo(Math.cos(b-.16)*r*.62,Math.sin(b-.16)*r*.62);ctx.lineTo(Math.cos(b)*r*.3,Math.sin(b)*r*.3);ctx.lineTo(Math.cos(b+.16)*r*.62,Math.sin(b+.16)*r*.62);ctx.fill()}}
  for(let i=0;i<s.eyes;i++){const b=a+(i-(s.eyes-1)/2)*(s.eyes>3?.42:.62),ex=Math.cos(b)*r*.5,ey=Math.sin(b)*r*.5,er=Math.max(2.5,r*.16);
    circ(ex,ey,er);ctx.fillStyle=col(s.void?'#ff5b6e':'#ffd95e');ctx.fill();circ(ex+Math.cos(a)*er*.4,ey+Math.sin(a)*er*.4,er*.45);ctx.fillStyle='#0a0a0a';ctx.fill();circ(ex-er*.3,ey-er*.35,er*.22);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fill()}
  if(m.st==='dazed'){ctx.fillStyle=col('#d6a544');for(let i=0;i<3;i++){const b=S.t*5+i*TAU/3;circ(Math.cos(b)*r*.7,-r-8+Math.sin(b)*4,3);ctx.fill()}}
  ctx.restore();
}
function skeleton(org,sw,t){
  const B='#eee6d2',Bs='#b3a88e',O='#15121b',bob=Math.sin(t*3)*.5;
  const jaw=P.moving?Math.abs(Math.sin(P.walk*1.5))*1.1:(P.atk>0?1.4:0);
  const pass=out=>{
    const w=k=>ctx.lineWidth=k+(out?2.2:0),g=out?1.1:0;
    ctx.strokeStyle=ctx.fillStyle=out?O:B;
    const bone=(x1,y1,x2,y2,k,kn)=>{w(k);line(x1,y1,x2,y2);circ(x1,y1,kn+g);ctx.fill();circ(x2,y2,kn+g);ctx.fill()};
    // legs: femur, kneecap, shin (two thin bones), foot
    for(const s of[-1,1]){const st=s*sw,kx=s*4.6+st*.3,ky=13.2-Math.abs(st)*.12,ax=s*5+st*.7,ay=19.6;
      bone(s*3.8,8,kx,ky,2.1,1.5);
      if(out)bone(kx,ky,ax,ay,2.2,1.2);else{w(1.1);line(kx-.8,ky,ax-.7,ay);line(kx+.8,ky,ax+.7,ay);circ(kx,ky,1.6);ctx.fill();circ(ax,ay,1.2);ctx.fill()}
      w(1.9);line(ax,ay+.6,ax+s*3.4,ay+.9)}
    // pelvis
    ctx.beginPath();ctx.moveTo(-6.8,4.2);ctx.quadraticCurveTo(-3,3.4,0,5.2);ctx.quadraticCurveTo(3,3.4,6.8,4.2);ctx.quadraticCurveTo(6.6,8.4,3.6,9.4);ctx.quadraticCurveTo(0,6.6,-3.6,9.4);ctx.quadraticCurveTo(-6.6,8.4,-6.8,4.2);ctx.fill();if(out){w(0);ctx.stroke()}
    // spine and neck
    for(let y=-16.4;y<=3.6;y+=2.5){circ(0,y,1.2+g);ctx.fill()}
    if(!out&&org){ctx.fillStyle='#e08fa0';ctx.beginPath();ctx.ellipse(-3.6,-6.2+bob,2.9,4.6,.12,0,TAU);ctx.ellipse(3.6,-6.2+bob,2.9,4.6,-.12,0,TAU);ctx.fill();
      ctx.fillStyle='#7a3b50';ctx.fillRect(-.5,-11,1,4);
      const beat=1+.28*Math.max(0,Math.sin(t*7));ctx.fillStyle='#d1213f';ctx.beginPath();ctx.ellipse(1,-4.6+bob,2.5*beat,2.9*beat,.4,0,TAU);ctx.fill();ctx.fillStyle=B}
    // ribs curve out from the spine and back in toward the sternum
    w(1.35);for(let i=0;i<4;i++){const y=-10.6+i*2.9+bob*.6,rx=8.4-i*.75;for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(s*.9,y-.7);ctx.quadraticCurveTo(s*rx*1.12,y-1.5,s*rx*.86,y+1.1);ctx.quadraticCurveTo(s*rx*.6,y+2.5,s*(i<3?1.1:2.6),y+1.7);ctx.stroke()}}
    if(!out&&!org){ctx.strokeStyle=Bs;ctx.lineWidth=1.3;line(0,-10.5,0,-3.4);ctx.strokeStyle=B}
    // collarbones and arms: upper arm, forearm (two bones), fingers
    w(1.7);line(-8.6,-12.6,-1,-11.8);line(8.6,-12.6,1,-11.8);
    for(const s of[-1,1]){const ex=s*10.8,ey=-5+s*sw*.15,hx=s*12,hy=3+s*sw*.5;
      bone(s*8.8,-12.4,ex,ey,1.9,1.5);
      if(out)bone(ex,ey,hx,hy,2,1.2);else{w(1);line(ex-.7,ey,hx-.6,hy);line(ex+.7,ey,hx+.6,hy);circ(ex,ey,1.5);ctx.fill();circ(hx,hy,1.5);ctx.fill();
        w(.8);for(const f of[-1,0,1])line(hx,hy,hx+f*1.4,hy+2.8-Math.abs(f)*.5)}}
    // skull: cranium, cheekbones, upper jaw, loose lower jaw
    const hy=-23+bob;
    ctx.beginPath();ctx.moveTo(-7.4,hy-.5);ctx.bezierCurveTo(-7.8,hy-10.4,7.8,hy-10.4,7.4,hy-.5);ctx.quadraticCurveTo(7.2,hy+3,4.6,hy+3.6);ctx.lineTo(4,hy+6.6);ctx.lineTo(-4,hy+6.6);ctx.lineTo(-4.6,hy+3.6);ctx.quadraticCurveTo(-7.2,hy+3,-7.4,hy-.5);ctx.fill();if(out){w(0);ctx.stroke()}
    ctx.beginPath();ctx.roundRect(-3.7-g,hy+7+jaw-g,7.4+2*g,2.7+2*g,1.3);ctx.fill();
    if(!out){
      ctx.fillStyle=Bs;ctx.beginPath();ctx.ellipse(-5.6,hy+2.2,1.5,1,.5,0,TAU);ctx.ellipse(5.6,hy+2.2,1.5,1,-.5,0,TAU);ctx.fill();
      ctx.strokeStyle=Bs;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(1.2,hy-7.6);ctx.lineTo(.4,hy-6);ctx.lineTo(1.6,hy-4.8);ctx.stroke();
      ctx.fillStyle=O;ctx.beginPath();ctx.ellipse(-3.1,hy-.2,2.5,2.8,-.18,0,TAU);ctx.ellipse(3.1,hy-.2,2.5,2.8,.18,0,TAU);ctx.fill();
      ctx.beginPath();ctx.moveTo(0,hy+2);ctx.quadraticCurveTo(-1.7,hy+4.6,-.3,hy+4.5);ctx.lineTo(0,hy+3.9);ctx.lineTo(.3,hy+4.5);ctx.quadraticCurveTo(1.7,hy+4.6,0,hy+2);ctx.fill();
      ctx.strokeStyle=O;ctx.lineWidth=.55;for(const x of[-2.4,-.8,.8,2.4]){line(x,hy+5.2,x,hy+6.6);line(x,hy+7+jaw,x,hy+8.4+jaw)}
      ctx.lineWidth=.7;line(-3.6,hy+6.75,3.6,hy+6.75);
    }
  };
  pass(true);pass(false);
}
function drawAlly(a){
  ctx.save();ctx.translate(a.x,a.y);ctx.lineCap='round';
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,a.r+1,a.r,3.2,0,0,TAU);ctx.fill();
  if(a.flip)ctx.scale(-1,1);const b=Math.sin(a.walk)*2.5,O='#15121b';
  if(a.kind==='wolf'){
    ctx.strokeStyle=O;ctx.lineWidth=4.6;for(const x of[-7,-3,4,8])line(x,3,x+(x%2?b:-b),11);
    ctx.fillStyle=O;ctx.beginPath();ctx.ellipse(0,0,14,8,0,0,TAU);ctx.fill();circ(11,-6,7.2);ctx.fill();
    ctx.strokeStyle='#7d8693';ctx.lineWidth=2.6;for(const x of[-7,-3,4,8])line(x,3,x+(x%2?b:-b),11);line(-12,-2,-18,-7);
    ctx.fillStyle='#8d96a4';ctx.beginPath();ctx.ellipse(0,0,12.6,6.8,0,0,TAU);ctx.fill();circ(11,-6,6);ctx.fill();
    ctx.beginPath();ctx.moveTo(7,-10);ctx.lineTo(8.5,-16);ctx.lineTo(11,-11);ctx.moveTo(12,-11);ctx.lineTo(14.5,-16);ctx.lineTo(15.5,-9.5);ctx.fill();
    ctx.fillStyle='#c9cfd8';ctx.beginPath();ctx.ellipse(15,-4.4,3.6,2.4,0,0,TAU);ctx.fill();ctx.fillStyle='#ffd95e';circ(11.6,-7.4,1.3);ctx.fill();ctx.fillStyle=O;circ(18,-4.8,1.1);ctx.fill();
  }else{
    for(const[w,k]of[[4.6,O],[2.1,'#e7dfcd']]){ctx.strokeStyle=k;ctx.lineWidth=w;line(0,-3,0,5);line(-3,5,-3-b,11);line(3,5,3+b,11);line(-5.5,-1,5.5,-1);line(-5.5,-1,-6.5,4);line(5.5,-1,6.5,4)}
    circ(0,-8.5,6);ctx.fillStyle=O;ctx.fill();circ(0,-8.5,4.9);ctx.fillStyle='#e7dfcd';ctx.fill();
    ctx.save();ctx.shadowColor='#7fd66b';ctx.shadowBlur=6;ctx.fillStyle='#7fd66b';circ(-1.9,-8.8,1.3);ctx.fill();circ(1.9,-8.8,1.3);ctx.fill();ctx.restore();
  }
  ctx.restore();
}
function drawPlayer(){
  const skin=has('skin'),org=has('organs'),t=S.t;
  const rattle=!has('touch')&&P.hp<=2&&S.mode==='play'?Math.sin(t*70)*1.6:0;
  const sw=P.moving?Math.sin(P.walk)*5:0;
  ctx.save();
  if(P.inv>0&&Math.floor(t*18)%2)ctx.globalAlpha=.4;
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(P.x,P.y+27,17,5.5,0,0,TAU);ctx.fill();
  if(S.adv&&act2()){const g=ctx.createRadialGradient(P.x,P.y+24,2,P.x,P.y+24,34);g.addColorStop(0,'rgba(214,165,68,.4)');g.addColorStop(1,'rgba(214,165,68,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(P.x,P.y+24,34,13,0,0,TAU);ctx.fill()}
  if(SK[0].ready&&S.mode==='play'){ctx.strokeStyle='rgba(214,165,68,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(P.x,P.y+27,22,8,0,0,TAU);ctx.stroke()}
  ctx.translate(P.x+rattle,P.y);ctx.scale(1.3,1.3);ctx.lineCap='round';ctx.lineJoin='round';
  const B='#e7dfcd',F='#c68863',Fd='#9d6344';
  if(!skin)skeleton(org,sw,t);
  else{
    ctx.strokeStyle=ctx.fillStyle='#15121b';ctx.lineWidth=8.9;line(-4,6,-5-sw*.4,19);line(4,6,5+sw*.4,19);
    ctx.lineWidth=7.9;line(-9,-10,-12,2+sw*.5);line(9,-10,12,2-sw*.5);
    ctx.beginPath();ctx.roundRect(-9.2,-15.2,18.4,24.4,7);ctx.fill();circ(-12,3+sw*.5,4.5);ctx.fill();circ(12,3-sw*.5,4.5);ctx.fill();
    if(has('hearing')){circ(-8.6,-22,3.8);ctx.fill();circ(8.6,-22,3.8);ctx.fill()}circ(0,-22,9.7);ctx.fill();
    ctx.strokeStyle=F;ctx.lineWidth=6.5;line(-4,6,-5-sw*.4,19);line(4,6,5+sw*.4,19);
    ctx.lineWidth=5.5;line(-9,-10,-12,2+sw*.5);line(9,-10,12,2-sw*.5);
    ctx.fillStyle=F;ctx.beginPath();ctx.roundRect(-8,-14,16,22,6);ctx.fill();
    ctx.fillStyle='rgba(110,55,35,.28)';ctx.beginPath();ctx.roundRect(-8,-3,16,11,6);ctx.fill();
    ctx.fillStyle='rgba(255,225,195,.22)';ctx.beginPath();ctx.ellipse(-2.6,-9.4,4,3.4,0,0,TAU);ctx.fill();
    if(!cls()){ctx.fillStyle='#d9cfb8';ctx.beginPath();ctx.roundRect(-8.4,1.6,16.8,7.4,3);ctx.fill();ctx.fillStyle='#b9ae95';ctx.fillRect(-8.4,1.6,16.8,1.6);ctx.fillRect(3,3,2.6,8)}
    ctx.fillStyle=has('touch')?'#edb694':F;circ(-12,3+sw*.5,3.3);ctx.fill();circ(12,3-sw*.5,3.3);ctx.fill();
    if(has('hearing')){ctx.fillStyle=Fd;circ(-8.6,-22,2.6);ctx.fill();circ(8.6,-22,2.6);ctx.fill()}
    circ(0,-22,8.5);ctx.fillStyle=F;ctx.fill();
    ctx.fillStyle='rgba(110,55,35,.2)';ctx.beginPath();ctx.arc(0,-22,8.5,.15*Math.PI,.85*Math.PI);ctx.fill();ctx.fillStyle='rgba(255,225,195,.2)';ctx.beginPath();ctx.ellipse(-2.8,-26,3.6,2.4,-.3,0,TAU);ctx.fill();
    if(has('taste')){ctx.fillStyle='#2a1a14';ctx.beginPath();ctx.arc(0,-23,8.8,Math.PI*1.02,Math.PI*1.98);ctx.fill()}
    if(has('sight')){const px=Math.cos(P.face)*.8,py=Math.sin(P.face)*.6;ctx.fillStyle='#fff';circ(-3,-22,2.1);ctx.fill();circ(3,-22,2.1);ctx.fill();ctx.fillStyle='#1a1410';circ(-3+px,-22+py,1.1);ctx.fill();circ(3+px,-22+py,1.1);ctx.fill()}
    if(has('smell')){ctx.strokeStyle=Fd;ctx.lineWidth=1.4;line(0,-21,0,-18.8)}
    if(has('taste')){ctx.strokeStyle='#8c2f39';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(0,-18.4,2.6,.2*Math.PI,.8*Math.PI);ctx.stroke()}
  }
  if(skin)gear(sw);
  weapon(sw);
  ctx.restore();
}
// class equipment, drawn over the finished human body
function gear(sw){
  const c=cls();if(!c)return;const st='#9aa3ad',sd='#6d7781',lt='#d5dce2',lea='#5b4636';
  if(c==='tank'){
    ctx.strokeStyle=sd;ctx.lineWidth=6.8;line(-4.6,13,-5-sw*.4,19);line(4.6,13,5+sw*.4,19);
    ctx.fillStyle=st;ctx.beginPath();ctx.roundRect(-8.6,-14.6,17.2,17.6,5);ctx.fill();
    ctx.strokeStyle=lt;ctx.lineWidth=1.2;line(-3.2,-11.5,-3.2,-2);
    ctx.fillStyle=lea;ctx.fillRect(-8.6,1.2,17.2,2.4);
    ctx.fillStyle=sd;circ(-9.6,-11.6,3.7);ctx.fill();circ(9.6,-11.6,3.7);ctx.fill();
    ctx.fillStyle=st;ctx.beginPath();ctx.arc(0,-22.6,9.3,Math.PI,TAU);ctx.lineTo(9.3,-17.5);ctx.lineTo(6,-17.5);ctx.lineTo(6,-24.4);ctx.lineTo(-6,-24.4);ctx.lineTo(-6,-17.5);ctx.lineTo(-9.3,-17.5);ctx.closePath();ctx.fill();
    ctx.fillRect(-.9,-24.4,1.8,5.2);ctx.fillStyle='#b8263d';ctx.fillRect(-1.3,-35.4,2.6,4);
    const x=-13.5,y=1.5+sw*.5;ctx.save();if(!P.shield)ctx.globalAlpha*=S.adv==='berserker'?0:.45;
    ctx.beginPath();ctx.moveTo(x-6.5,y-7);ctx.lineTo(x+6.5,y-7);ctx.lineTo(x+6.5,y+1);ctx.quadraticCurveTo(x+5,y+8,x,y+10);ctx.quadraticCurveTo(x-5,y+8,x-6.5,y+1);ctx.closePath();
    ctx.fillStyle='#3d5a80';ctx.fill();ctx.strokeStyle=lt;ctx.lineWidth=1.4;ctx.stroke();circ(x,y,2.1);ctx.fillStyle='#d6a544';ctx.fill();ctx.restore();
    if(P.shield){ctx.strokeStyle=`rgba(214,165,68,${.45+.35*Math.sin(S.t*6)})`;ctx.lineWidth=1.6;circ(x,y+1,11.5);ctx.stroke()}
  }else if(c==='mage'){
    const robe='#3b2f73';
    ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(-8.6,-14.4);ctx.lineTo(8.6,-14.4);ctx.lineTo(11.5,16);ctx.lineTo(-11.5,16);ctx.closePath();ctx.fill();
    ctx.strokeStyle=robe;ctx.lineWidth=6.8;line(-9,-10,-11.6,-.5+sw*.4);line(9,-10,11.6,-.5-sw*.4);
    ctx.strokeStyle='#5a4aa6';ctx.lineWidth=1.6;line(0,-13,0,15);ctx.strokeStyle='#d6a544';ctx.lineWidth=1.4;line(-11.3,15.4,11.3,15.4);
    ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(-9,-27.5);ctx.lineTo(9,-27.5);ctx.lineTo(3,-45);ctx.closePath();ctx.fill();
    ctx.fillStyle='#2c2358';ctx.beginPath();ctx.ellipse(0,-27.3,12.5,2.8,0,0,TAU);ctx.fill();ctx.lineWidth=1.3;line(-7.4,-30,7.6,-30);
  }else if(c==='fighter'){
    ctx.strokeStyle='#4a3a30';ctx.lineWidth=6.8;line(-4.6,7,-5-sw*.4,15);line(4.6,7,5+sw*.4,15);
    ctx.fillStyle='#8c3b2f';ctx.beginPath();ctx.roundRect(-8.6,-14.6,17.2,19.5,5);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.moveTo(-3,-14.6);ctx.lineTo(3,-14.6);ctx.lineTo(0,-6);ctx.closePath();ctx.fill();
    ctx.fillStyle=lea;ctx.fillRect(-8.6,.4,17.2,2.6);ctx.fillStyle='#d6a544';ctx.fillRect(-1.6,.2,3.2,3);
    ctx.fillStyle='#e7dfcd';circ(-12,3+sw*.5,3.6);ctx.fill();circ(12,3-sw*.5,3.6);ctx.fill();
    ctx.strokeStyle='#b8263d';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,-22,8.7,Math.PI*1.08,Math.PI*1.92);ctx.stroke();ctx.lineWidth=1.8;line(-8,-25,-13,-22-sw*.3);line(-8,-25,-12.5,-27);
  }else if(c==='assassin'){
    const dk='#22242b';
    ctx.strokeStyle=dk;ctx.lineWidth=6.8;line(-4.4,7,-5-sw*.4,19);line(4.4,7,5+sw*.4,19);line(-9,-10,-11.6,-.5+sw*.4);line(9,-10,11.6,-.5-sw*.4);
    ctx.fillStyle=dk;ctx.beginPath();ctx.roundRect(-8.6,-14.6,17.2,22,5);ctx.fill();
    ctx.fillStyle='#3a3d47';ctx.fillRect(-8.6,-.5,17.2,2.2);ctx.strokeStyle='#3a3d47';ctx.lineWidth=1.4;line(-7,-13,7,-1);line(7,-13,-7,-1);
    ctx.fillStyle=dk;ctx.beginPath();ctx.arc(0,-22,8.9,.02*Math.PI,.98*Math.PI);ctx.fill();
    ctx.strokeStyle=dk;ctx.lineWidth=3.8;ctx.beginPath();ctx.arc(0,-21.5,9.5,Math.PI*.8,Math.PI*2.2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-4,-30.2);ctx.lineTo(4,-30.2);ctx.lineTo(-1,-36);ctx.closePath();ctx.fill();
    ctx.fillStyle='#b8263d';ctx.beginPath();ctx.moveTo(5,-14);ctx.lineTo(11,-9);ctx.lineTo(8,-4+sw*.4);ctx.lineTo(4.6,-11);ctx.closePath();ctx.fill();
  }else if(c==='healer'){
    const robe='#ece6d6',gold='#d6a544';
    ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(-8.6,-14.4);ctx.lineTo(8.6,-14.4);ctx.lineTo(11.5,16);ctx.lineTo(-11.5,16);ctx.closePath();ctx.fill();
    ctx.strokeStyle=robe;ctx.lineWidth=6.8;line(-9,-10,-11.6,-.5+sw*.4);line(9,-10,11.6,-.5-sw*.4);
    ctx.fillStyle='rgba(120,100,60,.22)';ctx.beginPath();ctx.moveTo(2,-14.4);ctx.lineTo(8.6,-14.4);ctx.lineTo(11.5,16);ctx.lineTo(4,16);ctx.closePath();ctx.fill();
    ctx.strokeStyle=gold;ctx.lineWidth=1.5;line(-11.3,15.3,11.3,15.3);line(0,-13,0,15);line(-4,-7,4,-7);
    ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,-33.5+Math.sin(S.t*2)*.6,6.4,2,0,0,TAU);ctx.stroke();
    ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,-22,8.8,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
  }else if(c==='necro'){
    const robe='#1c2622',trim='#7fd66b';
    ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(-8.6,-14.4);ctx.lineTo(8.6,-14.4);ctx.lineTo(12,16);ctx.lineTo(-12,16);ctx.closePath();ctx.fill();
    ctx.strokeStyle=robe;ctx.lineWidth=6.8;line(-9,-10,-11.6,-.5+sw*.4);line(9,-10,11.6,-.5-sw*.4);
    ctx.strokeStyle=trim;ctx.lineWidth=1.2;line(-11.8,15.4,11.8,15.4);line(0,-13,0,-4);
    ctx.fillStyle='#e7dfcd';circ(0,-2,2.2);ctx.fill();ctx.fillStyle=robe;circ(-.8,-2.3,.6);ctx.fill();circ(.8,-2.3,.6);ctx.fill();
    ctx.fillStyle=robe;ctx.beginPath();ctx.ellipse(0,-13.6,9.8,2.8,0,0,TAU);ctx.fill();
    ctx.strokeStyle=robe;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-21.5,9.6,Math.PI*.8,Math.PI*2.2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-4,-30.2);ctx.lineTo(4,-30.2);ctx.lineTo(1,-37);ctx.closePath();ctx.fill();
  }else{
    ctx.strokeStyle=lea;ctx.lineWidth=6.8;line(-4.8,14,-5-sw*.4,19);line(4.8,14,5+sw*.4,19);
    ctx.fillStyle='#3f6b3a';ctx.beginPath();ctx.roundRect(-8.6,-14.6,17.2,20,5);ctx.fill();
    ctx.fillStyle=lea;ctx.fillRect(-8.6,-1,17.2,2.2);ctx.strokeStyle=lea;ctx.lineWidth=1.6;line(-7,-13,7,-1);
    ctx.save();ctx.translate(-7.5,-15);ctx.rotate(-.5);ctx.fillStyle=lea;ctx.fillRect(-2,-9,4,9);ctx.strokeStyle='#e7dfcd';ctx.lineWidth=.8;for(const x of[-1.2,0,1.2])line(x,-9,x,-12.5);ctx.restore();
    ctx.fillStyle='#2f5230';ctx.beginPath();ctx.ellipse(0,-13.6,9.6,2.7,0,0,TAU);ctx.fill();
    ctx.strokeStyle='#2f5230';ctx.lineWidth=3.6;ctx.beginPath();ctx.arc(0,-21.5,9.4,Math.PI*.82,Math.PI*2.18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-3.4,-30.4);ctx.lineTo(3.4,-30.4);ctx.lineTo(.6,-35.5);ctx.closePath();ctx.fill();
  }
}
function weapon(sw){
  const c=cls(),B='#eee6d2',hy=3-sw*.5;
  if(P.atk>0&&melee(c)){const k=P.atk/.16;ctx.strokeStyle=c?'#dfe6ec':B;if(c==='fighter'&&pw(1)){ctx.globalAlpha*=k;ctx.lineWidth=6;circ(0,-4,56);ctx.stroke();return}ctx.globalAlpha*=k;ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,-4,c?44:38,P.swing-1.1,P.swing+1.1);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-4,c?57:50,P.swing-.9,P.swing+.9);ctx.stroke();return}
  if(!c){ctx.strokeStyle=B;ctx.lineWidth=4;line(12,hy,15,hy-18);circ(15,hy-18,2.6);ctx.fillStyle=B;ctx.fill()}
  else if(c==='tank'){ctx.strokeStyle='#dfe6ec';ctx.lineWidth=3;line(12.6,hy-2,16.5,hy-24);ctx.strokeStyle='#d6a544';ctx.lineWidth=2.2;line(9.4,hy-3.6,16.4,hy-2.2);ctx.strokeStyle='#5b4636';ctx.lineWidth=2.4;line(12,hy+1.5,12.6,hy-2)}
  else if(c==='mage'){const f=P.atk>0?1.6:1;ctx.strokeStyle='#6b4a2b';ctx.lineWidth=2.4;line(13.5,17,13.5,hy-26);ctx.save();ctx.shadowColor='#8fd3ff';ctx.shadowBlur=10*f;circ(13.5,hy-29,3.3*f);ctx.fillStyle='#8fd3ff';ctx.fill();ctx.restore();circ(12.6,hy-30,1.1);ctx.fillStyle='#fff';ctx.fill()}
  else if(c==='fighter'){ctx.strokeStyle='#15121b';ctx.lineWidth=6.4;line(12.6,hy-2,18,hy-31);ctx.strokeStyle='#dfe6ec';ctx.lineWidth=4.4;line(12.6,hy-2,18,hy-31);ctx.strokeStyle='#9aa3ad';ctx.lineWidth=1.2;line(13.2,hy-5,17.6,hy-29);ctx.strokeStyle='#d6a544';ctx.lineWidth=2.6;line(8.6,hy-4,17.2,hy-2.2);ctx.strokeStyle='#5b4636';ctx.lineWidth=2.6;line(11.8,hy+2.5,12.6,hy-2)}
  else if(c==='assassin'){for(const sx of[-1,1]){const y=3-sx*sw*.5;ctx.strokeStyle='#dfe6ec';ctx.lineWidth=2.4;line(sx*12.5,y-1,sx*16,y-11);ctx.strokeStyle='#5b4636';ctx.lineWidth=2.6;line(sx*12,y+1.5,sx*12.5,y-1)}}
  else if(c==='healer'){const f=P.atk>0?1.5:1;ctx.strokeStyle='#b99a5a';ctx.lineWidth=2.4;line(13.5,17,13.5,hy-25);ctx.save();ctx.shadowColor='#ffe08a';ctx.shadowBlur=10*f;circ(13.5,hy-29,3.6*f);ctx.fillStyle='#ffe08a';ctx.fill();ctx.restore();ctx.strokeStyle='#d6a544';ctx.lineWidth=1.2;for(let i=0;i<8;i++){const g=i*TAU/8+S.t;line(13.5+Math.cos(g)*5,hy-29+Math.sin(g)*5,13.5+Math.cos(g)*7,hy-29+Math.sin(g)*7)}}
  else if(c==='necro'){const f=P.atk>0?1.5:1;ctx.strokeStyle='#3a2f2a';ctx.lineWidth=2.4;line(13.5,17,13.5,hy-24);ctx.save();ctx.shadowColor='#7fd66b';ctx.shadowBlur=9*f;circ(13.5,hy-28,4*f);ctx.fillStyle='#e7dfcd';ctx.fill();ctx.restore();ctx.fillStyle='#7fd66b';circ(12,hy-28.5,1.1);ctx.fill();circ(15,hy-28.5,1.1);ctx.fill();ctx.fillStyle='#e7dfcd';ctx.fillRect(11.6,hy-25,3.8,2)}
  else{const x=8+Math.cos(1.2)*12,d=Math.sin(1.2)*12,pull=P.atk>0?x-4:x;ctx.strokeStyle='#8a5a2b';ctx.lineWidth=2.3;ctx.beginPath();ctx.arc(8,hy-2,12,-1.2,1.2);ctx.stroke();ctx.strokeStyle=B;ctx.lineWidth=.8;line(x,hy-2-d,pull,hy-2);line(pull,hy-2,x,hy-2+d)}
}
function draw(){
  const sight=has('sight');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(S.shake>0&&!calm)ctx.translate((rand()-.5)*S.shake*26,(rand()-.5)*S.shake*26);
  ctx.drawImage(floor(),0,0);
  if(sight&&!act2()){ctx.globalCompositeOperation='lighter';for(const[x,y]of[[WALL,WALL],[W-WALL,WALL],[WALL,H-WALL],[W-WALL,H-WALL]]){const R=210+Math.sin(S.t*9+x)*10,g=ctx.createRadialGradient(x,y,4,x,y,R);g.addColorStop(0,'rgba(255,170,70,.42)');g.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=g;ctx.fillRect(x-R,y-R,R*2,R*2)}ctx.globalCompositeOperation='source-over'}
  if(sight){ctx.fillStyle='rgba(255,236,190,.3)';for(let i=0;i<26;i++){const x=(i*137.5+S.t*(6+i%5))%W,y=(i*89.3+Math.sin(S.t*.4+i)*30+S.t*(3+i%3)+60)%H;circ(x,y,1+(i%3)*.5);ctx.fill()}}
  for(const f of fields){circ(f.x,f.y,f.r);ctx.fillStyle=f.kind==='frost'?'rgba(143,211,255,.16)':f.kind==='halo'?'rgba(255,224,138,.15)':'rgba(231,223,205,.1)';ctx.fill();ctx.strokeStyle=f.kind==='frost'?'rgba(143,211,255,.6)':f.kind==='halo'?'rgba(255,224,138,.6)':'rgba(231,223,205,.45)';ctx.lineWidth=1.5;ctx.stroke()}
  for(const f of morsels){circ(f.x,f.y+Math.sin(S.t*4)*2,8);ctx.fillStyle='#d1213f';ctx.fill();circ(f.x-2,f.y-3+Math.sin(S.t*4)*2,2.5);ctx.fillStyle='#ffb3bf';ctx.fill()}
  for(const m of mons)drawMon(m);
  for(const s of shots){if(sight){circ(s.x,s.y,s.r+5);ctx.fillStyle='rgba(255,138,76,.28)';ctx.fill()}circ(s.x,s.y,s.r);ctx.fillStyle=col('#ff8a4c');ctx.fill();circ(s.x,s.y,s.r*.45);ctx.fillStyle='#fff';ctx.fill()}
  for(const a of allies)drawAlly(a);
  for(const p of pshots){
    if(p.kind==='skull'){circ(p.x,p.y,p.r+4);ctx.fillStyle='rgba(127,214,107,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle='#e7dfcd';ctx.fill();ctx.fillStyle='#15121b';circ(p.x-1.7,p.y-.6,1.2);ctx.fill();circ(p.x+1.7,p.y-.6,1.2);ctx.fill()}
    else if(p.kind==='arrow'){const a=Math.atan2(p.vy,p.vx);ctx.strokeStyle='#e7dfcd';ctx.lineWidth=2;line(p.x-Math.cos(a)*15,p.y-Math.sin(a)*15,p.x,p.y);circ(p.x,p.y,2);ctx.fillStyle='#d5dce2';ctx.fill()}
    else{const o=p.kind==='orb';circ(p.x,p.y,p.r+3);ctx.fillStyle=o?'rgba(255,224,138,.4)':'rgba(143,211,255,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle=o?'#ffe08a':'#8fd3ff';ctx.fill();circ(p.x,p.y,p.r*.45);ctx.fillStyle='#fff';ctx.fill()}}
  if(P)drawPlayer();
  for(const b of bits){ctx.globalAlpha=Math.max(0,b.life/b.max);circ(b.x,b.y,b.r);ctx.fillStyle=b.c;ctx.fill()}
  ctx.font='22px "Pirata One",Georgia,serif';ctx.textAlign='center';for(const f of floats){ctx.globalAlpha=Math.min(1,f.life*2.5);ctx.fillStyle='#0d0c11';ctx.fillText(f.txt,f.x+1.5,f.y+1.5);ctx.fillStyle=f.c;ctx.fillText(f.txt,f.x,f.y)}ctx.globalAlpha=1;
  if(!sight&&P){
    fctx.globalCompositeOperation='source-over';fctx.clearRect(0,0,W,H);fctx.fillStyle='rgba(6,5,9,.965)';fctx.fillRect(0,0,W,H);
    fctx.globalCompositeOperation='destination-out';const g=fctx.createRadialGradient(P.x,P.y,FOG*.3,P.x,P.y,FOG);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');fctx.fillStyle=g;fctx.fillRect(0,0,W,H);
    ctx.drawImage(fogC,0,0);
  }
  // what you feel through the floor (no eyes) or hear beneath it (ears)
  for(const r of rings){if(!r.fx&&(r.under?!has('hearing'):sight))continue;const k=1-r.life/r.max,hot=r.under||r.fx;ctx.globalAlpha=(1-k)*(hot?.9:.5);ctx.strokeStyle=hot?'#d6a544':'#e7dfcd';ctx.lineWidth=hot?3:1.5;circ(r.x,r.y,6+r.r*k);ctx.stroke()}
  ctx.globalAlpha=1;
  if(has('touch')){
    for(const z of zones){const k=z.t/z.dur;circ(z.x,z.y,z.r);ctx.fillStyle=z.mine?`rgba(143,211,255,${.1+.25*k})`:`rgba(184,38,61,${.12+.25*k})`;ctx.fill();ctx.strokeStyle=z.mine?'#8fd3ff':'#d6a544';ctx.lineWidth=2;ctx.stroke();circ(z.x,z.y,z.r*k);ctx.strokeStyle='rgba(231,223,205,.8)';ctx.stroke()}
    ctx.fillStyle='#d6a544';ctx.font='700 30px Spectral,Georgia,serif';ctx.textAlign='center';
    for(const m of mons)if(m.st==='wind')ctx.fillText('!',m.x,m.y-m.r-12);
  }
  if(S.banner>0&&S.mode==='play'){
    const L=S.L;ctx.globalAlpha=Math.min(1,S.banner/.6);ctx.textAlign='center';
    ctx.fillStyle='rgba(13,12,17,.72)';ctx.fillRect(0,196,W,150);
    ctx.fillStyle='#d6a544';ctx.font='600 15px Spectral,Georgia,serif';ctx.fillText(('LEVEL '+(S.level+1)+'  ·  '+L.spec.name).toUpperCase(),W/2,228);
    ctx.fillStyle='#e7dfcd';ctx.font='58px "Pirata One",Georgia,serif';ctx.fillText(L.title,W/2,286);
    ctx.fillStyle='#b9b2c6';ctx.font='italic 20px Spectral,Georgia,serif';ctx.fillText(L.hint,W/2,322);ctx.globalAlpha=1;
  }
  if(boss)$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';
}

/* ---------- screens ---------- */
function show(o){
  $('ovKick').textContent=o.kick||'';$('ovTitle').textContent=o.title;$('ovTitle').style.color=o.col||'';$('ovBody').textContent=o.body||'';$('ovBody').hidden=!o.body;$('ovKeys').textContent=o.keys||'';$('ovKeys').hidden=!o.keys;
  const cd=$('ovCards');cd.textContent='';cd.hidden=!o.cards;
  (o.cards||[]).forEach(c=>{const e=document.createElement('button');e.type='button';
    for(const[tag,txt]of[['b',c.title],['small',c.sub],['span',c.body]]){const x=document.createElement(tag);x.textContent=txt;e.appendChild(x)}
    if(c.col)e.children[1].style.color=c.col;
    e.onclick=()=>{audio();sfx(520,.1,'triangle',.2,780);haptic(20);c.fn()};cd.appendChild(e)});
  const b=$('ovBtns');b.textContent='';b.hidden=!o.btns;
  (o.btns||[]).forEach(([label,fn],i)=>{const e=document.createElement('button');e.type='button';e.textContent=label;if(!i)e.className='primary';e.onclick=()=>{audio();sfx(440,.06,'triangle',.18,660);haptic(10);fn()};b.appendChild(e)});
  $('ovPanel').className='panel'+(o.wide?' wide':'');
  $('ov').className=o.soft?'soft':'';$('ov').hidden=false;
}
function hud(){
  const nb=Object.values(S.b).reduce((a,b)=>a+b,0),cn=()=>S.adv?CLASSES[S.cls].adv.find(a=>a[0]===S.adv)[1]:CLASSES[S.cls].name;
  S.rank=rank();tune();
  const chips=act2()&&S.cls?[['Rank '+S.rank,true],[cn(),true],...CLASSES[S.cls].pows.map((p,i)=>[p[0],pw(i+1)]),...(nb?[[nb+(nb>1?' boons':' boon'),true]]:[])]:PARTS.map(p=>[p.name,has(p.id)]);
  $('ledger').textContent='';chips.forEach(([name,on])=>{const li=document.createElement('li');li.textContent=name;if(on)li.className='on';$('ledger').appendChild(li)});
  if(act2()&&S.cls&&S.eq)for(const sl of SLOTS){const it=S.eq[sl],li=document.createElement('li');li.textContent=itemName(it);li.title=it.rarity+' '+sl+': '+itemLine(it);li.style.cssText='opacity:1;color:'+RAR[it.r][1]+';border-color:'+RAR[it.r][1];$('ledger').appendChild(li)}
  const hp=$('hp');hp.textContent='';
  if(!P)return;
  if(has('touch')){for(let i=0;i<P.maxHp;i++){const e=document.createElement('i');if(i>=P.hp)e.className='off';hp.appendChild(e)}hp.setAttribute('aria-label',P.hp+' of '+P.maxHp+' health')}
  else{const e=document.createElement('em');e.textContent='Numb. No nerves to feel wounds with. You rattle when you are close to breaking.';hp.appendChild(e)}
  $('bDash').disabled=!has('organs');$('bDash').textContent=cls()==='mage'?'Blink':'Dash';
  syncSkills();
}
function freshBody(){
  const c=cls(),maxHp=4+(has('organs')?3:0)+(has('skin')?3:0)+(c?CLASSES[c].hp+3*S.b.vigor:0)+(c==='tank'&&pw(3)?4:0)+(c&&adv('hp')||0)+(c?eqv('hp'):0);
  P={x:W/2,y:H-120,face:-Math.PI/2,hp:maxHp,maxHp,inv:0,atk:0,cd:0,dashCd:0,dashT:0,dx:0,dy:0,walk:0,regen:0,swing:0,moving:false,skCd:0,skCds:[0,0,0,0],cdS:Array(10).fill(0),mxS:Array(10).fill(0),rageT:0,guardT:0,legT:0,fleetT:0,stoneT:0,stormT:0,stormK:0,fireT:0,fireK:0,renewT:0,renewK:0,quakeN:0,cutN:0,starN:0,rushD:0,shield:c==='tank'&&S.adv!=='berserker',shT:0,sumT:3,lc:0,amb:0,saved:false};
}
function startLevel(n){
  if(n>=8&&S.cls&&!S.eq)S.eq=basicSet(S.cls);eqSync();
  S.level=n;S.mode='play';S.banner=2.8;S.shake=0;S.stop=0;const L=S.L=levelDef(n);freshBody();
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];bits=[];rings=[];floats=[];morsels=[];S.elite=4;
  S.paused=false;SND.levelStart();boss=spawn(L.kind,W/2,140,true,L.spec);boss.t=1.2;
  if(L.kind==='mimic')reshuffle();
  if(S.adv==='beastmaster')allies.push(ally('wolf'));
  $('bossName').textContent=L.spec.name;
  $('ov').hidden=true;save(n);hud();$('lvl').textContent='Level '+(n+1)+' · '+L.title+(S.rank?' · Rank '+S.rank:'');
}
function reward(){
  haptic([40,60,40,60,140]);chime();const n=S.level,r0=rank(n);allies=[];
  if(n===7)return chooseClass();
  P.inv=0;S.level++;S.mode='reward';hud();
  const up=S.rank&&S.rank!==r0,rk=up?'Rank up. You have climbed from rank '+r0+' to rank '+S.rank+'.':'';
  if(up){SND.rankUp();setTimeout(()=>haptic([30,50,30,50,30,50,200]),500)}
  if(n>=8&&S.cls)return dropScreen(n,rk,()=>newSkill(n,()=>reward2(n)));
  reward2(n);
}
// a level that teaches a skill says so; with more than four known you choose which four to carry
function newSkill(n,next){
  const k=known(),si=k-1;if(k<=known(n)||n<10)return next(); // the skills of levels 10 and 11 are announced by the power-up screens
  const sk=CLASSES[S.cls].skills[si],free=S.load.findIndex(v=>v>=k-1&&v!==si); // a slot still holding a skill not learned yet
  if(k<=4&&!S.load.includes(si)&&free>=0)S.load[free]=si;
  show({soft:true,kick:'New skill · level '+sk.level,title:sk.name,body:sk.text,keys:k>4?'You know '+k+' skills and carry four. You can change them now, or later from the pause screen.':'',btns:k>4?[['Choose my four',()=>loadout(next,si)],['Keep my four',next]]:[['Go on',next]]});
}
function loadout(done,fresh){
  const c=CLASSES[S.cls],k=known(),again=()=>{syncSkills();loadout(done,fresh)};
  show({wide:true,kick:'Skills · '+c.name,title:'Choose your four',body:'You carry four skills, on keys 1 to 4. Pick a skill you are not carrying to swap it in.',
    cards:c.skills.slice(0,k).map((sk,i)=>{const slot=S.load.indexOf(i);return{title:sk.name,sub:slot>=0?'Carried · key '+(slot+1):i===fresh?'New · not carried':'Not carried',col:slot>=0?'':'#958ea3',body:sk.text,
      fn:slot>=0?again:()=>show({wide:true,kick:'Carry '+sk.name,title:'In place of which?',cards:S.load.map((v,j)=>({title:c.skills[v].name,sub:'Key '+(j+1),body:c.skills[v].text,fn:()=>{S.load[j]=i;if(S.mode!=='reward')save(S.level);again()}})),btns:[['Back',again]]})}}),
    btns:[['Done',done]]});
}
// every boss from level 9 on drops one item for your class: melt it into what you carry, wear it instead, or break it for scrap
function dropScreen(n,rk,next){
  if(!S.eq)S.eq=basicSet(S.cls);
  const d=dropItem(n),cur=S.eq[d.slot],after={...cur,lvl:cur.lvl+1,up:cur.up+RAR[d.r][3]},go=f=>()=>{f();eqSync();hud();next()};
  show({wide:true,col:RAR[d.r][1],kick:S.L.spec.name+' dropped a '+d.rarity+' '+d.slot,title:d.name,body:itemLine(d)+'. You carry '+itemName(cur)+' ('+cur.rarity+'): '+itemLine(cur)+'.',keys:rk,cards:[
    {title:'Upgrade',sub:itemName(cur)+' to +'+after.lvl,col:RAR[cur.r][1],body:'Melt the drop into what you carry. A '+d.rarity+' drop adds '+Math.round(RAR[d.r][3]*100)+'% of its base stats. It becomes: '+itemLine(after)+'.',fn:go(()=>{S.eq[d.slot]=after})},
    {title:'Replace',sub:d.name,col:RAR[d.r][1],body:'Wear the drop instead. '+itemName(cur)+' is gone for good. You get: '+itemLine(d)+'.',fn:go(()=>{S.eq[d.slot]=d})},
    {title:'Destroy',sub:'Scrap',body:'Break it. Each item you scrap gives +1% damage for the rest of the run'+(S.scrap?' (so far +'+S.scrap+'%).':'.'),fn:go(()=>{S.scrap++})}]});
}
function reward2(n){
  if(n<7){const p=PARTS[n],lacks=PARTS.slice(n+1).map(x=>x.name.toLowerCase());
    return show({soft:true,kick:'You tore it free',title:p.name,body:p.text,keys:(n===0?(matchMedia('(pointer:coarse)').matches?'Tap Dash to dart the way you are moving. ':'Press Shift (or K) to dash the way you are moving. ')+'Nothing can hurt you mid-dash. ':'')+(lacks.length?'Still missing: '+lacks.join(', ')+'.':'Nothing is missing now. One thing is left to kill.'),btns:[['Go deeper',()=>startLevel(S.level)]]})}
  const c=CLASSES[S.cls];
  if(n<11){const p=c.pows[n-8],s2=c.skills[2],touch=matchMedia('(pointer:coarse)').matches;
    return show({soft:true,kick:'Power-up · '+c.name,title:p[0],body:p[1]+(n===8?' You also learn a third skill, '+s2.name+'. '+s2.text:''),keys:n===8?(touch?'Your skills each have their own button. It shows the seconds left while the skill recharges.':'Skills are on keys 1 to 4 (E, Q, R and F also work). The bar under the arena shows the seconds left while each recharges.'):n===9?(touch?'Your fourth skill button is live. More skills come at levels '+SKLV.slice(4).join(', ')+'.':'Your fourth skill is on key 4 (or F). More skills come at levels '+SKLV.slice(4).join(', ')+'.'):'',btns:[['Go on',()=>startLevel(S.level)]]})}
  if(n>=49&&!S.adv)return show({wide:true,kick:'Fifty levels. Your class has more to give.',title:'Choose your path',body:'This lasts for the rest of the run.',
    cards:c.adv.map(([id,name,sub,text])=>({title:name,sub,body:text,fn:()=>{S.adv=id;startLevel(S.level)}}))});
  const pool=BOONS.filter(b=>S.b[b.id]<(b.id==='spec'?c.boon[2]:b.cap||99));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  show({wide:true,kick:n===11?'The Flayed King is dead. The road goes on.':'Level '+(n+1)+' cleared',title:'Choose a boon',
    cards:pool.slice(0,3).map(b=>{const[name,text]=b.id==='spec'?c.boon:[b.name,b.text];return{title:name,sub:S.b[b.id]?'You have '+S.b[b.id]:'New',body:text,fn:()=>{S.b[b.id]++;startLevel(S.level)}}})});
}
function chooseClass(){
  S.mode='reward';S.level=8;S.cls=null;S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=[0,1,2,3];eqSync();allies=[];if(P)P.inv=0;$('lvl').textContent='Out of the crypt';hud();
  show({wide:true,kick:'You are whole. You walk out of the crypt as a person.',title:'Choose who you become',body:'You start with the basic equipment of your class and its first two skills. Eight more are learned as you climb, each with its own cooldown, and you carry four at a time. After level 50 the class can be upgraded.',
    cards:Object.entries(CLASSES).map(([id,c])=>({title:c.name,sub:c.gear,body:c.text+' First skills: '+c.skills[0].name+', '+c.skills[1].name+'.',fn:()=>{S.cls=id;S.eq=basicSet(id);S.load=[0,1,2,3];startLevel(8)}}))});
}
function pauseShow(){
  const btns=[['Resume',()=>pause(false)]];if(known()>4)btns.push(['Skills',()=>loadout(pauseShow)]);
  show({kick:'Paused · level '+(S.level+1)+(S.rank?' · rank '+S.rank:''),title:'Catch your breath',body:S.L.spec.name+' is waiting.'+(act2()&&S.eq?' You carry '+SLOTS.map(sl=>itemName(S.eq[sl])+' ('+itemLine(S.eq[sl])+')').join('; ')+'.':''),keys:matchMedia('(pointer:coarse)').matches?'':'Esc or P to go on.',btns});
}
function pause(on){
  if(on){if(S.paused||S.mode!=='play'&&S.mode!=='clear')return;S.paused=true;for(const k in keys)keys[k]=false;joy.x=joy.y=0;SND.pause(true);pauseShow()}
  else if(S.paused){S.paused=false;$('ov').hidden=true;SND.pause(false);syncSkills()}
  const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed',S.paused);
}
function save(n){const eq=S.eq&&{};if(eq)for(const sl of SLOTS)eq[sl]={r:S.eq[sl].r,lvl:S.eq[sl].lvl,up:S.eq[sl].up};pref('level',n);pref('run',JSON.stringify({cls:S.cls,adv:S.adv,b:S.b,eq,scrap:S.scrap,load:S.load}))}
function title(saved){
  S.mode='title';S.level=0;freshBody();P.y=H/2+40;mons=[];allies=[];boss=null;hud();
  const btns=[['Rise',()=>{S.cls=null;S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=[0,1,2,3];startLevel(0)}]];
  if(saved>0)btns.unshift(['Continue at level '+(saved+1),()=>saved>=8&&!CLASSES[S.cls]?chooseClass():startLevel(saved)]);
  show({kick:'Bones first. Legend later.',title:'You wake as bare bones',body:'Each monster you kill gives part of a body back: organs, then skin, then the five senses. Once you are whole you choose a class. Every level after that makes it stronger, and after level 50 it can be upgraded.',keys:matchMedia('(pointer:coarse)').matches?'Stick to move. Strike aims at the nearest monster.':'WASD or arrows to move. Space or click to strike. Esc or P to pause.',btns});
}

/* ---------- input ---------- */
const KEY={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'atk',j:'atk',Shift:'dash',k:'dash',e:'sk0',l:'sk0','1':'sk0',q:'sk1','2':'sk1',r:'sk2','3':'sk2',f:'sk3','4':'sk3'};
addEventListener('keydown',e=>{
  const k=KEY[e.key.length===1?e.key.toLowerCase():e.key];
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&!e.repeat&&(S.paused||S.mode==='play'||S.mode==='clear')){e.preventDefault();pause(!S.paused);return}
  if(e.key==='Enter'&&!$('ov').hidden){$('ovBtns').querySelector('button')?.click();return}
  if(!k||e.target.tagName==='BUTTON'&&k==='atk'&&!$('ov').hidden)return;
  if(S.mode==='play'||S.mode==='clear')e.preventDefault();
  if(S.paused)return;
  if(k==='atk'&&!e.repeat)want.atk=true;if(k==='dash'&&!e.repeat)want.dash=true;if(k[0]==='s'&&k[1]==='k'){if(!e.repeat)want.sk[+k[2]]=true;return}keys[k]=true;
});
addEventListener('keyup',e=>{const k=KEY[e.key.length===1?e.key.toLowerCase():e.key];if(k)keys[k]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
cv.addEventListener('pointerdown',e=>{if(S.mode!=='play'||S.paused)return;const r=cv.getBoundingClientRect(),R=MB.renderer;want.atk=true;want.pt=R&&R.ok&&R.screenToGame?R.screenToGame(e.clientX,e.clientY):{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};e.preventDefault()});
const pad=$('pad'),knob=$('knob');
function padMove(e){const r=pad.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/40,y=(e.clientY-r.top-r.height/2)/40;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joy.x=x;joy.y=y;knob.style.transform=`translate(${x*34}px,${y*34}px)`}
pad.addEventListener('pointerdown',e=>{pad.setPointerCapture(e.pointerId);padMove(e)});
pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))padMove(e)});
const padUp=()=>{joy.x=joy.y=0;knob.style.transform=''};pad.addEventListener('pointerup',padUp);pad.addEventListener('pointercancel',padUp);
$('bAtk').addEventListener('pointerdown',e=>{want.atk=true;keys.atk=true;e.preventDefault()});
for(const ev of['pointerup','pointercancel','pointerleave'])$('bAtk').addEventListener(ev,()=>keys.atk=false);
$('bDash').addEventListener('pointerdown',e=>{want.dash=true;e.preventDefault()});
// Four skill buttons (touch) and a skill bar under the vitals (keyboard). Both show the skill's name and the seconds left; MB.skills carries the same data.
// The touch cluster becomes a 3 x 2 grid: skills 1-4 in the left two columns, Dash above Strike on the right.
const skB=[$('bSkill')],skL=[],skBar=document.createElement('ul');
{const acts=$('bSkill').parentNode;for(let i=1;i<4;i++){const b=document.createElement('button');b.type='button';b.id='bSkill'+(i+1);b.hidden=true;acts.appendChild(b);skB.push(b)}
  skBar.id='skillBar';skBar.hidden=true;skBar.setAttribute('aria-label','Skills');
  skB.forEach((b,i)=>{b.classList.add('sk');b.textContent='';for(const k of['n','c']){const e=document.createElement('span');e.className=k;b.appendChild(e)}
    b.addEventListener('pointerdown',e=>{want.sk[i]=true;e.preventDefault()});
    const li=document.createElement('li'),kb=document.createElement('kbd');kb.textContent=i+1;li.appendChild(kb);for(const k of['n','c']){const e=document.createElement('span');e.className=k;li.appendChild(e)}skBar.appendChild(li);skL.push(li)});
  document.querySelector('.vitals').after(skBar);
  const st=document.createElement('style');st.id='mbSkillCss';st.textContent=`
.touch .acts{display:grid;grid-template-columns:64px 64px 84px;grid-template-rows:64px 84px;gap:10px;max-width:none}
.touch .acts button{width:auto;height:auto;min-width:0;padding:2px}
#bSkill{grid-area:1/1}#bSkill2{grid-area:1/2}#bSkill3{grid-area:2/1}#bSkill4{grid-area:2/2}
#bDash{grid-area:1/3;border-radius:32px}#bAtk{grid-area:2/3}
.touch .acts button.sk{border-radius:14px;font-size:.66rem;line-height:1.05;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden;align-self:center;height:64px;background:linear-gradient(to top,var(--stone-2) calc(var(--cd,0)*100%),var(--stone) 0)}
.touch .acts button.sk:not(:disabled){border-color:var(--marrow)}
.sk .c,#skillBar .c{color:var(--marrow);font-weight:600;font-variant-numeric:tabular-nums}
.sk .c{font-size:.95rem}.sk .c:empty{display:none}
#skillBar{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
#skillBar li{flex:1 1 150px;display:flex;align-items:center;gap:8px;padding:4px 10px;border:1px solid var(--stone-2);font-size:.88rem;color:var(--ash);background:linear-gradient(to right,var(--stone-2) calc(var(--cd,0)*100%),transparent 0)}
#skillBar li.ready{border-color:var(--marrow);color:var(--bone)}#skillBar li.locked{opacity:.45}
#skillBar .c{margin-left:auto}
@media (pointer:coarse){#skillBar{display:none}}
@media (orientation:landscape) and (pointer:coarse) and (max-height:600px){.touch .acts{grid-template-columns:58px 58px 76px;grid-template-rows:58px 76px;gap:8px;max-width:none}.touch .acts button{width:auto;height:auto}.touch .acts button.sk{height:58px;font-size:.6rem}.sk .c{font-size:.85rem}}`;document.head.appendChild(st)}
let skShown=null;const skKey=['','','',''],skF=[-1,-1,-1,-1];
function skillUi(){
  const on=!!cls()&&S.mode!=='title';if(on!==skShown){skShown=on;skBar.hidden=!on;for(const b of skB)b.hidden=!on}
  if(!on)return;
  for(let i=0;i<4;i++){const s=SK[i],txt=!s.unlocked?'Lv '+SKLV[S.load[i]]:s.cd>0?(s.cd<10?s.cd.toFixed(1):''+Math.ceil(s.cd)):'',key=s.name+'|'+txt+'|'+s.unlocked;
    if(key!==skKey[i]){skKey[i]=key;const b=skB[i],li=skL[i];b.children[0].textContent=li.children[1].textContent=s.name;b.children[1].textContent=txt;li.children[2].textContent=txt||'ready';
      b.disabled=!s.ready;li.className=s.ready?'ready':s.unlocked?'':'locked';b.setAttribute('aria-label',s.name+(s.unlocked?s.cd>0?', '+txt+' seconds':', ready':', locked'))}
    const f=s.unlocked&&s.max?Math.ceil(s.cd/s.max*40)/40:0;if(f!==skF[i]){skF[i]=f;skB[i].style.setProperty('--cd',f);skL[i].style.setProperty('--cd',f)}}
}
$('snd').onclick=()=>{audio();muted=!muted;$('snd').setAttribute('aria-pressed',!muted);pref('mute',muted?1:0);bedLevel();sfx(520,.08,'triangle',.2);$('snd').blur()};
$('hap').onclick=()=>{hapOn=!hapOn;$('hap').setAttribute('aria-pressed',hapOn);pref('nohap',hapOn?0:1);haptic(40);$('hap').blur()};
// a pause button beside the toggles, for touch screens
{const pb=document.createElement('button');pb.id='pauseB';pb.type='button';pb.className='tog';pb.textContent='Pause';pb.setAttribute('aria-pressed','false');pb.onclick=()=>{audio();pause(!S.paused);pb.blur()};$('hap').after(pb);
  const st=document.createElement('style');st.textContent='#pauseB[aria-pressed="false"]{opacity:1;text-decoration:none}';document.head.appendChild(st)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause(true);if(AC)try{AC.suspend()}catch(e){}}else if(AC&&!muted)try{AC.resume()}catch(e){}});

/* ---------- boot ---------- */
// Shared interface for the 3D renderer and model files. Arrays are reassigned by the game, so read them through these getters every frame.
window.MB={W,H,WALL,FOG,TAU,S,SPEC,CLASSES,PARTS,LEVELS,has,cls,pw,act2,melee,levelDef,col,cv,ctx,draw2d:draw,renderer:null,rank,pause,skills:SK,RAR,get equip(){return S.eq||{weapon:null,armor:null,trinket:null}},get fields(){return fields},
  get P(){return P},get mons(){return mons},get shots(){return shots},get pshots(){return pshots},get allies(){return allies},get zones(){return zones},
  get bits(){return bits},get rings(){return rings},get floats(){return floats},get morsels(){return morsels},get boss(){return boss}};
let last=0;
let fast=1;
function tick(dt){if(S.paused){S.t+=dt;return}if(S.stop>0)S.stop-=dt;else step(dt)}
function frame(ts){const dt=Math.min(.033,(ts-last)/1000||0);last=ts;for(let i=0;i<fast;i++)tick(dt);skillUi();
  const R=MB.renderer;
  if(R&&R.ok){try{R.draw(dt)}catch(e){console.error('3D renderer failed, falling back to 2D',e);R.ok=false;if(R.dispose)try{R.dispose()}catch(_){}}}
  else draw();
  if(boss)$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';requestAnimationFrame(frame)}
function start(data){
  let saved=0;const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  try{saved=Math.min(9998,Math.max(0,Math.floor(+localStorage.getItem('marrowborn.level'))||0));muted=localStorage.getItem('marrowborn.mute')==='1';hapOn=localStorage.getItem('marrowborn.nohap')!=='1'}catch(e){}
  // a damaged or hand-edited save must not be able to break the run
  try{const r=JSON.parse(localStorage.getItem('marrowborn.run')||'{}')||{};
    S.cls=typeof r.cls==='string'&&own(CLASSES,r.cls)?r.cls:null;S.adv=S.cls&&CLASSES[S.cls].adv.some(a=>a[0]===r.adv)?r.adv:null;
    const b=noBoons();if(S.cls&&r.b&&typeof r.b==='object')for(const k in b){const v=Math.floor(+r.b[k]);if(v>0)b[k]=Math.min(v,k==='spec'?CLASSES[S.cls].boon[2]:BOONS.find(x=>x.id===k).cap||999)}S.b=b;
    S.load=okLoad(r.load)?r.load.slice():[0,1,2,3]; // older saves carry the first four skills
    // older saves have no equipment: they get the basic set
    S.eq=null;S.scrap=0;if(S.cls){S.eq=basicSet(S.cls);S.scrap=Math.min(999,Math.max(0,Math.floor(+r.scrap)||0));if(r.eq&&typeof r.eq==='object')for(const sl of SLOTS){const e=r.eq[sl];if(e&&typeof e==='object'){const q=Math.floor(+e.r),lv=Math.floor(+e.lvl),u=+e.up;if(q>=0&&q<=3)S.eq[sl]=item(S.cls,sl,q,lv>0?Math.min(lv,999):0,u>0?Math.min(u,400):0)}}}
  }catch(e){S.cls=S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=[0,1,2,3]}
  eqSync();
  $('snd').setAttribute('aria-pressed',!muted);$('hap').setAttribute('aria-pressed',hapOn);
  if(data&&data.level>0)saved=Math.floor(data.level);
  title(saved);requestAnimationFrame(frame);
}
if(location.hash.startsWith('#dev'))window.__mb={S,keys,want,step:tick,get fast(){return fast},set fast(v){fast=Math.max(1,v|0)},start:(n,r)=>{r=r||{};S.cls=r.cls||null;S.adv=r.adv||null;S.b=Object.assign(noBoons(),r.b);S.scrap=0;S.eq=S.cls?basicSet(S.cls):null;S.load=okLoad(r.load)?r.load.slice():[0,1,2,3];
    // gear:true plays out the drops of every level cleared so far with a sensible policy: wear anything rarer, otherwise melt it in
    if(S.cls&&r.gear)for(let k=8;k<n;k++){const d=dropItem(k),cur=S.eq[d.slot];if(d.r>cur.r&&cur.up<(d.r-cur.r)*.9)S.eq[d.slot]=d;else{cur.lvl++;cur.up+=RAR[d.r][3]}}
    startLevel(n)},kill:()=>boss&&mons.includes(boss)&&hurtM(boss,1e9),skill:si=>skill(si),reward,loadout,dropScreen};
window.claude?.hot?.snapshot?.(()=>({level:S.mode==='title'?0:S.level}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
})();
