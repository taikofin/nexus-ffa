import { EnvironmentType, LocomotionEnvironment, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

declare global {
  interface Window { __NEXUS_IWSDK_BUILD?: string; }
}

const BUILD = 'iwsdk-a7-quest-reference-match';
window.__NEXUS_IWSDK_BUILD = BUILD;

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  mat: THREE.Material,
  rot: [number, number, number] = [0, 0, 0],
) {
  const edgeRadius = Number((mat as THREE.Material & { userData: Record<string, unknown> }).userData?.edgeRadius ?? 0);
  const geometry = edgeRadius > 0
    ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(edgeRadius, Math.min(...size) * 0.18))
    : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeCanvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, size: number) => void,
  maxAniso: number,
  repeatX: number,
  repeatY: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function hashNoise(x: number, y: number, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 19.19) * 43758.5453;
  return n - Math.floor(n);
}

function makeWoodMap(maxAniso: number, pale = false) {
  return makeCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = pale ? '#9a8268' : '#846d56';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y += 2) {
      const n = hashNoise(y, 9, pale ? 4 : 2);
      const l = Math.floor(86 + n * 36);
      ctx.strokeStyle = `rgba(${l},${Math.floor(l * .82)},${Math.floor(l * .62)},.18)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * .041) * 2.2);
      ctx.bezierCurveTo(size * .28, y + 4 * Math.sin(y * .021), size * .70, y - 3 * Math.cos(y * .027), size, y + Math.sin(y * .033) * 2.6);
      ctx.stroke();
    }

    for (let i = 0; i < 18; i++) {
      const x = hashNoise(i, 7, 11) * size;
      const y = hashNoise(i, 13, 17) * size;
      const rx = 6 + hashNoise(i, 3, 5) * 18;
      const ry = 2 + hashNoise(i, 8, 9) * 7;
      ctx.strokeStyle = 'rgba(48,34,24,.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, hashNoise(i, 1, 8) * .7, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 170; i++) {
      const x = hashNoise(i, 31, 4) * size;
      const y = hashNoise(i, 47, 8) * size;
      const a = .04 + hashNoise(i, 51, 2) * .07;
      ctx.fillStyle = `rgba(35,29,23,${a})`;
      ctx.fillRect(x, y, 1 + hashNoise(i, 2, 7) * 3, 1);
    }
  }, maxAniso, 1.4, 3.2);
}

function makeOSBMap(maxAniso: number) {
  return makeCanvasTexture(1024, (ctx, size) => {
    ctx.fillStyle = '#9a866a';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 5200; i++) {
      const x = hashNoise(i, 1, 3) * size;
      const y = hashNoise(i, 5, 7) * size;
      const w = 4 + hashNoise(i, 9, 11) * 18;
      const h = 1.2 + hashNoise(i, 13, 17) * 4.5;
      const rot = (hashNoise(i, 21, 23) - .5) * 1.1;
      const shade = 118 + Math.floor(hashNoise(i, 27, 31) * 56);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = `rgba(${shade},${Math.floor(shade*.88)},${Math.floor(shade*.68)},${.16 + hashNoise(i,35,37)*.22})`;
      ctx.fillRect(-w*.5, -h*.5, w, h);
      ctx.restore();
    }

    for (let i = 0; i < 90; i++) {
      const x = hashNoise(i, 43, 47) * size;
      const y = hashNoise(i, 53, 59) * size;
      ctx.fillStyle = 'rgba(38,32,27,.20)';
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + hashNoise(i, 61, 67) * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, maxAniso, 2.2, 2.2);
}

function makeConcreteMap(maxAniso: number) {
  return makeCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#53514d';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8500; i++) {
      const x = hashNoise(i, 5, 2) * size;
      const y = hashNoise(i, 11, 4) * size;
      const v = 56 + Math.floor(hashNoise(i, 17, 7) * 50);
      const a = .03 + hashNoise(i, 23, 9) * .09;
      ctx.fillStyle = `rgba(${v},${v},${v},${a})`;
      ctx.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 38; i++) {
      const x = hashNoise(i, 29, 11) * size;
      const y = hashNoise(i, 31, 13) * size;
      const r = 4 + hashNoise(i, 37, 17) * 22;
      const g = ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(20,18,16,.08)');
      g.addColorStop(1,'rgba(20,18,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x-r,y-r,r*2,r*2);
    }
  }, maxAniso, 5.2, 10.0);
}

function makeRoofMap(maxAniso: number) {
  return makeCanvasTexture(512, (ctx, size) => {
    ctx.fillStyle = '#202225';
    ctx.fillRect(0,0,size,size);
    for(let i=0;i<1600;i++){
      const x=hashNoise(i,3,4)*size;
      const y=hashNoise(i,7,8)*size;
      const v=22+Math.floor(hashNoise(i,11,12)*28);
      ctx.fillStyle=`rgba(${v},${v+1},${v+2},${.04+hashNoise(i,13,14)*.10})`;
      ctx.fillRect(x,y,1+hashNoise(i,17,18)*4,1);
    }
  }, maxAniso, 2.0, 2.0);
}


function makeDecalTexture(
  maxAniso: number,
  kind: 'scorch' | 'grime' | 'splatter',
  seed: number,
) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  if (kind === 'scorch') {
    for (let i = 0; i < 8; i++) {
      const x = size * (.32 + hashNoise(i, 7, seed) * .36);
      const y = size * (.34 + hashNoise(i, 11, seed + 2) * .32);
      const r = 18 + hashNoise(i, 17, seed + 5) * 62;
      const g = ctx.createRadialGradient(x, y, r * .08, x, y, r);
      g.addColorStop(0, 'rgba(22,15,11,.62)');
      g.addColorStop(.34, 'rgba(39,25,17,.34)');
      g.addColorStop(.72, 'rgba(52,39,29,.12)');
      g.addColorStop(1, 'rgba(52,39,29,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
  } else if (kind === 'grime') {
    for (let i = 0; i < 65; i++) {
      const x = hashNoise(i, 5, seed) * size;
      const y = hashNoise(i, 9, seed + 7) * size;
      const w = 4 + hashNoise(i, 13, seed + 3) * 46;
      const h = 1 + hashNoise(i, 15, seed + 11) * 7;
      ctx.fillStyle = `rgba(25,23,20,${.035 + hashNoise(i,19,seed)*.12})`;
      ctx.fillRect(x, y, w, h);
    }
    for (let i = 0; i < 14; i++) {
      const x = hashNoise(i, 23, seed) * size;
      const y = hashNoise(i, 29, seed + 4) * size;
      const len = 18 + hashNoise(i, 31, seed + 9) * 80;
      const grad = ctx.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, 'rgba(30,25,21,.16)');
      grad.addColorStop(1, 'rgba(30,25,21,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, 2 + hashNoise(i,37,seed)*5, len);
    }
  } else {
    for (let i = 0; i < 130; i++) {
      const x = size * (.12 + hashNoise(i, 3, seed) * .76);
      const y = size * (.12 + hashNoise(i, 7, seed + 6) * .76);
      const r = .6 + hashNoise(i, 11, seed + 10) * 4.2;
      ctx.fillStyle = `rgba(21,18,16,${.10 + hashNoise(i,13,seed)*.28})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function makeDustTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  g.addColorStop(0,'rgba(235,239,237,.42)');
  g.addColorStop(.35,'rgba(221,226,224,.20)');
  g.addColorStop(1,'rgba(221,226,224,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,size,size);
  return new THREE.CanvasTexture(canvas);
}

function makeJaggedMark(radius: number, seed: number) {
  const shape = new THREE.Shape();
  const points = 12;
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = radius * (.58 + hashNoise(i, 41, seed) * .48);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function makeBatteredBarrier(width: number, height: number, depth: number, seed: number) {
  const shape = new THREE.Shape();
  const topA = height * (.40 + hashNoise(seed, 3, 4) * .08);
  const topB = height * (.43 + hashNoise(seed, 5, 7) * .06);
  const inset = Math.min(.10, width * .08);
  shape.moveTo(-width/2 + inset, -height/2);
  shape.lineTo(width/2 - inset*.5, -height/2);
  shape.lineTo(width/2, -height/2 + inset);
  shape.lineTo(width/2 - inset*.35, topB);
  shape.lineTo(width*.18, height/2);
  shape.lineTo(-width*.14, height*.47);
  shape.lineTo(-width*.42, topA);
  shape.lineTo(-width/2, height*.28);
  shape.lineTo(-width/2, -height/2 + inset*.7);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: .018,
    bevelThickness: .012,
    curveSegments: 1,
  });
  geo.center();
  return geo;
}

