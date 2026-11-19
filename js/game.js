// Engine 3D Estilo Roblox com Three.js
let scene, camera, renderer;
let avatar, leftLeg, rightLeg, leftArm, rightArm;
let currentTopoIndex = 0;
let score = 0;
let networkGroup = new THREE.Group();
let packets = [];
let linkMeshes = [];
let nodeMap = {};
let walkTime = 0;
let lastFrame = 0;
const spawnPoint = new THREE.Vector3(0, 0, 12);

// Controles do Avatar
const keys = {};
let velocityY = 0;
let isGrounded = true;
let camYaw = 0;
let camPitch = 0.45;
let isDragging = false;
let prevMouse = { x: 0, y: 0 };

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let avatarParts = {};
let customNodes = [];
let customLinks = [];
let customNodeTargets = [];
let customSelected = [];
let customNodeCount = 0;
let customMode = false;
let audioContext = null;
let musicOscillators = [];
let musicOn = false;
let missionCompleted = false;


function init() {
  const container = document.getElementById("game-container");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcbd8e2);
  scene.fog = new THREE.Fog(0xcbd8e2, 55, 115);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Iluminação estilo Roblox Obby / Studio
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.85);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(18, 30, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  createBaseplate();
  createRobloxAvatar();
  scene.add(networkGroup);

  loadTopology(0);
  setupEvents();
  animate();
}

function createBaseplate() {
  // Campus corporativo: piso claro, linhas discretas e prédios de vidro ao redor.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({color:0xe7edf2, roughness:0.88}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -0.04; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.GridHelper(44, 44, 0xb8c7d4, 0xd4dde5); grid.position.y = 0.005; scene.add(grid);
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(46,0.35,46), new THREE.MeshStandardMaterial({color:0xdbe4eb, roughness:0.9}));
  plaza.position.y=-0.22; plaza.receiveShadow=true; scene.add(plaza);
  const buildingMat = new THREE.MeshStandardMaterial({color:0x9fb7c9, metalness:0.25, roughness:0.35, transparent:true, opacity:0.72});
  const trimMat = new THREE.MeshStandardMaterial({color:0x334e68, metalness:0.35, roughness:0.45});
  [[-27,0,-8,8,18,20],[27,0,-8,8,18,20],[-8,0,-27,20,18,8],[8,0,27,20,18,8]].forEach(([x,y,z,w,h,d])=>{
    const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMat); b.position.set(x,h/2-0.1,z); b.castShadow=true; b.receiveShadow=true; scene.add(b);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(w+0.15,0.35,d+0.15),trimMat); stripe.position.set(x,h-0.25,z); scene.add(stripe);
  });
  // canteiros e árvores geométricas para dar escala ao campus
  for (const [x,z] of [[-20,-20],[20,-20],[-20,20],[20,20]]) {
    const planter=new THREE.Mesh(new THREE.BoxGeometry(4,0.5,4),new THREE.MeshStandardMaterial({color:0x879b8c})); planter.position.set(x,0.05,z); scene.add(planter);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,2,8),new THREE.MeshStandardMaterial({color:0x80634b})); trunk.position.set(x,1.2,z); scene.add(trunk);
    const crown=new THREE.Mesh(new THREE.SphereGeometry(1.35,12,10),new THREE.MeshStandardMaterial({color:0x5d8b72,roughness:1})); crown.position.set(x,2.7,z); scene.add(crown);
  }
}

