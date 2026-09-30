import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/+esm";

const status=document.getElementById("status");
const scoreEl=document.getElementById("score");
const carryEl=document.getElementById("carry");
const weaponEl=document.getElementById("weapon");
weaponEl.textContent="FINGER GUNS + KNIFE";

window.addEventListener("error",e=>{
 if(status)status.innerHTML="<b>NEXUS ERROR</b><br>"+String(e.message||"Unknown error");
});
window.addEventListener("unhandledrejection",e=>{
 const msg=e.reason&&e.reason.message?e.reason.message:String(e.reason||"Promise error");
 if(status)status.innerHTML="<b>NEXUS ERROR</b><br>"+msg;
});

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x05090d);
scene.fog=new THREE.FogExp2(0x071015,.018);

const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,160);
camera.position.set(0,1.65,3);

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.92;
renderer.xr.enabled=true;
renderer.xr.setReferenceSpaceType("local-floor");
document.body.appendChild(renderer.domElement);

const player=new THREE.Group();
const cameraFX=new THREE.Group();
scene.add(player);
player.add(cameraFX);
cameraFX.add(camera);

const WORLD_UP=new THREE.Vector3(0,1,0);
scene.add(new THREE.HemisphereLight(0xcaf8ff,0x091018,1.7));
const key=new THREE.DirectionalLight(0xffffff,1.3);
key.position.set(-4,10,5);
scene.add(key);

// Low-cost neo-noir street lighting: warm pools against cold city shadows.
for(const p of [
 [-4,3.2,-10],[4,3.2,-30],[-4,3.2,-50]
]){
 const lamp=new THREE.PointLight(0xffb36b,2.3,14,2);
 lamp.position.set(p[0],p[1],p[2]);
 scene.add(lamp);
}

const matRoad=new THREE.MeshStandardMaterial({color:0x11171b,roughness:.24,metalness:.28});
const matDark=new THREE.MeshStandardMaterial({color:0x161a1f,roughness:.42,metalness:.18});
const matCyan=new THREE.MeshStandardMaterial({color:0x64f6ff,emissive:0x16cada,emissiveIntensity:2});
const matRed=new THREE.MeshStandardMaterial({color:0xff3d62,emissive:0xd81842,emissiveIntensity:1.8});
const matBot=new THREE.MeshStandardMaterial({color:0xdffcff,emissive:0x49dce8,emissiveIntensity:.9});

function meshBox(x,y,z,sx,sy,sz,mat,parent=scene){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);
 m.position.set(x,y,z);
 parent.add(m);
 return m;
}
meshBox(0,-.15,-20,34,.3,90,matRoad);

const ARENA_X=15.3;
const ARENA_Z_MIN=-62.5;
const ARENA_Z_MAX=22.5;

// Visible collision rails: low enough to see the city, tall enough to read as a real arena edge.
meshBox(-16.15,1.0,-20,.35,2.0,90,matCyan);
meshBox(16.15,1.0,-20,.35,2.0,90,matRed);
meshBox(0,1.0,23.5,32.0,2.0,.35,matCyan);
meshBox(0,1.0,-63.5,32.0,2.0,.35,matRed);

// Repeating bright rail caps make the boundary obvious at speed.
for(let z=-58;z<=18;z+=8){
 meshBox(-15.72,2.05,z,.12,.18,4.6,matCyan);
 meshBox(15.72,2.05,z,.12,.18,4.6,matRed);
}

function enforceBuildingWalls(){
 if(wallState.active)return;

 for(const w of wallSegments){
  if(Math.abs(player.position.z-w.z)>w.halfDepth+.18)continue;
  if(player.position.y>w.h+.8)continue;

  const side=w.side;
  const limit=side*(WALL_X-.34);

  if(side>0 && player.position.x>limit){
   if(stuntActive && velocity.x>1.0){
    beginWallSlide(side);
    return;
   }
   player.position.x=limit;
   if(velocity.x>0)velocity.x=0;
  }else if(side<0 && player.position.x<limit){
   if(stuntActive && velocity.x<-1.0){
    beginWallSlide(side);
    return;
   }
   player.position.x=limit;
   if(velocity.x<0)velocity.x=0;
  }
 }
}

function enforceArenaBounds(){
 let hit=false;
 if(player.position.x<-ARENA_X){
  player.position.x=-ARENA_X;
  if(velocity.x<0)velocity.x*=-.18;
  hit=true;
 }else if(player.position.x>ARENA_X){
  player.position.x=ARENA_X;
  if(velocity.x>0)velocity.x*=-.18;
  hit=true;
 }
 if(player.position.z<ARENA_Z_MIN){
  player.position.z=ARENA_Z_MIN;
  if(velocity.z<0)velocity.z*=-.18;
  hit=true;
 }else if(player.position.z>ARENA_Z_MAX){
  player.position.z=ARENA_Z_MAX;
  if(velocity.z>0)velocity.z*=-.18;
  hit=true;
 }
 if(hit&&!stuntActive){
  status.innerHTML="<b>ARENA EDGE</b><br>Barrier caught you — steer back toward the lane.";
 }
}

// Inner building faces are now real stunt/collision surfaces.
const WALL_X=6.45;
const wallSegments=[];

// Intentionally tiny boot scene: enough depth and scale to verify VR without stalling first frame.
for(const side of [-1,1]){
 for(let i=0;i<6;i++){
  const z=-10-i*12;
  const h=8+(i%3)*4;
  meshBox(side*10,h/2,z,7,h,8,i%2?matDark:matRoad);
  meshBox(side*6.45,2.2,z,.12,3.2,5.8,i%2?matCyan:matRed);
  wallSegments.push({side,z,h,halfDepth:4.0});
 }
}
for(let z=-8;z>-74;z-=12){
 meshBox(-2,.03,z,2,.04,.18,matCyan);
 meshBox(2,.03,z,2,.04,.18,matRed);
}

const rainCount=180;
const rainPos=new Float32Array(rainCount*3);
for(let i=0;i<rainCount;i++){
 rainPos[i*3]=(Math.random()-.5)*28;
 rainPos[i*3+1]=Math.random()*10+.4;
 rainPos[i*3+2]=-64+Math.random()*90;
}
const rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.PointsMaterial({
 color:0xbfd9e6,size:.035,transparent:true,opacity:.42,depthWrite:false
});
const rain=new THREE.Points(rainGeo,rainMat);
scene.add(rain);

