import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js";

const canvas = document.getElementById("scene");
const startBtn = document.getElementById("start");
const roundLabel = document.getElementById("round");
const hintLabel = document.getElementById("hint");
const nameInput = document.getElementById("playerName");
const scoresList = document.getElementById("scores");
const bestScoreLabel = document.getElementById("bestScore");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0c1224, 0.06);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, 7.2, 11);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const padGroup = new THREE.Group();
scene.add(padGroup);

const colors = [
  new THREE.Color("#69f0ff"),
  new THREE.Color("#ff6fb1"),
  new THREE.Color("#7b6cff"),
  new THREE.Color("#78ff9e"),
];

const tones = [420, 520, 640, 760];
const pads = [];
const sequence = [];
let acceptingInput = false;
let userIndex = 0;
let currentRound = 0;
const SCORE_KEY = "simon3d_scores_v1";
const NAME_KEY = "simon3d_player_name_v1";
let scores = loadScores();

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.value = 0.18;
masterGain.connect(audioCtx.destination);
const ambientState = { timer: null, active: false };

const clock = new THREE.Clock();

init();
animate();

function init() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(5, 9, 7);
  scene.add(keyLight);

  const rim = new THREE.SpotLight(0x8fa8ff, 1.4, 40, Math.PI / 4, 0.4);
  rim.position.set(-6, 10, -4);
  rim.target.position.set(0, 0, 0);
  scene.add(rim, rim.target);

  const floorGeo = new THREE.CircleGeometry(9, 80);
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f152a,
    roughness: 0.4,
    metalness: 0.65,
    transmission: 0.05,
    thickness: 0.6,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  const positions = [
    [-2, 2],
    [2, 2],
    [-2, -2],
    [2, -2],
  ];

  positions.forEach((pos, i) => {
    const pad = createPad(colors[i], i);
    pad.position.set(pos[0], 0, pos[1]);
    padGroup.add(pad);
    pads.push(pad);
  });

  addParticles();

  startBtn.addEventListener("click", () => {
    audioCtx.resume();
    startAmbient();
    startGame();
  });
  const storedName = loadName();
  if (storedName) nameInput.value = storedName;
  nameInput.addEventListener("change", onNameChange);
  nameInput.addEventListener("blur", onNameChange);

  window.addEventListener("resize", onResize);
  window.addEventListener("pointerdown", onPointerDown);
  onResize();
  renderScores();
}

function createPad(color, index) {
  const group = new THREE.Group();

  const topGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.6, 40, 1, false);
  const topMat = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.15),
    roughness: 0.25,
    metalness: 0.9,
    clearcoat: 0.6,
    clearcoatRoughness: 0.08,
    reflectivity: 0.95,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.4;
  group.add(top);

  const glowGeo = new THREE.TorusGeometry(1.05, 0.12, 24, 80);
  const glowMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = Math.PI / 2;
  glow.position.y = 0.05;
  group.add(glow);

  const baseGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 24, 1, false);
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0f1d,
    roughness: 0.6,
    metalness: 0.8,
    clearcoat: 0.25,
  });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.1;
  group.add(base);

  group.userData = {
    index,
    top,
    glow,
    base,
    flash: null,
  };
  group.scale.set(1, 1, 1);
  group.rotation.y = (Math.PI / 18) * index;
  return group;
}

function addParticles() {
  const particleGeo = new THREE.BufferGeometry();
  const count = 80;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 6 * Math.random();
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.random() * 3 + 0.5;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x9bc3ff,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
}

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function onPointerDown(event) {
  if (!acceptingInput) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(pads, true);
  if (intersects.length === 0) return;

  let pad = intersects[0].object;
  while (pad && pad.userData && typeof pad.userData.index === "undefined") {
    pad = pad.parent;
  }
  if (!pad || typeof pad.userData.index === "undefined") return;
  const idx = pad.userData.index;
  pressPad(idx);
}

function startGame() {
  sequence.length = 0;
  currentRound = 0;
  addStep();
  playSequence();
}

function addStep() {
  sequence.push(Math.floor(Math.random() * 4));
  currentRound = sequence.length;
  roundLabel.textContent = `Runde ${currentRound}`;
}

async function playSequence() {
  acceptingInput = false;
  userIndex = 0;
  hintLabel.textContent = "Merke die Reihenfolge";
  await sleep(400);

  for (const idx of sequence) {
    flash(pads[idx], 420);
    playTone(idx, 0.35);
    await sleep(480);
  }

  hintLabel.textContent = "Dein Zug";
  acceptingInput = true;
}

function pressPad(idx) {
  flash(pads[idx], 260);
  playTone(idx, 0.25);

  if (!acceptingInput) return;
  const expected = sequence[userIndex];
  if (idx !== expected) {
    fail();
    return;
  }

  userIndex += 1;
  if (userIndex === sequence.length) {
    acceptingInput = false;
    hintLabel.textContent = "Nice!";
    setTimeout(() => {
      addStep();
      playSequence();
    }, 500);
  }
}

