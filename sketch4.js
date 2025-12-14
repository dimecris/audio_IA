// ============================================================
// REPRODUCTOR DE AUDIO INTERACTIVO CON WEBCAM Y EFECTOS
// ============================================================
// Este sketch implementa un reproductor de audio que integra:
// - Visualización de audio en tiempo real (waveform, spectrum, amplitude)
// - Captura de webcam con escalado reactivo según la amplitud del audio
// - Efectos de imagen aplicables mediante teclado (binarización, negativo, posterización, detección de contornos)
// - Transformaciones geométricas (rotación con teclas A y S)
// - Cadena de efectos de audio: Filtro Pasa-Altos → Reverb
// - Controles mediante sliders para todos los parámetros de audio
//
// CONTROLES:
// - [1] Binarización (umbral 0.3)
// - [2] Negativo
// - [3] Posterización (4 niveles)
// - [4] Detección de contornos
// - [A] Rotación horaria
// - [S] Rotación antihoraria
// Los filtros se pueden combinar manteniendo varias teclas presionadas

// ============================================================
// VARIABLES GLOBALES
// ============================================================

// Variables para el análisis de audio
let sound;              // Objeto p5.SoundFile
let fft;                // Analizador de frecuencias (Fast Fourier Transform)
let amplitude;          // Analizador de amplitud

// Cadena de efectos de audio conectados en serie
let highpassFilter;     // Filtro pasa-altos (elimina frecuencias bajas)
let reverb;             // Efecto de reverberación

// Estado de reproducción del audio
let isPlaying = false;  // True cuando el audio está sonando
let isPaused = false;   // True cuando el audio está pausado

// Captura de webcam
let capture;            // Objeto que captura el video de la cámara

// Referencias a elementos HTML de control
let playStopBtn;        // Botón Play/Stop
let pauseBtn;           // Botón Pause/Resume

// Sliders y valores mostrados para controles básicos de audio
let volumeSlider, rateSlider, panSlider;
let volumeValue, rateValue, panValue;

// Sliders y valores para el filtro pasa-altos
let filterFreqSlider, filterResSlider;
let filterFreqValue, filterResValue;

// Sliders y valores para el efecto reverb
let reverbDurationSlider, reverbWetSlider;
let reverbDurationValue, reverbWetValue;

// Dimensiones del área de visualización de audio
let widthWaveform = 760;    // Ancho completo del canvas
let heightWaveform = 200;   // Altura reservada para visualizaciones

// Objeto que registra qué filtros de imagen están activos
// Cada tecla (1-4) controla un filtro específico
let filtrosPulsados = {
  '1': false,  // Binarización (threshold)
  '2': false,  // Inversión de colores (invert)
  '3': false,  // Posterización (posterize)
  '4': false   // Detección de bordes (edges)
};

// Ángulo acumulado de rotación de la webcam (en radianes)
let anguloRotacion = 0;

// ============================================================
// FUNCIÓN PRELOAD
// ============================================================
// Se ejecuta antes de setup() para cargar recursos pesados
function preload() {
  // Cargar el archivo de audio antes de iniciar
  sound = loadSound('seleccionada.mp3');
}

