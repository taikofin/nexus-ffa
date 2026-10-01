import { EnvironmentType, LocomotionEnvironment, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

declare global {
  interface Window { __NEXUS_IWSDK_BUILD?: string; }
}

const BUILD = 'iwsdk-a13-map-finish-pass';
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
    color:0xc7cecc,
    size:.028,
    transparent:true,
    opacity:.055,
    depthWrite:false,
    blending:THREE.NormalBlending,
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


function addMapFinishPass(
  root: THREE.Group,
  concreteWall: THREE.Material,
  woodDark: THREE.Material,
  steel: THREE.Material,
) {
  const shutterMat = new THREE.MeshStandardMaterial({
    color: 0x55595b, roughness: .63, metalness: .58, envMapIntensity: .30
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x292d2f, roughness: .72, metalness: .46, envMapIntensity: .22
  });
  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x5e493b, roughness: .88, metalness: .34, envMapIntensity: .18
  });
  const bagMat = new THREE.MeshStandardMaterial({
    color: 0x17191a, roughness: .96, metalness: 0, envMapIntensity: .08
  });

  // Far loading bay: a real destination instead of a flat cap.
  box(root,[2.72,2.18,.055],[.56,1.14,-9.918],shutterMat);
  for(let i=0;i<11;i++) box(root,[2.68,.016,.026],[.56,.22+i*.18,-9.882],frameMat);
  box(root,[.12,2.36,.15],[-.84,1.18,-9.87],frameMat);
  box(root,[.12,2.36,.15],[1.96,1.18,-9.87],frameMat);
  box(root,[2.92,.14,.16],[.56,2.34,-9.87],frameMat);

  // Offset personnel door breaks the centered/symmetrical end wall.
  box(root,[.92,2.02,.050],[-2.16,1.05,-9.902],woodDark);
  box(root,[1.04,.09,.11],[-2.16,2.10,-9.84],steel);
  box(root,[.08,2.10,.11],[-2.66,1.05,-9.84],steel);
  box(root,[.08,2.10,.11],[-1.66,1.05,-9.84],steel);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.16,8),steel);
  handle.rotation.x=Math.PI/2;
  handle.position.set(-1.83,1.03,-9.79);
  handle.castShadow=true;
  root.add(handle);

  // Left maintenance cage creates a side destination and breaks the corridor silhouette.
  const cagePosts: Array<[number,number]> = [
    [-2.98,-4.52],[-2.02,-4.52],[-2.98,-6.28],[-2.02,-6.28]
  ];
  for(const [x,z] of cagePosts) box(root,[.055,2.24,.055],[x,1.12,z],steel);
  for(const y of [.72,1.42,2.20]){
    box(root,[.055,.045,1.76],[-2.98,y,-5.40],steel);
    box(root,[.055,.045,1.76],[-2.02,y,-5.40],steel);
  }
  for(const z of [-4.52,-6.28]){
    box(root,[.96,.045,.055],[-2.50,2.20,z],steel);
    box(root,[.96,.045,.055],[-2.50,.72,z],steel);
  }
  box(root,[.86,.065,.52],[-2.50,.58,-5.72],woodDark);
  box(root,[.86,.065,.52],[-2.50,1.14,-5.72],woodDark);
  box(root,[.10,1.18,.10],[-2.86,.63,-5.72],frameMat);
  box(root,[.10,1.18,.10],[-2.14,.63,-5.72],frameMat);

  // Pallet and scrap lumber give readable real-world scale.
  for(let i=0;i<5;i++){
    box(root,[1.08,.060,.13],[-2.35,.10+i*.065,-3.55+i*.035],woodDark,[0,.11+(i-2)*.008,0]);
  }
  for(const x of [-2.76,-2.34,-1.94]){
    box(root,[.10,.30,.72],[x,.16,-3.54],woodDark,[0,.11,0]);
  }

  // Right-side maintenance clutter.
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.29,.30,.72,12),rustMat);
  barrel.position.set(2.42,.36,-4.82);
  barrel.rotation.z=.018;
  barrel.castShadow=true;
  barrel.receiveShadow=true;
  root.add(barrel);
  for(const y of [.12,.36,.60]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.295,.012,6,16),frameMat);
    ring.rotation.x=Math.PI/2;
    ring.position.set(2.42,y,-4.82);
    ring.castShadow=true;
    root.add(ring);
  }

  const bagPositions: Array<[number,number,number,number,number]> = [
    [2.77,.22,-5.26,.88,1.08],[2.58,.19,-5.48,1.04,.82],[2.89,.17,-4.98,.76,.94]
  ];
  bagPositions.forEach(([x,y,z,sx,sz],i)=>{
    const bag=new THREE.Mesh(new THREE.DodecahedronGeometry(.25+(i===1?.025:0),0),bagMat);
    bag.scale.set(sx,1.18,sz);
    bag.position.set(x,y,z);
    bag.rotation.set(.12*i,.42*i,.10*(i-1));
    bag.castShadow=true;
    bag.receiveShadow=true;
    root.add(bag);
  });

  // Cable spool gives the mid-lane a circular silhouette.
  const spool=new THREE.Group();
  spool.position.set(1.92,.34,-6.46);
  spool.rotation.y=-.18;
  root.add(spool);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.46,12),woodDark);
  core.rotation.z=Math.PI/2;
  core.castShadow=true;
  core.receiveShadow=true;
  spool.add(core);
  for(const x of [-.25,.25]){
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.055,12),woodDark);
    disc.rotation.z=Math.PI/2;
    disc.position.x=x;
    disc.castShadow=true;
    disc.receiveShadow=true;
    spool.add(disc);
  }
  const wound=new THREE.Mesh(new THREE.TorusGeometry(.235,.075,8,18),frameMat);
  wound.rotation.y=Math.PI/2;
  spool.add(wound);

  // Interrupted work: dropped pipe + hanging cable.
  const droppedPipe=new THREE.Mesh(new THREE.CylinderGeometry(.028,.030,1.55,8),steel);
  droppedPipe.rotation.x=Math.PI/2;
  droppedPipe.rotation.z=.05;
  droppedPipe.position.set(1.66,.065,-7.16);
  droppedPipe.castShadow=true;
  droppedPipe.receiveShadow=true;
  root.add(droppedPipe);

  const hangingCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.15,2.91,-1.95),
    new THREE.Vector3(-1.10,2.62,-2.18),
    new THREE.Vector3(-1.28,2.20,-2.36),
    new THREE.Vector3(-1.08,1.78,-2.50),
  ]);
  const hangingCable=new THREE.Mesh(
    new THREE.TubeGeometry(hangingCurve,18,.013,6,false),
    frameMat
  );
  hangingCable.castShadow=true;
  root.add(hangingCable);

  const curb=new THREE.Mesh(makeBatteredBarrier(.92,.34,.42,512),concreteWall);
  curb.position.set(-1.72,.17,.74);
  curb.rotation.y=.16;
  curb.castShadow=true;
  curb.receiveShadow=true;
  root.add(curb);
}

