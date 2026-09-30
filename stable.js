import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/+esm";
import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/webxr/VRButton.js/+esm";

const status=document.getElementById("status");
const scoreEl=document.getElementById("score");
const carryEl=document.getElementById("carry");
const weaponEl=document.getElementById("weapon");

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8dbbd0);
scene.fog=new THREE.Fog(0x8dbbd0,45,170);

const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,220);
camera.position.set(0,1.6,6);

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.15));
renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
document.body.appendChild(renderer.domElement);

const player=new THREE.Group();
scene.add(player);
player.add(camera);

scene.add(new THREE.HemisphereLight(0xeafaff,0x26313a,2.1));
const sun=new THREE.DirectionalLight(0xffd7a5,2.2);sun.position.set(-20,35,15);scene.add(sun);

const M={
 road:new THREE.MeshStandardMaterial({color:0x17232a,roughness:.28,metalness:.22}),
 concrete:new THREE.MeshStandardMaterial({color:0x6e7a82,roughness:.78}),
 glass:new THREE.MeshStandardMaterial({color:0x244b61,roughness:.22,metalness:.42,emissive:0x07141d,emissiveIntensity:.4}),
 cyan:new THREE.MeshStandardMaterial({color:0x72f7ff,emissive:0x30ddeb,emissiveIntensity:1.8}),
 pink:new THREE.MeshStandardMaterial({color:0xff72ce,emissive:0xff2eaa,emissiveIntensity:1.6}),
 orange:new THREE.MeshStandardMaterial({color:0xffa35c,emissive:0xff6b22,emissiveIntensity:1.6}),
 bot:new THREE.MeshStandardMaterial({color:0xe7edf1,roughness:.52,emissive:0x3a0b22,emissiveIntensity:.45}),
 dark:new THREE.MeshStandardMaterial({color:0x202b33,roughness:.45,metalness:.55})
};
function box(x,y,z,sx,sy,sz,mat,parent=scene){
 const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);parent.add(m);return m;
}
function cyl(x,y,z,r,h,mat,parent=scene){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,8),mat);m.position.set(x,y,z);parent.add(m);return m;
}
box(0,-.25,0,50,.5,140,M.road);
for(let s of [-1,1])for(let z=-60;z<=60;z+=15){
 const i=Math.round((z+60)/15),h=14+((i*7+(s>0?3:0))%24),x=s*(24+(i%3)*2);
 box(x,h/2,z,16,h,11,(i%2?M.glass:M.concrete));
 for(let y=3;y<h-1;y+=4)box(x-s*8.05,y,z,.08,.18,7,i%3?M.cyan:M.pink);
}
for(let z=-55;z<60;z+=18){box(-10,.02,z,12,.04,.16,M.cyan);box(8,.02,z,8,.04,.14,M.pink)}

const bank=new THREE.Group();
bank.add(new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.5,12),M.cyan));
const br=new THREE.Mesh(new THREE.TorusGeometry(1.7,.1,8,24),M.pink);br.rotation.x=Math.PI/2;bank.add(br);scene.add(bank);

const bots=[];
for(let i=0;i<7;i++){
 const g=new THREE.Group();
 cyl(0,1.05,0,.42,1.45,M.bot,g);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.31,10,8),M.bot);head.position.y=1.98;g.add(head);
 box(0,1.95,-.29,.34,.1,.08,M.pink,g);
 g.position.set((i%2?1:-1)*(5+(i*3)%13),0,-26+i*8);
 g.userData={hp:100,alive:true,respawn:0,phase:i,shot:.5+i*.2,knock:new THREE.Vector3()};
 scene.add(g);bots.push(g);
}

