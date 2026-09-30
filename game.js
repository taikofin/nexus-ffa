(() => {
"use strict";

const status = document.getElementById("status");
const canvas = document.getElementById("c");
const stage = document.getElementById("stage");
const msgEl = document.getElementById("msg");
const timerEl = document.getElementById("timer");
const carryEl = document.getElementById("carry");
const scoreEl = document.getElementById("score");
const weaponEl = document.getElementById("weapon");

window.addEventListener("error", e => {
  status.textContent = "GAME ERROR: " + (e.message || "Unknown error") + " @ " + (e.lineno || "?");
  status.style.color = "#ff7b9f";
});
window.addEventListener("unhandledrejection", e => {
  status.textContent = "GAME ERROR: " + ((e.reason && e.reason.message) || e.reason || "Promise failed");
  status.style.color = "#ff7b9f";
});

if (!window.THREE) {
  status.textContent = "Three.js failed to load. Check the Quest internet connection.";
  return;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x5b7180, 0.0085);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
  alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
renderer.xr.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const rig = new THREE.Group();
scene.add(rig);
const camera = new THREE.PerspectiveCamera(74, 16/9, 0.045, 260);

function resizeFlatStage(){
  if(renderer.xr.isPresenting)return;
  const w=Math.max(1,stage.clientWidth||innerWidth);
  const h=Math.max(1,stage.clientHeight||innerHeight);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
resizeFlatStage();
camera.position.set(0, 1.65, 8);
rig.add(camera);

const clock = new THREE.Clock();
const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, -1);
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

function matStd(color, rough = .7, metal = .05, emissive = 0, emissiveIntensity = .35) {
  return new THREE.MeshStandardMaterial({color, roughness: rough, metalness: metal, emissive, emissiveIntensity});
}
const mats = {
  asphalt: new THREE.MeshPhysicalMaterial({color:0x101a22, roughness:.23, metalness:.25, clearcoat:.35, clearcoatRoughness:.24}),
  sidewalk: matStd(0x66727b,.78,.04),
  concrete: matStd(0x59656e,.82,.03),
  darkConcrete: matStd(0x303a42,.78,.05),
  glass: new THREE.MeshPhysicalMaterial({color:0x17384a, roughness:.18, metalness:.45, clearcoat:.35, clearcoatRoughness:.2, emissive:0x071520, emissiveIntensity:.3}),
  metal: matStd(0x27343e,.38,.72),
  cyan: new THREE.MeshBasicMaterial({color:0x62f6ff}),
  cyanGlow: new THREE.MeshStandardMaterial({color:0x71f8ff, emissive:0x39eaff, emissiveIntensity:2.1, roughness:.25, metalness:.15}),
  pinkGlow: new THREE.MeshStandardMaterial({color:0xff6bce, emissive:0xff2da8, emissiveIntensity:1.8, roughness:.28}),
  orangeGlow: new THREE.MeshStandardMaterial({color:0xffa35a, emissive:0xff6b22, emissiveIntensity:1.8, roughness:.28}),
  whiteGlow: new THREE.MeshStandardMaterial({color:0xf3fbff, emissive:0xaadfff, emissiveIntensity:1.15, roughness:.35}),
  bot: new THREE.MeshStandardMaterial({color:0xcbd7df, roughness:.48, metalness:.25, emissive:0x32091f, emissiveIntensity:.55}),
  botDark: matStd(0x25313a,.45,.55),
  puddle: new THREE.MeshBasicMaterial({color:0x8ad8ef, transparent:true, opacity:.16, depthWrite:false}),
  rain: new THREE.PointsMaterial({color:0xcdefff, size:.025, transparent:true, opacity:.55, depthWrite:false})
};

scene.add(new THREE.HemisphereLight(0xdff7ff, 0x222a31, 2.05));
const sun = new THREE.DirectionalLight(0xffd9a8, 2.65);
sun.position.set(-28, 48, 18);
scene.add(sun);
const warm = new THREE.PointLight(0xffa45f, 1.0, 22, 2);
warm.position.set(-6, 5, -8);
scene.add(warm);
const cool = new THREE.PointLight(0x55eaff, .8, 18, 2);
cool.position.set(8, 4, -24);
scene.add(cool);

function mesh(geo, mat, x=0, y=0, z=0, parent=scene) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,y,z);
  parent.add(m);
  return m;
}
function box(x,y,z,sx,sy,sz,mat,parent=scene) {
  return mesh(new THREE.BoxGeometry(sx,sy,sz), mat, x,y,z,parent);
}
function cyl(x,y,z,r,h,mat,parent=scene,segments=10) {
  return mesh(new THREE.CylinderGeometry(r,r,h,segments),mat,x,y,z,parent);
}

function makeSky() {
  const geo = new THREE.SphereGeometry(220, 24, 12);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x6eabc7)},bottom:{value:new THREE.Color(0xf1b37e)}},
    vertexShader:"varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){float h=clamp(normalize(vP).y*.55+.5,0.0,1.0); gl_FragColor=vec4(mix(bottom,top,h),1.0);}"
  });
  scene.add(new THREE.Mesh(geo,m));
}
makeSky();