function createRobloxAvatar() {
  avatar = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15 }); // Cabeça clássica amarela
  const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 }); // Camisa Engenheiro de Redes
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

  // Tronco
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.6), torsoMat);
  torso.position.y = 1.65;
  torso.castShadow = true;
  avatar.add(torso);

  // Cabeça
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), skinMat);
  head.position.y = 2.75;
  head.castShadow = true;
  avatar.add(head);
  // Rosto visível na frente do personagem (eixo -Z).
  const eyeMat = new THREE.MeshStandardMaterial({color:0x17212b, roughness:0.4});
  const eyeGeo = new THREE.SphereGeometry(0.065,10,8);
  const eyeL = new THREE.Mesh(eyeGeo,eyeMat); eyeL.position.set(-0.19,2.82,-0.435); avatar.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.x=0.19; avatar.add(eyeR);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.035,0.035),new THREE.MeshStandardMaterial({color:0x7c2d12}));
  smile.position.set(0,2.59,-0.44); avatar.add(smile);

  // Capacete Técnico
  const hat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.6, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444 })
  );
  hat.position.y = 3.25;
  avatar.add(hat);

  // Braços
  leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), skinMat);
  leftArm.position.set(-0.88, 1.65, 0);
  avatar.add(leftArm);

  rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), skinMat);
  rightArm.position.set(0.88, 1.65, 0);
  avatar.add(rightArm);

  // Pernas
  leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), legMat);
  leftLeg.position.set(-0.32, 0.5, 0);
  avatar.add(leftLeg);

  rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), legMat);
  rightLeg.position.set(0.32, 0.5, 0);
  avatar.add(rightLeg);

  avatar.position.set(0, 0, 12);
  avatar.rotation.y = Math.PI;
  scene.add(avatar);
}

function changeSkin(skin) {
  const palette = {blue:0x0284c7,green:0x16845b,purple:0x7256b8,orange:0xd97726};
  const pants = {blue:0x24364b,green:0x243b35,purple:0x30284b,orange:0x493322};
  avatar.traverse(obj => {
    if (!obj.isMesh || !obj.material || !obj.material.color) return;
    if (obj.geometry && obj.geometry.type === "BoxGeometry" && obj.position.y === 1.65) obj.material.color.setHex(palette[skin] || palette.blue);
    if (obj.geometry && obj.geometry.type === "BoxGeometry" && obj.position.y === 0.5) obj.material.color.setHex(pants[skin] || pants.blue);
  });
  addLog("Visual do personagem atualizado.","ok");
}

function startAmbientMusic() {
  if (musicOn) { stopAmbientMusic(); return; }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) { addLog("Este navegador não oferece suporte ao áudio Web.","warn"); return; }
  audioContext = audioContext || new AudioCtx();
  audioContext.resume();
  const master = audioContext.createGain(); master.gain.value=0.035; master.connect(audioContext.destination);
  // Acorde ambiente original, suave e sem arquivos externos.
  [130.81,164.81,196.00,261.63].forEach((freq,i)=>{
    const osc=audioContext.createOscillator(); const gain=audioContext.createGain();
    osc.type="sine"; osc.frequency.value=freq; gain.gain.value=i===0?0.35:0.16;
    osc.connect(gain); gain.connect(master); osc.start(); musicOscillators.push({osc,gain,master});
  });
  musicOn=true; document.getElementById("btn-music").textContent="Desativar som"; addLog("Música ambiente ativada.","ok");
}
function stopAmbientMusic() {
  musicOscillators.forEach(item=>{try{item.osc.stop();}catch(e){}}); musicOscillators=[]; musicOn=false;
  const btn=document.getElementById("btn-music"); if(btn) btn.textContent="Ativar som";
}

function completeMission() {
  if (missionCompleted) { document.getElementById("congrats-message").textContent="Você já concluiu esta missão. Continue explorando e criando novas redes!"; }
  else { missionCompleted=true; score+=100; document.getElementById("score-val").textContent=score; document.getElementById("mission-text").textContent="Missão concluída! +100 pontos."; document.getElementById("congrats-message").textContent=`Você concluiu: ${document.getElementById("info-title").textContent}. Sua rede está pronta para novos desafios!`; addLog("PARABÉNS! Missão concluída. (+100 pontos)","ok"); }
  document.getElementById("congrats-overlay").classList.remove("hidden");
}

