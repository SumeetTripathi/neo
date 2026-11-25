(() => {
const W=960,H=600,DPR=2,WALL=28,FOG=175,TAU=Math.PI*2;
const $=id=>document.getElementById(id);
const cv=$('cv'),ctx=cv.getContext('2d');cv.width=W*DPR;cv.height=H*DPR;
const fogC=document.createElement('canvas');fogC.width=W;fogC.height=H;const fctx=fogC.getContext('2d');
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
let RND=Math.random;const rand=()=>RND(); // (round 16) the dice: the world's own, or a seeded sequence while a bell's floor is fought
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
// LNG: the sturdy classes hit harder the longer a fight lasts (round 11): P.zeal counts the seconds of the fight, a blocked hit (tank) or a wound closed (healer) adds `ev` seconds to it, and they hit k x zeal harder, `cap` at most. Not in versus.
// base: what the class hits harder from the first second; paladin, saint...: the same for an upgrade (the two slowest builds of the game hit harder outright).
const LNG={tank:{k:.006,cap:.6,ev:4,base:1},healer:{k:.006,cap:.6,ev:1.5,base:1},paladin:1.65,saint:1.25,berserker:1,inquisitor:.9};
const lngText=(c,how)=>' The longer a fight lasts the harder you hit: '+Math.round(LNG[c].cap*100)+'% harder after '+Math.round(LNG[c].cap/LNG[c].k)+' seconds, and every '+how+' brings that '+LNG[c].ev+' seconds nearer.';
const CLASSES={
 fighter:{name:'Fighter',gear:'Greatsword, headband',hp:5,text:'A fast, heavy blade, no defence but your feet, and wounds that close a little faster than most. 15 health. Bosses you kill teach you a technique.',pows:[
  ['Cleave','Your swing becomes a full circle with a longer reach.'],
  ['Whirlwind','A new skill. Spin and hit everything around you hard.'],
  ['Bloodrush','Hit 25% harder and swing 15% faster.']]},
 assassin:{name:'Assassin',gear:'Twin daggers, mask',hp:0,text:'The fastest strikes and the shortest dash cooldown. Your first strike after a dash hits triple. 10 health. Bosses you kill can be distilled into venom.',pows:[
  ['Twin Fangs','Every strike lands twice. The second cut does 60% of the first.'],
  ['Shadowstep','A new skill. Appear behind the nearest monster and stab it for heavy damage.'],
  ['Vanish','Your dash recharges almost twice as fast.']]},
 healer:{name:'Healer',gear:'Sun staff, white robe',hp:2,text:'Orbs of light at range, and your wounds close every 4 seconds instead of every 7. 12 health.'+lngText('healer','wound you close')+' A boss you kill can be called back as a guardian.',pows:[
  ['Sanctuary','Your wounds close every 2.5 seconds.'],
  ['Mend','A new skill. Heal 5 health at once and throw back everything near you.'],
  ['Smite','Your orbs hit 60% harder.']]},
 tank:{name:'Tank',gear:'Sword, shield, plate',hp:6,text:'16 health and a heavy sword that hits twice as hard. Your shield blocks one hit every 6 seconds, and a blocked hit gives back some mana. Slowest on foot.'+lngText('tank','blocked hit')+' Bosses you kill leave you a ward.',pows:[
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
 healer:{boon:['Grace','You mend 12% faster.',5],adv:[['saint','Saint','Second life','Once per level, a killing blow leaves you standing at half health. Your mana comes back a quarter faster, and you hit '+Math.round((LNG.saint-1)*100)+'% harder.'],['inquisitor','Inquisitor','Judgement','Orbs pass through everything and hit 60% harder.']]},
 tank:{boon:['Rampart','Your shield recharges 15% faster.',5],adv:[['paladin','Paladin','Holy shield','Every blocked hit heals a tenth of your health and gives back twice the mana, and your shield recharges much faster. You hit '+Math.round((LNG.paladin-1)*100)+'% harder.'],['berserker','Berserker','No shield','You throw the shield away. Swing 60% faster and hit 50% harder.']]},
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
/* ---------- round 14: alterations. Every class skill has three; one may be active per skill (S.md[skill] = 1..3, 0: as taught); they open ALTLV floors after the skill is learned ---------- */
// Each is a trade, not an upgrade. k: what it changes while the skill is cast (AK): d damage, h healing, r reach, dur how long buffs, fields, summons and debuffs last, more: more bolts in a fan or a ring
// (together they weigh the same), many: half again as many raised, tag: a debuff on everything the skill hits (which leaves the setup tag that goes with it). cd, cost: the skill's recharge and mana.
// A skill never gets the tag its own blow pays off.
const ALTLV=[3,8,14];
const ALT={
 w:{id:'wide',name:'Sweeping',text:'Reaches 30% wider and hits 10% lighter.',k:{r:1.3,d:.9}},
 s:{id:'scatter',name:'Scattering',text:'Throws more of them in a wider spread. Together they weigh the same.',k:{more:1}},
 h:{id:'heavy',name:'Weighted',text:'Does 30% more. Recharges 25% slower.',cd:1.25,k:{d:1.3,h:1.3}},
 q:{id:'quick',name:'Hurried',text:'Recharges 25% faster and hits 15% lighter.',cd:.75,k:{d:.85}},
 r:{id:'ready',name:'Hurried',text:'Recharges 20% faster. Costs 25% more mana.',cd:.8,cost:1.25,k:{}},
 f:{id:'frugal',name:'Frugal',text:'Costs 40% less mana. Recharges 10% slower.',cd:1.1,cost:.6,k:{}},
 l:{id:'long',name:'Lingering',text:'Lasts 40% longer. Costs 20% more mana.',cost:1.2,k:{dur:1.4}},
 m:{id:'many',name:'Crowded',text:'Raises half again as many. Costs 25% more mana.',cost:1.25,k:{many:1}},
 u:{id:'up',name:'Upending',sets:'aloft',text:'Staggers what it hits for a moment and leaves it aloft, open to a ground blow. Costs 20% more mana.',cost:1.2,k:{tag:{stun:.35}}},
 c:{id:'chill',name:'Chilling',sets:'brittle',text:'Slows what it hits and leaves it brittle, open to a single heavy blow. Costs 20% more mana.',cost:1.2,k:{tag:{slow:2.5}}},
 e:{id:'sear',name:'Searing',sets:'branded',text:'Sets what it hits alight and leaves it branded, open to a volley. Costs 20% more mana.',cost:1.2,k:{tag:{dot:.2,weak:1}}},
};
const SKALT={
 fighter:['whc','hqe','lrf','hle','hrf','lhf','whc','lrf','hqu','wlr'],
 tank:['whc','hqf','lrf','hqe','hrf','hqc','lrf','whe','wlh','whc'],
 assassin:['hqe','shc','lrf','hqu','lrf','hqf','lrf','wlh','hle','shc'],
 mage:['shc','hqu','wlh','whe','lrf','hqf','lrf','shc','wlr','hqu'],
 ranger:['shc','hqc','hle','wlh','hqu','lhf','mlf','lrf','whl','lrf'],
 healer:['hqe','whr','wlr','wlh','lrf','wrf','lrf','shc','whe','hrf'],
 necro:['mrf','hqe','hle','hqf','whq','lmf','shc','lrf','wlh','hrf'],
};
const AK0={d:1,h:1,r:1,dur:1,more:0,many:0,tag:null};for(const k in ALT)ALT[k].k=Object.assign({},AK0,ALT[k].k);
let AK=AK0;
const noAlts=()=>[0,0,0,0,0,0,0,0,0,0];
const altIn=v=>Array.isArray(v)&&v.length===10&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=3)?v.slice():noAlts();
const altAt=(si,j)=>SKLV[si]+ALTLV[j];                                   // the floor on which alteration j (0-2) of skill si opens
const altOpen=(si,j,lv=S.level)=>lv+1>=altAt(si,j);
const altOf=si=>{if(VS||!(si>=0&&si<10)||!S.md||!S.cls||S.level<8)return null;const j=S.md[si];return j>0&&altOpen(si,j-1)?ALT[SKALT[S.cls][si][j-1]]:null};
const ALTROW=new Map();
/* ---------- the apex tier: above the class and its upgrade, chosen once after floor 100 (S.apex: one of the ten ids of APEX) ---------- */
// Ten paths on two sides. Side 'dominion' (you command others): pets and familiars hold DOMHOLD of the mana they held, thralls and wolves hit DOMSUM times as hard, pets, familiars and trophies DOMPET times.
// Side 'order' (you are the weapon): mana back ORDMANA times as fast, skills at ORDCOST of their cost, every pet or familiar kept but not sent out lends ORDRESK damage (up to ORDRESN of them),
//   and each path of that side has its own share of damage and health (AX.st).
// dominion (the Tithe): what you kill rises for you (the Owed, see shadeRise).
// order (the White Marrow): ORDD times the damage, ORDLIFE times the health, a ring of light ORDR wide that burns for ORDAURA of your damage twice a second.
// The eight paths of round 10 (beasts, frost, plague, flame; storm, stone, blade, tide) are in the section "the further apex paths"; their numbers are AX.
// From floor 110 on a guardian has APEXHP times the health and its blows are APEXDMG (not BOSSDMG) times an ordinary blow: the step that makes the apex tier needed.
// Every other monster from floor 101 on has APEXORD times the health, so an apex hero's ordinary fights still last.
const SHLIFE=10,SHK=.32,DOMHOLD=.75,DOMSUM=1.5,DOMPET=1.15,ORDD=1.6,ORDLIFE=1.25,ORDMANA=1.5,ORDCOST=.8,ORDR=120,ORDAURA=.7,ORDRESK=.02,ORDRESN=10,APEXHP=2.3,APEXDMG=1.5,APEXORD=1.5;
// AX: every number of the eight further paths. Damage of the dominion side is in U (see UD: one hundredth of the health of the reference monster of the floor, so it keeps pace with the tower as the Owed do);
// damage of the order side is in multiples of your own damage (dmgMul), or a share of the damage your own blows have just done.
const AX={
 st:{order:[ORDD,ORDLIFE],storm:[1.42,1.1],stone:[1.38,1.4],blade:[1.32,1.15],tide:[1.42,1.3]}, // order side: [damage, health]
 col:{packbeast:'#5fe07a',icewight:'#8fd8ff',cinder:'#ff6a1e',beasts:'#5fe07a',frost:'#8fd8ff',plague:'#9fc414',flame:'#ff6a1e',storm:'#ffe74a',stone:'#c9a26b',blade:'#8fa0ff',tide:'#19d3c5'},
 // beasts: cap0 beasts, one more every capK floors (capMax at most); each lasts `life` s and another answers every t s. A bite is `bite` U, syn more for every other beast alive, every cd s.
 beast:{cap0:3,capK:30,capMax:5,life:24,t:4,bite:.21,syn:.1,cd:.75,spd:265,howl:6,runK:4,huntN:4,huntT:10},
 // frost: a blow of yours chills (hit, once per icd s per monster; a floor's own monster takes bossK of any chill); at full chill it is frozen (frz s; frzB a floor's own), takes `more` times the damage, and when it thaws or dies
 // it shatters for shat U (shatK of that to everything within shatR, which is chilled by shatCh); then nothing chills it for thaw s (thawB). wights: how many ice-wights, each for wlife s, another every wt s; a slam is wd U within wr, chilling by wch, every wcd s.
 frost:{hit:.2,icd:.3,bossK:.5,hold:2.5,frz:2.5,frzB:1.2,more:1.25,shat:11,shatK:.6,shatR:95,shatCh:.4,thaw:3.5,thawB:6,slowK:.45,wights:2,wlife:30,wt:8,wd:4.2,wr:95,wch:.35,wcd:2.6,wspd:125,wreach:300,
  vsChill:.02,vsFrz:.3,rimeR:130,rimeT:6,rimeD:.8,rimeCh:.22,skF:14,skA:6,skC:6,ultR:330,ultT:4},
 // plague: a blow of yours adds a stack of rot (once per icd s per monster, 5 at most). Rot must be FED: only your own blows and your skills (Blight, Fester, the Long Sickness) hold it, for t s from the last of them; after that a layer falls away every `fade` s.
 // What spreads by itself (the miasma, rot creeping from a neighbour, a rotting death and its cloud: status 'rotp') adds layers but does not hold them (a first layer lasts tp s), and cannot lift a floor's own monster above bossCap layers. Every half second rot does d U x stacks x (1 + ramp per stack past the first); a rotting monster takes `more` more damage per stack and is slowK slower per stack.
 // Every sp s a monster with two stacks or more gives one to the nearest within spR that has fewer. One that dies rotting passes its stacks to all within leap and leaves a cloud (cloudR, cloudT s). auraR: the miasma round you (a stack every auraT s).
 plague:{icd:1,t:6,tp:2.5,fade:1.2,bossCap:2,d:.11,ramp:.25,more:.03,slowK:.04,sp:1.5,spR:150,leap:170,cloudR:70,cloudT:4,auraR:105,auraT:1.5,blightR:120,blightT:7,blightD:.3,fester:2.5,ultT:10},
 // flame: a cinder kindles every t s (cap0 at a time, one more every capK floors, capMax at most; each lasts `life` s) and dives at the nearest monster within reach: bd U within br, which burn (burn U every half second for burnT s),
 // and the ground burns (patch U twice a second within patchR for patchT s). A blow of yours sets its target burning for hitT s. A monster that dies burning leaves burning ground.
 flame:{cap0:3,capK:25,capMax:5,life:14,t:2.6,reach:380,spd:520,bd:2.6,br:75,burn:.3,burnT:4,hitT:3,patch:.22,patchR:58,patchT:3,pyreR:120,pyreT:6,pyreD:.6,coals:6,ultR:150,ultT:6,ultD:.8,ultB:4},
 // storm: every blow of yours builds haste (gain, fading by decay a second): at full haste you move mv and strike as faster. Every icd s (icdS in a surge) the damage your blows have done since the last one, times k, leaps as lightning
 // to the monster you struck and on to `jumps` more within reach (each leap `fall` of the last); what it strikes is shocked (shock s; not again for imm s, immB a floor's own).
 storm:{gain:.07,decay:.14,mv:.22,as:.22,icd:.7,icdS:.3,k:.27,sparkT:2,sparkD:2,sparkR:320,jumps:3,reach:190,fall:.8,shock:.35,imm:1.2,immB:2.5,boltD:9,boltN:5,boltFall:.6,surge:5,tempT:4,tempK:.25,tempD:4.5},
 // stone: `plates` guard plates (`start` of them at the start of a floor). A plate breaks a HEAVY blow (a charge, a lunge, a ground blast: anything above a bolt): only `leak` of it reaches you, and the plate answers with a shockwave
 // (cd x your damage within cr, stunning lesser things cstun s). A light blow (a brush, a bolt, a beam, a trap) is not stopped: it lands (`chip` lighter for every plate standing; 0 as shipped), and no plate breaks. One plate grows back every regrow s, and every crushing blow of yours takes `grow` s off that wait.
 // Every `every`-th blow of yours is a crushing one:
 // crush of the damage your blows have done since the last, to everything within crushR of the target.
 stone:{plates:3,start:3,regrow:11,chip:0,leak:.4,grow:1,cd:5,cr:120,cstun:.6,every:4,crush:.3,crushR:70,quakeT:3,quakeD:3,quakeR:65,quakeReach:320,fisLen:400,fisW:30,fisT:3.2,fisK:.4,fisD:2.4,standT:5,monoR:115,monoD:20,monoLen:190},
 // blade: n0 blades of light (one more every nK floors, six at most). Every blow of yours is followed by a cut worth `per` of it for each blade; every `combo`-th cut on the same monster is a great cut worth comboK of all your blows on it since the last;
 // a lesser monster below `exec` of its health dies to any blow of yours.
 blade:{n0:4,nK:25,per:.025,autoT:2,autoD:.35,autoR:280,combo:8,comboK:.22,comboT:3,exec:.2,fanD:4,walkD:2.6,ultN:24,ultK:.16,ultD:1.5,ultEnd:14},
 // tide: every regenT s you mend `regen` of your health. Every t s a wave rolls from you at the nearest monster within reach: wd x your damage, it carries lesser things along (a floor's own a little) and leaves what it touches drenched for soak s
 // (drenched: soakSlow slower, and it takes soakMore more damage).
 tide:{regen:.02,regenT:2,t:5,reach:420,wr:70,wd:5.5,wlen:400,wspd:270,soak:5,soakSlow:.25,soakMore:.2,gr:105,gd:8,glen:560,pullR:340,ud:3.5,uheal:.04,uhealMax:.2,floodT:6,floodK:.25,fd:5},
};
const APEXIDS=['dominion','beasts','frost','plague','flame','order','storm','stone','blade','tide'];
const APEX={
 dominion:{side:'dominion',name:'The Tithe',title:'Tithe-Taker',sub:'Command what you kill',blurb:'What you kill owes you: the slain rise as the Owed and fight at your side.',
  lore:'The Spire has always kept a share of whatever dies inside it. Past the hundredth floor you stop paying that tithe and start collecting it. What you kill owes you, and the Owed stand up to work it off.',
  text:'Monsters that die, other than a floor\'s own, rise as the Owed and fight for you for '+SHLIFE+' seconds as the monsters they were: up to 4 at once, one more every ten floors, 10 at most. They cost nothing and cannot be hurt. Pets and familiars hold '+Math.round((1-DOMHOLD)*100)+'% less mana for their power. Thralls and wolves hit '+Math.round((DOMSUM-1)*100)+'% harder, pets, familiars and trophies '+Math.round((DOMPET-1)*100)+'%. Three skills of command join your ten.'},
 beasts:{side:'dominion',name:'The Feral Vow',title:'Vowkeeper',sub:'Run with a pack',blurb:'A pack of pale beasts hunts beside you, and every beast bites harder for each other one alive.',
  lore:'Before the Spire kept people it kept animals, and their bones lie under everyone else\'s. Past the hundredth floor you swear to them: hunt for me and I will carry you up. They keep their side of it.',
  text:'A pack of '+AX.beast.cap0+' beasts runs with you, one more every '+AX.beast.capK+' floors, '+AX.beast.capMax+' at most. They cost nothing and cannot be hurt; each fades after '+AX.beast.life+' seconds and another answers within '+AX.beast.t+'. Every beast bites '+Math.round(AX.beast.syn*100)+'% harder for each other beast alive, and the pack goes for whatever you struck last.'},
 frost:{side:'dominion',name:'The Still Winter',title:'Winterbound',sub:'Stop everything',blurb:'Your blows chill, the chilled freeze solid, and the frozen shatter; ice-wights stand guard over you.',
  lore:'High in the Spire the cold is not weather. It is what is left when the last warm thing has gone. You let it into the marrow, and now it does what you tell it.',
  text:'Your blows chill what they hit, and a chilled monster slows. At full chill it freezes solid ('+AX.frost.frz+' seconds, '+AX.frost.frzB+' for a floor\'s own monster), takes '+Math.round((AX.frost.more-1)*100)+'% more damage, and shatters when it thaws or dies: a heavy blow to it and to everything near it, which is chilled in turn. '+AX.frost.wights+' ice-wights stand with you, slow and heavy; they slam the ground and chill what they hit.'},
 plague:{side:'dominion',name:'The Slow Rot',title:'Rotwright',sub:'Let it spread',blurb:'A rot that grows, weakens what carries it and passes from monster to monster, most of all when one dies.',
  lore:'Nothing in the Spire is ever thrown away, so everything in it rots, slowly. Past the hundredth floor you learn to hurry that along, and to point it.',
  text:'Your blows, and the miasma that hangs round you, lay rot on monsters, up to 5 layers. Rot eats at a monster twice a second, far faster with every layer; a rotting monster takes '+Math.round(AX.plague.more*100)+'% more damage per layer and slows. Rot must be fed: it holds for '+AX.plague.t+' seconds after your last blow or skill on that monster, then falls away a layer at a time. Rot creeps to the nearest monster with less of it, and a monster that dies rotting passes its layers to everything near and leaves a cloud that rots what walks into it; rot that spreads by itself does not hold, and cannot lift a floor\'s own monster above '+AX.plague.bossCap+' layers.'},
 flame:{side:'dominion',name:'The Last Pyre',title:'Pyrekeeper',sub:'Burn what is left',blurb:'Living cinders kindle beside you and hurl themselves at monsters, and the ground they strike keeps burning.',
  lore:'You were ash before you were anything. Past the hundredth floor you find the ash is still warm, and warm ash will carry a flame anywhere you send it.',
  text:'A cinder kindles beside you every '+AX.flame.t+' seconds, up to '+AX.flame.cap0+' waiting at once (one more every '+AX.flame.capK+' floors). Each throws itself at the nearest monster and bursts: everything near is hurt and set burning for '+AX.flame.burnT+' seconds, and the ground burns for '+AX.flame.patchT+'. Your own blows set their target burning, and a monster that dies burning leaves burning ground.'},
 order:{side:'order',name:'The White Marrow',title:'Whitemarrow',sub:'Be the weapon',blurb:'The power is your own: you hit far harder, and a ring of light burns everything near you.',
  lore:'You began as ash and bare bone and took a body back piece by piece. Past the hundredth floor there is nothing left to take, so you burn what you have. The marrow goes white, and the light gets out through the skin.',
  text:'You hit '+Math.round((ORDD-1)*100)+'% harder and have '+Math.round((ORDLIFE-1)*100)+'% more health. Mana comes back '+Math.round((ORDMANA-1)*100)+'% faster and skills cost '+Math.round((1-ORDCOST)*100)+'% less. A ring of light, '+ORDR+' wide, burns everything near you twice a second and slows all but a floor\'s own monster. Nothing rises for you. Every pet or familiar you keep but do not send out lends '+Math.round(ORDRESK*100)+'% damage, up to '+ORDRESN+' of them. Three skills of judgement join your ten.'},
 storm:{side:'order',name:'The Split Sky',title:'Skysplit',sub:'Be faster than it',blurb:'Every blow makes you quicker, and your blows leap on as lightning from monster to monster.',
  lore:'Above the hundredth floor the Spire has holes in it, and the sky comes in. You stand in one until the lightning knows your bones. After that it comes when it is called.',
  text:'You hit '+Math.round((AX.st.storm[0]-1)*100)+'% harder and have '+Math.round((AX.st.storm[1]-1)*100)+'% more health. Every blow you land builds haste: at full haste you move and strike '+Math.round(AX.storm.mv*100)+'% faster. Every '+AX.storm.sparkT+' seconds a spark leaps from you to the nearest monster. About once a second your blows discharge: '+Math.round(AX.storm.k*100)+'% of the damage they have just done strikes again as lightning and leaps to '+AX.storm.jumps+' more monsters, each of them shocked still for a moment.'},
 stone:{side:'order',name:'The Standing Stone',title:'Stonesworn',sub:'Do not move',blurb:'Guard plates break heavy blows and answer with a shockwave, and every fourth blow of yours crushes.',
  lore:'The Spire grew a bone for every body it kept, and bone is only slow stone. Past the hundredth floor you stop running. Let them break on you.',
  text:'You hit '+Math.round((AX.st.stone[0]-1)*100)+'% harder and have '+Math.round((AX.st.stone[1]-1)*100)+'% more health. '+AX.stone.plates+' guard plates circle you: each breaks one heavy blow (a charge, a lunge, a blast from the ground) so that only '+Math.round(AX.stone.leak*100)+'% of it reaches you, and answers with a shockwave that hurts and staggers everything near. Lighter blows (a brush, a bolt, a beam) get through. A plate grows back every '+AX.stone.regrow+' seconds, sooner with every crushing blow you land. Every '+AX.stone.quakeT+' seconds the ground cracks under the nearest monster. Every fourth blow you land is a crushing one: '+Math.round(AX.stone.crush*100)+'% of what the four did lands again on the target and everything beside it.'},
 blade:{side:'order',name:'The Thousandth Cut',title:'Edgewalker',sub:'Never miss',blurb:'Blades of light hang at your back, cut wherever you strike, and finish whatever is nearly dead.',
  lore:'A thousand cuts taught you where things come apart. Past the hundredth floor the next one no longer needs your hand: the blades hang in the air and follow the first.',
  text:'You hit '+Math.round((AX.st.blade[0]-1)*100)+'% harder and have '+Math.round((AX.st.blade[1]-1)*100)+'% more health. '+AX.blade.n0+' blades of light follow you, one more every '+AX.blade.nK+' floors, six at most. Each blade cuts the nearest monster on its own every '+AX.blade.autoT+' seconds. Every blow you land is followed by a cut worth '+Math.round(AX.blade.per*100)+'% of it for each blade. Every '+AX.blade.combo+'th cut on the same monster is a great cut. A lesser monster below '+Math.round(AX.blade.exec*100)+'% of its health dies to any blow of yours.'},
 tide:{side:'order',name:'The Returning Tide',title:'Tidecaller',sub:'Wear it all down',blurb:'Waves roll out of you, carry monsters off and leave them drenched and weak, while your wounds keep closing.',
  lore:'Under the Spire there is water, older than the dark, and it climbs when you ask. It pushes, it pulls back, it closes wounds, and it never gets tired.',
  text:'You hit '+Math.round((AX.st.tide[0]-1)*100)+'% harder and have '+Math.round((AX.st.tide[1]-1)*100)+'% more health, and you mend '+Math.round(AX.tide.regen*100)+'% of it every '+AX.tide.regenT+' seconds. Every '+AX.tide.t+' seconds a wave rolls from you at the nearest monster: it hurts what it touches, carries lesser monsters along with it, and leaves everything drenched for '+AX.tide.soak+' seconds. A drenched monster is slower and takes '+Math.round(AX.tide.soakMore*100)+'% more damage from everything.'},
};
for(const k in APEX)if(k!=='dominion'&&k!=='order')APEX[k].text+=APEX[k].side==='dominion'?' Pets and familiars hold '+Math.round((1-DOMHOLD)*100)+'% less mana for their power. Thralls and wolves hit '+Math.round((DOMSUM-1)*100)+'% harder, pets, familiars and trophies '+Math.round((DOMPET-1)*100)+'%. Three skills join your ten.':' Mana comes back '+Math.round((ORDMANA-1)*100)+'% faster and skills cost '+Math.round((1-ORDCOST)*100)+'% less. Every pet or familiar you keep but do not send out lends '+Math.round(ORDRESK*100)+'% damage, up to '+ORDRESN+' of them. Three skills join your ten.';
// the three skills of each path, the same for every class: skills 10, 11 and 12. Rows as in SKILLS, with the mana cost in place. (needs may also be a function of the nearest monster.)
const APEXSK={
 dominion:[
  ['rollcall','Roll Call',30,'Up to eight of the monsters that died on this floor rise as the Owed for 8 seconds, over and above your usual number. Where fewer than three have died, husks of the Spire fill the ranks.',[['rollcall'],['ring',150]],null,40],
  ['collect','Collect',14,'Name a debtor: the nearest monster. It is marked for 5 seconds (it takes 50% more damage), you strike it from where you stand, and everything that fights for you strikes it at once.',[['collect']],'t',22],
  ['tally','Tally Ground',24,'The floor around you becomes your counting-ground for 8 seconds. Monsters on it take 50% more damage from everything and are worn down, and all but a floor\'s own monster are slowed.',[['field','domain','self',190,8,.5,.6,true],['ring',190]],null,30]],
 order:[
  ['verdict','Verdict',12,'A beam of white light sweeps a wide arc in front of you. Every monster it crosses is hit once, very hard, and enemy bolts in its path burn away.',[['verdict']],null,26],
  ['ascend','Ascension',40,'For 4 seconds nothing can hurt you, and your ring of light is half again as wide and burns twice as hard.',[['buff','inv',4],['buff','ascT',4],['ring',180]],null,40],
  ['sever','Sever',16,'Appear at the nearest monster and cut. A lesser monster below half its health dies outright. A floor\'s own monster below a fifth of its health takes triple damage.',[['tele'],['sever']],'t',26]],
 beasts:[
  ['howl','Hunting Howl',22,'The pack is made whole at once, and for '+AX.beast.howl+' seconds every beast runs faster and bites twice as often.',[['howl'],['ring',160]],null,28],
  ['rundown','Run Down',12,'Name the prey: the nearest monster. It is marked for 5 seconds (it takes 50% more damage) and slowed, and every beast is on it at once with a bite four times as hard.',[['rundown']],'t',22],
  ['longhunt','The Long Hunt',40,'Ultimate. '+AX.beast.huntN+' more beasts join the pack for '+AX.beast.huntT+' seconds, over and above your usual number, and every beast alive makes the others stronger.',[['longhunt'],['ring',200]],null,40]],
 frost:[
  ['rime','Rimefall',14,'The ground under your target freezes over for '+AX.frost.rimeT+' seconds. Monsters on it are hurt and chilled, twice a second, until they freeze.',[['rime']],null,26],
  ['shatterall','Shatter',10,'Every frozen monster in the room is struck through the ice, very hard, and the splinters hit everything beside it. Every monster that is only chilled takes a lesser blow and grows colder.',[['shatterall']],m=>mons.some(o=>!o.hidden&&(o.frozen>0||o.chill>0)),22],
  ['winter','Deep Winter',40,'Ultimate. Everything within a wide ring of you freezes solid at once, whatever it has shaken off before, and your ice-wights slam the ground.',[['winter'],['ring',AX.frost.ultR]],null,40]],
 plague:[
  ['blight','Blight',12,'A cloud of rot settles on your target for '+AX.plague.blightT+' seconds. Monsters in it are worn down and gain a layer of rot every second.',[['blight']],null,22],
  ['fester','Fester',14,'Every rotting monster in the room bursts open where it stands: it takes a blow for each layer of rot it carries, keeps its layers, and gains one more.',[['fester']],m=>mons.some(o=>!o.hidden&&o.rot>0),26],
  ['sickness','The Long Sickness',40,'Ultimate. Every monster in the room rots through at once: five layers, and they hold for '+AX.plague.ultT+' seconds.',[['sickness'],['ring',320]],null,40]],
 flame:[
  ['pyre','Pyre',12,'The ground under your target burns for '+AX.flame.pyreT+' seconds. Monsters on it are hurt twice a second and set burning.',[['pyre']],null,24],
  ['coals','Scatter the Coals',16,AX.flame.coals+' cinders kindle round you at once and throw themselves at the nearest monsters.',[['coals'],['ring',90]],'t',26],
  ['burndown','Burn Down',40,'Ultimate. You become the pyre for '+AX.flame.ultT+' seconds: fire bursts out of you and then walks with you, burning everything near, and every hit on you does half damage.',[['burndown']],null,40]],
 storm:[
  ['skyfall','Skyfall',8,'Lightning falls on the nearest monster, very hard, and leaps on to five more.',[['skyfall']],'t',18],
  ['stride','Stormstride',18,'For '+AX.storm.surge+' seconds you are at full haste and 40% faster again on foot, and your blows discharge three times a second.',[['stride'],['ring',70]],null,24],
  ['skycomes','The Sky Comes In',40,'Ultimate. For '+AX.storm.tempT+' seconds lightning falls on a monster four times a second, and each bolt leaps on to another.',[['skycomes'],['ring',260]],'t',40]],
 stone:[
  ['fissure','Fissure',10,'A fissure tears open from your feet toward your target and stays for 3 seconds. Monsters on it are hurt again and again, and all but a floor\'s own are slowed.',[['fissure']],null,22],
  ['standfast','Stand Fast',24,'All your guard plates return at once, and for '+AX.stone.standT+' seconds every hit that reaches you does half damage.',[['standfast'],['ring',70]],null,28],
  ['monolith','Monolith',40,'Ultimate. A standing stone comes down on your target after a moment: a crushing blow to everything under it, which is stunned, and four fissures crack outward from where it lands.',[['monolith']],null,40]],
 blade:[
  ['bladefan','Bladefan',9,'Your blades fly out in a fan. Each passes through everything in its path and hits hard.',[['bladefan']],null,20],
  ['edgewalk','Edgewalk',14,'Appear behind the nearest monster, untouchable for a moment, and every blade cuts it at once.',[['tele'],['edgewalk']],'t',24],
  ['lastcut','The Last Cut',40,'Ultimate. Your blades take one monster apart: '+AX.blade.ultN+' cuts in four seconds, and a last one that kills a lesser monster below half its health and hits a floor\'s own very hard.',[['lastcut']],'t',40]],
 tide:[
  ['greatwave','Great Wave',9,'A great wave rolls out toward your target. It hits hard, carries lesser monsters a long way and leaves everything drenched.',[['greatwave']],null,20],
  ['undertow','Undertow',16,'Everything near you is dragged to your feet, hurt and drenched, and you mend a little for every monster caught, up to a fifth of your health.',[['undertow'],['ring',AX.tide.pullR]],'t',24],
  ['floodtide','Flood Tide',40,'Ultimate. Waves roll out of you in every direction, now and again in 3 seconds, and for '+AX.tide.floodT+' seconds your wounds close four times as fast.',[['floodtide'],['ring',200]],null,40]],
};
// the side of the hero's path, and what the order side gives this path: [damage, health]
const apxSide=()=>S.apex&&APEX[S.apex]?APEX[S.apex].side:null,DOMS=()=>apxSide()==='dominion',ORDS=()=>apxSide()==='order',apxSt=()=>AX.st[S.apex]||AX.st.order;
const apexOk=id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(APEX,id);
const skBase=(c,si)=>si<10?SKILLS[c][si]:S.apex?APEXSK[S.apex][si-10]:null;
// the skill as carried: with an alteration its recharge and its cost differ (what it does while it is cast is AK, set by skill())
const skD=(c,si)=>{const d=skBase(c,si),A=d&&c===S.cls?altOf(si):null;if(!A||!A.cd&&!A.cost)return d;const key=c+si+A.id;let r=ALTROW.get(key);if(!r){r=d.slice();r[2]=Math.round(d[2]*(A.cd||1)*100)/100;r[6]=Math.max(1,Math.round(d[6]*(A.cost||1)));ALTROW.set(key,r)}return r};
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
const skCostOf=base=>S.level>=8?Math.max(1,Math.round(base*skRise()*(ORDS()?ORDCOST:1))):base;
for(const k in SKILLS){const c=CLASSES[k];SKILLS[k].forEach((d,i)=>{d[6]=MCOST[k][i]});c.mana=MANA0[k];c.skills=SKILLS[k].map((d,i)=>({id:d[0],name:d[1],cd:d[2],mana:d[6],get text(){return skText(d,k,i)},level:SKLV[i]}));
  c.pows[1]=[SKILLS[k][3][1],''];Object.defineProperty(c.pows[1],1,{get:()=>'A new skill. '+skText(SKILLS[k][3],k,3),enumerable:true})}
const SK=[0,1,2,3,4,5].map(i=>({id:'',name:'',key:''+(i+1),cd:0,max:0,ready:false,unlocked:false,index:-1,cost:0,affordable:false}));
// MB.mana: cur and max, regen (mana per second right now), reserved (held by pets or familiars), drawing (the standing bonus is flowing)
const MANA={cur:0,max:0,regen:0,reserved:0,drawing:false};
const known=(lv=S.level)=>S.cls&&lv>=8?SKLV.filter(l=>lv+1>=l).length:0;
const NSK=6,load0=()=>[0,1,2,3,4,5];
const okLoad=(l,n=NSK)=>Array.isArray(l)&&l.length===n&&l.every((v,i)=>Number.isInteger(v)&&v>=0&&v<13&&l.indexOf(v)===i);
// a loadout as carried now, or null. Saves from when four skills were carried get the next skills in line on slots 5 and 6.
const fixLoad=l=>{if(okLoad(l))return l.slice();if(!okLoad(l,4)||l.some(v=>v>9))return null;const out=l.slice();for(let v=0;out.length<NSK;v++)if(!out.includes(v))out.push(v);return out};
// (skills 10 to 12 are the apex skills: a loadout may only hold them once a path is chosen)
const apexLoad=(l,apex)=>apex||!l.some(v=>v>9);

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
 lich:{name:'Bog Lich',ai:'witch',r:22,hp:250,col:'#5f9a6a',eyes:3,hood:1},
 wyrm:{name:'Stone Wyrm',ai:'burrower',r:30,hp:140,col:'#9a8f86',eyes:0,teeth:1,spikes:6},
 king:{name:'The Flayed King',ai:'hollow',crown:1,r:40,hp:1150,col:'#8c2f39',eyes:3,void:1,spikes:11},
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
/* ---------- round 15: elites. From floor 15 a plain fight floor without a dare has a few lesser monsters that carry a modifier of their own: one in each pack, or one beside the floor's monster ---------- */
// An elite (m.el = 1..5, the index into ELITE.kinds + 1) is a lesser monster with `hp` times the health, a little larger, marked. shielded: a shell every 9 s; enraged: its clock runs faster from the start;
// splitting: two small ones step out of it when it falls; volatile: it leaves a blast where it falls (a telegraphed blow like any other); mending: it closes the wounds of the floor's monster until it is killed.
// So that the floor stays short: an elite's fall shakes the floor's monster (`shake` of its health gone; if it has not entered yet, it enters `debt` short). Killing it also gives `mana` times a kill's mana and a morsel.
const ELITE={from:14,kinds:['shielded','enraged','splitting','volatile','mending'],names:['Shielded','Enraged','Splitting','Volatile','Mending'],col:'#ffb347',
  text:['A shell closes round it again and again. Strike between.','Its clock runs fast from the first moment.','Two small ones step out of it when it falls.','It bursts where it falls. Step away.','It closes the wounds of the floor\'s monster. Kill it first.'],
  hp:1.4,r:1.15,spd:.9,shake:.08,debt:.045,pay:.03,mana:3,mendT:3,mendK:.012,mendMax:.08,volR:96,volT:1,splitHp:.3,escHp:.085};
const elOver=()=>{const o=CL()?MP.over:window.__mb&&window.__mb.over;return o&&o.elite!==undefined?o.elite:o&&o.kind?0:undefined};
// how many elites floor n (0-based) brings, given its definition and whether a dare runs on it
function elitesOf(n,L,dare){if(XF)return XF.elN|0;const o=elOver();if(o===0||o===false)return 0;if(VS||TU||L.floorKind!=='fight'||tenth(n)||n<12)return 0;if(o===undefined&&(n<ELITE.from||dare))return 0;return L.waves?L.waves:1}
function eliteMake(m,j){
  const n=S.level,o=elOver(),f=typeof o==='string'?ELITE.kinds.indexOf(o):-1,k=f>=0?f:XF?((XF.elK|0)+(S.wave?S.wave.n-1:0))%ELITE.kinds.length:(n*3+j*2+(S.wave?S.wave.n:0))%ELITE.kinds.length;
  m.el=k+1;m.maxHp=m.hp=Math.round(m.hp*ELITE.hp);m.r=Math.round(m.r*ELITE.r);m.s={...m.s,name:ELITE.names[k]+' '+m.s.name.replace('Lesser ',''),r:m.r};m.spdK=ELITE.spd;m.mendT=ELITE.mendT;m.mendSum=0;
  if(k===0){m.mods=['shielded'];m.shT=2.2}if(k===1)m.rage=true;
  rings.push({x:m.x,y:m.y,life:.7,max:.7,r:m.r+60,fx:true});return m;
}
// the elites that come beside the floor's monster on a floor without packs
function eliteEscort(nE){
  const n=S.level,b=boss,kinds=[];
  for(let j=0;j<nE;j++){const kind=LESSER[(n+1+j*2)%LESSER.length],m=lesser(kind,b.x+(j?150:-150)*(nE>1?1:(n%2?1:-1)),b.y+30,GENHP[kind]*genMul(n)*ELITE.escHp);eliteMake(m,j);m.t=1.6+j*.4;kinds.push(ELITE.kinds[m.el-1])}
  eliteNews(kinds);
}
function eliteNews(kinds){if(!kinds.length)return;const names=kinds.map(k=>ELITE.names[ELITE.kinds.indexOf(k)]);S.L.elites=(S.L.elites||[]).concat(kinds);
  if(!window.MBEliteBand)floats.push({x:W/2,y:H/2-90,txt:(kinds.length>1?'Elites: ':'Elite: ')+names.join(', '),life:2.4,c:ELITE.col});emit('elite',{state:'enter',kinds,names})}
// a floor's monster that brings an elite beside it has `pay` less health: what the elite adds to the fight, it gives up (an elite of a pack takes the place of a lesser monster, so nothing is owed)
// (and the floor's monster of a floor that carries the hazard of its land has ARENA.pay less: the land wears on the fight)
function floorPay(b,L){const k=(L.elN&&!L.waves?ELITE.pay:0)+(L.area?ARENA.pay:0);if(k>0)b.maxHp=b.hp=Math.max(1,Math.round(b.maxHp*(1-Math.min(.4,k))))}
function eliteStep(m,dt){
  if(m.el===5&&!(m.stun>0)&&(m.mendT-=dt)<=0){m.mendT=ELITE.mendT;const t=boss&&boss.hp>0&&boss.hp<boss.maxHp&&!boss.hidden?boss:null;
    if(t&&m.mendSum<ELITE.mendMax){const h=Math.min(t.maxHp-t.hp,t.maxHp*ELITE.mendK);t.hp+=h;m.mendSum+=ELITE.mendK;for(let k=1;k<=7;k++)bits.push({x:m.x+(t.x-m.x)*k/7,y:m.y+(t.y-m.y)*k/7,vx:0,vy:-20,life:.5,max:.5,c:'#7fd66b',r:3});
      floats.push({x:t.x,y:t.y-t.r-10,txt:'+'+fmt(Math.round(h*10)/10),life:1,c:'#7fd66b'});rings.push({x:m.x,y:m.y,life:.4,max:.4,r:m.r+30,fx:true});sfx(660,.2,'sine',.1,990)}}
}
function eliteFell(m){
  const k=m.el-1;floats.push({x:m.x,y:m.y-m.r-22,txt:'Elite down',life:1.2,c:ELITE.col,big:1.4});emit('elite',{state:'down',id:m.id,kind:ELITE.kinds[k],x:m.x,y:m.y});if(MP.on&&!CL())MP.elq.push([Math.round(m.x),Math.round(m.y),k]);
  if(P)manaGive(P.maxMana*MKILL*(ELITE.mana-1));if(has('taste')){const f={id:nid(),x:m.x,y:m.y};collide(f,10,true);morsels.push(f)}
  if(k===2)for(let i=0;i<2;i++){const g=rand()*TAU,c=lesser(m.kind,m.x+Math.cos(g)*(m.r+14),m.y+Math.sin(g)*(m.r+14),m.maxHp*ELITE.splitHp/ELITE.hp,true);c.s.col=m.s.col;c.t=.8+i*.3}
  if(k===3){const z=zone(m.x,m.y,ELITE.volR,ELITE.volT);z.el=1;floats.push({x:m.x,y:m.y-m.r-40,txt:'Volatile',life:1,c:'#ff5b6e'});sfx(220,.5,'sawtooth',.2,880)}
  if(boss&&boss.hp>0&&mons.includes(boss)){const d=Math.min(boss.hp-1,boss.maxHp*ELITE.shake);if(d>0){boss.hp-=d;boss.flash=.2;floats.push({x:boss.x,y:boss.y-boss.r-24,txt:'Shaken',life:1.1,c:ELITE.col});puff(boss,ELITE.col,12,200)}}
  else if(!boss&&S.wave)S.elDebt=(S.elDebt||0)+ELITE.debt;
}
// Waves from level 14: some levels open with one or two packs of lesser monsters before the boss enters. Tyrant levels never do.
const wavesOf=n=>n<13?0:[1,0,2,0,0][(n-13)%5];
// Rooms: which obstacles stand where. Anchor sets are mirror-symmetric and keep clear of both spawn points; solid things are never combined closer than a boss is wide.
const QA=[[250,190],[710,190],[250,410],[710,410]],QB=[[300,300],[660,300]],QC=[[480,300]],QD=[[165,300],[795,300]],QE=[[360,205],[600,205],[360,395],[600,395]];
const ROOMS=[[],[['pillar',QB]],[['pillar',QA]],[['spikes',QE]],[['pillar',QC],['spikes',QE]],[['brazier',QB]],[['pit',QB]],[['spikes',QE],['spikes',QC]],[['brazier',QA]],[['pit',QD],['spikes',QB]],[['pillar',QA],['brazier',QC]],[['pit',QC],['pillar',QD]]];
// levels 1-3 are bare; the crypt and the first trade levels bring in one thing at a time (pillars, spikes, braziers, pits); after that the room follows from the level number
const roomOf=(n,tyrant)=>n<3?0:n<12?[1,2,3,4,2,5,8,7,6][n-3]:tyrant?8:(n*7+2)%12;
const cap1=x=>x[0].toUpperCase()+x.slice(1),an=w=>(/^[aeiou]/i.test(w)?'an ':'a ')+w;
function levelDef(n,fk){
  const bi=bandOf(n+1),B=bandAt(bi);
  if(n<LEVELS.length){const L=LEVELS[n];return{title:L.title,hint:L.hint,kind:L.boss,spec:SPEC[L.boss],name:SPEC[L.boss].name,hue:100,waves:0,mods:[],room:roomOf(n),floorKind:floorKind(n),band:bi,bandName:B.name,handicap:null,door:null}}
  const N=n+1,area=[B.name,B.hue],tyrant=N%10===0,kind=tyrant?'hollow':POOL[(n*5+3)%POOL.length],base=SPEC[kind];
  // fk: what kind of floor this is (see floorKind). The Onslaught and the Vigil have no monster of their own; the monster of a race comes alone and enraged, with TK.raceHp of its health.
  if(tyrant||!FKINDS.includes(fk))fk=floorKind(n);
  const open=fk==='survive'||fk==='guard',waves=open||fk==='race'?0:wavesOf(n),mods=open?[]:modsOf(n,kind,tyrant),handicap=fk==='ordeal'?handicapOf(n)||HCAPS[n%HCAPS.length]:null;
  let hp=GENHP[kind]*genMul(n)*(tyrant?TYRHP*(n>=59?TYRLATE:1)*(n>=109?APEXHP:1):1)*[1,.8,.68][waves]*(fk==='race'?TK.raceHp:1)*(n>=100&&!tyrant?APEXORD:1);for(const k of mods)hp*=MODHP[k]||1;
  const name=tyrant?'Tyrant of '+area[0].replace('The ',''):(mods[0]?cap1(mods[0])+' ':'')+PRE[n%10]+' '+base.name.replace('The ','')+(mods[1]?', '+cap1(mods[1]):'');
  const spec={...base,ai:kind,crown:tyrant?1:0,name,hp:Math.round(hp),col:tyrant?'#8c2f39':TINT[(n*3)%10],r:base.r+(tyrant?6:2)};
  let room=roomOf(n,tyrant);if(fk==='guard'&&[4,7,10,11].includes(room))room-=2; // the lamp stands in the middle of the room: nothing else may
  return{title:area[0],hint:tyrant?'A tyrant holds this floor.':isTrial(fk)?(fk==='ordeal'?HRULE[handicap]:TRIALS[fk].rule):fk==='cross'?'Behind it, two doors.':N===50?'':waves>1?'Two packs come first. Then it does.':waves?'Its pack comes first. Then it does.':'Stronger than the last. So are you.',
    kind,spec,name:open?TRIALS[fk].title:name,hue:area[1],waves,mods,room,floorKind:fk,band:bi,bandName:B.name,handicap,door:null};
}
// a small, weaker copy of a pool monster: wave packs and what a splitting boss sheds
function lesserSpec(kind,n,hp){const base=SPEC[kind];return{...base,ai:base.ai||kind,name:'Lesser '+base.name.replace('The ',''),r:Math.round(base.r*.72),hp:Math.max(6,Math.round(hp))}}
/* ---------- round 15: the arena. Things of the room can be used, and each land has a hazard of its own on some of its floors ---------- */
// Pillars break: a heavy blow of a hero (a closer, a riposte, a skill) or a monster's charge cracks one (`pillarHp` cracks; the ram of a lesser monster counts two). It falls: what a hero brought down hurts and stuns every monster within
// `fallR` (they are left aloft); a monster that rams one down is crushed by it (`ramK` of its health: the floor's monster / a lesser one). The stump is no longer in the way.
// Braziers tip: any blow of a hero that reaches the bowl spills it along the blow. The fire burns monsters for `spillT` seconds and brands them, and the brazier is dark for the rest of the floor.
// The lands (themeOf): ash: embers fall where a hero is going; fen: mires slow everything that wades through them (a dash crosses); peaks: rotten plates give way under weight and stay open;
// court: the rake, a line of blasts drawn across the room through a hero, with a gap. Only on plain fight floors from floor 14 without a dare, every second one (areaOf). Not in versus, not in the lesson.
const ARENA={from:12,pillarHp:3,fallR:90,fallD:7,fallStun:1.4,ramK:[.02,.3],spillR:88,spillT:4.5,spillTick:.5,spillD:.5,crackWarn:.9,crackR:50,crackK:[.05,.3],crackStun:1.5,mireR:66,mireK:.74,mireM:.7,pay:.03,
  themes:['ash','fen','peaks','court'],names:{ash:'Falling Ash',fen:'The Mire',peaks:'Rotten Floor',court:'The Rake'},
  text:{ash:'Embers fall where you are going. Keep moving.',fen:'The mire slows whatever wades through it. A dash crosses.',peaks:'The cracked floor gives way under weight, and stays open.',court:'A line of blasts is drawn across the room. Find the gap.'},
  ash:{gap:5.5,r:68,warn:1.15},court:{gap:8.5,r:50,warn:1.25,step:.07}};
const themeOf=bi=>bi<=0?null:bi<5?ARENA.themes[bi-1]:['court','peaks','ash','fen','ash','peaks','ash','court'][(bi-5)%8];
const arOver=()=>{const o=CL()?MP.over:window.__mb&&window.__mb.over;return o?o.area:undefined};
// the hazard of the land on floor n (0-based), or null
function areaOf(n,L,dare){if(XF)return XF.area||null;const o=arOver();if(o==='none'||o===0)return null;if(VS||TU||n<12||tenth(n)||L.floorKind!=='fight')return null;if(ARENA.themes.includes(o))return o;if(n<ARENA.from||dare||n%2===0||((CL()?MP.over:window.__mb&&window.__mb.over)||{}).kind)return null;return themeOf(L.band)}
const objOn=()=>!VS&&!TU&&S.level>=8&&!!S.cls;
function buildRoom(n,room,area){
  const out=[],quick=Math.max(.75,1-Math.max(0,n-12)*.006); // traps cycle a little faster deep down
  for(const[kind,set]of ROOMS[room]||[])set.forEach(([x,y],i)=>{
    const o={kind,x,y,r:kind==='pillar'?26:kind==='pit'?(set===QC?54:46):kind==='spikes'?36:62,on:false,t:0,warn:false,per:0,core:0};
    if(kind==='spikes'){o.per=3.4*quick;o.t=(i%2)*o.per*.35} // every trap starts inside its quiet stretch, so nothing fires without its warning
    if(kind==='brazier'){o.per=4.6*quick;o.core=13;o.t=i/set.length*o.per*.45}
    out.push(o)});
  if(area==='fen'||area==='peaks'){ // mires or rotten plates: the first anchor set that keeps clear of what already stands
    const rr=area==='fen'?ARENA.mireR:ARENA.crackR,sets=area==='fen'?[QD,[[480,180],[480,420]],QB,QA]:[[[480,180],[480,420]],QD,QB,QE,QA];
    const set=sets.find(s=>s.every(([x,y])=>out.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+rr+34)));
    if(set)set.forEach(([x,y])=>out.push({kind:area==='fen'?'mire':'crack',x,y,r:rr,on:false,t:0,warn:false,per:0,core:0}))}
  return out;
}
// ---- things of the room that are struck. ev: 1 a pillar cracks, 2 it falls, 3 a brazier tips, 4 a plate starts to give, 5 it goes. by: the member index of the hero who did it (alone 0), -1: a monster or the floor.
const objMine=by=>by>=0&&(!MP.on||by===MP.myIdx);
function objDo(i,ev,ang,by){
  const o=obstacles[i];if(!o)return;const mine=objMine(by),kind=ev<3?'pillar':ev===3?'brazier':'crack',state=['','crack','fall','tip','warn','fall'][ev];
  if(ev===1){if(o.kind!=='pillar'||o.dead)return;o.cr=(o.cr||0)+1;puff(o,'#b9b2c6',10,160);sfx(140,.18,'square',.2,90);noise(.15,.2,400,1200)}
  else if(ev===2){if(o.kind!=='pillar'||o.dead)return;o.dead=true;o.cr=ARENA.pillarHp;const fx=o.x+Math.cos(ang)*34,fy=o.y+Math.sin(ang)*34;puff({x:fx,y:fy},'#b9b2c6',30,260);rings.push({x:fx,y:fy,life:.5,max:.5,r:ARENA.fallR,fx:true});S.shake=Math.max(S.shake,.35);sfx(60,.4,'square',.4,30);noise(.4,.35,200,900);
    floats.push({x:o.x,y:o.y-50,txt:'It falls',life:1,c:'#d6a544',big:1.4});
    if(mine){GEO++;MINE++;TAGOK++;const k=AK;AK=AK0;try{for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&Math.hypot(m.x-fx,m.y-fy)<ARENA.fallR+m.r){hurtM(m,ARENA.fallD*dmgMul());if(mons.includes(m))mStun(m,m.boss?ARENA.fallStun*.6:ARENA.fallStun)}}finally{AK=k;TAGOK--;MINE--;GEO--}}}
  else if(ev===3){if(o.kind!=='brazier'||o.spent)return;o.spent=true;o.per=0;o.on=false;o.warn=false;o.tip=ang;const fx=o.x+Math.cos(ang)*58,fy=o.y+Math.sin(ang)*58;puff({x:fx,y:fy},'#ff8a4c',26,240);sfx(200,.5,'sawtooth',.2,70);noise(.5,.25,500,1800);
    floats.push({x:o.x,y:o.y-46,txt:'Spilled',life:1,c:'#ff8a4c'});
    if(mine){const f={kind:'fire',x:fx,y:fy,r:ARENA.spillR,t:0,dur:ARENA.spillT,every:ARENA.spillTick,tick:0,dmg:ARENA.spillD*dmgMul(),slow:false,sk:false,brand:true};clamp(f,10);fields.push(f)}
    else rings.push({x:fx,y:fy,life:.6,max:.6,r:ARENA.spillR,fx:true})}
  else if(ev===4){if(o.kind!=='crack'||o.warn)return;o.warn=true;o.wt=ARENA.crackWarn;sfx(300,.3,'sawtooth',.12,120);noise(.3,.12,800,2400)}
  else if(ev===5){if(o.kind!=='crack')return;o.kind='pit';o.warn=false;o.r=ARENA.crackR-2;o.fell=true;puff(o,'#6d6478',26,220);S.shake=Math.max(S.shake,.3);sfx(90,.4,'square',.3,30);noise(.4,.3,150,700);
    if(!CL())for(const m of[...mons])if(!m.hidden&&m.st!=='leap'&&mons.includes(m)&&dist(m,o)<o.r){const g=angTo(o,m);m.x=o.x+Math.cos(g)*(o.r+m.r);m.y=o.y+Math.sin(g)*(o.r+m.r);clamp(m,m.r);m.stun=Math.max(m.stun||0,m.boss?ARENA.crackStun*.6:ARENA.crackStun);if(m.st==='charge'||m.st==='lunge'||m.st==='wind'){m.st='dazed';m.t=.6}
      floats.push({x:m.x,y:m.y-m.r-20,txt:'The floor takes it',life:1.1,c:'#d6a544'});if(m.ward<=0)hurtM(m,m.maxHp*ARENA.crackK[m.boss?0:1],true)}}
  else return;
  emit('arena',{kind,state,index:i,x:o.x,y:o.y,ang,by:mine?-1:by});
}
// host or alone: the thing is struck. n: how many cracks a pillar takes from it
function objHit(i,ang,by,n){
  const o=obstacles[i];if(!o||!objOn()||CL())return 0;let ev=0;
  if(o.kind==='pillar'&&!o.dead)ev=(o.cr||0)+(n||1)>=ARENA.pillarHp?2:1;else if(o.kind==='brazier'&&!o.spent)ev=3;if(!ev)return 0;
  if(ev===1&&n>1)o.cr=(o.cr||0)+n-1;
  objDo(i,ev,ang,by);if(MP.on)MP.oeq.push([i,ev,Math.round(ang*100)||0,by]);return ev;
}
// a blow of my hero reaches it (a client asks the host; the answer comes back as the event)
function objMy(i,ang,heavy){
  const o=obstacles[i];if(o.kind==='pillar'?o.dead||!heavy:o.kind!=='brazier'||o.spent)return;if(S.t-(o._q||-9)<.3)return;o._q=S.t;
  if(CL())mpQ(['ob',i,Math.round(ang*100)||0]);else objHit(i,ang,MP.on?MP.myIdx:0,1)}
// everything of the room within r of (x, y): struck from there (shockwaves, blasts)
function objBlow(x,y,r,heavy){if(!obstacles.length||!objOn())return;for(let i=0;i<obstacles.length;i++){const o=obstacles[i],R=o.kind==='pillar'?o.r:o.kind==='brazier'?o.core:0;if(R&&Math.hypot(o.x-x,o.y-y)<r+R)objMy(i,Math.atan2(o.y-y,o.x-x),heavy)}}
// a swing of reach and arc along a
function objArc(a,reach,arc,heavy){if(!obstacles.length||!objOn())return;for(let i=0;i<obstacles.length;i++){const o=obstacles[i],R=o.kind==='pillar'?o.r:o.kind==='brazier'?o.core:0;if(!R)continue;const d=dist(o,P);if(d<reach+R){const g=angTo(P,o),da=Math.atan2(Math.sin(g-a),Math.cos(g-a));if(Math.abs(da)<arc||d<R+18)objMy(i,a,heavy)}}}
// a monster's charge has run into something solid
function objRam(m){
  if(SIDE||CL()||!objOn())return;for(let i=0;i<obstacles.length;i++){const o=obstacles[i];if(o.kind!=='pillar'||o.dead||dist(o,m)>o.r+m.r+12)continue;
    if(objHit(i,m.ang+Math.PI,-1,m.boss?1:2)===2&&mons.includes(m)){floats.push({x:m.x,y:m.y-m.r-20,txt:'Crushed',life:1.1,c:'#d6a544',big:1.4});m.stun=Math.max(m.stun||0,m.boss?ARENA.fallStun*.65:ARENA.fallStun);if(m.ward<=0)hurtM(m,m.maxHp*ARENA.ramK[m.boss?0:1],true)}return}
}
// the hazard of the land that falls by the clock (ash, court): host or alone
function areaStep(dt){
  const h=S.L.haz;if(!h||S.banner>0||FN&&FN.state==='play'||!(boss||S.wave))return;if((h.t-=dt)>0)return;
  const K=ARENA[h.kind],hs=MP.on?mpHeroes():[P],hz=z=>{z.hz=1;return z};h.t=K.gap;h.n++;if(!hs.length)return;
  if(h.kind==='ash')for(const q of hs)hz(zone(q.x+(q.vx||0)*.6,q.y+(q.vy||0)*.6,K.r,K.warn));
  else{const q=hs[h.n%hs.length],across=h.n%2===1,n=across?9:5,gap=1+Math.floor(rand()*(n-2));
    for(let i=0;i<n;i++){if(i===gap)continue;const f=i/(n-1);hz(across?zone(WALL+60+f*(W-2*WALL-120),Math.max(WALL+60,Math.min(H-WALL-60,q.y)),K.r,K.warn+Math.abs(i-gap)*K.step):zone(Math.max(WALL+60,Math.min(W-WALL-60,q.x)),WALL+60+f*(H-2*WALL-120),K.r,K.warn+Math.abs(i-gap)*K.step))}}
  sfx(h.kind==='ash'?620:240,.4,'sawtooth',.1,h.kind==='ash'?180:60);
}
// what MB.arena hands out: {theme, name, text, hazard (a clocked one runs), objects:{pillar, brazier, crack, mire}, broken, spilled, fallen}
function arenaInfo(){const L=S.L;if(!L||S.mode==='title')return null;const c={pillar:0,brazier:0,crack:0,mire:0};let br=0,sp=0,fl=0;for(const o of obstacles){if(o.kind==='pillar'){if(o.dead)br++;else c.pillar++}else if(o.kind==='brazier'){if(o.spent)sp++;else c.brazier++}else if(o.kind==='crack')c.crack++;else if(o.kind==='mire')c.mire++;if(o.fell)fl++}
  return{theme:L.area||null,name:L.area?ARENA.names[L.area]:'',text:L.area?ARENA.text[L.area]:'',hazard:!!L.haz,objects:c,broken:br,spilled:sp,fallen:fl,usable:objOn()}}

/* ---------- equipment: three slots, four rarities, dropped by every boss from level 9 on ---------- */
const SLOTS=['weapon','armor','trinket'];
// (round 15) a fourth thing to carry, the relic: nobody starts with one, it only drops. ESLOTS: everything worn, in order. A relic may be missing (S.eq.relic undefined).
const ESLOTS=['weapon','armor','trinket','relic'];
const RAR=[['common','#b9b2c6',1,.15],['rare','#6ea3e0',1.5,.2],['epic','#b88cff',2.1,.3],['legendary','#f0b848',2.8,.4]]; // name, colour, stat multiplier, upgrade step it gives when melted down
const QUAL=['Plain','Fine','Runed','Ancient'];
const GEAR={fighter:['Greatsword','Harness','Headband','War Token'],tank:['Sword','Plate','Iron Band','Oath Seal'],assassin:['Daggers','Shadow Wrap','Mask','Knucklebone'],mage:['Staff','Robe','Hat','Glass Eye'],ranger:['Bow','Hood','Quiver','Fletcher\'s Knot'],healer:['Sun Staff','White Robe','Circlet','Candle Stub'],necro:['Skull Staff','Grave Robe','Bone Charm','Finger Bone']};
const STAT={dmg:['damage',6,'%'],spd:['attack speed',4,'%'],hp:['max health',2,''],guard:['chance to shrug off a hit',3,'%'],cdr:['faster skill recharge',5,'%'],mv:['move speed',3,'%'],sh:['faster shield recharge',8,'%'],mend:['faster mending',8,'%'],thr:['thrall and pet damage',10,'%'],mana:['max mana',6,'%'],ward:['chance to step clear of a trap or of the floor itself',7,'%']};
const slotStats=(c,slot)=>slot==='relic'?['ward','hp']:slot==='weapon'?['dmg','spd']:slot==='armor'?['hp','guard']:['cdr',c==='tank'?'sh':c==='healer'?'mend':c==='necro'?'thr':'mv'];
// an item is fully described by class, slot, rarity r (0-3), upgrade count lvl and upgrade total up; common items carry one stat line, the rest two
// m: a trinket of a casting class (CASTER) that carries max mana as its second line instead of the usual one; it is the only thing about an item that is rolled
const CASTER={mage:1,healer:1,necro:1};
/* ---------- round 15: sets and traits. A drop that is not common may carry the mark of a set; two pieces of a set worn give its first bonus, four its second. An epic or a legendary drop may also carry a trait: it changes how ONE skill of the class behaves ---------- */
// SETS[1..4] (0: no mark). SETK: the numbers. Not in versus. Seasoned heroes start without marks and without a relic (their equipment is the one every table of rounds 7-14 was tuned with).
const SETS=[null,
 {id:'road',name:'The Long Road',col:'#d9a441',two:'Closers hit 15% harder.',four:'Every closer takes 0.4 s off each skill that is recharging.'},
 {id:'margin',name:'The Thin Margin',col:'#6fe3ff',two:'A riposte hits 25% harder.',four:'A hairbreadth dodge throws a ring of force around you, and the next one may come a second sooner.'},
 {id:'kindled',name:'Kindled Marks',col:'#ff8a4a',two:'Setups last 3 seconds longer and payoffs hit 10% harder.',four:'A payoff takes 1.2 s off each skill that is recharging.'},
 {id:'well',name:'The Deep Well',col:'#b46cff',two:'10% more mana.',four:'Mana comes back a quarter faster.'}];
const SETK={road2:1.15,road4:.4,margin2:1.25,marginR:130,marginD:2.5,marginCd:1,kind2:3,kindK:1.1,kind4:1.2,well2:1.1,well4:1.25,pSet:[0,.3,.45,.6],pTr:[0,0,.25,.5],pRelic:.2};
// TRAITS[1..5]. An item's trait is tr:[kind, skill index 0-9]. echo: the skill is cast again `echoT` seconds later at `echoK` of its strength, for nothing; thirst: using it heals; fleet: readies the dash, quick feet for a moment;
// braced: blows on you are halved for a moment; blood: it costs no mana, and `blood` of the health you have instead (never the last point).
const TRAITS=[null,
 {id:'echo',name:'Twice-Told',text:s=>s+' is cast a second time a moment later, at 40% of its strength, for nothing.'},
 {id:'thirst',name:'Thirsting',text:s=>'Using '+s+' gives back 4% of your health.'},
 {id:'fleet',name:'Fleet',text:s=>'Using '+s+' readies your dash at once and quickens your step for 2 seconds.'},
 {id:'braced',name:'Braced',text:s=>'For 1.5 seconds after '+s+', every blow on you is halved.'},
 {id:'blood',name:'Blood-Paid',text:s=>s+' costs no mana. It takes 6% of the health you have instead, never the last of it.'}];
const TRK={echoT:.5,echoK:.4,thirst:.04,fleetT:2,braced:1.5,blood:.06};
const ECHOOPS=['shock','rush','fan','ringp','blast','line','field','hit','chain','heal','burst','seq','collect','sever','verdict'];
const setOk=v=>Number.isInteger(v)&&v>=1&&v<SETS.length,trOk=t=>Array.isArray(t)&&t.length===2&&Number.isInteger(t[0])&&t[0]>=1&&t[0]<TRAITS.length&&Number.isInteger(t[1])&&t[1]>=0&&t[1]<10;
function item(c,slot,r,lvl=0,up=0,m=0,set=0,tr=null){const keys=slotStats(c,slot).slice(0,r?2:1);m=m&&slot==='trinket'&&r>0&&CASTER[c]?1:0;if(m)keys[1]='mana';return{slot,name:QUAL[r]+' '+GEAR[c][ESLOTS.indexOf(slot)],rarity:RAR[r][0],r,lvl,up,m,keys,set:setOk(set)?set:0,tr:trOk(tr)?[tr[0],tr[1]]:null,c}}
const trName=(it,c)=>it.tr?TRAITS[it.tr[0]].name+' '+SKILLS[c||it.c||S.cls][it.tr[1]][1]:'';
const trText=(it,c)=>it.tr?TRAITS[it.tr[0]].text(SKILLS[c||it.c||S.cls][it.tr[1]][1]):'';
// the marks of an item in words: ' · The Long Road · Twice-Told Cleave'
const itemMarks=it=>(it.set?' · '+SETS[it.set].name:'')+(it.tr?' · '+trName(it):'');
let SETN=[0,0,0,0,0],TRON=new Map();
const setN=i=>VS||!S.cls||S.level<8?0:SETN[i];
// the traits worn that change skill si (kind ids), or null
const trOf=si=>VS||!S.cls||S.level<8?null:TRON.get(si)||null;
const trHas=(si,id)=>{const t=trOf(si);return!!t&&t.includes(id)};
const cdCut=s=>{if(P)for(let i=0;i<P.cdS.length;i++)if(P.cdS[i]>0)P.cdS[i]=Math.max(0,P.cdS[i]-s)};
const statV=(it,k)=>{const v=STAT[k][1]*RAR[it.r][2]*(1+it.up);return k==='hp'?Math.round(v):Math.round(v*10)/10};
const itemLine=it=>it.keys.map(k=>'+'+statV(it,k)+STAT[k][2]+' '+STAT[k][0]).join(', ');
const itemName=it=>it.name+(it.lvl?' +'+it.lvl:'');
const basicSet=c=>({weapon:item(c,'weapon',0),armor:item(c,'armor',0),trinket:item(c,'trinket',0)});
let EQ={};
function eqSync(){EQ={};SETN=[0,0,0,0,0];TRON=new Map();if(S.eq)for(const sl of ESLOTS){const it=S.eq[sl];if(!it)continue;for(const k of it.keys)EQ[k]=(EQ[k]||0)+statV(it,k);if(it.set)SETN[it.set]++;if(it.tr){const l=TRON.get(it.tr[1])||[];if(!l.includes(TRAITS[it.tr[0]].id))l.push(TRAITS[it.tr[0]].id);TRON.set(it.tr[1],l)}}}
const eqv=k=>S.level>=8&&S.cls&&EQ[k]||0;
// o: {luck: the better of two rolls (a trial's drop), min: the least rarity (the Red Door), rnd and cls: a fixed sequence for a class (a seasoned hero's equipment)}
function dropItem(n,o){
  o=o||{};const rnd=o.rnd||rand,c=o.cls||S.cls;
  const N=n+1,big=N%10===0,pL=Math.min(.25,.01+(N-9)*.004)*(big?4:1),pE=Math.min(.35,.05+(N-9)*.008)*(big?2:1);let x=rnd();if(o.luck)x=Math.min(x,rnd());for(let i=0;i<(o.more|0);i++)x=Math.min(x,rnd()); // more: further rolls, the best counts (a good mark, a dare met)
  const slot=SLOTS[Math.floor(rnd()*3)],r=Math.max(o.min||0,x<pL?3:x<pL+pE?2:big||x<pL+pE+.3?1:0);
  const m=slot==='trinket'&&r>0&&CASTER[c]&&rnd()<.4?1:0;
  if(!o.marks)return item(c,slot,r,0,0,m);
  // (round 15) marks: only real drops roll them, after everything else, so the item itself is the one of before
  const relic=rnd()<SETK.pRelic,set=rnd()<SETK.pSet[r]?1+Math.floor(rnd()*(SETS.length-1)):0;let tr=null;
  if(rnd()<SETK.pTr[r]){const k=1+Math.floor(rnd()*(TRAITS.length-1)),ok=[];for(let si=0;si<10;si++)if(SKLV[si]<=N+8&&(TRAITS[k].id!=='echo'||SKILLS[c][si][4].some(op=>ECHOOPS.includes(op[0])))&&(TRAITS[k].id!=='blood'||SKILLS[c][si][6]>0))ok.push(si);if(ok.length)tr=[k,ok[Math.floor(rnd()*ok.length)]]}
  return item(c,relic?'relic':slot,r,0,0,relic?0:m,set,tr);
}
const noBoons=()=>({might:0,haste:0,vigor:0,focus:0,fleet:0,well:0,spec:0});
// apex: the apex path (one of the ten ids of APEX). tr: trials passed (each is worth TMANA maximum mana). door: {id, n} the door chosen at a crossroads for floor n.
const S={sp:null,md:noAlts(),mode:'title',level:0,t:0,shake:0,stop:0,banner:0,clearT:0,cls:null,adv:null,apex:null,tr:0,door:null,b:noBoons(),elite:4,L:null,paused:false,rank:'',eq:null,scrap:0,load:load0(),wave:null};
let P,mons=[],shots=[],pshots=[],allies=[],zones=[],fields=[],bits=[],rings=[],floats=[],morsels=[],boss=null,obstacles=[],echoes=[];
// Every monster, enemy bolt, enemy blast and morsel carries an id, and every ally a nid, so that each can be named across the network in multiplayer.
let NEXTID=1;const nid=()=>NEXTID++;
// Multiplayer (MB.mp; the code is in the multiplayer section near the end). Everything about it is off unless MP.on.
// REM: set while the host applies what a remote member did to a monster. CL(): this game is a client, so the monsters are the host's to change.
const MP={on:false,role:'host',mode:'coop',vs:null,versus:true,remotes:[],count:1,myId:'',hostId:'',members:[],myIdx:0,down:false,away:false,colors:['#4fd8ff','#ff9f1a','#7dff5a','#b46cff','#ffe14a','#6a8cff','#3df5c0','#d8c8ff'],teamColors:['#2f9dff','#ffb21e'],
  cnt:1,slots:1,phase:'pick',g:0,lv:8,meReady:false,menu:false,under:null,note:'',toast:'',meter:null,hud:null,timer:0,rById:new Map(),byIdx:[],owe:[],ready:new Set(),mons:new Map(),qd:new Map(),ate:new Set(),hclk:{off:1e18},heroes:[],q:[],sd:[],rq:[],aq:[],lkq:[],elq:[],oeq:[],hsKey:''};
let REM=null,TELL=0;
// VS: the versus match (MB.mp.vs) while one runs, else null. VP: its private state. GEO: set while an attack is worked out that its victim decides for itself in versus (see the versus section).
let VS=null,VP=null,GEO=0;
const CL=()=>MP.on&&MP.role==='client'&&!VS;
// whom a monster fights: you; in multiplayer the nearest hero standing (the host decides)
const foe=m=>MP.on?mpFoe(m):P;
/* ---------- settings, events and run counters, shared with extras.js through MB ---------- */
const SET={music:.6,sfx:.8,haptic:1,btn:1,left:false,gfx:'high',hints:true,testUnlock:false,res:1,ui:1,camDist:'standard',shake:true,lock:(()=>{try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}})()}; // lock (round 15): the soft target lock; on by default where the first pointer is a finger // camDist: how far the camera stands (the view's; near, standard, far); shake: the screen shakes on heavy blows // res: render scale (0.5 to 1); ui: interface scale (0.8 to 1.5); // testUnlock: every checkpoint up to floor 201 counts as reached (for trying late content)
// the valid form of a setting, or undefined when the key or the value makes no sense
function setClean(k,v){
  if(k==='music'||k==='sfx'||k==='haptic'||k==='btn'){if(typeof v==='string'&&v.trim()!=='')v=+v;if(typeof v!=='number'||!isFinite(v))return;return k==='btn'?Math.max(.8,Math.min(1.4,v)):Math.max(0,Math.min(1,v))}
  if(k==='left'||k==='hints'||k==='testUnlock'||k==='shake'||k==='lock')return typeof v==='boolean'?v:undefined;
  if(k==='camDist')return v==='near'||v==='standard'||v==='far'?v:undefined;
  if(k==='res'||k==='ui'){if(typeof v==='string'&&v.trim()!=='')v=+v;if(typeof v!=='number'||!isFinite(v))return;return k==='res'?Math.max(.5,Math.min(1,v)):Math.max(.8,Math.min(1.5,v))}
  if(k==='gfx')return v==='high'||v==='low'||v==='ultra'?v:undefined;
}
const LIS={};
function on(name,fn){if(typeof fn!=='function')return()=>{};(LIS[name]||(LIS[name]=[])).push(fn);return()=>{const l=LIS[name],i=l.indexOf(fn);if(i>=0)l.splice(i,1)}}
function emit(name,data){for(const f of(LIS[name]||[]).slice())try{f(data)}catch(e){console.error('Ashes to Apex: a listener for "'+name+'" failed',e)}}
// counters for the current run; levelTime restarts with every level, the rest are saved with the run
const ST={kills:0,deaths:0,dmgDealt:0,dmgTaken:0,time:0,levelTime:0,bestLevel:0};
const stReset=()=>{for(const k in ST)ST[k]=0};
const act2=()=>S.level>=8,cls=()=>act2()?S.cls:null,pw=n=>!!S.cls&&S.level-8>=n;
const ADV={berserker:{d:1.5,c:1.6},sharpshooter:{d:1.75},reaper:{d:2},archmage:{k:.5},champion:{d:1.5,hp:6},duelist:{c:1.5,s:1.15},nightblade:{d:1.6},phantom:{k:.4,s:1.1},inquisitor:{d:1.6}};
const adv=k=>(ADV[S.adv]||{})[k];
/* ---------- round 14: the frame (stat points). Three points come with every floor cleared since the class was taken; five stats to put them in ---------- */
// The tower keeps pace with an even frame: par = base + budget/5 in every stat is the hero of before round 14, exactly. What a stat gives is ((stat/par+1)/2)^e, so it is the
// same share at every height: everything in one stat (five times par) gives 3^e, nothing in it (late in the climb) about 0.55^e. auto: the points are spread evenly (every stat at par).
// e: dmg (Sinew: all damage of the hero's own), as / mv / dash (Nerve: attack speed, pace, dash recharge), hp (Marrow), mana / cd (Breath: the pool, skill recharge), find (Omen: morsels).
// Omen above par: telling blows (tell x (f^2-1), at most tellMax; tellK times the damage) and more rolls for a drop; below par: glancing blows (glance x (1-f^2); glanceK). Not in versus.
const FR={ids:['sinew','nerve','marrow','breath','omen'],names:['Sinew','Nerve','Marrow','Breath','Omen'],per:3,base:6,e:{dmg:.45,as:.4,mv:.12,dash:.2,hp:.5,mana:.35,cd:.3,find:.8},tell:.12,tellMax:.5,tellK:1.5,glance:.25,glanceK:.7,more:1.5,
  text:['Everything you do hits harder: blows, bolts and skills alike.','You attack faster, move a little faster, and your dash is ready sooner.','More health.','A deeper mana pool, and skills that recharge sooner.','Telling blows that hit half again as hard, better drops and more morsels. Below the even line some of your blows only glance.']};
const frNew=()=>({auto:true,asked:false,p:[0,0,0,0,0]});
const frBudget=(lv=S.level)=>S.cls?FR.per*Math.max(0,lv-8):0;
const frSpent=()=>S.sp.p[0]+S.sp.p[1]+S.sp.p[2]+S.sp.p[3]+S.sp.p[4];
const frLeft=()=>S.sp.auto?0:Math.max(0,frBudget()-frSpent());
const frPar=()=>FR.base+frBudget()/5;
const frF=i=>!S.sp||S.sp.auto||VS||!S.cls||S.level<8?1:((FR.base+S.sp.p[i])/frPar()+1)/2;
const frK=(i,e)=>{const f=frF(i);return f===1?1:Math.pow(f,e)};
// the chance that a blow of mine is a telling one (> 0) or a glancing one (< 0)
const frTell=()=>{const f=frF(4);return f>1?Math.min(FR.tellMax,FR.tell*(f*f-1)):f<1?-FR.glance*(1-f*f):0};
// more points placed than the floor gives (a save from higher up, a hand-edited one): the largest stats give them back
function frFix(){const s=S.sp;if(!s||!Array.isArray(s.p)||s.p.length!==5){S.sp=frNew();return}for(let i=0;i<5;i++)s.p[i]=Math.max(0,Math.min(30000,Math.floor(+s.p[i])||0));let over=frSpent()-frBudget();
  while(over>0){let j=0;for(let i=1;i<5;i++)if(s.p[i]>s.p[j])j=i;const k=Math.min(s.p[j],Math.max(1,Math.ceil(over/5)));if(k<=0)break;s.p[j]-=k;over-=k}}
// spread n points by weights w (five numbers); the rest of a division goes to the heaviest first
function frSpread(n,w){const s=S.sp,t=w.reduce((a,v)=>a+v,0)||1,ord=[0,1,2,3,4].sort((a,b)=>w[b]-w[a]);let used=0;const add=w.map(v=>{const k=Math.floor(n*v/t);used+=k;return k});for(let q=0;used<n;q++){add[ord[q%5]]++;used++}for(let i=0;i<5;i++)s.p[i]+=add[i]}
const frIn=v=>{const s=frNew();if(Array.isArray(v)&&v.length===7&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=30000)){s.auto=!!v[0];s.asked=!!v[1];s.p=v.slice(2)}return s};
const frOut=()=>[S.sp.auto?1:0,S.sp.asked?1:0,...S.sp.p];
// what MB.frame hands out: {auto, asked, budget, left, par, stats:[{id, name, text, value, points, f, lines:[...]}]}
const frPct=k=>(k>=1?'+':'')+Math.round((k-1)*100)+'%';
function frLines(i){const E=FR.e,f=frF(i);if(i===0)return['Damage '+frPct(Math.pow(f,E.dmg))];if(i===1)return['Attack speed '+frPct(Math.pow(f,E.as)),'Pace '+frPct(Math.pow(f,E.mv)),'Dash recharge '+frPct(Math.pow(f,E.dash))];
  if(i===2)return['Health '+frPct(Math.pow(f,E.hp))];if(i===3)return['Mana '+frPct(Math.pow(f,E.mana)),'Skill recharge '+frPct(Math.pow(f,E.cd))];
  const t=frTell();return[t>0?'Telling blows '+Math.round(t*100)+'%':t<0?'Glancing blows '+Math.round(-t*100)+'%':'No telling or glancing blows','Morsels '+frPct(Math.pow(f,E.find))+(f>1?', luckier drops':'')]}
function frInfo(){if(!S.cls||!S.sp)return null;const par=frPar();return{auto:S.sp.auto,asked:S.sp.asked,budget:frBudget(),left:frLeft(),par,per:FR.per,stats:FR.ids.map((id,i)=>({id,name:FR.names[i],text:FR.text[i],points:S.sp.auto?frBudget()/5:S.sp.p[i],value:S.sp.auto?Math.round(par):FR.base+S.sp.p[i],f:frF(i),lines:frLines(i)}))}}
// a stat has changed: the body follows at once (health keeps its share, mana its amount)
function frApply(){if(P&&S.cls&&act2()){const k=P.maxHp?P.hp/P.maxHp:1,m=bodyHp();if(m!==P.maxHp){P.maxHp=m;P.hp=Math.max(P.hp>0?1:0,Math.min(m,Math.round(m*k)))}P.maxMana=manaMax();if(P.mana>manaRoom())P.mana=manaRoom()}emit('frame',frInfo());hud()}
function frSet(o){ // MB.frameSet({auto}|{add:[i,n]}|{reset:true}|{spread:true}|{asked:true}) -> the new MB.frame, or null when it cannot be done (no class, versus)
  if(!S.cls||!S.sp||VS||!o)return null;const s=S.sp;
  if(o.asked)s.asked=true;
  if(o.auto===true){s.auto=true;s.asked=true}
  if(o.auto===false&&s.auto){s.auto=false;s.asked=true;s.p=[0,0,0,0,0];const b=frBudget(),e=Math.floor(b/5);for(let i=0;i<5;i++)s.p[i]=e} // taking over starts from the even frame; what does not divide is left to place
  if(o.reset&&!s.auto)s.p=[0,0,0,0,0];
  if(o.spread&&!s.auto)frSpread(frLeft(),[1,1,1,1,1]);
  if(Array.isArray(o.add)&&!s.auto){const i=o.add[0]|0,n=Math.min(frLeft(),Math.max(0,o.add[1]|0));if(i>=0&&i<5)s.p[i]+=n}
  if(Array.isArray(o.weights)&&o.weights.length===5){s.auto=false;s.asked=true;s.p=[0,0,0,0,0];frSpread(frBudget(),o.weights.map(v=>Math.max(0,+v||0)))}
  frFix();frApply();if(S.mode==='play'||S.mode==='clear')save(S.level);return frInfo()}
let frStepN=1;
function frameScreen(done){
  const s=S.sp,I=frInfo(),left=I.left,again=()=>frameScreen(done),step=Math.min(frStepN,Math.max(1,left));
  show({wide:true,list:matchMedia('(max-width:600px),(max-height:500px)').matches,cls:'framePanel',kick:'Your frame · floor '+(S.level+1)+' · '+(s.auto?'spread evenly for you':left?left+(left>1?' points':' point')+' to place':'every point placed'),title:s.auto?'An even frame':'Shape your frame',
    body:(matchMedia('(max-width:600px),(max-height:500px)').matches?'':FR.per+' points come with every floor. ')+'The Spire keeps pace with an even frame: '+Math.round(I.par)+' in every stat on this floor. A stat above that line gives more than the Spire expects, a stat below it gives less.'+(s.auto?' Yours is kept even for you.':''),
    keys:s.auto?'':'Pick a stat to put '+(step>1?step+' points':'a point')+' into it.'+(left?'':' Nothing is left to place. Start over takes every point back, so you can move them.'),
    cards:I.stats.map((st,i)=>({title:st.name+' · '+st.value,sub:st.lines.join(' · '),col:st.f>1.0001?'#7fd66b':st.f<.9999?'#ff8a4c':'',cls:'frCard',data:{fr:st.id},body:st.text,fn:()=>{if(!s.auto&&left>0)frSet({add:[i,step]});again()}})),
    btns:[['Done',()=>{s.asked=true;if(S.mode==='play'||S.mode==='clear')save(S.level);done()}],
      ...(s.auto?[['Place the points myself',()=>{frSet({auto:false});again()}]]:[
        ...(left>1?[[frStepN===1?'Place 5 at a time':frStepN===5?'Place 25 at a time':'Place 1 at a time',()=>{frStepN=frStepN===1?5:frStepN===5?25:1;again()}]]:[]),
        ...(left?[['Spread the rest evenly',()=>{frSet({spread:true});again()}]]:[]),
        ['Start over',()=>{frSet({reset:true});again()}],['Keep it even for me',()=>{frSet({auto:true});again()}]])]});
}
// the reward flow asks once what kind of player this is, and afterwards shows the frame whenever points wait
function frameAsk(next){
  const s=S.sp;if(!S.cls||!s||VS||frBudget()<=0)return next();
  if(!s.asked)return show({soft:true,cls:'framePanel',kick:'Your frame · '+frBudget()+' points',title:'A body to shape',body:'From here every floor gives you '+FR.per+' points for your frame: Sinew (damage), Nerve (speed), Marrow (health), Breath (mana and skills) and Omen (luck). An even frame is what the Spire expects of you; leaning into a stat puts you ahead in it and behind in the others. You can change your mind at any time from the pause screen.',
    btns:[['Keep it even for me',()=>{frSet({auto:true});next()}],['Place the points myself',()=>{frSet({auto:false});frameScreen(next)}]]});
  if(!s.auto&&frLeft()>0)return frameScreen(next);
  next();
}
const zealK=()=>{const L=P&&!VS&&LNG[S.cls];return L&&act2()?(L.base||1)*(LNG[S.adv]||1)*(1+Math.min(L.cap,L.k*(P.zeal||0))):1};
// AXK: per-build factors of the apex tier (round 11; measured, see r11-balance/NOTES.md): what a build's own damage and its path's damage (UD) are multiplied by, per side and, for the few that still stood out, per path. Not in versus.
const AXK={side:{dominion:{archmage:.85,beastmaster:.9,berserker:1.1,duelist:1.1,lich:.8,paladin:1.1,phantom:1.1,reaper:.8,saint:1.1},order:{archmage:.85,duelist:1.15,inquisitor:.9,phantom:1.15,reaper:.8}},path:{tide:{lich:.8}}};
const axK=()=>{if(!S.apex||VS||!APEX[S.apex])return 1;const a=S.adv,p=AXK.path[S.apex];return(AXK.side[APEX[S.apex].side][a]||1)*(p&&p[a]||1)};
const zealAdd=()=>{const L=P&&LNG[S.cls];if(L)P.zeal=(P.zeal||0)+L.ev};
const dmgMul=()=>frK(0,FR.e.dmg)*zealK()*axK()*(ORDS()?apxSt()[0]*(1+(P&&P.resB||0)):1)*(P&&P.rageT>0?1.4:1)*(1+eqv('dmg')/100+(S.level>=8?S.scrap*.01:0))*(1+.2*S.b.might)*(adv('d')||1)*(S.cls==='fighter'&&pw(3)?1.25:1)*(S.cls==='healer'&&pw(3)?1.6:1)*(S.cls==='tank'&&pw(3)?1.25:1);
const cdMul=()=>1/(frK(1,FR.e.as)*(P&&P.pdT>0&&MP.on?(VS?PD.hasteVs:PD.hasteK):1)*(P&&P.haste>0?1+AX.storm.as*P.haste:1)*(P&&P.rageT>0?1.25:1)*(1+eqv('spd')/100)*(1+.1*S.b.haste)*(adv('c')||1)*(S.cls==='fighter'?(1+.08*S.b.spec)*(pw(3)?1.15:1):1));
const skMul=i=>{const k=frK(3,-FR.e.cd)*Math.pow(.88,S.b.focus)*(1-Math.min(.5,eqv('cdr')/100))*(S.adv==='phantom'?(i?1:.4):adv('k')||1);return i>9?Math.max(.5,k):k}; // Phantom only speeds up Shadowstep
// mana: the pool, what a skill costs right now, and how fast the free part of the pool refills (per second, before the standing bonus)
const manaMax=()=>{const c=cls();return c?Math.round((MANA0[c]+MWELL*S.b.well+MLEVEL*Math.max(0,S.level-8)+TMANA*(S.tr||0))*(1+eqv('mana')/100)*(setN(4)>=2?SETK.well2:1)*frK(3,FR.e.mana)):0};
const skRise=()=>1+MRISE*Math.max(0,S.level-8);
const skCost=si=>{const c=cls(),d=c&&skD(c,si);if(d&&trHas(si,'blood'))return 0;return d?Math.max(1,Math.round(d[6]*skRise()*(S.adv==='archmage'?.8:1)*(S.adv==='phantom'&&si===0?.5:1)*(ORDS()?ORDCOST:1))):0};
const num=v=>Math.round(v).toLocaleString('en-US');
const manaRoom=()=>P?Math.max(0,P.maxMana-P.resv):0;
const manaRate=()=>hcap('nomana')||xtw('dry')?0:manaRoom()*MREGEN*(1+Math.min(MWELLRMAX,MWELLR*S.b.well))*(S.adv==='saint'?1.25:1)*(ORDS()?ORDMANA:1)*(setN(4)>=4?SETK.well4:1);
function manaGive(v){if(!P||!P.maxMana||hcap('nomana'))return;P.mana=Math.min(manaRoom(),P.mana+v)}
function manaSync(){if(!P)return;MANA.cur=Math.floor(P.mana+1e-6);MANA.max=P.maxMana;MANA.reserved=P.resv;MANA.drawing=P.drawK>0&&P.mana<manaRoom()-.01;MANA.regen=P.maxMana&&P.mana<manaRoom()-.01?Math.round(manaRate()*(1+(MDRAW-1)*P.drawK)*10)/10:0}
// a skill that was asked for and cannot be paid: a soft sound and a flag for the HUD (which button, when), and nothing else
const manaCue={i:-1,at:-1e9,n:0};
function noMana(si){const now=performance.now();if(now-manaCue.at>250){SND.nomana();haptic(8)}manaCue.i=S.load.indexOf(si);manaCue.at=now;manaCue.n++}
// every step: the free part of the pool refills, faster the longer you have stood still; while the standing bonus flows, motes drift in from the room
function manaStep(dt){
  if(!P.maxMana||hcap('nomana')||xtw('dry'))return; // (an ordeal: the pool you walk in with is all there is; Dry Air in an aside: only kills feed it)
  P.still=P.moving||P.dashT>0?0:P.still+dt;P.drawK=Math.max(0,Math.min(1,(P.still-STILL0)/STILL1));
  const room=manaRoom();
  if(P.mana<room){P.mana=Math.min(room,P.mana+manaRate()*(1+(MDRAW-1)*P.drawK)*dt);
    if(P.drawK>0&&rand()<dt*(SET.gfx==='low'?7:14)*P.drawK){const a=rand()*TAU,d=62+rand()*40,v=230+rand()*90;bits.push({x:P.x+Math.cos(a)*d,y:P.y-6+Math.sin(a)*d,vx:-Math.cos(a)*v,vy:-Math.sin(a)*v,life:.42,max:.42,c:rand()<.6?'#6fe3ff':'#a98bff',r:2,mana:true})}}
  else if(P.mana>room)P.mana=room;
}
const aiK=m=>mspd()*(m.rage?(S.level<3?1.12:m.ai==='hollow'?1.15:1.3):1)*(m.spdK||1)*(m.id&&(hcap('swift')||xtw('swift'))?1.2:1); // (m.id: a monster, not a pet)
const melee=c=>!c||c==='tank'||c==='fighter'||c==='assassin';
const mspd=()=>S.level<8?1:Math.min(1.7,1.25+Math.max(0,S.level-12)*.01);
// What a blow costs. In the crypt (levels 1-8) a touch is 1 while you are learning and 2 from level 4; charges, lunges and ground blasts (heavy=1) hit half again as hard, a brush against a monster (heavy=-1) is lighter, and so are bolts.
// From level 9 a blow is a share of PHP(n), the health a player typically has on that level (14 on levels 9-12, then 0.85 more per level): SHARE = a brush 10%, a bolt, a beam or a trap 19%, a telegraphed blow 31%.
// So two or three telegraphed blows are most of a health bar, and extra health from Vigor or armour buys real room. On the boss levels (every tenth) every blow is BOSSDMG times that.
const PHP=n=>n<1?4:n<2?7:n<8?10:14+.85*Math.max(0,n-11);
const SHARE=[.1,.19,.31],BOSSDMG=1.1;
const blowAt=(n,heavy)=>{if(n<8){const b=n<3?1:2;return heavy>0?Math.round(b*1.5+.01):heavy<0?Math.max(1,Math.round(b*.6)):b}
  return Math.max(1,Math.round(PHP(n)*SHARE[heavy>0?2:heavy<0?0:1]*(tenth(n)?(n>=109?APEXDMG:BOSSDMG):1)))};
const blow=heavy=>{const k=S.level>=12?trialBlow():1;return k===1?blowAt(S.level,heavy):Math.max(1,Math.round(blowAt(S.level,heavy)*k))};
// healing scales with your health: f is a share of maximum health, never less than lo
const healP=(f,lo=1)=>{let v=Math.max(lo,Math.round(f*P.maxHp));if(VS)v=vsHeal(f,lo);if(hcap('halfheal'))v=Math.max(1,Math.round(v/2));if(S.cls==='healer'&&P.hp<P.maxHp)zealAdd();P.hp=Math.min(P.maxHp,P.hp+v);hud()};
// rank climbs with the levels once you have a trade: E at level 9, S by level 50, then S+1, S+2... every ten levels
const RANKS=[[50,'S'],[41,'A'],[32,'B'],[23,'C'],[15,'D'],[9,'E']];
// an apex hero stands in a band of its own above S: X from floor 101, X+1 from 110, X+2 from 120...
function rank(n=S.level){if(!S.cls||n<8)return'';const N=n+1;if(S.apex&&N>100)return N<110?'X':'X+'+Math.floor((N-100)/10);if(N>=60)return'S+'+Math.floor((N-50)/10);for(const[a,r]of RANKS)if(N>=a)return r;return''}
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
    if((skD(c,i)||SKILLS[c][0])[2]>=40){sfx(82,1,'sawtooth',.2,164);sfx(123,1,'triangle',.2,246,.05);noise(.9,.25,200,3000);[392,523.25,783.99].forEach((f,k)=>sfx(f,.5,'triangle',.12,0,.2+k*.12));return}
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
const solidR=o=>o.kind==='pillar'?(o.dead?0:o.r):o.kind==='brazier'?o.core:0;
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
function spawn(kind,x,y,isBoss,spec,raw){const s=spec||SPEC[kind];let hp=s.hp;if(kind==='mite'&&S.level>=8)hp=miteHp();if(kind==='husk')hp=Math.round(miteHp()*1.5);if(isBoss&&window.__mb&&window.__mb.hpK)hp=Math.round(hp*window.__mb.hpK);if(isBoss&&!VS&&tenth(S.level)&&R12())hp=Math.round(hp*FIN.hp*(R14()?PH.hp:1));if(MP.on&&!raw)hp=mpHp(hp,kind);const m={id:nid(),kind,s,ai:s.ai||kind,x,y,r:s.r,hp,maxHp:hp,boss:!!isBoss,st:'idle',t:1,n:0,flash:0,ring:0,ang:rand()*TAU,side:1,hits:0,seed:rand()*9,hidden:false,lift:0,mods:[],ward:0,beam:null};clamp(m,m.r);if(obstacles.length)collide(m,m.r,true);mons.push(m);return m}
function lesser(kind,x,y,hp,raw){const m=spawn(kind,x,y,false,lesserSpec(kind,S.level,hp),raw);m.lesser=true;m.spdK=.8;m.t=1+rand()*.6;puff(m,col(m.s.col),10);return m}
// a wave pack: one or two lesser monsters and a handful of mites, spread along the far side of the room from you
const LESSER=['crawler','hound','witch','fist','bomber'];
function spawnWave(){
  const n=S.level,w=S.wave,loud=S.L.door==='horde'?2:1,big=(w.n>1?2:1)*loud,py=MP.on?mpPartyY():P.y,far=py>H/2?150:H-150,base=GENHP,total=(3+(n>=30?1:0)-(w.n>1?1:0))*loud+(MP.on?mpPack():0); // small packs: one lesser monster and three mites, then two and two (the Loud Door: twice that)
  for(let j=0;j<big;j++){const kind=LESSER[(n+w.n*2+j*3)%LESSER.length],m=lesser(kind,W/2+(big>2?(j-1.5)*150:big>1?(j?170:-170):0),far,base[kind]*genMul(n)*.085);if(!j&&S.L.elN){eliteMake(m,0);eliteNews([ELITE.kinds[m.el-1]])}}
  for(let j=0;j<total;j++){const m=spawn('mite',W/2+(j-(total-1)/2)*70,far+(py>H/2?60:-60));m.t=1}
  w.hp0=mons.reduce((a,m)=>a+m.maxHp,0);S.waveT=.6;
  $('bossName').textContent='Wave '+w.n+' of '+w.of;
  floats.push({x:W/2,y:far-50,txt:w.of>1?'Pack '+w.n+' of '+w.of:'The pack',life:1.6,c:'#d6a544'});sfx(150,.4,'sawtooth',.2,90);
}
// the boss of a wave level walks in once the packs are dead, on the far side of the room from you
function enterBoss(){
  const L=S.L;S.wave=null;boss=spawn(L.kind,W/2,(MP.on?mpPartyY():P.y)>H/2?140:H-140,true,L.spec);arm(boss,L);boss.t=1.4;boss.ward=1;floorPay(boss,L);if(S.elDebt>0){boss.hp=Math.max(1,Math.round(boss.maxHp*(1-Math.min(.3,S.elDebt))));S.elDebt=0;floats.push({x:boss.x,y:boss.y-boss.r-44,txt:'It enters shaken',life:1.6,c:ELITE.col})}
  rings.push({x:boss.x,y:boss.y,life:.7,max:.7,r:boss.r+120,fx:true});puff(boss,col(boss.s.col),26,240);S.shake=Math.max(S.shake,.3);SND.roar();haptic([30,30,80]);
  floats.push({x:boss.x,y:boss.y-boss.r-20,txt:L.spec.name,life:1.8,c:'#ff5b6e'});$('bossName').textContent=L.spec.name;
}
// give a boss its modifiers
function arm(m,L){m.mods=(L.mods||[]).slice();if(m.mods.includes('swift'))m.spdK=1.12;m.shT=5;m.burnT=2.5;m.fifth=4;m.thornT=0;m.splitN=2;if((L.door==='wrath'||L.floorKind==='race')&&m.ai!=='hollow')m.rage=true;brkArm(m)} // (the Red Door, and a race: enraged from the start)
function bossBar(){
  if(boss)$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';
  else if(TR&&TR.dur&&!S.wave)$('bossFill').style.width=(TR.cleared?0:Math.max(0,100-TR.t/TR.dur*100))+'%'; // a trial with no monster of its own: the bar is the time left
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
    if(hit){quake(.25);sfx(70,.2,'square',.35,40);if(E)ringShot(m,8,150,rand()*TAU);objRam(m)}
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
    {const B=m.beam;B.on=on;B.rays.forEach((r,i)=>{r.a=m.ba+i*TAU/n;r.len=rayLen(m.x,m.y,r.a);if(on&&m.beam===B){if(SIDE)beamHits(m,r);else if(segDist(P,m.x,m.y,r.a,r.len)<B.w+9)hurtP(blow(0),'beam')}})}
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
  dummy(m,dt){const d=Math.hypot(W/2-m.x,170-m.y);if(d>6)move(m,Math.atan2(170-m.y,W/2-m.x),60,dt)},
  hollow(m,dt,a){
    const ph=m.phase||1,crown=m.s.crown,g=[1,.8,.65][ph-1];
    if(m.vol>0&&(m.vol-=dt)<=0){ringShot(m,12,160,a+.26*m.volN);if(--m.volN>0)m.vol=.32}
    if(m.spiral>0){m.spiral-=dt;if((m.spT-=dt)<=0){m.spT=.11;m.spA+=.33;for(let i=0,n=crown&&ph>=3?4:2;i<n;i++)shoot(m.x,m.y,m.spA+i*TAU/n,170)}}
    if(m.chase>0&&(m.chT-=dt)<=0){m.chT=.4;m.chase--;zone(T.x,T.y,62,.8,m)}
    const faces=crown&&phOn(m);
    if(m.st==='shift'){if((m.t-=dt)<=0)phaseBegin(m);return}
    if(m.st==='aim'||m.st==='beam'){const K=PH.atk.reap,n=ph>=3?3:2,on=m.st==='beam';
      if(!on){if(m.t>.4)m.ba=a;if((m.t-=dt)<=0){m.st='beam';m.t=ph>=3?K.dur3:K.dur;m.bs=Math.sin(a-m.ba)>=0?1:-1;quake(.15);sfx(110,.5,'sawtooth',.25,70);noise(.4,.2,2400,600)}}
      else{m.ba+=m.bs*(ph>=3?K.turn3:K.turn)*dt;if((m.t-=dt)<=0){m.st='idle';m.t=1.1*g;m.beam=null;return}}
      if(!m.beam||m.beam.rays.length!==n)m.beam={on:false,w:12,rays:Array.from({length:n},()=>({a:0,len:0}))};
      {const B=m.beam;B.on=m.st==='beam';B.rays.forEach((r,i)=>{r.a=m.ba+i*TAU/n;r.len=rayLen(m.x,m.y,r.a);if(B.on&&m.beam===B){if(SIDE)beamHits(m,r);else if(segDist(P,m.x,m.y,r.a,r.len)<B.w+9)hurtP(blow(0),'beam')}})}return} // (round 15: B, not m.beam: a hero whose block answers with a shockwave can push the tyrant into its next face from inside this loop, and the shift takes the beam away)
    if(m.st==='leap'){const K=PH.atk.sky;m.t-=dt;const p=Math.min(1,1-m.t/m.dur);m.x=m.sx+(m.tx-m.sx)*p;m.y=m.sy+(m.ty-m.sy)*p;m.lift=Math.sin(p*Math.PI);clamp(m,m.r);
      if(m.t<=0){m.lift=0;m.st='idle';m.t=1*g;quake(.3);const b=rand()*TAU;for(let i=0;i<K.ring;i++)zone(m.x+Math.cos(b+i*TAU/K.ring)*K.ringR,m.y+Math.sin(b+i*TAU/K.ring)*K.ringR,K.ringZ,K.after,m);ringShot(m,10,150,b)}return}
    if(m.st==='idle'){move(m,a,[62,84,100][ph-1],dt);if((m.t-=dt)<=0){const sq=faces?PH.seq[ph-1]:null,k=sq?sq[m.n++%sq.length]:m.n++%(ph>1||crown?5:4);
      if(k===5){m.st='aim';m.t=PH.atk.reap.aim;m.ba=a;m.beam=null;sfx(900,.9,'sine',.12,1500)}
      else if(k===6){const K=PH.atk.sky;m.st='leap';m.t=m.dur=K.dur;m.sx=m.x;m.sy=m.y;m.tx=T.x;m.ty=T.y;zone(T.x,T.y,K.r,K.dur,m);sfx(300,.4,'sine',.2,90)}
      else if(k===0){m.st='wind';m.t=ph>=3?.5:.7;m.again=0}
      else if(k===1){ringShot(m,12,160,a);m.volN=ph-1;if(m.volN)m.vol=.32;m.t=1.4*g}
      else if(k===2){zone(T.x,T.y,85,.9,m);for(let i=0;i<3;i++){const b=a+i*TAU/3;zone(T.x+Math.cos(b)*150,T.y+Math.sin(b)*150,70,1.25,m)}if(ph>=2){m.chase=crown?4:2;m.chT=.7}m.t=1.6*g}
      else if(k===3){for(let i=0;i<=ph;i++)if(broodOk(m,5+ph)){const b=rand()*TAU;brood(m,'mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}m.t=1.2*g}
      else{m.spiral=1.5;m.spT=0;m.spA=a;m.t=1.9*g}}}
    else chargeStates(m,dt,a,.9*g,ph>=3);
  },
};
/* ---------- round 14: the faces of a tyrant. The King and the tyrants (the monster of every tenth floor) shift at 2/3 and 1/3 of their health ---------- */
// A shift is a beat of PH.beat seconds in which nothing can hurt the tyrant and it does not strike (m.st 'shift'), with a banner (the 'bossPhase' event). Then the new face begins with its new attack,
// and a hazard of the floor starts: zones that fall by a pattern of their own, far lighter than a blast of the tyrant's (they weigh what a brush against a monster does; z.hz).
// first: on floor 10, the first tyrant a hero meets, the hazards come this much more slowly.
// atk: the attack each face adds. reap: two (three in the last face) rays through the tyrant, a line that locks and then sweeps after its target; sky: it leaps on its target and the ground bursts around where it lands.
// haz: cinder: embers fall where each hero is going and at random; ring: the rim of the floor gives way, then its heart, in turn; harrow: a row of ruin walks across the floor, with a gap that wanders.
// order: which two hazards a tyrant brings (second face, last face), by its place among the tyrants. hp: what the health of a tenth-floor monster is multiplied by so the fight stays as long as it was (measured).
const PH={beat:1.8,hp:1,first:1.5,titles:['','The Second Face','The Last Face'],
  atk:{reap:{name:'Reaping Light',text:'Its gaze becomes a line of light that sweeps after you. Step off the line, or dash through it.',aim:1,dur:2.4,turn:.5,dur3:2.6,turn3:.55},
       sky:{name:'Skyfall',text:'It leaps on you, and the floor bursts around where it lands.',dur:.9,r:95,ring:6,ringR:165,ringZ:62,after:.85}},
  haz:{cinder:{name:'Cinderfall',text:'Embers fall across the floor.',gap:2.8,gap3:2.2,r:58,warn:1.15,more:2},
       ring:{name:'Hollow Ground',text:'The floor gives way: first its rim, then its heart.',gap:4.4,gap3:3.6,warn:1.35},
       harrow:{name:'The Harrow',text:'A row of ruin walks the floor. Find the gap.',gap:5.6,gap3:4.6,warn:1.05,step:.42,r:54}},
  order:[['cinder','ring'],['harrow','cinder'],['ring','harrow']],seq:[[0,1,2,3,4],[5,0,1,2,3,4],[6,0,5,1,2,4,3]]};
const phOn=m=>!!m&&!!m.s.crown&&m.ai==='hollow'&&!VS&&R14(); // (a tyrant, on either side: a tyrant bound as a pet has the attacks too, but no hazard and no beat)
const R14=()=>!(window.__mb&&window.__mb.r14===false);
const phHaz=(n,ph)=>ph>=2?PH.order[Math.floor((n+1)/10)%PH.order.length][ph-2]:null;
// what MB.bossPhase hands out while a tyrant stands: {id, phase, of:3, title, shifting, t (seconds of the beat left), attack:{id,name,text}|null, hazard:{id,name,text}|null}
function phInfo(){const m=boss;if(!m||!phOn(m)||!m.boss)return null;const ph=m.phase||1,hz=phHaz(S.level,ph),at=ph>=3?'sky':ph>=2?'reap':null;
  return{id:m.id,phase:ph,of:3,title:PH.titles[ph-1],shifting:m.st==='shift',t:m.st==='shift'?Math.max(0,m.t):0,attack:at?{id:at,name:PH.atk[at].name,text:PH.atk[at].text}:null,hazard:hz?{id:hz,name:PH.haz[hz].name,text:PH.haz[hz].text}:null,x:m.x,y:m.y}}
// the hazard of the floor (host and alone): the pattern of its kind, every gap seconds
function hazStep(m,dt){
  const h=m.hz;if(!h||m.st==='shift'||S.banner>0||FN&&FN.state==='play')return;if((h.t-=dt)>0)return;
  const K=PH.haz[h.kind],last=(m.phase||1)>=3;h.t=(last?K.gap3:K.gap)*(S.level<10?PH.first:1);h.n=(h.n||0)+1;const hz=z=>{z.hz=1;return z},IN=WALL+50;
  if(h.kind==='cinder'){const hs=MP.on?mpHeroes():[P];for(const q of hs)hz(zone(q.x+(q.vx||0)*.6,q.y+(q.vy||0)*.6,K.r,K.warn));
    for(let i=0;i<K.more+(last?1:0);i++)hz(zone(IN+rand()*(W-2*IN),IN+rand()*(H-2*IN),K.r,K.warn+.15*i))}
  else if(h.kind==='ring'){if(h.n%2){const nx=7,ny=3;for(let i=0;i<nx;i++){const x=WALL+62+i*(W-2*WALL-124)/(nx-1);hz(zone(x,WALL+58,62,K.warn));hz(zone(x,H-WALL-58,62,K.warn))}for(let j=1;j<=ny;j++){const y=WALL+58+j*(H-2*WALL-116)/(ny+1);hz(zone(WALL+62,y,62,K.warn));hz(zone(W-WALL-62,y,62,K.warn))}}
    else{hz(zone(W/2,H/2,138,K.warn));for(let i=0;i<4;i++)hz(zone(W/2+(i<2?-1:1)*215,H/2+(i%2?-1:1)*52,84,K.warn))}}
  else{const cols=6,rows=5,dir=h.n%2?1:-1;let gap=Math.floor(rand()*rows);for(let c=0;c<cols;c++){const x=WALL+84+(dir>0?c:cols-1-c)*(W-2*WALL-168)/(cols-1);
      for(let r=0;r<rows;r++)if(r!==gap)hz(zone(x,WALL+60+r*(H-2*WALL-120)/(rows-1),K.r,K.warn+c*K.step));gap=Math.max(0,Math.min(rows-1,gap+(rand()<.5?-1:1)))}}
  sfx(h.kind==='ring'?80:h.kind==='cinder'?620:240,.5,'sawtooth',.12,h.kind==='cinder'?180:60);
}
// the banner of a shift, on every page: the event, and (when no view carries a band for it) a title in the arena
function phBanner(m){const I=phInfo();if(!I||m!==boss)return;emit('bossPhase',I);for(const k of[1,1.6])rings.push({x:m.x,y:m.y,life:PH.beat*k/1.6,max:PH.beat*k/1.6,r:m.r+150*k,fx:true});
  if(!window.MBPhaseBand){floats.push({x:W/2,y:H/2-120,txt:I.title,life:2.6,c:'#ff5b6e',big:1.8});if(I.attack)floats.push({x:W/2,y:H/2-84,txt:I.attack.name+(I.hazard?' · '+I.hazard.name:''),life:2.6,c:'#ffd95e',big:1.2})}}
function enrage(m,txt){
  m.rage=true;m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);
  floats.push({x:m.x,y:m.y-m.r-18,txt:txt||'Enraged',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90]);
}
// the three-phase bosses shrug off blows for a moment, throw a ring and call mites when a phase breaks
function phaseFx(m){
  if(phOn(m)&&m.boss&&tenth(S.level))phBanner(m);
  if(m.phase>=3)enrage(m,phOn(m)&&m.boss?' ':undefined);else{m.flash=.3;S.shake=Math.max(S.shake,.35);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+110,fx:true});puff(m,'#ff5b6e',22,260);if(!(phOn(m)&&m.boss&&tenth(S.level)))floats.push({x:m.x,y:m.y-m.r-18,txt:'It changes',life:1.5,c:'#ff5b6e'});SND.roar();haptic([40,30,90])}
}
function phaseShift(m){
  phaseFx(m);
  if(phOn(m)&&m.boss&&tenth(S.level)){ // a tyrant: the beat first (it stands, warded), the ring and the mites when the new face begins (phaseBegin)
    m.ward=PH.beat;m.st='shift';m.t=PH.beat;m.again=0;m.lift=0;m.beam=null;m.vol=0;m.spiral=0;m.chase=0;m.hz=null;
    if(has('taste')){const f={id:nid(),x:m.x+(rand()-.5)*120,y:m.y+m.r+40+rand()*40};clamp(f,10);collide(f,10,true);morsels.push(f)}return} // (the beat is a breath for the heroes too: it sheds a morsel)
  m.ward=1;m.st='idle';m.t=1;m.again=0;m.lift=0;ringShot(m,14,150,rand()*TAU);
  for(let i=0;i<2;i++)if(mons.length<8){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}
}
function phaseBegin(m){
  m.st='idle';m.t=.5;m.n=0;m.ward=0;ringShot(m,14,150,rand()*TAU);rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+130,fx:true});quake(.25);
  for(let i=0;i<2;i++)if(mons.length<8){const b=rand()*TAU;spawn('mite',m.x+Math.cos(b)*50,m.y+Math.sin(b)*50)}
  const k=phHaz(S.level,m.phase||1);m.hz=k?{kind:k,t:1.6,n:0}:null;
}
// a pet's blow is counted, and a vampiric pet feeds on it
function petFed(got){PETS.dmg+=got;const a=byPet;if(a.pet&&a.mods.includes('vampiric')&&a.hp>0&&a.hp<a.maxHp&&!(S.t-a.vAt<4)&&(a.vSum||0)<a.maxHp*.16){const h=Math.min(a.maxHp-a.hp,a.maxHp*.02);a.hp+=h;a.vAt=S.t;a.vSum=(a.vSum||0)+h;puff(a,'#b8263d',8,120)}}
function hurtM(m,d,quiet){
  if(m.vs){if(MINE>0)comboHit();return vsHit(m,d,quiet)}
  if(MINE>0&&!byPet&&!REM&&!m.decoy){const q=S.myT||(S.myT={m:null,t:0});q.m=m;q.t=S.t;if(!VS&&SET.lock&&!LK.hard){if(LK.m===m)LK.t=S.t;else if(!lockOk(LK.m)||S.t-LK.t>LOCK.keep)lockPut(m,false)}}
  if(MINE>0&&!byPet&&!REM&&d>0&&d<1e8){const tl=frTell();if(tl>0?rand()<tl:rand()<-tl){d*=tl>0?FR.tellK:FR.glanceK;if(tl>0){BIG=Math.max(BIG||0,1.4);TELL=1}else TELL=-1}}
  if(CL())return mpHurtM(m,d,quiet);
  if(XF&&XF.tw==='glass'&&d>0&&d<1e8)d*=XTW.glassK; // (round 16) Thin Skin
  if(m.decoy){puff(m,col('#3fa596'),16);ringShot(m,6,150,rand()*TAU);sfx(700,.2,'sine',.25,200);reshuffle();return}
  if(m.ward>0){SND.ward();return}
  if(FN&&FN.state==='play'&&m.id===FN.id&&!FINK)return; // (the last rite is being played on it)
  if(LNK){d=linkPay(m,d);if(m.brkMax)brkHit(m,BRK[LNK],'skill')}
  if(m.stagT>0)d*=BRK.more;
  if(MINE>0)comboHit();
  if(m.markT>0)d*=1.5;
  if(m.frozen>0)d*=AX.frost.more;if(m.soak>0)d*=1+AX.tide.soakMore;if(m.rot>0)d*=1+AX.plague.more*m.rot;
  // (the three-phase bosses shed morsels as their health falls: the Hollow at every fifth, the King and the tyrants at every eighth, because their fight is long and their blows are heavy)
  const before=m.hp;m.hp-=d;if(!REM)ST.dmgDealt+=Math.max(0,Math.min(d,before));
  if(byPet)petFed(Math.max(0,Math.min(d,before))); // 2% of its health, at most once in four seconds, 16% in a level: the monsters' own rule
  m.flash=.12;puff(m,col(m.s.col),5,120);SND.hit(quiet);if(!quiet)haptic(12);floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(Math.round(d*10)/10),life:.7,c:REM?'#958ea3':TELL>0?'#ffd95e':TELL<0?'#8f8aa0':'#e7dfcd',big:BIG||undefined,tell:TELL||undefined});TELL=0;
  const ch=m.maxHp/(m.s.crown?8:5);if(m.ai==='hollow'&&Math.floor(m.hp/ch)<Math.floor(before/ch)&&m.hp>0)morsels.push({id:nid(),x:m.x,y:m.y});
  if(m.boss&&m.hp>0){if(m.ai==='hollow'){const ph=m.hp<=m.maxHp/3?3:m.hp<=m.maxHp*2/3?2:1;if(ph>(m.phase||1)){m.phase=ph;phaseShift(m)}}else if(!m.rage&&m.hp<=m.maxHp*.4)enrage(m)}
  if(m.kind==='mimic'&&m.boss&&m.hp>0&&++m.hits%3===0)reshuffle();
  if(m.mods.length&&m.hp>0){
    if(m.mods.includes('thorned')){const t=Math.floor(m.hp/m.maxHp*5);if(t<m.fifth&&!(m.thornT>0)){m.fifth=t;m.thornT=.6;rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+60,fx:true});floats.push({x:m.x,y:m.y-m.r-18,txt:'Thorns',life:.9,c:'#d6a544'});sfx(700,.5,'square',.1,1400)}} // a fifth of its health gone: it bristles, and the thorns fly a moment later
    if(m.mods.includes('splitting')&&m.splitN>0&&m.hp<=m.maxHp*m.splitN/3){m.splitN--;const g=rand()*TAU,c=lesser(m.kind,m.x+Math.cos(g)*(m.r+30),m.y+Math.sin(g)*(m.r+30),m.maxHp*.07,true);c.s.col=m.s.col;
      rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+70,fx:true});floats.push({x:m.x,y:m.y-m.r-18,txt:'It splits',life:1.3,c:'#ff5b6e'});sfx(200,.3,'sawtooth',.2,400)}
  }
  if(m.hp<=0){
    mons=mons.filter(x=>x!==m);puff(m,col(m.s.col),m.boss?50:10,m.boss?320:160);ST.kills++;if(!m.boss&&P)manaGive(P.maxMana*MKILL);if(m.quarry&&DRE)dareEnd('done');
    if(m.boss){if(TU)return tutEnd(true);if(XF)return xfWin();floorClear()}
    else{if(XF)xfEv('kill');if(has('taste')&&rand()<.35*frK(4,FR.e.find)){const f={id:nid(),x:m.x,y:m.y};collide(f,10,true);morsels.push(f)}if(S.level>=12)fallen(m);if(m.frozen>0||m.rot>0||m.burn>0)stDeath(m);if(m.el)eliteFell(m)}
  }
}
// a vampiric boss feeds when it wounds a hero
function vamp(){
  if(boss&&boss.hp>0&&boss.mods.includes('vampiric')&&boss.hp<boss.maxHp&&!(S.t-boss.vAt<4)&&(boss.vSum||0)<boss.maxHp*.16){const h=Math.min(boss.maxHp-boss.hp,Math.round(boss.maxHp*.02));boss.hp+=h;boss.vAt=S.t;boss.vSum=(boss.vSum||0)+h;puff(boss,'#b8263d',12,140);floats.push({x:boss.x,y:boss.y-boss.r-10,txt:'+'+fmt(Math.round(h*10)/10),life:1,c:'#7fd66b'})}
}
function hurtP(d,src){
  if(P.inv>0||S.mode!=='play'||P.down||MP.away){if(P.inv>0&&P.dgT>0&&S.mode==='play'&&!P.down&&!MP.away)pdTry(d,src);return}
  if(window.__mb&&window.__mb.hits)window.__mb.hits[src]=(window.__mb.hits[src]||0)+1;
  if(TSRC.length&&TSRC[0].form==='ward'&&!(P.trCd>0)){P.trCd=2.5;P.trQ=1;P.trT=null} // hit, blocked or shrugged off: the ward answers
  if(P.guardT>0){zealAdd();P.inv=.4;puff(P,'#d6a544',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK/2);shock(115,2);return}
  if((src==='pit'||src==='spikes'||src==='brazier'||src==='hazard'||src==='floor')&&rand()*100<Math.min(60,eqv('ward'))){P.inv=.5;floats.push({x:P.x,y:P.y-44,txt:'Sure-footed',life:.8,c:'#d5dce2'});SND.ward();return}
  if(rand()*100<Math.min(40,eqv('guard'))){P.inv=.5;floats.push({x:P.x,y:P.y-44,txt:'Shrugged off',life:.8,c:'#d5dce2'});SND.ward();return}
  if(cls()==='tank'&&P.shield){zealAdd();P.shield=false;P.shT=0;P.inv=.6;puff(P,'#d5dce2',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK*(S.adv==='paladin'?2:1));if(S.adv==='paladin'&&P.hp<P.maxHp){healP(.1,2)}if(pw(1))shock(115,2);if(XF)xfEv('block');return}
  {const G=d<=blow(0)&&allies.find(a=>a.kind==='guardian'&&a.shield);if(G){G.shield=false;G.shT=8;G.flash=.2;P.inv=.5;puff(P,TCOL.healer,10);floats.push({x:P.x,y:P.y-44,txt:'Guarded',life:.8,c:TCOL.healer});SND.block();haptic(30);return}} // the guardian turns aside a blow that is not a heavy one
  if(P.plates>0&&S.apex==='stone'){if(d>blow(0)){plateBreak();d=Math.round(d*AX.stone.leak);if(d<1)return}else d=Math.max(1,Math.round(d*(1-AX.stone.chip*P.plates)))} // a plate breaks a heavy blow: only `leak` of it reaches you; a light one gets through
  if(P.stoneT>0)d=Math.ceil(d/2);
  if(XF)d=xfBlow(d);
  ST.dmgTaken+=Math.max(0,Math.min(d,P.hp));P.hp-=d;P.inv=1;S.shake=.3;S.stop=.06;comboEnd();if(P.revT>0)P.revT=0; // (a wound breaks off the raising of an ally)if(TR&&TR.kind==='guard'&&TR.obj&&!CL())for(let i=0;i<TK.vigWound;i++)lampHit(TR.obj); // (round 13) a keeper's wound is the lamp's
  const saved=P.hp<=0&&S.adv==='saint'&&!P.saved;haptic(P.hp>0||saved?70:[120,60,320]);if(has('touch'))floats.push({x:P.x,y:P.y-44,txt:'-'+d,life:.8,c:'#ff5b6e'});puff(P,has('skin')?'#b8263d':'#e7dfcd',8);SND.hurt();hud();
  if(CL())mpQ(['vp']);else vamp();
  if(saved){P.saved=true;P.hp=Math.ceil(P.maxHp/2);P.inv=2;hud();shock(140,3);floats.push({x:P.x,y:P.y-52,txt:'Saved',life:1.3,c:'#d6a544'});SND.skill('healer')}
  if(P.hp<=0){if(MP.on)return mpDown();if(XF)return xfFail('You came apart');S.mode='dead';SND.dead();ST.deaths++;save(S.level);
    show({kick:'You came apart',title:has('skin')?'Flesh fails':'A pile of bones again',body:'You keep everything you have won back so far. '+(TR&&!boss&&TR.dur?S.L.name+' is not over.':S.L.spec.name+' is still waiting.'),btns:[['Try floor '+(S.level+1)+' again',()=>startLevel(S.level)]]});
    emit('death',{level:S.level})}
}

/* ---------- round 15: the lock. Blows and skills that are not aimed by a pointer keep to one monster instead of always taking the nearest ---------- */
// soft (the setting `lock`, on by default on touch): the monster my blows last landed on stays the target for `memo` seconds, while it is in reach. hard: chosen with the cycle button (Tab or Y, the Target button)
// or, on touch, by tapping a monster: it stays the target until it falls, hides for good or the floor ends; cycling past the last one frees the aim again. Those who fight for me under "Attack my target" go for a hard lock.
// A melee blow only keeps to the lock while it is within `melee` times its reach; otherwise the nearest is struck as always. Not in versus (the aim there is the same for everyone, as before).
const LOCK={memo:3.5,melee:1.5,tap:36,keep:.4};
let LK={m:null,hard:false,t:-9};
const lockSet=()=>!VS&&!!SET.lock;
const lockOk=m=>!!m&&mons.includes(m)&&m.hp>0&&!m.decoy;
function lockInfo(){const m=lockNow();return{on:lockSet(),id:m?m.id:0,hard:!!m&&LK.hard,name:m?m.s.name:'',x:m?m.x:0,y:m?m.y:0,r:m?m.r:0,boss:!!m&&m.boss,count:mons.filter(x=>!x.hidden&&!x.decoy&&x.hp>0).length}}
function lockNow(){
  if(VS||!P||!LK.m)return null;const m=LK.m;if(!lockOk(m)){LK.m=null;LK.hard=false;emit('lock',lockInfo());return null}
  if(!LK.hard&&!(lockSet()&&S.t-LK.t<LOCK.memo))return null;return m.hidden?null:m}
function lockPut(m,hard){const same=LK.m===m&&LK.hard===hard;LK.m=m;LK.hard=hard;LK.t=S.t;if(!same)emit('lock',lockInfo())}
function lockDrop(){if(!LK.m)return;LK.m=null;LK.hard=false;emit('lock',lockInfo())}
// the next monster by distance; after the farthest: none
function lockCycle(){
  if(VS||!P||P.down||S.mode!=='play')return false;const SR=sightR(),l=mons.filter(m=>!m.hidden&&!m.decoy&&m.hp>0&&(!SR||dist(m,P)-m.r<SR)).sort((a,b)=>dist(a,P)-a.r-dist(b,P)+b.r);
  if(!l.length){lockDrop();return false}const i=LK.hard?l.indexOf(LK.m):-1;
  if(LK.hard&&i===l.length-1){lockDrop();floats.push({x:P.x,y:P.y-56,txt:'Aim free',life:.8,c:'#958ea3'});sfx(520,.08,'triangle',.12,390);return true}
  lockPut(l[i+1],true);sfx(660,.08,'triangle',.14,990);haptic(12);return true}
// a finger comes down on a monster: it is the target
function lockTap(pt){if(!lockSet()||!pt)return;let best=null,bd=1e9;for(const m of mons){if(m.hidden||m.decoy||m.hp<=0)continue;const d=Math.hypot(m.x-pt.x,m.y-pt.y)-m.r;if(d<LOCK.tap&&d<bd){bd=d;best=m}}if(best){lockPut(best,true);haptic(12)}}
/* ---------- player ---------- */
const keys={},want={atk:false,dash:false,skill:false,sk:[false,false,false,false,false,false],pt:null},joy={x:0,y:0};
function aim(pt,range,spd){
  if(pt)return Math.atan2(pt.y-P.y,pt.x-P.x);
  // nearest first, but never something warded while anything else is in reach, and with a ranged weapon the boss wins unless something small is close enough to bite
  let best=null,bd=1e9;const far=range>500,SR=sightR(),LM=lockNow();if(LM){const d=dist(LM,P)-LM.r;if(d<range*(far?1:LOCK.melee)&&(!SR||d<SR)){best=LM;bd=-1e9}}
  if(!best)for(const m of mons){if(m.hidden)continue;const d=dist(m,P)-m.r;if(d<range&&(!SR||d<SR)){const sc=d+(m.ward>.3?2000:0)-(far&&m.boss?200:0);if(sc<bd){bd=sc;best=m}}}
  if(best&&spd&&best.vx!==undefined&&best.st!=='charge'&&best.st!=='lunge'){const k=Math.min(.6,dist(best,P)/spd);return Math.atan2(best.y+best.vy*k-P.y,best.x+best.vx*k-P.x)} // auto-aim leads a moving target
  return best?angTo(P,best):P.face;
}
function pshot(a,spd,dmg,r,kind,pierce){pshots.push({x:P.x+Math.cos(a)*16,y:P.y-4+Math.sin(a)*16,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r,dmg,kind,pierce:pierce===true?99:pierce||0,hit:new Set(),sx:P.x,sy:P.y,lk:LNK,sk:TAGOK>0,alt:AK.tag||undefined,altD:AK.tag?dmgMul():0})}
function shock(r,d){
  rings.push({x:P.x,y:P.y,life:.4,max:.4,r,fx:true});if(MP.on)MP.rq.push(VS?[Math.round(P.x),Math.round(P.y),Math.round(r),40,Math.round(d*dmgMul()*100)/100]:[Math.round(P.x),Math.round(P.y),Math.round(r),40]);
  GEO++;MINE++;for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,P)<r+m.r){hurtM(m,d*dmgMul());if(AK.tag&&mons.includes(m))debuff(m,AK.tag,dmgMul())}MINE--;GEO--;
  objBlow(P.x,P.y,r,true);
  clearShots(P,r+10);S.shake=.3;noise(.25,.4);sfx(70,.3,'square',.35,35);haptic(50);
}
function ally(kind,life){const a=rand()*TAU;return{nid:nid(),kind,x:P.x+Math.cos(a)*30,y:P.y+Math.sin(a)*30,r:kind==='wolf'?12:9,life:life||(kind==='wolf'||S.adv==='lich'?1e9:14),cd:0,walk:rand()*6}}
function leech(){if(cls()==='necro'&&pw(3)&&++P.lc%10===0&&P.hp<P.maxHp){healP(.05);puff(P,'#7fd66b',6)}}
function strike(pt){
  const c=cls(),a=aim(pt,melee(c)?170:1200,{mage:430,ranger:720,necro:400,healer:560}[c]);let D=dmgMul(),H=cdMul();P.swing=a;
  // the string: which step this blow is; the closer is heavier and slower, a riposte hits much harder
  const CH=CHN[c||'none'],N=CH.steps.length,on=R12();if(!on||P.chS>=N||S.t-P.chAt>P.chGap)P.chS=0;
  const stp=on?CH.steps[P.chS++]:[1,1],cl=on&&P.chS===N,rip=on&&P.rip>0,C=CH.closer,n0=pshots.length;D*=stp[0];H*=stp[1];if(rip)D*=VS?PD.ripVs:PD.ripK*(setN(2)>=2?SETK.margin2:1);if(cl&&setN(1)>=2)D*=SETK.road2;
  const done=()=>{P.chAt=S.t;P.chGap=P.cd+.7;P.chC=cl;P.chT=0;P.chN=N;if(cl)P.atk=.26;if(cl&&setN(1)>=4)cdCut(SETK.road4);
    const k=pshots.length-n0,one={fx:cl?1:0,rip:rip?1:0};for(let i=n0;i<pshots.length;i++){const p=pshots[i];p.one=one;if(cl){p.big=1.4;p.bk=BRK.closer*1.5/k;p.push=C.push;p.r+=C.r||0;if(C.pierce&&p.pierce<99)p.pierce+=C.pierce}if(rip)p.big=1.8} // (one: what the whole cast does once, whichever bolt lands first)
    if(rip&&k)P.rip=0;
    emit('chainstep',{step:P.chS,steps:N,closer:cl,cls:c,style:CH.style,ang:a,x:P.x,y:P.y})};
  const tutCl=()=>{if(TU&&cl)tutEv('closer')};
  if(c==='mage'){P.atk=.14;P.cd=.45*H;const n=1+(pw(1)?2:0)+S.b.spec+(S.adv==='archmage'?2:0);
    for(let i=0;i<n;i++){const o=i-(n-1)/2,mid=Math.abs(o)<.6;pshot(a+o*.17,430,(mid?2:1)*D,mid?5:4,'bolt',pw(3))}SND.bolt();return done()}
  if(c==='ranger'){P.atk=.1;P.cd=(pw(1)?.17:.28)*H;pshot(a,720,D,3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow();return done()}
  if(c==='necro'){P.atk=.14;P.cd=.48*H;pshot(a,400,NEC.skull*D,5,'skull',S.adv==='reaper');SND.skull();return done()}
  if(c==='healer'){P.atk=.14;P.cd=.38*H;pshot(a,560,2.2*D,6,'orb',S.adv==='inquisitor');SND.orb();return done()}
  const M={tank:[2.2,.4,80,1.35],fighter:[2,.32,pw(1)?90:74,pw(1)?3.2:1.3],assassin:[1.15,.22,68,1.1]}[c]||[1,has('organs')?.3:.4,66,1.15];
  const reach=M[2]+(cl&&!VS?C.reach:0),arc=M[3]+(cl&&!VS?C.arc:0),push=cl?C.push:26; // (in versus a closer is heavier and slower, but reaches no further)
  let dmg=M[0]*D,amb=false,hitM=null;if(c==='assassin'&&P.amb>0){dmg*=3+S.b.spec;P.amb=0;amb=true}
  const twice=c==='assassin'&&pw(1);
  P.atk=.16;P.cd=M[1]*H;SND.swing(c);
  if(VS)vsSwing(a,reach,arc,dmg,twice);
  GEO++;MINE++;BIG=rip||amb?1.8:cl?1.4:0;for(const m of[...mons]){
    if(m.hidden||!mons.includes(m))continue;const d=dist(m,P);
    if(d<reach+m.r){const da=Math.atan2(Math.sin(angTo(P,m)-a),Math.cos(angTo(P,m)-a));
      if(Math.abs(da)<arc||d<m.r+18){const decoy=m.decoy;if(!m.boss&&!decoy)mPush(m,Math.cos(a)*push,Math.sin(a)*push);hurtM(m,dmg);if(twice&&mons.includes(m))hurtM(m,dmg*.6);if(S.apex&&!decoy)apexHit(m,twice?dmg*1.6:dmg);if(cl&&!decoy)brkHit(m,BRK.closer,'closer');if(!decoy&&(!hitM||m.boss))hitM=m;if(decoy)break}}
  }BIG=0;MINE--;GEO--;
  if(hitM){if(rip){P.rip=0;riposteHit(hitM,dmg)}else if(cl)hitFx('closer',hitM,.06,.5,a);else if(amb)hitFx('ambush',hitM,.05,.4,a);tutCl()}
  objArc(a,reach,arc,cl||rip);
  done();
  if(hitM&&c)troStrike(hitM,amb);
}
function field(kind,x,y,r,dur,every,dmg,slow){const f={kind,x,y,r,t:0,dur,every,tick:0,dmg,slow,sk:TAGOK>0};clamp(f,10);fields.push(f)}
function rush(a,dmg,stun){if(VS&&dmg)vsRush(a,dmg,stun);P.dashT=dmg?.24:.2;P.dx=Math.cos(a);P.dy=Math.sin(a);P.face=a;P.rushD=dmg;P.rushStun=stun;P.rushLk=LNK;P.rushSk=TAGOK>0;P.rushAlt=AK.tag;P.rushAltD=AK.tag?dmgMul():0;P.rushHit=dmg?new Set():null;P.inv=Math.max(P.inv,.4)}
const debuff=(m,o,D)=>{if(m.vs)return vsDebuff(m,o,D);if(TAGOK){if(o.slow)tagSet(m,2);if(o.stun)tagSet(m,1);if(o.dot||o.mark)tagSet(m,4)}const c=CL();if(c)mpQ(['db',m.id,o.slow||0,o.stun||0,o.dot?Math.round(o.dot*D*1000)/1000:0,o.mark||0]);
  if(o.slow&&!c)m.slow=Math.max(m.slow||0,o.slow);if(o.stun&&!c)m.stun=m.boss?o.stun:o.stun*2;if(o.dot){if(!c&&!(o.weak&&m.dotT>0&&m.dotD>o.dot*D)){m.dotT=6;m.dotD=o.dot*D;m.dotK=.5;m.dotRem=null}puff(m,'#7fd66b',10,120)}if(o.mark){if(!c)m.markT=o.mark;rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+40,fx:true});puff(m,'#b8263d',14,120)}};
const altDb=b=>{if(AK===AK0)return b;const o=Object.assign({},b);if(AK.dur!==1)for(const k of['slow','stun','mark'])if(o[k])o[k]*=AK.dur;if(AK.tag)for(const k in AK.tag)if(!o[k])o[k]=AK.tag[k];return o};
const pierceOf=g=>g==='pw3'?pw(3):g==='barb'?(S.adv==='sharpshooter'?99:S.b.spec):g;
// one effect of a skill. x = {t: nearest monster or null, ta: angle to it, at: its position or a spot ahead, D: damage multiplier}
// (while it is worked out: MINE, so its blows count for the chain; LNK, the payoff it can be; TAGOK, so what it slows, stuns or marks is tagged)
function cast(op,x){const k=LNK;LNK=lkOf(op);MINE++;TAGOK++;try{cast0(op,x)}finally{LNK=k;MINE--;TAGOK--}}
function cast0(op,x){
  const[o,a,b,c,d,e,f,g,h]=op,{t,ta,at,D}=x,ring=(p,r)=>{rings.push({x:p.x,y:p.y,life:.5,max:.5,r,fx:true});if(MP.on)MP.rq.push([Math.round(p.x),Math.round(p.y),Math.round(r),50])};
  switch(o){
  case'shock':shock(a*AK.r,b*AK.d);break;                                   // radius, damage
  case'rush':rush(ta,a*D,b);break;                                // damage, stun: dash through the target
  case'back':rush(ta+Math.PI,0,0);break;                          // untouchable roll away from the target
  case'buff':P[a]=Math.max(P[a]||0,b*AK.dur);if(a==='stormT')P.stormD=AK.d;if(a==='fireT')P.fireD=AK.d;puff(P,'#d6a544',14,180);break; // timer name, seconds
  case'heal':healP(Math.min(1,a*AK.h));puff(P,'#7fd66b',18,200);break;
  case'shield':if(S.adv!=='berserker'){P.shield=true;P.shT=0}break;
  case'fan':{const n=a>1&&AK.more?a+2:a,dk=n>a?a/n*1.05:1;for(let k=0;k<n;k++){pshot(ta+(k-(n-1)/2)*b,c,d*D*dk,e,f,pierceOf(g));if(h){const p=pshots[pshots.length-1];if(h.boom)p.boom=h.boom*D;if(h.slow)p.slow=h.slow*AK.dur;if(h.stun)p.stun=h.stun*AK.dur}}break} // count, spread, speed, damage, radius, kind, pierce, extras
  case'ringp':{const n=AK.more?a+4:a,dk=n>a?a/n*1.05:1;for(let k=0;k<n;k++)pshot(k*TAU/n,b,c*D*dk,d,e,pierceOf(f));break} // count, speed, damage, radius, kind, pierce
  case'blast':meteor(a==='at'?at:P,b*AK.r,c,d*D,e&&e.stun&&AK.dur!==1?{stun:e.stun*AK.dur}:e);break;              // where, radius, delay, damage, extras
  case'line':for(let k=1;k<=a;k++)meteor({x:P.x+Math.cos(ta)*k*b,y:P.y+Math.sin(ta)*k*b},c*AK.r,.3+k*.15,d*D);break; // count, spacing, radius, damage
  case'field':field(a,b==='at'?at.x:P.x,b==='at'?at.y:P.y,c*AK.r,d*AK.dur,e,f*D,g);break; // kind, where, radius, seconds, tick, damage per tick, slows
  case'hit':debuff(t,altDb(b),D);if(a){puff(t,'#dfe6ec',12,200);hurtM(t,a*D)}break; // damage, debuffs: the target
  case'near':for(const m of[...mons])if(!m.hidden&&dist(m,P)<a*AK.r+m.r)debuff(m,altDb(b),D);break; // radius, debuffs: every monster around you
  case'summon':for(let k=0,n=b+(AK.many?Math.ceil(b/2):0);k<n;k++){const al=ally(a,c*AK.dur);al.extra=2;allies.push(al);puff(al,'#7fd66b',6)}break; // kind, count, seconds
  case'clear':clearShots(P,a*AK.r);break;
  case'tele':puff(P,'#22242b',12);P.x=t.x+Math.cos(ta)*(t.r+24);P.y=t.y+Math.sin(ta)*(t.r+24);clamp(P,14);collide(P,14,true);P.face=ta+Math.PI;P.swing=P.face;P.inv=Math.max(P.inv,.6);puff(P,'#22242b',12);break;
  case'pull':case'knock':for(const m of mons)if(!m.hidden&&m.st!=='leap'&&dist(m,P)<a*AK.r+m.r){const g2=angTo(P,m),dd=dist(m,P),nd=o==='pull'?Math.max(m.r+50,dd-(m.boss?90:400)):dd+(m.boss?80:160);mMove(m,P.x+Math.cos(g2)*nd,P.y+Math.sin(g2)*nd)}break;
  case'seq':P.seqD=AK.d;if(a==='quake'){P.quakeN=2;P.quakeT=.4}else if(a==='cuts'){P.cutN=8;P.cutT=0;P.cutM=t;P.inv=Math.max(P.inv,1.9)}else{P.starN=7;P.starT=0}break;
  case'ring':ring(P,a*AK.r);break;
  case'ringT':ring(t,t.r+a);puff(t,'#7fd66b',20,180);break;
  case'beam':for(let k=1;k<=6;k++)bits.push({x:t.x+(P.x-t.x)*k/6,y:t.y+(P.y-t.y)*k/6,vx:0,vy:0,life:.4,max:.4,c:'#7fd66b',r:3});break;
  case'chain':{const n3=mons.filter(m=>!m.hidden).sort((p,q)=>dist(p,P)-dist(q,P)).slice(0,3);for(const m of n3)if(mons.includes(m)){for(let k=1;k<=6;k++)bits.push({x:P.x+(m.x-P.x)*k/6+rand()*14-7,y:P.y+(m.y-P.y)*k/6+rand()*14-7,vx:0,vy:0,life:.3,max:.3,c:'#8fd3ff',r:3});hurtM(m,3*D);if(AK.tag&&mons.includes(m))debuff(m,AK.tag,D)}break}
  case'army':for(const al of allies)if(al.extra===1)puff(al,'#e7dfcd',6);allies=allies.filter(al=>al.extra!==1); // a new army replaces the old one, so the cap holds
    for(let k=0;k<(AK.many?6:4);k++){const al=ally('thrall',9);al.extra=1;allies.push(al);puff(al,'#7fd66b',6)}break;
  case'burst':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);S.shake=.25;noise(.25,.35,900,150);
    for(const al of th){ring(al,70);if(VS)MP.rq[MP.rq.length-1][4]=Math.round(2*D*100)/100;puff(al,'#7fd66b',10,220);GEO++;for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,al)<70+m.r)hurtM(m,2*D,true);GEO--}break}
  case'rollcall':rollCall();break;
  case'collect':collect(t,D);break;
  case'verdict':P.bmT=1;P.bmA=ta-.6;P.bmHit=new Set();noise(.9,.25,3000,6000);break;
  case'sever':sever(t,D);break;
  default:{const f=APXOP[o];if(f)f(x,op)}break;
  case'pact':{const th=allies.filter(al=>al.kind==='thrall');allies=allies.filter(al=>al.kind!=='thrall');P.sumT=Math.max(P.sumT,2);for(const al of th)puff(al,'#7fd66b',8,160);healP(Math.min(.5*AK.h,.1*AK.h*th.length));break}
  }
}
function skill(si){
  const c=cls(),sk=skD(c,si),need=sk[5],cost=skCost(si);
  if(P.mana<cost){noMana(si);return false} // not enough mana: nothing happens and the cooldown does not start
  let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}
  {const LM=lockNow();if(LM&&LM!==t){const d=dist(LM,P);if(need!=='near'||d<LM.r+110){t=LM;bd=d}}} // (round 15) the lock: a skill goes for the target, when it can reach it
  // nothing to use it on: keep the skill ready instead of wasting the cooldown
  if(need==='t'&&!t||need==='near'&&!(t&&bd<t.r+110)||need==='thrall'&&!allies.some(a=>a.kind==='thrall')||typeof need==='function'&&!need(t)){SND.fizzle();return false}
  const A=altOf(si),x={t,ta:t?angTo(P,t):P.face,at:t?{x:t.x,y:t.y}:{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160},D:dmgMul()*(A?A.k.d:1)};
  if(R12()){if(P.cd>0)P.cd*=.5;if(P.chS){P.chAt=S.t;P.chGap=Math.max(P.chGap,P.cd+.9)}} // a skill cuts the recovery of a blow short and keeps the place in the string
  P.mana-=cost;P.atk=.16;P.swing=x.ta;SND.skill(c,si);
  const TRs=trOf(si);if(TRs)trUse(si,TRs);if(sk[2]>=40){S.shake=Math.max(S.shake,.3);haptic([40,40,40,40,160])}else haptic(35);
  AK=A?A.k:AK0;try{for(const op of sk[4]){if(S.mode!=='play')break;if((op[0]==='hit'||op[0]==='ringT'||op[0]==='beam'||op[0]==='collect'||op[0]==='sever')&&!mons.includes(t))continue;cast(op,x)}}finally{AK=AK0}
  if(sk[0]==='shadowstep'&&TSRC.length&&TSRC[0].form==='venom'){P.trQ=1;P.trT=t}
  P.mxS[si]=sk[2]*skMul(si);P.cdS[si]=P.mxS[si];syncSkills();return true;
}
// (round 15) the traits worn that change this skill, at the moment it is used
function trUse(si,l){
  const nm=l.map(id=>TRAITS.find(t=>t&&t.id===id).name);emit('trait',{skill:si,ids:l.slice(),names:nm});
  if(l.includes('blood')){const h=Math.min(P.hp-1,Math.max(1,Math.round(P.hp*TRK.blood)));if(h>0){P.hp-=h;puff(P,'#b8263d',8,120);floats.push({x:P.x,y:P.y-44,txt:'-'+h,life:.7,c:'#b8263d'});hud()}}
  if(l.includes('thirst')&&P.hp<P.maxHp){healP(TRK.thirst);puff(P,'#7fd66b',8,120)}
  if(l.includes('fleet')){P.dashCd=0;P.fleetT=Math.max(P.fleetT||0,TRK.fleetT)}
  if(l.includes('braced')){P.stoneT=Math.max(P.stoneT||0,TRK.braced);rings.push({x:P.x,y:P.y,life:.35,max:.35,r:46,fx:true})}
  if(l.includes('echo'))P.echo={si,t:TRK.echoT};
}
// the second telling of a Twice-Told skill: everything it does again at echoK, with no cost and no recharge
function trEcho(si){
  const c=cls(),sk=c&&si<10&&skD(c,si);if(!sk||S.mode!=='play'||P.down)return;
  let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}const need=sk[5];
  if(need==='t'&&!t||need==='near'&&!(t&&bd<t.r+110)||need==='thrall'&&!allies.some(a=>a.kind==='thrall')||typeof need==='function'&&!need(t))return;
  const A=altOf(si),k0=A?A.k:AK0,K=TRK.echoK,x={t,ta:t?angTo(P,t):P.face,at:t?{x:t.x,y:t.y}:{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160},D:dmgMul()*k0.d*K};
  floats.push({x:P.x,y:P.y-50,txt:'Twice-Told',life:.7,c:'#d9a441'});P.atk=.16;P.swing=x.ta;SND.skill(c,si);emit('traitEcho',{skill:si,x:P.x,y:P.y});
  AK=Object.assign({},k0,{d:k0.d*K,h:k0.h*K,dur:k0.dur*K});try{for(const op of sk[4]){if(S.mode!=='play')break;if(op[0]==='back'||op[0]==='tele'||op[0]==='buff'||op[0]==='shield'||op[0]==='army'||op[0]==='pact'||op[0]==='summon')continue;if((op[0]==='hit'||op[0]==='ringT'||op[0]==='beam'||op[0]==='collect'||op[0]==='sever')&&!mons.includes(t))continue;cast(op,x)}}finally{AK=AK0}
}
function meteor(at,r,dur,dmg,ex){const z={x:at.x,y:at.y,r,t:0,dur,mine:true,dmg,stun:ex&&ex.stun,lk:LNK,sk:TAGOK>0,alt:AK.tag||undefined,altD:AK.tag?dmgMul():0};clamp(z,10);zones.push(z)}
// skills that play out over time
function channels(dt){
  if(P.echo&&(P.echo.t-=dt)<=0){const e=P.echo;P.echo=null;trEcho(e.si)}
  MINE++;LNK='slam';
  if(P.stormT>0){P.stormT-=dt;if((P.stormK-=dt)<=0){P.stormK=.4;shock(120,2*(P.stormD||1));P.atk=.16;P.swing+=2}}
  if(P.quakeN>0&&(P.quakeT-=dt)<=0){P.quakeT=.4;shock(P.quakeN===2?190:250,4*(P.seqD||1));P.quakeN--}
  if(P.cutN>0&&(P.cutT-=dt)<=0){const m=P.cutM;if(!mons.includes(m)||m.hidden)P.cutN=0;else{P.cutT=.2;P.cutN--;const a=rand()*TAU;puff(P,'#22242b',6);P.x=m.x+Math.cos(a)*(m.r+24);P.y=m.y+Math.sin(a)*(m.r+24);clamp(P,14);collide(P,14,true);P.face=P.swing=a+Math.PI;P.atk=.16;P.inv=Math.max(P.inv,.5);SND.swing('assassin');LNK='heavy';hurtM(m,3*dmgMul()*(P.seqD||1));LNK='slam'}}
  if(P.starN>0&&(P.starT-=dt)<=0){P.starT=.35;P.starN--;let t=null,bd=1e9;for(const m of mons){if(m.hidden)continue;const d=dist(m,P);if(d<bd){bd=d;t=m}}const at=t||{x:P.x+Math.cos(P.face)*160,y:P.y+Math.sin(P.face)*160};meteor({x:at.x+rand()*60-30,y:at.y+rand()*60-30},80,.6,6*dmgMul()*(P.seqD||1))}
  LNK=null;MINE--;
  if(P.fireT>0){P.fireT-=dt;if((P.fireK-=dt)<=0){P.fireK=.1;const a=aim(null,1200);P.swing=a;P.atk=.1;pshot(a+rand()*.1-.05,720,dmgMul()*(P.fireD||1),3,'arrow',S.adv==='sharpshooter'?99:S.b.spec);SND.arrow()}}
  if(P.renewT>0){P.renewT-=dt;if((P.renewK+=dt)>=1){P.renewK=0;if(P.hp<P.maxHp){healP(.04);puff(P,'#7fd66b',4,80)}}}
}
// slot i (0-5) carries skill S.load[i] once that skill is learned
const slotSkill=i=>{const si=S.load[i];return cls()&&(si<10?si<known():!!S.apex)?si:-1};
function syncSkills(){const c=cls();for(let i=0;i<NSK;i++){const s=SK[i],si=c?slotSkill(i):-1,d=si>=0&&skD(c,si);s.index=si;s.id=d?d[0]:'';s.name=d?d[1]:'';{const A=d?altOf(si):null;s.alt=A?A.id:'';s.altName=A?A.name:''}s.unlocked=!!d;s.cd=P&&d?Math.max(0,P.cdS[si]):0;s.max=d?P&&P.mxS[si]||d[2]*skMul(si):0;s.ready=!!d&&s.cd<=0;s.cost=d?skCost(si):0;s.affordable=!!d&&!!P&&P.mana>=s.cost;if(P)P.skCds[i]=s.cd}if(P)P.skCd=P.skCds[0];manaSync()}
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
  for(let i=0;i<obstacles.length;i++){const o=obstacles[i];if(o.kind!=='crack')continue;
    if(o.warn){if((o.wt-=dt)<=0){if(!CL()){objDo(i,5,0,-1);if(MP.on)MP.oeq.push([i,5,0,-1])}else o.wt=0}continue}
    if(CL()||S.banner>1.5)continue;let on=false;for(const q of MP.on?mpHeroes():[P])if(dist(q,o)<o.r-8&&!(q===P&&P.dashT>0))on=true;
    if(!on)for(const m of mons)if(!m.hidden&&m.st!=='leap'&&m.r>=20&&dist(m,o)<o.r-4){on=true;break}
    if(on){objDo(i,4,0,-1);if(MP.on)MP.oeq.push([i,4,0,-1])}}
  for(const o of obstacles){if(!o.per)continue;o.t=(o.t+dt)%o.per;
    const sp=o.kind==='spikes',onAt=o.per*(sp?.7:.65),warnAt=onAt-(sp?.7:.8),was=o.on;o.on=o.t>=onAt;o.warn=!o.on&&o.t>=warnAt;
    if(o.on&&!was){const near=dist(o,P)<260;if(sp){if(near)sfx(1500,.07,'square',.1,700)}else{if(near){sfx(160,.4,'sawtooth',.14,80);noise(.4,.14,500,1500)}puff(o,'#ff8a4c',12,220)}}
    if(o.on&&o.kind==='brazier'&&rand()<dt*30){const a=rand()*TAU,d=rand()*o.r;bits.push({x:o.x+Math.cos(a)*d,y:o.y+Math.sin(a)*d,vx:0,vy:-50-rand()*40,life:.5,max:.5,c:rand()<.5?'#ff8a4c':'#ffd95e',r:2.5})}}
}
const mireAt=e=>{for(const o of obstacles)if(o.kind==='mire'&&Math.hypot(o.x-e.x,o.y-e.y)<o.r)return true;return false};
function playerStep(dt){
  const c=cls(),spd=(S.L&&S.L.area==='fen'&&!(P.dashT>0)&&mireAt(P)?ARENA.mireK:1)*({ranger:245,tank:195,assassin:255,fighter:225}[c]||215)*(c?frK(1,FR.e.mv)*(1+.06*S.b.fleet)*(adv('s')||1)*(1+eqv('mv')/100)*(P.fleetT>0?1.4:1)*(P.haste>0?1+AX.storm.mv*P.haste:1)*(P.pdT>0&&MP.on?(VS?PD.hasteVs:PD.hasteK):1)*(VS&&VP.spurT>0?VSK.spur:1):1);
  let mx=(keys.right?1:0)-(keys.left?1:0)+joy.x,my=(keys.down?1:0)-(keys.up?1:0)+joy.y;
  if(VS){if(!VP.hold&&P.atk>0&&c&&!melee(c)){mx*=VSK.shootSlow;my*=VSK.shootSlow}if(VP.hold){mx=my=0;want.dash=false}else if(P.vSlow>0){const l0=Math.hypot(mx,my),k=l0>1?.5/l0:.5;mx*=k;my*=k}}
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}
  {const ix=P.ix||0,iy=P.iy||0,k=1-Math.exp(-dt/(Math.hypot(mx,my)>Math.hypot(ix,iy)?.05:.035));P.ix=ix+(mx-ix)*k;P.iy=iy+(my-iy)*k;if(Math.abs(P.ix)<.012)P.ix=0;if(Math.abs(P.iy)<.012)P.iy=0;mx=P.ix;my=P.iy}
  P.moving=Math.hypot(mx,my)>.06;const ox=P.x,oy=P.y;
  if(P.dashT>0){P.dashT-=dt;const v=P.rushHit?780:640;P.x+=P.dx*v*dt;P.y+=P.dy*v*dt;
    if(P.rushHit){GEO++;MINE++;LNK=P.rushLk||null;if(P.rushSk)TAGOK++;for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&!P.rushHit.has(m)&&dist(m,P)<m.r+30){P.rushHit.add(m);if(P.rushD)hurtM(m,P.rushD);if(P.rushStun&&mons.includes(m))mStun(m,m.boss?P.rushStun*.7:P.rushStun*2);if(P.rushAlt&&mons.includes(m))debuff(m,P.rushAlt,P.rushAltD)}if(P.rushSk)TAGOK--;LNK=null;MINE--;GEO--;if(P.dashT<=0){P.rushD=0;P.rushHit=null}}
    if(rand()<.6)bits.push({x:P.x,y:P.y,vx:0,vy:0,life:.25,max:.25,c:has('skin')?'#c68863':'#e7dfcd',r:6})}
  else if(P.moving){P.x+=mx*spd*dt;P.y+=my*spd*dt;P.face=Math.atan2(my,mx);P.walk+=dt*11}
  clamp(P,14);if(obstacles.length)roomP();
  P.vx=(P.x-ox)/dt;P.vy=(P.y-oy)/dt;
  for(const k of['inv','atk','cd','dashCd','amb','rageT','guardT','legT','fleetT','stoneT','pdT','rip','dgT','pdCd'])if(P[k]>0)P[k]-=dt;
  P.chT+=dt;if(P.chS&&S.t-P.chAt>P.chGap){P.chS=0;P.chC=false}if(CB.n&&(CB.t-=dt)<=0)comboEnd();
  for(let i=0;i<13;i++)if(P.cdS[i]>0)P.cdS[i]=Math.max(0,P.cdS[i]-dt);
  if(S.mode==='play')channels(dt);
  manaStep(dt);
  if(VS)vsInv(dt);
  const held=S.banner>1.5||!!VS&&VP.hold; // the monster stands frozen while the level banner is up, so you cannot hit it either
  if(!held&&S.mode==='play'&&LNG[c])P.zeal=(P.zeal||0)+dt;
  if(S.apex||P.auraR)apexStep(dt,held);
  if((want.atk||keys.atk)&&P.cd<=0&&!held)strike(want.pt);
  want.atk=false;want.pt=null;
  if(want.dash&&has('organs')&&P.dashCd<=0&&P.dashT<=0){const PDS=P.pdCd>0||!R12()?null:pdScan(); // (looked at before the hero moves)
    if(c==='mage'){puff(P,'#8fd3ff',10);P.x+=Math.cos(P.face)*150;P.y+=Math.sin(P.face)*150;clamp(P,14);collide(P,14,true);puff(P,'#8fd3ff',10);P.inv=Math.max(P.inv,.35);P.dashCd=1.1*frK(1,-FR.e.dash);P.dgT=PD.win+.02;if(PDS)pdTry(1e9,PDS);SND.blink();if(VS)VP.dodgeT=VSK.dodge}
    else{P.dashT=.16;P.dashCd=(c==='assassin'?(pw(3)?.25:.45):.85)*frK(1,-FR.e.dash);P.amb=1.5;P.inv=Math.max(P.inv,.26);P.dgT=PD.win+.02;if(PDS)pdTry(1e9,PDS);P.dx=Math.cos(P.face);P.dy=Math.sin(P.face);SND.dash();if(VS)VP.dodgeT=VSK.dodge}
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
// NEC: the Necromancer's numbers (round 11). thD, thN, thE: a thrall's blow is thD x your damage, and past thN thralls standing (lichN more for a Lich) each hits (thN/thralls)^thE of that, so a crowd of thralls shares the work as familiars do. skull: a bone spear, in multiples of your damage.
// petOwnK(): what the owner adds to a bound pet's blows over the monster's own power (the thrall-and-pet trinket, Legion, Reaper). hold: a pet holds mana in proportion to its power, and that includes what the owner adds:
// its hold is multiplied by petOwnK()^hold (1: in full; 0: as before round 11, when a Reaper's field of doubled pets cost no more than anyone's).
// owed, ud: how much of petOwnK() the Owed, and of the trinket the damage of the dominion paths (UD), get, as exponents (0: none, the same for a Necromancer as for every other class; 1: all of it, as before round 11).
const NEC={thD:1,thN:4,lichN:3,thE:.6,hold:1.3,owed:0,ud:0,skull:2.1};
const petOwnK=()=>(1+eqv('thr')/100)*(S.cls==='necro'?1+.04*S.b.spec:1)*(S.adv==='reaper'?2:1);
const thrallK=()=>{let n=0;for(const a of allies)if(a.kind==='thrall'&&a.life>0)n++;return NEC.thD*Math.pow(Math.min(1,(NEC.thN+(S.adv==='lich'?NEC.lichN:0))/Math.max(1,n)),NEC.thE)};
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
function petDu(e,own){
  const k=PETK*GREF(petLe(e))/PHP(e.lv)*petLvl(e)*(own===undefined?petOwnK():own)*(DOMS()?DOMPET:1);
  return[-1,0,1].map(h=>Math.max(.05,Math.round(blowAt(e.lv,h)*k*100)/100));
}
// what one of them holds while it is out, and what it costs to raise it again after it fell (dearer each time within a level)
const petCost=e=>{const f=resvForm();if(!f)return 0;
  if(f==='familiar')return Math.max(1,Math.round((e.crown?PCROWN:PCOST).familiar*(S.adv==='archmage'?.8:1)*(DOMS()?DOMHOLD:1)));
  return Math.max(PMIN,Math.round(C0(S.level)*petRel(e)*(S.adv==='lich'||S.adv==='beastmaster'?.8:1)*Math.pow(petOwnK()*(DOMS()?DOMPET:1),NEC.hold)*(DOMS()?DOMHOLD:1)))};
const reviveCost=e=>Math.round(petCost(e)*REVK*Math.pow(REVUP,e.revN||0));
const petInfo=e=>({power:petPower(e),cost:petCost(e),revive:reviveCost(e),hp:petHp(e),hit:petDu(e),lv:e.lv,at:petLe(e)});
const petCap=()=>resvForm()?1e9:form()?1:0;
// how strong a roster entry is, for sorting and for "fill from the strongest down"
const petRank=e=>form()==='pet'?petPower(e):(e.crown?1e4:0)+e.plv*10+(e.perk?5:0)+e.r/100;
// the roster entries that go with you, in order: everything on the active list that the pool can hold
const petOn=()=>{const out=[],f=form();if(!f||hcap('alone'))return out;const rs=resvForm(),M=rs?manaMax():0;let sum=0;
  for(const i of PETS.active){const e=PETS.roster[i];if(!e)continue;if(rs){const c=petCost(e);if(sum+c>M)continue;sum+=c}else if(out.length)break;out.push(e)}return out};
const petHeld=(on=petOn())=>{let s=0;for(const e of on)s+=petCost(e);return s};
// can this entry be sent out as things stand: is there unheld mana for it
const petFits=e=>!resvForm()?petOn().length<1:petHeld()+petCost(e)<=manaMax();
// the reserve follows who is in the field: called whenever that changes
function resvSync(){if(!P)return;P.resB=ORDS()&&resvForm()?Math.min(ORDRESN,Math.max(0,PETS.roster.length-petOn().length))*ORDRESK:0;P.resv=P.maxMana?Math.min(P.maxMana,petHeld()):0;if(P.mana>manaRoom())P.mana=manaRoom();manaSync()}
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
function beamHits(a,r){const ms=mons;GEO++;for(const m of ms)if(!m.hidden&&!m.decoy&&mons.includes(m)&&segDist(m,a.x,a.y,r.a,r.len)<a.beam.w+m.r-4&&petTouch(a,m,'b'))petHit(m,a.du[1],a.par||a);GEO--}
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
/* ---------- round 14: orders. Everything that fights for a hero of a pet class (bound and tamed pets and what they raise, thralls, wolves, the Owed) follows one order at a time ---------- */
// free (as always: each picks its own prey), attack (they go for the monster I am fighting: the last one a blow of mine landed on within `memo` seconds, else the one nearest to me),
// hold (they keep to the spot where the order was given and fight what comes within holdR of it), back (they come to me and fight only what comes within backR of me).
// leash: on hold or back, one that has strayed this far breaks off and returns first. An order holds until another is given; "hold" ends with the floor. Not in versus.
const PCMD={ids:['free','attack','hold','back'],names:['Free','Attack my target','Hold here','Fall back to me'],short:['Free','Attack','Hold','Back'],keys:['N','G','H','B'],holdR:170,backR:150,leash:290,memo:4,
  text:['Each picks its own prey.','They go for the monster you are fighting.','They keep to this spot and fight what comes near it.','They come to you and fight only what comes near you.']};
const cmdNow=()=>VS?'free':PETS.cmd||'free';
const cmdCan=()=>!VS&&!!S.cls&&act2()&&(S.cls==='necro'||S.adv==='beastmaster'||allies.some(a=>a.pet||a.shade));
// the monster I am fighting (worked out once a step)
function heroTarget(){if(PETS._htAt===S.t)return PETS._ht;PETS._htAt=S.t;const q=S.myT;let t=null;
  if(LK.hard&&lockOk(LK.m)&&!LK.m.hidden&&!VS)t=LK.m;
  else if(q&&S.t-q.t<PCMD.memo&&mons.includes(q.m)&&!q.m.hidden&&q.m.hp>0)t=q.m;
  else{let bd=1e9;for(const m of mons){if(m.hidden||m.decoy)continue;const d=dist(m,P)-m.r+(m.ward>.3?2000:0);if(d<bd){bd=d;t=m}}}
  return PETS._ht=t}
// where the ones that have nothing to fight gather: the hold point, or their owner
const cmdHome=()=>cmdNow()==='hold'?PETS.home||(PETS.home={x:PETS.hx,y:PETS.hy,r:0}):P;
function petCommand(c,quiet){
  if(typeof c==='number')c=PCMD.ids[c];if(!PCMD.ids.includes(c)||VS||!P||S.mode!=='play'&&c!=='free')return false;
  PETS.cmd=c;PETS.hx=P.x;PETS.hy=P.y;PETS.home=null;PETS._htAt=-1;const i=PCMD.ids.indexOf(c);
  if(!quiet){floats.push({x:P.x,y:P.y-64,txt:PCMD.names[i],life:1.4,c:'#6fe3ff'});if(c==='hold')rings.push({x:P.x,y:P.y,life:.7,max:.7,r:PCMD.holdR,fx:true});sfx(c==='free'?520:c==='attack'?740:c==='hold'?330:440,.12,'triangle',.16,c==='attack'?980:c==='back'?660:300);haptic(14)}
  if(MP.on)MP.pcOut=[i,Math.round(P.x),Math.round(P.y)];
  emit('petCommand',{by:-1,cmd:c,index:i,name:PCMD.names[i],x:PETS.hx,y:PETS.hy});if(TU&&!quiet)tutEv('order',c);return true}
// what MB.petCmd hands out: {cmd, index, can, count, x, y (the hold point), target (the id of the monster an attack order points at, or 0), names, short, keys}
function cmdInfo(){const c=cmdNow();let n=0;for(const a of allies)if(a.pet||a.shade||a.kind==='thrall'||a.kind==='wolf')n++;const t=c==='attack'&&P&&S.mode==='play'&&!CLHT()?heroTarget():null;
  return{cmd:c,index:PCMD.ids.indexOf(c),can:cmdCan(),count:n,x:PETS.hx||0,y:PETS.hy||0,target:t?t.id:0,names:PCMD.names,short:PCMD.short,keys:PCMD.keys,text:PCMD.text}}
const CLHT=()=>false;
// who a pet goes for: the nearest monster above ground, but the boss unless something small is close, and nothing warded while there is a choice (and what its order allows)
function petTarget(a){const c=cmdNow();let R=0,ax=0,ay=0;
  if(c==='attack'){const t=heroTarget();if(t)return t}
  else if(c==='hold'){ax=PETS.hx;ay=PETS.hy;R=PCMD.holdR}else if(c==='back'){ax=P.x;ay=P.y;R=PCMD.backR}
  if(R&&Math.hypot(a.x-ax,a.y-ay)>PCMD.leash)return null;
  let t=null,bd=1e9;for(const m of mons){if(m.hidden||m.decoy)continue;if(R&&Math.hypot(m.x-ax,m.y-ay)-m.r>R)continue;const d=dist(m,a)-m.r-(m.boss?140:0)+(m.ward>.3?2000:0);if(d<bd){bd=d;t=m}}return t}
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
  if(a.vStun>0){a.vStun-=dt;return} // (versus: stunned by a hero)
  if(a.par&&!(a.par.life>0))a.life=0;
  if(a.helper){ // a trophy's helper: walks up and bites, for as long as it lasts
    a.life-=dt;if(a.life<=0){puff(a,'#e7dfcd',5);return}
    if(a.avT>0)a.avT-=dt;a.cd-=dt;const t=petTarget(a);
    if(t){const g=angTo(a,t),d=dist(a,t);a.face=g;if(d>t.r+a.r)petMove(a,g+Math.sin(S.t*3+a.seed)*.4,190,dt,false,d);else if(a.cd<=0){a.cd=.7;GEO++;petHit(t,a.dk,a.par||a);GEO--}}
    else{const to=a.par&&a.par.life>0?a.par:cmdHome(),d=dist(a,to);if(d>(to.r||0)+a.r+44){const g=angTo(a,to);a.face=g;petMove(a,g,220,dt,false,d)}}
    return}
  if(a.life<=0){puff(a,col(a.s.col),6,120);return}
  if(a.ward>0)a.ward-=dt;
  const t=petTarget(a),ox=a.x,oy=a.y,k=aiK(a);
  SIDE=a;
  if(t){T=t;const g=angTo(a,t);a.face=g;a.lx=t.x;a.ly=t.y;AI[a.ai](a,dt*k,g,Math.max(0,dist(a,t)-t.r+11))}
  else if(MID[a.st]){T={x:a.lx===undefined?a.x:a.lx,y:a.ly===undefined?a.y:a.ly,r:11,vx:0,vy:0};AI[a.ai](a,dt*k,angTo(a,T),1e9)} // nothing to fight: a move already begun is finished where its prey last stood
  else{ // otherwise it comes back to its owner (or its parent)
    a.st='idle';a.hidden=false;a.beam=null;a.lift=0;a.t=Math.min(a.t,.8);const to=a.par&&a.par.life>0?a.par:cmdHome(),d=dist(a,to);T=to;if(d>(to.r||0)+a.r+44){const g=angTo(a,to);a.face=g;move(a,g,220,dt)}}
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
  if(!a.hidden&&a.st!=='leap'&&a.st!=='dazed'&&S.mode==='play'){const ms=mons;for(const m of ms){if(m.hidden||m.decoy||dist(a,m)>=a.r+m.r-4||!mons.includes(m)||!petTouch(a,m))continue;GEO++;petHit(m,a.du[a.st==='charge'||a.st==='lunge'?2:0],a.par||a);GEO--}}
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
  if(!PETS.auto||!P||S.mode!=='play'||P.down||VS)return; // (versus: the fallen stay down until the next round)
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
const troPow=a=>(DOMS()?DOMPET:1)*(TRX[a.form]||1)*(a.k||1)*dmgMul()*(a.tm?1/cdMul():1)*(a.form==='familiar'?1+.08*S.b.spec:1)*(a.form==='ward'?Math.min(3,Math.max(1,(P.trW||0)/2.5)):1)*(1+.02*a.e.plv)*(a.e.perk?1.1:1)*(a.e.crown?1.1:1);
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

/* ---------- the tower: every level is a floor of the Marrowspire ---------- */
// The crypt is its root (floors 1-8). The lands of 3.4 are bands of floors, and past floor 50 a new band every 50 floors, round and round.
// Everything about a floor follows from its number: its band, its kind (see floorKind) and, for a trial, its rule. So a retry meets the same floor.
const TNAME='The Marrowspire',TPREMISE='It was not built. It grew, one bone for every body the dark has kept, and whole countries were swallowed into its floors as it rose. You woke in its root as ash and bare bone; whatever waits at the top has never been seen from below.';
const BAND0=[['The Root',1,8,200],['The Ash Road',9,20,28],['The Drowned Fen',21,30,165],['The Bone Peaks',31,40,215],['The Black Court',41,50,285]];
const BANDX=[['The Endless Dark',340],['The Hollow Choir',262],['The Tallow Halls',44],['The Glass Orchard',188],['The Rust Sea',14],['The Pale Archive',228],['The Lantern Deep',58],['The Thorn Cloister',122]];
const ROMAN=['','II','III','IV','V','VI','VII','VIII','IX','X'];
const bandOf=N=>N<=8?0:N<=20?1:N<=50?Math.floor((N-1)/10):5+Math.floor((N-51)/50);
function bandAt(i){
  if(i<5){const b=BAND0[i];return{name:b[0],from:b[1],to:b[2],hue:b[3]}}
  const j=i-5,x=BANDX[j%BANDX.length],turn=Math.floor(j/BANDX.length);
  return{name:x[0]+(turn?' '+(ROMAN[turn]||turn+1):''),from:51+j*50,to:100+j*50,hue:(x[1]+turn*23)%360};
}
// Floor kinds. 1-8 the root, 9-12 plain fights, every tenth floor its guardian. Of the other nine floors in each ten, three are trials (TSLOT: never the ninth, never two side by side).
// The trials come in a fixed order: the first five one of each kind (floors 13, 16, 18, 21, 24), after that a walk through the five kinds that never repeats one twice running.
const TKIND=['survive','race','guard','cross','ordeal'],TSLOT=[[2,5,8],[3,6,8],[1,4,7]],FKINDS=['fight','survive','guard','race','ordeal','cross'];
const trialIdx=N=>{const d=Math.floor((N-1)/10),j=TSLOT[d%3].indexOf(N%10);return j<0?-1:3*(d-1)+j};
const trialK=i=>i<5?i:(i*2+Math.floor(i/5))%5;
function floorKind(n){const N=n+1;if(N<=8)return'root';if(N%10===0)return'guardian';if(N<13)return'fight';const i=trialIdx(N);return i<0?'fight':TKIND[trialK(i)]}
const isTrial=k=>k==='survive'||k==='guard'||k==='race'||k==='ordeal';
// how many trials of the same kind came before trial i (so the ordeals walk through their handicaps and the crossroads through their doors)
const sameMemo=new Map();
function sameBefore(i){let v=sameMemo.get(i);if(v!==undefined)return v;v=0;const k=trialK(i);for(let j=0;j<i;j++)if(trialK(j)===k)v++;sameMemo.set(i,v);return v}
// SURVT, GUARDT, RACET: how long a trial lasts. RACEHP: the monster of a race has this share of its usual health and comes alone. DARKR: how far you see in the returning dark.
const SURVT=32,GUARDT=34,RACET=28,DARKR=245,TMANA=8;
// TK: the trials' numbers. raceHp: the monster of a race has this share of its usual health (and is enraged). survGap: seconds between packs; survHp: a pack's lesser monsters have this many times a wave's (times survLate from floor 51, where a class has its upgrade);
// survMax: no new pack while this many monsters stand. lamp: the blows the lamp can take. siegeHp: a besieger's health against a wave's lesser monster; siegeGap: seconds between besiegers at the start
// (siegeGap2 at the end); siegeSpd: how fast they walk; siegeRest: seconds between a besieger's blows.
const TK={raceHp:.7,survGap:4,survHp:3,survLate:1.4,survMax:22,lamp:10,siegeHp:.7,siegeGap:2.8,siegeGap2:1.9,siegeSpd:80,siegeRest:1.3,
  // round 11: survRamp (+survRampK per floor past 13, 1 at most): by the end of an Onslaught every blow is this much heavier (it grows with the clock); survLateK: past floor 51 a pack's lesser monsters gain this much health per floor (up to 2.6 times).
  // raceDmg, ordDmg (+ordDmgK per floor past 24, +.5 at most): how much heavier the blows of an Hourglass monster and of an Ordeal's are.
  // raceAt, raceK, raceMin: after raceAt s of an Hourglass the glass is cut to raceK x the time the kill would take at the damage done so far, never below raceMin s and never above RACET (alone only; in co-op the clock stays).
  // siegeHit: a besieger's blow also lands on a hero within this reach of it (a heavy blow, telegraphed like any other). miteGap, miteN: mites come for you this often in a Vigil, this many at a time. h2From: from this floor an Ordeal carries a second handicap.
  survRamp:.15,survRampK:.012,survLateK:.02,raceDmg:1.15,ordDmg:1.25,ordDmgK:.008,raceAt:4,raceK:2,raceMin:10,siegeHit:46,miteGap:7,miteN:3,h2From:60,
  // round 13 (what carelessness costs in a Vigil; the Ordeal was measured with a bot that never dodges and left as it was):
  // vigWound: in a Vigil every blow that lands on a hero dims the lamp by this much. vigFallGap / vigFallAt / vigFallR / vigFallT: every vigFallGap seconds (vigFallK less per floor past 25, never under vigFallMin; from vigFallAt on) a cinder falls where each hero stands:
  // a blast of radius vigFallR with vigFallT seconds of warning, aimed vigLead x that time ahead of the hero's pace (where it will be if it does not react), so not reacting is what loses the lamp.
  // siegeDip: on floors 41-50 (the last before a class has its upgrade, where the Vigil was the one hard trial) a besieger has this share of its health.
  vigWound:2,vigFallGap:5,vigFallAt:6,vigFallR:102,vigFallT:.8,vigLead:1,vigFallK:.045,vigFallMin:2.5,siegeDip:.6};
const HCAPS=['dark','halfheal','nomana','swift','alone'];
const HRULE={nomana:'Your mana does not come back on this floor.',dark:'The dark is back: you see only what is near you.',alone:'Your pets, familiars and trophies stay behind on this floor, and so does everything your path would send to fight for you.',halfheal:'All healing is halved on this floor.',swift:'Everything on this floor moves and strikes a fifth faster.'};
const HNAME={nomana:'Dry',dark:'Dark',alone:'Alone',halfheal:'Thin blood',swift:'Swift'};
const TRIALS={survive:{title:'The Onslaught',rule:'Stay alive for '+SURVT+' seconds.'},guard:{title:'The Vigil',rule:'Keep the Lamp lit for '+GUARDT+' seconds. Your wounds dim it too.'},race:{title:'The Hourglass',rule:'It is enraged: kill it within '+RACET+' seconds.'},ordeal:{title:'The Ordeal',rule:''}};
const handicapOf=n=>{const i=trialIdx(n+1);return i>=0&&TKIND[trialK(i)]==='ordeal'?HCAPS[sameBefore(i)%HCAPS.length]:null};
// the second, lesser handicap of an Ordeal from floor TK.h2From on: one of the three that do not change what you bring (never the same as the first)
const H2=['swift','halfheal','dark'];
const handicap2=(n,h)=>{if(n+1<TK.h2From||!h)return null;const l=H2.filter(x=>x!==h);return l[n%l.length]};
// Doors: what a crossroads offers for the floor after it. Each is a risk on that floor and a reward for clearing it.
const DOOR={
 wrath:{title:'The Red Door',risk:'Its monster is enraged from the start.',reward:'Its drop is rare or better.'},
 horde:{title:'The Loud Door',risk:'Two packs come first, each twice the usual size.',reward:'Two boons instead of one.'},
 wound:{title:'The Narrow Door',risk:'You walk in with half your health.',reward:'Two items drop instead of one.'},
 lean:{title:'The Bare Door',risk:'Nothing drops on that floor.',reward:'+'+3*TMANA+' maximum mana, for good.'},
};
const DPAIR=[['wrath','lean'],['horde','wound'],['wrath','horde'],['lean','wound'],['wrath','wound'],['horde','lean']];
const doorPair=n=>{const i=trialIdx(n+1);return DPAIR[(i>=0?sameBefore(i):0)%DPAIR.length]};
let DOORS=null;
const doorInfo=id=>({id,title:DOOR[id].title,risk:DOOR[id].risk,reward:DOOR[id].reward});
function towerAt(N){
  N=Math.max(1,Math.min(9999,Math.floor(+N)||1));const k=floorKind(N-1),bi=bandOf(N),b=bandAt(bi),h=k==='ordeal'?handicapOf(N-1):null;
  return{floor:N,kind:k,band:bi,bandName:b.name,hue:b.hue,handicap:h,rule:k==='ordeal'?HRULE[h]:isTrial(k)?TRIALS[k].rule:k==='cross'?'Two doors wait behind this floor.':''};
}
// what is kept apart from the run: the highest floor ever cleared on this device, and the checkpoints reached (floors 11, 21, 31...)
const TWR={best:0,cp:[1]};
function towerLoad(){try{const o=JSON.parse(localStorage.getItem('marrowborn.tower')||'null');if(o&&typeof o==='object'){const b=Math.floor(+o.best);if(b>0)TWR.best=Math.min(9999,b);
  if(Array.isArray(o.cp))for(const v of o.cp)if(Number.isInteger(v)&&v>1&&v<=9991&&v%10===1&&!TWR.cp.includes(v))TWR.cp.push(v);TWR.cp.sort((a,b)=>a-b);return true}}catch(e){}return false}
function towerSave(){pref('tower',JSON.stringify({best:TWR.best,cp:TWR.cp}))}
// floor N (1-based) is cleared: the best floor, and the checkpoint above every tenth floor
function towerDone(N){let ch=false;if(N>TWR.best){TWR.best=N;ch=true}for(let c=11;c<=N+1;c+=10)if(!TWR.cp.includes(c)){TWR.cp.push(c);ch=true}if(ch){TWR.cp.sort((a,b)=>a-b);towerSave()}}
const towerFloor=()=>(S.mode==='title'?titleSaved:S.level)+1;
const TOWER={name:TNAME,premise:TPREMISE,get floor(){return towerFloor()},get best(){return TWR.best},
  get checkpoints(){if(SET.testUnlock){const o=[];for(let c=1;c<=201;c+=10)o.push(c);for(const c of TWR.cp)if(c>201)o.push(c);return o}return TWR.cp.slice()},
  get bands(){const top=Math.max(TWR.best,towerFloor())+100,o=[];for(let i=0;;i++){const b=bandAt(i);o.push(b);if(b.to>=top)break}return o},
  at:towerAt,ahead(n){const f=towerFloor(),o=[];n=Math.max(0,Math.min(200,Math.floor(+n)||0));for(let i=1;i<=n;i++)o.push(towerAt(f+i));return o},
  startAt:(N,o)=>startAt(N,o),seasoned:(N,o)=>seasonedInfo(N,o)};

/* ---------- trials: the state of the floor's trial (MB.trial), run by the host in co-op ---------- */
let TR=null;
const hcap=k=>!!TR&&(TR.handicap===k||TR.handicap2===k);
// how much heavier blows are on this floor because of its trial (see TK)
const trialBlow=()=>!TR||TR.cleared?1:TR.kind==='survive'?1+Math.min(1,TK.survRamp+TK.survRampK*Math.max(0,S.level-12))*Math.min(1,TR.t/TR.dur):TR.kind==='race'?TK.raceDmg:TR.kind==='ordeal'?TK.ordDmg+Math.min(.5,TK.ordDmgK*Math.max(0,S.level-23)):1;
// how far you see: FOG before you have eyes, DARKR in the returning dark, 0 when sight has no limit
const sightR=()=>!has('sight')?FOG:TR&&TR.sight?TR.sight:xtw('dark')?DARKR:0;
const FALLEN=[]; // the monsters (not the floor's own) that have died on this floor, for the Tithe
function trialMake(L){
  const k=L.floorKind;if(!isTrial(k))return null;
  const h=k==='ordeal'?L.handicap||'dark':null,h2=handicap2(S.level,h),d=k==='survive'?SURVT:k==='guard'?GUARDT:k==='race'?RACET:0,lamp=TK.lamp+3*(MP.on?Math.max(0,MP.cnt-1):0);
  return{kind:k,title:TRIALS[k].title,rule:k==='ordeal'?HRULE[h]+(h2?' '+HRULE[h2]:''):TRIALS[k].rule,t:0,dur:d,goal:0,progress:0,handicap:h,handicap2:h2,failed:false,cleared:false,sight:h==='dark'||h2==='dark'?DARKR:0,
    obj:k==='guard'?{x:W/2,y:H/2,r:26,hp:lamp,maxHp:lamp,flash:0,name:'The Vigil Lamp'}:null,pk:0,nextT:k==='guard'?5:0,spT:0,failT:0,fallT:TK.vigFallAt};
}
// a floor is cleared: its monster died, or a trial without one was held to the end
function floorClear(){
  mons=[];shots=[];pshots=[];zones=[];fields=[];S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);S.stop=.12;
  if(TR&&!TR.cleared){TR.cleared=true;emit('trial',{kind:TR.kind,state:'clear'})}
  if(FN){finEv(FN.state==='play'?'end':'gone');FN=null}S.slowT=0;dareClose();gradeMake();
  emit('bossdead',{level:S.level,time:ST.levelTime,cls:S.cls});if(MP.on)mpCleared();
}
// a trial is lost without anyone dying (the hourglass ran out, the lamp went out): the floor is tried again. Alone at once, from a screen; in co-op the host restarts it for all after a moment.
function trialFail(why){
  if(!TR||TR.failed||TR.cleared)return;TR.failed=true;emit('trial',{kind:TR.kind,state:'fail'});
  floats.push({x:W/2,y:H/2-60,txt:why,life:2.2,c:'#ff5b6e'});SND.dead();haptic([120,60,320]);
  if(MP.on){TR.failT=performance.now()+2200;return}
  S.mode='dead';save(S.level);
  show({kick:'The trial is lost · floor '+(S.level+1),title:why,body:TR.title+': '+TR.rule+' Nothing is taken from you. The floor waits as it was.',btns:[['Try floor '+(S.level+1)+' again',()=>startLevel(S.level)]]});
}
// The Onslaught: a pack, then a bigger one every SURVGAP seconds (sooner when the room is empty), until the time is up
function trialPack(i){
  const n=S.level,py=MP.on?mpPartyY():P.y,far=py>H/2?150:H-150,big=1+Math.min(3,Math.floor((i+1)/2)),small=4+Math.min(4,i)+(MP.on?mpPack():0);
  for(let j=0;j<big;j++){const kind=LESSER[(n+i*2+j*3)%LESSER.length];const m=lesser(kind,W/2+(j-(big-1)/2)*170,far,GENHP[kind]*genMul(n)*.085*TK.survHp*(n>=50?Math.min(2.6,TK.survLate+TK.survLateK*(n-50)):1));if(i>1)m.spdK=1}
  for(let j=0;j<small;j++){const m=spawn('mite',W/2+(j-(small-1)/2)*70,far+(py>H/2?60:-60));m.t=1}
  floats.push({x:W/2,y:far-50,txt:'Pack '+(i+1),life:1.4,c:'#d6a544'});sfx(150,.4,'sawtooth',.2,90);
}
// The Vigil: besiegers come in from the corners and the sides, more at a time as it goes on, and now and then a few mites come for you
const GATES=[[80,90],[880,510],[880,90],[80,510],[70,300],[890,300],[480,70],[480,530]],SIEGERS=['crawler','hound','fist'];
function siegeSpawn(i){
  const n=S.level,g=GATES[(i*5+n)%GATES.length],kind=SIEGERS[(n+i)%SIEGERS.length],m=lesser(kind,g[0],g[1],GENHP[kind]*genMul(n)*.085*TK.siegeHp*(n>=40&&n<50?TK.siegeDip:1));
  m.siege=true;m.spdK=1;m.t=.5;return m;
}
// a besieger: it walks to the lamp, winds up (the usual tell) and strikes it; a blow that starts in reach and ends out of it (it was thrown back) misses
function siege(m,dt){
  const o=OBJ(),a=angTo(m,o),d=dist(m,o);
  if(m.st==='wind'){if((m.t-=dt)<=0){m.st='idle';m.t=TK.siegeRest;if(dist(m,o)<o.r+m.r+18)lampHit(o);if(!CL()&&S.mode==='play'&&!P.down&&dist(m,P)<m.r+TK.siegeHit)hurtP(blow(1),'siege')}}
  else if(d>o.r+m.r+5){m.st='idle';T=o;move(m,a,TK.siegeSpd,dt)}
  else if((m.t-=dt)<=0){m.st='wind';m.t=.7;m.ang=a}
}
function lampHit(o){
  const dr=!!DRE&&DRE.obj===o;if(dr?DRE.state!=='run':!TR||TR.failed||TR.cleared)return;o.hp=Math.max(0,o.hp-1);o.flash=.3;rings.push({x:o.x,y:o.y,life:.4,max:.4,r:o.r+40,fx:true});puff(o,'#ffd95e',10,170);
  floats.push({x:o.x,y:o.y-o.r-16,txt:'-1',life:.8,c:'#ff5b6e'});sfx(320,.2,'square',.2,120);S.shake=Math.max(S.shake,.15);
  if(o.hp<=0){if(dr)dareEnd('fail','the ember went out');else trialFail('The lamp went out')}
}
function trialStep(dt){
  const t=TR;if(t.obj&&t.obj.flash>0)t.obj.flash-=dt;
  if(t.failed){if(MP.on&&MP.role==='host'&&MP.phase==='run'&&performance.now()>=t.failT)mpGo(S.level,true);return}
  if(t.cleared)return;
  t.t+=dt;t.progress=t.dur?Math.min(t.dur,t.t):t.t;
  if(t.kind==='ordeal'||CL())return; // (a client's trial is the host's: its clock and its lamp come with the world)
  if(t.kind==='race'){
    if(!t.cut&&!MP.on&&boss&&t.t>=TK.raceAt){t.cut=true;const done=boss.maxHp-boss.hp,d=done>0?Math.max(TK.raceMin,Math.min(t.dur,Math.round(TK.raceK*t.t*boss.maxHp/done))):t.dur; // the glass is cut to the hero's measure
      if(d<t.dur){t.dur=d;t.rule='It is enraged: kill it within '+d+' seconds.';if(!window.MBDareBand)floats.push({x:W/2,y:H/2-90,txt:'The glass narrows: '+d+' seconds',life:2.2,c:'#d6a544'});sfx(880,.3,'triangle',.14,440)}}
    if(t.t>=t.dur&&boss&&boss.hp>0)trialFail('The hourglass ran out');return}
  if(t.t>=t.dur)return floorClear();
  if(t.kind==='survive'){
    if(!mons.length&&t.nextT-t.t>1.2)t.nextT=t.t+1.2;
    if(t.t>=t.nextT&&t.t<t.dur-3&&mons.length<TK.survMax+(MP.on?mpPack()*2:0)){trialPack(t.pk++);t.nextT=t.t+TK.survGap}
  }else{
    let n=0;for(const m of mons)if(m.siege)n++;
    if((t.spT-=dt)<=0&&n<2+Math.floor(t.t/12)+(MP.on?mpPack():0)&&t.t<t.dur-2){t.spT=(TK.siegeGap+(TK.siegeGap2-TK.siegeGap)*t.t/t.dur)/(1+.5*(MP.on?Math.max(0,MP.cnt-1):0));siegeSpawn(t.pk++)}
    if(t.t>=t.nextT){t.nextT=t.t+TK.miteGap;for(let j=0;j<TK.miteN+(MP.on?mpPack():0);j++)if(mons.length<12){const g=GATES[(t.pk+j*3)%GATES.length],m=spawn('mite',g[0],g[1]);m.t=1}}
    // (round 13) a cinder falls where each hero stands; the others' wounds (seen by the host as their health falling) dim the lamp as the host's own do
    {const k=Math.min(1,dt/.2);t.hvx=(t.hvx||0)*(1-k)+(P.x-(t.hx===undefined?P.x:t.hx))/dt*k;t.hvy=(t.hvy||0)*(1-k)+(P.y-(t.hy===undefined?P.y:t.hy))/dt*k;t.hx=P.x;t.hy=P.y} // the hero's pace, smoothed
    if(TK.vigFallGap>0&&t.t>=t.fallT&&t.t<t.dur-1.5){t.fallT=t.t+Math.max(TK.vigFallMin,TK.vigFallGap-TK.vigFallK*Math.max(0,S.level-24));const L=TK.vigFallT*TK.vigLead;if(!P.down&&!MP.away&&!(P.dashT>0))zone(P.x+t.hvx*L,P.y+t.hvy*L,TK.vigFallR,TK.vigFallT);if(MP.on)for(const r of MP.remotes)if(!r.away&&!r.dead)zone(r.P.x+(r.P.moving?r.P.vx||0:0)*L,r.P.y+(r.P.moving?r.P.vy||0:0)*L,TK.vigFallR,TK.vigFallT)}
    if(MP.on&&TK.vigWound>0)for(const r of MP.remotes){const h=r.P.hp;if(!r.away&&r._vh!==undefined&&h<r._vh-.01)for(let i=0;i<TK.vigWound;i++)lampHit(t.obj);r._vh=h}
  }
}

/* ---------- the apex tier at work: the Owed (shades), the ring of light, the beam ---------- */
// Tithe: a monster that dies (not the floor's own) rises for the nearest hero on that path, for SHLIFE seconds, as long as fewer than shadeCap() stand. It runs the monster's own AI on your side, as a pet does,
// hits SHK times as hard as a pet of that monster would, costs nothing and cannot be hurt.
const shadeCap=()=>Math.min(10,4+Math.max(0,Math.floor((S.level+1-100)/10)));
function shadeMine(m){
  if(S.apex!=='dominion'||!P||P.down||S.mode!=='play')return false;if(!MP.on)return true;
  // Co-op: every page must name the same hero, so it cannot go by distance (each page sees the others a moment late, and two could both be the nearest, or neither): the Tithe-takers standing take the kills in turn, by the monster's id.
  const l=[MP.myIdx];for(const r of MP.remotes)if(!r.dead&&!r.away&&r.look.apex==='dominion')l.push(r.idx);l.sort((a,b)=>a-b);return l[((m.id|0)>>>0)%l.length]===MP.myIdx;
}
function fallen(m){
  if(m.decoy||m.boss)return;FALLEN.push({s:m.s,ai:m.ai,kind:m.kind,x:m.x,y:m.y});if(FALLEN.length>24)FALLEN.shift();
  if(shadeMine(m))shadeRise(m,SHLIFE,false);
}
function shadeRise(d,life,over){
  if(!P||P.down||S.mode!=='play'||hcap('alone'))return null;
  let n=0;for(const a of allies)if(a.shade&&(over||!a.over))n++;if(n>=(over?24:shadeCap()))return null;
  const s0=d.s,ai=AI[d.ai||s0.ai]?(d.ai||s0.ai):'mite',e={kind:d.kind||ai,ai,lv:S.level,plv:0,mods:[],crown:0},g=rand()*TAU;
  const a={nid:nid(),sk:d.kind||ai,kind:'shade',shade:true,pet:false,over:!!over,owner:'shade',e,k:1,slot:0,s:{...s0,ai,crown:0},ai,name:'Owed '+s0.name.replace(/^Lesser /,''),plv:0,x:d.x,y:d.y,r:s0.r,hp:1,maxHp:1,
    st:'idle',t:.5+rand()*.4,n:0,ang:g,face:g,flash:.2,ring:0,hits:0,hidden:false,lift:0,seed:rand()*9,life,max:life,walk:0,flip:false,inv:0,side:rand()<.5?-1:1,mods:[],ward:0,beam:null,boss:false,moving:false,
    du:petDu(e,Math.pow(petOwnK(),NEC.owed)).map(v=>v*SHK),touch:new Map(),rage:false,phase:1,spdK:1};
  clamp(a,a.r);if(obstacles.length)collide(a,a.r,true);allies.push(a);puff(a,'#3a2f55',12,150);rings.push({x:a.x,y:a.y,life:.4,max:.4,r:a.r+26,fx:true});return a;
}
// Roll Call: the fallen of this floor stand up, and husks of the Spire fill the ranks where fewer than three have died
function rollCall(){
  const L=FALLEN.slice(-8);let k=0;for(const d of L)if(shadeRise(d,8,true))k++;
  for(;k<3;k++){const g=rand()*TAU,kind=LESSER[(S.level+k)%LESSER.length];shadeRise({s:lesserSpec(kind,S.level,1),ai:SPEC[kind].ai||kind,kind,x:P.x+Math.cos(g)*70,y:P.y+Math.sin(g)*70},8,true)}
  sfx(98,.6,'sawtooth',.2,196);
}
// Collect: the target is marked, you strike it, and everything that fights for you strikes it at once
const COLK=1.2; // Collect: each of them strikes with COLK of its heaviest blow (2 before round 11, when a large field made the skill worth more than everything else on the path)
function collect(t,D){
  debuff(t,{mark:5},D);const line=a=>{for(let k=1;k<=5;k++)bits.push({x:a.x+(t.x-a.x)*k/5,y:a.y+(t.y-a.y)*k/5,vx:0,vy:0,life:.35,max:.35,c:'#a98bff',r:3})};
  for(const a of[...allies]){if(!mons.includes(t))break;if(a.life<=0)continue;
    if(a.shade||a.pet&&!a.helper&&a.du){line(a);a.flash=.2;petHit(t,a.du[2]*COLK,a.par||a)}
    else if(a.trophy&&a.ent){a.t=0}
    else if(a.kind==='thrall'||a.kind==='wolf'){line(a);a.cd=.7;hurtM(t,(a.kind==='wolf'?2:thrallK())*COLK*D*(1+eqv('thr')/100)*DOMSUM,true)}}
  if(TSRC.length){P.trQ=1;P.trT=t;P.trCd=0}
  if(mons.includes(t)){puff(t,'#a98bff',14,200);hurtM(t,5*D)}
}
// Sever: lesser things below half health die; the floor's own monster below a fifth of its health takes triple
function sever(t,D){puff(t,'#ffffff',16,240);rings.push({x:t.x,y:t.y,life:.35,max:.35,r:t.r+50,fx:true});
  if(!t.boss&&t.hp<=t.maxHp*.5)hurtM(t,1e9);else hurtM(t,9*D*(t.boss&&t.hp<=t.maxHp*.2?3:1))}
// the White Marrow's ring of light (every half second) and the Verdict beam (a sweep of 1.2 radians in one second; each monster it crosses is hit once)
function apexStep(dt,held){
  if(S.apex!=='order'||!cls()){P.auraR=0;if(P.beam)P.beam=null;const f=cls()&&APXSTEP[S.apex];if(f&&P.ax)f(dt,held);return}
  if(P.ascT>0)P.ascT-=dt;
  P.auraR=P.ascT>0?ORDR*1.5:ORDR;
  if((P.auraK-=dt)<=0&&S.mode==='play'&&!held){P.auraK=.5;const d=ORDAURA*(P.ascT>0?2:1)*dmgMul();
    GEO++;for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,P)<P.auraR+m.r){if(!m.boss)mSlow(m,.7);hurtM(m,d,true)}GEO--}
  if(P.bmT>0){P.bmT-=dt;const a=P.bmA+=1.2*dt,len=rayLen(P.x,P.y,a);P.beam=P.beam||{a:0,len:0,w:14,on:true};P.beam.a=a;P.beam.len=len;P.swing=a;P.atk=Math.max(P.atk,.1);
    GEO++;if(S.mode==='play')for(const m of[...mons])if(!m.hidden&&!P.bmHit.has(m)&&mons.includes(m)&&segDist(m,P.x,P.y,a,len)<14+m.r){P.bmHit.add(m);puff(m,'#ffffff',10,200);hurtM(m,14*dmgMul())}GEO--;
    if(VS)vsBeamBurn(a,len);
    for(const s of shots)if(!s.dead&&segDist(s,P.x,P.y,a,len)<22){s.dead=true;if(MP.on)mpShotHit(s)}
    if(P.bmT<=0)P.beam=null}
  else if(P.beam)P.beam=null;
}
/* ---------- the further apex paths (round 10): beasts, frost, plague, flame on the dominion side; storm, stone, blade, tide on the order side ---------- */
// What they share:
//  statuses on monsters (stApply, run by the host in co-op; a client asks with the hit op 'ap'): m.chill 0..1, m.frozen (s), m.rot 0..5 with m.rotT (s), m.burn (s), m.shock (s), m.soak (s). In versus a status on a hero becomes a slow, a stun or a poison (vsSt).
//  fields of their own (fieldA; f.ax): 'ice', 'rot', 'fire' (discs), 'wave' (a disc that moves: vx, vy) and 'quake' (a line: x2, y2, half-width w, no r). A field with `follow` stays on its owner.
//  free allies (apxAlly; a.apexAlly): 'packbeast', 'icewight', 'cinder'. They cost nothing, cannot be hurt by monsters, and go when their time is up. In versus they have health and can be killed.
//  arcs (MB.arcs): short-lived lightning segments, for the eye only.
//  the hero's own state: P.pack, P.plates, P.blades, P.haste, and P.ax for everything else of the path.
let arcs=[];
// U: one hundredth of the health of the floor's reference monster, with the thrall-and-pet trinket: what the dominion side's damage is counted in
const UD=()=>GREF(S.level)*.01*Math.pow(1+eqv('thr')/100,NEC.ud)*axK();
function arc(x1,y1,x2,y2,c){if(arcs.length>90)arcs.shift();arcs.push({x1,y1,x2,y2,life:.26,max:.26,col:c||AX.col.storm});if(MP.on&&MP.aq.length<40)MP.aq.push([Math.round(x1),Math.round(y1),Math.round(x2),Math.round(y2)])}
const trail=(a,b,c,n=5)=>{for(let k=1;k<=n;k++)bits.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n,vx:0,vy:0,life:.3,max:.3,c,r:2.5})};
// how far a point is from the line of a fissure
const quakeD=(e,f)=>{const dx=f.x2-f.x,dy=f.y2-f.y,l2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((e.x-f.x)*dx+(e.y-f.y)*dy)/l2));return Math.hypot(e.x-f.x-dx*t,e.y-f.y-dy*t)};
/* --- statuses --- */
const STK=['chill','freeze','rot','burn','shock','soak','rotp']; // rotp: rot that spread by itself (see AX.plague)
function stFreeze(m,t,d){
  if(m.frozen>0)return;m.frozen=t;m.chill=1;m.stun=Math.max(m.stun||0,t);m.beam=null;m.shatD=d||m.shatD||0;m.frzRem=REM;
  puff(m,'#dff4ff',12,150);rings.push({x:m.x,y:m.y,life:.35,max:.35,r:m.r+26,fx:true});sfx(1800,.14,'triangle',.12,700)}
// the host's (or the lone player's) own doing. k: the status, v: how much (chill 0..1, rot stacks) or how long (s), d: the damage that goes with it (a shatter, a tick of rot per stack, a tick of fire)
function stApply(m,k,v,d){
  if(!m||m.vs||m.decoy||m.hidden||!(v>0)||m.hp<=0)return;d=d>0?d:0;
  if(m.ward>0&&k!=='soak')return;
  if(k==='chill'){const F=AX.frost;if(m.frozen>0||m.thawT>0)return;m.chill=Math.min(1,(m.chill||0)+v*(m.boss?F.bossK:1)*(m.soak>0?1.5:1));m.chillT=F.hold;if(d>(m.shatD||0))m.shatD=d;if(m.chill>=1)stFreeze(m,m.boss?F.frzB:F.frz,m.shatD)}
  else if(k==='freeze'){m.thawT=0;stFreeze(m,m.boss?v*.5:v,d)}
  else if(k==='rot'||k==='rotp'){const G=AX.plague,n=Math.round(v),own=k==='rot',had=m.rot||0,cap=own||!m.boss?5:Math.max(had,G.bossCap);m.rot=Math.min(cap,had+n);if(!(m.rot>0))return;
    if(own)m.rotT=Math.max(m.rotT||0,n>=5?G.ultT:G.t);else if(!had)m.rotT=Math.max(m.rotT||0,G.tp); // only your own doing holds it
    if(d>=(m.rotD||0)){m.rotD=d;m.rotRem=REM}if(!(m.rotK>0))m.rotK=.5}
  else if(k==='burn'){m.burn=Math.max(m.burn||0,v);if(d>=(m.burnD||0)){m.burnD=d;m.burnRem=REM}if(!(m.burnK>0))m.burnK=.5}
  else if(k==='shock'){if(m.shockI>0)return;m.shock=v;m.shockI=m.boss?AX.storm.immB:AX.storm.imm;m.stun=Math.max(m.stun||0,m.boss?v*.5:v)}
  else if(k==='soak')m.soak=Math.max(m.soak||0,v);
}
// what an attack calls: alone and on the host it happens; a client asks the host; a hostile hero or creature gets what a hero can get
function mSt(m,k,v,d){
  if(!m)return;if(m.vs)return vsSt(m,k,v,d||0);
  if(CL()){if(!m.hidden&&!m.decoy)mpQ(['ap',m.id,STK.indexOf(k),Math.round(v*100)/100,Math.round((d||0)*100)/100]);return}
  stApply(m,k,v,d)}
// thawing or dying frozen: a blow to it (if it lives) and a lesser one to everything near, which is chilled
function shatter(m,dead){
  const F=AX.frost,D=m.shatD||0,was=REM;m.frozen=0;m.chill=0;m.shatD=0;m.thawT=m.boss?F.thawB:F.thaw;
  rings.push({x:m.x,y:m.y,life:.4,max:.4,r:F.shatR,fx:true});puff(m,'#dff4ff',18,240);sfx(1500,.2,'triangle',.16,420);noise(.12,.2,6000,2500);
  if(!(D>0))return;REM=m.frzRem||null;
  for(const o of[...mons])if(o!==m&&!o.hidden&&!o.decoy&&mons.includes(o)&&dist(o,m)<F.shatR+o.r){hurtM(o,D*F.shatK,true);if(mons.includes(o))stApply(o,'chill',F.shatCh,D)}
  if(!dead&&mons.includes(m))hurtM(m,D,true);
  REM=was}
function rotSpread(m){
  const G=AX.plague;if(m.rot<2)return;let b=null,bd=G.spR;for(const o of mons){if(o===m||o.hidden||o.decoy||o.ward>0||(o.rot||0)>=m.rot)continue;const d=dist(o,m)-o.r;if(d<bd){bd=d;b=o}}
  if(b){const was=REM;REM=m.rotRem||null;stApply(b,'rotp',1,m.rotD);REM=was;trail(m,b,AX.col.plague,6)}}
// every step, for a monster that carries any of them. True when it died of one.
function stStep(m,dt){
  if(m.thawT>0)m.thawT-=dt;if(m.shockI>0)m.shockI-=dt;if(m.soak>0)m.soak-=dt;if(m.shock>0)m.shock-=dt;
  if(m.frozen>0){if((m.frozen-=dt)<=0){shatter(m);if(!mons.includes(m))return true}}
  else if(m.chill>0&&(m.chillT-=dt)<=0)m.chill=Math.max(0,m.chill-dt*.4);
  if(m.burn>0){m.burn-=dt;if((m.burnK-=dt)<=0){m.burnK=.5;REM=m.burnRem||null;hurtM(m,m.burnD,true);REM=null;if(!mons.includes(m))return true}if(m.burn<=0){m.burn=0;m.burnD=0}}
  if(m.rot>0){const G=AX.plague,n=m.rot;m.rotT-=dt;
    if((m.rotK-=dt)<=0){m.rotK=.5;REM=m.rotRem||null;hurtM(m,m.rotD*n*(1+G.ramp*(n-1)),true);REM=null;if(!mons.includes(m))return true}
    if((m.rotS=(m.rotS>0?m.rotS:G.sp)-dt)<=0)rotSpread(m);
    if(m.rotT<=0){m.rotT=0;if((m.rotF=(m.rotF>0?m.rotF:G.fade)-dt)<=0&&--m.rot<=0){m.rot=0;m.rotD=0}}else m.rotF=0} // unfed, it falls away a layer at a time
  return false}
// a lesser monster died carrying one: the ice shatters, the rot leaps and leaves a cloud, the fire stays on the ground
function stDeath(m){
  const was=REM;
  if(m.frozen>0){REM=m.frzRem||null;shatter(m,true)}
  if(m.rot>0){const G=AX.plague,n=m.rot;REM=m.rotRem||null;
    for(const o of[...mons])if(!o.hidden&&!o.decoy&&dist(o,m)<G.leap+o.r&&(o.rot||0)<n){stApply(o,'rotp',n-(o.rot||0),m.rotD);trail(m,o,AX.col.plague,6)}
    if(!fields.some(f=>f.kind==='rot'&&!f.follow&&Math.hypot(f.x-m.x,f.y-m.y)<45)&&fields.length<50)fieldA('rot',m.x,m.y,G.cloudR,G.cloudT,1,0,{sd:m.rotD})}
  if(m.burn>0&&m.burnD>0){REM=m.burnRem||null;const C=AX.flame;
    if(!fields.some(f=>f.kind==='fire'&&!f.follow&&Math.hypot(f.x-m.x,f.y-m.y)<40)&&fields.length<50)fieldA('fire',m.x,m.y,C.patchR,C.patchT,.5,m.burnD*.75,{sd:m.burnD})}
  REM=was}
/* --- fields --- */
const FKX={ice:1,rot:1,fire:1,wave:1,quake:1};
function fieldA(kind,x,y,r,dur,every,dmg,o){
  const f=Object.assign({kind,x,y,r,t:0,dur,every,tick:0,dmg:dmg||0,slow:kind==='ice'||kind==='quake',ax:true},o||{});
  if(kind==='quake'){f.w=r;delete f.r}else if(!f.follow&&kind!=='wave')clamp(f,10);
  fields.push(f);return f}
function wave(x,y,g,r,d,len,o){
  const T=AX.tide,f=fieldA('wave',x+Math.cos(g)*18,y+Math.sin(g)*18,r,len/T.wspd,.5,d,Object.assign({vx:Math.cos(g)*T.wspd,vy:Math.sin(g)*T.wspd,hit:new Set(),soak:T.soak,pk:0,push:1},o||{}));
  sfx(140,.5,'sine',.14,60);noise(.5,.12,900,300);return f}
// one of the new fields, every step (mine, a team-mate's copy, or a foe's in versus)
function fieldX(f,dt){
  f.t+=dt;const k=f.kind;
  if(f.follow){const o=f.own?f.own.P:P;if(f.own&&(f.own.dead||f.own.away||!MP.remotes.includes(f.own))){f.t=f.dur;return}if(o){f.x=o.x;f.y=o.y}}
  if(k==='wave'){
    f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.x<WALL-10||f.x>W-WALL+10||f.y<WALL-10||f.y>H-WALL+10){f.t=f.dur;return}
    if(rand()<dt*24)bits.push({x:f.x+rand()*f.r*1.4-f.r*.7,y:f.y+rand()*f.r*1.4-f.r*.7,vx:f.vx*.3,vy:f.vy*.3,life:.4,max:.4,c:rand()<.5?AX.col.tide:'#d8fff8',r:2.5});
    if(f.rem){if(f.foe&&VS)vsWave(f);return}
    const go=(f.pk-=dt)<=0;if(go)f.pk=.1;
    GEO++;for(const m of[...mons]){if(m.hidden||!mons.includes(m)||dist(m,f)>f.r+m.r)continue;
      if(!f.hit.has(m)){f.hit.add(m);mSt(m,'soak',f.soak);hurtM(m,f.dmg)}
      if(go&&mons.includes(m)&&!m.vs&&!m.decoy&&m.st!=='leap'){const q=(m.boss?.22:1)*f.push*.1;mPush(m,f.vx*q,f.vy*q)}}GEO--;
    return}
  if((f.tick-=dt)>0)return;f.tick=f.every;f.n=!f.n;
  {const c=k==='ice'?'#bfe9ff':k==='rot'?AX.col.plague:k==='fire'?(rand()<.5?'#ff8a4c':'#ffd95e'):AX.col.stone;
    for(let i=0;i<(k==='quake'?4:5);i++){let x,y;if(k==='quake'){const u=rand();x=f.x+(f.x2-f.x)*u+rand()*16-8;y=f.y+(f.y2-f.y)*u+rand()*16-8}else{const a=rand()*TAU,d=rand()*f.r;x=f.x+Math.cos(a)*d;y=f.y+Math.sin(a)*d}
      bits.push({x,y,vx:0,vy:k==='fire'?-50:k==='rot'?-14:-26,life:.5,max:.5,c,r:2.5})}}
  if(f.rem){if(f.foe&&VS)vsField(f);return}
  GEO++;for(const m of[...mons]){if(m.hidden||!mons.includes(m))continue;if(k==='quake'?quakeD(m,f)>=f.w+m.r:dist(m,f)>=f.r+m.r)continue;
    if(k==='ice')mSt(m,'chill',f.st||.2,f.sd);else if(k==='rot')mSt(m,f.fed?'rot':'rotp',1,f.sd);else if(k==='fire')mSt(m,'burn',2.5,f.sd);else if(!m.boss)mSlow(m,.8);
    if(f.dmg>0&&mons.includes(m))hurtM(m,f.dmg,true)}GEO--;
}
/* --- an area blow of mine at a point: everything within r takes d. In versus it travels with its ring (me.r) and the victim decides --- */
function burst(x,y,r,d,o){
  o=o||{};rings.push({x,y,life:.4,max:.4,r,fx:true});
  if(MP.on)MP.rq.push(VS?[Math.round(x),Math.round(y),Math.round(r),40,Math.round(d*100)/100]:[Math.round(x),Math.round(y),Math.round(r),40]);
  GEO++;for(const m of[...mons]){if(m.hidden||!mons.includes(m)||Math.hypot(m.x-x,m.y-y)>=r+m.r)continue;if(o.fn)o.fn(m);if(d>0&&mons.includes(m))hurtM(m,d,o.quiet)}GEO--;
}
/* --- the free allies --- */
function apxAlly(kind,life,o){
  if(hcap('alone')&&!VS)return null; // the Ordeal 'alone': nothing of the path comes along
  o=o||{};const g=rand()*TAU,a={nid:nid(),kind,apexAlly:true,over:!!o.over,x:o.x===undefined?P.x+Math.cos(g)*44:o.x,y:o.y===undefined?P.y+Math.sin(g)*44:o.y,r:kind==='packbeast'?13:kind==='icewight'?19:8,hp:1,maxHp:1,st:'idle',t:0,ang:g,face:g,flash:.25,life,max:life,
    walk:rand()*6,flip:false,moving:false,cd:o.cd===undefined?.3+rand()*.5:o.cd,seed:rand()*9};
  clamp(a,a.r);if(obstacles.length)collide(a,a.r,kind!=='cinder');allies.push(a);puff(a,AX.col[kind],8,130);return a}
const packCap=()=>Math.min(AX.beast.capMax,AX.beast.cap0+Math.max(0,Math.floor((S.level-100)/AX.beast.capK)));
const cinderCap=()=>Math.min(AX.flame.capMax,AX.flame.cap0+Math.max(0,Math.floor((S.level-100)/AX.flame.capK)));
const bladeCap=()=>Math.min(6,AX.blade.n0+Math.max(0,Math.floor((S.level-100)/AX.blade.nK)));
const packBite=()=>UD()*AX.beast.bite*(1+AX.beast.syn*Math.max(0,(P.pack||1)-1));
function cinderBurst(a){
  const C=AX.flame,sd=UD()*C.burn;a.life=0;puff(a,'#ffd27a',16,240);S.shake=Math.max(S.shake,.1);noise(.18,.25,800,200);sfx(160,.2,'sawtooth',.14,70);
  burst(a.x,a.y,C.br,UD()*C.bd,{quiet:true,fn:m=>mSt(m,'burn',C.burnT,sd)});
  if(fields.length<50)fieldA('fire',a.x,a.y,C.patchR,C.patchT,.5,UD()*C.patch,{sd})}
function allyX(a,dt){
  a.life-=dt;a.moving=false;if(a.flash>0)a.flash-=dt;if(a.cd>0)a.cd-=dt;
  if(a.life<=0){puff(a,AX.col[a.kind],8,120);return}
  if(a.vStun>0){a.vStun-=dt;return}
  const k=a.kind,X=P.ax||{};
  const go=(g,sp,d)=>{if(a.avT>0)a.avT-=dt;if(obstacles.length&&k!=='cinder')g=steer(a,g,d);a.x+=Math.cos(g)*sp*dt;a.y+=Math.sin(g)*sp*dt;a.walk+=dt*12;a.flip=Math.cos(g)<0;a.moving=true;a.face=g;clamp(a,a.r);if(obstacles.length)collide(a,a.r,k!=='cinder')};
  if(k==='packbeast'){const B=AX.beast,fr=X.howl>0;
    if(a.st==='wind'){if((a.t-=dt)<=0){a.st='lunge';a.t=.12}return}
    if(a.st==='lunge'){a.x+=Math.cos(a.ang)*420*dt;a.y+=Math.sin(a.ang)*420*dt;clamp(a,a.r);a.moving=true;a.face=a.ang;
      if((a.t-=dt)<=0){a.st='idle';a.cd=B.cd*(fr?.5:1);const m=a.tg;a.tg=null;if(m&&mons.includes(m)&&!m.hidden&&dist(a,m)<m.r+a.r+30){GEO++;hurtM(m,packBite(),true);GEO--}}return}
    const t=X.prey&&mons.includes(X.prey)&&!X.prey.hidden&&!(X.prey.ward>.3)?X.prey:petTarget(a);
    if(t){const d=dist(a,t),g=angTo(a,t);if(d>t.r+a.r+8)go(g+Math.sin(S.t*2+a.seed)*.3,B.spd*(fr?1.4:1),d);else a.face=g;
      if(d<t.r+a.r+34&&a.cd<=0){a.st='wind';a.t=.16;a.ang=g;a.tg=t}}
    else{const d=dist(a,P);if(d>58+a.r)go(angTo(a,P),235,d)}
    return}
  if(k==='icewight'){const F=AX.frost;
    if(a.st==='wind'){if((a.t-=dt)<=0){a.st='cast';a.t=.3;a.cd=F.wcd;const sd=UD()*F.shat;burst(a.x,a.y,F.wr,UD()*F.wd,{quiet:true,fn:m=>mSt(m,'chill',F.wch,sd)});S.shake=Math.max(S.shake,.12);sfx(90,.25,'square',.2,45);puff(a,'#dff4ff',12,200)}return}
    if(a.st==='cast'){if((a.t-=dt)<=0)a.st='idle';return}
    let tg=null,bd=F.wreach;for(const m of mons){if(m.hidden||m.decoy)continue;const d=dist(m,P)-m.r+(m.ward>.3?2000:0);if(d<bd){bd=d;tg=m}} // it guards: whatever is nearest to you
    if(tg){const d=dist(a,tg),g=angTo(a,tg);if(d>tg.r+F.wr*.55)go(g,F.wspd,d);else a.face=g;if(d<tg.r+F.wr*.8&&a.cd<=0){a.st='wind';a.t=.55;a.ang=g}}
    else{const d=dist(a,P);if(d>74)go(angTo(a,P),F.wspd,d)}
    return}
  const C=AX.flame; // a cinder: it hangs by you, then throws itself at the nearest monster
  if(a.st==='charge'){let m=a.tg;if(!m||!mons.includes(m)||m.hidden)m=a.tg=petTarget(a);if(m)a.ang=angTo(a,m);
    a.x+=Math.cos(a.ang)*C.spd*dt;a.y+=Math.sin(a.ang)*C.spd*dt;a.face=a.ang;a.moving=true;const wall=clamp(a,a.r);
    if(rand()<dt*40)bits.push({x:a.x,y:a.y,vx:0,vy:-20,life:.3,max:.3,c:rand()<.5?'#ff8a4c':'#ffd95e',r:2.5});
    if((a.t-=dt)<=0||wall||m&&dist(a,m)<m.r+a.r+6)cinderBurst(a);return}
  {const g=S.t*1.7+a.seed*2.1,px=P.x+Math.cos(g)*36,py=P.y+Math.sin(g)*26-8,q=Math.min(1,dt*6);a.x+=(px-a.x)*q;a.y+=(py-a.y)*q;a.face=g+1.57;a.walk+=dt*8}
  if(a.cd<=0&&S.mode==='play'){let m=null,bd=C.reach;for(const o of mons){if(o.hidden||o.decoy)continue;const d=dist(o,P)-o.r+(o.ward>.3?2000:0);if(d<bd){bd=d;m=o}}
    if(m){a.st='charge';a.t=1.6;a.tg=m;a.ang=angTo(a,m);sfx(700,.14,'sawtooth',.08,240)}}
}
/* --- lightning: from (x,y) to m, then on to up to n more within reach, each leap `fall` of the one before --- */
function chain(x,y,m,d,n,reach,fall){
  const Z=AX.storm,hit=new Set();let px=x,py=y,cur=m,k=0;fall=fall||Z.fall;
  while(cur&&k<=n){hit.add(cur);arc(px,py,cur.x,cur.y);px=cur.x;py=cur.y;
    mSt(cur,'shock',Z.shock);if(mons.includes(cur))hurtM(cur,d*Math.pow(fall,k)*(cur.soak>0?1.3:1),k>0);
    let nx=null,bd=reach;for(const o of mons){if(hit.has(o)||o.hidden||o.decoy)continue;const q=Math.hypot(o.x-px,o.y-py)-o.r;if(q<bd){bd=q;nx=o}}cur=nx;k++}
  sfx(1900,.1,'sawtooth',.09,300);noise(.08,.12,5000,1500)}
const skyBolt=(m,d,n,fall)=>{S.shake=Math.max(S.shake,.12);chain(m.x+rand()*40-20,m.y-230,m,d,n,220,fall)};
/* --- blades --- */
// one cut of the blades on m, worth d; every AX.blade.combo-th on the same monster is a great cut
function bladeCut(m,d,own){
  const B=AX.blade,X=P.ax;if(!mons.includes(m))return;
  if(S.t-(X.cutAt||0)>.09){X.cutAt=S.t;const g=rand()*TAU;trail({x:m.x+Math.cos(g)*(m.r+22),y:m.y+Math.sin(g)*(m.r+22)},{x:m.x-Math.cos(g)*(m.r+22),y:m.y-Math.sin(g)*(m.r+22)},rand()<.5?AX.col.blade:'#eef2ff',6)}
  if(S.t-(m.cutT||0)>B.comboT){m.cuts=0;m.cutD=0}m.cutT=S.t;m.cuts=(m.cuts||0)+1;m.cutD=(m.cutD||0)+(own||d);
  hurtM(m,d,true);
  if(m.cuts>=B.combo&&mons.includes(m)){const g=m.cutD*B.comboK;m.cuts=0;m.cutD=0;rings.push({x:m.x,y:m.y,life:.3,max:.3,r:m.r+44,fx:true});puff(m,'#eef2ff',12,220);sfx(2400,.1,'triangle',.12,900);hurtM(m,g)}
}
// the nearest monster above ground within reach of the hero (nothing warded while there is a choice)
function nearM(reach){let b=null,bd=reach;for(const m of mons){if(m.hidden||m.decoy)continue;const d=dist(m,P)-m.r+(m.ward>.3?2000:0);if(d<bd){bd=d;b=m}}return b}
/* --- what a path does every step (called while the hero stands; held: the banner is up or a versus round has not begun) --- */
const APXSTEP={
 beasts(dt,held){const X=P.ax,B=AX.beast;let n=0,all=0;for(const a of allies)if(a.kind==='packbeast'&&a.life>0){all++;if(!a.over)n++}P.pack=all;
   if(X.howl>0)X.howl-=dt;if(held||S.mode!=='play')return;const cap=packCap();
   if(X.first){X.first=false;for(let i=n;i<cap;i++)apxAlly('packbeast',B.life*(.55+.45*(i+1)/cap));X.t=B.t;return} // (they do not all fade in the same breath)
   if(n<cap&&(X.t-=dt)<=0){X.t=B.t;apxAlly('packbeast',B.life);sfx(260,.25,'sawtooth',.08,130)}},
 frost(dt,held){const X=P.ax,F=AX.frost;if(held||S.mode!=='play')return;let n=0;for(const a of allies)if(a.kind==='icewight'&&a.life>0)n++;const cap=F.wights+(S.level>=150?1:0);
   if(X.first){X.first=false;for(let i=n;i<cap;i++)apxAlly('icewight',F.wlife*(.55+.45*(i+1)/cap));X.t=F.wt;return}
   if(n<cap&&(X.t-=dt)<=0){X.t=F.wt;apxAlly('icewight',F.wlife);sfx(900,.3,'sine',.08,300)}},
 plague(dt,held){const X=P.ax,G=AX.plague;if(S.mode!=='play')return;
   if(!X.mia||!fields.includes(X.mia))X.mia=fieldA('rot',P.x,P.y,G.auraR,1e9,G.auraT,0,{follow:true});X.mia.sd=UD()*G.d},
 flame(dt,held){const X=P.ax,C=AX.flame;if(held||S.mode!=='play')return;let n=0;for(const a of allies)if(a.kind==='cinder'&&a.life>0&&!a.over&&a.st!=='charge')n++;
   if(n<cinderCap()&&(X.t-=dt)<=0){X.t=C.t;apxAlly('cinder',C.life,{cd:.6});sfx(500,.12,'triangle',.06,900)}},
 storm(dt,held){const X=P.ax,Z=AX.storm;if(X.surge>0){X.surge-=dt;P.haste=1}else if(P.haste>0)P.haste=Math.max(0,P.haste-Z.decay*dt);if(X.ch>0)X.ch-=dt;
   if(S.mode==='play'&&!held&&(X.t-=dt)<=0){const m=nearM(Z.sparkR);if(m){X.t=Z.sparkT;const g=GEO;GEO=0;chain(P.x,P.y-12,m,Z.sparkD*dmgMul(),1,Z.reach);GEO=g}}
   if(X.temp>0&&S.mode==='play'&&!held){X.temp-=dt;if((X.tk-=dt)<=0){X.tk=Z.tempK;let L=0;for(const m of mons)if(!m.hidden&&!m.decoy)L++;
     if(L){let i=Math.floor(rand()*L);for(const m of mons){if(m.hidden||m.decoy)continue;if(!i--){skyBolt(m,Z.tempD*dmgMul(),1);break}}}}}},
 stone(dt,held){const X=P.ax,Q=AX.stone;if(P.plates<Q.plates){if((X.t-=dt)<=0){P.plates++;X.t=Q.regrow;sfx(300,.08,'triangle',.1,500)}}else X.t=Q.regrow;
   if(S.mode==='play'&&!held&&(X.qk=(X.qk===undefined?Q.quakeT:X.qk)-dt)<=0){const m=nearM(Q.quakeReach);if(m){X.qk=Q.quakeT;puff(m,AX.col.stone,8,160);sfx(70,.2,'square',.16,35);burst(m.x,m.y,Q.quakeR,Q.quakeD*dmgMul(),{quiet:true})}}},
 blade(dt,held){const X=P.ax,B=AX.blade;P.blades=bladeCap();
   if(S.mode==='play'&&!held&&(X.t-=dt)<=0){const m=nearM(B.autoR);if(m){X.t=B.autoT/Math.max(1,P.blades);trail({x:P.x,y:P.y-30},m,AX.col.blade,5);const g=GEO;GEO=0;bladeCut(m,B.autoD*dmgMul());GEO=g}}
   if(X.cutN>0&&S.mode==='play'&&!held&&(X.cutK-=dt)<=0){const m=X.cutM;if(!mons.includes(m)||m.hidden)X.cutN=0;
     else{X.cutK=B.ultK;X.cutN--;const g=GEO;GEO=0;bladeCut(m,B.ultD*dmgMul());
       if(!X.cutN&&mons.includes(m)){puff(m,'#ffffff',18,260);rings.push({x:m.x,y:m.y,life:.4,max:.4,r:m.r+70,fx:true});S.shake=Math.max(S.shake,.25);hurtM(m,!m.boss&&m.hp<=m.maxHp*.5?m.hp+1:B.ultEnd*dmgMul())}GEO=g}}},
 tide(dt,held){const X=P.ax,T=AX.tide;if(S.mode!=='play'||held)return;
   if(X.flood>0){X.flood-=dt;if(X.fl2>0&&(X.fl2-=dt)<=0)waveRing()}
   if((X.rg=(X.rg||0)+dt)>=T.regenT*(X.flood>0?T.floodK:1)){X.rg=0;if(P.hp<P.maxHp){healP(T.regen);puff(P,AX.col.tide,4,70)}}
   if((X.t-=dt)<=0){const m=petTarget(P);if(m&&dist(m,P)<T.reach+m.r){X.t=T.t;wave(P.x,P.y,angTo(P,m),T.wr,T.wd*dmgMul(),T.wlen)}}},
};
function waveRing(){const T=AX.tide;for(let i=0;i<8;i++)wave(P.x,P.y,i*TAU/8+.2,T.wr,T.fd*dmgMul(),T.wlen)}
// what the path's state is at the start of a floor
function apxBody(){
  P.plates=0;P.blades=0;P.haste=0;P.pack=0;P.ax={first:true,t:0,n:0,acc:0,ch:0};const a=act2()&&S.cls?S.apex:null;
  if(a==='stone'){P.plates=Math.min(AX.stone.plates,AX.stone.start);P.ax.t=AX.stone.regrow}else if(a==='blade')P.blades=bladeCap();else if(a==='tide')P.ax.t=1.5;else if(a==='flame')P.ax.t=.8}
/* --- a blow of my own has landed on m for d (a strike, or a bolt, arrow, spear or orb of mine): what the path adds --- */
const APXHIT={
 beasts(m){P.ax.prey=m},
 frost(m){if(S.t<(m.chI||0))return;m.chI=S.t+AX.frost.icd;mSt(m,'chill',AX.frost.hit,UD()*AX.frost.shat)},
 plague(m){if(S.t<(m.rotI||0))return;m.rotI=S.t+AX.plague.icd;mSt(m,'rot',1,UD()*AX.plague.d)},
 flame(m){if(S.t<(m.buI||0))return;m.buI=S.t+.5;mSt(m,'burn',AX.flame.hitT,UD()*AX.flame.burn)},
 storm(m,d){const X=P.ax,Z=AX.storm;P.haste=Math.min(1,P.haste+Z.gain);X.acc+=d;if(X.ch>0)return;X.ch=X.surge>0?Z.icdS:Z.icd;const q=X.acc*Z.k;X.acc=0;chain(P.x,P.y-12,m,q,Z.jumps+(P.haste>=.99?1:0),Z.reach)},
 stone(m,d){const X=P.ax,Q=AX.stone;X.acc+=d;if(++X.n<Q.every)return;X.n=0;const q=X.acc*Q.crush;X.acc=0;if(P.plates<Q.plates)X.t-=Q.grow;puff(m,AX.col.stone,10,200);S.shake=Math.max(S.shake,.1);sfx(80,.16,'square',.2,40);burst(m.x,m.y,Q.crushR,q,{fn:o=>{if(!o.boss)mStun(o,Q.cstun)}})},
 blade(m,d){const B=AX.blade;if(P.blades>0)bladeCut(m,d*B.per*P.blades,d);if(mons.includes(m)&&!m.boss&&!m.hero&&m.hp<=m.maxHp*B.exec){puff(m,'#eef2ff',10,200);hurtM(m,m.hp+1)}},
};
function apexHit(m,d){
  const f=APXHIT[S.apex];if(!f||!cls()||!P.ax||m.decoy||m.hidden)return;
  if(!mons.includes(m)){if(S.apex!=='storm')return;let b=null,bd=AX.storm.reach;for(const o of mons){if(o.hidden||o.decoy)continue;const q=dist(o,m)-o.r;if(q<bd){bd=q;b=o}}P.ax.acc+=d;if(!b)return;m=b;d=0} // the blow killed it: the lightning goes on from there
  const g=GEO;GEO=0;try{f(m,d)}finally{GEO=g}}
// a guard plate takes the blow
function plateBreak(vs){
  const Q=AX.stone;P.plates--;if(!vs)P.inv=.5;puff(P,AX.col.stone,14,200);SND.block();haptic(30);floats.push({x:P.x,y:P.y-44,txt:'Plate',life:.7,c:AX.col.stone});
  const g=GEO;GEO=0;burst(P.x,P.y,Q.cr,Q.cd*dmgMul(),{fn:m=>{if(!m.boss)mStun(m,Q.cstun)}});GEO=g;S.shake=Math.max(S.shake,.2)}
/* --- the skills (one building block each, run by cast) --- */
const APXOP={
 howl(){const X=P.ax,B=AX.beast;X.howl=B.howl;let n=0;for(const a of allies)if(a.kind==='packbeast'&&a.life>0&&!a.over){n++;a.cd=0}for(let i=n;i<packCap();i++)apxAlly('packbeast',B.life);X.t=B.t;X.first=false;sfx(196,.7,'sawtooth',.16,392);sfx(294,.6,'triangle',.1,523,.1)},
 rundown(x){const t=x.t,B=AX.beast;if(!mons.includes(t))return;debuff(t,{mark:5,slow:2},x.D);P.ax.prey=t;let i=0;
   for(const a of allies){if(a.kind!=='packbeast'||a.life<=0||!mons.includes(t))continue;const g=i++*2.4+a.seed;trail(a,t,AX.col.packbeast,6);a.x=t.x+Math.cos(g)*(t.r+a.r+4);a.y=t.y+Math.sin(g)*(t.r+a.r+4);clamp(a,a.r);a.face=g+Math.PI;a.flash=.25;a.st='idle';a.cd=.4;hurtM(t,packBite()*B.runK,true)}
   sfx(220,.3,'sawtooth',.16,110)},
 longhunt(){const B=AX.beast;for(let i=0;i<B.huntN;i++)apxAlly('packbeast',B.huntT,{over:true,cd:.2});sfx(147,.8,'sawtooth',.16,294)},
 rime(x){const F=AX.frost;fieldA('ice',x.at.x,x.at.y,F.rimeR,F.rimeT,.5,UD()*F.rimeD,{st:F.rimeCh,sd:UD()*F.shat});sfx(1200,.5,'sine',.12,400)},
 shatterall(){const F=AX.frost,u=UD();S.shake=Math.max(S.shake,.25);sfx(1500,.25,'triangle',.18,300);noise(.2,.25,6000,2000);
   for(const m of[...mons]){if(m.hidden||m.decoy||!mons.includes(m))continue;
     if(m.frozen>0){puff(m,'#dff4ff',16,240);burst(m.x,m.y,F.shatR,u*F.skA,{quiet:true,fn:o=>{if(o!==m)mSt(o,'chill',F.shatCh,u*F.shat)}});if(mons.includes(m))hurtM(m,u*(F.skF-F.skA))}
     else if(m.chill>0){puff(m,'#bfe9ff',8,160);hurtM(m,u*F.skC*Math.max(.34,m.chill),true);if(mons.includes(m))mSt(m,'chill',.3,u*F.shat)}}},
 winter(){const F=AX.frost,u=UD();for(const m of[...mons])if(!m.hidden&&!m.decoy&&dist(m,P)<F.ultR+m.r)mSt(m,'freeze',F.ultT,u*F.shat*1.5);for(const a of allies)if(a.kind==='icewight'&&a.st==='idle'){a.st='wind';a.t=.4}S.shake=Math.max(S.shake,.3)},
 blight(x){const G=AX.plague;fieldA('rot',x.at.x,x.at.y,G.blightR,G.blightT,1,UD()*G.blightD,{sd:UD()*G.d,fed:true});sfx(140,.5,'sawtooth',.1,90)},
 fester(){const G=AX.plague,u=UD();S.shake=Math.max(S.shake,.2);sfx(110,.4,'sawtooth',.18,55);for(const m of[...mons]){if(m.hidden||!(m.rot>0)||!mons.includes(m))continue;puff(m,AX.col.plague,12,200);rings.push({x:m.x,y:m.y,life:.3,max:.3,r:m.r+36,fx:true});hurtM(m,u*G.fester*m.rot);if(mons.includes(m))mSt(m,'rot',1,u*G.d)}},
 sickness(){const u=UD()*AX.plague.d;for(const m of[...mons])if(!m.hidden&&!m.decoy){mSt(m,'rot',5,u);puff(m,AX.col.plague,10,160)}sfx(98,.8,'sawtooth',.18,49)},
 pyre(x){const C=AX.flame;fieldA('fire',x.at.x,x.at.y,C.pyreR,C.pyreT,.5,UD()*C.pyreD,{sd:UD()*C.burn});sfx(160,.5,'sawtooth',.14,80);noise(.4,.14,500,1500)},
 coals(){const C=AX.flame;for(let i=0;i<C.coals;i++){const g=i*TAU/C.coals;apxAlly('cinder',6,{over:true,cd:.15+i*.07,x:P.x+Math.cos(g)*30,y:P.y+Math.sin(g)*30})}},
 burndown(){const C=AX.flame,X=P.ax,sd=UD()*C.burn;P.stoneT=Math.max(P.stoneT||0,C.ultT);S.shake=Math.max(S.shake,.3);burst(P.x,P.y,C.ultR,UD()*C.ultB,{fn:m=>mSt(m,'burn',C.burnT,sd)});X.pyre=fieldA('fire',P.x,P.y,C.ultR,C.ultT,.5,UD()*C.ultD,{follow:true,sd})},
 skyfall(x){if(mons.includes(x.t))skyBolt(x.t,AX.storm.boltD*x.D,AX.storm.boltN,AX.storm.boltFall)},
 stride(){const Z=AX.storm;P.ax.surge=Z.surge;P.haste=1;P.fleetT=Math.max(P.fleetT||0,Z.surge);puff(P,AX.col.storm,16,220)},
 skycomes(){P.ax.temp=AX.storm.tempT;P.ax.tk=0},
 fissure(x){const Q=AX.stone,g=x.t?x.ta:P.face,len=Math.min(Q.fisLen,rayLen(P.x,P.y,g));fieldA('quake',P.x,P.y,Q.fisW,Q.fisT,Q.fisK,Q.fisD*x.D,{x2:P.x+Math.cos(g)*len,y2:P.y+Math.sin(g)*len});S.shake=Math.max(S.shake,.25);sfx(60,.5,'square',.3,30);noise(.4,.3,300,80)},
 standfast(){const Q=AX.stone;P.plates=Q.plates;P.ax.t=Q.regrow;P.stoneT=Math.max(P.stoneT||0,Q.standT);puff(P,AX.col.stone,16,200)},
 monolith(x){const Q=AX.stone;meteor(x.at,Q.monoR,.7,Q.monoD*x.D,{stun:1.5});zones[zones.length-1].fis=Q.fisD*x.D},
 bladefan(x){const B=AX.blade,n=Math.max(1,P.blades);for(let k=0;k<n;k++)pshot(x.ta+(k-(n-1)/2)*.15,660,B.fanD*x.D,5,'bolt',99);sfx(2000,.12,'triangle',.12,700)},
 edgewalk(x){const t=x.t,B=AX.blade;if(!mons.includes(t))return;for(let i=0;i<Math.max(1,P.blades)&&mons.includes(t);i++)bladeCut(t,B.walkD*x.D);sfx(2200,.14,'triangle',.14,600)},
 lastcut(x){const X=P.ax,B=AX.blade;if(!mons.includes(x.t))return;debuff(x.t,{mark:4},x.D);X.cutM=x.t;X.cutN=B.ultN;X.cutK=0},
 greatwave(x){const T=AX.tide;wave(P.x,P.y,x.t?x.ta:P.face,T.gr,T.gd*x.D,T.glen,{soak:T.soak+1,push:1.6})},
 undertow(x){const T=AX.tide;cast(['pull',T.pullR],x);let n=0;for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,P)<T.pullR+m.r+60){n++;mSt(m,'soak',T.soak);hurtM(m,T.ud*x.D,true)}if(n&&P.hp<P.maxHp)healP(Math.min(T.uhealMax,T.uheal*n));puff(P,AX.col.tide,16,220);sfx(120,.6,'sine',.18,50)},
 floodtide(){const X=P.ax,T=AX.tide;X.flood=T.floodT;X.fl2=3;waveRing()},
};
// a Monolith has landed: four fissures crack outward
function fisBurst(z){const Q=AX.stone;for(let i=0;i<4;i++){const g=i*TAU/4+.5,len=Math.min(Q.monoLen,rayLen(z.x,z.y,g));if(len>30)fieldA('quake',z.x,z.y,Q.fisW,Q.fisT,Q.fisK,z.fis,{x2:z.x+Math.cos(g)*len,y2:z.y+Math.sin(g)*len})}}
/* --- versus: what the new paths' statuses and waves are to a hero --- */
function vsSt(m,k,v,d){
  if(!VS||!vsLive()||!m.own)return;const now=S.t;
  if(k==='rot'||k==='rotp'){const G=AX.plague;if(now-(m._rotAt||0)>G.t)m._rotN=0;m._rotAt=now;const n=m._rotN=Math.min(5,(m._rotN||0)+Math.round(v));VP.q.push(['db',m.own.idx,m.nid|0,0,0,Math.round(d*n*1000)/1000,0]);return} // rot on a hero or its creature: a poison that deepens while it is renewed
  if(k==='burn'){VP.q.push(['db',m.own.idx,m.nid|0,0,0,Math.round(d*1000)/1000,0]);return}
  if(now-(m._stAt||0)<.25)return;m._stAt=now;
  VP.q.push(['db',m.own.idx,m.nid|0,k==='chill'||k==='soak'?1:0,k==='freeze'||k==='shock'?v:0,0,0]);
  if(d>0&&(k==='chill'||k==='freeze'))VP.q.push(['d',m.own.idx,m.nid|0,Math.round(d*(k==='freeze'?AX.frost.vsFrz:AX.frost.vsChill)*100)/100])} // the cold bites a hero a little where it would have shattered a monster
function vsWave(f){
  if(!vsLive()||S.mode!=='play')return;const by=f.vsBy,sh=e=>{e.x+=f.vx*.3;e.y+=f.vy*.3};
  if(!P.down&&!f.hit.has(P)&&dist(P,f)<f.r+8){f.hit.add(P);if(vsHurt(f.vsD,by,'wave')&&!(P.dashT>0)){sh(P);clamp(P,14);collide(P,14,true);P.safeX=P.x;P.safeY=P.y;vsCC({slow:1},by)}}
  for(const a of allies)if(!f.hit.has(a)&&vsCanHurt(a)&&dist(a,f)<f.r+a.r){f.hit.add(a);if(vsHurtPet(a,f.vsD,by)){sh(a);clamp(a,a.r)}}}
// a field of another member arrives (me.f). vs: the row carries its damage and whether it slows
function mpFieldIn(r,a,vs){
  const kind=FKIND[a[0]]||'rain',f={kind,x:+a[1]||0,y:+a[2]||0,r:+a[3]||80,t:0,dur:Math.min(30,(+a[4]||100)/100),every:Math.max(.2,(+a[5]||50)/100),tick:0,dmg:0,slow:false,rem:true};
  if(vs){f.foe=r.foe;f.vsD=r.foe?+a[6]||0:0;f.vsSlow=!!a[7];f.vsBy=r.idx}
  if(FKX[kind]){const o=vs?8:6;f.ax=true;
    if(kind==='quake'){f.w=Math.max(4,Math.min(80,f.r));delete f.r;f.x2=+a[o]||f.x;f.y2=+a[o+1]||f.y}
    else if(kind==='wave'){f.vx=Math.max(-900,Math.min(900,+a[o]||0));f.vy=Math.max(-900,Math.min(900,+a[o+1]||0));f.hit=new Set()}
    if(a[o+2]){f.follow=true;f.own=r;f.dur=Math.min(1e9,(+a[4]||100)/100>=599?1e9:(+a[4]||100)/100)}}
  return f}
/* --- the 2D fallback --- */
function drawFieldX(f){
  const k=f.kind,p=.5+.5*Math.sin(S.t*6),fade=Math.min(1,Math.max(0,(f.dur-f.t)/.4),f.t/.2+.3),foe=f.foe;ctx.save();ctx.globalAlpha=fade;
  if(k==='quake'){ctx.lineCap='round';ctx.strokeStyle=foe?'rgba(184,38,61,.35)':'rgba(201,162,107,.3)';ctx.lineWidth=f.w*2;line(f.x,f.y,f.x2,f.y2);ctx.strokeStyle='#15121b';ctx.lineWidth=7;line(f.x,f.y,f.x2,f.y2);
    ctx.strokeStyle=foe?'#ff5b6e':'#e0a84a';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(f.x,f.y);const n=8,dx=(f.x2-f.x)/n,dy=(f.y2-f.y)/n,l=Math.hypot(dx,dy)||1;for(let i=1;i<=n;i++){const s=i<n?(i%2?1:-1)*7:0;ctx.lineTo(f.x+dx*i-dy/l*s,f.y+dy*i+dx/l*s)}ctx.stroke()}
  else if(k==='wave'){const g=Math.atan2(f.vy,f.vx);ctx.lineCap='round';ctx.strokeStyle=foe?'rgba(255,91,110,.5)':'rgba(25,211,197,.45)';ctx.lineWidth=14;ctx.beginPath();ctx.arc(f.x-Math.cos(g)*f.r*.4,f.y-Math.sin(g)*f.r*.4,f.r,g-1.05,g+1.05);ctx.stroke();
    ctx.strokeStyle=foe?'#ffb3bf':'#d8fff8';ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x-Math.cos(g)*f.r*.4,f.y-Math.sin(g)*f.r*.4,f.r+6,g-.95,g+.95);ctx.stroke()}
  else{const c=foe?[255,91,110]:k==='ice'?[143,216,255]:k==='rot'?[183,198,31]:[255,106,30];circ(f.x,f.y,f.r);ctx.fillStyle=`rgba(${c},${k==='fire'?.16+.08*p:.16})`;ctx.fill();ctx.strokeStyle=`rgba(${c},.65)`;ctx.lineWidth=1.5;if(k==='rot')ctx.setLineDash([5,7]);ctx.stroke();ctx.setLineDash([]);
    if(k==='ice'){ctx.strokeStyle='rgba(242,251,255,.5)';ctx.lineWidth=1.2;for(let i=0;i<3;i++){const g=i*TAU/6+.3;line(f.x-Math.cos(g)*f.r*.8,f.y-Math.sin(g)*f.r*.8,f.x+Math.cos(g)*f.r*.8,f.y+Math.sin(g)*f.r*.8)}}
    else if(k==='fire'){circ(f.x,f.y,f.r*(.45+.1*p));ctx.fillStyle='rgba(255,210,122,.14)';ctx.fill()}}
  ctx.restore()}
function drawArcs(){
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const a of arcs){const k=Math.max(0,a.life/a.max),dx=a.x2-a.x1,dy=a.y2-a.y1,l=Math.hypot(dx,dy)||1,n=Math.max(2,Math.round(l/26)),c=a.foe?'#ff5b6e':a.col||AX.col.storm;
    ctx.globalAlpha=k;ctx.beginPath();ctx.moveTo(a.x1,a.y1);for(let i=1;i<n;i++){const s=Math.sin(i*12.9898+a.x1*.31+a.y2*.17+Math.floor(a.life*30))*11;ctx.lineTo(a.x1+dx*i/n-dy/l*s,a.y1+dy*i/n+dx/l*s)}ctx.lineTo(a.x2,a.y2);
    ctx.strokeStyle=c;ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.8;ctx.stroke()}
  ctx.globalAlpha=1}
// what a monster carries, drawn over it
function drawSt(m){
  if(m.hidden)return;const r=m.r,x=m.x,y=m.y-(m.lift||0)*46;ctx.save();
  if(m.soak>0){ctx.strokeStyle='rgba(25,211,197,.75)';ctx.lineWidth=2;ctx.setLineDash([3,6]);circ(x,y,r+4);ctx.stroke();ctx.setLineDash([])}
  if(m.burn>0){ctx.strokeStyle=`rgba(255,138,76,${.6+.3*Math.sin(S.t*18+m.seed)})`;ctx.lineWidth=3;circ(x,y,r+2);ctx.stroke();ctx.fillStyle='#ffd95e';for(let i=0;i<3;i++){const g=S.t*3+i*2.1+m.seed;circ(x+Math.cos(g)*r*.8,y-r*.5+Math.sin(g*1.7)*r*.3,2.5);ctx.fill()}}
  if(m.rot>0){ctx.fillStyle='#4a4a22';for(let i=0;i<m.rot;i++){const g=i*1.26+m.seed;circ(x+Math.cos(g)*r*.6,y+Math.sin(g)*r*.6,r*.17);ctx.fill()}ctx.fillStyle=AX.col.plague;for(let i=0;i<m.rot;i++){const g=i*1.26+m.seed;circ(x+Math.cos(g)*r*.6,y+Math.sin(g)*r*.6,r*.08);ctx.fill()}}
  if(m.frozen>0){circ(x,y,r+5);ctx.fillStyle='rgba(191,233,255,.55)';ctx.fill();ctx.strokeStyle='#f2fbff';ctx.lineWidth=2.5;ctx.stroke();ctx.strokeStyle='rgba(242,251,255,.7)';ctx.lineWidth=1.2;line(x-r*.5,y-r*.7,x+r*.1,y);line(x+r*.1,y,x-r*.2,y+r*.7);line(x+r*.1,y,x+r*.7,y+r*.2)}
  else if(m.chill>0){ctx.strokeStyle='rgba(143,216,255,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r+4,-Math.PI/2,-Math.PI/2+TAU*Math.min(1,m.chill));ctx.stroke()}
  if(m.shock>0){ctx.strokeStyle='#ffe74a';ctx.lineWidth=2;for(let i=0;i<3;i++){const g=m.seed+i*2.1+Math.floor(S.t*20);ctx.beginPath();ctx.moveTo(x+Math.cos(g)*r*.3,y+Math.sin(g)*r*.3);ctx.lineTo(x+Math.cos(g+.5)*r*.8,y+Math.sin(g+.5)*r*.8);ctx.lineTo(x+Math.cos(g)*r*1.3,y+Math.sin(g)*r*1.3);ctx.stroke()}}
  ctx.restore()}
function drawApxAlly(a){
  const c=a.foe?'#ff5b6e':AX.col[a.kind],[cr,cg,cb]=rgb(c),k=Math.max(0,Math.min(1,a.life/1.2)),O='#15121b',r=a.r;
  ctx.save();ctx.globalAlpha=k;ctx.lineCap='round';
  ctx.strokeStyle=`rgba(${cr},${cg},${cb},.8)`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+r*.8,r*1.2,r*.45,0,0,TAU);ctx.stroke();
  ctx.translate(a.x+(a.st==='wind'?Math.sin(S.t*60)*1.5:0),a.y);
  if(a.kind==='packbeast'){if(a.flip)ctx.scale(-1,1);const b=Math.sin(a.walk)*2.5,lean=a.st==='lunge'?5:a.st==='wind'?-3:0;ctx.translate(lean,0);
    ctx.strokeStyle=O;ctx.lineWidth=4.4;for(const x of[-7,-3,4,8])line(x,3,x+(x%2?b:-b),11);ctx.fillStyle=O;ctx.beginPath();ctx.ellipse(0,0,14,7.6,0,0,TAU);ctx.fill();circ(11,-6,7);ctx.fill();
    ctx.fillStyle=a.flash>0?'#fff':`rgba(${cr},${cg},${cb},.85)`;ctx.beginPath();ctx.ellipse(0,0,12.4,6.2,0,0,TAU);ctx.fill();circ(11,-6,5.7);ctx.fill();
    ctx.strokeStyle='#ece4d2';ctx.lineWidth=1.6;line(8,-11,5,-18);line(13,-11,15,-18);line(-4,-5,4,-5);line(-2,-2,-2,3);line(2,-2,2,3);ctx.fillStyle='#fff';circ(13,-7,1.3);ctx.fill()}
  else if(a.kind==='icewight'){const up=a.st==='cast'?-4:a.st==='wind'?-8:0;
    ctx.fillStyle=O;ctx.beginPath();ctx.moveTo(0,-r*2.1+up);ctx.lineTo(r*.95,-r*.5);ctx.lineTo(r*.7,r*.8);ctx.lineTo(-r*.7,r*.8);ctx.lineTo(-r*.95,-r*.5);ctx.closePath();ctx.fill();
    ctx.fillStyle=a.flash>0?'#fff':`rgba(${cr},${cg},${cb},.8)`;ctx.beginPath();ctx.moveTo(0,-r*1.9+up);ctx.lineTo(r*.78,-r*.45);ctx.lineTo(r*.55,r*.65);ctx.lineTo(-r*.55,r*.65);ctx.lineTo(-r*.78,-r*.45);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(242,251,255,.8)';ctx.lineWidth=1.4;line(0,-r*1.9+up,0,r*.6);line(-r*.5,-r*.3,r*.5,-r*.3);ctx.fillStyle='#f2fbff';circ(-r*.25,-r*.9,2);ctx.fill();circ(r*.25,-r*.9,2);ctx.fill()}
  else{const p=1+.2*Math.sin(S.t*14+a.seed),g=ctx.createRadialGradient(0,-6,1,0,-6,r*2.4);g.addColorStop(0,`rgba(${cr},${cg},${cb},.7)`);g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);ctx.fillStyle=g;circ(0,-6,r*2.4);ctx.fill();
    circ(0,-6,r*.9*p);ctx.fillStyle=a.foe?'#ff8497':'#ffd27a';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=2;ctx.stroke();circ(0,-6,r*.35);ctx.fillStyle='#fff';ctx.fill()}
  ctx.restore()}
// the path's mark on a hero: plates, blades, haste, the pack's ring (q: a hero's P; ap: its path)
function drawApxHero(q,ap){
  if(!ap||ap==='dominion'||ap==='order'||!AX.col[ap]||q.down)return;const c=AX.col[ap],[cr,cg,cb]=rgb(c);ctx.save();ctx.lineCap='round';
  ctx.strokeStyle=`rgba(${cr},${cg},${cb},.5)`;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(q.x,q.y+27,26,9,0,0,TAU);ctx.stroke();
  if(q.plates>0)for(let i=0;i<q.plates;i++){const g=S.t*1.1+i*TAU/4,x=q.x+Math.cos(g)*30,y=q.y-4+Math.sin(g)*13;ctx.fillStyle='#15121b';ctx.fillRect(x-6,y-9,12,18);ctx.fillStyle=c;ctx.fillRect(x-4.5,y-7.5,9,15)}
  if(q.blades>0)for(let i=0;i<q.blades;i++){const g=-Math.PI/2+(i-(q.blades-1)/2)*.42,x=q.x+Math.cos(g)*30,y=q.y-20+Math.sin(g)*30+Math.sin(S.t*3+i)*1.5;ctx.strokeStyle='#15121b';ctx.lineWidth=5;line(x,y,x+Math.cos(g)*15,y+Math.sin(g)*15);ctx.strokeStyle='#eef2ff';ctx.lineWidth=2.6;line(x,y,x+Math.cos(g)*15,y+Math.sin(g)*15)}
  if(q.haste>.05&&q.moving){const g=Math.atan2(q.vy||0,q.vx||0)+Math.PI;ctx.strokeStyle=`rgba(${cr},${cg},${cb},${.3+.5*q.haste})`;ctx.lineWidth=2;for(const o of[-9,0,9])line(q.x+Math.cos(g)*16-Math.sin(g)*o,q.y-6+Math.sin(g)*16+Math.cos(g)*o,q.x+Math.cos(g)*(30+18*q.haste)-Math.sin(g)*o,q.y-6+Math.sin(g)*(30+18*q.haste)+Math.cos(g)*o)}
  ctx.restore()}
const apexInfo=()=>S.apex&&APEX[S.apex]?{path:S.apex,side:APEX[S.apex].side,name:APEX[S.apex].name,title:APEX[S.apex].title,lore:APEX[S.apex].lore}:null;
// MB.apexPaths: the ten, dominion side first, for the screens that list them
let APXLIST=null;const apexPaths=()=>APXLIST||(APXLIST=APEXIDS.map(id=>{const A=APEX[id];return{id,side:A.side,name:A.name,title:A.title,sub:A.sub,blurb:A.blurb,lore:A.lore,text:A.text,skills:APEXSK[id].map(d=>({id:d[0],name:d[1],text:d[3],cd:d[2],mana:d[6]}))}}));
// what a hero knows: the base skills learned so far, and the three apex skills once a path is chosen
const learned=()=>{const o=[];for(let i=0,k=known();i<k;i++)o.push(i);if(S.apex&&cls())o.push(10,11,12);return o};
const skInfo=si=>{const c=S.cls,d=skD(c,si),A=altOf(si);return si<10&&!A?CLASSES[c].skills[si]:{id:d[0],name:d[1],cd:d[2],mana:d[6],text:skText(d,c,si)+(A?' '+A.name+': '+A.text:''),level:si<10?SKLV[si]:101,alt:A?A.id:''}};
// alterations may be changed between floors: on a reward screen, and at the start of a floor until the first blow of mine has landed
const altFree=()=>S.mode!=='play'&&S.mode!=='clear'||ST.dmgDealt===(S.dd0||0)&&!P.cdS.some(v=>v>0);
// MB.alterations(si) -> the three of a class skill: [{id, name, text, sets, floor, open, active}] ; MB.setAlteration(si, j) (j 0: as taught, 1-3) -> true when it was set
function altList(si){const c=S.cls;if(!c||!(si>=0&&si<10))return[];return[0,1,2].map(j=>{const A=ALT[SKALT[c][si][j]];return{id:A.id,name:A.name,text:A.text,sets:A.sets||null,floor:altAt(si,j),open:altOpen(si,j),active:S.md[si]===j+1&&altOpen(si,j)}})}
function altSet(si,j){if(!S.cls||VS||!(si>=0&&si<10)||!(j>=0&&j<=3)||j&&!altOpen(si,j-1)||!altFree()||si>=known())return false;S.md[si]=j;if(P)syncSkills();emit('alteration',{skill:si,id:SKILLS[S.cls][si][0],alt:j?ALT[SKALT[S.cls][si][j-1]].id:''});if(S.mode==='play'||S.mode==='clear')save(S.level);return true}
function altScreen(si,back){
  const c=S.cls,d=skBase(c,si),L=altList(si),free=altFree(),cur=S.md[si],again=()=>altScreen(si,back);
  show({wide:true,cls:'altPanel',kick:'Alterations · '+d[1],title:cur&&L[cur-1].open?L[cur-1].name+' '+d[1]:d[1],body:d[3]+' One alteration can be active on a skill. Each is a trade, and none is owed.'+(free?'':' They can be changed between floors: after a floor is cleared, or at the start of the next before your first blow lands.'),
    cards:[{title:'As taught',sub:!cur||!L[cur-1].open?'Active':'',col:!cur||!L[cur-1].open?'#7fd66b':'',cls:'altCard',data:{alt:''},body:'No alteration. Cooldown: '+d[2]+' seconds. Mana: '+skCostOf(d[6])+'.',fn:()=>{altSet(si,0);again()}},
      ...L.map((a,j)=>({title:a.name,sub:a.active?'Active':a.open?'Open':'Opens on floor '+a.floor,col:a.active?'#7fd66b':a.open?'':'#958ea3',cls:'altCard'+(a.open?'':' shut'),data:{alt:a.id},body:a.text,fn:()=>{altSet(si,j+1);again()}}))],
    btns:[['Back',back]]});
}
// the floors behind have opened alterations: a note at the start of the floor, and the first time a screen that says what they are
function altNews(n){const c=S.cls,out=[];if(!c)return out;for(let si=0;si<Math.min(10,known());si++)for(let j=0;j<3;j++)if(altAt(si,j)===n+1)out.push(ALT[SKALT[c][si][j]].name+' '+SKILLS[c][si][1]);return out}
function altIntro(n,next){
  if(!S.cls||S.altSeen||VS||n+2<SKLV[0]+ALTLV[0])return next();S.altSeen=true;
  show({soft:true,cls:'altPanel',kick:'Floor '+(n+1)+' · alterations',title:'Skills can be altered',body:'From here your skills open alterations as you climb: three for each skill, one active at a time. An alteration is a trade: wider but lighter, harder but slower, or a setup for another skill to pay off. Open one from the pause screen under Skills. They can be changed between floors.',
    btns:[['Go on',next],['Show me',()=>loadout(next)]]});
}


/* ---------- screens of the tower: the crossroads, the apex choice ---------- */
function doorScreen(next){
  const n=S.level;DOORS=doorPair(n-1).map(doorInfo);
  show({wide:true,doors:true,cls:'doorPanel',kick:'A crossroads · two ways on to floor '+(n+1),title:'Choose a door',body:'Each door changes the next floor: a risk on it, and a reward when you clear it.'+(MP.on?' You are the host: you choose for the whole party.':''),
    cards:DOORS.map(d=>({title:d.title,sub:'Risk · '+d.risk,col:'var(--warn)',body:'Reward · '+d.reward,cls:'doorCard',data:{door:d.id},fn:()=>{DOORS=null;S.door={id:d.id,n};if(MP.on&&MP.role==='host')nsend({t:'lv',k:'door',n,d:d.id});next()}}))});
}
function apexScreen(next){
  show({wide:true,cls:'apexPanel',kick:'A hundred floors are behind you. Ashes below, the apex above.',title:'Choose what you become',
    body:'Past the hundredth floor a class is no longer enough. Take one of ten paths: five that command others, five that make a weapon of you. It lasts for the rest of the climb, on top of your class and its upgrade. Pick one to read it in full.',
    cards:apexCards(id=>apexConfirm(id,next))});
}
// the ten cards (dominion side first): name, title, one sentence, and the three skills as the last line
const apexCards=fn=>APEXIDS.map(id=>{const A=APEX[id];return{title:A.name,sub:A.title,body:A.blurb,cls:'apexCard apexSide-'+A.side+' apexPath-'+id,data:{apex:id,skills:APEXSK[id].map(d=>d[1]).join(' · ')},fn:()=>fn(id)}});
// one path in full, before it is taken for good
function apexConfirm(id,next){
  const A=APEX[id];
  show({wide:true,cls:'apexPanel apexPath-'+id+' apexSide-'+A.side,kick:A.title+' · '+A.sub,title:A.name,body:A.lore+' '+A.text,keys:'Its skills: '+APEXSK[id].map(d=>d[1]).join(', ')+'. This choice lasts for the rest of the climb.',
    btns:[['Take this path',()=>{S.apex=id;if(P)apxBody();resvSync();hud();apexLearn(next)}],['Back to the ten',()=>apexScreen(next)]]});
}
function apexLearn(next){
  const A=APEX[S.apex],sk=[10,11,12].map(skInfo);
  show({wide:true,cls:'apexPanel apexPath-'+S.apex+' apexSide-'+A.side,kick:A.title+' · three new skills',title:A.name,body:sk.map(s=>s.name+'. '+s.text).join('  '),keys:'Boons and equipment can shorten the cooldowns of these three by half at most. You carry six skills, and can change them later from the pause screen.',
    btns:[['Carry all three (slots 4 to 6)',()=>{const keep=S.load.filter(v=>v<10).slice(0,3);S.load=[...keep,10,11,12];syncSkills();next()}],['Choose my six',()=>loadout(next,10)],['Keep my six',next]]});
}

/* ---------- checkpoints: a seasoned hero for a start at floor 11, 21, 31... ---------- */
// Made from the floor number, the class, the upgrade and the apex path alone, always the same: SEAS (85%) of what a climb typically brings to that floor.
// Boons: 85% of one per floor from the twelfth on, in a steady spread. Equipment: the drops of 85% of the floors behind (a fixed sequence), worn or melted in with the steady policy.
// Skills: all the floor has taught, a sensible six carried (and the three apex skills). Mana follows from the floor, the Wellsprings and 85% of the trials behind.
// Pets and trophies: the monsters of the last few plain floors (four for a pet class, three familiars, one of any other trophy).
// Round 11: the share is not one number any more. Measured against a hero built floor by floor, 85% of everything was no handicap at floors 11-21 and far too much of one past floor 100 (where pets and familiars were also capped at four and three).
// seasK(N): the share of boons, drops and trials a seasoned hero of floor N brings, set so that it is 15-20% slower than a built one at every checkpoint. Past floor 100 a pet class brings eight pets to choose from and a mage five familiars.
const seasK=N=>N<20?0:N<30?.65:N<60?.83:N<=100?.9:.92; // (floor 11: the plain equipment of the class; with two floors behind it there is little else to be behind in)
const SEAS=.85,SEASLOAD={fighter:[0,3,6,5,1,2],tank:[0,7,3,5,1,2],assassin:[0,1,3,5,4,2],mage:[3,7,2,5,1,0],ranger:[0,3,2,5,6,4],healer:[0,3,8,5,1,2],necro:[0,4,8,5,6,1]},
  SEASB=['might','spec','haste','vigor','might','focus','well','might','vigor','haste','fleet'];
function seasonedRun(N,o){
  o=o||{};const n=N-1,c=o.cls,C=CLASSES[c],adv=N>50?(C.adv.some(a=>a[0]===o.adv)?o.adv:C.adv[0][0]):null,apex=N>100?(apexOk(o.apex)?o.apex:'order'):null;
  const SK2=seasK(N),b=noBoons();let k=Math.round(SK2*(Math.max(0,N-12)-(N>50?1:0)));
  for(let i=0,g=0;k>0&&g<9999;g++){let id=SEASB[i++%SEASB.length];const cap=id==='spec'?C.boon[2]:BOONS.find(x=>x.id===id).cap||99;if(b[id]>=cap)id=i%3?'might':'vigor';b[id]++;k--}
  let s=(N*2654435761^c.length*40503^c.charCodeAt(0)*7919)>>>0||1;const rnd=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};
  const E=basicSet(c),skip=SK2>0?Math.max(2,Math.round(1/(1-SK2))):1;for(let f=8;f<n;f++){if(f%skip===skip-1)continue;const d=dropItem(f,{rnd,cls:c}),cur=E[d.slot];if(d.r>cur.r&&cur.up<(d.r-cur.r)*.9)E[d.slot]=d;else{cur.lvl++;cur.up+=RAR[d.r][3]}}
  const eq={};for(const sl of SLOTS)eq[sl]={r:E[sl].r,lvl:E[sl].lvl,up:Math.round(E[sl].up*1000)/1000,m:E[sl].m?1:0};
  let tr=0;for(let f=12;f<n;f++)if(isTrial(floorKind(f)))tr++;tr=Math.round(tr*SK2);
  const kn=SKLV.filter(l=>N>=l).length;let load=SEASLOAD[c].filter(i=>i<kn);for(let v=0;load.length<NSK;v++)if(!load.includes(v))load.push(v);load=load.slice(0,NSK);if(apex)load=[...load.slice(0,3),10,11,12];
  const petCls=c==='necro'||adv==='beastmaster',want=petCls?(N>100?8:4):c==='mage'?(N>100?5:3):1,pets=[];
  for(let f=n-1;f>=8&&pets.length<want;f--){const fk=floorKind(f);if(fk==='guardian'||fk==='survive'||fk==='guard')continue;const L=levelDef(f);if(L.kind==='mimic')continue;const e=petEntry(f,L);e.plv=Math.min(PLVMAX,Math.round((n-1-f)*SK2));pets.push(e)}
  return{cls:c,adv,apex,b,eq,scrap:0,load,pets,pet:[],rev:1,st:{bestLevel:n},level:n,tr,door:null};
}
function startAt(N,o){
  N=Math.floor(+N);if(MP.on||!(N>=1)||!(TOWER.checkpoints.includes(N)||SET.testUnlock&&N>=11&&N<=9999))return false;
  if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false')}
  if(N===1){newRun();begin(0);return true}
  if(!o||typeof o.cls!=='string'||!own(CLASSES,o.cls))return false;
  const n=N-1,r=seasonedRun(N,o);newRun();applyRun(r,n);S.level=n;ST.bestLevel=SET.testUnlock?0:n;
  // who goes along: the strongest that half the pool can hold (pets), every familiar that fits, or the newest trophy
  const R=PETS.roster;PETS.active=[];
  if(R.length){if(resvForm()){const M=manaMax()*(form()==='pet'?.5:1),ord=R.map((e,i)=>i).sort((a,b)=>petRank(R[b])-petRank(R[a]));let sum=0;for(const i of ord){const cst=petCost(R[i]);if(sum+cst<=M){PETS.active.push(i);sum+=cst}}}else PETS.active=[0]}
  emit('classpicked',{cls:o.cls,seasoned:N});begin(n);return true;
}
function seasonedInfo(N,o){
  N=Math.floor(+N);if(!(N>=11)||!o||typeof o.cls!=='string'||!own(CLASSES,o.cls))return null;
  const r=seasonedRun(N,o),c=r.cls,n=N-1,eq=SLOTS.map(sl=>{const it=item(c,sl,r.eq[sl].r,r.eq[sl].lvl,r.eq[sl].up,r.eq[sl].m);return{slot:sl,name:itemName(it),rarity:it.rarity,line:itemLine(it)}});
  let mp=0;{const it=item(c,'trinket',r.eq.trinket.r,r.eq.trinket.lvl,r.eq.trinket.up,r.eq.trinket.m);if(it.keys.includes('mana'))mp=statV(it,'mana')}
  const D=k=>k<10?SKILLS[c][k]:APEXSK[r.apex][k-10];
  return{floor:N,cls:c,adv:r.adv,apex:r.apex,boons:{...r.b},boonCount:Object.values(r.b).reduce((a,v)=>a+v,0),eq,skills:r.load.map(k=>D(k)[1]),mana:Math.round((MANA0[c]+MWELL*r.b.well+MLEVEL*Math.max(0,n-8)+TMANA*r.tr)*(1+mp/100)),
    pets:r.pets.map(e=>e.name),rank:r.apex?(N<110?'X':'X+'+Math.floor((N-100)/10)):N>=60?'S+'+Math.floor((N-50)/10):(RANKS.find(x=>N>=x[0])||[0,''])[1]};
}

/* ---------- the 2D fallback: the lamp, the timer, shades, the ring of light, the beam ---------- */
function drawLamp2d(o){
  {const k=o.hp/o.maxHp,fl=o.flash>0;
    const g=ctx.createRadialGradient(o.x,o.y,4,o.x,o.y,o.r*3.2);g.addColorStop(0,`rgba(255,217,94,${.25+.3*k})`);g.addColorStop(1,'rgba(255,217,94,0)');ctx.fillStyle=g;circ(o.x,o.y,o.r*3.2);ctx.fill();
    circ(o.x,o.y,o.r);ctx.fillStyle=fl?'#fff':col('#3a3340');ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=3;ctx.stroke();
    circ(o.x,o.y-4,o.r*.55*(.5+.5*k)+Math.sin(S.t*9)*1.5);ctx.fillStyle=k>.34?'#ffd95e':'#ff8a4c';ctx.fill();
    ctx.lineWidth=5;ctx.strokeStyle='rgba(13,12,17,.8)';circ(o.x,o.y,o.r+9);ctx.stroke();ctx.strokeStyle=k>.34?'#ffd95e':'#ff5b6e';ctx.beginPath();ctx.arc(o.x,o.y,o.r+9,-Math.PI/2,-Math.PI/2+TAU*k);ctx.stroke()}
}
// (the words are left out when the page has a trial HUD of its own, class or id trialHud: then only the line of time along the top wall is drawn)
const THUD=document.getElementsByClassName('trialHud');
function drawTrialHud2d(){
  const t=TR;
  if(S.mode==='play'&&S.banner<=0){
    if(t.dur){const k=Math.min(1,t.t/t.dur);ctx.strokeStyle='rgba(214,165,68,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(WALL+3,WALL+3);ctx.lineTo(WALL+3+(W-2*WALL-6)*(1-k),WALL+3);ctx.stroke()}
    if(THUD.length||$('trialHud'))return;
    ctx.textAlign='center';ctx.font='600 15px Spectral,Georgia,serif';const left=t.dur?Math.max(0,Math.ceil(t.dur-t.t)):0,txt=t.failed?'The trial is lost':t.dur?t.title+' · '+left+' s'+(t.obj?' · lamp '+t.obj.hp+'/'+t.obj.maxHp:''):t.rule;
    ctx.fillStyle='rgba(13,12,17,.7)';const w=ctx.measureText(txt).width+24;ctx.fillRect(W/2-w/2,WALL+4,w,24);ctx.fillStyle=t.failed?'#ff5b6e':'#d6a544';ctx.fillText(txt,W/2,WALL+21)}
}
function drawShade(a){
  if(a.hidden)return;const k=Math.max(0,Math.min(1,a.life/2));
  if(!a.s2)a.s2={...a.s,col:'#3a2f55'};
  ctx.strokeStyle=`rgba(169,139,255,${.8*k})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y+a.r*.7,a.r*1.25,a.r*.5,0,0,TAU);ctx.stroke();
  ctx.globalAlpha=.75*k;drawMon(a,a.face,a.s2,'#a98bff');ctx.globalAlpha=1;
}
function drawBeamP(q){const b=q.beam;if(!b)return;const ex=q.x+Math.cos(b.a)*b.len,ey=q.y+Math.sin(b.a)*b.len;ctx.lineCap='round';
  ctx.strokeStyle='rgba(255,244,214,.35)';ctx.lineWidth=b.w*2+8;line(q.x,q.y,ex,ey);ctx.strokeStyle='#ffe9b0';ctx.lineWidth=b.w*1.3;line(q.x,q.y,ex,ey);ctx.strokeStyle='#fff';ctx.lineWidth=b.w*.5;line(q.x,q.y,ex,ey)}
function drawAura(q){if(!(q.auraR>0))return;const r=q.auraR*(1+.03*Math.sin(S.t*5)),g=ctx.createRadialGradient(q.x,q.y,r*.3,q.x,q.y,r);g.addColorStop(0,'rgba(255,244,214,0)');g.addColorStop(1,'rgba(255,244,214,.16)');
  ctx.fillStyle=g;circ(q.x,q.y,r);ctx.fill();ctx.strokeStyle='rgba(255,244,214,.55)';ctx.lineWidth=1.5;ctx.stroke()}

/* ---------- round 12: the string, the hairbreadth dodge, footing, setups and payoffs, the last rite, dares and marks ---------- */
// (the contract for the view is in the round-12 notes: every field, getter and event below is listed there)
// R12(): the rules of round 12 that change damage are on (dev: __mb.r12=false turns them off, to compare with round 11)
const R12=()=>!(window.__mb&&window.__mb.r12===false);
// MINE: > 0 while a blow of my own hero is worked out (a strike, a shot, a skill): those count for the chain. LNK: the kind of payoff the blow is (slam, heavy, volley) or null. TAGOK: > 0 while a class skill is worked out: its slows, stuns and marks leave a tag.
// BIG: how large the number of the blow is written (0: as always).
let MINE=0,LNK=null,TAGOK=0,BIG=0;
// --- the string: the basic attack of each class as a run of blows; each step is [damage, time] against the old single blow (equal, so the pace of damage is what it was), and the last one is the closer
const CHN={
 none:{style:'melee',steps:[[.9,.9],[.9,.9],[1.3,1.3]],closer:{name:'Bone Hammer',reach:8,arc:.4,push:44}},
 fighter:{style:'melee',steps:[[.85,.85],[.9,.9],[1,1],[1.75,1.75]],closer:{name:'Felling Cut',reach:20,arc:9,push:70}},
 tank:{style:'melee',steps:[[.9,.9],[1,1],[1.6,1.6]],closer:{name:'Shield Bash',reach:14,arc:.5,push:90}},
 assassin:{style:'melee',steps:[[.8,.8],[.8,.8],[.9,.9],[.9,.9],[2.1,2.1]],closer:{name:'Crossed Fangs',reach:10,arc:.6,push:36}},
 mage:{style:'caster',steps:[[.9,.9],[.95,.95],[1.65,1.65]],closer:{name:'Heavy Bolt',r:3,push:30}},
 ranger:{style:'ranged',steps:[[.85,.85],[.85,.85],[.9,.9],[.9,.9],[2.5,2.5]],closer:{name:'Long Draw',r:2,pierce:2,push:40}},
 healer:{style:'caster',steps:[[.9,.9],[.95,.95],[1.65,1.65]],closer:{name:'Noon Orb',r:4,push:30}},
 necro:{style:'summoner',steps:[[.85,.85],[.9,.9],[.95,.95],[1.8,1.8]],closer:{name:'Grave Order',r:3,push:30}},
};
// --- the chain: blows of my own landed in a row. It lapses CBT seconds after the last one, and when I am hurt.
const CB={n:0,best:0,t:0},CBT=3;
function comboHit(){
  CB.n++;CB.t=CBT;if(CB.n>CB.best)CB.best=CB.n;
  if(P&&(CB.n===10||CB.n===25||CB.n%50===0))floats.push({x:P.x,y:P.y-66,txt:'Chain '+CB.n,life:1,c:'#d6a544',big:CB.n>=50?1.4:1});
  emit('combo',{count:CB.n,best:CB.best,ended:false,last:CB.n})}
function comboEnd(){if(!CB.n)return;const last=CB.n;CB.n=0;CB.t=0;emit('combo',{count:0,best:CB.best,ended:true,last})}
// --- the hairbreadth dodge: a dash begun in the last PD.win seconds before a blow lands. Alone the world holds its breath (slowK of its speed for `slow` seconds); in a shared world the dodger is quicker for `haste` seconds instead.
// Either way the next basic attack within `rip` seconds is a riposte (ripK times its damage; ripVs in versus) and `mana` of the pool comes back. cd: no second one for that long.
const PD={win:.18,slow:1.3,slowK:.3,haste:3,hasteK:1.25,rip:4,ripK:2.5,ripVs:1.5,mana:.08,cd:2.5,cdVs:6,hasteVs:1.1}; // (versus: a longer wait, a smaller quickening, and the dodge itself gives no further untouchable time)
function pdTry(d0,s0){const ok=pdTry0(d0,s0);if(ok&&TU)tutEv('pd');return ok}
function pdTry0(d,src){
  if(!P||!(P.dgT>0)||P.pdCd>0||!R12())return false;
  if(!VS&&!(src==='shot'||src==='zone'||src==='beam'||src==='siege'||d>=blow(1)))return false; // (brushing past a monster is not a dodge)
  P.dgT=0;P.pdCd=VS?PD.cdVs:PD.cd;P.pdT=PD.haste;P.rip=PD.rip;if(!VS)P.inv=Math.max(P.inv,.45);const mana=P.maxMana*PD.mana;manaGive(mana);
  const slow=MP.on?0:PD.slow;if(slow){S.slowT=slow;S.slowK=PD.slowK}
  floats.push({x:P.x,y:P.y-56,txt:'Hairbreadth',life:1.1,c:'#6fe3ff',big:1.4});rings.push({x:P.x,y:P.y,life:.45,max:.45,r:70,fx:true});sfx(1320,.18,'triangle',.16,2200);haptic([15,30,15]);
  emit('perfectDodge',{by:-1,x:P.x,y:P.y,src,slow,window:PD.haste,mana:Math.round(mana)});
  if(setN(2)>=4){P.pdCd=Math.max(0,P.pdCd-SETK.marginCd);const k=AK;AK=AK0;MINE++;try{shock(SETK.marginR,SETK.marginD)}finally{MINE--;AK=k}}return true}
// at the moment a dash begins: is a blow about to land where I stand (within PD.win seconds)? Then the dash is a hairbreadth dodge even when it carries me clear of the blow.
function pdScan(){
  const w=PD.win,near=(s,rr)=>{const rx=P.x-s.x,ry=P.y-s.y,vv=s.vx*s.vx+s.vy*s.vy;if(!vv)return false;const t=Math.max(0,Math.min(w,(rx*s.vx+ry*s.vy)/vv));return Math.hypot(rx-s.vx*t,ry-s.vy*t)<rr};
  if(VS){for(const r of MP.remotes)if(r.foe&&!r.dead)for(const p of r.pshots)if(near(p,p.r+12))return'shot';return null}
  for(const s of shots)if(!(s.g>w)&&near(s,s.r+10))return'shot';
  for(const z of zones)if(!z.mine&&z.dur-z.t<=w&&dist(z,P)<z.r)return'zone';
  for(const m of mons){if(m.hidden||m.stun>0)continue;
    if((m.st==='charge'||m.st==='lunge')&&segDist(P,m.x,m.y,m.ang,540*w)<m.r+12)return m.ai+':'+m.st;
    if(m.siege&&m.st==='wind'&&m.t<=w&&dist(m,P)<m.r+TK.siegeHit)return'siege'}
  return null}
function riposteHit(m,d){if(TU)tutEv('riposte');floats.push({x:m.x,y:m.y-m.r-26,txt:'Riposte',life:.9,c:'#6fe3ff',big:1.4});brkHit(m,BRK.riposte,'riposte');{const ang=P?angTo(P,m):0;if(MP.on)MP.rpOut=[Math.round(m.x),Math.round(m.y),Math.round(ang*100)||0];emit('riposte',{by:-1,x:m.x,y:m.y,id:m.id,dmg:d,ang})}hitFx('riposte',m,.1,.8)}
const hitFx=(kind,m,stop,kick,ang)=>{if(SET.shake===false)kick=0;if(kick>=.5)S.shake=Math.max(S.shake,.14);emit('hitfx',{kind,x:m.x,y:m.y,id:m.id||0,stop,kick, /* (round 13) shake off: the event itself asks for no kick */ang:ang===undefined?(P?angTo(P,m):0):ang})};
// --- footing: the gauge of the monster of every tenth floor. Closers, skill blows, ripostes and payoffs wear it down (the sturdy classes `sturdy` times as fast); empty, the monster reels for `stag` seconds and takes `more` times the damage;
// then the gauge is whole again and `tough` times as long. rest, back: left alone for `rest` seconds it comes back at `back` a second. mp: longer by this share per further member.
const BRK={max:100,closer:2.5,slam:2,heavy:2,volley:.5,riposte:12,link:6,sturdy:1.8,stag:3.5,more:1.2,tough:1.35,rest:4,back:5,mp:.7};
const brkK=()=>S.cls==='tank'||S.cls==='healer'?BRK.sturdy:1;
function brkArm(m){if(!tenth(S.level)||VS)return;m.fin=true;if(R12()){m.brkMax=m.brk=Math.round(BRK.max*(MP.on?1+BRK.mp*Math.max(0,MP.cnt-1):1));m.stagT=0;m.stagMax=BRK.stag;m.brkAt=0}}
function brkHit(m,v,src){
  if(!m||!m.brkMax||m.stagT>0||m.hp<=0||!(v>0)||!R12())return;v*=brkK();
  emit('break',{id:m.id,x:m.x,y:m.y,amount:v,left:Math.max(0,m.brk-v),max:m.brkMax,src});
  if(CL())mpQ(['bk',m.id,Math.round(v*10)/10]);else brkTake(m,v)}
function brkTake(m,v){
  if(!m.brkMax||m.stagT>0||m.ward>0||m.hp<=0)return;m.brkAt=S.t;m.brk=Math.max(0,m.brk-v);
  if(m.brk<=0){if(m.hidden||m.st==='leap'||m.st==='under'||m.st==='rise'){m.brk=.01;return}stagger(m)}}
function stagger(m){
  m.stagT=m.stagMax=BRK.stag;m.stun=Math.max(m.stun||0,BRK.stag);m.beam=null;if(m.st==='charge'||m.st==='lunge'){m.st='dazed';m.t=.6}
  rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+90,fx:true});puff(m,'#ffd95e',22,260);floats.push({x:m.x,y:m.y-m.r-30,txt:'Reeling',life:1.4,c:'#ffd95e',big:1.4});S.shake=Math.max(S.shake,.3);sfx(140,.4,'square',.3,50);noise(.3,.3,500,120);haptic([40,30,120]);
  emit('stagger',{id:m.id,state:'start',dur:BRK.stag,x:m.x,y:m.y});hitFx('stagger',m,.12,.6)}
function brkStep(m,dt){
  if(m.stagT>0){if((m.stagT-=dt)<=0){m.stagT=0;m.brkMax=Math.round(m.brkMax*BRK.tough);m.brk=m.brkMax;m.brkAt=S.t;emit('stagger',{id:m.id,state:'end',dur:0,x:m.x,y:m.y})}}
  else if(m.brk<m.brkMax&&S.t-m.brkAt>BRK.rest)m.brk=Math.min(m.brkMax,m.brk+BRK.back*dt)}
// --- setups and payoffs: a class skill that throws, stuns or drags leaves a monster aloft, one that slows leaves it brittle, one that marks, poisons or burns leaves it branded (LINK.life seconds).
// The matching payoff uses the tag up: a ground blow on an aloft monster (Downfall: it is stunned), a single heavy skill blow on a brittle one (Shatter: shards hit what stands near), a fan, ring, chain or burst on a branded one (Flare: a blast around it).
// k: the payoff blow does this much more; min: at least this many times my damage; none within `wait` seconds of the tag being set, so a skill does not pay off what it has just set up.
const LINK={life:6,wait:.25,min:2,mana:.03,duoK:1.3,duoMana:.04, // duoK, duoMana (round 15, co-op): a payoff on a setup of another hero is `duoK` times as heavy, and both get `duoMana` of their mana back
  tags:['aloft','brittle','branded'],kinds:['slam','heavy','volley'],
  pay:{slam:{tag:'aloft',bit:1,name:'Downfall',k:.6,col:'#ffd95e'},heavy:{tag:'brittle',bit:2,name:'Shatter',k:.6,col:'#8fd3ff'},volley:{tag:'branded',bit:4,name:'Flare',k:.5,col:'#ff8a4c'}}};
const LKOP={shock:'slam',blast:'slam',line:'slam',rush:'heavy',chain:'volley',burst:'volley',ringp:'volley'};
const lkOf=op=>{const o=op[0];return o==='fan'?(op[1]===1?'heavy':'volley'):o==='hit'?(op[1]>0?'heavy':null):o==='seq'?(op[1]==='cuts'?'heavy':'slam'):LKOP[o]||null};
// what a skill sets up and pays off, for a button: {sets:[tags], pays:[kinds]}
function linkInfo(ops){const sets=new Set(),pays=new Set(),dbg=o=>{if(!o)return;if(o.slow)sets.add('brittle');if(o.stun)sets.add('aloft');if(o.dot||o.mark)sets.add('branded')};
  for(const op of ops||[]){const o=op[0],k=lkOf(op);if(k)pays.add(k);
    if(o==='hit'||o==='near')dbg(op[2]);else if(o==='fan')dbg(op[8]);else if(o==='blast')dbg(op[5]);else if(o==='rush'){if(op[2])sets.add('aloft')}else if(o==='pull'||o==='knock')sets.add('aloft');else if(o==='field'){if(op[7])sets.add('brittle');if(op[1]==='domain')sets.add('branded')}}
  return{sets:[...sets],pays:[...pays]}}
function tagSet(m,bit){
  if(!TAGOK||!m||m.vs||m.decoy||VS||m.hp<=0||!R12())return;
  if(CL()){if(!(m.tags&bit)&&!(S.t-(m._tgQ||0)<.3)){m._tgQ=S.t;mpQ(['tg',m.id,bit,setN(3)>=2?1:0])}return}
  tagPut(m,bit,setN(3)>=2?SETK.kind2:0,MP.on?MP.myIdx:-1)}
function tagPut(m,bit,more,by){const i=bit>>1,t=m.tgT||(m.tgT=[0,0,0]),a=m.tgAt||(m.tgAt=[0,0,0]),w=m.tgBy||(m.tgBy=[-1,-1,-1]);if(!(t[i]>0)){a[i]=S.t;w[i]=by===undefined?-1:by} // by: the member who set it up (co-op, round 15)
  t[i]=Math.max(t[i],LINK.life+(more||0));m.tags=(m.tags||0)|bit} // more: Kindled Marks (round 15)
// another hero has paid off a setup of mine: my share of a linked payoff
function linkMine(m,L,by){if(!P||P.down)return;manaGive(P.maxMana*LINK.duoMana);const r=MP.byIdx[by];floats.push({x:P.x,y:P.y-58,txt:'Linked'+(r?' with '+r.name:''),life:1.3,c:L.col});emit('linked',{id:m.id,kind:LINK.kinds[L.bit>>1],name:L.name,with:by})}
function tagStep(m,dt){const t=m.tgT;let b=0;if(t)for(let i=0;i<3;i++)if(t[i]>0){t[i]-=dt;if(t[i]>0)b|=1<<i}m.tags=b}
// the blow d of kind LNK lands on m: when m carries the matching tag it is used up, and the blow comes back heavier
function linkPay(m,d){
  const L=LINK.pay[LNK];if(!L||!(m.tags&L.bit)||m.vs||m.decoy||m.ward>0||!R12())return d;const kind=LNK,i=L.bit>>1;
  const sb=m.tgBy?m.tgBy[i]:-1,duo=MP.on&&!VS&&sb>=0&&sb!==MP.myIdx; // a setup of another hero: a linked payoff
  if(CL()){if(S.t-(m._lkAt||0)<1)return d;m._lkAt=S.t;m.tags&=~L.bit;mpQ(['lk',m.id,LINK.kinds.indexOf(kind)])}
  else{if(m.tgAt&&S.t-m.tgAt[i]<LINK.wait)return d;m.tgT[i]=0;m.tags&=~L.bit;if(MP.on)MP.lkq.push([m.id,LINK.kinds.indexOf(kind),MP.myIdx,duo?sb+1:0])}
  const bonus=Math.max(d*L.k,LINK.min*dmgMul())*(setN(3)>=2?SETK.kindK:1)*(duo?LINK.duoK:1);if(setN(3)>=4)cdCut(SETK.kind4);if(duo)manaGive(P.maxMana*LINK.duoMana);
  floats.push({x:m.x,y:m.y-m.r-28,txt:(duo?'Linked ':'')+L.name,life:duo?1.3:1,c:L.col,big:duo?1.8:1.4});rings.push({x:m.x,y:m.y,life:.4,max:.4,r:m.r+70,fx:true});puff(m,L.col,14,220);sfx(kind==='heavy'?1500:kind==='slam'?90:520,.22,kind==='slam'?'square':'triangle',.2,kind==='heavy'?500:kind==='slam'?40:1400);haptic(40);
  manaGive(P.maxMana*LINK.mana);emit('link',{id:m.id,x:m.x,y:m.y,kind,tag:L.tag,name:L.name,bonus,by:-1,duo,setBy:duo?sb:-1});if(TU)tutEv('link');hitFx('link',m,.07,.5);
  const lk=LNK,tk=TAGOK;LNK=null;TAGOK=0; // what follows is the payoff's own doing: it neither pays off nor sets up anything further
  brkHit(m,BRK.link,'link');
  if(kind==='slam')mStun(m,m.boss?.6:1.5);
  else for(const o of[...mons])if(o!==m&&!o.hidden&&mons.includes(o)&&dist(o,m)<(kind==='heavy'?80:95)+o.r)hurtM(o,bonus*(kind==='heavy'?.5:.6),true);
  LNK=lk;TAGOK=tk;return d+bonus}
// --- the last rite: the monster of a tenth floor below FIN.at of its health can be finished by any hero (MB.finish(), X or T). It plays FIN.dur seconds (it can be skipped after FIN.min) and then the monster dies.
// hp: the monster of a tenth floor has this much more health since round 12 (the rite takes the last FIN.at of it, and it reels now and then)
const FIN={at:.08,dur:2.2,min:.35,hp:1.14,names:{fighter:'Sundering Arc',tank:'Gravestone Drop',assassin:'Thirteen Quiet Cuts',mage:'The Unwritten Word',ranger:'Last Flight',healer:'Dawn Without End',necro:'All Hands From Below',none:'Bone Verdict'}};
let FN=null,FINK=0;
const finInfo=by=>{const me=!MP.on||by===MP.myIdx,r=me?null:MP.byIdx[by],c=me?S.cls:r&&r.look.cls,h=me?P:r&&r.P;return{by,cls:c||null,adv:(me?S.adv:r&&r.look.adv)||null,apex:(me?S.apex:r&&r.look.apex)||null,name:FIN.names[c||'none'],hx:h?h.x:W/2,hy:h?h.y:H/2}};
const finEv=(state,skipped)=>{const f=FN||{};if(state==='end')finShare();emit('finisher',{state,id:f.id||0,by:f.by===undefined?-1:f.by,cls:f.cls||null,adv:f.adv||null,apex:f.apex||null,name:f.name||'',dur:FIN.dur,x:f.x||0,y:f.y||0,hx:f.hx||0,hy:f.hy||0,skipped:!!skipped,join:f.join?f.join.slice():[],count:1+(f.join?f.join.length:0)})};
function finStep(){ // alone and on the host, every step: is the prompt up?
  if(FN&&FN.state==='play')return;
  const b=boss,ok=!!b&&!!b.fin&&b.hp>0&&b.hp<=b.maxHp*FIN.at&&!b.hidden&&b.st!=='leap'&&mons.includes(b)&&R12();
  if(ok&&!FN){FN={state:'ready',join:[],id:b.id,by:-1,cls:null,adv:null,apex:null,name:'',t:0,dur:FIN.dur,x:b.x,y:b.y,hx:P.x,hy:P.y};finEv('ready');finCue(b)}
  else if(!ok&&FN){finEv('gone');FN=null}
  else if(FN){FN.x=b.x;FN.y=b.y}}
function finCue(b){floats.push({x:b.x,y:b.y-b.r-44,txt:'Last rite: '+(matchMedia('(pointer:coarse)').matches?'tap the button':'press X'),life:2.4,c:'#ffd95e',big:1.4});sfx(660,.3,'triangle',.18,990)}
// (round 15) a rite that others join. While a rite plays, any other hero standing may join it (the rite's button, X or T, or simply a blow): the rite is no longer, and nothing more is needed to end it,
// but everyone who took part is given back all mana and a quarter of their health, and their drop on this floor is rolled once more (S.rite). FN.join: the member indices of those who joined.
function finJoin(idx){
  if(!FN||FN.state!=='play'||!MP.on||VS||idx===FN.by||FN.join.includes(idx))return false;FN.join.push(idx);finJoined(idx);return true}
function finJoined(idx){
  const me=idx===MP.myIdx,r=me?null:MP.byIdx[idx],h=me?P:r&&r.P,n=FN.join.length+1;if(!h)return;
  floats.push({x:h.x,y:h.y-56,txt:n>2?'A rite of '+n:'A shared rite',life:1.4,c:'#ffd95e',big:1.4});rings.push({x:h.x,y:h.y,life:.5,max:.5,r:70,fx:true});for(let k=1;k<=8;k++)bits.push({x:h.x+(FN.x-h.x)*k/8,y:h.y+(FN.y-h.y)*k/8,vx:0,vy:-30,life:.6,max:.6,c:'#ffd95e',r:3});sfx(880,.25,'triangle',.18,1320);
  if(me){P.atk=.3;P.swing=angTo(P,FN);haptic([20,20,80])}
  emit('finisher',{state:'join',id:FN.id,by:idx,cls:(me?S.cls:r&&r.look.cls)||null,adv:null,apex:null,name:FN.name,dur:FIN.dur,x:FN.x,y:FN.y,hx:h.x,hy:h.y,skipped:false,first:FN.by,join:FN.join.slice(),count:n})}
// the rite is over: what it gives those who shared it
function finShare(){
  if(!FN||FN.state!=='play'||!MP.on||VS||!FN.join||!FN.join.length||!P)return;const me=MP.myIdx,n=FN.join.length+1;if(FN.by!==me&&!FN.join.includes(me))return;
  S.rite={n,lv:S.level};if(!P.down){P.mana=manaRoom();healP(.25)}floats.push({x:P.x,y:P.y-70,txt:'Shared rite: a luckier drop',life:2.2,c:'#ffd95e'})}
function finStart(by){
  const b=boss;if(!FN||FN.state!=='ready'||!b)return;Object.assign(FN,finInfo(by),{state:'play',t:0,x:b.x,y:b.y,join:[]});
  b.stun=Math.max(b.stun||0,FIN.dur+.6);b.beam=null;if(b.st==='charge'||b.st==='lunge'){b.st='dazed';b.t=.6}
  finBegun()}
// (every member: the rite has begun)
function finBegun(){
  P.inv=Math.max(P.inv,FN.dur-FN.t+.4);want.atk=want.dash=want.skill=false;for(let i=0;i<NSK;i++)want.sk[i]=false;
  floats.push({x:FN.x,y:FN.y-70,txt:FN.name,life:FN.dur,c:'#ffd95e',big:1.8});S.shake=Math.max(S.shake,.25);SND.roar();haptic([30,30,30,30,200]);
  finEv('start');emit('hitfx',{kind:'finisher',x:FN.x,y:FN.y,id:FN.id,stop:0,kick:1,ang:Math.atan2(FN.y-FN.hy,FN.x-FN.hx)})}
function finPlay(dt){
  FN.t+=dt;if(rand()<dt*40)bits.push({x:FN.x+rand()*80-40,y:FN.y+rand()*80-40,vx:0,vy:-90,life:.5,max:.5,c:rand()<.5?'#ffd95e':'#fff',r:3});
  if(!MP.on&&FN.t>=FIN.min&&(want.atk||want.dash||want.skill||want.sk.some(x=>x)))return finEnd(true);
  if(MP.on&&!VS&&P&&!P.down&&FN.by!==MP.myIdx&&!FN.join.includes(MP.myIdx)&&!FN._asked&&FN.t>.15&&(want.atk||want.skill||want.sk.some(x=>x)))finish(); // a blow of another hero while the rite plays: it joins
  if(!CL()&&FN.t>=FN.dur)finEnd(false)}
function finEnd(skipped){
  const b=boss;finEv('end',skipped);FN=null;want.atk=want.dash=want.skill=false;
  if(b&&mons.includes(b)){b.ward=0;FINK=1;try{hurtM(b,1e9,true)}finally{FINK=0}}}
function finish(){
  if(!FN||S.mode!=='play'||S.paused||!P||P.down||VS)return false;const me=MP.on?MP.myIdx:0;
  if(FN.state==='ready'){if(CL())mpQ(['fin',FN.id]);else finStart(me);return true}
  if(FN.state==='play'&&(!MP.on||FN.by===me)&&FN.t>=FIN.min){if(CL())mpQ(['fin',FN.id]);else finEnd(true);return true}
  if(FN.state==='play'&&MP.on&&FN.by!==me&&!FN.join.includes(me)){if(CL()){if(!FN._asked){FN._asked=true;mpQ(['fin',FN.id])}}else finJoin(me);return true}
  return false}
// --- dares: an optional objective on about one plain fight floor in three from floor 13 (never a trial, a crossroads, a tenth floor or a floor changed by a door). Met, it raises the mark and the drop is luckier; missed, nothing is lost.
const DARES={kinds:['hunt','unscathed','holdout','protect'],titles:{hunt:'The Quarry',unscathed:'Clean Hands',holdout:'The Rush',protect:'The Ember'},dur:{hunt:16,unscathed:0,holdout:14,protect:0},
  rules:{hunt:'A branded runner crosses this floor. Bring it down within 16 seconds.',unscathed:'Clear this floor without taking a single wound.',holdout:'A swarm comes with it. Stay above half your health for 14 seconds.',protect:'Keep the ember alight until the floor is cleared.'},
  quarryHp:.2,ember:5,emberMp:2,siegeN:3,siegeGap:5,rushGap:2.4,rushN:3};
let DRE=null;
const dareOf=n=>n>=12&&n%3===0?DARES.kinds[Math.floor(n/3)%4]:null;
const OBJ=()=>TR&&TR.obj||(DRE&&DRE.state==='run'&&DRE.obj)||null;
function dareMake(L,n){
  if(VS||n<12||tenth(n)||L.floorKind!=='fight'||L.door||!S.cls||!R12())return null;
  const o=CL()?MP.over:window.__mb&&window.__mb.over,f=o&&o.dare,k=f==='none'?null:DARES.kinds.includes(f)?f:dareOf(n);if(!k)return null;
  const d={kind:k,title:DARES.titles[k],rule:DARES.rules[k],state:'run',t:0,dur:DARES.dur[k],left:DARES.dur[k],value:0,goal:0,obj:null,pk:0,nextT:1.5,d0:ST.dmgTaken,q:null,pulse:0};
  if(k==='protect'){if([4,7,10,11].includes(L.room))L.room-=2;const hp=DARES.ember+DARES.emberMp*(MP.on?Math.max(0,MP.cnt-1):0);d.obj={x:W/2,y:H/2,r:20,hp,maxHp:hp,flash:0,name:'The Ember'};d.nextT=3}
  L.hint=d.title+'. '+d.rule;return d}
function dareEv(state){const d=DRE;emit('objective',{kind:d.kind,state,title:d.title,rule:d.rule,dur:d.dur,why:d.why||''})}
function dareEnd(state,why){
  const d=DRE;if(!d||d.state!=='run')return;d.state=state;const ok=state==='done';d.why=ok?'':why||'missed';
  if(!window.MBDareBand)floats.push({x:W/2,y:H/2-110,txt:d.title+(ok?': met':': '+d.why),life:2,c:ok?'#7fd66b':'#ff8a4c',big:1.4}); // (round 13) with the band of tower.js on the page the band says it, and no title floats over the top of the screen
 if(ok)sfx(660,.3,'triangle',.2,1320);else sfx(240,.3,'sawtooth',.16,120);
  if(d.kind==='protect'&&!CL())for(const m of mons)if(m.siege)m.siege=false; // the besiegers turn on the heroes
  dareEv(state)}
// damage the party has taken since the last look (alone: mine; the host also sees the others' health fall)
function dareHurt(d){let v=ST.dmgTaken-d.d0;d.d0=ST.dmgTaken;if(MP.on)for(const r of MP.remotes){const h=r.P.hp;if(!r.away&&r._dh!==undefined&&h<r._dh-.01)v+=r._dh-h;r._dh=h}return v}
const dareLow=()=>{if(P.hp<P.maxHp/2&&!MP.away)return true;if(MP.on)for(const r of MP.remotes)if(!r.away&&r.P.maxHp>1&&r.P.hp<r.P.maxHp/2)return true;return false};
function dareStep(dt){
  const d=DRE,o=d.obj;if(o&&o.flash>0)o.flash-=dt;
  if(d.state!=='run')return;d.t+=dt;if(d.dur)d.left=Math.max(0,d.dur-d.t);
  if(o&&(d.pulse-=dt)<=0){d.pulse=.9;rings.push({x:o.x,y:o.y,life:.6,max:.6,r:o.r+18})} // (so the ember can be found before a view draws it)
  if(CL())return;
  const k=d.kind,n=S.level,py=MP.on?mpPartyY():P.y;
  if(k==='unscathed'){d.value+=dareHurt(d);if(d.value>0)dareEnd('fail','a wound')}
  else if(k==='holdout'){
    if(dareLow())return dareEnd('fail','below half');if(d.t>=d.dur)return dareEnd('done');
    if(d.t>=d.nextT&&d.t<d.dur-2){d.nextT=d.t+DARES.rushGap;for(let j=0;j<DARES.rushN+(MP.on?mpPack():0);j++)if(mons.length<14){const g=GATES[(d.pk+j*3)%GATES.length],m=spawn('mite',g[0],g[1]);m.t=1}d.pk++}}
  else if(k==='hunt'){
    if(!d.q){if(d.t>=d.nextT){const kind=LESSER[(n*3+1)%LESSER.length],m=lesser(kind,W/2+(n%2?180:-180),py>H/2?150:H-150,S.L.spec.hp*DARES.quarryHp);m.quarry=true;m.spdK=1.05;m.s={...m.s,name:'The Quarry'};d.q=m;
      rings.push({x:m.x,y:m.y,life:.7,max:.7,r:m.r+70,fx:true});floats.push({x:m.x,y:m.y-m.r-18,txt:'The Quarry',life:1.8,c:'#ffd95e'});sfx(880,.2,'triangle',.16,440)}}
    else if(d.t>=d.dur){if(mons.includes(d.q)){puff(d.q,'#ffd95e',14,200);mons=mons.filter(x=>x!==d.q)}dareEnd('fail','it slipped away')}}
  else if(k==='protect'){if(d.t>=d.nextT&&d.pk<DARES.siegeN+(MP.on?mpPack():0)){d.nextT=d.t+DARES.siegeGap;siegeSpawn(d.pk++)}}
}
// the floor is cleared with the dare still open: what could only be lost is met; a quarry that still runs is not
function dareClose(){const d=DRE;if(!d||d.state!=='run')return;dareEnd(d.kind==='hunt'?'fail':'done',d.kind==='hunt'?'it was not caught':'')}
// --- marks: each floor from the ninth is marked when it is cleared: time (up to `time` points: all of them at ord[0] / boss[0] seconds, none at ord[1] / boss[1]; a trial with a clock of its own gets them all), damage taken (`taken` points, none at
// `hurt` of your health lost, `hurtBoss` on a tenth floor), the best chain (`combo` points at cOrd / cBoss blows; a Tank needs fewer), and `dare` points for a dare met. S and A make the drop luckier (two and one more rolls, the best counts), and so does a dare met.
const GRD={time:40,taken:35,combo:25,dare:12,marks:[['S',92],['A',76],['B',56],['C',36],['D',-1]],ord:[16,45],boss:[100,220],cOrd:35,cBoss:90,hurt:.8,hurtBoss:2};
let GR=null,GLINE='';
function gradeMake(quiet){
  GR=null;GLINE='';const n=S.level;if(n<8||!S.cls||VS||!P)return null;
  const big=tenth(n),fixed=!!TR&&TR.dur>0&&(TR.kind==='survive'||TR.kind==='guard'),time=ST.levelTime,par=big?GRD.boss:GRD.ord,
    tk=fixed?1:Math.max(0,Math.min(1,(par[1]-time)/(par[1]-par[0]))),taken=Math.max(0,ST.dmgTaken-(S.dmg0||0)),hk=Math.max(0,1-taken/(P.maxHp*(big?GRD.hurtBoss:GRD.hurt))),
    cp=Math.max(5,Math.round((big?GRD.cBoss:GRD.cOrd)*(S.cls==='tank'?.7:1))),ck=Math.min(1,CB.best/cp),dare=DRE?(DRE.state==='done'?'done':'fail'):null,
    parts={time:Math.round(GRD.time*tk),taken:Math.round(GRD.taken*hk),combo:Math.round(GRD.combo*ck),dare:dare==='done'?GRD.dare:0},score=Math.min(100,parts.time+parts.taken+parts.combo+parts.dare);
  let mark='D';for(const[m,v]of GRD.marks)if(score>=v){mark=m;break}
  GR={level:n,floor:n+1,mark,score,time:Math.round(time*10)/10,par:par[0],taken:Math.round(taken*10)/10,maxHp:P.maxHp,combo:CB.best,comboPar:cp,dare,parts,luck:(mark==='S'?2:mark==='A'?1:0)+(dare==='done'?1:0)};
  GLINE='Mark '+mark+' · '+GR.time+' s · '+(GR.taken?fmt(GR.taken)+' damage taken':'untouched')+' · best chain '+GR.combo+(dare&&DRE?' · '+DRE.title+(dare==='done'?' met':' missed'):'')+(GR.luck?' · a luckier drop.':'.');
  if(quiet){const g=GR;GR=null;GLINE='';return g} // (round 16) a bell's floor is marked, but it is no floor of the climb
  emit('grade',GR);return GR}
const gline=()=>{const s=GLINE;GLINE='';return s};
// the 2D fallback: tags over monsters, the footing bar, the ember
function drawR12(){
  if(DRE&&DRE.obj&&DRE.state==='run')drawLamp2d(DRE.obj);
  for(const m of mons){if(m.hidden)continue;
    if(m.tags){const c=['#ffd95e','#8fd3ff','#ff8a4c'];let k=0;for(let i=0;i<3;i++)if(m.tags&1<<i){circ(m.x-10+k*10,m.y-m.r-16,4);ctx.fillStyle=c[i];ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=1.5;ctx.stroke();k++}}
    if(m.brkMax){const w=m.r*2,k=m.stagT>0?0:m.brk/m.brkMax;ctx.fillStyle='rgba(13,12,17,.8)';ctx.fillRect(m.x-w/2-1,m.y+m.r+7,w+2,6);ctx.fillStyle=m.stagT>0?'#ff5b6e':'#ffd95e';ctx.fillRect(m.x-w/2,m.y+m.r+8,w*(m.stagT>0?m.stagT/(m.stagMax||1):k),4)}}
}

/* ---------- loop ---------- */
function step(dt){
  S.t+=dt;if(S.shake>0)S.shake-=dt;SIDE=null;T=P;GEO=0;
  for(const b of bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=.94;b.vy*=.94;b.life-=dt}bits=bits.filter(b=>b.life>0);
  for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
  for(const f of floats){f.y-=34*dt;f.life-=dt}floats=floats.filter(f=>f.life>0);
  if(echoes.length){for(const e of echoes)e.life-=dt;echoes=echoes.filter(e=>e.life>0)}
  if(arcs.length){for(const a of arcs)a.life-=dt;arcs=arcs.filter(a=>a.life>0)}
  if(S.mode==='clear'&&(S.clearT-=dt)<=0)return XF?xfAfter():reward();
  if(S.mode!=='play'&&S.mode!=='clear')return;
  if(FN&&FN.state==='play'&&S.mode==='play'){finPlay(dt);if(!MP.on)return} // the last rite: alone the world is held while it plays
  if(VS)vsStep(dt);
  if(!P.down)playerStep(dt);
  if(MP.on&&!VS)mpReviveStep(dt);
  GEO++;for(const p of pshots){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL){p.dead=true;continue}
    if(obstacles.length&&blocked(p)){p.dead=true;puff(p,'#b9b2c6',3,70);if(!p.pet&&objOn())for(let i=0;i<obstacles.length;i++){const o=obstacles[i],R=solidR(o);if(R&&Math.hypot(p.x-o.x,p.y-o.y)<R+2){objMy(i,Math.atan2(p.vy,p.vx),p.big>=1.4||!!p.lk||!!p.sk);break}}continue}
    for(const m of[...mons]){if(m.hidden||p.hit.has(m)||!mons.includes(m)||dist(m,p)>m.r+p.r+3)continue;
      let d=p.dmg;if(p.kind==='arrow'&&pw(3)&&Math.hypot(p.x-p.sx,p.y-p.sy)>200){d*=2;puff(p,'#d6a544',4,90)}
      p.hit.add(m);if(p.alt){TAGOK++;debuff(m,p.alt,p.altD);TAGOK--}if(p.sk)TAGOK++;if(p.slow)mSlow(m,p.slow);if(p.stun)mStun(m,m.boss?p.stun*.7:p.stun*2);if(p.sk)TAGOK--;byPet=p.pet||null;if(!p.pet){MINE++;LNK=p.lk||null;BIG=p.big||0}hurtM(m,d,!!p.pet);if(!p.pet){MINE--;LNK=null;BIG=0;if(p.bk)brkHit(m,p.bk,'closer');if(p.one){if(p.one.rip){p.one.rip=p.one.fx=0;riposteHit(m,d)}else if(p.one.fx){p.one.fx=0;hitFx('closer',m,.05,.4,Math.atan2(p.vy,p.vx));if(TU)tutEv('closer')}}if(p.push&&!m.boss&&mons.includes(m)){const v=Math.hypot(p.vx,p.vy)||1;mPush(m,p.vx/v*p.push,p.vy/v*p.push)}}byPet=null;if(S.apex&&!p.pet)apexHit(m,d);
      if(p.kind==='arrow'&&!p.pet&&TSRC.length&&TSRC[0].form==='arrowhead'&&++P.trN>=6){P.trN=0;P.trQ=1;P.trT=m}
      if(p.boom){rings.push({x:p.x,y:p.y,life:.35,max:.35,r:85,fx:true});puff(p,'#ff8a4c',14,220);S.shake=Math.max(S.shake,.2);noise(.2,.3,700,150);for(const o of[...mons])if(!o.hidden&&mons.includes(o)&&dist(o,p)<85+o.r)hurtM(o,p.boom,true)}if(p.kind==='skull')leech();
      if(p.kind==='bolt'&&S.adv==='pyromancer'){rings.push({x:p.x,y:p.y,life:.3,max:.3,r:70,fx:true});puff(p,'#ff8a4c',8,160);for(const o of[...mons])if(o!==m&&!o.hidden&&mons.includes(o)&&dist(o,p)<70+o.r)hurtM(o,d/2)}
      if(!m.boss&&(!mons.includes(m)||m._gone))continue; // a shot that kills something small flies on, so a swarm cannot soak up every single bolt
      if(p.pierce>0)p.pierce--;else{p.dead=true;break}}}GEO--;
  pshots=pshots.filter(p=>!p.dead);
  if(S.banner>0)S.banner-=dt;
  if(S.mode!=='play'||S.banner>1.5)return;
  if(VS&&VP.frozen)return; // (versus: nothing moves before the countdown is over)
  trophyTick(dt);if(PETS.fielded.length)petGrid();
  for(const a of allies){if(a.pet){petStep(a,dt);continue}if(a.shade){a.life-=dt;petStep(a,dt);continue}if(a.trophy){trophyStep(a,dt);continue}if(a.apexAlly){allyX(a,dt);continue}a.life-=dt;a.cd-=dt;let t=null,bd=1e9;if(cmdNow()!=='free')t=petTarget(a);else for(const m of mons){if(m.hidden)continue;const d=dist(m,a)-(m.boss?140:0)+(m.ward>.3?2000:0);if(d<bd){bd=d;t=m}}
    const to=t||cmdHome(),d=dist(to,a),stop=t?t.r+a.r:46;
    if(d>stop){let g=angTo(a,to);const sp=a.kind==='wolf'?250:200;if(a.avT>0)a.avT-=dt;if(obstacles.length)g=steer(a,g,d);a.x+=Math.cos(g)*sp*dt;a.y+=Math.sin(g)*sp*dt;a.walk+=dt*12;a.flip=Math.cos(g)<0;clamp(a,a.r);if(obstacles.length)collide(a,a.r,true)}
    else if(t&&a.cd<=0){a.cd=.7;GEO++;hurtM(t,(a.kind==='wolf'?2:thrallK())*dmgMul()*(1+eqv('thr')/100)*(P.legT>0?1.5:1)*(DOMS()?DOMSUM:1),true);GEO--;leech()}
    if(a.life<=0)puff(a,'#e7dfcd',6)}
  allies=allies.filter(a=>a.life>0);
  if(PETS.fallen.length)reviveStep(dt);
  for(const f of fields){if(f.ax){fieldX(f,dt);continue}f.t+=dt;if((f.tick-=dt)<=0){f.tick=f.every;f.n=!f.n;rings.push({x:f.x,y:f.y,life:.45,max:.45,r:f.r,fx:true});
    const fc=f.kind==='frost'?'#8fd3ff':f.kind==='halo'?'#ffe08a':f.kind==='domain'?'#a98bff':'#e7dfcd';for(let i=0;i<5;i++){const a=rand()*TAU,d=rand()*f.r;bits.push({x:f.x+Math.cos(a)*d,y:f.y+Math.sin(a)*d,vx:0,vy:f.kind==='rain'?60:-30,life:.5,max:.5,c:fc,r:2.5})}
    GEO++;if(!f.rem)for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,f)<f.r+m.r){if(f.sk)TAGOK++;if(f.kind==='domain'){mMark(m,.7);if(!m.boss)mSlow(m,.8)}else if(f.slow)mSlow(m,.8);if(f.sk)TAGOK--;if(f.brand){TAGOK++;tagSet(m,4);TAGOK--}hurtM(m,f.dmg,true)}GEO--;
    if(f.foe){if(VS)vsField(f);continue}
    if(f.kind==='halo'&&f.n&&dist(P,f)<f.r&&P.hp<P.maxHp&&!P.down)healP(.04)}}
  fields=fields.filter(f=>f.t<f.dur);
  if(S.mode!=='play')return;
  if(!CL())finStep();
  if(TR){trialStep(dt);if(S.mode!=='play')return}
  if(DRE)dareStep(dt);
  if(TU){tutStep(dt);if(S.mode!=='play')return}
  if(XF){xfStep(dt);if(S.mode!=='play')return}
  if(S.slowT>0){S.slowT-=dt;dt*=S.slowK} // the held breath after a hairbreadth dodge: from here on (the traps, the monsters, their bolts and blasts) the world runs slow; the clocks of a trial and of a dare do not
  if(obstacles.length)roomStep(dt);
  const CLI=CL(); // a client's monsters are the host's: it only works out what they do to its own hero and pets
  if(!CLI&&S.wave&&!boss&&!mons.length&&(S.waveT-=dt)<=0){if(S.wave.n<S.wave.of){S.wave.n++;spawnWave()}else enterBoss()}
  if(!CLI&&act2()&&boss&&boss.hp>0&&boss.ai!=='hollow'&&boss.ai!=='summoner'&&(S.elite-=dt)<=0){S.elite=5;if(mons.length<5+(MP.on?mpPack():0)){const b=rand()*TAU;spawn('mite',boss.x+Math.cos(b)*50,boss.y+Math.sin(b)*50)}}
  if(!CLI&&!VS&&boss&&boss.hz&&boss.hp>0)hazStep(boss,dt);
  if(!CLI&&!VS&&S.L.haz)areaStep(dt);
  if(VS)vsFoes(dt);else if(CLI)mpMons(dt);else for(const m of[...mons]){
    if(S.mode!=='play')break;if(!mons.includes(m))continue; // the boss or the player died earlier in this loop
    m.moving=false;if(m.flash>0)m.flash-=dt;if(m.ward>0)m.ward-=dt;const ox=m.x,oy=m.y;
    if(m.tags)tagStep(m,dt);if(m.brkMax)brkStep(m,dt);
    if(m.markT>0)m.markT-=dt;
    if(m.dotT>0){m.dotT-=dt;if((m.dotK-=dt)<=0){m.dotK=.5;REM=m.dotRem||null;hurtM(m,m.dotD,true);REM=null;if(!mons.includes(m))continue}}
    if(m.venT>0){m.venT-=dt;if((m.venK-=dt)<=0){m.venK=.5;puff(m,TCOL.assassin,4,80);byPet=m.venRem?null:m.venBy||true;REM=m.venRem||null;hurtM(m,m.venD,true);byPet=null;REM=null;if(!mons.includes(m))continue}}
    if((m.chill>0||m.frozen>0||m.rot>0||m.burn>0||m.shock>0||m.soak>0||m.thawT>0||m.shockI>0)&&stStep(m,dt))continue;
    let k=aiK(m);if(S.L.area==='fen'&&!m.hidden&&m.st!=='leap'&&mireAt(m))k*=ARENA.mireM;if(m.slow>0){m.slow-=dt;k*=.5}if(m.chill>0)k*=1-AX.frost.slowK*m.chill;if(m.soak>0)k*=1-AX.tide.soakSlow;if(m.rot>0)k*=1-AX.plague.slowK*m.rot;
    if(m.stun>0){m.stun-=dt;m.beam=null}else if(m.siege&&OBJ()){siege(m,dt*k);T=P}else{T=foe(m);if(T)AI[m.ai](m,dt*k,angTo(m,T),dist(m,T));else T=P} // T: the hero this monster fights (alone that is you; with no hero standing it waits)
    if(S.mode!=='play')break;if(!mons.includes(m))continue;
    if(obstacles.length&&!m.hidden&&m.st!=='leap'){collide(m,m.r,true);
      // a walker that is trying to move and getting nowhere tries the other way round
      if(m.moving&&Math.hypot(m.x-ox,m.y-oy)<12*dt){if((m.stk=(m.stk||0)+dt)>.45){m.stk=0;m.avS=-(m.avS||1);m.avT=1.2;m.side*=-1}}else m.stk=0}
    modStep(m,dt);if(m.el)eliteStep(m,dt);
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
    if(z.mine){rings.push({x:z.x,y:z.y,life:.4,max:.4,r:z.r,fx:true,foe:z.foe});GEO++;if(!z.rem)for(const m of[...mons])if(!m.hidden&&mons.includes(m)&&dist(m,z)<z.r+m.r){byPet=z.pet||null;if(!z.pet){MINE++;LNK=z.lk||null}hurtM(m,z.dmg,!!z.pet);if(!z.pet){MINE--;LNK=null}byPet=null;if(z.stun&&mons.includes(m)){if(z.sk)TAGOK++;mStun(m,m.boss?z.stun:z.stun*2);if(z.sk)TAGOK--}if(z.alt&&mons.includes(m)){TAGOK++;debuff(m,z.alt,z.altD);TAGOK--}}GEO--;if(z.fis&&!z.rem)fisBurst(z);if(z.foe&&VS)vsZone(z);if(!z.pet&&!z.rem&&!z.foe)objBlow(z.x,z.y,z.r,true)}else{if(dist(z,P)<z.r)hurtP(blow(z.hz?-1:1),z.hz?'hazard':'zone');for(const a of allies)if(a.pet&&dist(z,a)<z.r)hurtPet(a,blow(z.hz?-1:1))}}}
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
  if(m.el){ // (round 15) an elite: an amber broken ring, a chevron over it, and the sign of its kind
    ctx.strokeStyle=ELITE.col;ctx.lineWidth=2.5;ctx.setLineDash([7,5]);ctx.lineDashOffset=-S.t*14;circ(0,0,r+5);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=ELITE.col;ctx.beginPath();ctx.moveTo(-7,-r-16);ctx.lineTo(0,-r-9);ctx.lineTo(7,-r-16);ctx.lineTo(7,-r-21);ctx.lineTo(0,-r-14);ctx.lineTo(-7,-r-21);ctx.fill();
    if(m.el===4){ctx.fillStyle=`rgba(255,91,110,${.25+.2*Math.sin(S.t*9)})`;circ(0,0,r*.5);ctx.fill()}if(m.el===5){ctx.strokeStyle='#7fd66b';ctx.lineWidth=2.5;line(-5,-r-30,5,-r-30);line(0,-r-35,0,-r-25)}if(m.el===3){ctx.strokeStyle='rgba(11,10,15,.85)';ctx.lineWidth=2;line(0,-r,0,r)}}
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
    else if(o.kind==='brazier'&&o.spent){circ(x,y,o.core+3);ctx.fillStyle=col('#3a3340');ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='#1a1418';ctx.beginPath();ctx.ellipse(x+Math.cos(o.tip||0)*o.core*1.6,y+Math.sin(o.tip||0)*o.core*1.6,o.core*1.5,o.core*.9,o.tip||0,0,TAU);ctx.fill()}
    else if(o.kind==='brazier'){
      if(o.on){const g=ctx.createRadialGradient(x,y,4,x,y,r);g.addColorStop(0,'rgba(255,217,94,.6)');g.addColorStop(.6,'rgba(255,138,76,.42)');g.addColorStop(1,'rgba(184,38,61,.12)');circ(x,y,r);ctx.fillStyle=g;ctx.fill()}
      else if(o.warn){circ(x,y,r);ctx.fillStyle=`rgba(214,165,68,${.1+.08*Math.sin(S.t*24)})`;ctx.fill()}
      ctx.setLineDash([7,7]);circ(x,y,r);ctx.strokeStyle=o.on?'#ff8a4c':o.warn?'#d6a544':'rgba(255,138,76,.3)';ctx.lineWidth=o.on||o.warn?2.5:1.5;ctx.stroke();ctx.setLineDash([]);
      circ(x,y,o.core+3);ctx.fillStyle=col('#3a3340');ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=2.5;ctx.stroke();circ(x,y,o.core-3);ctx.fillStyle=o.on?'#ffd95e':o.warn?'#ff8a4c':'#7a2a22';ctx.fill()}
    else if(o.kind==='mire'){const g=ctx.createRadialGradient(x,y,r*.2,x,y,r);g.addColorStop(0,'rgba(22,48,44,.9)');g.addColorStop(.8,'rgba(28,60,52,.7)');g.addColorStop(1,'rgba(40,84,70,.15)');circ(x,y,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(120,190,160,.35)';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const q=((S.t*.25+i/3)%1);circ(x+Math.sin(i*2.1)*r*.3,y+Math.cos(i*1.7)*r*.3,r*.15+q*r*.3);ctx.globalAlpha=1-q;ctx.stroke()}ctx.globalAlpha=1}
    else if(o.kind==='crack'){circ(x,y,r);ctx.fillStyle=o.warn?`rgba(214,165,68,${.2+.12*Math.sin(S.t*30)})`:'rgba(8,7,12,.38)';ctx.fill();ctx.strokeStyle=o.warn?'#d6a544':'rgba(231,223,205,.32)';ctx.lineWidth=o.warn?2.5:1.5;ctx.setLineDash([3,6]);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=2;for(let i=0;i<5;i++){const b=i*TAU/5+.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(b)*r*.45,y+Math.sin(b)*r*.45);ctx.lineTo(x+Math.cos(b+.35)*r*.85,y+Math.sin(b+.35)*r*.85);ctx.stroke()}}
    else if(o.dead){ctx.fillStyle=col('#3a3340');for(let i=0;i<6;i++){const b=i*1.07+o.x,d=r*(.25+.5*((i*37)%10)/10);circ(x+Math.cos(b)*d,y+Math.sin(b)*d,r*(.16+.1*(i%3)));ctx.fill()}circ(x,y,r*.5);ctx.fillStyle=col('#6d6478');ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=2;ctx.stroke()}
    else{ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(x+7,y+9,r,r*.9,0,0,TAU);ctx.fill();
      if(o.cr){ctx.save()}
      const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,col('#a8a2b3'));g.addColorStop(.7,col('#6d6478'));g.addColorStop(1,col('#3a3340'));circ(x,y,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#0b0a0f';ctx.lineWidth=3;ctx.stroke();
      circ(x,y,r*.62);ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=2;ctx.stroke();
      if(o.cr){ctx.restore();ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=2.2;for(let i=0;i<o.cr*2;i++){const b=i*2.4+o.y;ctx.beginPath();ctx.moveTo(x+Math.cos(b)*r*.9,y+Math.sin(b)*r*.9);ctx.lineTo(x+Math.cos(b+.5)*r*.4,y+Math.sin(b+.5)*r*.4);ctx.lineTo(x+Math.cos(b+.2)*r*.1,y+Math.sin(b+.2)*r*.1);ctx.stroke()}}}}
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
// The 2D fallback fills whatever box the page gives the canvas: the backing store is that box in device pixels (at most 3 per CSS pixel, times the render scale),
// and the 960 x 600 arena is drawn into it at one scale, centred, with bars where the shape differs. V2 is that transform; clicks are mapped back through it.
// (While the 3D renderer draws, the canvas is the renderer's: nothing here touches its size.)
const V2={k:DPR,ox:0,oy:0,bw:W*DPR,bh:H*DPR};
function fit2d(){
  const d=Math.min(3,window.devicePixelRatio||1)*Math.max(.5,Math.min(1,+SET.res||1)),bw=Math.max(2,Math.round((cv.clientWidth||W)*d)),bh=Math.max(2,Math.round((cv.clientHeight||H)*d));
  if(Math.abs(cv.width-bw)>1||Math.abs(cv.height-bh)>1){cv.width=bw;cv.height=bh}
  V2.bw=cv.width;V2.bh=cv.height;V2.k=Math.min(V2.bw/W,V2.bh/H);V2.ox=(V2.bw-W*V2.k)/2;V2.oy=(V2.bh-H*V2.k)/2;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,V2.bw,V2.bh);
  ctx.setTransform(V2.k,0,0,V2.k,V2.ox,V2.oy);
}
function draw(){
  const sight=has('sight');
  fit2d();ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  if(S.shake>0&&!calm)ctx.translate((rand()-.5)*S.shake*26,(rand()-.5)*S.shake*26);
  ctx.drawImage(floor(),0,0);
  if(sight&&!act2()){ctx.globalCompositeOperation='lighter';for(const[x,y]of[[WALL,WALL],[W-WALL,WALL],[WALL,H-WALL],[W-WALL,H-WALL]]){const R=210+Math.sin(S.t*9+x)*10,g=ctx.createRadialGradient(x,y,4,x,y,R);g.addColorStop(0,'rgba(255,170,70,.42)');g.addColorStop(1,'rgba(255,120,40,0)');ctx.fillStyle=g;ctx.fillRect(x-R,y-R,R*2,R*2)}ctx.globalCompositeOperation='source-over'}
  if(sight){ctx.fillStyle='rgba(255,236,190,.3)';for(let i=0;i<26;i++){const x=(i*137.5+S.t*(6+i%5))%W,y=(i*89.3+Math.sin(S.t*.4+i)*30+S.t*(3+i%3)+60)%H;circ(x,y,1+(i%3)*.5);ctx.fill()}}
  if(obstacles.length)drawRoom();
  for(const f of fields){if(f.ax){drawFieldX(f);continue}circ(f.x,f.y,f.r);ctx.fillStyle=f.kind==='fire'?'rgba(255,138,76,.22)':f.kind==='frost'?'rgba(143,211,255,.16)':f.kind==='halo'?'rgba(255,224,138,.15)':f.kind==='domain'?'rgba(58,47,85,.45)':'rgba(231,223,205,.1)';ctx.fill();ctx.strokeStyle=f.kind==='frost'?'rgba(143,211,255,.6)':f.kind==='halo'?'rgba(255,224,138,.6)':f.kind==='domain'?'rgba(169,139,255,.7)':'rgba(231,223,205,.45)';ctx.lineWidth=1.5;ctx.stroke()}
  if(TR&&TR.obj)drawLamp2d(TR.obj);
  if(!VS)drawR12();
  for(const f of morsels){circ(f.x,f.y+Math.sin(S.t*4)*2,8);ctx.fillStyle='#d1213f';ctx.fill();circ(f.x-2,f.y-3+Math.sin(S.t*4)*2,2.5);ctx.fillStyle='#ffb3bf';ctx.fill()}
  if(!VS){for(const m of mons)drawMon(m);{const LM=lockNow();if(LM){const r=LM.r+12+(LK.hard?0:3),k=LK.hard?1:.45;ctx.save();ctx.translate(LM.x,LM.y-LM.lift*46);ctx.rotate(LK.hard?S.t*.8:0);ctx.strokeStyle=`rgba(111,227,255,${k})`;ctx.lineWidth=LK.hard?3:2;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,r,i*TAU/4+.25,i*TAU/4+TAU/4-.25);ctx.stroke()}ctx.restore()}}
    if(MP.on){const RI=reviveInfo();if(RI){const ring=(x,y,k,can)=>{ctx.save();ctx.setLineDash([6,6]);ctx.strokeStyle=can?'rgba(127,214,107,.55)':'rgba(149,142,163,.4)';ctx.lineWidth=2;circ(x,y,REV.r);ctx.stroke();ctx.setLineDash([]);if(k>0){ctx.strokeStyle='#7fd66b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,REV.r,-Math.PI/2,-Math.PI/2+TAU*k);ctx.stroke()}ctx.restore()};for(const a of RI.allies)ring(a.x,a.y,a.k,a.can);if(RI.me.down)ring(P.x,P.y,RI.me.k,RI.me.left>0)}}for(const m of mons)if(m.chill>0||m.frozen>0||m.rot>0||m.burn>0||m.shock>0||m.soak>0)drawSt(m);
  drawBeams()}else vsDraw2d(0);
  for(const s of shots){if(sight){circ(s.x,s.y,s.r+5);ctx.fillStyle='rgba(255,138,76,.28)';ctx.fill()}circ(s.x,s.y,s.r);ctx.fillStyle=col('#ff8a4c');ctx.fill();circ(s.x,s.y,s.r*.45);ctx.fillStyle='#fff';ctx.fill()}
  for(const a of allies)a.pet?drawPet(a):a.shade?drawShade(a):a.trophy?drawTrophy(a):a.apexAlly?drawApxAlly(a):drawAlly(a);
  if(echoes.length)drawEchoes();
  if(MP.on)mpDraw2d(0);
  for(const p of MP.on?mpAllPshots():pshots){
    if(p.kind==='skull'){circ(p.x,p.y,p.r+4);ctx.fillStyle='rgba(127,214,107,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle='#e7dfcd';ctx.fill();ctx.fillStyle='#15121b';circ(p.x-1.7,p.y-.6,1.2);ctx.fill();circ(p.x+1.7,p.y-.6,1.2);ctx.fill()}
    else if(p.kind==='arrow'){const a=Math.atan2(p.vy,p.vx);ctx.strokeStyle='#e7dfcd';ctx.lineWidth=2;line(p.x-Math.cos(a)*15,p.y-Math.sin(a)*15,p.x,p.y);circ(p.x,p.y,2);ctx.fillStyle='#d5dce2';ctx.fill()}
    else{const o=p.kind==='orb';circ(p.x,p.y,p.r+3);ctx.fillStyle=o?'rgba(255,224,138,.4)':'rgba(143,211,255,.35)';ctx.fill();circ(p.x,p.y,p.r);ctx.fillStyle=o?'#ffe08a':'#8fd3ff';ctx.fill();circ(p.x,p.y,p.r*.45);ctx.fillStyle='#fff';ctx.fill()}}
  if(P&&MANA.drawing&&S.mode==='play'){ctx.globalAlpha=.3+.2*Math.sin(S.t*6);ctx.strokeStyle='#6fe3ff';ctx.lineWidth=1.5;circ(P.x,P.y+4,26+3*Math.sin(S.t*3));ctx.stroke();ctx.globalAlpha=1} // drawing mana in from the room
  if(P&&P.auraR>0&&S.mode!=='title')drawAura(P);
  if(P&&S.apex&&cls()&&S.mode!=='title')drawApxHero(P,S.apex);
  if(P)drawPlayer();
  if(P&&P.beam)drawBeamP(P);
  if(MP.on)mpDraw2d(1);
  for(const b of bits){ctx.globalAlpha=Math.max(0,b.life/b.max);circ(b.x,b.y,b.r);ctx.fillStyle=b.c;ctx.fill()}
  if(arcs.length)drawArcs();
  ctx.font='22px "Pirata One",Georgia,serif';ctx.textAlign='center';for(const f of floats){if(f.big)ctx.font=Math.round(22*f.big)+'px "Pirata One",Georgia,serif';ctx.globalAlpha=Math.min(1,f.life*2.5);ctx.fillStyle='#0d0c11';ctx.fillText(f.txt,f.x+1.5,f.y+1.5);ctx.fillStyle=f.c;ctx.fillText(f.txt,f.x,f.y);if(f.big)ctx.font='22px "Pirata One",Georgia,serif'}ctx.globalAlpha=1;
  const SR=S.mode==='title'?(sight?0:FOG):sightR();
  if(SR&&P){
    fctx.globalCompositeOperation='source-over';fctx.clearRect(0,0,W,H);fctx.fillStyle='rgba(6,5,9,.965)';fctx.fillRect(0,0,W,H);
    fctx.globalCompositeOperation='destination-out';const g=fctx.createRadialGradient(P.x,P.y,SR*.3,P.x,P.y,SR);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');fctx.fillStyle=g;fctx.fillRect(0,0,W,H);
    ctx.drawImage(fogC,0,0);
  }
  // what you feel through the floor (no eyes) or hear beneath it (ears)
  for(const r of rings){if(!r.fx&&(r.under?!has('hearing'):sight))continue;const k=1-r.life/r.max,hot=r.under||r.fx;ctx.globalAlpha=(1-k)*(hot?.9:.5);ctx.strokeStyle=hot?'#d6a544':'#e7dfcd';ctx.lineWidth=hot?3:1.5;circ(r.x,r.y,6+r.r*k);ctx.stroke()}
  ctx.globalAlpha=1;
  if(has('touch')){
    for(const z of zones){const k=z.t/z.dur;circ(z.x,z.y,z.r);ctx.fillStyle=z.mine?`rgba(143,211,255,${.1+.25*k})`:z.hz?`rgba(224,106,18,${.12+.25*k})`:`rgba(184,38,61,${.12+.25*k})`;ctx.fill();ctx.strokeStyle=z.mine?'#8fd3ff':z.hz?'#ffe9a0':'#d6a544';ctx.lineWidth=2;ctx.stroke();circ(z.x,z.y,z.r*k);ctx.strokeStyle='rgba(231,223,205,.8)';ctx.stroke();
      if(z.sx!==undefined){const bx=z.sx+(z.x-z.sx)*k,by=z.sy+(z.y-z.sy)*k-Math.sin(k*Math.PI)*70;circ(bx,by,7);ctx.fillStyle='#22242b';ctx.fill();ctx.strokeStyle='#ff8a4c';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=2}}
    ctx.fillStyle='#d6a544';ctx.font='700 30px Spectral,Georgia,serif';ctx.textAlign='center';
    if(!VS)for(const m of mons)if(m.st==='wind')ctx.fillText('!',m.x,m.y-m.r-12);
  }
  if(VS)vsDraw2d(1);
  if(S.banner>0&&S.mode==='play'){
    const L=S.L;ctx.globalAlpha=Math.min(1,S.banner/.6);ctx.textAlign='center';
    ctx.fillStyle='rgba(13,12,17,.72)';ctx.fillRect(0,196,W,150);
    ctx.fillStyle='#d6a544';ctx.font='600 15px Spectral,Georgia,serif';ctx.fillText(('FLOOR '+(S.level+1)+'  ·  '+L.name).toUpperCase(),W/2,228);
    ctx.fillStyle='#e7dfcd';ctx.font='58px "Pirata One",Georgia,serif';ctx.fillText(L.title,W/2,286);
    ctx.fillStyle='#b9b2c6';ctx.font='italic 20px Spectral,Georgia,serif';ctx.fillText(L.hint,W/2,322);ctx.globalAlpha=1;
  }
  if(TR)drawTrialHud2d();
  ctx.restore();
  bossBar();
}

/* ---------- screens ---------- */
let lastScreen=null; // the last screen the game itself put up, so MB.api.hide() can hand the overlay back
function show(o,foreign){
  if(!foreign)lastScreen=o;
  $('ovKick').textContent=o.kick||'';$('ovTitle').textContent=o.title||'';$('ovTitle').style.color=o.col||'';$('ovBody').textContent=o.body||'';$('ovBody').hidden=!o.body;$('ovKeys').textContent=o.keys||'';$('ovKeys').hidden=!o.keys;
  if(o.extra||$('ovExtra'))ovExtra(o.extra);
  const cd=$('ovCards'),keep=o.list&&cd.classList.contains('list')?[cd.scrollTop,$('ovPanel').scrollTop]:null;cd.textContent='';cd.hidden=!o.cards;cd.className='cards'+(o.list?' list':''); // list: many compact rows that scroll (the pets screen); it keeps its place when it is drawn again
  (o.cards||[]).forEach(c=>{const e=document.createElement('button');e.type='button';
    for(const[tag,txt]of[['b',c.title],['small',c.sub],['span',c.body]]){const x=document.createElement(tag);x.textContent=txt;e.appendChild(x)}
    if(c.col)e.children[1].style.color=c.col;if(c.cls)e.className=c.cls;if(c.data)for(const k in c.data)e.dataset[k]=c.data[k];
    e.onclick=()=>{audio();sfx(520,.1,'triangle',.2,780);haptic(20);c.fn()};cd.appendChild(e)});
  const b=$('ovBtns');b.textContent='';b.hidden=!o.btns;b.dataset.nodef=o.nodef?'1':''; // nodef: a screen with no default action (Enter does nothing, no button is marked as the first choice): the versus waiting screen
  (o.btns||[]).forEach(([label,fn],i)=>{const e=document.createElement('button');e.type='button';e.textContent=label;if(!i&&!o.nodef)e.className='primary';e.onclick=()=>{audio();sfx(440,.06,'triangle',.18,660);haptic(10);fn()};b.appendChild(e)});
  $('ovPanel').className='panel'+(o.wide?' wide':'')+(o.cls?' '+o.cls:''); // cls: a class for the page to style a kind of screen by (apexPanel, doorPanel, trialPanel)
  if(!o.doors&&!foreign)DOORS=null;
  $('ov').className=o.soft?'soft':'';$('ov').hidden=false;if(keep){cd.scrollTop=keep[0];$('ovPanel').scrollTop=keep[1]}
}
function hud(){
  const nb=Object.values(S.b).reduce((a,b)=>a+b,0),cn=()=>S.adv?CLASSES[S.cls].adv.find(a=>a[0]===S.adv)[1]:CLASSES[S.cls].name;
  S.rank=rank();tune();
  const chips=act2()&&S.cls?[['Rank '+S.rank,true],...(S.apex&&APEX[S.apex]?[[APEX[S.apex].title,true,'chipApex apexPath-'+S.apex+' apexSide-'+APEX[S.apex].side]]:[]),[cn(),true],...CLASSES[S.cls].pows.map((p,i)=>[p[0],pw(i+1)]),...(nb?[[nb+(nb>1?' boons':' boon'),true]]:[]),...(petOn().length?[[petOn().length>1?petOn().length+' '+tw().pl:cap1(tw().n)+' · '+petTag(petOn()[0]),true]]:[])]:PARTS.map(p=>[p.name,has(p.id)]);
  $('ledger').textContent='';chips.forEach(([name,on,k])=>{const li=document.createElement('li');li.textContent=name;if(on)li.className='on'+(k?' '+k:'');$('ledger').appendChild(li)});
  if(act2()&&S.cls&&S.eq)for(const sl of ESLOTS){const it=S.eq[sl];if(!it)continue;const li=document.createElement('li');li.textContent=itemName(it);li.title=it.rarity+' '+sl+': '+itemLine(it)+itemMarks(it);if(it.set)li.dataset.set=SETS[it.set].id;if(it.tr)li.dataset.trait=TRAITS[it.tr[0]].id;li.style.cssText='opacity:1;color:'+RAR[it.r][1]+';border-color:'+RAR[it.r][1];$('ledger').appendChild(li)}
  const hp=$('hp');hp.textContent='';
  if(!P)return;
  hp.className=P.maxHp>50?'many lots':P.maxHp>20?'many':''; // a long row of pips gets thinner pips, so it still fits a phone
  if(has('touch')){for(let i=0;i<P.maxHp;i++){const e=document.createElement('i');if(i>=P.hp)e.className='off';hp.appendChild(e)}hp.setAttribute('aria-label',P.hp+' of '+P.maxHp+' health')}
  else{const e=document.createElement('em');e.textContent='Numb. No nerves to feel wounds with. You rattle when you are close to breaking.';hp.appendChild(e)}
  $('bDash').disabled=!has('organs');$('bDash').textContent=cls()==='mage'?'Blink':'Dash';
  syncSkills();
}
const bodyHp=()=>{const c=cls();return Math.max(1,Math.round((4+(has('organs')?3:0)+(has('skin')?3:0)+(c?CLASSES[c].hp+3*S.b.vigor:0)+(c==='tank'&&pw(3)?4:0)+(c&&adv('hp')||0)+(c?eqv('hp'):0))*(c&&ORDS()?apxSt()[1]:1)*(c?frK(2,FR.e.hp):1)))};
function freshBody(){
  const c=cls(),maxHp=bodyHp();
  const maxMana=manaMax();
  P={x:W/2,y:H-120,face:-Math.PI/2,hp:maxHp,maxHp,mana:maxMana,maxMana,resv:0,still:0,drawK:0,inv:0,atk:0,cd:0,dashCd:0,dashT:0,dx:0,dy:0,walk:0,regen:0,swing:0,moving:false,skCd:0,skCds:[0,0,0,0,0,0],cdS:Array(13).fill(0),mxS:Array(13).fill(0),ascT:0,auraK:.5,auraR:c&&S.apex==='order'?ORDR:0,beam:null,bmT:0,bmA:0,bmHit:null,resB:0,rageT:0,guardT:0,legT:0,fleetT:0,stoneT:0,stormT:0,stormK:0,fireT:0,fireK:0,renewT:0,renewK:0,quakeN:0,cutN:0,starN:0,rushD:0,shield:c==='tank'&&S.adv!=='berserker',shT:0,sumT:3,lc:0,amb:0,trN:0,trCd:0,trQ:0,trT:null,trW:2.5,saved:false,vx:0,vy:0,safeX:W/2,safeY:H-120,chS:0,chN:CHN[c||'none'].steps.length,chC:false,chT:0,chAt:-9,chGap:0,pdT:0,rip:0,dgT:0,pdCd:0};
  apxBody();
}
// dev only: __mb.over = {kind, mods, waves, room} replaces parts of a generated level, for testing one thing at a time
function devDef(L,n){
  const o=CL()?MP.over:window.__mb&&window.__mb.over;if(!o||n<12)return L;
  if(FKINDS.includes(o.trial)&&!tenth(n)){L=levelDef(n,o.trial);if(HRULE[o.handicap]&&L.handicap){L.handicap=o.handicap;L.hint=HRULE[o.handicap]}} // trial: the kind of floor; handicap: which ordeal
  if(o.kind&&GENHP[o.kind]){const b=SPEC[o.kind];L.kind=o.kind;L.spec={...b,ai:o.kind,crown:0,name:PRE[n%10]+' '+b.name.replace('The ',''),hp:Math.round(GENHP[o.kind]*genMul(n)*(L.floorKind==='race'?TK.raceHp:1)),col:TINT[(n*3)%10],r:b.r+2};L.mods=[];L.waves=0;if(L.floorKind!=='survive'&&L.floorKind!=='guard')L.name=L.spec.name}
  if(o.mods)L.mods=o.mods.filter(x=>MODS.includes(x));if(o.waves>=0)L.waves=Math.min(2,o.waves|0);if(L.floorKind==='survive'||L.floorKind==='guard'||L.floorKind==='race')L.waves=0;if(L.floorKind==='survive'||L.floorKind==='guard')L.mods=[];if(o.room>=0&&ROOMS[o.room])L.room=o.room;
  return L;
}
// begin(n) is how every screen starts a level: it gives extras.js the chance to show an interlude first (MB.interlude returns true and calls done() when it is over)
let beginTok=0;
function begin(n){
  if(MP.on)return mpReady(n); // co-op: no interludes; the level starts for all when everyone is through
  const tok=++beginTok;let went=false;const done=()=>{if(went||tok!==beginTok)return;went=true;startLevel(n)};
  if(typeof MB.interlude==='function'){$('ov').hidden=true;let wait=false;try{wait=MB.interlude(n,done)===true}catch(e){console.error('Ashes to Apex: interlude failed',e)}if(wait)return}
  done();
}
function startLevel(n){
  beginTok++;
  if(n>=8&&S.cls&&!S.eq)S.eq=basicSet(S.cls);eqSync();
  S.level=n;S.mode='play';S.banner=2.8;S.shake=0;S.stop=0;const L=S.L=TU?tutDef():XF?xfDef(n):devDef(levelDef(n),n);
  // the door chosen at the crossroads below (or forced for a test) changes this floor, if it is a plain fight; a door for a floor that is behind is forgotten
  {const dv=!MP.on&&window.__mb&&window.__mb.over&&window.__mb.over.door;if(dv&&DOOR[dv]&&n>=12)S.door={id:dv,n};if(S.door&&S.door.n<n)S.door=null;
    L.door=S.door&&S.door.n===n&&L.floorKind==='fight'&&DOOR[S.door.id]?S.door.id:null;if(L.door==='horde')L.waves=2;if(L.door)L.hint=DOOR[L.door].title+'. '+DOOR[L.door].risk}
  TR=trialMake(L);DRE=dareMake(L,n);FN=null;CB.n=0;CB.best=0;CB.t=0;S.slowT=0;S.dmg0=ST.dmgTaken;S.dd0=ST.dmgDealt;AK=AK0;S.myT=null;LK={m:null,hard:false,t:-9};PETS._htAt=-1;if(PETS.cmd==='hold'||VS)PETS.cmd='free';PETS.home=null;MINE=0;LNK=null;TAGOK=0;BIG=0;DOORS=null;FALLEN.length=0;PG.clear();
  freshBody();if(L.door==='wound')P.hp=Math.max(1,Math.ceil(P.maxHp/2));if(MP.on)mpSpawnAt();
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];bits=[];rings=[];floats=[];morsels=[];echoes=[];arcs=[];TSRC=[];S.elite=4;
  L.area=areaOf(n,L,!!DRE);L.haz=L.area==='ash'||L.area==='court'?{kind:L.area,t:4.5,n:0}:null;if(L.area&&!L.door&&L.hint==='Stronger than the last. So are you.')L.hint=ARENA.text[L.area];
  S.paused=false;SND.levelStart();obstacles=buildRoom(n,L.room,L.area);boss=null;S.wave=null;if(L.area)emit('arena',{kind:'area',state:'start',theme:L.area,name:ARENA.names[L.area],text:ARENA.text[L.area]});
  S.elDebt=0;L.elites=[];L.elN=CL()?0:elitesOf(n,L,!!DRE);
  if(CL()){} // a client's monsters come from the host
  else if(L.floorKind==='survive'||L.floorKind==='guard'){} // no monster of its own: the trial brings its own (trialStep)
  else if(L.waves){S.wave={n:1,of:L.waves};spawnWave();for(const m of mons)m.t+=.4}
  else if(L.noBoss){} // (round 16) a proof fought against a formation
  else{boss=spawn(L.kind,W/2,140,true,L.spec);arm(boss,L);boss.t=1.2;floorPay(boss,L);if(L.elN)eliteEscort(L.elN)}
  if(L.kind==='mimic'&&!CL())reshuffle();
  if(S.adv==='beastmaster')allies.push(ally('wolf'));
  PETS.down=false;PETS.fielded=[];PETS.dmg=0;S.note='';fieldPets();
  if(S.note){floats.push({x:P.x,y:P.y-70,txt:S.note,life:4.5,c:'#6fe3ff'});S.note=''}
  if(S.cls&&!VS){const nw=altNews(n);if(nw.length){floats.push({x:P.x,y:P.y-92,txt:'New alteration: '+nw.join(', '),life:5,c:'#d6a544'});emit('alterationOpen',{names:nw,floor:n+1})}}
  if(!S.wave)$('bossName').textContent=L.name;
  ST.levelTime=0;if((!SET.testUnlock||MP.on)&&!TU&&!XF)ST.bestLevel=Math.max(ST.bestLevel,n);
  $('ov').hidden=true;if(!TU&&!XF)save(n);hud();$('lvl').textContent=TU?L.title+' · a lesson':XF?XF.label+' · '+L.title+(XF.of>1?' · '+(XF.i+1)+' of '+XF.of:''):'Floor '+(n+1)+' · '+L.title+(S.rank?' · Rank '+S.rank:'');
  if(MP.on)mpLevelStarted();
  emit('levelstart',XF?{level:n,L,aside:XF.kind}:{level:n,L});if(!TU&&!XF)emit('floor',{floor:n+1,kind:L.floorKind});if(TR)emit('trial',{kind:TR.kind,state:'start'});if(XF)xfBegin();
  if(DRE){dareEv('start');if(!window.MBDareBand)floats.push({x:W/2,y:H/2-110,txt:DRE.title,life:3.4,c:'#ffd95e',big:1.4})}
}
function reward(){
  haptic([40,60,40,60,140]);chime();const n=S.level,r0=rank(n),L=S.L;allies=[];TSRC=[];MP.menu=false;emit('reward',{level:n});
  if(!SET.testUnlock)towerDone(n+1);if(n>=12&&S.cls){if(isTrial(L.floorKind))S.tr++;if(L.door==='lean')S.tr+=3} // a trial passed is worth TMANA maximum mana for good; the Bare Door three times that
  for(const e of PETS.fielded)if(PETS.roster.includes(e))e.plv=Math.min(PLVMAX,e.plv+1);PETS.fielded=[]; // every pet that was sent into this fight grows a little
  if(n===7)return chooseClass();
  P.inv=0;S.level++;S.mode='reward';hud();
  const up=S.rank&&S.rank!==r0,rk=(GR&&GR.level===n&&L.door!=='lean'?gline()+' ':'')+(up?'Rank up. You have climbed from rank '+r0+' to rank '+S.rank+'.':'');
  if(up){SND.rankUp();setTimeout(()=>haptic([30,50,30,50,30,50,200]),500)}
  if(n>=8&&S.cls){const after=()=>bindScreen(n,()=>newSkill(n,()=>reward2(n)));
    if(L.door==='lean')return after(); // the Bare Door: nothing drops
    return dropScreen(n,rk,L.door==='wound'?()=>dropScreen(n,'',after,'A second item'):after)}
  reward2(n);
}
// a level that teaches a skill says so; with more than six known you choose which six to carry
function newSkill(n,next){
  const k=known(),si=k-1;if(k<=known(n)||n<10)return next(); // the skills of levels 10 and 11 are announced by the power-up screens
  const sk=CLASSES[S.cls].skills[si],free=S.load.findIndex(v=>v>=k-1&&v!==si); // a slot still holding a skill not learned yet
  if(k<=NSK&&!S.load.includes(si)&&free>=0)S.load[free]=si;
  const slot=S.load.indexOf(si),touch=matchMedia('(pointer:coarse)').matches;
  show({soft:true,kick:'New skill · floor '+sk.level,title:sk.name,body:sk.text,keys:k>NSK?'You know '+k+' skills and carry six. You can change them now, or later from the pause screen.':slot>=0&&!touch?'It is on key '+(slot+1)+'.':'',btns:k>NSK?[['Choose my six',()=>loadout(next,si)],['Keep my six',next]]:[['Go on',next]]});
}
function loadout(done,fresh){
  const c=CLASSES[S.cls],ids=learned(),sks=ids.map(skInfo),again=()=>{syncSkills();loadout(done,fresh)};
  show({wide:true,kick:'Skills · '+c.name,title:ids.length>NSK?'Choose your six':'Your skills',body:(matchMedia('(pointer:coarse)').matches?'You carry six skills, one on each skill button.':'You carry six skills, on keys 1 to 6.')+(ids.length>NSK?' Pick a skill you are not carrying to swap it in.':'')+' Pick a skill you carry to see its alterations.'+(MRISE?' Skills cost '+MRISE*100+'% more mana with every floor past the ninth; your pool grows faster than that.':''),
    cards:sks.map((sk,q)=>{const i=ids[q],slot=S.load.indexOf(i);const A=altOf(i),nOpen=i<10?[0,1,2].filter(j=>altOpen(i,j)).length:0;return{title:(A?A.name+' ':'')+sk.name,sub:(slot>=0?'Carried · '+(slot+1):i===fresh||fresh===10&&i>9?'New · not carried':'Not carried')+(nOpen&&slot>=0?' · '+nOpen+(nOpen>1?' alterations':' alteration'):''),col:slot>=0?'':'#958ea3',body:sk.text,data:{sk:i},
      fn:slot>=0?(i<10?()=>altScreen(i,again):again):()=>show({wide:true,kick:'Carry '+sk.name,title:'In place of which?',cards:S.load.map((v,j)=>{const cur=skD(S.cls,v)?skInfo(v):{name:'Empty',text:'Nothing is carried here.'};return{title:cur.name,sub:'Slot '+(j+1),body:cur.text,fn:()=>{S.load[j]=i;if(S.mode!=='reward')save(S.level);again()}}}),btns:[['Back',again],...(i<10?[['Alterations',()=>altScreen(i,again)]]:[])]})}}),
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
  const i=petInfo(e);return'Power '+num(i.power)+': '+num(i.hp)+' health, and its blows do '+fmt(i.hit[0])+' (a brush), '+fmt(i.hit[1])+' (a bolt) and '+fmt(i.hit[2])+' (a charge, a lunge or a blast). Bound on floor '+(e.lv+1)+(e.plv?', grown '+e.plv+(e.plv>1?' times':' time'):'')+'. '+(PETDO[e.ai]||PETDO.mite)+(e.mods&&e.mods.length?' '+e.mods.map(k=>PERK[k]).join('. ')+'.':'')};
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
  const f=form(),L=S.L;if(!f||n<8||!L||L.kind==='mimic'||L.floorKind==='survive'||L.floorKind==='guard')return next(); // (the Onslaught and the Vigil have no monster of their own to take)
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
    cards:[{title:w.take,sub:w.pet?petSub(e):R.length?cap1(w.n)+' '+(R.length+1):'Your first '+w.n,col:w.col,body:w.pet?e.name+' joins you and fights as it fought you: the same attacks, the same strength'+(e.mods.length?', the same modifiers':'')+'. It grows a little with every fight it joins, and keeps most of its worth as you climb. The stronger a pet, the more mana it holds.':'It is as strong as the floor you take it onto, however old it is.',fn:take},leave]});
}
// a new one has joined. Held with mana (pets, familiars): send it out if the pool can hold it, let it wait, or open the list. Otherwise one is in use at a time: pick which.
function petPick(next,fresh){
  const on=petOn(),R=PETS.roster,w=tw(),i=R.indexOf(fresh);
  if(resvForm()){const c=petCost(fresh),M=manaMax(),h=petHeld(on),can=h+c<=M;
    return show({wide:true,kick:w.done+' · '+heldLine(on),title:can?'Send it out?':'No mana to hold it',
      body:can?petTag(fresh)+' would hold '+c+' of your mana while it is out, and leave '+num(M-h-c)+' for skills. You can change who goes with you at any time from the pause screen.'
        :petTag(fresh)+' needs '+c+' mana to hold, and only '+num(M-h)+' of your '+num(M)+' is not held already. It waits until you withdraw another or your pool grows.',
      cards:[...(can?[{title:w.send,sub:w.pet?petSub(fresh)+' mana':'Holds '+c+' mana',col:w.col,body:'It goes with you onto the next floor. '+petLine(fresh),fn:()=>{PETS.active.push(i);next()}}]:[]),
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
      :rs&&w.pet?'Pick one to send it out or call it back. Each is the monster it was, with its own attacks and its own power, however many stand beside it. Each one that is out holds mana for as long as it is out, the more the stronger it is: held mana cannot be spent on skills and does not refill. One that falls rises again after '+REVT+' seconds for a quarter more than it holds, from what is left, and half as much again each further time on a floor'+(PETS.auto?'.':'; that is switched off now, so the fallen stay down until the next floor.')+' A trinket that makes thralls and pets hit harder raises what a pet holds as well as its power.'
      :rs?'Pick one to send it out or call it back. Each one that is out holds part of your mana for as long as it is out: held mana cannot be spent on skills and does not refill. The more that fight at once, the weaker each one is.'
      :'Pick one to use it. One is in use at a time.',
    keys:note||'',
    cards:order.map(i=>{const p=R[i],act=on.includes(p),c=petCost(p);return{title:petTag(p),
      sub:(w.pet?'Power '+num(petPower(p))+' · ':'')+(rel?'Release'+(act?' · '+w.on.toLowerCase():''):act?(p.down?(PETS.auto?'Fallen · rises for '+reviveCost(p)+' mana':'Fallen · back next floor'):w.on)+(rs?' · holds '+c+' mana':''):w.off+(rs?' · needs '+c+' mana'+(h+c>M?' · not enough':''):'')),
      col:rel?'var(--warn)':act?(rs?w.col:''):'var(--ash)',body:petLine(p),
      fn:rel?()=>show({kick:'Release',title:'Let '+p.name+' go?',body:'It is gone for good.',btns:[['Keep it',()=>again()],['Release it',()=>{petRelease(R.indexOf(p));again()}]]})
        :act?()=>{if(rs)petBack(i);again()}
        :()=>{if(!petSend(i,-1))return again('Not enough mana to hold '+petTag(p)+': it needs '+c+', and '+num(M-h)+' of your '+num(M)+' is free. Withdraw another first.');again()}}}),
    btns});
}
// every boss from level 9 on drops one item for your class: melt it into what you carry, wear it instead, or break it for scrap
function dropScreen(n,rk,next,second,forced){
  if(!S.eq)S.eq=basicSet(S.cls);
  // the dice of a drop are seeded with the floor and the hero as it stands (class, upgrade, boons, equipment, scrap): leaving on the reward screen and clearing the floor again brings the same drop, not a new roll
  let sd=2166136261;for(const ch of[n,S.cls,S.adv,S.scrap,second?1:0,...SLOTS.map(sl=>S.eq[sl].r+':'+S.eq[sl].lvl),...Object.values(S.b)].join('|'))sd=Math.imul(sd^ch.charCodeAt(0),16777619)>>>0;sd=sd||1;
  const rnd=()=>{sd^=sd<<13;sd>>>=0;sd^=sd>>>17;sd^=sd<<5;sd>>>=0;return sd/4294967296};for(let i=0;i<4;i++)rnd();
  const L=S.L,luck=isTrial(L.floorKind),d=forced||(window.__mb&&window.__mb.drop&&window.__mb.drop(n))||dropItem(n,{luck,more:(GR&&GR.level===n?GR.luck:0)+(S.rite&&S.rite.lv===n&&!second?1:0)+(frF(4)>1?Math.floor((frF(4)-1)*FR.more+rnd()):0),min:L.door==='wrath'?1:0,rnd,marks:!VS}),cur=S.eq[d.slot],after=cur?{...cur,lvl:cur.lvl+1,up:cur.up+RAR[d.r][3]}:null,go=f=>()=>{f();eqSync();hud();emit('gear',gearInfo());next()};
  const marks=(d.set?' It bears the mark of '+SETS[d.set].name+' ('+(SETN[d.set]||0)+' of 4 worn).':'')+(d.tr?' Trait, '+trName(d)+': '+trText(d):''),takes=cur&&(d.set||d.tr)&&(d.set!==cur.set||String(d.tr)!==String(cur.tr));
  if(!cur)return show({wide:true,cls:'gearDrop'+(luck?' trialPanel':''),col:RAR[d.r][1],kick:(second?second:luck&&!boss&&(L.floorKind==='survive'||L.floorKind==='guard')?L.name+' is passed. The floor gives up':L.spec.name+' dropped')+' '+an(d.rarity)+' relic',title:d.name,body:itemLine(d)+'.'+marks+' A relic is a fourth thing to carry, and you carry none.',keys:rk,cards:[
    {title:'Wear it',sub:d.name,col:RAR[d.r][1],data:{gear:'wear'},body:'You get: '+itemLine(d)+(itemMarks(d)?'. Marks: '+itemMarks(d).slice(3)+'.':'.'),fn:go(()=>{S.eq[d.slot]=d})},
    {title:'Destroy',sub:'Scrap',data:{gear:'scrap'},body:'Break it. Each item you scrap gives +1% damage for the rest of the run'+(S.scrap?' (so far +'+S.scrap+'%).':'.'),fn:go(()=>{S.scrap++})}]});
  show({wide:true,cls:luck?'trialPanel':'',col:RAR[d.r][1],kick:second?second+': '+an(d.rarity)+' '+d.slot:luck&&!boss&&(L.floorKind==='survive'||L.floorKind==='guard')?L.name+' is passed. The floor gives up '+an(d.rarity)+' '+d.slot:L.spec.name+' dropped '+an(d.rarity)+' '+d.slot,title:d.name,body:itemLine(d)+'.'+marks+' You carry '+itemName(cur)+' ('+cur.rarity+itemMarks(cur)+'): '+itemLine(cur)+'.',keys:rk,cards:[
    {title:'Upgrade',sub:itemName(cur)+' to +'+after.lvl,col:RAR[cur.r][1],body:'Melt the drop into what you carry. A '+d.rarity+' drop adds '+Math.round(RAR[d.r][3]*100)+'% of its base stats. It becomes: '+itemLine(after)+'.'+(d.set||d.tr||cur.set||cur.tr?' What you carry keeps its own marks; the drop\'s are lost.':''),data:{gear:'upgrade'},fn:go(()=>{S.eq[d.slot]=after})},
    {title:'Replace',sub:d.name,col:RAR[d.r][1],body:'Wear the drop instead. '+itemName(cur)+' is gone for good. You get: '+itemLine(d)+(itemMarks(d)?'. Marks: '+itemMarks(d).slice(3)+'.':'.'),data:{gear:'replace'},fn:go(()=>{S.eq[d.slot]=d})},
    ...(takes?[{title:'Take its mark',sub:itemMarks(d).slice(3),col:d.set?SETS[d.set].col:RAR[d.r][1],data:{gear:'mark'},body:'Keep '+itemName(cur)+' and its numbers, and move the drop\'s marks onto it'+(cur.set||cur.tr?' in place of its own ('+itemMarks(cur).slice(3)+')':'')+'. The drop is used up; nothing is added to the numbers.',fn:go(()=>{S.eq[d.slot]={...cur,set:d.set,tr:d.tr}})}]:[]),
    {title:'Destroy',sub:'Scrap',data:{gear:'scrap'},body:'Break it. Each item you scrap gives +1% damage for the rest of the run'+(S.scrap?' (so far +'+S.scrap+'%).':'.'),fn:go(()=>{S.scrap++})}]});
}
// (round 15) what MB.gear hands out: {slots:[{slot, empty, name, rarity, r, col, line, set (id or ''), setName, trait:{id, name, skill, skillName, text}|null}], sets:[{id, name, col, n, two, four, on2, on4}]}
function gearInfo(){
  if(!S.cls||!S.eq)return null;
  return{slots:ESLOTS.map(sl=>{const it=S.eq[sl];if(!it)return{slot:sl,empty:true,name:'',rarity:'',r:-1,col:'',line:'',set:'',setName:'',trait:null};
      return{slot:sl,empty:false,name:itemName(it),rarity:it.rarity,r:it.r,col:RAR[it.r][1],line:itemLine(it),set:it.set?SETS[it.set].id:'',setName:it.set?SETS[it.set].name:'',trait:it.tr?{id:TRAITS[it.tr[0]].id,name:TRAITS[it.tr[0]].name,skill:it.tr[1],skillName:SKILLS[S.cls][it.tr[1]][1],text:trText(it,S.cls)}:null}}),
    sets:SETS.slice(1).map((s,i)=>({id:s.id,name:s.name,col:s.col,n:SETN[i+1],two:s.two,four:s.four,on2:setN(i+1)>=2,on4:setN(i+1)>=4}))};
}
function gearScreen(back){
  const G=gearInfo();if(!G)return back&&back();const worn=G.sets.filter(s=>s.n>0);
  show({wide:true,cls:'gearPanel',kick:'Equipment',title:'What you carry',body:'Four things: a weapon, armour, a trinket and a relic. A drop may bear the mark of a set: two pieces of one set give its first bonus, four its second. A rare few carry a trait that changes one of your skills. Marks stay on what you carry when you melt a drop into it.',
    cards:[...G.slots.map(s=>s.empty?{title:'No '+s.slot,sub:cap1(s.slot),cls:'gearCard shut',data:{slot:s.slot},body:'Nothing yet. Relics only come as drops.',fn:()=>{}}
        :{title:s.name,sub:cap1(s.rarity)+' '+s.slot+(s.setName?' · '+s.setName:''),col:s.col,cls:'gearCard'+(s.set?' set-'+s.set:''),data:{slot:s.slot,set:s.set,trait:s.trait?s.trait.id:''},body:s.line+'.'+(s.trait?' '+s.trait.name+' '+s.trait.skillName+': '+s.trait.text:''),fn:()=>{}}),
      ...G.sets.filter(s=>s.n>0).map(s=>({title:s.name,sub:s.n+' of 4 worn',col:s.col,cls:'setCard'+(s.on2?' on2':'')+(s.on4?' on4':''),data:{setcard:s.id,n:s.n},body:'Two'+(s.on2?' (yours)':'')+': '+s.two+' Four'+(s.on4?' (yours)':'')+': '+s.four,fn:()=>{}}))],
    keys:worn.length?'':'No set marks yet. They come on rare, epic and legendary drops.',btns:[['Back',back||API.hide]]});
}
/* ---------- round 14: the lesson. A quiet floor with one monster that waits: the fighting, taught a step at a time. Offered once after the class is chosen, and from the title ---------- */
// TU: null, or {i, list (the step ids of this hero), t (seconds in the step), wait (> 0: the step is done, the next comes when it runs out), n (a count the step keeps), from 'class'|'title', back (the stored run to put back)}.
// Nothing here is kept: no save, no record, no drop. The hero cannot die on this floor.
const TUT={hp:3000,brk:14,gap:2.6,zoneR:105,warn:1.1,
  steps:{
    string:{title:'The string',keys:'Hold Space, or the mouse button, and keep striking. Your blows run in a string, and the last of them, the closer, is the heavy one. Land a closer.',touch:'Hold Strike and keep striking. Your blows run in a string, and the last of them, the closer, is the heavy one. Land a closer.'},
    dodge:{title:'The hairbreadth dodge',keys:'A ring on the floor is a blow about to land. Dash (Shift) in the last instant, as the ring closes, and the world holds its breath for you.',touch:'A ring on the floor is a blow about to land. Tap Dash in the last instant, as the ring closes, and the world holds its breath for you.'},
    riposte:{title:'The riposte',keys:'After a hairbreadth dodge your next blow is a riposte: far heavier. Dodge at the last instant again, then strike at once.',touch:'After a hairbreadth dodge your next blow is a riposte: far heavier. Dodge at the last instant again, then strike at once.'},
    footing:{title:'Footing',keys:'The thin gauge under its name is its footing. Closers and skills wear it down, a riposte most of all. Empty it and the monster reels: it cannot act and takes more from every blow. Only the monster of every tenth floor has one.',touch:'The thin gauge under its name is its footing. Closers and skills wear it down, a riposte most of all. Empty it and the monster reels: it cannot act and takes more from every blow. Only the monster of every tenth floor has one.'},
    link:{title:'Setup and payoff',keys:'',touch:''},
    mana:{title:'Mana',keys:'Skills are paid with mana, the blue bar under your health. It seeps back by itself, and twice as fast while you stand still. Stand still and draw it in.',touch:'Skills are paid with mana, the blue bar under your health. It seeps back by itself, and twice as fast while you stand still. Stand still and draw it in.'},
    orders:{title:'Orders',keys:'Those who fight for you take orders. G: attack my target. H: hold here. B: fall back to me. N: free again. Give an order.',touch:'Those who fight for you take orders: the four order buttons below your health bar. Attack my target, hold here, fall back to me, or free again. Give an order.'},
    rite:{title:'The last rite',keys:'It is nearly finished. When the monster of a tenth floor is this low you can end it with the last rite: press X.',touch:'It is nearly finished. When the monster of a tenth floor is this low you can end it with the last rite: tap Last rite.'}}};
let TU=null;
const tutSeen=()=>{try{return localStorage.getItem('marrowborn.tut')==='1'}catch(e){return true}};
const tutDef=()=>({title:'The Quiet Floor',hint:'A lesson. Nothing here can kill you.',kind:'fist',spec:{...SPEC.fist,ai:'dummy',crown:0,name:'The Patient Stone',hp:TUT.hp,col:'#8f8474',r:34},name:'The Patient Stone',hue:28,waves:0,mods:[],room:0,floorKind:'lesson',band:0,bandName:'The Ash Road',handicap:null,door:null});
// the skill of this hero that pays a tag off, and the tag: the first of its two first skills that is a payoff
function tutLink(){const c=S.cls;for(const si of[0,1,2,3]){if(si>=known())break;const d=skBase(c,si);for(const op of d[4]){const k=lkOf(op);if(k)return{si,name:d[1],kind:k,pay:LINK.pay[k]}}}return null}
function tutSteps(){const l=['string','dodge','riposte','footing'];if(tutLink())l.push('link');l.push('mana');if(S.cls==='necro'||S.adv==='beastmaster')l.push('orders');l.push('rite');return l}
// MB.tutorial -> null, or {on, index, of, id, title, text, done (the step is done and the next is coming), from}
function tutInfo(){if(!TU)return null;const id=TU.list[TU.i],K=TUT.steps[id],touch=matchMedia('(pointer:coarse)').matches;let text=touch?K.touch:K.keys;
  if(id==='link'){const L=tutLink(),slot=S.load.indexOf(L.si);text='A skill can leave a monster open to another: aloft, brittle or branded, shown as a mark over it. This one has been left '+L.pay.tag+'. '+L.name+(touch?'':' (key '+(slot+1)+')')+' is the blow that pays that off: use it now. Later skills, and alterations, leave such marks themselves.'}
  return{on:true,index:TU.i,of:TU.list.length,id,title:K.title,text,done:TU.wait>0,from:TU.from}}
function tutStart(from,cls){
  if(MP.on||VS||TU)return false;
  if(from==='title'){let run=null;try{run=JSON.parse(localStorage.getItem('marrowborn.run')||'null')}catch(e){}const back={run,level:storedLevel()};
    if(!(cls&&own(CLASSES,cls))){if(!S.cls)return false;cls=S.cls}newRun();S.cls=cls;S.eq=basicSet(cls);S.load=load0();S.level=8;TU={back}}
  else{if(!S.cls)return false;TU={back:null}}
  try{localStorage.setItem('marrowborn.tut','1')}catch(e){}
  Object.assign(TU,{i:0,list:[],t:0,wait:0,n:0,from,zt:1.2,seen:{}});
  S.level=8;startLevel(8);TU.list=tutSteps();tutEnter();emit('tutorial',{state:'start',...tutInfo()});return true}
function tutEnter(){const id=TU.list[TU.i],b=boss;TU.t=0;TU.n=0;TU.wait=0;TU.zt=1.4;if(!b)return;
  b.brkMax=0;b.brk=0;b.fin=false;b.hp=Math.max(b.hp,b.maxHp*.6);
  if(id==='footing'){b.brkMax=b.brk=TUT.brk;b.stagT=0;b.stagMax=BRK.stag;b.brkAt=0}
  if(id==='mana'){P.mana=Math.min(P.mana,manaRoom()*.15);syncSkills()}
  if(id==='orders'&&S.cls==='necro'&&!allies.some(a=>a.kind==='thrall'))for(let i=0;i<2;i++)allies.push(ally('thrall'));
  if(id==='rite'){b.fin=true;b.hp=Math.max(1,Math.floor(b.maxHp*FIN.at)-1);b.stun=0}
  if(id==='link')P.mana=manaRoom()}
function tutOk(){if(!TU||TU.wait>0)return;TU.wait=1.5;floats.push({x:P.x,y:P.y-70,txt:'Well done',life:1.3,c:'#7fd66b',big:1.4});sfx(660,.12,'triangle',.2,990);sfx(990,.18,'triangle',.18,1320,.1);haptic([20,40,60]);emit('tutorial',{state:'ok',...tutInfo()})}
function tutEv(name,d){if(!TU||TU.wait>0)return;const id=TU.list[TU.i];
  if(id==='string'&&name==='closer')tutOk();else if(id==='dodge'&&name==='pd')tutOk();else if(id==='riposte'&&name==='riposte')tutOk();else if(id==='footing'&&name==='stagger')tutOk();
  else if(id==='link'&&name==='link')tutOk();else if(id==='orders'&&name==='order'&&d!=='free')tutOk()}
function tutStep(dt){
  const b=boss,id=TU.list[TU.i];if(!b||!P)return;
  if(P.hp<P.maxHp*.5){P.hp=P.maxHp;hud()} // nothing here can kill you
  if(id!=='rite'&&b.hp<b.maxHp*.3)b.hp=b.maxHp*.6;
  if(TU.wait>0){if((TU.wait-=dt)<=0){if(TU.i>=TU.list.length-1)return;TU.i++;if(PETS.cmd!=='free')petCommand('free',true);tutEnter();emit('tutorial',{state:'step',...tutInfo()})}return}
  TU.t+=dt;
  if(id==='dodge'||id==='riposte'){if((TU.zt-=dt)<=0&&!(S.slowT>0)){TU.zt=TUT.gap;zone(P.x,P.y,TUT.zoneR,TUT.warn)}}
  else if(id==='link'){const L=tutLink();if(!(b.tags&L.pay.bit)&&(TU.zt-=dt)<=0){TU.zt=1.2;tagPut(b,L.pay.bit);b.tgAt[L.pay.bit>>1]=S.t-1;P.cdS[L.si]=Math.min(P.cdS[L.si],.3);if(P.mana<skCost(L.si))P.mana=manaRoom()}}
  else if(id==='mana'){if(MANA.drawing)TU.n+=dt;if(TU.n>1&&P.mana>=manaRoom()*.55)tutOk()}
  else if(id==='footing'){if(b.stagT>0)tutOk()}
  else if(id==='string'){if(TU.t>25&&!TU.seen.s){TU.seen.s=1;floats.push({x:b.x,y:b.y-b.r-30,txt:'Stand close and keep striking',life:3,c:'#ffd95e'})}}
}
function tutEnd(done){
  const T0=TU;if(!T0)return;TU=null;mons=[];shots=[];pshots=[];zones=[];fields=[];allies=[];TSRC=[];boss=null;if(FN){finEv(FN.state==='play'?'end':'gone');FN=null}S.slowT=0;S.mode='reward';PETS.cmd='free';if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false');SND.pause(false)}
  emit('tutorial',{state:done?'done':'skipped',from:T0.from});if(done){chime();haptic([40,60,140])}
  const go=()=>{if(T0.from==='title'){applyRun(T0.back.run||{},T0.back.level);title(T0.back.level)}else begin(8)};
  show({soft:true,cls:'tutPanel',kick:done?'The lesson is over':'The lesson is left',title:done?'That is the fighting':'Another time',body:done?'Strings and closers, the hairbreadth dodge and its riposte, footing, setups and payoffs, mana, and the last rite. The Spire will add to it as you climb: dares, trials and marks are explained the first time you meet them. You can take the lesson again from the title screen.':'You can take the lesson at any time from the title screen.',
    btns:[[T0.from==='title'?'Back to the title':'Begin the climb',go]]});
}
// the question after the class is chosen: once on this device (and not for a player who has turned hints off)
function tutOffer(next){
  if(MP.on||VS||SET.hints===false||tutSeen())return next();try{localStorage.setItem('marrowborn.tut','1')}catch(e){}
  show({soft:true,cls:'tutPanel',kick:'Before the climb',title:'A quiet floor first?',body:'The fighting has more to it than striking: strings and closers, the hairbreadth dodge and its riposte, footing, setups and payoffs, the last rite. A short lesson on a floor where nothing can kill you teaches them one at a time. It takes about two minutes, you can leave it at any moment, and it stays on the title screen for later.',
    btns:[['Take the lesson',()=>tutStart('class')],['Climb on',next]]});
}
/*R16-ASIDE*/
/* ---------- round 16: asides. Floors that are not floors of the climb: the proof (the trial of a class's upgrade), a fissure (a short side floor with a clock and a twist), the bells (the day's floor and the week's three) ---------- */
// XF: null, or the aside being fought: {kind:'proof'|'fissure'|'bell', label, title, rule, tw (a twist id or null), t, dur, hold (the clock fills towards success), goal, n (progress), unit, state:'run'|'done'|'fail', i, of, ...}.
// Like the lesson, an aside is started through startLevel with a definition of its own (floorKind 'aside'): nothing is saved while it runs, no record of the climb is touched, no floor is counted, and a fall costs nothing.
// Alone only: none of it exists in co-op or versus (in co-op the upgrade is still chosen from the menu).
// Twists (XTW): dry: mana does not come back by itself (kills still feed it); glass: every blow weighs glassK, yours and theirs; swift: monsters a fifth faster; dark: the returning dark; tide: the clock is tideT of its length and every kill gives tideK seconds back.
const XTW={ids:['dry','glass','swift','dark','tide'],names:{dry:'Dry Air',glass:'Thin Skin',swift:'Quick Blood',dark:'Lightless',tide:'The Ebbing Clock'},
  text:{dry:'Your mana does not come back by itself here. Only kills feed it.',glass:'Every blow weighs half again here: yours, and theirs.',swift:'Everything that hunts you here moves and strikes a fifth faster.',dark:'The dark is back: you see only what is near you.',tide:'The clock is short, and every kill gives some of it back.'},
  glassK:1.5,tideT:.5,tideK:4};
let XF=null;
const xtw=k=>!!XF&&XF.tw===k;
const xhash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return h||1};
const xrng=seed=>{let s=seed>>>0||1;const f=()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};for(let i=0;i<4;i++)f();return f};
const xmods=(mod,kind)=>{let x=mod;if(x==='splitting'&&['witch','mother','beamer','summoner'].includes(kind))x='shielded';if(x==='shielded'&&kind==='summoner')x='swift';return x?[x]:[]};
// what is kept of asides on this device, apart from any run: fissures closed, proofs passed, the bells (the best of the day and of the week, days and weeks rung, the run of days in a row, the best ever)
const ASD={fis:0,proofs:0,day:null,week:null,days:0,weeks:0,run:0,last:'',top:null};
function asdLoad(){try{const o=JSON.parse(localStorage.getItem('marrowborn.asides')||'null');if(!o||typeof o!=='object')return;const int=v=>Math.max(0,Math.min(1e9,Math.floor(+v)||0));
  const best=b=>b&&typeof b==='object'&&typeof b.key==='string'&&b.key.length<12&&GRD.marks.some(m=>m[0]===b.mark)?{key:b.key,score:Math.min(100,int(b.score)),mark:b.mark,time:Math.min(99999,Math.max(0,+b.time||0)),cls:own(CLASSES,b.cls)?b.cls:null,adv:typeof b.adv==='string'&&b.adv.length<16?b.adv:null,n:int(b.n)}:null;
  ASD.fis=int(o.fis);ASD.proofs=int(o.proofs);ASD.day=best(o.day);ASD.week=best(o.week);ASD.days=int(o.days);ASD.weeks=int(o.weeks);ASD.run=int(o.run);ASD.last=typeof o.last==='string'&&o.last.length<12?o.last:'';ASD.top=best(o.top)}catch(e){}}
const asdSave=()=>pref('asides',JSON.stringify(ASD));

/* ---- the proof: after floor 50 the upgrade of a class is not picked from a menu but earned on a short floor, alone, with the upgrade already in hand. It may be tried again, or the other one tried, or left for later ---- */
// how: stone (bring the Assayer down), chain (a chain of n blows; a wound breaks it), casts (n skills, or skill `sk` n times), blocks (n blows turned by the shield), outlast (stand for t seconds; with lethal every blow is a killing one),
// kills (n monsters in a formation: file, knot, horde). t: the clock. hp: the Assayer's health in ordinary monsters of the floor (stone). ai: what the Assayer fights as. mites: a few mites come this often (so that there are blows to block or to outlast).
const PRF={keepHp:6,
  champion:{title:'The Weight',how:'stone',rule:'Raw power. Bring the Assayer down before the clock runs out.',hp:1.5,t:45},
  duelist:{title:'The Unbroken Line',how:'chain',n:40,rule:'Footwork. Land a chain of {n} blows on the Assayer. A wound breaks the chain.',t:50},
  nightblade:{title:'The Deep Cut',how:'stone',rule:'Sharper. Cut the Assayer down before the clock runs out.',hp:1.5,t:45},
  phantom:{title:'No Shadow',how:'casts',sk:0,n:7,rule:'Unseen. Shadowstep {n} times before the clock runs out.',t:40},
  saint:{title:'The Second Breath',how:'outlast',lethal:1,ai:'witch',mites:5,rule:'Second life. Every blow on this floor is a killing one, and the first leaves you standing. Outlast it for {t} seconds.',t:30},
  inquisitor:{title:'The Long Verdict',how:'kills',form:'file',n:8,rule:'Judgement. Your orbs pass through everything: fell the whole file, {n} of them.',t:40},
  paladin:{title:'The Wall Answers',how:'blocks',n:6,ai:'hound',mites:3.5,rule:'Holy shield. Turn {n} blows aside with your shield before the clock runs out.',t:55},
  berserker:{title:'Nothing Held',how:'stone',rule:'No shield. Bring the Assayer down before the clock runs out.',hp:1.9,t:45},
  archmage:{title:'The Full Book',how:'casts',n:12,rule:'Mastery. Cast {n} skills before the clock runs out.',t:45},
  pyromancer:{title:'The Kindling',how:'kills',form:'knot',n:12,rule:'Fire. They stand close together: burn all {n} before the clock runs out.',t:40},
  sharpshooter:{title:'One Arrow',how:'kills',form:'file',n:8,rule:'Precision. Your arrows pass through everything: fell the whole file, {n} of them.',t:40},
  beastmaster:{title:'The Pack of Two',how:'kills',form:'horde',n:10,rule:'A wolf. Hunt the pack down together, all {n} of them.',t:45},
  lich:{title:'The Standing Dead',how:'kills',form:'horde',n:14,rule:'Undeath. Your dead no longer crumble: bring the horde down with them, all {n}.',t:50},
  reaper:{title:'The Harvest Row',how:'kills',form:'file',n:8,rule:'Harvest. Your spears pass through everything: fell the whole file, {n} of them.',t:40}};
const prfRule=K=>K.rule.replace('{n}',K.n).replace('{t}',K.t);
const advRow=id=>{for(const c in CLASSES){const a=CLASSES[c].adv.find(x=>x[0]===id);if(a)return a}return null};
function proofDef(n){
  const K=PRF[XF.adv],bi=bandOf(n+1),B=bandAt(bi),ai=K.ai||'fist',base=SPEC[ai],hp=Math.round(GENHP[ai]*genMul(n)*(K.how==='stone'?K.hp:PRF.keepHp));
  return{title:'The Proving Floor',hint:K.title+'. '+prfRule(K),kind:ai,spec:{...base,ai,crown:0,name:'The Assayer',hp,col:'#b8a37a',r:base.r+4},name:K.how==='kills'?K.title:'The Assayer',hue:B.hue,waves:0,mods:[],room:0,floorKind:'aside',band:bi,bandName:B.name,handicap:null,door:null,noBoss:K.how==='kills'};
}
// the screen after floor 50 (and after every later floor while no upgrade is held): both upgrades, each with its proof
function proofChoice(n){
  const c=CLASSES[S.cls];S.mode='reward';
  show({wide:true,cls:'proofPanel',kick:'Fifty floors. Your class has more to give, and it wants proof.',title:'Choose your path',body:'An upgrade is earned on the Proving Floor: a short floor, alone, with the upgrade already in your hands. Pass and it is yours for the rest of the climb. Fail and nothing is lost: try again, try the other, or leave it for after a later floor.',
    cards:c.adv.map(([id,name,sub,text])=>({title:name,sub:sub+' · proof: '+PRF[id].title,body:text+' The proof: '+prfRule(PRF[id]).replace(/^[^.]*\. /,''),data:{proof:id},fn:()=>proofGo(id,n)})),btns:[['Not now',()=>rewardEnd(n)]]});
}
function proofGo(id,n){
  if(MP.on||VS||TU||XF||!S.cls||!CLASSES[S.cls].adv.some(a=>a[0]===id)||S.adv)return false;
  const K=PRF[id];XF={kind:'proof',label:'Proof',id,adv:id,n0:n,title:K.title,rule:prfRule(K),tw:null,t:0,dur:K.t,hold:K.how==='outlast',goal:K.how==='stone'||K.how==='outlast'?0:K.n,n:0,unit:K.how==='kills'?'Felled':K.how==='chain'?'Chain':K.how==='blocks'?'Turned':K.how==='casts'?'Cast':'',state:'run',i:0,of:1,keep:K.how!=='stone'&&K.how!=='kills',lethal:!!K.lethal,mT:2,cd0:null};
  S.adv=id;startLevel(S.level);return true;
}
function proofBegin(){
  const X=XF,K=PRF[X.adv],n=S.level,hpL=k=>GENHP[k]*genMul(n)*.085;X.cd0=P.cdS.slice();
  if(K.how!=='kills')return;
  if(K.form==='file')for(let i=0;i<K.n;i++){const m=lesser('crawler',W/2,96+i*30,hpL('crawler'));m.t=1.2+i*.05}
  else if(K.form==='knot'){for(let i=0;i<4;i++){const m=lesser(['crawler','fist'][i%2],W/2+(i%2?34:-34),150+(i>1?46:0),hpL('crawler')*.8);m.t=1.4}for(let i=0;i<K.n-4;i++){const a=i/(K.n-4)*TAU,m=spawn('mite',W/2+Math.cos(a)*58,172+Math.sin(a)*46);m.t=1.4}}
  else{const big=5;for(let i=0;i<big;i++){const m=lesser(LESSER[i%LESSER.length],W/2+(i-(big-1)/2)*150,130+(i%2)*40,hpL(LESSER[i%LESSER.length]));m.t=1.2}for(let i=0;i<K.n-big;i++){const m=spawn('mite',W/2+(i-(K.n-big-1)/2)*64,215);m.t=1.2}}
  X.goal=mons.length;
}
function proofOver(win,why){
  const X=XF,id=X.adv,n=X.n0,row=advRow(id),K=PRF[id];xfDrop();S.mode='reward';allies=[];TSRC=[];
  if(win){S.adv=id;if(id==='beastmaster')petFit();ASD.proofs++;asdSave();chime();haptic([40,60,40,60,140]);emit('aside',{kind:'proof',state:'done',id,time:Math.round(X.time*10)/10});
    return show({soft:true,cls:'proofPanel',kick:K.title+' · the proof is passed',title:row[1],body:row[3]+' It is yours for the rest of the climb.',btns:[['Go on',()=>rewardEnd(n)]]})}
  S.adv=null;emit('aside',{kind:'proof',state:'fail',id,why});
  show({cls:'proofPanel',kick:K.title+' · the proof is not passed',title:why,body:prfRule(K)+' Nothing is taken from you. The Proving Floor waits as it was.',btns:[['Try it again',()=>proofGo(id,n)],['Choose again',()=>proofChoice(n)],['Not now',()=>rewardEnd(n)]]});
}

/* ---- fissures: a crack in the wall of the Spire opens off one floor in every ten. Behind it: two packs and a keeper, a clock and a twist. It is never on the way up; what it gives is a drop that is rare or better and bears a mark ---- */
// at: the floor of each ten it opens off, in turn. t: the clock. keep: how many stay open at once (the oldest closes). stale: one that lies this many floors below closes. hp: the keeper's health against the monster of a two-pack floor.
// min, more: the drop is at least this rare, with this many more rolls. S.fis = {done, open:[floors, 1-based]} is part of the run (save field fz).
const FIS={from:13,at:[4,7,3,6,8],t:75,keep:3,stale:25,hp:.9,min:1,more:2,names:['The Split Stair','The Cold Seam','The Narrow Dark','The Weeping Crack','The Unlit Gap','The Low Door','The Sunk Landing','The Blind Turn']};
const fisAt=N=>N>=FIS.from&&N%10===FIS.at[Math.floor((N-1)/10)%FIS.at.length];
const fisNew=()=>({done:0,open:[]});
const fisIn=a=>{const f=fisNew();if(Array.isArray(a)&&a.length<=1+FIS.keep&&a.every(v=>Number.isInteger(v)&&v>=0&&v<=99999)){f.done=a[0]|0;for(const N of a.slice(1))if(fisAt(N)&&!f.open.includes(N))f.open.push(N)}return f};
function fisPlan(N){const r=xrng(xhash('fissure|'+N)),name=FIS.names[Math.floor(r()*FIS.names.length)],tw=XTW.ids[Math.floor(r()*XTW.ids.length)],kind=POOL[Math.floor(r()*POOL.length)],mod=MODS[Math.floor(r()*MODS.length)],room=Math.floor(r()*ROOMS.length),elK=Math.floor(r()*ELITE.kinds.length),land=r()<.5;
  return{N,name,tw,kind,mod,room,elK,land}}
function fisDef(n){
  const pl=XF.plan,bi=bandOf(n+1),B=bandAt(bi),base=SPEC[pl.kind],mods=n>=14?xmods(pl.mod,pl.kind):[];let hp=GENHP[pl.kind]*genMul(n)*.68*FIS.hp*(n>=100?APEXORD:1);for(const k of mods)hp*=MODHP[k]||1;
  const name='Keeper of '+pl.name.replace(/^The /,'the ');
  return{title:pl.name,hint:XTW.names[pl.tw]+'. '+XTW.text[pl.tw],kind:pl.kind,spec:{...base,ai:pl.kind,crown:0,name,hp:Math.round(hp),col:'#6b86b8',r:base.r+2},name,hue:B.hue,waves:2,mods,room:pl.room,floorKind:'aside',band:bi,bandName:B.name,handicap:null,door:null};
}
const fisCan=()=>!MP.on&&!VS&&!TU&&!XF&&!!S.cls&&!!S.fis&&(S.mode==='title'?titleSaved>=12:S.mode==='reward'||S.mode==='play'||S.mode==='clear');
const fisRow=N=>{const pl=fisPlan(N);return{floor:N,name:pl.name,twist:{id:pl.tw,name:XTW.names[pl.tw],text:XTW.text[pl.tw]},time:pl.tw==='tide'?Math.round(FIS.t*XTW.tideT):FIS.t}};
const fisInfo=()=>({done:S.fis?S.fis.done:0,total:ASD.fis,open:S.cls&&S.fis&&!MP.on?S.fis.open.map(fisRow):[],can:fisCan()});
// floor N (1-based) is cleared: the one of its ten opens, old ones close
function fisTurn(N){if(MP.on||!S.cls||!S.fis)return false;S.fis.open=S.fis.open.filter(v=>N-v<=FIS.stale);if(!fisAt(N)||S.fis.open.includes(N))return false;S.fis.open.push(N);while(S.fis.open.length>FIS.keep)S.fis.open.shift();emit('aside',{kind:'fissure',state:'open',floor:N});return true}
// the offer on the reward screens of the floor it opens off
function fisOffer(N,next){
  const r=fisRow(N);show({soft:true,cls:'fisPanel',kick:'A fissure · off floor '+N,title:r.name,body:'The wall of the Spire has split beside the stair. Behind it: two packs and a keeper, '+r.time+' seconds on the clock, and a twist. '+r.twist.name+': '+r.twist.text+' Close it in time and it gives up a drop that is rare or better and bears the mark of a set. Fail, and nothing is lost. It is not on the way up.',
    keys:'It stays open for a while: The climb, on the pause screen and the title screen, lists the fissures that are open.',btns:[['Step in',()=>fisGo(N,'reward',next)],['Climb on',next]]});
}
function fisEnter(N,back){
  N=Math.floor(+N);if(!fisCan()||!S.fis.open.includes(N))return false;
  if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false');SND.pause(false)}
  return fisGo(N,S.mode==='title'?'title':S.mode==='reward'?'reward':'floor',typeof back==='function'?back:null);
}
function fisGo(N,from,back){
  const pl=fisPlan(N),lv=from==='title'?titleSaved:S.level,dur=pl.tw==='tide'?Math.round(FIS.t*XTW.tideT):FIS.t;
  XF={kind:'fissure',label:'Fissure',id:N,N,from,lv,back,plan:pl,tw:pl.tw,title:pl.name,rule:'Two packs and their keeper, in '+dur+' seconds. '+XTW.names[pl.tw]+': '+XTW.text[pl.tw],t:0,dur,full:dur,hold:false,goal:0,n:0,unit:'',state:'run',i:0,of:1,elN:lv>=14?1:0,elK:pl.elK,area:pl.land&&lv>=13?themeOf(bandOf(lv+1)):null};
  S.level=lv;startLevel(lv);return true;
}
function fisDrop(X){
  const n=X.lv,r=xrng(xhash(['fisdrop',X.N,S.cls,S.adv,S.scrap,...SLOTS.map(sl=>S.eq[sl].r+':'+S.eq[sl].lvl)].join('|')));let d=dropItem(n,{min:FIS.min,more:FIS.more,rnd:r,marks:true});
  if(!d.set)d=item(S.cls,d.slot,d.r,0,0,d.m?1:0,1+Math.floor(r()*(SETS.length-1)),d.tr||null);return d;
}
function fisBack(X){if(X.from==='title'){save(X.lv);return title(X.lv)}if(X.from==='reward'&&X.back)return X.back();begin(X.lv)}
function fisOver(win,why){
  const X=XF;xfDrop();S.mode='reward';allies=[];TSRC=[];S.level=X.lv;
  if(win){S.fis.open=S.fis.open.filter(v=>v!==X.N);S.fis.done++;ASD.fis++;asdSave();chime();haptic([40,60,40,60,140]);emit('aside',{kind:'fissure',state:'done',floor:X.N,time:Math.round(X.time*10)/10,twist:X.tw});
    if(!S.eq)S.eq=basicSet(S.cls);return dropScreen(X.lv,X.title+' is closed, in '+(Math.round(X.time*10)/10)+' s of '+X.full+'.',()=>fisBack(X),'The fissure gives up',fisDrop(X))}
  emit('aside',{kind:'fissure',state:'fail',floor:X.N,why});
  show({cls:'fisPanel',kick:X.title+' · the fissure holds',title:why,body:'Nothing is taken from you. The fissure stays open for now: step in again, or leave it. '+XTW.names[X.tw]+': '+XTW.text[X.tw],btns:[['Step in again',()=>fisGo(X.N,X.from,X.back)],['Leave it',()=>fisBack(X)]]});
}

/* ---- the bells: one floor rung for the day and three in a row for the week, the same for everyone whose calendar shows the same date (no server: everything follows from the date). Fought with a seasoned hero of that height in a class of the player's choosing; the climb is put aside and put back untouched ---- */
// t: the clock of each floor. The mark of a bell is the mark of its floor (time, harm, chain: as on the climb); for the week the three scores are averaged and the times added. The best of the day and of the week are kept (ASD).
const BELL={t:75,names:{day:'The Daybell',week:'The Weekbell'}};
const p2=v=>(v<10?'0':'')+v;
function bellKey(kind,d){
  d=d||(window.__mb&&window.__mb.bellDate?new Date(window.__mb.bellDate+'T12:00:00'):new Date());
  if(kind==='day')return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
  const t=new Date(d.getFullYear(),d.getMonth(),d.getDate());t.setDate(t.getDate()+3-(t.getDay()+6)%7);const y=t.getFullYear(),w1=new Date(y,0,4);return y+'-W'+p2(1+Math.round(((t-w1)/864e5-3+(w1.getDay()+6)%7)/7)); // the ISO week of the local date
}
function bellPlan(kind,key){
  key=key||bellKey(kind);const r=xrng(xhash('bell|'+kind+'|'+key)),dec=1+Math.floor(r()*9),N0=dec*10+1,of=kind==='week'?3:1,floors=[];
  for(let i=0;i<of;i++){const n=dec*10+1+Math.floor(r()*8),k=POOL[Math.floor(r()*POOL.length)],mod=MODS[Math.floor(r()*MODS.length)],waves=kind==='week'&&i===2?2:r()<.5?1:0,room=Math.floor(r()*ROOMS.length),elK=Math.floor(r()*ELITE.kinds.length),land=r()<.5;
    floors.push({n,kind:k,mod,waves,room,elK,land,name:(n>=14&&xmods(mod,k)[0]?cap1(xmods(mod,k)[0])+' ':'')+PRE[n%10]+' '+SPEC[k].name.replace('The ','')})}
  return{kind,key,N0,of,tw:XTW.ids[Math.floor(r()*XTW.ids.length)],floors,seed:xhash('bellfight|'+kind+'|'+key)};
}
function bellDef(n){
  const X=XF,f=X.plan.floors[X.i],bi=bandOf(n+1),B=bandAt(bi),base=SPEC[f.kind],mods=n>=14?xmods(f.mod,f.kind):[];let hp=GENHP[f.kind]*genMul(n)*[1,.8,.68][f.waves];for(const k of mods)hp*=MODHP[k]||1;
  return{title:BELL.names[X.which],hint:XTW.names[X.tw]+'. '+XTW.text[X.tw],kind:f.kind,spec:{...base,ai:f.kind,crown:0,name:f.name,hp:Math.round(hp),col:TINT[(n*3)%10],r:base.r+2},name:f.name,hue:B.hue,waves:f.waves,mods,room:f.room,floorKind:'aside',band:bi,bandName:B.name,handicap:null,door:null};
}
const bellBest=kind=>{const b=kind==='day'?ASD.day:ASD.week;return b&&b.key===bellKey(kind)?b:null};
const bellLine=b=>b?'Mark '+b.mark+' · '+b.score+' of 100 · '+(Math.round(b.time*10)/10)+' s'+(b.cls?' · '+((b.adv&&advRow(b.adv)||[0,CLASSES[b.cls].name])[1]):''):'';
function bellRow(kind){const pl=bellPlan(kind),b=bellBest(kind);return{kind,name:BELL.names[kind],key:pl.key,floor:pl.floors[0].n+1,hero:pl.N0,floors:pl.floors.map(f=>({floor:f.n+1,name:f.name,waves:f.waves})),twist:{id:pl.tw,name:XTW.names[pl.tw],text:XTW.text[pl.tw]},time:pl.tw==='tide'?Math.round(BELL.t*XTW.tideT):BELL.t,best:b?{...b}:null,line:bellLine(b)}}
const bellInfo=()=>({day:bellRow('day'),week:bellRow('week'),days:ASD.days,weeks:ASD.weeks,streak:ASD.run,top:ASD.top?{...ASD.top}:null,can:!MP.on&&!VS&&!TU&&!XF&&S.mode==='title'});
function bellScreen(){
  if(MP.on||VS||TU||XF)return false;
  const card=kind=>{const r=bellRow(kind);return{title:r.name,sub:r.key+(kind==='week'?' · three floors, from floor '+r.floor:' · floor '+r.floor),cls:'bellCard',data:{bell:kind},body:r.floors.map(f=>f.name).join(', then ')+'. '+r.twist.name+': '+r.twist.text+' '+(r.best?'Your best: '+r.line+'.':'Not rung yet.'),fn:()=>bellPick(kind)}};
  show({wide:true,cls:'bellPanel',kick:'The bells · your climb is not touched',title:'Ring a bell',body:'The bell of the day rings one floor, the bell of the week three in a row: the same monsters and the same twist for everyone on the same date. You fight with a seasoned hero of that height, in the class you choose. Nothing of your climb is used or changed, and your best mark is kept in the records.',
    keys:ASD.days||ASD.weeks?'Days rung: '+ASD.days+(ASD.run>1?' · '+ASD.run+' in a row':'')+' · weeks rung: '+ASD.weeks+(ASD.top?' · best ever: '+ASD.top.mark+' '+ASD.top.score+' ('+ASD.top.key+')':''):'',cards:[card('day'),card('week')],btns:[['Back',titleShow]]});
  return true;
}
function bellPick(kind){
  const pl=bellPlan(kind),go=(c,a)=>bellGo(kind,c,a,null);
  show({wide:true,cls:'bellPanel',kick:BELL.names[kind]+' · '+pl.key+' · a seasoned hero of floor '+pl.N0,title:'Ring it as which class?',cards:Object.entries(CLASSES).map(([id,c])=>({title:c.name,sub:c.gear,body:c.text,data:{cls:id},fn:()=>pl.N0>50?show({wide:true,cls:'bellPanel',kick:BELL.names[kind]+' · '+c.name,title:'Choose your path',cards:c.adv.map(([aid,name,sub,text])=>({title:name,sub,body:text,data:{adv:aid},fn:()=>go(id,aid)})),btns:[['Back',()=>bellPick(kind)]]}):go(id,null)})),btns:[['Back',bellScreen]]});
}
function bellGo(kind,c,a,back){
  if(MP.on||VS||TU||XF||!own(CLASSES,c))return false;
  const pl=bellPlan(kind);
  if(!back){let run=null;try{run=JSON.parse(localStorage.getItem('marrowborn.run')||'null')}catch(e){}back={run,level:S.mode==='title'?titleSaved:storedLevel()}}
  const r=seasonedRun(pl.N0,{cls:c,adv:a});newRun();applyRun(r,pl.N0-1);
  {const R=PETS.roster;PETS.active=[];if(R.length){if(resvForm()){const M=manaMax()*(form()==='pet'?.5:1),ord=R.map((e,i)=>i).sort((x,y)=>petRank(R[y])-petRank(R[x]));let sum=0;for(const i of ord){const cst=petCost(R[i]);if(sum+cst<=M){PETS.active.push(i);sum+=cst}}}else PETS.active=[0]}}
  const dur=pl.tw==='tide'?Math.round(BELL.t*XTW.tideT):BELL.t;
  XF={kind:'bell',label:BELL.names[kind],id:pl.key,which:kind,plan:pl,back,cls:c,adv:S.adv,tw:pl.tw,title:BELL.names[kind]+' · '+pl.key,rule:(pl.of>1?'Three floors in a row, each in '+dur+' seconds. ':'One floor, in '+dur+' seconds. ')+XTW.names[pl.tw]+': '+XTW.text[pl.tw],t:0,dur,full:dur,hold:false,goal:0,n:0,unit:'',state:'run',i:0,of:pl.of,scores:[],times:[],taken:0,chain:0};
  bellFloor();return true;
}
function bellFloor(){const X=XF,f=X.plan.floors[X.i];X.t=0;X.dur=X.full;X.state='run';X.elN=f.n>=14?1:0;X.elK=f.elK;X.area=f.land&&f.n>=13?themeOf(bandOf(f.n+1)):null;RND=xrng(X.plan.seed+X.i*7919);S.level=f.n;startLevel(f.n)}
function bellBack(X){applyRun(X.back.run||{},X.back.level);title(X.back.level)}
function bellOver(win,why){
  const X=XF,kind=X.which,again=()=>{applyRun(X.back.run||{},X.back.level);bellGo(kind,X.cls,X.adv,X.back)};
  if(win){const g=X.gr||{score:0,time:X.time,taken:0,combo:0};X.scores.push(g.score);X.times.push(X.time);X.taken+=g.taken||0;X.chain=Math.max(X.chain,g.combo||0);
    if(X.i<X.of-1){X.i++;S.mode='reward';return bellFloor()}}
  xfDrop();S.mode='reward';allies=[];TSRC=[];
  if(!win){emit('aside',{kind:'bell',state:'fail',which:kind,key:X.id,why,floor:X.i+1,of:X.of});
    return show({cls:'bellPanel',kick:X.label+' · '+X.id+(X.of>1?' · floor '+(X.i+1)+' of '+X.of:''),title:why,body:'The bell falls silent. It can be rung again as often as you like: only your best mark is kept.',btns:[['Ring it again',again],['Back to the title',()=>bellBack(X)]]})}
  const score=Math.round(X.scores.reduce((a,v)=>a+v,0)/X.scores.length),time=Math.round(X.times.reduce((a,v)=>a+v,0)*10)/10;let mark='D';for(const[m,v]of GRD.marks)if(score>=v){mark=m;break}
  const old=bellBest(kind),res={key:X.id,score,mark,time,cls:X.cls,adv:X.adv,n:(old?old.n:0)+1},better=!old||score>old.score||score===old.score&&time<old.time;
  if(!old){if(kind==='day'){ASD.days++;const y=new Date((window.__mb&&window.__mb.bellDate?new Date(window.__mb.bellDate+'T12:00:00'):new Date()).getTime()-864e5);ASD.run=ASD.last===bellKey('day',y)?ASD.run+1:1;ASD.last=X.id}else ASD.weeks++}
  if(better){if(kind==='day')ASD.day=res;else ASD.week=res}else{(kind==='day'?ASD.day:ASD.week).n=res.n}
  if(kind==='day'&&(!ASD.top||score>ASD.top.score||score===ASD.top.score&&time<ASD.top.time))ASD.top={...res};
  asdSave();chime();haptic([40,60,40,60,140]);emit('aside',{kind:'bell',state:'done',which:kind,key:X.id,score,mark,time,best:better,cls:X.cls,adv:X.adv});
  show({soft:true,cls:'bellPanel',col:mark==='S'?'#ffe9a8':'',kick:X.label+' · '+X.id+' · rung',title:'Mark '+mark,body:score+' of 100 · '+time+' s · '+(X.taken?fmt(Math.round(X.taken*10)/10)+' damage taken':'untouched')+' · best chain '+X.chain+'. '+(better?(old?'A new best for '+(kind==='day'?'today':'this week')+'.':'Your first mark for '+(kind==='day'?'today':'this week')+'.'):'Your best stays: '+bellLine(old)+'.'),
    keys:kind==='day'&&ASD.run>1?ASD.run+' days in a row.':'',btns:[['Ring it again',again],['Back to the title',()=>bellBack(X)]]});
}

/* ---- what all asides share ---- */
const xfDef=n=>XF.kind==='proof'?proofDef(n):XF.kind==='fissure'?fisDef(n):bellDef(n);
// MB.aside -> null, or {kind, label, id, title, rule, twist:{id,name,text}|null, t, dur, left, hold, goal, progress, unit, state, step, of}
function xfInfo(){const X=XF;if(!X)return null;return{kind:X.kind,label:X.label,id:X.id,title:X.title,rule:X.rule,twist:X.tw?{id:X.tw,name:XTW.names[X.tw],text:XTW.text[X.tw]}:null,t:X.t,dur:X.dur,left:Math.max(0,X.dur-X.t),hold:!!X.hold,goal:X.goal,progress:Math.min(X.goal||1e9,X.n),unit:X.unit,state:X.state,step:X.i+1,of:X.of}}
// the floor has begun (the end of startLevel)
function xfBegin(){const X=XF;if(X.kind==='proof')proofBegin();emit('aside',{kind:X.kind,state:'start',id:X.id,title:X.title,rule:X.rule,twist:X.tw,step:X.i+1,of:X.of});
  if(!window.MBAsideBand)floats.push({x:W/2,y:H/2-110,txt:X.title,life:3.2,c:'#9fd0ff',big:1.4})}
// a blow lands on the hero: glass makes it heavier, a lethal floor makes it a killing one
const xfBlow=d=>XF.lethal?Math.max(d,P.hp):XF.tw==='glass'?Math.ceil(d*XTW.glassK):d;
function xfEv(name){const X=XF;if(!X||X.state!=='run')return;
  if(name==='kill'){if(X.kind==='proof'&&PRF[X.adv].how==='kills')X.n++;if(X.tw==='tide')X.t=Math.max(0,X.t-XTW.tideK)}
  else if(name==='block'){if(X.kind==='proof'&&PRF[X.adv].how==='blocks')X.n++}}
function xfStep(dt){
  const X=XF;if(!X||X.state!=='run'||S.banner>0)return;X.t+=dt;
  if(X.kind==='proof'){const K=PRF[X.adv],b=boss;
    if(X.keep&&b&&b.hp<b.maxHp*.45)b.hp=Math.round(b.maxHp*.8);
    if(K.how==='chain')X.n=CB.n;
    if(K.how==='casts'){for(let i=0;i<10;i++){if(P.cdS[i]>X.cd0[i]+.5&&(K.sk===undefined||K.sk===i))X.n++;X.cd0[i]=P.cdS[i]}}
    if(K.mites&&(X.mT-=dt)<=0){X.mT=K.mites;if(mons.length<9)for(let i=0;i<3;i++){const a=rand()*TAU,m=spawn('mite',P.x+Math.cos(a)*230,P.y+Math.sin(a)*230);clamp(m,m.r);m.t=.9}}
    if(X.goal&&X.n>=X.goal)return xfWin()}
  if(X.t>=X.dur)return X.hold?xfWin():xfFail('The clock ran out');
}
// the aside is won: the room is emptied, and after the beat of a cleared floor its own end comes (xfAfter)
function xfWin(){
  const X=XF;if(!X||X.state!=='run')return;X.state='done';X.time=ST.levelTime;X.gr=X.kind==='bell'?gradeMake(true):null;
  mons=[];shots=[];pshots=[];zones=[];fields=[];boss=null;S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);S.stop=.12;if(FN){finEv(FN.state==='play'?'end':'gone');FN=null}S.slowT=0;
  emit('aside',{kind:X.kind,state:'clear',id:X.id,time:Math.round(X.time*10)/10,step:X.i+1,of:X.of});
}
function xfFail(why){
  const X=XF;if(!X||X.state!=='run')return;X.state='fail';S.mode='reward';S.slowT=0;SND.dead();haptic([120,60,320]);if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false');SND.pause(false)}
  xfOver(false,why);
}
const xfOver=(win,why)=>XF.kind==='proof'?proofOver(win,why):XF.kind==='fissure'?fisOver(win,why):bellOver(win,why);
const xfAfter=()=>xfOver(true);
// the aside is over: the dice are the world's again
function xfDrop(){XF=null;RND=Math.random}
function xfPause(){const X=XF;show({kick:'Paused · '+X.label+(X.of>1?' · floor '+(X.i+1)+' of '+X.of:''),title:X.title,body:X.rule+' Nothing here is kept unless you win, and a fall costs nothing.',keys:matchMedia('(pointer:coarse)').matches?'':'Esc or P to go on.',
  btns:[['Resume',()=>pause(false)],...(typeof MB.openSettings==='function'?[['Settings',()=>hook('openSettings',pauseShow)]]:[]),['Give up',()=>{pause(false);xfFail('You turned back')}]]})}
/*R16-ASIDE-END*/
function reward2(n){
  if(n<7){const p=PARTS[n],lacks=PARTS.slice(n+1).map(x=>x.name.toLowerCase());
    return show({soft:true,kick:'You tore it free',title:p.name,body:p.text,keys:(n===0?(matchMedia('(pointer:coarse)').matches?'Tap Dash to dart the way you are moving. ':'Press Shift (or K) to dash the way you are moving. ')+'Nothing can hurt you mid-dash. ':'')+(lacks.length?'Still missing: '+lacks.join(', ')+'.':'Nothing is missing now. One thing is left to kill.'),btns:[['Climb on',()=>begin(S.level)]]})}
  const c=CLASSES[S.cls];
  if(n<11){const p=c.pows[n-8],s2=c.skills[2],touch=matchMedia('(pointer:coarse)').matches;
    return show({soft:true,kick:(n===9?'The Flayed King is dead · ':'')+'Power-up · '+c.name,title:p[0],body:p[1]+(n===8?' You also learn a third skill, '+s2.name+'. '+s2.text:''),keys:n===8?(touch?'Your skills each have their own button. It shows the seconds left while the skill recharges. Every skill costs mana, the bar under your health: it seeps back on its own, and twice as fast while you stand still.':'Skills are on keys 1 to 6 (E, Q, R, F, C and V also work). The bar under the arena shows the seconds left while each recharges, and what each costs in mana. Mana seeps back on its own, and twice as fast while you stand still.'):n===9?(touch?'Your fourth skill button is live. More skills come at floors '+SKLV.slice(4).join(', ')+'.':'Your fourth skill is on key 4 (or F). More skills come at floors '+SKLV.slice(4).join(', ')+'.'):'',btns:[['Go on',()=>rewardEnd(n)]]})}
  // (round 16) the upgrade is earned on the Proving Floor (alone); in co-op it is still chosen here. Left for later, it is offered again after the boon of every floor.
  if(n>=49&&!S.adv&&MP.on)return show({wide:true,kick:'Fifty floors. Your class has more to give.',title:'Choose your path',body:'This lasts for the rest of the climb.',
    cards:c.adv.map(([id,name,sub,text])=>({title:name,sub,body:text,fn:()=>{S.adv=id;if(id==='beastmaster')petFit();rewardEnd(n)}}))});
  if(n===49&&!S.adv)return proofChoice(n);
  const L=S.L;boonPick(n,1+(L.floorKind==='ordeal'?1:0)+(L.door==='horde'?1:0),1,()=>n>49&&!S.adv?proofChoice(n):rewardEnd(n));
}
// The boon of a floor. A trial offers four to choose from instead of three; an ordeal, and the Loud Door, give two boons, one after the other.
function boonPick(n,of,i,next){
  const c=CLASSES[S.cls],L=S.L,tri=isTrial(L.floorKind),pool=BOONS.filter(b=>S.b[b.id]<(b.id==='spec'?c.boon[2]:b.cap||99));
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
  show({wide:true,cls:tri?'trialPanel':'',kick:tenth(n)?L.spec.name+' is dead. The climb goes on.':tri?L.name+' is passed · floor '+(n+1)+' · +'+TMANA+' maximum mana':L.door?DOOR[L.door].title+' is behind you · floor '+(n+1)+(L.door==='lean'?' · +'+3*TMANA+' maximum mana':''):'Floor '+(n+1)+' cleared',
    title:of>1?(i>1?'Choose a second boon':'Choose a boon · the first of two'):'Choose a boon',keys:GR&&GR.level===n?gline():'',
    cards:pool.slice(0,tri?4:3).map(b=>{const[name,text]=b.id==='spec'?c.boon:[b.name,b.text];return{title:name,sub:S.b[b.id]?'You have '+S.b[b.id]:'New',body:text,fn:()=>{S.b[b.id]++;if(i<of)boonPick(n,of,i+1,next);else next()}}})});
}
// the end of every reward flow past the crypt: the apex choice once floor 100 is behind you, the doors of a crossroads (the host's choice in co-op), then the next floor
function rewardEnd(n,framed){
  if(!framed)return altIntro(n,()=>frameAsk(()=>rewardEnd(n,true)));
  if(n>=99&&S.cls&&!S.apex)return apexScreen(()=>rewardEnd(n,true));
  if(framed!==2&&fisTurn(n+1))return fisOffer(n+1,()=>rewardEnd(n,2)); // (round 16) a fissure opens off this floor
  if(S.L&&S.L.floorKind==='cross'&&!CL()&&!(S.door&&S.door.n===S.level))return doorScreen(()=>begin(S.level));
  begin(S.level);
}
function chooseClass(){
  S.mode='reward';S.level=8;S.fis=fisNew();S.sp=frNew();S.md=noAlts();S.altSeen=false;S.cls=null;S.adv=null;S.apex=null;S.tr=0;S.door=null;TR=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();eqSync();allies=[];if(P)P.inv=0;$('lvl').textContent='Out of the root';hud();
  show({wide:true,kick:'You are whole. You climb out of the root of the Spire as a person.',title:'Choose who you become',body:'You start with the basic equipment of your class and its first two skills. Eight more are learned as you climb, each with its own cooldown and its cost in mana, and you carry six at a time. Mana comes back on its own, faster while you stand still. Your pool grows with every floor, and skills cost a little more as you climb. After floor 50 the class can be upgraded, and after floor 100 it reaches its apex.',
    cards:[...(MP.on?mpPickCards():[]),...Object.entries(CLASSES).map(([id,c])=>({title:c.name,sub:c.gear,body:c.text+' '+c.mana+' mana. First skills: '+c.skills[0].name+', '+c.skills[1].name+'.',fn:()=>{S.cls=id;S.eq=basicSet(id);S.load=load0();emit('classpicked',{cls:id});tutOffer(()=>begin(8))}}))]});
}
function pauseShow(){
  if(XF)return xfPause();
  if(TU){const I=tutInfo();return show({kick:'Paused · the lesson · step '+(I.index+1)+' of '+I.of,title:I.title,body:I.text,btns:[['Resume',()=>pause(false)],['Skip this step',()=>{pause(false);if(TU.i>=TU.list.length-1)tutEnd(true);else{TU.wait=.01}}],['Leave the lesson',()=>tutEnd(false)]]})}
  const btns=[['Resume',()=>pause(false)]];if(learned().length>NSK||S.cls&&act2()&&altOpen(0,0))btns.push(['Skills',()=>loadout(pauseShow)]);
  if(S.cls&&act2()&&frBudget()>0)btns.push(['Frame'+(frLeft()?' ('+frLeft()+')':''),()=>frameScreen(pauseShow)]);
  if(S.cls&&act2()&&S.eq)btns.push(['Equipment',()=>gearScreen(pauseShow)]);
  if(form()&&act2())btns.push([cap1(tw().pl),()=>petsScreen(pauseShow)]);
  if(typeof MB.openTower==='function')btns.push(['The climb',()=>hook('openTower',pauseShow)]);
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',pauseShow)]);
  show({kick:'Paused · floor '+(S.level+1)+' of '+TNAME+(S.rank?' · rank '+S.rank:''),title:'Catch your breath',body:(TR?TR.title+'. '+TR.rule+' ':'')+(S.L.door?DOOR[S.L.door].title+'. '+DOOR[S.L.door].risk+' ':'')+(TR&&(TR.kind==='survive'||TR.kind==='guard')?'':S.L.spec.name+' is waiting.')+(P&&P.maxMana?' Mana '+num(MANA.cur)+' of '+num(P.maxMana-P.resv)+(P.resv?' ('+num(P.resv)+' more is held by your '+tw().pl+')':'')+'.':'')+(act2()&&S.eq?' You carry '+ESLOTS.filter(sl=>S.eq[sl]).map(sl=>itemName(S.eq[sl])+' ('+itemLine(S.eq[sl])+')').join('; ')+'.':''),keys:matchMedia('(pointer:coarse)').matches?'':'Esc or P to go on.',btns});
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
const petsClear=()=>{PETS.cmd='free';PETS.roster.length=0;PETS.active=[];PETS.down=false;PETS.fielded=[];PETS.fallen=[];PETS.auto=true};
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
  const eq=S.eq?{}:null;if(eq)for(const sl of ESLOTS){const it=S.eq[sl];if(!it)continue;eq[sl]={r:it.r,lvl:it.lvl,up:it.up};if(it.m)eq[sl].m=1;if(it.set)eq[sl].s=it.set;if(it.tr)eq[sl].t=[it.tr[0],it.tr[1]]} // s: the mark of a set, t: a trait [kind, skill] (round 15); a relic only when one is worn // m: a trinket that carries mana
  return{v:1,level:n,cls:S.cls,adv:S.adv,b:{...S.b},eq,scrap:S.scrap,load:S.load.slice(),pets:PETS.roster.map(petOut),pet:PETS.active.slice(),...(PETS.auto?{}:{rev:0}),...(S.apex?{apex:S.apex}:{}),...(S.tr?{tr:S.tr}:{}),...(S.door?{door:[S.door.id,S.door.n]}:{}),...(S.cls&&S.sp&&(!S.sp.auto||S.sp.asked)?{sp:frOut()}:{}),...(S.cls&&S.md.some(v=>v)?{md:S.md.slice()}:{}),...(S.cls&&S.altSeen?{as:1}:{}),...(S.cls&&S.fis&&(S.fis.done||S.fis.open.length)?{fz:[S.fis.done,...S.fis.open]}:{}),stats:{kills:ST.kills,deaths:ST.deaths,dmgDealt:Math.round(ST.dmgDealt),dmgTaken:ST.dmgTaken,time:Math.round(ST.time),bestLevel:ST.bestLevel}};
}
function save(n){if(TU||XF)return;if(MP.on)return mpSave(n); // a co-op run is kept apart and never touches the single-player save
  SAVE=snapshot(n);pref('level',n);pref('run',JSON.stringify({cls:SAVE.cls,adv:SAVE.adv,b:SAVE.b,eq:SAVE.eq,scrap:SAVE.scrap,load:SAVE.load,pets:SAVE.pets,pet:SAVE.pet,rev:SAVE.rev,apex:SAVE.apex,tr:SAVE.tr,door:SAVE.door,sp:SAVE.sp,md:SAVE.md,as:SAVE.as,fz:SAVE.fz,st:SAVE.stats}))}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
// read a stored run into S, forgiving: a damaged or hand-edited save must not be able to break the run
function applyRun(r,now=0){
  try{r=r&&typeof r==='object'?r:{};
    S.cls=typeof r.cls==='string'&&own(CLASSES,r.cls)?r.cls:null;S.adv=S.cls&&CLASSES[S.cls].adv.some(a=>a[0]===r.adv)?r.adv:null;
    const b=noBoons();if(S.cls&&r.b&&typeof r.b==='object')for(const k in b){const v=Math.floor(+r.b[k]);if(v>0)b[k]=Math.min(v,k==='spec'?CLASSES[S.cls].boon[2]:k==='well'?9999:BOONS.find(x=>x.id===k).cap||999)}S.b=b;
    S.apex=S.cls&&apexOk(r.apex)?r.apex:null;S.tr=S.cls?Math.min(99999,Math.max(0,Math.floor(+r.tr)||0)):0; // older saves have no apex path and no trials behind them
    S.door=S.cls&&Array.isArray(r.door)&&own(DOOR,r.door[0])&&Number.isInteger(r.door[1])&&r.door[1]>=12?{id:r.door[0],n:r.door[1]}:null;
    S.md=S.cls?altIn(r.md):noAlts();S.altSeen=!!r.as;S.sp=frIn(r.sp);S.level=now;frFix();S.fis=fisIn(S.cls?r.fz:null); // (older saves have no fissures) // older saves have no frame: theirs is kept even
    S.load=fixLoad(r.load)||load0();if(!apexLoad(S.load,S.apex))S.load=load0(); // older saves carried four skills
    // older saves have no equipment: they get the basic set
    S.eq=null;S.scrap=0;if(S.cls){S.eq=basicSet(S.cls);S.scrap=Math.min(999,Math.max(0,Math.floor(+r.scrap)||0));if(r.eq&&typeof r.eq==='object')for(const sl of ESLOTS){const e=r.eq[sl];if(e&&typeof e==='object'){const q=Math.floor(+e.r),lv=Math.floor(+e.lvl),u=+e.up;if(q>=0&&q<=3)S.eq[sl]=item(S.cls,sl,q,lv>0?Math.min(lv,999):0,u>0?Math.min(u,400):0,e.m?1:0,e.s,e.t)}}}
    // older saves have no pets; a broken entry is dropped, the rest are kept
    petsClear();if(canPet(S.cls,S.adv)&&Array.isArray(r.pets)){for(const p of r.pets.slice(0,PETSANE)){const e=petIn(p);if(e)PETS.roster.push(e)}const n=PETS.roster.length;
      PETS.active=actIn(Array.isArray(r.pet)?r.pet.filter((x,i,l)=>Number.isInteger(x)&&x>=0&&x<n&&l.indexOf(x)===i):r.pet,n,n)||(n?[n-1]:[]);petFix(now)}
    PETS.auto=!(r.rev===0||r.rev===false); // raising the fallen is on unless the save says otherwise
    stReset();const st=r.st&&typeof r.st==='object'?r.st:{};for(const k of['kills','deaths','dmgDealt','dmgTaken','time','bestLevel']){const v=+st[k];if(v>0&&isFinite(v))ST[k]=Math.min(v,1e12)} // older saves have no counters
  }catch(e){S.fis=fisNew();S.sp=frNew();S.md=noAlts();S.altSeen=false;S.cls=S.adv=S.apex=null;S.tr=0;S.door=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();stReset()}
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
  let eq=null;if(o.eq!==null&&o.eq!==undefined){if(typeof o.eq!=='object')return null;eq={};for(const sl of ESLOTS){const e=o.eq[sl];if(sl==='relic'&&e===undefined)continue;if(!e||typeof e!=='object'||!int(e.r,0,3)||!int(e.lvl,0,999)||typeof e.up!=='number'||!(e.up>=0&&e.up<=400)||e.m!==undefined&&e.m!==0&&e.m!==1||e.s!==undefined&&!setOk(e.s)||e.t!==undefined&&!trOk(e.t))return null;eq[sl]={r:e.r,lvl:e.lvl,up:e.up,m:e.m?1:0};if(e.s)eq[sl].s=e.s;if(e.t)eq[sl].t=[e.t[0],e.t[1]]}}
  const load=fixLoad(o.load);if(!int(o.scrap,0,999)||!load)return null;
  const apex=o.apex===undefined||o.apex===null?null:o.apex;if(apex!==null&&!(c&&apexOk(apex)))return null;if(!apexLoad(load,apex))return null;
  if(o.tr!==undefined&&!(c&&int(o.tr,0,99999)))return null;
  if(o.door!==undefined&&o.door!==null&&!(c&&Array.isArray(o.door)&&o.door.length===2&&typeof o.door[0]==='string'&&own(DOOR,o.door[0])&&int(o.door[1],12,9998)))return null;
  let pets=[],pet=[];if(o.pets!==undefined&&o.pets!==null){if(!Array.isArray(o.pets)||o.pets.length>PETSANE||o.pets.length&&!canPet(c,o.adv))return null;for(const p of o.pets){const e=petIn(p);if(!e)return null;pets.push(e)}
    pet=actIn(o.pet,pets.length,pets.length);if(!pet)return null}
  if(o.rev!==undefined&&o.rev!==0&&o.rev!==1)return null;
  if(o.md!==undefined&&!(c&&Array.isArray(o.md)&&o.md.length===10&&o.md.every(x=>int(x,0,3))))return null;
  if(o.as!==undefined&&o.as!==1)return null;
  if(o.fz!==undefined&&!(c&&Array.isArray(o.fz)&&o.fz.length>=1&&o.fz.length<=1+FIS.keep&&int(o.fz[0],0,99999)&&o.fz.slice(1).every((v,i,l)=>int(v,1,9999)&&fisAt(v)&&l.indexOf(v)===i)))return null;
  if(o.sp!==undefined&&!(c&&Array.isArray(o.sp)&&o.sp.length===7&&o.sp.every(x=>int(x,0,30000))&&o.sp[2]+o.sp[3]+o.sp[4]+o.sp[5]+o.sp[6]<=FR.per*Math.max(0,o.level-8)))return null;
  const st={kills:0,deaths:0,dmgDealt:0,dmgTaken:0,time:0,bestLevel:0};
  if(o.stats!==undefined){if(!o.stats||typeof o.stats!=='object')return null;for(const k in st){const v=o.stats[k];if(v===undefined)continue;if(typeof v!=='number'||!(v>=0&&v<=1e12))return null;st[k]=v}}
  return{cls:c,adv:o.adv||null,apex,tr:o.tr||0,door:o.door||null,sp:o.sp,md:o.md,as:o.as,fz:o.fz,b,eq,scrap:o.scrap,load,pets,pet,rev:o.rev===0?0:1,st,level:o.level};
}
function loadSave(o){
  if(MP.on)return false;
  const r=checkSave(o);if(!r)return false;
  if(S.paused){S.paused=false;const pb=$('pauseB');if(pb)pb.setAttribute('aria-pressed','false')}
  applyRun(r,r.level);save(r.level);title(r.level);return true;
}
function storedLevel(){try{return Math.min(9998,Math.max(0,Math.floor(+localStorage.getItem('marrowborn.level'))||0))}catch(e){return SAVE.level}}
function newRun(){S.fis=fisNew();S.sp=frNew();S.md=noAlts();S.altSeen=false;S.cls=null;S.adv=null;S.apex=null;S.tr=0;S.door=null;S.b=noBoons();S.eq=null;S.scrap=0;S.load=load0();petsClear();stReset()}
// a hook set by extras.js; `back` puts the screen it was opened from back up
function hook(name,back){try{MB[name](back)}catch(e){console.error('Ashes to Apex: '+name+' failed',e);back()}}
let titleSaved=0;
function title(saved){
  titleSaved=saved===undefined?storedLevel():saved;beginTok++;XF=null;RND=Math.random;
  S.mode='title';S.level=0;S.paused=false;S.wave=null;TR=null;DRE=null;FN=null;S.slowT=0;CB.n=0;DOORS=null;freshBody();P.y=H/2+40;mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];morsels=[];echoes=[];TSRC=[];obstacles=[];boss=null;hud();
  $('lvl').textContent='The root of '+TNAME+'. A pile of ash and bones.';$('bossName').textContent='—';
  titleShow();emit('title');
}
function titleShow(){
  const saved=titleSaved,btns=[['Rise',()=>{newRun();begin(0)}]];
  // start as a whole person at the class choice; nothing is saved until a class is picked
  btns.push(['Skip to class selection',()=>{stReset();chooseClass();freshBody();hud()}]);
  if(saved>0)btns.unshift(['Continue on floor '+(saved+1),()=>saved>=8&&!CLASSES[S.cls]?chooseClass():startLevel(saved)]);
  if(typeof MB.openTower==='function')btns.push(['The climb',()=>hook('openTower',titleShow)]); // set by tower.js when it wants the game to offer the tower map
  if(typeof MB.openMultiplayer==='function')btns.push(['Multiplayer',()=>hook('openMultiplayer',titleShow)]); // set by net.js when it wants the game to offer it
  btns.push(['Tutorial',()=>{if(S.cls&&CLASSES[S.cls])return tutStart('title');show({wide:true,cls:'tutPanel',kick:'The lesson',title:'Learn as which class?',body:'The lesson is the same for all of them; only the weapon differs. Nothing is kept from it.',cards:Object.entries(CLASSES).map(([id,c])=>({title:c.name,sub:c.gear,body:c.text,fn:()=>tutStart('title',id)})),btns:[['Back',titleShow]]})}]);
  btns.push(['The bells',bellScreen]); // (round 16) the floor of the day and the three of the week
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',titleShow)]);
  if(typeof MB.openRecords==='function')btns.push(['Records',()=>hook('openRecords',titleShow)]);
  show({kick:'Bones first. Legend later.',title:'You wake as ash and bare bones',body:'You lie in the root of '+TNAME+', a tower that grew out of everything the dark has kept. Each monster you kill gives part of a body back: organs, then skin, then the five senses. Once you are whole you choose a class and climb, floor by floor. After floor 50 the class can be upgraded, and above floor 100 waits its apex.',keys:matchMedia('(pointer:coarse)').matches?'Stick to move. Strike aims at the nearest monster.':'WASD or arrows to move. Space or click to strike. Esc or P to pause.',btns});
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
  if(e.key==='Enter'&&!$('ov').hidden&&!(e.target&&e.target.tagName==='BUTTON')){if($('ovBtns').dataset.nodef!=='1')$('ovBtns').querySelector('button')?.click();return}
  if(VS&&P&&P.down&&!e.repeat&&(k==='atk'||e.key==='Tab')&&S.mode==='play'){e.preventDefault();return vsSpectate()}
  if((e.key==='x'||e.key==='X'||e.key==='t'||e.key==='T')&&!e.repeat&&S.mode==='play'&&!S.paused&&FN){e.preventDefault();finish();return} // the last rite
  if((e.key==='Tab'||e.key==='y'||e.key==='Y')&&S.mode==='play'&&!S.paused&&!VS&&$('ov').hidden&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(!e.repeat)lockCycle();return} // the lock: the next target
  if(!k&&!e.repeat&&S.mode==='play'&&!S.paused&&$('ov').hidden&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.length===1){const u=e.key.toUpperCase(),ci=PCMD.keys.indexOf(u);if((ci>=0||u==='Z')&&cmdCan()){e.preventDefault();petCommand(ci>=0?ci:(PCMD.ids.indexOf(cmdNow())+1)%4);return}}
  if(!k||e.target.tagName==='BUTTON'&&k==='atk'&&!$('ov').hidden)return;
  if(S.mode==='play'||S.mode==='clear')e.preventDefault();
  if(S.paused)return;
  if(k==='atk'&&!e.repeat)want.atk=true;if(k==='dash'&&!e.repeat)want.dash=true;if(k[0]==='s'&&k[1]==='k'){if(!e.repeat)want.sk[+k[2]]=true;return}keys[k]=true;
});
addEventListener('keyup',e=>{const k=KEY[e.key.length===1?e.key.toLowerCase():e.key];if(k)keys[k]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
cv.addEventListener('pointerdown',e=>{if(S.mode!=='play'||S.paused)return;if(VS&&P&&P.down)return vsSpectate();const r=cv.getBoundingClientRect(),R=MB.renderer;want.atk=true;want.pt=R&&R.ok&&R.screenToGame?R.screenToGame(e.clientX,e.clientY):{x:((e.clientX-r.left)/(r.width||1)*V2.bw-V2.ox)/V2.k,y:((e.clientY-r.top)/(r.height||1)*V2.bh-V2.oy)/V2.k};if(e.pointerType==='touch'&&!VS)lockTap(want.pt);e.preventDefault()});
const pad=$('pad'),knob=$('knob');
let padO=null; // where the thumb came down, relative to the stick's centre
function padMove(e,down){
  const r=pad.getBoundingClientRect(),R=Math.max(24,r.width*.36),cx=r.left+r.width/2,cy=r.top+r.height/2;
  if(down||!padO){let ox=e.clientX-cx,oy=e.clientY-cy;const lim=Math.max(0,r.width/2-R*.55),ol=Math.hypot(ox,oy);if(ol>lim&&ol>0){ox*=lim/ol;oy*=lim/ol}padO={x:ox,y:oy}}
  let x=(e.clientX-cx-padO.x)/R,y=(e.clientY-cy-padO.y)/R;let l=Math.hypot(x,y);
  if(l>1){ // a thumb that slides past the edge drags the centre along, so reversing direction is immediate
    padO.x+=(x-x/l)*R;padO.y+=(y-y/l)*R;x/=l;y/=l;l=1}
  const DZ=.14;let m=l<=DZ?0:Math.pow((l-DZ)/(1-DZ),1.15);if(m>1)m=1;
  joy.x=l>0?x/l*m:0;joy.y=l>0?y/l*m:0;
  let kx=padO.x+x*R,ky=padO.y+y*R;const kl=Math.hypot(kx,ky),km=Math.max(0,r.width/2-(knob.offsetWidth||0)/2);if(kl>km&&kl>0){kx*=km/kl;ky*=km/kl} // the drawn knob stays inside the ring, all of it (round 13: its edge used to stand out by a quarter of its width)
  knob.style.transform=`translate(${kx}px,${ky}px)`}
pad.addEventListener('pointerdown',e=>{try{pad.setPointerCapture(e.pointerId)}catch(_){}padMove(e,true);e.preventDefault()});
pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))padMove(e,false)});
const padUp=()=>{joy.x=joy.y=0;padO=null;knob.style.transform=''};pad.addEventListener('pointerup',padUp);pad.addEventListener('pointercancel',padUp);pad.addEventListener('lostpointercapture',padUp);
$('bAtk').addEventListener('pointerdown',e=>{want.atk=true;keys.atk=true;e.preventDefault()});
for(const ev of['pointerup','pointercancel','pointerleave'])$('bAtk').addEventListener(ev,()=>keys.atk=false);
$('bDash').addEventListener('pointerdown',e=>{want.dash=true;e.preventDefault()});
// a pressed touch button carries the class dn while the finger is on it (the page makes idle buttons see-through)
function pressFx(b){b.addEventListener('pointerdown',()=>b.classList.add('dn'));for(const ev of['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>b.classList.remove('dn'))}
pressFx($('bAtk'));pressFx($('bDash'));
// the last rite's prompt: a plain button until the page has one of its own (it may restyle or move #mbFin; the game shows and hides it and listens to it)
const finB=document.createElement('button');finB.type='button';finB.id='mbFin';finB.hidden=true;finB.textContent='Last rite';finB.style.cssText='position:fixed;left:50%;bottom:24%;transform:translateX(-50%);z-index:30;padding:.6em 1.2em;font:inherit;font-size:1.1rem;color:#0d0c11;background:#ffd95e;border:2px solid #0d0c11;border-radius:10px';
document.body.appendChild(finB);finB.addEventListener('pointerdown',e=>{finish();e.preventDefault()});
function finUi(){const join=!!FN&&FN.state==='play'&&MP.on&&!VS&&FN.by!==MP.myIdx&&!FN.join.includes(MP.myIdx)&&!FN._asked,on=!!FN&&(FN.state==='ready'||join)&&S.mode==='play'&&!S.paused&&!!P&&!P.down;if(finB.hidden===on)finB.hidden=!on;const tx=join?'Join the rite':'Last rite';if(on&&finB.textContent!==tx)finB.textContent=tx}
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
  for(let i=0;i<NSK;i++){const s=SK[i],nomp=s.ready&&!s.affordable,secs=s.cd>0?(s.cd<10?s.cd.toFixed(1):''+Math.ceil(s.cd)):'',txt=!s.unlocked?'Fl '+(SKLV[S.load[i]]||101):secs||(nomp?''+s.cost:''),key=s.name+'|'+txt+'|'+s.unlocked+'|'+nomp+'|'+s.cost;
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
//  round 8: w.tr:[clock x10, lamp health, lost] the trial as the host has it; mn flag 8: a besieger; me.bm:[angle x100, length] or 0: the Verdict beam; an ally 'p' with flag 32 is one of the Owed (its health field is the seconds it has left);
//  round 10: w.m flags 2048 frozen, 4096 burning, 8192 shocked, 16384 drenched, bits 15-16 chill in thirds, bits 17-19 layers of rot; hit op ap id status value damage (a status, by its place in STK);
//        field kinds 4-8: ice, rot, fire, wave, quake (after the usual six entries, and after damage and slow in versus: vx,vy or x2,y2, then 1 when it stays on its owner; a quake's radius is its half-width);
//        an ally 'b' | 'i' | 'c' (pack-beast, ice-wight, cinder): static [nid,k,r,seconds] (in versus then its health), dynamic [nid,x,y,flags 1 flip 2 moving 8 flash,st,face,seconds x10,health];
//        me.ar:[[x1,y1,x2,y2]] lightning for the eye; me.hs:[blades,plates,haste x10,pack] when it changes; lk.ab: a pack-beast's bite (versus)
//        lk.ap: the apex path; lv {k:'door',n,d} the host's choice at a crossroads, and d on 'go' when a door is in force on that floor; hit op mk id seconds (marked); field kind 3: Tally Ground
const MPHZ=15,MPDELAY=100,STN=['idle','wind','lunge','charge','dazed','leap','under','rise','up','beam','cast','shift','aim'],STI={},PKIND=['bolt','arrow','skull','orb'],FKIND=['frost','halo','rain','domain','ice','rot','fire','wave','quake'],AKIND={b:'packbeast',i:'icewight',c:'cinder'};
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
function mSlow(m,v){if(m.vs)return vsDebuff(m,{slow:v},1);if(TAGOK)tagSet(m,2);if(CL())mpQ(['sl',m.id,v]);else m.slow=Math.max(m.slow||0,v)}
function mStun(m,v){if(m.vs)return vsDebuff(m,{stun:v},1);if(TAGOK)tagSet(m,1);if(CL())mpQ(['st',m.id,v]);else m.stun=v}
function mMark(m,v){if(m.vs)return vsDebuff(m,{mark:v},1);if(TAGOK)tagSet(m,4);if(CL())mpQ(['mk',m.id,v]);else m.markT=Math.max(m.markT||0,v)}
function mPush(m,dx,dy){if(m.vs)return;if(CL())return mpQ(['kb',m.id,Math.round(dx),Math.round(dy)]);m.x+=dx;m.y+=dy;clamp(m,m.r)}
function mMove(m,x,y){if(m.vs)return vsMove(m,x,y);if(TAGOK)tagSet(m,1);if(CL())return mpQ(['mv',m.id,Math.round(x),Math.round(y)]);m.x=x;m.y=y;clamp(m,m.r);if(m.st==='charge'||m.st==='lunge'){m.st='dazed';m.t=.6}}
function mVen(m,d,a){if(m.vs)return vsVen(m,d);if(CL())return mpQ(['vn',m.id,Math.round(d*1000)/1000]);m.venT=3;m.venD=Math.max(m.venT>0&&m.venD||0,d);m.venK=.5;m.venBy=a;m.venRem=null}
function clearShots(c,r){
  if(VS)return vsClear(c,r);
  if(MP.on){if(MP.role==='host'){for(const s of shots)if(dist(s,c)<=r)MP.sd.push(s.id)}else mpQ(['cl',Math.round(c.x),Math.round(c.y),Math.min(9999,Math.round(r))])}
  shots=shots.filter(s=>dist(s,c)>r)}
function mpShotHit(s){if(MP.role==='host')MP.sd.push(s.id);else mpQ(['sx',s.id])}
function mpMorsel(f){if(MP.role==='host')return;MP.ate.add(f.id);mpQ(['mo',f.id])}
// a client's blow: shown at once, counted, and sent; the monster's health is the host's to change
function mpHurtM(m,d,quiet){
  if(m.decoy)return;if(m.ward>0){SND.ward();return}
  if(FN&&FN.state==='play'&&m.id===FN.id)return;
  if(LNK){d=linkPay(m,d);if(m.brkMax)brkHit(m,BRK[LNK],'skill')}
  if(MINE>0)comboHit();
  const dd=(m.markT>0?d*1.5:d)*(m.stagT>0?BRK.more:1),got=Math.max(0,Math.min(dd,m.hp));ST.dmgDealt+=got;if(byPet)petFed(got);
  m.flash=.12;puff(m,col(m.s.col),5,120);SND.hit(quiet);if(!quiet)haptic(12);floats.push({x:m.x+rand()*18-9,y:m.y-m.r-6,txt:fmt(Math.round(dd*10)/10),life:.7,c:'#e7dfcd',big:BIG||undefined});
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
    if(k==='ob'){const r=MP.rById.get(''+from);if(r)objHit(op[1]|0,(+op[2]||0)/100,r.idx,1);continue}
    if(k==='fin'){const r=MP.rById.get(''+from);if(r&&FN&&FN.id===op[1]){if(FN.state==='ready')finStart(r.idx);else if(FN.by===r.idx){if(FN.t>=FIN.min)finEnd(true)}else finJoin(r.idx)}if(S.mode!=='play')break;continue}
    let m=null;for(const x of mons)if(x.id===op[1]){m=x;break}if(!m)continue;
    REM=from||true;
    try{
      if(k==='d'){const d=+op[2];if(d>0)hurtM(m,d,true)}
      else if(k==='kb'){if(!m.boss&&!m.decoy){m.x+=Math.max(-40,Math.min(40,+op[2]||0));m.y+=Math.max(-40,Math.min(40,+op[3]||0));clamp(m,m.r)}}
      else if(k==='db'){debuff(m,{slow:+op[2]||0,stun:+op[3]||0,dot:+op[4]||0,mark:+op[5]||0},1);if(op[4])m.dotRem=REM}
      else if(k==='st'){const v=+op[2];if(v>0)m.stun=Math.min(8,v)}
      else if(k==='sl'){const v=+op[2];if(v>0)m.slow=Math.max(m.slow||0,Math.min(10,v))}
      else if(k==='mk'){const v=+op[2];if(v>0)m.markT=Math.max(m.markT||0,Math.min(10,v))}
      else if(k==='ap'){const s=STK[op[2]|0],v=+op[3],d=+op[4]||0;if(s&&v>0)stApply(m,s,Math.min(10,v),Math.max(0,Math.min(1e8,d)))}
      else if(k==='vn'){const v=+op[2];if(v>0){m.venT=3;m.venD=Math.max(m.venD||0,v);m.venK=.5;m.venBy=null;m.venRem=REM;puff(m,TCOL.assassin,10,120)}}
      else if(k==='mv'){if(!m.hidden&&m.st!=='leap')mMove(m,+op[2]||m.x,+op[3]||m.y)}
      else if(k==='bk'){const v=+op[2];if(v>0)brkTake(m,Math.min(40,v))}
      else if(k==='tg'){const b=op[2]|0;if((b===1||b===2||b===4)&&!m.decoy&&R12()){const rr=MP.rById.get(''+from);tagPut(m,b,op[3]?SETK.kind2:0,rr?rr.idx:-1)}}
      else if(k==='lk'){const i=op[2]|0,kd=LINK.kinds[i],L=LINK.pay[kd],r=MP.rById.get(''+from);if(L&&m.tgT&&m.tgT[i]>0){const sb=m.tgBy?m.tgBy[i]:-1,duo=!!r&&sb>=0&&sb!==r.idx;m.tgT[i]=0;m.tags&=~L.bit;MP.lkq.push([m.id,i,r?r.idx:-1,duo?sb+1:0]);if(duo&&sb===MP.myIdx)linkMine(m,L,r.idx);emit('link',{id:m.id,x:m.x,y:m.y,kind:kd,tag:L.tag,name:L.name,bonus:0,by:r?r.idx:-1,duo,setBy:duo?sb:-1})}}
    }finally{REM=null}
    if(S.mode!=='play')break; // that was the boss
  }
}
/* --- the host's snapshot of the world --- */
function mpMonDyn(m){
  const f=(m.hidden?1:0)|(m.flash>0?2:0)|(m.ward>0?4:0)|(m.rage?8:0)|(m.stun>0?16:0)|(m.slow>0?32:0)|(m.markT>0?64:0)|(m.dotT>0||m.venT>0?128:0)|(m.moving?256:0)|(m.ward>.3?512:0)|(m.side<0?1024:0)|(m.frozen>0?2048:0)|(m.burn>0?4096:0)|(m.shock>0?8192:0)|(m.soak>0?16384:0)|(m.chill>0?Math.max(1,Math.round(m.chill*3))<<15:0)|(m.rot>0?Math.min(5,m.rot)<<17:0);
  const st=m.st,a=[m.id,Math.round(m.x),Math.round(m.y),hpR(m.hp),STI[st]||0,f,m.tgt?(m.tgt===P?MP.myIdx:m.tgt._mi):-1,m.ai==='mite'?0:Math.round(m.t*10)||0,
    st==='wind'||st==='charge'||st==='lunge'||st==='dazed'?Math.round(m.ang*100)||0:0,Math.round(m.lift*100)||0,(m.phase||1)-1,(m.tags||0)&7|(m.stagT>0?8:0),m.brkMax?Math.round(m.brk/m.brkMax*100)+1:0,m.tags&&m.tgBy?(m.tgBy[0]+1&15)|(m.tgBy[1]+1&15)<<4|(m.tgBy[2]+1&15)<<8:0];
  while(a.length>7&&!a[a.length-1])a.pop();return a}
const beamOut=b=>{const a=[b.on?1:0,b.w];for(const r of b.rays)a.push(Math.round(r.a*100),Math.round(r.len));return a};
function beamIn(o,d){const n=(d.length-2)>>1;let b=o.beam;if(!b||b.rays.length!==n)b=o.beam={on:false,w:12,rays:Array.from({length:n},()=>({a:0,len:0}))};b.on=!!d[0];b.w=+d[1]||12;for(let i=0;i<n;i++){b.rays[i].a=d[2+i*2]/100;b.rays[i].len=+d[3+i*2]||0}if(n)o.ba=b.rays[0].a}
function mpSendWorld(now){
  if(S.mode!=='play')return;
  const full=MP.full,wm=full?0:MP.wm,w={t:'w',c:Math.round(now),n:S.level},M=[];let mn=null,b=null,sn=null,zn=null;if(full)w.f=1;
  for(const m of mons){
    if(m.id>wm){const a=[m.id,m.kind,(m.boss?1:0)|(m.lesser?2:0)|(m.decoy?4:0)|(m.siege?8:0)|(m.quarry?16:0)|(m.el?m.el<<5:0),hpR(m.maxHp)];if(m.lesser&&SPEC[m.kind]&&m.s.col!==SPEC[m.kind].col)a.push(m.s.col);(mn||(mn=[])).push(a)}
    M.push(mpMonDyn(m));if(m.beam)(b||(b={}))[m.id]=beamOut(m.beam)}
  w.m=M;if(mn)w.mn=mn;if(b)w.b=b;
  for(const s of shots)if(s.id>wm&&!s.dead)(sn||(sn=[])).push([s.id,Math.round(s.x),Math.round(s.y),Math.round(s.vx),Math.round(s.vy),s.r]);if(sn)w.sn=sn;
  if(MP.sd.length){if(!full)w.sd=MP.sd;MP.sd=[]}
  if(!full&&now>=MP.tSi){MP.tSi=now+2000;if(shots.length)w.si=shots.map(s=>s.id)}
  for(const z of zones)if(!z.mine&&z.id>wm){const a=[z.id,Math.round(z.x),Math.round(z.y),z.r,Math.round(z.dur*100),Math.round(z.t*100)];if(z.sx!==undefined)a.push(Math.round(z.sx),Math.round(z.sy));else if(z.hz)a.push(null,null);if(z.hz)a.push(1);(zn||(zn=[])).push(a)}if(zn)w.zn=zn;
  let mk='';for(const f of morsels)mk+=f.id+',';if(full||mk!==MP.moKey){MP.moKey=mk;w.mo=morsels.map(f=>[f.id,Math.round(f.x),Math.round(f.y)])}
  if(obstacles.length&&(full||now>=MP.tOb)){MP.tOb=now+1500;w.o=obstacles.map(o=>Math.round(o.t*100))}
  const wk=S.wave?S.wave.n+'/'+S.wave.of:'';if(full||wk!==MP.wvKey){MP.wvKey=wk;w.wv=S.wave?[S.wave.n,S.wave.of,Math.round(S.wave.hp0||0)]:0}
  if(TR)w.tr=[Math.round(TR.t*10),TR.obj?TR.obj.hp:0,TR.failed?1:0]; // the trial: its clock (x10), the lamp's health, lost
  if(DRE)w.ob=[DARES.kinds.indexOf(DRE.kind),DRE.state==='run'?0:DRE.state==='done'?1:2,Math.round(DRE.t*10),DRE.obj?DRE.obj.hp:0,Math.round(DRE.value*10)/10]; // the dare
  if(MP.lkq.length){w.lk=MP.lkq;MP.lkq=[]}if(MP.elq.length){w.el=MP.elq;MP.elq=[]}if(MP.oeq.length){w.oe=MP.oeq;MP.oeq=[]}if(full&&obstacles.length&&objOn())w.os=obstacles.map(o=>o.kind==='pillar'?(o.dead?9:o.cr||0):o.kind==='brazier'?(o.spent?9:0):o.fell?9:o.warn?1:0).join('');
  if(FN){w.fn=[FN.state==='play'?2:1,FN.id,FN.by,Math.round(FN.t*100)];if(FN.join&&FN.join.length)w.fn.push(FN.join.reduce((a,i)=>a|1<<i,0))} // the last rite: ready or playing (and who has joined it)
  MP.wm=NEXTID-1;MP.full=false;nsend(w);
}
// a client hears of the dare, of payoffs and of the last rite
function mpR12In(w){
  const q=w.ob,d=DRE;
  if(q&&d){d.t=(+q[2]||0)/10;if(d.dur)d.left=Math.max(0,d.dur-d.t);d.value=+q[4]||0;if(d.obj){const hp=Math.max(0,+q[3]||0);if(hp<d.obj.hp){d.obj.flash=.3;puff(d.obj,'#ffd95e',10,170);sfx(320,.2,'square',.2,120);floats.push({x:d.obj.x,y:d.obj.y-d.obj.r-16,txt:'-1',life:.8,c:'#ff5b6e'})}d.obj.hp=hp}
    if(q[1]&&d.state==='run')dareEnd(q[1]===1?'done':'fail')}
  if(w.el)for(const a of w.el){const k=a[2]|0;if(!ELITE.kinds[k])continue;floats.push({x:+a[0]||0,y:(+a[1]||0)-40,txt:'Elite down',life:1.2,c:ELITE.col,big:1.4});emit('elite',{state:'down',id:0,kind:ELITE.kinds[k],x:+a[0]||0,y:+a[1]||0})}
  if(w.lk)for(const a of w.lk){if(a[2]===MP.myIdx)continue;const m=MP.mons.get(a[0]),kd=LINK.kinds[a[1]|0],L=LINK.pay[kd],duo=(a[3]|0)>0;if(m&&L){floats.push({x:m.x,y:m.y-m.r-28,txt:(duo?'Linked ':'')+L.name,life:duo?1.3:1,c:L.col,big:duo?1.8:1.4});rings.push({x:m.x,y:m.y,life:.4,max:.4,r:m.r+70,fx:true});if(duo&&(a[3]|0)-1===MP.myIdx)linkMine(m,L,a[2]|0);emit('link',{id:m.id,x:m.x,y:m.y,kind:kd,tag:L.tag,name:L.name,bonus:0,by:a[2]|0,duo,setBy:duo?(a[3]|0)-1:-1})}}
  const f=w.fn;
  if(f){const b=MP.mons.get(f[1]);
    if(!FN){FN={state:'ready',join:[],id:f[1],by:-1,cls:null,adv:null,apex:null,name:'',t:0,dur:FIN.dur,x:b?b.x:W/2,y:b?b.y:H/2,hx:P.x,hy:P.y};finEv('ready');if(f[0]===1&&b)finCue(b)}
    if(b){FN.x=b.x;FN.y=b.y}
    if(f[0]===2&&FN.state!=='play'){Object.assign(FN,finInfo(f[2]|0),{state:'play',t:(+f[3]||0)/100,join:[]});finBegun()}
    if(f[0]===2&&f[4]){const mk=f[4]|0;for(let i=0;i<8;i++)if(mk&1<<i&&!FN.join.includes(i)&&i!==FN.by){FN.join.push(i);finJoined(i)}}}
  else if(FN){finEv(FN.state==='play'?'end':'gone');FN=null}
}
/* --- a client's copy of the world --- */
function mpMkMon(a){
  const id=a[0],kind=typeof a[1]==='string'&&own(SPEC,a[1])?a[1]:'mite',fl=a[2]|0,maxHp=+a[3]||1,L=S.L;let s;
  if(fl&1)s=L.spec;else if(fl&2){s=lesserSpec(kind,S.level,maxHp);if(typeof a[4]==='string'&&/^#[0-9a-f]{6}$/i.test(a[4]))s.col=a[4]}else s=SPEC[kind];
  const m={id,kind,s,ai:AI[s.ai||kind]?s.ai||kind:'mite',x:W/2,y:140,r:s.r,hp:maxHp,maxHp,boss:!!(fl&1),lesser:!!(fl&2),decoy:!!(fl&4),siege:!!(fl&8),quarry:!!(fl&16),st:'idle',t:1,n:0,flash:0,ring:0,ang:0,side:1,hits:0,seed:rand()*9,hidden:false,lift:0,
    mods:fl&1?(L.mods||[]).slice():[],ward:0,beam:null,vx:0,vy:0,moving:false,rage:false,phase:1,rep:true,_new:true};
  const el=(fl>>5)&7;if(el>=1&&el<=ELITE.kinds.length&&(fl&2)){m.el=el;m.r=Math.round(m.r*ELITE.r);m.s={...m.s,name:ELITE.names[el-1]+' '+m.s.name.replace('Lesser ',''),r:m.r};if(S.L){(S.L.elites||(S.L.elites=[])).push(ELITE.kinds[el-1]);if(!window.MBEliteBand)floats.push({x:W/2,y:H/2-90,txt:'Elite: '+ELITE.names[el-1],life:2.4,c:ELITE.col});emit('elite',{state:'enter',kinds:[ELITE.kinds[el-1]],names:[ELITE.names[el-1]]})}}return m}
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
    if(f>2047||m._st){m._st=f>2047;m.frozen=f&2048?.3:0;m.burn=f&4096?.3:0;m.shock=f&8192?.3:0;m.soak=f&16384?.3:0;m.chill=(f>>15&3)/3;m.rot=f>>17&7;m.rotT=m.rot?1:0}
    if(a[7]!==undefined&&m.ai!=='mite')m.t=a[7]/10;if(a[8])m.ang=a[8]/100;
    const ph=(a[10]||0)+1;if(ph>(m.phase||1)){m.phase=ph;if(!fresh)phaseFx(m)}m.phase=ph;
    {const tg=a[11]|0,sg=!!(tg&8);m.tags=tg&7;if(sg!==m.stagT>0){if(sg)m.stagMax=BRK.stag;emit('stagger',{id:m.id,state:sg?'start':'end',dur:sg?BRK.stag:0,x:m.x,y:m.y});if(sg&&!fresh){rings.push({x:m.x,y:m.y,life:.6,max:.6,r:m.r+90,fx:true});floats.push({x:m.x,y:m.y-m.r-30,txt:'Reeling',life:1.4,c:'#ffd95e',big:1.4})}}m.stagT=sg?.3:0;if(a[12]){m.brkMax=100;m.brk=a[12]-1}else m.brkMax=0;{const c=a[13]|0;m.tgBy=c?[(c&15)-1,(c>>4&15)-1,(c>>8&15)-1]:null}}
    const bd=w.b&&w.b[m.id];if(bd)beamIn(m,bd);else if(m.beam)m.beam=null;
    list.push(m);if(m.boss)bs=m}
  if(byId.size>list.length)for(const[id,m]of byId)if(m._seen!==seen){byId.delete(id);if(!m._gone)puff(m,col(m.s.col),m.boss?50:10,m.boss?320:160);ST.kills++;if(!m.boss&&P&&!P.down)manaGive(P.maxMana*MKILL);if(!m.boss&&!w.f&&m.hp<m.maxHp*.5)fallen(m)}
  if(w.tr&&TR){const t=TR,q=w.tr;t.t=(+q[0]||0)/10;t.progress=t.dur?Math.min(t.dur,t.t):t.t;
    if(t.obj){const hp=Math.max(0,+q[1]||0);if(hp<t.obj.hp){t.obj.flash=.3;rings.push({x:t.obj.x,y:t.obj.y,life:.4,max:.4,r:t.obj.r+40,fx:true});puff(t.obj,'#ffd95e',10,170);sfx(320,.2,'square',.2,120)}t.obj.hp=hp}
    if(q[2]&&!t.failed){t.failed=true;emit('trial',{kind:t.kind,state:'fail'});floats.push({x:W/2,y:H/2-60,txt:t.kind==='guard'?'The lamp went out':'The hourglass ran out',life:2.2,c:'#ff5b6e'});SND.dead()}}
  mons=list;boss=bs;if(lost)mpNeedSync(now);
  mpR12In(w);
  if(w.sn){if(!w.f&&w.sn.length)sfx(520,.1,'sine',.12,260);for(const a of w.sn){const vx=+a[3]||0,vy=+a[4]||0,k=w.f?0:MPDELAY/1000;shots.push({id:a[0],x:a[1]-vx*k,y:a[2]-vy*k,vx,vy,r:+a[5]||6,g:k?k+.03:0})}}
  if(w.sd&&w.sd.length)shots=shots.filter(s=>!w.sd.includes(s.id));
  if(w.si)shots=shots.filter(s=>s.g>0||w.si.includes(s.id));
  if(w.zn)for(const a of w.zn){const z={id:a[0],x:a[1],y:a[2],r:+a[3]||60,dur:(+a[4]||100)/100,t:(+a[5]||0)/100};if(a[6]!==undefined&&a[6]!==null){z.sx=a[6];z.sy=a[7]}if(a[8])z.hz=1;zones.push(z)}
  if(w.mo)morsels=w.mo.filter(a=>!MP.ate.has(a[0])).map(a=>({id:a[0],x:a[1],y:a[2]}));
  if(w.o)for(let i=0;i<w.o.length&&i<obstacles.length;i++)obstacles[i].t=w.o[i]/100;
  if(typeof w.os==='string')for(let i=0;i<w.os.length&&i<obstacles.length;i++){const o=obstacles[i],c=+w.os[i]||0;if(o.kind==='pillar'){if(c===9)o.dead=true;o.cr=c===9?ARENA.pillarHp:c}else if(o.kind==='brazier'){if(c===9&&!o.spent){o.spent=true;o.per=0;o.on=false;o.warn=false;o.tip=0}}else if(o.kind==='crack'){if(c===9){o.kind='pit';o.r=ARENA.crackR-2;o.fell=true;o.warn=false}else if(c===1&&!o.warn){o.warn=true;o.wt=ARENA.crackWarn}}}
  if(w.oe)for(const a of w.oe)objDo(a[0]|0,a[1]|0,(+a[2]||0)/100,a[3]|0);
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
const mpLook=()=>{const o={t:'lk',lv:S.level,cls:S.cls,adv:S.adv,ap:S.apex||0,rk:S.cls?rank():'',pw:[pw(1)?1:0,pw(2)?1:0,pw(3)?1:0]};if(VS)vsLook(o);return o};
function mpAllyStatic(a){
  if(VS)return vsAllyStatic(a);
  if(a.shade)return[a.nid,'p',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,hpR(a.max),32,'shade',0,0,0]; // one of the Owed: sent as a pet with flag 32; where a pet has its health, a shade has the seconds it has left
  if(a.pet)return[a.nid,'p',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,hpR(a.maxHp),(a.minion?1:0)|(a.lesser?2:0)|(a.helper?4:0)|(a.trophy?8:0)|(a.crown?16:0),a.owner,a.plv|0,a.mods&&a.mods.length?a.mods:0,a.perk||0];
  if(a.trophy)return[a.nid,a.kind==='familiar'?'f':'g',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,a.tm||1,a.owner,Math.round(a.seed*100)/100,a.s.r];
  if(a.apexAlly)return[a.nid,a.kind[0]==='p'?'b':a.kind[0],a.r,Math.round(a.max*10)/10];
  return[a.nid,a.kind==='wolf'?'w':'t',a.r]}
function mpAllyDyn(a){
  const x=Math.round(a.x),y=Math.round(a.y);
  if(a.pet||a.shade){const d=[a.nid,x,y,(a.flip?1:0)|(a.moving?2:0)|(a.hidden?4:0)|(a.flash>0?8:0)|(a.ward>0?16:0)|(a.rage?32:0)|(a.inv>0?64:0),a.shade?hpR(Math.max(.1,a.life)):hpR(a.hp),STI[a.st]||0,Math.round((a.face||0)*100)||0,a.minion?0:Math.round((a.t||0)*10)||0,Math.round((a.lift||0)*100)||0,(a.phase||1)-1];
    while(d.length>6&&!d[d.length-1])d.pop();return d}
  if(a.trophy)return[a.nid,x,y,(a.flip?1:0)|(a.moving?2:0)|(a.flash>0?8:0)|(a.shield?256:0),STI[a.st]||0,Math.round((a.face||0)*100)||0,Math.round((a.t||0)*10)||0];
  if(a.apexAlly){const d=[a.nid,x,y,(a.flip?1:0)|(a.moving?2:0)|(a.flash>0?8:0),STI[a.st]||0,Math.round((a.face||0)*100)||0,Math.round(Math.max(.1,a.life)*10)];if(VS)d.push(hpR(a.hp||0));return d}
  return VS?[a.nid,x,y,a.flip?1:0,hpR(a.hp||0)]:[a.nid,x,y,a.flip?1:0]}
function mpSendMe(now,force){
  if(!P)return;MP.tick++;
  const inLv=(S.mode==='play'||S.mode==='clear')&&(!MP.away||!!VS),away=!inLv;
  const p=[Math.round(P.x),Math.round(P.y),Math.round(P.face*100)||0,(P.moving?1:0)|(P.inv>0?2:0)|(P.shield?16:0)|(P.down?32:0)|(away?64:0)|(SK[0].ready?128:0),VS?hpR(P.hp):Math.max(0,P.hp),P.maxHp,Math.round(P.swing*100)||0,
    Math.round(Math.max(0,P.atk,MP.swung?.1:0)*100),Math.round(Math.max(0,P.dashT,MP.dashed?.1:0)*100),(P.chS&15)|(P.chC&&P.chS?16:0)|(P.pdT>0?32:0)|(P.rip>0?64:0)];MP.swung=MP.dashed=false;
  while(p.length>7&&!p[p.length-1])p.pop();
  const msg={t:'me',c:Math.round(now),p};let ev=false;
  if(inLv){
    if(MP.wasAway){MP.wasAway=false;for(const a of allies)a._sent=false}
    const n=allies.length,every=n<=6?1:n<=16?2:3;
    for(const a of allies)if(!a._sent){a._sent=true;(msg.an||(msg.an=[])).push(mpAllyStatic(a))}
    if(n||MP.hadAl){if(msg.an||!n||MP.tick%every===0){msg.a=allies.map(mpAllyDyn);for(const a of allies)if(a.beam&&a.pet)(msg.ab||(msg.ab={}))[a.nid]=beamOut(a.beam);MP.hadAl=n>0}ev=true}
    if(P.beam){msg.bm=[Math.round(P.beam.a*100),Math.round(P.beam.len)];if(VS)msg.bm.push(Math.round(14*dmgMul()*100)/100);ev=true}else if(MP.hadBm){msg.bm=0;ev=true}MP.hadBm=!!P.beam; // the Verdict beam
    for(const q of pshots)if(!q._sent){q._sent=true;(msg.s||(msg.s=[])).push(vsShotOut(q,[Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy),q.r,Math.max(0,PKIND.indexOf(q.kind)),Math.min(99,q.pierce|0)]))}
    for(const e of echoes)if(!e._sent){e._sent=true;(msg.e||(msg.e=[])).push([Math.round(e.x),Math.round(e.y),Math.round(e.ang*100)||0,e.k||e.ai,e.ai,e.s.col,e.s.r,e.s.crown?1:0,e.owner])}
    for(const z of zones)if(z.mine&&!z.rem&&!z._sent){z._sent=true;const a=[Math.round(z.x),Math.round(z.y),z.r,Math.round(z.dur*100)];if(z.sx!==undefined)a.push(Math.round(z.sx),Math.round(z.sy));else if(VS)a.push(-1,-1);if(VS)a.push(Math.round(z.dmg*100)/100,z.stun||0,z.pet?1:0);(msg.z||(msg.z=[])).push(a)}
    for(const f of fields)if(!f.rem&&!f._sent){f._sent=true;const a=VS?[Math.max(0,FKIND.indexOf(f.kind)),Math.round(f.x),Math.round(f.y),f.r,Math.round(f.dur*100),Math.round(f.every*100),Math.round(f.dmg*100)/100,f.slow?1:0]:[Math.max(0,FKIND.indexOf(f.kind)),Math.round(f.x),Math.round(f.y),f.r,Math.round(f.dur*100),Math.round(f.every*100)];
      if(f.ax){const q=f.kind==='quake';a[3]=q?f.w:f.r;a[4]=Math.round(Math.min(600,f.dur)*100);a.push(Math.round(q?f.x2:f.vx||0),Math.round(q?f.y2:f.vy||0),f.follow?1:0)}(msg.f||(msg.f=[])).push(a)}
    if(MP.aq.length){msg.ar=MP.aq;MP.aq=[]}
    if(MP.pcOut){msg.pc=MP.pcOut;MP.pcOut=null;ev=true} // round 14: my order to my pets (index in PCMD.ids, the hold point)
    if(MP.rvOut){msg.rv=MP.rvOut;MP.rvOut=null;ev=true} // round 15: I am raising that member (index, percent; 100: raised)
    if(P.down&&!VS)msg.rn=P.rvN|0; // how often I have been raised on this floor
    if(MP.rpOut){msg.rp=MP.rpOut;MP.rpOut=null;ev=true} // round 13: my riposte landed there (x, y, angle x100), so the other pages can draw it
    if(S.apex&&APXSTEP[S.apex]&&cls()){const hs=[P.blades|0,P.plates|0,Math.round((P.haste||0)*10),P.pack|0],k=hs.join();if(k!==MP.hsKey||force){MP.hsKey=k;msg.hs=hs;ev=true}}
    if(MP.rq.length){msg.r=MP.rq;MP.rq=[]}
    if(VS&&VP.ev.length){msg.v=VP.ev;VP.ev=[]}
    if(msg.s||msg.e||msg.z||msg.f||msg.r||msg.v||msg.ar)ev=true;
  }else{if(MP.hadAl){msg.a=[];MP.hadAl=false;ev=true}MP.rpOut=null;MP.rq.length=0;MP.aq.length=0;MP.hsKey='';MP.wasAway=true;for(const q of pshots)q._sent=true;for(const e of echoes)e._sent=true;for(const z of zones)z._sent=true;for(const f of fields)f._sent=true}
  // nothing new to say: three times a second is enough
  const key=p.join();if(!ev&&!force&&key===MP.pKey&&now-MP.tSent<320)return;MP.pKey=key;MP.tSent=now;
  nsend(msg);
  if(now>=MP.tLook||force){MP.tLook=now+400;const lk=mpLook(),k=JSON.stringify(lk);if(k!==MP.lookKey||force){MP.lookKey=k;nsend(lk)}}
}
/* --- the other heroes --- */
function mkRemote(m){
  const q={x:W/2,y:H-120,face:-Math.PI/2,moving:false,walk:0,hp:1,maxHp:1,inv:0,atk:0,swing:0,dashT:0,shield:false,skCd:0,vx:0,vy:0,lift:0,down:false,auraR:0,beam:null,blades:0,plates:0,haste:0,pack:0,chS:0,chN:3,chC:false,chT:0,pdT:0,rip:0,_mi:m.idx};
  return{id:m.id,name:m.name,idx:m.idx,dead:false,away:true,team:0,P:q,look:{level:8,cls:null,adv:null,apex:null,rank:'',pw:[false,false,false],parts:7,skill0Ready:false},allies:[],pshots:[],echoes:[],_al:new Map(),_clk:{off:1e18},_seen:0}}
function mpMkAlly(r,a){
  const nid=a[0],k=a[1];if(r._al.has(nid))return;let o;
  if(k==='p'||k==='f'||k==='g'){const base=typeof a[2]==='string'&&own(SPEC,a[2])?SPEC[a[2]]:SPEC.crawler,ai=AI[a[3]]?a[3]:'mite',name=mpTxt(a[4]),c=typeof a[5]==='string'&&/^#[0-9a-f]{6}$/i.test(a[5])?a[5]:base.col,rr=Math.max(4,Math.min(60,+a[6]||10));
    if(k==='p'){const fl=a[8]|0;
      o={nid,kind:'pet',pet:true,owner:a[9]==='beast'?'beast':'necro',s:{...base,ai,name,col:c,crown:fl&16?1:0,r:rr},ai,name,plv:a[10]|0,perk:typeof a[12]==='string'&&MODS.includes(a[12])?a[12]:null,crown:fl&16?1:0,minion:!!(fl&1),lesser:!!(fl&2),helper:!!(fl&4),trophy:!!(fl&8),
        x:0,y:0,r:rr,hp:+a[7]||1,maxHp:+a[7]||1,st:'idle',t:1,ang:0,face:0,flash:0,hidden:false,lift:0,seed:rand()*9,mods:Array.isArray(a[11])?a[11].filter(x=>MODS.includes(x)):[],ward:0,beam:null,boss:false,moving:false,walk:0,flip:false,inv:0,rage:false,phase:1,life:1e9,rem:true};
      if(fl&32)Object.assign(o,{kind:'shade',shade:true,pet:false,owner:'shade',minion:false,lesser:false,helper:false,trophy:false,max:o.maxHp,life:o.maxHp,hp:1,maxHp:1})}
    else{const f=k==='f'?'familiar':'guardian';
      o={nid,kind:f,trophy:true,ent:true,form:f,owner:own(CLASSES,a[8])?a[8]:'mage',s:{...base,ai,name,col:c,crown:0,r:Math.max(4,Math.min(60,+a[10]||rr))},ai,name,x:0,y:0,r:rr,tm:+a[7]||1,t:0,seed:+a[9]||0,face:0,st:'idle',stT:0,flash:0,life:1e9,hidden:false,lift:0,mods:[],ward:0,beam:null,boss:false,moving:false,walk:0,flip:false,shield:false,rem:true}}}
  else if(AKIND[k]){const mx=Math.max(.5,Math.min(600,+a[3]||10));o={nid,kind:AKIND[k],apexAlly:true,x:0,y:0,r:Math.max(4,Math.min(40,+a[2]||10)),hp:1,maxHp:1,st:'idle',t:0,ang:0,face:0,flash:0,life:mx,max:mx,walk:rand()*6,flip:false,moving:false,seed:rand()*9,rem:true}}
  else o={nid,kind:k==='w'?'wolf':'thrall',x:0,y:0,r:+a[2]||9,walk:rand()*6,flip:false,moving:false,life:1e9,cd:0,rem:true};
  o._new=true;if(VS)vsAllyNew(r,o,a);r._al.set(nid,o)}
function mpAllyIn(o,d,c){
  const x=d[1],y=d[2],f=d[3]|0;if(o._new){o._new=false;o.x=x;o.y=y}
  o.flip=!!(f&1);
  if(o.pet||o.shade){o.moving=!!(f&2);o.hidden=!!(f&4);o.flash=f&8?.1:0;o.ward=f&16?.2:0;o.rage=!!(f&32);o.inv=f&64?.2:0;if(o.shade)o.life=+d[4]||0;else o.hp=+d[4]||0;o.st=STN[d[5]]||'idle';o.face=(d[6]||0)/100;if(o.st==='charge'||o.st==='lunge')o.ang=o.face;if(!o.minion)o.t=(d[7]||0)/10;o.phase=(d[9]||0)+1;sPush(o,c,x,y,(d[8]||0)/100)}
  else if(o.apexAlly){o.moving=!!(f&2);o.flash=f&8?.1:0;o.st=STN[d[4]]||'idle';o.face=o.ang=(d[5]||0)/100;o.life=(+d[6]||0)/10;if(d[7]!==undefined)o.hp=+d[7]||0;sPush(o,c,x,y,0)}
  else if(o.trophy){o.moving=!!(f&2);o.flash=f&8?.1:0;o.shield=!!(f&256);o.st=STN[d[4]]||'idle';o.face=(d[5]||0)/100;o.t=(d[6]||0)/10;sPush(o,c,x,y,0)}
  else{const s=o._s,n=s?s.length:0;o.moving=n?Math.abs(x-s[n-3])+Math.abs(y-s[n-2])>1:false;if(d[4]!==undefined)o.hp=+d[4]||0;sPush(o,c,x,y,0)}}
function mpOnMe(msg,from){
  const r=MP.rById.get(''+from);if(!r)return;const now=performance.now(),p=msg.p,c=+msg.c||0;clkIn(r._clk,c,now);
  if(Array.isArray(p)){const q=r.P,f=p[3]|0,aw=!!(f&64);
    if(aw!==r.away){r.away=aw;q._s=null;if(aw){r.allies.length=0;r.pshots.length=0}}
    sPush(q,c,+p[0]||0,+p[1]||0,0);sVel(q);if(!q._s||q._s.length<=4){q.x=+p[0]||0;q.y=+p[1]||0;q.vx=q.vy=0}
    q.face=(p[2]||0)/100;q.moving=!!(f&1);q.inv=f&2?.2:0;q.shield=!!(f&16);r.dead=q.down=!!(f&32);r.look.skill0Ready=!!(f&128);q.skCd=f&128?0:1;q.hp=+p[4]||0;q.maxHp=+p[5]||1;q.swing=(p[6]||0)/100;if(p[7]>0)q.atk=p[7]/100;if(p[8]>0)q.dashT=p[8]/100;
    {const v=p[9]|0,pd=!!(v&32);if((v&15)!==q.chS)q.chT=0;q.chS=v&15;q.chC=!!(v&16);q.chN=CHN[r.look.cls||'none'].steps.length;if(pd&&!(q.pdT>0)&&!aw)emit('perfectDodge',{by:r.idx,x:q.x,y:q.y,src:'',slow:0,window:PD.haste,mana:0});q.pdT=pd?.4:0;q.rip=v&64?.4:0}}
  if(msg.rn!==undefined)r.rvN=msg.rn|0;else if(!r.dead)r.rvN=r.rvN|0;
  if(Array.isArray(msg.rv)&&!VS){const who=msg.rv[0]|0,k=+msg.rv[1]||0,now2=performance.now();
    if(who===MP.myIdx){if(k>=100)mpRaised(r.idx);else if(P&&P.down){MP.revBy=k>0?{by:r.idx,k:k/100,at:now2}:null;if(k>0&&(P.rvN|0)<REV.max)MP.note=r.name+' is raising you.'}}
    else{const t=MP.byIdx[who];if(t){t.rev=k>0&&k<100?{by:r.idx,k:k/100,at:now2}:null;if(k>=100){floats.push({x:t.P.x,y:t.P.y-52,txt:'Raised',life:1.4,c:'#7fd66b',big:1.4});rings.push({x:t.P.x,y:t.P.y,life:.6,max:.6,r:90,fx:true});emit('revive',{state:'done',by:r.idx,who,k:1,x:t.P.x,y:t.P.y})}}}}
  if(msg.bm!==undefined){const q=r.P;if(Array.isArray(msg.bm)){q.beam=q.beam||{a:0,len:0,w:14,on:true};q.beam.a=(+msg.bm[0]||0)/100;q.beam.len=Math.max(0,Math.min(1200,+msg.bm[1]||0));q._bm=performance.now()}else q.beam=null}
  if(msg.an)for(const a of msg.an)mpMkAlly(r,a);
  if(msg.a){const out=r.allies,seen=++r._seen;out.length=0;for(const d of msg.a){const o=r._al.get(d[0]);if(!o)continue;o._seen=seen;mpAllyIn(o,d,c);out.push(o)}
    if(r._al.size>out.length)for(const[k,o]of r._al)if(o._seen!==seen)r._al.delete(k);
    for(const o of out)if(o.pet){const b=msg.ab&&msg.ab[o.nid];if(b)beamIn(o,b);else if(o.beam)o.beam=null}}
  if(Array.isArray(msg.hs)){const q=r.P,h=msg.hs;q.blades=Math.max(0,Math.min(6,h[0]|0));q.plates=Math.max(0,Math.min(4,h[1]|0));q.haste=Math.max(0,Math.min(1,(+h[2]||0)/10));q.pack=Math.max(0,Math.min(12,h[3]|0))}
  if(r.away)return;
  if(Array.isArray(msg.pc)){const i=Math.max(0,Math.min(3,msg.pc[0]|0)),x=Math.max(0,Math.min(W,+msg.pc[1]||0)),y=Math.max(0,Math.min(H,+msg.pc[2]||0)),was=r.petCmd&&r.petCmd.cmd;r.petCmd={cmd:PCMD.ids[i],index:i,x,y};
    if(was!==PCMD.ids[i]&&S.mode==='play'){if(!(was===undefined&&!i))floats.push({x:r.P.x,y:r.P.y-64,txt:PCMD.names[i],life:1.4,c:MP.colors[r.idx%MP.colors.length]||'#6fe3ff'});emit('petCommand',{by:r.idx,cmd:PCMD.ids[i],index:i,name:PCMD.names[i],x,y})}}
  if(Array.isArray(msg.rp)&&S.mode==='play'){const x=Math.max(0,Math.min(W,+msg.rp[0]||0)),y=Math.max(0,Math.min(H,+msg.rp[1]||0));floats.push({x,y:y-44,txt:'Riposte',life:.9,c:'#6fe3ff',big:1.4});emit('riposte',{by:r.idx,x,y,id:0,dmg:0,ang:(+msg.rp[2]||0)/100})}
  if(msg.ar&&S.mode==='play')for(const a of msg.ar)if(Array.isArray(a)&&arcs.length<90)arcs.push({x1:+a[0]||0,y1:+a[1]||0,x2:+a[2]||0,y2:+a[3]||0,life:.26,max:.26,col:AX.col.storm,rem:true,foe:!!r.foe});
  if(VS)vsOnMe(r,msg,now,c);else if(msg.s)for(const a of msg.s)if(r.pshots.length<400)r.pshots.push({x:+a[0]||0,y:+a[1]||0,vx:+a[2]||0,vy:+a[3]||0,r:+a[4]||4,kind:PKIND[a[5]]||'bolt',pierce:a[6]|0});
  if(msg.e)for(const a of msg.e){const base=typeof a[3]==='string'&&own(SPEC,a[3])?SPEC[a[3]]:SPEC.crawler,ow=own(CLASSES,a[8])?a[8]:'mage';
    r.echoes.push({ai:AI[a[4]]?a[4]:'mite',s:{...base,ai:AI[a[4]]?a[4]:'mite',col:typeof a[5]==='string'&&/^#[0-9a-f]{6}$/i.test(a[5])?a[5]:base.col,r:Math.max(4,Math.min(60,+a[6]||base.r)),crown:a[7]?1:0},x:+a[0]||0,y:+a[1]||0,ang:(a[2]||0)/100,life:.6,max:.6,owner:ow,col:TCOL[ow]||'#b88cff'});if(r.echoes.length>10)r.echoes.shift()}
  if(S.mode!=='play'||VS)return;
  // a teammate's blasts, fields and shockwaves are shown here as they are there; they do nothing here, except that hallowed ground mends whoever stands on it
  if(msg.z)for(const a of msg.z)if(zones.length<200){const z={x:+a[0]||0,y:+a[1]||0,r:+a[2]||60,t:0,dur:Math.max(.1,(+a[3]||50)/100),mine:true,rem:true,dmg:0};if(a[4]!==undefined){z.sx=+a[4]||0;z.sy=+a[5]||0}zones.push(z)}
  if(msg.f)for(const a of msg.f)if(fields.length<60)fields.push(mpFieldIn(r,a,false));
  if(msg.r)for(const a of msg.r)if(rings.length<300){const l=Math.max(.1,Math.min(2,(+a[3]||40)/100));rings.push({x:+a[0]||0,y:+a[1]||0,life:l,max:l,r:+a[2]||60,fx:true})}
}
function mpOnLook(msg,from){const r=MP.rById.get(''+from);if(!r)return;const k=r.look;k.level=Math.max(0,Math.min(9998,msg.lv|0));k.cls=own(CLASSES,msg.cls)?msg.cls:null;k.adv=k.cls&&CLASSES[k.cls].adv.some(a=>a[0]===msg.adv)?msg.adv:null;k.apex=k.cls&&apexOk(msg.ap)?msg.ap:null;r.P.auraR=k.apex==='order'?ORDR:0;if(k.apex!=='stone')r.P.plates=0;if(k.apex!=='blade')r.P.blades=0;if(k.apex!=='storm')r.P.haste=0;if(k.apex!=='beasts')r.P.pack=0;k.rank=mpTxt(msg.rk,8);
  const w=Array.isArray(msg.pw)?msg.pw:[];k.pw=[!!w[0],!!w[1],!!w[2]];MP.hudKey='';if(VS)vsOnLook(r,msg)}
function mpRemoteStep(r,dt,now){
  const q=r.P,rt=now-r._clk.off-MPDELAY;sAt(q,rt);q.chT+=dt;if(q.atk>0)q.atk-=dt;if(q.dashT>0)q.dashT-=dt;if(q.moving)q.walk+=dt*11;if(q.beam&&now-q._bm>400)q.beam=null;
  for(const a of r.allies){sAt(a,rt);if(a.moving)a.walk+=dt*12;if((a.shade||a.apexAlly)&&a.life>0)a.life-=dt}
  if(VS)return vsRemote(r,dt,now);
  const ps=r.pshots;if(ps.length){let n=0;for(const p of ps){p.x+=p.vx*dt;p.y+=p.vy*dt;let dead=p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL||obstacles.length&&blocked(p);
    if(!dead)for(const m of mons)if(!m.hidden&&p._h!==m&&dist(m,p)<m.r+p.r+3){if(p.pierce>0){p.pierce--;p._h=m}else dead=true;break}
    if(!dead)ps[n++]=p}ps.length=n}
  const es=r.echoes;if(es.length){let n=0;for(const e of es){e.life-=dt;if(e.life>0)es[n++]=e}es.length=n}
}
/* --- the level flow, the same for everyone: class choice -> level -> clear -> each member's own rewards -> all ready -> next level --- */
function mpGo(n,retry){ // host: the level starts for all
  if(MP.role!=='host')return;
  MP.g++;MP.phase='run';MP.lv=n;MP.ready.clear();MP.meReady=false;MP.failT=0;MP.cnt=Math.max(1,MP.members.length);
  {const dv=window.__mb&&window.__mb.over&&window.__mb.over.door;if(dv&&DOOR[dv]&&n>=12)S.door={id:dv,n}}
  nsend({t:'lv',k:'go',n,g:MP.g,cnt:MP.cnt,r:retry?1:0,d:S.door&&S.door.n===n?S.door.id:undefined,o:window.__mb&&window.__mb.over||undefined});
  S.level=n;startLevel(n);if(retry)floats.push({x:W/2,y:H/2-70,txt:'Again.',life:2.2,c:'#ff5b6e'});
}
// called by startLevel on every member, before anything is spawned
function mpSpawnAt(){const n=Math.max(1,MP.slots),i=MP.myIdx%n;P.x=W/2+(i-(n-1)/2)*Math.min(56,420/n);P.safeX=P.x;P.down=false;MP.down=false}
function mpLevelStarted(){
  if(cmdNow()!=='free')MP.pcOut=[PCMD.ids.indexOf(cmdNow()),Math.round(P.x),Math.round(P.y)];else MP.pcOut=[0,0,0];
  MP.mons.clear();MP.q=[];MP.qd.clear();MP.sd=[];MP.ate.clear();MP.moKey='?';MP.wvKey='?';MP.hadAl=true;MP.menu=false;MP.note='';MP.pKey='';MP.rq.length=0;MP.aq.length=0;MP.hsKey='';MP.lkq=[];MP.elq=[];MP.oeq=[];for(const r of MP.remotes)r._dh=undefined;
  if(MP.role==='host'){MP.full=true;MP.wm=0}else{MP.synced=false;boss=null;MP.tSync=0}
  for(const r of MP.remotes){r.pshots.length=0;r.echoes.length=0}
  mpSendMe(performance.now(),true);
}
/* ---------- round 15: co-op. A hero who is down can be raised; a payoff on a setup of another hero is a linked one; a last rite can be joined ---------- */
// Raising: a hero standing within REV.r of an ally who is down for REV.t seconds, without being wounded meanwhile, raises it at REV.hp of its health (untouchable for REV.inv seconds). A hero can be raised
// REV.max times on a floor; after that it waits for the floor to be cleared, as before. The one who raises counts the seconds and tells the others through its `me` message (rv: [member index, percent]; 100 = raised).
const REV={r:66,t:2.6,hp:.4,inv:1.6,max:2};
function mpReviveStep(dt){
  if(!MP.on||VS||!P)return;if(P.down||S.mode!=='play'||MP.away||FN&&FN.state==='play'){if(P.revT>0){P.revT=0;MP.rvOut=[P.revI|0,0]}return}
  let t=null,bd=1e9;for(const r of MP.remotes){if(!r.dead||r.away||(r.rvN|0)>=REV.max)continue;const d=dist(r.P,P);if(d<REV.r&&d<bd){bd=d;t=r}}
  if(!t){if(P.revT>0){P.revT=0;MP.rvOut=[P.revI|0,0];emit('revive',{state:'stop',by:-1,who:P.revI|0,k:0})}return}
  if(P.revI!==t.idx||!(P.revT>0)){P.revI=t.idx;P.revT=0;emit('revive',{state:'start',by:-1,who:t.idx,k:0,x:t.P.x,y:t.P.y})}
  P.revT+=dt;t.rev={by:MP.myIdx,k:Math.min(1,P.revT/REV.t),at:performance.now()};
  if(P.revT>=REV.t){P.revT=0;MP.rvOut=[t.idx,100];t.rvN=(t.rvN|0)+1;t.rev=null;floats.push({x:t.P.x,y:t.P.y-52,txt:'Raised',life:1.4,c:'#7fd66b',big:1.4});rings.push({x:t.P.x,y:t.P.y,life:.6,max:.6,r:90,fx:true});sfx(520,.4,'triangle',.2,1040);haptic([20,30,60]);emit('revive',{state:'done',by:-1,who:t.idx,k:1,x:t.P.x,y:t.P.y})}
  else if(!MP.rvOut||MP.rvOut[1]!==100)MP.rvOut=[t.idx,Math.max(1,Math.min(99,Math.round(P.revT/REV.t*100)))];
}
// an ally has raised me
function mpRaised(by){
  if(!P||!P.down||S.mode!=='play'||VS||(P.rvN|0)>=REV.max)return false;const r=MP.byIdx[by];
  P.down=false;MP.down=false;P.rvN=(P.rvN|0)+1;P.hp=Math.max(1,Math.ceil(P.maxHp*REV.hp));P.inv=REV.inv;P.mana=Math.min(P.mana,manaRoom());MP.note='';MP.revBy=null;
  floats.push({x:P.x,y:P.y-52,txt:r?'Raised by '+r.name:'You are raised',life:1.8,c:'#7fd66b',big:1.4});rings.push({x:P.x,y:P.y,life:.6,max:.6,r:90,fx:true});SND.skill('healer');haptic([20,30,60]);
  if(S.adv==='beastmaster')allies.push(ally('wolf'));fieldPets(true);hud();emit('revive',{state:'done',by,who:-1,k:1,x:P.x,y:P.y,left:REV.max-P.rvN});mpSendMe(performance.now(),true);return true;
}
// what MB.revive hands out in co-op: {r, t, max, me:{down, by, k, left}, allies:[{idx, name, x, y, k, by, can}], mine:{idx, k}|null}
function reviveInfo(){
  if(!MP.on||VS||!P)return null;const now=performance.now(),rb=MP.revBy&&now-MP.revBy.at<600?MP.revBy:null;
  return{r:REV.r,t:REV.t,max:REV.max,me:{down:!!P.down,by:rb?rb.by:-1,k:rb?rb.k:0,left:Math.max(0,REV.max-(P.rvN|0))},
    allies:MP.remotes.filter(r=>r.dead&&!r.away).map(r=>{const v=r.rev&&now-r.rev.at<600?r.rev:null;return{idx:r.idx,name:r.name,x:r.P.x,y:r.P.y,k:v?v.k:0,by:v?v.by:-1,can:(r.rvN|0)<REV.max}}),
    mine:P.revT>0?{idx:P.revI|0,k:Math.min(1,P.revT/REV.t)}:null};
}
function mpRise(){if(P&&P.down){P.down=false;MP.down=false;P.hp=P.maxHp;P.inv=0;MP.note='';floats.push({x:P.x,y:P.y-52,txt:'You rise',life:1.6,c:'#7fd66b'});hud()}}
function mpCleared(){ // host: the boss is dead (called from hurtM)
  MP.phase='gate';MP.lv=S.level+1;MP.ready.clear();MP.meReady=false;MP.gateT=performance.now();MP.failT=0;MP.menu=false;
  nsend({t:'lv',k:'clear',n:S.level,g:MP.g});mpRise();
}
function mpOnLevel(msg,from){
  if(MP.role==='host'||from!==undefined&&from!==null&&''+from!==MP.hostId)return;
  const n=Math.max(8,Math.min(9998,msg.n|0));
  if(msg.k==='door'){if(own(DOOR,msg.d)){S.door={id:msg.d,n};const d=DOOR[msg.d];MP.toast='The host chose '+d.title+'. '+d.risk+' '+d.reward;MP.toastT=performance.now()+9000;MP.hudKey='';if(MP.meReady)save(S.level)}return} // the host's choice at a crossroads
  if(msg.k==='go'){
    if(own(DOOR,msg.d))S.door={id:msg.d,n};else if(S.door&&S.door.n===n)S.door=null;
    MP.g=msg.g|0;MP.phase='run';MP.lv=n;MP.cnt=Math.max(1,Math.min(8,msg.cnt|0||MP.members.length));MP.over=msg.o&&typeof msg.o==='object'?msg.o:null;MP.ready.clear();
    if(MP.meReady||S.mode==='play'||S.mode==='clear'){MP.meReady=false;S.level=n;startLevel(n);if(msg.r)floats.push({x:W/2,y:H/2-70,txt:'Again.',life:2.2,c:'#ff5b6e'})}
    // otherwise I am still choosing: mpReady takes me into the fight when I am through
  }else if(msg.k==='clear'){
    MP.phase='gate';MP.lv=n+1;MP.g=msg.g|0;MP.ready.clear();MP.gateT=performance.now();
    if(S.mode==='play'&&S.level===n){
      const b=boss;MP.menu=false;if(b)puff(b,col(b.s.col),50,320);MP.mons.clear();
      mons=[];shots=[];pshots=[];zones=[];fields=[];boss=null;S.mode='clear';S.clearT=1.2;S.shake=.4;SND.bossDeath();haptic([60,40,220]);mpRise();if(TR&&!TR.cleared){TR.cleared=true;TR.failed=false;emit('trial',{kind:TR.kind,state:'clear'})}if(FN){finEv(FN.state==='play'?'end':'gone');FN=null}dareClose();gradeMake();emit('bossdead',{level:S.level,time:ST.levelTime,cls:S.cls});
    }else if(S.mode==='reward'&&!MP.meReady&&S.cls&&n>=8&&S.level<=n&&MP.owe.length<8&&!MP.owe.includes(n))MP.owe.push(n); // the party cleared a floor while I was still choosing: its rewards are owed to me (see mpReady)
  }
}
// a member is through with its choices (every reward screen ends in begin(n), which comes here)
function mpReady(n){
  // floors the party cleared while I was on my reward screens: their rewards come now, one floor after the other, before I join the others
  while(MP.owe.length){const f=MP.owe.shift();if(f<S.level||!S.cls||!P)continue;S.level=f;S.L=levelDef(f);S.L.door=S.door&&S.door.n===f?S.door.id:null;MP.toast='Floor '+(f+1)+' was cleared while you chose. Its rewards are yours.';MP.toastT=performance.now()+6000;MP.hudKey='';return reward()}
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
  show({soft:true,kick:'Co-op · '+(MP.phase==='pick'?'the party gathers':'floor '+MP.lv+' is cleared'),title:n?'Waiting for '+n+(n>1?' players':' player'):'Starting',
    body:n?'Still choosing: '+wait.map(m=>m.name).join(', ')+'.':'Everyone is ready.',
    keys:host?(late&&n?'You can start now. Whoever is still choosing joins the fight when they are through.':n?'The floor starts when everyone is ready. After a minute you can start without them.':''):'The floor starts when everyone is ready.',
    btns:host&&late&&n?[['Start without them',()=>mpGo(MP.phase==='pick'?S.level:MP.lv)]]:null});
}
/* --- down, and the fight lost --- */
function mpDown(){
  P.hp=0;P.down=true;MP.down=true;P.inv=0;P.moving=false;P.dashT=0;P.atk=0;P.vx=P.vy=0;P.stormT=P.fireT=P.renewT=0;P.cutN=P.starN=P.quakeN=0;P.rushHit=null;P.rushD=0;
  ST.deaths++;SND.dead();for(const a of allies)puff(a,'#e7dfcd',6);allies=[];TSRC=[];fields=fields.filter(f=>f.rem);
  for(const k in keys)keys[k]=false;want.atk=want.dash=want.skill=false;want.pt=null;
  floats.push({x:P.x,y:P.y-52,txt:'You are down',life:2.5,c:'#ff5b6e'});MP.note=(P.rvN|0)<REV.max&&!VS?'You are down. An ally who stands by you for a moment can raise you.':'You are down. You rise when the floor is cleared.';P.revT=0;hud();emit('revive',{state:'down',by:-1,who:-1,k:0,x:P.x,y:P.y,left:Math.max(0,REV.max-(P.rvN|0))});
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
  MP.toast=m.name+' left the game';MP.toastT=performance.now()+4000;MP.hudKey='';if(VS)return vsLeft(m);mpWait();mpGate();
}
/* --- the menu (there is no pause in a shared fight), the party list, the saved character --- */
function mpMenu(){
  if(MP.menu)return mpMenuClose();
  MP.under=lastScreen;MP.menu=true;for(const k in keys)keys[k]=false;joy.x=joy.y=0;mpMenuShow();
}
function mpMenuClose(){
  if(!MP.menu)return;MP.menu=false;lastScreen=MP.under;MP.under=null;
  if(VS)return vsScreen();
  if(MP.meReady&&MP.phase!=='run')return mpWait();
  if(S.mode==='play'||S.mode==='clear'||!lastScreen)$('ov').hidden=true;else show(lastScreen);
}
function mpMenuShow(){
  if(VS)return vsMenuShow();
  const inLv=S.mode==='play'||S.mode==='clear',host=MP.role==='host',btns=[[inLv?'Back to the fight':'Back',mpMenuClose]];
  if(S.cls&&act2()&&(learned().length>NSK||altOpen(0,0)))btns.push(['Skills',()=>loadout(mpMenuShow)]);
  if(S.cls&&act2()&&frBudget()>0)btns.push(['Frame'+(frLeft()?' ('+frLeft()+')':''),()=>frameScreen(mpMenuShow)]);
  if(S.cls&&act2()&&S.eq)btns.push(['Equipment',()=>gearScreen(mpMenuShow)]);
  if(S.cls&&form()&&act2())btns.push([cap1(tw().pl),()=>petsScreen(mpMenuShow)]);
  if(typeof MB.openTower==='function')btns.push(['The climb',()=>hook('openTower',mpMenuShow)]);
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',mpMenuShow)]);
  btns.push(['Leave the game',()=>show({mpMenu:true,kick:'Co-op',title:'Leave the game?',body:host?'You are the host. If you leave, the game ends for everyone.':'The others fight on without you. Your character is kept for your next co-op game.',btns:[['Stay',mpMenuShow],['Leave',mpLeave]]},true)]);
  show({mpMenu:true,soft:inLv,kick:'Co-op · '+MP.members.length+(MP.members.length>1?' players':' player')+' · floor '+(S.level+1)+(S.rank?' · rank '+S.rank:''),title:inLv?'The fight goes on':'Co-op',
    body:(inLv?'There is no pause in a shared fight: the monsters do not wait. ':'')+(host?'You are the host.':'Hosted by '+((MP.members.find(m=>m.id===MP.hostId)||{}).name||'another player')+'.'),keys:matchMedia('(pointer:coarse)').matches?'':'Esc closes this.',btns},true);
}
function mpLeave(){const N=window.MBNet;try{if(N&&typeof N.leave==='function')N.leave()}catch(e){}mpEnd('left')}
function mpHidden(h){MP.away=!!h;if(MP.on&&P)mpSendMe(performance.now(),true)}
function mpSave(n){if(VS)return;try{localStorage.setItem('marrowborn.mp.run',JSON.stringify(snapshot(n)))}catch(e){}}
function mpSaved(){try{const r=checkSave(JSON.parse(localStorage.getItem('marrowborn.mp.run')||'null'));return r&&r.cls&&r.level>=8?r:null}catch(e){return null}}
// the class choice of a co-op game: the character of your last co-op game can walk in again as it was
function mpPickCards(){
  const r=mpSaved();if(!r)return[];const c=CLASSES[r.cls],name=r.adv?c.adv.find(a=>a[0]===r.adv)[1]:c.name;
  return[{title:'Return as your '+name,sub:'Your last co-op character · reached floor '+(r.level+1)+(r.apex?' · '+APEX[r.apex].title:''),col:'var(--gold)',body:'Everything it had: its boons, its equipment, its skills'+(r.pets.length?' and what it took from '+r.pets.length+(r.pets.length>1?' bosses':' boss'):'')+'. '+(MP.role==='host'?'The party starts on floor '+(r.level+1)+'.':'The host decides which floor the party starts on.'),
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
  if(VS)return vsHud(el,now);
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
  if(VS)return vsFrame(dt,now);
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
      if(r.P.auraR>0&&!r.dead)drawAura(r.P);if(r.P.beam)drawBeamP(r.P);if(r.look.apex&&!r.dead)drawApxHero(r.P,r.look.apex);
      for(const a of r.allies){if(a.shade){drawShade(a);continue}if(a.apexAlly){drawApxAlly(a);continue}if(a.pet){drawPet(a);const b=a.beam;if(b&&!a.hidden){ctx.lineCap='round';for(const q of b.rays){const ex=a.x+Math.cos(q.a)*q.len,ey=a.y+Math.sin(q.a)*q.len;ctx.strokeStyle=b.on?'#8fd3ff':'rgba(143,211,255,.7)';ctx.lineWidth=b.on?b.w*1.4:2;line(a.x,a.y,ex,ey)}}}else if(a.trophy)drawTrophy(a);else drawAlly(a)}
      if(r.echoes.length)drawEchoes(r.echoes);continue}
    const P0=P,c0=S.cls,a0=S.adv,l0=S.level;DR=r;P=r.P;S.cls=r.look.cls;S.adv=r.look.adv;S.level=Math.max(8,r.look.level);
    try{drawPlayer()}finally{P=P0;S.cls=c0;S.adv=a0;S.level=l0;DR=null;ctx.globalAlpha=1}
    const q=r.P,c=VS?VS.colors[r.idx]:MP.colors[r.idx%MP.colors.length];ctx.textAlign='center';ctx.font='700 13px Rajdhani,"Barlow Condensed","Arial Narrow",sans-serif';ctx.fillStyle='#0d0c11';ctx.fillText(r.name,q.x+1,q.y-49);ctx.fillStyle=c;ctx.fillText(r.name,q.x,q.y-50);
    if(!r.dead){ctx.fillStyle='rgba(13,12,17,.8)';ctx.fillRect(q.x-17,q.y-46,34,5);ctx.fillStyle=c;ctx.fillRect(q.x-16,q.y-45,32*Math.max(0,Math.min(1,q.hp/(q.maxHp||1))),3)}
  }
}
const mpShots=[];function mpAllPshots(){mpShots.length=0;for(const p of pshots)mpShots.push(p);for(const r of MP.remotes)if(!r.away)for(const p of r.pshots)mpShots.push(p);return mpShots}
/* --- begin and end --- */
let mpWired=false;
function mpWire(){
  const N=window.MBNet;if(mpWired||!N||typeof N.on!=='function')return;mpWired=true;
  const H={w:mpOnWorld,me:mpOnMe,lk:mpOnLook,hit:mpOnHit,lv:mpOnLevel,rdy:mpOnReady,sync:()=>{if(MP.role==='host')MP.full=true},
    vs:vsOnHost,vr:vsOnReady,vd:vsOnDown,vk:vsOnDirect,vh:vsOnHurt,vc:vsOnCreature,
    'net:leave':m=>mpLeft(m&&m.id),'net:host':m=>{if(MP.role!=='host'&&(!m||''+m.id!==MP.hostId||m.left))mpEnd('The host left the game.')},'net:end':m=>mpEnd(m&&typeof m.reason==='string'&&m.reason?m.reason:'ended')};
  for(const k in H)try{N.on(k,(m,from)=>{if(!MP.on)return;try{H[k](m||{},from)}catch(e){console.error('Ashes to Apex multiplayer: "'+k+'" failed',e)}})}catch(e){}
}
function mpBegin(cfg){
  cfg=cfg&&typeof cfg==='object'?cfg:{};if(MP.on)mpEnd();mpWire();
  const N=window.MBNet||{},my=''+(cfg.myId!==undefined&&cfg.myId!==null?cfg.myId:N.id!==undefined?N.id:'me'),mem=[];
  for(const m of Array.isArray(cfg.members)?cfg.members.slice(0,8):[])if(m&&m.id!==undefined&&!mem.some(x=>x.id===''+m.id))mem.push({id:''+m.id,name:mpName(m.name),idx:mem.length});
  if(!mem.some(m=>m.id===my))mem.push({id:my,name:'You',idx:mem.length});
  const host=''+(cfg.hostId!==undefined&&cfg.hostId!==null?cfg.hostId:N.hostId!==undefined?N.hostId:mem[0].id);
  Object.assign(MP,{on:true,role:host===my?'host':'client',mode:'coop',myId:my,hostId:host,members:mem,count:mem.length,slots:mem.length,cnt:mem.length,myIdx:mem.find(m=>m.id===my).idx,seed:cfg.seed,down:false,away:!!document.hidden,
    phase:'pick',g:0,lv:8,meReady:false,gateT:0,waitLate:false,failT:0,full:false,wm:0,synced:false,over:null,menu:false,under:null,note:'',toast:'',toastT:0,hudKey:'',pKey:'',lookKey:'',hadAl:false,swung:false,dashed:false,atk0:0,dash0:0,
    tMe:0,tW:0,tQ:0,tSi:0,tOb:0,tHud:0,tSync:0,tLook:0,tSent:0,tick:0,seen:0,hStamp:-1,lastF:performance.now(),moKey:'?',wvKey:'?',q:[],sd:[],rq:[],aq:[],hsKey:''});
  MP.remotes.length=0;MP.rById.clear();MP.byIdx.length=0;MP.owe.length=0;MP.ready.clear();MP.mons.clear();MP.qd.clear();MP.ate.clear();MP.hclk.off=1e18;MP.heroes.length=0;
  for(const m of mem)if(m.id!==my){const r=mkRemote(m);MP.remotes.push(r);MP.rById.set(m.id,r);MP.byIdx[m.idx]=r}
  // a co-op run begins at the class choice, whole, and never touches the single-player save
  beginTok++;S.paused=false;const pb=$('pauseB');if(pb){pb.setAttribute('aria-pressed','false');pb.textContent='Menu'}S.stop=0;S.wave=null;
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];morsels=[];echoes=[];TSRC=[];obstacles=[];boss=null;
  if(cfg.mode==='versus')vsBegin(cfg);else{newRun();stReset();chooseClass();freshBody();hud()}$('bossName').textContent='—';
  mpHudMake();if(!MP.timer)MP.timer=setInterval(mpBack,250);
  mpSendMe(performance.now(),true);emit('mp',{on:true});return true;
}
function mpEnd(reason){
  if(!MP.on)return false;const wasVs=VS;if(VS)vsEnd();MP.on=false;MP.menu=false;MP.down=false;MP.away=false;MP.meReady=false;MP.phase='pick';REM=null;DR=null;
  if(MP.timer){clearInterval(MP.timer);MP.timer=0}if(MP.hud){MP.hud.remove();MP.hud=null}
  MP.remotes.length=0;MP.rById.clear();MP.byIdx.length=0;MP.members=[];MP.count=1;MP.cnt=1;MP.ready.clear();MP.mons.clear();MP.q=[];MP.qd.clear();MP.heroes.length=0;
  const pb=$('pauseB');if(pb)pb.textContent='Pause';S.stop=0;
  // back to the single-player run as it is stored (multiplayer never wrote to it)
  let saved=storedLevel(),r={};try{r=JSON.parse(localStorage.getItem('marrowborn.run')||'{}')||{}}catch(e){}
  applyRun(r,saved);title(saved);emit('mp',{on:false});
  // net.js gives a short code for why it ended; anything else is shown as it is
  const why={'host-left':'The host left the game.',disconnected:'The connection to the game was lost.',kicked:'You were removed from the game.',ended:'The host ended the game.'};
  if(typeof reason==='string'&&reason&&reason!=='left'&&!(wasVs&&reason==='ended'))show({kick:wasVs?'Versus':'Co-op',title:'The game is over',body:why[reason]||mpTxt(reason,200),btns:[['Back to the title',titleShow]]},true);
  return true;
}
MP.begin=mpBegin;MP.end=mpEnd;

/* ---------- versus: hero against hero over the same relay (MB.mp.vs). Everything here is off unless VS ---------- */
// cfg: {mode:'versus', vs:{format:'ffa'|'teams', floor, wins, time}, members:[{id,name,team}], hostId, myId}. Everyone fights with a seasoned hero of the same floor (seasonedRun), never saved anywhere.
// Flow: pick (class, upgrade past floor 50, apex path past 100) -> countdown 3 s -> fight (time) -> sudden (a ring closes on the centre) -> over (scoreboard, a few seconds) -> the next round ... -> results -> the lobby.
// The host runs the clock, the phases, the score and the round results (it trusts the 'I am down' reports). Nothing else is the host's.
//
// Who decides a hit: THE VICTIM. Each member simulates its own hero and its own creatures, and tests them against what the hostile members replicate:
//   bolts (me.s, with their damage), melee swings and lunges (me.v: origin, angle, reach, arc), shockwaves (me.r with a damage), blasts (me.z), fields (me.f), the ring of light and the Verdict beam (lk.au, me.bm),
//   and their creatures: a pet's touch, charge and beam, a thrall's bite (the creature's blows come with it: an[13], lk.tb).
//   Time: a hostile hero and its creatures are drawn MPDELAY (100 ms) in the past, between two samples, exactly as remote bodies are in co-op. Everything that hero does is resolved in that same delayed picture:
//   a swing, a lunge or a shockwave is tested when the drawn hero reaches the moment it happened (sender's clock + MPDELAY), against where MY hero stands at that moment. A bolt is not held back: it flies from where
//   it was loosed, in real time, as a teammate's bolts do in co-op (holding it back as well would put a quarter of a second between an aim and its result). Blasts and fields are telegraphed and start when they arrive.
//   So what you see is what can hit you, and a dash, a blink or any invulnerability of yours counts at the moment of the test. The attacker pays for the delay: what it aims at is 100 ms and the network's delay old.
//   To make up for that the stand-in of a hostile hero (what auto-aim, skills and pets aim at) is put VSK.lead seconds ahead of the drawn hero along its motion.
//   On the attacker's screen its own bolts stop at what they seem to hit (a guess for the eye only).
//   Attacks without a shape (a blow on "the nearest", chain lightning, a drain, marks, poisons, stuns, pulls, a trophy's bite) are sent to the victim as they are ('vk'), and the victim applies them unless it cannot be hurt just then.
// How it is wired into the game: the hostile heroes and creatures stand in `mons` as stand-ins (m.vs), so aiming, skills, pets, familiars and trophies find them with the code they always used. hurtM and the m* helpers
//   hand a stand-in to this section: inside GEO (an attack with a shape) nothing is sent, the victim works it out; outside GEO it becomes a 'vk' op. MB.mons is empty in versus: the stand-ins are not for drawing.
//
// THE conversion: a blow of raw damage D (the number a monster would take) costs a hero  D / GREF(n) x PHP(n) x VSK.K  health (n: the match's floor), times the attacker's and the victim's class factor (VSK.cls, all 1 unless tuned),
//   halved by a stone skin, half again as much on a marked hero, and never more than VSK.cap of the victim's health in one blow. Creatures' blows on heroes go through the same rule.
//   Creature against creature: the raw number comes off the creature's health as it is (the pets' own rule). A hero's blow on a creature: the same, times VSK.cre.
// Versus-only rules (VRULES says them on the pick screen): healing at VSK.heal; no more than VSK.inv seconds untouchable at a stretch (then VSK.invRest seconds in which nothing protects); a stun or a slow lasts VSK.cc at most
//   and then none takes hold for VSK.ccImm; fallen pets stay down for the round; thralls and wolves have health (VSK.thr / VSK.wolf of GREF); a blow that was shrugged off or blocked gives no further protection but itself, and a shield blocks one blow in VSK.shield seconds at most.
//
// Messages:
//  vs  host -> all: {t,k:'go',n} round n starts | {t,k:'s',ph,n,tl (seconds left x10),w (winner team or -1),sc:[[rounds,kills,dmg,flags 1 down 2 left]...]} four times a second and at once on a change | {t,k:'bye'} back to the lobby
//  vr  member -> all: {t,ok:1,cls,adv,ap} my fighter is chosen | {t,ok:0} I am choosing again
//  vd  member -> all: {t,by,n} I am down in round n (by: member index, -1 the ring)
//  vk  attacker -> the victim's owner: {t,n,l:[op...]}: ['d',member,nid (0 the hero),raw] | ['db',member,nid,slow,stun,dot per tick,mark] | ['vn',member,nid,raw per tick] | ['mv',member,nid,x,y]
//  vh  victim -> all, 6 Hz at most: {t,l:[[by,health lost,nid]...]} for the score and the attacker's numbers
//  vc  owner -> all: {t,by,k,ai,x,y,r,nm} one of my creatures died (the Tithe rises from it for the member that killed it)
//  me  in versus also: v:[['s',x,y,angle x100,reach,arc x100,raw] a swing | ['r',x,y,angle x100,length,raw,stun] a lunge], r:[[x,y,r,life,raw]] a shockwave that hurts, s:[...,raw,flags (1 explodes 2 slows 4 stuns 8 doubles past
//      200 px 16 burns around 32 a creature's),boom raw,slow,stun], z:[x,y,r,dur,sx|-1,sy|-1,raw,stun], f:[...,raw per tick,slows], bm:[angle,length,raw], an: a pet's row ends with its three blows, a thrall's with its health
//  lk  in versus also: au:[radius,raw per tick] the ring of light, tb: a thrall's bite (raw)
const VFLOORS=[11,31,51,101,151],VNONE=[];
// round 11, counterplay: dodge: for this long after a dash or a blink starts, bolts, arrows, spears and orbs pass through you (a dash already shrugs off everything for its first quarter second; this is the window to close on someone who shoots).
// shootSlow: a hero who fights at range moves at this share of its speed while it looses a bolt (the moment of the cast), so shooting on the run costs ground. rally: the hero with less of its health left takes less from the one with more:
// a blow is multiplied by 1 + rally x (victim's share of health - attacker's share), so a fight that is being lost can still turn.
// round 13, spur / spurT: a hero who fights hand to hand (fighter, tank, assassin) and is struck by a shot moves at `spur` times its speed for spurT seconds: shooting at it is what lets it close.
// braceN, braceT, brace, braceK: the braceN-th blow within braceT seconds braces you: for `brace` seconds every blow does braceK of its damage (many small hits in a row are worth less than they look; one heavy blow is not).
const VSK={K:1.5,kf:1,cap:.35,heal:.5,inv:1.5,invRest:1,cc:1,ccImm:2,cre:2.5,shield:3,thr:.05,wolf:.1,lead:.15,count:3,over:5,pick:45,ringT:30,ring0:570,ringD:.08,dodge:.45,braceN:3,braceT:1.2,brace:1.5,braceK:.6,shootSlow:.6,rally:.8,spur:1.3,spurT:1.5,
  cls:{},dev:false};
// VCLS: per hero level, k (the level's own factor on the conversion) and the factors of every build [what its blows on heroes are multiplied by, what the blows it takes are multiplied by].
// A build is the class, with its upgrade past floor 50 and its apex path past 100. Found with the versus bots (r9-sim/tuneb.js: every build near 50% over all opponents, a mirror match near 30 s);
// each column has a geometric mean of 1, so K x k is the conversion for an average build.
const VCLS={
 11:{k:0.87,
  'fighter':[0.63,0.77],'tank':[0.51,0.99],'assassin':[0.54,0.78],'mage':[1.16,0.8],'ranger':[1.78,1.0],'healer':[1.34,1.66],'necro':[2.07,1.25]},
 31:{k:3.17,
  'fighter':[0.5,0.6],'tank':[0.64,1.03],'assassin':[0.64,0.87],'mage':[1.47,0.8],'ranger':[1.54,0.7],'healer':[1.39,1.68],'necro':[1.57,1.98]},
 51:{k:2.37,
  'fighter/champion':[0.5,0.64],'fighter/duelist':[0.58,0.56],'tank/paladin':[1.01,1.25],'tank/berserker':[0.62,0.84],'assassin/nightblade':[0.49,1.05],'assassin/phantom':[0.65,1.38],'mage/archmage':[1.65,0.75],'mage/pyromancer':[1.8,0.76],'ranger/sharpshooter':[1.41,0.61],'ranger/beastmaster':[2.11,0.48],'healer/saint':[0.88,2.01],'healer/inquisitor':[0.56,1.69],'necro/lich':[2.0,1.95],'necro/reaper':[2.0,1.65]},
 101:{k:4.08,
  'fighter/champion/order':[0.59,0.62],'fighter/champion/dominion':[1.01,0.49],'fighter/duelist/order':[0.74,0.61],'fighter/duelist/dominion':[1.19,0.49],'tank/paladin/order':[0.88,1.0],'tank/paladin/dominion':[1.33,0.73],'tank/berserker/order':[0.52,0.68],'tank/berserker/dominion':[0.91,0.5],'assassin/nightblade/order':[0.6,1.53],'assassin/nightblade/dominion':[0.84,1.22],'assassin/phantom/order':[0.71,2.03],'assassin/phantom/dominion':[0.89,2.02],'mage/archmage/order':[0.79,1.01],'mage/archmage/dominion':[0.85,0.58],'mage/pyromancer/order':[0.91,1.03],'mage/pyromancer/dominion':[0.93,0.63],'ranger/sharpshooter/order':[1.07,0.9],'ranger/sharpshooter/dominion':[1.5,0.52],'ranger/beastmaster/order':[1.7,1.24],'ranger/beastmaster/dominion':[1.94,0.75],'healer/saint/order':[1.21,2.02],'healer/saint/dominion':[1.67,1.39],'healer/inquisitor/order':[0.86,1.87],'healer/inquisitor/dominion':[1.16,1.21],'necro/lich/order':[1.62,1.77],'necro/lich/dominion':[1.09,1.99],'necro/reaper/order':[0.91,1.14],'necro/reaper/dominion':[1.14,1.38]},
 151:{k:4.78,
  'fighter/champion/order':[0.54,0.78],'fighter/champion/dominion':[0.85,0.51],'fighter/duelist/order':[0.74,0.8],'fighter/duelist/dominion':[1.12,0.52],'tank/paladin/order':[0.79,1.02],'tank/paladin/dominion':[1.28,0.74],'tank/berserker/order':[0.5,0.65],'tank/berserker/dominion':[0.85,0.48],'assassin/nightblade/order':[0.61,1.28],'assassin/nightblade/dominion':[0.89,1.0],'assassin/phantom/order':[0.71,1.83],'assassin/phantom/dominion':[0.97,1.77],'mage/archmage/order':[0.76,1.08],'mage/archmage/dominion':[0.83,0.64],'mage/pyromancer/order':[0.79,1.06],'mage/pyromancer/dominion':[0.84,0.64],'ranger/sharpshooter/order':[1.23,1.03],'ranger/sharpshooter/dominion':[1.73,0.59],'ranger/beastmaster/order':[1.68,1.17],'ranger/beastmaster/dominion':[1.6,0.67],'healer/saint/order':[0.64,2.5],'healer/saint/dominion':[1.29,2.08],'healer/inquisitor/order':[0.59,2.49],'healer/inquisitor/dominion':[0.99,1.74],'necro/lich/order':[2.42,1.21],'necro/lich/dominion':[2.51,0.76],'necro/reaper/order':[1.15,1.2],'necro/reaper/dominion':[2.13,1.09]},
};
const VRULES=['Every blow is scaled to a hero\'s health, and no single blow takes more than '+Math.round(VSK.cap*100)+'% of it.',
  'Healing and lifesteal work at half strength.',
  'Nothing keeps you untouchable for more than '+VSK.inv+' seconds at a stretch.',
  'A stun or a slow lasts '+VSK.cc+' second at most. After it, none takes hold for '+VSK.ccImm+' seconds.',
  'A pet that falls stays down until the next round. Thralls and wolves can be killed. A hero\'s blows count '+VSK.cre+' times on creatures.',
  'A shield blocks one blow every '+VSK.shield+' seconds at most, and a blocked blow protects from nothing else.',
  'For '+VSK.dodge+' seconds after a dash or a blink, bolts and arrows pass through you.',
  'Loosing a bolt, an arrow, a spear or an orb slows your step for the moment of the cast.',
  'Spur: a bolt, an arrow, a spear or an orb that lands on a hero who fights hand to hand spurs it on: '+Math.round((VSK.spur-1)*100)+'% faster for '+VSK.spurT+' seconds.',
  'The hero with less health left is hurt less by the one with more, by up to '+Math.round(VSK.rally*100)+'%.',
  'The '+['','','second','third','fourth','fifth'][VSK.braceN]+' blow within '+VSK.braceT+' seconds braces you: for '+VSK.brace+' seconds blows do '+Math.round((1-VSK.braceK)*100)+'% less.',
  'How many fight for you is limited by your mana and by nothing else.',
  'Trophies and their echoes strike heroes. The Owed rise from enemy creatures that die, not from heroes.',
  'Pack-beasts, ice-wights and cinders can be killed. Chill, shock and a drenching slow or stop a hero as any slow or stun does; rot and fire are poisons.',
  'When the clock runs out, a ring of fire closes on the centre: sudden death.'];
const vsLive=()=>VS.phase==='fight'||VS.phase==='sudden';
// the factors of a build: by class, upgrade and apex path; [1,1] where none is listed
// (a path of round 10 fights with the factors of the old path of its side, times its own pair in VPATH)
const VPATH={beasts:[1.1,.95],frost:[1.1,.95],plague:[.92,1.05],flame:[.7,1.15],storm:[.95,1.05],stone:[1,1.1],blade:[1,1],tide:[1.05,.97]};
const vsF=(c,a,x)=>{const T=VSK.cls,k=c+(a?'/'+a:'');let f=T[k+(x?'/'+x:'')];if(!f&&x&&APEX[x]&&VPATH[x]){const b=T[k+'/'+APEX[x].side],p=VPATH[x];if(b)f=[b[0]*p[0],b[1]*p[1]]}return f||T[c]||VF1},VF1=[1,1];
const vsHead=()=>'Versus · '+(VS.format==='teams'?'teams':'free-for-all')+' · heroes of floor '+VS.floor+' · first to '+VS.wins+(VS.wins>1?' rounds':' round')+' · '+VS.time+' s a round';
const vsSide=team=>{const t=VS.teams.find(x=>x.team===team);return t?t.name:'Nobody'};
const vsFighter=s=>{const c=s.cls&&CLASSES[s.cls];if(!c)return'';return(s.adv&&(c.adv.find(a=>a[0]===s.adv)||[0,c.name])[1]||c.name)+(s.apex&&APEX[s.apex]?' · '+APEX[s.apex].title:'')};
function vsTeams(){const T=[];for(const s of VS.score){let t=T.find(x=>x.team===s.team);if(!t)T.push(t={team:s.team,name:VS.format==='teams'?'Team '+'AB'[s.team]:s.name,rounds:0,alive:0,n:0});t.rounds=Math.max(t.rounds,s.rounds);if(!s.left){t.n++;if(!s.down)t.alive++}}VS.teams=T;return T}
// the stand-in of a hostile hero among the monsters: what the hero's own attacks, pets and trophies aim at
const vsProxy=r=>({vs:true,hero:true,own:r,nid:0,id:'h'+r.idx,kind:'hero',s:{name:r.name,col:'#e7dfcd',r:11,eyes:2},ai:'mite',x:W/2,y:H/2,r:11,hp:1,maxHp:1,boss:true,st:'idle',t:1,n:0,flash:0,ring:0,hidden:false,lift:0,mods:[],ward:0,beam:null,vx:0,vy:0,decoy:false,seed:0});
/* --- begin and end --- */
function vsBegin(cfg){
  const o=cfg.vs&&typeof cfg.vs==='object'?cfg.vs:{},teams=o.format==='teams',fl=Math.floor(+o.floor)||11;let floor=11;for(const f of VFLOORS)if(fl>=f)floor=f;
  const wins=Math.max(1,Math.min(9,Math.floor(+o.wins)||3)),time=Math.max(5,Math.min(600,+o.time||90)),cm=Array.isArray(cfg.members)?cfg.members:[];
  MP.mode='versus';
  if(!VSK.dev){VSK.cls=VCLS[floor]||{};VSK.kf=VSK.cls.k||1} // the factors of this hero level (dev: a test has set its own)
  for(const m of MP.members){const s=cm.find(x=>x&&''+x.id===m.id)||{};m.team=teams?(s.team===0||s.team===1?s.team:m.idx%2):m.idx}
  const me=MP.members.find(m=>m.id===MP.myId),n=floor-1;
  VS=MP.vs={format:teams?'teams':'ffa',floor,wins,time,round:0,phase:'pick',t:VSK.pick,ring:null,
    score:MP.members.map(m=>({id:m.id,name:m.name,team:m.team,idx:m.idx,rounds:0,kills:0,dmg:0,down:false,left:false,cls:null,adv:null,apex:null})),
    myTeam:me.team,myIdx:me.idx,winner:null,teams:[],colors:MP.members.map(m=>teams?MP.teamColors[m.team]:MP.colors[m.idx%MP.colors.length]),teamColors:MP.teamColors,rules:VRULES};
  VP={n,k:PHP(n)/GREF(n),pick:null,ready:new Set(),mine:false,hold:true,frozen:true,scr:'',q:[],ev:[],dm:new Map(),tVh:0,tVs:0,tFl:0,sid:1,invRun:0,invBlk:0,ringK:0,last:-1,lastT:-9,lastTeam:-1,shAt:-9,t0:performance.now(),late:false,forced:false,final:false,fl:0,hudT:0,hurtT:0};
  for(const r of MP.remotes){const m=MP.members.find(x=>x.id===r.id);r.team=m.team;r.foe=m.team!==me.team;r._ev=[];r.hx=r.foe?vsProxy(r):null}
  vsTeams();
  if(!$('vsCss')){const st=document.createElement('style');st.id='vsCss';st.textContent=`
:where(#ovExtra){margin:.4em 0}:where(.vsScroll){overflow-x:auto}
:where(.vsTable){border-collapse:collapse;margin:.4em auto;font-size:.9rem}:where(.vsTable td,.vsTable th){padding:.2em .8em;text-align:left;border-bottom:1px solid var(--stone-2,#333)}
:where(.vsTable .num){text-align:right;font-variant-numeric:tabular-nums}:where(.vsTable td.nm){border-left:3px solid var(--c,#fff)}:where(.vsTable tr.down td,.vsTable tr.left td){opacity:.6}:where(.vsTable tr.win td.nm,.vsTable tr.me td.nm){font-weight:700}
:where(.vsRules){text-align:left;font-size:.85rem;margin:.4em auto;max-width:46em;padding-left:1.2em}`;document.head.appendChild(st)}
  newRun();stReset();S.level=n;S.mode='reward';freshBody();hud();$('lvl').textContent='Versus · heroes of floor '+floor;
  vsPick();emit('vs',{phase:'pick',round:0});
}
function vsEnd(){
  const el=$('ovExtra');if(el){el.textContent='';el.hidden=true}
  for(const r of MP.remotes){r.hx=null;r._ev=null}
  VS=null;VP=null;MP.vs=null;MP.mode='coop';mons=[];GEO=0;emit('vs',{phase:'end',round:0});
}
/* --- screens: the pick, the wait, between rounds, the results, the menu --- */
// what show() puts under the body for a versus screen: {rules:[...]} and/or {table:{head:[[text,num]...],rows:[{cls,c,cells:[...]}]}}
function ovExtra(x){
  let el=$('ovExtra');if(!el){if(!x)return;el=document.createElement('div');el.id='ovExtra';$('ovBody').after(el)}
  el.textContent='';el.hidden=!x;if(!x)return;
  if(x.rules){const ul=document.createElement('ul');ul.className='vsRules';for(const t of x.rules){const li=document.createElement('li');li.textContent=t;ul.appendChild(li)}el.appendChild(ul)}
  if(x.table){const wrap=document.createElement('div'),tb=document.createElement('table'),th=document.createElement('thead'),hr=document.createElement('tr'),body=document.createElement('tbody');wrap.className='vsScroll';tb.className='vsTable';
    for(const[t,num]of x.table.head){const c=document.createElement('th');c.textContent=t;if(num)c.className='num';hr.appendChild(c)}th.appendChild(hr);tb.appendChild(th);
    for(const r of x.table.rows){const tr=document.createElement('tr');if(r.cls)tr.className=r.cls;if(r.c)tr.style.setProperty('--c',r.c);r.cells.forEach((v,i)=>{const c=document.createElement('td');c.textContent=v;c.className=!i?'nm':x.table.head[i]&&x.table.head[i][1]?'num':'';tr.appendChild(c)});body.appendChild(tr)}
    tb.appendChild(body);wrap.appendChild(tb);el.appendChild(wrap)}
}
function vsTable(kind){
  const teams=VS.format==='teams',rows=VS.score.slice().sort((a,b)=>kind==='pick'?a.team-b.team||a.idx-b.idx:b.rounds-a.rounds||a.team-b.team||b.kills-a.kills||b.dmg-a.dmg);
  const cl=s=>(s.idx===VS.myIdx?'me ':'')+(s.left?'left ':s.down&&kind!=='pick'?'down ':'')+(kind!=='pick'&&VS.winner===s.team?'win':'');
  if(kind==='pick')return{head:[['Player'],...(teams?[['Side']]:[]),['Fighter'],['']],rows:rows.map(s=>({cls:cl(s),c:VS.colors[s.idx],cells:[s.name,...(teams?[vsSide(s.team)]:[]),vsFighter(s)||'—',s.left?'Left':VP.ready.has(s.id)?'Ready':'Choosing']}))};
  return{head:[['Player'],...(teams?[['Side']]:[]),['Fighter'],['Rounds',1],['Kills',1],['Damage',1]],rows:rows.map(s=>({cls:cl(s),c:VS.colors[s.idx],cells:[s.name+(s.left?' (left)':''),...(teams?[vsSide(s.team)]:[]),vsFighter(s)||'—',s.rounds,s.kills,num(s.dmg)]}))};
}
function vsPick(){
  S.mode='reward';VP.scr='pick';const N=VS.floor;
  show({wide:true,cls:'vsPanel vsPick',kick:vsHead(),title:'Choose your fighter',
    body:'Everyone fights with a seasoned hero of floor '+N+': the boons, equipment and skills a climb to that floor brings, the same for all'+(N>100?', with the class upgrade and an apex path of your choice':N>50?', with the class upgrade of your choice':'')+'. Nothing here touches your own climb.',
    extra:{rules:VRULES},
    cards:Object.entries(CLASSES).map(([id,c])=>{const i=seasonedInfo(N,{cls:id})||{skills:[],pets:[]};return{title:c.name,sub:c.gear,body:c.text.split('. ')[0]+'. Skills: '+i.skills.join(', ')+'.'+(i.pets.length?' Takes along: '+i.pets.slice(0,4).join(', ')+'.':''),cls:'vsCard',data:{cls:id},
      fn:()=>{VP.pick={cls:id};vsPickAdv()}}})});
}
function vsPickAdv(){
  if(VS.floor<=50)return vsPickApex();const c=CLASSES[VP.pick.cls];VP.scr='pick';
  show({wide:true,cls:'vsPanel vsPick',kick:vsHead()+' · '+c.name,title:'Choose your path',cards:c.adv.map(([id,name,sub,text])=>({title:name,sub,body:text,cls:'vsCard',data:{adv:id},fn:()=>{VP.pick.adv=id;vsPickApex()}})),btns:[['Back',vsPick]]});
}
function vsPickApex(){
  if(VS.floor<=100)return vsPicked();VP.scr='pick';
  show({wide:true,cls:'vsPanel vsPick apexPanel',kick:vsHead(),title:'Choose what you become',cards:apexCards(id=>{VP.pick.apex=id;vsPicked()}),btns:[['Back',vsPick]]});
}
// the seasoned hero of the match's floor, as startAt would make it, and nothing stored
function vsHero(){
  const N=VS.floor,n=N-1,r=seasonedRun(N,VP.pick);newRun();applyRun(r,n);S.level=n;stReset();PETS.auto=false;
  const R=PETS.roster;PETS.active=[];
  if(R.length){if(resvForm()){const M=manaMax()*(form()==='pet'?.5:1),ord=R.map((e,i)=>i).sort((a,b)=>petRank(R[b])-petRank(R[a]));let sum=0;for(const i of ord){const c=petCost(R[i]);if(sum+c<=M){PETS.active.push(i);sum+=c}}}else PETS.active=[0]}
  S.mode='reward';freshBody();hud();const s=VS.score[VS.myIdx];s.cls=S.cls;s.adv=S.adv;s.apex=S.apex;
}
function vsPicked(quiet){
  vsHero();VP.mine=true;VP.ready.add(MP.myId);pref('vs.pick',JSON.stringify(VP.pick));
  nsend({t:'vr',ok:1,cls:S.cls,adv:S.adv,ap:S.apex||0});mpSendMe(performance.now(),true);
  if(!quiet){vsWait();vsHostGate()}
}
// no choice made in time: the fighter of your last match, or a Fighter
function vsAuto(quiet){
  let p=null;try{p=JSON.parse(localStorage.getItem('marrowborn.vs.pick')||'null')}catch(e){}
  VP.pick=p&&typeof p==='object'&&typeof p.cls==='string'&&own(CLASSES,p.cls)?{cls:p.cls,adv:p.adv,apex:p.apex}:{cls:'fighter'};MP.menu=false;vsPicked(quiet);
}
function vsUnready(){if(!VS||VS.phase!=='pick')return;VP.mine=false;VP.ready.delete(MP.myId);nsend({t:'vr',ok:0});vsPick()}
function vsWait(){
  if(!VS||VS.phase!=='pick'||!VP.mine||MP.menu)return;VP.scr='wait';
  const wait=VS.score.filter(s=>!s.left&&!VP.ready.has(s.id)),n=wait.length,host=MP.role==='host',late=performance.now()-VP.t0>(VSK.pick+8)*1000;VP.late=late;
  const btns=[['Change my fighter',vsUnready]];if(form())btns.push([cap1(tw().pl),()=>petsScreen(vsWait)]);if(learned().length>NSK)btns.push(['Skills',()=>loadout(vsWait)]);if(host&&late&&n)btns.push(['Start now',vsHostStart]);
  show({wide:true,cls:'vsPanel vsPick',kick:vsHead(),title:n?'Waiting for '+n+(n>1?' players':' player'):'Starting',body:'You fight as '+an(vsFighter(VS.score[VS.myIdx]))+'. The first round starts when everyone has chosen; whoever has not chosen in time gets the fighter of their last match.',extra:{table:vsTable('pick')},btns,nodef:true});
}
function vsRoundOver(){
  MP.menu=false;const w=VS.winner,won=w===VS.myTeam;
  show({soft:true,wide:true,cls:'vsPanel vsRound '+(won?'vsWin':'vsLose'),kick:'Round '+VS.round+' · first to '+VS.wins,title:w>=0?vsSide(w)+(VS.format==='teams'?' take':' takes')+' the round':'Nobody takes the round',body:VP.final?'':'The next round starts in a moment. Everyone is restored.',extra:{table:vsTable('score')}});
}
function vsResults(){
  MP.menu=false;S.mode='reward';const w=VS.winner,won=w===VS.myTeam,host=MP.role==='host';
  show({wide:true,cls:'vsPanel vsResults '+(won?'vsWin':'vsLose'),kick:'Versus · the match is over · '+VS.round+(VS.round===1?' round':' rounds'),title:won?'Victory':w>=0?vsSide(w)+(VS.format==='teams'?' win':' wins'):'No winner',
    body:(w>=0&&!won?'You fought as '+an(vsFighter(VS.score[VS.myIdx])||'fighter')+'. ':'')+(host?'Take everyone back to the lobby when you are ready: the room stays open.':'The host takes everyone back to the lobby.'),extra:{table:vsTable('score')},
    btns:host?[['Back to the lobby',vsLobby]]:[['Leave the room',()=>show({cls:'vsPanel',kick:'Versus',title:'Leave the room?',body:'The host is about to take everyone back to the lobby.',btns:[['Stay',vsResults],['Leave',mpLeave]]},true)]]});
}
function vsLobby(){const N=window.MBNet;if(N&&typeof N.end==='function'){try{N.end('ended')}catch(e){}}else nsend({t:'vs',k:'bye'});if(MP.on)mpEnd('ended')}
// the screen the match needs right now (after the menu closes)
function vsScreen(){
  if(!VS)return;const ph=VS.phase;
  if(ph==='pick')return VP.mine?vsWait():vsPick();if(ph==='results')return vsResults();if(ph==='over')return vsRoundOver();$('ov').hidden=true;
}
function vsMenuShow(){
  const inLv=S.mode==='play',host=MP.role==='host',btns=[[inLv?'Back to the fight':'Back',mpMenuClose]];
  if(S.cls&&learned().length>NSK)btns.push(['Skills',()=>loadout(mpMenuShow)]);
  if(S.cls&&form())btns.push([cap1(tw().pl),()=>petsScreen(mpMenuShow)]);
  if(typeof MB.openSettings==='function')btns.push(['Settings',()=>hook('openSettings',mpMenuShow)]);
  btns.push(['Leave the match',()=>show({mpMenu:true,cls:'vsPanel',kick:'Versus',title:'Leave the match?',body:host?'You are the host. If you leave, the match ends for everyone.':'Leaving forfeits: you are out of the match, and a side left empty loses it.',btns:[['Stay',mpMenuShow],['Leave',mpLeave]]},true)]);
  show({mpMenu:true,soft:inLv,cls:'vsPanel',kick:vsHead(),title:inLv?'The fight goes on':'Versus',body:(inLv?'There is no pause in a match. ':'')+(VS.round?'Round '+VS.round+'. ':'')+VS.teams.map(t=>t.name+' '+t.rounds).join(' · ')+'.',keys:matchMedia('(pointer:coarse)').matches?'':'Esc closes this.',btns},true);
}
function vsHud(el,now){
  if(MP.toast&&now>MP.toastT)MP.toast='';const own=!$('vsHud'); // the page has a versus HUD of its own (#vsHud): then only the line of news is shown here
  const cn=s=>s.cls&&CLASSES[s.cls]?(s.adv&&CLASSES[s.cls].adv.find(x=>x[0]===s.adv)||[0,CLASSES[s.cls].name])[1]:'',rows=[],ph=VS.phase,tt=Math.max(0,Math.ceil(VS.t));
  if(own)for(const s of VS.score){const q=s.idx===VS.myIdx?P:MP.byIdx[s.idx]&&MP.byIdx[s.idx].P;rows.push([s.idx,s.name,s.left?'Left':s.down&&ph!=='pick'?'Down':cn(s),q&&q.maxHp&&!s.left&&!s.down?Math.max(0,Math.ceil(q.hp/q.maxHp*20)):0,s.left||s.down&&ph!=='pick'?'down':'',s.rounds])}
  const note=MP.toast||MP.note||(!own?'':ph==='pick'?'Choosing fighters':ph==='results'?'The match is over':'Round '+VS.round+' · '+(ph==='countdown'?'starts in '+tt:ph==='sudden'?'sudden death':ph==='over'?'over':Math.floor(tt/60)+':'+('0'+tt%60).slice(-2))),key=JSON.stringify(rows)+note;
  if(key===MP.hudKey)return;MP.hudKey=key;el.textContent='';
  for(const[idx,name,cl,hp,c2,rd]of rows){const row=document.createElement('span'),n=document.createElement('span'),c=document.createElement('span'),b=document.createElement('span'),f=document.createElement('i');
    row.className='row'+(c2?' '+c2:'');row.style.setProperty('--c',VS.colors[idx]);n.className='nm';n.textContent=name+' · '+rd;c.className='cl';c.textContent=cl;b.className='bar';f.style.width=hp*5+'%';b.appendChild(f);row.append(n,c,b);el.appendChild(row)}
  if(note){const p=document.createElement('span');p.className='note';p.textContent=note;el.appendChild(p)}
}
// down: a key or a tap moves the spectator's eye to the next fighter (the renderer's part)
function vsSpectate(){const R=MB.renderer;try{if(R&&R.ok&&typeof R.spectate==='function'){const t=R.spectate();MP.toast=t&&t.name?'Watching '+mpName(t.name):'Watching the fight';MP.toastT=performance.now()+2000}}catch(e){}}
/* --- a round on every member --- */
function vsSpawn(){
  const live=VS.score.filter(s=>!s.left),me=VS.myIdx;
  if(VS.format==='teams'){const mates=live.filter(s=>s.team===VS.myTeam),i=Math.max(0,mates.findIndex(s=>s.idx===me)),k=mates.length,side=(VS.myTeam+VS.round)%2;P.x=side?W-150:150;P.y=H/2+(i-(k-1)/2)*Math.min(110,380/k)}
  else{const k=Math.max(1,live.length),i=Math.max(0,live.findIndex(s=>s.idx===me)),a=TAU*i/k+VS.round*.9+Math.PI;P.x=W/2+Math.cos(a)*330;P.y=H/2+Math.sin(a)*185}
  clamp(P,14);collide(P,14,true);P.safeX=P.x;P.safeY=P.y;P.face=P.swing=Math.atan2(H/2-P.y,W/2-P.x);
}
function vsRoundStart(n){
  if(!VP.mine)vsAuto(true);
  const lv=VP.n,D=levelDef(lv);
  VS.round=n;VS.phase='countdown';VS.t=VSK.count;VS.ring=null;VS.winner=null;for(const s of VS.score)s.down=s.left;vsTeams();
  VP.q=[];VP.ev=[];VP.dm.clear();VP.invRun=VP.invBlk=0;VP.last=-1;VP.lastT=-9;VP.lastTeam=-1;VP.shAt=-9;VP.final=false;VP.fl=0;VP.hold=VP.frozen=true;VP.scr='';
  MP.menu=false;MP.note='';beginTok++;eqSync();S.level=lv;S.mode='play';S.banner=0;S.shake=0;S.stop=0;S.paused=false;
  S.L={title:'Versus',hint:'',kind:'crawler',spec:SPEC.crawler,name:'Round '+n,hue:D.hue,waves:0,mods:[],room:2,floorKind:'versus',band:D.band,bandName:D.bandName,handicap:null,door:null};
  TR=null;DOORS=null;FALLEN.length=0;PG.clear();
  mons=[];shots=[];pshots=[];allies=[];zones=[];fields=[];bits=[];rings=[];floats=[];morsels=[];echoes=[];arcs=[];TSRC=[];boss=null;S.wave=null;
  obstacles=buildRoom(lv,2);freshBody();vsSpawn();P.down=false;MP.down=false;
  if(S.adv==='beastmaster')allies.push(ally('wolf'));
  PETS.down=false;PETS.fielded=[];PETS.dmg=0;S.note='';fieldPets();
  if(S.note){floats.push({x:P.x,y:P.y-70,txt:S.note,life:4.5,c:'#6fe3ff'});S.note=''}
  for(const r of MP.remotes){r.pshots.length=0;r.echoes.length=0;r._ev.length=0;r.dead=false;r._bmH=null}
  ST.levelTime=0;SND.levelStart();$('ov').hidden=true;lastScreen=null;hud();$('lvl').textContent='Versus · round '+n+(S.rank?' · Rank '+S.rank:'');$('bossName').textContent='—';
  MP.hadAl=false;MP.pKey='';MP.rq.length=0;MP.hudKey='';mpSendMe(performance.now(),true);
  emit('levelstart',{level:lv,L:S.L});emit('vs',{phase:'countdown',round:n});
}
// a phase has begun (the host decided; a client was told)
function vsPhase(){
  const ph=VS.phase;MP.hudKey='';
  if(ph==='fight'){floats.push({x:W/2,y:H/2-70,txt:'Fight',life:1.2,c:'#ff5b6e'});sfx(196,.5,'sawtooth',.2,392);haptic(40)}
  else if(ph==='sudden'){VP.ringK=1;floats.push({x:W/2,y:H/2-70,txt:'Sudden death',life:2,c:'#ff5b6e'});SND.roar();haptic([40,30,90])}
  else if(ph==='over'){vsTeams();vsRoundOver();if(VS.winner===VS.myTeam)chime();else SND.dead()}
  else if(ph==='results'){vsTeams();vsResults()}
  emit('vs',{phase:ph,round:VS.round});
}
/* --- the host: clock, phases, score, results --- */
function vsHostGate(){if(MP.role!=='host'||VS.phase!=='pick')return;for(const s of VS.score)if(!s.left&&!VP.ready.has(s.id))return;vsHostStart()}
function vsHostStart(){if(!VS||MP.role!=='host'||VS.phase!=='pick'&&VS.phase!=='over')return;const n=VS.round+1;nsend({t:'vs',k:'go',n});vsRoundStart(n);VP.tVs=0}
function vsSendState(){nsend({t:'vs',k:'s',ph:VS.phase,n:VS.round,tl:Math.round(VS.t*10),w:VS.winner===null?-2:VS.winner,sc:VS.score.map(s=>[s.rounds,s.kills,Math.round(s.dmg),(s.down?1:0)|(s.left?2:0)])})}
function vsHostTo(ph,t){VS.phase=ph;VS.t=t;vsPhase();vsSendState()}
function vsHostDown(idx,by){
  const s=VS.score[idx];if(!s||s.down||!vsLive()&&VS.phase!=='countdown')return;s.down=true;VP.lastTeam=s.team;
  const k=VS.score[by];if(k&&by!==idx&&k.team!==s.team)k.kills++;
  vsHostCheck();vsSendState();
}
function vsHostCheck(){
  if(!vsLive())return;const alive=vsTeams().filter(t=>t.alive>0);if(alive.length>1)return;
  vsHostEnd(alive.length?alive[0].team:VP.lastTeam); // nobody stands: the side that fell last takes it
}
function vsHostEnd(w){
  let top=0;for(const s of VS.score){if(s.team===w)s.rounds++;top=Math.max(top,s.rounds)}
  VS.winner=w;VP.final=top>=VS.wins;vsHostTo('over',VSK.over);
}
function vsHostResults(w){if(VS.phase==='results')return;if(w!==undefined)VS.winner=w;else{let b=null;for(const t of vsTeams())if(!b||t.rounds>b.rounds)b=t;VS.winner=b?b.team:-1}vsHostTo('results',0)}
function vsHostStep(dt,now){
  const ph=VS.phase;
  if(ph==='pick'){if(!VP.forced&&now-VP.t0>(VSK.pick+20)*1000){VP.forced=true;vsHostStart()}return}
  if(ph==='results'){if(now>=VP.tVs){VP.tVs=now+1000;vsSendState()}return}
  if(ph==='countdown'){if(VS.t<=0)vsHostTo('fight',VS.time)}
  else if(ph==='fight'){if(VS.t<=0)vsHostTo('sudden',VSK.ringT)}
  else if(ph==='sudden'){if(VS.t<=-8){let best=-1,bh=-1;for(const s of VS.score){if(s.down||s.left)continue;const q=s.idx===VS.myIdx?P:MP.byIdx[s.idx]&&MP.byIdx[s.idx].P,f=q?q.hp/(q.maxHp||1):0;if(f>bh){bh=f;best=s.team}}vsHostEnd(best)}} // (cannot happen while the ring works: a last guard against a round that will not end)
  else if(ph==='over'){if(VS.t<=0){if(VP.final)vsHostResults();else vsHostStart()}}
  if(vsLive())vsHostCheck();
  if(VS&&now>=VP.tVs){VP.tVs=now+250;vsSendState()}
}
function vsOnHost(msg,from){
  if(!VS||MP.role==='host'||from!==undefined&&from!==null&&''+from!==MP.hostId)return;
  if(msg.k==='bye')return mpEnd('ended');
  if(msg.k==='go')return vsRoundStart(Math.max(1,msg.n|0));
  if(msg.k!=='s')return;
  if(Array.isArray(msg.sc))msg.sc.forEach((a,i)=>{const s=VS.score[i];if(!s||!Array.isArray(a))return;s.rounds=a[0]|0;s.kills=a[1]|0;s.dmg=+a[2]||0;s.down=!!(a[3]&1);s.left=!!(a[3]&2)});
  const ph=['pick','countdown','fight','sudden','over','results'].includes(msg.ph)?msg.ph:VS.phase,t=(+msg.tl||0)/10;
  VS.winner=msg.w===-2?null:msg.w|0;
  if(ph!=='pick'&&ph!=='results'&&(msg.n|0)!==VS.round)return; // (a round I have not been started into: its 'go' comes first)
  if(ph!==VS.phase){VS.phase=ph;VS.t=t;vsPhase()}else if(Math.abs(VS.t-t)>.35)VS.t=t;
  MP.hudKey='';
}
function vsOnReady(msg,from){
  if(!VS)return;const s=VS.score.find(x=>x.id===''+from);if(!s||s.left)return;
  if(msg.ok){VP.ready.add(s.id);s.cls=own(CLASSES,msg.cls)?msg.cls:null;s.adv=s.cls&&CLASSES[s.cls].adv.some(a=>a[0]===msg.adv)?msg.adv:null;s.apex=s.cls&&apexOk(msg.ap)?msg.ap:null}else VP.ready.delete(s.id);
  MP.hudKey='';if(VS.phase==='pick'){if(VP.scr==='wait'&&!MP.menu)vsWait();vsHostGate()}
}
function vsOnDown(msg,from){
  if(!VS)return;const r=MP.rById.get(''+from);if(!r||(msg.n|0)!==VS.round)return;r.dead=r.P.down=true;
  const k=VS.score[msg.by|0];MP.toast=(msg.by>=0&&k?k.name+' downed '+r.name:r.name+' fell to the ring');MP.toastT=performance.now()+3500;MP.hudKey='';
  if(MP.role==='host')vsHostDown(r.idx,msg.by|0);else{const s=VS.score[r.idx];if(s)s.down=true}
}
function vsLeft(m){
  const s=VS.score[m.idx];if(s){s.left=true;s.down=true}VP.ready.delete(m.id);vsTeams();MP.toast=m.name+' left the match';
  if(MP.role==='host'){const T=VS.teams.filter(t=>t.n>0);
    if(VS.phase!=='results'&&T.length<=1)return vsHostResults(T.length?T[0].team:-1); // a side left empty loses the match
    if(VS.phase==='pick')vsHostGate();else{vsHostCheck();vsSendState()}}
  if(VS.phase==='pick'&&VP.scr==='wait'&&!MP.menu)vsWait();
}
/* --- my hero and my creatures: what hurts them --- */
const vsAllyHp=a=>Math.max(1,Math.round(GREF(VP.n)*(a.kind==='icewight'?.2:a.kind==='packbeast'?.08:.03)));
const vsHeal=(f,lo)=>Math.max(.1,Math.round(Math.max(lo,f*P.maxHp)*VSK.heal*10)/10);
const vsCanHurt=a=>a.life>0&&a.hp>0&&(a.pet?!a.helper&&!a.trophy&&!a.hidden&&a.st!=='leap':a.kind==='thrall'||a.kind==='wolf'||!!a.apexAlly);
const vsDm=(by,nid,got)=>{if(!(got>0))return;const k=by+'|'+nid;VP.dm.set(k,(VP.dm.get(k)||0)+got)};
// raw: the damage a monster would have taken. pure: a poison's tick or the like, which nothing blocks. True when the blow landed (also when it was blocked).
function vsHurt(raw,by,src,pure){
  if(!VS||!P||P.down||S.mode!=='play'||!vsLive()||!(raw>0))return false;
  const A=VS.score[by],ac=A&&A.cls?vsF(A.cls,A.adv,A.apex)[0]:1,mc=vsF(S.cls,S.adv,S.apex)[1];
  let d=raw*VP.k*VSK.K*VSK.kf*ac*mc;
  if(!pure){
    if(P.inv>0){if(P.dgT>0&&src!=='touch'&&src!=='aura'&&src!=='field')pdTry(0,src);return false}
    if(src==='shot'&&VP.dodgeT>0)return false; // it passes through a hero who has just dashed
    if(window.__mb&&window.__mb.hits)window.__mb.hits[src]=(window.__mb.hits[src]||0)+1;
    if(TSRC.length&&TSRC[0].form==='ward'&&!(P.trCd>0)){P.trCd=2.5;P.trQ=1;P.trT=null}
    if(P.guardT>0){zealAdd();P.inv=.4;puff(P,'#d6a544',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK/2);shock(115,2);return true}
    if(rand()*100<Math.min(40,eqv('guard'))){if(S.t-VP.hurtT>.3){VP.hurtT=S.t;floats.push({x:P.x,y:P.y-44,txt:'Shrugged off',life:.8,c:'#d5dce2'});SND.ward()}return true}
    if(cls()==='tank'&&P.shield&&!(S.t-VP.shAt<VSK.shield)){VP.shAt=S.t;P.shield=false;P.shT=0;puff(P,'#d5dce2',10);SND.block();haptic(30);manaGive(P.maxMana*MBLOCK*(S.adv==='paladin'?2:1));if(S.adv==='paladin'&&P.hp<P.maxHp){healP(.1,2)}if(pw(1))shock(115,2);return true}
    if(P.plates>0&&S.apex==='stone'&&!(S.t-VP.shAt<VSK.shield)){VP.shAt=S.t;plateBreak(true);return true}
    {const G=d<=.2*P.maxHp&&allies.find(a=>a.kind==='guardian'&&a.shield);if(G){G.shield=false;G.shT=8;G.flash=.2;puff(P,TCOL.healer,10);floats.push({x:P.x,y:P.y-44,txt:'Guarded',life:.8,c:TCOL.healer});SND.block();haptic(30);return true}}
  }
  if(P.stoneT>0)d/=2;if(P.vMark>0)d*=1.5;
  if(!pure&&VSK.rally>0){const R=MP.byIdx[by];if(R&&R.P&&R.P.maxHp>0&&!R.dead)d*=Math.max(1-VSK.rally,Math.min(1+VSK.rally,1+VSK.rally*(P.hp/P.maxHp-Math.max(0,R.P.hp)/R.P.maxHp)))}
  if(!pure){if(VP.braceT>0)d*=VSK.braceK;else{if(!(S.t-VP.hcT<=VSK.braceT)){VP.hc=0;VP.hcT=S.t}if(++VP.hc>=VSK.braceN){VP.hc=0;VP.braceT=VSK.brace;floats.push({x:P.x,y:P.y-58,txt:'Braced',life:.8,c:'#d5dce2'})}}}
  d=Math.max(.01,Math.min(d,VSK.cap*P.maxHp));
  const got=Math.max(0,Math.min(d,P.hp));P.hp-=d;ST.dmgTaken+=got;comboEnd();vsDm(by,0,got);if(window.__mb&&window.__mb.dmgBy)window.__mb.dmgBy[src]=(window.__mb.dmgBy[src]||0)+got;if(by>=0){VP.last=by;VP.lastT=S.t}
  if(src==='shot'&&VSK.spur>1&&melee(cls())){if(!(VP.spurT>0))floats.push({x:P.x,y:P.y-70,txt:'Spurred',life:.8,c:'#ffd95e'});VP.spurT=VSK.spurT} // round 13: a bolt that lands on a hand-to-hand hero spurs it on
  VP.fl+=d;VP.hud=true;S.shake=Math.max(S.shake,.12);if(S.t-VP.hurtT>.25){VP.hurtT=S.t;puff(P,'#b8263d',6);SND.hurt();haptic(40)}
  if(P.hp<=0){
    if(S.adv==='saint'&&!P.saved){P.saved=true;P.hp=Math.ceil(P.maxHp/2)*VSK.heal;P.inv=VSK.inv;hud();shock(140,3);floats.push({x:P.x,y:P.y-52,txt:'Saved',life:1.3,c:'#d6a544'});SND.skill('healer')}
    else vsDown(by>=0?by:S.t-VP.lastT<5?VP.last:-1)}
  return true;
}
// what holds a hero: a stun or a slow (short, then none for a while), a poison or a fire (dot: per half second, 6 s; ven: 3 s), a mark
function vsCC(o,by){
  if(!P||P.down||P.inv>0||!vsLive())return;
  if((o.stun>0||o.slow>0)&&!(P.vImm>0)){if(o.stun>0)P.vStun=Math.min(VSK.cc,o.stun);if(o.slow>0)P.vSlow=Math.min(VSK.cc,o.slow);P.vImm=VSK.cc+VSK.ccImm;floats.push({x:P.x,y:P.y-58,txt:o.stun>0?'Stunned':'Slowed',life:.9,c:'#8fd3ff'})}
  if(o.dot>0){P.vDotT=6;P.vDotD=o.dot;P.vDotK=.5;P.vDotBy=by;puff(P,'#7fd66b',10,120)}
  if(o.ven>0){P.vDotD=Math.max(P.vDotT>0&&P.vDotD||0,o.ven);P.vDotT=Math.max(P.vDotT||0,3);P.vDotK=.5;P.vDotBy=by;puff(P,TCOL.assassin,10,120)}
  if(o.mark>0){P.vMark=Math.min(6,o.mark);rings.push({x:P.x,y:P.y,life:.5,max:.5,r:50,fx:true,foe:true});puff(P,'#b8263d',14,120)}
}
// one of my creatures is struck: the raw number comes off its health (the pets' own scale)
function vsHurtPet(a,raw,by,pure,cr){
  if(!VS||!vsLive()||!vsCanHurt(a)||!(raw>0))return false;
  if(a.pet&&!pure&&(a.ward>0||a.inv>0))return false;
  const d=Math.max(.01,raw*(cr?1:VSK.cre)*(a.vMark>0?1.5:1)),got=Math.min(d,a.hp);a.hp-=d;a.flash=.15;vsDm(by,a.nid,got);
  if(S.t-(a._ft||0)>.3){a._ft=S.t;puff(a,a.s?col(a.s.col):'#e7dfcd',4,110)}
  if(a.hp>0){
    if(!a.pet||a.minion)return true;
    if(a.ai==='hollow'){const ph=a.hp<=a.maxHp/3?3:a.hp<=a.maxHp*2/3?2:1;if(ph>(a.phase||1)){a.phase=ph;petPhase(a)}}else if(!a.rage&&a.hp<=a.maxHp*.4)petRage(a);
    if(a.mods.length){
      if(a.mods.includes('thorned')){const t=Math.floor(a.hp/a.maxHp*5);if(t<a.fifth&&!(a.thornT>0)){a.fifth=t;a.thornT=.6;rings.push({x:a.x,y:a.y,life:.6,max:.6,r:a.r+60,fx:true})}}
      if(a.mods.includes('splitting')&&a.splitN>0&&a.hp<=a.maxHp*a.splitN/3){a.splitN--;petLesser(a);rings.push({x:a.x,y:a.y,life:.5,max:.5,r:a.r+70,fx:true})}}
    return true}
  a.hp=0;a.life=0;a.beam=null;puff(a,a.s?col(a.s.col):'#e7dfcd',a.pet&&!a.minion?22:8,180);
  if(a.pet&&!a.minion&&a.e){a.e.down=true;a.e.frac=0;a.e.revT=0;if(!PETS.fallen.includes(a.e))PETS.fallen.push(a.e);PETS.down=petOn().every(e=>e.down);floats.push({x:a.x,y:a.y-a.r-20,txt:a.name+' falls',life:1.6,c:'#ff5b6e'});sfx(160,.5,'sawtooth',.2,60);haptic(40)}
  nsend({t:'vc',by,k:a.pet?a.sk||a.ai:a.kind==='wolf'?'hound':'husk',ai:a.pet?a.ai:'mite',x:Math.round(a.x),y:Math.round(a.y),r:a.r,nm:a.name||''});
  return true;
}
function vsDown(by,ring){
  P.hp=0;P.down=true;MP.down=true;P.inv=0;P.moving=false;P.dashT=0;P.atk=0;P.vx=P.vy=0;P.stormT=P.fireT=P.renewT=0;P.cutN=P.starN=P.quakeN=0;P.rushHit=null;P.rushD=0;P.beam=null;P.bmT=0;
  ST.deaths++;SND.dead();haptic([120,60,320]);for(const a of allies)puff(a,'#e7dfcd',6);allies=[];TSRC=[];fields=fields.filter(f=>f.rem);zones=zones.filter(z=>z.rem);pshots=[];
  for(const k in keys)keys[k]=false;want.atk=want.dash=want.skill=false;want.pt=null;
  const k=VS.score[by];floats.push({x:P.x,y:P.y-52,txt:'You are down',life:2.5,c:'#ff5b6e'});MP.note=(ring?'The ring took you'+(by>=0&&k?' ('+k.name+' gets the kill). ':'. '):by>=0&&k?k.name+' brought you down. ':'You are down. ')+'You watch until the round ends.';hud();
  nsend({t:'vd',by,n:VS.round});mpSendMe(performance.now(),true);
  const s=VS.score[VS.myIdx];if(MP.role==='host')vsHostDown(VS.myIdx,by);else if(s)s.down=true;
}
// no more than VSK.inv seconds untouchable at a stretch, whatever grants it; after that, VSK.invRest seconds in which nothing does
function vsInv(dt){
  if(VP.dodgeT>0)VP.dodgeT-=dt;if(VP.braceT>0)VP.braceT-=dt;if(VP.spurT>0)VP.spurT-=dt;
  if(VP.invBlk>0){VP.invBlk-=dt;P.inv=0;P.guardT=0;return}
  if(P.inv>0||P.guardT>0){VP.invRun+=dt;if(VP.invRun>=VSK.inv){P.inv=0;P.guardT=0;VP.invRun=0;VP.invBlk=VSK.invRest}}else VP.invRun=0;
}
// every step, before the hero moves
function vsStep(dt){
  const ph=VS.phase,live=ph==='fight'||ph==='sudden';VP.frozen=ph==='countdown';
  for(const k of['vStun','vSlow','vImm','vMark'])if(P[k]>0)P[k]-=dt;
  VP.hold=!live||P.vStun>0;
  for(const a of allies){
    if(a.hp===undefined&&(a.kind==='thrall'||a.kind==='wolf'))a.hp=a.maxHp=Math.max(1,Math.round(GREF(VP.n)*(a.kind==='wolf'?VSK.wolf:VSK.thr)));
    if(a.apexAlly&&!a._vh){a._vh=1;a.hp=a.maxHp=vsAllyHp(a)}
    if(a.vMark>0)a.vMark-=dt;if(a.vDotT>0){a.vDotT-=dt;if((a.vDotK-=dt)<=0){a.vDotK=.5;vsHurtPet(a,a.vDotD,a.vDotBy,true)}}}
  if(live&&!P.down){
    if(P.vDotT>0){P.vDotT-=dt;if((P.vDotK-=dt)<=0){P.vDotK=.5;puff(P,'#7fd66b',4,80);vsHurt(P.vDotD,P.vDotBy,'dot',true)}}
    // sudden death: outside the ring you burn, and once it is shut everyone does
    if(ph==='sudden'&&VS.ring&&!P.down&&(VP.ringK-=dt)<=0){VP.ringK=.5;const R=VS.ring,shut=R.r<=1;
      for(const a of allies)if(vsCanHurt(a)&&(shut||dist(a,R)>R.r)){a.hp-=a.maxHp*.2;a.flash=.15;if(a.hp<=0){a.hp=.01;vsHurtPet(a,1e9,-1,true)}}
      if(shut||dist(P,R)>R.r){const d=P.maxHp*VSK.ringD*(shut?1.5:1);vsDm(-1,0,Math.min(d,P.hp));P.hp-=d;VP.fl+=d;VP.hud=true;puff(P,'#ff8a4c',8,140);if(S.t-VP.hurtT>.25){VP.hurtT=S.t;SND.hurt()}if(P.hp<=0)vsDown(S.t-VP.lastT<5?VP.last:-1,true)}}
  }
  // the stand-ins: every hostile hero that stands, and its creatures that can be hurt
  const out=[];
  if(ph!=='over'&&ph!=='results')for(const r of MP.remotes){if(!r.foe||r.dead||r.away||!r.hx)continue;const h=r.hx,q=r.P;h.vx=q.moving?q.vx||0:0;h.vy=q.moving?q.vy||0:0;h.x=Math.max(WALL+11,Math.min(W-WALL-11,q.x+h.vx*VSK.lead));h.y=Math.max(WALL+11,Math.min(H-WALL-11,q.y+h.vy*VSK.lead));h.hp=q.hp;h.maxHp=q.maxHp;if(h.flash>0)h.flash-=dt;out.push(h);
    for(const a of r.allies)if(a.vs&&a.hp>0&&!a.hidden)out.push(a)}
  mons=out;
}
// a blast of theirs goes off (called for a zone that was replicated from a hostile member)
function vsBlast(x,y,R,d,by,skip,stun,cr){
  if(skip!==P&&!P.down&&Math.hypot(P.x-x,P.y-y)<R+8){if(vsHurt(d,by,'blast')&&stun)vsCC({stun},by)}
  for(const a of allies)if(a!==skip&&vsCanHurt(a)&&Math.hypot(a.x-x,a.y-y)<R+a.r){if(vsHurtPet(a,d,by,false,cr)&&stun&&a.pet)a.vStun=Math.min(2,stun*2)}
}
function vsZone(z){if(vsLive()&&S.mode==='play'&&z.vsD>0)vsBlast(z.x,z.y,z.r,z.vsD,z.vsBy,null,z.vsStun,z.vsCr)}
function vsField(f){
  if(!vsLive()||S.mode!=='play')return;const dom=f.kind==='domain',by=f.vsBy,q=f.kind==='quake',In=(e,er)=>q?quakeD(e,f)<f.w+er:dist(e,f)<f.r+er;
  if(!P.down&&In(P,8)){if(dom)P.vMark=Math.max(P.vMark||0,.7);if(f.vsD>0)vsHurt(f.vsD,by,'field');if(f.vsSlow||dom)vsCC({slow:.8},by)}
  for(const a of allies)if(vsCanHurt(a)&&In(a,a.r)){if(dom)a.vMark=Math.max(a.vMark||0,.7);if(f.vsD>0)vsHurtPet(a,f.vsD,by)}
}
// a swing, a lunge or a shockwave of a hostile hero, when the picture of that hero reaches the moment it happened
function vsEvent(r,e){
  const a=e.a,by=r.idx,k=a[0],x=+a[1]||0,y=+a[2]||0;
  const each=(test,d,fn)=>{if(!P.down&&test(P,11)){if(vsHurt(d,by,k==='s'?'swing':k==='r'?'rush':'shock')&&fn)fn(P)}for(const b of allies)if(vsCanHurt(b)&&test(b,b.r)){if(vsHurtPet(b,d,by)&&fn)fn(b)}};
  if(k==='s'){const g=(a[3]||0)/100,reach=+a[4]||70,arc=(a[5]||110)/100;each((e2,er)=>{const d=Math.hypot(e2.x-x,e2.y-y);if(d>=reach+er)return false;const t=Math.atan2(e2.y-y,e2.x-x)-g;return Math.abs(Math.atan2(Math.sin(t),Math.cos(t)))<arc||d<er+18},+a[6]||0)}
  else if(k==='r'){const g=(a[3]||0)/100,len=+a[4]||180,st=+a[6]||0;each((e2,er)=>segDist(e2,x,y,g,len)<er+30,+a[5]||0,st?e2=>{if(e2===P)vsCC({stun:st*.7},by);else if(e2.pet)e2.vStun=Math.min(2,st*2)}:null)}
  else if(k==='k'){const R=+a[3]||60;each((e2,er)=>Math.hypot(e2.x-x,e2.y-y)<R+er,+a[4]||0)}
}
// a hostile bolt against my hero and my creatures; true when it is spent
function vsShot(r,p){
  const hs=p.hs||(p.hs=new Set()),by=r.idx;
  const cr=!!(p.fl&32),hit=e=>{hs.add(e);const d=p.d*(p.fl&8&&Math.hypot(p.x-p.sx,p.y-p.sy)>200?2:1);
    if(e===P){if(vsHurt(d,by,'shot')&&(p.slow||p.stun))vsCC({slow:p.slow,stun:p.stun*.7},by)}else if(vsHurtPet(e,d,by,false,cr)&&p.stun&&e.pet)e.vStun=Math.min(2,p.stun*2);
    if(p.boom){rings.push({x:p.x,y:p.y,life:.35,max:.35,r:85,fx:true,foe:true});vsBlast(p.x,p.y,85,p.boom,by,null,0,cr)}
    if(p.fl&16){rings.push({x:p.x,y:p.y,life:.3,max:.3,r:70,fx:true,foe:true});vsBlast(p.x,p.y,70,d/2,by,e,0,cr)}
    if(p.pierce>0){p.pierce--;return false}return true};
  if(!P.down&&P.inv>0&&P.dgT>0&&!hs.has(P)&&dist(P,p)<p.r+12)pdTry(0,'shot');
  if(!P.down&&!hs.has(P)&&P.inv<=0&&dist(P,p)<p.r+12&&hit(P))return true;
  for(const a of allies)if(!hs.has(a)&&vsCanHurt(a)&&dist(a,p)<a.r+p.r+3&&hit(a))return true;
  return false;
}
// what a hostile hero's creatures, ring of light and beam do to my hero and my creatures, every step (as a client's monsters do in co-op: mpMons)
const vsMine=[];
function vsFoes(dt){
  if(!vsLive()||S.mode!=='play')return;
  const t=S.t,mine=vsMine;mine.length=0;for(const a of allies)if(vsCanHurt(a))mine.push(a);
  for(const r of MP.remotes){if(!r.foe||r.dead||r.away)continue;const by=r.idx,q=r.P;
    if(q.auraR>0&&r._aud>0&&t-(r._auT||0)>=.5){r._auT=t;if(!P.down&&dist(P,q)<q.auraR+11)vsHurt(r._aud,by,'aura');for(const b of mine)if(dist(b,q)<q.auraR+b.r)vsHurtPet(b,r._aud,by)}
    if(q.beam){const H2=r._bmH||(r._bmH=new Set()),d=q.beam.d||0,g=q.beam.a,len=q.beam.len;
      if(!P.down&&!H2.has(P)&&P.inv<=0&&segDist(P,q.x,q.y,g,len)<25){H2.add(P);vsHurt(d,by,'beam')}
      for(const b of mine)if(!H2.has(b)&&segDist(b,q.x,q.y,g,len)<14+b.r){H2.add(b);vsHurtPet(b,d,by)}}
    else if(r._bmH)r._bmH=null;
    for(const a of r.allies){
      if(a.pet||a.shade){if(a.hidden||!a.du)continue;
        const tm=a._tm||(a._tm=new Map()),ok=(e,gap,key)=>{const l=tm.get(key||e);return l===undefined||t-l>=gap};
        if(a.st!=='leap'&&a.st!=='dazed'){const d=a.helper?a.du[0]:a.du[a.st==='charge'||a.st==='lunge'?2:0],gap=a.helper?.7:1;
          if(!P.down&&dist(a,P)<a.r+11&&ok(P,gap)&&vsHurt(d,by,'touch'))tm.set(P,t);
          for(const b of mine)if(dist(a,b)<a.r+b.r-4&&ok(b,gap)&&vsHurtPet(b,d,by,false,true))tm.set(b,t)}
        if(a.beam&&a.beam.on){const w=a.beam.w,d=a.du[1];
          for(const ry of a.beam.rays){if(!P.down&&segDist(P,a.x,a.y,ry.a,ry.len)<w+9&&ok(P,1,'bP')&&vsHurt(d,by,'beam'))tm.set('bP',t);
            for(const b of mine)if(segDist(b,a.x,a.y,ry.a,ry.len)<w+b.r*.6&&ok(b,1,b.nid+'b')&&vsHurtPet(b,d,by,false,true))tm.set(b.nid+'b',t)}}
        if(tm.size>60)tm.clear()}
      else if(a.kind==='thrall'||a.kind==='wolf'||a.kind==='packbeast'){if((a._bcd=(a._bcd||0)-dt)>0||!(a.hp>0))continue;
        let tg=null,bd=1e9;if(!P.down){const d=dist(a,P)-11;if(d<bd){bd=d;tg=P}}for(const b of mine){const d=dist(a,b)-b.r;if(d<bd){bd=d;tg=b}}
        if(tg&&bd<a.r+5){const d=a.apexAlly?r._ab||0:(r._tb||0)*(a.kind==='wolf'?2:1);a._bcd=.7;if(tg===P)vsHurt(d,by,'bite');else vsHurtPet(tg,d,by,false,true)}}}
  }
}
/* --- my attacks on the stand-ins --- */
// hurtM comes here for a stand-in. Inside GEO the victim works the blow out for itself; otherwise it is told
function vsHit(m,d,quiet){
  if(!(m.flash>0))m.flash=.1;if(GEO||!VS||!vsLive()||!(d>0))return;
  VP.q.push(['d',m.own.idx,m.nid|0,Math.min(1e7,Math.round(d*100)/100)]);SND.hit(quiet);
}
function vsDebuff(m,o,D){
  if(GEO||!VS||!vsLive())return;
  VP.q.push(['db',m.own.idx,m.nid|0,o.slow||0,o.stun||0,o.dot?Math.round(o.dot*D*1000)/1000:0,o.mark||0]);
  if(o.dot)puff(m,'#7fd66b',10,120);if(o.mark){rings.push({x:m.x,y:m.y,life:.5,max:.5,r:m.r+40,fx:true});puff(m,'#b8263d',14,120)}
}
function vsVen(m,d){if(GEO||!VS||!vsLive())return;VP.q.push(['vn',m.own.idx,m.nid|0,Math.round(d*1000)/1000])}
function vsMove(m,x,y){if(GEO||!VS||!vsLive())return;VP.q.push(['mv',m.own.idx,m.nid|0,Math.round(x),Math.round(y)])}
function vsSwing(a,reach,arc,dmg,twice){const e=['s',Math.round(P.x),Math.round(P.y),Math.round(a*100)||0,reach,Math.round(arc*100),Math.round(dmg*100)/100];VP.ev.push(e);if(twice)VP.ev.push([...e.slice(0,6),Math.round(dmg*60)/100])}
function vsRush(a,dmg,stun){VP.ev.push(['r',Math.round(P.x),Math.round(P.y),Math.round(a*100)||0,190,Math.round(dmg*100)/100,stun||0])}
function vsClear(c,r){for(const q of MP.remotes)if(q.foe)for(const p of q.pshots)if(dist(p,c)<=r)p.dead=true}
function vsBeamBurn(a,len){for(const q of MP.remotes)if(q.foe)for(const p of q.pshots)if(segDist(p,P.x,P.y,a,len)<22)p.dead=true}
function vsFlush(){
  const by=new Map();for(const op of VP.q){let l=by.get(op[1]);if(!l)by.set(op[1],l=[]);if(l.length<200)l.push(op)}VP.q=[];
  for(const[idx,l]of by){const r=MP.byIdx[idx];if(r)nsend({t:'vk',n:VS.round,l},r.id)}
}
function vsOnDirect(msg,from){
  if(!VS||!vsLive()||S.mode!=='play'||(msg.n|0)!==VS.round||!Array.isArray(msg.l))return;const r=MP.rById.get(''+from);if(!r||!r.foe||r.dead)return;const by=r.idx;
  for(const op of msg.l){if(!Array.isArray(op)||op[1]!==VS.myIdx)continue;const k=op[0],nid=op[2]|0,a=nid?allies.find(x=>x.nid===nid):null;if(nid&&!a)continue;
    if(k==='d'){const d=+op[3];if(d>0){if(a)vsHurtPet(a,d,by);else vsHurt(d,by,'direct')}}
    else if(k==='db'){const o={slow:+op[3]||0,stun:+op[4]||0,dot:+op[5]||0,mark:+op[6]||0};
      if(!a)vsCC(o,by);else if(vsCanHurt(a)){if(o.stun>0&&a.pet)a.vStun=Math.min(2.5,o.stun*2);if(o.dot>0){a.vDotT=6;a.vDotD=o.dot;a.vDotK=.5;a.vDotBy=by}if(o.mark>0)a.vMark=Math.min(6,o.mark)}}
    else if(k==='vn'){const d=+op[3];if(d>0){if(!a)vsCC({ven:d},by);else if(vsCanHurt(a)){a.vDotD=Math.max(a.vDotT>0&&a.vDotD||0,d);a.vDotT=3;a.vDotK=.5;a.vDotBy=by}}}
    else if(k==='mv'){const e=a||P;if(a?!vsCanHurt(a):P.down||P.inv>0||P.dashT>0)continue;const x=+op[3]||e.x,y=+op[4]||e.y,d=Math.hypot(x-e.x,y-e.y),f=d>300?300/d:1;e.x+=(x-e.x)*f;e.y+=(y-e.y)*f;clamp(e,a?a.r:14);collide(e,a?a.r:14,true);if(!a){P.safeX=P.x;P.safeY=P.y}}
  }
}
function vsFlushHurt(){
  if(!VP.dm.size)return;const l=[];for(const[k,v]of VP.dm){const i=k.indexOf('|'),by=+k.slice(0,i),nid=+k.slice(i+1);l.push([by,Math.round(v*100)/100,nid]);if(MP.role==='host'&&!nid&&VS.score[by])VS.score[by].dmg+=v}VP.dm.clear();
  nsend({t:'vh',l});
}
function vsOnHurt(msg,from){
  if(!VS||!Array.isArray(msg.l))return;const r=MP.rById.get(''+from);if(!r)return;
  for(const a of msg.l){const by=a[0]|0,d=+a[1]||0,nid=a[2]|0;if(!(d>0))continue;
    if(MP.role==='host'&&!nid&&VS.score[by]&&VS.score[by].team!==r.team)VS.score[by].dmg+=d;
    if(by===VS.myIdx){if(!nid)ST.dmgDealt+=d;const e=nid?r.allies.find(x=>x.nid===nid):r.P;if(e&&S.mode==='play'&&floats.length<60)floats.push({x:e.x+rand()*18-9,y:e.y-(nid?(e.r||10)+6:40),txt:fmt(Math.round(d*10)/10),life:.7,c:nid?'#958ea3':'#e7dfcd'});if(!nid&&r.hx)r.hx.flash=.12}}
}
function vsOnCreature(msg,from){
  if(!VS||(msg.by|0)!==VS.myIdx||!P||P.down||S.mode!=='play')return;const r=MP.rById.get(''+from);if(!r||!r.foe)return;
  ST.kills++;manaGive(P.maxMana*MKILL);
  const k=typeof msg.k==='string'&&own(SPEC,msg.k)?msg.k:'husk',base=SPEC[k],d={s:{...base,r:Math.max(8,Math.min(40,+msg.r||base.r)),name:mpTxt(msg.nm)||base.name},ai:AI[msg.ai]?msg.ai:base.ai||'mite',kind:k,x:+msg.x||W/2,y:+msg.y||H/2};
  FALLEN.push(d);if(FALLEN.length>24)FALLEN.shift();if(S.apex==='dominion'&&vsLive())shadeRise(d,SHLIFE,false);
}
/* --- the wire: what versus adds to 'me' and 'lk' --- */
function vsLook(o){
  o.au=P&&P.auraR>0&&!P.down?[P.auraR,Math.round(ORDAURA*(P.ascT>0?2:1)*dmgMul()*100)/100]:0;
  o.tb=Math.round(dmgMul()*(1+eqv('thr')/100)*(P&&P.legT>0?1.5:1)*(DOMS()?DOMSUM:1)*100)/100;if(S.apex==='beasts'&&P)o.ab=Math.round(packBite()*100)/100;
}
function vsOnLook(r,msg){
  r.P.auraR=Array.isArray(msg.au)?Math.max(0,Math.min(400,+msg.au[0]||0)):0;r._aud=Array.isArray(msg.au)?+msg.au[1]||0:0;r._tb=+msg.tb||0;r._ab=+msg.ab||0;
  const s=VS.score[r.idx];if(s&&r.look.cls){s.cls=r.look.cls;s.adv=r.look.adv;s.apex=r.look.apex}
}
function vsAllyStatic(a){
  const du=a.helper?[a.dk,a.dk,a.dk]:a.du?a.du.map(v=>Math.round(v*100)/100):0;
  if(a.shade)return[a.nid,'p',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,hpR(a.max),32,'shade',0,0,0,du];
  if(a.pet)return[a.nid,'p',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,hpR(a.maxHp),(a.minion?1:0)|(a.lesser?2:0)|(a.helper?4:0)|(a.trophy?8:0)|(a.crown?16:0),a.owner,a.plv|0,a.mods&&a.mods.length?a.mods:0,a.perk||0,du];
  if(a.trophy)return[a.nid,a.kind==='familiar'?'f':'g',a.sk||a.ai,a.ai,a.name,a.s.col,a.r,a.tm||1,a.owner,Math.round(a.seed*100)/100,a.s.r];
  if(a.apexAlly)return[a.nid,a.kind[0]==='p'?'b':a.kind[0],a.r,Math.round(a.max*10)/10,hpR(a._vh?a.maxHp:vsAllyHp(a))];
  return[a.nid,a.kind==='wolf'?'w':'t',a.r,hpR(a.hp||Math.max(1,Math.round(GREF(VP.n)*(a.kind==='wolf'?VSK.wolf:VSK.thr))))];
}
function vsAllyNew(r,o,a){
  o.foe=r.foe;
  if(o.pet||o.shade){const du=a[13];o.du=Array.isArray(du)?[+du[0]||0,+du[1]||0,+du[2]||0]:[0,0,0]}
  if(o.kind==='thrall'||o.kind==='wolf'){const hp=+a[3]||1;Object.assign(o,{hp,maxHp:hp,s:{name:o.kind==='wolf'?'Wolf':'Thrall',col:'#e7dfcd',r:o.r,eyes:2},ai:'mite',st:'idle',hidden:false,lift:0,mods:[],ward:0,beam:null,boss:false,flash:0})}
  if(o.apexAlly){const hp=+a[4]||1;Object.assign(o,{hp,maxHp:hp,s:{name:o.kind,col:AX.col[o.kind],r:o.r,eyes:2},ai:'mite',hidden:false,lift:0,mods:[],ward:0,beam:null,boss:false})}
  if(r.foe&&(o.pet&&!o.helper&&!o.trophy||o.kind==='thrall'||o.kind==='wolf'||o.apexAlly)){o.vs=true;o.own=r;o.id='c'+r.idx+'.'+o.nid;o.vx=0;o.vy=0;o.decoy=false}
}
function vsShotOut(q,a){
  if(!VS)return a;
  const fl=(q.boom?1:0)|(q.slow?2:0)|(q.stun?4:0)|(q.kind==='arrow'&&pw(3)?8:0)|(q.kind==='bolt'&&S.adv==='pyromancer'?16:0)|(q.pet?32:0);
  a.push(Math.round(q.dmg*100)/100,fl);if(fl&7)a.push(Math.round((q.boom||0)*100)/100,q.slow||0,q.stun||0);return a;
}
// a hostile or friendly member's attacks arrive (after the usual part of 'me'). k: what is left of the 100 ms of the delayed picture, in seconds
function vsOnMe(r,msg,now,c){
  const k=Math.max(0,Math.min(MPDELAY,MPDELAY-(now-(c+r._clk.off))))/1000,due=now+k*1000;
  if(Array.isArray(msg.bm)&&r.P.beam)r.P.beam.d=+msg.bm[2]||0;
  if(msg.s)for(const a of msg.s)if(r.pshots.length<400){const vx=+a[2]||0,vy=+a[3]||0,x=+a[0]||0,y=+a[1]||0;
    r.pshots.push({x,y,vx,vy,r:+a[4]||4,kind:PKIND[a[5]]||'bolt',pierce:a[6]|0,g:0,d:+a[7]||0,fl:a[8]|0,boom:+a[9]||0,slow:+a[10]||0,stun:+a[11]||0,sx:x,sy:y,hs:null})}
  if(S.mode!=='play')return;
  if(msg.z)for(const a of msg.z)if(zones.length<200){const z={x:+a[0]||0,y:+a[1]||0,r:+a[2]||60,t:0,dur:Math.max(.1,(+a[3]||50)/100),mine:true,rem:true,dmg:0,foe:r.foe,vsD:r.foe?+a[6]||0:0,vsStun:+a[7]||0,vsCr:!!a[8],vsBy:r.idx};if(a[4]>=0&&a[5]>=0&&a[4]!==undefined){z.sx=+a[4]||0;z.sy=+a[5]||0}zones.push(z)}
  if(msg.f)for(const a of msg.f)if(fields.length<60)fields.push(mpFieldIn(r,a,true));
  if(msg.r)for(const a of msg.r){if(rings.length<300){const l=Math.max(.1,Math.min(2,(+a[3]||40)/100));rings.push({x:+a[0]||0,y:+a[1]||0,life:l,max:l,r:+a[2]||60,fx:true,foe:r.foe})}if(r.foe&&a[4]>0&&r._ev.length<200)r._ev.push({t:due,a:['k',a[0],a[1],a[2],a[4]]})}
  if(msg.v&&r.foe)for(const a of msg.v)if(Array.isArray(a)&&r._ev.length<200)r._ev.push({t:due,a});
}
// a remote hero's bolts, events and echoes, every frame (in place of the co-op part of mpRemoteStep)
function vsRemote(r,dt,now){
  const mine=r.foe&&!r.dead&&vsLive()&&S.mode==='play'&&!!P,ev=r._ev;
  if(ev&&ev.length){let n=0;for(const e of ev){if(now<e.t){ev[n++]=e;continue}if(mine)vsEvent(r,e)}ev.length=n}
  const ps=r.pshots;if(ps.length){let n=0;for(const p of ps){if(p.dead)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;let dead=p.x<WALL||p.x>W-WALL||p.y<WALL||p.y>H-WALL||obstacles.length&&blocked(p);
    if(p.g>0)p.g-=dt;
    else if(!dead){if(mine)dead=vsShot(r,p);
      // for the eye: it stops at whatever else it would hit (someone else's hero or creature that is hostile to its owner)
      if(!dead)for(const o of MP.remotes){if(o===r||o.team===r.team||o.dead||o.away)continue;let h=null;if(dist(o.P,p)<p.r+12)h=o.P;else for(const a of o.allies)if((a.pet&&!a.helper||a.kind==='thrall'||a.kind==='wolf'||a.apexAlly)&&!a.hidden&&dist(a,p)<a.r+p.r+3){h=a;break}
        if(h&&p._h!==h){if(p.pierce>0){p.pierce--;p._h=h}else dead=true;break}}}
    if(!dead&&!p.dead)ps[n++]=p}ps.length=n}
  const es=r.echoes;if(es.length){let n=0;for(const e of es){e.life-=dt;if(e.life>0)es[n++]=e}es.length=n}
}
/* --- every frame --- */
function vsFrame(dt,now){
  if(VS.phase!=='results'){VS.t-=dt;if(VS.t<0&&!(MP.role==='host'&&VS.phase==='sudden'))VS.t=0}
  if(VS.phase==='sudden'){const R=VS.ring||(VS.ring={x:W/2,y:H/2,r:VSK.ring0});R.r=VSK.ring0*Math.max(0,VS.t)/VSK.ringT}else if(VS.phase!=='over')VS.ring=null;
  if(VS.phase==='pick'){
    if(VS.t<=0&&!VP.mine)vsAuto();
    else if(VP.scr==='wait'&&!VP.late&&!MP.menu&&now-VP.t0>(VSK.pick+8)*1000)vsWait()}
  if(MP.role==='host')vsHostStep(dt,now);
  if(!VS)return;
  if(VP.q.length)vsFlush();
  if(now>=VP.tVh){VP.tVh=now+160;vsFlushHurt()}
  if(now>=MP.tMe){MP.tMe=Math.max(now+20,MP.tMe+1000/MPHZ);mpSendMe(now)}else if(VP.ev.length||MP.rq.length)mpSendMe(now); // a swing or a shockwave does not wait for the next tick
  if(now>=VP.tFl){VP.tFl=now+300;if(VP.fl>0&&P){floats.push({x:P.x+rand()*14-7,y:P.y-44,txt:'-'+fmt(Math.max(.1,Math.round(VP.fl*10)/10)),life:.8,c:'#ff5b6e'});VP.fl=0}if(VP.hud){VP.hud=false;hud()}}
  mpHud(now);
}
/* --- the 2D fallback: the ring, the countdown (pass 0 under the heroes, pass 1 over everything) --- */
function vsDraw2d(pass){
  if(!pass){const R=VS.ring;if(R){ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(R.x,R.y,Math.max(0,R.r),0,TAU,true);ctx.fillStyle='rgba(184,38,61,.28)';ctx.fill('evenodd');ctx.restore();circ(R.x,R.y,Math.max(1,R.r));ctx.strokeStyle='#ff8a4c';ctx.lineWidth=4;ctx.stroke()}return}
  const ph=VS.phase;ctx.textAlign='center';
  if(ph==='countdown'){ctx.fillStyle='rgba(13,12,17,.6)';ctx.fillRect(0,236,W,120);ctx.fillStyle='#d6a544';ctx.font='600 15px Spectral,Georgia,serif';ctx.fillText(('ROUND '+VS.round+'  ·  FIRST TO '+VS.wins).toUpperCase(),W/2,262);ctx.fillStyle='#e7dfcd';ctx.font='64px "Pirata One",Georgia,serif';ctx.fillText(''+Math.max(1,Math.ceil(VS.t)),W/2,330)}
  else if((ph==='fight'||ph==='sudden')&&!$('vsHud')){const tt=Math.max(0,Math.ceil(VS.t)),txt=ph==='sudden'?'Sudden death':Math.floor(tt/60)+':'+('0'+tt%60).slice(-2);ctx.font='600 15px Spectral,Georgia,serif';const w=ctx.measureText(txt).width+24;ctx.fillStyle='rgba(13,12,17,.7)';ctx.fillRect(W/2-w/2,WALL+4,w,24);ctx.fillStyle=ph==='sudden'||tt<=10?'#ff5b6e':'#d6a544';ctx.fillText(txt,W/2,WALL+21)}
}


/* ---------- boot ---------- */
// Shared interface for the 3D renderer and model files. Arrays are reassigned by the game, so read them through these getters every frame.
window.MB={tower:TOWER,get trial(){return TR},get doors(){return DOORS},get door(){return S.door&&DOOR[S.door.id]?{...doorInfo(S.door.id),floor:S.door.n+1}:null},get apex(){return apexInfo()},get apexPaths(){return apexPaths()},get arcs(){return arcs},get sightR(){return S.mode==='title'?0:sightR()},APEX,mp:MP,settings:SET,setSetting,on,api:API,stats:ST,get obstacles(){return obstacles},W,H,WALL,FOG,TAU,S,SPEC,CLASSES,PARTS,LEVELS,has,cls,pw,act2,melee,levelDef,col,cv,ctx,draw2d:draw,renderer:null,rank,pause,skills:SK,mana:MANA,RAR,pets:PETS,get equip(){return S.eq||{weapon:null,armor:null,trinket:null}},get fields(){return fields},
  // round 16 (see the contract, section Round 16)
  get aside(){return xfInfo()},asideQuit:()=>{if(!XF||XF.state!=='run')return false;if(S.paused)pause(false);xfFail('You turned back');return true},XTW,PROOFS:PRF,get proof(){return S.cls&&!S.adv&&!MP.on?CLASSES[S.cls].adv.map(a=>({id:a[0],name:a[1],title:PRF[a[0]].title,rule:prfRule(PRF[a[0]]),time:PRF[a[0]].t})):null},
  FISSURE:FIS,get fissures(){return fisInfo()},fissureEnter:(N,back)=>fisEnter(N,back),BELL,get bells(){return bellInfo()},openBells:()=>S.mode==='title'&&bellScreen(),get asides(){return{fissures:ASD.fis,proofs:ASD.proofs}},
  // round 14 (see the contract, section Round 14)
  get tutorial(){return tutInfo()},tutorialStart:c=>tutStart(S.mode==='title'?'title':'class',c),tutorialSkip:()=>{if(!TU)return false;tutEnd(false);return true},tutorialNext:()=>{if(!TU)return false;if(TU.i>=TU.list.length-1)tutEnd(true);else TU.wait=.01;return true},
  PCMD,get petCmd(){return cmdInfo()},petCommand:c=>petCommand(c),
  PHASES:PH,get bossPhase(){return phInfo()},
  ALT,alterations:si=>altList(si|0),setAlteration:(si,j)=>altSet(si|0,j|0),get alterationsFree(){return!!P&&altFree()},openSkills:back=>{if(S.cls&&act2()&&!VS)loadout(typeof back==='function'?back:API.hide)},
  FRAME:FR,get frame(){return frInfo()},get gear(){return gearInfo()},SETS,TRAITS,ELITE,ARENA,get arena(){return arenaInfo()},REV,get revive(){return reviveInfo()},LOCK,get lock(){return lockInfo()},lockCycle:()=>lockCycle(),lockClear:()=>{lockDrop();return true},lockOn:id=>{const m=mons.find(x=>x.id===id);if(m&&!VS&&lockOk(m)&&!m.hidden){lockPut(m,true);return true}return false},get elites(){return mons.filter(m=>m.el&&m.hp>0).map(m=>({id:m.id,kind:ELITE.kinds[m.el-1],name:m.s.name,x:m.x,y:m.y,r:m.r,hp:m.hp,maxHp:m.maxHp,ward:m.ward>0}))},openGear:back=>{if(S.cls&&act2()&&!VS)gearScreen(typeof back==='function'?back:API.hide)},frameSet:o=>frSet(o),openFrame:back=>{if(S.cls&&act2()&&!VS)frameScreen(typeof back==='function'?back:API.hide)},
  // round 12 (see the contract in the round-12 notes)
  CHAINS:CHN,PD,BRK,FIN,LINK,DARES,GRD,get chain(){return{count:CB.n,best:CB.best,t:Math.max(0,CB.t),cls:cls(),style:CHN[cls()||'none'].style,steps:CHN[cls()||'none'].steps.length}},breakOf:m=>m&&m.brkMax?Math.max(0,m.brk/m.brkMax):-1,
  get finisher(){return FN},finish:()=>finish(),get objective(){return DRE},get grade(){return GR},skillLink:i=>{const c=cls(),si=c?slotSkill(i|0):-1,d=si>=0&&skD(c,si);if(!d)return{sets:[],pays:[]};const o=linkInfo(d[4]),A=altOf(si);if(A&&A.sets&&!o.sets.includes(A.sets))o.sets.push(A.sets);return o},
  get P(){return P},get mons(){return VS?VNONE:mons},get shots(){return shots},get pshots(){return pshots},get allies(){return allies},get zones(){return zones},
  get echoes(){return echoes},get bits(){return bits},get rings(){return rings},get floats(){return floats},get morsels(){return morsels},get boss(){return VS?null:boss}};
let last=0;
let fast=1;
function tick(dt){if(!SET.shake)S.shake=0;if(S.paused){S.t+=dt;return}if(S.mode==='play'){ST.time+=dt;ST.levelTime+=dt}if(S.stop>0&&!MP.on)S.stop-=dt;else step(dt)} // (the short freeze on a heavy blow is left out in multiplayer, where the world must not stop)
function frame(ts){const real=(ts-last)/1000||0,dt=Math.min(.033,real);last=ts;
  // the game keeps real time on a slow device: several short steps per frame (up to three alone, six in a shared world) instead of slow motion
  if(MP.on){const e=Math.max(0,Math.min(.2,real)),n=Math.max(1,Math.ceil(e/.0334));for(let i=0;i<n*fast;i++)tick(e/n);mpFrame(e)}
  else{const e=Math.max(0,Math.min(.1,real)),n=Math.max(1,Math.ceil(e/.0334));for(let i=0;i<n*fast;i++)tick(e/n)}
  skillUi();manaUi();petUi();finUi();if(!SET.shake)S.shake=0;
  const R=MB.renderer;
  if(R&&R.ok){try{R.draw(Math.max(0,Math.min(MP.on?.2:.1,real)))}catch(e){console.error('3D renderer failed, falling back to 2D',e);R.ok=false;if(R.dispose)try{R.dispose()}catch(_){}}}
  else draw();
  bossBar();requestAnimationFrame(frame)}
function start(data){
  let saved=storedLevel();
  setLoad();
  let r={};try{r=JSON.parse(localStorage.getItem('marrowborn.run')||'{}')||{}}catch(e){}
  asdLoad();applyRun(r,saved);SAVE=snapshot(S.cls?saved:Math.min(saved,8)); // without a class the furthest a run can stand is the class choice
  // the tower's own record. A device that has climbed before this was kept gets what its stored run has reached.
  if(!towerLoad()&&S.cls&&saved>=10){towerDone(Math.max(saved,Math.min(9998,Math.floor(ST.bestLevel)||0)));}
  if(data&&data.level>0)saved=Math.floor(data.level);
  title(saved);requestAnimationFrame(frame);
}
if(location.hash.startsWith('#dev'))window.__mb={get XF(){return XF},PRF,FIS,BELL,XTW,ASD,proofGo,proofChoice,fisPlan,fisGo,fisAt,fisTurn,fisOffer,fisDrop,bellPlan,bellKey,bellGo,bellScreen,xfWin,xfFail,xrng,xhash,REV,mpRaised,finJoin,LOCK,get LK(){return LK},lockTap,ARENA,areaOf,themeOf,objHit,objDo,ELITE,elitesOf,SETS,SETK,TRAITS,TRK,gearScreen,dropItem,mkItem:item,gear:o=>{if(!S.cls)return null;if(!S.eq)S.eq=basicSet(S.cls);for(const sl of ESLOTS){const g=o&&o[sl];if(g===null){if(sl==='relic')delete S.eq.relic;continue}if(!g)continue;const cur=S.eq[sl]||item(S.cls,sl,1);S.eq[sl]=item(S.cls,sl,g.r!==undefined?g.r:cur.r,cur.lvl,cur.up,cur.m,g.set!==undefined?g.set:cur.set,g.tr!==undefined?g.tr:cur.tr)}eqSync();frApply();hud();return gearInfo()},TUT,get TU(){return TU},tutStart,tutOffer,PH,phase:ph=>{const b=boss;if(!b||!phOn(b)||CL())return null;ph=Math.max(2,Math.min(3,ph|0||(b.phase||1)+1));b.ward=0;b.hp=Math.min(b.hp,Math.floor(b.maxHp*(ph===2?2/3:1/3))-1);if(ph>(b.phase||1)){b.phase=ph;phaseShift(b)}return phInfo()},ALT,SKALT,altScreen,altNews,FR,frameScreen,frameAsk,S,keys,want,joy,VSK,NEC,LNG,AXK,PD,BRK,FIN,LINK,GRD,CHN,DARES,CB,pd:src=>{if(!P)return false;P.dgT=.1;P.pdCd=0;return pdTry(1e9,src||'shot')},tag:(m,t)=>{m=m||boss||mons[0];const i=LINK.tags.indexOf(t);if(m&&i>=0&&!CL())tagPut(m,1<<i);return m},brk:v=>{if(boss&&boss.brkMax)brkTake(boss,v===undefined?1e9:v);return boss},finish:()=>finish(),grade:()=>gradeMake(),dareOf,get DR(){return DRE},vsStep:dt=>{tick(dt);if(MP.on)mpFrame(dt)},get vp(){return VP},vsRaw:(d,by)=>vsHurt(d,by===undefined?-1:by,'dev'),step:tick,get fast(){return fast},set fast(v){fast=Math.max(1,v|0)},start:(n,r)=>{r=r||{};stReset();petsClear();S.cls=r.cls||null;S.adv=r.adv||null;S.apex=apexOk(r.apex)?r.apex:null;S.tr=r.tr|0;S.door=null;S.b=Object.assign(noBoons(),r.b);S.md=altIn(r.md);S.altSeen=true;S.sp=frNew();S.level=n;if(Array.isArray(r.sp)&&S.cls){S.sp.auto=false;S.sp.asked=true;frSpread(frBudget(n),r.sp)}S.scrap=0;S.eq=S.cls?basicSet(S.cls):null;S.load=fixLoad(r.load)||load0();if(!apexLoad(S.load,S.apex))S.load=load0();
    // gear:true plays out the drops of every level cleared so far with a sensible policy: wear anything rarer, otherwise melt it in
    if(S.cls&&r.gear)for(let k=8;k<n;k++){const d=dropItem(k),cur=S.eq[d.slot];if(d.r>cur.r&&cur.up<(d.r-cur.r)*.9)S.eq[d.slot]=d;else{cur.lvl++;cur.up+=RAR[d.r][3]}}
    if(r.hold)return; // hold: only set the character (multiplayer tests)
    startLevel(n)},mpGo:(n,retry)=>mpGo(n,retry),down:()=>{if(MP.on&&P&&!P.down&&S.mode==='play'){P.hp=0;mpDown();return true}return false},kill:()=>{if(S.mode==='play'&&TR&&!boss&&!S.wave&&TR.dur&&!TR.failed){S.banner=0;TR.t=TR.dur;if(!CL())trialStep(0);return true}if(!boss&&S.wave&&S.mode==='play'){mons=[];enterBoss()}return boss&&mons.includes(boss)&&(boss.ward=0,hurtM(boss,1e9))},
  // r8: floorKind(n), the tower record, the trial as it stands (and trialFail), a seasoned run, a shade, the lamp
  floorKind,TW:TWR,TK,get TR(){return TR},trialFail:w=>trialFail(w||'The trial is lost'),seasonedRun,AX,VPATH,apxAlly:(k,life)=>P&&['packbeast','icewight','cinder'].includes(k)?apxAlly(k,life||10):null,stat:(m,k,v,d)=>{m=m||boss||mons[0];if(m)mSt(m,k,v===undefined?1:v,d===undefined?UD():d);return m},fieldA:(...a)=>fieldA(...a),wave:(g,d)=>wave(P.x,P.y,g||0,70,d||0,400),arc:(...a)=>arc(...a),chain:(m,d)=>chain(P.x,P.y,m||boss||mons[0],d||1,3,200),UD,shade:(kind,life)=>{const k=SPEC[kind]?kind:'crawler';return shadeRise({s:lesserSpec(k,S.level,1),ai:SPEC[k].ai||k,kind:k,x:P.x+40,y:P.y},life||SHLIFE,true)},lampHit:()=>{const o=OBJ();return o&&lampHit(o)},rewardEnd,apexScreen,doorScreen,skill:si=>skill(si),reward,loadout,dropScreen,
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
