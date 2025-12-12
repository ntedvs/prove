/**
 * Audio Recorder - Handles microphone recording using MediaRecorder API
 */
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.stream = null;
        this.startTime = null;
    }

    /**
     * Start recording audio from microphone
     */
    async startRecording() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            // Determine supported MIME type
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            }

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType
            });

            this.audioChunks = [];

            // Collect audio data
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Create blob when recording stops
            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { type: mimeType });
            };

            // Start recording
            this.mediaRecorder.start();
            this.startTime = Date.now();

            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied. Please allow microphone access and try again.');
            }
            throw new Error('Failed to start recording: ' + error.message);
        }
    }

    /**
     * Stop recording
     */
    stopRecording() {
        return new Promise((resolve) => {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.onstop = () => {
                    this.audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });

                    // Stop all tracks
                    if (this.stream) {
                        this.stream.getTracks().forEach(track => track.stop());
                    }

                    resolve();
                };

                this.mediaRecorder.stop();
            } else {
                resolve();
            }
        });
    }

    /**
     * Play the recorded audio
     */
    playRecording() {
        if (!this.audioBlob) {
            throw new Error('No recording available to play');
        }

        const audioUrl = URL.createObjectURL(this.audioBlob);
        const audio = new Audio(audioUrl);

        audio.play();

        // Clean up URL after playing
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };

        return audio;
    }

    /**
     * Get the recorded audio blob
     */
    getBlob() {
        return this.audioBlob;
    }

    /**
     * Get recording duration in seconds
     */
    getDuration() {
        if (!this.startTime) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    /**
     * Check if currently recording
     */
    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }

    /**
     * Clear the recorded data
     */
    clear() {
        this.audioChunks = [];
        this.audioBlob = null;
        this.startTime = null;
    }
}
