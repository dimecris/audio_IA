// Kris Darias  - Diciembre 2025
// Proyecto 2 - PEC 2 Ejercicio 5 - UOC Grado Multimedia
// ============================================================
// REPRODUCTOR DE AUDIO INTERACTIVO CON WEBCAM Y EFECTOS
// ============================================================
// Este sketch implementa un reproductor de audio que integra:
// - Visualización de audio en tiempo real (waveform, spectrum, amplitude)
// - Captura de webcam con escalado reactivo según la amplitud del audio
// - Efectos de imagen aplicables mediante teclado (binarización, negativo, posterización, detección de contornos)
// - Transformaciones geométricas (rotación con teclas A y S)
// - Cadena de efectos de audio: Filtro Pasa-Altos → Reverb → Distorsión
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

// Análisis de audio
let sound;              // Objeto de audio cargado desde archivo
let fft;                // Analizador de frecuencias para el espectro
let amplitude;          // Analizador de volumen/amplitud

// Efectos de audio conectados en cadena
let highpassFilter;     // Filtro que elimina frecuencias bajas
let reverb;             // Añade reverberación/eco al sonido
let distortion;         // Distorsión para efectos más agresivos

// Control de reproducción
let isPlaying = false;
let isPaused = false;
let audioContextStarted = false;  // Flag para gestionar políticas del navegador

// Video: webcam y archivo
let capture;            // Captura en vivo de la webcam
let videoFile;          // Video pregrabado cargado desde archivo
let mostrarWebcam = true;  // Controla qué fuente se muestra

// Controles HTML
let playStopBtn;
let pauseBtn;

// Sliders básicos
let volumeSlider, rateSlider, panSlider;
let volumeValue, rateValue, panValue;

// Sliders del filtro
let filterFreqSlider, filterResSlider;
let filterFreqValue, filterResValue;

// Sliders del reverb
let reverbDurationSlider, reverbWetSlider;
let reverbDurationValue, reverbWetValue;

// Slider de distorsión
let distortionSlider;
let distortionValue;

// Dimensiones para visualización
let widthWaveform = 760;    // Ancho del canvas
let heightWaveform = 200;   // Espacio reservado para gráficos de audio

// Estado de los filtros de imagen
// Cada número representa un filtro activable con el teclado
let filtrosPulsados = {
  '1': false,  // Threshold
  '2': false,  // Invert
  '3': false,  // Posterize
  '4': false   // Edge detection
};

// Rotación acumulada
let anguloRotacion = 0;  // Se modifica continuamente con teclas A y S

// ============================================================
// PRELOAD
// ============================================================
function preload() {
  // Carga el archivo antes de iniciar para evitar problemas
  sound = loadSound('seleccionada.mp3');
}

