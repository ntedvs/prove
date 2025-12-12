/**
 * Main Application Logic - Simplified
 */

// Global state
const state = {
    recorder: null,
    recordingTimer: null,
    refreshInterval: null,
    status: null
};

// DOM Elements
const elements = {
    recordBtn: document.getElementById('record-btn'),
    stopBtn: document.getElementById('stop-btn'),
    playBtn: document.getElementById('play-btn'),
    uploadBtn: document.getElementById('upload-btn'),
    recordingStatus: document.getElementById('recording-status'),
    recordingTimer: document.getElementById('recording-timer'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    currentProfile: document.getElementById('current-profile'),
    trainingStatus: document.getElementById('training-status'),
    synthesizeBtn: document.getElementById('synthesize-btn'),
    synthesisText: document.getElementById('synthesis-text'),
    synthesisStatus: document.getElementById('synthesis-status'),
    synthesisHelp: document.getElementById('synthesis-help'),
    audioPlayers: document.getElementById('audio-players'),
    playersContainer: document.getElementById('players-container'),
    samplesList: document.getElementById('samples-list'),
    toast: document.getElementById('toast')
};

/**
 * Initialize the application
 */
async function init() {
    state.recorder = new AudioRecorder();

    setupEventListeners();
    await refreshData();

    // Start auto-refresh
    state.refreshInterval = setInterval(refreshData, 3000);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    elements.recordBtn.addEventListener('click', startRecording);
    elements.stopBtn.addEventListener('click', stopRecording);
    elements.playBtn.addEventListener('click', playRecording);
    elements.uploadBtn.addEventListener('click', uploadRecording);
    elements.synthesizeBtn.addEventListener('click', synthesizeSpeech);
}

/**
 * Start recording audio
 */
async function startRecording() {
    try {
        await state.recorder.startRecording();

        // Update UI
        elements.recordBtn.disabled = true;
        elements.stopBtn.disabled = false;
        elements.playBtn.disabled = true;
        elements.uploadBtn.disabled = true;
        elements.recordingStatus.textContent = 'Recording...';
        elements.recordingStatus.className = 'status-message status-recording';

        // Start timer
        state.recordingTimer = setInterval(updateTimer, 100);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Stop recording
 */
async function stopRecording() {
    await state.recorder.stopRecording();

    // Stop timer
    if (state.recordingTimer) {
        clearInterval(state.recordingTimer);
        state.recordingTimer = null;
    }

    // Update UI
    elements.recordBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.playBtn.disabled = false;
    elements.uploadBtn.disabled = false;
    elements.recordingStatus.textContent = 'Recording complete. Play to review or upload to train.';
    elements.recordingStatus.className = 'status-message status-success';
}

/**
 * Play recorded audio
 */
function playRecording() {
    try {
        state.recorder.playRecording();
        showToast('Playing recording...', 'info');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Upload recording to backend
 */
async function uploadRecording() {
    const blob = state.recorder.getBlob();
    if (!blob) {
        showToast('No recording to upload', 'error');
        return;
    }

    try {
        elements.uploadBtn.disabled = true;
        elements.recordingStatus.textContent = 'Uploading...';
        elements.recordingStatus.className = 'status-message status-processing';

        const result = await API.uploadAudio(blob);

        showToast('Upload successful! Training model...', 'success');

        // Clear recorder
        state.recorder.clear();
        elements.playBtn.disabled = true;
        elements.uploadBtn.disabled = true;
        elements.recordingStatus.textContent = 'Ready to record another sample';
        elements.recordingStatus.className = 'status-message';
        elements.recordingTimer.textContent = '00:00';

        // Refresh data
        await refreshData();
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
        elements.uploadBtn.disabled = false;
        elements.recordingStatus.textContent = 'Upload failed. Try again.';
        elements.recordingStatus.className = 'status-message status-error';
    }
}

/**
 * Synthesize speech from text
 */
async function synthesizeSpeech() {
    const text = elements.synthesisText.value.trim();

    if (!text) {
        showToast('Please enter some text to synthesize', 'error');
        return;
    }

    try {
        elements.synthesizeBtn.disabled = true;
        elements.synthesisStatus.textContent = 'Generating speech...';
        elements.synthesisStatus.className = 'status-message status-processing';

        // Synthesize
        const audioBlob = await API.synthesize(text);

        // Create audio player
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Show player
        elements.playersContainer.innerHTML = `
            <div class="audio-player">
                <span class="profile-badge">Your Voice</span>
                <audio controls src="${audioUrl}"></audio>
            </div>
        `;
        elements.audioPlayers.style.display = 'block';

        elements.synthesisStatus.textContent = 'Speech generated! Click play below.';
        elements.synthesisStatus.className = 'status-message status-success';
        elements.synthesizeBtn.disabled = false;

        // Auto-play
        audio.play();
    } catch (error) {
        showToast('Synthesis failed: ' + error.message, 'error');
        elements.synthesisStatus.textContent = 'Synthesis failed. ' + error.message;
        elements.synthesisStatus.className = 'status-message status-error';
        elements.synthesizeBtn.disabled = false;
    }
}

/**
 * Update recording timer
 */
function updateTimer() {
    const duration = state.recorder.getDuration();
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    elements.recordingTimer.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Refresh data from backend
 */
async function refreshData() {
    try {
        const status = await API.getStatus();
        state.status = status;

        updateUI(status);
    } catch (error) {
        console.error('Failed to refresh data:', error);
    }
}

/**
 * Update UI based on status
 */
function updateUI(status) {
    const audioCount = status.audio_count || 0;
    const trainingStatus = status.status || 'idle';

    // Update progress bar (show audio count)
    const progress = Math.min(100, audioCount * 20); // Each file = 20%
    elements.progressBar.style.width = `${progress}%`;
    elements.progressText.textContent = `${audioCount} audio files uploaded`;

    // Update training status badge
    const statusMap = {
        'idle': { text: 'Waiting for audio', class: 'badge-gray' },
        'training': { text: 'Training...', class: 'badge-info' },
        'ready': { text: 'Ready', class: 'badge-success' },
        'error': { text: 'Error', class: 'badge-danger' }
    };

    const statusInfo = statusMap[trainingStatus] || statusMap['idle'];
    elements.trainingStatus.textContent = statusInfo.text;
    elements.trainingStatus.className = `badge ${statusInfo.class}`;

    // Update current profile badge
    if (audioCount > 0) {
        elements.currentProfile.textContent = `Voice Model (${audioCount} samples)`;
        elements.currentProfile.className = 'badge badge-success';
    } else {
        elements.currentProfile.textContent = 'No audio yet';
        elements.currentProfile.className = 'badge badge-gray';
    }

    // Enable/disable synthesis
    const canSynthesize = trainingStatus === 'ready' && audioCount > 0;
    elements.synthesisText.disabled = !canSynthesize;
    elements.synthesizeBtn.disabled = !canSynthesize;

    if (canSynthesize) {
        elements.synthesisHelp.textContent = 'Enter text and click Generate to hear your voice!';
    } else if (trainingStatus === 'training') {
        elements.synthesisHelp.textContent = 'Training model... Please wait.';
    } else {
        elements.synthesisHelp.textContent = 'Upload audio to enable synthesis';
    }

    // Update samples list
    if (audioCount > 0) {
        elements.samplesList.innerHTML = `
            <p class="help-text">${audioCount} audio sample${audioCount === 1 ? '' : 's'} uploaded</p>
        `;
    } else {
        elements.samplesList.innerHTML = '<p class="help-text">No samples uploaded yet</p>';
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast toast-${type} toast-show`;

    setTimeout(() => {
        elements.toast.className = 'toast';
    }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