// ============================================================
// FUNCIÓN SETUP
// ============================================================
// Configuración inicial que se ejecuta una vez al inicio
function setup() {
  // Crear canvas y vincularlo al contenedor HTML
  let canvas = createCanvas(760, 500);
  canvas.parent('canvas-container');
  
  // Configurar modo de ángulos en radianes (más preciso para rotaciones)
  angleMode(RADIANS);
  
  // Inicializar captura de webcam
  capture = createCapture(VIDEO);
  capture.size(320, 240);  // Resolución 4:3
  capture.hide();          // Ocultar elemento HTML de video (lo dibujaremos nosotros)
  
  // Crear analizadores de audio
  fft = new p5.FFT(0.8, 512);      // Suavizado 0.8, 512 muestras
  amplitude = new p5.Amplitude();   // Medidor de volumen
  
  // Crear efectos de audio
  highpassFilter = new p5.HighPass();
  reverb = new p5.Reverb();
  
  // Configuración inicial de efectos sin impacto audible
  // El filtro pasa-altos empieza en 20Hz (rango inaudible para humanos)
  highpassFilter.freq(20);
  highpassFilter.res(0.1);  // Resonancia mínima
  
  // Reverb configurado pero sin mezcla (drywet=0 significa solo señal original)
  reverb.set(3, 2, false);  // duración 3s, decay 2s, sin reverse
  reverb.drywet(0);         // 0 = 100% dry (sin reverb)
  
  // Construir cadena de efectos en serie
  // La señal fluye: sound → highpassFilter → reverb → salida de audio
  sound.disconnect();              // Desconectar salida directa del audio
  sound.connect(highpassFilter);   // Conectar audio al filtro
  reverb.process(highpassFilter);  // Procesar filtro con reverb
  
  // Vincular botones HTML con sus funciones
  playStopBtn = select('#playStopBtn');
  pauseBtn = select('#pauseBtn');
  
  playStopBtn.mousePressed(togglePlayStop);
  pauseBtn.mousePressed(togglePause);
  
  // Vincular sliders de controles básicos
  volumeSlider = select('#volumeSlider');
  rateSlider = select('#rateSlider');
  panSlider = select('#panSlider');
  
  // Vincular spans que muestran los valores numéricos
  volumeValue = select('#volumeValue');
  rateValue = select('#rateValue');
  panValue = select('#panValue');
  
  // Vincular eventos input de los sliders
  volumeSlider.input(updateVolume);
  rateSlider.input(updateRate);
  panSlider.input(updatePan);
  
  // Vincular sliders del filtro pasa-altos
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

// ============================================================
// FUNCIÓN DRAW
// ============================================================
// Loop principal que se ejecuta 60 veces por segundo
function draw() {
  background(30, 30, 50);
  
  // Actualizar rotación según teclas presionadas
  // keyIsDown() permite detectar teclas mantenidas (no solo pulsadas)
  if (keyIsDown(65)) { // ASCII 65 = 'A' o 'a'
    anguloRotacion += 0.02;  // Incremento horario
  }
  
  if (keyIsDown(83)) { // ASCII 83 = 'S' o 's'
    anguloRotacion -= 0.02;  // Incremento antihorario
  }
  
  // Verificar que el audio esté cargado y listo
  if (sound && sound.isLoaded()) {
    
    // Dibujar visualizaciones de audio en la parte inferior del canvas
    push();
    translate(0, height - heightWaveform);  // Mover origen a la parte inferior
    
    drawWaveform();   // Forma de onda temporal
    drawSpectrum();   // Espectro de frecuencias
    drawAmplitude();  // Nivel de amplitud
    
    pop();
    
    // Dibujar webcam con todos los efectos aplicados
    drawWebcam();
    
  } else {
    // Si el audio no está cargado, mostrar solo la webcam estática
    push();
    imageMode(CENTER);
    image(capture, width/2, 340, 320, 240);
    pop();
  }
}

// ============================================================
// FUNCIÓN DRAWWEBCAM
// ============================================================
// Dibuja la webcam con escala reactiva, filtros y rotación
function drawWebcam() {
  // Obtener nivel actual de amplitud del audio (0.0 a 1.0)
  let level = amplitude.getLevel();
  
  // Mapear amplitud a factor de escala
  // Amplitud 0 → escala 1.0 (tamaño normal)
  // Amplitud 0.3 → escala 1.5 (50% más grande)
  let scale = map(level, 0, 0.3, 1, 1.5);
  scale = constrain(scale, 1, 1.5);  // Limitar escala al rango
  
  // Dimensiones base de la webcam (proporción 4:3)
  let baseWidth = 320;
  let baseHeight = 240;
  
  // Calcular nuevas dimensiones manteniendo proporción
  let webcamWidth = baseWidth * scale;
  let webcamHeight = baseHeight * scale;
  
  // Centrar la webcam en el canvas
  let webcamX = (width - webcamWidth) / 2;
  let webcamY = (height - webcamHeight) / 2;
  
  // Verificar si hay algún filtro activo
  // Usamos OR para comprobar si al menos uno está en true
  const hayFiltros =
    filtrosPulsados['1'] ||
    filtrosPulsados['2'] ||
    filtrosPulsados['3'] ||
    filtrosPulsados['4'];

  let img;
  
  if (!hayFiltros) {
    // Sin filtros: usar captura directa (más eficiente)
    img = capture;
  } else {
    // Con filtros: crear copia del frame actual
    // capture.get() crea una nueva imagen p5.Image
    img = capture.get();

    // Aplicar filtros en orden secuencial
    // Cada filtro modifica la imagen que ya fue procesada por el anterior
    if (filtrosPulsados['1']) {
      // THRESHOLD: convierte a blanco/negro según umbral
      img.filter(THRESHOLD, 0.3);  // 0.3 = 30% de brillo como umbral
    }

    if (filtrosPulsados['2']) {
      // INVERT: invierte los colores (negativo fotográfico)
      img.filter(INVERT);
    }

    if (filtrosPulsados['3']) {
      // POSTERIZE: reduce la paleta de colores a N niveles
      img.filter(POSTERIZE, 4);  // 4 niveles de color por canal
    }

    if (filtrosPulsados['4']) {
      // Detección de bordes (implementación manual con Sobel)
      applyEdgeDetection(img);
    }
  }
  
  // Dibujar webcam con transformación de rotación
  push();
  
  // Trasladar origen al centro de la webcam
  translate(webcamX + webcamWidth/2, webcamY + webcamHeight/2);
  
  // Aplicar rotación acumulada
  rotate(anguloRotacion);
  
  // Dibujar imagen centrada en el nuevo origen
  imageMode(CENTER);
  image(img, 0, 0, webcamWidth, webcamHeight);
  
  pop();
  
  // Dibujar marco reactivo alrededor de la webcam (también rotado)
  push();
  noFill();
  
  // Color y grosor del marco varían con la amplitud
  stroke(100, 200, 255, map(level, 0, 0.3, 50, 255));  // Alpha reactivo
  strokeWeight(map(level, 0, 0.3, 2, 8));               // Grosor reactivo
  
  // Aplicar mismas transformaciones que a la imagen
  translate(webcamX + webcamWidth/2, webcamY + webcamHeight/2);
  rotate(anguloRotacion);
  rectMode(CENTER);
  rect(0, 0, webcamWidth, webcamHeight);
  
  pop();
  
  // Mostrar información textual debajo de la webcam
  fill(255);
  textSize(12);
  textAlign(CENTER);
  
  // Mostrar factor de escala actual
  text('Escala Webcam: ' + nf(scale, 1, 2) + 'x', width/2, webcamY + webcamHeight + 20);
  
  // Mostrar ángulo de rotación en grados
  let anguloGrados = degrees(anguloRotacion) % 360;  // Convertir radianes a grados
  if (anguloGrados < 0) anguloGrados += 360;         // Normalizar a 0-360
  text('Rotación: ' + nf(anguloGrados, 1, 1) + '°', width/2, webcamY + webcamHeight + 35);
  
  // Construir lista de filtros activos
  let filtrosActivosTexto = [];

  if (filtrosPulsados['1']) filtrosActivosTexto.push('[1] Binarización');
  if (filtrosPulsados['2']) filtrosActivosTexto.push('[2] Negativo');
  if (filtrosPulsados['3']) filtrosActivosTexto.push('[3] Posterización');
  if (filtrosPulsados['4']) filtrosActivosTexto.push('[4] Contornos');

  // Mostrar mensaje según si hay filtros activos o no
  let textoFinal =
    filtrosActivosTexto.length === 0
      ? 'Ninguno (mantén pulsadas 1, 2, 3 o 4)'
      : filtrosActivosTexto.join(' + ');  // Unir con '+' si hay varios
  
  fill(0, 255, 150);
  textAlign(CENTER);
  text('Efecto: ' + textoFinal, width/2, webcamY + webcamHeight + 50);
  
  // Mostrar controles de rotación
  fill(255, 200, 100);
  text('Rotación: [A] Horario | [S] Antihorario', width/2, webcamY + webcamHeight + 65);
}

// ============================================================
// FUNCIÓN APPLYEDGEDETECTION
// ============================================================
// Implementa detección de bordes usando el operador Sobel
// p5.js no tiene un filtro nativo para esto, por eso se hace manualmente
function applyEdgeDetection(img) {
  img.loadPixels();
  
  // Crear copia del array de píxeles para no modificar mientras leemos
  let pixels = [...img.pixels];
  let w = img.width;
  let h = img.height;
  
  // Matrices del operador Sobel
  // Sobel X detecta cambios horizontales (bordes verticales)
  let sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  // Sobel Y detecta cambios verticales (bordes horizontales)
  let sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  // Recorrer imagen (evitando bordes de 1 píxel)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0;  // Gradiente horizontal
      let gy = 0;  // Gradiente vertical
      
      // Aplicar convolución 3x3 con ambas matrices
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          // Calcular índice del píxel vecino
          let idx = ((y + ky) * w + (x + kx)) * 4;
          
          // Convertir RGB a escala de grises (promedio simple)
          let brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          
          // Acumular contribuciones a los gradientes
          gx += brightness * sobelX[ky + 1][kx + 1];
          gy += brightness * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Calcular magnitud del gradiente (teorema de Pitágoras)
      let magnitude = sqrt(gx * gx + gy * gy);
      magnitude = constrain(magnitude, 0, 255);
      
      // Escribir resultado en escala de grises
      let idx = (y * w + x) * 4;
      img.pixels[idx] = magnitude;      // R
      img.pixels[idx + 1] = magnitude;  // G
      img.pixels[idx + 2] = magnitude;  // B
      // Alpha (idx+3) se mantiene sin cambios
    }
  }
  
  img.updatePixels();
}

