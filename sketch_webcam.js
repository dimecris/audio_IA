// Variables para el audio y efectos
let sound;
let fft;
let amplitude;

// Efectos en serie: Filtro Pasa-Altos -> Reverb
let highpassFilter;
let reverb;

// Variable para la webcam
let capture;

// Estado de reproducción
let isPlaying = false;
let isPaused = false;

// Referencias a elementos HTML
let playStopBtn;
let pauseBtn;

// Sliders - Controles básicos
let volumeSlider, rateSlider, panSlider;
let volumeValue, rateValue, panValue;

// Sliders - Filtro pasa-altos
let filterFreqSlider, filterResSlider;
let filterFreqValue, filterResValue;

// Sliders - Reverb
let reverbDurationSlider, reverbWetSlider;
let reverbDurationValue, reverbWetValue;

function preload() {
  // Cargar archivo de audio por defecto
  sound = loadSound('seleccionada.mp3');
}

function setup() {
  let canvas = createCanvas(800, 600);
  canvas.parent('canvas-container');
  
  // Inicializar captura de webcam
  capture = createCapture(VIDEO);
  capture.size(320, 240);
  capture.hide(); // Ocultar el elemento de video HTML por defecto
  
  // Inicializar analizadores de audio
  fft = new p5.FFT(0.8, 512);
  amplitude = new p5.Amplitude();
  
  // Crear efectos
  // 1. Filtro pasa-altos (Highpass)
  highpassFilter = new p5.HighPass();
  
  // 2. Reverb (efecto adicional)
  reverb = new p5.Reverb();
  
  // Obtener referencias a elementos HTML
  playStopBtn = select('#playStopBtn');
  pauseBtn = select('#pauseBtn');
  
  // Botones
  playStopBtn.mousePressed(togglePlayStop);
  pauseBtn.mousePressed(togglePause);
  
  // Sliders - Controles básicos
  volumeSlider = select('#volumeSlider');
  rateSlider = select('#rateSlider');
  panSlider = select('#panSlider');
  
  volumeValue = select('#volumeValue');
  rateValue = select('#rateValue');
  panValue = select('#panValue');
  
  volumeSlider.input(updateVolume);
  rateSlider.input(updateRate);
  panSlider.input(updatePan);
  
  // Sliders - Filtro pasa-altos
  filterFreqSlider = select('#filterFreqSlider');
  filterResSlider = select('#filterResSlider');
  
  filterFreqValue = select('#filterFreqValue');
  filterResValue = select('#filterResValue');
  
  filterFreqSlider.input(updateFilterFreq);
  filterResSlider.input(updateFilterRes);
  
  // Sliders - Reverb
  reverbDurationSlider = select('#reverbDurationSlider');
  reverbWetSlider = select('#reverbWetSlider');
  
  reverbDurationValue = select('#reverbDurationValue');
  reverbWetValue = select('#reverbWetValue');
  
  reverbDurationSlider.input(updateReverbDuration);
  reverbWetSlider.input(updateReverbWet);
  
  // Configuración inicial del reverb
  reverb.set(3, 2, false);
  
  // Configuración inicial del filtro
  highpassFilter.set(1000, 1);
  
  // Configurar audio
  if (sound.isLoaded()) {
    setupAudioEffects();
  }
  
  background(30);
}

function setupAudioEffects() {
  // Desconectar de la salida principal
  sound.disconnect();
  
  // Conectar el filtro pasa-altos
  sound.connect(highpassFilter);
  
  // Conectar el reverb después del filtro
  reverb.process(highpassFilter, 3, 0.5);
  
  // Conectar analizadores
  fft.setInput(reverb);
  amplitude.setInput(reverb);
  
  // Aplicar configuración inicial
  updateVolume();
  updateRate();
  updatePan();
  updateFilterFreq();
  updateFilterRes();
}

