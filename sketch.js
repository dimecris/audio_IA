// Variables para el audio
let oscilador;
let playing = false;

function setup() {
  // Crear un canvas de 600x400 pixeles
  createCanvas(600, 400);
  
  // Crear un oscilador de sonido
  oscilador = new p5.Oscillator();
  oscilador.setType('sine'); // Tipo de onda: sine, triangle, square, sawtooth
  oscilador.freq(440); // Frecuencia en Hz (La nota A4)
  oscilador.amp(0.5); // Amplitud (volumen)
  
  // Texto de instrucciones
  textAlign(CENTER, CENTER);
  textSize(20);
}

function draw() {
  // Color de fondo
  background(220, 240, 255);
  
  // Dibujar un círculo que cambia de color según el estado
  if (playing) {
    fill(100, 200, 100);
  } else {
    fill(200, 100, 100);
  }
  
  circle(width / 2, height / 2, 150);
  
  // Texto de instrucciones
  fill(0);
  text('Haz clic para reproducir/pausar el sonido', width / 2, height - 50);
  
  // Indicador de estado
  fill(255);
  if (playing) {
    text('▶ REPRODUCIENDO', width / 2, height / 2);
  } else {
    text('⏸ PAUSADO', width / 2, height / 2);
  }
}

function mousePressed() {
  // Alternar entre reproducir y pausar
  if (playing) {
    oscilador.stop();
    playing = false;
  } else {
    oscilador.start();
    playing = true;
  }
}