const ray=new THREE.Raycaster();
let score=0,carry=0,weapon="HANDGUN",bankT=0;
function kill(b){if(!b.userData.alive)return;b.userData.alive=false;b.visible=false;b.userData.respawn=2.5;carry++;carryEl.textContent=carry}
function rootBot(o){while(o&&o.parent&&!bots.includes(o))o=o.parent;return bots.includes(o)?o:null}
function tracer(o,d){
 const geo=new THREE.BufferGeometry().setFromPoints([o,o.clone().addScaledVector(d,35)]);
 const l=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffa35c}));scene.add(l);
 setTimeout(()=>{scene.remove(l);geo.dispose();l.material.dispose()},90);
}
function shoot(o,d,damage=55){
 ray.set(o,d);const hits=ray.intersectObjects(bots.filter(b=>b.userData.alive),true);
 if(hits.length){const b=rootBot(hits[0].object);if(b){b.userData.hp-=damage;if(b.userData.hp<=0)kill(b)}}
 tracer(o,d);
}

const controllers={left:null,right:null};
for(let i=0;i<2;i++){
 const c=renderer.xr.getController(i);player.add(c);
 c.addEventListener("connected",e=>{if(e.data?.handedness){controllers[e.data.handedness]=c;c.userData.input=e.data}});
 c.addEventListener("disconnected",()=>{if(controllers.left===c)controllers.left=null;if(controllers.right===c)controllers.right=null});
}

const hands={left:null,right:null};
for(let i=0;i<2;i++){
 const h=renderer.xr.getHand(i);player.add(h);
 h.addEventListener("connected",e=>{if(e.data?.handedness)hands[e.data.handedness]=h});
 h.addEventListener("disconnected",()=>{if(hands.left===h)hands.left=null;if(hands.right===h)hands.right=null});
}

const jointGeo=new THREE.SphereGeometry(.012,6,4);
const jointMatL=new THREE.MeshStandardMaterial({color:0xff9edc,emissive:0xff2da8,emissiveIntensity:.8});
const jointMatR=new THREE.MeshStandardMaterial({color:0xa4fbff,emissive:0x35ddea,emissiveIntensity:.8});
const handVisuals={left:new Map(),right:new Map()};
function ensureHandVisuals(h,side){
 if(!h?.joints)return;
 for(const name in h.joints){
  if(handVisuals[side].has(name))continue;
  const d=new THREE.Mesh(jointGeo,side==="left"?jointMatL:jointMatR);
  if(name.includes("tip"))d.scale.setScalar(1.3);
  if(name==="wrist")d.scale.set(2.1,1.2,2.0);
  scene.add(d);
  handVisuals[side].set(name,d);
 }
}
function hideHandVisuals(side){
 for(const d of handVisuals[side].values())d.visible=false;
}
function joint(h,n){return h?.joints?.[n]||null}
function wpos(o){return o.getWorldPosition(new THREE.Vector3())}
function dist(a,b){return a&&b?wpos(a).distanceTo(wpos(b)):99}
function indexDir(h){
 const a=joint(h,"index-finger-metacarpal")||joint(h,"wrist");
 const b=joint(h,"index-finger-tip");
 if(!a||!b)return null;
 return wpos(b).sub(wpos(a)).normalize();
}

function palmCenter(h){
 const w=joint(h,"wrist");
 const i=joint(h,"index-finger-metacarpal");
 const p=joint(h,"pinky-finger-metacarpal");
 if(!w||!i||!p)return null;
 return wpos(w).multiplyScalar(.45)
   .addScaledVector(wpos(i),.30)
   .addScaledVector(wpos(p),.25);
}

function palmNormal(h){
 const w=joint(h,"wrist");
 const i=joint(h,"index-finger-metacarpal");
 const p=joint(h,"pinky-finger-metacarpal");
 if(!w||!i||!p)return null;

 const wp=wpos(w),iv=wpos(i).sub(wp),pv=wpos(p).sub(wp);
 let n=new THREE.Vector3().crossVectors(iv,pv).normalize();

 // Always choose the palm-facing direction away from the player's head.
 const center=palmCenter(h);
 const camP=camera.getWorldPosition(new THREE.Vector3());
 const away=center.clone().sub(camP).normalize();
 if(n.dot(away)<0)n.multiplyScalar(-1);
 return n;
}

