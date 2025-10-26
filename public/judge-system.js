/**
 * Multi-Agent AI Judge System for Live Debate Evaluation
 * Provides real-time scoring and feedback using multiple AI models
 */

class BaseJudge {
    constructor(judgeType, modelName) {
        this.judgeType = judgeType; // "logic", "persuasion", "evidence", "flow"
        this.modelName = modelName; // "claude", "openai", "gemini"
    }

    getJudgePrompt(transcriptText, debateTopic, position) {
        const baseContext = `
You are an expert debate judge evaluating a ${position} argument on the topic: "${debateTopic}"

Argument to evaluate:
${transcriptText}

Your task is to evaluate this argument specifically for ${this.judgeType.toUpperCase()} and provide:
1. A score from 0-100 for both PRO and CON positions
2. Detailed reasoning for your scores
3. Specific feedback on strengths and weaknesses
4. Detected logical fallacies (if any)

Structure your response as JSON with this format:
{
    "pro_score": 75,
    "con_score": 25,
    "reasoning": "detailed explanation here",
    "feedback": {
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "suggestions": ["suggestion1", "suggestion2"]
    },
    "fallacies_detected": ["fallacy1", "fallacy2"],
    "argument_structure": {
        "claim": "identified claim",
        "warrant": "identified warrant",
        "data": "identified data",
        "impact": "identified impact"
    }
}
`;

        if (this.judgeType === "logic") {
            return baseContext + `
LOGIC JUDGE CRITERIA:
- Logical consistency and validity of arguments
- Identification of logical fallacies
- Quality of reasoning chains
- Coherence of argument structure
- Use of evidence to support claims
- Clarity of cause-and-effect relationships

Focus on: Soundness of reasoning, logical flow, absence of fallacies, and argument structure.
`;
        } else if (this.judgeType === "persuasion") {
            return baseContext + `
PERSUASION JUDGE CRITERIA:
- Rhetorical effectiveness and style
- Clarity and accessibility of language
- Emotional appeal and engagement
- Speaker credibility and ethos
- Use of persuasive techniques
- Overall convincingness to an audience

Focus on: How compelling and convincing the argument is to a general audience.
`;
        } else if (this.judgeType === "evidence") {
            return baseContext + `
EVIDENCE JUDGE CRITERIA:
- Quality and credibility of sources
- Relevance of evidence to claims
- Sufficiency of evidence provided
- Accuracy of data and statistics
- Proper use of expert testimony
- Strength of empirical support

Focus on: The quality, quantity, and relevance of evidence presented.
`;
        } else if (this.judgeType === "flow") {
            return `
You are an expert competitive debate judge with extensive tournament experience. You evaluate debates using traditional competitive debate criteria.

DEBATE TOPIC: "${debateTopic}"
CURRENT ARGUMENT POSITION: ${position.toUpperCase()}
STATEMENT TO EVALUATE: ${transcriptText}

Your task is to evaluate this statement using COMPETITIVE DEBATE STANDARDS:

1. ARGUMENT COVERAGE & CLASH:
   - Does this respond to opponent arguments?
   - Is there meaningful clash and engagement?
   - Are key arguments being dropped or addressed?

2. IMPACT CALCULUS:
   - What are the impacts (consequences) claimed?
   - How do impacts compare in magnitude, probability, timeframe?
   - Is there clear impact comparison and weighing?

3. FRAMEWORK ANALYSIS:
   - What evaluative framework is established?
   - Are there competing value premises or criteria?
   - How should arguments be weighed and prioritized?

4. TOPICALITY & RESOLUTION:
   - Does the argument directly relate to the debate resolution?
   - Is the interpretation of key terms reasonable?
   - Does this advance the burden of proof appropriately?

Provide JSON response:
{
    "pro_score": 75,
    "con_score": 25,
    "reasoning": "detailed competitive analysis here",
    "feedback": {
        "strengths": ["competitive strength 1", "competitive strength 2"],
        "weaknesses": ["competitive weakness 1", "competitive weakness 2"],
        "suggestions": ["competitive improvement 1", "competitive improvement 2"]
    },
    "competitive_analysis": {
        "argument_coverage": "analysis of clash and coverage",
        "impact_calculus": "impact comparison and weighing",
        "framework": "evaluative framework analysis",
        "topicality": "resolution relevance assessment",
        "strategic_value": "tournament strategic assessment"
    },
    "flow_breakdown": {
        "constructive_strength": 85,
        "rebuttal_effectiveness": 70,
        "impact_development": 90,
        "argument_extension": 75
    }
}

Focus on: Competition-level argument analysis, flow tracking, impact weighing, and traditional debate judging criteria.
`;
        }
    }

