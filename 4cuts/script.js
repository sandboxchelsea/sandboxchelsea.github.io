const video = document.getElementById('video');
let photos = [];
let photoCount = 0;
const indicators = [
  document.getElementById('indicator1'),
  document.getElementById('indicator2'),
  document.getElementById('indicator3'),
  document.getElementById('indicator4')
];

let stream = null; // To keep track of the video stream

// Access the device camera and stream to video element
function startVideoStream() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(s => {
      stream = s;
      video.srcObject = stream;
    })
    .catch(err => {
      console.error("Error accessing webcam: " + err);
      alert("Could not access the webcam. Please allow camera access.");
    });
}

// Start the video stream when the page loads
startVideoStream();

// Listen for spacebar key press
document.body.onkeyup = function(e){
  if(e.keyCode == 32){
    takePicture();
  }
};

function takePicture() {
  if (photoCount < 4) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Mirror the image on the canvas
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    photos.push(canvas.toDataURL('image/jpeg'));
    indicators[photoCount].classList.add('active');
    photoCount++;
    if (photoCount === 4) {
      generateResult();
    }
  }
}

function generateResult() {
  // Canvas dimensions
  const canvasWidth = 1200;
  const canvasHeight = 800;

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvasWidth;
  finalCanvas.height = canvasHeight;
  const ctx = finalCanvas.getContext('2d');

  // Load bg.jpg and draw it onto the canvas
  const bgImage = new Image();
  bgImage.src = 'bg.jpg';
  bgImage.onload = () => {
    // Draw the background image onto the canvas
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    // After the background is drawn, proceed to draw the photos
    drawPhotos(ctx, finalCanvas);
  };

  bgImage.onerror = () => {
    alert("Background image 'bg.jpg' could not be loaded. Please ensure it is in the correct location.");
  };
}

function drawPhotos(ctx, finalCanvas) {
  const canvasWidth = finalCanvas.width;
  const canvasHeight = finalCanvas.height;
  const margin = 20; // Distance between images
  const gridStartX = 20; // Starting X position of the grid
  const gridStartY = 20; // Starting Y position of the grid

  const gridColumns = 2;
  const gridRows = 2;

  const totalMarginX = margin * (gridColumns - 1);
  const totalMarginY = margin * (gridRows - 1);

  // Calculate available width and height for images within the grid
  const gridWidth = 800 - gridStartX; // Limit grid width to 780px
  const gridHeight = canvasHeight - gridStartY * 2;

  const availableWidth = gridWidth - totalMarginX;
  const availableHeight = gridHeight - totalMarginY;

  const maxPhotoWidth = availableWidth / gridColumns;
  const maxPhotoHeight = availableHeight / gridRows;

  let imagesLoaded = 0;

  for (let i = 0; i < photos.length; i++) {
    const img = new Image();
    img.src = photos[i];
    img.onload = () => {
      // Calculate scaled dimensions while maintaining aspect ratio
      let scale = Math.min(
        maxPhotoWidth / img.width,
        maxPhotoHeight / img.height
      );
      let scaledWidth = img.width * scale;
      let scaledHeight = img.height * scale;

      // Calculate position to center the image within its slot
      const column = i % gridColumns;
      const row = Math.floor(i / gridColumns);

      const slotX = gridStartX + column * (maxPhotoWidth + margin);
      const slotY = gridStartY + row * (maxPhotoHeight + margin);

      const x = slotX + (maxPhotoWidth - scaledWidth) / 2;
      const y = slotY + (maxPhotoHeight - scaledHeight) / 2;

      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      imagesLoaded++;
      if (imagesLoaded === photos.length) {
        addPresetText(ctx, canvasWidth, canvasHeight);
        displayResult(finalCanvas);
      }
    };

    img.onerror = () => {
      alert("An error occurred while loading one of the photos.");
    };
  }
}

function addPresetText(ctx, width, height) {
  // Add preset text at the bottom right in two lines
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Helvetica';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  
  // Split the text into two lines
  const line1 = '20241014';
  const line2 = 'at Understudy, National Theatre';
  
  // Position the text 20px from the right and bottom
  ctx.fillText(line1, width - 20, height - 40); // Year on top
  ctx.fillText(line2, width - 20, height - 20); // Month and day below
}

function displayResult(finalCanvas) {
  // Stop the video stream
  if (stream) {
    let tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
    stream = null;
  }

  // Hide the photo booth screen
  document.getElementById('photo-booth').style.display = 'none';

  // Show the result screen
  const resultContainer = document.getElementById('result-container');
  resultContainer.style.display = 'block';

  // Set the result image
  const resultImage = document.getElementById('result-image');
  resultImage.src = finalCanvas.toDataURL('image/jpeg');

  // Set up the download button
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.onclick = () => {
    const link = document.createElement('a');
    link.href = finalCanvas.toDataURL('image/jpeg');
    link.download = 'final.jpg';
    link.click();
  };
}

// Set up the reset button
const resetBtn = document.getElementById('reset-btn');
resetBtn.onclick = resetApplication;

function resetApplication() {
  // Reset variables
  photos = [];
  photoCount = 0;

  // Reset indicators
  indicators.forEach(indicator => {
    indicator.classList.remove('active');
  });

  // Hide the result screen
  document.getElementById('result-container').style.display = 'none';

  // Show the photo booth screen
  document.getElementById('photo-booth').style.display = 'block';

  // Restart the video stream
  startVideoStream();
}