function isOpenPalm(h){
 const w=joint(h,"wrist");
 if(!w)return false;
 const wp=wpos(w);
 const names=["index-finger-tip","middle-finger-tip","ring-finger-tip","pinky-finger-tip"];
 let extended=0;
 for(const name of names){
  const j=joint(h,name);
  if(j&&wpos(j).distanceTo(wp)>.105)extended++;
 }
 return extended>=3;
}

const repulsorRingGeo=new THREE.TorusGeometry(.06,.012,8,20);
const repulsorCoreGeo=new THREE.CircleGeometry(.045,18);
const repulsors={};
for(const side of ["left","right"]){
 const g=new THREE.Group();
 const ring=new THREE.Mesh(repulsorRingGeo,side==="left"?M.cyan:M.orange);
 const core=new THREE.Mesh(repulsorCoreGeo,new THREE.MeshBasicMaterial({
  color:side==="left"?0xb7fbff:0xffd19a,
  transparent:true,opacity:.9,side:THREE.DoubleSide
 }));
 core.position.z=.002;
 g.add(ring,core);
 g.visible=false;
 scene.add(g);
 repulsors[side]=g;
}
const repulsorCooldown={left:0,right:0};

function updateRepulsorVisual(side,h,open){
 const g=repulsors[side];
 const center=palmCenter(h),dir=palmNormal(h);
 if(!center||!dir){g.visible=false;return null}
 const headF=camera.getWorldDirection(new THREE.Vector3());headF.y=0;
 if(headF.lengthSq()<.001)headF.set(0,0,-1);else headF.normalize();
 const headR=new THREE.Vector3().crossVectors(headF,new THREE.Vector3(0,1,0)).normalize();
 const visualOffset=headR.multiplyScalar(handInertiaSide);

 g.visible=open;
 g.position.copy(center).add(visualOffset).addScaledVector(dir,.012);
 g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
 const pulse=1+Math.sin(performance.now()*.018)*.12;
 g.scale.setScalar(open?pulse:1);
 return {center,dir};
}

function fireRepulsor(side,origin,dir){
 const now=performance.now();
 if(now<repulsorCooldown[side])return;
 repulsorCooldown[side]=now+115;

 const glow=new THREE.PointLight(side==="left"?0x8ff8ff:0xffb36b,3.5,4,2);
 glow.position.copy(origin).addScaledVector(dir,.05);
 scene.add(glow);
 setTimeout(()=>scene.remove(glow),55);

 const geo=new THREE.CylinderGeometry(.035,.075,2.8,8,1,true);
 const mat=new THREE.MeshBasicMaterial({
  color:side==="left"?0x8ff8ff:0xffb36b,
  transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false
 });
 const beam=new THREE.Mesh(geo,mat);
 beam.position.copy(origin).addScaledVector(dir,1.4);
 beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);
 scene.add(beam);
 setTimeout(()=>{scene.remove(beam);geo.dispose();mat.dispose()},65);

 shoot(origin.clone().addScaledVector(dir,.06),dir,34);
}

const shockwaves=[];
let blastHoldStart=0;
let blastLatched=false;
let blastCooldownUntil=0;