function addCustomDevice(type) {
  customMode=true; customNodeCount++;
  const labels={pc:"Computador",router:"Roteador",switch:"Switch",server:"Servidor"};
  const angle=(customNodeCount-1)*Math.PI*2/Math.max(4,customNodeCount);
  const radius=3.5+Math.min(5,customNodeCount*0.35);
  const node={id:`custom_${customNodeCount}`,label:`${labels[type]} ${customNodeCount}`,type,x:Math.cos(angle)*radius,z:Math.sin(angle)*radius-2};
  const mesh=createDeviceMesh(node); mesh.userData.customNodeId=node.id; networkGroup.add(mesh);
  const main=mesh.children.find(child=>child.isMesh && child.geometry && child.geometry.type!=="CylinderGeometry");
  if(main){main.userData.customNodeId=node.id; customNodeTargets.push(main);}
  customNodes.push({...node,mesh});
  const tag=document.createElement("span"); tag.className="device-tag"; tag.textContent=node.label; document.getElementById("devices-list").appendChild(tag);
  document.getElementById("builder-hint").textContent="Agora clique em dois equipamentos para criar um enlace entre eles.";
  document.getElementById("info-title").textContent="Minha topologia personalizada";
  document.getElementById("info-desc").textContent="Selecione dois dispositivos no cenário para conectá-los. Repita para montar sua rede.";
  addLog(`${node.label} adicionado.`,"ok");
}
function selectCustomDevice(id) {
  if(!customMode) return;
  const node=customNodes.find(n=>n.id===id); if(!node) return;
  if(customSelected.includes(id)){customSelected=customSelected.filter(x=>x!==id);return;}
  customSelected.push(id); addLog(`${node.label} selecionado.`,"info");
  if(customSelected.length===2){
    const [aId,bId]=customSelected; const a=customNodes.find(n=>n.id===aId), b=customNodes.find(n=>n.id===bId);
    if(aId!==bId && !customLinks.some(l=>(l.from===aId&&l.to===bId)||(l.from===bId&&l.to===aId))){
      const p1=new THREE.Vector3(a.x,0.55,a.z),p2=new THREE.Vector3(b.x,0.55,b.z),dist=p1.distanceTo(p2);
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,dist,10),new THREE.MeshStandardMaterial({color:0x1686a8,emissive:0x075985,emissiveIntensity:.35}));
      mesh.position.copy(p1).add(p2).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p2.clone().sub(p1).normalize()); networkGroup.add(mesh);
      customLinks.push({from:aId,to:bId,mesh}); score+=10; document.getElementById("score-val").textContent=score;
      addLog(`Enlace criado: ${a.label} ↔ ${b.label}. (+10 pts)`,"ok");
    } else addLog("Esses equipamentos já estão conectados.","warn");
    customSelected=[];
  }
}
function clearCustomNetwork(){
  customNodes.forEach(n=>networkGroup.remove(n.mesh)); customLinks.forEach(l=>networkGroup.remove(l.mesh));
  customNodes=[];customLinks=[];customNodeTargets=[];customSelected=[];customNodeCount=0;customMode=true;
  document.getElementById("devices-list").innerHTML=""; document.getElementById("info-title").textContent="Minha topologia personalizada";
  document.getElementById("info-desc").textContent="Adicione equipamentos e conecte-os clicando em dois dispositivos.";
  document.getElementById("builder-hint").textContent="Rede limpa. Adicione novos equipamentos."; addLog("Sua topologia personalizada foi reiniciada.","info");
}

function makeTextSprite(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(20, 20, 472, 88);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 472, 88);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.5, 1.15, 1);
  return sprite;
}

function createDeviceMesh(node) {
  const group = new THREE.Group();
  let mainMesh;

  const colors = {
    pc: 0x38bdf8,
    laptop: 0x60a5fa,
    printer: 0x94a3b8,
    router: 0x0ea5e9,
    switch: 0x10b981,
    hub: 0xd946ef,
    server: 0x6366f1,
    phone: 0x22d3ee,
    tablet: 0x818cf8,
    appliance: 0xf59e0b
  };

  const mat = new THREE.MeshStandardMaterial({
    color: colors[node.type] || 0x38bdf8,
    roughness: 0.35
  });

  if (node.type === "router") {
    mainMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.5, 20), mat);
    mainMesh.position.y = 0.45;
    const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1), mat);
    ant1.position.set(-0.5, 1.0, -0.3);
    const ant2 = ant1.clone();
    ant2.position.set(0.5, 1.0, -0.3);
    group.add(ant1, ant2);
  } else if (node.type === "server") {
    mainMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.2), mat);
    mainMesh.position.y = 1.2;
  } else if (node.type === "switch" || node.type === "hub") {
    mainMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.2), mat);
    mainMesh.position.y = 0.35;
  } else {
    mainMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.1), mat);
    mainMesh.position.y = 0.65;
  }

  mainMesh.castShadow = true;
  group.add(mainMesh);

  // Pedestal estilo Roblox
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.5, 0.15, 20),
    new THREE.MeshStandardMaterial({ color: 0x0f172a })
  );
  pad.position.y = 0.075;
  group.add(pad);

  const label = makeTextSprite(node.label);
  label.position.set(0, 2.7, 0);
  group.add(label);

  group.position.set(node.x, 0, node.z);
  return group;
}