function updateRain(dt){
 for(let i=0;i<rainCount;i++){
  const k=i*3;
  rainPos[k+1]-=dt*(12+(i%7));
  if(rainPos[k+1]<.05){
   rainPos[k+1]=8+((i*17)%30)/3;
   rainPos[k]=player.position.x+(((i*37)%100)/100-.5)*28;
   rainPos[k+2]=player.position.z+(((i*53)%100)/100-.5)*60;
  }
 }
 rainGeo.attributes.position.needsUpdate=true;
}

const bots=[];
for(let i=0;i<5;i++){
 const g=new THREE.Group();
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,1.35,8),matBot);
 body.position.y=.85;
 g.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.26,8,6),matBot);
 head.position.y=1.68;
 g.add(head);
 const eye=new THREE.Mesh(new THREE.BoxGeometry(.33,.07,.05),matRed);
 eye.position.set(0,1.69,-.24);
 g.add(eye);
 g.position.set((i%2?1:-1)*(3.5+(i%3)*2),0,-14-i*10);
 g.userData={hp:100,alive:true,respawn:0,knock:new THREE.Vector3()};
 scene.add(g);
 bots.push(g);
}

const hands={left:null,right:null};
const handDots={left:new Map(),right:new Map()};
const jointGeo=new THREE.SphereGeometry(.012,6,4);
const jointMatL=new THREE.MeshBasicMaterial({color:0xff6aa7});
const jointMatR=new THREE.MeshBasicMaterial({color:0x68f6ff});

const handBones=[
 ["wrist","thumb-metacarpal"],["thumb-metacarpal","thumb-phalanx-proximal"],["thumb-phalanx-proximal","thumb-phalanx-distal"],["thumb-phalanx-distal","thumb-tip"],
 ["wrist","index-finger-metacarpal"],["index-finger-metacarpal","index-finger-phalanx-proximal"],["index-finger-phalanx-proximal","index-finger-phalanx-intermediate"],["index-finger-phalanx-intermediate","index-finger-phalanx-distal"],["index-finger-phalanx-distal","index-finger-tip"],
 ["wrist","middle-finger-metacarpal"],["middle-finger-metacarpal","middle-finger-phalanx-proximal"],["middle-finger-phalanx-proximal","middle-finger-phalanx-intermediate"],["middle-finger-phalanx-intermediate","middle-finger-phalanx-distal"],["middle-finger-phalanx-distal","middle-finger-tip"],
 ["wrist","ring-finger-metacarpal"],["ring-finger-metacarpal","ring-finger-phalanx-proximal"],["ring-finger-phalanx-proximal","ring-finger-phalanx-intermediate"],["ring-finger-phalanx-intermediate","ring-finger-phalanx-distal"],["ring-finger-phalanx-distal","ring-finger-tip"],
 ["wrist","pinky-finger-metacarpal"],["pinky-finger-metacarpal","pinky-finger-phalanx-proximal"],["pinky-finger-phalanx-proximal","pinky-finger-phalanx-intermediate"],["pinky-finger-phalanx-intermediate","pinky-finger-phalanx-distal"],["pinky-finger-phalanx-distal","pinky-finger-tip"],
 ["index-finger-metacarpal","middle-finger-metacarpal"],["middle-finger-metacarpal","ring-finger-metacarpal"],["ring-finger-metacarpal","pinky-finger-metacarpal"]
];

function makeHandSkeleton(color){
 const arr=new Float32Array(handBones.length*2*3);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.BufferAttribute(arr,3));
 const mat=new THREE.LineBasicMaterial({
  color,transparent:true,opacity:.92,depthWrite:false
 });
 const lines=new THREE.LineSegments(geo,mat);
 lines.frustumCulled=false;
 scene.add(lines);
 return {lines,geo,arr};
}
const handSkeletons={
 left:makeHandSkeleton(0xff6aa7),
 right:makeHandSkeleton(0x68f6ff)
};

for(let i=0;i<2;i++){
 const h=renderer.xr.getHand(i);
 player.add(h);
 h.addEventListener("connected",e=>{
  const side=e.data&&e.data.handedness;
  if(side)hands[side]=h;
 });
 h.addEventListener("disconnected",()=>{
  if(hands.left===h)hands.left=null;
  if(hands.right===h)hands.right=null;
 });
}

const controllers={left:null,right:null};
for(let i=0;i<2;i++){
 const c=renderer.xr.getController(i);
 player.add(c);
 c.addEventListener("connected",e=>{
  const side=e.data&&e.data.handedness;
  if(side){
   controllers[side]=c;
   c.userData.input=e.data;
  }
 });
 c.addEventListener("disconnected",()=>{
  if(controllers.left===c)controllers.left=null;
  if(controllers.right===c)controllers.right=null;
 });
}

// Stunt knife: still intentionally simple, using two rectangular pieces.
const matBlade=new THREE.MeshStandardMaterial({
 color:0xcfd5d9,roughness:.16,metalness:.82,
 emissive:0x182027,emissiveIntensity:.18
});
const testGun=new THREE.Group();
const testGunBody=new THREE.Mesh(new THREE.BoxGeometry(.045,.018,.36),matBlade);
testGunBody.position.z=-.16;
const testGunGrip=new THREE.Mesh(new THREE.BoxGeometry(.065,.045,.15),matDark);
testGunGrip.position.z=.095;
testGun.add(testGunBody,testGunGrip);
scene.add(testGun);
testGun.visible=false;

const gunCatchMarker=new THREE.Mesh(
 new THREE.TorusGeometry(.10,.012,6,20),
 new THREE.MeshBasicMaterial({color:0xffd36a,transparent:true,opacity:.75,depthWrite:false})
);
gunCatchMarker.visible=false;
scene.add(gunCatchMarker);

const gunState={
 mode:"held",          // held -> falling -> grounded -> returning
 velocity:new THREE.Vector3(),
 angularVelocity:new THREE.Vector3(),
 returnStarted:0,
 restQuat:new THREE.Quaternion(),
 hitBots:new Set()
};

function controllerWorldPose(c){
 if(!c)return null;
 return {
  pos:c.getWorldPosition(new THREE.Vector3()),
  quat:c.getWorldQuaternion(new THREE.Quaternion())
 };
}

function rightHandPose(){
 if(controllers.right)return controllerWorldPose(controllers.right);

 const w=joint(hands.right,"wrist");
 if(!w)return null;
 return {
  pos:wpos(w),
  quat:w.getWorldQuaternion(new THREE.Quaternion())
 };
}

function controllerIsFlipped(c){
 if(!c)return false;
 const q=c.getWorldQuaternion(new THREE.Quaternion());
 const up=new THREE.Vector3(0,1,0).applyQuaternion(q);
 return up.dot(WORLD_UP)<-.25;
}