function triggerPressureBlast(){
 const now=performance.now();
 if(now<blastCooldownUntil)return;
 blastCooldownUntil=now+3500;

 const origin=camera.getWorldPosition(new THREE.Vector3());
 origin.y=Math.max(.6,origin.y-.65);

 const colors=[0x9ffcff,0xff8bd7,0xffc783];
 for(let i=0;i<3;i++){
  const mat=new THREE.MeshBasicMaterial({
   color:colors[i],
   transparent:true,
   opacity:.26-i*.045,
   blending:THREE.AdditiveBlending,
   depthWrite:false,
   side:THREE.DoubleSide
  });
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.035,8,48),mat);
  ring.position.copy(origin);
  ring.rotation.x=Math.PI/2;
  ring.scale.setScalar(.35+i*.18);
  scene.add(ring);
  shockwaves.push({mesh:ring,age:-i*.075,life:.78,speed:12+i*2.2,start:.35+i*.18});
 }

 const shellMat=new THREE.MeshBasicMaterial({
  color:0xb9f8ff,transparent:true,opacity:.10,blending:THREE.AdditiveBlending,
  depthWrite:false,wireframe:true
 });
 const shell=new THREE.Mesh(new THREE.SphereGeometry(1,14,9),shellMat);
 shell.position.copy(origin);
 shell.scale.setScalar(.4);
 scene.add(shell);
 shockwaves.push({mesh:shell,age:0,life:.62,speed:10,start:.4,shell:true});

 const flash=new THREE.PointLight(0xbdfaff,5.5,14,2);
 flash.position.copy(origin).add(new THREE.Vector3(0,1,0));
 scene.add(flash);
 setTimeout(()=>scene.remove(flash),150);

 renderer.toneMappingExposure=1.45;
 setTimeout(()=>renderer.toneMappingExposure=1.0,180);

 for(const b of bots){
  if(!b.userData.alive)continue;
  const center=b.position.clone().add(new THREE.Vector3(0,1.1,0));
  const delta=center.sub(origin);
  const d=delta.length();
  if(d>11)continue;
  const force=1-THREE.MathUtils.clamp(d/11,0,1);
  const damage=d<3.5?140:55+force*50;
  b.userData.hp-=damage;
  const push=delta.normalize().multiplyScalar(5+force*10);
  push.y=.6+force*1.5;
  b.userData.knock.add(push);
  if(b.userData.hp<=0)kill(b);
 }
 status.innerHTML="<b>PRESSURE BLAST</b><br>Heat-wave shock ring released.";
}

function updateShockwaves(dt){
 for(let i=shockwaves.length-1;i>=0;i--){
  const s=shockwaves[i];
  s.age+=dt;
  if(s.age<0)continue;
  const u=THREE.MathUtils.clamp(s.age/s.life,0,1);
  const scale=s.start+s.speed*s.age;
  s.mesh.scale.setScalar(scale);
  s.mesh.material.opacity=(s.shell?.10:.26)*Math.pow(1-u,1.5);
  if(u>=1){
   scene.remove(s.mesh);
   s.mesh.geometry.dispose();
   s.mesh.material.dispose();
   shockwaves.splice(i,1);
  }
 }
}

function updateBlastGesture(){
 const ld=indexDir(hands.left),rd=indexDir(hands.right);
 const up=new THREE.Vector3(0,1,0);
 const bothUp=!!(ld&&rd&&ld.dot(up)>.82&&rd.dot(up)>.82);
 const now=performance.now();

 if(bothUp){
  if(!blastHoldStart)blastHoldStart=now;
  if(!blastLatched&&now-blastHoldStart>170){
   blastLatched=true;
   triggerPressureBlast();
  }
 }else{
  blastHoldStart=0;
  blastLatched=false;
 }
 return bothUp;
}

const driftVelocity=new THREE.Vector3();
const driftTarget=new THREE.Vector3();
let dashEnergy=0;