// ============================================================
// FUNCIONES DE VISUALIZACIÓN DE AUDIO
// ============================================================

// Dibujar forma de onda temporal
function drawWaveform() {
  let waveform = fft.waveform();  // Array de -1 a 1 con forma de onda
  
  noFill();
  stroke(100, 200, 255);
  strokeWeight(2);
  
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, widthWaveform);
    let y = map(waveform[i], -1, 1, 10, 60);  // Mapear a rango vertical
    vertex(x, y);
  }
  endShape();
}

// Dibujar espectro de frecuencias (barras)
function drawSpectrum() {
  let spectrum = fft.analyze();  // Array de 0 a 255 con energía por frecuencia
  
  noStroke();
  fill(255, 100, 200, 100);
  
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, widthWaveform);
    let h = map(spectrum[i], 0, 255, 0, 150);  // Altura de barra
    let y = heightWaveform - h;  // Anclar desde abajo
    
    rect(x, y, widthWaveform / spectrum.length, h);
  }
}

// Dibujar indicador de nivel de amplitud
function drawAmplitude() {
  let level = amplitude.getLevel();  // 0.0 a 1.0
  let levelHeight = map(level, 0, 1, 0, 180);
  
  // Barra vertical que crece con la amplitud
  fill(0, 255, 150, 150);
  noStroke();
  rect(0, heightWaveform - levelHeight, 10, levelHeight);
  
  // Mostrar valor numérico
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  text('Nivel: ' + nf(level, 1, 3), 15, 10);
}

