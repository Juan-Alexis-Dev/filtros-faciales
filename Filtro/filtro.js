
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ===== ACTIVAR / DESACTIVAR =====
let showSobel = true;
let showHat = true;
let showGlasses = true;
let showMustache = true;
let showMole = true;

// ===== BOTONES =====
document.getElementById("sobelBtn").onclick = () => toggle("sobelBtn", v => showSobel = v, showSobel);
document.getElementById("hatBtn").onclick = () => toggle("hatBtn", v => showHat = v, showHat);
document.getElementById("glassesBtn").onclick = () => toggle("glassesBtn", v => showGlasses = v, showGlasses);
document.getElementById("mustacheBtn").onclick = () => toggle("mustacheBtn", v => showMustache = v, showMustache);
document.getElementById("moleBtn").onclick = () => toggle("moleBtn", v => showMole = v, showMole);

function toggle(id, setter, value){
  setter(!value);
  document.getElementById(id).classList.toggle("active", !value);
}

// ===== SOMBREROS Y LENTES (EMOJI) =====
const hats = ["🎩","🎓","👒","👑"];
const glasses = ["🕶️","👓","🥽"];
let hatIndex = 0;
let glassesIndex = 0;

function nextHat(){ hatIndex = (hatIndex + 1) % hats.length; }
function nextGlasses(){ glassesIndex = (glassesIndex + 1) % glasses.length; }

// ===== BIGOTES / BARBAS (PNG) =====
const mustaches = [
  "bigote.png",
  "bigote2.png",
  "beard.png",
  "beard2.png"
];
let mustacheIndex = 0;

function nextMustache(){
  mustacheIndex = (mustacheIndex + 1) % mustaches.length;
}

// Precargar imágenes (estables)
const mustacheImages = mustaches.map(src => {
  const img = new Image();
  img.src = src;
  img.loaded = false;
  img.onload = () => img.loaded = true;
  return img;
});

// ===== FILTRO SOBEL =====
function applySobel(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const output = new Uint8ClampedArray(src.length);
  
  // Kernels de Sobel
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const sobelY = [
    [-1, -2, -1],
    [ 0,  0,  0],
    [ 1,  2,  1]
  ];
  
  // Convertir a escala de grises y aplicar Sobel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // Aplicar convolución
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          // Convertir a escala de grises
          const gray = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
          
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }
      
      // Calcular magnitud del gradiente
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outputIdx = (y * width + x) * 4;
      
      // Invertir colores para mejor visualización
      const val = 255 - Math.min(255, magnitude);
      output[outputIdx] = val;     // R
      output[outputIdx + 1] = val; // G
      output[outputIdx + 2] = val; // B
      output[outputIdx + 3] = 255; // A
    }
  }
  
  return new ImageData(output, width, height);
}

// ===== FACEMESH =====
const faceMesh = new FaceMesh({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(results => {
  if (!video.videoWidth) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  // Aplicar filtro Sobel si está activado
  if (showSobel) {
    // Dibujar el video primero
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Obtener los datos de la imagen
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Aplicar el filtro Sobel
    const sobelData = applySobel(imageData);
    
    // Poner la imagen procesada en el canvas
    ctx.putImageData(sobelData, 0, 0);
  }
  
  if (!results.multiFaceLandmarks) return;
  
  for (const landmarks of results.multiFaceLandmarks) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const eyeDist = Math.hypot(
      (rightEye.x - leftEye.x) * canvas.width,
      (rightEye.y - leftEye.y) * canvas.height
    );
    const angle = Math.atan2(
      (rightEye.y - leftEye.y) * canvas.height,
      (rightEye.x - leftEye.x) * canvas.width
    );
    
    // ===== SOMBRERO =====
    if(showHat){
      const topHead = landmarks[10];
      drawEmoji(
        hats[hatIndex],
        topHead.x * canvas.width,
        topHead.y * canvas.height - eyeDist * 1.3,
        eyeDist * 2.2,
        angle
      );
    }
    
    // ===== LENTES =====
    if(showGlasses){
      const bridge = landmarks[168];
      drawEmoji(
        glasses[glassesIndex],
        bridge.x * canvas.width,
        bridge.y * canvas.height,
        eyeDist * 1.8,
        angle
      );
    }
    
    // ===== BIGOTE / BARBA  =====
    if(showMustache){
      const nose = landmarks[2];
      const upperLip = landmarks[13];
      const img = mustacheImages[mustacheIndex];
      const src = mustaches[mustacheIndex];
      if (img.loaded) {
        const isMustache = src.includes("bigote");
        const yOffset = isMustache
          ? eyeDist * 0.10   // BIGOTE más arriba
          : eyeDist * 0.25;  // BARBA sin cambios
        drawImage(
          img,
          nose.x * canvas.width,
          upperLip.y * canvas.height + yOffset,
          eyeDist * 1.5,
          angle
        );
      }
    }
    
    // ===== LUNAR =====
    if(showMole){
      const mole = landmarks[425];
      ctx.beginPath();
      ctx.arc(
        mole.x * canvas.width,
        mole.y * canvas.height,
        eyeDist * 0.05,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = "#000000";  // Color rojo para que se vea sobre Sobel
      ctx.fill();
    }
  }
});

// ===== FUNCIONES DE DIBUJO =====
function drawEmoji(emoji, x, y, size, angle){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji,0,0);
  ctx.restore();
}

function drawImage(img, x, y, size, angle){
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -size/2, -size/2, size, size);
  ctx.restore();
}

// ===== CÁMARA =====
const camera = new Camera(video,{
  onFrame: async () => {
    await faceMesh.send({image: video});
  },
  width: 640,
  height: 480
});
camera.start();