function seeded(seed) {
  let x = seed | 0;
  return () => {
    x = (x * 1664525 + 1013904223) | 0;
    return ((x >>> 0) / 4294967296);
  };
}
function facadeTexture(seed, warmTone=false) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = warmTone ? "#4c4039" : "#243440";
  ctx.fillRect(0,0,256,256);
  const rnd = seeded(seed);
  for (let y=10;y<246;y+=22) {
    for (let x=10;x<246;x+=22) {
      const lit = rnd() > .37;
      ctx.fillStyle = lit ? (rnd()>.55 ? "#bfe8f4" : "#ffd39a") : "#101921";
      ctx.globalAlpha = lit ? (.42 + rnd()*.38) : .72;
      ctx.fillRect(x,y,13,10);
      ctx.globalAlpha = 1;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.3, 2.0);
  t.anisotropy = 2;
  return t;
}
const facadeMats = [1,2,3,4].map((n,i)=>{
  const tex = facadeTexture(100+n*71, i===3);
  return new THREE.MeshStandardMaterial({
    color:i===3?0x806a5e:0x637786,
    map:tex, emissiveMap:tex, emissive:i===3?0x51321c:0x173b4c,
    emissiveIntensity:.62, roughness:.63, metalness:.08
  });
});

function signTexture(text, a="#5ff6ff", b="#07131d") {
  const c=document.createElement("canvas"); c.width=512; c.height=160;
  const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,512,160); g.addColorStop(0,b); g.addColorStop(1,"#111825");
  x.fillStyle=g; x.fillRect(0,0,512,160);
  x.strokeStyle=a; x.lineWidth=8; x.strokeRect(6,6,500,148);
  x.font="900 62px Arial"; x.textAlign="center"; x.textBaseline="middle"; x.fillStyle=a;
  x.shadowColor=a; x.shadowBlur=18; x.fillText(text,256,82);
  return new THREE.CanvasTexture(c);
}
function addSign(text, x,y,z, rotY=0, color="#5ff6ff", scale=1) {
  const tex=signTexture(text,color);
  const m=new THREE.MeshBasicMaterial({map:tex,transparent:false});
  const p=new THREE.Mesh(new THREE.PlaneGeometry(5.2*scale,1.62*scale),m);
  p.position.set(x,y,z);p.rotation.y=rotY;scene.add(p);return p;
}

function addBuilding(x,z,w,d,h,style) {
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  const body=box(0,h/2,0,w,h,d,facadeMats[style%facadeMats.length],g);
  const setbackH=Math.max(2.2,h*.16);
  box(0,h+setbackH/2,w*.04,w*.68,setbackH,d*.72,mats.darkConcrete,g);
  box(0,h+setbackH+.35,0,w*.42,.7,d*.38,mats.metal,g);
  if(style%2===0) {
    for(let yy=3.2;yy<h-1;yy+=4.8) {
      box((x>0?-1:1)*(w/2+.12),yy,0,.22,.22,d*.72,mats.cyanGlow,g);
    }
  }
  if(style%3===0) {
    for(let yy=4;yy<h-2;yy+=5.2) {
      box(0,yy,d/2+.34,w*.72,.16,.72,mats.metal,g);
    }
  }
  if(style%4===0) {
    const pipe=cyl(w*.38,h*.58,-d*.48,.14,h*.52,mats.metal,g,8);
    pipe.rotation.z=.02;
  }
  const awning=box(0,2.7,-d/2-.65,w*.58,.18,1.2,style%2?mats.pinkGlow:mats.cyanGlow,g);
  awning.rotation.x=-.06;
  return g;
}

box(0,-.24,0,50,.48,156,mats.asphalt);
box(-18,.05,0,11,.28,156,mats.sidewalk);
box(18,.05,0,11,.28,156,mats.sidewalk);
box(-12,.02,0,.22,.08,156,mats.whiteGlow);
box(12,.02,0,.22,.08,156,mats.whiteGlow);

for(let z=-63;z<=63;z+=18) {
  for(let i=-3;i<=3;i++) {
    box(i*2.2,.035,z,1.25,.055,.34,mats.whiteGlow);
  }
}
for(let z=-56;z<65;z+=23) {
  box(-4.6,.03,z,6.2,.04,.18,mats.cyanGlow);
  box(5.1,.03,z,5.4,.04,.16,mats.pinkGlow);
}

const puddleGeo = new THREE.CircleGeometry(1,18);
for(let i=0;i<22;i++) {
  const r=seeded(600+i);
  const p=mesh(puddleGeo,mats.puddle,(r()-.5)*24,.045,-65+r()*130);
  p.rotation.x=-Math.PI/2;p.scale.set(.7+r()*2.8,.35+r()*1.2,1);
}

let bi=0;
for(const side of [-1,1]) {
  for(let z=-65;z<=65;z+=15.5) {
    const rnd=seeded(900+bi*37);
    const w=9+rnd()*8,d=10+rnd()*7,h=12+rnd()*27;
    const x=side*(25.5+rnd()*4.4);
    addBuilding(x,z,w,d,h,bi++);
  }
}

