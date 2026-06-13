import axios, { AxiosInstance, AxiosError } from 'axios';

export interface JulesSessionPayload {
  prompt: string;
  sourceContext: {
    source: string;
    githubRepoContext: {
      startingBranch: string;
    }
  };
  automationMode: string;
  [key: string]: any;
}

export class GoogleJulesClient {
  private client: AxiosInstance;

  constructor(private apiKey: string) {
    if (!this.apiKey) {
      throw new Error('Google Jules API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://jules.googleapis.com/v1alpha',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Intercept errors for better formatting
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorData = error.response?.data || error.message;
        const status = error.response?.status;
        console.error(`[GoogleJulesClient] HTTP ${status} Error:`, errorData);
        return Promise.reject({ status, error: errorData });
      }
    );
  }

  async getSources() {
    const response = await this.client.get('/sources');
    return response.data;
  }

  async createSession(payload: JulesSessionPayload) {
    const response = await this.client.post('/sessions', payload);
    return response.data;
  }

  async checkStatus(sessionId: string) {
    const response = await this.client.get(`/sessions/${sessionId}/activities`);
    return response.data;
  }

  async approvePlan(sessionId: string, payload: any = {}) {
    const response = await this.client.post(`/sessions/${sessionId}:approvePlan`, payload);
    return response.data;
  }

  async sendFeedback(sessionId: string, prompt: string) {
    const response = await this.client.post(`/sessions/${sessionId}:sendMessage`, { prompt });
    return response.data;
  }
}