function fail() {
  acceptingInput = false;
  hintLabel.textContent = "Fehler! Neustart...";
  const score = Math.max(currentRound - 1, 0);
  if (score > 0) recordScore(score);
  flashAll();
  failTone();
  setTimeout(startGame, 900);
}

function flashAll() {
  pads.forEach((pad) => flash(pad, 320, 1.12));
  playTone(0, 0.25, 0.9);
  setTimeout(() => playTone(1, 0.22, 0.8), 120);
}

function flash(pad, duration = 360, scale = 1.08) {
  pad.userData.flash = {
    start: performance.now(),
    duration,
    scale,
  };
}

function playTone(index, length = 0.3, volume = 1) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const freq = tones[index % tones.length];
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.7 * volume, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + length);

  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + length + 0.05);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  const camR = 9.8;
  camera.position.x = Math.sin(t * 0.25) * camR * 0.55;
  camera.position.z = Math.cos(t * 0.25) * camR * 0.75;
  camera.position.y = 6.7 + Math.sin(t * 0.1) * 0.2;
  camera.lookAt(0, 0.8, 0);

  padGroup.rotation.y = Math.sin(t * 0.2) * 0.06;

  pads.forEach((pad) => updateFlash(pad, t));

  renderer.render(scene, camera);
}

function updateFlash(pad, t) {
  const flashState = pad.userData.flash;
  const top = pad.userData.top;
  const glow = pad.userData.glow;
  const baseScale = 1 + Math.sin((t + pad.userData.index) * 0.6) * 0.01;

  if (!flashState) {
    pad.scale.setScalar(baseScale);
    top.material.emissiveIntensity = 0.18;
    glow.material.opacity = 0.5;
    return;
  }

  const elapsed = performance.now() - flashState.start;
  const progress = Math.min(elapsed / flashState.duration, 1);
  const pulse = 1 - Math.pow(progress - 1, 2);

  const scale = THREE.MathUtils.lerp(1, flashState.scale, pulse);
  pad.scale.setScalar(scale);
  top.material.emissiveIntensity = THREE.MathUtils.lerp(0.18, 1.8, pulse);
  glow.material.opacity = THREE.MathUtils.lerp(0.5, 0.95, pulse);

  if (progress >= 1) {
    pad.userData.flash = null;
  }
}

function startAmbient() {
  if (ambientState.active) return;
  ambientState.active = true;
  tickAmbient();
}

function tickAmbient() {
  if (!ambientState.active) return;
  playAmbientNote();
  const nextDelay = 1400 + Math.random() * 2600;
  clearTimeout(ambientState.timer);
  ambientState.timer = setTimeout(tickAmbient, nextDelay);
}

function playAmbientNote() {
  const now = audioCtx.currentTime;
  const scale = [0, 2, 5, 7, 9]; // pentatonic; pleasant, non-repeating
  const root = 196; // G3
  const octave = Math.floor(Math.random() * 3); // 0-2
  const semitone = scale[Math.floor(Math.random() * scale.length)] + octave * 12;
  const freq = root * Math.pow(2, semitone / 12);

  const osc = audioCtx.createOscillator();
  osc.type = Math.random() > 0.5 ? "sine" : "triangle";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.linearRampToValueAtTime(freq * (0.98 + Math.random() * 0.04), now + 1.6);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq * (0.6 + Math.random() * 0.5);
  filter.Q.value = 1.1 + Math.random() * 1.2;

  const pan = audioCtx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.0001;
  gain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.04, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8 + Math.random() * 1.2);

  osc.connect(filter).connect(pan).connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + 4);
}

function failTone() {
  const now = audioCtx.currentTime;
  const g = audioCtx.createGain();
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.6);
  osc.connect(g).connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.7);

  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.35, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const ng = audioCtx.createGain();
  ng.gain.value = 0.12;
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  noise.connect(ng).connect(masterGain);
  noise.start(now);
  noise.stop(now + 0.36);
}

function recordScore(score) {
  const name = (nameInput.value || "Player").trim() || "Player";
  scores.push({ name, score, date: new Date().toISOString() });
  scores = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  saveScores();
  localStorage.setItem(NAME_KEY, name);
  renderScores();
}

function renderScores() {
  const top = [...scores].sort((a, b) => b.score - a.score).slice(0, 10);
  bestScoreLabel.textContent = top.length ? top[0].score : 0;
  scoresList.innerHTML = "";
  if (top.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Einträge";
    scoresList.appendChild(li);
    return;
  }
  top.forEach((entry) => {
    const li = document.createElement("li");
    const date = new Date(entry.date).toLocaleDateString("de-DE");
    li.innerHTML = `<span>${entry.name}</span><span>${entry.score} • ${date}</span>`;
    scoresList.appendChild(li);
  });
}

function loadScores() {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveScores() {
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
}

function loadName() {
  return localStorage.getItem(NAME_KEY) || "";
}

function onNameChange() {
  localStorage.setItem(NAME_KEY, nameInput.value.trim());
}