for(let i=0;i<28;i++) {
  const a=i*2.1, r=68+(i%5)*11, h=16+(i*13)%42;
  const b=box(Math.cos(a)*r,h/2-1,Math.sin(a)*r,8+(i%4)*4,h,8+(i%3)*4,facadeMats[i%4]);
  b.rotation.y=(i%5)*.13;
}

addSign("NEXUS", -12.7, 8, -19, Math.PI/2, "#62f6ff",1.15);
addSign("RUSH", 12.7, 7, 6, -Math.PI/2, "#ff62c9",.92);
addSign("PLAY", -12.7, 6, 37, Math.PI/2, "#ff9d54",.82);

const metro=new THREE.Group();metro.position.set(-15,.2,-8);scene.add(metro);
box(0,1.3,0,5,2.6,5.4,mats.darkConcrete,metro);
box(0,2.75,0,5.4,.28,5.8,mats.cyanGlow,metro);
const stair=box(0,.6,-2.35,3.3,1.1,2.2,mats.metal,metro); stair.rotation.x=-.19;
addSign("METRO",-15,3.75,-5.4,0,"#72f7ff",.68);

function addTree(x,z,s=1) {
  cyl(x,1.25*s,z,.16*s,2.5*s,matStd(0x4b392f,.95,0),scene,7);
  const crown=mesh(new THREE.IcosahedronGeometry(1.05*s,1),matStd(0x3f6a58,.9,0),x,3*s,z);
  crown.scale.y=1.25;
}
for(let z=-50;z<=54;z+=17) {addTree(-20,z,.9);addTree(20,z+7,.82)}

function addLamp(x,z,side) {
  cyl(x,2.2,z,.055,4.4,mats.metal,scene,6);
  const arm=box(x+side*.38,4.25,z,.78,.06,.06,mats.metal);
  box(x+side*.74,4.12,z,.28,.12,.18,mats.whiteGlow);
}
for(let z=-58;z<=58;z+=16) {addLamp(-13.3,z,1);addLamp(13.3,z+8,-1)}

const traffic=new THREE.Group();traffic.position.set(10,0,-28);scene.add(traffic);
cyl(0,2.2,0,.07,4.4,mats.metal,traffic,7);
box(-.75,4.2,0,1.5,.08,.08,mats.metal,traffic);
box(-1.4,4.05,0,.26,.55,.22,mats.darkConcrete,traffic);
box(-1.4,4.23,-.13,.12,.12,.04,mats.orangeGlow,traffic);

const rainCount=520, rainPos=new Float32Array(rainCount*3);
for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*70;rainPos[i*3+1]=Math.random()*38;rainPos[i*3+2]=(Math.random()-.5)*145}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3));
const rain=new THREE.Points(rainGeo,mats.rain);scene.add(rain);

const bank=new THREE.Group();
const bankCore=mesh(new THREE.CylinderGeometry(1.05,1.05,2.45,12),mats.cyanGlow,0,0,0,bank);
const bankRing=mesh(new THREE.TorusGeometry(1.85,.105,8,24),mats.pinkGlow,0,.08,0,bank);
bankRing.rotation.x=Math.PI/2;
const bankHalo=mesh(new THREE.TorusGeometry(2.3,.035,6,28),mats.cyan,0,.08,0,bank);
bankHalo.rotation.x=Math.PI/2;
scene.add(bank);

function makeBot(i) {
  const g=new THREE.Group();
  const torso=mesh(new THREE.CylinderGeometry(.4,.5,1.18,8),mats.bot,0,1.18,0,g);
  const head=mesh(new THREE.SphereGeometry(.31,10,8),mats.bot,0,2.02,0,g);
  box(0,2.0,-.29,.36,.12,.08,mats.pinkGlow,g);
  for(const s of [-1,1]) {
    const arm=cyl(s*.58,1.25,0,.11,.92,mats.botDark,g,7);arm.rotation.z=s*.25;
    cyl(s*.28,.55,0,.13,.86,mats.botDark,g,7);
  }
  const halo=mesh(new THREE.TorusGeometry(.58,.045,6,16),mats.pinkGlow,0,1.58,0,g);
  halo.rotation.x=Math.PI/2;
  g.userData={hp:100,alive:true,respawn:0,phase:i,shot:Math.random()*1.4};
  g.position.set((i%2?1:-1)*(5+(i*3)%15),0,-28+i*8.2);
  scene.add(g);return g;
}
const bots=Array.from({length:7},(_,i)=>makeBot(i));

const HAND_JOINT_GEO=new THREE.SphereGeometry(.011,6,5);
const handMats={
  left:new THREE.MeshStandardMaterial({color:0xff9ddc,emissive:0xff2da8,emissiveIntensity:.75,roughness:.35}),
  right:new THREE.MeshStandardMaterial({color:0x9afaff,emissive:0x26dce9,emissiveIntensity:.75,roughness:.35})
};
const hands={left:null,right:null};
const controllers={left:null,right:null};

