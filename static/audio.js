let mediaRecorder;
let audioChunks = [];
let audioBlob;
let currentPreviewURL = null;
let recordStartTime = null;
let recordTimerInterval = null;
let elapsedSeconds = 0;


function startRecording() {
    navigator.mediaDevices.getUserMedia({
        audio: {
            channelCount: 2,
            sampleRate: 16000,
            sampleSize: 16
        }
    })
    .then(stream => {
        const options = {
            audioBitsPerSecond: 16000,
            mimeType: 'audio/webm;codecs=opus'
        };
        mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.start();
        audioChunks = [];
        elapsedSeconds = 0; // reset timer
        const timer = document.getElementById("timer");
        timer.style.display = "inline";
        recordStartTime = Date.now();
        recordTimerInterval = setInterval(updateTimerDisplay, 1000);

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            clearInterval(recordTimerInterval);
            updateTimerDisplay(true);

            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            updateAudioPreviewFromBlob(audioBlob, 'recorded_audio.webm');
        };
        document.getElementById("status").innerText = "Recording...";
    })
    .catch(err => {
        alert('Microphone access denied or error: ' + err);
    });
}

function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        clearInterval(recordTimerInterval);
        document.getElementById("status").innerText = "Paused";
    }
}

function updateTimerDisplay(final = false) {
    const timerDisplay = document.getElementById("timer");
    if (!timerDisplay) return;

    if (final) {
        return;
    }

    elapsedSeconds++;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopRecording() {
    if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
        mediaRecorder.stop();
        clearInterval(recordTimerInterval);
        document.getElementById("status").innerText = "Stopped";
    }
}

function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'flex';
}

function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
}

function previewSelectedFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    updateAudioPreviewFromBlob(file, file.name);
}


function resetAudioUI() {
 
    try {
        if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
            mediaRecorder.stop();
            
        }
    } catch (e) {
      
        console.warn('Error stopping mediaRecorder during reset:', e);
    }

  
    audioBlob = null;

   
    const previewCard = document.getElementById('preview-card');
    const preview = document.getElementById('audio-preview');
    if (preview) {
        preview.pause();
        preview.src = '';
        try { preview.load(); } catch (e) { console.log(e); }
    }
    if (currentPreviewURL) {
        try { URL.revokeObjectURL(currentPreviewURL); } catch (e) { console.log(e); }
        currentPreviewURL = null;
    }
    if (previewCard) previewCard.style.display = 'none';

    
    const fileInput = document.getElementById('audiofile');
    if (fileInput) {
        try { fileInput.value = ''; } catch (e) { console.log(e); }
    }

    
    const outputSection = document.getElementById('output-section');
    if (outputSection) outputSection.style.display = 'none';
    const modelOutput = document.getElementById('model-output');
    if (modelOutput) modelOutput.innerText = '';
    const confidence = document.getElementById('confidence-score');
    if (confidence) confidence.innerText = '';

    
    const nameEl = document.getElementById('audio-filename');
    if (nameEl) nameEl.innerText = '';
    const sizeEl = document.getElementById('audio-size');
    if (sizeEl) sizeEl.innerText = '';

    // Clear status message
    const status = document.getElementById('status');
    if (status) status.innerText = '';

    const timerDisplay = document.getElementById("timer");
    if (timerDisplay) 
        {
            timerDisplay.textContent = "00:00";
            timer.style.display = "none";
        }
}

function updateAudioPreviewFromBlob(blob, filename) {
    const previewCard = document.getElementById('preview-card');
    const preview = document.getElementById('audio-preview');
    const nameEl = document.getElementById('audio-filename');
    const sizeEl = document.getElementById('audio-size');

    if (!preview || !previewCard) return;

    if (currentPreviewURL) {
        URL.revokeObjectURL(currentPreviewURL);
    }
    currentPreviewURL = URL.createObjectURL(blob);
    preview.src = currentPreviewURL;
    previewCard.style.display = 'block';
    nameEl.innerText = filename || (blob.name ? blob.name : 'Audio');
    try {
        sizeEl.innerText = (blob.size / 1024).toFixed(1) + ' KB';
    } catch (e) {
        sizeEl.innerText = '';
    }
}


async function submitAudio(lang, mode) {
    let audioFile = null;
    let flag = null;
    let formData = new FormData();
    document.getElementById("status").innerText = "Analyzing...";

    if (typeof audioBlob !== 'undefined' && audioBlob) {
        audioFile = new File([audioBlob], 'recorded_audio.webm', { type: 'audio/webm' });
        flag = '1';  // recorded
    } 

    else {
        const fileInput = document.getElementById('audiofile');
        if (fileInput && fileInput.files.length > 0) {
            audioFile = fileInput.files[0];
            flag = '2';  // uploaded
        } else {
            alert("Please record or upload an audio file first!");
            return;
        }
    }

  
    const endpoint = (mode === 'dependent')
        ? `/api/analyze_audio/${lang}`
        : '/api/analyze_audio_independent';

    
    formData.append('audio', audioFile);
    formData.append('flag', flag);

    
    showSpinner();

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            displayModelOutput(result);
        } else {
            console.error('Server error:', response.status, await response.text());
            alert(`Server error: ${response.status}. Please try again.`);
        }
    } catch (error) {
        console.error('Network error:', error);
        alert(`Network error: ${error.message}. Please check your connection.`);
    } finally {
         document.getElementById("status").innerText = "";
        hideSpinner();
    }
}


function displayModelOutput(result) {
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'block';
    document.getElementById('model-output').innerText = result.output;
    document.getElementById('confidence-score').innerText = (result.confidence * 100).toFixed(2) + '%';
}
