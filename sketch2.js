// ============================================================
// REPRODUCTOR DE AUDIO CON VISUALIZACIONES Y EFECTOS
// ============================================================
// Este sketch implementa un reproductor de audio con tres tipos
// de visualizaciones en tiempo real:
// - Forma de onda (waveform)
// - Espectro de frecuencias
// - Nivel de amplitud
//
// Incluye una cadena de efectos de audio en serie:
// sound → Filtro Pasa-Altos → Reverb → salida
//
// Todos los parámetros son controlables mediante sliders:
// volumen, velocidad, panorámica, frecuencia de corte, resonancia,
// duración del reverb y mezcla wet/dry.

// Variables para el audio y efectos
let sound;
let fft;
let amplitude;

// Efectos en serie: Filtro Pasa-Altos -> Reverb
let highpassFilter;
let reverb;

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
  let canvas = createCanvas(760, 200);
  canvas.parent('canvas-container');
  
  // Inicializar analizadores de audio
  fft = new p5.FFT(0.8, 512);
  amplitude = new p5.Amplitude();
  
  // Crear efectos
  // 1. Filtro pasa-altos (Highpass)
  highpassFilter = new p5.HighPass();
  
  // 2. Reverb (efecto adicional)
  reverb = new p5.Reverb();
  
  // **CONFIGURACIÓN INICIAL SIN EFECTOS AUDIBLES:**
  // Filtro en frecuencia muy baja (no filtra nada audible)
  highpassFilter.freq(20); // Frecuencia de corte en 20 Hz
  highpassFilter.res(0.1); // Resonancia mínima
  
  reverb.set(3, 2, false);    // Duración, decay, reverse
  reverb.drywet(0);           // Sin reverb inicialmente
  
  // Cadena de efectos: sound → highpassFilter → reverb → salida
  sound.disconnect();
  sound.connect(highpassFilter);
  reverb.process(highpassFilter);
  
  // Vincular elementos HTML
  playStopBtn = select('#playStopBtn');
  pauseBtn = select('#pauseBtn');
  
  // Botones
  playStopBtn.mousePressed(togglePlayStop);
  pauseBtn.mousePressed(togglePause);
  
  // Vincular sliders básicos
  volumeSlider = select('#volumeSlider');
  rateSlider = select('#rateSlider');
  panSlider = select('#panSlider');
  
  volumeValue = select('#volumeValue');
  rateValue = select('#rateValue');
  panValue = select('#panValue');
  
  volumeSlider.input(updateVolume);
  rateSlider.input(updateRate);
  panSlider.input(updatePan);
  
  // Vincular sliders del filtro
  filterFreqSlider = select('#filterFreqSlider');
  filterResSlider = select('#filterResSlider');
  
  filterFreqValue = select('#filterFreqValue');
  filterResValue = select('#filterResValue');
  
  filterFreqSlider.input(updateFilterFreq);
  filterResSlider.input(updateFilterRes);
  
  // Vincular sliders del reverb
  reverbDurationSlider = select('#reverbDurationSlider');
  reverbWetSlider = select('#reverbWetSlider');
  
  reverbDurationValue = select('#reverbDurationValue');
  reverbWetValue = select('#reverbWetValue');
  
  reverbDurationSlider.input(updateReverbDuration);
  reverbWetSlider.input(updateReverbWet);
  
  background(30);
}

function draw() {
  background(30, 30, 50);
  
  if (sound && sound.isLoaded()) {
    drawWaveform();
    
    // Visualización de espectro de frecuencias
    drawSpectrum();
    
    // Nivel de amplitud
    drawAmplitude();
  } 
}

function drawWaveform() {
  let waveform = fft.waveform();
  
  noFill();
  stroke(100, 200, 255);
  strokeWeight(2);
  
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height * 0.3, height * 0.7);
    vertex(x, y);
  }
  endShape();
}

function drawSpectrum() {
  let spectrum = fft.analyze(); // Obtiene el espectro de frecuencias
  // Lo hace a traves de p5.FFT
  
  noStroke();
  fill(255, 100, 200, 150);
  
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width); //mapear x
    let h = map(spectrum[i], 0, 255, 0, height * 0.8); //mapear altura
    let y = height - h;
    
    rect(x, y, width / spectrum.length, h); //dibujar barra
  }
}

function drawAmplitude() {
  let level = amplitude.getLevel();
  let levelHeight = map(level, 0, 1, 0, height);
  
  fill(0, 255, 150, 100);
  noStroke();
  rect(0, height - levelHeight, 10, levelHeight);
  
  // Mostrar valor numérico
  fill(255);
  textSize(12);
  textAlign(LEFT, BOTTOM);
  text('Nivel: ' + nf(level, 1, 3), 15, height - 10);
}



function togglePlayStop() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, carga un archivo de audio primero');
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
    
    // Al hacer stop, resetear todos los controles
    resetAllControls();
    
    // Reiniciar también el botón de pausa
    pauseBtn.html('⏸ Pausa');
  }
}

// Nueva función para reiniciar todos los controles
function resetAllControls() {
  // Reiniciar controles básicos
  resetVolume();
  resetRate();
  resetPan();
  
  // Reiniciar filtro pasa-altos
  resetFilterFreq();
  resetFilterRes();
  
  // Reiniciar reverb
  resetReverbDuration();
  resetReverbWet();
}

function togglePause() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, carga un archivo de audio primero');
    return;
  }
  
  if (!isPlaying) {
    return; // No se puede pausar si no está reproduciendo
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

// Actualización de parámetros

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
  
  if (reverb) {
    // Obtener el valor actual de drywet para mantenerlo
    let currentWet = reverbWetSlider.value();
    
    // Recrear el reverb con la nueva duración
    // El segundo parámetro es el decay time (usaremos la mitad de la duración)
    reverb.set(duration, duration/2, false); 
    
    // Restaurar el nivel de wet/dry
    reverb.drywet(currentWet);
  }
}

function updateReverbWet() {
  let wet = reverbWetSlider.value();
  reverbWetValue.html(nf(wet, 1, 2));
  
  if (reverb) {
    reverb.drywet(wet);
  }
}

// Funciones de reset

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
  filterFreqSlider.value(20); // Valor inicial sin filtrado audible
  updateFilterFreq();
}

function resetFilterRes() {
  filterResSlider.value(0.1); // Resonancia mínima
  updateFilterRes();
}

function resetReverbDuration() {
  reverbDurationSlider.value(3);
  updateReverbDuration();
}

function resetReverbWet() {
  reverbWetSlider.value(0); // Sin efecto de reverb
  updateReverbWet();
}


