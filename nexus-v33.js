import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

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
scene.background=new THREE.Color(0x09151d);
scene.fog=new THREE.FogExp2(0x0b1b25,.0135);

const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,160);
camera.position.set(0,1.65,3);

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.04;
renderer.xr.enabled=true;
renderer.xr.setReferenceSpaceType("local-floor");
document.body.appendChild(renderer.domElement);

const player=new THREE.Group();
const bodyCamRig=new THREE.Group();
const cameraFX=new THREE.Group();
scene.add(player);
player.add(bodyCamRig);
bodyCamRig.add(cameraFX);
cameraFX.add(camera);

const WORLD_UP=new THREE.Vector3(0,1,0);
scene.add(new THREE.HemisphereLight(0xb9d9e9,0x081016,2.05));
const key=new THREE.DirectionalLight(0xe8f4ff,1.65);
key.position.set(-4,10,5);
scene.add(key);

// Low-cost neo-noir street lighting: warm pools against cold city shadows.
function makeGlowTexture(){
 const c=document.createElement("canvas");
 c.width=c.height=64;
 const ctx=c.getContext("2d");
 const g=ctx.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,"rgba(255,236,206,.95)");
 g.addColorStop(.18,"rgba(255,188,112,.45)");
 g.addColorStop(.55,"rgba(255,143,72,.10)");
 g.addColorStop(1,"rgba(255,120,60,0)");
 ctx.fillStyle=g;
 ctx.fillRect(0,0,64,64);
 const t=new THREE.CanvasTexture(c);
 t.colorSpace=THREE.SRGBColorSpace;
 return t;
}
const lampGlowTexture=makeGlowTexture();

for(const p of [
 [-4,3.2,-10],[4,3.2,-30],[-4,3.2,-50],
 [3.4,2.4,-18],[-3.4,2.4,-42]
]){
 const lamp=new THREE.PointLight(0xffb36b,2.75,16,2);
 lamp.position.set(p[0],p[1],p[2]);
 scene.add(lamp);

 const glow=new THREE.Sprite(new THREE.SpriteMaterial({
  map:lampGlowTexture,
  transparent:true,
  opacity:.34,
  depthWrite:false,
  blending:THREE.AdditiveBlending
 }));
 glow.position.copy(lamp.position);
 glow.scale.set(.95,.95,.95);
 scene.add(glow);
}

const matRoad=new THREE.MeshPhysicalMaterial({
 color:0x11171b,
 roughness:.31,
 metalness:.03,
 clearcoat:.34,
 clearcoatRoughness:.24
});
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
const road=new THREE.Mesh(new THREE.PlaneGeometry(34,90,1,1),matRoad);
road.rotation.x=-Math.PI/2;
road.position.set(0,.001,-20);
road.receiveShadow=true;
scene.add(road);

const puddleMat=new THREE.MeshPhysicalMaterial({
 color:0x18242b,
 roughness:.08,
 metalness:.02,
 clearcoat:1,
 clearcoatRoughness:.05,
 transparent:true,
 opacity:.56,
 depthWrite:false
});

function makePuddle(cx,cz,rx,rz,seed){
 const shape=new THREE.Shape();
 const N=18;
 for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2;
  const wobble=1+.13*Math.sin(a*3+seed)+.07*Math.sin(a*7+seed*.41);
  const x=Math.cos(a)*rx*wobble;
  const z=Math.sin(a)*rz*(1+.08*Math.cos(a*5+seed));
  if(i===0)shape.moveTo(x,z);else shape.lineTo(x,z);
 }
 shape.closePath();
 const g=new THREE.ShapeGeometry(shape,1);
 const m=new THREE.Mesh(g,puddleMat);
 m.rotation.x=-Math.PI/2;
 m.position.set(cx,.006,cz);
 m.renderOrder=0;
 scene.add(m);
 return m;
}

[
 [-2.8,-6,1.25,.42,.2],[2.5,-13,.9,.34,1.1],[-1.3,-19,1.5,.48,2.2],
 [3.1,-26,1.1,.40,3.3],[-2.2,-34,1.35,.43,4.4],[1.6,-44,1.7,.52,5.5],
 [-3.0,-54,1.0,.34,6.6],[2.7,-59,1.2,.38,7.7]
].forEach(p=>makePuddle(...p));

const ARENA_X=15.3;
const ARENA_Z_MIN=-62.5;
const ARENA_Z_MAX=22.5;

// Arena limits stay mathematical/invisible. No primitive rail geometry is rendered.

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
  if(velocity.x<0)velocity.x=0;
  hit=true;
 }else if(player.position.x>ARENA_X){
  player.position.x=ARENA_X;
  if(velocity.x>0)velocity.x=0;
  hit=true;
 }
 if(player.position.z<ARENA_Z_MIN){
  player.position.z=ARENA_Z_MIN;
  if(velocity.z<0)velocity.z=0;
  hit=true;
 }else if(player.position.z>ARENA_Z_MAX){
  player.position.z=ARENA_Z_MAX;
  if(velocity.z>0)velocity.z=0;
  hit=true;
 }
 if(hit&&!stuntActive){
  status.innerHTML="<b>ARENA EDGE</b><br>Barrier caught you — steer back toward the lane.";
 }
}

// Inner building faces are now real stunt/collision surfaces.
const WALL_X=6.45;
const wallSegments=[];

// Collision remains lightweight, but the visible city is now real GLB mesh geometry.
for(const side of [-1,1]){
 for(let i=0;i<6;i++){
  const z=-10-i*12;
  const h=8+(i%3)*4;
  wallSegments.push({side,z,h,halfDepth:4.0});
 }
}

