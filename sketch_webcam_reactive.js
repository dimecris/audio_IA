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

// Dimensiones base de la webcam
const BASE_WIDTH = 320;
const BASE_HEIGHT = 240;

function preload() {
  // Cargar archivo de audio por defecto
  sound = loadSound('seleccionada.mp3');
}

function setup() {
  let canvas = createCanvas(800, 600);
  canvas.parent('canvas-container');
  
  // Inicializar captura de webcam
  capture = createCapture(VIDEO);
  capture.size(BASE_WIDTH, BASE_HEIGHT);
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
  
  // Obtener nivel de amplitud
  let level = amplitude.getLevel();
  
  // MODIFICACIÓN CLAVE: Las dimensiones de la webcam varían según la amplitud
  // Mapear la amplitud (0-1) a un factor de escala (0.5 a 2.5)
  let scaleFactor = map(level, 0, 0.5, 0.8, 2.5);
  scaleFactor = constrain(scaleFactor, 0.5, 3.0); // Limitar el rango
  
  let webcamWidth = BASE_WIDTH * scaleFactor;
  let webcamHeight = BASE_HEIGHT * scaleFactor;
  
  // Dibujar webcam en la parte superior con tamaño reactivo
  if (capture) {
    push();
    translate(width / 2, 150);
    imageMode(CENTER);
    
    // Aplicar un efecto de brillo basado en la amplitud
    tint(255, 255 - level * 100);
    image(capture, 0, 0, webcamWidth, webcamHeight);
    noTint();
    
    // Marco decorativo alrededor de la webcam con color reactivo
    noFill();
    let hue = map(level, 0, 0.5, 200, 320) % 360;
    colorMode(HSB);
    stroke(hue, 80, 90);
    colorMode(RGB);
    strokeWeight(3 + level * 10);
    rect(-webcamWidth/2, -webcamHeight/2, webcamWidth, webcamHeight);
    
    // Mostrar información de escala
    fill(255, 255, 100);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(`Escala: ${nf(scaleFactor, 1, 2)}x`, 0, webcamHeight/2 + 30);
    
    pop();
  }
  
  // Visualización de audio en la parte inferior
  let audioY = 380;
  
  if (sound && sound.isPlaying()) {
    // Espectro de frecuencias
    let spectrum = fft.analyze();
    
    noStroke();
    
    for (let i = 0; i < spectrum.length; i++) {
      let x = map(i, 0, spectrum.length, 0, width);
      let h = map(spectrum[i], 0, 255, 0, 180);
      let y = audioY + (180 - h);
      
      // Color basado en frecuencia y amplitud
      let hue = map(i, 0, spectrum.length, 180, 280);
      colorMode(HSB);
      fill(hue, 70 + level * 100, 90, 150);
      colorMode(RGB);
      
      rect(x, y, width / spectrum.length, h);
    }
    
    // Nivel de amplitud con barra lateral
    fill(0, 255, 150, 200);
    rect(0, audioY, 25, map(level, 0, 1, 0, 180));
    
    // Indicador visual de amplitud
    fill(255, 200, 0);
    ellipse(width - 30, audioY + 90, 40, 40);
    fill(255, 100, 0);
    let indicatorSize = map(level, 0, 1, 5, 35);
    ellipse(width - 30, audioY + 90, indicatorSize, indicatorSize);
    
    // Texto de información
    fill(255);
    textSize(12);
    textAlign(LEFT, BOTTOM);
    text(`Amplitud: ${nf(level, 1, 3)}`, 30, audioY + 170);
    text(`Dimensiones webcam: ${int(webcamWidth)} x ${int(webcamHeight)}`, 30, audioY + 185);
  } else {
    // Animación "idle" cuando no hay reproducción
    fill(60, 60, 80);
    for (let i = 0; i < 100; i++) {
      let x = i * (width / 100);
      let h = 10 + sin(frameCount * 0.05 + i * 0.2) * 15 + 15;
      rect(x, audioY + 180 - h, width / 100 - 2, h);
    }
    
    // Webcam en tamaño base cuando no hay audio
    fill(255, 255, 100);
    textAlign(CENTER);
    textSize(14);
    text('▶ Reproduce audio para ver la webcam reactiva', width / 2, audioY + 90);
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
