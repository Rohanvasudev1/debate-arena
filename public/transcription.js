class TranscriptionService {
    constructor() {
        this.socket = null;
        this.mediaRecorder = null;
        this.stream = null;
        this.apiKey = null;
        this.isRecording = false;
        this.onTranscriptCallback = null;
        this.participantName = '';
    }

    async initialize(participantName, onTranscriptCallback) {
        this.participantName = participantName;
        this.onTranscriptCallback = onTranscriptCallback;

        try {
            // Get Deepgram API key from server
            const response = await fetch('/api/deepgram-key');
            const data = await response.json();
            this.apiKey = data.apiKey;

            console.log('Transcription service initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize transcription service:', error);
            return false;
        }
    }

    async startTranscription() {
        if (this.isRecording) {
            console.log('Transcription already running');
            return;
        }

        try {
            // Get microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            // Create WebSocket connection to Deepgram
            const wsUrl = `wss://api.deepgram.com/v1/listen`;

            this.socket = new WebSocket(wsUrl, ['token', this.apiKey]);

            this.socket.onopen = () => {
                console.log('Deepgram WebSocket connected');
            };

            this.socket.onmessage = (message) => {
                try {
                    const received = JSON.parse(message.data);
                    console.log('Deepgram response:', received);

                    const transcript = received.channel?.alternatives?.[0]?.transcript;

                    if (transcript && transcript.trim()) {
                        const transcriptData = {
                            text: transcript,
                            isFinal: received.is_final || false,
                            participantName: this.participantName,
                            timestamp: Date.now()
                        };

                        console.log('Transcript data:', transcriptData);

                        if (this.onTranscriptCallback) {
                            this.onTranscriptCallback(transcriptData);
                        }
                    } else if (received.type === 'Results') {
                        console.log('Received empty transcript or no alternatives');
                    }
                } catch (error) {
                    console.error('Error parsing Deepgram response:', error, message.data);
                }
            };

            this.socket.onerror = (error) => {
                console.error('Deepgram WebSocket error:', error);
            };

            this.socket.onclose = () => {
                console.log('Deepgram WebSocket closed');
                this.isRecording = false;
            };

            // Set up MediaRecorder with fallback options
            let options = { mimeType: 'audio/webm;codecs=opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn('webm/opus not supported, trying alternatives');
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options = { mimeType: 'audio/webm' };
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    options = { mimeType: 'audio/ogg' };
                } else {
                    options = {}; // Use browser default
                }
            }
            console.log('Using MediaRecorder mimeType:', options.mimeType || 'default');

            this.mediaRecorder = new MediaRecorder(this.stream, options);

            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    console.log('Audio data available, size:', event.data.size);
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        try {
                            this.socket.send(event.data);
                            console.log('Audio data sent to Deepgram');
                        } catch (error) {
                            console.error('Error sending audio data:', error);
                        }
                    } else {
                        console.warn('WebSocket not ready, state:', this.socket?.readyState);
                    }
                } else {
                    console.log('No audio data available');
                }
            });

            this.mediaRecorder.addEventListener('start', () => {
                console.log('MediaRecorder started for transcription');
                this.isRecording = true;
            });

            this.mediaRecorder.addEventListener('stop', () => {
                console.log('MediaRecorder stopped for transcription');
                this.isRecording = false;
            });

            // Start recording with 250ms chunks
            this.mediaRecorder.start(250);

        } catch (error) {
            console.error('Error starting transcription:', error);
            this.stopTranscription();
        }
    }

    stopTranscription() {
        console.log('Stopping transcription service');

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.close();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.isRecording = false;
        this.socket = null;
        this.mediaRecorder = null;
    }

    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            hasStream: !!this.stream,
            socketConnected: this.socket && this.socket.readyState === WebSocket.OPEN
        };
    }
}

// Export for use in other modules
window.TranscriptionService = TranscriptionService;