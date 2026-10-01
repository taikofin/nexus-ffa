from pathlib import Path

p = Path("iwsdk/src/index.ts")
s = p.read_text()

assert "iwsdk-a12-quest-reverse-angle-fix" in s, "A12 build marker missing"
assert "function addMapFinishPass(" not in s, "A13 patch already applied"

s = s.replace("const BUILD = 'iwsdk-a12-quest-reverse-angle-fix';", "const BUILD = 'iwsdk-a13-map-finish-pass';")
s = s.replace("root.name = 'NEXUS_HERO_HALL_A11';", "root.name = 'NEXUS_HERO_HALL_A13';")

fn = r'''function addMapFinishPass(
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
'''

marker = "\n\nfunction addAuthoredGraffiti(root: THREE.Group, maxAniso: number) {"
assert marker in s, "graffiti insertion marker missing"
s = s.replace(marker, "\n\n" + fn + "\nfunction addAuthoredGraffiti(root: THREE.Group, maxAniso: number) {")

old_call = "  addLivedInDetail(root,maxAniso,concreteWall,woodDark,steel);\n  addAuthoredGraffiti(root,maxAniso);"
new_call = "  addLivedInDetail(root,maxAniso,concreteWall,woodDark,steel);\n  addMapFinishPass(root,concreteWall,woodDark,steel);\n  addAuthoredGraffiti(root,maxAniso);"
assert old_call in s, "detail call marker missing"
s = s.replace(old_call, new_call)

s = s.replace("NEXUS IWSDK A12 · QUEST REVERSE-ANGLE FIX", "NEXUS IWSDK A13 · MAP FINISH PASS")
s = s.replace("NEXUS A12 · WEBXR NOT AVAILABLE", "NEXUS A13 · WEBXR NOT AVAILABLE")
s = s.replace("NEXUS A12 · VR LIVE · REVERSE-ANGLE CHECK", "NEXUS A13 · VR LIVE · MAP CHECK")
s = s.replace("NEXUS A12 · VR EXITED · READY TO RE-ENTER", "NEXUS A13 · VR EXITED · READY TO RE-ENTER")

p.write_text(s)
