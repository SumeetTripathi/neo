(() => {
const W=960,H=600,DPR=2,WALL=28,FOG=175,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');cv.width=W*DPR;cv.height=H*DPR;
const fogC=document.createElement('canvas');fogC.width=W;fogC.height=H;const fctx=fogC.getContext('2d');
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=Math.random;
// Safari before 16 has no roundRect on a 2D context; the 2D fallback draws the body with it
if(typeof CanvasRenderingContext2D!=='undefined'&&!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
  r=Math.max(0,Math.min(typeof r==='number'?r:Array.isArray(r)?+r[0]||0:0,Math.abs(w)/2,Math.abs(h)/2));
  this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this};

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
 {title:'The Throne',boss:'king',hint:'The first tyrant. Everything you are, against everything it kept.'},
 {title:'The Pass',boss:'wyrm',hint:'Faster than the last thing that dug.'},
 {title:'The Mire',boss:'lich',hint:'It calls mites while it casts.'},
];
// Every tenth level is a boss level: the Flayed King on level 10, a tyrant on 20, 30, 40... Only those have high health and fight in three phases (and the Hollow, the end of the crypt, in a small way).
// Every other level is a short, sharp fight: modest health, heavy blows.
const tenth=n=>(n+1)%10===0;
const CLASSES={
 fighter:{name:'Fighter',gear:'Greatsword, headband',hp:5,text:'A fast, heavy blade, no defence but your feet, and wounds that close a little faster than most. 15 health. Bosses you kill teach you a technique.',pows:[
  ['Cleave','Your swing becomes a full circle with a longer reach.'],
  ['Whirlwind','A new skill. Spin and hit everything around you hard.'],
  ['Bloodrush','Hit 25% harder and swing 15% faster.']]},
 assassin:{name:'Assassin',gear:'Twin daggers, mask',hp:0,text:'The fastest strikes and the shortest dash cooldown. Your first strike after a dash hits triple. 10 health. Bosses you kill can be distilled into venom.',pows:[
  ['Twin Fangs','Every strike lands twice. The second cut does 60% of the first.'],
  ['Shadowstep','A new skill. Appear behind the nearest monster and stab it for heavy damage.'],
  ['Vanish','Your dash recharges almost twice as fast.']]},
 healer:{name:'Healer',gear:'Sun staff, white robe',hp:2,text:'Orbs of light at range, and your wounds close every 4 seconds instead of every 7. 12 health. A boss you kill can be called back as a guardian.',pows:[
  ['Sanctuary','Your wounds close every 2.5 seconds.'],
  ['Mend','A new skill. Heal 5 health at once and throw back everything near you.'],
  ['Smite','Your orbs hit 60% harder.']]},
 tank:{name:'Tank',gear:'Sword, shield, plate',hp:6,text:'16 health and a heavy sword that hits twice as hard. Your shield blocks one hit every 6 seconds, and a blocked hit gives back some mana. Slowest on foot. Bosses you kill leave you a ward.',pows:[
  ['Bulwark','Your shield recharges in 3.5 seconds, and a blocked hit throws a shockwave that hurts everything near you.'],
  ['Earthsplitter','A new skill. Slam the ground to hit everything around you hard and wipe out nearby bolts.'],
  ['Iron Heart','4 more health, your wounds close twice as fast, and you hit 25% harder.']]},
 mage:{name:'Mage',gear:'Staff, robe, hat',hp:0,text:'Arcane bolts that strike from across the room. Your dash becomes a blink that jumps you through danger. 10 health, and the deepest mana. Bosses you kill can be shaped into familiars, each held with a share of your mana.',pows:[
  ['Forked Bolt','Every cast throws three bolts in a spread.'],
  ['Nova','A new skill. A ring of bolts bursts out of you and erases enemy bolts nearby.'],
  ['Arcane Lance','Your bolts pass straight through everything they hit.']]},
 ranger:{name:'Ranger',gear:'Bow, hood, quiver',hp:2,text:'Fast arrows at long range, and quick feet. 12 health. Bosses you kill can be carved into arrowheads.',pows:[
  ['Quickdraw','You loose arrows much faster.'],
  ['Volley','A new skill. Loose a fan of seven arrows at once.'],
  ['Longshot','Arrows that fly more than a few strides hit for double.']]},
 necro:{name:'Necromancer',gear:'Skull staff, grave robe',hp:1,text:'Bone spears at range, and the dead fight for you: a thrall rises every 6 seconds, up to two, and costs nothing. Bosses you kill can be bound to fight for you, each held with a share of your mana. 11 health.',pows:[
  ['Grave Call','Thralls rise every 4 seconds, and you can hold four.'],
  ['Army of Bones','A new skill. Four extra thralls claw out of the ground at once.'],
  ['Soul Leech','Every tenth hit by you or your thralls heals you a little.']]},
};
// per class: a stacking boon [name, text, cap] and the two upgrades offered after level 50
const EXTRA={
 fighter:{boon:['Fury','Swing 8% faster.',5],adv:[['champion','Champion','Raw power','Hit 50% harder and gain 6 health.'],['duelist','Duelist','Footwork','Swing 50% faster and move 15% faster.']]},
 assassin:{boon:['Ambush','Your strike after a dash hits even harder.',5],adv:[['nightblade','Nightblade','Sharper','Every strike hits 60% harder.'],['phantom','Phantom','Unseen','Shadowstep recharges more than twice as fast and costs half the mana, and you move 10% faster.']]},
 healer:{boon:['Grace','You mend 12% faster.',5],adv:[['saint','Saint','Second life','Once per level, a killing blow leaves you standing at half health. Your mana comes back a quarter faster.'],['inquisitor','Inquisitor','Judgement','Orbs pass through everything and hit 60% harder.']]},
 tank:{boon:['Rampart','Your shield recharges 15% faster.',5],adv:[['paladin','Paladin','Holy shield','Every blocked hit heals a tenth of your health and gives back twice the mana, and your shield recharges much faster.'],['berserker','Berserker','No shield','You throw the shield away. Swing 60% faster and hit 50% harder.']]},
 mage:{boon:['Split','One more bolt in every cast.',4],adv:[['archmage','Archmage','Mastery','Two more bolts in every cast, your skills recharge twice as fast and cost a fifth less mana, and each familiar holds less of your mana.'],['pyromancer','Pyromancer','Fire','Bolts explode on impact and burn everything near the target.']]},
 ranger:{boon:['Barbs','Arrows pass through one more enemy.',5],adv:[['sharpshooter','Sharpshooter','Precision','Arrows pass through everything and hit 75% harder.'],['beastmaster','Beastmaster','A wolf','A wolf fights beside you in every level, never tires and costs nothing. Bosses you kill can be tamed and fight for you as well, as many as your mana can hold, and a tamed beast holds a fifth less mana than a bound one. Arrowheads you have carved become tamed beasts.']]},
 necro:{boon:['Legion','One more thrall at your side, and your bound pets hit 4% harder.',5],adv:[['lich','Lich','Undeath','Three more thralls, your thralls no longer crumble with time, and your bound pets have 40% more health and hold less of your mana.'],['reaper','Reaper','Harvest','Bone spears pass through everything and hit twice as hard. So do your thralls and your bound pets.']]},
};
for(const k in EXTRA)Object.assign(CLASSES[k],EXTRA[k]);
// Ten active skills per class, six carried at a time. Each row: [id, name, cooldown in seconds, text, effects, needs, mana cost (filled in from MCOST below)].
// Effects are small shared building blocks run in order by cast() (see there for the arguments); damage numbers are multiples of your damage multiplier.
// needs: 't' a monster above ground, 'near' one within reach, 'thrall' at least one thrall. A skill that cannot be used keeps its cooldown and its mana.
const SKILLS={
 fighter:[
  ['whirlwind','Whirlwind',5,'Spin and hit everything around you hard.',[['shock',115,3]]],
  ['lunge','Lunge',7,'Drive straight through your target and hit everything in the way. Nothing can hurt you while you move.',[['rush',4,0]]],
  ['warcry','War Cry',14,'For 5 seconds you hit 40% harder and swing 25% faster.',[['buff','rageT',5],['ring',90]]],
  ['rend','Rend',10,'One huge blow on the nearest monster in reach. It is slowed for 3 seconds.',[['hit',7,{slow:3}]],'near'],
  ['secondwind','Second Wind',22,'Heal a quarter of your health and shrug off everything for a second.',[['heal',.25],['buff','inv',1]]],
  ['bladestorm','Bladestorm',45,'Ultimate. For 4 seconds you are a storm of steel, hitting everything around you again and again while you move freely.',[['buff','stormT',4]]],
  ['breaker','Ground Breaker',11,'Crack the ground under your target. It bursts a moment later and hits very hard.',[['blast','at',100,.5,8]]],
  ['ironskin','Iron Skin',18,'For 5 seconds every hit on you does half damage.',[['buff','stoneT',5],['ring',60]]],
  ['hurl','Blade Hurl',8,'Throw your blade. It passes through everything in its path and hits hard.',[['fan',1,0,640,5,8,'bolt',99]]],
  ['challenge','Challenge',16,'Roar a challenge. Every monster near you is dragged closer and stunned for a moment.',[['pull',340],['near',340,{stun:1.2}],['ring',340]]]],
 tank:[
  ['earthsplitter','Earthsplitter',5,'Slam the ground to hit everything around you hard and wipe out nearby bolts.',[['shock',125,4]]],
  ['charge','Shield Charge',7,'Rush forward behind your shield, hitting and stunning whatever is in the way.',[['rush',3,1]]],
  ['bastion','Bastion',14,'For 3 seconds every hit is blocked and thrown back as a shockwave.',[['buff','guardT',3],['shield'],['ring',60]]],
  ['throw','Hammer Throw',6,'Hurl a hammer that passes through everything, hits hard and stuns.',[['fan',1,0,560,4,8,'bolt',99,{stun:1}]]],
  ['rally','Rally',22,'Heal a third of your health and raise your shield at once.',[['heal',.34],['shield']]],
  ['cataclysm','Cataclysm',42,'Ultimate. Three shockwaves roll out of you, each wider than the last.',[['shock',130,4],['seq','quake']]],
  ['stoneskin','Stone Skin',18,'For 6 seconds every hit on you does half damage.',[['buff','stoneT',6],['ring',60]]],
  ['tremor','Tremor',8,'Send a tremor toward your target: three bursts in a line, each hitting hard.',[['line',3,90,70,5]]],
  ['banner','War Banner',25,'Plant a banner for 8 seconds. It mends you while you stand near it and burns monsters near it.',[['field','halo','self',130,8,.5,1,false]]],
  ['leapslam','Leap Slam',10,'Leap onto your target and slam the ground around it.',[['tele'],['shock',130,5]],'t']],
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
  ['mend','Mend',10,'Heal a third of your health at once and throw a shockwave at everything near you.',[['heal',.34],['shock',100,2]]],
  ['flash','Blinding Light',12,'Stun every monster near you and burn away nearby bolts.',[['near',220,{stun:1.2}],['clear',220],['ring',220]]],
  ['halo','Hallowed Ground',15,'Bless the ground around you for 5 seconds. It mends you and burns monsters that stand on it.',[['field','halo','self',120,5,.5,1,false]]],
  ['renew','Renewal',24,'Mend a little health every second for 8 seconds, about a third of your health in all.',[['buff','renewT',8]]],
  ['wrath','Wrath of the Sun',55,'Ultimate. Heal to full and scorch everything in a huge ring around you.',[['heal',1],['shock',260,10]]],
  ['aegis','Aegis',20,'Nothing can hurt you for 2.5 seconds.',[['buff','inv',2.5],['ring',50]]],
  ['radiance','Radiance',9,'Ten orbs of light burst out of you in a ring.',[['ringp',10,420,2,5,'orb',0]]],
  ['judgement','Judgement',14,'A pillar of light falls on your target after a moment and hits very hard.',[['blast','at',90,.7,9]]],
  ['purify','Purify',12,'Erase every enemy bolt in the room and heal a tenth of your health.',[['clear',9999],['heal',.1],['ring',300]]]],
 necro:[
  ['army','Army of Bones',9,'Four extra thralls claw out of the ground at once and fight for 9 seconds.',[['army']]],
  ['drain','Soul Drain',8,'Tear life out of the nearest monster at any range. It is hurt and you heal a tenth of your health.',[['beam'],['heal',.1],['hit',3,{}]],'t'],
  ['grasp','Grave Grasp',9,'Dead hands seize your target. It takes heavy damage and cannot act for a moment.',[['hit',3,{stun:1.2}],['ringT',30]],'t'],
  ['burst','Bone Burst',10,'Your thralls explode and hurt everything near them. New ones rise in time.',[['burst']],'thrall'],
  ['plague','Plague',16,'Every monster near you sickens and keeps taking damage for 6 seconds.',[['near',260,{dot:.6}],['ring',260]]],
  ['legion','The Legion Rises',60,'Ultimate. Six thralls rise for 6 seconds, and every thrall hits 50% harder while they last.',[['buff','legT',6],['summon','thrall',6,6]]],
  ['spears','Bone Volley',7,'Five bone spears in a fan. Each passes through everything.',[['fan',5,.14,420,2,5,'skull',99]]],
  ['shroud','Death Shroud',20,'For 6 seconds every hit on you does half damage.',[['buff','stoneT',6],['ring',60]]],
  ['pit','Grave Pit',12,'Open a pit under your target for 4 seconds. Monsters in it are slowed and hurt.',[['field','frost','at',100,4,.5,1,true]]],
  ['pact','Dark Pact',25,'Unmake your thralls. Each one heals a tenth of your health, up to half.',[['pact']],'thrall']],
};
const SKLV=[9,9,10,11,15,20,25,30,36,42]; // the level at which each skill is learned
/* ---------- mana: what skills are paid with, from the day you have a class ---------- */
// MANA0: the pool of each class. MCOST: what each skill costs, in the order of SKILLS (it is copied onto the skill row as its seventh entry).
// Costs follow strength and the size of the class's pool: the quick skills are cheap, the ultimate takes about half a pool.
const MANA0={mage:140,healer:120,necro:120,ranger:100,assassin:100,fighter:90,tank:90};
const MCOST={
 fighter:[8,9,16,12,22,45,13,18,9,16],
 tank:[8,9,18,9,22,45,18,13,22,14],
 assassin:[8,9,18,14,20,48,16,16,13,20],
 mage:[14,12,20,24,30,60,26,18,18,20],
 ranger:[8,9,11,15,12,45,22,18,14,14],
 healer:[12,20,18,22,26,58,26,13,20,16],
 necro:[14,12,13,13,20,58,12,22,18,22],
};
// MREGEN: the share of your free mana that comes back each second, whatever you do. Standing still draws it in from the room: after STILL0 seconds without a step the flow starts to rise,
// and STILL1 seconds later it is MDRAW times the base. A step or a dash resets it. MKILL: the share of the pool a lesser kill gives back. MBLOCK: what a tank's blocked hit gives back.
const MREGEN=.05,MDRAW=2,STILL0=.3,STILL1=.7,MKILL=.03,MBLOCK=.08;
// The pool has no ceiling: MWELL more for every Wellspring boon (it can be taken any number of times) and MLEVEL more for every level cleared since you took a class, and a trinket's mana line multiplies all of it.
const MWELL=20,MLEVEL=2,MWELLR=.03,MWELLRMAX=.6;
// Skills cost a little more as the levels climb, so a deep pool does not make them free: MRISE of the listed cost per level past the ninth.
const MRISE=.007;
// Pets and familiars are held with mana: each one in the field keeps part of the pool locked away for as long as it is out. Held mana cannot be spent and does not refill.
// A familiar holds PCOST.familiar (PCROWN for a crowned one). A pet holds mana in proportion to its power (see the pets section: petCost). There is no other limit on how many go with you.
// A pet that falls rises again REVT seconds later beside you at REVHP of its health, paid from the free pool: a quarter more than it holds, and REVUP times more each time the same pet has to be raised again in one level.
const PCOST={pet:16,familiar:18},PCROWN={pet:28,familiar:30},REVT=4,REVHP=.5,REVUP=1.5;
// a skill's text says what it costs at the level you stand on (mana: the listed cost, before the rise)
const skText=(d,k,i)=>d[3]+' Cooldown: '+d[2]+' seconds. Mana: '+(S.cls===k&&S.level>=8?skCost(i):d[6])+'.';
for(const k in SKILLS){const c=CLASSES[k];SKILLS[k].forEach((d,i)=>{d[6]=MCOST[k][i]});c.mana=MANA0[k];c.skills=SKILLS[k].map((d,i)=>({id:d[0],name:d[1],cd:d[2],mana:d[6],get text(){return skText(d,k,i)},level:SKLV[i]}));
  c.pows[1]=[SKILLS[k][3][1],''];Object.defineProperty(c.pows[1],1,{get:()=>'A new skill. '+skText(SKILLS[k][3],k,3),enumerable:true})}
const SK=[0,1,2,3,4,5].map(i=>({id:'',name:'',key:''+(i+1),cd:0,max:0,ready:false,unlocked:false,index:-1,cost:0,affordable:false}));
// MB.mana: cur and max, regen (mana per second right now), reserved (held by pets or familiars), drawing (the standing bonus is flowing)
const MANA={cur:0,max:0,regen:0,reserved:0,drawing:false};
const known=(lv=S.level)=>S.cls&&lv>=8?SKLV.filter(l=>lv+1>=l).length:0;
const NSK=6,load0=()=>[0,1,2,3,4,5];
const okLoad=(l,n=NSK)=>Array.isArray(l)&&l.length===n&&l.every((v,i)=>Number.isInteger(v)&&v>=0&&v<10&&l.indexOf(v)===i);
// a loadout as carried now, or null. Saves from when four skills were carried get the next skills in line on slots 5 and 6.
const fixLoad=l=>{if(okLoad(l))return l.slice();if(!okLoad(l,4))return null;const out=l.slice();for(let v=0;out.length<NSK;v++)if(!out.includes(v))out.push(v);return out};

const BOONS=[
 {id:'might',name:'Might',text:'+20% damage with everything you do.'},
 {id:'haste',name:'Haste',text:'Attack 10% faster.',cap:8},
 {id:'vigor',name:'Vigor',text:'+3 maximum health.'},
 {id:'focus',name:'Focus',text:'Your skill recharges 12% faster.',cap:5},
 {id:'fleet',name:'Fleet',text:'Move 6% faster.',cap:5},
 {id:'well',name:'Wellspring',text:'+20 maximum mana, and mana comes back 3% faster (up to 60% faster). You can take this as often as it is offered.',cap:1e9},
 {id:'spec'},
];
const SPEC={
 crawler:{name:'Gravecrawler',r:24,hp:26,col:'#7c9a52',eyes:2,legs:8},
 hound:{name:'Bonehound',r:22,hp:30,col:'#c9c1a8',eyes:2,spikes:6},
 witch:{name:'Tallow Witch',r:20,hp:20,col:'#8566b8',eyes:2,hood:1},
 fist:{name:'Gravel Fist',r:32,hp:52,col:'#8f8474',eyes:1,spikes:4},
 mother:{name:'Brood Mother',r:34,hp:26,col:'#b3557a',eyes:5,pust:1},
 burrower:{name:'The Burrower',r:26,hp:17,col:'#c0823c',eyes:0,teeth:1},
 mimic:{name:'The Mimic',r:22,hp:17,col:'#3fa596',eyes:3,mask:1},
 hollow:{name:'The Hollow',r:38,hp:110,col:'#4a3a66',eyes:2,void:1,spikes:9},
 knight:{name:'Carrion Knight',ai:'hound',r:26,hp:115,col:'#7d8a99',eyes:2,spikes:8},
 lich:{name:'Bog Lich',ai:'witch',r:22,hp:220,col:'#5f9a6a',eyes:3,hood:1},
 wyrm:{name:'Stone Wyrm',ai:'burrower',r:30,hp:125,col:'#9a8f86',eyes:0,teeth:1,spikes:6},
 king:{name:'The Flayed King',ai:'hollow',crown:1,r:40,hp:1000,col:'#8c2f39',eyes:3,void:1,spikes:11},
 mite:{name:'Mite',r:10,hp:2,col:'#d07f98',eyes:1,legs:4},
 // generated levels only: a toad that lobs bombs, a caller that hides behind its husks, an eye that sweeps a beam
 bomber:{name:'Cinder Toad',r:27,hp:240,col:'#c9642f',eyes:2,pust:1},
 summoner:{name:'Grave Caller',r:21,hp:220,col:'#4f8f8a',eyes:3,hood:1},
 beamer:{name:'Lidless Eye',r:25,hp:230,col:'#c2a640',eyes:1,spikes:5},
 husk:{name:'Husk',ai:'mite',r:12,hp:6,col:'#a9b7a0',eyes:2,legs:4},
};
// Health of the story monsters (levels 1-12) is set above, one by one. Levels 13 and up are generated: a scaled monster from the pool, a tyrant every tenth level
const AREAS=[['The Ash Road',28],['The Drowned Fen',165],['The Bone Peaks',215],['The Black Court',285],['The Endless Dark',340]];
const PRE=['Ashen','Dread','Rotting','Gilded','Howling','Pale','Iron','Blighted','Starved','Elder'];
const POOL=['crawler','hound','witch','fist','beamer','burrower','bomber','summoner','mother'];
const TINT=['#7c9a52','#c9c1a8','#8566b8','#8f8474','#b3557a','#c0823c','#3fa596','#5f8fc9','#c9585a','#9aa34a'];
// health of a generated boss: a base per kind (tuned so each takes about as long to kill) times a curve that keeps pace with boons, equipment and skills
const GENHP={crawler:700,hound:600,witch:510,fist:740,mother:360,burrower:390,hollow:1270,bomber:560,summoner:400,beamer:540};
// (CURVE: the old curve, 18% up since every class takes a trophy from the bosses it kills.) ORDHP: what an ordinary level's monster has of it, so that it dies in 15 to 35 seconds.
// TYRHP: a tyrant has that many times the health its kind would have on an ordinary level (the Hollow's kind has the highest base as it is), so that it lasts 90 to 150 seconds.
const ORDHP=.45,TYRHP=2.75,TYRLATE=1.15; // TYRLATE: the tyrants from level 60 on meet a class that has taken its upgrade
const CURVE=n=>{const k=Math.max(0,n-12);return(1+.062*k+.0055*k*k)*1.18};
const genMul=n=>CURVE(n)*ORDHP;
// Everything about a level follows from its number, so a retry meets the same room and the same monster.
// Modifiers (m.mods) from level 15: one on most levels, a second on some from level 41. Tyrants carry none.
const MODS=['shielded','swift','burning','vampiric','thorned','splitting'];
const MODHP={shielded:.9,vampiric:.9,splitting:.9};
function modsOf(n,kind,tyrant){
  if(n<14||tyrant||n<30&&n%3===0)return[];
  const i=(n*7+1)%6,out=[MODS[i]];if(n>=40&&n%2===0)out.push(MODS[(i+1+n%4)%6]);
  // copies of something that shoots or breeds would bury you, so those are shielded instead; the caller already has a ward of its own, so it is swift instead
  return out.map(x=>x==='splitting'&&['witch','mother','beamer','summoner'].includes(kind)?'shielded':x).map(x=>x==='shielded'&&kind==='summoner'?'swift':x).filter((x,j,l)=>l.indexOf(x)===j);
}
// Waves from level 14: some levels open with one or two packs of lesser monsters before the boss enters. Tyrant levels never do.
const wavesOf=n=>n<13?0:[1,0,2,0,0][(n-13)%5];
// Rooms: which obstacles stand where. Anchor sets are mirror-symmetric and keep clear of both spawn points; solid things are never combined closer than a boss is wide.
const QA=[[250,190],[710,190],[250,410],[710,410]],QB=[[300,300],[660,300]],QC=[[480,300]],QD=[[165,300],[795,300]],QE=[[360,205],[600,205],[360,395],[600,395]];
const ROOMS=[[],[['pillar',QB]],[['pillar',QA]],[['spikes',QE]],[['pillar',QC],['spikes',QE]],[['brazier',QB]],[['pit',QB]],[['spikes',QE],['spikes',QC]],[['brazier',QA]],[['pit',QD],['spikes',QB]],[['pillar',QA],['brazier',QC]],[['pit',QC],['pillar',QD]]];
// levels 1-3 are bare; the crypt and the first trade levels bring in one thing at a time (pillars, spikes, braziers, pits); after that the room follows from the level number
const roomOf=(n,tyrant)=>n<3?0:n<12?[1,2,3,4,2,5,8,7,6][n-3]:tyrant?8:(n*7+2)%12;
const cap1=x=>x[0].toUpperCase()+x.slice(1);
function levelDef(n){
  if(n<LEVELS.length){const L=LEVELS[n];return{title:L.title,hint:L.hint,kind:L.boss,spec:SPEC[L.boss],hue:100,waves:0,mods:[],room:roomOf(n)}}
  const N=n+1,area=AREAS[N<=20?0:Math.min(4,Math.floor((N-11)/10))],tyrant=N%10===0,kind=tyrant?'hollow':POOL[(n*5+3)%POOL.length],base=SPEC[kind],waves=wavesOf(n),mods=modsOf(n,kind,tyrant);
  let hp=GENHP[kind]*genMul(n)*(tyrant?TYRHP*(n>=59?TYRLATE:1):1)*[1,.8,.68][waves];for(const k of mods)hp*=MODHP[k]||1;
  const name=tyrant?'Tyrant of '+area[0].replace('The ',''):(mods[0]?cap1(mods[0])+' ':'')+PRE[n%10]+' '+base.name.replace('The ','')+(mods[1]?', '+cap1(mods[1]):'');
  const spec={...base,ai:kind,crown:tyrant?1:0,name,hp:Math.round(hp),col:tyrant?'#8c2f39':TINT[(n*3)%10],r:base.r+(tyrant?6:2)};
  return{title:area[0],hint:tyrant?'A tyrant holds this ground.':N===50?'':waves>1?'Two packs come first. Then it does.':waves?'Its pack comes first. Then it does.':'Stronger than the last. So are you.',kind,spec,hue:area[1],waves,mods,room:roomOf(n,tyrant)};
}
// a small, weaker copy of a pool monster: wave packs and what a splitting boss sheds
function lesserSpec(kind,n,hp){const base=SPEC[kind];return{...base,ai:base.ai||kind,name:'Lesser '+base.name.replace('The ',''),r:Math.round(base.r*.72),hp:Math.max(6,Math.round(hp))}}
function buildRoom(n,room){
  const out=[],quick=Math.max(.75,1-Math.max(0,n-12)*.006); // traps cycle a little faster deep down
  for(const[kind,set]of ROOMS[room]||[])set.forEach(([x,y],i)=>{
    const o={kind,x,y,r:kind==='pillar'?26:kind==='pit'?(set===QC?54:46):kind==='spikes'?36:62,on:false,t:0,warn:false,per:0,core:0};
    if(kind==='spikes'){o.per=3.4*quick;o.t=(i%2)*o.per*.35} // every trap starts inside its quiet stretch, so nothing fires without its warning
    if(kind==='brazier'){o.per=4.6*quick;o.core=13;o.t=i/set.length*o.per*.45}
    out.push(o)});
  return out;
}

/* ---------- equipment: three slots, four rarities, dropped by every boss from level 9 on ---------- */
const SLOTS=['weapon','armor','trinket'];
const RAR=[['common','#b9b2c6',1,.15],['rare','#6ea3e0',1.5,.2],['epic','#b88cff',2.1,.3],['legendary','#f0b848',2.8,.4]]; // name, colour, stat multiplier, upgrade step it gives when melted down
const QUAL=['Plain','Fine','Runed','Ancient'];
const GEAR={fighter:['Greatsword','Harness','Headband'],tank:['Sword','Plate','Iron Band'],assassin:['Daggers','Shadow Wrap','Mask'],mage:['Staff','Robe','Hat'],ranger:['Bow','Hood','Quiver'],healer:['Sun Staff','White Robe','Circlet'],necro:['Skull Staff','Grave Robe','Bone Charm']};
const STAT={dmg:['damage',6,'%'],spd:['attack speed',4,'%'],hp:['max health',2,''],guard:['chance to shrug off a hit',3,'%'],cdr:['faster skill recharge',5,'%'],mv:['move speed',3,'%'],sh:['faster shield recharge',8,'%'],mend:['faster mending',8,'%'],thr:['thrall and pet damage',10,'%'],mana:['max mana',6,'%']};
const slotStats=(c,slot)=>slot==='weapon'?['dmg','spd']:slot==='armor'?['hp','guard']:['cdr',c==='tank'?'sh':c==='healer'?'mend':c==='necro'?'thr':'mv'];
// an item is fully described by class, slot, rarity r (0-3), upgrade count lvl and upgrade total up; common items carry one stat line, the rest two
// m: a trinket of a casting class (CASTER) that carries max mana as its second line instead of the usual one; it is the only thing about an item that is rolled
const CASTER={mage:1,healer:1,necro:1};
function item(c,slot,r,lvl=0,up=0,m=0){const keys=slotStats(c,slot).slice(0,r?2:1);m=m&&slot==='trinket'&&r>0&&CASTER[c]?1:0;if(m)keys[1]='mana';return{slot,name:QUAL[r]+' '+GEAR[c][SLOTS.indexOf(slot)],rarity:RAR[r][0],r,lvl,up,m,keys}}
const statV=(it,k)=>{const v=STAT[k][1]*RAR[it.r][2]*(1+it.up);return k==='hp'?Math.round(v):Math.round(v*10)/10};
const itemLine=it=>it.keys.map(k=>'+'+statV(it,k)+STAT[k][2]+' '+STAT[k][0]).join(', ');
const itemName=it=>it.name+(it.lvl?' +'+it.lvl:'');
const basicSet=c=>({weapon:item(c,'weapon',0),armor:item(c,'armor',0),trinket:item(c,'trinket',0)});
let EQ={};
function eqSync(){EQ={};if(S.eq)for(const sl of SLOTS){const it=S.eq[sl];if(it)for(const k of it.keys)EQ[k]=(EQ[k]||0)+statV(it,k)}}
const eqv=k=>S.level>=8&&S.cls&&EQ[k]||0;
function dropItem(n){
  const N=n+1,big=N%10===0,pL=Math.min(.25,.01+(N-9)*.004)*(big?4:1),pE=Math.min(.35,.05+(N-9)*.008)*(big?2:1),x=rand();
  const slot=SLOTS[Math.floor(rand()*3)],r=x<pL?3:x<pL+pE?2:big||x<pL+pE+.3?1:0;
  return item(S.cls,slot,r,0,0,slot==='trinket'&&r>0&&CASTER[S.cls]&&rand()<.4?1:0);
}
const noBoons=()=>({might:0,haste:0,vigor:0,focus:0,fleet:0,well:0,spec:0});
const S={mode:'title',level:0,t:0,shake:0,stop:0,banner:0,clearT:0,cls:null,adv:null,b:noBoons(),elite:4,L:null,paused:false,rank:'',eq:null,scrap:0,load:load0(),wave:null};
let P,mons=[],shots=[],pshots=[],allies=[],zones=[],fields=[],bits=[],rings=[],floats=[],morsels=[],boss=null,obstacles=[],echoes=[];
// Every monster, enemy bolt, enemy blast and morsel carries an id, and every ally a nid, so that each can be named across the network in multiplayer.
let NEXTID=1;const nid=()=>NEXTID++;
// Multiplayer (MB.mp; the code is in the multiplayer section near the end). Everything about it is off unless MP.on.
// REM: set while the host applies what a remote member did to a monster. CL(): this game is a client, so the monsters are the host's to change.
const MP={on:false,role:'host',mode:'coop',remotes:[],count:1,myId:'',hostId:'',members:[],myIdx:0,down:false,away:false,colors:['#4fd8ff','#ff9f1a','#7dff5a','#ff5ad2','#ffe14a','#6a8cff','#3df5c0','#d8c8ff'],
  cnt:1,slots:1,phase:'pick',g:0,lv:8,meReady:false,menu:false,under:null,note:'',toast:'',meter:null,hud:null,timer:0,rById:new Map(),byIdx:[],ready:new Set(),mons:new Map(),qd:new Map(),ate:new Set(),hclk:{off:1e18},heroes:[],q:[],sd:[],rq:[]};
let REM=null;
const CL=()=>MP.on&&MP.role==='client';
// whom a monster fights: you; in multiplayer the nearest hero standing (the host decides)
const foe=m=>MP.on?mpFoe(m):P;
/* ---------- settings, events and run counters, shared with extras.js through MB ---------- */
const SET={music:.6,sfx:.8,haptic:1,btn:1,left:false,gfx:'high',hints:true};
// the valid form of a setting, or undefined when the key or the value makes no sense
function setClean(k,v){
  if(k==='music'||k==='sfx'||k==='haptic'||k==='btn'){if(typeof v==='string'&&v.trim()!=='')v=+v;if(typeof v!=='number'||!isFinite(v))return;return k==='btn'?Math.max(.8,Math.min(1.4,v)):Math.max(0,Math.min(1,v))}
  if(k==='left'||k==='hints')return typeof v==='boolean'?v:undefined;
  if(k==='gfx')return v==='high'||v==='low'?v:undefined;
}
const LIS={};
function on(name,fn){if(typeof fn!=='function')return()=>{};(LIS[name]||(LIS[name]=[])).push(fn);return()=>{const l=LIS[name],i=l.indexOf(fn);if(i>=0)l.splice(i,1)}}
function emit(name,data){for(const f of(LIS[name]||[]).slice())try{f(data)}catch(e){console.error('Marrowborn: a listener for "'+name+'" failed',e)}}
// counters for the current run; levelTime restarts with every level, the rest are saved with the run
const ST={kills:0,deaths:0,dmgDealt:0,dmgTaken:0,time:0,levelTime:0,bestLevel:0};
const stReset=()=>{for(const k in ST)ST[k]=0};
const act2=()=>S.level>=8,cls=()=>act2()?S.cls:null,pw=n=>!!S.cls&&S.level-8>=n;
const ADV={berserker:{d:1.5,c:1.6},sharpshooter:{d:1.75},reaper:{d:2},archmage:{k:.5},champion:{d:1.5,hp:6},duelist:{c:1.5,s:1.15},nightblade:{d:1.6},phantom:{k:.4,s:1.1},inquisitor:{d:1.6}};
const adv=k=>(ADV[S.adv]||{})[k];
const dmgMul=()=>(P&&P.rageT>0?1.4:1)*(1+eqv('dmg')/100+(S.level>=8?S.scrap*.01:0))*(1+.2*S.b.might)*(adv('d')||1)*(S.cls==='fighter'&&pw(3)?1.25:1)*(S.cls==='healer'&&pw(3)?1.6:1)*(S.cls==='tank'&&pw(3)?1.25:1);
const cdMul=()=>1/((P&&P.rageT>0?1.25:1)*(1+eqv('spd')/100)*(1+.1*S.b.haste)*(adv('c')||1)*(S.cls==='fighter'?(1+.08*S.b.spec)*(pw(3)?1.15:1):1));
const skMul=i=>Math.pow(.88,S.b.focus)*(1-Math.min(.5,eqv('cdr')/100))*(S.adv==='phantom'?(i?1:.4):adv('k')||1); // Phantom only speeds up Shadowstep
// mana: the pool, what a skill costs right now, and how fast the free part of the pool refills (per second, before the standing bonus)
const manaMax=()=>{const c=cls();return c?Math.round((MANA0[c]+MWELL*S.b.well+MLEVEL*Math.max(0,S.level-8))*(1+eqv('mana')/100)):0};
const skRise=()=>1+MRISE*Math.max(0,S.level-8);
const skCost=si=>{const c=cls(),d=c&&SKILLS[c][si];return d?Math.max(1,Math.round(d[6]*skRise()*(S.adv==='archmage'?.8:1)*(S.adv==='phantom'&&si===0?.5:1))):0};
const num=v=>Math.round(v).toLocaleString('en-US');
const manaRoom=()=>P?Math.max(0,P.maxMana-P.resv):0;
const manaRate=()=>manaRoom()*MREGEN*(1+Math.min(MWELLRMAX,MWELLR*S.b.well))*(S.adv==='saint'?1.25:1);
function manaGive(v){if(!P||!P.maxMana)return;P.mana=Math.min(manaRoom(),P.mana+v)}
function manaSync(){if(!P)return;MANA.cur=Math.floor(P.mana+1e-6);MANA.max=P.maxMana;MANA.reserved=P.resv;MANA.drawing=P.drawK>0&&P.mana<manaRoom()-.01;MANA.regen=P.maxMana&&P.mana<manaRoom()-.01?Math.round(manaRate()*(1+(MDRAW-1)*P.drawK)*10)/10:0}
// a skill that was asked for and cannot be paid: a soft sound and a flag for the HUD (which button, when), and nothing else
const manaCue={i:-1,at:-1e9,n:0};
function noMana(si){const now=performance.now();if(now-manaCue.at>250){SND.nomana();haptic(8)}manaCue.i=S.load.indexOf(si);manaCue.at=now;manaCue.n++}
// every step: the free part of the pool refills, faster the longer you have stood still; while the standing bonus flows, motes drift in from the room
function manaStep(dt){
  if(!P.maxMana)return;
  P.still=P.moving||P.dashT>0?0:P.still+dt;P.drawK=Math.max(0,Math.min(1,(P.still-STILL0)/STILL1));
  const room=manaRoom();
  if(P.mana<room){P.mana=Math.min(room,P.mana+manaRate()*(1+(MDRAW-1)*P.drawK)*dt);
    if(P.drawK>0&&rand()<dt*(SET.gfx==='low'?7:14)*P.drawK){const a=rand()*TAU,d=62+rand()*40,v=230+rand()*90;bits.push({x:P.x+Math.cos(a)*d,y:P.y-6+Math.sin(a)*d,vx:-Math.cos(a)*v,vy:-Math.sin(a)*v,life:.42,max:.42,c:rand()<.6?'#6fe3ff':'#a98bff',r:2,mana:true})}}
  else if(P.mana>room)P.mana=room;
}
const aiK=m=>mspd()*(m.rage?(S.level<3?1.12:m.ai==='hollow'?1.15:1.3):1)*(m.spdK||1);
const melee=c=>!c||c==='tank'||c==='fighter'||c==='assassin';
const mspd=()=>S.level<8?1:Math.min(1.7,1.25+Math.max(0,S.level-12)*.01);
// What a blow costs. In the crypt (levels 1-8) a touch is 1 while you are learning and 2 from level 4; charges, lunges and ground blasts (heavy=1) hit half again as hard, a brush against a monster (heavy=-1) is lighter, and so are bolts.
// From level 9 a blow is a share of PHP(n), the health a player typically has on that level (14 on levels 9-12, then 0.85 more per level): SHARE = a brush 10%, a bolt, a beam or a trap 19%, a telegraphed blow 31%.
// So two or three telegraphed blows are most of a health bar, and extra health from Vigor or armour buys real room. On the boss levels (every tenth) every blow is BOSSDMG times that.
const PHP=n=>n<1?4:n<2?7:n<8?10:14+.85*Math.max(0,n-11);
const SHARE=[.1,.19,.31],BOSSDMG=1.1;
const blowAt=(n,heavy)=>{if(n<8){const b=n<3?1:2;return heavy>0?Math.round(b*1.5+.01):heavy<0?Math.max(1,Math.round(b*.6)):b}
  return Math.max(1,Math.round(PHP(n)*SHARE[heavy>0?2:heavy<0?0:1]*(tenth(n)?BOSSDMG:1)))};