function updateHeldGun(){
 const p=rightHandPose();
 if(!p||gunState.mode!=="held"){
  if(!p&&gunState.mode==="held")testGun.visible=false;
  return;
 }

 testGun.visible=true;
 testGun.position.copy(p.pos);
 testGun.quaternion.copy(p.quat);
 testGun.translateZ(-.13);
 testGun.translateY(-.025);
}

function tryTossTestGun(){
 const c=controllers.right;
 if(!c||gunState.mode!=="held"||!controllerIsFlipped(c))return false;

 updateHeldGun();
 gunState.mode="falling";
 gunState.hitBots.clear();

 const q=testGun.quaternion.clone();
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();

 // Cinematic knife toss: up, out, and spinning hard.
 gunState.velocity.copy(forward).multiplyScalar(2.8).addScaledVector(WORLD_UP,5.2);
 gunState.angularVelocity.set(-12.5,2.0,1.1);
 gunCatchMarker.visible=false;

 status.innerHTML="<b>KNIFE TOSS</b><br>Knife is loose — it will land and stay there.";
 return true;
}

function updateTestGun(dt){
 if(gunState.mode==="held"){
  gunCatchMarker.visible=false;
  updateHeldGun();
  return;
 }

 if(gunState.mode==="falling"){
  testGun.visible=true;
  const prev=testGun.position.clone();

  gunState.velocity.y-=8.4*dt;
  testGun.position.addScaledVector(gunState.velocity,dt);

  const spin=gunState.angularVelocity.length();
  if(spin>.0001){
   const axis=gunState.angularVelocity.clone().normalize();
   const dq=new THREE.Quaternion().setFromAxisAngle(axis,spin*dt);
   testGun.quaternion.multiply(dq);
  }

  gunState.angularVelocity.multiplyScalar(Math.pow(.991,dt*60));

  // The airborne knife itself can hit a bot.
  const step=testGun.position.clone().sub(prev);
  const dist=step.length();
  if(dist>.0001){
   ray.set(prev,step.clone().normalize());
   ray.near=0;
   ray.far=dist+.06;
   const hits=ray.intersectObjects(bots.filter(b=>b.userData.alive&&!gunState.hitBots.has(b)),true);
   if(hits.length){
    const bot=rootBot(hits[0].object);
    if(bot){
     gunState.hitBots.add(bot);
     damageBot(bot,72);
     gunState.velocity.multiplyScalar(.55);
    }
   }
  }

  // Floor collision: drop it and leave it there.
  if(testGun.position.y<=.075){
   testGun.position.y=.075;
   gunState.velocity.set(0,0,0);
   gunState.angularVelocity.set(0,0,0);
   gunState.restQuat.copy(testGun.quaternion);
   gunState.mode="grounded";
   status.innerHTML="<b>KNIFE DOWN</b><br>Glide back to it. Bring your right hand close.";
  }
  return;
 }

 if(gunState.mode==="grounded"){
  testGun.visible=true;
  testGun.position.y=.075;
  testGun.quaternion.copy(gunState.restQuat);

  const p=rightHandPose();
  if(p&&p.pos.distanceTo(testGun.position)<1.05){
   gunState.mode="returning";
   gunState.returnStarted=performance.now();
   gunCatchMarker.visible=true;
   status.innerHTML="<b>KNIFE RECALL</b><br>Slow… faster… catch.";
  }
  return;
 }

 if(gunState.mode==="returning"){
  const p=rightHandPose();
  if(!p){
   // If tracking blinks, freeze instead of throwing the knife back on the ground.
   return;
  }

  const toHand=p.pos.clone().sub(testGun.position);
  const dist=toHand.length();
  const elapsed=(performance.now()-gunState.returnStarted)/1000;

  gunCatchMarker.visible=true;
  gunCatchMarker.position.copy(p.pos);
  gunCatchMarker.quaternion.copy(p.quat);

  // Guaranteed slow-to-fast recall. Lerp cannot overshoot or stop short.
  const ramp=THREE.MathUtils.clamp(elapsed/1.05,0,1);
  const pull=1-Math.exp(-dt*(1.25+14*ramp*ramp));
  testGun.position.lerp(p.pos,pull);
  testGun.quaternion.slerp(p.quat,THREE.MathUtils.clamp(dt*(2+12*ramp),0,1));

  // A generous final catch prevents the old "stops just short" problem.
  if(dist<.22||elapsed>1.65){
   gunState.mode="held";
   gunCatchMarker.visible=false;
   testGun.position.copy(p.pos);
   testGun.quaternion.copy(p.quat);
   updateHeldGun();
   status.innerHTML="<b>KNIFE CAUGHT</b><br>Back in hand.";
  }
 }
}

function joint(h,n){return h&&h.joints?h.joints[n]||null:null}
function wpos(o){return o.getWorldPosition(new THREE.Vector3())}
function indexDir(h){
 const a=joint(h,"index-finger-metacarpal")||joint(h,"wrist");
 const b=joint(h,"index-finger-tip");
 if(!a||!b)return null;
 return wpos(b).sub(wpos(a)).normalize();
}
function isFingerGun(h){
 const w=joint(h,"wrist"),i=joint(h,"index-finger-tip"),m=joint(h,"middle-finger-tip"),
       r=joint(h,"ring-finger-tip"),p=joint(h,"pinky-finger-tip"),t=joint(h,"thumb-tip");
 if(!w||!i||!m||!r||!p||!t)return false;
 const wp=wpos(w);
 return wpos(i).distanceTo(wp)>.105 &&
        wpos(t).distanceTo(wp)>.064 &&
        wpos(m).distanceTo(wp)<.105 &&
        wpos(r).distanceTo(wp)<.102 &&
        wpos(p).distanceTo(wp)<.098;
}
function fingerPose(h){
 if(!isFingerGun(h))return null;
 const tip=joint(h,"index-finger-tip");
 const dir=indexDir(h);
 return tip&&dir?{origin:wpos(tip),dir}:null;
}

function wristPos(h){
 const w=joint(h,"wrist");
 return w?wpos(w):null;
}