function addAuthoredGraffiti(root: THREE.Group, maxAniso: number) {
  const loader = new THREE.TextureLoader();
  const urls = [
    './assets/graffiti/tag0.svg',
    './assets/graffiti/tag1.svg',
    './assets/graffiti/tag2.svg',
    './assets/graffiti/tag3.svg',
  ];
  const textures = urls.map((url) => {
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    return tex;
  });

  const makeMat = (index: number, opacity: number) => new THREE.MeshStandardMaterial({
    map: textures[index],
    color: 0xd8d2c7,
    transparent: true,
    opacity,
    alphaTest: .035,
    depthWrite: false,
    roughness: .96,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
  });

  // Sparse, site-specific tags. None are tiled; each one is its own authored mark.
  // They sit slightly proud of the surface to avoid z-fighting in Quest.
  const sideTags: Array<[number,number,number,number,number,number,number]> = [
    [-3.361,1.52, .15, 1.04,.72, 0, .48],
    [ 3.361,1.34,-2.72, .88,.66, 1, .38],
    [-3.361,1.68,-5.88, .82,.58, 3, .28],
  ];
  sideTags.forEach(([x,y,z,w,h,idx,opacity],i)=>{
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h), makeMat(idx,opacity));
    mesh.position.set(x,y,z);
    mesh.rotation.y = x < 0 ? Math.PI/2 : -Math.PI/2;
    mesh.rotation.z = [ .035, -.055, .025 ][i] ?? 0;
    mesh.renderOrder = 2;
    root.add(mesh);
  });

  // One far-lane tag gives the eye a scale cue without turning the arena into a graffiti gallery.
  const far = new THREE.Mesh(new THREE.PlaneGeometry(.76,.58), makeMat(2,.30));
  far.position.set(1.72,1.48,-9.932);
  far.rotation.z = -.018;
  far.renderOrder = 2;
  root.add(far);

  // Dirty overspray halos break the clean SVG edge just enough to sit inside the environment.
  const haloMat = new THREE.MeshBasicMaterial({
    color:0x211d19, transparent:true, opacity:.07, depthWrite:false, side:THREE.DoubleSide
  });
  for(const [x,y,z,w,h,rz] of [
    [-3.359,1.51,.15,1.16,.82,.035],
    [ 3.359,1.33,-2.72,.99,.75,-.055],
    [-3.359,1.68,-5.88,.92,.66,.025],
  ] as Array<[number,number,number,number,number,number]>){
    const g=new THREE.Mesh(new THREE.PlaneGeometry(w,h),haloMat);
    g.position.set(x + (x<0?.001:-.001),y,z);
    g.rotation.y=x<0?Math.PI/2:-Math.PI/2;
    g.rotation.z=rz;
    g.renderOrder=1;
    root.add(g);
  }
}