const blow=heavy=>blowAt(S.level,heavy);
// healing scales with your health: f is a share of maximum health, never less than lo
const healP=(f,lo=1)=>{P.hp=Math.min(P.maxHp,P.hp+Math.max(lo,Math.round(f*P.maxHp)));hud()};
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
let AC,master,fx,lp,muted=false,bed=null,nbuf;
const live=()=>AC&&!muted&&!document.hidden;
function audio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.45;fx=AC.createGain();fx.gain.value=SET.sfx/.8;fx.connect(master);lp=AC.createBiquadFilter();lp.type='lowpass';master.connect(lp);lp.connect(AC.destination);tune();startBed()}catch(e){AC=null}}
// one oscillator voice: f -> f2 over d seconds, starting `at` seconds from now
function sfx(f,d=.1,type='square',v=.3,f2,at=0){
  if(!live())return;if(SIDE)v*=.35;try{
  if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+at;o.type=type;
  o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(fx);o.start(t);o.stop(t+d+.02)}catch(e){}
}
// without ears everything is muffled, but still loud enough for a phone speaker
function tune(){if(!AC)return;const h=has('hearing'),t=AC.currentTime;lp.frequency.setTargetAtTime(h?18000:700,t,.05);master.gain.setTargetAtTime(h?.45:.7,t,.05)}
// noise burst; with f it is band-passed and swept f -> f2 (whooshes, clangs, rattles)
function noise(d=.12,v=.3,f,f2,at=0){
  if(!live())return;if(SIDE)v*=.35;try{
  if(!nbuf){nbuf=AC.createBuffer(1,AC.sampleRate*.5,AC.sampleRate);const ch=nbuf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1}
  const n=AC.createBufferSource(),g=AC.createGain(),t=AC.currentTime+at;n.buffer=nbuf;n.loop=true;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  if(f){const q=AC.createBiquadFilter();q.type='bandpass';q.Q.value=1.4;q.frequency.setValueAtTime(f,t);if(f2)q.frequency.exponentialRampToValueAtTime(f2,t+d);n.connect(q);q.connect(g)}else n.connect(g);
  g.connect(fx);n.start(t,Math.random()*.3);n.stop(t+d+.02)}catch(e){}
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
function bedLevel(){if(bed)try{bed.g.gain.setTargetAtTime(muted?0:.11*SET.music/.6,AC.currentTime,.4)}catch(e){}}
function bedTick(){
  if(!bed||!live()||AC.state!=='running')return;const t=AC.currentTime,play=S.mode==='play'&&!S.paused;
  if(t>=bed.next){bed.i=Math.max(0,Math.min(SCALE.length-1,bed.i+Math.floor(Math.random()*5)-2));const f=SCALE[bed.i]*(S.mode==='dead'?.5:1);
    voice(f,2.6,.5,'triangle',bed.ng);if(Math.random()<.3)voice(f*1.5,2.2,.22,'sine',bed.ng,.24);bed.next=t+(play?1.5+Math.random()*1.7:2.6+Math.random()*2.6)}
  if(play&&P&&has('organs')&&P.hp<=Math.max(2,P.maxHp*.3)&&t>=bed.hb){voice(58,.16,1.6,'sine',bed.g);voice(50,.2,1.2,'sine',bed.g,.17);bed.hb=t+.72}
}
let hapOn=true,hapT=0,hapLast=1;
// short ticks are rate-limited to one per 60 ms; patterns and heavy hits always go through. The haptic setting scales how long each buzz lasts (pauses keep their length).
function haptic(p){if(!hapOn||!(SET.haptic>0))return;const now=performance.now(),big=Array.isArray(p)||p>=40;if(!big&&now-hapT<60)return;hapT=now;
  const k=SET.haptic;if(k<1)p=Array.isArray(p)?p.map((v,i)=>i%2?v:Math.max(1,Math.round(v*k))):Math.max(1,Math.round(p*k));try{if(window.Android&&Android.vibrate)Android.vibrate(String(p));else if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}
const pref=(k,v)=>{try{localStorage.setItem('marrowborn.'+k,v)}catch(e){}};
// settings: stored as one JSON object; the old Sound and Haptics toggles stay in step with it
function setLoad(){
  try{const o=JSON.parse(localStorage.getItem('marrowborn.settings')||'null');
    if(o&&typeof o==='object'){for(const k in SET){const v=setClean(k,o[k]);if(v!==undefined)SET[k]=v}}
    else if(localStorage.getItem('marrowborn.nohap')==='1')SET.haptic=0;
    muted=localStorage.getItem('marrowborn.mute')==='1'}catch(e){}
  hapOn=SET.haptic>0;if(hapOn)hapLast=SET.haptic;setApply();
}
function setApply(){
  if(AC)try{fx.gain.setTargetAtTime(SET.sfx/.8,AC.currentTime,.05)}catch(e){}
  bedLevel();
  $('snd').setAttribute('aria-pressed',!muted&&(SET.music>0||SET.sfx>0));$('hap').setAttribute('aria-pressed',SET.haptic>0);
}
function setSetting(key,value){
  const v=Object.prototype.hasOwnProperty.call(SET,key)?setClean(key,value):undefined;if(v===undefined)return false;
  SET[key]=v;
  if(key==='haptic'){hapOn=v>0;if(hapOn)hapLast=v;pref('nohap',hapOn?0:1)}
  if((key==='music'||key==='sfx')&&v>0&&muted){muted=false;pref('mute',0)} // turning a volume up also un-mutes
  pref('settings',JSON.stringify(SET));setApply();emit('settings',{key,value:v});return true;
}
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
  nomana(){sfx(330,.09,'sine',.1,247);sfx(165,.12,'sine',.07,123,.03)},
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
/* ---------- rooms: pillars and brazier bowls are solid, pits are holes that walkers go around ---------- */
const solidR=o=>o.kind==='pillar'?o.r:o.kind==='brazier'?o.core:0;
// push a body out of everything solid (and out of pits when pits is set); true when it was touching something
function collide(e,r,pits){
  let hit=false;
  for(const o of obstacles){const R=o.kind==='pit'?(pits?o.r-8:0):solidR(o);if(!R)continue;
    const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),min=R+r;
    if(d<min){if(d<.01)e.x=o.x+min;else{e.x=o.x+dx/d*min;e.y=o.y+dy/d*min}hit=true}}
  if(hit)clamp(e,r);return hit;
}
// Steering: when something solid lies in the way, head for its edge instead. The side is kept for a moment so a walker does not dither, and flipped by the caller if it stops making ground.
function steer(m,a,dp=dist(m,T||P)){
  const ux=Math.cos(a),uy=Math.sin(a);let best=null,bg=46,bR=0,bd=0;
  for(const o of obstacles){const R=o.kind==='pit'?o.r-8:solidR(o);if(!R)continue;
    const dx=o.x-m.x,dy=o.y-m.y,d=Math.hypot(dx,dy);if(dx*ux+dy*uy<=0||dp<d-R)continue; // behind us, or the player stands in front of it
    const gap=d-R-m.r;if(Math.abs(dx*uy-dy*ux)<R+m.r+3&&gap<bg){bg=gap;best=o;bR=R;bd=d}}
  if(!best){return a}
  const ao=Math.atan2(best.y-m.y,best.x-m.x);
  if(m.avO!==best||!(m.avT>0)){m.avO=best;m.avS=Math.sin(ao-a)>=0?1:-1}
  m.avT=.5;
  return ao-m.avS*Math.asin(Math.min(1,(bR+m.r+5)/bd));
}
// raw: a charge or a lunge goes straight and reports running into something solid, the way it reports a wall
function move(m,a,spd,dt,raw){
  const room=obstacles.length&&!m.hidden,ox=m.x,oy=m.y;
  if(m.avT>0)m.avT-=dt;if(room&&!raw)a=steer(m,a);
  m.x+=Math.cos(a)*spd*dt;m.y+=Math.sin(a)*spd*dt;m.moving=true;
  let hit=false;if(room&&collide(m,m.r,true)&&raw)hit=(m.x-ox)*Math.cos(a)+(m.y-oy)*Math.sin(a)<spd*dt*.35;
  return clamp(m,m.r)||hit;
}
const blocked=p=>{for(const o of obstacles){const R=solidR(o);if(R&&Math.hypot(p.x-o.x,p.y-o.y)<R+1)return true}return false};
// how far a ray from (x,y) along angle a gets before a wall or something solid stops it
function rayLen(x,y,a){
  const ux=Math.cos(a),uy=Math.sin(a);let t=1e9;
  if(ux>1e-6)t=Math.min(t,(W-WALL-x)/ux);else if(ux<-1e-6)t=Math.min(t,(WALL-x)/ux);
  if(uy>1e-6)t=Math.min(t,(H-WALL-y)/uy);else if(uy<-1e-6)t=Math.min(t,(WALL-y)/uy);
  for(const o of obstacles){const R=solidR(o);if(!R)continue;const dx=o.x-x,dy=o.y-y,al=dx*ux+dy*uy,lat2=dx*dx+dy*dy-al*al;if(al>0&&lat2<R*R)t=Math.min(t,Math.max(0,al-Math.sqrt(R*R-lat2)))}
  return Math.max(0,t);
}
function segDist(p,x,y,a,len){const ux=Math.cos(a),uy=Math.sin(a),al=Math.max(0,Math.min(len,(p.x-x)*ux+(p.y-y)*uy));return Math.hypot(p.x-x-ux*al,p.y-y-uy*al)}
// SIDE: the bound pet whose turn it is while the monster AI runs for it (null while a monster acts). T: what the acting creature fights: you for a monster, its prey for a pet.
// The AI below is written once and used by both: it aims at T, and what it throws (shoot, zone, brood, the beam) lands on the other side.
let SIDE=null,T=null;
const LV=()=>SIDE?99:S.level; // the level a pattern asks about: a pet was a boss past the crypt, so it has them all
const quake=v=>{if(!SIDE)S.shake=Math.max(S.shake,v)};
function shoot(x,y,a,spd,r=6){
  if(SIDE){const o=SIDE.par||SIDE;pshots.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:Math.min(r,6),dmg:SIDE.du[1],kind:o.owner==='necro'?'skull':'bolt',pierce:0,hit:new Set(),sx:x,sy:y,pet:o});return}
  shots.push({id:nid(),x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r})}
function ringShot(m,n,spd,off=0){for(let i=0;i<n;i++)shoot(m.x,m.y,off+i*TAU/n,spd)}
function zone(x,y,r,dur,m){dur/=m?aiK(m):mspd();const z=SIDE?{x,y,r,t:0,dur,mine:true,dmg:SIDE.du[2],pet:SIDE.par||SIDE}:{id:nid(),x,y,r,t:0,dur};clamp(z,10);zones.push(z);return z}
function puff(e,c,n=10,spd=160){for(let i=0;i<n;i++){const a=rand()*TAU,s=spd*(.3+rand());bits.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5,max:.5,c,r:2+rand()*3})}}
const miteHp=()=>S.level<8?2:S.level<12?4:Math.round(4*Math.pow(CURVE(S.level),.8));
function spawn(kind,x,y,isBoss,spec,raw){const s=spec||SPEC[kind];let hp=s.hp;if(kind==='mite'&&S.level>=8)hp=miteHp();if(kind==='husk')hp=Math.round(miteHp()*1.5);if(isBoss&&window.__mb&&window.__mb.hpK)hp=Math.round(hp*window.__mb.hpK);if(MP.on&&!raw)hp=mpHp(hp,kind);const m={id:nid(),kind,s,ai:s.ai||kind,x,y,r:s.r,hp,maxHp:hp,boss:!!isBoss,st:'idle',t:1,n:0,flash:0,ring:0,ang:rand()*TAU,side:1,hits:0,seed:rand()*9,hidden:false,lift:0,mods:[],ward:0,beam:null};clamp(m,m.r);if(obstacles.length)collide(m,m.r,true);mons.push(m);return m}
function lesser(kind,x,y,hp,raw){const m=spawn(kind,x,y,false,lesserSpec(kind,S.level,hp),raw);m.lesser=true;m.spdK=.8;m.t=1+rand()*.6;puff(m,col(m.s.col),10);return m}
// a wave pack: one or two lesser monsters and a handful of mites, spread along the far side of the room from you
const LESSER=['crawler','hound','witch','fist','bomber'];
function spawnWave(){
  const n=S.level,w=S.wave,big=w.n>1?2:1,py=MP.on?mpPartyY():P.y,far=py>H/2?150:H-150,base=GENHP,total=3+(n>=30?1:0)-(big>1?1:0)+(MP.on?mpPack():0); // small packs: one lesser monster and three mites, then two and two
  for(let j=0;j<big;j++){const kind=LESSER[(n+w.n*2+j*3)%LESSER.length];lesser(kind,W/2+(big>1?(j?170:-170):0),far,base[kind]*genMul(n)*.085)}
  for(let j=0;j<total;j++){const m=spawn('mite',W/2+(j-(total-1)/2)*70,far+(py>H/2?60:-60));m.t=1}
  w.hp0=mons.reduce((a,m)=>a+m.maxHp,0);S.waveT=.6;
  $('bossName').textContent='Wave '+w.n+' of '+w.of;
  floats.push({x:W/2,y:far-50,txt:w.of>1?'Pack '+w.n+' of '+w.of:'The pack',life:1.6,c:'#d6a544'});sfx(150,.4,'sawtooth',.2,90);
}
// the boss of a wave level walks in once the packs are dead, on the far side of the room from you
function enterBoss(){
  const L=S.L;S.wave=null;boss=spawn(L.kind,W/2,(MP.on?mpPartyY():P.y)>H/2?140:H-140,true,L.spec);arm(boss,L);boss.t=1.4;boss.ward=1;
  rings.push({x:boss.x,y:boss.y,life:.7,max:.7,r:boss.r+120,fx:true});puff(boss,col(boss.s.col),26,240);S.shake=Math.max(S.shake,.3);SND.roar();haptic([30,30,80]);
  floats.push({x:boss.x,y:boss.y-boss.r-20,txt:L.spec.name,life:1.8,c:'#ff5b6e'});$('bossName').textContent=L.spec.name;
}
// give a boss its modifiers
function arm(m,L){m.mods=(L.mods||[]).slice();if(m.mods.includes('swift'))m.spdK=1.12;m.shT=5;m.burnT=2.5;m.fifth=4;m.thornT=0;m.splitN=2}
function bossBar(){
  if(boss)$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';
  else if(S.wave){let hp=0;for(const m of mons)hp+=Math.max(0,m.hp);$('bossFill').style.width=Math.min(100,hp/(S.wave.hp0||1)*100)+'%'}
}
function reshuffle(){
  mons=mons.filter(m=>!m.decoy);
  const spot=()=>{let p;do{p={x:WALL+60+rand()*(W-2*WALL-120),y:WALL+60+rand()*(H-2*WALL-120)}}while(dist(p,P)<210);return p};
  Object.assign(boss,spot());collide(boss,boss.r,true);puff(boss,col('#3fa596'));
  for(let i=0;i<(boss.rage?4:3);i++){const p=spot(),d=spawn('mimic',p.x,p.y);d.decoy=true;d.t=1+rand()*2;d.side=rand()<.5?-1:1;puff(d,col('#3fa596'))}
}

/* ---------- monsters ---------- */
function chargeStates(m,dt,a,next,E){
  if(m.st==='wind'){if(m.t>.22)m.ang=a; // the line of the charge locks just before it goes, so a sidestep at the last moment works
    if((m.t-=dt)<=0){m.st='charge';m.t=1;sfx(180,.3,'sawtooth',.25,70);noise(.3,.16,300,900)}}
  else if(m.st==='charge'){const hit=move(m,m.ang,540,dt,true);if(hit||(m.t-=dt)<=0){
    if(hit){quake(.25);sfx(70,.2,'square',.35,40);if(E)ringShot(m,8,150,rand()*TAU)}
    if(E&&!m.again&&LV()>=8){m.again=1;m.st='wind';m.t=.62} // enraged: a second charge straight away
    else{m.again=0;m.st='dazed';m.t=hit?(E?1:1.5):.6}}}
  else if((m.t-=dt)<=0){m.st='idle';m.t=next}
}
// every boss enrages below 40% health (m.rage): its clock runs faster and it gains a pattern. The Hollow, the King and the tyrants fight in three phases instead (m.phase).
const AI={
  crawler(m,dt,a,d){
    const E=m.rage;
    if(m.st==='idle'){move(m,a,80,dt);m.t-=dt;if(m.t<=0&&d<170){m.st='wind';m.t=.52;m.ang=a;m.again=0;if(LV()>=12)for(const k of[-.3,0,.3])shoot(m.x,m.y,a+k,190)}}
    else if(m.st==='wind'){if((m.t-=dt)<=0){m.st='lunge';m.t=.28}}
    else{move(m,m.ang,400,dt,true);if((m.t-=dt)<=0){if(E&&LV()>=3)ringShot(m,6,140,a);if(E&&!m.again){m.again=1;m.st='wind';m.t=.4;m.ang=a}else{m.st='idle';m.t=1.15}}}
  },
  hound(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){if(move(m,a+1.1*m.side,E?130:110,dt))m.side*=-1;if((m.t-=dt)<=0){m.st='wind';m.t=E?.52:.75}}
    else chargeStates(m,dt,a,E?.8:1.15,E);
  },
  witch(m,dt,a,d){
    const E=m.rage;if(m.slide>0)m.slide-=dt;
    const dir=m.slide>0?a+Math.PI/2*m.side:d<200?a+Math.PI:d>330?a:a+Math.PI/2*m.side;
    if(move(m,dir,d<200?(LV()<8?78:98/mspd()):90,dt)){m.side*=-1;m.slide=.7} // the first witch is slow enough to run down half-blind; deeper down her clock quickens but her retreat does not, or nothing on foot could reach her
    if((m.t-=dt)<=0){m.n++;if(m.n%(E?2:3)===0)ringShot(m,E?12:10,150,a);else for(const k of E?[-.5,-.25,0,.25,.5]:[-.25,0,.25])shoot(m.x,m.y,a+k,200);
      if(E&&LV()>=3&&m.n%2)zone(T.x,T.y,70,1,m);m.t=1.25;sfx(520,.12,'sine',.2,260)}
  },
  fist(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){move(m,a,60,dt);if((m.t-=dt)<=0){m.n++;m.st='leap';m.t=m.dur=.95;m.sx=m.x;m.sy=m.y;m.tx=T.x;m.ty=T.y;zone(T.x,T.y,85,.95,m);
      if(E||m.n%3===0)for(let i=0;i<3;i++){const b=a+i*TAU/3;zone(T.x+Math.cos(b)*150,T.y+Math.sin(b)*150,70,1.3,m)}}}
    else{m.t-=dt;const p=Math.min(1,1-m.t/m.dur);m.x=m.sx+(m.tx-m.sx)*p;m.y=m.sy+(m.ty-m.sy)*p;m.lift=Math.sin(p*Math.PI);clamp(m,m.r);if(m.t<=0){m.lift=0;m.st='idle';m.t=E?1:1.35;if(E)ringShot(m,8,150,rand()*TAU)}}
  },
  mother(m,dt,a){
    const E=m.rage;m.ang+=dt*.5;if(move(m,m.ang,E?46:30,dt))m.ang+=Math.PI;
    if((m.t-=dt)<=0){m.n++;for(let i=0;i<(E?2:1);i++)if(broodOk(m,E?9:7)){const b=rand()*TAU;brood(m,'mite',m.x+Math.cos(b)*44,m.y+Math.sin(b)*44)}
      if(E)for(const k of[-.3,0,.3])shoot(m.x,m.y,a+k,160,8);else if(m.n%2===0)shoot(m.x,m.y,a,150,8);m.t=1.4}
  },
  mite(m,dt,a){move(m,a+Math.sin(S.t*3+m.seed)*.6,125,dt)},
  // Cinder Toad: keeps its distance and lobs bombs where you are and where you are going. Crowd it and it drops one at its own feet and hops away.
  bomber(m,dt,a,d){
    const E=m.rage;if(m.hopT>0)m.hopT-=dt;
    if(m.st==='leap'){m.t-=dt;const p=Math.min(1,1-m.t/m.dur);m.x=m.sx+(m.tx-m.sx)*p;m.y=m.sy+(m.ty-m.sy)*p;m.lift=Math.sin(p*Math.PI)*.6;clamp(m,m.r);if(m.t<=0){m.lift=0;m.st='idle';m.t=Math.max(m.t,.5)}return}
    if(m.st==='wind'){if((m.t-=dt)<=0){
      const lob=(x,y,r,dur)=>{const z=zone(x,y,r,dur,m);z.sx=m.x;z.sy=m.y},lx=T.x+(T.vx||0)*.55,ly=T.y+(T.vy||0)*.55,b=rand()*TAU;
      lob(T.x,T.y,64,1.05);lob(lx,ly,60,1.2);
      for(let i=0;i<(E?3:1);i++){const g=b+i*TAU/3;lob(T.x+Math.cos(g)*125,T.y+Math.sin(g)*125,58,1.35)}
      sfx(240,.25,'triangle',.2,90);m.st='idle';m.t=E?1.2:1.7;m.rest=1}return}
    if(m.rest>0)m.rest-=dt;else if(move(m,d<170?a+Math.PI:d>330?a:a+Math.PI/2*m.side,(d<170?62:70)/mspd(),dt))m.side*=-1; // it sits where it threw from for a second: the opening for anyone on foot
    if(d<m.r+78&&!(m.hopT>0)){m.hopT=6;zone(m.x,m.y,m.r+60,.8,m);
      const g=a+Math.PI+(rand()-.5)*1.4,to={x:m.x+Math.cos(g)*240,y:m.y+Math.sin(g)*240};clamp(to,m.r);collide(to,m.r,true);
      m.st='leap';m.t=m.dur=.5;m.sx=m.x;m.sy=m.y;m.tx=to.x;m.ty=to.y;sfx(300,.2,'sine',.2,600)}
    else if((m.t-=dt)<=0){m.st='wind';m.t=.45}
  },
  // Grave Caller: raises husks and cannot be hurt while two or more of them stand. Thin them out and it is open until it has raised the next lot.
  summoner(m,dt,a,d){
    const E=m.rage,full=E?4:3;let mine=0;if(SIDE)mine=broodN(m);else for(const x of mons)if(x.owner===m)mine++;
    if(mine>=2)m.ward=Math.max(m.ward,.15);
    if(m.st==='wind'){if((m.t-=dt)<=0){
      for(let i=mine;i<full;i++){const g=a+(i-(full-1)/2)*.7,h=brood(m,'husk',m.x+Math.cos(g)*(m.r+34),m.y+Math.sin(g)*(m.r+34));if(!h)break;if(!SIDE)h.owner=m;h.t=0;puff(h,'#7fd66b',8)}
      sfx(140,.5,'sawtooth',.2,70);m.st='idle';m.t=E?4:5}return}
    if(m.slide>0)m.slide-=dt;
    if(move(m,m.slide>0?a+Math.PI/2*m.side:d<230?a+Math.PI:d>380?a:a+Math.PI/2*m.side,d<230?80:60,dt)){m.side*=-1;m.slide=.7}
    if((m.sh=(m.sh||1.5)-dt)<=0){m.sh=1.9;if(E)for(const k of[-.3,0,.3])shoot(m.x,m.y,a+k,180);else shoot(m.x,m.y,a,180);sfx(420,.1,'sine',.15,210)}
    if(mine>=2)m.t=E?4:5;else if((m.t-=dt)<=0){m.st='wind';m.t=.9} // the count to the next raising only runs while it stands open
  },
  // Lidless Eye: a thin line finds you, locks, and becomes a beam that sweeps after you. Dash through it, get behind a pillar, or stay close where it turns slowly.
  beamer(m,dt,a,d){
    const E=m.rage;
    if(m.st==='idle'){m.beam=null;if(move(m,d>250?a:a+Math.PI/2*m.side,d>250?72:46,dt))m.side*=-1;
      if((m.sh=(m.sh||1.2)-dt)<=0){m.sh=E?1.6:2.3;for(const k of[-.22,0,.22])shoot(m.x,m.y,a+k,185);sfx(520,.1,'sine',.15,260)}
      if((m.t-=dt)<=0){m.st='wind';m.t=.95;m.ba=a;sfx(900,.9,'sine',.12,1500)}}
    else if(m.st==='wind'){if(m.t>.4)m.ba=a; // the line locks before it fires, so stepping off it at the last moment works
      if((m.t-=dt)<=0){m.st='beam';m.t=E?3:2.4;m.bs=Math.sin(a-m.ba)>=0?1:-1;quake(.15);sfx(110,.5,'sawtooth',.25,70);noise(.4,.2,2400,600)}}
    else{m.ba+=m.bs*(E?.8:.68)*dt;if((m.t-=dt)<=0){m.st='idle';m.t=E?1.3:1.9;m.beam=null;return}}
    if(m.st==='idle')return;
    const n=E?2:1,on=m.st==='beam';if(!m.beam||m.beam.rays.length!==n)m.beam={on,w:12,rays:Array.from({length:n},()=>({a:0,len:0}))};
    m.beam.on=on;m.beam.rays.forEach((r,i)=>{r.a=m.ba+i*TAU/n;r.len=rayLen(m.x,m.y,r.a);if(on){if(SIDE)beamHits(m,r);else if(segDist(P,m.x,m.y,r.a,r.len)<m.beam.w+9)hurtP(blow(0),'beam')}});
  },
  burrower(m,dt,a){
    const E=m.rage;
    if(m.st==='idle'){m.st='under';m.t=1.6;m.hidden=true}
    else if(m.st==='under'){move(m,a,E?195:165,dt);if((m.t-=dt)<=0){m.st='rise';m.t=.7;collide(m,m.r,true);zone(m.x,m.y,75,.7,m)}} // it digs under everything and comes up beside it
    else if(m.st==='rise'){if((m.t-=dt)<=0){m.hidden=false;m.st='up';m.t=E?1.5:2;m.spit=.6;ringShot(m,8,170,rand()*TAU);if(E)m.vol=.3;puff(m,col('#c0823c'),14)}}
    else{if(m.vol>0&&(m.vol-=dt)<=0)ringShot(m,8,170,rand()*TAU);
      if((m.spit-=dt)<=0){m.spit=.8;shoot(m.x,m.y,a,190)} // it spits while it is up, so standing in front of it is not free
      if((m.t-=dt)<=0){m.st='under';m.hidden=true;m.t=1.2+rand()*.8}}
  },
  mimic(m,dt,a){
    const E=SIDE?m.rage:boss&&boss.rage,main=SIDE?!m.minion:m.boss;
    if(move(m,a+m.side*1.3,E?118:95,dt))m.side*=-1;
    if((m.t-=dt)<=0){if(E&&main)for(const k of[-.25,0,.25])shoot(m.x,m.y,a+k,190);else shoot(m.x,m.y,a,190);m.t=1.6+rand()*1.2}
    if(m.boss&&has('smell')&&rand()<dt*14)bits.push({x:m.x+rand()*20-10,y:m.y-m.r,vx:rand()*20-10,vy:-30-rand()*20,life:.9,max:.9,c:'#a6e06b',r:3})
  },
  hollow(m,dt,a){
    const ph=m.phase||1,crown=m.s.crown,g=[1,.8,.65][ph-1];
    if(m.vol>0&&(m.vol-=dt)<=0){ringShot(m,12,160,a+.26*m.volN);if(--m.volN>0)m.vol=.32}
    if(m.spiral>0){m.spiral-=dt;if((m.spT-=dt)<=0){m.spT=.11;m.spA+=.33;for(let i=0,n=crown&&ph>=3?4:2;i<n;i++)shoot(m.x,m.y,m.spA+i*TAU/n,170)}}
    if(m.chase>0&&(m.chT-=dt)<=0){m.chT=.4;m.chase--;zone(T.x,T.y,62,.8,m)}
    if(m.st==='idle'){move(m,a,[62,84,100][ph-1],dt);if((m.t-=dt)<=0){const k=m.n++%(ph>1||crown?5:4);
      if(k===0){m.st='wind';m.t=ph>=3?.5:.7;m.again=0}
      else if(k===1){ringShot(m,12,160,a);m.volN=ph-1;if(m.volN)m.vol=.32;m.t=1.4*g}
      else if(k===2){zone(T.x,T.y,85,.9,m);for(let i=0;i<3;i++){const b=a+i*TAU/3;zone(T.x+Math.cos(b)*150,T.y+Math.sin(b)*150,70,1.25,m)}if(ph>=2){m.chase=crown?4:2;m.chT=.7}m.t=1.6*g}
      else if(k===3){for(let i=0;i<=ph;i++)if(broodOk(m,5+ph)){const b=rand()*TAU;brood(m,'mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}m.t=1.2*g}
      else{m.spiral=1.5;m.spT=0;m.spA=a;m.t=1.9*g}}}
    else chargeStates(m,dt,a,.9*g,ph>=3);
  },
};
function enrage(m,txt){
  m.rage=true;m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);
  floats.push({x:m.x,y:m.y-m.r-18,txt:txt||'Enraged',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90]);
}
// the three-phase bosses shrug off blows for a moment, throw a ring and call mites when a phase breaks
function phaseFx(m){
  if(m.phase>=3)enrage(m);else{m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);floats.push({x:m.x,y:m.y-m.r-18,txt:'It changes',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90])}
}
function phaseShift(m){
  phaseFx(m);
  m.ward=1;m.st='idle';m.t=1;m.again=0;m.lift=0;ringShot(m,14,150,rand()*TAU);
  for(let i=0;i<2;i++)if(mons.length<8){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}
}
// a pet's blow is counted, and a vampiric pet feeds on it
function petFed(got){PETS.dmg+=got;const a=byPet;if(a.pet&&a.mods.includes('vampiric')&&a.hp>0&&a.hp<a.maxHp&&!(S.t-a.vAt<4)&&(a.vSum||0)<a.maxHp*.16){const h=Math.min(a.maxHp-a.hp,a.maxHp*.02);a.hp+=h;a.vAt=S.t;a.vSum=(a.vSum||0)+h;puff(a,'#b8263d',8,120)}}
function hurtM(m,d,quiet){
  if(CL())return mpHurtM(m,d,quiet);
  if(m.decoy){puff(m,col('#3fa596'),16);ringShot(m,6,150,rand()*TAU);sfx(700,.2,'sine',.25,200);reshuffle();return}
  if(m.ward>0){SND.ward();return}
  if(m.markT>0)d*=1.5;
  // (the three-phase bosses shed morsels as their health falls: the Hollow at every fifth, the King and the tyrants at every eighth, because their fight is long and their blows are heavy)
  const before=m.hp;m.hp-=d;if(!REM)ST.dmgDealt+=Math.max(0,Math.min(d,before));
  if(byPet)petFed(Math.max(0,Math.min(d,before))); // 2% of its health, at most once in four seconds, 16% in a level: the monsters' own rule
  m.flash=.12;puff(m,col(m.s.col),5,120);SND.hit(quiet);if(!quiet)haptic(12);floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(d),life:.7,c:REM?'#958ea3':'#e7dfcd'});
  const ch=m.maxHp/(m.s.crown?8:5);if(m.ai==='hollow'&&Math.floor(m.hp/ch)<Math.floor(before/ch)&&m.hp>0)morsels.push({id:nid(),x:m.x,y:m.y});
  if(m.boss&&m.hp>0){if(m.ai==='hollow'){const ph=m.hp<=m.maxHp/3?3:m.hp<=m.maxHp*2/3?2:1;if(ph>(m.phase||1)){m.phase=ph;phaseShift(m)}}else if(!m.rage&&m.hp<=m.maxHp*.4)enrage(m)}
  if(m.kind==='mimic'&&m.boss&&m.hp>0&&++m.hits%3===0)reshuffle();
  if(m.mods.length&&m.hp>0){
    if(m.mods.includes('thorned')){const t=Math.floor(m.hp/m.maxHp*5);if(t<m.fifth&&!(m.thornT>0)){m.fifth=t;m.thornT=.6;rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+60,fx:true});floats.push({x:m.x,y:m.y-m.r-18,txt:'Thorns',life:.9,c:'#d6a544'});sfx(700,.5,'square',.1,1400)}} // a fifth of its health gone: it bristles, and the thorns fly a moment later
    if(m.mods.includes('splitting')&&m.splitN>0&&m.hp<=m.maxHp*m.splitN/3){m.splitN--;const g=rand()*TAU,c=lesser(m.kind,m.x+Math.cos(g)*(m.r+30),m.y+Math.sin(g)*(m.r+30),m.maxHp*.07,true);c.s.col=m.s.col;
      rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+70,fx:true});floats.push({x:m.x,y:m.y-m.r-18,txt:'It splits',life:1.3,c:'#ff5b6e'});sfx(200,.3,'sawtooth',.2,400)}
  }
  if(m.hp<=0){
    mons=mons.filter(x=>x!==m);puff(m,col(m.s.col),m.boss?50:10,m.boss?320:160);ST.kills++;if(!m.boss&&P)manaGive(P.maxMana*MKILL);
    if(m.boss){mons=[];shots=[];pshots=[];zones=[];fields=[];S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);S.stop=.12;emit('bossdead',{level:S.level,time:ST.levelTime,cls:S.cls});if(MP.on)mpCleared()}
    else if(has('taste')&&rand()<.35){const f={id:nid(),x:m.x,y:m.y};collide(f,10,true);morsels.push(f)}
  }
}
// a vampiric boss feeds when it wounds a hero
function vamp(){
  if(boss&&boss.hp>0&&boss.mods.includes('vampiric')&&boss.hp<boss.maxHp&&!(S.t-boss.vAt<4)&&(boss.vSum||0)<boss.maxHp*.16){const h=Math.min(boss.maxHp-boss.hp,Math.round(boss.maxHp*.02));boss.hp+=h;boss.vAt=S.t;boss.vSum=(boss.vSum||0)+h;puff(boss,'#b8263d',12,140);floats.push({x:boss.x,y:boss.y-boss.r-10,txt:'+'+fmt(Math.round(h*10)/10),life:1,c:'#7fd66b'})}
}
function hurtP(d,src){
  if(P.inv>0||S.mode!=='play'||P.down||MP.away)return;
  if(window.__mb&&window.__mb.hits)window.__mb.hits[src]=(window.__mb.hits[src]||0)+1;
  if(TSRC.length&&TSRC[0].form==='ward'&&!(P.trCd>0)){P.trCd=2.5;P.trQ=1;P.trT=null} // hit, blocked or shrugged off: the ward answers
  if(P.guardT>0){P.inv=.4;puff(P,'#d6a544',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK/2);shock(115,2);return}
  if(rand()*100<Math.min(40,eqv('guard'))){P.inv=.5;floats.push({x:P.x,y:P.y-44,txt:'Shrugged off',life:.8,c:'#d5dce2'});SND.ward();return}
  if(cls()==='tank'&&P.shield){P.shield=false;P.shT=0;P.inv=.6;puff(P,'#d5dce2',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK*(S.adv==='paladin'?2:1));if(S.adv==='paladin'&&P.hp<P.maxHp){healP(.1,2)}if(pw(1))shock(115,2);return}
  {const G=d<=blow(0)&&allies.find(a=>a.kind==='guardian'&&a.shield);if(G){G.shield=false;G.shT=8;G.flash=.2;P.inv=.5;puff(P,TCOL.healer,10);floats.push({x:P.x,y:P.y-44,txt:'Guarded',life:.8,c:TCOL.healer});SND.block();haptic(30);return}} // the guardian turns aside a blow that is not a heavy one
  if(P.stoneT>0)d=Math.ceil(d/2);
  ST.dmgTaken+=Math.max(0,Math.min(d,P.hp));P.hp-=d;P.inv=1;S.shake=.3;S.stop=.06;const saved=P.hp<=0&&S.adv==='saint'&&!P.saved;haptic(P.hp>0||saved?70:[120,60,320]);if(has('touch'))floats.push({x:P.x,y:P.y-44,txt:'-'+d,life:.8,c:'#ff5b6e'});puff(P,has('skin')?'#b8263d':'#e7dfcd',8);SND.hurt();hud();
  if(CL())mpQ(['vp']);else vamp();
  if(saved){P.saved=true;P.hp=Math.ceil(P.maxHp/2);P.inv=2;hud();shock(140,3);floats.push({x:P.x,y:P.y-52,txt:'Saved',life:1.3,c:'#d6a544'});SND.skill('healer')}
  if(P.hp<=0){if(MP.on)return mpDown();S.mode='dead';SND.dead();ST.deaths++;save(S.level);
    show({kick:'You came apart',title:has('skin')?'Flesh fails':'A pile of bones again',body:'You keep everything you have won back so far. '+S.L.spec.name+' is still waiting.',btns:[['Try level '+(S.level+1)+' again',()=>startLevel(S.level)]]});
    emit('death',{level:S.level})}
}