function makeSilhouetteTarget() {
  const sh = new THREE.Shape();
  sh.moveTo(-.16,-.41);
  sh.lineTo(.16,-.41);
  sh.lineTo(.20,-.12);
  sh.lineTo(.27,.02);
  sh.lineTo(.21,.23);
  sh.lineTo(.10,.31);
  sh.lineTo(.10,.39);
  sh.bezierCurveTo(.10,.52,-.10,.52,-.10,.39);
  sh.lineTo(-.10,.31);
  sh.lineTo(-.21,.23);
  sh.lineTo(-.27,.02);
  sh.lineTo(-.20,-.12);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, {
    depth: .035,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: .007,
    bevelThickness: .006,
    curveSegments: 4,
  });
  geo.center();
  return geo;
}

function addLivedInDetail(
  root: THREE.Group,
  maxAniso: number,
  concrete: THREE.Material,
  woodDark: THREE.Material,
  steel: THREE.Material,
) {
  const decalMaterial = (kind: 'scorch'|'grime'|'splatter', seed: number, opacity: number) =>
    new THREE.MeshStandardMaterial({
      map: makeDecalTexture(maxAniso, kind, seed),
      transparent: true,
      opacity,
      depthWrite: false,
      roughness: kind === 'scorch' ? .96 : .88,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      side: THREE.DoubleSide,
    });

  const wallDecals: Array<[number,number,number,number,number,'scorch'|'grime'|'splatter',number]> = [
    [-3.354,1.10, 1.20,1.15,.90,'grime',12],
    [ 3.354,1.56,-.80, .78,.68,'scorch',22],
    [-3.354,.88,-3.76,1.34,.80,'splatter',31],
    [ 3.354,.66,-5.58,1.46,.62,'grime',43],
    [-3.354,1.82,-7.05,.86,.74,'scorch',57],
    [ 3.354,1.30,-8.76,1.08,.72,'splatter',69],
  ];
  wallDecals.forEach(([x,y,z,w,h,kind,seed], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), decalMaterial(kind, seed, kind==='scorch'?.66:.54));
    m.position.set(x,y,z);
    m.rotation.y = x < 0 ? Math.PI/2 : -Math.PI/2;
    m.rotation.z = ((i%3)-1)*.06;
    root.add(m);
  });

  const floorDecals: Array<[number,number,number,number,'grime'|'scorch',number]> = [
    [-1.85,-2.20,1.25,.72,'grime',81],
    [ .95,-4.62,1.05,.66,'scorch',88],
    [-.20,-7.54,1.45,.74,'grime',94],
  ];
  floorDecals.forEach(([x,z,w,h,kind,seed],i)=>{
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w,h), decalMaterial(kind,seed,.43));
    m.rotation.x = -Math.PI/2;
    m.rotation.z = (i-1)*.18;
    m.position.set(x,.008,z);
    root.add(m);
  });

  // Jagged impact cavities with a second, smaller center for actual depth read.
  const holes: Array<[number,number,number,number,number]> = [
    [-3.357,1.52,-.12,.075,101],
    [ 3.357,1.18,-2.98,.055,102],
    [-3.357,.72,-6.32,.085,103],
    [ 3.357,1.92,-8.22,.064,104],
    [-3.357,2.15,-8.58,.048,105],
  ];
  holes.forEach(([x,y,z,r,seed])=>{
    const rimMat = new THREE.MeshBasicMaterial({color:0x302b27,transparent:true,opacity:.92,side:THREE.DoubleSide});
    const centerMat = new THREE.MeshBasicMaterial({color:0x090a0a,transparent:true,opacity:.92,side:THREE.DoubleSide});
    const rim = new THREE.Mesh(makeJaggedMark(r,seed),rimMat);
    const center = new THREE.Mesh(makeJaggedMark(r*.48,seed+30),centerMat);
    rim.position.set(x,y,z); center.position.set(x + (x<0?.001:-.001),y,z);
    rim.rotation.y = center.rotation.y = x<0 ? Math.PI/2 : -Math.PI/2;
    root.add(rim,center);
  });

  // Rubble / trash: small, irregular enough to read as debris instead of spawned primitives.
  const debrisMat = new THREE.MeshStandardMaterial({color:0x4a4640,roughness:.98,metalness:0});
  for (let i=0;i<22;i++) {
    const geo = new THREE.IcosahedronGeometry(.05 + hashNoise(i,3,111)*.07,0);
    const p = geo.attributes.position;
    for(let v=0;v<p.count;v++){
      p.setXYZ(v,p.getX(v)*(1.2+hashNoise(v,i,5)*.9),p.getY(v)*(.45+hashNoise(v,i,8)*.7),p.getZ(v)*(.7+hashNoise(v,i,13)*.8));
    }
    geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo,debrisMat);
    const side = i%2 ? 1 : -1;
    rock.position.set(side*(2.55+hashNoise(i,19,3)*.42),.04+hashNoise(i,23,7)*.04,2.1-hashNoise(i,29,9)*11.0);
    rock.rotation.set(hashNoise(i,31,2)*2,hashNoise(i,37,4)*3,hashNoise(i,41,6)*2);
    rock.castShadow=true; rock.receiveShadow=true;
    root.add(rock);
  }

  // Torn paper and a bent cable add recognizable scale objects.
  const paperMat = new THREE.MeshStandardMaterial({color:0xafa99d,roughness:.96,metalness:0,side:THREE.DoubleSide});
  for(let i=0;i<5;i++){
    const geo = new THREE.PlaneGeometry(.18+hashNoise(i,3,140)*.12,.24+hashNoise(i,5,145)*.16,2,2);
    const p = geo.attributes.position;
    for(let v=0;v<p.count;v++) p.setZ(v,(hashNoise(v,i,151)-.5)*.045);
    geo.computeVertexNormals();
    const paper = new THREE.Mesh(geo,paperMat);
    paper.rotation.set(-Math.PI/2 + (hashNoise(i,7,156)-.5)*.18,0,hashNoise(i,9,160)*Math.PI);
    paper.position.set(-1.9 + hashNoise(i,11,164)*3.8,.026,-1.6-hashNoise(i,13,168)*7.0);
    root.add(paper);
  }

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.86,.035,-1.05),
    new THREE.Vector3(-2.20,.026,-1.72),
    new THREE.Vector3(-2.54,.030,-2.50),
    new THREE.Vector3(-1.76,.027,-3.30),
    new THREE.Vector3(-2.25,.031,-4.02),
  ]);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(cableCurve,30,.016,7,false),
    new THREE.MeshStandardMaterial({color:0x171818,roughness:.82,metalness:.18})
  );
  cable.castShadow=true; cable.receiveShadow=true; root.add(cable);

  // Suspended dust gives the practicals something to catch without building fake fog walls.
  const dustGeo = new THREE.BufferGeometry();
  const dust = new Float32Array(150*3);
  for(let i=0;i<150;i++){
    dust[i*3+0] = -2.9 + hashNoise(i,3,180)*5.8;
    dust[i*3+1] = .25 + hashNoise(i,5,184)*2.45;
    dust[i*3+2] = 2.5 - hashNoise(i,7,188)*12.2;
  }
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dust,3));
  const dustMat = new THREE.PointsMaterial({
    map: makeDustTexture(),
    color:0xcfd7d5,
    size:.062,
    transparent:true,
    opacity:.22,
    depthWrite:false,
    blending:THREE.AdditiveBlending,
    sizeAttenuation:true,
  });
  root.add(new THREE.Points(dustGeo,dustMat));

  // Broken scrap leaning against a wall: authored silhouette and layered thickness.
  const scrapGeo = makeBatteredBarrier(.72,1.05,.055,211);
  const scrap = new THREE.Mesh(scrapGeo,woodDark);
  scrap.position.set(-3.04,.53,-5.88);
  scrap.rotation.set(.02,.28,-.09);
  scrap.castShadow=true; scrap.receiveShadow=true;
  root.add(scrap);

  // Small steel plates around the far lane break clean construction repetition.
  for(let i=0;i<4;i++){
    const plate = new THREE.Mesh(makeBatteredBarrier(.34,.26,.018,230+i),steel);
    plate.position.set(-1.9+i*1.18,.14+((i%2)*.12),-9.72+(i%2)*.10);
    plate.rotation.set(.06*i,.08*(i-1),.11*(i%2?-1:1));
    plate.castShadow=true; plate.receiveShadow=true;
    root.add(plate);
  }

  void concrete;
}

