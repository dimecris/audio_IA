let cnv;

let audioEl = null;
let videoEl = null;

let audioCtx = null;
let analyser = null;

let sourceNode = null;
let gainNode = null;
let delayNode = null;
let distortionNode = null;
let panNode = null;
// “Reverb” simple con Convolver (impulso generado)
let convolverNode = null;
let wetGain = null;
let dryGain = null;

let dataArray = null;

let ui = {};
let isPlaying = false;

const VIDEO_H = 300;

function setup() {
  cnv = createCanvas(800, 450);
  cnv.parent("sketch-holder");

  pixelDensity(1);
  setupUI();
}

function windowResized() {
  // Mantén aspecto “full width” sin romper el alto base
  // (El canvas ya se escala por CSS; aquí mantengo el tamaño lógico)
  resizeCanvas(800, 450);
}

function draw() {
  background(20, 20, 40);

  // --- Area video (arriba) ---
  noStroke();
  fill(40, 40, 60);
  rect(0, 0, width, VIDEO_H);

  if (videoEl && !videoEl.paused && videoEl.readyState >= 2) {
    try {
      // p5 puede dibujar un <video> del DOM con drawImage via drawingContext
      drawingContext.drawImage(videoEl, 0, 0, width, VIDEO_H);
    } catch (e) {
      fill(60, 40, 80);
      rect(0, 0, width, VIDEO_H);
      fill(220);
      textAlign(CENTER, CENTER);
      textSize(18);
      text("🎥 Video Playing", width / 2, VIDEO_H / 2);
    }
  } else {
    fill(200);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("Video Player Area", width / 2, VIDEO_H / 2);
  }

  // --- Visualización audio (abajo) ---
  const baseY = VIDEO_H + 0;
  const vizH = height - VIDEO_H;

  if (analyser && dataArray && audioEl && !audioEl.paused) {
    analyser.getByteFrequencyData(dataArray);

    fill(138, 43, 226, 150);

    const barCount = Math.floor(dataArray.length / 2);
    const barW = width / barCount;

    for (let i = 0; i < dataArray.length; i += 2) {
      const barH = (dataArray[i] / 255) * (vizH * 0.8);
      const x = (i / 2) * barW;
      rect(x, baseY + vizH - 6, barW - 1, -barH);
    }
  } else {
    // animación “idle”
    const t = frameCount * 0.05;
    fill(60, 60, 80);
    for (let i = 0; i < 100; i++) {
      const x = i * 8;
      const h = 10 + sin(t + i * 0.2) * 15 + 15;
      rect(x, baseY + vizH - 6, 7, -h);
    }
  }

  // Texto parámetros
  fill(230);
  textAlign(LEFT, TOP);
  textSize(12);
  text(`Vol: ${ui.vol.value}% | Reverb: ${ui.rev.value}% | Pitch: ${ui.pit.value}%`, 20, VIDEO_H + 20);
  text(`Pan: ${ui.pan.value}% | Delay: ${ui.del.value}% | Dist: ${ui.dis.value}%`, 20, VIDEO_H + 40);
}

function setupUI() {
  // Sliders + labels
  ui.vol = bindRange("vol", "volVal");
  ui.rev = bindRange("rev", "revVal");
  ui.pit = bindRange("pit", "pitVal");
  ui.pan = bindRange("pan", "panVal");
  ui.del = bindRange("del", "delVal");
  ui.dis = bindRange("dis", "disVal");

  // Buttons
  const playBtn = document.getElementById("playBtn");
  const stopBtn = document.getElementById("stopBtn");

  playBtn.addEventListener("click", async () => {
    await ensureAudioGraph();
    await startPlayback();
    playBtn.disabled = true;
    stopBtn.disabled = false;
  });

  stopBtn.addEventListener("click", () => {
    stopPlayback();
    playBtn.disabled = false;
    stopBtn.disabled = true;
  });

  // File inputs
  const audioFile = document.getElementById("audioFile");
  audioFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    ensureAudioElement();
    audioEl.src = url;
  });

  const videoFile = document.getElementById("videoFile");
  videoFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    ensureVideoElement();
    videoEl.src = url;
  });
}

function bindRange(id, labelId) {
  const el = document.getElementById(id);
  const label = document.getElementById(labelId);

  const update = () => {
    label.textContent = `${el.value}%`;
    applyParams(); // actualiza nodos si existen
  };

  el.addEventListener("input", update);
  update();

  return {
    get value() { return Number(el.value); },
  };
}