/* ---------- player ---------- */
const keys={},want={atk:false,dash:false,skill:false,sk:[false,false,false,false,false,false],pt:null},joy={x:0,y:0};
function aim(pt,range,spd){
  if(pt)return Math.atan2(pt.y-P.y,pt.x-P.x);
  // nearest first, but never something warded while anything else is in reach, and with a ranged weapon the boss wins unless something small is close enough to bite
  let best=null,bd=1e9;const far=range>500;for(const m of mons){if(m.hidden)continue;const d=dist(m,P)-m.r;if(d<range&&(has('sight')||d<FOG)){const sc=d+(m.ward>.3?2000:0)-(far&&m.boss?200:0);if(sc<bd){bd=sc;best=m}}}
  if(best&&spd&&best.vx!==undefined&&best.st!=='charge'&&best.st!=='lunge'){const k=Math.min(.6,dist(best,P)/spd);return Math.atan2(best.y+best.vy*k-P.y,best.x+best.vx*k-P.x)} // auto-aim leads a moving target
  return best?angTo(P,best):P.face;
}
function pshot(a,spd,dmg,r,kind,pierce){pshots.push({x:P.x+Math.cos(a)*16,y:P.y-4+Math.sin(a)*16,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r,dmg,kind,pierce:pierce===true?99:pierce||0,hit:new Set(),sx:P.x,sy:P.y})}
function shock(r,d){
  rings.push({x:P.x,y:P.y,life:.4,max:.4,r,fx:true});if(MP.on)MP.rq.push([Math.round(P.x),Math.round(P.y),Math.round(r),40]);
  for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,P)<r+m.r)hurtM(m,d*dmgMul());
  clearShots(P,r+10);S.shake=.3;noise(.25,.4);sfx(70,.3,'square',.35,35);haptic(50);
}
function ally(kind,life){const a=rand()*TAU;return{nid:nid(),kind,x:P.x+Math.cos(a)*30,y:P.y+Math.sin(a)*30,r:kind==='wolf'?12:9,life:life||(kind==='wolf'||S.adv==='lich'?1e9:14),cd:0,walk:rand()*6}}
function leech(){if(cls()==='necro'&&pw(3)&&++P.lc%10===0&&P.hp<P.maxHp){healP(.05);puff(P,'#7fd66b',6)}}
function strike(pt){
  const c=cls(),a=aim(pt,melee(c)?170:1200,{mage:430,ranger:720,necro:400,healer:560}[c]),D=dmgMul(),H=cdMul();P.swing=a;
  if(c==='mage'){P.atk=.14;P.cd=.45*H;const n=1+(pw(1)?2:0)+S.b.spec+(S.adv==='archmage'?2:0);
    for(let i=0;i<n;i++){const o=i-(n-1)/2,mid=Math.abs(o)<.6;pshot(a+o*.17,430,(mid?2:1)*D,mid?5:4,'bolt',pw(3))}SND.bolt();return}
  if(c==='ranger'){P.atk=.1;P.cd=(pw(1)?.17:.28)*H;pshot(a,720,D,3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow();return}
  if(c==='necro'){P.atk=.14;P.cd=.48*H;pshot(a,400,1.8*D,5,'skull',S.adv==='reaper');SND.skull();return}
  if(c==='healer'){P.atk=.14;P.cd=.38*H;pshot(a,560,2.2*D,6,'orb',S.adv==='inquisitor');SND.orb();return}
  const M={tank:[2.2,.4,80,1.35],fighter:[2,.32,pw(1)?90:74,pw(1)?3.2:1.3],assassin:[1.15,.22,68,1.1]}[c]||[1,has('organs')?.3:.4,66,1.15];
  let dmg=M[0]*D,amb=false,hitM=null;if(c==='assassin'&&P.amb>0){dmg*=3+S.b.spec;P.amb=0;amb=true}
  const twice=c==='assassin'&&pw(1);
  P.atk=.16;P.cd=M[1]*H;SND.swing(c);
  for(const m of[...mons]){
    if(m.hidden||!mons.includes(m))continue;const d=dist(m,P);
    if(d<M[2]+m.r){const da=Math.atan2(Math.sin(angTo(P,m)-a),Math.cos(angTo(P,m)-a));
      if(Math.abs(da)<M[3]||d<m.r+18){const decoy=m.decoy;if(!m.boss&&!decoy)mPush(m,Math.cos(a)*26,Math.sin(a)*26);hurtM(m,dmg);if(twice&&mons.includes(m))hurtM(m,dmg*.6);if(!decoy&&(!hitM||m.boss))hitM=m;if(decoy)break}}
  }
  if(hitM&&c)troStrike(hitM,amb);
}
function field(kind,x,y,r,dur,every,dmg,slow){const f={kind,x,y,r,t:0,dur,every,tick:0,dmg,slow};clamp(f,10);fields.push(f)}
function rush(a,dmg,stun){P.dashT=dmg?.24:.2;P.dx=Math.cos(a);P.dy=Math.sin(a);P.face=a;P.rushD=dmg;P.rushStun=stun;P.rushHit=dmg?new Set():null;P.inv=Math.max(P.inv,.4)}
const debuff=(m,o,D)=>{const c=CL();if(c)mpQ(['db',m.id,o.slow||0,o.stun||0,o.dot?Math.round(o.dot*D*1000)/1000:0,o.mark||0]);
  if(o.slow&&!c)m.slow=Math.max(m.slow||0,o.slow);if(o.stun&&!c)m.stun=m.boss?o.stun:o.stun*2;if(o.dot){if(!c){m.dotT=6;m.dotD=o.dot*D;m.dotK=.5;m.dotRem=null}puff(m,'#7fd66b',10,120)}if(o.mark){if(!c)m.markT=o.mark;rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+40,fx:true});puff(m,'#b8263d',14,120)}};
const pierceOf=g=>g==='pw3'?pw(3):g==='barb'?(S.adv==='sharpshooter'?99:S.b.spec):g;
// one effect of a skill. x = {t: nearest monster or null, ta: angle to it, at: its position or a spot ahead, D: damage multiplier}
function cast(op,x){
  const[o,a,b,c,d,e,f,g,h]=op,{t,ta,at,D}=x,ring=(p,r)=>{rings.push({x:p.x,y:p.y,life:.5,max:.5,r,fx:true});if(MP.on)MP.rq.push([Math.round(p.x),Math.round(p.y),Math.round(r),50])};
  switch(o){
  case'shock':shock(a,b);break;                                   // radius, damage
  case'rush':rush(ta,a*D,b);break;                                // damage, stun: dash through the target
  case'back':rush(ta+Math.PI,0,0);break;                          // untouchable roll away from the target
  case'buff':P[a]=Math.max(P[a]||0,b);puff(P,'#d6a544',14,180);break; // timer name, seconds
  case'heal':healP(a);puff(P,'#7fd66b',18,200);break;
  case'shield':if(S.adv!=='berserker'){P.shield=true;P.shT=0}break;
  case'fan':for(let k=0;k<a;k++){pshot(ta+(k-(a-1)/2)*b,c,d*D,e,f,pierceOf(g));if(h){const p=pshots[pshots.length-1];if(h.boom)p.boom=h.boom*D;if(h.slow)p.slow=h.slow;if(h.stun)p.stun=h.stun}}break; // count, spread, speed, damage, radius, kind, pierce, extras
  case'ringp':for(let k=0;k<a;k++)pshot(k*TAU/a,b,c*D,d,e,pierceOf(f));break; // count, speed, damage, radius, kind, pierce
  case'blast':meteor(a==='at'?at:P,b,c,d*D,e);break;              // where, radius, delay, damage, extras
  case'line':for(let k=1;k<=a;k++)meteor({x:P.x+Math.cos(ta)*k*b,y:P.y+Math.sin(ta)*k*b},c,.3+k*.15,d*D);break; // count, spacing, radius, damage
  case'field':field(a,b==='at'?at.x:P.x,b==='at'?at.y:P.y,c,d,e,f*D,g);break; // kind, where, radius, seconds, tick, damage per tick, slows
  case'hit':debuff(t,b,D);if(a){puff(t,'#dfe6ec',12,200);hurtM(t,a*D)}break; // damage, debuffs: the target
  case'near':for(const m of[...mons])if(!m.hidden&&dist(m,P)<a+m.r)debuff(m,b,D);break; // radius, debuffs: every monster around you
  case'summon':for(let k=0;k<b;k++){const al=ally(a,c);al.extra=2;allies.push(al);puff(al,'#7fd66b',6)}break; // kind, count, seconds
  case'clear':clearShots(P,a);break;
  case'tele':puff(P,'#22242b',12);P.x=t.x+Math.cos(ta)*(t.r+24);P.y=t.y+Math.sin(ta)*(t.r+24);clamp(P,14);collide(P,14,true);P.face=ta+Math.PI;P.swing=P.face;P.inv=Math.max(P.inv,.6);puff(P,'#22242b',12);break;
  case'pull':case'knock':for(const m of mons)if(!m.hidden&&m.st!=='leap'&&dist(m,P)<a+m.r){const g2=angTo(P,m),dd=dist(m,P),nd=o==='pull'?Math.max(m.r+50,dd-(m.boss?90:400)):dd+(m.boss?80:160);mMove(m,P.x+Math.cos(g2)*nd,P.y+Math.sin(g2)*nd)}break;
  case'seq':if(a==='quake'){P.quakeN=2;P.quakeT=.4}else if(a==='cuts'){P.cutN=8;P.cutT=0;P.cutM=t;P.inv=Math.max(P.inv,1.9)}else{P.starN=7;P.starT=0}break;
  case'ring':ring(P,a);break;
  case'ringT':ring(t,t.r+a);puff(t,'#7fd66b',20,180);break;
  case'beam':for(let k=1;k<=6;k++)bits.push({x:t.x+(P.x-t.x)*k/6,y:t.y+(P.y-t.y)*k/6,vx:0,vy:0,life:.4,max:.4,c:'#7fd66b',r:3});break;
  case'chain':{const n3=mons.filter(m=>!m.hidden).sort((p,q)=>dist(p,P)-dist(q,P)).slice(0,3);for(const m of n3)if(mons.includes(m)){for(let k=1;k<=6;k++)bits.push({x:P.x+(m.x-P.x)*k/6+rand()*14-7,y:P.y+(m.y-P.y)*k/6+rand()*14-7,vx:0,vy:0,life:.3,max:.3,c:'#8fd3ff',r:3});hurtM(m,3*D)}break}
  case'army':for(const al of allies)if(al.extra===1)puff(al,'#e7dfcd',6);allies=allies.filter(al=>al.extra!==1); // a new army replaces the old one, so the cap holds
    for(let k=0;k<4;k++){const al=ally('thrall',9);al.extra=1;allies.push(al);puff(al,'#7fd66b',6)}break;
  case'burst':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);S.shake=.25;noise(.25,.35,900,150);
    for(const al of th){ring(al,70);puff(al,'#7fd66b',10,220);for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,al)<70+m.r)hurtM(m,2*D,true)}break}
  case'pact':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);for(const al of th)puff(al,'#7fd66b',8,160);healP(Math.min(.5,.1*th.length));break}
  }
}
function skill(si){
  const c=cls(),sk=SKILLS[c][si],need=sk[5],cost=skCost(si);
  if(P.mana<cost){noMana(si);return false} // not enough mana: nothing happens and the cooldown does not start
  let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}
  // nothing to use it on: keep the skill ready instead of wasting the cooldown
  if(need==='t'&&!t||need==='near'&&!(t&&bd<t.r+110)||need==='thrall'&&!allies.some(a=>a.kind==='thrall')){SND.fizzle();return false}
  const x={t,ta:t?angTo(P,t):P.face,at:t?{x:t.x,y:t.y}:{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160},D:dmgMul()};
  P.mana-=cost;P.atk=.16;P.swing=x.ta;SND.skill(c,si);if(sk[2]>=40){S.shake=Math.max(S.shake,.3);haptic([40,40,40,40,160])}else haptic(35);
  for(const op of sk[4]){if(S.mode!=='play')break;if((op[0]==='hit'||op[0]==='ringT'||op[0]==='beam')&&!mons.includes(t))continue;cast(op,x)}
  if(sk[0]==='shadowstep'&&TSRC.length&&TSRC[0].form==='venom'){P.trQ=1;P.trT=t}
  P.mxS[si]=sk[2]*skMul(si);P.cdS[si]=P.mxS[si];syncSkills();return true;
}
function meteor(at,r,dur,dmg,ex){const z={x:at.x,y:at.y,r,t:0,dur,mine:true,dmg,stun:ex&&ex.stun};clamp(z,10);zones.push(z)}
// skills that play out over time
function channels(dt){
  if(P.stormT>0){P.stormT-=dt;if((P.stormK-=dt)<=0){P.stormK=.4;shock(120,2);P.atk=.16;P.swing+=2}}
  if(P.quakeN>0&&(P.quakeT-=dt)<=0){P.quakeT=.4;shock(P.quakeN===2?190:250,4);P.quakeN--}
  if(P.cutN>0&&(P.cutT-=dt)<=0){const m=P.cutM;if(!mons.includes(m)||m.hidden)P.cutN=0;else{P.cutT=.2;P.cutN--;const a=rand()*TAU;puff(P,'#22242b',6);P.x=m.x+Math.cos(a)*(m.r+24);P.y=m.y+Math.sin(a)*(m.r+24);clamp(P,14);collide(P,14,true);P.face=P.swing=a+Math.PI;P.atk=.16;P.inv=Math.max(P.inv,.5);SND.swing('assassin');hurtM(m,3*dmgMul())}}
  if(P.starN>0&&(P.starT-=dt)<=0){P.starT=.35;P.starN--;let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}const at=t||{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160};meteor({x:at.x+rand()*60-30,y:at.y+rand()*60-30},80,.6,6*dmgMul())}
  if(P.fireT>0){P.fireT-=dt;if((P.fireK-=dt)<=0){P.fireK=.1;const a=aim(null,1200);P.swing=a;P.atk=.1;pshot(a+rand()*.1-.05,720,dmgMul(),3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow()}}
  if(P.renewT>0){P.renewT-=dt;if((P.renewK+=dt)>=1){P.renewK=0;if(P.hp<P.maxHp){healP(.04);puff(P,'#7fd66b',4,80)}}}
}
// slot i (0-5) carries skill S.load[i] once that skill is learned
const slotSkill=i=>{const si=S.load[i];return cls()&&si<known()?si:-1};
function syncSkills(){const c=cls();for(let i=0;i<NSK;i++){const s=SK[i],si=c?slotSkill(i):-1,d=si>=0&&SKILLS[c][si];s.index=si;s.id=d?d[0]:'';s.name=d?d[1]:'';s.unlocked=!!d;s.cd=P&&d?Math.max(0,P.cdS[si]):0;s.max=d?P&&P.mxS[si]||d[2]*skMul(si):0;s.ready=!!d&&s.cd<=0;s.cost=d?skCost(si):0;s.affordable=!!d&&!!P&&P.mana>=s.cost;if(P)P.skCds[i]=s.cd}if(P)P.skCd=P.skCds[0];manaSync()}
// the room against the player: pillars push back, a pit swallows you unless you are dashing across it, raised spikes and burning braziers hurt
function roomP(){
  collide(P,14,false);
  if(P.dashT>0)return;
  let pit=null,clear=true;for(const o of obstacles)if(o.kind==='pit'){const d=dist(o,P);if(d<o.r-6)pit=o;if(d<o.r+8)clear=false}
  if(pit){puff(P,'#0b0a0f',16,120);P.x=P.safeX;P.y=P.safeY;S.shake=Math.max(S.shake,.25);sfx(300,.35,'sine',.25,60);floats.push({x:pit.x,y:pit.y-10,txt:'You fall',life:1,c:'#ff5b6e'});hurtP(blow(0),'pit');if(S.mode==='play'){P.inv=Math.max(P.inv,.8);puff(P,'#e7dfcd',10)}return}
  if(clear){P.safeX=P.x;P.safeY=P.y}
  if(S.banner>1.5)return;
  for(const o of obstacles)if(o.on&&dist(o,P)<o.r-(o.kind==='spikes'?4:0)){hurtP(blow(0),o.kind);break}
}
// traps keep their own time: off, a warning, then on
function roomStep(dt){
  for(const o of obstacles){if(!o.per)continue;o.t=(o.t+dt)%o.per;
    const sp=o.kind==='spikes',onAt=o.per*(sp?.7:.65),warnAt=onAt-(sp?.7:.8),was=o.on;o.on=o.t>=onAt;o.warn=!o.on&&o.t>=warnAt;
    if(o.on&&!was){const near=dist(o,P)<260;if(sp){if(near)sfx(1500,.07,'square',.1,700)}else{if(near){sfx(160,.4,'sawtooth',.14,80);noise(.4,.14,500,1500)}puff(o,'#ff8a4c',12,220)}}
    if(o.on&&o.kind==='brazier'&&rand()<dt*30){const a=rand()*TAU,d=rand()*o.r;bits.push({x:o.x+Math.cos(a)*d,y:o.y+Math.sin(a)*d,vx:0,vy:-50-rand()*40,life:.5,max:.5,c:rand()<.5?'#ff8a4c':'#ffd95e',r:2.5})}}
}
function playerStep(dt){
  const c=cls(),spd=({ranger:245,tank:195,assassin:255,fighter:225}[c]||215)*(c?(1+.06*S.b.fleet)*(adv('s')||1)*(1+eqv('mv')/100)*(P.fleetT>0?1.4:1):1);
  let mx=(keys.right?1:0)-(keys.left?1:0)+joy.x,my=(keys.down?1:0)-(keys.up?1:0)+joy.y;
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}
  P.moving=l>.15;const ox=P.x,oy=P.y;
  if(P.dashT>0){P.dashT-=dt;const v=P.rushHit?780:640;P.x+=P.dx*v*dt;P.y+=P.dy*v*dt;
    if(P.rushHit){for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&!P.rushHit.has(m)&&dist(m,P)<m.r+30){P.rushHit.add(m);if(P.rushStun)mStun(m,m.boss?P.rushStun*.7:P.rushStun*2);if(P.rushD)hurtM(m,P.rushD)}if(P.dashT<=0){P.rushD=0;P.rushHit=null}}
    if(rand()<.6)bits.push({x:P.x,y:P.y,vx:0,vy:0,life:.25,max:.25,c:has('skin')?'#c68863':'#e7dfcd',r:6})}
  else if(P.moving){P.x+=mx*spd*dt;P.y+=my*spd*dt;P.face=Math.atan2(my,mx);P.walk+=dt*11}
  clamp(P,14);if(obstacles.length)roomP();
  P.vx=(P.x-ox)/dt;P.vy=(P.y-oy)/dt;
  for(const k of['inv','atk','cd','dashCd','amb','rageT','guardT','legT','fleetT','stoneT'])if(P[k]>0)P[k]-=dt;
  for(let i=0;i<10;i++)if(P.cdS[i]>0)P.cdS[i]=Math.max(0,P.cdS[i]-dt);
  if(S.mode==='play')channels(dt);
  manaStep(dt);
  const held=S.banner>1.5; // the monster stands frozen while the level banner is up, so you cannot hit it either
  if((want.atk||keys.atk)&&P.cd<=0&&!held)strike(want.pt);
  want.atk=false;want.pt=null;
  if(want.dash&&has('organs')&&P.dashCd<=0&&P.dashT<=0){
    if(c==='mage'){puff(P,'#8fd3ff',10);P.x+=Math.cos(P.face)*150;P.y+=Math.sin(P.face)*150;clamp(P,14);collide(P,14,true);puff(P,'#8fd3ff',10);P.inv=Math.max(P.inv,.35);P.dashCd=1.1;SND.blink()}
    else{P.dashT=.16;P.dashCd=c==='assassin'?(pw(3)?.25:.45):.85;P.amb=1.5;P.inv=Math.max(P.inv,.26);P.dx=Math.cos(P.face);P.dy=Math.sin(P.face);SND.dash()}
    haptic(10)}
  want.dash=false;
  if(want.skill)want.sk[0]=true;want.skill=false;
  for(let i=0;i<NSK;i++){const si=slotSkill(i);if(want.sk[i]&&si>=0&&P.cdS[si]<=0&&P.dashT<=0&&!(P.cutN>0)&&!held)skill(si);want.sk[i]=false}
  if(c==='tank'&&S.adv!=='berserker'&&!P.shield&&(P.shT+=dt)>=(pw(1)?3.5:6)*Math.pow(.85,S.b.spec)*(S.adv==='paladin'?.6:1)/(1+eqv('sh')/100)){P.shield=true;P.shT=0;sfx(660,.08,'sine',.12)}
  if(c==='necro'&&S.mode==='play'&&(P.sumT+=dt)>=(pw(1)?4:6)){P.sumT=0;
    if(allies.filter(a=>a.kind==='thrall'&&!a.extra).length<2+(pw(1)?2:0)+S.b.spec+(S.adv==='lich'?3:0)){const t=ally('thrall');allies.push(t);puff(t,'#7fd66b',6);sfx(180,.2,'sawtooth',.12,90)}}
  if(has('skin')&&P.hp<P.maxHp&&(P.regen+=dt)>=(c==='healer'?(pw(1)?2.5:4)*Math.pow(.88,S.b.spec)/(1+eqv('mend')/100):c==='tank'&&pw(3)?3.5:c==='fighter'?5:7)){P.regen=0;healP(.06)}
  syncSkills();
}

/* ---------- pets: a boss you have killed, bound (Necromancer) or tamed (Beastmaster) to fight beside you ---------- */
// A bound pet IS that monster, fighting for you. It runs the monster's own AI (the AI table above, with SIDE set): the same attacks, timings and patterns, the same rage below 40% health,
// the three phases of a tyrant or the King, and every modifier it carried (m.mods), all aimed at monsters.
// PETS.roster holds as many as you have taken: {kind (SPEC id), ai, name, col, r, lv (the level it was bound on, 0-based), mods (its modifiers), plv (pet level), perk (mods[0], kept for the HUD and the trophy forms), crown}.
// PETS.active lists the roster indices of those that go with you, in order: as many as your mana can hold. There is no limit on the roster and none on the field but the pool.
//
// Its strength is the monster's, not yours:
//   health  = the health it was generated with on level lv            x GROW x LVL  (x1.4 for a Lich)
//   a blow  = the share of a player's health its blow took on level lv (blowAt(lv)/PHP(lv): a brush 10%, a bolt 19%, a telegraphed blow 31%)
//             x PETK x GREF(level it stands at)                        x LVL        (x thrall-and-pet trinket, Legion, Reaper)
//   GREF(n) = the health of the reference ordinary monster of level n (560 x genMul(n); 115 on levels 9-12)
//   PETK    = .03: THE conversion from the player's health scale to the monsters'. A blow that would take a share s of a typical player's health takes s x 3% of an ordinary monster's health of that level.
//             The same conversion is used the other way: a monster's blow on a pet costs the pet blow/PHP(now) x PETK x GREF(now).
//   it stands at level Le = lv + PGROW x (now - lv): an old pet makes up 60% of the levels since it was bound. GROW = GREF(Le)/GREF(lv). LVL = 1 + 3% per pet level (one per fight it joins, 25 at most).
// Nothing is divided by the number of pets out. What limits the field is mana: a pet holds C0(n) x REL of the pool while it is out, where C0 = 16 + 0.45 per level past the ninth (it keeps step with a pool that is not built for pets) is what a fresh ordinary
// monster of the level you are on would hold, and REL = its power relative to that monster: GREF(Le)/GREF(now) x LVL x PATK[kind] (x PCROWNK for a tyrant or the King, x PMODK for a swift or a burning one), never less than PMIN.
// A fallen pet rises again REVT seconds later beside you at REVHP of its health for REVK x what it holds, from the free pool, and REVUP times more each further time in one level.
// PETS.auto: fallen pets are raised again from the free pool (the toggle on the pets screen). PETS.fallen: the entries that are down, in the order they fell. PETS.fieldCount: how many pets or familiars stand in the arena now.
// PETS.info(e): {power, cost, revive, hp, hit:[brush, bolt, blow], lv, at} of a roster entry as things stand, for the screens.
const PETS={roster:[],active:[],down:false,dmg:0,fielded:[],fallen:[],auto:true,get form(){return form()||'pet'},get fieldCount(){let n=0;for(const a of allies)if((a.pet||a.trophy)&&!a.minion)n++;return n},info:e=>petInfo(e)},
  PETSANE=2000,PLVMAX=25,MINIONS=60,PETK=.03,PGROW=.6,PLVK=.03,PMIN=5,REVK=1.25,STREF=115;
// How hard each kind hits as a pet, measured (r7-balance/atk.js): the damage one of them does alone against a boss of its own level, relative to the middle of the pool. Only the mana it holds follows from this (and the power shown).
// PCROWNK: a tyrant or the King also hits a tenth harder (BOSSDMG) and has several times the health. PMODK: what the modifiers that add damage are worth.
const PATK={crawler:2.2,hound:.7,witch:.95,fist:1.4,mother:1,burrower:2.3,bomber:1.75,summoner:1,beamer:.95,mimic:.95,hollow:2.7,mite:.3},PCROWNK=1.45,PMODK={swift:1.1,burning:1.12};
const petK=n=>Math.pow(Math.max(1,n),-.55); // familiars only: several share the work (pets do not)
const GREF=n=>{const g=560*genMul(Math.max(12,n));return n>=12?g:n<=11?STREF:STREF+(g-STREF)*(n-11)};
const petScale=n=>PETK*GREF(n)/PHP(n); // what one point of a blow in the player's measure is on the monsters' scale, on level n
const C0=n=>16+.45*Math.max(0,n-8);
const petOwner=()=>S.cls==='necro'?'necro':S.cls==='ranger'&&S.adv==='beastmaster'?'beast':null;
// the forms that are held with mana: pets and familiars. The other trophies cost nothing and go one at a time.
const resvForm=()=>{const f=form();return f==='pet'||f==='familiar'?f:null};
const petLe=e=>e.lv+PGROW*Math.max(0,S.level-e.lv),petLvl=e=>1+PLVK*e.plv;
const petAtk=e=>{let k=(PATK[e.ai]||1)*(e.crown?PCROWNK:1);for(const m of e.mods||[])k*=PMODK[m]||1;return k};
// its power relative to a fresh ordinary monster of the level you stand on, and the number shown for it (100 = an ordinary monster of level 13)
const petRel=e=>GREF(petLe(e))/GREF(S.level)*petLvl(e)*petAtk(e);
const petPower=e=>Math.max(1,Math.round(100*GREF(petLe(e))/GREF(12)*petLvl(e)*petAtk(e)));
// the health it was generated with on the level it was bound (without the cut a level with packs takes)
function petHp0(e){
  if(e.lv<LEVELS.length&&LEVELS[e.lv].boss===e.kind)return SPEC[e.kind].hp;
  let hp=GREF(e.lv)*(GENHP[e.ai]||560)/560*(e.crown?TYRHP*(e.lv>=59?TYRLATE:1):1);for(const k of e.mods||[])hp*=MODHP[k]||1;return hp;
}
const petHp=e=>Math.max(6,Math.round(petHp0(e)*GREF(petLe(e))/GREF(e.lv)*petLvl(e)*(S.adv==='lich'?1.4:1)));
// what its blows do: [a brush, a bolt or a beam, a telegraphed blow]
function petDu(e){
  const k=PETK*GREF(petLe(e))/PHP(e.lv)*petLvl(e)*(1+eqv('thr')/100)*(S.cls==='necro'?1+.04*S.b.spec:1)*(S.adv==='reaper'?2:1);
  return[-1,0,1].map(h=>Math.max(.05,Math.round(blowAt(e.lv,h)*k*100)/100));
}
// what one of them holds while it is out, and what it costs to raise it again after it fell (dearer each time within a level)
const petCost=e=>{const f=resvForm();if(!f)return 0;
  if(f==='familiar')return Math.max(1,Math.round((e.crown?PCROWN:PCOST).familiar*(S.adv==='archmage'?.8:1)));
  return Math.max(PMIN,Math.round(C0(S.level)*petRel(e)*(S.adv==='lich'||S.adv==='beastmaster'?.8:1)))};
const reviveCost=e=>Math.round(petCost(e)*REVK*Math.pow(REVUP,e.revN||0));
const petInfo=e=>({power:petPower(e),cost:petCost(e),revive:reviveCost(e),hp:petHp(e),hit:petDu(e),lv:e.lv,at:petLe(e)});
const petCap=()=>resvForm()?1e9:form()?1:0;
// how strong a roster entry is, for sorting and for "fill from the strongest down"
const petRank=e=>form()==='pet'?petPower(e):(e.crown?1e4:0)+e.plv*10+(e.perk?5:0)+e.r/100;
// the roster entries that go with you, in order: everything on the active list that the pool can hold
const petOn=()=>{const out=[],f=form();if(!f)return out;const rs=resvForm(),M=rs?manaMax():0;let sum=0;
  for(const i of PETS.active){const e=PETS.roster[i];if(!e)continue;if(rs){const c=petCost(e);if(sum+c>M)continue;sum+=c}else if(out.length)break;out.push(e)}return out};