let lastHeadForward=null;
let handInertiaSide=0;
let handInertiaUp=0;
function updateHeadHandInertia(dt){
 const f=camera.getWorldDirection(new THREE.Vector3()); f.y=0;
 if(f.lengthSq()<.001)return;
 f.normalize();

 if(!lastHeadForward){
  lastHeadForward=f.clone();
  return;
 }

 const crossY=new THREE.Vector3().crossVectors(lastHeadForward,f).y;
 const dot=THREE.MathUtils.clamp(lastHeadForward.dot(f),-1,1);
 const yawDelta=Math.atan2(crossY,dot);
 const yawRate=yawDelta/Math.max(.008,dt);

 // Head turns one way, both hands visually lag the opposite way.
 const targetSide=THREE.MathUtils.clamp(-yawRate*.055,-.18,.18);
 handInertiaSide=THREE.MathUtils.lerp(handInertiaSide,targetSide,1-Math.exp(-dt*11));
 handInertiaSide*=Math.pow(.22,dt);

 lastHeadForward.copy(f);
}

function updateHandVisualProxy(h,side){
 if(!h?.joints){hideHandVisuals(side);return}
 ensureHandVisuals(h,side);

 const headF=camera.getWorldDirection(new THREE.Vector3()); headF.y=0;
 if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();
 const headR=new THREE.Vector3().crossVectors(headF,new THREE.Vector3(0,1,0)).normalize();
 const offset=headR.multiplyScalar(handInertiaSide).add(new THREE.Vector3(0,handInertiaUp,0));

 for(const name in h.joints){
  const j=h.joints[name],v=handVisuals[side].get(name);
  if(!v||!j)continue;
  v.visible=true;
  v.position.copy(wpos(j)).add(offset);
 }
}

function updateHandInput(dt){
 updateHeadHandInertia(dt);
 updateHandVisualProxy(hands.left,"left");
 updateHandVisualProxy(hands.right,"right");
 const blastPose=updateBlastGesture();

 for(const side of ["left","right"]){
  const h=hands[side];
  if(!h){
   repulsors[side].visible=false;
   continue;
  }

  const open=isOpenPalm(h);
  const pose=updateRepulsorVisual(side,h,open);
  if(open&&pose&&!blastPose){
   // Open palm = continuous repulsor fire. Closed hand = no shot.
   fireRepulsor(side,pose.center,pose.dir);
  }
 }

 const L=hands.left;
 driftTarget.set(0,0,0);
 if(L){
  const w=joint(L,"wrist"),it=joint(L,"index-finger-tip"),rt=joint(L,"ring-finger-tip"),tt=joint(L,"thumb-tip");
  if(w&&it&&rt&&tt&&dist(rt,tt)<.03){
   const headF=camera.getWorldDirection(new THREE.Vector3());headF.y=0;
   if(headF.lengthSq()<.001)headF.set(0,0,-1);else headF.normalize();
   const headR=new THREE.Vector3().crossVectors(headF,new THREE.Vector3(0,1,0)).normalize();
   const hd=indexDir(L);
   if(hd){
    hd.y=0;
    if(hd.lengthSq()>.001){
     hd.normalize();
     const sideAmt=THREE.MathUtils.clamp(hd.dot(headR),-1,1);
     const fwdAmt=THREE.MathUtils.clamp(hd.dot(headF),-1,1);
     const lateral=Math.abs(sideAmt);
     const speed=THREE.MathUtils.lerp(5.2,10.5,THREE.MathUtils.smoothstep(lateral,.55,.95));
     driftTarget.copy(headR).multiplyScalar(sideAmt).addScaledVector(headF,fwdAmt);
     if(driftTarget.lengthSq()>.001)driftTarget.normalize().multiplyScalar(speed);
     if(lateral>.72)dashEnergy=THREE.MathUtils.lerp(dashEnergy,1,Math.min(1,dt*12));
    }
   }
  }
 }

 const inputActive=driftTarget.lengthSq()>.001;
 const accel=inputActive?9.5:2.4;
 driftVelocity.lerp(driftTarget,1-Math.exp(-accel*dt));
 if(!inputActive)driftVelocity.multiplyScalar(Math.pow(.90,dt*60));
 dashEnergy*=Math.pow(.55,dt);
 player.position.addScaledVector(driftVelocity,dt);
}
let triggerLatch=false;
function updateControllerInput(dt){
 const L=controllers.left,R=controllers.right;
 if(L?.userData.input?.gamepad){
  const a=L.userData.input.gamepad.axes||[];const x=Math.abs(a[2]||0)>.15?(a[2]||0):0,y=Math.abs(a[3]||0)>.15?(a[3]||0):0;
  const f=camera.getWorldDirection(new THREE.Vector3());f.y=0;f.normalize();const r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
  if(x||y){
   const d=r.multiplyScalar(x).addScaledVector(f,-y);
   if(d.lengthSq()){
    const lateral=Math.abs(x);
    const speed=THREE.MathUtils.lerp(5.2,10.5,THREE.MathUtils.smoothstep(lateral,.55,.95));
    driftTarget.copy(d.normalize()).multiplyScalar(speed);
    driftVelocity.lerp(driftTarget,1-Math.exp(-9.5*dt));
    player.position.addScaledVector(driftVelocity,dt);
   }
  }
 }
 if(R?.userData.input?.gamepad){
  const gp=R.userData.input.gamepad,pressed=!!gp.buttons?.[0]?.pressed;
  if(pressed&&!triggerLatch){triggerLatch=true;const o=R.getWorldPosition(new THREE.Vector3()),q=R.getWorldQuaternion(new THREE.Quaternion()),d=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();shoot(o,d)}
  if(!pressed)triggerLatch=false;
 }
}