// ============================================================
// FUNCIONES DE CONTROL DE REPRODUCCIÓN
// ============================================================

function togglePlayStop() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, carga un archivo de audio primero');
    return;
  }
  
  if (!isPlaying) {
    // Iniciar reproducción
    sound.play();
    isPlaying = true;
    isPaused = false;
    playStopBtn.html('⏹ Stop');
  } else {
    // Detener reproducción y resetear todo
    sound.stop();
    isPlaying = false;
    isPaused = false;
    playStopBtn.html('▶ Play');
    
    resetAllControls();  // Volver todos los sliders a valores iniciales
    
    pauseBtn.html('⏸ Pausa');
    anguloRotacion = 0;  // Resetear rotación
  }
}

// Resetear todos los controles a sus valores por defecto
function resetAllControls() {
  resetVolume();
  resetRate();
  resetPan();
  resetFilterFreq();
  resetFilterRes();
  resetReverbDuration();
  resetReverbWet();
}

function togglePause() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, carga un archivo de audio primero');
    return;
  }
  
  if (!isPlaying) {
    return;  // No hacer nada si no está sonando
  }
  
  if (isPaused) {
    // Reanudar reproducción
    sound.play();
    isPaused = false;
    pauseBtn.html('⏸ Pausa');
  } else {
    // Pausar reproducción
    sound.pause();
    isPaused = true;
    pauseBtn.html('▶ Reanudar');
  }
}