const petHeld=(on=petOn())=>{let s=0;for(const e of on)s+=petCost(e);return s};
// can this entry be sent out as things stand: is there unheld mana for it
const petFits=e=>!resvForm()?petOn().length<1:petHeld()+petCost(e)<=manaMax();
// the reserve follows who is in the field: called whenever that changes
function resvSync(){if(!P)return;P.resv=P.maxMana?Math.min(P.maxMana,petHeld()):0;if(P.mana>manaRoom())P.mana=manaRoom();manaSync()}
// at the start of a level: if the pool can no longer hold everyone on the active list, the weakest wait, and you are told
function petTrim(){
  if(!resvForm())return[];const R=PETS.roster,M=manaMax(),out=[];let A=PETS.active.filter(i=>R[i]),sum=0;for(const i of A)sum+=petCost(R[i]);
  while(sum>M&&A.length){let w=0;for(let j=1;j<A.length;j++)if(petRank(R[A[j]])<petRank(R[A[w]]))w=j;sum-=petCost(R[A[w]]);out.push(R[A[w]]);A.splice(w,1)}
  PETS.active=A;return out;
}
const petTag=e=>e.name+(e.plv?' +'+e.plv:'');
const PERK={swift:'Swift: it acts faster',shielded:'Shielded: every nine seconds a ward closes round it and nothing can hurt it for a while',burning:'Burning: the ground at its feet bursts into fire and burns monsters near it',vampiric:'Vampiric: it heals when it wounds a monster',thorned:'Thorned: each fifth of its health it loses throws a ring of thorns',splitting:'Splitting: wounded, it sheds a lesser copy of itself that fights for you, twice'};
const PETDO={crawler:'It stalks its prey, spits three bolts and lunges; enraged, it lunges twice and throws a ring.',hound:'It circles, then charges through its prey; enraged, it charges twice.',witch:'It keeps its distance and throws fans and rings of bolts; enraged, more of them, and it blasts the ground.',fist:'It leaps and slams the ground, and every third slam cracks the ground around it.',mother:'It hatches mites that bite, and spits.',burrower:'It digs under its prey, erupts in a ring of bolts and spits while it is up.',bomber:'It lobs bombs where its prey is and where it is going.',summoner:'It raises husks, and nothing can hurt it while two of them stand.',beamer:'It throws bolts, then sweeps a beam across the room; enraged, two beams.',mimic:'It circles its prey and throws bolts.',hollow:'It charges, throws rings and spirals of bolts, cracks the ground and calls mites, in three phases as its health falls.',mite:'It bites.'};
const petSpec=e=>({...(SPEC[e.kind]||SPEC.crawler),ai:e.ai,name:e.name,col:e.col,crown:e.crown?1:0,r:Math.round(Math.max(16,Math.min(e.crown?36:30,e.r*.8)))});
const petCol=a=>a.owner==='necro'?'#7fd66b':'#8fd3ff';
// what a modifier needs on the body that carries it (monsters get the same from arm)
function petArm(a){if(a.mods.includes('swift'))a.spdK=1.12;a.shT=5;a.burnT=2.5;a.fifth=4;a.thornT=0;a.splitN=2}
function makePet(e,frac=1,owner=petOwner(),slot=0,n=1){
  const s=petSpec(e),g=n>1?slot/n*TAU+rand()*.5:rand()*TAU,hp=petHp(e),far=n>12?46+rand()*70:n>4?62:46,lag=Math.min(.45,1.5/n);
  const a={nid:nid(),sk:e.kind,kind:'pet',pet:true,owner:owner||'necro',e,k:1,slot,s,ai:AI[e.ai]?e.ai:'mite',name:e.name,plv:e.plv,perk:e.perk,crown:e.crown,x:P.x+Math.cos(g)*far,y:P.y+Math.sin(g)*far,r:s.r,hp:Math.max(1,Math.round(hp*frac)),maxHp:hp,
    st:'idle',t:1.2+slot*lag,n:0,ang:-Math.PI/2,face:-Math.PI/2,flash:0,ring:0,hits:0,hidden:false,lift:0,seed:rand()*9,life:1e9,walk:0,flip:false,inv:0,side:rand()<.5?-1:1,mods:(e.mods||[]).slice(),ward:0,beam:null,boss:false,moving:false,
    du:petDu(e),touch:new Map(),rage:false,phase:1};
  petArm(a);
  // one that comes back wounded comes back as far gone as it is
  if(a.ai==='hollow'){a.phase=a.hp<=hp/3?3:a.hp<=hp*2/3?2:1;a.rage=a.phase>=3}else a.rage=a.hp<=hp*.4;
  clamp(a,a.r);if(obstacles.length)collide(a,a.r,true);return a;
}
// what a pet's AI raises (mites, husks) and what a splitting pet sheds: small bodies on your side. They bite, they can be killed, and they go when their parent goes.
const broodN=a=>{const p=a.par||a;let n=0;for(const x of allies)if(x.par===p&&x.life>0)n++;return n};
const minionN=()=>{let n=0;for(const x of allies)if(x.minion&&x.life>0)n++;return n};
// may this body raise one more: a monster while fewer than `cap` monsters stand (itself included), a pet while it has fewer than cap-1 of its own (and all pets together fewer than MINIONS, so a huge field stays playable)
const broodOk=(m,cap)=>SIDE?broodN(m)<cap-1&&minionN()<MINIONS:mons.length<cap;
function brood(m,kind,x,y){
  if(!SIDE)return spawn(kind,x,y);
  if(minionN()>=MINIONS)return null;
  const p=m.par||m,s={...SPEC[kind],ai:'mite',col:p.s.col},hp=petScale(S.level)*blow(-1)*(kind==='husk'?2.2:1.5); // a mite on your side dies to a bolt, a blast or a second brush, as theirs do to you
  const c={nid:nid(),sk:kind,kind:'pet',pet:true,minion:true,par:p,owner:p.owner,s,ai:'mite',name:s.name,plv:0,x,y,r:s.r,hp,maxHp:hp,st:'idle',t:1,n:0,ang:rand()*TAU,face:0,flash:0,ring:0,hits:0,hidden:false,lift:0,seed:rand()*9,life:1e9,walk:0,flip:false,inv:0,side:1,
    mods:[],ward:0,beam:null,boss:false,moving:false,du:p.du,touch:new Map(),rage:false,phase:1};
  clamp(c,c.r);if(obstacles.length)collide(c,c.r,true);allies.push(c);puff(c,petCol(p),6);return c;
}
function petLesser(a){
  if(minionN()>=MINIONS)return null;
  const g=rand()*TAU,base=SPEC[a.e?a.e.kind:a.ai]||a.s,s={...a.s,name:'Lesser '+base.name.replace('The ',''),r:Math.max(10,Math.round(a.r*.72)),crown:0},hp=Math.max(.1,a.maxHp*.07);
  const c={nid:nid(),sk:a.sk||a.ai,kind:'pet',pet:true,minion:true,lesser:true,par:a,owner:a.owner,s,ai:a.ai,name:s.name,plv:0,x:a.x+Math.cos(g)*(a.r+30),y:a.y+Math.sin(g)*(a.r+30),r:s.r,hp,maxHp:hp,st:'idle',t:1+rand()*.6,n:0,ang:g,face:g,flash:0,ring:0,hits:0,hidden:false,lift:0,seed:rand()*9,life:1e9,
    walk:0,flip:false,inv:0,side:1,mods:[],ward:0,beam:null,boss:false,moving:false,du:a.du,touch:new Map(),rage:false,phase:1,spdK:.8};
  clamp(c,c.r);if(obstacles.length)collide(c,c.r,true);allies.push(c);puff(c,col(a.s.col),10);return c;
}
// the small helpers a trophy raises (mother, caller): short-lived, cannot be hurt, bite for a set amount. These are not pets and keep the old rules.
function troMinion(a,kind,dmg,life){
  const g=rand()*TAU,s={...SPEC[kind],ai:'mite',col:a.s.col},m={nid:nid(),sk:kind,kind:'pet',pet:true,minion:true,helper:true,trophy:!!a.trophy,par:a,owner:a.trophy?'beast':a.owner,s,ai:'mite',name:s.name,plv:0,x:a.x+Math.cos(g)*(a.r+16),y:a.y+Math.sin(g)*(a.r+16),r:s.r,hp:1,maxHp:1,
    st:'idle',t:0,n:0,ang:g,face:g,flash:0,hidden:false,lift:0,seed:rand()*9,life,cd:.3,walk:0,flip:false,inv:0,side:1,mods:[],ward:0,beam:null,boss:false,moving:false,dk:dmg};
  clamp(m,m.r);if(obstacles.length)collide(m,m.r,true);allies.push(m);puff(m,a.owner==='necro'?'#7fd66b':'#8fd3ff',6);return m;
}
const minions=a=>{let n=0;for(const x of allies)if(x.par===a&&x.life>0)n++;return n};
// a trophy may raise one more helper while it has fewer than `per` of its own and all of them together are fewer than four
const minionRoom=(a,per)=>{let all=0;for(const x of allies)if(x.helper&&x.life>0)all++;return all<4&&minions(a)<per};
let byPet=null;
// a coarse grid of the pets that stand in the arena, rebuilt once a step: neighbours are found through it instead of by looking at every other pet
const PG=new Map(),PGC=80;
function petGrid(){PG.clear();for(const a of allies){if(!a.pet||a.minion||a.life<=0)continue;const k=Math.floor(a.x/PGC)+Math.floor(a.y/PGC)*64;let c=PG.get(k);if(!c)PG.set(k,c=[]);c.push(a)}}
// every blow a pet lands goes through here, so it can be counted and so a vampiric pet can feed
function petHit(m,d,a){if(!mons.includes(m))return;byPet=a||true;hurtM(m,d,true);byPet=null;leech()}
function petShot(a,g,spd,dmg,r=4,pierce=0){pshots.push({x:a.x+Math.cos(g)*a.r*.8,y:a.y+Math.sin(g)*a.r*.8,vx:Math.cos(g)*spd,vy:Math.sin(g)*spd,r,dmg,kind:a.owner==='necro'?'skull':'bolt',pierce,hit:new Set(),sx:a.x,sy:a.y,pet:a})}
function petBlast(a,at,r,dur,dmg){const z={x:at.x,y:at.y,r,t:0,dur,mine:true,dmg,pet:a};clamp(z,10);zones.push(z);return z}
// a pet's beam: everything it lies across is burned like a bolt, each monster at most once a second (as you are, by theirs)
function beamHits(a,r){const ms=mons;for(const m of ms)if(!m.hidden&&!m.decoy&&mons.includes(m)&&segDist(m,a.x,a.y,r.a,r.len)<a.beam.w+m.r-4&&petTouch(a,m,'b'))petHit(m,a.du[1],a.par||a)}
// one pet can hurt one monster by touch (or by beam) once a second, the way your own second of grace works against them
function petTouch(a,m,k){const T2=k?(a.touchB||(a.touchB=new Map())):a.touch,l=T2.get(m);if(l!==undefined&&S.t-l<1)return false;if(T2.size>40)T2.clear();T2.set(m,S.t);return true}
function petRage(a){a.rage=true;a.flash=.3;rings.push({x:a.x,y:a.y,life:.6,max:.6,r:a.r+90,fx:true});puff(a,petCol(a),18,220);floats.push({x:a.x,y:a.y-a.r-18,txt:a.name+' rages',life:1.4,c:petCol(a)});sfx(110,.5,'sawtooth',.12,55)}
// a tyrant or the King on your side changes phase as it would against you: a moment of ward, a ring, two mites, and rage in the third
function petPhase(a){
  const was=SIDE;SIDE=a;
  if(a.phase>=3)petRage(a);else{a.flash=.3;rings.push({x:a.x,y:a.y,life:.6,max:.6,r:a.r+90,fx:true});puff(a,petCol(a),18,220);floats.push({x:a.x,y:a.y-a.r-18,txt:a.name+' changes',life:1.4,c:petCol(a)});sfx(110,.5,'sawtooth',.12,55)}
  a.ward=1;a.st='idle';a.t=1;a.again=0;a.lift=0;a.beam=null;ringShot(a,14,150,rand()*TAU);
  for(let i=0;i<2;i++)if(broodOk(a,8)){const b=rand()*TAU;brood(a,'mite',a.x+Math.cos(b)*50,a.y+Math.sin(b)*50)}
  SIDE=was;
}
// d: a blow in the player's measure (blow()); it lands on the monsters' scale
function hurtPet(a,d){
  if(a.helper||a.inv>0||a.hidden||a.st==='leap'||a.hp<=0||a.life<=0||S.mode!=='play')return;
  if(a.ward>0)return;
  d=Math.max(.1,Math.round(d*petScale(S.level)*10)/10);
  a.hp-=d;a.inv=1;a.flash=.15;puff(a,col(a.s.col),5,120);if(!a.minion||a.lesser)floats.push({x:a.x,y:a.y-a.r-8,txt:'-'+fmt(d),life:.6,c:'#ffb3bf'});
  if(a.hp>0){
    if(a.minion)return;
    if(a.ai==='hollow'){const ph=a.hp<=a.maxHp/3?3:a.hp<=a.maxHp*2/3?2:1;if(ph>(a.phase||1)){a.phase=ph;petPhase(a)}}else if(!a.rage&&a.hp<=a.maxHp*.4)petRage(a);
    if(a.mods.length){
      if(a.mods.includes('thorned')){const t=Math.floor(a.hp/a.maxHp*5);if(t<a.fifth&&!(a.thornT>0)){a.fifth=t;a.thornT=.6;rings.push({x:a.x,y:a.y,life:.6,max:.6,r:a.r+60,fx:true});floats.push({x:a.x,y:a.y-a.r-18,txt:'Thorns',life:.9,c:petCol(a)})}}
      if(a.mods.includes('splitting')&&a.splitN>0&&a.hp<=a.maxHp*a.splitN/3){a.splitN--;petLesser(a);rings.push({x:a.x,y:a.y,life:.5,max:.5,r:a.r+70,fx:true});floats.push({x:a.x,y:a.y-a.r-18,txt:'It splits',life:1.3,c:petCol(a)})}
    }
    return}
  a.hp=0;a.life=0;a.beam=null;
  if(a.minion){puff(a,col(a.s.col),8,140);return}
  a.e.down=true;a.e.frac=0;a.e.revT=REVT;if(!PETS.fallen.includes(a.e))PETS.fallen.push(a.e);PETS.down=petOn().every(e=>e.down);puff(a,col(a.s.col),22,220);floats.push({x:a.x,y:a.y-a.r-20,txt:a.name+' falls',life:1.6,c:'#ff5b6e'});sfx(160,.5,'sawtooth',.2,60);haptic(40);
}
// who a pet goes for: the nearest monster above ground, but the boss unless something small is close, and nothing warded while there is a choice
function petTarget(a){let t=null,bd=1e9;for(const m of mons){if(m.hidden||m.decoy)continue;const d=dist(m,a)-m.r-(m.boss?140:0)+(m.ward>.3?2000:0);if(d<bd){bd=d;t=m}}return t}
// (the helpers of the trophy forms still walk with this)
function petMove(a,g,sp,dt,raw,dgoal=1e9){
  const room=obstacles.length&&!a.hidden,ox=a.x,oy=a.y;
  if(room&&!raw)g=steer(a,g,dgoal);
  a.x+=Math.cos(g)*sp*dt;a.y+=Math.sin(g)*sp*dt;a.walk+=dt*12;a.flip=Math.cos(g)<0;a.moving=true;
  let hit=false;if(room&&collide(a,a.r,true)&&raw)hit=(a.x-ox)*Math.cos(g)+(a.y-oy)*Math.sin(g)<sp*dt*.35;
  return clamp(a,a.r)||hit;
}
// what its modifiers do as time passes, for a monster and for a pet alike (SIDE decides whom the thorns and the fire hurt)
function modStep(m,dt){
  if(m.thornT>0&&(m.thornT-=dt)<=0&&!m.hidden){ringShot(m,7,150,rand()*TAU);puff(m,'#e7dfcd',10,200);sfx(500,.12,'square',.14,250)}
  if(m.mods.length&&!(m.stun>0)){
    if(m.mods.includes('shielded')&&(m.shT-=dt)<=0){m.shT=9;m.ward=2.5;rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+50,fx:true});sfx(880,.3,'sine',.14,1320)}
    if(m.mods.includes('burning')){if(rand()<dt*10)bits.push({x:m.x+rand()*m.r*2-m.r,y:m.y+rand()*m.r-m.r/2,vx:rand()*30-15,vy:-60-rand()*40,life:.5,max:.5,c:rand()<.5?'#ff8a4c':'#ffd95e',r:2.5});
      if((m.burnT-=dt)<=0){m.burnT=3.2;if(!m.hidden&&m.st!=='leap')zone(m.x,m.y,m.r+40,1,m)}}}
}
const MID={lunge:1,charge:1,dazed:1,leap:1,rise:1};
function petStep(a,dt){
  a.moving=false;if(a.flash>0)a.flash-=dt;if(a.inv>0)a.inv-=dt;
  if(a.par&&!(a.par.life>0))a.life=0;
  if(a.helper){ // a trophy's helper: walks up and bites, for as long as it lasts
    a.life-=dt;if(a.life<=0){puff(a,'#e7dfcd',5);return}
    if(a.avT>0)a.avT-=dt;a.cd-=dt;const t=petTarget(a);
    if(t){const g=angTo(a,t),d=dist(a,t);a.face=g;if(d>t.r+a.r)petMove(a,g+Math.sin(S.t*3+a.seed)*.4,190,dt,false,d);else if(a.cd<=0){a.cd=.7;petHit(t,a.dk,a.par||a)}}
    else{const to=a.par&&a.par.life>0?a.par:P,d=dist(a,to);if(d>(to.r||0)+a.r+44){const g=angTo(a,to);a.face=g;petMove(a,g,220,dt,false,d)}}
    return}
  if(a.life<=0){puff(a,col(a.s.col),6,120);return}
  if(a.ward>0)a.ward-=dt;
  const t=petTarget(a),ox=a.x,oy=a.y,k=aiK(a);
  SIDE=a;
  if(t){T=t;const g=angTo(a,t);a.face=g;a.lx=t.x;a.ly=t.y;AI[a.ai](a,dt*k,g,Math.max(0,dist(a,t)-t.r+11))}
  else if(MID[a.st]){T={x:a.lx===undefined?a.x:a.lx,y:a.ly===undefined?a.y:a.ly,r:11,vx:0,vy:0};AI[a.ai](a,dt*k,angTo(a,T),1e9)} // nothing to fight: a move already begun is finished where its prey last stood
  else{ // otherwise it comes back to its owner (or its parent)
    a.st='idle';a.hidden=false;a.beam=null;a.lift=0;a.t=Math.min(a.t,.8);const to=a.par&&a.par.life>0?a.par:P,d=dist(a,to);T=to;if(d>(to.r||0)+a.r+44){const g=angTo(a,to);a.face=g;move(a,g,220,dt)}}
  if(S.mode==='play')modStep(a,dt);
  SIDE=null;T=P;
  if(a.st==='charge'||a.st==='lunge')a.face=a.ang;
  // pets keep a little room between them, so two never stand on one spot
  else if(!a.minion&&!a.hidden&&a.st!=='leap'&&a.st!=='dazed'){
    // only the pets in this cell of the grid and the eight around it are looked at (see petGrid), so a big field costs no more per pet than a small one; one push per step at most
    const cx=Math.floor(a.x/PGC),cy=Math.floor(a.y/PGC);let px=0,py=0,hit=0;
    for(let gy=cy-1;gy<=cy+1;gy++)for(let gx=cx-1;gx<=cx+1;gx++){const cell=PG.get(gx+gy*64);if(!cell)continue;
      for(const b of cell){if(b===a||b.hidden||b.st==='leap'||b.life<=0)continue;const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),min=a.r+b.r+14;
        if(d<min){const g=d>1?Math.atan2(dy,dx):a.slot*2.1+1,p=min-d;px+=Math.cos(g)*p;py+=Math.sin(g)*p;hit++}}}
    if(hit){const l=Math.hypot(px,py),p=Math.min(l,90*dt);if(l>.01){a.x+=px/l*p;a.y+=py/l*p;clamp(a,a.r);if(obstacles.length)collide(a,a.r,true)}}}
  if(obstacles.length&&!a.hidden&&a.st!=='leap'){collide(a,a.r,true);
    if(a.moving&&Math.hypot(a.x-ox,a.y-oy)<12*dt){if((a.stk=(a.stk||0)+dt)>.45){a.stk=0;a.avS=-(a.avS||1);a.avT=1.2;a.side*=-1}}else a.stk=0}
  if(a.moving){a.walk+=dt*12;if(Math.abs(a.x-ox)>.01)a.flip=a.x<ox}
  // its touch: a brush against a monster is a light blow, a charge or a lunge that connects is a heavy one
  if(!a.hidden&&a.st!=='leap'&&a.st!=='dazed'&&S.mode==='play'){const ms=mons;for(const m of ms){if(m.hidden||m.decoy||dist(a,m)>=a.r+m.r-4||!mons.includes(m)||!petTouch(a,m))continue;petHit(m,a.du[a.st==='charge'||a.st==='lunge'?2:0],a.par||a)}}
}
// what a monster does to pets: its touch, its charge and its beam hurt them, as they would hurt you
function monVsPets(m){
  for(const a of allies){if(!a.pet||a.helper||a.hidden||a.st==='leap'||a.inv>0||a.life<=0)continue;
    if(!m.hidden&&m.st!=='leap'&&m.st!=='dazed'&&!(m.stun>0)&&dist(m,a)<m.r+a.r-4)hurtPet(a,blow(m.st==='charge'||m.st==='lunge'?1:-1));
    else if(m.beam&&m.beam.on&&!m.hidden)for(const r of m.beam.rays)if(segDist(a,m.x,m.y,r.a,r.len)<m.beam.w+a.r*.6){hurtPet(a,blow(0));break}}
}
// The active pets take their places beside you at the start of a level (mid false), or when the choice changes from the pause screen (mid true).
// Mid-fight nothing is healed by the change: a pet keeps the share of health it had, and one that steps in fresh takes the lowest share on the field.
function fieldPets(mid){
  if(form()!=='pet')return fieldTrophies(mid);
  const old=allies.filter(a=>a.pet&&!a.minion);for(const a of old)a.e.frac=a.hp/a.maxHp;
  allies=allies.filter(a=>!a.pet&&!a.trophy);TSRC=[];if(!P)return[];
  if(!mid){for(const e of PETS.roster){e.down=false;e.frac=undefined;e.revN=0;e.revT=0}PETS.fallen=[];
    const w=petTrim();if(w.length)S.note=(w.length>1?w.length+' pets wait':w[0].name+' waits')+': not enough mana to hold '+(w.length>1?'them':'it')}
  resvSync();
  const on=petOn(),out=on.filter(e=>!e.down),low=old.length?Math.min(...old.map(a=>a.hp/a.maxHp)):1,made=[];
  PETS.fallen=PETS.fallen.filter(e=>e.down&&on.includes(e));for(const e of PETS.roster)if(e.down&&!on.includes(e))e.down=false; // one that was called back while it was down is simply waiting
  out.forEach((e,i)=>{const was=old.find(a=>a.e===e),a=makePet(e,mid?(e.frac===undefined?low:e.frac):1,petOwner(),i,out.length);if(was){a.x=was.x;a.y=was.y;a.nid=was.nid}
    allies.push(a);made.push(a);if(!PETS.fielded.includes(e))PETS.fielded.push(e);if(!was)puff(a,a.owner==='necro'?'#7fd66b':'#8fd3ff',14,150)});
  PETS.down=on.length>0&&on.every(e=>e.down);return made;
}
// Fallen pets rise again, one at a time and in the order they fell: REVT seconds after the fall, as soon as the free pool can pay. The mana a fallen pet holds stays held.
function reviveStep(dt){
  const F=PETS.fallen;if(!F.length)return;
  for(const e of F)if(e.revT>0)e.revT-=dt;
  if(!PETS.auto||!P||S.mode!=='play'||P.down)return;
  const e=F[0];if(!e.down){F.shift();return}
  const c=reviveCost(e);if(e.revT>0||P.mana<c)return;
  const on=petOn(),i=on.indexOf(e);F.shift();if(i<0){e.down=false;return}
  P.mana-=c;e.down=false;e.revN=(e.revN||0)+1;e.frac=REVHP;PETS.down=false;
  const g=rand()*TAU,a=makePet(e,REVHP,petOwner(),i,on.length);a.x=P.x+Math.cos(g)*(a.r+18);a.y=P.y+Math.sin(g)*(a.r+18);a.t=.8;a.inv=1.2;clamp(a,a.r);if(obstacles.length)collide(a,a.r,true);
  allies.push(a);const cc=a.owner==='necro'?'#7fd66b':'#8fd3ff';puff(a,cc,18,170);rings.push({x:a.x,y:a.y,life:.5,max:.5,r:a.r+34,fx:true});
  floats.push({x:a.x,y:a.y-a.r-20,txt:a.name+' rises · -'+c+' mana',life:1.5,c:cc});sfx(196,.3,'triangle',.16,392);sfx(392,.25,'sine',.1,784,.12);haptic([20,30,40]);
}

/* ---------- trophies: what the other classes take from a boss they have killed ---------- */
// The same roster as pets (PETS.roster, PETS.active), but the entry is not a creature that walks: the boss's signature attack is thrown by the class in its own way.
// Fighter: a technique, after every fourth blow that lands. Tank: a ward, when hit or blocking. Assassin: a venom, on the strike after a dash and on Shadowstep.
// Ranger (before Beastmaster): an arrowhead, on every sixth arrow that hits. Mage: familiars, on a timer. Healer: a guardian, on a timer, with a small shield.
// Every firing goes through troFire: it deals its damage through the pets' own channels (petHit, petShot, petBlast, troMinion) and leaves an entry in `echoes` for the renderers.
const FORM={fighter:'technique',tank:'ward',assassin:'venom',mage:'familiar',ranger:'arrowhead',healer:'guardian'};
const form=()=>petOwner()?'pet':S.cls&&FORM[S.cls]||null;
// what one firing is worth, in multiples of your damage (TRO scales every kind's attack to about one unit against a single target), and how often the timed ones fire
const TRX={technique:3,ward:14,venom:7,familiar:7.5,arrowhead:3.5,guardian:8},TRT={familiar:3.5,guardian:4};
const TCOL={fighter:'#ffa64d',tank:'#6ea3e0',assassin:'#b6e04a',mage:'#b88cff',ranger:'#7fe0c0',healer:'#ffe08a'};
let TSRC=[]; // for the forms that are not entities: one stand-in per active trophy, so damage, minions and levelling have something to hang on
const troPow=a=>(TRX[a.form]||1)*(a.k||1)*dmgMul()*(a.tm?1/cdMul():1)*(a.form==='familiar'?1+.08*S.b.spec:1)*(a.form==='ward'?Math.min(3,Math.max(1,(P.trW||0)/2.5)):1)*(1+.02*a.e.plv)*(a.e.perk?1.1:1)*(a.e.crown?1.1:1);
const troBolts=(a,g,D,n=3)=>{for(let i=0;i<n;i++)petShot(a,g+(i-(n-1)/2)*.07,600,D,4)};
// one firing per monster kind: (source, target, angle to it, damage of one unit). Returns true when the attack lands on the target itself, so its echo is drawn beside the target.
const TRO={
  mite(a,t,g,D){petHit(t,D,a);return true},
  crawler(a,t,g,D){petHit(t,D,a);return true},
  hound(a,t,g,D){const len=dist(a,t)+90;for(const m of[...mons])if(!m.hidden&&!m.decoy&&mons.includes(m)&&segDist(m,a.x,a.y,g,len)<m.r+24)petHit(m,(m===t?.95:.6)*D,a)},
  witch(a,t,g,D){troBolts(a,g,.4*D)},
  fist(a,t,g,D){petBlast(a,t,88,.45,1.15*D);return true},
  mother(a,t,g,D){for(let i=0;i<2;i++)if(minionRoom(a,3))troMinion(a,'mite',.07*D,7);else petShot(a,g+(i?.05:-.05),600,.5*D,4)},
  burrower(a,t,g,D){petBlast(a,t,80,.4,1.15*D);return true},
  bomber(a,t,g,D){for(const k of[0,.5]){const z=petBlast(a,{x:t.x+(t.vx||0)*k,y:t.y+(t.vy||0)*k},62,.7,.62*D);z.sx=a.x;z.sy=a.y}},
  summoner(a,t,g,D){for(let i=0;i<2;i++)if(minionRoom(a,2))troMinion(a,'husk',.07*D,8);else petShot(a,g+(i?.05:-.05),600,.5*D,4)},
  beamer(a,t,g,D){petShot(a,g,950,D,9,99)},
  mimic(a,t,g,D){petShot(a,g,620,1.05*D,6)},
  hollow(a,t,g,D){for(let i=0;i<10;i++)petShot(a,g+.31+i*TAU/10,320,.12*D,4);troBolts(a,g,.3*D)},
};
function troFire(a,t){
  if(S.mode!=='play'||S.banner>1.5||!t||!mons.includes(t)||t.hidden)return false;
  const lead=Math.min(.5,dist(a,t)/600),g=Math.atan2(t.y+(t.vy||0)*lead-a.y,t.x+(t.vx||0)*lead-a.x),D=troPow(a),near=(TRO[a.ai]||TRO.mite)(a,t,g,D)===true,s=a.s;
  if(a.form==='venom'&&mons.includes(t)){mVen(t,.05*D,a);puff(t,TCOL.assassin,10,120)} // a short poison: six ticks, about a third of the blow in all
  const o=a.ent?a:{x:P.x+Math.cos(g)*22,y:P.y+Math.sin(g)*22},e=near?{x:t.x-Math.cos(g)*(t.r+s.r*.7),y:t.y-Math.sin(g)*(t.r+s.r*.7)}:{x:o.x,y:o.y};clamp(e,10);
  echoes.push({ai:a.ai,k:a.sk||a.ai,s,x:e.x,y:e.y,ang:g,life:.6,max:.6,owner:S.cls,col:TCOL[S.cls]||'#b88cff'});if(echoes.length>10)echoes.shift();
  a.flash=.15;a.face=g;if(a.ent){a.st='cast';a.stT=.4}
  sfx(a.ent?700:340,.16,'triangle',.1,a.ent?1100:170);return true;
}
// where a familiar floats (a slow circle round the mage) and where a guardian stands (behind the healer)
function troSpot(a){
  if(a.kind==='familiar'){const n=Math.max(2,a.of||2),g=S.t*.9+a.slot*TAU/n+(n>2?0:a.seed*.1),w=n>4?1.25:1;return{x:P.x+Math.cos(g)*40*w,y:P.y+Math.sin(g)*30*w-6}} // familiars share one circle, evenly spaced
  return{x:P.x-Math.cos(P.face)*(a.r+24),y:P.y-Math.sin(P.face)*(a.r+24)};
}
function makeTrophy(e,f,k,slot,n=1){
  const s=petSpec(e),ent=f==='familiar'||f==='guardian',tm=TRT[f]||0;
  const a={nid:nid(),sk:e.kind,kind:ent?f:'trophy',trophy:true,ent,form:f,owner:S.cls,e,k,slot,s,ai:TRO[e.ai]?e.ai:'mite',name:e.name,plv:e.plv,x:P.x,y:P.y,r:f==='familiar'?9:f==='guardian'?s.r:0,of:n,t:tm?tm*(.5+.5*slot/Math.max(1,n-1)):0,tm,
    seed:rand()*9,face:-Math.PI/2,st:'idle',stT:0,flash:0,life:1e9,hidden:false,lift:0,mods:[],ward:0,beam:null,boss:false,moving:false,walk:0,flip:false};
  if(f==='guardian'){a.shield=true;a.shT=0}
  if(ent){Object.assign(a,troSpot(a));clamp(a,a.r)}
  return a;
}
// the active trophies take their places: at the start of a level, and again when the choice changes from the pause screen
function fieldTrophies(mid){
  const old=allies.filter(a=>a.trophy&&a.ent);allies=allies.filter(a=>!a.pet&&!a.trophy);TSRC=[];PETS.down=false;if(!P)return[];
  resvSync();
  if(!mid){const w=petTrim();if(w.length)S.note=(w.length>1?w.length+' familiars wait':w[0].name+' waits')+': not enough mana to hold '+(w.length>1?'them':'it')}
  const f=form(),on=f?petOn():[],k=petK(on.length),made=[];
  on.forEach((e,i)=>{const a=makeTrophy(e,f,k,i,on.length),was=old.find(o=>o.e===e);if(!PETS.fielded.includes(e))PETS.fielded.push(e);
    if(!a.ent){TSRC.push(a);return}
    if(was){a.x=was.x;a.y=was.y;a.nid=was.nid;a.t=Math.min(a.tm,Math.max(was.t,.5));a.shield=was.shield;a.shT=was.shT}else puff(a,TCOL[S.cls],12,140);
    allies.push(a);made.push(a)});
  return made.length?made:TSRC.slice();
}
// a familiar or a guardian: keeps its place, counts down, fires when there is something to fire at. Nothing can hurt it.
function trophyStep(a,dt){
  if(a.flash>0)a.flash-=dt;if(a.stT>0&&(a.stT-=dt)<=0)a.st='idle';
  const p=troSpot(a),k=Math.min(1,dt*(a.kind==='familiar'?7:4)),ox=a.x,oy=a.y;a.x+=(p.x-a.x)*k;a.y+=(p.y-a.y)*k;clamp(a,a.r);a.moving=Math.hypot(a.x-ox,a.y-oy)>30*dt;if(a.moving)a.walk+=dt*10;
  if(a.kind==='guardian'&&!a.shield&&(a.shT-=dt)<=0){a.shield=true;sfx(880,.1,'sine',.08,1320)}
  const t=petTarget(P);if(a.st!=='cast')a.face=t?angTo(a,t):P.face;
  if(a.t>0)a.t-=dt;if(a.t<=0&&t&&troFire(a,t))a.t=a.tm;
}
// the forms the player throws himself: a trigger only asks (P.trQ), and the attack goes out here, at a point in the frame where nothing else is half done
function trophyTick(dt){
  if(P.trCd>0)P.trCd-=dt;P.trW+=dt;const a=TSRC[0];if(!a){P.trQ=0;return}
  a.x=P.x;a.y=P.y;if(a.flash>0)a.flash-=dt;
  if(P.trQ){const t=P.trT&&mons.includes(P.trT)&&!P.trT.hidden?P.trT:petTarget(P);if(t&&troFire(a,t)){P.trQ=0;P.trT=null;P.trW=0}}
}
// a melee strike that landed on m: the fighter counts to four; the assassin's ambush carries venom (not more often than every 1.5 seconds, however fast the dash comes back)
function troStrike(m,amb){
  const a=TSRC[0];if(!a)return;
  if(a.form==='technique'){if(++P.trN>=4){P.trN=0;P.trQ=1;P.trT=m}}
  else if(a.form==='venom'&&amb&&!(P.trCd>0)){P.trCd=1.5;P.trQ=1;P.trT=m}
}

/* ---------- loop ---------- */
function step(dt){
  S.t+=dt;if(S.shake>0)S.shake-=dt;SIDE=null;T=P;
  for(const b of bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.94;b.vy*=.94;b.life-=dt}bits=bits.filter(b=>b.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
  for(const f of floats){f.y-=34*dt;f.life-=dt}floats=floats.filter(f=>f.life>0);
  if(echoes.length){for(const e of echoes)e.life-=dt;echoes=echoes.filter(e=>e.life>0)}
  if(S.mode==='clear'&&(S.clearT-=dt)<=0)return reward();
  if(S.mode!=='play'&&S.mode!=='clear')return;
  if(!P.down)playerStep(dt);
  for(const p of pshots){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL){p.dead=true;continue}
    if(obstacles.length&&blocked(p)){p.dead=true;puff(p,'#b9b2c6',3,70);continue}
    for(const m of[...mons]){if(m.hidden||p.hit.has(m)||!mons.includes(m)||dist(m,p)>m.r+p.r+3)continue;
      let d=p.dmg;if(p.kind==='arrow'&&pw(3)&&Math.hypot(p.x-p.sx,p.y-p.sy)>200){d*=2;puff(p,'#d6a544',4,90)}
      p.hit.add(m);if(p.slow)mSlow(m,p.slow);if(p.stun)mStun(m,m.boss?p.stun*.7:p.stun*2);byPet=p.pet||null;hurtM(m,d,!!p.pet);byPet=null;
      if(p.kind==='arrow'&&!p.pet&&TSRC.length&&TSRC[0].form==='arrowhead'&&++P.trN>=6){P.trN=0;P.trQ=1;P.trT=m}
      if(p.boom){rings.push({x:p.x,y:p.y,life:.35,max:.35,r:85,fx:true});puff(p,'#ff8a4c',14,220);S.shake=Math.max(S.shake,.2);noise(.2,.3,700,150);for(const o of[...mons])if(!o.hidden&&mons.includes(o)&&dist(o,p)<85+o.r)hurtM(o,p.boom,true)}if(p.kind==='skull')leech();
      if(p.kind==='bolt'&&S.adv==='pyromancer'){rings.push({x:p.x,y:p.y,life:.3,max:.3,r:70,fx:true});puff(p,'#ff8a4c',8,160);for(const o of[...mons])if(o!==m&&!o.hidden&&mons.includes(o)&&dist(o,p)<70+o.r)hurtM(o,d/2)}
      if(!m.boss&&(!mons.includes(m)||m._gone))continue; // a shot that kills something small flies on, so a swarm cannot soak up every single bolt
      if(p.pierce>0)p.pierce--;else{p.dead=true;break}}}
  pshots=pshots.filter(p=>!p.dead);
  if(S.banner>0)S.banner-=dt;
  if(S.mode!=='play'||S.banner>1.5)return;
  trophyTick(dt);if(PETS.fielded.length)petGrid();
  for(const a of allies){if(a.pet){petStep(a,dt);continue}if(a.trophy){trophyStep(a,dt);continue}a.life-=dt;a.cd-=dt;let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,a)-(m.boss?140:0)+(m.ward>.3?2000:0);if(d<bd){bd=d;t=m}}
    const to=t||P,d=dist(to,a),stop=t?t.r+a.r:46;
    if(d>stop){let g=angTo(a,to);const sp=a.kind==='wolf'?250:200;if(a.avT>0)a.avT-=dt;if(obstacles.length)g=steer(a,g,d);a.x+=Math.cos(g)*sp*dt;a.y+=Math.sin(g)*sp*dt;a.walk+=dt*12;a.flip=Math.cos(g)<0;clamp(a,a.r);if(obstacles.length)collide(a,a.r,true)}
    else if(t&&a.cd<=0){a.cd=.7;hurtM(t,(a.kind==='wolf'?2:1)*dmgMul()*(1+eqv('thr')/100)*(P.legT>0?1.5:1),true);leech()}
    if(a.life<=0)puff(a,'#e7dfcd',6)}
  allies=allies.filter(a=>a.life>0);
  if(PETS.fallen.length)reviveStep(dt);
  for(const f of fields){f.t+=dt;if((f.tick-=dt)<=0){f.tick=f.every;f.n=!f.n;rings.push({x:f.x,y:f.y,life:.45,max:.45,r:f.r,fx:true});
    const fc=f.kind==='frost'?'#8fd3ff':f.kind==='halo'?'#ffe08a':'#e7dfcd';for(let i=0;i<5;i++){const a=rand()*TAU,d=rand()*f.r;bits.push({x:f.x+Math.cos(a)*d,y:f.y+Math.sin(a)*d,vx:0,vy:f.kind==='rain'?60:-30,life:.5,max:.5,c:fc,r:2.5})}
    if(!f.rem)for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,f)<f.r+m.r){if(f.slow)mSlow(m,.8);hurtM(m,f.dmg,true)}
    if(f.kind==='halo'&&f.n&&dist(P,f)<f.r&&P.hp<P.maxHp&&!P.down)healP(.04)}}
  fields=fields.filter(f=>f.t<f.dur);
  if(S.mode!=='play')return;
  if(obstacles.length)roomStep(dt);
  const CLI=CL(); // a client's monsters are the host's: it only works out what they do to its own hero and pets
  if(!CLI&&S.wave&&!boss&&!mons.length&&(S.waveT-=dt)<=0){if(S.wave.n<S.wave.of){S.wave.n++;spawnWave()}else enterBoss()}
  if(!CLI&&act2()&&boss&&boss.hp>0&&boss.ai!=='hollow'&&boss.ai!=='summoner'&&(S.elite-=dt)<=0){S.elite=5;if(mons.length<5+(MP.on?mpPack():0)){const b=rand()*TAU;spawn('mite',boss.x+Math.cos(b)*50,boss.y+Math.sin(b)*50)}}
  if(CLI)mpMons(dt);else for(const m of[...mons]){
    if(S.mode!=='play')break;if(!mons.includes(m))continue; // the boss or the player died earlier in this loop
    m.moving=false;if(m.flash>0)m.flash-=dt;if(m.ward>0)m.ward-=dt;const ox=m.x,oy=m.y;
    if(m.markT>0)m.markT-=dt;
    if(m.dotT>0){m.dotT-=dt;if((m.dotK-=dt)<=0){m.dotK=.5;REM=m.dotRem||null;hurtM(m,m.dotD,true);REM=null;if(!mons.includes(m))continue}}
    if(m.venT>0){m.venT-=dt;if((m.venK-=dt)<=0){m.venK=.5;puff(m,TCOL.assassin,4,80);byPet=m.venRem?null:m.venBy||true;REM=m.venRem||null;hurtM(m,m.venD,true);byPet=null;REM=null;if(!mons.includes(m))continue}}
    let k=aiK(m);if(m.slow>0){m.slow-=dt;k*=.5}
    if(m.stun>0){m.stun-=dt;m.beam=null}else{T=foe(m);if(T)AI[m.ai](m,dt*k,angTo(m,T),dist(m,T));else T=P} // T: the hero this monster fights (alone that is you; with no hero standing it waits)
    if(S.mode!=='play')break;if(!mons.includes(m))continue;
    if(obstacles.length&&!m.hidden&&m.st!=='leap'){collide(m,m.r,true);
      // a walker that is trying to move and getting nowhere tries the other way round
      if(m.moving&&Math.hypot(m.x-ox,m.y-oy)<12*dt){if((m.stk=(m.stk||0)+dt)>.45){m.stk=0;m.avS=-(m.avS||1);m.avT=1.2;m.side*=-1}}else m.stk=0}
    modStep(m,dt);
    m.vx=(m.x-ox)/dt;m.vy=(m.y-oy)/dt;
    if(m.rage&&rand()<dt*12)bits.push({x:m.x+rand()*m.r*2-m.r,y:m.y-rand()*m.r,vx:rand()*30-15,vy:-50-rand()*40,life:.6,max:.6,c:'#ff5b6e',r:2.5}); // enraged bosses smoulder, whatever draws them
    if((m.ring-=dt)<=0&&(m.moving||m.st==='wind')){rings.push({x:m.x,y:m.y,life:.8,max:.8,r:m.r+24,under:m.hidden});m.ring=m.st==='wind'?.12:.42}
    if(!m.hidden&&m.st!=='leap'&&m.st!=='dazed'&&!(m.stun>0)&&dist(m,P)<m.r+11)hurtP(blow(m.st==='charge'||m.st==='lunge'&&S.level>=3?1:-1),m.ai+':'+m.st); // brushing against a monster is light; its telegraphed attack is not
    if(PETS.fielded.length&&S.mode==='play')monVsPets(m);
  }
  T=P;
  if(S.mode!=='play')return;
  for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.g>0){s.g-=dt;continue}if(dist(s,P)<s.r+10&&!P.down&&!MP.away){hurtP(blow(S.level<8?-1:0),'shot');s.dead=true;if(MP.on)mpShotHit(s)}
    else for(const a of allies)if(a.pet&&!(a.inv>0)&&dist(s,a)<s.r+a.r*.7)hurtPet(a,blow(0)); // a bolt hurts a pet in its path and flies on
    if(s.x<WALL||s.x>W-WALL||s.y<WALL||s.y>H-WALL||obstacles.length&&blocked(s))s.dead=true}
  shots=shots.filter(s=>!s.dead);
  for(const z of zones){z.t+=dt;if(z.t>=z.dur){z.dead=true;puff(z,col('#d6a544'),18,240);S.shake=Math.max(S.shake,.2);sfx(80,.25,'square',.35,40);noise(.2,.3);
    if(z.mine){rings.push({x:z.x,y:z.y,life:.4,max:.4,r:z.r,fx:true});if(!z.rem)for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,z)<z.r+m.r){if(z.stun)mStun(m,m.boss?z.stun:z.stun*2);byPet=z.pet||null;hurtM(m,z.dmg,!!z.pet);byPet=null}}else{if(dist(z,P)<z.r)hurtP(blow(1),'zone');for(const a of allies)if(a.pet&&dist(z,a)<z.r)hurtPet(a,blow(1))}}}
  zones=zones.filter(z=>!z.dead);
  for(const f of morsels)if(dist(f,P)<24&&!P.down){f.dead=true;healP(.25,3);SND.pickup();haptic(15);if(MP.on)mpMorsel(f)}
  morsels=morsels.filter(f=>!f.dead);
}