function decorateHand(hand, side) {
  if(!hand || !hand.joints) return;
  Object.keys(hand.joints).forEach(name=>{
    const j=hand.joints[name];
    if(!j || j.userData.nexusVisible) return;
    const dot=new THREE.Mesh(HAND_JOINT_GEO,handMats[side]);
    if(name.includes("tip")) dot.scale.setScalar(1.32);
    if(name==="wrist") dot.scale.set(2.3,1.25,2.2);
    j.add(dot);
    j.userData.nexusVisible=true;
  });
}
function setupXRInput(index) {
  const hand=renderer.xr.getHand(index);rig.add(hand);
  hand.addEventListener("connected",e=>{
    if(e.data && e.data.handedness) hands[e.data.handedness]=hand;
  });
  hand.addEventListener("disconnected",()=>{
    if(hands.left===hand)hands.left=null;if(hands.right===hand)hands.right=null;
  });
  const ctl=renderer.xr.getController(index);rig.add(ctl);
  ctl.addEventListener("connected",e=>{
    if(e.data && e.data.handedness) controllers[e.data.handedness]=ctl;
  });
}
if(renderer.xr && typeof renderer.xr.getHand==="function"){setupXRInput(0);setupXRInput(1)}

function gunModel() {
  const g=new THREE.Group();
  box(0,-.035,-.10,.12,.19,.22,mats.botDark,g);
  box(0,.035,-.265,.095,.105,.30,mats.metal,g);
  box(0,.05,-.445,.065,.065,.16,mats.cyanGlow,g);
  box(.07,.035,-.23,.018,.045,.22,mats.pinkGlow,g);
  return g;
}
function sniperModel() {
  const g=new THREE.Group();
  box(0,-.02,-.21,.11,.13,.46,mats.botDark,g);
  const barrel=cyl(0,.025,-.53,.038,.68,mats.metal,g,8);barrel.rotation.x=Math.PI/2;
  const scope=cyl(0,.12,-.27,.055,.30,mats.cyanGlow,g,8);scope.rotation.x=Math.PI/2;
  box(.07,.02,-.34,.018,.035,.42,mats.pinkGlow,g);
  return g;
}
function swordModel(mat=mats.cyanGlow) {
  const g=new THREE.Group();
  const blade=box(0,.02,-.52,.055,.035,.92,mat,g);
  box(0,.02,-.055,.24,.045,.055,mats.metal,g);
  box(0,.02,.075,.07,.075,.22,mats.botDark,g);
  return g;
}
const weaponRoot=new THREE.Group();scene.add(weaponRoot);
const handgun=gunModel(),sniper=sniperModel(),sword=swordModel();
weaponRoot.add(handgun,sniper,sword);
const flourish=new THREE.Group();weaponRoot.add(flourish);
const ghostSword=swordModel(new THREE.MeshStandardMaterial({color:0xff75d4,emissive:0xff2da8,emissiveIntensity:1.7,transparent:true,opacity:.32,depthWrite:false}));
ghostSword.scale.setScalar(.88);flourish.add(ghostSword);

let weapon="HANDGUN",gesture="HANDGUN",candidate="HANDGUN",candidateAt=0;
let fireLatch=false,handgunLatch=false,knifeLatch=false;
let carry=0,score=0,remaining=420,bankT=0,msgTimer=0;
let swordVelocity=new THREE.Vector3(),lastSwordTip=new THREE.Vector3(),lastSwordTime=0;
let echoes=[];
let lastStableRight={time:0,pos:new THREE.Vector3(),quat:new THREE.Quaternion(),dir:new THREE.Vector3(0,0,-1)};
const ray=new THREE.Raycaster();

const aimAssist={
  target:null,
  direction:new THREE.Vector3(0,0,-1),
  strength:0,
  targetChangedAt:0
};
const AIM_ACQUIRE_GUN_DOT=Math.cos(THREE.MathUtils.degToRad(46));
const AIM_ACQUIRE_VIEW_DOT=Math.cos(THREE.MathUtils.degToRad(52));
const AIM_RETAIN_GUN_DOT=Math.cos(THREE.MathUtils.degToRad(58));
const AIM_RETAIN_VIEW_DOT=Math.cos(THREE.MathUtils.degToRad(64));

