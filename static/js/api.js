/**
 * API Client - Wrapper for simplified backend API calls
 */
const API = {
    /**
     * Upload audio blob to backend
     */
    async uploadAudio(blob) {
        const formData = new FormData();

        // Determine filename based on blob type
        const extension = blob.type.includes('webm') ? 'webm' : 'mp4';
        formData.append('file', blob, `recording.${extension}`);

        const response = await fetch('/api/v1/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        return await response.json();
    },

    /**
     * Get training status
     */
    async getStatus() {
        const response = await fetch('/api/v1/status');

        if (!response.ok) {
            throw new Error('Failed to fetch status');
        }

        return await response.json();
    },

    /**
     * Synthesize speech from text
     */
    async synthesize(text) {
        const response = await fetch('/api/v1/synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Synthesis failed');
        }

        // Return the audio blob
        return await response.blob();
    }
};