/* ---------- drawing ---------- */
const circ=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU)};
const line=(a,b,c,d)=>{ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()};
function drawMon(m,face,s=m.s,eye){
  if(m.hidden)return;const r=m.r,a=face===undefined?angTo(m,P):face;
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
    circ(ex,ey,er);ctx.fillStyle=col(eye||(s.void?'#ff5b6e':'#ffd95e'));ctx.fill();circ(ex+Math.cos(a)*er*.4,ey+Math.sin(a)*er*.4,er*.45);ctx.fillStyle='#0a0a0a';ctx.fill();circ(ex-er*.3,ey-er*.35,er*.22);ctx.fillStyle='rgba(255,255,255,.85)';ctx.fill()}
  if(m.mods.length){
    if(m.mods.includes('thorned')){ctx.fillStyle=col('#e7dfcd');for(let i=0;i<12;i++){const b=i*TAU/12+.2;ctx.beginPath();ctx.moveTo(Math.cos(b-.1)*r,Math.sin(b-.1)*r);ctx.lineTo(Math.cos(b)*r*1.28,Math.sin(b)*r*1.28);ctx.lineTo(Math.cos(b+.1)*r,Math.sin(b+.1)*r);ctx.fill()}}
    if(m.mods.includes('vampiric')){circ(0,0,r+5+Math.sin(S.t*4)*1.5);ctx.strokeStyle='rgba(184,38,61,.8)';ctx.lineWidth=3;ctx.stroke()}
    if(m.mods.includes('splitting')){ctx.strokeStyle='rgba(11,10,15,.85)';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-r*.15,-r);ctx.lineTo(r*.12,-r*.3);ctx.lineTo(-r*.1,r*.3);ctx.lineTo(r*.15,r);ctx.stroke()}
    if(m.mods.includes('swift')&&m.moving){ctx.strokeStyle='rgba(231,223,205,.5)';ctx.lineWidth=2;const b=Math.atan2(m.vy||0,m.vx||0)+Math.PI;for(const k of[-.5,0,.5])line(Math.cos(b+k)*r*1.15,Math.sin(b+k)*r*1.15,Math.cos(b+k)*r*1.15+Math.cos(b)*14,Math.sin(b+k)*r*1.15+Math.sin(b)*14)}}
  if(m.ward>0){circ(0,0,r+8);ctx.fillStyle='rgba(143,211,255,.12)';ctx.fill();ctx.strokeStyle=`rgba(143,211,255,${.55+.3*Math.sin(S.t*8)})`;ctx.lineWidth=2.5;ctx.stroke()}
  if(m.st==='dazed'){ctx.fillStyle=col('#d6a544');for(let i=0;i<3;i++){const b=S.t*5+i*TAU/3;circ(Math.cos(b)*r*.7,-r-8+Math.sin(b)*4,3);ctx.fill()}}
  ctx.restore();
}
// the room, flat on the floor: pits, spike plates, brazier reach and bowl, pillars
function drawRoom(){
  for(const o of obstacles){const x=o.x,y=o.y,r=o.r;
    if(o.kind==='pit'){const g=ctx.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.82,'#050408');g.addColorStop(1,'rgba(5,4,8,.55)');circ(x,y,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=col('#6d6478');ctx.lineWidth=3;ctx.stroke();circ(x,y,r-5);ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=2.5;ctx.stroke()}
    else if(o.kind==='spikes'){const k=o.on?1:o.warn?.3+.1*Math.sin(S.t*30):0;
      circ(x,y,r);ctx.fillStyle=o.on?'rgba(184,38,61,.3)':o.warn?'rgba(214,165,68,.16)':'rgba(8,7,12,.5)';ctx.fill();ctx.strokeStyle=o.on?'#ff5b6e':o.warn?'#d6a544':'rgba(231,223,205,.28)';ctx.lineWidth=o.on||o.warn?2.5:1.5;ctx.stroke();
      for(let i=0;i<9;i++){const b=i*TAU/8,px=i<8?x+Math.cos(b)*r*.62:x,py=i<8?y+Math.sin(b)*r*.62:y;
        if(k>0){ctx.fillStyle=o.on?'#e7dfcd':'#b9b2c6';ctx.beginPath();ctx.moveTo(px-4.5,py+3);ctx.lineTo(px,py+3-20*k);ctx.lineTo(px+4.5,py+3);ctx.fill()}else{circ(px,py,2.6);ctx.fillStyle='rgba(0,0,0,.75)';ctx.fill()}}}
    else if(o.kind==='brazier'){
      if(o.on){const g=ctx.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,'rgba(255,217,94,.6)');g.addColorStop(.6,'rgba(255,138,76,.42)');g.addColorStop(1,'rgba(184,38,61,.12)');circ(x,y,r);ctx.fillStyle=g;ctx.fill()}
      else if(o.warn){circ(x,y,r);ctx.fillStyle=`rgba(214,165,68,${.1+.08*Math.sin(S.t*24)})`;ctx.fill()}
      ctx.setLineDash([7,7]);circ(x,y,r);ctx.strokeStyle=o.on?'#ff8a4c':o.warn?'#d6a544':'rgba(255,138,76,.3)';ctx.lineWidth=o.on||o.warn?2.5:1.5;ctx.stroke();ctx.setLineDash([]);
      circ(x,y,o.core+3);ctx.fillStyle=col('#3a3340');ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=2.5;ctx.stroke();circ(x,y,o.core-3);ctx.fillStyle=o.on?'#ffd95e':o.warn?'#ff8a4c':'#7a2a22';ctx.fill()}
    else{ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(x+7,y+9,r,r*.9,0,0,TAU);ctx.fill();
      const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,col('#a8a2b3'));g.addColorStop(.7,col('#6d6478'));g.addColorStop(1,col('#3a3340'));circ(x,y,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=3;ctx.stroke();
      circ(x,y,r*.62);ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=2;ctx.stroke()}}
}
function drawBeams(){
  for(const m of allies){const b=m.beam;if(!b||!m.pet||m.hidden)continue;ctx.lineCap='round';
    for(const r of b.rays){const ex=m.x+Math.cos(r.a)*r.len,ey=m.y+Math.sin(r.a)*r.len;
      if(b.on){ctx.strokeStyle='rgba(143,211,255,.3)';ctx.lineWidth=b.w*2+8;line(m.x,m.y,ex,ey);ctx.strokeStyle='#8fd3ff';ctx.lineWidth=b.w*1.4;line(m.x,m.y,ex,ey);ctx.strokeStyle='#fff';ctx.lineWidth=b.w*.5;line(m.x,m.y,ex,ey)}
      else{ctx.setLineDash([10,8]);ctx.strokeStyle='rgba(143,211,255,.7)';ctx.lineWidth=2;line(m.x,m.y,ex,ey);ctx.setLineDash([])}}}
  for(const m of mons){const b=m.beam;if(!b||m.hidden)continue;ctx.lineCap='round';
    for(const r of b.rays){const ex=m.x+Math.cos(r.a)*r.len,ey=m.y+Math.sin(r.a)*r.len;
      if(b.on){ctx.strokeStyle='rgba(255,91,110,.35)';ctx.lineWidth=b.w*2+10;line(m.x,m.y,ex,ey);ctx.strokeStyle='#ff8a4c';ctx.lineWidth=b.w*2;line(m.x,m.y,ex,ey);ctx.strokeStyle='#fff';ctx.lineWidth=b.w*.7;line(m.x,m.y,ex,ey);circ(ex,ey,b.w+4+Math.sin(S.t*40)*3);ctx.fillStyle='#ffd95e';ctx.fill()}
      else{ctx.setLineDash([10,8]);ctx.strokeStyle='rgba(214,165,68,.85)';ctx.lineWidth=2.5;line(m.x,m.y,ex,ey);ctx.setLineDash([])}}}
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
// a pet is its monster, marked as yours: a ring on the ground in its owner's colour (grave green or a pale blue), bound dead drawn dark with green eyes, a health pip above
function drawPet(a){
  if(a.hidden)return;const nec=a.owner==='necro',c=nec?'127,214,107':'143,211,255';
  if(!a.s2){a.s2=a.s;if(nec){const[r,g,b]=rgb(a.s.col),l=.3*r+.59*g+.11*b,h=v=>('0'+Math.round((v*.35+l*.65)*.55).toString(16)).slice(-2);a.s2={...a.s,col:'#'+h(r)+h(g)+h(b)}}}
  const g=ctx.createRadialGradient(a.x,a.y+a.r*.7,a.r*.4,a.x,a.y+a.r*.7,a.r*1.7);g.addColorStop(0,`rgba(${c},.4)`);g.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(a.x,a.y+a.r*.7,a.r*1.7,a.r*.75,0,0,TAU);ctx.fill();
  ctx.strokeStyle=`rgba(${c},.9)`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+a.r*.7,a.r*1.25,a.r*.5,0,0,TAU);ctx.stroke();
  if(a.inv>0&&Math.floor(S.t*18)%2)ctx.globalAlpha=.55;
  drawMon(a,a.face,a.s2,nec?'#7fd66b':'#bfe9ff');ctx.globalAlpha=1;
  if(!a.minion){const w=Math.max(26,a.r*1.6),y=a.y-a.lift*46-a.r-12;ctx.fillStyle='rgba(13,12,17,.8)';ctx.fillRect(a.x-w/2-1,y-1,w+2,6);ctx.fillStyle=`rgb(${c})`;ctx.fillRect(a.x-w/2,y,w*Math.max(0,a.hp/a.maxHp),4)}
}
// a familiar is a small orb in its monster's colour; a guardian is its monster as a pale ghost behind you, ringed while its shield is ready; an echo is the monster for a moment, in the class's colour
function drawTrophy(a){
  const c=TCOL[a.owner]||'#b88cff',[cr,cg,cb]=rgb(c),cast=a.st==='cast';
  if(a.kind==='familiar'){const y=a.y-12+Math.sin(S.t*3+a.seed)*3,R=a.r*(cast?1.5:1);
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(a.x,a.y+10,a.r,3,0,0,TAU);ctx.fill();
    const g=ctx.createRadialGradient(a.x,y,1,a.x,y,R*2.4);g.addColorStop(0,`rgba(${cr},${cg},${cb},${cast?.8:.5})`);g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);ctx.fillStyle=g;circ(a.x,y,R*2.4);ctx.fill();
    circ(a.x,y,R);ctx.fillStyle=a.flash>0?'#fff':col(a.s.col);ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();circ(a.x-R*.3,y-R*.3,R*.3);ctx.fillStyle='rgba(255,255,255,.8)';ctx.fill();return}
  if(!a.s2)a.s2={...a.s,col:'#f3e7bd'};
  const g=ctx.createRadialGradient(a.x,a.y+a.r*.7,a.r*.4,a.x,a.y+a.r*.7,a.r*1.7);g.addColorStop(0,`rgba(${cr},${cg},${cb},.35)`);g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(a.x,a.y+a.r*.7,a.r*1.7,a.r*.75,0,0,TAU);ctx.fill();
  ctx.globalAlpha=cast?.8:.5;drawMon(a,a.face,a.s2,'#ffffff');ctx.globalAlpha=1;
  if(a.shield){circ(a.x,a.y,a.r+7);ctx.strokeStyle=`rgba(${cr},${cg},${cb},${.55+.25*Math.sin(S.t*5)})`;ctx.lineWidth=2;ctx.stroke()}
}
function drawEchoes(list=echoes){
  for(const e of list){const k=Math.max(0,e.life/e.max);
    if(!e.m){e.s2={...e.s,col:e.col};e.m={x:e.x,y:e.y,r:e.s.r,st:'idle',lift:0,flash:0,mods:[],ward:0,kind:'echo',boss:false,hidden:false}}
    e.m.x=e.x+Math.cos(e.ang)*(1-k)*16;e.m.y=e.y+Math.sin(e.ang)*(1-k)*16;
    ctx.globalAlpha=.6*k;drawMon(e.m,e.ang,e.s2,'#ffffff');ctx.globalAlpha=k;circ(e.m.x,e.m.y,e.s.r+5+(1-k)*16);ctx.strokeStyle=e.col;ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1}
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
  if(P.down)ctx.globalAlpha=.3; // down in a co-op fight: a shade until the level is cleared
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(P.x,P.y+27,17,5.5,0,0,TAU);ctx.fill();
  if(S.adv&&act2()){const g=ctx.createRadialGradient(P.x,P.y+24,2,P.x,P.y+24,34);g.addColorStop(0,'rgba(214,165,68,.4)');g.addColorStop(1,'rgba(214,165,68,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(P.x,P.y+24,34,13,0,0,TAU);ctx.fill()}
  if((DR?DR.look.skill0Ready:SK[0].ready)&&S.mode==='play'){ctx.strokeStyle='rgba(214,165,68,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(P.x,P.y+27,22,8,0,0,TAU);ctx.stroke()}
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
  if(obstacles.length)drawRoom();
  for(const f of fields){circ(f.x,f.y,f.r);ctx.fillStyle=f.kind==='frost'?'rgba(143,211,255,.16)':f.kind==='halo'?'rgba(255,224,138,.15)':'rgba(231,223,205,.1)';ctx.fill();ctx.strokeStyle=f.kind==='frost'?'rgba(143,211,255,.6)':f.kind==='halo'?'rgba(255,224,138,.6)':'rgba(231,223,205,.45)';ctx.lineWidth=1.5;ctx.stroke()}
  for(const f of morsels){circ(f.x,f.y+Math.sin(S.t*4)*2,8);ctx.fillStyle='#d1213f';ctx.fill();circ(f.x-2,f.y-3+Math.sin(S.t*4)*2,2.5);ctx.fillStyle='#ffb3bf';ctx.fill()}
  for(const m of mons)drawMon(m);
  drawBeams();
  for(const s of shots){if(sight){circ(s.x,s.y,s.r+5);ctx.fillStyle='rgba(255,138,76,.28)';ctx.fill()}circ(s.x,s.y,s.r);ctx.fillStyle=col('#ff8a4c');ctx.fill();circ(s.x,s.y,s.r*.45);ctx.fillStyle='#fff';ctx.fill()}
  for(const a of allies)a.pet?drawPet(a):a.trophy?drawTrophy(a):drawAlly(a);
  if(echoes.length)drawEchoes();
  if(MP.on)mpDraw2d(0);
  for(const p of MP.on?mpAllPshots():pshots){
    if(p.kind==='skull'){circ(p.x,p.y,p.r+4);ctx.fillStyle='rgba(127,214,107,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle='#e7dfcd';ctx.fill();ctx.fillStyle='#15121b';circ(p.x-1.7,p.y-.6,1.2);ctx.fill();circ(p.x+1.7,p.y-.6,1.2);ctx.fill()}
    else if(p.kind==='arrow'){const a=Math.atan2(p.vy,p.vx);ctx.strokeStyle='#e7dfcd';ctx.lineWidth=2;line(p.x-Math.cos(a)*15,p.y-Math.sin(a)*15,p.x,p.y);circ(p.x,p.y,2);ctx.fillStyle='#d5dce2';ctx.fill()}
    else{const o=p.kind==='orb';circ(p.x,p.y,p.r+3);ctx.fillStyle=o?'rgba(255,224,138,.4)':'rgba(143,211,255,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle=o?'#ffe08a':'#8fd3ff';ctx.fill();circ(p.x,p.y,p.r*.45);ctx.fillStyle='#fff';ctx.fill()}}
  if(P&&MANA.drawing&&S.mode==='play'){ctx.globalAlpha=.3+.2*Math.sin(S.t*6);ctx.strokeStyle='#6fe3ff';ctx.lineWidth=1.5;circ(P.x,P.y+4,26+3*Math.sin(S.t*3));ctx.stroke();ctx.globalAlpha=1} // drawing mana in from the room
  if(P)drawPlayer();
  if(MP.on)mpDraw2d(1);
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
    for(const z of zones){const k=z.t/z.dur;circ(z.x,z.y,z.r);ctx.fillStyle=z.mine?`rgba(143,211,255,${.1+.25*k})`:`rgba(184,38,61,${.12+.25*k})`;ctx.fill();ctx.strokeStyle=z.mine?'#8fd3ff':'#d6a544';ctx.lineWidth=2;ctx.stroke();circ(z.x,z.y,z.r*k);ctx.strokeStyle='rgba(231,223,205,.8)';ctx.stroke();
      if(z.sx!==undefined){const bx=z.sx+(z.x-z.sx)*k,by=z.sy+(z.y-z.sy)*k-Math.sin(k*Math.PI)*70;circ(bx,by,7);ctx.fillStyle='#22242b';ctx.fill();ctx.strokeStyle='#ff8a4c';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=2}}
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
  bossBar();
}

/* ---------- screens ---------- */
let lastScreen=null; // the last screen the game itself put up, so MB.api.hide() can hand the overlay back
function show(o,foreign){
  if(!foreign)lastScreen=o;
  $('ovKick').textContent=o.kick||'';$('ovTitle').textContent=o.title||'';$('ovTitle').style.color=o.col||'';$('ovBody').textContent=o.body||'';$('ovBody').hidden=!o.body;$('ovKeys').textContent=o.keys||'';$('ovKeys').hidden=!o.keys;
  const cd=$('ovCards'),keep=o.list&&cd.classList.contains('list')?[cd.scrollTop,$('ovPanel').scrollTop]:null;cd.textContent='';cd.hidden=!o.cards;cd.className='cards'+(o.list?' list':''); // list: many compact rows that scroll (the pets screen); it keeps its place when it is drawn again
  (o.cards||[]).forEach(c=>{const e=document.createElement('button');e.type='button';
    for(const[tag,txt]of[['b',c.title],['small',c.sub],['span',c.body]]){const x=document.createElement(tag);x.textContent=txt;e.appendChild(x)}
    if(c.col)e.children[1].style.color=c.col;
    e.onclick=()=>{audio();sfx(520,.1,'triangle',.2,780);haptic(20);c.fn()};cd.appendChild(e)});
  const b=$('ovBtns');b.textContent='';b.hidden=!o.btns;
  (o.btns||[]).forEach(([label,fn],i)=>{const e=document.createElement('button');e.type='button';e.textContent=label;if(!i)e.className='primary';e.onclick=()=>{audio();sfx(440,.06,'triangle',.18,660);haptic(10);fn()};b.appendChild(e)});
  $('ovPanel').className='panel'+(o.wide?' wide':'');
  $('ov').className=o.soft?'soft':'';$('ov').hidden=false;if(keep){cd.scrollTop=keep[0];$('ovPanel').scrollTop=keep[1]}
}
function hud(){
  const nb=Object.values(S.b).reduce((a,b)=>a+b,0),cn=()=>S.adv?CLASSES[S.cls].adv.find(a=>a[0]===S.adv)[1]:CLASSES[S.cls].name;
  S.rank=rank();tune();
  const chips=act2()&&S.cls?[['Rank '+S.rank,true],[cn(),true],...CLASSES[S.cls].pows.map((p,i)=>[p[0],pw(i+1)]),...(nb?[[nb+(nb>1?' boons':' boon'),true]]:[]),...(petOn().length?[[petOn().length>1?petOn().length+' '+tw().pl:cap1(tw().n)+' · '+petTag(petOn()[0]),true]]:[])]:PARTS.map(p=>[p.name,has(p.id)]);
  $('ledger').textContent='';chips.forEach(([name,on])=>{const li=document.createElement('li');li.textContent=name;if(on)li.className='on';$('ledger').appendChild(li)});
  if(act2()&&S.cls&&S.eq)for(const sl of SLOTS){const it=S.eq[sl],li=document.createElement('li');li.textContent=itemName(it);li.title=it.rarity+' '+sl+': '+itemLine(it);li.style.cssText='opacity:1;color:'+RAR[it.r][1]+';border-color:'+RAR[it.r][1];$('ledger').appendChild(li)}
  const hp=$('hp');hp.textContent='';
  if(!P)return;
  hp.className=P.maxHp>50?'many lots':P.maxHp>20?'many':''; // a long row of pips gets thinner pips, so it still fits a phone
  if(has('touch')){for(let i=0;i<P.maxHp;i++){const e=document.createElement('i');if(i>=P.hp)e.className='off';hp.appendChild(e)}hp.setAttribute('aria-label',P.hp+' of '+P.maxHp+' health')}
  else{const e=document.createElement('em');e.textContent='Numb. No nerves to feel wounds with. You rattle when you are close to breaking.';hp.appendChild(e)}
  $('bDash').disabled=!has('organs');$('bDash').textContent=cls()==='mage'?'Blink':'Dash';
  syncSkills();
}
function freshBody(){
  const c=cls(),maxHp=4+(has('organs')?3:0)+(has('skin')?3:0)+(c?CLASSES[c].hp+3*S.b.vigor:0)+(c==='tank'&&pw(3)?4:0)+(c&&adv('hp')||0)+(c?eqv('hp'):0);
  const maxMana=manaMax();
  P={x:W/2,y:H-120,face:-Math.PI/2,hp:maxHp,maxHp,mana:maxMana,maxMana,resv:0,still:0,drawK:0,inv:0,atk:0,cd:0,dashCd:0,dashT:0,dx:0,dy:0,walk:0,regen:0,swing:0,moving:false,skCd:0,skCds:[0,0,0,0,0,0],cdS:Array(10).fill(0),mxS:Array(10).fill(0),rageT:0,guardT:0,legT:0,fleetT:0,stoneT:0,stormT:0,stormK:0,fireT:0,fireK:0,renewT:0,renewK:0,quakeN:0,cutN:0,starN:0,rushD:0,shield:c==='tank'&&S.adv!=='berserker',shT:0,sumT:3,lc:0,amb:0,trN:0,trCd:0,trQ:0,trT:null,trW:2.5,saved:false,vx:0,vy:0,safeX:W/2,safeY:H-120};
}
// dev only: __mb.over = {kind, mods, waves, room} replaces parts of a generated level, for testing one thing at a time
function devDef(L,n){
  const o=CL()?MP.over:window.__mb&&window.__mb.over;if(!o||n<12)return L;
  if(o.kind&&GENHP[o.kind]){const b=SPEC[o.kind];L.kind=o.kind;L.spec={...b,ai:o.kind,crown:0,name:PRE[n%10]+' '+b.name.replace('The ',''),hp:Math.round(GENHP[o.kind]*genMul(n)),col:TINT[(n*3)%10],r:b.r+2};L.mods=[];L.waves=0}
  if(o.mods)L.mods=o.mods.filter(x=>MODS.includes(x));if(o.waves>=0)L.waves=Math.min(2,o.waves|0);if(o.room>=0&&ROOMS[o.room])L.room=o.room;
  return L;
}
// begin(n) is how every screen starts a level: it gives extras.js the chance to show an interlude first (MB.interlude returns true and calls done() when it is over)
let beginTok=0;
function begin(n){
  if(MP.on)return mpReady(n); // co-op: no interludes; the level starts for all when everyone is through
  const tok=++beginTok;let went=false;const done=()=>{if(went||tok!==beginTok)return;went=true;startLevel(n)};
  if(typeof MB.interlude==='function'){$('ov').hidden=true;let wait=false;try{wait=MB.interlude(n,done)===true}catch(e){console.error('Marrowborn: interlude failed',e)}if(wait)return}
  done();
}
function startLevel(n){
  beginTok++;
  if(n>=8&&S.cls&&!S.eq)S.eq=basicSet(S.cls);eqSync();
  S.level=n;S.mode='play';S.banner=2.8;S.shake=0;S.stop=0;const L=S.L=devDef(levelDef(n),n);freshBody();if(MP.on)mpSpawnAt();
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];bits=[];rings=[];floats=[];morsels=[];echoes=[];TSRC=[];S.elite=4;
  S.paused=false;SND.levelStart();obstacles=buildRoom(n,L.room);boss=null;S.wave=null;
  if(CL()){} // a client's monsters come from the host
  else if(L.waves){S.wave={n:1,of:L.waves};spawnWave();for(const m of mons)m.t+=.4}
  else{boss=spawn(L.kind,W/2,140,true,L.spec);arm(boss,L);boss.t=1.2}
  if(L.kind==='mimic'&&!CL())reshuffle();
  if(S.adv==='beastmaster')allies.push(ally('wolf'));
  PETS.down=false;PETS.fielded=[];PETS.dmg=0;S.note='';fieldPets();
  if(S.note){floats.push({x:P.x,y:P.y-70,txt:S.note,life:4.5,c:'#6fe3ff'});S.note=''}
  if(!S.wave)$('bossName').textContent=L.spec.name;
  ST.levelTime=0;ST.bestLevel=Math.max(ST.bestLevel,n);
  $('ov').hidden=true;save(n);hud();$('lvl').textContent='Level '+(n+1)+' · '+L.title+(S.rank?' · Rank '+S.rank:'');
  if(MP.on)mpLevelStarted();
  emit('levelstart',{level:n,L});
}
function reward(){
  haptic([40,60,40,60,140]);chime();const n=S.level,r0=rank(n);allies=[];TSRC=[];MP.menu=false;emit('reward',{level:n});
  for(const e of PETS.fielded)if(PETS.roster.includes(e))e.plv=Math.min(PLVMAX,e.plv+1);PETS.fielded=[]; // every pet that was sent into this fight grows a little
  if(n===7)return chooseClass();
  P.inv=0;S.level++;S.mode='reward';hud();
  const up=S.rank&&S.rank!==r0,rk=up?'Rank up. You have climbed from rank '+r0+' to rank '+S.rank+'.':'';
  if(up){SND.rankUp();setTimeout(()=>haptic([30,50,30,50,30,50,200]),500)}
  if(n>=8&&S.cls)return dropScreen(n,rk,()=>bindScreen(n,()=>newSkill(n,()=>reward2(n))));
  reward2(n);
}
// a level that teaches a skill says so; with more than six known you choose which six to carry
function newSkill(n,next){
  const k=known(),si=k-1;if(k<=known(n)||n<10)return next(); // the skills of levels 10 and 11 are announced by the power-up screens
  const sk=CLASSES[S.cls].skills[si],free=S.load.findIndex(v=>v>=k-1&&v!==si); // a slot still holding a skill not learned yet
  if(k<=NSK&&!S.load.includes(si)&&free>=0)S.load[free]=si;
  const slot=S.load.indexOf(si),touch=matchMedia('(pointer:coarse)').matches;
  show({soft:true,kick:'New skill · level '+sk.level,title:sk.name,body:sk.text,keys:k>NSK?'You know '+k+' skills and carry six. You can change them now, or later from the pause screen.':slot>=0&&!touch?'It is on key '+(slot+1)+'.':'',btns:k>NSK?[['Choose my six',()=>loadout(next,si)],['Keep my six',next]]:[['Go on',next]]});
}
function loadout(done,fresh){
  const c=CLASSES[S.cls],k=known(),again=()=>{syncSkills();loadout(done,fresh)};
  show({wide:true,kick:'Skills · '+c.name,title:'Choose your six',body:(matchMedia('(pointer:coarse)').matches?'You carry six skills, one on each skill button.':'You carry six skills, on keys 1 to 6.')+' Pick a skill you are not carrying to swap it in.'+(MRISE?' Skills cost '+MRISE*100+'% more mana with every level past the ninth; your pool grows faster than that.':''),
    cards:c.skills.slice(0,k).map((sk,i)=>{const slot=S.load.indexOf(i);return{title:sk.name,sub:slot>=0?'Carried · '+(slot+1):i===fresh?'New · not carried':'Not carried',col:slot>=0?'':'#958ea3',body:sk.text,
      fn:slot>=0?again:()=>show({wide:true,kick:'Carry '+sk.name,title:'In place of which?',cards:S.load.map((v,j)=>({title:c.skills[v].name,sub:'Slot '+(j+1),body:c.skills[v].text,fn:()=>{S.load[j]=i;if(S.mode!=='reward')save(S.level);again()}})),btns:[['Back',again]]})}}),
    btns:[['Done',done]]});
}
// what a level's boss looks like on the roster: its name without its modifiers, the level it was taken on, and every modifier it carried
function petEntry(n,L){const s=L.spec,gen=n>=LEVELS.length,ty=!!s.crown,mods=(L.mods||[]).slice();
  return{kind:L.kind,ai:s.ai||L.kind,name:gen&&!ty?PRE[n%10]+' '+SPEC[L.kind].name.replace('The ',''):s.name,col:s.col,r:s.r,plv:0,lv:n,mods,perk:mods[0]||null,crown:ty?1:0}}
// A pet out of a save from before pets kept their level: the level it was bound on is worked out from what the save does hold. A story boss was bound on its own level, a tyrant on the tenth level of the land in its name,
// and a generated monster's name and kind give its level exactly (the prefix repeats every 10 levels, the kind every 9): the latest such level it can have been, given how often it has grown.
function petLvGuess(e,now){
  const st=LEVELS.findIndex(L=>L.boss===e.kind);if(st>=8)return st;
  const hi=Math.max(12,now-1-(e.plv||0));
  if(e.crown){const m=/^Tyrant of (.+)$/.exec(e.name),ai=m?AREAS.findIndex(a=>a[0].replace('The ','')===m[1]):-1;let n=19+10*Math.max(0,ai);if(ai===4)while(n+10<=now-1)n+=10;return n}
  const pi=PRE.findIndex(x=>e.name.startsWith(x+' '));
  for(const top of[hi,Math.max(12,now-1)])for(let n=top;n>=12;n--)if((pi<0||n%10===pi)&&POOL[(n*5+3)%POOL.length]===e.kind)return n;
  return hi;
}
function petFix(now){for(const e of PETS.roster){if(!Number.isInteger(e.lv))e.lv=Math.max(8,petLvGuess(e,now));if(!Array.isArray(e.mods))e.mods=e.perk?[e.perk]:[];e.perk=e.mods[0]||null}}
const TRDO={crawler:'a lunge that hits one monster hard',hound:'a charge through everything in a line',witch:'three bolts',fist:'a slam on the ground under your target',mother:'two mites that fight for you',burrower:'an eruption under your target',bomber:'two bombs',summoner:'two husks that fight for you',beamer:'a beam through everything in its path',mimic:'one heavy bolt',hollow:'a ring of bolts',mite:'a bite'};
const petLine=e=>{if(form()&&form()!=='pet')return'Its attack: '+(TRDO[e.ai]||TRDO.mite)+'.'+(e.perk?' It kept a mark of the boss and hits a little harder.':'')+(e.plv?' It has grown '+e.plv+(e.plv>1?' times':' time')+', and is stronger for it.':'');
  const i=petInfo(e);return'Power '+num(i.power)+': '+num(i.hp)+' health, and its blows do '+fmt(i.hit[0])+' (a brush), '+fmt(i.hit[1])+' (a bolt) and '+fmt(i.hit[2])+' (a charge, a lunge or a blast). Bound on level '+(e.lv+1)+(e.plv?', grown '+e.plv+(e.plv>1?' times':' time'):'')+'. '+(PETDO[e.ai]||PETDO.mite)+(e.mods&&e.mods.length?' '+e.mods.map(k=>PERK[k]).join('. ')+'.':'')};
// the short form for a row: its power and what it holds
const petSub=e=>'Power '+num(petPower(e))+' · holds '+petCost(e);
// the words for what a class takes from a boss: [noun, plural, the card that takes it, the heading, what it does, the word once taken, what it is in the pause screen]
const TW={
  technique:['technique','techniques','Learn it','A technique to learn','Learn how it fought. After every fourth blow you land, its attack follows yours.','Learned','Your techniques'],
  ward:['ward','wards','Take it','A ward to take','Bind its fury into your guard. When you are hit or you block, its attack answers, at most once every 2.5 seconds. The longer it has waited, the harder it answers, up to three times as hard.','Taken','Your wards'],
  venom:['venom','venoms','Distil it','A venom to distil','Distil it. Your first strike after a dash, and Shadowstep, carry its attack and a short poison.','Distilled','Your venoms'],
  familiar:['familiar','familiars','Shape it','A familiar to shape','Shape what is left into a familiar. It floats beside you and casts its attack every 3.5 seconds.','Shaped','Your familiars'],
  arrowhead:['arrowhead','arrowheads','Carve it','An arrowhead to carve','Carve an arrowhead from it. Every sixth arrow that hits looses its attack.','Carved','Your arrowheads'],
  guardian:['guardian','guardians','Call it','A guardian to call','Call its spirit to guard you. It strikes with its attack every 4 seconds, and every 8 seconds it turns aside one blow, unless the blow is a heavy one.','Called','Your guardians'],
};
function tw(){
  const f=form(),nec=petOwner()==='necro',t=TW[f];
  if(!t)return{pet:true,n:'pet',pl:'pets',take:nec?'Bind it':'Tame it',kick:nec?'The dead can be bound':'It can be tamed',rare:nec?'A tyrant, yours to bind':'A tyrant, yours to tame',how:nec?'Bind it and it rises to fight beside you.':'Tame it and it fights beside you.',done:nec?'Bound':'Tamed',mine:nec?'Your bound dead':'Your tamed beasts',
    later:'You can '+(nec?'bind':'tame')+' another boss later.',on:'With you',off:'Waiting',send:'Send it out',back:'Call it back',col:nec?'var(--pet-necro)':'var(--pet-beast)'};
  return{pet:false,n:t[0],pl:t[1],take:t[2],kick:t[3],rare:'A tyrant. '+t[3],how:t[4],done:t[5],mine:t[6],later:'Another boss will offer one later.',on:'In use',off:'Set aside',send:'Use it',back:'Set it aside',col:TCOL[S.cls]};
}
// short names for the small labels beside the health bar
const SHORT={crawler:'Crawler',hound:'Hound',witch:'Witch',fist:'Fist',mother:'Brood',burrower:'Borer',mimic:'Mimic',hollow:'Hollow',knight:'Knight',lich:'Lich',wyrm:'Wyrm',king:'King',bomber:'Toad',summoner:'Caller',beamer:'Eye'};
// with three rows there is room for about seven letters, so the level is left to the pause screen (more than three are shown as pips, without names)
const petShort=(e,n)=>{const s=e.crown&&e.kind==='hollow'?'Tyrant':SHORT[e.kind]||e.name;return n>2||!e.plv?s:s+(s.length+(''+e.plv).length>7?'+':' +')+e.plv};
// when the class changes what it does with its roster (a ranger taking Beastmaster): fill the places at your side
function petFit(){const cap=Math.min(2,petCap()),R=PETS.roster;PETS.active=PETS.active.filter((v,i,l)=>v<R.length&&l.indexOf(v)===i).slice(0,cap);for(let i=R.length-1;i>=0&&PETS.active.length<cap;i--)if(!PETS.active.includes(i))PETS.active.push(i)}
// PETS.active holds roster indices; these keep it right when the roster changes
function petDrop(i){PETS.roster.splice(i,1);PETS.active=PETS.active.filter(v=>v!==i).map(v=>v>i?v-1:v)}
// the words for how much mana is held and how much is left: used by every screen that deals with pets or familiars
const heldLine=(on=petOn())=>{const M=manaMax(),h=petHeld(on);return'Deployed '+on.length+' · reserving '+num(h)+' of '+num(M)+' mana · '+num(M-h)+' left for skills'};
// After the drop the boss itself can be taken: bound or tamed as a pet, or as the class's own kind of trophy. Always optional. The bosses of the tenth levels (the Flayed King, the tyrants) can only rarely be taken.
function bindScreen(n,next){
  const f=form(),L=S.L;if(!f||n<8||!L||L.kind==='mimic')return next();
  const rare=!!L.spec.crown,dv=window.__mb?window.__mb.bind:undefined; // dev: __mb.bind = true or false decides instead of the dice
  if(!(typeof dv==='boolean'?dv:!rare||rand()<.15))return next();
  const e=petEntry(n,L),w=tw(),R=PETS.roster,rs=resvForm();
  const take=()=>{R.push(e);
    if(rs)return petPick(next,e); // held with mana: you decide whether it goes out
    if(!petOn().length){PETS.active=[R.length-1];return next()} // a free place is filled at once
    petPick(next,e)};
  const leave={title:'Leave it',sub:'Walk on',col:'var(--ash)',body:'Take nothing. '+w.later,fn:next};
  show({wide:true,col:w.col,kick:rare?w.rare:w.kick,title:e.name,
    body:w.how+' '+petLine(e)+(rs?' You can keep as many '+w.pl+' as you like. Each one you send out holds some of your mana for as long as it is out ('+petCost(e)+' for this one, of your '+num(manaMax())+'), so the more that fight, the less is left for skills.':' You can keep as many '+w.pl+' as you like. One is in use at a time.'),
    cards:[{title:w.take,sub:w.pet?petSub(e):R.length?cap1(w.n)+' '+(R.length+1):'Your first '+w.n,col:w.col,body:w.pet?e.name+' joins you and fights as it fought you: the same attacks, the same strength'+(e.mods.length?', the same modifiers':'')+'. It grows a little with every fight it joins, and keeps most of its worth as you climb. The stronger a pet, the more mana it holds.':'It is as strong as the level you take it into, however old it is.',fn:take},leave]});
}
// a new one has joined. Held with mana (pets, familiars): send it out if the pool can hold it, let it wait, or open the list. Otherwise one is in use at a time: pick which.
function petPick(next,fresh){
  const on=petOn(),R=PETS.roster,w=tw(),i=R.indexOf(fresh);
  if(resvForm()){const c=petCost(fresh),M=manaMax(),h=petHeld(on),can=h+c<=M;
    return show({wide:true,kick:w.done+' · '+heldLine(on),title:can?'Send it out?':'No mana to hold it',
      body:can?petTag(fresh)+' would hold '+c+' of your mana while it is out, and leave '+num(M-h-c)+' for skills. You can change who goes with you at any time from the pause screen.'
        :petTag(fresh)+' needs '+c+' mana to hold, and only '+num(M-h)+' of your '+num(M)+' is not held already. It waits until you withdraw another or your pool grows.',
      cards:[...(can?[{title:w.send,sub:w.pet?petSub(fresh)+' mana':'Holds '+c+' mana',col:w.col,body:'It goes with you into the next level. '+petLine(fresh),fn:()=>{PETS.active.push(i);next()}}]:[]),
        {title:'Let it wait',sub:w.off,col:'var(--ash)',body:'It holds no mana until you send it out.',fn:next},
        {title:'Choose who goes',sub:cap1(w.pl)+' · '+R.length+' kept',col:'var(--mana)',body:'Open the list: deploy, withdraw, or set how many go with you.',fn:()=>petsScreen(next)}]})}
  show({wide:true,kick:w.done,title:'Which one is set aside?',body:'Only one '+w.n+' is in use at a time. Pick the one to set aside. You can change this from the pause screen.',
    cards:[...on,fresh].map(p=>({title:petTag(p),sub:p===fresh?'New':w.on+' now',col:p===fresh?'var(--ash)':'',body:petLine(p),fn:()=>{if(p!==fresh)PETS.active=[i];next()}}))});
}
const petSaved=()=>{if(S.mode==='play'&&!(P&&P.down))fieldPets(true);if(S.mode==='play'||S.mode==='clear')save(S.level);hud()};
// send one out (in place of `out`, a roster index, for the forms that go one at a time), call one back, or release one. petSend answers false when the pool cannot hold it.
function petSend(i,out){
  const A=PETS.active,e=PETS.roster[i];if(!e||A.includes(i))return false;
  if(!resvForm()){PETS.active=[i];petSaved();return true}
  if(!petFits(e))return false;
  A.push(i);petSaved();return true;
}
function petBack(i){if(!PETS.active.includes(i))return;PETS.active=PETS.active.filter(v=>v!==i);petSaved()}
function petRelease(i){if(!PETS.roster[i])return;petDrop(i);petSaved()}
// set how many go with you: withdraw the weakest, or send out the strongest that the pool can still hold, until n are out (or nothing more fits)
function petCount(n){
  const R=PETS.roster;let A=PETS.active.filter(i=>R[i]);n=Math.max(0,Math.min(R.length,n|0));
  while(A.length>n){let w=0;for(let j=1;j<A.length;j++)if(petRank(R[A[j]])<petRank(R[A[w]]))w=j;A.splice(w,1)}
  if(A.length<n){const M=manaMax();let sum=0;for(const i of A)sum+=petCost(R[i]);
    const rest=R.map((e,i)=>i).filter(i=>!A.includes(i)).sort((a,b)=>petRank(R[b])-petRank(R[a]));
    for(const i of rest){if(A.length>=n)break;const c=petCost(R[i]);if(sum+c<=M){A.push(i);sum+=c}}}
  PETS.active=A;petSaved();
}
// The pets screen (pause, and the reward flow): the whole roster as a list, deployed first and then the strongest. A row sends its pet out or calls it back; the buttons set how many go.
// For the forms that go one at a time (technique, ward, venom, arrowhead, guardian) a row puts that one in use.
let petMode='deploy';
function petsScreen(back,note){
  const R=PETS.roster,w=tw(),rs=resvForm(),on=petOn(),M=manaMax(),h=petHeld(on),rel=petMode==='release',again=n=>petsScreen(back,n),
    order=R.map((e,i)=>i).sort((a,b)=>(on.includes(R[b])-on.includes(R[a]))||petRank(R[b])-petRank(R[a]));
  const btns=[['Back',()=>{petMode='deploy';back()}]];
  if(rel)btns.push(['Done releasing',()=>{petMode='deploy';again()}]);
  else{
    if(rs&&R.length){btns.push(['One fewer',()=>{if(!on.length)return again('None are out.');petCount(on.length-1);again()}],['One more',()=>{const n=on.length;petCount(n+1);again(petOn().length>n?'':R.length>n?'No mana to hold another: '+num(M-h)+' is free, and the cheapest that waits needs '+Math.min(...R.filter(e=>!on.includes(e)).map(petCost))+'.':'Every one you keep is out already.')}],
      ['Deploy all I can afford',()=>{const n=on.length;petCount(R.length);const m=petOn().length;again(m>n?'':m<R.length?'No mana to hold more.':'Every one you keep is out already.')}],['Withdraw all',()=>{petCount(0);again()}]);
      if(w.pet)btns.push(['Revive fallen pets automatically: '+(PETS.auto?'on':'off'),()=>{PETS.auto=!PETS.auto;petSaved();again()}])}
    if(R.length)btns.push(['Release…',()=>{petMode='release';again()}]);
  }
  show({wide:true,list:R.length>3,kick:rel?'Release · pick one to let go':rs?heldLine(on):cap1(w.pl)+' · '+R.length+' kept',title:w.mine,
    body:!R.length?'You keep none. Kill a boss, and you may '+(w.pet?(petOwner()==='necro'?'bind':'tame')+' it.':'take one.')
      :rel?'Pick the one to release. It is gone for good.'
      :rs&&w.pet?'Pick one to send it out or call it back. Each is the monster it was, with its own attacks and its own power, however many stand beside it. Each one that is out holds mana for as long as it is out, the more the stronger it is: held mana cannot be spent on skills and does not refill. One that falls rises again after '+REVT+' seconds for a quarter more than it holds, from what is left, and half as much again each further time in a level'+(PETS.auto?'.':'; that is switched off now, so the fallen stay down until the next level.')
      :rs?'Pick one to send it out or call it back. Each one that is out holds part of your mana for as long as it is out: held mana cannot be spent on skills and does not refill. The more that fight at once, the weaker each one is.'
      :'Pick one to use it. One is in use at a time.',
    keys:note||'',
    cards:order.map(i=>{const p=R[i],act=on.includes(p),c=petCost(p);return{title:petTag(p),
      sub:(w.pet?'Power '+num(petPower(p))+' · ':'')+(rel?'Release'+(act?' · '+w.on.toLowerCase():''):act?(p.down?(PETS.auto?'Fallen · rises for '+reviveCost(p)+' mana':'Fallen · back next level'):w.on)+(rs?' · holds '+c+' mana':''):w.off+(rs?' · needs '+c+' mana'+(h+c>M?' · not enough':''):'')),
      col:rel?'var(--warn)':act?(rs?w.col:''):'var(--ash)',body:petLine(p),
      fn:rel?()=>show({kick:'Release',title:'Let '+p.name+' go?',body:'It is gone for good.',btns:[['Keep it',()=>again()],['Release it',()=>{petRelease(R.indexOf(p));again()}]]})
        :act?()=>{if(rs)petBack(i);again()}
        :()=>{if(!petSend(i,-1))return again('Not enough mana to hold '+petTag(p)+': it needs '+c+', and '+num(M-h)+' of your '+num(M)+' is free. Withdraw another first.');again()}}}),
    btns});
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
    return show({soft:true,kick:'You tore it free',title:p.name,body:p.text,keys:(n===0?(matchMedia('(pointer:coarse)').matches?'Tap Dash to dart the way you are moving. ':'Press Shift (or K) to dash the way you are moving. ')+'Nothing can hurt you mid-dash. ':'')+(lacks.length?'Still missing: '+lacks.join(', ')+'.':'Nothing is missing now. One thing is left to kill.'),btns:[['Go deeper',()=>begin(S.level)]]})}
  const c=CLASSES[S.cls];
  if(n<11){const p=c.pows[n-8],s2=c.skills[2],touch=matchMedia('(pointer:coarse)').matches;
    return show({soft:true,kick:(n===9?'The Flayed King is dead · ':'')+'Power-up · '+c.name,title:p[0],body:p[1]+(n===8?' You also learn a third skill, '+s2.name+'. '+s2.text:''),keys:n===8?(touch?'Your skills each have their own button. It shows the seconds left while the skill recharges. Every skill costs mana, the bar under your health: it seeps back on its own, and twice as fast while you stand still.':'Skills are on keys 1 to 6 (E, Q, R, F, C and V also work). The bar under the arena shows the seconds left while each recharges, and what each costs in mana. Mana seeps back on its own, and twice as fast while you stand still.'):n===9?(touch?'Your fourth skill button is live. More skills come at levels '+SKLV.slice(4).join(', ')+'.':'Your fourth skill is on key 4 (or F). More skills come at levels '+SKLV.slice(4).join(', ')+'.'):'',btns:[['Go on',()=>begin(S.level)]]})}
  if(n>=49&&!S.adv)return show({wide:true,kick:'Fifty levels. Your class has more to give.',title:'Choose your path',body:'This lasts for the rest of the run.',
    cards:c.adv.map(([id,name,sub,text])=>({title:name,sub,body:text,fn:()=>{S.adv=id;if(id==='beastmaster')petFit();begin(S.level)}}))});
  const pool=BOONS.filter(b=>S.b[b.id]<(b.id==='spec'?c.boon[2]:b.cap||99));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  show({wide:true,kick:tenth(n)?S.L.spec.name+' is dead. The road goes on.':'Level '+(n+1)+' cleared',title:'Choose a boon',
    cards:pool.slice(0,3).map(b=>{const[name,text]=b.id==='spec'?c.boon:[b.name,b.text];return{title:name,sub:S.b[b.id]?'You have '+S.b[b.id]:'New',body:text,fn:()=>{S.b[b.id]++;begin(S.level)}}})});
}
function chooseClass(){
  S.mode='reward';S.level=8;S.cls=null;S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();eqSync();allies=[];if(P)P.inv=0;$('lvl').textContent='Out of the crypt';hud();
  show({wide:true,kick:'You are whole. You walk out of the crypt as a person.',title:'Choose who you become',body:'You start with the basic equipment of your class and its first two skills. Eight more are learned as you climb, each with its own cooldown and its cost in mana, and you carry six at a time. Mana comes back on its own, faster while you stand still. Your pool grows with every level, and skills cost a little more as you climb. After level 50 the class can be upgraded.',
    cards:[...(MP.on?mpPickCards():[]),...Object.entries(CLASSES).map(([id,c])=>({title:c.name,sub:c.gear,body:c.text+' '+c.mana+' mana. First skills: '+c.skills[0].name+', '+c.skills[1].name+'.',fn:()=>{S.cls=id;S.eq=basicSet(id);S.load=load0();emit('classpicked',{cls:id});begin(8)}}))]});
}
function pauseShow(){
  const btns=[['Resume',()=>pause(false)]];if(known()>NSK)btns.push(['Skills',()=>loadout(pauseShow)]);
  if(form()&&act2())btns.push([cap1(tw().pl),()=>petsScreen(pauseShow)]);
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',pauseShow)]);
  show({kick:'Paused · level '+(S.level+1)+(S.rank?' · rank '+S.rank:''),title:'Catch your breath',body:S.L.spec.name+' is waiting.'+(P&&P.maxMana?' Mana '+num(MANA.cur)+' of '+num(P.maxMana-P.resv)+(P.resv?' ('+num(P.resv)+' more is held by your '+tw().pl+')':'')+'.':'')+(act2()&&S.eq?' You carry '+SLOTS.map(sl=>itemName(S.eq[sl])+' ('+itemLine(S.eq[sl])+')').join('; ')+'.':''),keys:matchMedia('(pointer:coarse)').matches?'':'Esc or P to go on.',btns});
}
function pause(on){
  if(MP.on)return mpMenu(); // no pause in a shared fight: a menu, and the game goes on
  if(on){if(S.paused||S.mode!=='play'&&S.mode!=='clear')return;S.paused=true;for(const k in keys)keys[k]=false;joy.x=joy.y=0;SND.pause(true);pauseShow()}
  else if(S.paused){S.paused=false;$('ov').hidden=true;SND.pause(false);syncSkills()}
  else return;
  const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed',S.paused);emit('pause',{paused:S.paused});
}
// The run as a plain object: what is written to localStorage and what MB.api.getSave() hands out. level is where "Continue" resumes.
// pets in a save: only what cannot be worked out again
const petsClear=()=>{PETS.roster.length=0;PETS.active=[];PETS.down=false;PETS.fielded=[];PETS.fallen=[];PETS.auto=true};
// the active list out of a save: a list of roster indices, or the single index older saves carry. null when it makes no sense.
function actIn(v,len,cap){if(v===undefined||v===null)v=len?[len-1]:[];if(Number.isInteger(v))v=v<0?[]:[v];
  return Array.isArray(v)&&v.length<=cap&&v.every((x,i)=>Number.isInteger(x)&&x>=0&&x<len&&v.indexOf(x)===i)?v.slice():null}
// how many can be active in a save: what the mana of that class can hold (see petCap), so an older save keeps the pets it had out
// A pet in a save is a short list, so a long roster stays a short code: [kind, name, colour, r, plv, perk, crown, lv, mods], where a generated name is the index of its prefix (PRE), a stock colour its index (TINT),
// the perk the place of its first modifier in MODS plus one, lv the level it was bound on, mods its modifiers as bits in the order of MODS, and zeros at the end are left out.
// Saves from before pets kept their level and all their modifiers stop at crown, and older ones still carry objects ({kind,name,col,r,plv,perk,crown}); all are read, and petFix works out what is missing.
const petName=(kind,i)=>PRE[i]+' '+SPEC[kind].name.replace('The ','');
function petOut(e){const pi=PRE.findIndex((x,i)=>petName(e.kind,i)===e.name),ci=TINT.indexOf(e.col),m=e.mods||[],o=[e.kind,pi>=0?pi:e.name,ci>=0?ci:e.col,e.r,e.plv,m.length?MODS.indexOf(m[0])+1:e.perk?MODS.indexOf(e.perk)+1:0,e.crown?1:0,Number.isInteger(e.lv)?e.lv:0,m.reduce((a,k)=>a|1<<MODS.indexOf(k),0)];while(o.length>4&&!o[o.length-1])o.pop();return o}
function petIn(p){
  if(Array.isArray(p)){const[kind,nm,cl,r,plv,pk,crown,lv,mk]=p;if(typeof kind!=='string'||!own(SPEC,kind)||p.length<4||p.length>9)return null;
    if(pk!==undefined&&!(Number.isInteger(pk)&&pk>=0&&pk<=MODS.length))return null;
    if(mk!==undefined&&!(Number.isInteger(mk)&&mk>=0&&mk<1<<MODS.length))return null;
    p={kind,name:Number.isInteger(nm)&&nm>=0&&nm<PRE.length?petName(kind,nm):nm,col:Number.isInteger(cl)&&cl>=0&&cl<TINT.length?TINT[cl]:cl,r,plv:plv===undefined?0:plv,perk:pk?MODS[pk-1]:null,crown:crown?1:0,lv:lv||undefined,mods:lv?MODS.filter((x,i)=>(mk||0)>>i&1):undefined}}
  if(!p||typeof p!=='object'||typeof p.kind!=='string'||!own(SPEC,p.kind)||p.kind==='mite'||p.kind==='husk')return null;
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>48||typeof p.col!=='string'||!/^#[0-9a-f]{6}$/i.test(p.col))return null;
  if(typeof p.r!=='number'||!(p.r>=8&&p.r<=60)||!Number.isInteger(p.plv)||p.plv<0||p.plv>PLVMAX)return null;
  if(p.perk!==null&&p.perk!==undefined&&!MODS.includes(p.perk))return null;
  if(p.lv!==undefined&&!(Number.isInteger(p.lv)&&p.lv>=8&&p.lv<=9998))return null;
  if(p.mods!==undefined&&!(Array.isArray(p.mods)&&p.mods.length<=MODS.length&&p.mods.every((k,i)=>MODS.includes(k)&&p.mods.indexOf(k)===i)))return null;
  const e={kind:p.kind,ai:SPEC[p.kind].ai||p.kind,name:p.name.trim(),col:p.col.toLowerCase(),r:p.r,plv:p.plv,perk:p.perk||null,crown:p.crown?1:0};
  if(p.lv!==undefined){e.lv=p.lv;e.mods=p.mods?p.mods.slice():e.perk?[e.perk]:[];e.perk=e.mods[0]||null}
  return e;
}
const canPet=c=>!!c&&own(CLASSES,c);
let SAVE={v:1,level:0,cls:null,adv:null,b:noBoons(),eq:null,scrap:0,load:load0(),pets:[],pet:[],stats:{kills:0,deaths:0,dmgDealt:0,dmgTaken:0,time:0,bestLevel:0}};
function snapshot(n){
  const eq=S.eq?{}:null;if(eq)for(const sl of SLOTS){eq[sl]={r:S.eq[sl].r,lvl:S.eq[sl].lvl,up:S.eq[sl].up};if(S.eq[sl].m)eq[sl].m=1} // m: a trinket that carries mana
  return{v:1,level:n,cls:S.cls,adv:S.adv,b:{...S.b},eq,scrap:S.scrap,load:S.load.slice(),pets:PETS.roster.map(petOut),pet:PETS.active.slice(),...(PETS.auto?{}:{rev:0}),stats:{kills:ST.kills,deaths:ST.deaths,dmgDealt:Math.round(ST.dmgDealt),dmgTaken:ST.dmgTaken,time:Math.round(ST.time),bestLevel:ST.bestLevel}};
}
function save(n){if(MP.on)return mpSave(n); // a co-op run is kept apart and never touches the single-player save
  SAVE=snapshot(n);pref('level',n);pref('run',JSON.stringify({cls:SAVE.cls,adv:SAVE.adv,b:SAVE.b,eq:SAVE.eq,scrap:SAVE.scrap,load:SAVE.load,pets:SAVE.pets,pet:SAVE.pet,rev:SAVE.rev,st:SAVE.stats}))}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// read a stored run into S, forgiving: a damaged or hand-edited save must not be able to break the run
function applyRun(r,now=0){
  try{r=r&&typeof r==='object'?r:{};
    S.cls=typeof r.cls==='string'&&own(CLASSES,r.cls)?r.cls:null;S.adv=S.cls&&CLASSES[S.cls].adv.some(a=>a[0]===r.adv)?r.adv:null;
    const b=noBoons();if(S.cls&&r.b&&typeof r.b==='object')for(const k in b){const v=Math.floor(+r.b[k]);if(v>0)b[k]=Math.min(v,k==='spec'?CLASSES[S.cls].boon[2]:k==='well'?9999:BOONS.find(x=>x.id===k).cap||999)}S.b=b;
    S.load=fixLoad(r.load)||load0(); // older saves carried four skills
    // older saves have no equipment: they get the basic set
    S.eq=null;S.scrap=0;if(S.cls){S.eq=basicSet(S.cls);S.scrap=Math.min(999,Math.max(0,Math.floor(+r.scrap)||0));if(r.eq&&typeof r.eq==='object')for(const sl of SLOTS){const e=r.eq[sl];if(e&&typeof e==='object'){const q=Math.floor(+e.r),lv=Math.floor(+e.lvl),u=+e.up;if(q>=0&&q<=3)S.eq[sl]=item(S.cls,sl,q,lv>0?Math.min(lv,999):0,u>0?Math.min(u,400):0,e.m?1:0)}}}
    // older saves have no pets; a broken entry is dropped, the rest are kept
    petsClear();if(canPet(S.cls,S.adv)&&Array.isArray(r.pets)){for(const p of r.pets.slice(0,PETSANE)){const e=petIn(p);if(e)PETS.roster.push(e)}const n=PETS.roster.length;
      PETS.active=actIn(Array.isArray(r.pet)?r.pet.filter((x,i,l)=>Number.isInteger(x)&&x>=0&&x<n&&l.indexOf(x)===i):r.pet,n,n)||(n?[n-1]:[]);petFix(now)}
    PETS.auto=!(r.rev===0||r.rev===false); // raising the fallen is on unless the save says otherwise
    stReset();const st=r.st&&typeof r.st==='object'?r.st:{};for(const k of['kills','deaths','dmgDealt','dmgTaken','time','bestLevel']){const v=+st[k];if(v>0&&isFinite(v))ST[k]=Math.min(v,1e12)} // older saves have no counters
  }catch(e){S.cls=S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();stReset()}
  eqSync();
}
// MB.api.loadSave is strict where applyRun is forgiving: anything that is not exactly a save is refused and nothing changes
function checkSave(o){
  const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
  if(!o||typeof o!=='object'||Array.isArray(o)||o.v!==1||!int(o.level,0,9998))return null;
  if(o.cls!==null&&!(typeof o.cls==='string'&&own(CLASSES,o.cls)))return null;
  const c=o.cls;if(!c&&(o.level>8||o.adv||o.eq))return null;
  if(o.adv!==null&&o.adv!==undefined&&!(c&&CLASSES[c].adv.some(a=>a[0]===o.adv)))return null;
  const b=noBoons();if(!o.b||typeof o.b!=='object')return null;
  for(const k in b){const v=k==='well'&&o.b[k]===undefined?0:o.b[k],cap=!c?0:k==='spec'?CLASSES[c].boon[2]:k==='well'?9999:BOONS.find(x=>x.id===k).cap||999;if(!int(v,0,cap))return null;b[k]=v}
  let eq=null;if(o.eq!==null&&o.eq!==undefined){if(typeof o.eq!=='object')return null;eq={};for(const sl of SLOTS){const e=o.eq[sl];if(!e||typeof e!=='object'||!int(e.r,0,3)||!int(e.lvl,0,999)||typeof e.up!=='number'||!(e.up>=0&&e.up<=400)||e.m!==undefined&&e.m!==0&&e.m!==1)return null;eq[sl]={r:e.r,lvl:e.lvl,up:e.up,m:e.m?1:0}}}
  const load=fixLoad(o.load);if(!int(o.scrap,0,999)||!load)return null;
  let pets=[],pet=[];if(o.pets!==undefined&&o.pets!==null){if(!Array.isArray(o.pets)||o.pets.length>PETSANE||o.pets.length&&!canPet(c,o.adv))return null;for(const p of o.pets){const e=petIn(p);if(!e)return null;pets.push(e)}
    pet=actIn(o.pet,pets.length,pets.length);if(!pet)return null}
  if(o.rev!==undefined&&o.rev!==0&&o.rev!==1)return null;
  const st={kills:0,deaths:0,dmgDealt:0,dmgTaken:0,time:0,bestLevel:0};
  if(o.stats!==undefined){if(!o.stats||typeof o.stats!=='object')return null;for(const k in st){const v=o.stats[k];if(v===undefined)continue;if(typeof v!=='number'||!(v>=0&&v<=1e12))return null;st[k]=v}}
  return{cls:c,adv:o.adv||null,b,eq,scrap:o.scrap,load,pets,pet,rev:o.rev===0?0:1,st,level:o.level};
}
function loadSave(o){
  if(MP.on)return false;
  const r=checkSave(o);if(!r)return false;
  if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false')}
  applyRun(r,r.level);save(r.level);title(r.level);return true;
}
function storedLevel(){try{return Math.min(9998,Math.max(0,Math.floor(+localStorage.getItem('marrowborn.level'))||0))}catch(e){return SAVE.level}}
function newRun(){S.cls=null;S.adv=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();stReset()}
// a hook set by extras.js; `back` puts the screen it was opened from back up
function hook(name,back){try{MB[name](back)}catch(e){console.error('Marrowborn: '+name+' failed',e);back()}}
let titleSaved=0;
function title(saved){
  titleSaved=saved===undefined?storedLevel():saved;beginTok++;
  S.mode='title';S.level=0;S.paused=false;S.wave=null;freshBody();P.y=H/2+40;mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];morsels=[];echoes=[];TSRC=[];obstacles=[];boss=null;hud();
  $('lvl').textContent='A crypt. A pile of bones.';$('bossName').textContent='—';
  titleShow();emit('title');
}
function titleShow(){
  const saved=titleSaved,btns=[['Rise',()=>{newRun();begin(0)}]];
  // start as a whole person at the class choice; nothing is saved until a class is picked
  btns.push(['Skip to class selection',()=>{stReset();chooseClass();freshBody();hud()}]);
  if(saved>0)btns.unshift(['Continue at level '+(saved+1),()=>saved>=8&&!CLASSES[S.cls]?chooseClass():startLevel(saved)]);
  if(typeof MB.openMultiplayer==='function')btns.push(['Multiplayer',()=>hook('openMultiplayer',titleShow)]); // set by net.js when it wants the game to offer it
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',titleShow)]);
  if(typeof MB.openRecords==='function')btns.push(['Records',()=>hook('openRecords',titleShow)]);
  show({kick:'Bones first. Legend later.',title:'You wake as bare bones',body:'Each monster you kill gives part of a body back: organs, then skin, then the five senses. Once you are whole you choose a class. Every level after that makes it stronger, and after level 50 it can be upgraded.',keys:matchMedia('(pointer:coarse)').matches?'Stick to move. Strike aims at the nearest monster.':'WASD or arrows to move. Space or click to strike. Esc or P to pause.',btns});
}
// what extras.js may call
const API={
  show:o=>show(o||{},true),
  // hands the overlay back to the game: gone during play, otherwise the screen the game needs (title, pause, reward, death)
  hide(){if(S.mode==='title')titleShow();else if(S.paused)pauseShow();else if(S.mode==='play'||S.mode==='clear'||!lastScreen)$('ov').hidden=true;else show(lastScreen)},
  startLevel:n=>{n=Math.floor(+n);if(!(n>=0&&n<=9998)||MP.on)return false; // (in a co-op game the host starts the levels)
    if(n>=8&&!CLASSES[S.cls]){chooseClass();return true}startLevel(n);return true},
  title:()=>{if(!MP.on)title()},
  refreshTitle(){if(S.mode==='title'&&!$('ov').hidden&&lastScreen&&lastScreen.kick==='Bones first. Legend later.')titleShow()},
  getSave:()=>JSON.parse(JSON.stringify({...SAVE,rank:S.cls?rank(SAVE.level):''})),
  loadSave,
  sfx(name,...a){audio();if(typeof SND[name]==='function'&&own(SND,name)){SND[name](...a);return true}return false},
  haptic:p=>haptic(p),
};
/* ---------- input ---------- */
const KEY={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'atk',j:'atk',Shift:'dash',k:'dash',e:'sk0',l:'sk0','1':'sk0',q:'sk1','2':'sk1',r:'sk2','3':'sk2',f:'sk3','4':'sk3',c:'sk4','5':'sk4',v:'sk5','6':'sk5'};
addEventListener('keydown',e=>{
  const k=KEY[e.key.length===1?e.key.toLowerCase():e.key];
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&!e.repeat&&(S.paused||S.mode==='play'||S.mode==='clear'||MP.on)){e.preventDefault();pause(!S.paused);return}
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
// a pressed touch button carries the class dn while the finger is on it (the page makes idle buttons see-through)
function pressFx(b){b.addEventListener('pointerdown',()=>b.classList.add('dn'));for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>b.classList.remove('dn'))}
pressFx($('bAtk'));pressFx($('bDash'));
// Six skill buttons (touch) and a skill bar under the vitals (keyboard). Both show the skill's name and the seconds left; MB.skills carries the same data.
// The touch cluster is a 3 x 3 grid laid out in index.html: skills in two columns, first skills at the bottom, Dash above a tall Strike on the outside.
const skB=[$('bSkill')],skL=[],skBar=document.createElement('ul');
{const acts=$('bSkill').parentNode;for(let i=1;i<NSK;i++){const b=document.createElement('button');b.type='button';b.id='bSkill'+(i+1);b.hidden=true;acts.appendChild(b);skB.push(b)}
  skBar.id='skillBar';skBar.hidden=true;skBar.setAttribute('aria-label','Skills');
  skB.forEach((b,i)=>{b.classList.add('sk');b.textContent='';for(const k of['n','c']){const e=document.createElement('span');e.className=k;b.appendChild(e)}
    b.addEventListener('pointerdown',e=>{want.sk[i]=true;e.preventDefault()});pressFx(b);
    const li=document.createElement('li'),kb=document.createElement('kbd');kb.textContent=i+1;li.appendChild(kb);for(const k of['n','c']){const e=document.createElement('span');e.className=k;li.appendChild(e)}skBar.appendChild(li);skL.push(li)});
  document.querySelector('.vitals').after(skBar);
  const kh=document.querySelector('.kbd');if(kh)kh.innerHTML='<kbd>WASD</kbd> or arrows to move · <kbd>Space</kbd> or click to strike · <kbd>Shift</kbd> to dash, once you have lungs · <kbd>1</kbd> to <kbd>6</kbd> for class skills · <kbd>Esc</kbd> to pause';
  const st=document.createElement('style');st.id='mbSkillCss';st.textContent=`
.touch .acts button.sk{border-radius:14px;line-height:1.05;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;overflow:hidden;background:linear-gradient(to top,var(--stone-2) calc(var(--cd,0)*100%),var(--stone) 0)}
.touch .acts button.sk:not(:disabled){border-color:var(--marrow)}
.touch .acts button.sk:disabled{opacity:.75}
.sk .c,#skillBar .c{color:var(--marrow);font-weight:600;font-variant-numeric:tabular-nums}
.sk .c{font-size:1.45em}.sk .c:empty{display:none}
#skillBar{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
#skillBar li{flex:1 1 118px;min-width:0;display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--stone-2);font-size:.82rem;line-height:1.15;color:var(--ash);background:linear-gradient(to right,var(--stone-2) calc(var(--cd,0)*100%),transparent 0)}
#skillBar li.ready{border-color:var(--marrow);color:var(--bone)}#skillBar li.locked{opacity:.45}
#skillBar .c{margin-left:auto}
@media (pointer:coarse){#skillBar{display:none}}`;document.head.appendChild(st)}
let skShown=null,skDeny=-1;const skKey=Array(NSK).fill(''),skF=Array(NSK).fill(-1);
function skillUi(){
  const on=!!cls()&&S.mode!=='title';if(on!==skShown){skShown=on;skBar.hidden=!on;for(const b of skB)b.hidden=!on}
  if(!on)return;
  for(let i=0;i<NSK;i++){const s=SK[i],nomp=s.ready&&!s.affordable,secs=s.cd>0?(s.cd<10?s.cd.toFixed(1):''+Math.ceil(s.cd)):'',txt=!s.unlocked?'Lv '+SKLV[S.load[i]]:secs||(nomp?''+s.cost:''),key=s.name+'|'+txt+'|'+s.unlocked+'|'+nomp+'|'+s.cost;
    // three states besides ready: locked, cooling down (the seconds, a sweep), and not enough mana (class nomp: dimmed, the cost in the mana colour). An unaffordable button stays live, so pressing it can say why nothing happens.
    if(key!==skKey[i]){skKey[i]=key;const b=skB[i],li=skL[i];b.children[0].textContent=li.children[1].textContent=s.name;b.children[1].textContent=txt;li.children[2].textContent=!s.unlocked?txt:secs?secs+'s · '+s.cost+' mp':nomp?'needs '+s.cost+' mp':'ready · '+s.cost+' mp';
      b.disabled=!s.ready;b.classList.toggle('nomp',nomp);li.className=(s.ready&&!nomp?'ready':s.unlocked?'':'locked')+(nomp?' nomp':'');if(s.unlocked)b.dataset.cost=s.cost;else delete b.dataset.cost;
      b.setAttribute('aria-label',s.name+(s.unlocked?(s.cd>0?', '+txt+' seconds':nomp?', not enough mana':', ready')+', costs '+s.cost+' mana':', locked'))}
    const f=s.unlocked&&s.max?Math.ceil(s.cd/s.max*40)/40:0;if(f!==skF[i]){skF[i]=f;skB[i].style.setProperty('--cd',f);skL[i].style.setProperty('--cd',f)}}
  // a skill that was asked for without the mana for it: its button and the mana bar shake for a moment
  const dn=performance.now()-manaCue.at<340?manaCue.i:-1;
  if(dn!==skDeny){if(skDeny>=0){skB[skDeny].classList.remove('deny');skL[skDeny].classList.remove('deny')}if(dn>=0){skB[dn].classList.add('deny');skL[dn].classList.add('deny')}skDeny=dn;manaEl.classList.toggle('deny',dn>=0)}
}
// The mana bar, under the health pips (index.html owns the markup and the look; it is built here when the page does not have it).
// #mana carries: draw (the standing bonus is flowing), full, low (less than the cheapest skill you carry), held (part of the pool is reserved), deny (see above).
let manaEl=$('mana');
if(!manaEl){manaEl=document.createElement('span');manaEl.id='mana';manaEl.hidden=true;manaEl.innerHTML='<span class="lab manaLab">Mana</span><span id="manaBar"><i id="manaFill"></i><i id="manaRes"></i></span><span class="lab" id="manaNum"></span><span class="lab" id="manaHeld"></span><span class="lab" id="manaTag">Drawing</span>';$('hp').after(manaEl)}
let manaKey='',manaCls='';
function manaUi(){
  const on=!!cls()&&S.mode!=='title'&&!!P&&P.maxMana>0;if(manaEl.hidden!==!on)manaEl.hidden=!on;if(!on)return;
  const m=MANA,room=m.max-m.reserved,w=Math.round(P.mana/m.max*400)/4,rw=Math.round(m.reserved/m.max*400)/4,key=m.cur+'|'+w+'|'+m.reserved+'|'+m.max;
  if(key!==manaKey){manaKey=key;$('manaFill').style.width=w+'%';$('manaRes').style.width=rw+'%';$('manaNum').textContent=num(m.cur)+' / '+num(room);$('manaHeld').textContent=m.reserved?num(m.reserved)+' held':'';
    manaEl.setAttribute('aria-label','Mana: '+m.cur+' of '+room+(m.reserved?', '+m.reserved+' held by your '+tw().pl:''));manaEl.title=m.reserved?num(m.reserved)+' of '+num(m.max)+' mana is held by your '+tw().pl:''}
  let low=1e9;for(const s of SK)if(s.unlocked&&s.cost<low)low=s.cost;
  const c=(m.drawing?'draw ':'')+(m.cur>=room?'full ':'')+(m.cur<low?'low ':'')+(m.reserved?'held ':'');
  if(c!==manaCls){manaCls=c;for(const k of['draw','full','low','held'])manaEl.classList.toggle(k,c.includes(k+' '));$('manaTag').textContent=m.drawing?'Drawing':'';manaEl.dataset.regen=m.regen}
}
$('snd').onclick=()=>{audio();const wasOn=!muted&&(SET.music>0||SET.sfx>0);muted=wasOn;pref('mute',muted?1:0);
  if(!wasOn&&!(SET.music>0||SET.sfx>0)){SET.music=.6;SET.sfx=.8;pref('settings',JSON.stringify(SET))} // both volumes were at zero: the button brings the defaults back
  setApply();emit('settings',{key:'mute',value:muted});sfx(520,.08,'triangle',.2);$('snd').blur()};
$('hap').onclick=()=>{setSetting('haptic',SET.haptic>0?0:hapLast);haptic(40);$('hap').blur()};
// The active pets (or trophies) beside your own health. Up to three: a row each, name and bar. More than three: a count, then one small pip each (its fill is the pet's health, or a familiar's charge;
// a fallen pet's pip shows the seconds until it rises), PIPS of them at most, and "+N" for the rest. A fallen pet in a row shows the same countdown after its name.
const petHud=document.createElement('span');petHud.id='petHud';petHud.hidden=true;const petRows=[],PIPS=12;
for(let i=0;i<3;i++){const row=document.createElement('span'),n=document.createElement('span'),b=document.createElement('span'),f=document.createElement('span');row.className='petRow';row.hidden=true;n.className='lab petName';b.className='petBar';f.className='petFill';b.appendChild(f);row.append(n,b);petHud.appendChild(row);petRows.push({row,n,f,key:''})}
const petCnt=document.createElement('span'),petPips=document.createElement('span'),petMore=document.createElement('span'),pipEls=[];petCnt.className='lab petCount';petPips.className='petPips';petMore.className='lab petMore';petCnt.hidden=petPips.hidden=petMore.hidden=true;
for(let i=0;i<PIPS;i++){const p=document.createElement('i'),f=document.createElement('b');p.className='pip';p.hidden=true;p.appendChild(f);petPips.appendChild(p);pipEls.push({p,f,key:''})}
petHud.append(petCnt,petPips,petMore);
($('mana')||$('hp')).after(petHud);
// how far a trophy is from going off again, 0 to 1 (i: its place among the active ones)
function troCharge(e,i,a){
  if(a===undefined)a=allies.find(x=>x.e===e&&x.ent);if(a)return 1-Math.max(0,a.t)/a.tm;const t=TSRC[i];if(!t||!P)return 0;
  return P.trQ?1:t.form==='technique'?P.trN/4:t.form==='arrowhead'?P.trN/6:1-Math.max(0,P.trCd)/(t.form==='ward'?2.5:1.5);
}
// what a fallen pet's entry says: the seconds until it may rise, then that it waits for mana; "fallen" when raising is switched off
const downTxt=e=>e.revT>0&&PETS.auto?Math.ceil(e.revT)+'s':PETS.auto?'mana':'fallen';
let petUiKey='';const petBy=new Map();
function petUi(){
  const on=S.mode!=='title'&&act2()?petOn():[],own=petOwner(),f=form(),tro=!!f&&f!=='pet',many=on.length>3;
  if(petHud.hidden!==!on.length)petHud.hidden=!on.length;if(!on.length)return;
  const cl=(own==='beast'?'beast':'')+(tro?'tro '+f:'')+' n'+Math.min(on.length,4)+(many?' many':'');if(petHud.className!==cl)petHud.className=cl;
  const w=tw();petBy.clear();for(const a of allies)if(a.e&&!a.minion&&(a.pet||a.ent))petBy.set(a.e,a);
  if(petCnt.hidden===many){petCnt.hidden=petPips.hidden=!many;for(const r of petRows){r.row.hidden=true;r.key=''}for(const q of pipEls)q.key=''}
  if(many){
    let up=0;for(const e of on)if(!e.down)up++;const more=on.length-PIPS,head=(tro?on.length:up+'/'+on.length)+' '+w.pl+'|'+more;
    if(head!==petUiKey){petUiKey=head;petCnt.textContent=(tro?on.length:up+'/'+on.length)+' '+w.pl;petMore.hidden=!(more>0);petMore.textContent=more>0?'+'+more:'';
      petHud.setAttribute('aria-label',on.length+' '+w.pl+(tro?'':', '+up+' standing'))}
    pipEls.forEach((q,i)=>{const e=on[i],a=e&&petBy.get(e),dn=!!e&&!!e.down&&!tro,pct=!e?0:tro?Math.round(troCharge(e,i,a||null)*10)*10:dn?0:a?Math.max(0,Math.ceil(a.hp/a.maxHp*10)*10):100,key=e?pct+'|'+(dn?downTxt(e):''):'';
      if(key===q.key)return;q.key=key;q.p.hidden=!e;if(!e)return;q.p.className='pip'+(dn?' down':'')+(tro&&pct>=100?' ready':'');q.f.style.height=pct+'%';q.p.dataset.t=dn&&e.revT>0&&PETS.auto?Math.ceil(e.revT):'';q.p.title=petTag(e)+(dn?' · '+downTxt(e):'');
      q.f.style.background=tro?TCOL[S.cls]:''});
    return}
  // the full name only where there is room for it: one row on a wide screen
  const tight=on.length>1||innerWidth<720||matchMedia('(pointer:coarse)').matches;
  petRows.forEach((r,i)=>{const e=on[i],a=e&&!tro&&petBy.get(e),ch=e&&tro?Math.round(troCharge(e,i)*20)*5:0,lab=e?(tight?petShort(e,on.length):petTag(e)):'',dn=!!e&&!!e.down&&!tro,key=e?lab+'|'+f+'|'+(tro?ch:dn?'x'+downTxt(e):a?Math.ceil(a.hp/a.maxHp*25):'f'):'';
    if(key===r.key)return;r.key=key;r.row.hidden=!e;if(!e)return;
    const pct=tro?ch:dn?0:a?Math.max(0,Math.round(a.hp/a.maxHp*100)):100;r.row.className='petRow'+(dn?' down':'')+(tro&&pct>=100?' ready':'');r.n.textContent=lab+(dn?' · '+downTxt(e):'');r.n.title=petTag(e);r.f.style.width=pct+'%';
    r.n.style.color=tro?TCOL[S.cls]:'';r.f.style.background=tro?TCOL[S.cls]:'';
    r.row.setAttribute('aria-label',cap1(w.n)+': '+petTag(e)+(tro?(pct>=100?', ready':''):dn?', fallen'+(PETS.auto?', rises again for mana':', back next level'):', '+pct+'% health'))});
}
// a pause button beside the toggles, for touch screens
{const pb=document.createElement('button');pb.id='pauseB';pb.type='button';pb.className='tog';pb.textContent='Pause';pb.setAttribute('aria-pressed','false');pb.onclick=()=>{audio();pause(!S.paused);pb.blur()};$('hap').after(pb);
  const st=document.createElement('style');st.textContent='#pauseB[aria-pressed="false"]{opacity:1;text-decoration:none}';document.head.appendChild(st)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(MP.on)mpHidden(true);else pause(true);if(AC)try{AC.suspend()}catch(e){}}else{if(MP.on)mpHidden(false);if(AC&&!muted)try{AC.resume()}catch(e){}}});
// Audio on iOS: a context made or resumed outside a touch stays silent, and one that was interrupted (a call, the app in the background) only comes back inside a gesture.
// So every first touch, click or key press wakes the context if there is one and it is not running, and the first one also plays one silent sample, which is what unlocks the output there.
{let primed=false;const wake=()=>{if(!AC||muted||document.hidden)return;try{if(AC.state!=='running')AC.resume();if(!primed){primed=true;const b=AC.createBuffer(1,1,22050),n=AC.createBufferSource();n.buffer=b;n.connect(AC.destination);n.start(0)}}catch(e){}};
  for(const ev of['pointerdown','touchend','click','keydown'])addEventListener(ev,wake,{capture:true,passive:true})}

/* ---------- multiplayer: co-op over a relay (window.MBNet, net.js). Everything here is off unless MP.on ---------- */
// One member is the host. Its game simulates the world: monsters, their bolts and blasts, the traps' clocks, morsels and the level flow, and it sends a snapshot ('w') about 15 times a second.
// Every member simulates its own hero, allies and pets exactly as alone, decides on its own screen when a replicated attack hits it, and tells the host what it did to the monsters ('hit').
// The other heroes are MP.remotes (MB.mp.remotes): kept up to date from their 'me' messages and drawn about 100 ms in the past, between two samples.
//
// Messages (JSON; positions are whole game pixels, angles are radians x100, c is the sender's clock in ms):
//  w   host -> all, 15 Hz while a level runs: {t,c,n (level),f (1: a full snapshot, replaces everything),
//        m:[[id,x,y,hp,st,flags,target,t x10,ang,lift x100,phase-1]...] every monster (zeros at the end are left out); st: index in STN; target: member index or -1
//           flags: 1 hidden, 2 flash, 4 ward, 8 rage, 16 stunned, 32 slowed, 64 marked, 128 burning or poisoned, 256 moving, 512 ward for more than a moment, 1024 side<0
//        mn:[[id,kind,flags (1 boss, 2 lesser, 4 decoy),maxHp,colour?]] monsters that are new since the last snapshot,
//        b:{id:[on,w,a,len,...]} beams, sn:[[id,x,y,vx,vy,r]] new bolts, sd:[id] bolts taken away (hit someone, wiped by a skill), si:[id] every bolt alive (now and then),
//        zn:[[id,x,y,r,dur x100,t x100,sx,sy]] new blasts, mo:[[id,x,y]] the morsels (when they change), o:[t x100] the traps' clocks (now and then), wv:[n,of,hp0] or 0 (the packs, when it changes)}
//  me  every member -> all, 15 Hz (3 Hz while nothing changes): {t,c,p:[x,y,face,flags,hp,maxHp,swing,atk x100,dash x100]; flags: 1 moving, 2 cannot be hurt, 16 shield up, 32 down, 64 away, 128 first skill ready
//        an:[...] allies that are new (what never changes about them), a:[...] every ally (all of them, or the key is left out), ab:{nid:[on,w,a,len,...]} pet beams,
//        s:[[x,y,vx,vy,r,kind,pierce]] new shots, e:[...] new echoes, z:[[x,y,r,dur x100,sx,sy]] new blasts of mine, f:[[kind,x,y,r,dur x100,every x100]] new fields, r:[[x,y,r,life x100]] rings}
//  lk  a member's look, when it changes: {t,lv,cls,adv,rk,pw:[..]}
//  hit client -> host, when there is something to say (20 Hz at most): {t,n,l:[op...]}; an op is [kind,...]:
//        d id dmg (summed per monster) | kb id dx dy (a strike's shove) | db id slow stun dot mark | st id stun | sl id slow | vn id dmg (venom) | mv id x y (pulled or thrown) |
//        cl x y r (bolts wiped) | sx id (a bolt hit me) | mo id (I ate that morsel) | vp (I was hurt: a vampiric boss feeds)
//  lv  host -> all: {t,k:'go',n,g,cnt,r,o} the level starts (g: the gate it opens from, cnt: members it is scaled for, r: a retry, o: dev override) | {t,k:'clear',n,g} its boss is dead
//  rdy member -> all: {t,g} "I am through with my choices"  ·  sync client -> host: "send a full snapshot"
const MPHZ=15,MPDELAY=100,STN=['idle','wind','lunge','charge','dazed','leap','under','rise','up','beam','cast'],STI={},PKIND=['bolt','arrow','skull','orb'],FKIND=['frost','halo','rain'];
STN.forEach((s,i)=>STI[s]=i);
const mpName=s=>(''+(s===undefined||s===null?'':s)).replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,16)||'Player';
const mpTxt=(s,n=48)=>(''+(s===undefined||s===null?'':s)).slice(0,n);
function nsend(msg,to){const N=window.MBNet;if(!N||typeof N.send!=='function')return;const M=MP.meter;if(M){const b=JSON.stringify(msg).length;M.out+=b;M.n++;M.by[msg.t]=(M.by[msg.t]||0)+b}try{N.send(msg,to)}catch(e){}}
// a few samples [t,x,y,lift] per replicated body; it is drawn where it was MPDELAY ms ago, between two of them
function sPush(o,t,x,y,l){const s=o._s||(o._s=[]);let n=s.length;
  if(n){const dx=x-s[n-3],dy=y-s[n-2];if(dx*dx+dy*dy>19600||t<=s[n-4])n=s.length=0; // a jump (it was thrown, it blinked, a new level) or a clock that went back: start again
    else if(t-s[n-4]>180)s.push(t-67,s[n-3],s[n-2],s[n-1])} // after a gap in the stream: it stood where it was until just before this sample
  s.push(t,x,y,l||0);if(s.length>16)s.splice(0,s.length-16)}