function updateBots(dt,t){
 const p=camera.getWorldPosition(new THREE.Vector3());
 for(const b of bots){
  if(b.userData.knock&&b.userData.knock.lengthSq()>.0001){
   b.position.addScaledVector(b.userData.knock,dt);
   b.userData.knock.multiplyScalar(Math.pow(.08,dt));
  }
  if(!b.userData.alive){b.userData.respawn-=dt;if(b.userData.respawn<=0){b.userData.alive=true;b.visible=true;b.userData.hp=100;b.userData.knock.set(0,0,0);b.position.set((Math.random()-.5)*26,0,-20+(Math.random()-.5)*65)}continue}
  const d=p.clone().sub(b.position);d.y=0;if(d.length()>6)b.position.addScaledVector(d.normalize(),dt*.45);
  b.userData.shot-=dt;if(b.userData.shot<0){b.userData.shot=.9+Math.random()*1.4;const o=b.position.clone().add(new THREE.Vector3(0,1.5,0));tracer(o,p.clone().sub(o).normalize())}
 }
}
function updateBank(dt,t){
 bankT+=dt*.55;bank.position.set(Math.sin(bankT)*11,1.4,-8+Math.cos(bankT*.7)*28);br.rotation.z=t*1.5;
 const p=camera.getWorldPosition(new THREE.Vector3());if(carry&&p.distanceTo(bank.position)<3){score+=carry;carry=0;scoreEl.textContent=score;carryEl.textContent=carry}
}

const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
 const dt=Math.min(.05,clock.getDelta()),t=clock.elapsedTime;
 updateHandInput(dt);updateControllerInput(dt);updateBots(dt,t);updateBank(dt,t);updateShockwaves(dt);renderer.render(scene,camera);
});

const button=VRButton.createButton(renderer,{optionalFeatures:["hand-tracking","local-floor","bounded-floor"]});
button.classList.add("xrbtn");
document.body.appendChild(button);

renderer.xr.addEventListener("sessionstart",()=>{status.innerHTML="<b>VR ACTIVE</b><br>IRON MODE: closed fists = safe. Open either palm to fire repulsors. Raise both hands upward for PRESSURE BLAST.";});
renderer.xr.addEventListener("sessionend",()=>{status.innerHTML="<b>NEXUS STABLE</b><br>VR ended. Press ENTER VR again.";});

addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
status.innerHTML="<b>NEXUS IRON MODE READY</b><br>Open palms fire repulsors. Closed hands do nothing. Head-steered drift stays active.";