function isWheelGrip(h){
 const w=joint(h,"wrist");
 const m=joint(h,"middle-finger-tip");
 const r=joint(h,"ring-finger-tip");
 const p=joint(h,"pinky-finger-tip");
 const i=joint(h,"index-finger-tip");
 if(!w||!m||!r||!p||!i)return false;

 const wp=wpos(w);
 return (
  wpos(m).distanceTo(wp)<.112 &&
  wpos(r).distanceTo(wp)<.108 &&
  wpos(p).distanceTo(wp)<.104 &&
  wpos(i).distanceTo(wp)<.145
 );
}
function updateHandDots(side,h){
 const sk=handSkeletons[side];
 if(!h||!h.joints){
  for(const d of handDots[side].values())d.visible=false;
  sk.lines.visible=false;
  return;
 }

 sk.lines.visible=true;

 // Keep tiny joint markers, but make the connected hand silhouette dominant.
 for(const name in h.joints){
  let d=handDots[side].get(name);
  if(!d){
   d=new THREE.Mesh(jointGeo,side==="left"?jointMatL:jointMatR);
   d.scale.setScalar(name.includes("tip")?.85:.58);
   scene.add(d);
   handDots[side].set(name,d);
  }
  const j=h.joints[name];
  d.visible=!!j;
  if(j)d.position.copy(wpos(j));
 }

 for(let i=0;i<handBones.length;i++){
  const a=joint(h,handBones[i][0]);
  const b=joint(h,handBones[i][1]);
  const k=i*6;

  if(a&&b){
   const ap=wpos(a),bp=wpos(b);
   sk.arr[k]=ap.x;sk.arr[k+1]=ap.y;sk.arr[k+2]=ap.z;
   sk.arr[k+3]=bp.x;sk.arr[k+4]=bp.y;sk.arr[k+5]=bp.z;
  }else{
   // Collapse missing segments instead of leaving stale bones in the air.
   sk.arr[k]=sk.arr[k+1]=sk.arr[k+2]=0;
   sk.arr[k+3]=sk.arr[k+4]=sk.arr[k+5]=0;
  }
 }
 sk.geo.attributes.position.needsUpdate=true;
}

const ray=new THREE.Raycaster();
let score=0,carry=0;

function rootBot(o){
 while(o&&o.parent&&!bots.includes(o))o=o.parent;
 return bots.includes(o)?o:null;
}
function damageBot(b,damage){
 if(!b||!b.userData.alive)return;
 b.userData.hp-=damage;
 if(b.userData.hp<=0){
  b.userData.alive=false;
  b.visible=false;
  b.userData.respawn=2.2;
  carry++;
  carryEl.textContent=carry;
 }
}

const bulletGeo=new THREE.SphereGeometry(.028,6,4);
const bulletMat=new THREE.MeshBasicMaterial({color:0xd8ffff});
const bullets=[];
const BULLET_SPEED=24; // meters/second: clearly visible travel time in VR.

function spawnBullet(origin,dir,damage=48){
 const mesh=new THREE.Mesh(bulletGeo,bulletMat);
 mesh.position.copy(origin);
 scene.add(mesh);
 bullets.push({
  mesh,
  velocity:dir.clone().normalize().multiplyScalar(BULLET_SPEED),
  damage,
  life:1.8
 });
}

function updateBullets(dt){
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i];
  const prev=b.mesh.position.clone();
  const step=b.velocity.clone().multiplyScalar(dt);
  const dist=step.length();
  const dir=dist>.0001?step.clone().normalize():new THREE.Vector3(0,0,-1);

  // Segment ray prevents fast bullets tunneling through a target between frames.
  ray.set(prev,dir);
  ray.near=0;
  ray.far=dist+.04;
  const hits=ray.intersectObjects(bots.filter(x=>x.userData.alive),true);

  if(hits.length){
   const bot=rootBot(hits[0].object);
   if(bot)damageBot(bot,b.damage);
   scene.remove(b.mesh);
   bullets.splice(i,1);
   continue;
  }

  b.mesh.position.add(step);
  b.life-=dt;
  if(b.life<=0){
   scene.remove(b.mesh);
   bullets.splice(i,1);
  }
 }
}

function bestAimTarget(pose){
 let best=null;
 let bestMiss=.78; // aim line must pass within ~78cm of target center
 for(const bot of bots){
  if(!bot.userData.alive)continue;
  const center=bot.position.clone().add(new THREE.Vector3(0,1.05,0));
  const to=center.sub(pose.origin);
  const forward=to.dot(pose.dir);
  if(forward<=0||forward>32)continue;

  // Closest distance from target center to the finger-gun aim ray.
  const closest=pose.origin.clone().addScaledVector(pose.dir,forward);
  const miss=closest.distanceTo(bot.position.clone().add(new THREE.Vector3(0,1.05,0)));
  if(miss<bestMiss){
   bestMiss=miss;
   best=bot;
  }
 }
 return best;
}

const fireCooldown={left:0,right:0};
function updateAimFire(side,pose){
 if(!pose)return;
 const target=bestAimTarget(pose);
 if(!target)return;

 const now=performance.now();
 if(now<fireCooldown[side])return;
 fireCooldown[side]=now+190;

 // Still use the player's exact finger direction. Aim assist decides WHEN to fire,
 // it does not bend the bullet toward the target.
 spawnBullet(pose.origin.clone(),pose.dir.clone(),48);
}

const bodyProxy=new THREE.Group();
player.add(bodyProxy);
const torso=new THREE.Mesh(new THREE.CylinderGeometry(.23,.28,.9,8),matDark);
bodyProxy.add(torso);
const hips=new THREE.Mesh(new THREE.SphereGeometry(.20,8,6),matDark);
bodyProxy.add(hips);
const limbGeo=new THREE.CylinderGeometry(.085,.085,.72,7);
const limbs={};
for(const k of ["thighL","shinL","thighR","shinR","armL","armR"]){
 limbs[k]=new THREE.Mesh(limbGeo,matDark);
 bodyProxy.add(limbs[k]);
}
function poseLimb(m,a,b){
 const mid=a.clone().add(b).multiplyScalar(.5);
 const v=b.clone().sub(a);
 m.position.copy(mid);
 m.scale.set(1,Math.max(.15,v.length()/.72),1);
 m.quaternion.setFromUnitVectors(WORLD_UP,v.normalize());
}
function poseBody(stunt,front){
 if(!stunt){
  torso.position.set(0,1.0,.12); torso.rotation.set(0,0,0);
  hips.position.set(0,.62,.13);
  poseLimb(limbs.thighL,new THREE.Vector3(-.13,.62,.13),new THREE.Vector3(-.14,.28,.12));
  poseLimb(limbs.shinL,new THREE.Vector3(-.14,.28,.12),new THREE.Vector3(-.13,.02,.10));
  poseLimb(limbs.thighR,new THREE.Vector3(.13,.62,.13),new THREE.Vector3(.14,.28,.12));
  poseLimb(limbs.shinR,new THREE.Vector3(.14,.28,.12),new THREE.Vector3(.13,.02,.10));
  limbs.armL.visible=false; limbs.armR.visible=false;
  return;
 }
 torso.position.set(.02,1.0,.22);
 hips.position.set(-.12,.63,.24);
 poseLimb(limbs.thighL,new THREE.Vector3(-.18,.64,.23),new THREE.Vector3(-.62,.46,.31));
 poseLimb(limbs.shinL,new THREE.Vector3(-.62,.46,.31),new THREE.Vector3(-1.08,.29,.40));
 poseLimb(limbs.thighR,new THREE.Vector3(-.02,.64,.23),new THREE.Vector3(.28,.36,.18));
 poseLimb(limbs.shinR,new THREE.Vector3(.28,.36,.18),new THREE.Vector3(.04,.08,.27));
 poseLimb(limbs.armL,new THREE.Vector3(-.13,1.21,.18),new THREE.Vector3(-.42,1.52,.18));
 poseLimb(limbs.armR,new THREE.Vector3(.14,1.21,.17),new THREE.Vector3(.62,1.08,.02));
 limbs.armL.visible=true; limbs.armR.visible=true;
}
bodyProxy.position.set(0,0,.18);
poseBody(false,false);

