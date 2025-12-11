// Variables de audio
let sonido;

// Efectos en serie
let filtro;
let reverb;

// Sliders
let volumenSlider;
let velocidadSlider;
let panSlider;
let frecuenciaSlider;
let resonanciaSlider;
// Sliders del Reverb
let reverbDurationSlider;
let reverbDecaySlider;

// Botones
let playStopBtn;
let pausaBtn;

function preload() {
  soundFormats('mp3');
  sonido = loadSound('audio');
}

function setup() {
  createCanvas(400, 550);
  
  
  // Crear filtro pasa-altos
  filtro = new p5.HighPass();
  
  // Crear reverb
  reverb = new p5.Reverb();
  
  // Conectar en serie: sonido -> filtro -> reverb -> salida
  sonido.disconnect();
  sonido.connect(filtro);
  filtro.connect(reverb);
  
  crearBotones();
  crearSliders();
}

function crearBotones() {
  // Botón Play/Stop
  playStopBtn = createButton('Play');
  playStopBtn.position(20, 20);
  playStopBtn.mousePressed(togglePlayStop);
  
  // Botón Pausa
  pausaBtn = createButton('Pausa');
  pausaBtn.position(80, 20);
  pausaBtn.mousePressed(togglePausa);
  pausaBtn.attribute('disabled', '');
}

function crearSliders() {
  let yPos = 80;
  
  // Slider de Volumen (0 a 1)
  createP('Volumen').position(20, yPos);
  volumenSlider = createSlider(0, 100, 50);
  volumenSlider.position(20, yPos + 25);
  volumenSlider.input(actualizarVolumen);
  
  // Slider de Velocidad (0.5 a 2)
  yPos += 70;
  createP('Velocidad').position(20, yPos);
  velocidadSlider = createSlider(50, 200, 100);
  velocidadSlider.position(20, yPos + 25);
  velocidadSlider.input(actualizarVelocidad);
  
  // Slider de Panorámica (-1 a 1)
  yPos += 70;
  createP('Panorámica').position(20, yPos);
  panSlider = createSlider(-100, 100, 0);
  panSlider.position(20, yPos + 25);
  panSlider.input(actualizarPan);
  
  // === EFECTO 1: FILTRO PASA-ALTOS ===
  yPos += 70;
  createP('--- Filtro Pasa-Altos ---').position(20, yPos).style('font-weight', 'bold');
  
  // Slider de Frecuencia de corte (10 a 22050 Hz)
  yPos += 30;
  createP('Frecuencia de corte').position(20, yPos);
  frecuenciaSlider = createSlider(10, 22050, 5000);
  frecuenciaSlider.position(20, yPos + 25);
  frecuenciaSlider.input(actualizarFrecuencia);
  
  // Slider de Resonancia (0.001 a 1000)
  yPos += 70;
  createP('Resonancia').position(20, yPos);
  resonanciaSlider = createSlider(1, 1000, 1);
  resonanciaSlider.position(20, yPos + 25);
  resonanciaSlider.input(actualizarResonancia);
  
  // === EFECTO 2: REVERB ===
  yPos += 70;
  createP('--- Reverb ---').position(20, yPos).style('font-weight', 'bold');
  
  // Slider de Duración (1 a 10 segundos)
  yPos += 30;
  createP('Duración').position(20, yPos);
  reverbDurationSlider = createSlider(1, 10, 3);
  reverbDurationSlider.position(20, yPos + 25);
  reverbDurationSlider.input(actualizarReverbDuration);
  
  // Slider de Decay (0 a 100%)
  yPos += 70;
  createP('Decay').position(20, yPos);
  reverbDecaySlider = createSlider(0, 100, 20);
  reverbDecaySlider.position(20, yPos + 25);
  reverbDecaySlider.input(actualizarReverbDecay);
}

function draw() {
  background(240, 100, 100); 
  
  // Mostrar valores
  fill(0);
  textAlign(RIGHT);
  let yPos = 105;
  text(volumenSlider.value() + '%', 250, yPos);
  text((velocidadSlider.value() / 100).toFixed(2) + 'x', 250, yPos + 70);
  text((panSlider.value() / 100).toFixed(2), 250, yPos + 140);
  
  // Valores del filtro
  text(frecuenciaSlider.value() + ' Hz', 250, yPos + 240);
  text(resonanciaSlider.value(), 250, yPos + 310);
  
  // Valores del reverb
  text(reverbDurationSlider.value() + ' s', 250, yPos + 410);
  text(reverbDecaySlider.value() + '%', 250, yPos + 480);
}

// Funciones de control

function togglePlayStop() {
  // Si está pausado o parado, reproducir
  if (!sonido.isPlaying() && !sonido.isPaused()) {
    sonido.play();
    playStopBtn.html('Stop');
    pausaBtn.removeAttribute('disabled');
    pausaBtn.html('Pausa');
  } 
  // Si está reproduciendo o pausado, detener
  else {
    sonido.stop();
    playStopBtn.html('Play');
    pausaBtn.html('Pausa');
    pausaBtn.attribute('disabled', '');
  }
}

function togglePausa() {
  if (sonido.isPlaying()) {
    sonido.pause();
    pausaBtn.html('Reanudar');
  } else if (sonido.isPaused()) {
    sonido.play();
    pausaBtn.html('Pausa');
  }
}

function actualizarVolumen() {
  sonido.setVolume(volumenSlider.value() / 100);
}

function actualizarVelocidad() {
  sonido.rate(velocidadSlider.value() / 100);
}

function actualizarPan() {
  sonido.pan(panSlider.value() / 100);
}

// Funciones del Filtro Pasa-Altos
function actualizarFrecuencia() {
  filtro.freq(frecuenciaSlider.value());
}

function actualizarResonancia() {
  filtro.res(resonanciaSlider.value());
}

// Funciones del Reverb
function actualizarReverbDuration() {
  reverb.set(
    reverbDurationSlider.value(),
    reverbDecaySlider.value() / 100
  );
}

function actualizarReverbDecay() {
  reverb.set(
    reverbDurationSlider.value(),
    reverbDecaySlider.value() / 100
  );
}