function resetAvatar() {
  avatar.position.copy(spawnPoint);
  velocityY = 0;
  isGrounded = true;
  addLog("Avatar reposicionado no ponto inicial.", "info");
}

function loadTopology(index) {
  currentTopoIndex = index;
  customMode=false; missionCompleted=false; customSelected=[];
  customNodes=[]; customLinks=[]; customNodeTargets=[]; customNodeCount=0;
  const topo = TOPOLOGIES[index];

  // Limpar cena anterior
  while (networkGroup.children.length > 0) {
    networkGroup.remove(networkGroup.children[0]);
  }
  packets = [];
  linkMeshes = [];
  nodeMap = {};
  spawnPoint.set(0, 0, 12);
  avatar.position.copy(spawnPoint);

  // Atualizar UI
  document.querySelectorAll(".topo-btn").forEach((b, idx) => {
    b.classList.toggle("active", idx === index);
  });
  document.getElementById("topology-subtitle").textContent = topo.title;
  document.getElementById("stage-counter").textContent = `${index + 1} / ${TOPOLOGIES.length}`;
  document.getElementById("info-title").textContent = topo.title;
  document.getElementById("info-desc").innerHTML = topo.description;
  document.getElementById("mission-text").textContent = `Missão: explore a topologia ${topo.title}, teste a conectividade e conclua o desafio.`;
  document.getElementById("devices-list").innerHTML = "";

  const devContainer = document.getElementById("devices-list");
  devContainer.innerHTML = "";
  topo.nodes.forEach(n => {
    const tag = document.createElement("span");
    tag.className = "device-tag";
    tag.textContent = n.label;
    devContainer.appendChild(tag);

    const mesh = createDeviceMesh(n);
    networkGroup.add(mesh);
    nodeMap[n.id] = { ...n, mesh };
  });

  // Criar enlaces (cabos ou ondas wireless)
  topo.links.forEach((lnk, idx) => {
    const a = nodeMap[lnk.from];
    const b = nodeMap[lnk.to];
    const p1 = new THREE.Vector3(a.x, 0.45, a.z);
    const p2 = new THREE.Vector3(b.x, 0.45, b.z);
    const dist = p1.distanceTo(p2);

    const geo = new THREE.CylinderGeometry(
      lnk.kind === "wireless" ? 0.08 : 0.12,
      lnk.kind === "wireless" ? 0.08 : 0.12,
      dist,
      10
    );
    const mat = new THREE.MeshStandardMaterial({
      color: lnk.stp ? 0xf97316 : (lnk.kind === "wireless" ? 0x22c55e : 0x38bdf8),
      emissive: lnk.kind === "wireless" ? 0x15803d : 0x0369a1,
      emissiveIntensity: 0.4
    });

    const tube = new THREE.Mesh(geo, mat);
    tube.position.copy(p1).add(p2).multiplyScalar(0.5);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
    tube.userData = { linkIndex: idx };

    networkGroup.add(tube);
    linkMeshes.push({
      mesh: tube,
      data: lnk,
      p1,
      p2,
      broken: false
    });
  });

  updateNetworkStatus();
  addLog(`Topologia carregada: ${topo.title}`, "info");
}

