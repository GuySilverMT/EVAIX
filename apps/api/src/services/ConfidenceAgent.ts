// import { AgentFactoryService } from './AgentFactory.js';
import { ProviderManager } from "./ProviderManager.js";
import { PrismaAgentConfigRepository } from '../repositories/PrismaAgentConfigRepository.js';
import type { CardAgentState } from '../types.js';

/**
 * ConfidenceAgent: Wraps agent execution with confidence scoring and self-correction
 * 
 * Purpose: Stop hallucinations before they spread by requiring agents to self-assess
 * their confidence in their outputs. If confidence is below threshold, triggers
 * a self-correction loop.
 * 
 * This implements the "Quality Control" layer of the Intelligence System.
 */

export interface ConfidenceResult {
  output: string;
  confidence: number;
  correctionAttempts: number;
  reasoning?: string;
}

export interface ConfidenceConfig {
  minConfidence?: number; // Default 0.8
  maxCorrectionAttempts?: number; // Default 3
  requireReasoning?: boolean; // Default true
}

export class ConfidenceAgent {
//   private agentFactory: AgentFactoryService;
  
  constructor() {
      // this.agentFactory = new AgentFactoryService(
      //   ProviderManager.getInstance(),
      //   new PrismaAgentConfigRepository()
      // );
  }

  /**
   * Execute a task with confidence scoring and self-correction
   * 
   * @param cardConfig - The agent configuration
   * @param userGoal - The task to execute
   * @param config - Confidence configuration
   * @returns Result with output, confidence score, and correction attempts
   */
  async executeWithConfidence(
    cardConfig: CardAgentState,
    userGoal: string,
    config: ConfidenceConfig = {}
  ): Promise<ConfidenceResult> {
    const minConfidence = config.minConfidence ?? 0.8;
    const maxAttempts = config.maxCorrectionAttempts ?? 3;
    const requireReasoning = config.requireReasoning ?? true;

    let correctionAttempts = 0;
    let lastOutput = '';
    let lastConfidence = 0;
    let lastReasoning = '';

    // Create the base agent
    // const agent = await this.agentFactory.createVolcanoAgent(cardConfig);
    const agent: { generate: (p: string) => Promise<string> } = { generate: async () => "Mocked Confidence" };

    // Augment the prompt to request confidence scoring
    const confidencePrompt = this.buildConfidencePrompt(userGoal, requireReasoning);

    while (correctionAttempts < maxAttempts) {
      try {
        // Generate response with confidence scoring
        if (!agent) throw new Error("Confidence agent DISABLED");
        const rawResponse = await agent.generate(confidencePrompt);
        
        // Parse the response to extract confidence and output
        const parsed = this.parseConfidenceResponse(rawResponse);
        
        lastOutput = parsed.output;
        lastConfidence = parsed.confidence;
        lastReasoning = parsed.reasoning || '';

        // Check if confidence meets threshold
        if (lastConfidence >= minConfidence) {
          console.log(`[ConfidenceAgent] ✓ Confidence ${lastConfidence.toFixed(2)} meets threshold ${minConfidence}`);
          return {
            output: lastOutput,
            confidence: lastConfidence,
            correctionAttempts,
            reasoning: lastReasoning
          };
        }

        // Confidence too low, trigger self-correction
        console.warn(`[ConfidenceAgent] ⚠ Confidence ${lastConfidence.toFixed(2)} below threshold ${minConfidence}. Attempting correction ${correctionAttempts + 1}/${maxAttempts}`);
        
        correctionAttempts++;
        
        // If we have more attempts, modify the prompt for self-correction
        if (correctionAttempts < maxAttempts) {
          const correctionPrompt = this.buildCorrectionPrompt(
            userGoal,
            lastOutput,
            lastConfidence,
            lastReasoning,
            requireReasoning
          );
          
          // Use the correction prompt for next iteration
          const correctedResponse = await agent.generate(correctionPrompt);
          const correctedParsed = this.parseConfidenceResponse(correctedResponse);
          
          lastOutput = correctedParsed.output;
          lastConfidence = correctedParsed.confidence;
          lastReasoning = correctedParsed.reasoning || '';
          
          // Check again after correction
          if (lastConfidence >= minConfidence) {
            console.log(`[ConfidenceAgent] ✓ After correction: Confidence ${lastConfidence.toFixed(2)} meets threshold`);
            return {
              output: lastOutput,
              confidence: lastConfidence,
              correctionAttempts,
              reasoning: lastReasoning
            };
          }
        }
      } catch (error: any) {
        console.error(`[ConfidenceAgent] Error during execution:`, error);
        // Return what we have with low confidence
        return {
          output: lastOutput || `Error: ${error.message}`,
          confidence: 0,
          correctionAttempts,
          reasoning: `Execution failed: ${error.message}`
        };
      }
    }

    // Max attempts reached, return best effort
    console.warn(`[ConfidenceAgent] ⚠ Max correction attempts reached. Final confidence: ${lastConfidence.toFixed(2)}`);
    return {
      output: lastOutput,
      confidence: lastConfidence,
      correctionAttempts,
      reasoning: lastReasoning
    };
  }

  /**
   * Build a prompt that requests confidence scoring
   */
  private buildConfidencePrompt(userGoal: string, requireReasoning: boolean): string {
    return `${userGoal}

IMPORTANT: You must respond with a JSON object in the following format:
{
  "output": "your actual response to the task",
  "confidence": 0.95,${requireReasoning ? '\n  "reasoning": "brief explanation of your confidence level",' : ''}
}

The confidence score should be between 0.0 and 1.0, where:
- 0.9-1.0: Very confident, well-established facts or straightforward tasks
- 0.7-0.9: Moderately confident, some assumptions or complexity
- 0.5-0.7: Low confidence, significant uncertainty or speculation
- 0.0-0.5: Very uncertain, mostly guessing

Be honest about your confidence level. It's better to admit uncertainty than to hallucinate.`;
  }

  /**
   * Build a prompt for self-correction
   */
  private buildCorrectionPrompt(
    originalGoal: string,
    previousOutput: string,
    previousConfidence: number,
    previousReasoning: string,
    requireReasoning: boolean
  ): string {
    return `You previously attempted this task but your confidence was too low (${previousConfidence.toFixed(2)}).

ORIGINAL TASK:
${originalGoal}

YOUR PREVIOUS RESPONSE:
${previousOutput}

YOUR PREVIOUS REASONING:
${previousReasoning}

Please try again with more careful analysis. Consider:
1. What assumptions did you make that might be wrong?
2. What information are you uncertain about?
3. How can you provide a more accurate or complete response?

Respond with a JSON object in the following format:
{
  "output": "your improved response",
  "confidence": 0.95,${requireReasoning ? '\n  "reasoning": "explanation of what you improved and why you\'re more confident",' : ''}
}`;
  }

  /**
   * Parse the agent's response to extract confidence and output
   */
  private parseConfidenceResponse(rawResponse: string): {
    output: string;
    confidence: number;
    reasoning?: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // No JSON found, treat entire response as output with low confidence
        return {
          output: rawResponse,
          confidence: 0.5,
          reasoning: 'No confidence score provided'
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        output: parsed.output || rawResponse,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning
      };
    } catch (error) {
      // Parsing failed, return raw response with low confidence
      console.warn('[ConfidenceAgent] Failed to parse confidence response:', error);
      return {
        output: rawResponse,
        confidence: 0.5,
        reasoning: 'Failed to parse confidence score'
      };
    }
  }
}

// Singleton instance
export const confidenceAgent = new ConfidenceAgent();