    async evaluateArgument(transcriptText, debateTopic, position) {
        throw new Error("Each judge must implement evaluateArgument method");
    }

    getErrorResponse(errorMsg) {
        return {
            pro_score: 0,
            con_score: 0,
            reasoning: `Error in evaluation: ${errorMsg}`,
            feedback: { strengths: [], weaknesses: [], suggestions: [] },
            fallacies_detected: [],
            argument_structure: { claim: "", warrant: "", data: "", impact: "" }
        };
    }
}

class ClaudeLogicJudge extends BaseJudge {
    constructor() {
        super("logic", "claude");
    }

    async evaluateArgument(transcriptText, debateTopic, position) {
        try {
            const prompt = this.getJudgePrompt(transcriptText, debateTopic, position);

            const response = await fetch('/api/claude-evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: `You are an expert debate judge focused on logical reasoning and argument structure.\n\n${prompt}`,
                    judgeType: this.judgeType
                }),
            });

            const result = await response.json();

            if (result.error) {
                console.error('Claude Logic Judge error:', result.error);
                return this.getErrorResponse(result.error);
            }

            // Parse JSON response
            try {
                const evaluation = JSON.parse(result.content);
                return evaluation;
            } catch (jsonError) {
                // Fallback if JSON parsing fails
                return {
                    pro_score: 50,
                    con_score: 50,
                    reasoning: result.content,
                    feedback: { strengths: [], weaknesses: [], suggestions: [] },
                    fallacies_detected: [],
                    argument_structure: { claim: "", warrant: "", data: "", impact: "" }
                };
            }

        } catch (error) {
            console.error('Claude Logic Judge error:', error);
            return this.getErrorResponse(error.message);
        }
    }
}

class ClaudePersuasionJudge extends BaseJudge {
    constructor() {
        super("persuasion", "claude");
    }

    async evaluateArgument(transcriptText, debateTopic, position) {
        try {
            const prompt = this.getJudgePrompt(transcriptText, debateTopic, position);

            const response = await fetch('/api/claude-evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    judgeType: this.judgeType
                }),
            });

            const result = await response.json();

            if (result.error) {
                console.error('Claude Persuasion Judge error:', result.error);
                return this.getErrorResponse(result.error);
            }

            try {
                const evaluation = JSON.parse(result.content);
                return evaluation;
            } catch (jsonError) {
                return {
                    pro_score: 50,
                    con_score: 50,
                    reasoning: result.content,
                    feedback: { strengths: [], weaknesses: [], suggestions: [] },
                    fallacies_detected: [],
                    argument_structure: { claim: "", warrant: "", data: "", impact: "" }
                };
            }

        } catch (error) {
            console.error('Claude Persuasion Judge error:', error);
            return this.getErrorResponse(error.message);
        }
    }
}

class ClaudeFlowJudge extends BaseJudge {
    constructor() {
        super("flow", "claude");
        this.debateContexts = {};
    }

