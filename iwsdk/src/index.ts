import { EnvironmentType, LocomotionEnvironment, World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import * as THREE from 'three';

declare global {
  interface Window { __NEXUS_IWSDK_BUILD?: string; }
}

const BUILD = 'iwsdk-a1-hero-hall';
window.__NEXUS_IWSDK_BUILD = BUILD;

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  mat: THREE.Material,
  rot: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...pos);
  mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildHeroHall() {
  const root = new THREE.Group();
  root.name = 'NEXUS_HERO_HALL_A1';

  const wood = new THREE.MeshStandardMaterial({ color: 0xc4a374, roughness: 0.79, metalness: 0.0 });
  const woodLight = new THREE.MeshStandardMaterial({ color: 0xd0b486, roughness: 0.82, metalness: 0.0 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x8d704d, roughness: 0.86, metalness: 0.0 });
  const osb = new THREE.MeshStandardMaterial({ color: 0xb99768, roughness: 0.88, metalness: 0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x696761, roughness: 0.94, metalness: 0.0 });
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x403c35, roughness: 0.97, metalness: 0.0 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x272a2c, roughness: 0.90, metalness: 0.03 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x4f5354, roughness: 0.56, metalness: 0.62 });

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
    color: 0xf5f2e8,
    emissive: 0xffffff,
    emissiveIntensity: 3.1,
    roughness: 0.42,
  });
  for (const z of [0.85, -3.15, -7.10]) {
    box(root, [0.16, 0.055, 1.55], [0.0, 2.82, z], lightMat);
  }

  return root;
}

async function main() {
  const container = document.getElementById('scene-container') as HTMLDivElement;
  const boot = document.getElementById('boot');
  const world = await World.create(container, projectOptions);

  world.renderer.shadowMap.enabled = true;
  world.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemi = new THREE.HemisphereLight(0xeaf1f2, 0x332b23, 1.05);
  world.createTransformEntity(hemi, { persistent: true });

  const key = new THREE.DirectionalLight(0xfffbf2, 2.0);
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

  const hall = buildHeroHall();
  const hallEntity = world.createTransformEntity(hall);
  hallEntity.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

  // First IWSDK pass intentionally does NOT port the old procedural black sleeves.
  // Real tracked hands stay clean; clothing returns only after a proper arm mesh is ready.
  if (boot) boot.textContent = 'NEXUS IWSDK A1 · HERO HALL · OLD SLEEVES REMOVED';
}

main().catch((error) => {
  console.error(error);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'NEXUS IWSDK ERROR · ' + String(error?.message ?? error);
});