const speedN=26;
const speedData=new Float32Array(speedN*6);
const speedGeo=new THREE.BufferGeometry();
speedGeo.setAttribute("position",new THREE.BufferAttribute(speedData,3));
const speedMat=new THREE.LineBasicMaterial({color:0x74f8ff,transparent:true,opacity:0,depthWrite:false});
const speedLines=new THREE.LineSegments(speedGeo,speedMat);
scene.add(speedLines);

const velocity=new THREE.Vector3();
const GROUND_Y=0;
let grounded=true;

// Easy movement is back: a relaxed two-hand grip behaves like the steering wheel again.
let wheelDriveActive=false;
let wheelTurn=0;
let wheelYaw=0;
let wheelYawInitialized=false;

function updateWheelDrive(dt){
 const lp=wristPos(hands.left);
 const rp=wristPos(hands.right);
 const bothFists=!!(lp&&rp&&isFist(hands.left)&&isFist(hands.right));
 const active=!!(
  lp&&rp&&!bothFists&&
  isWheelGrip(hands.left)&&isWheelGrip(hands.right)&&
  !stuntActive&&!wallState.active
 );

 if(!active){
  wheelDriveActive=false;
  wheelTurn=THREE.MathUtils.lerp(wheelTurn,0,1-Math.exp(-dt*7));
  return false;
 }

 const span=rp.clone().sub(lp);
 if(span.length()<.20||span.length()>.85){
  wheelDriveActive=false;
  return false;
 }

 wheelDriveActive=true;

 const headF=camera.getWorldDirection(new THREE.Vector3());
 headF.y=0;
 if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();
 const headR=new THREE.Vector3().crossVectors(headF,WORLD_UP).normalize();

 const horizontal=span.dot(headR);
 const vertical=span.dot(WORLD_UP);
 const raw=Math.atan2(vertical,Math.abs(horizontal)+.001);
 const signed=horizontal>=0?raw:-raw;
 const targetTurn=THREE.MathUtils.clamp(signed/.72,-1,1);
 wheelTurn=THREE.MathUtils.lerp(wheelTurn,targetTurn,1-Math.exp(-dt*10));

 if(!wheelYawInitialized){
  wheelYaw=Math.atan2(-headF.x,-headF.z);
  wheelYawInitialized=true;
 }

 wheelYaw+=(-wheelTurn*1.72)*dt;

 const headYaw=Math.atan2(-headF.x,-headF.z);
 let err=headYaw-wheelYaw;
 err=Math.atan2(Math.sin(err),Math.cos(err));
 wheelYaw+=err*(1-Math.abs(wheelTurn))*.95*dt;

 const dir=new THREE.Vector3(-Math.sin(wheelYaw),0,-Math.cos(wheelYaw));
 const speed=7.4;
 velocity.x=THREE.MathUtils.lerp(velocity.x,dir.x*speed,1-Math.exp(-dt*4.1));
 velocity.z=THREE.MathUtils.lerp(velocity.z,dir.z*speed,1-Math.exp(-dt*4.1));
 velocity.y=0;
 player.position.y=GROUND_Y;
 grounded=true;

 centerAssist=THREE.MathUtils.lerp(centerAssist,wheelTurn,1-Math.exp(-dt*8));
 cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,-centerAssist*.07,1-Math.exp(-dt*7));
 cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,-centerAssist*.035,1-Math.exp(-dt*7));

 return true;
}

// Two-fist rolling glide. There is intentionally NO orb visual.
let fistGlideActive=false;
let fistGlideEnergy=0;
let fistGlideSpeed=0;
let fistPrevAngle=null;
let fistPrevSpan=null;
let fistRollRate=0;
let glideYaw=0;
let glideYawInitialized=false;
let centerAssist=0;

function isFist(h){
 const w=joint(h,"wrist");
 const i=joint(h,"index-finger-tip");
 const m=joint(h,"middle-finger-tip");
 const r=joint(h,"ring-finger-tip");
 const p=joint(h,"pinky-finger-tip");
 const t=joint(h,"thumb-tip");
 if(!w||!i||!m||!r||!p||!t)return false;
 const wp=wpos(w);
 return (
  wpos(i).distanceTo(wp)<.115 &&
  wpos(m).distanceTo(wp)<.108 &&
  wpos(r).distanceTo(wp)<.104 &&
  wpos(p).distanceTo(wp)<.100 &&
  wpos(t).distanceTo(wp)<.105
 );
}