function makeMetal049Color(maxAniso: number) {
  const loader = new THREE.TextureLoader();
  const tex = loader.load('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgFBgcGBQgHBgcJCAgJDBMMDAsLDBgREg4THBgdHRsYGxofIywlHyEqIRobJjQnKi4vMTIxHiU2OjYwOiwwMTD/2wBDAQgJCQwKDBcMDBcwIBsgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDD/wgARCAIAAgADASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECBv/EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/aAAwDAQACEAMQAAAB72mQCWAFlgAABYAAAAhQLKASygAEAABSApACkAspAFhYBQABKCUAQBYAFEAAWAhQLBQSygCURRFgAWCyiAspALAspFEUAAAAACkAAIUCWCyiWABRKEoAAAAJQAlEqBYFAEAoAAAAAAABQQlEWApAUACUAAAAJYLKAAAWWACUAARYUAAAAAAAAAACUSglAAhSCygBKAASygAAABBSFAAAAAAAAIUAAAEoAJYVAsoBFCUAAAAAAAAARYKAAAAAAAEsAFQWWFAAAAikURYUAAAAAACWAFAABALKIpKEsoAAAIWAAAsFAAAAlhUpLKEoAAAAIUCXJQUACWAAFgWKSgSgACKQAACygAhQARRKCWCwUAAAgAAmoKCWFAgASgAoARQAABAAAAVKICygABKJYLBQAAJYAFCWFAlgsAAAEsosFAAABAAAAAAALKAASoWAsoAAspARYWBYFBFgWAACAUAVKASykKQAAAABKAAUBKJYALKAAAAIAACykBYAAEWCgsAFShAABFAACUJQAsoASiABQAAAARYAALBYAACUJQAABLKCkAlhZQBLKAAAAUEoQAFAAAAAlgABUAAAAAAAAACwAAAAAIoAAKAAQCygBKAEFIACCgKSwAAAAAAACFAAAASghUoAABQJYAAALAsAAACUACiAKQAAAAAAEoACkBKAEsoBZQAAlCWAAACwAAWWAACoAAAAICygABKAAAAAAEFsFBKAAAGVEoALKQAFgFgQUAAAAAAACBQAAAAASggUFAAAABFgASgFgALBZYSwUFlAAEmoAKEBFEsoSgpAEFSgCBQLKAFVBAgABLKAFhUBKCCgsoBKACwAJQgEFAAAAgAUCUAALKWABARYCksoAABKAEoAAALKALmiUQCUAAASoCgAAAAChZRAJYIpAVBQAQCykAsFAAAsFBKAEWAACwAJYLBQAAAAVKUgAlhALABUoIWWAACygpAAAUhSFQACFAAAgAUhUFAAAsoAAlhFEKQCwUgWACgKQAAAACykAAlhQACAACykqFAABUFABFCWEURRKCUJRCgAAApAAALKRYFgQUhUFgWWACwWABUFABUFgWKQAABKS2ApFEUQACykABYoBFgIAAAAWWAAhVgAKAALAWAAAABRAKBKQABQSgEUSglCAlEAsolhZYAAAACkoAWABYABYAUCAKJRKhUAFQKBKEFQWABALKEoIWUQAAACgAAAAAsAAoBAUAhUpKgABSCygEAAAIAUhUFIAFgWCgAAAAAAAsAAACyiUAJYAFhZRLKCAAAAEBYCygEKAAAAAAAALAAAABZRKAAAACAoEoBFgAABCkUAAAAKCUJRFgsACwFgAAAAsFiksoKQAAgWABRFgAAAAKQpAAf/xAAUEAEAAAAAAAAAAAAAAAAAAADA/9oACAEBAAEFAgAH/8QAFBEBAAAAAAAAAAAAAAAAAAAAoP/aAAgBAwEBPwEAH//EABQRAQAAAAAAAAAAAAAAAAAAAKD/2gAIAQIBAT8BAB//xAAUEAEAAAAAAAAAAAAAAAAAAADA/9oACAEBAAY/AgAH/8QAHhABAAEDBQEAAAAAAAAAAAAAAWBBUIAAIEBwkDD/2gAIAQEAAT8hiTsZ47SAHjUS8u1OS+G7EnDpwGp0BT6OBhAaQFyYpz3Rf2AN+IAdJ0izgs2r/9oADAMBAAIAAwAAABCMNf8AX/7/AH81w9z6w/8Asv8AjbH7LbPL/wB28x650w/5z8y09x/5wy6089/9636/7488w/77326wx81w17844x6478w2598w/wCMMsP/AP8A/wD2tPfv8MNMMNdtetdcMMtMcvcMNN//AP8A9+5w040wxx6w2yw6w0567xwwwwww/wDu/tMMOMNc+sPNMtOMMNMP+veMMMMN89ePcdcMMOtvPcNff98MNf8ADXr7rbjrDDnvL/XvHDDDXLrLrHX/ABw13wx/64124yw12/7/AMsMccvONe8Nd8ff/eNdNu+deMfMMsPP/wD/AC3/AO8Mte8f/wD3vzXDHvzDDjv3XzjzD/j3/wD+485249+6y933w99zw381yw6+6www0+8/021z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');
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.7, 3.1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}


