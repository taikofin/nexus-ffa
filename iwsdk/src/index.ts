import { EnvironmentType, LocomotionEnvironment, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

declare global {
  interface Window { __NEXUS_IWSDK_BUILD?: string; }
}

const BUILD = 'iwsdk-a4-sensor-exposure';
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

function buildHeroHall(maxAniso: number) {
  const root = new THREE.Group();
  root.name = 'NEXUS_HERO_HALL_A4';

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
    color: 0x625f59, map: concreteMap, bumpMap: concreteMap, bumpScale: .006,
    roughness: .96, metalness: 0.0, envMapIntensity: .16
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

  // Tiny edge bevels matter a lot in bodycam lighting. Real lumber never has infinitely sharp edges.
  wood.userData.edgeRadius = .006;
  woodLight.userData.edgeRadius = .006;
  woodDark.userData.edgeRadius = .005;
  steel.userData.edgeRadius = .004;

  const concreteWall = new THREE.MeshStandardMaterial({
    color: 0x56534f,
    map: concreteMap,
    bumpMap: concreteMap,
    bumpScale: .007,
    roughness: .96,
    metalness: 0,
    envMapIntensity: .12
  });

  const targetSteel = new THREE.MeshStandardMaterial({
    color: 0x626568,
    roughness: .48,
    metalness: .72,
    envMapIntensity: .42
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

  // Timber pillars: thicker, layered, joined, and not laser-identical.
  const pillars: Array<[number, number, number]> = [
    [-2.82, 1.38, 1.45], [2.79, 1.39, -0.58], [-2.80, 1.40, -4.95], [2.83, 1.37, -7.55]
  ];
  pillars.forEach(([x, y, z], i) => {
    const p = new THREE.Group();
    p.position.set(x, y, z);
    p.rotation.z = (i % 2 ? 1 : -1) * THREE.MathUtils.degToRad(0.35 + i * 0.07);
    root.add(p);

    box(p, [0.22, 2.72, 0.19], [0, 0, 0], i % 2 ? wood : woodLight);
    box(p, [0.08, 2.34, 0.205], [0.145, -0.04, 0], woodDark);
    box(p, [0.34, 0.105, 0.29], [0, -1.31, 0], woodDark);
    box(p, [0.35, 0.11, 0.29], [0, 1.31, 0], woodLight);
    box(p, [0.28, 0.06, 0.225], [0, 0.26, 0.105], steel, [0.02, 0, 0]);
  });

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

  // Bright practical fixtures against the darker open ceiling.
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xdfe7e8,
    emissive: 0xf2fbff,
    emissiveIntensity: 2.2,
    roughness: 0.58,
  });
  for (const z of [0.85, -3.15, -7.10]) {
    box(root, [0.16, 0.055, 1.55], [0.0, 2.82, z], lightMat);
  }

  // A3 TRICK-SHOT ACTION LANE
  // The hallway is now a shooting/action set, not the purpose of the game.
  box(root, [6.20, 2.85, 0.22], [0, 1.42, -10.05], concreteWall);

  // Low cover / vault pieces for dives and camera movement.
  box(root, [1.55, 0.72, 0.42], [-1.35, .36, -4.25], concreteWall, [0, .08, 0]);
  box(root, [1.15, 0.48, 0.36], [ 1.55, .24, -6.10], concreteWall, [0,-.12, 0]);
  box(root, [0.84, 1.05, 0.34], [-1.75, .525,-8.00], concreteWall, [0,.04,0]);

  const targetGeo = new THREE.CylinderGeometry(.19,.19,.032,24);
  targetGeo.rotateX(Math.PI/2);
  const ringGeo = new THREE.TorusGeometry(.19,.012,8,24);

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

    const plate=new THREE.Mesh(targetGeo,targetSteel);
    plate.castShadow=true;
    plate.receiveShadow=true;
    group.add(plate);

    const rim=new THREE.Mesh(ringGeo,targetEdge);
    rim.position.z=.020;
    rim.castShadow=true;
    group.add(rim);

    const hanger=new THREE.Mesh(
      new RoundedBoxGeometry(.035,.58,.035,2,.004),
      targetEdge
    );
    hanger.position.y=.43;
    hanger.castShadow=true;
    group.add(hanger);

    const top=new THREE.Mesh(
      new RoundedBoxGeometry(.34,.035,.035,2,.004),
      targetEdge
    );
    top.position.set(0,.72,0);
    group.add(top);

    root.add(group);
  });

  // One angled overhead beam gives a real visual cue for dive-under / trick-shot lines.
  box(root,[2.8,.10,.12],[1.45,2.25,-5.35],woodDark,[0,0,THREE.MathUtils.degToRad(-7)]);

  return root;
}

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;
  const boot = document.getElementById('boot');
  const world = await World.create(container, projectOptions);

  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  world.renderer.toneMappingExposure = 1.04;
  world.renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0xd9dfe0, 0x211d18, 0.56);
  world.createTransformEntity(hemi, { persistent: true });

  const key = new THREE.DirectionalLight(0xf4f7f7, 1.62);
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

  // A4 headset exposure pass: brighter practical pools + restrained warm bounce.
  // The point is readable shadow information, not a flat globally-lit room.
  for (const z of [0.85, -3.15, -7.10]) {
    const practical = new THREE.PointLight(0xeaf5f8, 1.08, 6.2, 2.0);
    practical.position.set(0, 2.60, z);
    practical.castShadow = false;
    world.createTransformEntity(practical, { persistent: true });

    for (const side of [-1, 1]) {
      const bounce = new THREE.PointLight(0xffd3a8, 0.18, 3.4, 2.0);
      bounce.position.set(side * 2.68, 1.10, z - 0.25);
      bounce.castShadow = false;
      world.createTransformEntity(bounce, { persistent: true });
    }
  }

  // A4 deliberately fixes the scene before layering more action systems.
  // Keep native tracked hands temporarily; custom dark-brown hand visuals come next
  // rather than masking the environment/exposure problem with more effects.
  const nativeXR = Boolean(navigator.xr);
  if (boot) boot.textContent = nativeXR
    ? 'NEXUS IWSDK A4 · SENSOR EXPOSURE · BODYCAM LIGHTING'
    : 'NEXUS A4 · WEBXR NOT AVAILABLE';

  world.renderer.xr.addEventListener('sessionstart', () => {
    if (boot) boot.textContent = 'NEXUS A4 · VR LIVE · SENSOR EXPOSURE PASS';
  });
  world.renderer.xr.addEventListener('sessionend', () => {
    if (boot) boot.textContent = 'NEXUS A4 · VR EXITED · READY TO RE-ENTER';
  });
}

main().catch((error) => {
  console.error(error);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'NEXUS IWSDK ERROR · ' + String(error?.message ?? error);
});
