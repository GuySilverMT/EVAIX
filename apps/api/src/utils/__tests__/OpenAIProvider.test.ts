import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../OpenAIProvider.js';

const createMock = vi.fn();

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: createMock,
    },
  })),
}));

describe('OpenAIProvider embedding routing', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('calls the embeddings API with the requested model', async () => {
    createMock.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });

    const provider = new OpenAIProvider({ id: 'litellm-router', apiKey: 'test-key', baseURL: 'http://localhost:4001/v1' });
    const result = await provider.generateEmbedding('hello world', 'text-embedding-3-small');

    expect(createMock).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'hello world',
    });
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });
});
