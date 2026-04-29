import axios from 'axios';

export async function checkProviderHealth(baseUrl: string, apiKey: string): Promise<boolean> {
  try {
    // This is a generic health check. For a more robust solution,
    // you would ideally make a specific API call relevant to the LLM provider
    // (e.g., listing models, a simple completion request) to validate the API key and endpoint.
    // For now, we'll just try to hit the base URL.
    // Note: Many LLM APIs don't have a simple GET / endpoint for health.
    // This might need to be adapted based on actual provider API specifications.

    const response = await axios.get(baseUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000, // 5 second timeout
    });

    // A successful response (e.g., 2xx status) indicates some level of connectivity.
    // For a true health check, you'd parse the response to ensure it's a valid API response.
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error(`Health check failed for ${baseUrl}:`, error instanceof Error ? error.message : error);
    return false;
  }
}