function aimPoint(bot){
  return bot.position.clone().add(new THREE.Vector3(0,1.42,0));
}
function targetMetrics(bot,origin,rawDir,camP,camF){
  if(!bot||!bot.userData.alive)return null;
  const p=aimPoint(bot),toGun=p.clone().sub(origin),distance=toGun.length();
  if(distance>.001)toGun.multiplyScalar(1/distance);
  const toView=p.clone().sub(camP).normalize();
  return {p,toGun,toView,distance,gunDot:rawDir.dot(toGun),viewDot:camF.dot(toView)};
}
function chooseAimTarget(origin,rawDir){
  const camP=camera.getWorldPosition(new THREE.Vector3());
  const camF=camera.getWorldDirection(new THREE.Vector3()).normalize();
  const current=targetMetrics(aimAssist.target,origin,rawDir,camP,camF);
  if(current&&current.distance<44&&current.gunDot>AIM_RETAIN_GUN_DOT&&current.viewDot>AIM_RETAIN_VIEW_DOT){
    return {bot:aimAssist.target,metrics:current,camP,camF};
  }

  let best=null,bestScore=-Infinity;
  for(const bot of bots){
    const m=targetMetrics(bot,origin,rawDir,camP,camF);
    if(!m||m.distance>40||m.gunDot<AIM_ACQUIRE_GUN_DOT||m.viewDot<AIM_ACQUIRE_VIEW_DOT)continue;
    const score=m.gunDot*2.4+m.viewDot*1.65-(m.distance/40)*.32;
    if(score>bestScore){bestScore=score;best={bot,metrics:m,camP,camF}}
  }
  if(best&&best.bot!==aimAssist.target)aimAssist.targetChangedAt=performance.now();
  aimAssist.target=best?best.bot:null;
  return best;
}
function computeAssistedAim(origin,rawDir,dt,nudgeCamera){
  rawDir=rawDir.clone().normalize();
  const picked=chooseAimTarget(origin,rawDir);
  if(!picked){
    aimAssist.strength=THREE.MathUtils.lerp(aimAssist.strength,0,Math.min(1,dt*8));
    aimAssist.direction.copy(rawDir);
    return rawDir;
  }

  const m=picked.metrics;
  const gunFit=THREE.MathUtils.clamp((m.gunDot-AIM_ACQUIRE_GUN_DOT)/(1-AIM_ACQUIRE_GUN_DOT),0,1);
  const viewFit=THREE.MathUtils.clamp((m.viewDot-AIM_ACQUIRE_VIEW_DOT)/(1-AIM_ACQUIRE_VIEW_DOT),0,1);
  const distanceFit=1-THREE.MathUtils.clamp((m.distance-7)/34,0,1);
  const strength=THREE.MathUtils.clamp(.28+gunFit*.34+viewFit*.12+distanceFit*.11,.28,.74);
  aimAssist.strength=THREE.MathUtils.lerp(aimAssist.strength,strength,Math.min(1,dt*11));

  const desired=rawDir.clone().lerp(m.toGun,aimAssist.strength).normalize();
  aimAssist.direction.copy(desired);

  if(nudgeCamera){
    const camHorizontal=picked.camF.clone();camHorizontal.y=0;
    const targetHorizontal=m.p.clone().sub(picked.camP);targetHorizontal.y=0;
    if(camHorizontal.lengthSq()>.001&&targetHorizontal.lengthSq()>.001){
      camHorizontal.normalize();targetHorizontal.normalize();
      const crossY=new THREE.Vector3().crossVectors(camHorizontal,targetHorizontal).y;
      const yawError=Math.atan2(crossY,THREE.MathUtils.clamp(camHorizontal.dot(targetHorizontal),-1,1));
      const deadZone=THREE.MathUtils.degToRad(1.7);
      if(Math.abs(yawError)>deadZone){
        const response=(Math.abs(yawError)-deadZone)*aimAssist.strength*dt*1.28;
        const maxStep=dt*.38;
        rig.rotation.y+=THREE.MathUtils.clamp(Math.sign(yawError)*response,-maxStep,maxStep);
      }
    }
  }
  return desired;
}

