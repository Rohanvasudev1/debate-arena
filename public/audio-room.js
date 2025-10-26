class AudioDebateRoom {
    constructor() {
        this.meeting = null;
        this.meetingId = "";
        this.token = "";
        this.participantName = "";
        this.isMicOn = false;
        this.participants = new Map();

        this.init();
    }

    init() {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.meetingId = urlParams.get('roomId');
        this.token = urlParams.get('token');
        this.participantName = urlParams.get('name') || 'Participant';

        if (!this.meetingId || !this.token) {
            this.showError('Invalid room parameters. Please join through the main platform.');
            return;
        }

        // Update UI
        document.getElementById('roomIdDisplay').textContent = this.meetingId;

        // Setup event listeners
        this.setupEventListeners();

        // Initialize meeting
        this.initializeMeeting();
    }

    setupEventListeners() {
        document.getElementById('toggleMicBtn').addEventListener('click', () => {
            this.toggleMic();
        });

        document.getElementById('leaveBtn').addEventListener('click', () => {
            this.leaveMeeting();
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            if (this.meeting) {
                this.meeting.leave();
            }
        });
    }

    initializeMeeting() {
        try {
            this.updateConnectionStatus('connecting', '🔄 Connecting...');

            // Configure VideoSDK
            window.VideoSDK.config(this.token);

            // Initialize meeting
            this.meeting = window.VideoSDK.initMeeting({
                meetingId: this.meetingId,
                name: this.participantName,
                micEnabled: true,
                webcamEnabled: false, // Audio-only
            });

            this.setupMeetingEventListeners();

            // Join the meeting
            this.meeting.join();

        } catch (error) {
            console.error('Error initializing meeting:', error);
            this.updateConnectionStatus('disconnected', '❌ Connection failed');
            this.showError('Failed to connect to the debate room.');
        }
    }

    setupMeetingEventListeners() {
        // Meeting joined event
        this.meeting.on("meeting-joined", () => {
            console.log('Successfully joined the meeting');
            this.updateConnectionStatus('connected', '✅ Connected');
            this.updateRoomStatus('🎉 Connected to debate room');

            // Create local participant
            this.createLocalParticipant();
            this.updateMicButton();
            this.checkParticipantCount();
        });

        // Meeting left event
        this.meeting.on("meeting-left", () => {
            console.log('Left the meeting');
            this.updateConnectionStatus('disconnected', '❌ Disconnected');
            this.updateRoomStatus('📴 Disconnected from room');

            // Close window after a short delay
            setTimeout(() => {
                window.close();
            }, 2000);
        });

        // Local participant stream events
        this.meeting.localParticipant.on("stream-enabled", (stream) => {
            console.log('Local stream enabled:', stream.kind);
            if (stream.kind === "audio") {
                this.isMicOn = true;
                this.updateMicButton();
                this.updateParticipantMicStatus(this.meeting.localParticipant.id, true);
            }
        });

        this.meeting.localParticipant.on("stream-disabled", (stream) => {
            console.log('Local stream disabled:', stream.kind);
            if (stream.kind === "audio") {
                this.isMicOn = false;
                this.updateMicButton();
                this.updateParticipantMicStatus(this.meeting.localParticipant.id, false);
            }
        });

        // Remote participant events
        this.meeting.on("participant-joined", (participant) => {
            console.log('Participant joined:', participant.displayName);
            this.createRemoteParticipant(participant);
            this.checkParticipantCount();
        });

        this.meeting.on("participant-left", (participant) => {
            console.log('Participant left:', participant.displayName);
            this.removeParticipant(participant.id);
            this.checkParticipantCount();
        });

        // Error handling
        this.meeting.on("error", (error) => {
            console.error('Meeting error:', error);
            this.updateConnectionStatus('disconnected', '❌ Connection error');
            this.showError('Connection error occurred. Please try rejoining.');
        });
    }

    createLocalParticipant() {
        const localParticipant = this.meeting.localParticipant;
        const participantElement = this.createParticipantElement(
            localParticipant.id,
            localParticipant.displayName || this.participantName,
            true
        );

        document.getElementById('participantsContainer').appendChild(participantElement);
        this.participants.set(localParticipant.id, {
            element: participantElement,
            isLocal: true,
            name: localParticipant.displayName || this.participantName
        });
    }

    createRemoteParticipant(participant) {
        const participantElement = this.createParticipantElement(
            participant.id,
            participant.displayName,
            false
        );

        const audioElement = this.createAudioElement(participant.id);

        // Setup remote participant stream events
        participant.on("stream-enabled", (stream) => {
            console.log('Remote stream enabled:', stream.kind, 'from', participant.displayName);
            if (stream.kind === "audio") {
                this.setAudioTrack(stream, audioElement);
                this.updateParticipantMicStatus(participant.id, true);
            }
        });

        participant.on("stream-disabled", (stream) => {
            console.log('Remote stream disabled:', stream.kind, 'from', participant.displayName);
            if (stream.kind === "audio") {
                this.updateParticipantMicStatus(participant.id, false);
            }
        });

        document.getElementById('participantsContainer').appendChild(participantElement);
        document.getElementById('participantsContainer').appendChild(audioElement);

        this.participants.set(participant.id, {
            element: participantElement,
            audioElement: audioElement,
            isLocal: false,
            name: participant.displayName
        });
    }

    createParticipantElement(id, name, isLocal) {
        const div = document.createElement('div');
        div.className = `participant ${isLocal ? 'local' : ''}`;
        div.id = `participant-${id}`;

        div.innerHTML = `
            <h3>${this.escapeHtml(name)}</h3>
            <div class="participant-status">
                ${isLocal ? '<span class="status-badge local-badge">👤 You</span>' : ''}
                <span class="status-badge mic-off" id="mic-status-${id}">🎤 OFF</span>
            </div>
        `;

        return div;
    }

    createAudioElement(participantId) {
        const audio = document.createElement('audio');
        audio.setAttribute('autoPlay', 'true');
        audio.setAttribute('playsInline', 'true');
        audio.setAttribute('controls', 'false');
        audio.setAttribute('id', `audio-${participantId}`);
        audio.style.display = 'none';
        return audio;
    }

    setAudioTrack(stream, audioElement) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(stream.track);
        audioElement.srcObject = mediaStream;
        audioElement.play().catch(error => {
            console.error('Audio play failed:', error);
        });
    }

    removeParticipant(participantId) {
        const participant = this.participants.get(participantId);
        if (participant) {
            participant.element.remove();
            if (participant.audioElement) {
                participant.audioElement.remove();
            }
            this.participants.delete(participantId);
        }
    }

    updateParticipantMicStatus(participantId, micOn) {
        const micStatus = document.getElementById(`mic-status-${participantId}`);
        if (micStatus) {
            micStatus.textContent = micOn ? '🎤 ON' : '🎤 OFF';
            micStatus.className = `status-badge ${micOn ? 'mic-on' : 'mic-off'}`;
        }

        // Add speaking animation
        const participantElement = document.getElementById(`participant-${participantId}`);
        if (participantElement) {
            participantElement.classList.toggle('speaking', micOn);
        }
    }

    toggleMic() {
        if (!this.meeting) return;

        if (this.isMicOn) {
            this.meeting.muteMic();
        } else {
            this.meeting.unmuteMic();
        }
    }

    updateMicButton() {
        const micBtn = document.getElementById('toggleMicBtn');
        micBtn.textContent = this.isMicOn ? '🔇 Mute' : '🎤 Unmute';
        micBtn.disabled = false;
    }

    leaveMeeting() {
        if (this.meeting) {
            this.meeting.leave();
        } else {
            window.close();
        }
    }

    checkParticipantCount() {
        const participantCount = this.participants.size;
        const waitingMessage = document.getElementById('waitingMessage');

        if (participantCount < 2) {
            waitingMessage.style.display = 'block';
            this.updateRoomStatus('⏳ Waiting for opponent to join...');
        } else {
            waitingMessage.style.display = 'none';
            this.updateRoomStatus('🎙️ Debate in progress - 2/2 participants');
        }
    }

    updateConnectionStatus(status, message) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `connection-status ${status}`;
        statusElement.textContent = message;
    }

    updateRoomStatus(message) {
        document.getElementById('roomStatus').textContent = message;
    }

    showError(message) {
        this.updateRoomStatus(`❌ ${message}`);

        // Show error in participants container if empty
        const container = document.getElementById('participantsContainer');
        if (container.children.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: rgba(244, 67, 54, 0.2); border-radius: 15px;">
                    <h3>❌ Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.close()">Close Window</button>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions
function copyRoomId() {
    const roomId = document.getElementById('roomIdDisplay').textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        // Show temporary feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy room ID:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AudioDebateRoom();
});