    async evaluateArgument(transcriptText, debateTopic, position, debateContext = null) {
        try {
            let prompt = this.getJudgePrompt(transcriptText, debateTopic, position);

            // Add context if available
            if (debateContext) {
                const contextPrompt = `
DEBATE CONTEXT FOR FLOW ANALYSIS:
Previous Arguments: ${JSON.stringify(debateContext.previous_arguments || [])}
Opponent Arguments: ${JSON.stringify(debateContext.opponent_arguments || [])}
Current Round: ${debateContext.current_round || 'Unknown'}
Time Elapsed: ${debateContext.time_elapsed || 'Unknown'}

Consider this context when evaluating argument coverage, clash, and strategic positioning.
`;
                prompt = contextPrompt + "\n" + prompt;
            }

            const response = await fetch('/api/claude-evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    judgeType: this.judgeType
                }),
            });

            const result = await response.json();

            if (result.error) {
                console.error('Claude Flow Judge error:', result.error);
                return this.getErrorResponse(result.error);
            }

            try {
                const evaluation = JSON.parse(result.content);
                return evaluation;
            } catch (jsonError) {
                // Try to extract scores from text if JSON parsing fails
                const proMatch = result.content.match(/"pro_score":\s*(\d+)/);
                const conMatch = result.content.match(/"con_score":\s*(\d+)/);

                return {
                    pro_score: proMatch ? parseInt(proMatch[1]) : 50,
                    con_score: conMatch ? parseInt(conMatch[1]) : 50,
                    reasoning: result.content.substring(0, 500) + "...",
                    feedback: { strengths: [], weaknesses: [], suggestions: [] },
                    competitive_analysis: {
                        argument_coverage: "Analysis incomplete",
                        impact_calculus: "Analysis incomplete",
                        framework: "Analysis incomplete",
                        topicality: "Analysis incomplete",
                        strategic_value: "Analysis incomplete"
                    },
                    flow_breakdown: {
                        constructive_strength: 50,
                        rebuttal_effectiveness: 50,
                        impact_development: 50,
                        argument_extension: 50
                    }
                };
            }

        } catch (error) {
            console.error('Claude Flow Judge error:', error);
            return this.getErrorResponse(error.message);
        }
    }

    updateDebateContext(debateId, newArgument, position) {
        if (!this.debateContexts[debateId]) {
            this.debateContexts[debateId] = {
                pro_arguments: [],
                con_arguments: [],
                argument_history: []
            };
        }

        const context = this.debateContexts[debateId];

        // Add to position-specific arguments
        if (position.toLowerCase() === "pro") {
            context.pro_arguments.push(newArgument);
        } else {
            context.con_arguments.push(newArgument);
        }

        // Add to general history
        context.argument_history.push({
            position: position,
            argument: newArgument,
            timestamp: new Date().toISOString()
        });
    }
}

class MultiAgentJudgeSystem {
    constructor() {
        this.logicJudge = new ClaudeLogicJudge();
        this.persuasionJudge = new ClaudePersuasionJudge();
        this.flowJudge = new ClaudeFlowJudge();

        this.evaluationHistory = [];
        this.participantScores = {
            pro: { logic: [], persuasion: [], flow: [], total: [] },
            con: { logic: [], persuasion: [], flow: [], total: [] }
        };
    }