// ============================================================
// SETUP
// ============================================================
function setup() {
  let canvas = createCanvas(760, 500);
  canvas.parent('canvas-container');
  
  // Necesario hacer clic para iniciar audio por políticas del navegador
  // Chrome y otros bloquean autoplay de audio
  canvas.mousePressed(startAudioContext);
  
  angleMode(RADIANS);
  
  // Iniciar webcam (se oculta porque se dibujará en el canvas)
  capture = createCapture(VIDEO);
  capture.hide();
  
  // Cargar video y reproducirlo automáticamente cuando esté listo
  videoFile = createVideo('seleccion.mp4', vidLoad);
  videoFile.volume(0);  // Silenciar el video
  videoFile.hide();
  
  // Configurar analizadores
  // FFT: analiza frecuencias para crear espectro
  // 0.8 = suavizado, 512 = número de muestras
  fft = new p5.FFT(0.8, 512);
  amplitude = new p5.Amplitude();
  
  // Crear cadena de efectos
  highpassFilter = new p5.HighPass();
  reverb = new p5.Reverb();
  distortion = new p5.Distortion();
  
  // Valores iniciales sin efecto audible
  // 20Hz está por debajo del rango de audición humana
  highpassFilter.freq(20);
  highpassFilter.res(0.1);
  
  // Reverb configurado pero sin mezcla (drywet = 0)
  reverb.set(3, 2, false);  // 3s duración, 2s decay
  reverb.drywet(0);         // 0 = sin reverb, 1 = solo reverb
  
  distortion.amp(0);  // Sin distorsión inicial
  
  // Conectar efectos en serie: sound → highpass → reverb → distortion
  // La señal fluye de uno a otro procesándose en cada paso
  sound.disconnect();
  sound.connect(highpassFilter);
  reverb.process(highpassFilter);
  distortion.process(reverb);
  
  // Vincular botones HTML con sus funciones
  playStopBtn = select('#playStopBtn');
  pauseBtn = select('#pauseBtn');
  
  playStopBtn.mousePressed(togglePlayStop);
  pauseBtn.mousePressed(togglePause);
  
  // Vincular sliders básicos
  volumeSlider = select('#volumeSlider');
  rateSlider = select('#rateSlider');
  panSlider = select('#panSlider');
  
  volumeValue = select('#volumeValue');
  rateValue = select('#rateValue');
  panValue = select('#panValue');
  
  // Los eventos .input() se disparan mientras arrastras el slider
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
  
  // Vincular slider de distorsión
  distortionSlider = select('#distortionSlider');
  distortionValue = select('#distortionValue');
  
  distortionSlider.input(updateDistortion);
  
  background(30);
}

// ============================================================
// CALLBACK DEL VIDEO
// ============================================================
function vidLoad() {
  console.log('Video cargado correctamente');
  // El video se inicia automáticamente al cargarse
  // loop() hace que se repita infinitamente
  videoFile.loop();
  console.log('Video iniciado automáticamente');
}

// ============================================================
// INICIAR AUDIOCONTEXT
// ============================================================
// Chrome requiere interacción del usuario para iniciar audio
// Esta función se ejecuta al hacer clic en el canvas
function startAudioContext() {
  if (!audioContextStarted) {
    userStartAudio();  // Función de p5.sound para activar el contexto
    audioContextStarted = true;
    console.log('AudioContext iniciado');
  }
}

// ============================================================
// DRAW
// ============================================================
function draw() {
  background(30, 30, 50);
  
  // Rotación continua con teclas mantenidas
  // keyIsDown() detecta si una tecla está presionada (no solo pulsada)
  if (keyIsDown(65)) {  // A
    anguloRotacion += 0.02;
  }
  
  if (keyIsDown(83)) {  // S
    anguloRotacion -= 0.02;
  }
  
  // Solo dibujar visualizaciones si el audio está cargado
  if (sound && sound.isLoaded()) {
    
    // Mover el origen al inicio de la zona de visualizaciones
    push();
    translate(0, height - heightWaveform);
    
    // Dibujar las tres visualizaciones de audio
    drawWaveform();   // Forma de onda temporal
    drawSpectrum();   // Espectro de frecuencias
    drawAmplitude();  // Nivel de volumen
    
    pop();
    
    // Dibujar la fuente de video (webcam o archivo)
    drawWebcam();
    
  } else {
    // Mientras carga el audio, mostrar solo el video
    let videoActual = mostrarWebcam ? capture : videoFile;
    push();
    imageMode(CENTER);
    image(videoActual, width/2, 340, 320, 240);
    pop();
  }
}