function buildHeroHall(maxAniso: number) {
  const root = new THREE.Group();
  root.name = 'NEXUS_HERO_HALL_A7';

  const woodMap = makeWoodMap(maxAniso, false);
  const woodLightMap = makeWoodMap(maxAniso, true);
  const osbMap = makeOSBMap(maxAniso);
  const concreteMap = makeConcreteMap(maxAniso);
  const roofMap = makeRoofMap(maxAniso);

  // BODYCAM palette: muted, dirty, rough. No saturated "VR demo" colors.
  const wood = new THREE.MeshStandardMaterial({
    color: 0x8f7a63, map: woodMap, bumpMap: woodMap, bumpScale: .010,
    roughness: .86, metalness: 0.0, envMapIntensity: .26
  });
  const woodLight = new THREE.MeshStandardMaterial({
    color: 0xa48c70, map: woodLightMap, bumpMap: woodLightMap, bumpScale: .009,
    roughness: .84, metalness: 0.0, envMapIntensity: .28
  });
  const woodDark = new THREE.MeshStandardMaterial({
    color: 0x6d5b49, map: woodMap, bumpMap: woodMap, bumpScale: .011,
    roughness: .91, metalness: 0.0, envMapIntensity: .20
  });
  const osb = new THREE.MeshStandardMaterial({
    color: 0xa08e74, map: osbMap, bumpMap: osbMap, bumpScale: .012,
    roughness: .90, metalness: 0.0, envMapIntensity: .22
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x77736d, map: concreteMap, bumpMap: concreteMap, bumpScale: .006,
    roughness: .78, metalness: 0.0, envMapIntensity: .24
  });
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x2d2b28, roughness: .98, metalness: 0.0, envMapIntensity: .08
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x25272a, map: roofMap, bumpMap: roofMap, bumpScale: .004,
    roughness: .95, metalness: .02, envMapIntensity: .12
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x474b4c, roughness: .62, metalness: .58, envMapIntensity: .34
  });
  const wetConcrete = new THREE.MeshPhysicalMaterial({
    color: 0x585652, map: concreteMap, bumpMap: concreteMap, bumpScale: .004,
    roughness: .24, metalness: 0.0, clearcoat: .52, clearcoatRoughness: .14,
    envMapIntensity: .52
  });
  const dampConcrete = new THREE.MeshPhysicalMaterial({
    color: 0x67635d, map: concreteMap, bumpMap: concreteMap, bumpScale: .005,
    roughness: .46, metalness: 0.0, clearcoat: .22, clearcoatRoughness: .26,
    envMapIntensity: .34
  });

  // Tiny edge bevels matter a lot in bodycam lighting. Real lumber never has infinitely sharp edges.
  wood.userData.edgeRadius = .006;
  woodLight.userData.edgeRadius = .006;
  woodDark.userData.edgeRadius = .005;
  steel.userData.edgeRadius = .004;

  const concreteWall = new THREE.MeshStandardMaterial({
    color: 0x6f6b65,
    map: concreteMap,
    bumpMap: concreteMap,
    bumpScale: .009,
    roughness: .88,
    metalness: 0,
    envMapIntensity: .20
  });

  const targetSteel = new THREE.MeshStandardMaterial({
    color: 0x45484a,
    roughness: .44,
    metalness: .76,
    envMapIntensity: .52
  });
  targetSteel.userData.edgeRadius = .003;

  const targetEdge = new THREE.MeshStandardMaterial({
    color: 0x1c1e20,
    roughness: .68,
    metalness: .46,
    envMapIntensity: .24
  });

  // One continuous slab: walls sit INTO it, instead of floating beside it.
  box(root, [7.4, 0.12, 14.0], [0, -0.06, -3.1], floorMat);

  // A5 wetness is deliberately broken into irregular lanes instead of turning the
  // entire floor into a mirror. Thin overlapping patches hide the rectangular base.
  const wetPatches: Array<[number,number,number,number,number]> = [
    [-1.62,-.002, 1.42, 2.15,.10], [1.34,-.001,.20,1.65,-.16],
    [-.48,-.001,-2.62,2.45,.06], [1.70,-.001,-4.42,1.58,.20],
    [-1.82,-.001,-5.72,1.42,-.13], [.32,-.001,-7.36,2.18,.14],
    [1.56,-.001,-8.84,1.16,-.18]
  ];
  wetPatches.forEach(([x,y,z,w,r],i) => {
    const g = new THREE.CircleGeometry(w * .58, 20);
    g.scale(1, .42 + (i%3)*.08, 1);
    g.rotateX(-Math.PI/2);
    const m = new THREE.Mesh(g, i%3===0 ? dampConcrete : wetConcrete);
    m.position.set(x,y,z);
    m.rotation.y=r;
    m.receiveShadow=true;
    root.add(m);
  });

  // Floor edge / wall transition cheat: sill plates overlap both surfaces.
  box(root, [0.15, 0.11, 13.5], [-3.23, 0.055, -3.1], woodDark);
  box(root, [0.15, 0.11, 13.5], [ 3.23, 0.055, -3.1], woodDark);

  // Panel walls with a shallow structural cavity.
  for (const side of [-1, 1]) {
    const x = side * 3.30;
    box(root, [0.11, 2.72, 4.35], [x, 1.42,  0.82], osb, [0, 0, side * 0.002]);
    box(root, [0.11, 2.72, 4.25], [x, 1.42, -3.72], osb, [0, 0, side * -0.003]);
    box(root, [0.11, 2.72, 4.00], [x, 1.42, -8.00], osb, [0, 0, side * 0.0025]);

    // top + bottom plates make the wall read as assembled construction.
    box(root, [0.18, 0.10, 13.45], [x - side * 0.055, 2.80, -3.15], woodLight);
    box(root, [0.18, 0.10, 13.45], [x - side * 0.055, 0.10, -3.15], woodLight);

    // Visible studs with non-perfect spacing and doubled door framing.
    const zs = [2.75, 1.85, 0.95, 0.02, -1.05, -2.03, -3.15, -4.18, -5.08, -6.18, -7.15, -8.18, -9.15];
    zs.forEach((z, i) => {
      const lean = ((i % 4) - 1.5) * 0.0017 * side;
      const depth = 0.135 + (i % 3) * 0.007;
      box(root, [0.105, 2.56 + (i % 2) * 0.015, depth], [x - side * 0.12, 1.43, z], i % 5 === 0 ? woodLight : wood, [lean, 0, lean * 0.6]);
    });
  }

  // Door opening that is actually framed: jack studs + doubled header.
  for (const side of [-1, 1]) {
    const x = side * 3.16;
    box(root, [0.12, 2.23, 0.15], [x, 1.215, -1.55], woodDark);
    box(root, [0.12, 2.23, 0.15], [x, 1.215, -2.53], woodDark);
    box(root, [0.15, 0.19, 1.16], [x, 2.38, -2.04], woodLight);
    box(root, [0.15, 0.13, 1.16], [x, 2.56, -2.04], wood);
  }

  // A7 heavy concrete structure: these are the dominant masses from the BODYCAM target.
  // Existing wood framing remains as secondary construction instead of reading as the whole building.
  const pillars: Array<[number, number, number]> = [
    [-2.64, 1.45, 1.42], [2.62, 1.45, -0.70], [-2.63, 1.45, -4.82], [2.64, 1.45, -7.44]
  ];
  pillars.forEach(([x,y,z],i)=>{
    const p = new THREE.Group();
    p.position.set(x,y,z);
    p.rotation.z = (i%2?1:-1)*THREE.MathUtils.degToRad(.18);
    root.add(p);
    box(p,[.52,2.90,.50],[0,0,0],concreteWall);
    box(p,[.58,.12,.56],[0,-1.39,0],concreteWall);
    box(p,[.58,.13,.56],[0,1.39,0],concreteWall);
    box(p,[.12,1.72,.515],[.205,-.16,0], i%2 ? woodDark : steel);
  });

  // Heavy cross-beams create the layered industrial ceiling depth visible in the reference.
  for (const [z,xoff] of [[1.42,0],[-.70,.03],[-4.82,-.02],[-7.44,.02]] as Array<[number,number]>) {
    box(root,[5.82,.38,.46],[xoff,2.72,z],concreteWall);
  }

  // Industrial depth layer: stairs, landing and rails create overlapping silhouettes
  // like the reference rather than a single corridor vanishing point.
  const stairRoot = new THREE.Group();
  stairRoot.position.set(2.28,0,-5.05);
  stairRoot.rotation.y = -.08;
  root.add(stairRoot);
  for(let i=0;i<8;i++){
    const y=.11+i*.17, z=-i*.30;
    box(stairRoot,[1.02,.09,.38],[0,y,z], i%3===0 ? steel : concreteWall);
  }
  box(stairRoot,[1.16,.11,1.28],[0,1.43,-2.30],steel);
  for(const x of [-.52,.52]){
    box(stairRoot,[.045,1.18,.045],[x,1.82,-2.28],steel);
    box(stairRoot,[.045,.045,2.85],[x,2.36,-1.20],steel,[.37,0,0]);
  }
  box(stairRoot,[1.12,.045,.045],[0,2.36,-2.30],steel);

  // Open ceiling structure: beams, joists, gaps, and partial dark panels.
  const ceilingY = 2.96;
  const beamZ = [2.2, 0.25, -1.75, -3.82, -5.86, -7.92];
  beamZ.forEach((z, i) => {
    box(root, [6.70, 0.16, 0.16], [(i % 2 ? 0.018 : -0.014), ceilingY, z], woodDark, [0, 0, (i % 3 - 1) * 0.0018]);
    box(root, [0.14, 0.10, 1.85], [-2.08, ceilingY + 0.10, z - 0.92], wood, [0, (i % 2 ? 0.006 : -0.005), 0]);
    box(root, [0.14, 0.10, 1.85], [ 2.03, ceilingY + 0.09, z - 0.88], woodLight, [0, (i % 2 ? -0.004 : 0.006), 0]);
  });

  // Partial roof sheets so the ceiling never becomes one giant black rectangle.
  const roofPanels: Array<[number, number, number, number]> = [
    [-1.70, 3.10,  1.15, -0.006],
    [ 1.73, 3.115, -0.65, 0.004],
    [-1.67, 3.105, -3.55, 0.007],
    [ 1.70, 3.12, -6.62, -0.005]
  ];
  roofPanels.forEach(([x, y, z, rz], i) => {
    box(root, [3.10, 0.07, 2.35], [x, y, z], roofMat, [0, 0, rz + i * 0.0006]);
  });

  // Hanging conduit and junction hardware: small-scale detail prevents the ceiling
  // from reading as a collection of oversized blocks.
  const conduitMat = new THREE.MeshStandardMaterial({color:0x35383a,roughness:.54,metalness:.66});
  for(const x of [-2.48,-1.18,1.26,2.42]){
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,9.6,10),conduitMat);
    pipe.rotation.x=Math.PI/2;
    pipe.position.set(x,2.73,-3.35);
    root.add(pipe);
  }
  for(const z of [1.18,-2.72,-6.55]){
    box(root,[.28,.16,.08],[-2.47,2.68,z],steel);
    box(root,[.28,.16,.08],[ 1.27,2.68,z],steel);
  }

  // Cross-bracing and imperfect utility details break the generated-maze look.
  box(root, [0.08, 0.08, 4.2], [-3.00, 1.52, -5.2], woodDark, [0.38, 0, 0]);
  box(root, [0.08, 0.08, 4.0], [ 3.00, 1.45, -0.9], woodDark, [-0.34, 0, 0]);
  box(root, [0.035, 0.035, 10.2], [-3.05, 2.30, -3.5], steel, [0, 0, 0.018]);

  // Wall panel seams / floor scuff strips give the eye scale anchors.
  for (const z of [2.95, -1.42, -5.73, -9.47]) {
    box(root, [0.018, 2.50, 0.022], [-3.345, 1.42, z], seamMat);
    box(root, [0.018, 2.50, 0.022], [ 3.345, 1.42, z], seamMat);
  }
  box(root, [5.4, 0.012, 0.075], [0.3, 0.008, -4.82], seamMat, [0, 0.03, 0]);
  box(root, [3.7, 0.012, 0.06], [-0.8, 0.009, -7.32], seamMat, [0, -0.045, 0]);

  // Authored fluorescent practicals: dark housing, clips and recessed diffuser.
  // This keeps the lamp from reading as a floating white card in the Quest capture.
  const housingMat = new THREE.MeshStandardMaterial({
    color:0x515659, roughness:.54, metalness:.66, envMapIntensity:.36
  });
  const diffuserMat = new THREE.MeshStandardMaterial({
    color:0xe4ebec, emissive:0xd9f4ff, emissiveIntensity:1.18, roughness:.78, metalness:0
  });
  for (const z of [0.85, -3.15, -7.10]) {
    box(root,[.28,.075,1.72],[0,2.835,z],housingMat);
    box(root,[.205,.024,1.48],[0,2.785,z],diffuserMat);
    box(root,[.30,.10,.065],[0,2.82,z-.82],housingMat);
    box(root,[.30,.10,.065],[0,2.82,z+.82],housingMat);
    box(root,[.035,.11,1.56],[-.14,2.83,z],housingMat);
    box(root,[.035,.11,1.56],[ .14,2.83,z],housingMat);
  }

  // Restrained warm practicals exist as fixtures instead of unexplained orange fill.
  const warmFixture = new THREE.MeshStandardMaterial({
    color:0x3a3028, emissive:0xffb875, emissiveIntensity:.72, roughness:.70, metalness:.18
  });
  for (const [x,z] of [[-3.17,-1.02],[3.17,-5.08],[-3.17,-8.60]] as Array<[number,number]>) {
    box(root,[.10,.26,.22],[x,1.46,z],housingMat);
    box(root,[.018,.13,.13],[x + (x<0?.058:-.058),1.46,z],warmFixture);
  }

  // A6 action lane: chipped construction forms and human-silhouette steel,
  // replacing the obvious box/cylinder/torus read from earlier passes.
  box(root, [6.20, 2.85, 0.22], [0, 1.42, -10.05], concreteWall);

  const barriers: Array<[number,number,number,number,number,number]> = [
    [-1.35,.36,-4.25,1.55,.72,.42],
    [ 1.55,.24,-6.10,1.15,.48,.36],
    [-1.75,.525,-8.00,.84,1.05,.34]
  ];
  barriers.forEach(([x,y,z,w,h,d],i)=>{
    const mesh = new THREE.Mesh(makeBatteredBarrier(w,h,d,300+i),concreteWall);
    mesh.position.set(x,y,z);
    mesh.rotation.y=[.08,-.12,.04][i];
    mesh.castShadow=true; mesh.receiveShadow=true;
    root.add(mesh);
  });

  const targetGeo = makeSilhouetteTarget();
  const targets: Array<[number,number,number,number]> = [
    [-1.85,1.35,-7.25,-.08],
    [ 1.62,1.82,-7.90, .09],
    [-.35,1.10,-8.78,-.03],
    [ 2.12,1.20,-9.52, .05],
    [-2.20,2.10,-9.35,-.06]
  ];

  targets.forEach(([x,y,z,ry],i)=>{
    const group=new THREE.Group();
    group.position.set(x,y,z);
    group.rotation.y=ry;

    const plate=new THREE.Mesh(targetGeo.clone(),targetSteel);
    plate.castShadow=true;
    plate.receiveShadow=true;
    group.add(plate);

    const backPlate=new THREE.Mesh(
      makeBatteredBarrier(.30,.055,.055,340+i),
      targetEdge
    );
    backPlate.position.set(0,.41,-.045);
    group.add(backPlate);

    const hanger=new THREE.Mesh(
      new RoundedBoxGeometry(.040,.56,.040,2,.004),
      targetEdge
    );
    hanger.position.set(0,.64,-.025);
    hanger.castShadow=true;
    group.add(hanger);

    const top=new THREE.Mesh(
      new RoundedBoxGeometry(.38,.040,.040,2,.004),
      targetEdge
    );
    top.position.set(0,.91,-.025);
    group.add(top);

    root.add(group);
  });

  // One angled overhead beam gives a real visual cue for dive-under / trick-shot lines.
  box(root,[2.8,.10,.12],[1.45,2.25,-5.35],woodDark,[0,0,THREE.MathUtils.degToRad(-7)]);

  addLivedInDetail(root,maxAniso,concreteWall,woodDark,steel);

  // Quest-safe fake reflection streaks. They only reinforce practicals on wet patches;
  // they do not pretend to be full planar reflections.
  const makeStreak = (warm=false) => {
    const c=document.createElement('canvas'); c.width=64; c.height=256;
    const cx=c.getContext('2d')!;
    const g=cx.createLinearGradient(0,0,0,256);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.20,warm?'rgba(255,186,118,.16)':'rgba(220,246,255,.18)');
    g.addColorStop(.50,warm?'rgba(255,205,146,.42)':'rgba(236,251,255,.46)');
    g.addColorStop(.80,warm?'rgba(255,186,118,.12)':'rgba(220,246,255,.14)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    cx.fillStyle=g; cx.fillRect(0,0,64,256);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
  };
  const coolStreakMat = new THREE.MeshBasicMaterial({
    map:makeStreak(false),transparent:true,opacity:.72,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  const warmStreakMat = new THREE.MeshBasicMaterial({
    map:makeStreak(true),transparent:true,opacity:.58,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  for(const [x,z,w,l,rz] of [
    [0,.82,.42,2.7,.02],[-.18,-3.12,.48,3.0,-.03],[.12,-7.05,.44,2.8,.04],
    [2.00,-5.02,.28,1.35,-.18],[-2.05,-1.00,.25,1.10,.14]
  ] as Array<[number,number,number,number,number]>){
    const q=new THREE.Mesh(new THREE.PlaneGeometry(w,l), Math.abs(x)>1 ? warmStreakMat : coolStreakMat);
    q.rotation.x=-Math.PI/2; q.rotation.z=rz; q.position.set(x,.011,z);
    root.add(q);
  }

  // Very subtle translucent air cards under the main fluorescents.
  const hazeTex=makeDustTexture();
  const hazeMat=new THREE.MeshBasicMaterial({
    map:hazeTex,color:0xd9e7e8,transparent:true,opacity:.035,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide
  });
  for(const z of [.85,-3.15,-7.10]){
    for(const r of [0,Math.PI/2]){
      const h=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.35),hazeMat);
      h.position.set(0,1.52,z); h.rotation.y=r; root.add(h);
    }
  }

  return root;
}

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;
  const boot = document.getElementById('boot');
  const world = await World.create(container, projectOptions);

  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  world.renderer.toneMappingExposure = 1.28;
  world.renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0xe3ecee, 0x51463d, 0.78);
  world.createTransformEntity(hemi, { persistent: true });

  const key = new THREE.DirectionalLight(0xf1f5f5, 1.12);
  key.position.set(-1.8, 7.0, 1.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 32;
  key.shadow.normalBias = 0.025;
  world.createTransformEntity(key, { persistent: true });

  const maxAniso = Math.min(8, world.renderer.capabilities.getMaxAnisotropy());
  const hall = buildHeroHall(maxAniso);
  const hallEntity = world.createTransformEntity(hall);
  hallEntity.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

  // A6: practical-driven lighting. Each fluorescent has a downward source plus a
  // weaker omnidirectional fill, so the room is shaped by fixtures rather than a global cheat.
  for (const z of [0.85, -3.15, -7.10]) {
    const target = new THREE.Object3D();
    target.position.set(0,.05,z-.12);
    world.createTransformEntity(target,{persistent:true});

    const down = new THREE.SpotLight(0xe8f7fb, 11.8, 7.6, Math.PI/3.15, .62, 1.35);
    down.position.set(0,2.74,z);
    down.target = target;
    down.castShadow = false;
    world.createTransformEntity(down,{persistent:true});

    const spill = new THREE.PointLight(0xdce9ec,1.28,5.1,1.72);
    spill.position.set(0,2.48,z);
    spill.castShadow=false;
    world.createTransformEntity(spill,{persistent:true});
  }

  const warmSources: Array<[number,number]> = [[-3.08,-1.02],[3.08,-5.08],[-3.08,-8.60]];
  warmSources.forEach(([x,z])=>{
    const warm = new THREE.PointLight(0xffc18a,.34,2.7,2.0);
    warm.position.set(x,1.46,z);
    warm.castShadow=false;
    world.createTransformEntity(warm,{persistent:true});
  });

  // Very low far-lane lift prevents Quest black crush without flattening the room.
  const farLift = new THREE.PointLight(0xc8d5d6,.62,6.3,1.7);
  farLift.position.set(0,1.2,-8.8);
  farLift.castShadow=false;
  world.createTransformEntity(farLift,{persistent:true});

  const nativeXR = Boolean(navigator.xr);
  if (boot) boot.textContent = nativeXR
    ? 'NEXUS IWSDK A7 · QUEST REFERENCE MATCH · WET LIGHT'
    : 'NEXUS A7 · WEBXR NOT AVAILABLE';

  world.renderer.xr.addEventListener('sessionstart', () => {
    if (boot) boot.textContent = 'NEXUS A7 · VR LIVE · REFERENCE MATCH';
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    if (boot) boot.textContent = 'NEXUS A7 · VR EXITED · READY TO RE-ENTER';
  });
}

main().catch((error) => {
  console.error(error);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'NEXUS IWSDK ERROR · ' + String(error?.message ?? error);
});