function flash(s,t=.9){msgEl.textContent=s;msgTimer=t}
function setWeapon(w){if(w===weapon)return;weapon=w;weaponEl.textContent=w;flash(w)}
function joint(hand,name){return hand&&hand.joints?hand.joints[name]:null}
function worldPos(obj,out=new THREE.Vector3()){return obj.getWorldPosition(out)}
function distance(a,b){return a&&b?worldPos(a,new THREE.Vector3()).distanceTo(worldPos(b,new THREE.Vector3())):99}
function pointDirection(hand, baseName="index-finger-metacarpal", tipName="index-finger-tip") {
  const a=joint(hand,baseName),b=joint(hand,tipName);
  if(!a||!b)return null;
  const av=worldPos(a,new THREE.Vector3()),bv=worldPos(b,new THREE.Vector3());
  return bv.sub(av).normalize();
}
function wristAim(hand) {
  const w=joint(hand,"wrist"),k=joint(hand,"index-finger-phalanx-proximal")||joint(hand,"index-finger-metacarpal");
  if(!w||!k)return null;
  const a=worldPos(w,new THREE.Vector3()),b=worldPos(k,new THREE.Vector3());
  return b.sub(a).normalize();
}
function rootBot(o){while(o&&o.parent&&!bots.includes(o))o=o.parent;return bots.includes(o)?o:null}
function tracer(o,d,color=mats.orangeGlow,life=95){
  const geo=new THREE.BufferGeometry().setFromPoints([o,o.clone().addScaledVector(d,38)]);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:color.color||0xff913e,transparent:true,opacity:.92}));
  scene.add(line);setTimeout(()=>{scene.remove(line);geo.dispose();line.material.dispose()},life);
}
function kill(b){
  if(!b||!b.userData.alive)return;
  b.userData.alive=false;b.visible=false;b.userData.respawn=2.6;carry++;flash("NEXUS ENERGY +1");
}
function hitBot(bot,damage){
  if(!bot||!bot.userData.alive)return false;
  bot.userData.hp-=damage;
  bot.children.forEach(c=>{if(c.material&&c.material.emissiveIntensity!==undefined)c.userData.oldEI=c.material.emissiveIntensity});
  if(bot.userData.hp<=0)kill(bot);
  return true;
}
function shoot(origin,dir,damage=55,isSniper=false){
  ray.set(origin,dir);
  const hits=ray.intersectObjects(bots.filter(b=>b.userData.alive),true);
  let didHit=false;
  if(hits.length){const b=rootBot(hits[0].object);if(b){didHit=hitBot(b,damage)}}
  tracer(origin,dir,isSniper?mats.cyanGlow:mats.orangeGlow,isSniper?150:85);
  if(isSniper&&didHit){flash("BULLET-TIME HIT",1.1);renderer.toneMappingExposure=1.42;setTimeout(()=>renderer.toneMappingExposure=1.12,220)}
}
function swordHit(p){
  let hit=false;
  for(const b of bots){
    if(!b.userData.alive)continue;
    if(b.position.clone().add(new THREE.Vector3(0,1.25,0)).distanceTo(p)<2.0){hitBot(b,62);hit=true}
  }
  if(hit)flash("SLASH");
}
function showEcho(a,b){
  const geo=new THREE.BufferGeometry().setFromPoints([a,b]);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xff58c9,transparent:true,opacity:.78}));
  scene.add(line);setTimeout(()=>{scene.remove(line);geo.dispose();line.material.dispose()},130);
}
function throwKnife(from){
  let target=null,best=20;
  for(const b of bots){if(!b.userData.alive)continue;const d=b.position.clone().add(new THREE.Vector3(0,1.25,0)).distanceTo(from);if(d<best){best=d;target=b}}
  if(!target){flash("NO KNIFE TARGET");return}
  const knife=new THREE.Group();
  const blade=box(0,0,-.18,.035,.018,.34,mats.whiteGlow,knife);
  box(0,0,.05,.055,.035,.12,mats.botDark,knife);
  knife.position.copy(from);scene.add(knife);
  const to=target.position.clone().add(new THREE.Vector3(0,1.35,0)),start=performance.now(),startP=from.clone();
  function anim(){
    const u=Math.min(1,(performance.now()-start)/470),ease=1-Math.pow(1-u,3);
    knife.position.lerpVectors(startP,to,ease);knife.rotation.z+=.45;knife.rotation.x+=.23;
    if(u<1)requestAnimationFrame(anim);
    else{
      renderer.toneMappingExposure=1.55;flash("KNIFE IMPACT");
      setTimeout(()=>renderer.toneMappingExposure=1.12,150);
      hitBot(target,120);
      setTimeout(()=>scene.remove(knife),180);
    }
  } anim();
}
function updateWeaponVisual(rightHand,dt,t){
  handgun.visible=weapon==="HANDGUN";sniper.visible=weapon==="SNIPER";sword.visible=weapon==="SWORD";flourish.visible=weapon==="SWORD";
  let origin=null,dir=null,quat=null;
  const w=joint(rightHand,"wrist");
  if(w){
    origin=worldPos(w,new THREE.Vector3());
    quat=w.getWorldQuaternion(new THREE.Quaternion());
    dir=weapon==="SNIPER"?pointDirection(rightHand):wristAim(rightHand);
    if(!dir)dir=pointDirection(rightHand);
    if(dir){
      lastStableRight.time=performance.now();lastStableRight.pos.copy(origin);lastStableRight.dir.copy(dir);lastStableRight.quat.copy(quat);
    }
  }
  if(!origin && performance.now()-lastStableRight.time<240){
    origin=lastStableRight.pos.clone();dir=lastStableRight.dir.clone();quat=lastStableRight.quat.clone();
  }
  if(!origin||!dir){weaponRoot.visible=false;aimAssist.target=null;return}

  if(weapon==="HANDGUN"){
    dir=computeAssistedAim(origin,dir,dt,true);
  }else{
    aimAssist.target=null;aimAssist.strength=0;
  }

  weaponRoot.visible=true;
  weaponRoot.position.copy(origin).addScaledVector(dir,.11);
  weaponRoot.quaternion.setFromUnitVectors(FWD,dir.clone().normalize());
  if(weapon==="SWORD")flourish.rotation.z=t*5.2;
  const camP=camera.getWorldPosition(new THREE.Vector3());
  if(camP.distanceTo(weaponRoot.position)<.17)weaponRoot.visible=false;
}
function updateHandsAndControls(dt,t){
  decorateHand(hands.left,"left");decorateHand(hands.right,"right");
  const R=hands.right,L=hands.left,now=performance.now();
  if(R){
    const w=joint(R,"wrist"),it=joint(R,"index-finger-tip"),mt=joint(R,"middle-finger-tip"),rt=joint(R,"ring-finger-tip"),pt=joint(R,"pinky-finger-tip"),tt=joint(R,"thumb-tip");
    if(w&&it&&mt&&rt&&pt){
      const wp=worldPos(w,new THREE.Vector3());
      const open=[it,mt,rt,pt].filter(j=>worldPos(j,new THREE.Vector3()).distanceTo(wp)>.105).length;
      const fg=worldPos(it,new THREE.Vector3()).distanceTo(wp)>.115 && worldPos(mt,new THREE.Vector3()).distanceTo(wp)<.095;
      const c=fg?"SNIPER":open>=3?"SWORD":"HANDGUN";
      if(c!==candidate){candidate=c;candidateAt=now}
      else if(c!==gesture&&now-candidateAt>190){gesture=c;setWeapon(c)}
      if(weapon==="HANDGUN"&&tt){
        const pinch=distance(tt,it)<.026;
        if(pinch&&!handgunLatch){
          handgunLatch=true;
          const raw=wristAim(R)||pointDirection(R);
          if(raw){
            const d=computeAssistedAim(wp,raw,Math.max(.008,dt),false);
            shoot(wp.clone().addScaledVector(d,.16),d,52,false);
          }
        }
        if(!pinch)handgunLatch=false;
      }
      if(weapon==="SNIPER"&&tt){
        const squeeze=distance(tt,mt)<.027;
        if(squeeze&&!fireLatch)fireLatch=true;
        if(!squeeze&&fireLatch){fireLatch=false;const d=pointDirection(R);if(d)shoot(worldPos(it,new THREE.Vector3()),d,112,true)}
      }
      if(weapon==="SWORD"){
        const tip=worldPos(it,new THREE.Vector3());
        if(lastSwordTime){
          const dtime=Math.max(.008,(now-lastSwordTime)/1000),delta=tip.clone().sub(lastSwordTip),speed=delta.length()/dtime;
          if(speed>1.15){
            swordHit(tip);
            const a=lastSwordTip.clone(),b=tip.clone();
            echoes.push({time:now+1000,a,b});
            const steer=(wristAim(R)||delta.clone().normalize());steer.y=0;
            if(steer.lengthSq()>.001){steer.normalize();swordVelocity.lerp(steer.multiplyScalar(Math.min(10,2.2+speed*1.35)),.42)}
          }
        }
        lastSwordTip.copy(tip);lastSwordTime=now;
      }
    }
  }
  updateWeaponVisual(R,dt,t);

  if(L){
    const w=joint(L,"wrist"),it=joint(L,"index-finger-tip"),rt=joint(L,"ring-finger-tip"),tt=joint(L,"thumb-tip"),mt=joint(L,"middle-finger-tip"),pt=joint(L,"pinky-finger-tip");
    if(w&&it&&rt&&tt){
      const pinch=distance(tt,rt)<.03;
      const indexDir=pointDirection(L);
      if(pinch&&indexDir){
        const d=indexDir.clone();d.y=0;if(d.lengthSq()>.001){d.normalize();rig.position.addScaledVector(d,dt*5.2)}
      }
      if(indexDir&&!pinch){
        const hf=camera.getWorldDirection(new THREE.Vector3());hf.y=0;hf.normalize();
        const hr=new THREE.Vector3().crossVectors(hf,UP).normalize();
        const side=indexDir.dot(hr);
        if(side>.68)rig.rotation.y-=dt*1.25;
        else if(side<-.68)rig.rotation.y+=dt*1.25;
      }
      if(weapon==="SNIPER"&&mt&&pt){
        const wp=worldPos(w,new THREE.Vector3());
        const open=[it,rt,mt,pt].filter(j=>worldPos(j,new THREE.Vector3()).distanceTo(wp)>.102).length>=3;
        if(open&&!knifeLatch){knifeLatch=true;throwKnife(wp)}
        if(!open)knifeLatch=false;
      }
    }
  }
  if(weapon==="SWORD"){
    rig.position.addScaledVector(swordVelocity,dt);
    swordVelocity.multiplyScalar(Math.pow(.91,dt*60));
  } else {
    swordVelocity.multiplyScalar(Math.pow(.76,dt*60));
  }
}

