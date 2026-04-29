
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class JobDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobDispatchError';
  }
}