function sAt(o,rt){const s=o._s;if(!s||!s.length)return;let i=s.length-4;
  if(rt>=s[i]){if(i>=4){const d=s[i]-s[i-4],k=d>0?Math.min(rt-s[i],50)/d:0;o.x=s[i+1]+(s[i+1]-s[i-3])*k;o.y=s[i+2]+(s[i+2]-s[i-2])*k}else{o.x=s[i+1];o.y=s[i+2]}o.lift=s[i+3];return}
  while(i>0&&rt<s[i])i-=4;
  if(rt<=s[i]){o.x=s[i+1];o.y=s[i+2];o.lift=s[i+3];return}
  const k=(rt-s[i])/(s[i+4]-s[i]);o.x=s[i+1]+(s[i+5]-s[i+1])*k;o.y=s[i+2]+(s[i+6]-s[i+2])*k;o.lift=s[i+3]+(s[i+7]-s[i+3])*k}
function sVel(o){const s=o._s,n=s?s.length:0;if(n>=8){const d=(s[n-4]-s[n-8])/1000;if(d>0){o.vx=(s[n-3]-s[n-7])/d;o.vy=(s[n-2]-s[n-6])/d}}}
// the difference between a sender's clock and mine: the smallest seen, creeping up slowly so a drifting clock is followed
const clkIn=(k,c,now)=>{const d=now-c;k.off=d<k.off?d:k.off+.2};
const hpR=v=>v<=0?0:v>=100?Math.round(v):Math.max(.1,Math.round(v*10)/10);
/* --- scaling with the size of the party: health x(1 + 0.75 per extra member), small fry x(1 + 0.25), and a few more of them --- */
function mpHp(hp,kind){const n=MP.cnt;if(n<2)return hp;return Math.max(1,Math.round(hp*(1+(kind==='mite'||kind==='husk'?.25:.75)*(n-1))))}
const mpPack=()=>Math.min(3,Math.floor((MP.cnt-1)/2));
/* --- whom a monster fights: the nearest hero standing, and it stays with the one it has unless another is clearly nearer --- */
function mpHeroes(){const h=MP.heroes;h.length=0;if(P&&!P.down&&!MP.away&&S.mode==='play')h.push(P);for(const r of MP.remotes)if(!r.dead&&!r.away)h.push(r.P);return h}
function mpFoe(m){if(MP.hStamp!==S.t){MP.hStamp=S.t;mpHeroes()}const h=MP.heroes;let best=null,bd=1e9;for(let i=0;i<h.length;i++){const d=dist(m,h[i])-(h[i]===m.tgt?45:0);if(d<bd){bd=d;best=h[i]}}m.tgt=best;return best}
function mpPartyY(){const h=mpHeroes();if(!h.length)return P.y;let y=0;for(const q of h)y+=q.y;return y/h.length}
const mpHeroAt=i=>i===MP.myIdx?P:MP.byIdx[i]?MP.byIdx[i].P:null;
/* --- what a client does to a monster goes to the host; alone, and on the host, it simply happens --- */
function mpQ(op){MP.q.push(op)}
function mSlow(m,v){if(CL())mpQ(['sl',m.id,v]);else m.slow=Math.max(m.slow||0,v)}
function mStun(m,v){if(CL())mpQ(['st',m.id,v]);else m.stun=v}
function mPush(m,dx,dy){if(CL())return mpQ(['kb',m.id,Math.round(dx),Math.round(dy)]);m.x+=dx;m.y+=dy;clamp(m,m.r)}
function mMove(m,x,y){if(CL())return mpQ(['mv',m.id,Math.round(x),Math.round(y)]);m.x=x;m.y=y;clamp(m,m.r);if(m.st==='charge'||m.st==='lunge'){m.st='dazed';m.t=.6}}
function mVen(m,d,a){if(CL())return mpQ(['vn',m.id,Math.round(d*1000)/1000]);m.venT=3;m.venD=Math.max(m.venT>0&&m.venD||0,d);m.venK=.5;m.venBy=a;m.venRem=null}
function clearShots(c,r){
  if(MP.on){if(MP.role==='host'){for(const s of shots)if(dist(s,c)<=r)MP.sd.push(s.id)}else mpQ(['cl',Math.round(c.x),Math.round(c.y),Math.min(9999,Math.round(r))])}
  shots=shots.filter(s=>dist(s,c)>r)}
