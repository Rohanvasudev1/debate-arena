# 🎙️ AI-Powered Debate Platform

A real-time debate platform with live transcription and AI-powered judging. Create audio-only debate rooms, engage in structured debates, and receive live feedback from multiple AI judges.

## ✨ Features

### 🎯 Core Functionality
- **Audio-Only Debate Rooms**: Clean, distraction-free voice debates
- **Real-Time Transcription**: Live speech-to-text using Deepgram
- **Multi-Agent AI Judging**: Three specialized AI judges evaluate arguments
- **Live Feedback**: Real-time scoring and suggestions during debates
- **Debate Discovery**: Browse and join available debates by topic/category

### 🤖 AI Judge System
- **Logic Judge**: Evaluates reasoning, identifies fallacies, analyzes argument structure
- **Persuasion Judge**: Assesses rhetorical effectiveness, style, and convincingness
- **Flow Judge**: Competitive debate analysis with clash and impact evaluation
- **30-Second Evaluation Cycles**: Continuous assessment with live score updates
- **Final Results**: Comprehensive victory analysis and detailed breakdown

### 🔧 Technical Features
- **WebRTC Audio**: High-quality, low-latency voice communication
- **WebSocket Real-Time**: Live updates for debates and participants
- **Responsive Design**: Works on desktop and mobile devices
- **No Registration Required**: Jump straight into debates

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- API keys for external services

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd debate-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API keys**
Copy `server.example.js` to `server.js` and add your API keys:
```javascript
const VIDEOSDK_API_KEY = "your-videosdk-api-key";
const VIDEOSDK_SECRET = "your-videosdk-secret";
const DEEPGRAM_API_KEY = "your-deepgram-api-key";
const CLAUDE_API_KEY = "your-claude-api-key"; // Optional
```

Or use environment variables:
```bash
export VIDEOSDK_API_KEY=your-videosdk-api-key
export VIDEOSDK_SECRET=your-videosdk-secret
export DEEPGRAM_API_KEY=your-deepgram-api-key
export CLAUDE_API_KEY=your-claude-api-key
```

4. **Start the server**
```bash
npm start
```

5. **Open in browser**
Visit `http://localhost:3003`

## 🔑 API Keys Setup

### Required Services

#### VideoSDK (Required for audio rooms)
1. Sign up at [VideoSDK.live](https://videosdk.live)
2. Get your API Key and Secret from the dashboard
3. Add to your configuration

#### Deepgram (Required for transcription)
1. Sign up at [Deepgram.com](https://deepgram.com)
2. Get your API key from the console
3. Add to your configuration

#### Claude API (Optional for AI judging)
1. Get access to Anthropic's Claude API
2. Add your API key to configuration
3. Without this, simulated AI responses will be used

## 📁 Project Structure

```
debate-platform/
├── public/                    # Frontend files
│   ├── index.html            # Main HTML file
│   ├── app.js                # Main application logic
│   ├── transcription.js      # Deepgram transcription service
│   └── judge-system.js       # Multi-agent AI judge system
├── server.js                 # Main server (with your API keys)
├── server.example.js         # Example server (safe for GitHub)
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🎮 How to Use

### Creating a Debate
1. Enter your name and debate topic
2. Choose a category and your position (Pro/Con)
3. Click "Create Debate Room"
4. Share the room with others or wait for someone to join

### Joining a Debate
1. Browse available debates on the main page
2. Click "Join Debate" on any open room
3. Enter your name and you'll be placed in the opposing position
4. Start debating once both participants are connected

### During the Debate
1. **Start Transcription**: Click the transcription button to enable live speech-to-text
2. **AI Evaluation**: The system evaluates arguments every 30 seconds
3. **Live Scores**: See real-time scores for Logic, Persuasion, and Flow
4. **Live Feedback**: Get suggestions and identify strengths/weaknesses
5. **Final Results**: View comprehensive results when the debate ends

## 🏗️ Architecture

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **WebRTC**: VideoSDK for audio communication
- **WebSocket**: Real-time updates and notifications
- **Responsive CSS**: Mobile-friendly design

### Backend
- **Express.js**: Web server and API endpoints
- **WebSocket**: Real-time communication
- **In-Memory Storage**: Simple debate management (upgrade to database for production)

### AI Services
- **Deepgram**: WebSocket-based live transcription
- **Claude API**: Multi-agent debate evaluation
- **Simulated Responses**: Fallback when API keys not configured

## 🔧 Development

### Running in Development
```bash
# Install dependencies
npm install

# Start with nodemon for auto-restart
npm run dev
```

### Testing API Endpoints
```bash
# Test Deepgram key
curl http://localhost:3003/api/deepgram-key

# Test AI evaluation
curl -X POST http://localhost:3003/api/claude-evaluate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"AI will help humanity","judgeType":"logic"}'
```

## 🚀 Deployment

### Environment Variables
Set these in your deployment environment:
```
PORT=3003
VIDEOSDK_API_KEY=your-key
VIDEOSDK_SECRET=your-secret
DEEPGRAM_API_KEY=your-key
CLAUDE_API_KEY=your-key
```

### Database Upgrade
For production, replace the in-memory `activeDebates` array with a proper database:
- **SQLite**: Simple file-based database
- **PostgreSQL**: Full-featured database
- **MongoDB**: Document-based storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **VideoSDK**: WebRTC infrastructure
- **Deepgram**: Real-time speech recognition
- **Anthropic Claude**: AI-powered debate evaluation
- **Express.js**: Web framework
- **WebSocket**: Real-time communication

## 📞 Support

For questions or issues:
1. Check existing GitHub Issues
2. Create a new issue with detailed description
3. Include browser console logs if applicable

---

**Happy Debating! 🎯**