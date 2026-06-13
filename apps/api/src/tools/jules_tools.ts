import { GoogleJulesClient } from '../utils/GoogleJulesClient.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function getClient(): GoogleJulesClient {
  const apiKey = process.env.JULES_API_KEY || process.env.GOOGLE_JULES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing JULES_API_KEY environment variable.");
  }
  return new GoogleJulesClient(apiKey);
}

const createSessionSchema = z.object({
  sourceName: z.string().describe("The repository string for source context"),
  branch: z.string().describe("The starting branch for the GitHub repository context"),
  prompt: z.string().describe("The architecture prompt or task instruction"),
  requirePlanApproval: z.boolean().describe("Whether plan approval is required")
});

const sessionIdSchema = z.object({
  sessionId: z.string().describe("The ID of the Google Jules session")
});

const sendFeedbackSchema = z.object({
  sessionId: z.string().describe("The ID of the Google Jules session"),
  prompt: z.string().describe("The follow-up instruction or feedback prompt")
});

export const julesTools = [
  {
    name: 'jules_create_session',
    description: 'Calls POST /sessions to create a new coding session with Google Jules. Use this to dispatch massive asynchronous coding tasks.',
    inputSchema: zodToJsonSchema(createSessionSchema),
    handler: async (args: z.infer<typeof createSessionSchema>) => {
      try {
        const client = getClient();
        const payload = {
          prompt: args.prompt,
          sourceContext: {
            source: args.sourceName,
            githubRepoContext: {
              startingBranch: args.branch
            }
          },
          automationMode: "AUTO_CREATE_PR",
          requirePlanApproval: args.requirePlanApproval
        };
        const result = await client.createSession(payload);
        return JSON.stringify(result, null, 2);
      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
        return `Error creating Jules session: ${errorMsg}`;
      }
    }
  },
  {
    name: 'jules_check_status',
    description: 'Calls GET /sessions/{sessionId}/activities to return the latest agent actions, plan status, or errors.',
    inputSchema: zodToJsonSchema(sessionIdSchema),
    handler: async (args: z.infer<typeof sessionIdSchema>) => {
      try {
        const client = getClient();
        const result = await client.checkStatus(args.sessionId);
        return JSON.stringify(result, null, 2);
      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
        return `Error checking Jules session status: ${errorMsg}`;
      }
    }
  },
  {
    name: 'jules_approve_plan',
    description: 'Calls POST /sessions/{sessionId}:approvePlan to approve a generated plan in a Jules session.',
    inputSchema: zodToJsonSchema(sessionIdSchema),
    handler: async (args: z.infer<typeof sessionIdSchema>) => {
      try {
        const client = getClient();
        const result = await client.approvePlan(args.sessionId);
        return JSON.stringify(result, null, 2);
      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
        return `Error approving Jules plan: ${errorMsg}`;
      }
    }
  },
  {
    name: 'jules_send_feedback',
    description: 'Calls POST /sessions/{sessionId}:sendMessage to send follow-up instructions to correct or guide the Jules agent.',
    inputSchema: zodToJsonSchema(sendFeedbackSchema),
    handler: async (args: z.infer<typeof sendFeedbackSchema>) => {
      try {
        const client = getClient();
        const result = await client.sendFeedback(args.sessionId, args.prompt);
        return JSON.stringify(result, null, 2);
      } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
        return `Error sending feedback to Jules: ${errorMsg}`;
      }
    }
  }
];