function ensureAudioElement() {
  if (audioEl) return;
  audioEl = new Audio();
  audioEl.loop = true;
  audioEl.crossOrigin = "anonymous";
}

function ensureVideoElement() {
  if (videoEl) return;
  videoEl = document.createElement("video");
  videoEl.loop = true;
  videoEl.muted = true; // evita problemas de autoplay; puedes quitarlo si quieres audio del vídeo
  videoEl.playsInline = true;
  videoEl.crossOrigin = "anonymous";
}

async function ensureAudioGraph() {
  ensureAudioElement();
  ensureVideoElement();

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  // Ya creado
  if (analyser) {
    applyParams();
    return;
  }

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;

  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Nodos
  gainNode = audioCtx.createGain();
  delayNode = audioCtx.createDelay(2.0);
  panNode = audioCtx.createStereoPanner();

  distortionNode = audioCtx.createWaveShaper();
  distortionNode.oversample = "4x";

  // Reverb simple (Convolver + wet/dry)
  convolverNode = audioCtx.createConvolver();
  convolverNode.buffer = makeImpulseResponse(audioCtx, 2.0, 2.0); // base
  wetGain = audioCtx.createGain();
  dryGain = audioCtx.createGain();

  // Source desde <audio>
  try {
    sourceNode = audioCtx.createMediaElementSource(audioEl);
  } catch (e) {
    // Si ya estaba conectado, no hacemos nada.
  }

  // Routing:
  // source -> dry -> delay -> distortion -> pan -> analyser -> destination
  //       -> wet (convolver) -> delay -> ... (mismo resto)
  // Para simplificar, mezclo antes del delay
  sourceNode.connect(dryGain);
  sourceNode.connect(convolverNode);
  convolverNode.connect(wetGain);

  const merger = audioCtx.createGain();
  dryGain.connect(merger);
  wetGain.connect(merger);

  merger
    .connect(delayNode);
  delayNode
    .connect(distortionNode);
  distortionNode
    .connect(panNode);
  panNode
    .connect(analyser);
  analyser
    .connect(gainNode);
  gainNode
    .connect(audioCtx.destination);

  applyParams();
}

function applyParams() {
  if (!audioEl) return;

  // Volume
  audioEl.volume = ui.vol.value / 100;

  if (!audioCtx || !gainNode) return;

  // Gain final (lo dejo a 1; el volumen lo hace el elemento)
  gainNode.gain.value = 1;

  // Pitch (playbackRate)
  // 50% => 1.0; 0% => 0.5; 100% => 2.0 (ajusta si quieres)
  const pr = mapValue(ui.pit.value, 0, 100, 0.5, 2.0);
  audioEl.playbackRate = pr;

  // Pan: 0..100 => -1..1
  if (panNode) {
    panNode.pan.value = mapValue(ui.pan.value, 0, 100, -1, 1);
  }

  // Delay: 0..100 => 0..0.8s
  if (delayNode) {
    delayNode.delayTime.value = mapValue(ui.del.value, 0, 100, 0, 0.8);
  }

  // Distortion: 0..100 => curva
  if (distortionNode) {
    distortionNode.curve = makeDistortionCurve(ui.dis.value);
  }

  // Reverb: 0..100 => wet 0..0.85, dry inverso
  if (wetGain && dryGain) {
    const wet = mapValue(ui.rev.value, 0, 100, 0, 0.85);
    wetGain.gain.value = wet;
    dryGain.gain.value = 1 - wet;
  }
}

async function startPlayback() {
  if (!audioEl) return;

  // Si no hay archivo cargado, no sonará (y está bien)
  // Puedes poner aquí un fallback a un MP3 local si lo tienes.
  try {
    await audioEl.play();
  } catch (e) {
    console.log("Audio play prevented:", e);
  }

  if (videoEl && videoEl.src) {
    try {
      await videoEl.play();
    } catch (e) {
      console.log("Video play prevented:", e);
    }
  }

  isPlaying = true;
}

function stopPlayback() {
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  if (videoEl) {
    videoEl.pause();
    videoEl.currentTime = 0;
  }
  isPlaying = false;
}

// Helpers
function mapValue(v, inMin, inMax, outMin, outMax) {
  const t = (v - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function makeDistortionCurve(amount) {
  // amount 0..100
  const k = amount * 10;
  const n = 44100;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function makeImpulseResponse(ctx, duration, decay) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}