function toggleLinkFault(linkObj) {
  linkObj.broken = !linkObj.broken;
  if (linkObj.broken) {
    linkObj.mesh.material.color.setHex(0xef4444);
    linkObj.mesh.material.emissive.setHex(0x7f1d1d);
    linkObj.mesh.scale.set(0.6, 0.85, 0.6);
    addLog(`ALERTA: Falha no enlace ${linkObj.data.from.toUpperCase()} ↔ ${linkObj.data.to.toUpperCase()}!`, "err");
  } else {
    linkObj.mesh.material.color.setHex(linkObj.data.stp ? 0xf97316 : 0x38bdf8);
    linkObj.mesh.material.emissive.setHex(0x0369a1);
    linkObj.mesh.scale.set(1, 1, 1);
    addLog(`Enlace ${linkObj.data.from.toUpperCase()} ↔ ${linkObj.data.to.toUpperCase()} restaurado.`, "ok");
  }
  updateNetworkStatus();
}

function updateNetworkStatus() {
  const brokenCount = linkMeshes.filter(l => l.broken).length;
  const topo = TOPOLOGIES[currentTopoIndex];
  const statusEl = document.getElementById("net-status");

  if (brokenCount === 0) {
    statusEl.textContent = "ONLINE";
    statusEl.className = "val ok";
  } else if ((topo.resilience === "ring" || topo.resilience === "mesh") && brokenCount <= 2) {
    statusEl.textContent = "ROTA ALT. ATIVA";
    statusEl.className = "val warn";
    addLog("STP/Malha: Tráfego redirecionado por caminho redundante!", "warn");
  } else {
    statusEl.textContent = "FALHA CRÍTICA";
    statusEl.className = "val err";
  }
}

function sendPingPackets() {
  const activeLinks = linkMeshes.filter(l => !l.broken);
  if (activeLinks.length === 0) {
    addLog("Ping falhou: Todos os enlaces estão rompidos!", "err");
    return;
  }

  activeLinks.forEach(l => {
    const pkt = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    pkt.position.copy(l.p1);
    networkGroup.add(pkt);
    packets.push({ mesh: pkt, start: l.p1.clone(), end: l.p2.clone(), t: 0, dir: 1 });
  });

  score += 25;
  document.getElementById("score-val").textContent = score;
  addLog(`Ping ICMP enviado com sucesso em ${activeLinks.length} enlaces! (+25 pts)`, "ok");
}