function draw() {
  background(20, 20, 40);
  
  // Dibujar webcam en la parte superior
  if (capture) {
    push();
    translate(width / 2, 150);
    imageMode(CENTER);
    image(capture, 0, 0, 320, 240);
    
    // Marco decorativo alrededor de la webcam
    noFill();
    stroke(138, 43, 226);
    strokeWeight(3);
    rect(-160, -120, 320, 240);
    pop();
  }
  
  // Visualización de audio en la parte inferior
  let audioY = 350;
  
  if (sound && sound.isPlaying()) {
    // Espectro de frecuencias
    let spectrum = fft.analyze();
    
    noStroke();
    fill(255, 100, 200, 150);
    
    for (let i = 0; i < spectrum.length; i++) {
      let x = map(i, 0, spectrum.length, 0, width);
      let h = map(spectrum[i], 0, 255, 0, 200);
      let y = audioY + (200 - h);
      
      rect(x, y, width / spectrum.length, h);
    }
    
    // Nivel de amplitud
    let level = amplitude.getLevel();
    fill(0, 255, 150, 150);
    rect(0, audioY, 20, map(level, 0, 1, 0, 200));
    
    // Texto de información
    fill(255);
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text('Nivel: ' + nf(level, 1, 3), 25, audioY + 190);
  } else {
    // Animación "idle"
    fill(60, 60, 80);
    for (let i = 0; i < 100; i++) {
      let x = i * (width / 100);
      let h = 10 + sin(frameCount * 0.05 + i * 0.2) * 15 + 15;
      rect(x, audioY + 200 - h, width / 100 - 2, h);
    }
  }
}

function togglePlayStop() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, espera a que se cargue el audio');
    return;
  }
  
  if (!isPlaying) {
    // Play
    sound.play();
    isPlaying = true;
    isPaused = false;
    playStopBtn.html('⏹ Stop');
  } else {
    // Stop
    sound.stop();
    isPlaying = false;
    isPaused = false;
    playStopBtn.html('▶ Play');
  }
}

function togglePause() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, espera a que se cargue el audio');
    return;
  }
  
  if (!isPlaying) {
    return;
  }
  
  if (isPaused) {
    // Reanudar
    sound.play();
    isPaused = false;
    pauseBtn.html('⏸ Pausa');
  } else {
    // Pausar
    sound.pause();
    isPaused = true;
    pauseBtn.html('▶ Reanudar');
  }
}

// Funciones para actualizar los parámetros

function updateVolume() {
  let vol = volumeSlider.value();
  volumeValue.html(nf(vol, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.setVolume(vol);
  }
}

function updateRate() {
  let rate = rateSlider.value();
  rateValue.html(nf(rate, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.rate(rate);
  }
}

function updatePan() {
  let pan = panSlider.value();
  panValue.html(nf(pan, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.pan(pan);
  }
}

function updateFilterFreq() {
  let freq = filterFreqSlider.value();
  filterFreqValue.html(freq + ' Hz');
  
  if (highpassFilter) {
    highpassFilter.freq(freq);
  }
}

function updateFilterRes() {
  let res = filterResSlider.value();
  filterResValue.html(nf(res, 1, 1));
  
  if (highpassFilter) {
    highpassFilter.res(res);
  }
}

function updateReverbDuration() {
  let duration = reverbDurationSlider.value();
  reverbDurationValue.html(duration + ' s');
  
  if (reverb && sound && sound.isLoaded()) {
    reverb.set(duration, 2, false);
    reverb.process(highpassFilter, duration, reverbWetSlider.value());
  }
}

function updateReverbWet() {
  let wet = reverbWetSlider.value();
  reverbWetValue.html(nf(wet, 1, 2));
  
  if (reverb && sound && sound.isLoaded()) {
    reverb.drywet(wet);
  }
}

// Funciones de reset para cada slider
function resetVolume() {
  volumeSlider.value(0.5);
  updateVolume();
}

function resetRate() {
  rateSlider.value(1.0);
  updateRate();
}

function resetPan() {
  panSlider.value(0);
  updatePan();
}

function resetFilterFreq() {
  filterFreqSlider.value(1000);
  updateFilterFreq();
}

function resetFilterRes() {
  filterResSlider.value(1.0);
  updateFilterRes();
}

function resetReverbDuration() {
  reverbDurationSlider.value(3);
  updateReverbDuration();
}

function resetReverbWet() {
  reverbWetSlider.value(0.5);
  updateReverbWet();
}

// Limpiar al cerrar
function windowClosed() {
  if (sound && sound.isPlaying()) {
    sound.stop();
  }
  if (capture) {
    capture.remove();
  }
}
