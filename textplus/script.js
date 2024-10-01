// Speech recognition variables
let recognition;
let isListening = false;

// Audio processing variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let bufferLength;

// Volume tracking variables
let currentRMS = 0;
let weightedAvg = 0;
const volumeSmoothing = 0.2;
const volumeThreshold = 0.0005;

// Dynamic range variables
let dynamicMin = Infinity;
let dynamicMax = -Infinity;
const dynamicRangeAlpha = 0.05;

// Font size variables
const minFontSize = 12;
const maxFontSize = 72;

// Volume history
const volumeHistory = [];
const volumeHistorySize = 100;

// Calibration variables
let isCalibrating = false;
let calibrationData = [];
const calibrationDuration = 3000; // 3 seconds

// Logging variables
let logData = [];

// DOM elements
const toggleBtn = document.getElementById('toggleBtn');
const clearBtn = document.getElementById('clearBtn');
const dataBtn = document.getElementById('dataBtn');
const copyDataBtn = document.getElementById('copyDataBtn');
const status = document.getElementById('status');
const interimSpeech = document.getElementById('interimSpeech');
const dynamicText = document.getElementById('dynamicText');
const rawData = document.getElementById('rawData');
const dataContainer = document.getElementById('dataContainer');
const volumeCircle = document.getElementById('volumeCircle');

// Initialize speech recognition
function initSpeechRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = handleRecognitionResult;
    recognition.onend = handleRecognitionEnd;
    recognition.onerror = handleRecognitionError;
}

// Initialize audio context and analyser
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Float32Array(bufferLength);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            updateAudioData();
        })
        .catch(err => console.error('Error accessing microphone:', err));
}

// Update audio data and volume metrics
function updateAudioData() {
    requestAnimationFrame(updateAudioData);
    analyser.getFloatTimeDomainData(dataArray);
    
    currentRMS = calculateRMS(dataArray);
    weightedAvg = weightedAvg * (1 - volumeSmoothing) + currentRMS * volumeSmoothing;

    // Update volume history
    volumeHistory.push(weightedAvg);
    if (volumeHistory.length > volumeHistorySize) {
        volumeHistory.shift();
    }

    if (isCalibrating) {
        calibrationData.push(weightedAvg);
    } else {
        // Update dynamic range
        if (weightedAvg > volumeThreshold) {
            if (dynamicMin === Infinity) {
                dynamicMin = weightedAvg;
                dynamicMax = weightedAvg;
            } else {
                dynamicMin = Math.min(dynamicMin, weightedAvg);
                dynamicMax = Math.max(dynamicMax, weightedAvg);
            }
            
            dynamicMin = dynamicMin * (1 - dynamicRangeAlpha) + weightedAvg * dynamicRangeAlpha;
            dynamicMax = dynamicMax * (1 - dynamicRangeAlpha) + weightedAvg * dynamicRangeAlpha;
        }

        // Ensure minimum range
        if (dynamicMax - dynamicMin < volumeThreshold) {
            dynamicMax = dynamicMin + volumeThreshold;
        }
    }

    updateVolumeCircle();
}

// Calculate RMS (Root Mean Square) of audio data
function calculateRMS(data) {
    const sum = data.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / data.length);
}

// Update volume circle size based on current volume
function updateVolumeCircle() {
    const volume = Math.max(0, Math.min(1, (weightedAvg - dynamicMin) / (dynamicMax - dynamicMin)));
    const minRadius = 10;
    const maxRadius = 50;
    const radius = minRadius + (maxRadius - minRadius) * volume;
    volumeCircle.setAttribute('r', radius);
}

// Calculate font size based on volume
function calculateFontSize(volume) {
    const normalizedVolume = Math.max(0, Math.min(1, (volume - dynamicMin) / (dynamicMax - dynamicMin)));
    return minFontSize + (maxFontSize - minFontSize) * Math.pow(normalizedVolume, 0.5);
}

