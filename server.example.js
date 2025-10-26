const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3003;

// Video SDK credentials - Replace with your actual credentials
const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY || "your-videosdk-api-key-here";
const VIDEOSDK_SECRET = process.env.VIDEOSDK_SECRET || "your-videosdk-secret-here";

// Deepgram credentials - Replace with your actual API key
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || "your-deepgram-api-key-here";

// Claude credentials - Replace with your actual API key (optional for AI judging)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "your-claude-api-key-here";

// In-memory storage for debates (in production, use a real database)
let activeDebates = [];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generate Video SDK JWT token
function generateVideoSDKToken() {
  function base64UrlEscape(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function base64UrlEncode(str) {
    return base64UrlEscape(Buffer.from(str).toString('base64'));
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ["allow_join", "allow_mod"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const data = encodedHeader + '.' + encodedPayload;
  const signature = crypto.createHmac('sha256', VIDEOSDK_SECRET).update(data).digest('base64');
  const encodedSignature = base64UrlEscape(signature);

  return data + '.' + encodedSignature;
}

// Create a new Video SDK room
async function createVideoSDKRoom() {
  const token = generateVideoSDKToken();

  try {
    const response = await fetch("https://api.videosdk.live/v2/rooms", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return { roomId: data.roomId, token };
  } catch (error) {
    console.error('Error creating Video SDK room:', error);
    throw error;
  }
}

// API Routes

// Get Deepgram API key for transcription
app.get('/api/deepgram-key', (req, res) => {
  if (!DEEPGRAM_API_KEY || DEEPGRAM_API_KEY === 'your-deepgram-api-key-here') {
    return res.status(500).json({ error: 'Deepgram API key not configured' });
  }
  res.json({ apiKey: DEEPGRAM_API_KEY });
});

// Claude API endpoint for judge evaluations
app.post('/api/claude-evaluate', async (req, res) => {
  try {
    const { prompt, judgeType } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Check if Claude API key is configured
    if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your-claude-api-key-here') {
      // Return simulated response for demo purposes
      const simulatedResponse = await simulateClaudeResponse(prompt, judgeType);
      return res.json({ content: simulatedResponse });
    }

    // TODO: Implement actual Claude API integration here
    // const response = await callClaudeAPI(prompt, judgeType);
    // res.json({ content: response });

    // For now, return simulated response
    const simulatedResponse = await simulateClaudeResponse(prompt, judgeType);
    res.json({ content: simulatedResponse });

  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to evaluate with Claude' });
  }
});

// Simulate Claude API response for testing/demo purposes
async function simulateClaudeResponse(prompt, judgeType) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Generate realistic scores based on judge type
  let proScore, conScore;

  if (judgeType === 'logic') {
    proScore = 70 + Math.floor(Math.random() * 20);
    conScore = 100 - proScore + Math.floor(Math.random() * 10) - 5;
  } else if (judgeType === 'persuasion') {
    proScore = 65 + Math.floor(Math.random() * 25);
    conScore = 100 - proScore + Math.floor(Math.random() * 10) - 5;
  } else if (judgeType === 'flow') {
    proScore = 75 + Math.floor(Math.random() * 20);
    conScore = 100 - proScore + Math.floor(Math.random() * 10) - 5;
  } else {
    proScore = 70 + Math.floor(Math.random() * 20);
    conScore = 100 - proScore + Math.floor(Math.random() * 10) - 5;
  }

  // Ensure scores are within bounds
  proScore = Math.max(0, Math.min(100, proScore));
  conScore = Math.max(0, Math.min(100, conScore));

  const response = {
    pro_score: proScore,
    con_score: conScore,
    reasoning: `This ${judgeType} evaluation considers the argument's strength in ${judgeType} criteria. The argument shows solid foundation but could be improved.`,
    feedback: {
      strengths: [
        `Strong ${judgeType} foundation`,
        "Clear argument structure",
        "Good use of supporting evidence"
      ],
      weaknesses: [
        `Could strengthen ${judgeType} elements`,
        "Some gaps in reasoning",
        "Could address counterarguments better"
      ],
      suggestions: [
        `Focus more on ${judgeType} aspects`,
        "Provide stronger evidence",
        "Address potential objections"
      ]
    },
    fallacies_detected: Math.random() > 0.7 ? ["Appeal to emotion"] : [],
    argument_structure: {
      claim: "Extracted main claim",
      warrant: "Identified reasoning",
      data: "Supporting evidence found",
      impact: "Potential consequences noted"
    }
  };

  if (judgeType === 'flow') {
    response.competitive_analysis = {
      argument_coverage: "Good coverage of key points",
      impact_calculus: "Clear impact comparison",
      framework: "Solid evaluative framework",
      topicality: "Directly relates to resolution",
      strategic_value: "Strong strategic positioning"
    };
    response.flow_breakdown = {
      constructive_strength: proScore - 5 + Math.floor(Math.random() * 10),
      rebuttal_effectiveness: proScore - 10 + Math.floor(Math.random() * 20),
      impact_development: proScore + Math.floor(Math.random() * 10),
      argument_extension: proScore - 5 + Math.floor(Math.random() * 15)
    };
  }

  return JSON.stringify(response, null, 2);
}

// Get all active debates
app.get('/api/debates', (req, res) => {
  // Filter out full debates and clean up old ones
  const now = Date.now();
  activeDebates = activeDebates.filter(debate =>
    now - debate.createdAt < 24 * 60 * 60 * 1000 // Remove debates older than 24 hours
  );

  res.json(activeDebates);
});

// Create a new debate
app.post('/api/debates', async (req, res) => {
  try {
    const { topic, description, creatorName, category, position } = req.body;

    if (!topic || !creatorName) {
      return res.status(400).json({ error: 'Topic and creator name are required' });
    }

    // Check if VideoSDK credentials are configured
    if (!VIDEOSDK_API_KEY || VIDEOSDK_API_KEY === 'your-videosdk-api-key-here') {
      return res.status(500).json({ error: 'VideoSDK credentials not configured' });
    }

    // Create Video SDK room
    const { roomId, token } = await createVideoSDKRoom();

    const debate = {
      id: uuidv4(),
      topic: topic.trim(),
      description: description?.trim() || '',
      category: category || 'General',
      position: position || 'Pro',
      creatorName: creatorName.trim(),
      roomId,
      token,
      participants: [
        {
          name: creatorName.trim(),
          position: position || 'Pro',
          joinedAt: Date.now()
        }
      ],
      status: 'waiting', // waiting, active, finished
      createdAt: Date.now(),
      maxParticipants: 2
    };

    activeDebates.push(debate);

    // Broadcast new debate to all connected clients
    broadcastUpdate();

    res.json({
      success: true,
      debate: {
        id: debate.id,
        topic: debate.topic,
        description: debate.description,
        category: debate.category,
        position: debate.position,
        creatorName: debate.creatorName,
        roomId: debate.roomId,
        token: debate.token,
        status: debate.status,
        participants: debate.participants,
        createdAt: debate.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating debate:', error);
    res.status(500).json({ error: 'Failed to create debate' });
  }
});

// Join a debate
app.post('/api/debates/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantName, position } = req.body;

    if (!participantName) {
      return res.status(400).json({ error: 'Participant name is required' });
    }

    const debate = activeDebates.find(d => d.id === id);
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    if (debate.participants.length >= debate.maxParticipants) {
      return res.status(400).json({ error: 'Debate is full' });
    }

    if (debate.status === 'finished') {
      return res.status(400).json({ error: 'Debate has ended' });
    }

    // Add participant
    debate.participants.push({
      name: participantName.trim(),
      position: position || 'Con',
      joinedAt: Date.now()
    });

    // Update status to active if we have 2 participants
    if (debate.participants.length === 2) {
      debate.status = 'active';
    }

    // Broadcast update
    broadcastUpdate();

    res.json({
      success: true,
      debate: {
        id: debate.id,
        topic: debate.topic,
        description: debate.description,
        roomId: debate.roomId,
        token: debate.token,
        status: debate.status,
        participants: debate.participants
      }
    });
  } catch (error) {
    console.error('Error joining debate:', error);
    res.status(500).json({ error: 'Failed to join debate' });
  }
});

// Leave a debate
app.post('/api/debates/:id/leave', (req, res) => {
  try {
    const { id } = req.params;
    const { participantName } = req.body;

    const debate = activeDebates.find(d => d.id === id);
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    // Remove participant
    debate.participants = debate.participants.filter(p => p.name !== participantName);

    // Update status or remove debate if empty
    if (debate.participants.length === 0) {
      activeDebates = activeDebates.filter(d => d.id !== id);
    } else if (debate.participants.length === 1) {
      debate.status = 'waiting';
    }

    // Broadcast update
    broadcastUpdate();

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving debate:', error);
    res.status(500).json({ error: 'Failed to leave debate' });
  }
});

// WebSocket for real-time updates
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current debates to new client
  ws.send(JSON.stringify({
    type: 'debates_update',
    data: activeDebates
  }));

  ws.on('close', () => {
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastUpdate() {
  const message = JSON.stringify({
    type: 'debates_update',
    data: activeDebates
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Clean up old debates every hour
setInterval(() => {
  const now = Date.now();
  const before = activeDebates.length;
  activeDebates = activeDebates.filter(debate =>
    now - debate.createdAt < 24 * 60 * 60 * 1000
  );

  if (activeDebates.length !== before) {
    console.log(`Cleaned up ${before - activeDebates.length} old debates`);
    broadcastUpdate();
  }
}, 60 * 60 * 1000); // Every hour

server.listen(PORT, () => {
  console.log(`Debate Platform Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Configuration Status:');
  console.log('- VideoSDK API Key:', VIDEOSDK_API_KEY !== 'your-videosdk-api-key-here' ? '✅ Configured' : '❌ Not configured');
  console.log('- Deepgram API Key:', DEEPGRAM_API_KEY !== 'your-deepgram-api-key-here' ? '✅ Configured' : '❌ Not configured');
  console.log('- Claude API Key:', CLAUDE_API_KEY !== 'your-claude-api-key-here' ? '✅ Configured' : '❌ Not configured (using simulated responses)');
  console.log('');
  console.log('To configure API keys, set environment variables or update the constants at the top of this file.');
});