const assetLoader=new GLTFLoader();
const cityRoot=new THREE.Group();
scene.add(cityRoot);

const CITY_ASSET_BASE="https://cdn.jsdelivr.net/gh/petroulacl/fps-buildings-env-kit@main/buildings/kenney-city-kit-suburban/Models/GLB%20format/";
const CITY_MODELS=[
 "building-type-a.glb","building-type-d.glb","building-type-f.glb",
 "building-type-j.glb","building-type-n.glb","building-type-t.glb"
];

function prepareCityMesh(root,targetHeight){
 root.traverse(o=>{
  if(o.isMesh){
   o.castShadow=false;
   o.receiveShadow=true;
   if(o.material){
    o.material=o.material.clone();
    if("roughness" in o.material)o.material.roughness=Math.max(.48,o.material.roughness??.48);
    if("metalness" in o.material)o.material.metalness=Math.min(.22,o.material.metalness??0);
   }
  }
 });

 let box=new THREE.Box3().setFromObject(root);
 const height=Math.max(.001,box.max.y-box.min.y);
 const scale=targetHeight/height;
 root.scale.setScalar(scale);
 root.updateMatrixWorld(true);

 box=new THREE.Box3().setFromObject(root);
 root.position.y-=box.min.y;
}

for(let i=0;i<CITY_MODELS.length;i++){
 assetLoader.load(
  CITY_ASSET_BASE+CITY_MODELS[i],
  gltf=>{
   for(const side of [-1,1]){
    const building=gltf.scene.clone(true);
    const targetHeight=8+(i%3)*4;
    prepareCityMesh(building,targetHeight);
    building.position.x=side*9.8;
    building.position.z=-10-i*12;
    building.rotation.y=side>0?-Math.PI/2:Math.PI/2;
    cityRoot.add(building);

    // Distant real-mesh skyline layer for atmospheric depth.
    const far=building.clone(true);
    far.position.x=side*(18+i*2.8);
    far.position.z=-18-i*16;
    far.position.y=0;
    far.scale.multiplyScalar(1.28+(i%2)*.22);
    far.rotation.y=side>0?-Math.PI/2:Math.PI/2;
    far.traverse(o=>{
     if(o.isMesh&&o.material){
      o.material=o.material.clone();
      if(o.material.color)o.material.color.multiplyScalar(.52);
      if("roughness" in o.material)o.material.roughness=.78;
     }
    });
    cityRoot.add(far);
   }
  },
  undefined,
  err=>console.warn("City mesh load failed",CITY_MODELS[i],err)
 );
}

const rainCount=210;
const rainPos=new Float32Array(rainCount*6);

function resetRainDrop(i,initial=false){
 const k=i*6;
 const x=player.position.x+(((i*37)%101)/100-.5)*30;
 const y=(initial?Math.random()*10:8+((i*17)%31)/3)+.4;
 const z=player.position.z+(((i*53)%101)/100-.5)*64;
 const len=.20+((i*11)%9)*.018;
 rainPos[k]=x;
 rainPos[k+1]=y;
 rainPos[k+2]=z;
 rainPos[k+3]=x-.018;
 rainPos[k+4]=y-len;
 rainPos[k+5]=z+.028;
}
for(let i=0;i<rainCount;i++)resetRainDrop(i,true);

const rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute("position",new THREE.BufferAttribute(rainPos,3).setUsage(THREE.DynamicDrawUsage));
const rainMat=new THREE.LineBasicMaterial({
 color:0xbfd9e6,
 transparent:true,
 opacity:.34,
 depthWrite:false
});
const rain=new THREE.LineSegments(rainGeo,rainMat);
scene.add(rain);

function updateRain(dt){
 for(let i=0;i<rainCount;i++){
  const k=i*6;
  const fall=dt*(13+(i%7));
  rainPos[k+1]-=fall;
  rainPos[k+4]-=fall;
  rainPos[k]-=dt*.55;
  rainPos[k+3]-=dt*.55;
  if(rainPos[k+1]<.03)resetRainDrop(i,false);
 }
 rainGeo.attributes.position.needsUpdate=true;
}
const bots=[];
const botHitMat=new THREE.MeshBasicMaterial({
 transparent:true,opacity:0,depthWrite:false,colorWrite:false
});

for(let i=0;i<5;i++){
 const g=new THREE.Group();

 // Invisible target volume: gameplay collision only, never rendered.
 const hit=new THREE.Mesh(new THREE.CapsuleGeometry(.34,1.18,4,8),botHitMat);
 hit.position.y=.92;
 g.add(hit);

 g.position.set((i%2?1:-1)*(3.5+(i%3)*2),0,-14-i*10);
 g.userData={hp:100,alive:true,respawn:0,knock:new THREE.Vector3(),mixer:null};
 scene.add(g);
 bots.push(g);
}