// Handle speech recognition results
function handleRecognitionResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
            finalTranscript += transcript;
            interimSpeech.innerHTML = '';
        } else {
            interimTranscript += transcript;
        }
    }

    if (interimTranscript !== '') {
        displayInterimSpeech(interimTranscript);
    }

    if (finalTranscript) {
        addWords(finalTranscript);
    }
}

// Display interim speech
function displayInterimSpeech(transcript) {
    const words = transcript.trim().split(/\s+/);
    interimSpeech.innerHTML = '';

    const avgVolume = calculateAverageVolume();
    const fontSize = calculateFontSize(avgVolume);

    words.forEach(word => {
        if (word) {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.style.fontSize = `${fontSize}px`;
            interimSpeech.appendChild(span);
        }
    });
}

// Add recognized words to the display
function addWords(transcript) {
    const words = transcript.trim().split(/\s+/);
    const recentVolumes = volumeHistory.slice(-words.length);

    words.forEach((word, index) => {
        if (word) {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            
            const wordVolume = recentVolumes[index] || weightedAvg;
            const fontSize = calculateFontSize(wordVolume);
            span.style.fontSize = `${fontSize}px`;
            dynamicText.appendChild(span);

            logData.push({
                word,
                fontSize,
                volume: wordVolume,
                dynamicMin,
                dynamicMax,
                weightedAvg
            });
        }
    });

    dynamicText.scrollTop = dynamicText.scrollHeight;
}

// Calculate average volume from history
function calculateAverageVolume() {
    return volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
}

// Handle recognition end event
function handleRecognitionEnd() {
    if (isListening) {
        recognition.start();
    }
}

// Handle recognition error
function handleRecognitionError(event) {
    console.error('Speech recognition error', event.error);
    stopListening();
}

// Start listening
function startListening() {
    isCalibrating = true;
    calibrationData = [];
    setTimeout(() => {
        isCalibrating = false;
        const sortedCalibration = calibrationData.sort((a, b) => a - b);
        const calibrationLength = sortedCalibration.length;
        dynamicMin = sortedCalibration[Math.floor(calibrationLength * 0.1)]; // 10th percentile
        dynamicMax = sortedCalibration[Math.floor(calibrationLength * 0.9)]; // 90th percentile
        recognition.start();
        isListening = true;
        toggleBtn.textContent = 'Stop Listening';
        status.textContent = 'Listening...';
    }, calibrationDuration);

    status.textContent = 'Calibrating...';
}

// Stop listening
function stopListening() {
    recognition.stop();
    isListening = false;
    toggleBtn.textContent = 'Start Listening';
    status.textContent = 'Not listening';
}

// Clear display
function clearDisplay() {
    dynamicText.innerHTML = '';
    interimSpeech.innerHTML = '';
    rawData.value = '';
    dataContainer.style.display = 'none';
    dynamicMin = Infinity;
    dynamicMax = -Infinity;
    volumeHistory.length = 0;
    logData = [];
}

// Toggle data display
function toggleDataDisplay() {
    const display = dataContainer.style.display;
    dataContainer.style.display = display === 'none' ? 'block' : 'none';
    if (display === 'none') {
        updateRawData();
    }
}

// Update raw data display
function updateRawData() {
    const jsonData = JSON.stringify(logData, null, 2);
    rawData.value = jsonData;
}

// Copy data to clipboard
function copyDataToClipboard() {
    updateRawData();
    rawData.select();
    document.execCommand('copy');
    alert('Data copied to clipboard!');
}

// Event listeners
toggleBtn.addEventListener('click', () => {
    if (!recognition) {
        initSpeechRecognition();
        initAudio();
    }
    isListening ? stopListening() : startListening();
});

clearBtn.addEventListener('click', clearDisplay);
dataBtn.addEventListener('click', toggleDataDisplay);
copyDataBtn.addEventListener('click', copyDataToClipboard);

// Initialize
initSpeechRecognition();
initAudio();