function updateBots(dt,t){
  const player=camera.getWorldPosition(new THREE.Vector3());
  for(const b of bots){
    if(!b.userData.alive){
      b.userData.respawn-=dt;
      if(b.userData.respawn<=0){
        b.userData.alive=true;b.visible=true;b.userData.hp=100;
        b.position.set((Math.random()-.5)*27,0,-28+(Math.random()-.5)*88);
      }
      continue;
    }
    const to=player.clone().sub(b.position);to.y=0;
    const d=to.length();
    if(d>7)b.position.addScaledVector(to.normalize(),dt*(.52+(b.userData.phase%3)*.08));
    b.rotation.y=Math.atan2(to.x,to.z);
    const halo=b.children[b.children.length-1];
    if(halo){
      halo.rotation.z=t*2.2+b.userData.phase;
      const lockScale=(weapon==="HANDGUN"&&aimAssist.target===b)?1.34:1;
      halo.scale.lerp(new THREE.Vector3(lockScale,lockScale,lockScale),Math.min(1,dt*10));
    }
    b.userData.shot-=dt;
    if(b.userData.shot<=0&&d<36){
      b.userData.shot=.85+Math.random()*1.35;
      const o=b.position.clone().add(new THREE.Vector3(0,1.55,0));
      tracer(o,player.clone().sub(o).normalize(),mats.pinkGlow,125);
    }
  }
}
function updateBank(dt,t){
  bankT+=dt*.55;
  bank.position.set(Math.sin(bankT)*12.5,1.55,-9+Math.cos(bankT*.71)*32);
  bankRing.rotation.z=t*1.7;bankHalo.rotation.z=-t*.8;
  const p=camera.getWorldPosition(new THREE.Vector3());
  if(carry>0&&p.distanceTo(bank.position)<3.2){
    score+=carry;carry=0;flash(score>=30?"NEXUS RUSH WON":"ENERGY BANKED",1.2);
  }
}
function updateRain(dt){
  const a=rainGeo.attributes.position.array;
  const px=rig.position.x,pz=rig.position.z;
  for(let i=0;i<rainCount;i++){
    a[i*3+1]-=dt*(15+(i%7));
    a[i*3]+=dt*.45;
    if(a[i*3+1]<.15){
      a[i*3+1]=24+Math.random()*18;
      a[i*3]=px+(Math.random()-.5)*66;
      a[i*3+2]=pz+(Math.random()-.5)*110;
    }
  }
  rainGeo.attributes.position.needsUpdate=true;
}
function updateEchoes(now){
  echoes=echoes.filter(e=>{
    if(now>=e.time){
      showEcho(e.a,e.b);
      const mid=e.a.clone().lerp(e.b,.5);swordHit(mid);flash("ECHO SLASH");
      return false;
    }
    return true;
  });
}