function makeClothMap(maxAniso: number) {
  return makeCanvasTexture(256,(ctx,size)=>{
    ctx.fillStyle='#17191b';
    ctx.fillRect(0,0,size,size);
    for(let i=-size;i<size*2;i+=6){
      ctx.strokeStyle='rgba(160,165,166,.035)';
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+size,size); ctx.stroke();
    }
    for(let i=-size;i<size*2;i+=9){
      ctx.strokeStyle='rgba(0,0,0,.055)';
      ctx.beginPath(); ctx.moveTo(i,size); ctx.lineTo(i+size,0); ctx.stroke();
    }
    for(let i=0;i<360;i++){
      const x=hashNoise(i,71,2)*size, y=hashNoise(i,73,5)*size;
      const a=.015+hashNoise(i,79,9)*.035;
      ctx.fillStyle=`rgba(220,225,226,${a})`;
      ctx.fillRect(x,y,1+hashNoise(i,83,4)*2,1);
    }
  },maxAniso,3.2,4.4);
}

function makeTorsoGeometry() {
  const sh=new THREE.Shape();
  sh.moveTo(-.24,-.43);
  sh.lineTo(.24,-.43);
  sh.lineTo(.30,-.18);
  sh.lineTo(.31,.16);
  sh.lineTo(.27,.33);
  sh.lineTo(.18,.43);
  sh.lineTo(-.18,.43);
  sh.lineTo(-.27,.33);
  sh.lineTo(-.31,.16);
  sh.lineTo(-.30,-.18);
  sh.closePath();
  const g=new THREE.ExtrudeGeometry(sh,{
    depth:.22,bevelEnabled:true,bevelSegments:2,bevelSize:.028,bevelThickness:.024,curveSegments:2
  });
  g.center();
  return g;
}