const HUMAN_MODEL_URL="https://cdn.jsdelivr.net/gh/UMRAM-Bilkent/supine-human-model@main/assets/human.glb";
assetLoader.load(
 HUMAN_MODEL_URL,
 gltf=>{
  for(let i=0;i<bots.length;i++){
   const avatar=SkeletonUtils.clone(gltf.scene);
   avatar.traverse(o=>{
    if(o.isMesh){
     o.castShadow=false;
     o.receiveShadow=true;
     if(o.material){
      o.material=o.material.clone();
      if("roughness" in o.material)o.material.roughness=.62;
     }
    }
   });

   // Normalize each avatar to a human-scale ~1.78 m standing height.
   let box=new THREE.Box3().setFromObject(avatar);
   const h=Math.max(.001,box.max.y-box.min.y);
   avatar.scale.setScalar(1.78/h);
   avatar.updateMatrixWorld(true);
   box=new THREE.Box3().setFromObject(avatar);
   avatar.position.y-=box.min.y;
   avatar.rotation.y=i%2?Math.PI*.12:-Math.PI*.12;

   bots[i].add(avatar);

   if(gltf.animations&&gltf.animations.length){
    const mixer=new THREE.AnimationMixer(avatar);
    const idle=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0];
    mixer.clipAction(idle).play();
    bots[i].userData.mixer=mixer;
   }
  }

  // Replace the stunt body's old primitive meshes with an actual human mesh.
  if(typeof bodyProxy!=="undefined"){
   bodyProxy.traverse(o=>{if(o.isMesh)o.visible=false;});
   const playerAvatar=SkeletonUtils.clone(gltf.scene);
   playerAvatar.traverse(o=>{
    if(o.isMesh){
     o.castShadow=false;
     o.receiveShadow=true;
     if(o.material){
      o.material=o.material.clone();
      if(o.material.color)o.material.color.multiplyScalar(.55);
      if("roughness" in o.material)o.material.roughness=.68;
     }
    }
   });
   let pb=new THREE.Box3().setFromObject(playerAvatar);
   const ph=Math.max(.001,pb.max.y-pb.min.y);
   playerAvatar.scale.setScalar(1.80/ph);
   playerAvatar.updateMatrixWorld(true);
   pb=new THREE.Box3().setFromObject(playerAvatar);
   playerAvatar.position.y-=pb.min.y;
   playerAvatar.rotation.y=Math.PI;
   bodyProxy.add(playerAvatar);
   bodyProxy.userData.realAvatar=playerAvatar;
  }
 },
 undefined,
 err=>console.warn("Human bot mesh load failed",err)
);
const hands={left:null,right:null};
const handMeshFactory=new XRHandModelFactory();
const realHandModels={left:null,right:null};

function makeMicroTexture(size=64,cloth=false){
 const c=document.createElement("canvas");
 c.width=c.height=size;
 const ctx=c.getContext("2d");
 const img=ctx.createImageData(size,size);
 for(let y=0;y<size;y++){
  for(let x=0;x<size;x++){
   const i=(y*size+x)*4;
   const grain=Math.sin(x*(cloth?.92:.47))*Math.sin(y*(cloth?1.11:.53));
   const weave=cloth?(Math.sin(x*2.25)+Math.sin(y*2.05))*.5:0;
   const random=(Math.random()-.5)*(cloth?24:14);
   const v=THREE.MathUtils.clamp(128+grain*(cloth?18:8)+weave*(cloth?9:0)+random,72,190);
   img.data[i]=img.data[i+1]=img.data[i+2]=v;
   img.data[i+3]=255;
  }
 }
 ctx.putImageData(img,0,0);
 const tex=new THREE.CanvasTexture(c);
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 tex.repeat.set(cloth?7:5,cloth?7:5);
 tex.anisotropy=2;
 return tex;
}

const skinMicroTexture=makeMicroTexture(64,false);
const clothMicroTexture=makeMicroTexture(64,true);

function makeSkinMaterial(source){
 const src=source||{};
 return new THREE.MeshPhysicalMaterial({
  color:0x633a29,
  map:src.map||null,
  normalMap:src.normalMap||null,
  aoMap:src.aoMap||null,
  roughnessMap:src.roughnessMap||null,
  roughness:.69,
  metalness:0,
  clearcoat:.008,
  clearcoatRoughness:.96,
  sheen:.035,
  sheenRoughness:.92,
  sheenColor:new THREE.Color(0x5d382b),
  bumpMap:src.normalMap?null:skinMicroTexture,
  bumpScale:.00135
 });
}

function applyRealHandSkin(model){
 if(!model||model.userData.skinReady)return;
 let found=false;
 model.traverse(o=>{
  if(o.isSkinnedMesh||o.isMesh){
   found=true;
   o.frustumCulled=false;
   o.castShadow=false;
   o.receiveShadow=true;
   o.material=makeSkinMaterial(o.material);
  }
 });
 if(found)model.userData.skinReady=true;
}

const jacketMat=new THREE.MeshPhysicalMaterial({
 color:0x0b0c0e,
 roughness:.86,
 metalness:.01,
 sheen:.38,
 sheenRoughness:.74,
 sheenColor:new THREE.Color(0x262a30),
 bumpMap:clothMicroTexture,
 bumpScale:.0030
});

const SLEEVE_RINGS=18;
const SLEEVE_SIDES=14;

