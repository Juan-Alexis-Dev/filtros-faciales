
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('output');
    const canvasCtx = canvasElement.getContext('2d');

    const WIDTH = 640;
    const HEIGHT = 480;
    const DPR = window.devicePixelRatio || 1;

    // Ajustar canvas correctamente (CLAVE)
    canvasElement.width = WIDTH * DPR;
    canvasElement.height = HEIGHT * DPR;
    canvasElement.style.width = WIDTH + "px";
    canvasElement.style.height = HEIGHT + "px";
    canvasCtx.scale(DPR, DPR);

    // Inicializar FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);

    function onResults(results) {
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          for (const point of landmarks) {
            const x = point.x * WIDTH;
            const y = point.y * HEIGHT;

            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 1.5, 0, 2 * Math.PI);
            canvasCtx.fillStyle = "118d11";
            canvasCtx.fill();
          }
        }
      }
    }

    // Cámara
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: WIDTH,
      height: HEIGHT
    });

    camera.start();
  