function makeBodyPresence(maxAniso:number){
  const root=new THREE.Group();
  root.name='NEXUS_BODY_PROXY';

  const cloth=makeClothMap(maxAniso);
  const wetCloth=new THREE.MeshPhysicalMaterial({
    color:0x17191b,map:cloth,bumpMap:cloth,bumpScale:.006,
    roughness:.68,metalness:.02,clearcoat:.16,clearcoatRoughness:.34,
    envMapIntensity:.28
  });
  const strapMat=new THREE.MeshStandardMaterial({
    color:0x0b0c0d,roughness:.76,metalness:.16,envMapIntensity:.18
  });

  const torso=new THREE.Mesh(makeTorsoGeometry(),wetCloth);
  torso.castShadow=true; torso.receiveShadow=true;
  root.add(torso);

  // Asymmetric harness lines stop the body from reading as a single generated shell.
  const strapA=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.20,.34,.125),
    new THREE.Vector3(-.08,.08,.128),
    new THREE.Vector3(.05,-.18,.128),
    new THREE.Vector3(.13,-.39,.126),
  ]);
  const strapB=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.20,.34,.127),
    new THREE.Vector3(.11,.12,.130),
    new THREE.Vector3(.03,-.06,.130),
  ]);
  for(const curve of [strapA,strapB]){
    const m=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.018,6,false),strapMat);
    m.castShadow=true; root.add(m);
  }

  // Soft shoulder masses are custom low-poly cloth shells, positioned well below the camera.
  const shoulderGeo=new THREE.SphereGeometry(.16,10,6);
  shoulderGeo.scale(1.45,.68,1.15);
  for(const x of [-.30,.30]){
    const m=new THREE.Mesh(shoulderGeo.clone(),wetCloth);
    m.position.set(x,.31,0);
    m.rotation.z=x<0?.12:-.12;
    m.castShadow=true; m.receiveShadow=true;
    root.add(m);
  }

  root.visible=false;
  return root;
}

function wrapPi(v:number){
  while(v>Math.PI)v-=Math.PI*2;
  while(v<-Math.PI)v+=Math.PI*2;
  return v;
}