// ============================================================
// DIBUJAR WEBCAM/VIDEO
// ============================================================
function drawWebcam() {
  let level = amplitude.getLevel();
  
  // Escala reactiva según volumen
  // map() convierte el nivel (0-0.3) a una escala (1-1.5)
  let scale = map(level, 0, 0.3, 1, 1.5);
  scale = constrain(scale, 1, 1.5);
  
  // Seleccionar qué fuente mostrar
  let videoActual = mostrarWebcam ? capture : videoFile;
  
  // Debug cada segundo para verificar estado
  if (frameCount % 60 === 0) {
    console.log('Fuente actual:', mostrarWebcam ? 'WEBCAM' : 'VIDEO');
    if (!mostrarWebcam && videoFile) {
      console.log('Estado video:', {
        width: videoFile.width,
        height: videoFile.height,
        duration: videoFile.duration(),
        time: videoFile.time()
      });
    }
  }
  
  // Calcular dimensiones manteniendo la proporción
  let dimensiones = calcularDimensionesVideo(videoActual);
  
  if (!dimensiones) {
    fill(255);
    textAlign(CENTER, CENTER);
    text(mostrarWebcam ? "Cargando webcam..." : "Cargando video...", width / 2, height / 2);
    return;
  }
  
  // Aplicar escala reactiva a las dimensiones
  let displayWidth = dimensiones.width * scale;
  let displayHeight = dimensiones.height * scale;
  
  // Centrar en el canvas
  let displayX = (width - displayWidth) / 2;
  let displayY = (height - displayHeight) / 2;
  
  // Verificar si hay filtros activos
  // Usamos OR (||) para comprobar si al menos uno está activo
  const hayFiltros =
    filtrosPulsados['1'] ||
    filtrosPulsados['2'] ||
    filtrosPulsados['3'] ||
    filtrosPulsados['4'];

  let img;
  
  if (!hayFiltros) {
    // Sin filtros, usar imagen original
    img = videoActual;
  } else {
    // Con filtros, crear una copia para no modificar el original
    img = videoActual.get();

    // Aplicar cada filtro activo
    if (filtrosPulsados['1']) {
      img.filter(THRESHOLD, 0.3);  // Binariza con umbral 0.3
    }

    if (filtrosPulsados['2']) {
      img.filter(INVERT);  // Invierte los colores
    }

    if (filtrosPulsados['3']) {
      img.filter(POSTERIZE, 4);  // Reduce a 4 niveles de color
    }

    if (filtrosPulsados['4']) {
      applyEdgeDetection(img);  // Detección de bordes personalizada
    }
  }
  
  // Dibujar con rotación
  push();
  
  // Mover al centro de donde queremos dibujar
  translate(displayX + displayWidth/2, displayY + displayHeight/2);
  rotate(anguloRotacion);
  
  imageMode(CENTER);
  image(img, 0, 0, displayWidth, displayHeight);
  
  pop();
  
  // Marco decorativo reactivo al audio
  // La opacidad y grosor varían con el volumen
  push();
  noFill();
  stroke(100, 200, 255, map(level, 0, 0.3, 50, 255));
  strokeWeight(map(level, 0, 0.3, 2, 8));
  
  translate(displayX + displayWidth/2, displayY + displayHeight/2);
  rotate(anguloRotacion);
  rectMode(CENTER);
  rect(0, 0, displayWidth, displayHeight);
  
  pop();
  
  // Mostrar información de estado
  infoEfectos(scale);
}

// ============================================================
// CALCULAR DIMENSIONES DEL VIDEO
// ============================================================
// Mantiene la relación de aspecto y ajusta al espacio disponible
function calcularDimensionesVideo(video) {
  
  if (!video || video.width <= 0 || video.height <= 0) {
    return null;
  }
  
  let videoWidth = video.width;
  let videoHeight = video.height;
  let aspectRatio = videoWidth / videoHeight;
  
  // Definir tamaño máximo
  let maxWidth = 380;
  let finalWidth = maxWidth;
  let finalHeight = maxWidth / aspectRatio;
  
  // Limitar también la altura si es necesario
  let maxHeight = 380;
  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = maxHeight * aspectRatio;
  }
  
  return {
    width: finalWidth,
    height: finalHeight,
    aspectRatio: aspectRatio
  };
}