const keys={};
addEventListener("keydown",e=>{keys[e.code]=true;if(e.key==="1")setWeapon("HANDGUN");if(e.key==="2")setWeapon("SWORD");if(e.key==="3")setWeapon("SNIPER")});
addEventListener("keyup",e=>keys[e.code]=false);
canvas.addEventListener("click",()=>{
  if(renderer.xr.isPresenting)return;
  canvas.requestPointerLock&&canvas.requestPointerLock();
  const d=camera.getWorldDirection(new THREE.Vector3());
  shoot(camera.getWorldPosition(new THREE.Vector3()),d,weapon==="SNIPER"?112:55,weapon==="SNIPER");
});
addEventListener("mousemove",e=>{
  if(document.pointerLockElement===canvas){
    rig.rotation.y-=e.movementX*.0021;
    camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x-e.movementY*.0021));
  }
});
function desktopMove(dt){
  let d=new THREE.Vector3((keys.KeyD?1:0)-(keys.KeyA?1:0),0,(keys.KeyS?1:0)-(keys.KeyW?1:0));
  if(d.lengthSq()){d.normalize().applyAxisAngle(UP,rig.rotation.y);rig.position.addScaledVector(d,dt*(weapon==="SWORD"?8.5:5.3))}
}

let last=performance.now();
function frame(){
  const now=performance.now(),dt=Math.min(.045,(now-last)/1000),t=now/1000;last=now;
  if(!renderer.xr.isPresenting)desktopMove(dt);
  updateHandsAndControls(dt,t);
  updateBots(dt,t);
  updateBank(dt,t);
  updateRain(dt);
  updateEchoes(now);
  remaining=Math.max(0,remaining-dt);
  timerEl.textContent=Math.floor(remaining/60)+":"+String(Math.floor(remaining%60)).padStart(2,"0");
  carryEl.textContent=carry;scoreEl.textContent=score;
  if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)msgEl.textContent=""}
  renderer.render(scene,camera);
}
renderer.setAnimationLoop(frame);

async function enterVR(){
  if(!navigator.xr){status.textContent="WebXR is unavailable in this browser.";return}
  try{
    const ok=await navigator.xr.isSessionSupported("immersive-vr");
    if(!ok)throw new Error("Immersive VR not available");
    const session=await navigator.xr.requestSession("immersive-vr",{requiredFeatures:["local-floor"],optionalFeatures:["hand-tracking"]});
    await renderer.xr.setSession(session);
    document.body.classList.add("xr");
    status.textContent="VR ACTIVE — show your hands to Quest.";
    session.addEventListener("end",()=>document.body.classList.remove("xr"));
  }catch(e){status.textContent="VR start failed: "+e.message}
}
document.getElementById("enter").addEventListener("click",enterVR);

status.textContent="NEXUS v5 loaded — 16:9 cinematic frame + magnetic aim.";
addEventListener("resize",resizeFlatStage);
})();