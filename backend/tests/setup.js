// Global test setup
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key-sk-123456789';
process.env.PORT = '3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