// ============================================================
// DETECCIÓN DE CONTORNOS
// ============================================================
// Implementación del operador Sobel para detectar bordes
// Detecta cambios bruscos de intensidad (bordes) en la imagen
function applyEdgeDetection(img) {
  img.loadPixels();
  
  // Copiar píxeles para no modificar mientras leemos
  let pixels = [...img.pixels];
  let w = img.width;
  let h = img.height;
  
  // Kernels de Sobel (matrices de convolución)
  // Sobel X detecta cambios horizontales
  let sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  // Sobel Y detecta cambios verticales
  let sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  // Procesar cada pixel (excepto bordes del 1px)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0;  // Gradiente horizontal
      let gy = 0;  // Gradiente vertical
      
      // Convolución 3x3: multiplicar vecinos por el kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          let idx = ((y + ky) * w + (x + kx)) * 4;
          
          // Convertir a escala de grises (promedio RGB)
          let brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          
          gx += brightness * sobelX[ky + 1][kx + 1];
          gy += brightness * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Magnitud del gradiente (Pitágoras)
      // Cuanto mayor, más fuerte es el borde
      let magnitude = sqrt(gx * gx + gy * gy);
      magnitude = constrain(magnitude, 0, 255);
      
      // Escribir resultado en escala de grises
      let idx = (y * w + x) * 4;
      img.pixels[idx] = magnitude;
      img.pixels[idx + 1] = magnitude;
      img.pixels[idx + 2] = magnitude;
    }
  }
  
  img.updatePixels();
}

// ============================================================
// VISUALIZACIONES DE AUDIO
// ============================================================

function drawWaveform() {
  // Obtener forma de onda (array de -1 a 1)
  let waveform = fft.waveform();
  
  noFill();
  stroke(100, 200, 255);
  strokeWeight(2);
  
  beginShape();
  for (let i = 0; i < waveform.length; i++) {
    // Mapear índice a posición X
    let x = map(i, 0, waveform.length, 0, widthWaveform);
    // Mapear valor de onda a posición Y
    let y = map(waveform[i], -1, 1, 10, 60);
    vertex(x, y);
  }
  endShape();
}

function drawSpectrum() {
  // Obtener espectro de frecuencias (array de 0 a 255)
  let spectrum = fft.analyze();
  
  noStroke();
  fill(255, 100, 200, 100);
  
  // Dibujar cada barra de frecuencia
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, widthWaveform);
    let h = map(spectrum[i], 0, 255, 0, 150);
    let y = heightWaveform - h;
    
    rect(x, y, widthWaveform / spectrum.length, h);
  }
}