function updateFistGlide(dt){
 const lp=wristPos(hands.left);
 const rp=wristPos(hands.right);
 const active=!!(lp&&rp&&isFist(hands.left)&&isFist(hands.right)&&!stuntActive&&!wallState.active);

 if(!active){
  fistGlideActive=false;
  fistPrevAngle=null;
  fistPrevSpan=null;
  fistRollRate=THREE.MathUtils.lerp(fistRollRate,0,1-Math.exp(-dt*7));
  fistGlideEnergy*=Math.pow(.965,dt*60);
  fistGlideSpeed=THREE.MathUtils.lerp(fistGlideSpeed,fistGlideEnergy*12.5,1-Math.exp(-dt*2.7));
  centerAssist=THREE.MathUtils.lerp(centerAssist,0,1-Math.exp(-dt*5));
  return;
 }

 fistGlideActive=true;

 const center=lp.clone().add(rp).multiplyScalar(.5);
 const span=rp.clone().sub(lp);

 const headF=camera.getWorldDirection(new THREE.Vector3());
 headF.y=0;
 if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();
 const headR=new THREE.Vector3().crossVectors(headF,WORLD_UP).normalize();

 // Measure the wrist-to-wrist line in the player's view plane.
 const x=span.dot(headR);
 const y=span.dot(WORLD_UP);
 const angle=Math.atan2(y,x);

 if(fistPrevAngle!==null){
  let d=angle-fistPrevAngle;
  d=Math.atan2(Math.sin(d),Math.cos(d));
  const angularSpeed=Math.abs(d)/Math.max(.008,dt);

  // Rolling the fists around each other pumps momentum into the glide.
  fistRollRate=THREE.MathUtils.lerp(
   fistRollRate,
   THREE.MathUtils.clamp(angularSpeed/7.5,0,1.35),
   1-Math.exp(-dt*10)
  );

  // Require real circular motion, not just clenched fists held still.
  if(angularSpeed>.45){
   fistGlideEnergy=Math.min(1.25,fistGlideEnergy + angularSpeed*dt*.22);
  }else{
   fistGlideEnergy*=Math.pow(.982,dt*60);
  }
 }
 fistPrevAngle=angle;

 // Smooth coast: stop rolling and momentum bleeds away gradually.
 fistGlideEnergy*=Math.pow(.992,dt*60);
 const targetSpeed=THREE.MathUtils.clamp(2.2+fistGlideEnergy*11.8,0,15.2);
 fistGlideSpeed=THREE.MathUtils.lerp(fistGlideSpeed,targetSpeed,1-Math.exp(-dt*3.4));

 if(!glideYawInitialized){
  glideYaw=Math.atan2(-headF.x,-headF.z);
  glideYawInitialized=true;
 }

 // Midpoint left/right steers the glide like banking an invisible rolling sphere.
 const headPos=camera.getWorldPosition(new THREE.Vector3());
 const sideOffset=THREE.MathUtils.clamp((center.clone().sub(headPos)).dot(headR)/.42,-1,1);
 const turnStrength=sideOffset*(.55+fistGlideEnergy*.95);
 glideYaw-=turnStrength*dt;

 // Magnetic center keeps body movement from drifting away from where the player is looking.
 const headYaw=Math.atan2(-headF.x,-headF.z);
 let yawError=headYaw-glideYaw;
 yawError=Math.atan2(Math.sin(yawError),Math.cos(yawError));
 glideYaw+=yawError*(.55+(.35*(1-Math.abs(sideOffset))))*dt;

 const moveDir=new THREE.Vector3(-Math.sin(glideYaw),0,-Math.cos(glideYaw)).normalize();

 velocity.x=THREE.MathUtils.lerp(velocity.x,moveDir.x*fistGlideSpeed,1-Math.exp(-dt*3.5));
 velocity.z=THREE.MathUtils.lerp(velocity.z,moveDir.z*fistGlideSpeed,1-Math.exp(-dt*3.5));
 velocity.y=0;
 player.position.y=GROUND_Y;
 grounded=true;

 // Subtle cinematic body/camera bank only. No orb is rendered.
 centerAssist=THREE.MathUtils.lerp(centerAssist,sideOffset,1-Math.exp(-dt*8));
 cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,-centerAssist*.08,1-Math.exp(-dt*7));
 cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,-centerAssist*.035,1-Math.exp(-dt*7));
}

let wallState={
 active:false,
 phase:"none",
 side:0,
 start:0,
 attachY:0,
 attachZ:0,
 rollStart:0
};

function wallSegmentAt(z,side,y){
 for(const w of wallSegments){
  if(w.side!==side)continue;
  if(Math.abs(z-w.z)<=w.halfDepth+.18 && y<=w.h+.8)return w;
 }
 return null;
}

function beginWallSlide(side){
 wallState.active=true;
 wallState.phase="attach";
 wallState.side=side;
 wallState.start=performance.now();
 wallState.attachY=Math.max(.7,player.position.y);
 wallState.attachZ=player.position.z;

 stuntActive=false;
 grounded=false;

 player.position.x=side*(WALL_X-.34);
 velocity.set(0,0,velocity.z*.28);

 status.innerHTML="<b>WALL CATCH</b><br>Cinematic attach — aim and shoot while the slide builds.";
}

function maybeCatchWall(){
 if(!stuntActive||wallState.active)return;

 const side=player.position.x>=0?1:-1;
 const seg=wallSegmentAt(player.position.z,side,player.position.y);
 if(!seg)return;

 const nearFace=Math.abs(Math.abs(player.position.x)-WALL_X)<.60;
 const movingInto=velocity.x*side>1.0;
 if(nearFace&&movingInto)beginWallSlide(side);
}

function updateWallState(dt){
 if(!wallState.active)return;

 const now=performance.now();
 const side=wallState.side;

 if(wallState.phase==="attach"){
  const p=THREE.MathUtils.clamp((now-wallState.start)/420,0,1);
  const e=p*p*(3-2*p);

  player.position.x=THREE.MathUtils.lerp(player.position.x,side*(WALL_X-.34),e);
  velocity.x=0;

  // Cinematic wall alignment without stealing head tracking.
  cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,-side*.34,1-Math.exp(-dt*10));
  cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,-side*.18,1-Math.exp(-dt*9));
  bodyProxy.rotation.z=THREE.MathUtils.lerp(bodyProxy.rotation.z,-side*.72,1-Math.exp(-dt*10));

  if(p>=1){
   wallState.phase="slide";
   wallState.start=now;
   velocity.set(0,-.35,velocity.z*.20);
  }
  return;
 }

 if(wallState.phase==="slide"){
  const t=(now-wallState.start)/1000;

  // The exact requested curve: slow first, then accelerating fast.
  const accel=THREE.MathUtils.smoothstep(t,0.35,2.2);
  const slideSpeed=THREE.MathUtils.lerp(.28,7.8,accel);

  player.position.x=side*(WALL_X-.34);
  player.position.y=Math.max(.20,player.position.y-slideSpeed*dt);
  velocity.x=0;
  velocity.y=0;
  velocity.z*=Math.pow(.92,dt*60);

  cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,-side*.27,1-Math.exp(-dt*6));
  cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,-side*.12,1-Math.exp(-dt*6));

  // No user-triggered rolls/flips are allowed in this phase.
  if(t>2.45 || player.position.y<=.22){
   wallState.phase="rolloff";
   wallState.rollStart=now;
   velocity.set(-side*5.4,.7,velocity.z*.45);
  }
  return;
 }

 if(wallState.phase==="rolloff"){
  const p=THREE.MathUtils.clamp((now-wallState.rollStart)/900,0,1);
  const staged=THREE.MathUtils.clamp((p-.10)/.78,0,1);
  const ease=staged<.5?2*staged*staged:1-Math.pow(-2*staged+2,2)/2;

  // Exactly one automatic roll-off. Other rolls remain locked out.
  cameraFX.rotation.z=-side*.27 + side*(Math.PI*2)*ease;
  cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,0,1-Math.exp(-dt*7));
  bodyProxy.rotation.z=side*(Math.PI*2)*ease;

  player.position.addScaledVector(velocity,dt);
  velocity.y-=4.8*dt;

  if(p>=1){
   wallState.active=false;
   wallState.phase="none";
   cameraFX.rotation.set(0,0,0);
   bodyProxy.rotation.set(0,0,0);
   status.innerHTML="<b>ROLLED OFF</b><br>Wall sequence complete.";
  }
 }
}