function mpShotHit(s){if(MP.role==='host')MP.sd.push(s.id);else mpQ(['sx',s.id])}
function mpMorsel(f){if(MP.role==='host')return;MP.ate.add(f.id);mpQ(['mo',f.id])}
// a client's blow: shown at once, counted, and sent; the monster's health is the host's to change
function mpHurtM(m,d,quiet){
  if(m.decoy)return;if(m.ward>0){SND.ward();return}
  const dd=m.markT>0?d*1.5:d,got=Math.max(0,Math.min(dd,m.hp));ST.dmgDealt+=got;if(byPet)petFed(got);
  m.flash=.12;puff(m,col(m.s.col),5,120);SND.hit(quiet);if(!quiet)haptic(12);floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(dd),life:.7,c:'#e7dfcd'});
  m._mine=(m._mine||0)+dd;MP.qd.set(m.id,(MP.qd.get(m.id)||0)+d);
  // something small that this blow should have killed is gone here at once (the host confirms it a moment later; if it disagrees, it is back)
  if(!m.boss&&m._mine>=m.hp&&!m._gone){m._gone=performance.now()+450;m.hidden=true;puff(m,col(m.s.col),10,160)}
}
function mpFlush(){
  if(!MP.q.length&&!MP.qd.size)return;const l=MP.q;MP.q=[];
  for(const[id,d]of MP.qd)l.push(['d',id,d>=1e6?1e9:Math.round(d*100)/100]);MP.qd.clear();
  if(S.mode==='play'||S.mode==='clear')nsend({t:'hit',n:S.level,l},MP.hostId)}
// host: what a client says it did
function mpOnHit(msg,from){
  if(MP.role!=='host'||S.mode!=='play'||msg.n!==S.level||!Array.isArray(msg.l))return;
  for(const op of msg.l){const k=op[0];
    if(k==='cl'){clearShots({x:+op[1]||0,y:+op[2]||0},+op[3]||0);continue}
    if(k==='sx'){const i=shots.findIndex(s=>s.id===op[1]);if(i>=0){MP.sd.push(op[1]);shots.splice(i,1)}continue}
    if(k==='mo'){morsels=morsels.filter(f=>f.id!==op[1]);continue}
    if(k==='vp'){vamp();continue}
    let m=null;for(const x of mons)if(x.id===op[1]){m=x;break}if(!m)continue;
    REM=from||true;
    try{
      if(k==='d'){const d=+op[2];if(d>0)hurtM(m,d,true)}
      else if(k==='kb'){if(!m.boss&&!m.decoy){m.x+=Math.max(-40,Math.min(40,+op[2]||0));m.y+=Math.max(-40,Math.min(40,+op[3]||0));clamp(m,m.r)}}
      else if(k==='db'){debuff(m,{slow:+op[2]||0,stun:+op[3]||0,dot:+op[4]||0,mark:+op[5]||0},1);if(op[4])m.dotRem=REM}
      else if(k==='st'){const v=+op[2];if(v>0)m.stun=Math.min(8,v)}
      else if(k==='sl'){const v=+op[2];if(v>0)m.slow=Math.max(m.slow||0,Math.min(10,v))}
      else if(k==='vn'){const v=+op[2];if(v>0){m.venT=3;m.venD=Math.max(m.venD||0,v);m.venK=.5;m.venBy=null;m.venRem=REM;puff(m,TCOL.assassin,10,120)}}
      else if(k==='mv'){if(!m.hidden&&m.st!=='leap')mMove(m,+op[2]||m.x,+op[3]||m.y)}
    }finally{REM=null}
    if(S.mode!=='play')break; // that was the boss
  }
}
/* --- the host's snapshot of the world --- */
function mpMonDyn(m){
  const f=(m.hidden?1:0)|(m.flash>0?2:0)|(m.ward>0?4:0)|(m.rage?8:0)|(m.stun>0?16:0)|(m.slow>0?32:0)|(m.markT>0?64:0)|(m.dotT>0||m.venT>0?128:0)|(m.moving?256:0)|(m.ward>.3?512:0)|(m.side<0?1024:0);
  const st=m.st,a=[m.id,Math.round(m.x),Math.round(m.y),hpR(m.hp),STI[st]||0,f,m.tgt?(m.tgt===P?MP.myIdx:m.tgt._mi):-1,m.ai==='mite'?0:Math.round(m.t*10)||0,
    st==='wind'||st==='charge'||st==='lunge'||st==='dazed'?Math.round(m.ang*100)||0:0,Math.round(m.lift*100)||0,(m.phase||1)-1];
  while(a.length>7&&!a[a.length-1])a.pop();return a}
const beamOut=b=>{const a=[b.on?1:0,b.w];for(const r of b.rays)a.push(Math.round(r.a*100),Math.round(r.len));return a};
function beamIn(o,d){const n=(d.length-2)>>1;let b=o.beam;if(!b||b.rays.length!==n)b=o.beam={on:false,w:12,rays:Array.from({length:n},()=>({a:0,len:0}))};b.on=!!d[0];b.w=+d[1]||12;for(let i=0;i<n;i++){b.rays[i].a=d[2+i*2]/100;b.rays[i].len=+d[3+i*2]||0}if(n)o.ba=b.rays[0].a}
function mpSendWorld(now){
  if(S.mode!=='play')return;
  const full=MP.full,wm=full?0:MP.wm,w={t:'w',c:Math.round(now),n:S.level},M=[];let mn=null,b=null,sn=null,zn=null;if(full)w.f=1;
  for(const m of mons){
    if(m.id>wm){const a=[m.id,m.kind,(m.boss?1:0)|(m.lesser?2:0)|(m.decoy?4:0),hpR(m.maxHp)];if(m.lesser&&SPEC[m.kind]&&m.s.col!==SPEC[m.kind].col)a.push(m.s.col);(mn||(mn=[])).push(a)}
    M.push(mpMonDyn(m));if(m.beam)(b||(b={}))[m.id]=beamOut(m.beam)}
  w.m=M;if(mn)w.mn=mn;if(b)w.b=b;
  for(const s of shots)if(s.id>wm&&!s.dead)(sn||(sn=[])).push([s.id,Math.round(s.x),Math.round(s.y),Math.round(s.vx),Math.round(s.vy),s.r]);if(sn)w.sn=sn;
  if(MP.sd.length){if(!full)w.sd=MP.sd;MP.sd=[]}
  if(!full&&now>=MP.tSi){MP.tSi=now+2000;if(shots.length)w.si=shots.map(s=>s.id)}
  for(const z of zones)if(!z.mine&&z.id>wm){const a=[z.id,Math.round(z.x),Math.round(z.y),z.r,Math.round(z.dur*100),Math.round(z.t*100)];if(z.sx!==undefined)a.push(Math.round(z.sx),Math.round(z.sy));(zn||(zn=[])).push(a)}if(zn)w.zn=zn;
  let mk='';for(const f of morsels)mk+=f.id+',';if(full||mk!==MP.moKey){MP.moKey=mk;w.mo=morsels.map(f=>[f.id,Math.round(f.x),Math.round(f.y)])}
  if(obstacles.length&&(full||now>=MP.tOb)){MP.tOb=now+1500;w.o=obstacles.map(o=>Math.round(o.t*100))}
  const wk=S.wave?S.wave.n+'/'+S.wave.of:'';if(full||wk!==MP.wvKey){MP.wvKey=wk;w.wv=S.wave?[S.wave.n,S.wave.of,Math.round(S.wave.hp0||0)]:0}
  MP.wm=NEXTID-1;MP.full=false;nsend(w);
}
/* --- a client's copy of the world --- */
function mpMkMon(a){
  const id=a[0],kind=typeof a[1]==='string'&&own(SPEC,a[1])?a[1]:'mite',fl=a[2]|0,maxHp=+a[3]||1,L=S.L;let s;
  if(fl&1)s=L.spec;else if(fl&2){s=lesserSpec(kind,S.level,maxHp);if(typeof a[4]==='string'&&/^#[0-9a-f]{6}$/i.test(a[4]))s.col=a[4]}else s=SPEC[kind];
  return{id,kind,s,ai:AI[s.ai||kind]?s.ai||kind:'mite',x:W/2,y:140,r:s.r,hp:maxHp,maxHp,boss:!!(fl&1),lesser:!!(fl&2),decoy:!!(fl&4),st:'idle',t:1,n:0,flash:0,ring:0,ang:0,side:1,hits:0,seed:rand()*9,hidden:false,lift:0,
    mods:fl&1?(L.mods||[]).slice():[],ward:0,beam:null,vx:0,vy:0,moving:false,rage:false,phase:1,rep:true,_new:true}}
function mpNeedSync(now){if(now<MP.tSync)return;MP.tSync=now+1000;MP.synced=false;nsend({t:'sync'},MP.hostId)}
function mpOnWorld(w,from){
  if(MP.role!=='client'||from!==undefined&&from!==null&&''+from!==MP.hostId)return;
  const now=performance.now();if(typeof w.c==='number')clkIn(MP.hclk,w.c,now);
  if(S.mode!=='play'||w.n!==S.level||!Array.isArray(w.m))return;
  if(!MP.synced){if(!w.f)return;MP.synced=true}
  const byId=MP.mons,L=S.L,c=w.c;
  if(w.f){shots=[];zones=zones.filter(z=>z.mine);morsels=[];MP.ate.clear()}
  if(w.mn)for(const a of w.mn)if(!byId.has(a[0]))byId.set(a[0],mpMkMon(a));
  const list=[],seen=++MP.seen;let bs=null,lost=false;
  for(const a of w.m){const m=byId.get(a[0]);if(!m){lost=true;continue}
    const x=a[1],y=a[2],hp=+a[3]||0,st=STN[a[4]]||'idle',f=a[5]|0;m._seen=seen;
    const fresh=m._new;if(fresh){m._new=false;m.x=x;m.y=y;m._s=null;m.hp=hp;m.st=st;if(m.lesser&&!w.f)puff(m,col(m.s.col),10)}
    sPush(m,c,x,y,(a[9]||0)/100);sVel(m);
    // what the others did to it shows as a grey number (my own blows showed when I struck)
    if(hp<m.hp){let d=m.hp-hp;const mine=Math.min(d,m._mine||0);m._mine=(m._mine||0)-mine;d-=mine;if(d>=(m.maxHp>60?1:.5)){floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(Math.round(d*10)/10),life:.7,c:'#958ea3'});if(!(m.flash>0))m.flash=.1}}
    else if(hp>m.hp+.9&&m.boss)floats.push({x:m.x,y:m.y-m.r-10,txt:'+'+fmt(Math.round((hp-m.hp)*10)/10),life:1,c:'#7fd66b'});
    if(m._mine>0)m._mine*=.85;m.hp=hp;
    if(m.st!==st){if(st==='charge'){sfx(180,.3,'sawtooth',.25,70);noise(.3,.16,300,900)}else if(st==='beam'){sfx(110,.5,'sawtooth',.25,70);noise(.4,.2,2400,600)}else if(st==='dazed'&&m.st==='charge')sfx(70,.2,'square',.35,40);m.st=st}
    if(m._gone&&now>m._gone){m._gone=0;m._mine=0}m.hidden=!!(f&1)||m._gone>0;if(f&2&&!(m.flash>0))m.flash=.1;m.ward=f&4?(f&512?.5:.2):0;
    if(f&8){if(!m.rage&&!fresh&&m.ai!=='hollow')enrage(m);m.rage=true}else m.rage=false;
    m.stun=f&16?.2:0;m.slow=f&32?.2:0;m.markT=f&64?.2:0;m.dotT=f&128?.2:0;m.moving=!!(f&256);m.side=f&1024?-1:1;m.tgt=mpHeroAt(a[6]);
    if(a[7]!==undefined&&m.ai!=='mite')m.t=a[7]/10;if(a[8])m.ang=a[8]/100;
    const ph=(a[10]||0)+1;if(ph>(m.phase||1)){m.phase=ph;if(!fresh)phaseFx(m)}m.phase=ph;
    const bd=w.b&&w.b[m.id];if(bd)beamIn(m,bd);else if(m.beam)m.beam=null;
    list.push(m);if(m.boss)bs=m}
  if(byId.size>list.length)for(const[id,m]of byId)if(m._seen!==seen){byId.delete(id);if(!m._gone)puff(m,col(m.s.col),m.boss?50:10,m.boss?320:160);ST.kills++;if(!m.boss&&P&&!P.down)manaGive(P.maxMana*MKILL)}
  mons=list;boss=bs;if(lost)mpNeedSync(now);
  if(w.sn){if(!w.f&&w.sn.length)sfx(520,.1,'sine',.12,260);for(const a of w.sn){const vx=+a[3]||0,vy=+a[4]||0,k=w.f?0:MPDELAY/1000;shots.push({id:a[0],x:a[1]-vx*k,y:a[2]-vy*k,vx,vy,r:+a[5]||6,g:k?k+.03:0})}}
  if(w.sd&&w.sd.length)shots=shots.filter(s=>!w.sd.includes(s.id));
  if(w.si)shots=shots.filter(s=>s.g>0||w.si.includes(s.id));
  if(w.zn)for(const a of w.zn){const z={id:a[0],x:a[1],y:a[2],r:+a[3]||60,dur:(+a[4]||100)/100,t:(+a[5]||0)/100};if(a[6]!==undefined){z.sx=a[6];z.sy=a[7]}zones.push(z)}
  if(w.mo)morsels=w.mo.filter(a=>!MP.ate.has(a[0])).map(a=>({id:a[0],x:a[1],y:a[2]}));
  if(w.o)for(let i=0;i<w.o.length&&i<obstacles.length;i++)obstacles[i].t=w.o[i]/100;
  if(w.wv!==undefined){
    if(w.wv){const n=w.wv[0],of=w.wv[1];if(!S.wave||S.wave.n!==n){floats.push({x:W/2,y:H/2-90,txt:of>1?'Pack '+n+' of '+of:'The pack',life:1.6,c:'#d6a544'});sfx(150,.4,'sawtooth',.2,90)}S.wave={n,of,hp0:w.wv[2]||1};$('bossName').textContent='Wave '+n+' of '+of}
    else{const had=S.wave;S.wave=null;$('bossName').textContent=L.spec.name;
      if(had&&bs){rings.push({x:bs.x,y:bs.y,life:.7,max:.7,r:bs.r+120,fx:true});puff(bs,col(bs.s.col),26,240);S.shake=Math.max(S.shake,.3);SND.roar();haptic([30,30,80]);floats.push({x:bs.x,y:bs.y-bs.r-20,txt:L.spec.name,life:1.8,c:'#ff5b6e'})}}}
}
// a client's monsters every step: what they do to me and to my pets (their moves and their health come from the host)
function mpMons(dt){
  for(const m of mons){
    if(m.flash>0)m.flash-=dt;
    if(m.rage&&rand()<dt*12)bits.push({x:m.x+rand()*m.r*2-m.r,y:m.y-rand()*m.r,vx:rand()*30-15,vy:-50-rand()*40,life:.6,max:.6,c:'#ff5b6e',r:2.5});
    if((m.ring-=dt)<=0&&(m.moving||m.st==='wind')){rings.push({x:m.x,y:m.y,life:.8,max:.8,r:m.r+24,under:m.hidden});m.ring=m.st==='wind'?.12:.42}
    if(!m.hidden&&m.st!=='leap'&&m.st!=='dazed'&&!(m.stun>0)&&dist(m,P)<m.r+11)hurtP(blow(m.st==='charge'||m.st==='lunge'&&S.level>=3?1:-1),m.ai+':'+m.st);
    if(m.beam&&m.beam.on&&!m.hidden)for(const r of m.beam.rays)if(segDist(P,m.x,m.y,r.a,r.len)<m.beam.w+9){hurtP(blow(0),'beam');break}
    if(PETS.fielded.length)monVsPets(m);
  }
}
/* --- my hero, for the others --- */
const mpLook=()=>({t:'lk',lv:S.level,cls:S.cls,adv:S.adv,rk:S.cls?rank():'',pw:[pw(1)?1:0,pw(2)?1:0,pw(3)?1:0]});
function mpAllyStatic(a){
  if(a.pet)return[a.nid,'p',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,hpR(a.maxHp),(a.minion?1:0)|(a.lesser?2:0)|(a.helper?4:0)|(a.trophy?8:0)|(a.crown?16:0),a.owner,a.plv|0,a.mods&&a.mods.length?a.mods:0,a.perk||0];
  if(a.trophy)return[a.nid,a.kind==='familiar'?'f':'g',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,a.tm||1,a.owner,Math.round(a.seed*100)/100,a.s.r];
  return[a.nid,a.kind==='wolf'?'w':'t',a.r]}
function mpAllyDyn(a){
  const x=Math.round(a.x),y=Math.round(a.y);
  if(a.pet){const d=[a.nid,x,y,(a.flip?1:0)|(a.moving?2:0)|(a.hidden?4:0)|(a.flash>0?8:0)|(a.ward>0?16:0)|(a.rage?32:0)|(a.inv>0?64:0),hpR(a.hp),STI[a.st]||0,Math.round((a.face||0)*100)||0,a.minion?0:Math.round((a.t||0)*10)||0,Math.round((a.lift||0)*100)||0,(a.phase||1)-1];
    while(d.length>6&&!d[d.length-1])d.pop();return d}
  if(a.trophy)return[a.nid,x,y,(a.flip?1:0)|(a.moving?2:0)|(a.flash>0?8:0)|(a.shield?256:0),STI[a.st]||0,Math.round((a.face||0)*100)||0,Math.round((a.t||0)*10)||0];
  return[a.nid,x,y,a.flip?1:0]}
function mpSendMe(now,force){
  if(!P)return;MP.tick++;
  const inLv=(S.mode==='play'||S.mode==='clear')&&!MP.away,away=!inLv;
  const p=[Math.round(P.x),Math.round(P.y),Math.round(P.face*100)||0,(P.moving?1:0)|(P.inv>0?2:0)|(P.shield?16:0)|(P.down?32:0)|(away?64:0)|(SK[0].ready?128:0),Math.max(0,P.hp),P.maxHp,Math.round(P.swing*100)||0,
    Math.round(Math.max(0,P.atk,MP.swung?.1:0)*100),Math.round(Math.max(0,P.dashT,MP.dashed?.1:0)*100)];MP.swung=MP.dashed=false;
  while(p.length>7&&!p[p.length-1])p.pop();
  const msg={t:'me',c:Math.round(now),p};let ev=false;
  if(inLv){
    if(MP.wasAway){MP.wasAway=false;for(const a of allies)a._sent=false}
    const n=allies.length,every=n<=6?1:n<=16?2:3;
    for(const a of allies)if(!a._sent){a._sent=true;(msg.an||(msg.an=[])).push(mpAllyStatic(a))}
    if(n||MP.hadAl){if(msg.an||!n||MP.tick%every===0){msg.a=allies.map(mpAllyDyn);for(const a of allies)if(a.beam&&a.pet)(msg.ab||(msg.ab={}))[a.nid]=beamOut(a.beam);MP.hadAl=n>0}ev=true}
    for(const q of pshots)if(!q._sent){q._sent=true;(msg.s||(msg.s=[])).push([Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy),q.r,Math.max(0,PKIND.indexOf(q.kind)),Math.min(99,q.pierce|0)])}
    for(const e of echoes)if(!e._sent){e._sent=true;(msg.e||(msg.e=[])).push([Math.round(e.x),Math.round(e.y),Math.round(e.ang*100)||0,e.k||e.ai,e.ai,e.s.col,e.s.r,e.s.crown?1:0,e.owner])}
    for(const z of zones)if(z.mine&&!z.rem&&!z._sent){z._sent=true;const a=[Math.round(z.x),Math.round(z.y),z.r,Math.round(z.dur*100)];if(z.sx!==undefined)a.push(Math.round(z.sx),Math.round(z.sy));(msg.z||(msg.z=[])).push(a)}
    for(const f of fields)if(!f.rem&&!f._sent){f._sent=true;(msg.f||(msg.f=[])).push([Math.max(0,FKIND.indexOf(f.kind)),Math.round(f.x),Math.round(f.y),f.r,Math.round(f.dur*100),Math.round(f.every*100)])}
    if(MP.rq.length){msg.r=MP.rq;MP.rq=[]}
    if(msg.s||msg.e||msg.z||msg.f||msg.r)ev=true;
  }else{if(MP.hadAl){msg.a=[];MP.hadAl=false;ev=true}MP.rq.length=0;MP.wasAway=true;for(const q of pshots)q._sent=true;for(const e of echoes)e._sent=true;for(const z of zones)z._sent=true;for(const f of fields)f._sent=true}
  // nothing new to say: three times a second is enough
  const key=p.join();if(!ev&&!force&&key===MP.pKey&&now-MP.tSent<320)return;MP.pKey=key;MP.tSent=now;
  nsend(msg);
  if(now>=MP.tLook||force){MP.tLook=now+400;const lk=mpLook(),k=JSON.stringify(lk);if(k!==MP.lookKey||force){MP.lookKey=k;nsend(lk)}}
}
/* --- the other heroes --- */
function mkRemote(m){
  const q={x:W/2,y:H-120,face:-Math.PI/2,moving:false,walk:0,hp:1,maxHp:1,inv:0,atk:0,swing:0,dashT:0,shield:false,skCd:0,vx:0,vy:0,lift:0,down:false,_mi:m.idx};
  return{id:m.id,name:m.name,idx:m.idx,dead:false,away:true,team:0,P:q,look:{level:8,cls:null,adv:null,rank:'',pw:[false,false,false],parts:7,skill0Ready:false},allies:[],pshots:[],echoes:[],_al:new Map(),_clk:{off:1e18},_seen:0}}
function mpMkAlly(r,a){
  const nid=a[0],k=a[1];if(r._al.has(nid))return;let o;
  if(k==='p'||k==='f'||k==='g'){const base=typeof a[2]==='string'&&own(SPEC,a[2])?SPEC[a[2]]:SPEC.crawler,ai=AI[a[3]]?a[3]:'mite',name=mpTxt(a[4]),c=typeof a[5]==='string'&&/^#[0-9a-f]{6}$/i.test(a[5])?a[5]:base.col,rr=Math.max(4,Math.min(60,+a[6]||10));
    if(k==='p'){const fl=a[8]|0;
      o={nid,kind:'pet',pet:true,owner:a[9]==='beast'?'beast':'necro',s:{...base,ai,name,col:c,crown:fl&16?1:0,r:rr},ai,name,plv:a[10]|0,perk:typeof a[12]==='string'&&MODS.includes(a[12])?a[12]:null,crown:fl&16?1:0,minion:!!(fl&1),lesser:!!(fl&2),helper:!!(fl&4),trophy:!!(fl&8),
        x:0,y:0,r:rr,hp:+a[7]||1,maxHp:+a[7]||1,st:'idle',t:1,ang:0,face:0,flash:0,hidden:false,lift:0,seed:rand()*9,mods:Array.isArray(a[11])?a[11].filter(x=>MODS.includes(x)):[],ward:0,beam:null,boss:false,moving:false,walk:0,flip:false,inv:0,rage:false,phase:1,life:1e9,rem:true}}
    else{const f=k==='f'?'familiar':'guardian';
      o={nid,kind:f,trophy:true,ent:true,form:f,owner:own(CLASSES,a[8])?a[8]:'mage',s:{...base,ai,name,col:c,crown:0,r:Math.max(4,Math.min(60,+a[10]||rr))},ai,name,x:0,y:0,r:rr,tm:+a[7]||1,t:0,seed:+a[9]||0,face:0,st:'idle',stT:0,flash:0,life:1e9,hidden:false,lift:0,mods:[],ward:0,beam:null,boss:false,moving:false,walk:0,flip:false,shield:false,rem:true}}}
  else o={nid,kind:k==='w'?'wolf':'thrall',x:0,y:0,r:+a[2]||9,walk:rand()*6,flip:false,moving:false,life:1e9,cd:0,rem:true};
  o._new=true;r._al.set(nid,o)}
function mpAllyIn(o,d,c){
  const x=d[1],y=d[2],f=d[3]|0;if(o._new){o._new=false;o.x=x;o.y=y}
  o.flip=!!(f&1);
  if(o.pet){o.moving=!!(f&2);o.hidden=!!(f&4);o.flash=f&8?.1:0;o.ward=f&16?.2:0;o.rage=!!(f&32);o.inv=f&64?.2:0;o.hp=+d[4]||0;o.st=STN[d[5]]||'idle';o.face=(d[6]||0)/100;if(o.st==='charge'||o.st==='lunge')o.ang=o.face;if(!o.minion)o.t=(d[7]||0)/10;o.phase=(d[9]||0)+1;sPush(o,c,x,y,(d[8]||0)/100)}
  else if(o.trophy){o.moving=!!(f&2);o.flash=f&8?.1:0;o.shield=!!(f&256);o.st=STN[d[4]]||'idle';o.face=(d[5]||0)/100;o.t=(d[6]||0)/10;sPush(o,c,x,y,0)}
  else{const s=o._s,n=s?s.length:0;o.moving=n?Math.abs(x-s[n-3])+Math.abs(y-s[n-2])>1:false;sPush(o,c,x,y,0)}}