function drawAmplitude() {
  // Obtener nivel de amplitud actual
  let level = amplitude.getLevel();
  let levelHeight = map(level, 0, 1, 0, 180);
  
  // Barra vertical que crece con el volumen
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
// CONTROLES DE REPRODUCCIÓN
// ============================================================

function togglePlayStop() {
  if (!sound || !sound.isLoaded()) {
    alert('Por favor, carga un archivo de audio primero');
    return;
  }
  
  // Asegurar que AudioContext está activo
  startAudioContext();
  
  if (!isPlaying) {
    sound.play();
    
    // Asegurar que el video esté activo
    if (videoFile && (videoFile.time() === 0 || videoFile.elt.paused)) {
      videoFile.loop();
      console.log('Video reiniciado junto con audio');
    }
    
    isPlaying = true;
    isPaused = false;
    playStopBtn.html('⏹ Stop');
  } else {
    sound.stop();
    
    // El video sigue reproduciéndose independientemente del audio
    
    isPlaying = false;
    isPaused = false;
    playStopBtn.html('▶ Play');
    
    // Restaurar todos los controles a valores por defecto
    resetAllControls();
    
    pauseBtn.html('⏸ Pausa');
    anguloRotacion = 0;  // Resetear rotación
    
    console.log('Audio detenido (video sigue reproduciéndose)');
  }
}

function resetAllControls() {
  // Llamar a todas las funciones de reset
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
    return;  // No hacer nada si no está reproduciendo
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

// ============================================================
// ACTUALIZACIÓN DE PARÁMETROS
// ============================================================
// Estas funciones se ejecutan mientras arrastras los sliders

function updateVolume() {
  let vol = volumeSlider.value();
  volumeValue.html(nf(vol, 1, 2));  // Actualizar texto mostrado
  
  if (sound && sound.isLoaded()) {
    sound.setVolume(vol);  // 0.0 = silencio, 1.0 = máximo
  }
}

function updateRate() {
  let rate = rateSlider.value();
  rateValue.html(nf(rate, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.rate(rate);  // 0.5 = mitad velocidad, 2.0 = doble velocidad
  }
}

function updatePan() {
  let pan = panSlider.value();
  panValue.html(nf(pan, 1, 2));
  
  if (sound && sound.isLoaded()) {
    sound.pan(pan);  // -1.0 = izquierda, 0 = centro, 1.0 = derecha
  }
}

function updateFilterFreq() {
  let freq = filterFreqSlider.value();
  filterFreqValue.html(freq + ' Hz');
  
  if (highpassFilter) {
    // Frecuencia de corte: elimina todo por debajo
    highpassFilter.freq(freq);
  }
}

function updateFilterRes() {
  let res = filterResSlider.value();
  filterResValue.html(nf(res, 1, 1));
  
  if (highpassFilter) {
    // Resonancia: enfatiza la frecuencia de corte
    highpassFilter.res(res);
  }
}

function updateReverbDuration() {
  let duration = reverbDurationSlider.value();
  reverbDurationValue.html(duration + ' s');
  
  if (reverb) {
    let currentWet = reverbWetSlider.value();
    // Recrear reverb con nueva duración
    reverb.set(duration, duration/2, false); 
    reverb.drywet(currentWet);  // Mantener nivel wet
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
    // Cantidad de distorsión aplicada
    distortion.amp(dist);
  }
}

// ============================================================
// RESET DE PARÁMETROS
// ============================================================
// Restaurar cada parámetro a su valor por defecto

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
// EVENTOS DE TECLADO
// ============================================================

function keyPressed() {
  // Activar filtros de imagen
  if (filtrosPulsados[key] !== undefined) {
    filtrosPulsados[key] = true;
  }
  
  // Cambiar entre webcam y video
  if (key === 'v' || key === 'V') {
    mostrarWebcam = !mostrarWebcam;  // Toggle booleano
    
    if (videoFile) {
      if (mostrarWebcam) {
        console.log('Mostrando WEBCAM (video sigue en background)');
      } else {
        console.log('Mostrando VIDEO');
        // Asegurar que el video esté reproduciéndose
        if (videoFile.time() === 0 || videoFile.elt.paused) {
          videoFile.loop();
        }
      }
    }
  }
}

function keyReleased() {
  // Desactivar filtros al soltar tecla
  if (filtrosPulsados[key] !== undefined) {
    filtrosPulsados[key] = false;
  }
}

// ============================================================
// INFORMACIÓN EN PANTALLA
// ============================================================
function infoEfectos(scale) {
  fill(255);
  textSize(12);
  textAlign(CENTER);
  
  // Mostrar escala y rotación actual
  let anguloGrados = degrees(anguloRotacion) % 360;
  if (anguloGrados < 0) anguloGrados += 360;
  text('Escala: ' + nf(scale, 1, 2) + 'x | ' + 'Rotación: ' + nf(anguloGrados, 1, 1) + '°', width/2, height - 40);
  
  // Construir texto con filtros activos
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
  
  // Instrucciones de uso
  fill(255, 200, 100);
  text('Rotación: [A] Horario | [S] Antihorario | [V] Cambiar Webcam/Video', width/2, height - 10);
}