    async evaluateTranscriptSegment(transcriptText, debateId, debateTopic, position) {
        console.log(`🔍 Evaluating ${position} argument:`, transcriptText.substring(0, 100) + "...");

        // Update flow judge context
        this.flowJudge.updateDebateContext(debateId, transcriptText, position);
        const debateContext = this.flowJudge.debateContexts[debateId] || {};

        // Run all judges in parallel
        const judgePromises = [
            this.logicJudge.evaluateArgument(transcriptText, debateTopic, position),
            this.persuasionJudge.evaluateArgument(transcriptText, debateTopic, position),
            this.flowJudge.evaluateArgument(transcriptText, debateTopic, position, debateContext)
        ];

        try {
            const results = await Promise.allSettled(judgePromises);
            const judges = [this.logicJudge, this.persuasionJudge, this.flowJudge];

            const evaluations = [];

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const judge = judges[i];

                let evaluation;
                if (result.status === 'fulfilled') {
                    evaluation = result.value;
                } else {
                    console.error(`Judge ${judge.judgeType} failed:`, result.reason);
                    evaluation = judge.getErrorResponse(result.reason.message);
                }

                evaluation.judgeType = judge.judgeType;
                evaluation.modelName = judge.modelName;
                evaluation.timestamp = Date.now();
                evaluation.position = position;

                evaluations.push(evaluation);

                // Store scores for tracking
                this.updateParticipantScores(position, judge.judgeType, evaluation);
            }

            // Store evaluation in history
            this.evaluationHistory.push({
                debateId,
                position,
                transcriptText,
                evaluations,
                timestamp: Date.now()
            });

            console.log(`✅ Evaluation complete for ${position} - ${evaluations.length} judges`);
            return evaluations;

        } catch (error) {
            console.error('Error in judge system evaluation:', error);
            return [];
        }
    }

    updateParticipantScores(position, judgeType, evaluation) {
        const pos = position.toLowerCase();
        if (this.participantScores[pos] && this.participantScores[pos][judgeType]) {
            const score = pos === 'pro' ? evaluation.pro_score : evaluation.con_score;
            this.participantScores[pos][judgeType].push(score);

            // Calculate running total
            const avgLogic = this.getAverageScore(pos, 'logic');
            const avgPersuasion = this.getAverageScore(pos, 'persuasion');
            const avgFlow = this.getAverageScore(pos, 'flow');
            const total = (avgLogic + avgPersuasion + avgFlow) / 3;

            this.participantScores[pos].total.push(total);
        }
    }

    getAverageScore(position, judgeType) {
        const scores = this.participantScores[position][judgeType];
        if (scores.length === 0) return 0;
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    getCurrentScores() {
        return {
            pro: {
                logic: this.getAverageScore('pro', 'logic'),
                persuasion: this.getAverageScore('pro', 'persuasion'),
                flow: this.getAverageScore('pro', 'flow'),
                total: this.getAverageScore('pro', 'total')
            },
            con: {
                logic: this.getAverageScore('con', 'logic'),
                persuasion: this.getAverageScore('con', 'persuasion'),
                flow: this.getAverageScore('con', 'flow'),
                total: this.getAverageScore('con', 'total')
            }
        };
    }

    getLatestFeedback(position) {
        const recent = this.evaluationHistory
            .filter(e => e.position.toLowerCase() === position.toLowerCase())
            .slice(-1)[0];

        if (!recent) return null;

        const feedback = {
            strengths: [],
            weaknesses: [],
            suggestions: [],
            fallacies: []
        };

        recent.evaluations.forEach(evaluation => {
            if (evaluation.feedback) {
                feedback.strengths.push(...(evaluation.feedback.strengths || []));
                feedback.weaknesses.push(...(evaluation.feedback.weaknesses || []));
                feedback.suggestions.push(...(evaluation.feedback.suggestions || []));
            }
            if (evaluation.fallacies_detected) {
                feedback.fallacies.push(...evaluation.fallacies_detected);
            }
        });

        return feedback;
    }

    getDebateConsensus() {
        const scores = this.getCurrentScores();

        if (scores.pro.total === 0 && scores.con.total === 0) {
            return {
                winner: "tie",
                margin: 0,
                decision_strength: "no_data",
                scores: scores
            };
        }

        const winner = scores.pro.total > scores.con.total ? "pro" : "con";
        const margin = Math.abs(scores.pro.total - scores.con.total);

        let decision_strength;
        if (margin > 20) decision_strength = "decisive";
        else if (margin > 10) decision_strength = "close";
        else decision_strength = "very_close";

        return {
            winner,
            margin: Math.round(margin * 100) / 100,
            decision_strength,
            scores,
            evaluation_count: this.evaluationHistory.length
        };
    }
}

// Export for use in other modules
window.MultiAgentJudgeSystem = MultiAgentJudgeSystem;