let stuntActive=false;
let stuntMode="back";
let stuntStart=0;
let stuntDuration=0;
let stuntSide=1;
const stuntDir=new THREE.Vector3();
const fingerLatch={left:false,right:false};
let gestureCandidate=null;
let gestureSince=0;
let stuntCooldownUntil=0;

function beginStunt(mode){
 if(stuntActive||wallState.active)return;
 stuntMode=mode;
 stuntActive=true;
 grounded=false;
 stuntStart=performance.now();
 stuntDuration=mode==="front"?1900:1650;
 stuntSide=Math.random()<.5?-1:1;

 // Test prop only tosses if the RIGHT controller itself is upside-down/flipped.
 tryTossTestGun();

 // Capture head direction BEFORE auto camera begins.
 const f=camera.getWorldDirection(new THREE.Vector3());
 f.y=THREE.MathUtils.clamp(f.y,-.35,.35);
 if(f.lengthSq()<.001)f.set(0,0,-1); else f.normalize();
 stuntDir.copy(mode==="front"?f:f.clone().multiplyScalar(-1));

 velocity.copy(stuntDir).multiplyScalar(mode==="front"?12.5:14.5);
 velocity.y+=mode==="front"?1.8:3.8;

 status.innerHTML=mode==="front"
  ?"<b>FRONT FLIP</b><br>Forward direction locked. Camera flip is automatic."
  :"<b>BACK STUNT</b><br>Back-of-head direction locked. Camera orbit is automatic.";
}

function updateStunt(dt,poses){
 if(!stuntActive){
  if(wallState.active)return;
  cameraFX.rotation.x=THREE.MathUtils.lerp(cameraFX.rotation.x,0,1-Math.exp(-dt*8));
  cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,0,1-Math.exp(-dt*8));
  cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,0,1-Math.exp(-dt*8));
  cameraFX.position.lerp(new THREE.Vector3(),1-Math.exp(-dt*8));
  bodyProxy.position.x=THREE.MathUtils.lerp(bodyProxy.position.x,0,1-Math.exp(-dt*7));
  bodyProxy.position.z=THREE.MathUtils.lerp(bodyProxy.position.z,.18,1-Math.exp(-dt*7));
  bodyProxy.rotation.set(
   THREE.MathUtils.lerp(bodyProxy.rotation.x,0,1-Math.exp(-dt*7)),
   THREE.MathUtils.lerp(bodyProxy.rotation.y,0,1-Math.exp(-dt*7)),
   THREE.MathUtils.lerp(bodyProxy.rotation.z,0,1-Math.exp(-dt*7))
  );
  poseBody(false,false);
  return;
 }

 const elapsed=performance.now()-stuntStart;
 const p=THREE.MathUtils.clamp(elapsed/stuntDuration,0,1);

 // Cinematic timing: anticipation, suspended bullet-time middle, hard finish.
 const spinP=THREE.MathUtils.clamp((p-.14)/.72,0,1);
 const ease=spinP<.5?2*spinP*spinP:1-Math.pow(-2*spinP+2,2)/2;
 const arc=Math.sin(Math.PI*p);
 const settle=THREE.MathUtils.smoothstep(p,.82,1);

 renderer.toneMappingExposure=THREE.MathUtils.lerp(.92,.70,arc*(1-settle));
 key.intensity=THREE.MathUtils.lerp(1.3,.78,arc*(1-settle));
 const front=stuntMode==="front";

 bodyProxy.position.z=front ? .55:.70;
 bodyProxy.position.x=front?0:.20*stuntSide;
 poseBody(true,front);

 // The body performs the big move; the camera gets a deliberate cinematic orbit/tilt.
 cameraFX.position.x=.10*stuntSide*arc;
 cameraFX.position.y=.07*arc;
 cameraFX.position.z=.18*arc;

 if(front){
  const flip=-Math.PI*4*ease;
  cameraFX.rotation.x=flip*.82;
  cameraFX.rotation.y=.08*stuntSide*arc;
  cameraFX.rotation.z=-.10*stuntSide*arc;
  bodyProxy.rotation.set(flip-.18,.06*stuntSide,-.08*stuntSide*arc);
 }else{
  cameraFX.rotation.x=-.16*arc;
  cameraFX.rotation.y=.32*stuntSide*arc;
  cameraFX.rotation.z=-.42*stuntSide*arc;
  bodyProxy.rotation.x=.28;
  bodyProxy.rotation.y=.18*stuntSide;
  bodyProxy.rotation.z=-stuntSide*(Math.PI*3)*ease;
 }

 const target=stuntDir.clone().multiplyScalar(front?12.5:14.5);
 if(!front){
  const side=new THREE.Vector3().crossVectors(WORLD_UP,stuntDir).normalize();
  target.addScaledVector(side,stuntSide*1.8*arc);
 }
 target.y+=front?1.3+1.6*arc:1.8+2.4*arc;
 velocity.lerp(target,1-Math.exp(-dt*3.2));

 if(p>=1){
  stuntActive=false;
  cameraFX.rotation.set(0,0,0);
  cameraFX.position.set(0,0,0);
  renderer.toneMappingExposure=.92;
  key.intensity=1.3;
  const fwd=camera.getWorldDirection(new THREE.Vector3());fwd.y=0;
  if(fwd.lengthSq()>.001){
   fwd.normalize();
   glideYaw=Math.atan2(-fwd.x,-fwd.z);
   glideYawInitialized=true;
  }
  status.innerHTML="<b>NEXUS ACTIVE</b><br>Back on street control.";
 }
}

