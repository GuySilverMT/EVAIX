export interface UnifiedModel {
  id: string;
  name: string;
  provider: 'xAI' | 'OpenRouter' | 'NVIDIA' | 'Together' | 'Groq';
  color: string;
  enabled: boolean;
}

export async function fetchAllProviderModels(): Promise<UnifiedModel[]> {
  const unifiedList: UnifiedModel[] = [];

  const safeFetch = async (url: string, headers: HeadersInit) => {
    try {
      const res = await fetch(url, { method: 'GET', headers, signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn(`[Model Fetcher] Unreachable target: ${url}`);
      return null;
    }
  };

  // 1. xAI (Grok) -> All Models
  if (process.env.XAI_API_KEY) {
    const data = await safeFetch('https://api.x.ai/v1/models', {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    });
    if (data?.data) {
      data.data.forEach((m: any) => {
        unifiedList.push({ id: m.id, name: m.id, provider: 'xAI', color: '#a855f7', enabled: true });
      });
    }
  }

  // 2. Groq -> All Models
  if (process.env.GROQ_API_KEY) {
    const data = await safeFetch('https://api.groq.com/openai/v1/models', {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    });
    if (data?.data) {
      data.data.forEach((m: any) => {
        unifiedList.push({ id: m.id, name: m.id, provider: 'Groq', color: '#f59e0b', enabled: true });
      });
    }
  }

  // 3. NVIDIA -> All Models
  if (process.env.NVIDIA_API_KEY) {
    const data = await safeFetch('https://integrate.api.nvidia.com/v1/models', {
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
    });
    if (data?.data) {
      data.data.forEach((m: any) => {
        unifiedList.push({ id: m.id, name: m.id, provider: 'NVIDIA', color: '#0ea5e9', enabled: true });
      });
    }
  }

  // 4. OpenRouter -> Culling Rule: Free Tier Only
  if (process.env.OPENROUTER_API_KEY) {
    const data = await safeFetch('https://openrouter.ai/api/v1/models', {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    });
    if (data?.data) {
      data.data.forEach((m: any) => {
        const isFree = parseFloat(m.pricing?.prompt ?? '1') === 0 && parseFloat(m.pricing?.completion ?? '1') === 0;
        if (isFree) {
          unifiedList.push({ id: m.id, name: m.name || m.id, provider: 'OpenRouter', color: '#14b8a6', enabled: true });
        }
      });
    }
  }

  // 5. Together AI -> Culling Rule: Pinpoint Explicit Targets Only
  if (process.env.TOGETHER_API_KEY) {
    const data = await safeFetch('https://api.together.xyz/v1/models', {
      'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
    });
    if (Array.isArray(data)) {
      data.forEach((m: any) => {
        const id = m.id || '';
        const targetMatch = id.includes('qwen/qwen3.5-397b-a17b') || 
                            id.toLowerCase().includes('minimax-m3') ||
                            id.toLowerCase().includes('minimaxai');
        
        if (targetMatch) {
          unifiedList.push({ id: id, name: m.display_name || id, provider: 'Together', color: '#ff4500', enabled: true });
        }
      });
    }
  }

  return unifiedList;
}
