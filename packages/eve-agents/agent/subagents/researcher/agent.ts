import { defineAgent } from "eve";

export default defineAgent({
  description: "Investigate ambiguous questions before the parent agent responds.",
  // Setting the model to a gateway model id string routes it through Vercel AI Gateway
  model: "anthropic/claude-sonnet-4.6",
});