function buildHeroHall(maxAniso: number) {
  const root = new THREE.Group();
  root.name = 'NEXUS_HERO_HALL_A13';

  const woodMap = makeWoodMap(maxAniso, false);
  const woodLightMap = makeWoodMap(maxAniso, true);
  const osbMap = makeOSBMap(maxAniso);
  const concreteMap = makeConcreteMap(maxAniso);
  const roofMap = makeRoofMap(maxAniso);
  const authoredMetal049 = makeMetal049Color(maxAniso);

  // BODYCAM palette: muted, dirty, rough. No saturated "VR demo" colors.
  const wood = new THREE.MeshStandardMaterial({
    color: 0x756b60, map: woodMap, bumpMap: woodMap, bumpScale: .010,
    roughness: .88, metalness: 0.0, envMapIntensity: .22
  });
  const woodLight = new THREE.MeshStandardMaterial({
    color: 0x8a7d6d, map: woodLightMap, bumpMap: woodLightMap, bumpScale: .009,
    roughness: .86, metalness: 0.0, envMapIntensity: .24
  });
  const woodDark = new THREE.MeshStandardMaterial({
    color: 0x514a43, map: woodMap, bumpMap: woodMap, bumpScale: .011,
    roughness: .93, metalness: 0.0, envMapIntensity: .17
  });
  const osb = new THREE.MeshStandardMaterial({
    color: 0x8c806f, map: osbMap, bumpMap: osbMap, bumpScale: .012,
    roughness: .92, metalness: 0.0, envMapIntensity: .18
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x77736d, map: concreteMap, bumpMap: concreteMap, bumpScale: .006,
    roughness: .78, metalness: 0.0, envMapIntensity: .24
  });
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0x2d2b28, roughness: .98, metalness: 0.0, envMapIntensity: .08
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x34373a, map: roofMap, bumpMap: roofMap, bumpScale: .004,
    roughness: .90, metalness: .05, envMapIntensity: .18
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0xc2c4c5, map: authoredMetal049,
    roughness: .46, metalness: .86, envMapIntensity: .52
  });
  const recessMat = new THREE.MeshStandardMaterial({
    color: 0x353738, roughness: .92, metalness: .05, envMapIntensity: .16
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
    color: 0xd0d1d1,
    map: authoredMetal049,
    roughness: .39,
    metalness: .90,
    envMapIntensity: .60
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

  // A9 structural rebuild: the side boundaries now read as concrete/steel bays with
  // dark recesses and selective plywood infill, not full-height OSB hallway walls.
  for (const side of [-1, 1]) {
    const backX = side * 3.46;
    const frontX = side * 3.20;

    // Deep dark backing preserves collision/closure while letting the visible face read as open bays.
    box(root,[.12,2.72,13.45],[backX,1.42,-3.15],recessMat);

    // Concrete curb and upper spandrel tie the bays together as one building.
    box(root,[.22,.48,13.45],[frontX,.24,-3.15],concreteWall);
    box(root,[.20,.42,13.45],[frontX,2.55,-3.15],concreteWall);

    const bayZ=[2.55,.85,-.85,-2.55,-4.25,-5.95,-7.65,-9.30];
    bayZ.forEach((z,i)=>{
      // Heavy pier.
      box(root,[.34,2.48,.34],[frontX,1.39,z],concreteWall,[0,0,((i%3)-1)*.0018]);

      // Steel scar/strap breaks the concrete and catches cool practical highlights.
      if(i%2===0) box(root,[.035,1.54,.36],[frontX-side*.185,1.36,z],steel,[0,0,.01*side]);

      // Only some bays get plywood; the rest stay visibly recessed/open.
      if([0,2,5,7].includes(i)){
        const panelZ=z-.72;
        const panelH=i===5?1.18:1.42;
        box(root,[.08,panelH,1.18],[frontX-side*.08,panelH*.5+.10,panelZ],osb,[0,.004*side,((i%2)?-.008:.006)]);
        box(root,[.095,.085,1.26],[frontX-side*.09,panelH+.13,panelZ],woodDark);
        for(const fz of [panelZ-.48,panelZ+.48]){
          box(root,[.10,panelH+.06,.08],[frontX-side*.095,panelH*.5+.10,fz],woodDark);
        }
      }

      // A couple low concrete infills make the construction non-repeating.
      if(i===3 || i===6){
        box(root,[.11,.78,1.05],[frontX-side*.07,.63,z-.68],concreteWall,[0,0,(i===3?.012:-.009)]);
      }
    });

    // Horizontal steel rails/pipes give continuous scale cues without becoming a solid wall.
    box(root,[.055,.055,12.4],[frontX-side*.19,1.96,-3.20],steel,[0,0,.006*side]);
    box(root,[.048,.048,10.8],[frontX-side*.20,1.18,-3.35],steel,[0,0,-.004*side]);
  }

  // One authored service-frame bay on each side; steel/concrete, not a perfect wood portal.
  for (const side of [-1, 1]) {
    const x = side * 3.02;
    box(root,[.16,2.12,.16],[x,1.16,-1.50],steel,[0,0,.006*side]);
    box(root,[.16,2.12,.16],[x,1.16,-2.55],steel,[0,0,-.005*side]);
    box(root,[.20,.22,1.25],[x,2.25,-2.02],concreteWall,[0,0,.004*side]);
    box(root,[.08,.08,1.02],[x-side*.10,2.09,-2.02],steel);
  }


  // A12 Quest reverse-angle rescue: visible construction depth on the dark side walls.
  // These are shallow authored layers that catch light and stop the wall becoming a black void.
  for (const side of [-1,1]) {
    const sx = side * 3.26;
    for (const [z,y,h,w] of [
      [1.55,1.12,1.38,.44],[-.15,1.55,.86,.36],[-2.10,.95,1.18,.52],
      [-4.10,1.40,.72,.40],[-6.15,1.08,1.46,.46],[-8.20,1.52,.78,.38]
    ] as Array<[number,number,number,number]>) {
      const panel = new THREE.Mesh(makeBatteredBarrier(w,h,.07,410+Math.round((z+10)*7)+(side>0?30:0)), concreteWall);
      panel.position.set(sx-side*.05,y,z);
      panel.rotation.y = side < 0 ? Math.PI/2 : -Math.PI/2;
      panel.rotation.z = ((Math.round((z+10)*3)%3)-1)*.012;
      panel.castShadow = true;
      panel.receiveShadow = true;
      root.add(panel);
    }

    // Round service pipes instead of more rectangular rails.
    for (const [y,z0,z1,r] of [
      [1.92,2.2,-8.9,.020],[1.18,1.2,-7.8,.016]
    ] as Array<[number,number,number,number]>) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx-side*.16,y,z0),
        new THREE.Vector3(sx-side*.17,y+.03,(z0+z1)*.50),
        new THREE.Vector3(sx-side*.15,y,z1),
      ]);
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(curve,28,r,7,false),
        steel
      );
      pipe.castShadow=true;
      pipe.receiveShadow=true;
      root.add(pipe);
    }
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
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.022,.024,1.18,8),steel);
    post.position.set(x,1.82,-2.28);
    post.castShadow=true; post.receiveShadow=true;
    stairRoot.add(post);

    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x,2.32,-2.33),
      new THREE.Vector3(x,2.05,-1.65),
      new THREE.Vector3(x,1.78,-.95),
      new THREE.Vector3(x,1.50,-.20),
    ]);
    const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve,20,.022,8,false),steel);
    rail.castShadow=true; rail.receiveShadow=true;
    stairRoot.add(rail);
  }
  const topRail = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.LineCurve3(new THREE.Vector3(-.52,2.36,-2.30),new THREE.Vector3(.52,2.36,-2.30)),
      1,.022,8,false
    ),steel
  );
  stairRoot.add(topRail);

  // Far upper catwalk: a strong second level visible from spawn like the BODYCAM target.
  const catwalk = new THREE.Group();
  catwalk.position.set(0,0,-8.82);
  root.add(catwalk);
  box(catwalk,[5.35,.14,1.12],[0,1.80,0],steel);
  box(catwalk,[5.42,.22,.18],[0,1.63,-.48],concreteWall);
  for(const x of [-2.52,-1.72,-.86,0,.86,1.72,2.52]){
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.020,.022,.78,8),steel);
    post.position.set(x,2.20,-.42);
    post.castShadow=true; post.receiveShadow=true;
    catwalk.add(post);
  }
  for(const y of [2.58,2.30]){
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.LineCurve3(new THREE.Vector3(-2.61,y,-.42),new THREE.Vector3(2.61,y,-.42)),
        1,.020,8,false
      ),steel
    );
    rail.castShadow=true; rail.receiveShadow=true;
    catwalk.add(rail);
  }
  // Occlusion breaks underneath so it reads as a built level, not a floating shelf.
  for(const x of [-2.05,-.70,.72,2.02]){
    box(catwalk,[.26,1.66,.30],[x,.86,.26],concreteWall,[0,0,(x>0?.003:-.003)]);
  }

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
  for (const [x,z] of [[-3.08,-1.02],[3.08,-5.08]] as Array<[number,number]>) {
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
  addMapFinishPass(root,concreteWall,woodDark,steel);
  addAuthoredGraffiti(root,maxAniso);

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
  world.renderer.toneMappingExposure = 1.34;
  world.renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0xe7eef0, 0x5d5146, 0.92);
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

  // Bodycam-safe body presence: the real XR camera stays 1:1 with the headset.
  // Only the visible torso settles behind fast head turns, producing camera-on-a-person inertia.
  const bodyPresence=makeBodyPresence(maxAniso);
  world.createTransformEntity(bodyPresence,{persistent:true});
  const headPos=new THREE.Vector3();
  const headQuat=new THREE.Quaternion();
  const headEuler=new THREE.Euler(0,0,0,'YXZ');
  const bodyOffset=new THREE.Vector3();
  let bodyYaw=0;
  let bodyRoll=0;
  let previousTargetYaw=0;
  let bodyInitialized=false;

  world.onXRFrame((_frame,delta)=>{
    const head=world.input.xr.xrOrigin.head;
    head.getWorldPosition(headPos);
    head.getWorldQuaternion(headQuat);
    headEuler.setFromQuaternion(headQuat,'YXZ');

    const targetYaw=headEuler.y;
    if(!bodyInitialized){
      bodyYaw=targetYaw;
      previousTargetYaw=targetYaw;
      bodyInitialized=true;
      bodyPresence.visible=true;
    }

    const dt=Math.min(Math.max(delta,1/120),.05);
    const yawError=wrapPi(targetYaw-bodyYaw);
    bodyYaw += yawError*(1-Math.exp(-7.2*dt));

    const turnDelta=wrapPi(targetYaw-previousTargetYaw);
    previousTargetYaw=targetYaw;
    const yawRate=turnDelta/dt;
    const targetRoll=THREE.MathUtils.clamp(-yawRate*.010,-.065,.065);
    bodyRoll += (targetRoll-bodyRoll)*(1-Math.exp(-10.5*dt));

    bodyOffset.set(0,-.94,.08);
    bodyOffset.applyAxisAngle(new THREE.Vector3(0,1,0),bodyYaw);
    bodyPresence.position.copy(headPos).add(bodyOffset);
    bodyPresence.rotation.set(0,bodyYaw,bodyRoll,'YXZ');
  });

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

  const warmSources: Array<[number,number]> = [[-3.02,-1.02],[3.02,-5.08]];
  warmSources.forEach(([x,z])=>{
    const warm = new THREE.PointLight(0xffc18a,.24,2.45,2.0);
    warm.position.set(x,1.46,z);
    warm.castShadow=false;
    world.createTransformEntity(warm,{persistent:true});
  });

  // Very low far-lane lift prevents Quest black crush without flattening the room.
  const farLift = new THREE.PointLight(0xc8d5d6,.62,6.3,1.7);
  farLift.position.set(0,1.2,-8.8);
  farLift.castShadow=false;
  world.createTransformEntity(farLift,{persistent:true});


  // Low-energy wall bounces tuned from the Quest reverse-angle capture.
  // They reveal construction without flattening the BODYCAM contrast.
  for (const [x,z] of [[-2.75,-1.0],[2.75,-2.8],[-2.75,-5.1],[2.75,-7.2]] as Array<[number,number]>) {
    const sideBounce = new THREE.PointLight(0xc9d4d6,.22,3.2,2.0);
    sideBounce.position.set(x,1.35,z);
    sideBounce.castShadow=false;
    world.createTransformEntity(sideBounce,{persistent:true});
  }

  const nativeXR = Boolean(navigator.xr);
  if (boot) boot.textContent = nativeXR
    ? 'NEXUS IWSDK A13 · MAP FINISH PASS'
    : 'NEXUS A13 · WEBXR NOT AVAILABLE';

  world.renderer.xr.addEventListener('sessionstart', () => {
    if (boot) boot.textContent = 'NEXUS A13 · VR LIVE · MAP CHECK';
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    bodyPresence.visible=false;
    bodyInitialized=false;
    if (boot) boot.textContent = 'NEXUS A13 · VR EXITED · READY TO RE-ENTER';
  });
}

main().catch((error) => {
  console.error(error);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'NEXUS IWSDK ERROR · ' + String(error?.message ?? error);
});