function createSleeveGeometry(){
 const verts=SLEEVE_RINGS*SLEEVE_SIDES;
 const positions=new Float32Array(verts*3);
 const normals=new Float32Array(verts*3);
 const uvs=new Float32Array(verts*2);
 const indices=[];

 for(let r=0;r<SLEEVE_RINGS;r++){
  const v=r/(SLEEVE_RINGS-1);
  for(let j=0;j<SLEEVE_SIDES;j++){
   const i=r*SLEEVE_SIDES+j;
   uvs[i*2]=j/SLEEVE_SIDES;
   uvs[i*2+1]=v;
  }
 }
 for(let r=0;r<SLEEVE_RINGS-1;r++){
  for(let j=0;j<SLEEVE_SIDES;j++){
   const nj=(j+1)%SLEEVE_SIDES;
   const a=r*SLEEVE_SIDES+j;
   const b=r*SLEEVE_SIDES+nj;
   const c=(r+1)*SLEEVE_SIDES+j;
   const d=(r+1)*SLEEVE_SIDES+nj;
   indices.push(a,c,b,b,c,d);
  }
 }

 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 g.setAttribute("normal",new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
 g.setAttribute("uv",new THREE.BufferAttribute(uvs,2));
 g.setIndex(indices);
 return g;
}

function createSleeve(){
 const mesh=new THREE.Mesh(createSleeveGeometry(),jacketMat);
 mesh.visible=false;
 mesh.frustumCulled=false;
 mesh.renderOrder=1;
 scene.add(mesh);
 return mesh;
}

const sleeves={left:createSleeve(),right:createSleeve()};

function quadBezier(a,b,c,t,out){
 const it=1-t;
 return out.copy(a).multiplyScalar(it*it)
  .addScaledVector(b,2*it*t)
  .addScaledVector(c,t*t);
}

function quadBezierTangent(a,b,c,t,out){
 return out.copy(b).sub(a).multiplyScalar(2*(1-t))
  .add(c.clone().sub(b).multiplyScalar(2*t))
  .normalize();
}

const sleeveTmp={
 p:new THREE.Vector3(),
 tangent:new THREE.Vector3(),
 n1:new THREE.Vector3(),
 n2:new THREE.Vector3(),
 radial:new THREE.Vector3(),
 shoulder:new THREE.Vector3(),
 elbow:new THREE.Vector3()
};

function updateSleeve(side){
 const h=hands[side];
 const mesh=sleeves[side];
 const wristJoint=joint(h,"wrist");
 if(!wristJoint){
  mesh.visible=false;
  return;
 }

 const wrist=wpos(wristJoint);
 const headPos=camera.getWorldPosition(new THREE.Vector3());
 const headQ=camera.getWorldQuaternion(new THREE.Quaternion());
 const headR=new THREE.Vector3(1,0,0).applyQuaternion(headQ).setY(0);
 const headF=new THREE.Vector3(0,0,-1).applyQuaternion(headQ).setY(0);
 if(headR.lengthSq()<.001)headR.set(1,0,0); else headR.normalize();
 if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();

 const sign=side==="left"?-1:1;
 const shoulder=sleeveTmp.shoulder.copy(headPos)
  .addScaledVector(headR,sign*.205)
  .addScaledVector(WORLD_UP,-.235)
  .addScaledVector(headF,.025);

 const elbow=sleeveTmp.elbow.copy(shoulder).lerp(wrist,.52)
  .addScaledVector(headR,sign*.105)
  .addScaledVector(WORLD_UP,-.045)
  .addScaledVector(headF,.035);

 // Push the cloth slightly past the XR wrist so there is no floating-hand seam.
 const wristDir=wrist.clone().sub(elbow).normalize();
 const cuffEnd=wrist.clone().addScaledVector(wristDir,.034);

 const pos=mesh.geometry.attributes.position;
 const nor=mesh.geometry.attributes.normal;

 for(let r=0;r<SLEEVE_RINGS;r++){
  const t=r/(SLEEVE_RINGS-1);
  quadBezier(shoulder,elbow,cuffEnd,t,sleeveTmp.p);
  quadBezierTangent(shoulder,elbow,cuffEnd,t,sleeveTmp.tangent);

  sleeveTmp.n1.crossVectors(sleeveTmp.tangent,headF);
  if(sleeveTmp.n1.lengthSq()<.0001)sleeveTmp.n1.crossVectors(sleeveTmp.tangent,WORLD_UP);
  sleeveTmp.n1.normalize();
  sleeveTmp.n2.crossVectors(sleeveTmp.tangent,sleeveTmp.n1).normalize();

  const elbowFold=Math.exp(-Math.pow((t-.56)/.18,2));
  const cuffFold=Math.exp(-Math.pow((t-.91)/.075,2));
  let baseR=THREE.MathUtils.lerp(.102,.058,t);
  if(t>.86)baseR*=THREE.MathUtils.lerp(1,.94,(t-.86)/.14);

  for(let j=0;j<SLEEVE_SIDES;j++){
   const a=(j/SLEEVE_SIDES)*Math.PI*2;
   const asym=1+.075*Math.cos(a*2+sign*.7);
   const fold=1
    +elbowFold*.095*Math.sin(a*3+r*1.28)
    +cuffFold*.065*Math.sin(a*2-r*.9)
    +.035*Math.sin(r*1.65+a*2.2);
   const radius=baseR*asym*fold;
   const radial=sleeveTmp.radial.copy(sleeveTmp.n1).multiplyScalar(Math.cos(a)*radius)
    .addScaledVector(sleeveTmp.n2,Math.sin(a)*radius*.92);

   const i=r*SLEEVE_SIDES+j;
   const p=sleeveTmp.p.clone().add(radial);
   pos.setXYZ(i,p.x,p.y,p.z);
   radial.normalize();
   nor.setXYZ(i,radial.x,radial.y,radial.z);
  }
 }

 pos.needsUpdate=true;
 nor.needsUpdate=true;
 mesh.visible=true;
}

function updateRealHands(){
 applyRealHandSkin(realHandModels.left);
 applyRealHandSkin(realHandModels.right);
 updateSleeve("left");
 updateSleeve("right");
}

for(let i=0;i<2;i++){
 const h=renderer.xr.getHand(i);
 const handModel=handMeshFactory.createHandModel(h,"mesh");
 h.add(handModel);
 player.add(h);

 h.addEventListener("connected",e=>{
  const side=e.data&&e.data.handedness;
  if(side){
   hands[side]=h;
   realHandModels[side]=handModel;
  }
 });

 h.addEventListener("disconnected",()=>{
  if(hands.left===h){hands.left=null;realHandModels.left=null;sleeves.left.visible=false;}
  if(hands.right===h){hands.right=null;realHandModels.right=null;sleeves.right.visible=false;}
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

// Stunt knife now uses shaped mesh geometry instead of rectangular primitives.
const matBlade=new THREE.MeshPhysicalMaterial({
 color:0xd5d9dc,
 roughness:.17,
 metalness:.86,
 clearcoat:.18,
 clearcoatRoughness:.26
});
const matGrip=new THREE.MeshPhysicalMaterial({
 color:0x111317,
 roughness:.70,
 metalness:.03,
 sheen:.22,
 sheenRoughness:.78
});
const testGun=new THREE.Group();

const bladeShape=new THREE.Shape();
bladeShape.moveTo(-.020,.020);
bladeShape.lineTo(.020,.020);
bladeShape.lineTo(.014,-.265);
bladeShape.lineTo(.006,-.340);
bladeShape.lineTo(0,-.385);
bladeShape.lineTo(-.010,-.330);
bladeShape.lineTo(-.017,-.245);
bladeShape.closePath();

const bladeGeo=new THREE.ExtrudeGeometry(bladeShape,{
 depth:.012,
 bevelEnabled:true,
 bevelSegments:2,
 steps:1,
 bevelSize:.003,
 bevelThickness:.003
});
bladeGeo.rotateX(Math.PI/2);
bladeGeo.translate(0,0,.005);
const testGunBody=new THREE.Mesh(bladeGeo,matBlade);

const gripProfile=[
 new THREE.Vector2(.030,-.070),
 new THREE.Vector2(.034,-.045),
 new THREE.Vector2(.038,-.010),
 new THREE.Vector2(.040,.025),
 new THREE.Vector2(.036,.060),
 new THREE.Vector2(.032,.090)
];
const gripGeo=new THREE.LatheGeometry(gripProfile,16);
gripGeo.rotateX(Math.PI/2);
gripGeo.translate(0,0,.105);
const testGunGrip=new THREE.Mesh(gripGeo,matGrip);

const guardShape=new THREE.Shape();
guardShape.moveTo(-.040,-.010);
guardShape.quadraticCurveTo(-.046,0,-.040,.010);
guardShape.lineTo(.040,.010);
guardShape.quadraticCurveTo(.046,0,.040,-.010);
guardShape.closePath();
const guardGeo=new THREE.ExtrudeGeometry(guardShape,{
 depth:.008,bevelEnabled:true,bevelSegments:1,bevelSize:.002,bevelThickness:.002
});
guardGeo.rotateX(Math.PI/2);
const guard=new THREE.Mesh(guardGeo,matBlade);
guard.position.z=.020;

testGun.add(testGunBody,testGunGrip,guard);
testGun.scale.setScalar(.56);
scene.add(testGun);
testGun.visible=false;

const gunCatchMarker=new THREE.Mesh(
 new THREE.TorusGeometry(.10,.012,6,20),
 new THREE.MeshBasicMaterial({color:0xffd36a,transparent:true,opacity:.75,depthWrite:false})
);
gunCatchMarker.visible=false;
scene.add(gunCatchMarker);

const gunState={
 mode:"held",          // held -> trick / falling -> grounded -> returning
 velocity:new THREE.Vector3(),
 angularVelocity:new THREE.Vector3(),
 returnStarted:0,
 restQuat:new THREE.Quaternion(),
 hitBots:new Set()
};

const knifeTrickState={
 prevWristPos:null,
 wristVel:new THREE.Vector3(),
 pinchWasDown:false,
 trickStarted:0,
 cooldownUntil:0
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

function rightPinchDown(){
 const h=hands.right;
 const a=joint(h,"thumb-tip");
 const b=joint(h,"index-finger-tip");
 if(!a||!b)return false;
 return wpos(a).distanceTo(wpos(b))<.034;
}

function beginKnifeFlipTrick(){
 if(gunState.mode!=="held")return false;

 updateHeldGun();
 gunState.mode="trick";
 knifeTrickState.trickStarted=performance.now();
 knifeTrickState.cooldownUntil=performance.now()+900;
 gunCatchMarker.visible=false;

 status.innerHTML="<b>KNIFE TRICK</b><br>Flip up — spin — catch.";
 return true;
}

function updateKnifeTrickGesture(dt){
 const h=hands.right;
 const w=joint(h,"wrist");
 if(!w){
  knifeTrickState.prevWristPos=null;
  knifeTrickState.pinchWasDown=false;
  return;
 }

 const p=wpos(w);
 if(knifeTrickState.prevWristPos){
  const raw=p.clone().sub(knifeTrickState.prevWristPos).multiplyScalar(1/Math.max(.008,dt));
  knifeTrickState.wristVel.lerp(raw,1-Math.exp(-dt*18));
 }
 knifeTrickState.prevWristPos=p;

 const pinch=rightPinchDown();
 const released=knifeTrickState.pinchWasDown&&!pinch;
 knifeTrickState.pinchWasDown=pinch;

 if(
  released &&
  performance.now()>=knifeTrickState.cooldownUntil &&
  knifeTrickState.wristVel.y>.22 &&
  gunState.mode==="held"
 ){
  beginKnifeFlipTrick();
 }
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
 testGun.translateZ(-.095);
 testGun.translateY(-.018);
}

function tryTossTestGun(){
 const c=controllers.right;
 if(!c||gunState.mode!=="held"||!controllerIsFlipped(c))return false;

 updateHeldGun();
 gunState.mode="falling";
 gunState.hitBots.clear();

 const q=testGun.quaternion.clone();
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();

 gunState.velocity.copy(forward).multiplyScalar(2.8).addScaledVector(WORLD_UP,5.2);
 gunState.angularVelocity.set(-12.5,2.0,1.1);
 gunCatchMarker.visible=false;

 status.innerHTML="<b>KNIFE TOSS</b><br>Knife is loose — it will land and stay there.";
 return true;
}

function updateTestGun(dt){
 updateKnifeTrickGesture(dt);

 if(gunState.mode==="held"){
  gunCatchMarker.visible=false;
  updateHeldGun();
  return;
 }

 if(gunState.mode==="trick"){
  const p=rightHandPose();
  if(!p)return;

  const elapsed=(performance.now()-knifeTrickState.trickStarted)/1000;
  const u=THREE.MathUtils.clamp(elapsed/.72,0,1);
  const arc=Math.sin(Math.PI*u);

  const up=new THREE.Vector3(0,1,0);
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(p.quat).normalize();

  testGun.visible=true;
  testGun.position.copy(p.pos)
   .addScaledVector(up,.10+.27*arc)
   .addScaledVector(forward,-.04+.07*arc);

  const spin=new THREE.Quaternion().setFromAxisAngle(
   new THREE.Vector3(1,0,0),
   Math.PI*4*u
  );
  testGun.quaternion.copy(p.quat).multiply(spin);

  if(u>=1){
   gunState.mode="held";
   updateHeldGun();
   status.innerHTML="<b>KNIFE CAUGHT</b><br>Clean flip.";
  }
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
 const w=joint(h,"wrist");
 const tip=joint(h,"index-finger-tip");
 const distal=joint(h,"index-finger-phalanx-distal");
 const middleJ=joint(h,"index-finger-phalanx-intermediate");
 const prox=joint(h,"index-finger-phalanx-proximal");
 const meta=joint(h,"index-finger-metacarpal");
 const m=joint(h,"middle-finger-tip");
 const r=joint(h,"ring-finger-tip");
 const p=joint(h,"pinky-finger-tip");
 const t=joint(h,"thumb-tip");
 if(!w||!tip||!distal||!middleJ||!prox||!meta||!m||!r||!p||!t)return false;

 const wp=wpos(w);
 const barrel=wpos(tip).sub(wpos(meta)).normalize();
 const d1=wpos(tip).sub(wpos(distal)).normalize();
 const d2=wpos(distal).sub(wpos(middleJ)).normalize();
 const d3=wpos(middleJ).sub(wpos(prox)).normalize();

 // Pointing gun: index is straight, the other three fingers are curled,
 // and the thumb is down/near the grip instead of needing a thumb-up pose.
 const indexStraight=
  d1.dot(barrel)>.72 &&
  d2.dot(barrel)>.68 &&
  d3.dot(barrel)>.60 &&
  wpos(tip).distanceTo(wp)>.12;

 const gripClosed=
  wpos(m).distanceTo(wp)<.115 &&
  wpos(r).distanceTo(wp)<.110 &&
  wpos(p).distanceTo(wp)<.106;

 const thumbDown=wpos(t).distanceTo(wp)<.135;

 return indexStraight&&gripClosed&&thumbDown;
}

function fingerPose(h){
 if(!isFingerGun(h))return null;
 const tip=joint(h,"index-finger-tip");
 const dir=indexDir(h);
 if(!tip||!dir)return null;

 // Fire from just beyond the fat fingertip muzzle.
 return {
  origin:wpos(tip).addScaledVector(dir,.032),
  dir
 };
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

const bulletMat=new THREE.LineBasicMaterial({
 color:0xd8ffff,
 transparent:true,
 opacity:.90
});
const bullets=[];
const BULLET_SPEED=24;

function spawnBullet(origin,dir,damage=48){
 const d=dir.clone().normalize();
 const geo=new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0,0,0),
  d.clone().multiplyScalar(-.18)
 ]);
 const mesh=new THREE.Line(geo,bulletMat);
 mesh.position.copy(origin);
 scene.add(mesh);
 bullets.push({
  mesh,
  velocity:d.multiplyScalar(BULLET_SPEED),
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
torso.visible=false;
bodyProxy.add(torso);
const hips=new THREE.Mesh(new THREE.SphereGeometry(.20,8,6),matDark);
hips.visible=false;
bodyProxy.add(hips);
const limbGeo=new THREE.CylinderGeometry(.085,.085,.72,7);
const limbs={};
for(const k of ["thighL","shinL","thighR","shinR","armL","armR"]){
 limbs[k]=new THREE.Mesh(limbGeo,matDark);
 limbs[k].visible=false;
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
 const active=!!(
  lp&&rp&&
  isFist(hands.left)&&isFist(hands.right)&&
  !stuntActive&&!wallState.active
 );

 if(!active){
  fistGlideActive=false;
  fistPrevAngle=null;
  fistPrevSpan=null;
  fistRollRate=THREE.MathUtils.lerp(fistRollRate,0,1-Math.exp(-dt*6));
  fistGlideEnergy*=Math.pow(.972,dt*60);
  fistGlideSpeed=THREE.MathUtils.lerp(
   fistGlideSpeed,
   fistGlideEnergy*12.8,
   1-Math.exp(-dt*2.2)
  );
  centerAssist=THREE.MathUtils.lerp(centerAssist,0,1-Math.exp(-dt*6));
  return false;
 }

 const span=rp.clone().sub(lp);
 if(span.length()<.13||span.length()>.82){
  fistGlideActive=false;
  fistPrevAngle=null;
  return false;
 }

 fistGlideActive=true;

 const center=lp.clone().add(rp).multiplyScalar(.5);

 const headF=camera.getWorldDirection(new THREE.Vector3());
 headF.y=0;
 if(headF.lengthSq()<.001)headF.set(0,0,-1); else headF.normalize();
 const headR=new THREE.Vector3().crossVectors(headF,WORLD_UP).normalize();
 const headYaw=Math.atan2(-headF.x,-headF.z);

 if(!glideYawInitialized){
  glideYaw=headYaw;
  glideYawInitialized=true;
 }

 // Wrist-to-wrist rotation is the "rolling your arms" motion.
 const x=span.dot(headR);
 const y=span.dot(WORLD_UP);
 const angle=Math.atan2(y,x);

 let signedRoll=0;
 if(fistPrevAngle!==null){
  let d=angle-fistPrevAngle;
  d=Math.atan2(Math.sin(d),Math.cos(d));
  const angularVelocity=d/Math.max(.008,dt);
  const angularSpeed=Math.abs(angularVelocity);

  signedRoll=THREE.MathUtils.clamp(angularVelocity/5.5,-1.35,1.35);
  fistRollRate=THREE.MathUtils.lerp(
   fistRollRate,
   signedRoll,
   1-Math.exp(-dt*11)
  );

  // Circular motion pumps speed. No unwanted baseline motion just for making fists.
  if(angularSpeed>.30){
   fistGlideEnergy=Math.min(1.18,fistGlideEnergy+angularSpeed*dt*.26);
  }else{
   fistGlideEnergy*=Math.pow(.986,dt*60);
  }
 }
 fistPrevAngle=angle;

 // If you roll one way, movement carves the opposite way.
 const oppositeRollTurn=-fistRollRate*(1.25+fistGlideEnergy*.85);
 glideYaw+=oppositeRollTurn*dt;

 // Where the pair of rolling arms sits also nudges you the opposite way.
 const headPos=camera.getWorldPosition(new THREE.Vector3());
 const armSide=THREE.MathUtils.clamp(
  center.clone().sub(headPos).dot(headR)/.42,
  -1,1
 );
 glideYaw+=(-armSide)*(0.32+fistGlideEnergy*.42)*dt;

 // Turning your head strongly pulls travel toward exactly where you are facing.
 let yawError=headYaw-glideYaw;
 yawError=Math.atan2(Math.sin(yawError),Math.cos(yawError));
 const headSteer=THREE.MathUtils.clamp(4.3*dt,0,1);
 glideYaw+=yawError*headSteer;

 fistGlideEnergy*=Math.pow(.995,dt*60);
 const targetSpeed=THREE.MathUtils.clamp(fistGlideEnergy*13.4,0,15.4);
 fistGlideSpeed=THREE.MathUtils.lerp(
  fistGlideSpeed,
  targetSpeed,
  1-Math.exp(-dt*4.2)
 );

 const moveDir=new THREE.Vector3(
  -Math.sin(glideYaw),0,-Math.cos(glideYaw)
 ).normalize();

 const moveBlend=1-Math.exp(-dt*5.2);
 velocity.x=THREE.MathUtils.lerp(velocity.x,moveDir.x*fistGlideSpeed,moveBlend);
 velocity.z=THREE.MathUtils.lerp(velocity.z,moveDir.z*fistGlideSpeed,moveBlend);
 velocity.y=0;
 player.position.y=GROUND_Y;
 grounded=true;

 // Very light lean only; movement direction should do the talking.
 centerAssist=THREE.MathUtils.lerp(
  centerAssist,
  THREE.MathUtils.clamp(oppositeRollTurn/2,-1,1),
  1-Math.exp(-dt*7)
 );
 cameraFX.rotation.z=THREE.MathUtils.lerp(
  cameraFX.rotation.z,
  -centerAssist*.035,
  1-Math.exp(-dt*7)
 );
 cameraFX.rotation.y=THREE.MathUtils.lerp(
  cameraFX.rotation.y,
  0,
  1-Math.exp(-dt*7)
 );

 return true;
}

const bodycamState={
 prevYaw:0,
 yawInit:false,
 prevVel:new THREE.Vector3(),
 bobTime:0
};

function updateBodyCam(dt){
 // During authored stunt/wall sequences, keep this layer quieter so it doesn't fight them.
 const stuntScale=(stuntActive||wallState.active)?.35:1;
 const speed=Math.hypot(velocity.x,velocity.z);

 // Head yaw change gives the "camera housing" a tiny overshoot.
 const euler=new THREE.Euler().setFromQuaternion(camera.quaternion,"YXZ");
 const yaw=euler.y;
 let yawRate=0;
 if(bodycamState.yawInit){
  let dy=yaw-bodycamState.prevYaw;
  dy=Math.atan2(Math.sin(dy),Math.cos(dy));
  yawRate=THREE.MathUtils.clamp(dy/Math.max(dt,.008),-5,5);
 }else{
  bodycamState.yawInit=true;
 }
 bodycamState.prevYaw=yaw;

 // Acceleration adds a physical shove to the camera housing.
 const accel=velocity.clone().sub(bodycamState.prevVel).multiplyScalar(1/Math.max(dt,.008));
 bodycamState.prevVel.copy(velocity);

 bodycamState.bobTime+=dt*(2.0+speed*.42);
 const stepBob=Math.sin(bodycamState.bobTime*2.0)*Math.min(.012,speed*.0015);
 const sideBob=Math.sin(bodycamState.bobTime)*Math.min(.008,speed*.0010);

 const targetPos=new THREE.Vector3(
  THREE.MathUtils.clamp(-accel.x*.00055,-.012,.012)+sideBob,
  THREE.MathUtils.clamp(-accel.y*.00035,-.010,.010)+stepBob,
  THREE.MathUtils.clamp(accel.z*.00040,-.010,.010)
 ).multiplyScalar(stuntScale);

 const targetRot=new THREE.Vector3(
  THREE.MathUtils.clamp(-accel.z*.00040,-.018,.018),
  THREE.MathUtils.clamp(-yawRate*.006,-.026,.026),
  THREE.MathUtils.clamp(-yawRate*.010,-.040,.040)
 ).multiplyScalar(stuntScale);

 bodyCamRig.position.lerp(targetPos,1-Math.exp(-dt*11));
 bodyCamRig.rotation.x=THREE.MathUtils.lerp(bodyCamRig.rotation.x,targetRot.x,1-Math.exp(-dt*10));
 bodyCamRig.rotation.y=THREE.MathUtils.lerp(bodyCamRig.rotation.y,targetRot.y,1-Math.exp(-dt*10));
 bodyCamRig.rotation.z=THREE.MathUtils.lerp(bodyCamRig.rotation.z,targetRot.z,1-Math.exp(-dt*10));

 // Low-cost bodycam exposure breathing: brighter after fast turns/acceleration, then settles.
 const motionLift=THREE.MathUtils.clamp(
  Math.abs(yawRate)*.018 + Math.min(1,accel.length()/18)*.06,
  0,.105
 );
 const targetExposure=(stuntActive||wallState.active)?.92:1.04+motionLift;
 renderer.toneMappingExposure=THREE.MathUtils.lerp(
  renderer.toneMappingExposure,
  targetExposure,
  1-Math.exp(-dt*5.5)
 );
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

 // Controller users can still trigger the old upside-down stunt toss.
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
  if(bodyProxy.userData.realAvatar)bodyProxy.userData.realAvatar.visible=false;
  return;
 }

 const elapsed=performance.now()-stuntStart;
 const p=THREE.MathUtils.clamp(elapsed/stuntDuration,0,1);

 // Cinematic timing: anticipation, suspended bullet-time middle, hard finish.
 const spinP=THREE.MathUtils.clamp((p-.14)/.72,0,1);
 const ease=spinP<.5?2*spinP*spinP:1-Math.pow(-2*spinP+2,2)/2;
 const arc=Math.sin(Math.PI*p);
 const settle=THREE.MathUtils.smoothstep(p,.82,1);

 renderer.toneMappingExposure=THREE.MathUtils.lerp(1.04,.78,arc*(1-settle));
 key.intensity=THREE.MathUtils.lerp(1.3,.78,arc*(1-settle));
 const front=stuntMode==="front";

 bodyProxy.position.z=front ? .55:.70;
 bodyProxy.position.x=front?0:.20*stuntSide;
 poseBody(true,front);
 if(bodyProxy.userData.realAvatar)bodyProxy.userData.realAvatar.visible=true;

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
  renderer.toneMappingExposure=1.04;
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
 updateRealHands();

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
 const up=both&&poses.left.dir.y>.48&&poses.right.dir.y>.48;
 const handsParallel=both&&poses.left.dir.dot(poses.right.dir)>.82;
 const forward=both&&!up&&handsParallel&&poses.left.dir.dot(headF)>.78&&poses.right.dir.dot(headF)>.78;

 const requested=up?"back":(forward?"front":null);
 const now=performance.now();

 if(requested&&!wallState.active&&!wheelDriveActive&&!fistGlideActive&&now>=stuntCooldownUntil){
  if(gestureCandidate!==requested){
   gestureCandidate=requested;
   gestureSince=now;
  }else if(now-gestureSince>=520){
   beginStunt(requested);
   stuntCooldownUntil=now+1800;
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
  if(b.userData.mixer)b.userData.mixer.update(dt);
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
  if(!fistGlideActive&&!wheelDriveActive){
   const coastDrag=Math.pow(.986,dt*60);
   velocity.x*=coastDrag;
   velocity.z*=coastDrag;
   fistGlideSpeed*=Math.pow(.985,dt*60);
  }
 }

 // Land cleanly after a stunt/wall exit instead of hovering or sinking.
 if(!wallState.active && player.position.y<=GROUND_Y){
  player.position.y=GROUND_Y;
  if(velocity.y<0)velocity.y=0;
  if(!stuntActive)grounded=true;
 }

 const movingUnderControl=fistGlideActive||wheelDriveActive;
 const globalDrag=Math.pow(movingUnderControl?.998:.992,dt*60);
 velocity.x*=globalDrag;
 velocity.z*=globalDrag;
 if(stuntActive)velocity.y*=Math.pow(.997,dt*60);

 enforceBuildingWalls();
 enforceArenaBounds();
 const worldScale=(stuntActive||wallState.active)?.48:1;
 updateTestGun(dt*worldScale);
 updateBots(dt*worldScale);
 updateBullets(dt*worldScale);
 updateRain(dt);
 updateBodyCam(dt);
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
  status.innerHTML="<b>NEXUS ACTIVE</b><br>v32 visuals + hand-tracked knife flip trick ready.";
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
 bodyCamRig.position.set(0,0,0);
 bodyCamRig.rotation.set(0,0,0);
 status.innerHTML="<b>NEXUS v33 KNIFE TRICK</b><br>VR ended. Enter again when ready.";
});

addEventListener("resize",()=>{
 camera.aspect=innerWidth/innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize(innerWidth,innerHeight);
});

status.innerHTML="<b>NEXUS v33 KNIFE TRICK</b><br>Knife-trick micro pass loaded: pinch thumb + index, flick right hand upward, release to flip and catch. Everything else stays v32.";