function mpOnMe(msg,from){
  const r=MP.rById.get(''+from);if(!r)return;const now=performance.now(),p=msg.p,c=+msg.c||0;clkIn(r._clk,c,now);
  if(Array.isArray(p)){const q=r.P,f=p[3]|0,aw=!!(f&64);
    if(aw!==r.away){r.away=aw;q._s=null;if(aw){r.allies.length=0;r.pshots.length=0}}
    sPush(q,c,+p[0]||0,+p[1]||0,0);sVel(q);if(!q._s||q._s.length<=4){q.x=+p[0]||0;q.y=+p[1]||0;q.vx=q.vy=0}
    q.face=(p[2]||0)/100;q.moving=!!(f&1);q.inv=f&2?.2:0;q.shield=!!(f&16);r.dead=q.down=!!(f&32);r.look.skill0Ready=!!(f&128);q.skCd=f&128?0:1;q.hp=+p[4]||0;q.maxHp=+p[5]||1;q.swing=(p[6]||0)/100;if(p[7]>0)q.atk=p[7]/100;if(p[8]>0)q.dashT=p[8]/100}
  if(msg.an)for(const a of msg.an)mpMkAlly(r,a);
  if(msg.a){const out=r.allies,seen=++r._seen;out.length=0;for(const d of msg.a){const o=r._al.get(d[0]);if(!o)continue;o._seen=seen;mpAllyIn(o,d,c);out.push(o)}
    if(r._al.size>out.length)for(const[k,o]of r._al)if(o._seen!==seen)r._al.delete(k);
    for(const o of out)if(o.pet){const b=msg.ab&&msg.ab[o.nid];if(b)beamIn(o,b);else if(o.beam)o.beam=null}}
  if(r.away)return;
  if(msg.s)for(const a of msg.s)if(r.pshots.length<400)r.pshots.push({x:+a[0]||0,y:+a[1]||0,vx:+a[2]||0,vy:+a[3]||0,r:+a[4]||4,kind:PKIND[a[5]]||'bolt',pierce:a[6]|0});
  if(msg.e)for(const a of msg.e){const base=typeof a[3]==='string'&&own(SPEC,a[3])?SPEC[a[3]]:SPEC.crawler,ow=own(CLASSES,a[8])?a[8]:'mage';
    r.echoes.push({ai:AI[a[4]]?a[4]:'mite',s:{...base,ai:AI[a[4]]?a[4]:'mite',col:typeof a[5]==='string'&&/^#[0-9a-f]{6}$/i.test(a[5])?a[5]:base.col,r:Math.max(4,Math.min(60,+a[6]||base.r)),crown:a[7]?1:0},x:+a[0]||0,y:+a[1]||0,ang:(a[2]||0)/100,life:.6,max:.6,owner:ow,col:TCOL[ow]||'#b88cff'});if(r.echoes.length>10)r.echoes.shift()}
  if(S.mode!=='play')return;
  // a teammate's blasts, fields and shockwaves are shown here as they are there; they do nothing here, except that hallowed ground mends whoever stands on it
  if(msg.z)for(const a of msg.z)if(zones.length<200){const z={x:+a[0]||0,y:+a[1]||0,r:+a[2]||60,t:0,dur:Math.max(.1,(+a[3]||50)/100),mine:true,rem:true,dmg:0};if(a[4]!==undefined){z.sx=+a[4]||0;z.sy=+a[5]||0}zones.push(z)}
  if(msg.f)for(const a of msg.f)if(fields.length<60)fields.push({kind:FKIND[a[0]]||'rain',x:+a[1]||0,y:+a[2]||0,r:+a[3]||80,t:0,dur:Math.min(30,(+a[4]||100)/100),every:Math.max(.2,(+a[5]||50)/100),tick:0,dmg:0,slow:false,rem:true});
  if(msg.r)for(const a of msg.r)if(rings.length<300){const l=Math.max(.1,Math.min(2,(+a[3]||40)/100));rings.push({x:+a[0]||0,y:+a[1]||0,life:l,max:l,r:+a[2]||60,fx:true})}
}
function mpOnLook(msg,from){const r=MP.rById.get(''+from);if(!r)return;const k=r.look;k.level=Math.max(0,Math.min(9998,msg.lv|0));k.cls=own(CLASSES,msg.cls)?msg.cls:null;k.adv=k.cls&&CLASSES[k.cls].adv.some(a=>a[0]===msg.adv)?msg.adv:null;k.rank=mpTxt(msg.rk,8);
  const w=Array.isArray(msg.pw)?msg.pw:[];k.pw=[!!w[0],!!w[1],!!w[2]];MP.hudKey=''}
function mpRemoteStep(r,dt,now){
  const q=r.P,rt=now-r._clk.off-MPDELAY;sAt(q,rt);if(q.atk>0)q.atk-=dt;if(q.dashT>0)q.dashT-=dt;if(q.moving)q.walk+=dt*11;
  for(const a of r.allies){sAt(a,rt);if(a.moving)a.walk+=dt*12}
  const ps=r.pshots;if(ps.length){let n=0;for(const p of ps){p.x+=p.vx*dt;p.y+=p.vy*dt;let dead=p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL||obstacles.length&&blocked(p);
    if(!dead)for(const m of mons)if(!m.hidden&&p._h!==m&&dist(m,p)<m.r+p.r+3){if(p.pierce>0){p.pierce--;p._h=m}else dead=true;break}
    if(!dead)ps[n++]=p}ps.length=n}
  const es=r.echoes;if(es.length){let n=0;for(const e of es){e.life-=dt;if(e.life>0)es[n++]=e}es.length=n}
}
/* --- the level flow, the same for everyone: class choice -> level -> clear -> each member's own rewards -> all ready -> next level --- */
function mpGo(n,retry){ // host: the level starts for all
  if(MP.role!=='host')return;
  MP.g++;MP.phase='run';MP.lv=n;MP.ready.clear();MP.meReady=false;MP.failT=0;MP.cnt=Math.max(1,MP.members.length);
  nsend({t:'lv',k:'go',n,g:MP.g,cnt:MP.cnt,r:retry?1:0,o:window.__mb&&window.__mb.over||undefined});
  S.level=n;startLevel(n);if(retry)floats.push({x:W/2,y:H/2-70,txt:'The party fell. Again.',life:2.2,c:'#ff5b6e'});
}
// called by startLevel on every member, before anything is spawned
function mpSpawnAt(){const n=Math.max(1,MP.slots),i=MP.myIdx%n;P.x=W/2+(i-(n-1)/2)*Math.min(56,420/n);P.safeX=P.x;P.down=false;MP.down=false}
function mpLevelStarted(){
  MP.mons.clear();MP.q=[];MP.qd.clear();MP.sd=[];MP.ate.clear();MP.moKey='?';MP.wvKey='?';MP.hadAl=false;MP.menu=false;MP.note='';MP.pKey='';MP.rq.length=0;
  if(MP.role==='host'){MP.full=true;MP.wm=0}else{MP.synced=false;boss=null;MP.tSync=0}
  for(const r of MP.remotes){r.pshots.length=0;r.echoes.length=0}
  mpSendMe(performance.now(),true);
}
function mpRise(){if(P&&P.down){P.down=false;MP.down=false;P.hp=P.maxHp;P.inv=0;MP.note='';floats.push({x:P.x,y:P.y-52,txt:'You rise',life:1.6,c:'#7fd66b'});hud()}}
function mpCleared(){ // host: the boss is dead (called from hurtM)
  MP.phase='gate';MP.lv=S.level+1;MP.ready.clear();MP.meReady=false;MP.gateT=performance.now();MP.failT=0;MP.menu=false;
  nsend({t:'lv',k:'clear',n:S.level,g:MP.g});mpRise();
}
function mpOnLevel(msg,from){
  if(MP.role==='host'||from!==undefined&&from!==null&&''+from!==MP.hostId)return;
  const n=Math.max(8,Math.min(9998,msg.n|0));
  if(msg.k==='go'){
    MP.g=msg.g|0;MP.phase='run';MP.lv=n;MP.cnt=Math.max(1,Math.min(8,msg.cnt|0||MP.members.length));MP.over=msg.o&&typeof msg.o==='object'?msg.o:null;MP.ready.clear();
    if(MP.meReady||S.mode==='play'||S.mode==='clear'){MP.meReady=false;S.level=n;startLevel(n);if(msg.r)floats.push({x:W/2,y:H/2-70,txt:'The party fell. Again.',life:2.2,c:'#ff5b6e'})}
    // otherwise I am still choosing: mpReady takes me into the fight when I am through
  }else if(msg.k==='clear'){
    MP.phase='gate';MP.lv=n+1;MP.g=msg.g|0;MP.ready.clear();MP.gateT=performance.now();
    if(S.mode==='play'&&S.level===n){
      const b=boss;MP.menu=false;if(b)puff(b,col(b.s.col),50,320);MP.mons.clear();
      mons=[];shots=[];pshots=[];zones=[];fields=[];boss=null;S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);mpRise();emit('bossdead',{level:S.level,time:ST.levelTime,cls:S.cls});
    }
  }
}
// a member is through with its choices (every reward screen ends in begin(n), which comes here)
function mpReady(n){
  if(MP.phase==='run'){if(MP.role==='host')return;S.level=MP.lv;startLevel(MP.lv);nsend({t:'sync'},MP.hostId);return} // the others went ahead: join them
  if(MP.phase!=='pick')S.level=MP.lv;
  MP.meReady=true;MP.ready.add(MP.myId);if(!MP.gateT)MP.gateT=performance.now();
  nsend({t:'rdy',g:MP.g});save(S.level);hud();mpWait();mpGate();
}
function mpOnReady(msg,from){if((msg.g|0)!==MP.g||MP.phase==='run'||!MP.members.some(m=>m.id===''+from))return;MP.ready.add(''+from);MP.hudKey='';mpWait();mpGate()}
function mpGate(){if(MP.role!=='host'||MP.phase==='run'||!MP.meReady)return;for(const m of MP.members)if(!MP.ready.has(m.id))return;mpGo(MP.phase==='pick'?S.level:MP.lv)}
function mpWait(){
  if(!MP.on||!MP.meReady||MP.menu||MP.phase==='run')return;
  const wait=MP.members.filter(m=>!MP.ready.has(m.id)),n=wait.length,host=MP.role==='host',late=performance.now()-MP.gateT>6e4;MP.waitLate=late;
  show({soft:true,kick:'Co-op · '+(MP.phase==='pick'?'the party gathers':'level '+MP.lv+' is cleared'),title:n?'Waiting for '+n+(n>1?' players':' player'):'Starting',
    body:n?'Still choosing: '+wait.map(m=>m.name).join(', ')+'.':'Everyone is ready.',
    keys:host?(late&&n?'You can start now. Whoever is still choosing joins the fight when they are through.':n?'The level starts when everyone is ready. After a minute you can start without them.':''):'The level starts when everyone is ready.',
    btns:host&&late&&n?[['Start without them',()=>mpGo(MP.phase==='pick'?S.level:MP.lv)]]:null});
}
/* --- down, and the fight lost --- */
function mpDown(){
  P.hp=0;P.down=true;MP.down=true;P.inv=0;P.moving=false;P.dashT=0;P.atk=0;P.vx=P.vy=0;P.stormT=P.fireT=P.renewT=0;P.cutN=P.starN=P.quakeN=0;P.rushHit=null;P.rushD=0;
  ST.deaths++;SND.dead();for(const a of allies)puff(a,'#e7dfcd',6);allies=[];TSRC=[];fields=fields.filter(f=>f.rem);
  for(const k in keys)keys[k]=false;want.atk=want.dash=want.skill=false;want.pt=null;
  floats.push({x:P.x,y:P.y-52,txt:'You are down',life:2.5,c:'#ff5b6e'});MP.note='You are down. You rise when the level is cleared.';hud();
  mpSendMe(performance.now(),true);
}
function mpFail(now){ // host: when no one is left standing the level starts again for all
  if(S.mode!=='play'||MP.phase!=='run')return;
  let up=0,dn=0;if(!MP.away){if(P.down)dn++;else up++}for(const r of MP.remotes){if(r.away)continue;if(r.dead)dn++;else up++}
  if(up||!dn){MP.failT=0;return}
  if(!MP.failT){MP.failT=now+2200;floats.push({x:W/2,y:H/2-40,txt:'Everyone is down',life:2,c:'#ff5b6e'})}
  else if(now>=MP.failT)mpGo(S.level,true);
}
function mpLeft(id){
  id=''+id;const i=MP.members.findIndex(m=>m.id===id);if(i<0)return;const m=MP.members[i];
  if(id===MP.hostId)return mpEnd('The host left the game.');
  MP.members.splice(i,1);MP.count=MP.members.length;MP.ready.delete(id);MP.rById.delete(id);MP.byIdx[m.idx]=null;
  const j=MP.remotes.findIndex(r=>r.id===id);if(j>=0)MP.remotes.splice(j,1);
  for(const x of mons)if(x.tgt&&x.tgt._mi===m.idx)x.tgt=null;
  MP.toast=m.name+' left the game';MP.toastT=performance.now()+4000;MP.hudKey='';mpWait();mpGate();
}
/* --- the menu (there is no pause in a shared fight), the party list, the saved character --- */
function mpMenu(){
  if(MP.menu)return mpMenuClose();
  MP.under=lastScreen;MP.menu=true;for(const k in keys)keys[k]=false;joy.x=joy.y=0;mpMenuShow();
}
function mpMenuClose(){
  if(!MP.menu)return;MP.menu=false;lastScreen=MP.under;MP.under=null;
  if(MP.meReady&&MP.phase!=='run')return mpWait();
  if(S.mode==='play'||S.mode==='clear'||!lastScreen)$('ov').hidden=true;else show(lastScreen);
}
function mpMenuShow(){
  const inLv=S.mode==='play'||S.mode==='clear',host=MP.role==='host',btns=[[inLv?'Back to the fight':'Back',mpMenuClose]];
  if(S.cls&&act2()&&known()>NSK)btns.push(['Skills',()=>loadout(mpMenuShow)]);
  if(S.cls&&form()&&act2())btns.push([cap1(tw().pl),()=>petsScreen(mpMenuShow)]);
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',mpMenuShow)]);
  btns.push(['Leave the game',()=>show({mpMenu:true,kick:'Co-op',title:'Leave the game?',body:host?'You are the host. If you leave, the game ends for everyone.':'The others fight on without you. Your character is kept for your next co-op game.',btns:[['Stay',mpMenuShow],['Leave',mpLeave]]},true)]);
  show({mpMenu:true,soft:inLv,kick:'Co-op · '+MP.members.length+(MP.members.length>1?' players':' player')+' · level '+(S.level+1)+(S.rank?' · rank '+S.rank:''),title:inLv?'The fight goes on':'Co-op',
    body:(inLv?'There is no pause in a shared fight: the monsters do not wait. ':'')+(host?'You are the host.':'Hosted by '+((MP.members.find(m=>m.id===MP.hostId)||{}).name||'another player')+'.'),keys:matchMedia('(pointer:coarse)').matches?'':'Esc closes this.',btns},true);
}
function mpLeave(){const N=window.MBNet;try{if(N&&typeof N.leave==='function')N.leave()}catch(e){}mpEnd('left')}
function mpHidden(h){MP.away=!!h;if(MP.on&&P)mpSendMe(performance.now(),true)}
function mpSave(n){try{localStorage.setItem('marrowborn.mp.run',JSON.stringify(snapshot(n)))}catch(e){}}
function mpSaved(){try{const r=checkSave(JSON.parse(localStorage.getItem('marrowborn.mp.run')||'null'));return r&&r.cls&&r.level>=8?r:null}catch(e){return null}}
// the class choice of a co-op game: the character of your last co-op game can walk in again as it was
function mpPickCards(){
  const r=mpSaved();if(!r)return[];const c=CLASSES[r.cls],name=r.adv?c.adv.find(a=>a[0]===r.adv)[1]:c.name;
  return[{title:'Return as your '+name,sub:'Your last co-op character · reached level '+(r.level+1),col:'var(--gold)',body:'Everything it had: its boons, its equipment, its skills'+(r.pets.length?' and what it took from '+r.pets.length+(r.pets.length>1?' bosses':' boss'):'')+'. '+(MP.role==='host'?'The party starts on level '+(r.level+1)+'.':'The host decides which level the party starts on.'),
    fn:()=>{applyRun(r,r.level);S.level=r.level;S.mode='reward';eqSync();hud();begin(r.level)}}];
}
function mpHudMake(){
  if(MP.hud)return;const el=document.createElement('div');el.id='mpParty';el.setAttribute('aria-label','Party');
  if(!$('mpCss')){const st=document.createElement('style');st.id='mpCss';st.textContent=`
#mpParty{position:absolute;left:8px;top:8px;z-index:0;display:flex;flex-direction:column;align-items:flex-start;gap:3px;pointer-events:none;max-width:60%;font-family:var(--display,sans-serif)}
#mpParty .row{display:flex;align-items:center;gap:7px;padding:2px 9px 2px 7px;background:var(--plate,rgba(16,20,42,.92));border-left:3px solid var(--c,#fff);font-size:.78rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;line-height:1.25;color:var(--bone,#eee)}
#mpParty .nm{max-width:9em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mpParty .cl{color:var(--ash,#99a);font-size:.92em;white-space:nowrap}
#mpParty .bar{display:block;width:46px;height:5px;background:var(--stone-2,#272e4d);flex:none}
#mpParty .bar i{display:block;height:100%;width:100%;background:var(--blood,#f0355a)}
#mpParty .row.down .nm{color:var(--ash,#99a)}#mpParty .row.down .cl{color:var(--warn,#ff8497)}#mpParty .row.away{opacity:.6}
#mpParty .note{padding:3px 9px;background:var(--plate,rgba(16,20,42,.92));color:var(--warn,#ff8497);font-size:.78rem;font-weight:600;letter-spacing:.06em}
@media (orientation:landscape) and (pointer:coarse) and (max-height:600px){#mpParty{left:calc(6px + env(safe-area-inset-left,0px));top:60px;gap:2px}#mpParty .row{font-size:.66rem;padding:1px 7px 1px 5px}#mpParty .bar{width:34px}#mpParty .cl{display:none}}`;document.head.appendChild(st)}
  const stage=cv.parentNode;if(stage)stage.appendChild(el);MP.hud=el;MP.hudKey='';
}
function mpHud(now){
  const el=MP.hud;if(!el)return;if(now<MP.tHud)return;MP.tHud=now+200;
  if(MP.toast&&now>MP.toastT)MP.toast='';
  if(MP.meReady&&MP.phase!=='run'&&!MP.menu&&!MP.waitLate&&now-MP.gateT>6e4)mpWait(); // the minute is up: the host's screen gains its button
  const rows=[],gate=MP.phase!=='run',cn=(c,a)=>c&&CLASSES[c]?(a&&CLASSES[c].adv.find(x=>x[0]===a)||[0,CLASSES[c].name])[1]:'';
  const inLv=S.mode==='play'||S.mode==='clear';
  rows.push([MP.myIdx,(MP.members.find(m=>m.id===MP.myId)||{}).name||'You',cn(S.cls,S.adv),P&&P.maxHp?Math.max(0,Math.ceil(P.hp/P.maxHp*20)):0,P&&P.down?'down':!inLv&&!gate?'away':'',gate?(MP.ready.has(MP.myId)?'Ready':S.cls?'Choosing':'Picking a class'):P&&P.down?'Down':'']);
  for(const r of MP.remotes)rows.push([r.idx,r.name,cn(r.look.cls,r.look.adv),r.P.maxHp?Math.max(0,Math.ceil(r.P.hp/r.P.maxHp*20)):0,r.dead?'down':r.away&&!gate?'away':'',gate?(MP.ready.has(r.id)?'Ready':r.look.cls?'Choosing':'Picking a class'):r.dead?'Down':r.away?'Away':'']);
  const note=MP.toast||MP.note||'',key=JSON.stringify(rows)+note;if(key===MP.hudKey)return;MP.hudKey=key;
  el.textContent='';
  for(const[idx,name,cl,hp,cls2,state]of rows){const row=document.createElement('span'),n=document.createElement('span'),c=document.createElement('span'),b=document.createElement('span'),f=document.createElement('i');
    row.className='row'+(cls2?' '+cls2:'');row.style.setProperty('--c',MP.colors[idx%MP.colors.length]);n.className='nm';n.textContent=name;c.className='cl';c.textContent=state||cl;b.className='bar';f.style.width=hp*5+'%';b.appendChild(f);row.append(n,c,b);
    row.setAttribute('aria-label',name+(cl?', '+cl:'')+(state?', '+state:'')+', '+hp*5+'% health');el.appendChild(row)}
  if(note){const p=document.createElement('span');p.className='note';p.textContent=note;el.appendChild(p)}
}
/* --- every frame (and from a timer while the page is hidden, so a host that looks away does not freeze the world) --- */
function mpFrame(dt){
  const now=performance.now();MP.lastF=now;
  if(P){if(P.atk>MP.atk0+.01)MP.swung=true;MP.atk0=P.atk;if(P.dashT>MP.dash0+.01)MP.dashed=true;MP.dash0=P.dashT}
  for(const r of MP.remotes)mpRemoteStep(r,dt,now);
  if(MP.role==='client'){if(S.mode==='play'){const rt=now-MP.hclk.off-MPDELAY;for(const m of mons)sAt(m,rt)}if(now>=MP.tQ){MP.tQ=now+50;mpFlush()}}
  else{if(now>=MP.tW){MP.tW=Math.max(now+20,MP.tW+1000/MPHZ);mpSendWorld(now)}mpFail(now)}
  if(now>=MP.tMe){MP.tMe=Math.max(now+20,MP.tMe+1000/MPHZ);mpSendMe(now)}
  mpHud(now);
}
function mpBack(){if(!MP.on||!document.hidden&&performance.now()-MP.lastF<400)return;const now=performance.now(),n=Math.max(1,Math.min(40,Math.round((now-MP.lastF)/33)));for(let i=0;i<n;i++)tick(.033);last=now;mpFrame(.033*n)}
// remotes in the 2D fallback: allies and echoes under the heroes (pass 0), then the heroes with a name and a bar (pass 1)
let DR=null;
function mpDraw2d(pass){
  for(const r of MP.remotes){if(r.away)continue;
    if(!pass){
      for(const a of r.allies){if(a.pet){drawPet(a);const b=a.beam;if(b&&!a.hidden){ctx.lineCap='round';for(const q of b.rays){const ex=a.x+Math.cos(q.a)*q.len,ey=a.y+Math.sin(q.a)*q.len;ctx.strokeStyle=b.on?'#8fd3ff':'rgba(143,211,255,.7)';ctx.lineWidth=b.on?b.w*1.4:2;line(a.x,a.y,ex,ey)}}}else if(a.trophy)drawTrophy(a);else drawAlly(a)}
      if(r.echoes.length)drawEchoes(r.echoes);continue}
    const P0=P,c0=S.cls,a0=S.adv,l0=S.level;DR=r;P=r.P;S.cls=r.look.cls;S.adv=r.look.adv;S.level=Math.max(8,r.look.level);
    try{drawPlayer()}finally{P=P0;S.cls=c0;S.adv=a0;S.level=l0;DR=null;ctx.globalAlpha=1}
    const q=r.P,c=MP.colors[r.idx%MP.colors.length];ctx.textAlign='center';ctx.font='700 13px Rajdhani,"Barlow Condensed","Arial Narrow",sans-serif';ctx.fillStyle='#0d0c11';ctx.fillText(r.name,q.x+1,q.y-49);ctx.fillStyle=c;ctx.fillText(r.name,q.x,q.y-50);
    if(!r.dead){ctx.fillStyle='rgba(13,12,17,.8)';ctx.fillRect(q.x-17,q.y-46,34,5);ctx.fillStyle=c;ctx.fillRect(q.x-16,q.y-45,32*Math.max(0,Math.min(1,q.hp/(q.maxHp||1))),3)}
  }
}
const mpShots=[];function mpAllPshots(){mpShots.length=0;for(const p of pshots)mpShots.push(p);for(const r of MP.remotes)if(!r.away)for(const p of r.pshots)mpShots.push(p);return mpShots}
/* --- begin and end --- */
let mpWired=false;
function mpWire(){
  const N=window.MBNet;if(mpWired||!N||typeof N.on!=='function')return;mpWired=true;
  const H={w:mpOnWorld,me:mpOnMe,lk:mpOnLook,hit:mpOnHit,lv:mpOnLevel,rdy:mpOnReady,sync:()=>{if(MP.role==='host')MP.full=true},
    'net:leave':m=>mpLeft(m&&m.id),'net:host':m=>{if(MP.role!=='host'&&(!m||''+m.id!==MP.hostId||m.left))mpEnd('The host left the game.')},'net:end':m=>mpEnd(m&&typeof m.reason==='string'&&m.reason?m.reason:'ended')};
  for(const k in H)try{N.on(k,(m,from)=>{if(!MP.on)return;try{H[k](m||{},from)}catch(e){console.error('Marrowborn multiplayer: "'+k+'" failed',e)}})}catch(e){}
}
function mpBegin(cfg){
  cfg=cfg&&typeof cfg==='object'?cfg:{};if(MP.on)mpEnd();mpWire();
  const N=window.MBNet||{},my=''+(cfg.myId!==undefined&&cfg.myId!==null?cfg.myId:N.id!==undefined?N.id:'me'),mem=[];
  for(const m of Array.isArray(cfg.members)?cfg.members.slice(0,8):[])if(m&&m.id!==undefined&&!mem.some(x=>x.id===''+m.id))mem.push({id:''+m.id,name:mpName(m.name),idx:mem.length});
  if(!mem.some(m=>m.id===my))mem.push({id:my,name:'You',idx:mem.length});
  const host=''+(cfg.hostId!==undefined&&cfg.hostId!==null?cfg.hostId:N.hostId!==undefined?N.hostId:mem[0].id);
  Object.assign(MP,{on:true,role:host===my?'host':'client',mode:'coop',myId:my,hostId:host,members:mem,count:mem.length,slots:mem.length,cnt:mem.length,myIdx:mem.find(m=>m.id===my).idx,seed:cfg.seed,down:false,away:!!document.hidden,
    phase:'pick',g:0,lv:8,meReady:false,gateT:0,waitLate:false,failT:0,full:false,wm:0,synced:false,over:null,menu:false,under:null,note:'',toast:'',toastT:0,hudKey:'',pKey:'',lookKey:'',hadAl:false,swung:false,dashed:false,atk0:0,dash0:0,
    tMe:0,tW:0,tQ:0,tSi:0,tOb:0,tHud:0,tSync:0,tLook:0,tSent:0,tick:0,seen:0,hStamp:-1,lastF:performance.now(),moKey:'?',wvKey:'?',q:[],sd:[],rq:[]});
  MP.remotes.length=0;MP.rById.clear();MP.byIdx.length=0;MP.ready.clear();MP.mons.clear();MP.qd.clear();MP.ate.clear();MP.hclk.off=1e18;MP.heroes.length=0;
  for(const m of mem)if(m.id!==my){const r=mkRemote(m);MP.remotes.push(r);MP.rById.set(m.id,r);MP.byIdx[m.idx]=r}
  // a co-op run begins at the class choice, whole, and never touches the single-player save
  beginTok++;S.paused=false;const pb=$('pauseB');if(pb){pb.setAttribute('aria-pressed','false');pb.textContent='Menu'}S.stop=0;S.wave=null;
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];morsels=[];echoes=[];TSRC=[];obstacles=[];boss=null;
  newRun();stReset();chooseClass();freshBody();hud();$('bossName').textContent='—';
  if(cfg.mode&&cfg.mode!=='coop'){MP.toast='This version plays co-op only';MP.toastT=performance.now()+6000} // versus is the next phase: MP.mode, remote.team and the per-member attribution of hits (REM) are where it will hook in
  mpHudMake();if(!MP.timer)MP.timer=setInterval(mpBack,250);
  mpSendMe(performance.now(),true);emit('mp',{on:true});return true;
}
function mpEnd(reason){
  if(!MP.on)return false;MP.on=false;MP.menu=false;MP.down=false;MP.away=false;MP.meReady=false;MP.phase='pick';REM=null;DR=null;
  if(MP.timer){clearInterval(MP.timer);MP.timer=0}if(MP.hud){MP.hud.remove();MP.hud=null}
  MP.remotes.length=0;MP.rById.clear();MP.byIdx.length=0;MP.members=[];MP.count=1;MP.cnt=1;MP.ready.clear();MP.mons.clear();MP.q=[];MP.qd.clear();MP.heroes.length=0;
  const pb=$('pauseB');if(pb)pb.textContent='Pause';S.stop=0;
  // back to the single-player run as it is stored (multiplayer never wrote to it)
  let saved=storedLevel(),r={};try{r=JSON.parse(localStorage.getItem('marrowborn.run')||'{}')||{}}catch(e){}
  applyRun(r,saved);title(saved);emit('mp',{on:false});
  // net.js gives a short code for why it ended; anything else is shown as it is
  const why={'host-left':'The host left the game.',disconnected:'The connection to the game was lost.',kicked:'You were removed from the game.',ended:'The host ended the game.'};
  if(typeof reason==='string'&&reason&&reason!=='left')show({kick:'Co-op',title:'The game is over',body:why[reason]||mpTxt(reason,200),btns:[['Back to the title',titleShow]]},true);
  return true;
}
MP.begin=mpBegin;MP.end=mpEnd;

/* ---------- boot ---------- */
// Shared interface for the 3D renderer and model files. Arrays are reassigned by the game, so read them through these getters every frame.
window.MB={mp:MP,settings:SET,setSetting,on,api:API,stats:ST,get obstacles(){return obstacles},W,H,WALL,FOG,TAU,S,SPEC,CLASSES,PARTS,LEVELS,has,cls,pw,act2,melee,levelDef,col,cv,ctx,draw2d:draw,renderer:null,rank,pause,skills:SK,mana:MANA,RAR,pets:PETS,get equip(){return S.eq||{weapon:null,armor:null,trinket:null}},get fields(){return fields},
  get P(){return P},get mons(){return mons},get shots(){return shots},get pshots(){return pshots},get allies(){return allies},get zones(){return zones},
  get echoes(){return echoes},get bits(){return bits},get rings(){return rings},get floats(){return floats},get morsels(){return morsels},get boss(){return boss}};
let last=0;
let fast=1;
function tick(dt){if(S.paused){S.t+=dt;return}if(S.mode==='play'){ST.time+=dt;ST.levelTime+=dt}if(S.stop>0&&!MP.on)S.stop-=dt;else step(dt)} // (the short freeze on a heavy blow is left out in multiplayer, where the world must not stop)
function frame(ts){const real=(ts-last)/1000||0,dt=Math.min(.033,real);last=ts;
  // alone, a slow device plays in slow motion (one step of at most 33 ms per frame). A shared world has to keep real time: up to six short steps per frame
  if(MP.on){const e=Math.max(0,Math.min(.2,real)),n=Math.max(1,Math.ceil(e/.0334));for(let i=0;i<n*fast;i++)tick(e/n);mpFrame(e)}
  else for(let i=0;i<fast;i++)tick(dt);
  skillUi();manaUi();petUi();
  const R=MB.renderer;
  if(R&&R.ok){try{R.draw(MP.on?Math.max(0,Math.min(.2,real)):dt)}catch(e){console.error('3D renderer failed, falling back to 2D',e);R.ok=false;if(R.dispose)try{R.dispose()}catch(_){}}}
  else draw();
  bossBar();requestAnimationFrame(frame)}
function start(data){
  let saved=storedLevel();
  setLoad();
  let r={};try{r=JSON.parse(localStorage.getItem('marrowborn.run')||'{}')||{}}catch(e){}
  applyRun(r,saved);SAVE=snapshot(S.cls?saved:Math.min(saved,8)); // without a class the furthest a run can stand is the class choice
  if(data&&data.level>0)saved=Math.floor(data.level);
  title(saved);requestAnimationFrame(frame);
}
if(location.hash.startsWith('#dev'))window.__mb={S,keys,want,step:tick,get fast(){return fast},set fast(v){fast=Math.max(1,v|0)},start:(n,r)=>{r=r||{};stReset();petsClear();S.cls=r.cls||null;S.adv=r.adv||null;S.b=Object.assign(noBoons(),r.b);S.scrap=0;S.eq=S.cls?basicSet(S.cls):null;S.load=fixLoad(r.load)||load0();
    // gear:true plays out the drops of every level cleared so far with a sensible policy: wear anything rarer, otherwise melt it in
    if(S.cls&&r.gear)for(let k=8;k<n;k++){const d=dropItem(k),cur=S.eq[d.slot];if(d.r>cur.r&&cur.up<(d.r-cur.r)*.9)S.eq[d.slot]=d;else{cur.lvl++;cur.up+=RAR[d.r][3]}}
    if(r.hold)return; // hold: only set the character (multiplayer tests)
    startLevel(n)},mpGo:(n,retry)=>mpGo(n,retry),down:()=>{if(MP.on&&P&&!P.down&&S.mode==='play'){P.hp=0;mpDown();return true}return false},kill:()=>{if(!boss&&S.wave&&S.mode==='play'){mons=[];enterBoss()}return boss&&mons.includes(boss)&&(boss.ward=0,hurtM(boss,1e9))},skill:si=>skill(si),reward,loadout,dropScreen,
  // pet(kind, o): put a pet of that monster kind (a SPEC id, 'tyrant' for a crowned one) on the roster, make it active and field it. o: {plv, perk, owner, name}; owner forces how it is drawn when the class cannot have pets
  // pet(kind, o): o: {plv, lv (the level it was bound on, 0-based; the level you are on when left out), mods:[...] or perk, owner, name}
  pet:(kind,o)=>{const e=window.__mb.petNew(kind,o);if(!e)return null;o=o||{};
    const cap=petCap()||3;PETS.roster.push(e);PETS.active.push(PETS.roster.length-1);while(PETS.active.length>cap||form()&&PETS.active.length>1&&!petOn().includes(e))PETS.active.shift();if(S.mode!=='play'||!P)return e; // the oldest step back until the pool can hold the new one
    if(form()&&!(o.owner&&!petOwner())){const made=fieldPets(true);save(S.level);hud();return allies.find(a=>a.e===e)||TSRC.find(a=>a.e===e)||made[0]||e} // the class's own form: a pet, a familiar or guardian entity, or the stand-in of a technique, ward, venom or arrowhead
    const a=makePet(e,1,o.owner==='beast'?'beast':'necro',PETS.active.length-1,PETS.active.length);allies.push(a);PETS.fielded.push(e);return a},PETS,
  // petNew: only make the roster entry. petTry: put it on the roster and the active list if what is held stays within `budget` mana (then call field()). petInfo(e): power, cost, health, blows. hurtPet(a, blow): hurt a pet as a monster would.
  petNew:(kind,o)=>{o=o||{};const ty=kind==='tyrant';if(ty)kind='hollow';const b=SPEC[kind];if(!b)return null;const mods=(Array.isArray(o.mods)?o.mods:o.perk?[o.perk]:[]).filter((x,i,l)=>MODS.includes(x)&&l.indexOf(x)===i);
    return{kind,ai:b.ai||kind,name:o.name||(ty?'Tyrant of Ash Road':PRE[PETS.roster.length*3%10]+' '+b.name.replace('The ','')),col:ty?'#8c2f39':TINT[(PETS.roster.length*3+kind.length)%10],r:b.r+(ty?6:2),plv:o.plv|0,lv:Number.isInteger(o.lv)?Math.max(8,o.lv):Math.max(8,S.level),mods,perk:mods[0]||null,crown:ty||b.crown?1:0}},
  petAt:(lv,plv)=>{const e=petEntry(lv,levelDef(lv));e.plv=Math.min(PLVMAX,plv|0);return e},
  petTry:(kind,o,budget)=>{const e=typeof kind==='object'?kind:window.__mb.petNew(kind,o);if(!e||petHeld()+petCost(e)>budget)return null;PETS.roster.push(e);PETS.active.push(PETS.roster.length-1);return e},
  field:()=>{const m=fieldPets(true);hud();return m.length},petInfo:e=>petInfo(e),hurtPet:(a,d)=>hurtPet(a,d),blow:h=>blow(h),petScale:n=>petScale(n===undefined?S.level:n),GREF,PHP,blowAt,
  // mana(v): set the free mana (v undefined: just read MB.mana). well(n): set the Wellspring count and rebuild the pool at once.
  mana:v=>{if(P&&v!==undefined){P.mana=Math.max(0,Math.min(manaRoom(),+v||0));syncSkills()}return MANA},
  // fire(): make the active trophy go off now (when there is something to hit). Returns how many echoes are live afterwards.
  fire:()=>{if(S.mode!=='play'||!P)return 0;for(const a of allies)if(a.trophy&&a.ent)a.t=0;if(TSRC.length){P.trQ=1;P.trCd=0}const b=S.banner;S.banner=0;trophyTick(0);for(const a of[...allies])if(a.trophy&&a.ent)trophyStep(a,0);S.banner=b;return echoes.length},get TSRC(){return TSRC}};
window.claude?.hot?.snapshot?.(()=>({level:S.mode==='title'?0:S.level}));
window.claude?.hot?.ready?window.claude.hot.ready(start):start(window.claude?.hot?.data??{});
})();