function addLog(msg, type = "info") {
  const box = document.getElementById("log-box");
  const div = document.createElement("div");
  div.className = `log-entry ${type}`;
  div.textContent = `[${new Date().toLocaleTimeString().slice(0,5)}] ${msg}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function setupEvents() {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "Space" && isGrounded && !e.repeat) {
      velocityY = 0.34;
      isGrounded = false;
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.code] = false;
  });

  // Botões D-Pad Mobile
  document.querySelectorAll("#mobile-dpad button").forEach(btn => {
    const k = btn.dataset.key;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      keys[k] = true;
      if (k === "Space" && isGrounded) {
        velocityY = 0.28;
        isGrounded = false;
      }
    });
    const release = e => { e.preventDefault(); keys[k] = false; };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
  });

  // Câmera Orbital & Clique em Cabos
  renderer.domElement.addEventListener("pointerdown", e => {
    isDragging = true;
    prevMouse = { x: e.clientX, y: e.clientY };

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const customHits=raycaster.intersectObjects(customNodeTargets,false);
    if(customMode && customHits.length){ const id=customHits[0].object.userData.customNodeId; if(id){selectCustomDevice(id); isDragging=false; return;} }
    const hits = raycaster.intersectObjects(linkMeshes.map(l => l.mesh));
    if (hits.length > 0) {
      const idx = hits[0].object.userData.linkIndex;
      toggleLinkFault(linkMeshes[idx]);
    }
  });

  window.addEventListener("pointermove", e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    camYaw -= dx * 0.006;
    camPitch = Math.max(0.15, Math.min(1.25, camPitch + dy * 0.006));
    prevMouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  // Menu Topologias
  document.querySelectorAll(".topo-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      loadTopology(parseInt(btn.dataset.topo, 10));
    });
  });

  document.getElementById("btn-ping").addEventListener("click", sendPingPackets);
  document.getElementById("btn-reset").addEventListener("click", resetAvatar);

  document.getElementById("btn-fault").addEventListener("click", () => {
    const intact = linkMeshes.filter(l => !l.broken);
    if (intact.length > 0) {
      const randomLink = intact[Math.floor(Math.random() * intact.length)];
      toggleLinkFault(randomLink);
    }
  });

  document.getElementById("btn-repair").addEventListener("click", () => {
    linkMeshes.forEach(l => { if (l.broken) toggleLinkFault(l); });
  });
  document.getElementById("skin-select").addEventListener("change", e=>changeSkin(e.target.value));
  document.querySelectorAll("[data-device]").forEach(btn=>btn.addEventListener("click",()=>addCustomDevice(btn.dataset.device)));
  document.getElementById("btn-clear-custom").addEventListener("click",clearCustomNetwork);
  document.getElementById("btn-complete-mission").addEventListener("click",completeMission);
  document.getElementById("btn-music").addEventListener("click",startAmbientMusic);
  document.getElementById("btn-start-tutorial").addEventListener("click",()=>document.getElementById("tutorial-overlay").classList.add("hidden"));
  document.getElementById("btn-close-congrats").addEventListener("click",()=>document.getElementById("congrats-overlay").classList.add("hidden"));
}

function updateAvatar(time, delta = 1 / 60) {
  const sprinting = keys["ShiftLeft"] || keys["ShiftRight"];
  const speed = (sprinting ? 10.5 : 6.5) * delta;
  let moveX = 0, moveZ = 0;
  if (keys["KeyW"] || keys["ArrowUp"]) moveZ -= 1;
  if (keys["KeyS"] || keys["ArrowDown"]) moveZ += 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) moveX -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) moveX += 1;
  const moving = moveX !== 0 || moveZ !== 0;
  if (moving) {
    const length = Math.hypot(moveX, moveZ);
    moveX /= length; moveZ /= length;
    const angle = Math.atan2(moveX, moveZ) + camYaw;
    avatar.position.x += Math.sin(angle) * speed;
    avatar.position.z += Math.cos(angle) * speed;
    avatar.rotation.y = angle;
    avatar.position.x = Math.max(-20, Math.min(20, avatar.position.x));
    avatar.position.z = Math.max(-20, Math.min(20, avatar.position.z));
    walkTime += delta * (sprinting ? 15 : 10);
    const swing = Math.sin(walkTime) * (sprinting ? 0.82 : 0.55);
    leftLeg.rotation.x = swing; rightLeg.rotation.x = -swing;
    leftArm.rotation.x = -swing; rightArm.rotation.x = swing;
  } else {
    leftLeg.rotation.x *= 0.75; rightLeg.rotation.x *= 0.75;
    leftArm.rotation.x *= 0.75; rightArm.rotation.x *= 0.75;
  }
  avatar.position.y += velocityY * (delta * 60);
  if (avatar.position.y > 0) velocityY -= 0.014 * (delta * 60);
  else { avatar.position.y = 0; velocityY = 0; isGrounded = true; }
  const camDist = 13;
  const target = new THREE.Vector3(
    avatar.position.x + Math.sin(camYaw) * camDist * Math.cos(camPitch),
    avatar.position.y + 2.2 + Math.sin(camPitch) * camDist,
    avatar.position.z + Math.cos(camYaw) * camDist * Math.cos(camPitch)
  );
  camera.position.lerp(target, Math.min(1, delta * 8));
  camera.lookAt(avatar.position.x, avatar.position.y + 1.8, avatar.position.z);
}


function updatePackets() {
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i];
    p.t += 0.025 * p.dir;
    if (p.t >= 1) {
      p.t = 1;
      p.dir = -1;
      p.mesh.material.color.setHex(0x38bdf8); // Resposta ICMP (Pong)
    } else if (p.t <= 0 && p.dir === -1) {
      networkGroup.remove(p.mesh);
      packets.splice(i, 1);
      continue;
    }
    p.mesh.position.lerpVectors(p.start, p.end, p.t);
  }
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 1 / 60;
  lastFrame = time;
  updateAvatar(time, delta);
  updatePackets();
  renderer.render(scene, camera);
}

init();
