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
// - Alternancia entre webcam y video con tecla V
//
// CONTROLES:
// - [1] Binarización (umbral 0.3)
// - [2] Negativo
// - [3] Posterización (4 niveles)
// - [4] Detección de contornos
// - [A] Rotación horaria
// - [S] Rotación antihoraria
// - [V] Alternar entre Webcam/Video
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
let distortion;         // Efecto de distorsión

// Estado de reproducción del audio
let isPlaying = false;  // True cuando el audio está sonando
let isPaused = false;   // True cuando el audio está pausado

// Captura de webcam y video
let capture;            // Objeto que captura el video de la cámara
let videoFile;          // Video cargado desde archivo
let mostrarWebcam = true; // True = webcam, False = video archivo

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

// Sliders y valores para el efecto distorsión
let distortionSlider;
let distortionValue;

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
  
  // Cargar el video desde archivo
  videoFile = createVideo('seleccion.mp4');
}

// ============================================================
// FUNCIÓN SETUP
// ============================================================
function setup() {
  let canvas = createCanvas(760, 500);
  canvas.parent('canvas-container');
  
  angleMode(RADIANS);
  
  // Inicializar captura de webcam sin forzar tamaño específico
  // Dejamos que use su resolución nativa
  capture = createCapture(VIDEO);
  capture.hide();
  
  // Configurar video archivo sin forzar tamaño
  // Mantendrá su resolución original (1280x720)
  videoFile.loop();
  videoFile.volume(0);  // Silenciar
  videoFile.hide();
  
  // Crear analizadores de audio
  fft = new p5.FFT(0.8, 512);      // Suavizado 0.8, 512 muestras
  amplitude = new p5.Amplitude();   // Medidor de volumen
  
  // Crear efectos de audio
  highpassFilter = new p5.HighPass();
  reverb = new p5.Reverb();
  distortion = new p5.Distortion();
  
  // Configuración inicial de efectos sin impacto audible
  // El filtro pasa-altos empieza en 20Hz (rango inaudible para humanos)
  highpassFilter.freq(20);
  highpassFilter.res(0.1);  // Resonancia mínima
  
  // Reverb configurado pero sin mezcla (drywet=0 significa solo señal original)
  reverb.set(3, 2, false);  // duración 3s, decay 2s, sin reverse
  reverb.drywet(0);         // 0 = 100% dry (sin reverb)
  
  // Distorsión configurada pero desactivada
  distortion.amp(0);        // Amplitud de distorsión en 0 (silencio)
  
  // Construir cadena de efectos en serie
  // La señal fluye: sound → highpassFilter → reverb → salida de audio
  sound.disconnect();              // Desconectar salida directa del audio
  sound.connect(highpassFilter);   // Conectar audio al filtro
  reverb.process(highpassFilter);  // Procesar filtro con reverb
  distortion.process(reverb);      // Procesar reverb con distorsión
  
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
  
  // Vincular sliders de la distorsión
  distortionSlider = select('#distortionSlider');
  distortionValue = select('#distortionValue');
  
  distortionSlider.input(updateDistortion);
  
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
    
    // Dibujar webcam o video con todos los efectos aplicados
    drawWebcam();
    
  } else {
    // Si el audio no está cargado, mostrar solo la fuente de video estática
    let videoActual = mostrarWebcam ? capture : videoFile;
    push();
    imageMode(CENTER);
    image(videoActual, width/2, 340, 320, 240);
    pop();
  }
}