function updateInput(dt){
 updateHandDots("left",hands.left);
 updateHandDots("right",hands.right);

 const poses={left:fingerPose(hands.left),right:fingerPose(hands.right)};

 // Finger gun no longer fires on pose creation.
 // Hold the pose and it only fires once the aim line is close enough to a live enemy.
 updateAimFire("left",poses.left);
 updateAimFire("right",poses.right);


 // Two movement modes:
 // 1) relaxed two-hand grip = easy steering-wheel drive
 // 2) fully clenched fists + circular rolling = momentum glide
 const drove=updateWheelDrive(dt);
 if(!drove)updateFistGlide(dt);
 else{
  fistGlideActive=false;
  fistPrevAngle=null;
 }

 // Stunt gestures stay separate from steering-wheel grip.
 const both=!!(poses.left&&poses.right);
 const headF=camera.getWorldDirection(new THREE.Vector3()).normalize();
 const up=both&&poses.left.dir.y>.24&&poses.right.dir.y>.24;
 const forward=both&&!up&&poses.left.dir.dot(headF)>.60&&poses.right.dir.dot(headF)>.60;

 const requested=up?"back":(forward?"front":null);
 const now=performance.now();

 if(requested&&!wallState.active&&!wheelDriveActive&&!fistGlideActive&&now>=stuntCooldownUntil){
  if(gestureCandidate!==requested){
   gestureCandidate=requested;
   gestureSince=now;
  }else if(now-gestureSince>=340){
   beginStunt(requested);
   stuntCooldownUntil=now+2200;
   gestureCandidate=null;
   gestureSince=0;
  }
 }else{
  gestureCandidate=null;
  gestureSince=0;
 }

 updateStunt(dt,poses);
}

function updateBots(dt){
 for(let i=0;i<bots.length;i++){
  const b=bots[i];
  if(!b.userData.alive){
   b.userData.respawn-=dt;
   if(b.userData.respawn<=0){
    b.userData.alive=true;b.visible=true;b.userData.hp=100;
   }
  }
 }
}

function updateSpeedFx(){
 const speed=velocity.length();
 const amount=THREE.MathUtils.smoothstep(speed,3,14);
 const cp=camera.getWorldPosition(new THREE.Vector3());
 const f=speed>.1?velocity.clone().normalize():camera.getWorldDirection(new THREE.Vector3());
 const r=new THREE.Vector3().crossVectors(f,WORLD_UP);
 if(r.lengthSq()<.001)r.set(1,0,0); else r.normalize();
 const u=new THREE.Vector3().crossVectors(r,f).normalize();
 for(let i=0;i<speedN;i++){
  const a=((i*37)%speedN)/speedN;
  const b=((i*17)%speedN)/speedN;
  const side=(a*2-1)*4.5;
  const y=(b*2-1)*2.8;
  const z=((i*11)%speedN)/speedN*7-3.5;
  const base=cp.clone().addScaledVector(r,side).addScaledVector(u,y).addScaledVector(f,z);
  const tail=base.clone().addScaledVector(f,-(.2+amount*2.2));
  const j=i*6;
  speedData[j]=base.x;speedData[j+1]=base.y;speedData[j+2]=base.z;
  speedData[j+3]=tail.x;speedData[j+4]=tail.y;speedData[j+5]=tail.z;
 }
 speedGeo.attributes.position.needsUpdate=true;
 speedMat.opacity=.04+amount*.42;
}

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
 const dt=Math.min(.04,clock.getDelta());
 updateInput(dt);

 // Wall sequence owns locomotion while attached/sliding/rolling off.
 if(wallState.active){
  updateWallState(dt);
 }else if(stuntActive){
  velocity.y-=5.8*dt;
  player.position.addScaledVector(velocity,dt);
  maybeCatchWall();
 }else{
  velocity.y=0;
  player.position.y=GROUND_Y;
  player.position.x+=velocity.x*dt;
  player.position.z+=velocity.z*dt;
  grounded=true;

  // Orb-like movement feel without an orb: coast after the fists stop rolling.
  if(!fistGlideActive){
   const coastDrag=Math.pow(.974,dt*60);
   velocity.x*=coastDrag;
   velocity.z*=coastDrag;
   fistGlideSpeed*=Math.pow(.978,dt*60);
  }
 }

 // Land cleanly after a stunt/wall exit instead of hovering or sinking.
 if(!wallState.active && player.position.y<=GROUND_Y){
  player.position.y=GROUND_Y;
  if(velocity.y<0)velocity.y=0;
  if(!stuntActive)grounded=true;
 }

 velocity.x*=Math.pow(.992,dt*60);
 velocity.z*=Math.pow(.992,dt*60);
 if(stuntActive)velocity.y*=Math.pow(.997,dt*60);

 enforceBuildingWalls();
 enforceArenaBounds();
 const worldScale=(stuntActive||wallState.active)?.48:1;
 updateTestGun(dt*worldScale);
 updateBots(dt*worldScale);
 updateBullets(dt*worldScale);
 updateRain(dt);
 updateSpeedFx();
 renderer.render(scene,camera);
});

async function enterVR(){
 try{
  if(!navigator.xr)throw new Error("WebXR is not available in this browser.");
  const supported=await navigator.xr.isSessionSupported("immersive-vr");
  if(!supported)throw new Error("Immersive VR is not supported.");
  status.innerHTML="<b>STARTING VR</b><br>Opening clean Quest session…";
  const session=await navigator.xr.requestSession("immersive-vr",{
   requiredFeatures:["local-floor"],
   optionalFeatures:["hand-tracking"]
  });
  await renderer.xr.setSession(session);
  status.innerHTML="<b>NEXUS ACTIVE</b><br>Easy steering + fist glide + cinematic knife stunts + wall slides + travel-time bullets ready.";
 }catch(err){
  status.innerHTML="<b>VR START FAILED</b><br>"+String(err&&err.message?err.message:err);
 }
}

const button=document.createElement("button");
button.className="xrbtn";
button.textContent="ENTER NEXUS VR";
button.addEventListener("click",enterVR);
document.body.appendChild(button);

renderer.xr.addEventListener("sessionstart",()=>{
 button.style.display="none";
});
renderer.xr.addEventListener("sessionend",()=>{
 button.style.display="";
 cameraFX.rotation.set(0,0,0);
 status.innerHTML="<b>NEXUS v26 CINEMATIC KNIFE</b><br>VR ended. Enter again when ready.";
});

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});

status.innerHTML="<b>NEXUS v26 CINEMATIC KNIFE</b><br>Cinematic knife build loaded: easy steering restored, fist-glide kept, deliberate stunt trigger, slow-motion flips, reliable knife recall.";