// ============================================================
// FUNCIONES DE ACTUALIZACIÓN DE PARÁMETROS
// ============================================================
// Estas funciones se ejecutan cuando el usuario mueve los sliders

function updateVolume() {
  let vol = volumeSlider.value();
  volumeValue.html(nf(vol, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.setVolume(vol);  // 0.0 a 1.0
  }
}

function updateRate() {
  let rate = rateSlider.value();
  rateValue.html(nf(rate, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.rate(rate);  // 0.5 a 2.0 (velocidad de reproducción)
  }
}

function updatePan() {
  let pan = panSlider.value();
  panValue.html(nf(pan, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.pan(pan);  // -1.0 (izq) a 1.0 (der)
  }
}

function updateFilterFreq() {
  let freq = filterFreqSlider.value();
  filterFreqValue.html(freq + ' Hz');
  
  if (highpassFilter) {
    highpassFilter.freq(freq);  // Frecuencia de corte del filtro
  }
}

function updateFilterRes() {
  let res = filterResSlider.value();
  filterResValue.html(nf(res, 1, 1));
  
  if (highpassFilter) {
    highpassFilter.res(res);  // Resonancia (Q factor)
  }
}

function updateReverbDuration() {
  let duration = reverbDurationSlider.value();
  reverbDurationValue.html(duration + ' s');
  
  if (reverb) {
    let currentWet = reverbWetSlider.value();
    
    // Recrear reverb con nueva duración (decay = mitad de duración)
    reverb.set(duration, duration/2, false); 
    reverb.drywet(currentWet);  // Restaurar nivel wet/dry
  }
}

function updateReverbWet() {
  let wet = reverbWetSlider.value();
  reverbWetValue.html(nf(wet, 1, 2));
  
  if (reverb) {
    // drywet: 0 = solo original, 1 = solo reverb
    reverb.drywet(wet);
  }
}

// ============================================================
// FUNCIONES DE RESET DE PARÁMETROS
// ============================================================
// Se ejecutan al presionar los botones de reset (↻)

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
  filterFreqSlider.value(20);
  updateFilterFreq();
}

function resetFilterRes() {
  filterResSlider.value(0.1);
  updateFilterRes();
}

function resetReverbDuration() {
  reverbDurationSlider.value(3);
  updateReverbDuration();
}

function resetReverbWet() {
  reverbWetSlider.value(0);
  updateReverbWet();
}

// ============================================================
// FUNCIONES DE EVENTOS DE TECLADO
// ============================================================

// Se ejecuta cuando se presiona una tecla
function keyPressed() {
  // Verificar si la tecla presionada está en nuestro objeto de filtros
  if (filtrosPulsados[key] !== undefined) {
    filtrosPulsados[key] = true;  // Activar filtro
  }
}

// Se ejecuta cuando se suelta una tecla
function keyReleased() {
  // Verificar si la tecla soltada está en nuestro objeto de filtros
  if (filtrosPulsados[key] !== undefined) {
    filtrosPulsados[key] = false;  // Desactivar filtro
  }
}