// ============================================================
// FUNCIÓN DRAWWEBCAM
// ============================================================
// Dibuja la webcam o video con escala reactiva, filtros y rotación
function drawWebcam() {
  // Obtener nivel actual de amplitud del audio (0.0 a 1.0)
  let level = amplitude.getLevel();
  
  // Mapear amplitud a factor de escala
  let scale = map(level, 0, 0.3, 1, 1.5);
  scale = constrain(scale, 1, 1.5);
  
  // Seleccionar fuente de video según el estado
  let videoActual = mostrarWebcam ? capture : videoFile;
  
  // Calcular dimensiones responsivas manteniendo relación de aspecto
  let dimensiones = calcularDimensionesVideo(videoActual);
  
  // Si no se pudieron calcular dimensiones, salir
  if (!dimensiones) {
    fill(255);
    textAlign(CENTER, CENTER);
    text("Cargando video...", width / 2, height / 2);
    return;
  }
  
  // Aplicar escala reactiva a las dimensiones calculadas
  let displayWidth = dimensiones.width * scale;
  let displayHeight = dimensiones.height * scale;
  
  // Centrar en el canvas
  let displayX = (width - displayWidth) / 2;
  let displayY = (height - displayHeight) / 2;
  
  // Verificar si hay algún filtro activo
  const hayFiltros =
    filtrosPulsados['1'] ||
    filtrosPulsados['2'] ||
    filtrosPulsados['3'] ||
    filtrosPulsados['4'];

  let img;
  
  if (!hayFiltros) {
    img = videoActual;
  } else {
    img = videoActual.get();

    if (filtrosPulsados['1']) {
      img.filter(THRESHOLD, 0.3);
    }

    if (filtrosPulsados['2']) {
      img.filter(INVERT);
    }

    if (filtrosPulsados['3']) {
      img.filter(POSTERIZE, 4);
    }

    if (filtrosPulsados['4']) {
      applyEdgeDetection(img);
    }
  }
  
  // Dibujar video con transformación de rotación
  push();
  
  translate(displayX + displayWidth/2, displayY + displayHeight/2);
  rotate(anguloRotacion);
  
  imageMode(CENTER);
  image(img, 0, 0, displayWidth, displayHeight);
  
  pop();
  
  // Dibujar marco reactivo
  push();
  noFill();
  stroke(100, 200, 255, map(level, 0, 0.3, 50, 255));
  strokeWeight(map(level, 0, 0.3, 2, 8));
  
  translate(displayX + displayWidth/2, displayY + displayHeight/2);
  rotate(anguloRotacion);
  rectMode(CENTER);
  rect(0, 0, displayWidth, displayHeight);
  
  pop();
  infoEfectos(scale)
  }

// ============================================================
// FUNCIÓN PARA CALCULAR DIMENSIONES RESPONSIVAS
// ============================================================
// Calcula el tamaño óptimo del video manteniendo su relación de aspecto original
// sin deformarlo, ajustándolo a un ancho máximo de 460px
function calcularDimensionesVideo(video) {
  
  // Verificar que el video esté cargado y tenga dimensiones válidas
  if (!video || video.width <= 0 || video.height <= 0) {
    return null;
  }
  
  // Obtener dimensiones reales del video
  let videoWidth = video.width;
  let videoHeight = video.height;
  
  // Calcular relación de aspecto original
  let aspectRatio = videoWidth / videoHeight;
  
  // Definir ancho máximo permitido
  let maxWidth = 380;
  
  // Calcular dimensiones finales manteniendo la proporción
  let finalWidth = maxWidth;
  let finalHeight = maxWidth / aspectRatio;
  
  // Opcional: limitar la altura máxima
  let maxHeight = 380;
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = maxHeight * aspectRatio;
  }
  
  // Retornar objeto con las dimensiones calculadas
  return {
    width: finalWidth,
    height: finalHeight,
    aspectRatio: aspectRatio
  };
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
  resetDistortion();
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

function updateDistortion() {
  let dist = distortionSlider.value();
  distortionValue.html(nf(dist, 1, 2));
  
  if (distortion) {
    // Amplitud de la distorsión (0 = silencio, 1 = sin distorsión, >1 = más distorsión)
    distortion.amp(dist);
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

function resetDistortion() {
  distortionSlider.value(0);
  updateDistortion();
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
  
  // Tecla V para alternar entre webcam y video
  if (key === 'v' || key === 'V') {
    mostrarWebcam = !mostrarWebcam;  // Cambiar estado
  }
}

// Se ejecuta cuando se suelta una tecla
function keyReleased() {
  // Verificar si la tecla soltada está en nuestro objeto de filtros
  if (filtrosPulsados[key] !== undefined) {
    filtrosPulsados[key] = false;  // Desactivar filtro
  }
}

function infoEfectos(scale) {
  // Información textual
  fill(255);
  textSize(12);
  textAlign(CENTER);
  
  
  let anguloGrados = degrees(anguloRotacion) % 360;
  if (anguloGrados < 0) anguloGrados += 360;
  text('Escala: ' + nf(scale, 1, 2) + 'x | ' + 'Rotación: ' + nf(anguloGrados, 1, 1) + '°', width/2, height - 40);
  
  let filtrosActivosTexto = [];
  if (filtrosPulsados['1']) filtrosActivosTexto.push('[1] Binarización');
  if (filtrosPulsados['2']) filtrosActivosTexto.push('[2] Negativo');
  if (filtrosPulsados['3']) filtrosActivosTexto.push('[3] Posterización');
  if (filtrosPulsados['4']) filtrosActivosTexto.push('[4] Contornos');

  let textoFinal = filtrosActivosTexto.length === 0
      ? 'Ninguno (mantén pulsadas 1, 2, 3 o 4)'
      : filtrosActivosTexto.join(' + ');
  
  fill(0, 255, 150);
  text('Efecto: ' + textoFinal, width/2, height - 25);
  
  fill(255, 200, 100);
  text('Rotación: [A] Horario | [S] Antihorario | [V] Cambiar Webcam/Video', width/2, height - 10);

}


