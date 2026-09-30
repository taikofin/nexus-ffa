import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/+esm";

const status=document.getElementById("status");
const scoreEl=document.getElementById("score");
const carryEl=document.getElementById("carry");
const weaponEl=document.getElementById("weapon");
weaponEl.textContent="FINGER GUNS";

window.addEventListener("error",e=>{
 if(status)status.innerHTML="<b>NEXUS ERROR</b><br>"+String(e.message||"Unknown error");
});
window.addEventListener("unhandledrejection",e=>{
 const msg=e.reason&&e.reason.message?e.reason.message:String(e.reason||"Promise error");
 if(status)status.innerHTML="<b>NEXUS ERROR</b><br>"+msg;
});

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x071118);

const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,160);
camera.position.set(0,1.65,3);

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));
renderer.setSize(innerWidth,innerHeight);
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

const matRoad=new THREE.MeshStandardMaterial({color:0x101a20,roughness:.6});
const matDark=new THREE.MeshStandardMaterial({color:0x1c2730,roughness:.55,metalness:.15});
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

// Intentionally tiny boot scene: enough depth and scale to verify VR without stalling first frame.
for(const side of [-1,1]){
 for(let i=0;i<6;i++){
  const z=-10-i*12;
  const h=8+(i%3)*4;
  meshBox(side*10,h/2,z,7,h,8,i%2?matDark:matRoad);
  meshBox(side*6.45,2.2,z,.12,3.2,5.8,i%2?matCyan:matRed);
 }
}
for(let z=-8;z>-74;z-=12){
 meshBox(-2,.03,z,2,.04,.18,matCyan);
 meshBox(2,.03,z,2,.04,.18,matRed);
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

function isGrab(h){
 const w=joint(h,"wrist");
 const m=joint(h,"middle-finger-tip");
 const r=joint(h,"ring-finger-tip");
 const p=joint(h,"pinky-finger-tip");
 const i=joint(h,"index-finger-tip");
 if(!w||!m||!r||!p||!i)return false;
 const wp=wpos(w);
 // Curled fingers = gripping an invisible wheel rim.
 const curled=
  wpos(m).distanceTo(wp)<.105 &&
  wpos(r).distanceTo(wp)<.102 &&
  wpos(p).distanceTo(wp)<.098;
 // Index can be slightly looser so a natural wheel grip still registers.
 return curled&&wpos(i).distanceTo(wp)<.125;
}
function wristPos(h){
 const w=joint(h,"wrist");
 return w?wpos(w):null;
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

const wheelVisual=new THREE.Group();
const wheelRing=new THREE.Mesh(
 new THREE.TorusGeometry(.24,.012,6,28),
 new THREE.MeshBasicMaterial({color:0x75f8ff,transparent:true,opacity:.46,depthWrite:false})
);
wheelVisual.add(wheelRing);
wheelVisual.visible=false;
scene.add(wheelVisual);

let wheelTurn=0;
let wheelActive=false;
let driveYaw=0;
let driveYawInitialized=false;
let centerAssist=0;

let stuntActive=false;
let stuntMode="back";
let stuntStart=0;
let stuntDuration=0;
let stuntSide=1;
const stuntDir=new THREE.Vector3();
const fingerLatch={left:false,right:false};
let gestureLatch=false;

function beginStunt(mode){
 if(stuntActive)return;
 stuntMode=mode;
 stuntActive=true;
 grounded=false;
 stuntStart=performance.now();
 stuntDuration=mode==="front"?1280:1120;
 stuntSide=Math.random()<.5?-1:1;

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
 const ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
 const arc=Math.sin(Math.PI*p);
 const front=stuntMode==="front";

 bodyProxy.position.z=front ? .55:.70;
 bodyProxy.position.x=front?0:.20*stuntSide;
 poseBody(true,front);

 if(front){
  const flip=-Math.PI*2*ease;
  cameraFX.rotation.set(flip,0,0);
  bodyProxy.rotation.set(flip-.18,0,0);
 }else{
  cameraFX.rotation.x=-.08*arc;
  cameraFX.rotation.y=.14*stuntSide*arc;
  cameraFX.rotation.z=-.24*stuntSide*arc;
  bodyProxy.rotation.set(.22,.12*stuntSide,-.42*stuntSide);
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
  const fwd=camera.getWorldDirection(new THREE.Vector3());fwd.y=0;
  if(fwd.lengthSq()>.001){
   fwd.normalize();
   driveYaw=Math.atan2(-fwd.x,-fwd.z);
   driveYawInitialized=true;
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

 // Invisible steering wheel: grip with both hands, then roll the line between wrists.
 const lp=wristPos(hands.left);
 const rp=wristPos(hands.right);
 const bothGrab=isGrab(hands.left)&&isGrab(hands.right)&&lp&&rp;
 wheelActive=false;

 if(bothGrab&&!stuntActive){
  const span=rp.clone().sub(lp);
  const separation=span.length();

  if(separation>.20&&separation<.85){
   wheelActive=true;
   const center=lp.clone().add(rp).multiplyScalar(.5);

   const headF=camera.getWorldDirection(new THREE.Vector3());
   headF.y=0;
   if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();
   const headR=new THREE.Vector3().crossVectors(headF,WORLD_UP).normalize();

   // A level wheel has both hands aligned with head-right.
   // Raising one hand and lowering the other rolls the wheel and creates steering.
   const horizontal=span.dot(headR);
   const vertical=span.dot(WORLD_UP);
   const raw=Math.atan2(vertical,Math.abs(horizontal)+.001);
   const signed=horizontal>=0?raw:-raw;
   const targetTurn=THREE.MathUtils.clamp(signed/.72,-1,1);
   wheelTurn=THREE.MathUtils.lerp(wheelTurn,targetTurn,1-Math.exp(-dt*10));

   if(!driveYawInitialized){
    driveYaw=Math.atan2(-headF.x,-headF.z);
    driveYawInitialized=true;
   }

   // Steering wheel now turns a persistent body/drive heading, like a vehicle.
   // This stops movement from instantly following every tiny head movement.
   const turnRate=-wheelTurn*1.72;
   driveYaw+=turnRate*dt;

   // Magnetic center: if the wheel is near center, gently pull the drive heading back
   // under the center of the player's current view.
   const headYaw=Math.atan2(-headF.x,-headF.z);
   let yawError=headYaw-driveYaw;
   yawError=Math.atan2(Math.sin(yawError),Math.cos(yawError));
   const centerStrength=(1-Math.min(1,Math.abs(wheelTurn)))*1.65;
   driveYaw+=yawError*centerStrength*dt;

   const moveDir=new THREE.Vector3(-Math.sin(driveYaw),0,-Math.cos(driveYaw)).normalize();
   const targetVelocity=moveDir.multiplyScalar(8.2);

   // Smooth car-like arc rather than lateral drift.
   velocity.x=THREE.MathUtils.lerp(velocity.x,targetVelocity.x,1-Math.exp(-dt*3.8));
   velocity.z=THREE.MathUtils.lerp(velocity.z,targetVelocity.z,1-Math.exp(-dt*3.8));

   // Small cinematic center cue: the camera leans/yaws with the wheel, then returns.
   // Head tracking still works normally; this is intentionally subtle.
   centerAssist=THREE.MathUtils.lerp(centerAssist,wheelTurn,1-Math.exp(-dt*8));
   if(!stuntActive){
    cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,-centerAssist*.075,1-Math.exp(-dt*7));
    cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,-centerAssist*.045,1-Math.exp(-dt*7));
   }

   // Ground-driving mode: the wheel only steers on the street.
   if(!stuntActive){
    velocity.y=0;
    player.position.y=GROUND_Y;
    grounded=true;
   }

   wheelVisual.visible=true;
   wheelVisual.position.copy(center);
   wheelVisual.quaternion.setFromUnitVectors(
    new THREE.Vector3(1,0,0),
    span.clone().normalize()
   );
   wheelRing.rotation.y=Math.PI/2;
  }
 }

 if(!wheelActive){
  wheelVisual.visible=false;
  wheelTurn=THREE.MathUtils.lerp(wheelTurn,0,1-Math.exp(-dt*7));
  centerAssist=THREE.MathUtils.lerp(centerAssist,0,1-Math.exp(-dt*6));
  if(!stuntActive){
   cameraFX.rotation.z=THREE.MathUtils.lerp(cameraFX.rotation.z,0,1-Math.exp(-dt*6));
   cameraFX.rotation.y=THREE.MathUtils.lerp(cameraFX.rotation.y,0,1-Math.exp(-dt*6));
  }
 }

 // Stunt gestures stay separate from steering-wheel grip.
 const both=!!(poses.left&&poses.right);
 const headF=camera.getWorldDirection(new THREE.Vector3()).normalize();
 const up=both&&poses.left.dir.y>.24&&poses.right.dir.y>.24;
 const forward=both&&!up&&poses.left.dir.dot(headF)>.60&&poses.right.dir.dot(headF)>.60;

 if((up||forward)&&!gestureLatch){
  gestureLatch=true;
  beginStunt(forward?"front":"back");
 }
 if(!up&&!forward)gestureLatch=false;

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

 // Stunts can go airborne. Normal steering stays locked to the floor.
 if(stuntActive){
  velocity.y-=5.8*dt;
  player.position.addScaledVector(velocity,dt);
 }else{
  velocity.y=0;
  player.position.y=GROUND_Y;
  player.position.x+=velocity.x*dt;
  player.position.z+=velocity.z*dt;
  grounded=true;
 }

 // Land cleanly after a stunt instead of hovering or sinking.
 if(player.position.y<=GROUND_Y){
  player.position.y=GROUND_Y;
  if(velocity.y<0)velocity.y=0;
  if(!stuntActive)grounded=true;
 }

 velocity.x*=Math.pow(.992,dt*60);
 velocity.z*=Math.pow(.992,dt*60);
 if(stuntActive)velocity.y*=Math.pow(.997,dt*60);

 enforceArenaBounds();
 updateBots(dt);
 updateBullets(dt);
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
  status.innerHTML="<b>NEXUS ACTIVE</b><br>Centered wheel steering, connected hands, barriers, and travel-time bullets ready.";
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
 status.innerHTML="<b>NEXUS v22 FRESH BUILD</b><br>VR ended. Enter again when ready.";
});

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});

status.innerHTML="<b>NEXUS v22 FRESH BUILD</b><br>Fresh-file build loaded: connected hands, magnetic steering center, hard neon barriers.";
