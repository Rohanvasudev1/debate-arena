class DebatePlatform {
    constructor() {
        this.debates = [];
        this.currentFilter = 'all';
        this.currentPosition = 'Pro';
        this.ws = null;
        this.currentDebate = null;

        // Audio room variables
        this.meeting = null;
        this.meetingId = "";
        this.token = "";
        this.participantName = "";
        this.isMicOn = false;
        this.participants = new Map();

        // Transcription service
        this.transcriptionService = null;
        this.transcriptions = [];

        // Judge system
        this.judgeSystem = null;
        this.evaluationTimer = null;
        this.transcriptBuffer = [];
        this.lastEvaluationTime = 0;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connectWebSocket();
        this.loadDebates();
    }

    setupEventListeners() {
        // Create debate form
        const createForm = document.getElementById('createDebateForm');
        createForm.addEventListener('submit', (e) => this.handleCreateDebate(e));

        // Position toggle
        document.querySelectorAll('.position-option').forEach(option => {
            option.addEventListener('click', (e) => this.handlePositionToggle(e));
        });

        // Filter options
        document.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Audio room controls
        document.getElementById('toggleMicBtn').addEventListener('click', () => {
            this.toggleMic();
        });

        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.leaveMeeting();
        });

        document.getElementById('backToLobbyBtn').addEventListener('click', () => {
            this.backToLobby();
        });

        // Transcription toggle
        document.getElementById('toggleTranscriptionBtn').addEventListener('click', () => {
            this.toggleTranscription();
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}`);

        this.ws.onopen = () => {
            console.log('Connected to debate platform');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'debates_update') {
                this.debates = message.data;
                this.renderDebates();
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from debate platform');
            // Reconnect after 3 seconds
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    async loadDebates() {
        try {
            const response = await fetch('/api/debates');
            this.debates = await response.json();
            this.renderDebates();
        } catch (error) {
            console.error('Error loading debates:', error);
            this.showMessage('Error loading debates', 'error', 'debatesContainer');
        }
    }

    async handleCreateDebate(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const debateData = {
            creatorName: document.getElementById('creatorName').value.trim(),
            topic: document.getElementById('topic').value.trim(),
            description: document.getElementById('description').value.trim(),
            category: document.getElementById('category').value,
            position: this.currentPosition
        };

        if (!debateData.creatorName || !debateData.topic) {
            this.showMessage('Please fill in all required fields', 'error', 'createMessage');
            return;
        }

        const createBtn = document.getElementById('createBtn');
        createBtn.disabled = true;
        createBtn.textContent = '🔄 Creating...';

        try {
            const response = await fetch('/api/debates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(debateData),
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Debate created successfully! 🎉', 'success', 'createMessage');
                document.getElementById('createDebateForm').reset();
                this.currentPosition = 'Pro';
                this.updatePositionToggle();

                // Automatically join the created debate
                setTimeout(() => {
                    this.joinDebateRoom(result.debate);
                }, 1000);
            } else {
                this.showMessage(result.error || 'Failed to create debate', 'error', 'createMessage');
            }
        } catch (error) {
            console.error('Error creating debate:', error);
            this.showMessage('Error creating debate. Please try again.', 'error', 'createMessage');
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = '🎙️ Create Debate Room';
        }
    }

    handlePositionToggle(e) {
        const position = e.target.dataset.position;
        if (position) {
            this.currentPosition = position;
            this.updatePositionToggle();
        }
    }

    updatePositionToggle() {
        document.querySelectorAll('.position-option').forEach(option => {
            option.classList.toggle('active', option.dataset.position === this.currentPosition);
        });
    }

    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        if (filter) {
            this.currentFilter = filter;
            document.querySelectorAll('.filter-option').forEach(option => {
                option.classList.toggle('active', option.dataset.filter === filter);
            });
            this.renderDebates();
        }
    }

    getFilteredDebates() {
        if (this.currentFilter === 'all') {
            return this.debates;
        }

        return this.debates.filter(debate => {
            if (this.currentFilter === 'waiting') {
                return debate.status === 'waiting';
            }
            if (this.currentFilter === 'active') {
                return debate.status === 'active';
            }
            return debate.category === this.currentFilter;
        });
    }

    renderDebates() {
        const container = document.getElementById('debatesContainer');
        const filteredDebates = this.getFilteredDebates();

        if (filteredDebates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No debates found</h3>
                    <p>Be the first to start a debate on this topic!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredDebates.map(debate => this.renderDebateCard(debate)).join('');

        // Add event listeners to join buttons
        container.querySelectorAll('.join-debate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const debateId = e.target.dataset.debateId;
                const debate = this.debates.find(d => d.id === debateId);
                if (debate) {
                    this.showJoinModal(debate);
                }
            });
        });
    }

    renderDebateCard(debate) {
        const isWaiting = debate.status === 'waiting';
        const isActive = debate.status === 'active';
        const isFull = debate.participants.length >= debate.maxParticipants;

        const statusClass = isWaiting ? 'status-waiting' : isActive ? 'status-active' : 'status-full';
        const statusText = isWaiting ? 'Waiting for opponent' : isActive ? 'Debate in progress' : 'Full';

        const timeAgo = this.getTimeAgo(debate.createdAt);

        return `
            <div class="debate-card">
                <div class="debate-topic">${this.escapeHtml(debate.topic)}</div>
                ${debate.description ? `<div class="debate-description">${this.escapeHtml(debate.description)}</div>` : ''}

                <div class="debate-meta">
                    <div class="debate-category">${debate.category}</div>
                    <div class="debate-status ${statusClass}">${statusText}</div>
                    <div style="opacity: 0.7; font-size: 0.9rem;">${timeAgo}</div>
                </div>

                <div class="participants">
                    ${debate.participants.map(p => `
                        <div class="participant">
                            <span class="participant-name">${this.escapeHtml(p.name)}</span>
                            <span class="participant-position ${p.position.toLowerCase() === 'pro' ? 'position-pro' : 'position-con'}">
                                ${p.position}
                            </span>
                        </div>
                    `).join('')}
                    ${!isFull ? `<div class="participant" style="opacity: 0.5;">
                        <span>Waiting for opponent...</span>
                    </div>` : ''}
                </div>

                <div class="debate-actions">
                    ${!isFull ? `
                        <button class="btn btn-secondary join-debate-btn" data-debate-id="${debate.id}">
                            🚪 Join Debate
                        </button>
                    ` : `
                        <button class="btn" disabled>
                            👥 Room Full
                        </button>
                    `}
                    ${isActive ? `
                        <button class="btn btn-secondary" onclick="window.open('/audio-room?roomId=${debate.roomId}&token=${debate.token}', '_blank')">
                            🎧 Listen In
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showJoinModal(debate) {
        const name = prompt(`Join the debate: "${debate.topic}"\n\nEnter your name:`);
        if (!name || !name.trim()) {
            return;
        }

        // Determine position (opposite of creator if possible)
        const creatorPosition = debate.participants[0]?.position || 'Pro';
        const oppositePosition = creatorPosition === 'Pro' ? 'Con' : 'Pro';

        this.joinDebate(debate.id, name.trim(), oppositePosition);
    }

    async joinDebate(debateId, participantName, position) {
        try {
            const response = await fetch(`/api/debates/${debateId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participantName, position }),
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Joined debate successfully! 🎉', 'success', 'createMessage');
                this.joinDebateRoom(result.debate);
            } else {
                alert(result.error || 'Failed to join debate');
            }
        } catch (error) {
            console.error('Error joining debate:', error);
            alert('Error joining debate. Please try again.');
        }
    }

    joinDebateRoom(debate) {
        // Store current debate info
        this.currentDebate = debate;
        this.meetingId = debate.roomId;
        this.token = debate.token;
        this.participantName = debate.participants[debate.participants.length - 1]?.name || 'Participant';

        // Show audio room section
        this.showAudioRoom();

        // Initialize transcription service
        this.initializeTranscription();

        // Initialize judge system
        this.initializeJudgeSystem();

        // Initialize the meeting
        this.initializeMeeting();
    }

    showAudioRoom() {
        document.querySelector('.main-content').style.display = 'none';
        document.querySelector('header').style.display = 'none';
        document.getElementById('audioRoomSection').style.display = 'block';

        // Update room info
        document.getElementById('currentDebateTopic').textContent = this.currentDebate.topic;
        document.getElementById('roomIdDisplay').textContent = this.meetingId;
        document.getElementById('roomStatus').textContent = 'Connecting to room...';
    }

    backToLobby() {
        if (this.meeting) {
            this.meeting.leave();
        }

        // Stop transcription
        if (this.transcriptionService) {
            this.transcriptionService.stopTranscription();
            this.transcriptionService = null;
        }

        // Stop judge system
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
            this.evaluationTimer = null;
        }
        this.transcriptBuffer = [];
        this.judgeSystem = null;

        // Hide audio room and show main content
        document.getElementById('audioRoomSection').style.display = 'none';
        document.querySelector('.main-content').style.display = 'grid';
        document.querySelector('header').style.display = 'block';

        // Reset audio room state
        this.meeting = null;
        this.meetingId = "";
        this.token = "";
        this.participantName = "";
        this.isMicOn = false;
        this.participants.clear();
        this.transcriptions = [];
        document.getElementById('audioParticipantsContainer').innerHTML = '';
        document.getElementById('transcriptContainer').innerHTML = '';
    }

    // Audio Room Functions (adapted from vanilla implementation)
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
            this.updateRoomStatus('Failed to connect to the debate room.');
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
            this.updateRoomStatus('Connection error occurred. Please try rejoining.');
        });
    }

    createLocalParticipant() {
        const localParticipant = this.meeting.localParticipant;
        const participantElement = this.createParticipantElement(
            localParticipant.id,
            localParticipant.displayName || this.participantName,
            true
        );

        document.getElementById('audioParticipantsContainer').appendChild(participantElement);
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

        document.getElementById('audioParticipantsContainer').appendChild(participantElement);
        document.getElementById('audioParticipantsContainer').appendChild(audioElement);

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
            <div class="status">
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
        }
        this.backToLobby();
    }

    // Transcription Functions
    async initializeTranscription() {
        try {
            console.log('Initializing transcription service...');
            console.log('TranscriptionService available:', typeof window.TranscriptionService);

            if (!window.TranscriptionService) {
                console.error('TranscriptionService not found on window object');
                return;
            }

            this.transcriptionService = new window.TranscriptionService();
            console.log('TranscriptionService instance created');

            const initialized = await this.transcriptionService.initialize(
                this.participantName,
                (transcriptData) => this.handleTranscript(transcriptData)
            );

            if (initialized) {
                console.log('Transcription service initialized successfully');
                this.updateTranscriptionButton(false);
            } else {
                console.error('Failed to initialize transcription service');
            }
        } catch (error) {
            console.error('Error initializing transcription:', error);
            console.error('Error details:', error.stack);
        }
    }

    async toggleTranscription() {
        console.log('toggleTranscription called');
        console.log('transcriptionService:', this.transcriptionService);

        if (!this.transcriptionService) {
            console.error('Transcription service not initialized');
            return;
        }

        const status = this.transcriptionService.getRecordingStatus();
        console.log('Current recording status:', status);

        if (status.isRecording) {
            console.log('Stopping transcription...');
            this.transcriptionService.stopTranscription();
            this.updateTranscriptionButton(false);
        } else {
            console.log('Starting transcription...');
            try {
                await this.transcriptionService.startTranscription();
                this.updateTranscriptionButton(true);
                console.log('Transcription started successfully');
            } catch (error) {
                console.error('Error starting transcription:', error);
            }
        }
    }

    updateTranscriptionButton(isRecording) {
        const btn = document.getElementById('toggleTranscriptionBtn');
        if (btn) {
            btn.textContent = isRecording ? '⏹️ Stop Transcription' : '📝 Start Transcription';
            btn.className = isRecording ? 'btn btn-danger' : 'btn btn-secondary';
        }
    }

    handleTranscript(transcriptData) {
        // Add to transcriptions array
        this.transcriptions.push(transcriptData);

        // Add to judge system buffer if final transcript
        if (transcriptData.isFinal && this.judgeSystem) {
            const position = this.getParticipantPosition(transcriptData.participantName);
            console.log('📝 Adding final transcript to judge buffer:', {
                text: transcriptData.text.substring(0, 50) + '...',
                participant: transcriptData.participantName,
                position: position
            });

            this.transcriptBuffer.push({
                text: transcriptData.text,
                participant: transcriptData.participantName,
                timestamp: transcriptData.timestamp,
                position: position
            });

            console.log('📊 Current transcript buffer size:', this.transcriptBuffer.length);
        } else if (transcriptData.isFinal) {
            console.warn('⚠️ Final transcript received but judge system not available');
        }

        // Update UI
        this.displayTranscription(transcriptData);

        // Auto-scroll to bottom
        const container = document.getElementById('transcriptContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    displayTranscription(transcriptData) {
        const container = document.getElementById('transcriptContainer');
        if (!container) return;

        // Check if we already have a transcript element for this interim result
        let transcriptElement = null;
        if (!transcriptData.isFinal) {
            // Look for existing interim transcript from this participant
            transcriptElement = container.querySelector(`[data-participant="${transcriptData.participantName}"][data-interim="true"]`);
        }

        if (!transcriptElement) {
            // Create new transcript element
            transcriptElement = document.createElement('div');
            transcriptElement.className = 'transcript-item';
            transcriptElement.setAttribute('data-participant', transcriptData.participantName);
            transcriptElement.setAttribute('data-interim', transcriptData.isFinal ? 'false' : 'true');

            const timestamp = new Date(transcriptData.timestamp).toLocaleTimeString();

            transcriptElement.innerHTML = `
                <div class="transcript-header">
                    <span class="participant-name">${this.escapeHtml(transcriptData.participantName)}</span>
                    <span class="timestamp">${timestamp}</span>
                    ${!transcriptData.isFinal ? '<span class="interim-badge">typing...</span>' : ''}
                </div>
                <div class="transcript-text">${this.escapeHtml(transcriptData.text)}</div>
            `;

            container.appendChild(transcriptElement);
        } else {
            // Update existing interim transcript
            const textElement = transcriptElement.querySelector('.transcript-text');
            if (textElement) {
                textElement.textContent = transcriptData.text;
            }

            // If this is now final, update the styling and remove interim indicator
            if (transcriptData.isFinal) {
                transcriptElement.setAttribute('data-interim', 'false');
                const interimBadge = transcriptElement.querySelector('.interim-badge');
                if (interimBadge) {
                    interimBadge.remove();
                }
            }
        }

        // Apply styling based on final status
        transcriptElement.classList.toggle('interim', !transcriptData.isFinal);
    }

    // Judge System Functions
    initializeJudgeSystem() {
        try {
            console.log('Initializing judge system...');
            console.log('MultiAgentJudgeSystem available:', typeof window.MultiAgentJudgeSystem);

            if (!window.MultiAgentJudgeSystem) {
                console.error('MultiAgentJudgeSystem not found on window object');
                return;
            }

            this.judgeSystem = new window.MultiAgentJudgeSystem();
            console.log('Judge system initialized successfully');

            // Start 30-second evaluation timer
            this.startEvaluationTimer();
        } catch (error) {
            console.error('Error initializing judge system:', error);
            console.error('Error details:', error.stack);
        }
    }

    startEvaluationTimer() {
        // Clear any existing timer
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
        }

        // Start 30-second evaluation cycle
        this.evaluationTimer = setInterval(() => {
            console.log('⏰ 30-second evaluation timer triggered');
            this.evaluateRecentTranscripts();
        }, 30000); // 30 seconds

        console.log('✅ Evaluation timer started - evaluating every 30 seconds');

        // Also add a shorter timer for testing (10 seconds)
        setTimeout(() => {
            console.log('🧪 Test evaluation triggered after 10 seconds');
            this.evaluateRecentTranscripts();
        }, 10000);
    }

    async evaluateRecentTranscripts() {
        console.log('🔍 evaluateRecentTranscripts called');
        console.log('Judge system available:', !!this.judgeSystem);
        console.log('Transcript buffer length:', this.transcriptBuffer.length);
        if (!this.judgeSystem || this.transcriptBuffer.length === 0) {
            return;
        }

        console.log(`🔄 Starting evaluation cycle - ${this.transcriptBuffer.length} transcripts to evaluate`);

        // Get transcripts from the last 30 seconds
        const now = Date.now();
        const recentTranscripts = this.transcriptBuffer.filter(t =>
            now - t.timestamp <= 30000
        );

        if (recentTranscripts.length === 0) {
            console.log('No recent transcripts to evaluate');
            return;
        }

        // Group by participant/position
        const transcriptsByPosition = {
            pro: [],
            con: []
        };

        recentTranscripts.forEach(transcript => {
            const position = transcript.position.toLowerCase();
            if (transcriptsByPosition[position]) {
                transcriptsByPosition[position].push(transcript.text);
            }
        });

        // Evaluate each position's combined text
        const evaluationPromises = [];

        for (const [position, texts] of Object.entries(transcriptsByPosition)) {
            if (texts.length > 0) {
                const combinedText = texts.join(' ');
                if (combinedText.trim().length > 20) { // Only evaluate substantial content
                    evaluationPromises.push(
                        this.judgeSystem.evaluateTranscriptSegment(
                            combinedText,
                            this.currentDebate.id,
                            this.currentDebate.topic,
                            position
                        )
                    );
                }
            }
        }

        if (evaluationPromises.length > 0) {
            try {
                await Promise.all(evaluationPromises);
                console.log('✅ Evaluation cycle completed');

                // Update live feedback UI
                this.updateLiveFeedback();

                // Clear processed transcripts
                this.transcriptBuffer = this.transcriptBuffer.filter(t =>
                    now - t.timestamp > 30000
                );

                this.lastEvaluationTime = now;
            } catch (error) {
                console.error('Error during evaluation:', error);
            }
        }
    }

    updateLiveFeedback() {
        if (!this.judgeSystem) return;

        // Get current scores and feedback
        const scores = this.judgeSystem.getCurrentScores();
        const consensus = this.judgeSystem.getDebateConsensus();

        // Update score displays
        this.updateScoreDisplay(scores);

        // Update feedback displays
        const proFeedback = this.judgeSystem.getLatestFeedback('pro');
        const conFeedback = this.judgeSystem.getLatestFeedback('con');

        this.updateFeedbackDisplay('pro', proFeedback);
        this.updateFeedbackDisplay('con', conFeedback);

        // Update consensus display
        this.updateConsensusDisplay(consensus);
    }

    updateScoreDisplay(scores) {
        // Update Pro scores
        const proScoreElement = document.getElementById('proScores');
        if (proScoreElement) {
            proScoreElement.innerHTML = `
                <div class="score-category">
                    <span>Logic:</span> <span class="score">${Math.round(scores.pro.logic)}</span>
                </div>
                <div class="score-category">
                    <span>Persuasion:</span> <span class="score">${Math.round(scores.pro.persuasion)}</span>
                </div>
                <div class="score-category">
                    <span>Flow:</span> <span class="score">${Math.round(scores.pro.flow)}</span>
                </div>
                <div class="score-total">
                    <span>Total:</span> <span class="score">${Math.round(scores.pro.total)}</span>
                </div>
            `;
        }

        // Update Con scores
        const conScoreElement = document.getElementById('conScores');
        if (conScoreElement) {
            conScoreElement.innerHTML = `
                <div class="score-category">
                    <span>Logic:</span> <span class="score">${Math.round(scores.con.logic)}</span>
                </div>
                <div class="score-category">
                    <span>Persuasion:</span> <span class="score">${Math.round(scores.con.persuasion)}</span>
                </div>
                <div class="score-category">
                    <span>Flow:</span> <span class="score">${Math.round(scores.con.flow)}</span>
                </div>
                <div class="score-total">
                    <span>Total:</span> <span class="score">${Math.round(scores.con.total)}</span>
                </div>
            `;
        }
    }

    updateFeedbackDisplay(position, feedback) {
        const feedbackElement = document.getElementById(`${position}Feedback`);
        if (!feedbackElement || !feedback) return;

        feedbackElement.innerHTML = `
            <div class="feedback-section">
                <h4>✅ Strengths</h4>
                <ul>${feedback.strengths.slice(0, 3).map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            <div class="feedback-section">
                <h4>⚠️ Areas for Improvement</h4>
                <ul>${feedback.weaknesses.slice(0, 3).map(w => `<li>${w}</li>`).join('')}</ul>
            </div>
            <div class="feedback-section">
                <h4>💡 Suggestions</h4>
                <ul>${feedback.suggestions.slice(0, 3).map(s => `<li>${s}</li>`).join('')}</ul>
            </div>
            ${feedback.fallacies.length > 0 ? `
                <div class="feedback-section fallacies">
                    <h4>🚫 Logical Fallacies Detected</h4>
                    <ul>${feedback.fallacies.map(f => `<li>${f}</li>`).join('')}</ul>
                </div>
            ` : ''}
        `;
    }

    updateConsensusDisplay(consensus) {
        const consensusElement = document.getElementById('consensusDisplay');
        if (!consensusElement) return;

        let statusColor = '#ffc107';
        let statusIcon = '⚖️';

        if (consensus.decision_strength === 'decisive') {
            statusColor = consensus.winner === 'pro' ? '#28a745' : '#dc3545';
            statusIcon = '🏆';
        } else if (consensus.decision_strength === 'close') {
            statusColor = consensus.winner === 'pro' ? '#20c997' : '#fd7e14';
            statusIcon = '📊';
        }

        consensusElement.innerHTML = `
            <div class="consensus-header" style="color: ${statusColor}">
                ${statusIcon} ${consensus.winner.toUpperCase()} Leading
            </div>
            <div class="consensus-details">
                <div>Margin: ${consensus.margin.toFixed(1)} points</div>
                <div>Strength: ${consensus.decision_strength.replace('_', ' ')}</div>
                <div>Evaluations: ${consensus.evaluation_count}</div>
            </div>
        `;
    }

    getParticipantPosition(participantName) {
        if (!this.currentDebate || !this.currentDebate.participants) {
            return 'unknown';
        }

        const participant = this.currentDebate.participants.find(p => p.name === participantName);
        return participant ? participant.position.toLowerCase() : 'unknown';
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

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get final debate results
    getFinalResults() {
        if (!this.judgeSystem) {
            return null;
        }

        const consensus = this.judgeSystem.getDebateConsensus();
        const scores = this.judgeSystem.getCurrentScores();

        return {
            winner: consensus.winner,
            final_scores: scores,
            margin: consensus.margin,
            decision_strength: consensus.decision_strength,
            total_evaluations: consensus.evaluation_count,
            detailed_breakdown: {
                pro_breakdown: {
                    logic: scores.pro.logic,
                    persuasion: scores.pro.persuasion,
                    flow: scores.pro.flow,
                    total: scores.pro.total
                },
                con_breakdown: {
                    logic: scores.con.logic,
                    persuasion: scores.con.persuasion,
                    flow: scores.con.flow,
                    total: scores.con.total
                }
            }
        };
    }

    showMessage(message, type, containerId) {
        const container = document.getElementById(containerId);
        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;

        // Clear previous messages
        const existingMessages = container.querySelectorAll('.error, .success');
        existingMessages.forEach(msg => msg.remove());

        container.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Show final results modal
    showFinalResults() {
        const results = this.getFinalResults();
        if (!results) {
            alert('No evaluation data available');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'results-modal';
        modal.innerHTML = `
            <div class="results-content">
                <h2>🏆 Final Debate Results</h2>
                <div class="winner-announcement">
                    <h3>${results.winner.toUpperCase()} WINS!</h3>
                    <p>Victory Margin: ${results.margin.toFixed(1)} points</p>
                    <p>Decision: ${results.decision_strength.replace('_', ' ')}</p>
                </div>
                <div class="final-scores">
                    <div class="score-column">
                        <h4>PRO Scores</h4>
                        <div>Logic: ${results.final_scores.pro.logic.toFixed(1)}</div>
                        <div>Persuasion: ${results.final_scores.pro.persuasion.toFixed(1)}</div>
                        <div>Flow: ${results.final_scores.pro.flow.toFixed(1)}</div>
                        <div class="total">Total: ${results.final_scores.pro.total.toFixed(1)}</div>
                    </div>
                    <div class="score-column">
                        <h4>CON Scores</h4>
                        <div>Logic: ${results.final_scores.con.logic.toFixed(1)}</div>
                        <div>Persuasion: ${results.final_scores.con.persuasion.toFixed(1)}</div>
                        <div>Flow: ${results.final_scores.con.flow.toFixed(1)}</div>
                        <div class="total">Total: ${results.final_scores.con.total.toFixed(1)}</div>
                    </div>
                </div>
                <div class="evaluation-stats">
                    <p>Total Evaluations: ${results.total_evaluations}</p>
                    <p>Debate Topic: ${this.currentDebate.topic}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">
                    Close Results
                </button>
            </div>
        `;

        document.body.appendChild(modal);
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

// Initialize the debate platform when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DebatePlatform();
});